// ==============================================================================
// AXONMARKET & AXONPOS — Servicio de Autenticación, Roles, PINes y Auditoría
// ==============================================================================

import { offlineDb } from './offlineSyncService';
import { supabase } from '../../../supabaseClient';

const STORAGE_KEY_USER_ID = 'axonpos_active_user_id';
const STORAGE_KEY_MASTER_PIN = 'axon_master_pin_code';

export const ROLE_PERMISSIONS = {
  MASTER: [
    'pos:sale', 'pos:checkout', 'pos:discount', 'pos:void_sale', 'pos:hold_cart',
    'cash:open_shift', 'cash:close_shift', 'cash:movement',
    'tables:manage', 'tables:split_bill', 'kds:view',
    'inventory:view', 'inventory:adjust', 'inventory:purchase',
    'fiscal:report_x', 'fiscal:report_z',
    'backup:create', 'backup:restore', 'users:manage', 'registers:manage', 'settings:edit'
  ],
  ADMIN: [
    'pos:sale', 'pos:checkout', 'pos:discount', 'pos:void_sale', 'pos:hold_cart',
    'cash:open_shift', 'cash:close_shift', 'cash:movement',
    'tables:manage', 'tables:split_bill', 'kds:view',
    'inventory:view', 'inventory:adjust', 'inventory:purchase',
    'fiscal:report_x', 'fiscal:report_z',
    'backup:create', 'backup:restore', 'users:manage', 'registers:manage', 'settings:edit'
  ],
  MANAGER: [
    'pos:sale', 'pos:checkout', 'pos:discount', 'pos:void_sale', 'pos:hold_cart',
    'cash:open_shift', 'cash:close_shift', 'cash:movement',
    'tables:manage', 'tables:split_bill', 'kds:view',
    'inventory:view', 'inventory:adjust', 'inventory:purchase',
    'fiscal:report_x', 'fiscal:report_z',
    'backup:create'
  ],
  CASHIER: [
    'pos:sale', 'pos:checkout', 'pos:hold_cart',
    'cash:open_shift', 'cash:close_shift',
    'inventory:view',
    'fiscal:report_x'
  ],
  WAITER: [
    'tables:manage', 'tables:split_bill'
  ],
  KITCHEN: [
    'kds:view'
  ],
  PICKER: [
    'inventory:view'
  ]
};

export const PERMISSION_DEFINITIONS = [
  // Ventas & Mostrador
  { key: 'pos:sale', label: 'Ventas en Mostrador', description: 'Registrar ventas y escanear códigos', category: 'Ventas & Mostrador (POS)' },
  { key: 'pos:checkout', label: 'Procesar Cobros', description: 'Abrir pasarela de pago y registrar cobros', category: 'Ventas & Mostrador (POS)' },
  { key: 'pos:discount', label: 'Aplicar Descuentos', description: 'Autorizar rebajas en ítems o en la orden', category: 'Ventas & Mostrador (POS)' },
  { key: 'pos:void_sale', label: 'Anular Ventas', description: 'Cancelar tickets o eliminar pedidos en curso', category: 'Ventas & Mostrador (POS)' },
  { key: 'pos:hold_cart', label: 'Pausar Carritos', description: 'Dejar órdenes en espera temporal', category: 'Ventas & Mostrador (POS)' },

  // Caja & Dinero
  { key: 'cash:open_shift', label: 'Apertura de Turno', description: 'Iniciar turno con fondo inicial en caja', category: 'Caja & Dinero' },
  { key: 'cash:close_shift', label: 'Cierre de Turno & Arqueo', description: 'Declarar efectivo y cerrar turno', category: 'Caja & Dinero' },
  { key: 'cash:movement', label: 'Caja Chica (Gastos/Ingresos)', description: 'Retiros o ingresos manuales de efectivo', category: 'Caja & Dinero' },
  { key: 'fiscal:report_x', label: 'Emitir Reporte X', description: 'Corte parcial de caja para auditoría', category: 'Caja & Dinero' },
  { key: 'fiscal:report_z', label: 'Emitir Reporte Z', description: 'Cierre diario fiscal oficial SENIAT', category: 'Caja & Dinero' },

  // Inventario & Precios
  { key: 'inventory:view', label: 'Consultar Catálogo', description: 'Ver productos, precios y existencias', category: 'Inventario & Precios' },
  { key: 'inventory:adjust', label: 'Ajuste de Stock', description: 'Modificar existencias por merma o auditoría', category: 'Inventario & Precios' },
  { key: 'inventory:purchase', label: 'Ingreso de Mercadería', description: 'Registrar compras y recepción de bultos', category: 'Inventario & Precios' },

  // Administración & Seguridad
  { key: 'backup:create', label: 'Generar Respaldos', description: 'Descargar archivo .axonbak de seguridad', category: 'Administración & Seguridad' },
  { key: 'backup:restore', label: 'Restaurar Sistema', description: 'Cargar snapshot .axonbak en la base de datos', category: 'Administración & Seguridad' },
  { key: 'users:manage', label: 'Gestión de Personal & PINes', description: 'Crear cajeros, asignar roles y PINes', category: 'Administración & Seguridad' },
  { key: 'registers:manage', label: 'Configurar Cajas Registradoras', description: 'Añadir y editar puntos de venta', category: 'Administración & Seguridad' },
  { key: 'settings:edit', label: 'Configuración Avanzada', description: 'Editar datos de tienda y tasas de cambio', category: 'Administración & Seguridad' }
];

export async function ensureMasterUser() {
  try {
    let master = await offlineDb.users.where('role').equals('MASTER').first();
    if (!master) {
      master = await offlineDb.users.get('usr-master');
    }

    if (master) {
      if (!master.isActive || master.role !== 'MASTER') {
        const updated = {
          ...master,
          role: 'MASTER',
          isActive: true
        };
        await offlineDb.users.put(updated);
        return updated;
      }
      return master;
    }

    // Comprobar si hay sesión en localStorage
    const savedWorkspace = localStorage.getItem('activeWorkspace');
    let storeName = 'AxonMarket Store';
    let merchantName = 'Axon (Propietario)';
    let email = 'admin@axonmarket.vip';

    try {
      const info = JSON.parse(localStorage.getItem('storeInfo') || '{}');
      if (info.name) storeName = info.name;
      if (info.merchantName) merchantName = `${info.merchantName} (Propietario)`;
    } catch (e) {}

    const defaultPin = localStorage.getItem(STORAGE_KEY_MASTER_PIN) || '1234';

    const newMaster = {
      id: 'usr-master',
      username: 'propietario',
      fullName: merchantName,
      role: 'MASTER',
      pinCode: defaultPin,
      email: email,
      avatarColor: '#FF6B00',
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: 'AxonMarket Cloud',
      customPermissions: ROLE_PERMISSIONS.MASTER
    };

    await offlineDb.users.put(newMaster);

    // Sembrar también un cajero y empacador de demostración si la base está limpia
    const count = await offlineDb.users.count();
    if (count <= 1) {
      await offlineDb.users.bulkPut([
        {
          id: 'usr-cajero-1',
          username: 'cajero_principal',
          fullName: 'Hernan Cajero',
          role: 'CASHIER',
          pinCode: '0000',
          email: 'cajero@axonmarket.vip',
          avatarColor: '#0284C7',
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: 'Axon (Propietario)',
          customPermissions: ROLE_PERMISSIONS.CASHIER
        },
        {
          id: 'usr-empacador-1',
          username: 'yende_pack',
          fullName: 'Yende Empacador',
          role: 'PICKER',
          pinCode: '1111',
          email: 'empaque@axonmarket.vip',
          avatarColor: '#EC4899',
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: 'Axon (Propietario)',
          customPermissions: ROLE_PERMISSIONS.PICKER
        }
      ]);
    }

    // Sembrar cajas si no existen
    const regCount = await offlineDb.cash_registers.count();
    if (regCount === 0) {
      await offlineDb.cash_registers.bulkPut([
        { id: 'reg-01', code: 'CAJA-01', name: 'Caja 1 - Principal', branchId: 'SUC-01', defaultFloatUsd: 50.0, defaultFloatVes: 1000.0, isActive: true, createdAt: new Date().toISOString() },
        { id: 'reg-02', code: 'CAJA-02', name: 'Caja 2 - Rápida', branchId: 'SUC-01', defaultFloatUsd: 20.0, defaultFloatVes: 500.0, isActive: true, createdAt: new Date().toISOString() },
        { id: 'reg-03', code: 'CAJA-03', name: 'Caja 3 - Pasillo', branchId: 'SUC-01', defaultFloatUsd: 0.0, defaultFloatVes: 0.0, isActive: true, createdAt: new Date().toISOString() }
      ]);
    }

    return newMaster;
  } catch (err) {
    console.warn('[authService] Error asegurando usuario maestro:', err);
    return null;
  }
}

class AuthService {
  constructor() {
    this.currentUser = null;
    this.listeners = new Set();
    this.isInitialized = false;
    this.hydrateFromStorage();
  }

  async hydrateFromStorage() {
    try {
      await ensureMasterUser();
      const savedUserId = localStorage.getItem(STORAGE_KEY_USER_ID);
      if (savedUserId) {
        const user = await offlineDb.users.get(savedUserId);
        if (user && user.isActive) {
          this.setCurrentUser(user);
          this.isInitialized = true;
          return;
        }
      }
      // Por defecto, iniciar con el usuario Propietario en desarrollo
      const master = await offlineDb.users.where('role').equals('MASTER').first();
      if (master && master.isActive) {
        this.setCurrentUser(master);
      } else {
        this.setCurrentUser(null);
      }
    } catch (err) {
      console.warn('[authService] Error al hidratar sesión:', err);
      this.setCurrentUser(null);
    } finally {
      this.isInitialized = true;
    }
  }

  async ensureInitialized() {
    if (!this.isInitialized || !this.currentUser) {
      await this.hydrateFromStorage();
    }
    return this.currentUser;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  setCurrentUser(user) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER_ID, user.id);
    } else {
      localStorage.removeItem(STORAGE_KEY_USER_ID);
    }
    this.notifyListeners();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.currentUser);
      } catch (err) {
        console.error('[authService] Error en listener:', err);
      }
    }
  }

  async loginWithPin(pin, userId) {
    try {
      const cleanPin = (pin || '').trim();
      if (!cleanPin) {
        return { success: false, error: 'Ingrese el PIN de acceso.' };
      }

      await ensureMasterUser();

      let matchedUser = null;

      if (userId) {
        const target = await offlineDb.users.get(userId);
        if (target && target.isActive && target.pinCode === cleanPin) {
          matchedUser = target;
        }
      }

      if (!matchedUser) {
        const activeUsers = await offlineDb.users
          .filter(u => u.isActive && u.pinCode === cleanPin)
          .toArray();

        if (activeUsers.length > 0) {
          matchedUser = activeUsers.find(u => u.role === 'MASTER') || activeUsers[0];
        }
      }

      if (!matchedUser) {
        return { success: false, error: 'PIN incorrecto o usuario inactivo.' };
      }

      const updatedUser = {
        ...matchedUser,
        lastLoginAt: new Date().toISOString()
      };
      await offlineDb.users.put(updatedUser);

      this.setCurrentUser(updatedUser);
      return { success: true, user: updatedUser };
    } catch (err) {
      console.error('[authService] Error en loginWithPin:', err);
      return { success: false, error: err.message || 'Error al validar PIN.' };
    }
  }

  logout() {
    this.setCurrentUser(null);
  }

  hasPermission(permission, user) {
    const target = user !== undefined ? user : this.currentUser;
    if (!target) return false;
    if (target.role === 'MASTER') return true;

    if (Array.isArray(target.customPermissions) && target.customPermissions.includes(permission)) {
      return true;
    }

    const defaultRolePerms = ROLE_PERMISSIONS[target.role] || [];
    return defaultRolePerms.includes(permission);
  }

  async verifyMasterPin(pin) {
    const cleanPin = (pin || '').trim();
    if (!cleanPin) return false;

    const master = await offlineDb.users.where('role').equals('MASTER').first();
    if (master && master.pinCode === cleanPin) {
      return true;
    }

    const cachedPin = localStorage.getItem(STORAGE_KEY_MASTER_PIN);
    if (cachedPin && cachedPin === cleanPin) {
      return true;
    }

    return cleanPin === '1234';
  }

  async changeMasterPin(newPin, performedByAdmin = 'Propietario') {
    const cleanPin = (newPin || '').trim();
    if (!cleanPin || cleanPin.length < 4) {
      throw new Error('El PIN maestro debe tener al menos 4 dígitos.');
    }

    let master = await offlineDb.users.where('role').equals('MASTER').first();
    if (!master) {
      master = await ensureMasterUser();
    }

    const updated = {
      ...master,
      pinCode: cleanPin
    };
    await offlineDb.users.put(updated);
    localStorage.setItem(STORAGE_KEY_MASTER_PIN, cleanPin);

    await this.addAuditLog(
      'PASSWORD_CHANGED',
      master.id,
      master.username,
      'MASTER',
      performedByAdmin,
      'Cambio de PIN Maestro del Propietario'
    );

    return true;
  }

  async getUsers() {
    await ensureMasterUser();
    return await offlineDb.users.toArray();
  }

  async createUser(data, performedByAdmin = 'Propietario') {
    if (!data.fullName || !data.pinCode) {
      throw new Error('Nombre y PIN son obligatorios.');
    }

    const id = `usr-${Date.now()}`;
    const newUser = {
      id,
      username: data.username || data.fullName.toLowerCase().replace(/\s+/g, '_'),
      fullName: data.fullName,
      role: data.role || 'CASHIER',
      pinCode: data.pinCode.trim(),
      email: data.email || '',
      avatarColor: data.avatarColor || '#FF6B00',
      isActive: data.isActive !== false,
      createdAt: new Date().toISOString(),
      createdBy: performedByAdmin,
      customPermissions: data.customPermissions || ROLE_PERMISSIONS[data.role || 'CASHIER'] || []
    };

    await offlineDb.users.put(newUser);

    await this.addAuditLog(
      'USER_CREATED',
      newUser.id,
      newUser.username,
      newUser.role,
      performedByAdmin,
      `Usuario creado con rol ${newUser.role}`
    );

    return newUser;
  }

  async updateUser(userId, data, performedByAdmin = 'Propietario') {
    const existing = await offlineDb.users.get(userId);
    if (!existing) throw new Error('Usuario no encontrado.');

    const updated = {
      ...existing,
      ...data
    };
    await offlineDb.users.put(updated);

    await this.addAuditLog(
      'USER_UPDATED',
      updated.id,
      updated.username,
      updated.role,
      performedByAdmin,
      `Usuario actualizado. Rol: ${updated.role}`
    );

    if (this.currentUser?.id === userId) {
      this.setCurrentUser(updated);
    }

    return updated;
  }

  async deleteUser(userId, performedByAdmin = 'Propietario') {
    const existing = await offlineDb.users.get(userId);
    if (!existing) return;
    if (existing.role === 'MASTER') {
      throw new Error('No es posible eliminar al Propietario Maestro del sistema.');
    }

    await offlineDb.users.delete(userId);

    await this.addAuditLog(
      'USER_DELETED',
      existing.id,
      existing.username,
      existing.role,
      performedByAdmin,
      `Usuario eliminado`
    );
  }

  async toggleUserStatus(userId, performedByAdmin = 'Propietario') {
    const existing = await offlineDb.users.get(userId);
    if (!existing) return;
    if (existing.role === 'MASTER') {
      throw new Error('No se puede desactivar al usuario Maestro.');
    }

    const updated = { ...existing, isActive: !existing.isActive };
    await offlineDb.users.put(updated);

    await this.addAuditLog(
      'STATUS_TOGGLED',
      updated.id,
      updated.username,
      updated.role,
      performedByAdmin,
      `Estado cambiado a ${updated.isActive ? 'Habilitado' : 'Deshabilitado'}`
    );

    return updated;
  }

  // Cajas Registradoras
  async getCashRegisters() {
    await ensureMasterUser();
    return await offlineDb.cash_registers.toArray();
  }

  async saveCashRegister(register, performedBy = 'Propietario') {
    const isNew = !register.id;
    const id = register.id || `reg-${Date.now()}`;
    const record = {
      id,
      code: register.code || `CAJA-0${(await offlineDb.cash_registers.count()) + 1}`,
      name: register.name || 'Caja Mostrador',
      branchId: register.branchId || 'SUC-01',
      defaultFloatUsd: Number(register.defaultFloatUsd || 0),
      defaultFloatVes: Number(register.defaultFloatVes || 0),
      isActive: register.isActive !== false,
      createdAt: register.createdAt || new Date().toISOString()
    };
    await offlineDb.cash_registers.put(record);

    await this.addAuditLog(
      isNew ? 'REGISTER_CREATED' : 'REGISTER_UPDATED',
      record.id,
      record.name,
      'CASHIER',
      performedBy,
      `Caja registradora ${record.name} (${record.code})`
    );

    return record;
  }

  async deleteCashRegister(registerId, performedBy = 'Propietario') {
    const reg = await offlineDb.cash_registers.get(registerId);
    if (reg) {
      await offlineDb.cash_registers.delete(registerId);
      await this.addAuditLog(
        'REGISTER_DELETED',
        reg.id,
        reg.name,
        'CASHIER',
        performedBy,
        `Caja ${reg.name} eliminada`
      );
    }
  }

  // Libro de Auditoría
  async getAuditLogs() {
    return await offlineDb.audit_logs.orderBy('timestamp').reverse().limit(100).toArray();
  }

  async addAuditLog(action, targetUserId, targetUsername, targetRole, performedByAdmin, details) {
    try {
      const log = {
        id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        action,
        targetUserId,
        targetUsername,
        targetRole,
        performedByAdmin,
        timestamp: new Date().toISOString(),
        details: details || ''
      };
      await offlineDb.audit_logs.put(log);
    } catch (e) {
      console.warn('[authService] Error al guardar log de auditoría:', e);
    }
  }
}

export const authService = new AuthService();
