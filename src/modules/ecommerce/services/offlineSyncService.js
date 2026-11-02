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
    this.version(3).stores({
      users: 'id, username, role, isActive, pinCode, workspace_id',
      cash_registers: 'id, code, name, isActive, workspace_id',
      audit_logs: 'id, action, targetUserId, timestamp, workspace_id'
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
    const invoiceNum = saleData.invoiceNumber || `TICK-${Date.now()}`;
    const record = {
      id: invoiceNum,
      invoice_number: invoiceNum,
      document_type: saleData.documentType || 'TICKET_VENTA',
      customer_name: saleData.customer || 'Consumidor Final',
      total_usd: Number(saleData.totalUsd) || 0,
      total_ves: Number(saleData.totalVes) || 0,
      subtotal_usd: Number(saleData.subtotalUsd) || 0,
      iva_usd: Number(saleData.ivaUsd) || 0,
      igtf_usd: Number(saleData.igtfUsd) || 0,
      items: saleData.items || [],
      payments: saleData.payments || saleData.paymentEntries || [],
      sync_status: saleData.isSynced ? 'SYNCED' : 'PENDING',
      timestamp: saleData.dateIso || new Date().toISOString()
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

  // Sincronizar todas las ventas pendientes con Supabase (ecommerce_orders_v2)
  async syncPendingSales() {
    if (!this.effectiveOnline) return { success: false, synced: 0 };

    const pending = await this.getPendingSales();
    if (pending.length === 0) return { success: true, synced: 0 };

    const wsId = localStorage.getItem('activeWorkspace');
    let syncedCount = 0;

    for (const sale of pending) {
      try {
        if (wsId) {
          const primaryMethod = sale.payments?.[0]?.method ? sale.payments[0].method.toLowerCase() : 'pos';
          const orderPayload = {
            id: sale.invoice_number,
            customer: sale.customer_name || 'Consumidor Final',
            date: sale.timestamp || new Date().toISOString(),
            total: Number(sale.total_usd) || 0,
            status: 'Entregado',
            priority: 'Normal',
            address: 'Venta en Mostrador (POS)',
            paymentmethod: primaryMethod,
            paymentstatus: 'approved',
            paymentdetails: {
              invoiceNumber: sale.invoice_number,
              documentType: sale.document_type || 'TICKET_VENTA',
              subtotalUsd: sale.subtotal_usd,
              ivaUsd: sale.iva_usd,
              igtfUsd: sale.igtf_usd,
              totalUsd: sale.total_usd,
              totalVes: sale.total_ves,
              payments: sale.payments
            },
            items: sale.items || [],
            ismobile: 0,
            order_type: 'pos',
            workspace_id: wsId,
            stock_deducted: 1
          };

          const { error } = await supabase.from('ecommerce_orders_v2').upsert([orderPayload], { onConflict: 'id' });

          if (error) {
            console.warn(`Error syncing sale ${sale.id} to ecommerce_orders_v2:`, error);
            continue;
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
      toast.success(`¡${syncedCount} venta(s) mostrador sincronizadas en tiempo real!`, {
        icon: '🔄'
      });
    }

    return { success: true, synced: syncedCount };
  }
}

export const offlineSyncManager = new OfflineSyncManager();
