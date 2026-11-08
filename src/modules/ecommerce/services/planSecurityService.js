// src/modules/ecommerce/services/planSecurityService.js
// Servicio de verificación y ciclo de vida del Plan VIP (7 días de prueba)

export const VIP_TRIAL_DURATION_DAYS = 7;

/**
 * Evalúa el estado del plan y suscripción de un workspace.
 * @param {Object} workspace - Objeto del workspace desde Supabase
 * @returns {Object} { isExpired, isTrial, isVipActive, isPendingVerification, daysLeft, status, reason }
 */
export const checkMerchantPlanStatus = (workspace) => {
  if (!workspace) {
    return {
      isExpired: false,
      isTrial: false,
      isVipActive: false,
      isPendingVerification: false,
      daysLeft: 0,
      status: 'Desconocido',
      reason: 'no_workspace'
    };
  }

  const cfg = typeof workspace.config === 'object' && workspace.config !== null
    ? workspace.config
    : (typeof workspace.config === 'string' ? JSON.parse(workspace.config || '{}') : {});

  // 1. Suscripción VIP Activa (aprobada por SuperAdmin)
  if (
    cfg.subscriptionActive === true || 
    workspace.status === 'Suscripcion_Activa' || 
    workspace.status === 'VIP_Activo'
  ) {
    // Si tiene fecha de vencimiento fijada, verificar si ya caducó
    if (cfg.subscriptionEndsAt) {
      const subEnd = new Date(cfg.subscriptionEndsAt);
      if (subEnd.getTime() < Date.now()) {
        return {
          isExpired: true,
          isTrial: false,
          isVipActive: false,
          isPendingVerification: false,
          daysLeft: 0,
          status: 'Suscripción Vencida',
          reason: 'subscription_ended'
        };
      }
    }
    return {
      isExpired: false,
      isTrial: false,
      isVipActive: true,
      isPendingVerification: false,
      daysLeft: 999,
      status: 'VIP Activo',
      reason: 'vip_approved'
    };
  }

  // 2. Pago reportado en proceso de verificación por SuperAdmin
  if (
    workspace.status === 'Pago_En_Revision' || 
    cfg.paymentReported === true || 
    cfg.lastSubscriptionPayment?.status === 'Pendiente'
  ) {
    return {
      isExpired: false,
      isTrial: false,
      isVipActive: false,
      isPendingVerification: true,
      daysLeft: 0,
      status: 'Pago en Revisión',
      reason: 'payment_pending'
    };
  }

  // 3. Período de Prueba VIP de 7 días
  let trialEndDate = null;
  if (cfg.trialEndsAt) {
    trialEndDate = new Date(cfg.trialEndsAt);
  } else if (workspace.created_at) {
    trialEndDate = new Date(new Date(workspace.created_at).getTime() + VIP_TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
  }

  if (trialEndDate && !isNaN(trialEndDate.getTime())) {
    const diffMs = trialEndDate.getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs <= 0) {
      return {
        isExpired: true,
        isTrial: false,
        isVipActive: false,
        isPendingVerification: false,
        daysLeft: 0,
        status: 'Prueba Culminada',
        reason: 'trial_ended',
        trialEndsAt: trialEndDate.toISOString()
      };
    }

    return {
      isExpired: false,
      isTrial: true,
      isVipActive: true, // Durante la prueba goza de todas las funciones VIP
      isPendingVerification: false,
      daysLeft: Math.max(0, diffDays),
      status: 'En Prueba VIP',
      reason: 'trial_active',
      trialEndsAt: trialEndDate.toISOString()
    };
  }

  // Si no tiene fecha, conceder acceso activo estándar
  return {
    isExpired: false,
    isTrial: false,
    isVipActive: true,
    isPendingVerification: false,
    daysLeft: 7,
    status: 'Activo',
    reason: 'default_active'
  };
};

