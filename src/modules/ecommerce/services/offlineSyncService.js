// ==============================================================================
// AXONPOS & AXONMARKET — Motor Dexie Offline-First y Hardware Connectors
// ==============================================================================

import Dexie from 'dexie';
import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';

// 1. Inicialización de la Base de Datos IndexedDB Local
export class AxonOfflineDatabase extends Dexie {
  constructor() {
    super('AxonMarketPosDb');
    this.version(1).stores({
      offline_sales_queue: 'id, invoice_number, sync_status, timestamp',
      offline_shifts_queue: 'id, cashier, action, sync_status, timestamp',
      hardware_settings: 'key, value'
    });
    this.version(2).stores({
      offline_sales_queue: 'id, invoice_number, sync_status, timestamp',
      offline_shifts_queue: 'id, cashier, action, sync_status, timestamp',
      hardware_settings: 'key, value',
      users: 'id, username, role, isActive, pinCode',
      cash_shifts: 'id, cashierName, registerName, status, openedAt, closedAt',
      cash_movements: 'id, shiftId, type, timestamp',
      cash_registers: 'id, code, name, isActive',
      audit_logs: 'id, action, targetUserId, timestamp',
      system_backups: 'id, fileName, storageLocation, createdAt'
    });
  }
}

export const offlineDb = new AxonOfflineDatabase();

// 2. Estado de red y listeners
class OfflineSyncManager {
  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.simulatedOffline = false;
    this.listeners = new Set();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (!this.simulatedOffline) {
          this.isOnline = true;
          this.notifyListeners();
          this.syncPendingSales();
        }
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyListeners();
      });
    }
  }

  get effectiveOnline() {
    return this.isOnline && !this.simulatedOffline;
  }

  setSimulatedOffline(isSimulated) {
    this.simulatedOffline = isSimulated;
    this.notifyListeners();
    if (!isSimulated && this.isOnline) {
      this.syncPendingSales();
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    const status = {
      isOnline: this.effectiveOnline,
      simulated: this.simulatedOffline
    };
    this.listeners.forEach(fn => fn(status));
  }

  // Guardar venta en la cola Dexie local
  async enqueueSale(saleData) {
    const record = {
      id: saleData.invoiceNumber || `TICK-${Date.now()}`,
      invoice_number: saleData.invoiceNumber || `TICK-${Date.now()}`,
      customer_name: saleData.customer || 'Consumidor Final',
      total_usd: Number(saleData.totalUsd) || 0,
      total_ves: Number(saleData.totalVes) || 0,
      items: saleData.items || [],
      payment_methods: saleData.paymentEntries || [],
      sync_status: 'PENDING',
      timestamp: new Date().toISOString()
    };

    await offlineDb.offline_sales_queue.put(record);
    return record;
  }

  // Obtener ventas pendientes en Dexie
  async getPendingSales() {
    try {
      return await offlineDb.offline_sales_queue
        .where('sync_status')
        .equals('PENDING')
        .toArray();
    } catch (e) {
      console.warn('Error reading offline sales queue:', e);
      return [];
    }
  }

  // Sincronizar todas las ventas pendientes con Supabase
  async syncPendingSales() {
    if (!this.effectiveOnline) return { success: false, synced: 0 };

    const pending = await this.getPendingSales();
    if (pending.length === 0) return { success: true, synced: 0 };

    const wsId = localStorage.getItem('activeWorkspace');
    let syncedCount = 0;

    for (const sale of pending) {
      try {
        if (wsId) {
          // Intentar insertar en Supabase
          const { error } = await supabase.from('pos_sales').insert([{
            workspace_id: wsId,
            invoice_number: sale.invoice_number,
            customer_name: sale.customer_name,
            total_usd: sale.total_usd,
            total_ves: sale.total_ves,
            items: sale.items,
            payment_methods: sale.payment_methods,
            created_at: sale.timestamp
          }]);

          if (error) {
            console.warn(`Error syncing sale ${sale.id} to Supabase:`, error);
          }
        }

        // Marcar en Dexie como sincronizado
        await offlineDb.offline_sales_queue.update(sale.id, {
          sync_status: 'SYNCED',
          synced_at: new Date().toISOString()
        });

        syncedCount++;
      } catch (err) {
        console.error(`Failed to sync sale ${sale.id}:`, err);
      }
    }

    if (syncedCount > 0) {
      toast.success(`¡${syncedCount} venta(s) de la cola Dexie sincronizadas con la nube!`, {
        icon: '🔄'
      });
    }

    return { success: true, synced: syncedCount };
  }
}

export const offlineSyncManager = new OfflineSyncManager();
