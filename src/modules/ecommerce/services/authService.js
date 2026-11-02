// ==============================================================================
// AXONMARKET & AXONPOS — Servicio de Autenticación, Roles, PINes y Auditoría
// Aislamiento Multi-Tenant Estricto por Tienda / Comercio (Workspace)
// ==============================================================================

import { offlineDb } from './offlineSyncService';
import { supabase } from '../../../supabaseClient';

const STORAGE_KEY_USER_ID = 'axonpos_active_user_id';
const STORAGE_KEY_MASTER_PIN = 'axon_master_pin_code';

export function getActiveWorkspaceId() {
  if (typeof window === 'undefined') return 'default_workspace';
  try {
    const params = new URLSearchParams(window.location.search);
    const urlWs = params.get('workspace') || params.get('workspace_id') || params.get('ws') || params.get('storeId') || params.get('store');
    if (urlWs && urlWs !== 'null' && urlWs !== 'undefined' && urlWs !== 'default') {
      localStorage.setItem('activeWorkspace', urlWs);
      return urlWs;
    }
  } catch (e) {}
  return localStorage.getItem('activeWorkspace') || localStorage.getItem('currentWorkspaceId') || 'default_workspace';
}

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

export async function ensureMasterUser(wsId) {
  try {
    const workspaceId = wsId || getActiveWorkspaceId();
    let master = await offlineDb.users.where('workspace_id').equals(workspaceId).and(u => u.role === 'MASTER').first();
    if (!master) {
      master = await offlineDb.users.get(`usr-master-${workspaceId}`);
    }

    if (master) {
      if (!master.isActive || master.role !== 'MASTER') {
        const updated = {
          ...master,
          role: 'MASTER',
          isActive: true,
          workspace_id: workspaceId
        };
        await offlineDb.users.put(updated);
        return updated;
      }
      return master;
    }

    // Comprobar si hay sesión en localStorage o storeInfo
    let storeName = 'AxonMarket Store';
    let merchantName = 'Axon (Propietario)';
    let email = 'admin@axonmarket.vip';

    try {
      const info = JSON.parse(localStorage.getItem('storeInfo') || '{}');
      if (info.name) storeName = info.name;
      if (info.merchantName) merchantName = `${info.merchantName} (Propietario)`;
    } catch (e) {}

    const defaultPin = localStorage.getItem(`adminPin_${workspaceId}`) || localStorage.getItem('adminPin') || localStorage.getItem(STORAGE_KEY_MASTER_PIN) || '1234';

    const newMaster = {
      id: `usr-master-${workspaceId}`,
      workspace_id: workspaceId,
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

    // NOTA MULTI-TENANT: NO sembramos empleados demo (Hernan Cajero, etc.).
    // Cada comercio nuevo comienza con su lista de personal limpia para crear sus propios pines.

    // Sembrar 1 sola caja principal para este workspace si no existe ninguna
    const regCount = await offlineDb.cash_registers.where('workspace_id').equals(workspaceId).count();
    if (regCount === 0) {
      await offlineDb.cash_registers.put({
        id: `reg-${workspaceId}-01`,
        workspace_id: workspaceId,
        code: 'CAJA-01',
        name: 'Caja 1 - Principal',
        branchId: 'SUC-01',
        defaultFloatUsd: 0.0,
        defaultFloatVes: 0.0,
        isActive: true,
        createdAt: new Date().toISOString()
      });
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
      const workspaceId = getActiveWorkspaceId();
      await ensureMasterUser(workspaceId);
      const savedUserId = localStorage.getItem(`${STORAGE_KEY_USER_ID}_${workspaceId}`) || localStorage.getItem(STORAGE_KEY_USER_ID);
      if (savedUserId) {
        const user = await offlineDb.users.get(savedUserId);
        if (user && user.isActive && (user.workspace_id === workspaceId || !user.workspace_id)) {
          this.setCurrentUser(user);
          this.isInitialized = true;
          return;
        }
      }
      // Por defecto, iniciar con el usuario Propietario de este workspace
      const master = await offlineDb.users.where('workspace_id').equals(workspaceId).and(u => u.role === 'MASTER').first();
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
    const workspaceId = getActiveWorkspaceId();
    if (user) {
      localStorage.setItem(`${STORAGE_KEY_USER_ID}_${workspaceId}`, user.id);
      localStorage.setItem(STORAGE_KEY_USER_ID, user.id);
    } else {
      localStorage.removeItem(`${STORAGE_KEY_USER_ID}_${workspaceId}`);
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

  async loginWithPin(pin, userId, wsId) {
    try {
      const cleanPin = (pin || '').trim();
      if (!cleanPin) {
        return { success: false, error: 'Ingrese el PIN de acceso.' };
      }

      const workspaceId = wsId || getActiveWorkspaceId();
      await ensureMasterUser(workspaceId);

      let matchedUser = null;

      if (userId) {
        const target = await offlineDb.users.get(userId);
        if (target && target.isActive && target.pinCode === cleanPin && (target.workspace_id === workspaceId || !target.workspace_id)) {
          matchedUser = target;
        }
      }

      if (!matchedUser) {
        const activeUsers = await offlineDb.users
          .filter(u => u.isActive && u.pinCode === cleanPin && (u.workspace_id === workspaceId || !u.workspace_id))
          .toArray();

        if (activeUsers.length > 0) {
          matchedUser = activeUsers.find(u => u.role === 'MASTER') || activeUsers[0];
        }
      }

      // Validar también contra adminPin configurado en workspaces en Supabase
      if (!matchedUser) {
        const masterPin = localStorage.getItem(`adminPin_${workspaceId}`);
        if (masterPin && masterPin === cleanPin) {
          matchedUser = await offlineDb.users.where('workspace_id').equals(workspaceId).and(u => u.role === 'MASTER').first();
        }
      }

      if (!matchedUser) {
        return { success: false, error: 'PIN incorrecto o usuario inactivo para este comercio.' };
      }

      const updatedUser = {
        ...matchedUser,
        workspace_id: workspaceId,
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

  async verifyMasterPin(pin, wsId) {
    const cleanPin = (pin || '').trim();
    if (!cleanPin) return false;

    const workspaceId = wsId || getActiveWorkspaceId();
    const master = await offlineDb.users.where('workspace_id').equals(workspaceId).and(u => u.role === 'MASTER').first();
    if (master && master.pinCode === cleanPin) {
      return true;
    }

    const cachedPin = localStorage.getItem(`adminPin_${workspaceId}`) || localStorage.getItem(STORAGE_KEY_MASTER_PIN);
    if (cachedPin && cachedPin === cleanPin) {
      return true;
    }

    return false;
  }

  async changeMasterPin(newPin, performedByAdmin = 'Propietario', wsId) {
    const cleanPin = (newPin || '').trim();
    if (!cleanPin || cleanPin.length < 4) {
      throw new Error('El PIN maestro debe tener al menos 4 dígitos.');
    }

    const workspaceId = wsId || getActiveWorkspaceId();
    let master = await offlineDb.users.where('workspace_id').equals(workspaceId).and(u => u.role === 'MASTER').first();
    if (!master) {
      master = await ensureMasterUser(workspaceId);
    }

    const updated = {
      ...master,
      pinCode: cleanPin,
      workspace_id: workspaceId
    };
    await offlineDb.users.put(updated);
    localStorage.setItem(`adminPin_${workspaceId}`, cleanPin);
    localStorage.setItem(STORAGE_KEY_MASTER_PIN, cleanPin);

    // Sincronizar en Supabase workspaces.config.adminPin
    try {
      const { data: ws } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      const currentConfig = ws?.config || {};
      await supabase.from('workspaces').update({
        config: {
          ...currentConfig,
          adminPin: cleanPin
        }
      }).eq('id', workspaceId);
    } catch (e) {
      console.warn('Error sincronizando adminPin en workspace:', e);
    }

    await this.addAuditLog(
      'PASSWORD_CHANGED',
      master.id,
      master.username,
      'MASTER',
      performedByAdmin,
      'Cambio de PIN Maestro del Propietario',
      workspaceId
    );

    return true;
  }

  async getUsers(wsId) {
    const workspaceId = wsId || getActiveWorkspaceId();
    await ensureMasterUser(workspaceId);

    // 1. Obtener de offlineDb filtrado por workspace_id
    const dbUsers = await offlineDb.users.where('workspace_id').equals(workspaceId).toArray();

    // 2. Sincronizar con workspaces.config.staff en Supabase si está disponible
    try {
      const { data: ws } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      if (ws?.config?.staff && Array.isArray(ws.config.staff)) {
        const staffMap = new Map();
        dbUsers.forEach(u => staffMap.set(u.id, u));
        
        let needSave = false;
        ws.config.staff.forEach(s => {
          if (!staffMap.has(s.id)) {
            const mapped = {
              id: s.id,
              workspace_id: workspaceId,
              username: (s.full_name || s.fullName || '').toLowerCase().replace(/\s+/g, '_'),
              fullName: s.full_name || s.fullName,
              role: s.role || 'PICKER',
              pinCode: s.pin_code || s.pinCode,
              email: s.email || '',
              avatarColor: s.avatarColor || '#0284C7',
              isActive: s.is_active !== false && s.isActive !== false,
              createdAt: s.created_at || s.createdAt || new Date().toISOString(),
              createdBy: 'AxonMarket Config',
              customPermissions: s.customPermissions || ROLE_PERMISSIONS[s.role || 'PICKER'] || []
            };
            dbUsers.push(mapped);
            offlineDb.users.put(mapped);
          }
        });
      }
    } catch (e) {
      console.warn('Error syncing workspace staff:', e);
    }

    return dbUsers;
  }

  async createUser(data, performedByAdmin = 'Propietario', wsId) {
    if (!data.fullName || !data.pinCode) {
      throw new Error('Nombre y PIN son obligatorios.');
    }

    const workspaceId = wsId || getActiveWorkspaceId();
    const id = `usr-${Date.now()}`;
    const newUser = {
      id,
      workspace_id: workspaceId,
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

    // Sincronizar en workspaces.config.staff de Supabase
    try {
      const { data: ws } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      const currentConfig = ws?.config || {};
      const currentStaff = currentConfig.staff || [];
      const updatedStaff = [
        {
          id: newUser.id,
          full_name: newUser.fullName,
          pin_code: newUser.pinCode,
          role: newUser.role,
          is_active: newUser.isActive,
          created_at: newUser.createdAt
        },
        ...currentStaff.filter(s => s.id !== newUser.id)
      ];
      await supabase.from('workspaces').update({
        config: {
          ...currentConfig,
          staff: updatedStaff
        }
      }).eq('id', workspaceId);
      localStorage.setItem(`axon_staff_${workspaceId}`, JSON.stringify(updatedStaff));
    } catch (e) {
      console.warn('Error sincronizando nuevo usuario en workspace:', e);
    }

    await this.addAuditLog(
      'USER_CREATED',
      newUser.id,
      newUser.username,
      newUser.role,
      performedByAdmin,
      `Usuario creado con rol ${newUser.role}`,
      workspaceId
    );

    return newUser;
  }

  async updateUser(userId, data, performedByAdmin = 'Propietario', wsId) {
    const workspaceId = wsId || getActiveWorkspaceId();
    const existing = await offlineDb.users.get(userId);
    if (!existing) throw new Error('Usuario no encontrado.');

    const updated = {
      ...existing,
      ...data,
      workspace_id: workspaceId
    };
    await offlineDb.users.put(updated);

    // Sincronizar en workspaces.config.staff
    try {
      const { data: ws } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      const currentConfig = ws?.config || {};
      const currentStaff = currentConfig.staff || [];
      const updatedStaff = currentStaff.map(s => {
        if (s.id === userId) {
          return {
            ...s,
            full_name: updated.fullName || s.full_name,
            pin_code: updated.pinCode || s.pin_code,
            role: updated.role || s.role,
            is_active: updated.isActive !== undefined ? updated.isActive : s.is_active
          };
        }
        return s;
      });
      await supabase.from('workspaces').update({
        config: {
          ...currentConfig,
          staff: updatedStaff
        }
      }).eq('id', workspaceId);
      localStorage.setItem(`axon_staff_${workspaceId}`, JSON.stringify(updatedStaff));
    } catch (e) {
      console.warn('Error actualizando usuario en workspace:', e);
    }

    await this.addAuditLog(
      'USER_UPDATED',
      updated.id,
      updated.username,
      updated.role,
      performedByAdmin,
      `Usuario actualizado. Rol: ${updated.role}`,
      workspaceId
    );

    if (this.currentUser?.id === userId) {
      this.setCurrentUser(updated);
    }

    return updated;
  }

  async deleteUser(userId, performedByAdmin = 'Propietario', wsId) {
    const workspaceId = wsId || getActiveWorkspaceId();
    const existing = await offlineDb.users.get(userId);
    if (!existing) return;
    if (existing.role === 'MASTER') {
      throw new Error('No es posible eliminar al Propietario Maestro del sistema.');
    }

    await offlineDb.users.delete(userId);

    // Sincronizar eliminación en workspaces.config.staff
    try {
      const { data: ws } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      const currentConfig = ws?.config || {};
      const currentStaff = currentConfig.staff || [];
      const updatedStaff = currentStaff.filter(s => s.id !== userId);
      await supabase.from('workspaces').update({
        config: {
          ...currentConfig,
          staff: updatedStaff
        }
      }).eq('id', workspaceId);
      localStorage.setItem(`axon_staff_${workspaceId}`, JSON.stringify(updatedStaff));
    } catch (e) {
      console.warn('Error eliminando usuario de workspace:', e);
    }

    await this.addAuditLog(
      'USER_DELETED',
      existing.id,
      existing.username,
      existing.role,
      performedByAdmin,
      `Usuario eliminado`,
      workspaceId
    );
  }

  async toggleUserStatus(userId, performedByAdmin = 'Propietario', wsId) {
    const workspaceId = wsId || getActiveWorkspaceId();
    const existing = await offlineDb.users.get(userId);
    if (!existing) return;
    if (existing.role === 'MASTER') {
      throw new Error('No se puede desactivar al usuario Maestro.');
    }

    const updated = { ...existing, isActive: !existing.isActive, workspace_id: workspaceId };
    await offlineDb.users.put(updated);

    // Sincronizar en workspaces.config.staff
    try {
      const { data: ws } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      const currentConfig = ws?.config || {};
      const currentStaff = currentConfig.staff || [];
      const updatedStaff = currentStaff.map(s => {
        if (s.id === userId) {
          return { ...s, is_active: updated.isActive };
        }
        return s;
      });
      await supabase.from('workspaces').update({
        config: {
          ...currentConfig,
          staff: updatedStaff
        }
      }).eq('id', workspaceId);
      localStorage.setItem(`axon_staff_${workspaceId}`, JSON.stringify(updatedStaff));
    } catch (e) {
      console.warn('Error actualizando estado en workspace staff:', e);
    }

    await this.addAuditLog(
      'STATUS_TOGGLED',
      updated.id,
      updated.username,
      updated.role,
      performedByAdmin,
      `Estado cambiado a ${updated.isActive ? 'Habilitado' : 'Deshabilitado'}`,
      workspaceId
    );

    return updated;
  }

  // Cajas Registradoras aisladas por Workspace
  async getCashRegisters(wsId) {
    const workspaceId = wsId || getActiveWorkspaceId();
    await ensureMasterUser(workspaceId);
    return await offlineDb.cash_registers.where('workspace_id').equals(workspaceId).toArray();
  }

  async saveCashRegister(register, performedBy = 'Propietario', wsId) {
    const workspaceId = wsId || getActiveWorkspaceId();
    const isNew = !register.id;
    const id = register.id || `reg-${workspaceId}-${Date.now()}`;
    const count = await offlineDb.cash_registers.where('workspace_id').equals(workspaceId).count();
    const record = {
      id,
      workspace_id: workspaceId,
      code: register.code || `CAJA-0${count + 1}`,
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
      `Caja registradora ${record.name} (${record.code})`,
      workspaceId
    );

    return record;
  }

  async deleteCashRegister(registerId, performedBy = 'Propietario', wsId) {
    const workspaceId = wsId || getActiveWorkspaceId();
    const reg = await offlineDb.cash_registers.get(registerId);
    if (reg) {
      await offlineDb.cash_registers.delete(registerId);
      await this.addAuditLog(
        'REGISTER_DELETED',
        reg.id,
        reg.name,
        'CASHIER',
        performedBy,
        `Caja ${reg.name} eliminada`,
        workspaceId
      );
    }
  }

  // Libro de Auditoría aislado por Workspace
  async getAuditLogs(wsId) {
    const workspaceId = wsId || getActiveWorkspaceId();
    return await offlineDb.audit_logs
      .where('workspace_id')
      .equals(workspaceId)
      .reverse()
      .limit(100)
      .toArray();
  }

  async addAuditLog(action, targetUserId, targetUsername, targetRole, performedByAdmin, details, wsId) {
    try {
      const workspaceId = wsId || getActiveWorkspaceId();
      const log = {
        id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        workspace_id: workspaceId,
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
