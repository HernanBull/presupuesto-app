// ==============================================================================
// AXONMARKET & AXONPOS — Modal para Cambio Seguro & Recuperación de PIN Maestro
// Incluye Soporte de Doble Factor (Google Authenticator 2FA) y Recuperación por Contraseña
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  Crown,
  KeyRound,
  ShieldAlert,
  Eye,
  EyeOff,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  Smartphone,
  QrCode,
  ArrowLeft,
  Key,
  Mail,
  ShieldCheck,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as OTPAuth from 'otpauth';
import { authService, getActiveWorkspaceId } from '../../services/authService';
import { supabase } from '../../../../supabaseClient';
import toast from 'react-hot-toast';

export default function ChangeMasterPinModal({ isOpen, onClose, onSuccess, initialView = 'change' }) {
  // viewMode: 'change' | 'recovery' | 'reset_pin' | 'setup_2fa'
  const [viewMode, setViewMode] = useState(initialView);
  const [recoveryMethod, setRecoveryMethod] = useState('password'); // 'password' | 'totp'

  // Datos para cambio estándar
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPins, setShowPins] = useState(false);
  const [loading, setLoading] = useState(false);

  // Datos de cuenta y recuperación
  const [ownerEmail, setOwnerEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Google Authenticator (TOTP)
  const [totpSecret, setTotpSecret] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [hasConfigured2FA, setHasConfigured2FA] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [storeName, setStoreName] = useState('AxonMarket POS');

  const workspaceId = getActiveWorkspaceId();

  useEffect(() => {
    if (isOpen) {
      setViewMode(initialView || 'change');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setAccountPassword('');
      setTotpToken('');

      // Cargar información de la cuenta y configuración 2FA
      loadAccountAnd2FAData();
    }
  }, [isOpen, initialView]);

  const loadAccountAnd2FAData = async () => {
    // 1. Obtener email del usuario actual desde Supabase o localStorage
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setOwnerEmail(user.email);
      } else {
        const storedInfo = JSON.parse(localStorage.getItem('storeInfo') || '{}');
        const merchantEmail = storedInfo.email || storedInfo.contactEmail || 'admin@axonmarket.vip';
        setOwnerEmail(merchantEmail);
      }
    } catch (e) {
      const storedInfo = JSON.parse(localStorage.getItem('storeInfo') || '{}');
      setOwnerEmail(storedInfo.email || 'admin@axonmarket.vip');
    }

    // 2. Obtener nombre de la tienda
    try {
      const storedInfo = JSON.parse(localStorage.getItem('storeInfo') || '{}');
      if (storedInfo.name) setStoreName(storedInfo.name);
    } catch (e) {}

    // 3. Revisar si hay un secreto de Google Authenticator guardado
    let secret = localStorage.getItem(`axon_totp_secret_${workspaceId}`);
    if (!secret) {
      try {
        const { data: ws } = await supabase.from('workspaces').select('config').eq('id', workspaceId).maybeSingle();
        if (ws?.config?.totpSecret) {
          secret = ws.config.totpSecret;
          localStorage.setItem(`axon_totp_secret_${workspaceId}`, secret);
        }
      } catch (err) {}
    }

    if (secret) {
      setTotpSecret(secret);
      setHasConfigured2FA(true);
    } else {
      // Generar nuevo secreto en Base32 para configuración
      const newSec = new OTPAuth.Secret({ size: 20 });
      setTotpSecret(newSec.base32);
      setHasConfigured2FA(false);
    }
  };

  if (!isOpen) return null;

  // Generar URL del código QR para Google Authenticator
  const getTotpQrUri = () => {
    if (!totpSecret) return '';
    try {
      const totp = new OTPAuth.TOTP({
        issuer: 'AxonPOS',
        label: ownerEmail || 'Propietario',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(totpSecret)
      });
      return totp.toString();
    } catch (e) {
      return '';
    }
  };

  // Manejar cambio normal con PIN actual
  const handleStandardSubmit = async (e) => {
    e.preventDefault();
    if (!currentPin.trim()) {
      toast.error('Debe ingresar su PIN actual.');
      return;
    }
    if (newPin.trim().length < 4) {
      toast.error('El nuevo PIN debe tener al menos 4 dígitos.');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('Los nuevos PINes no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const isValid = await authService.verifyMasterPin(currentPin);
      if (!isValid) {
        toast.error('El PIN actual es incorrecto.');
        setLoading(false);
        return;
      }

      await authService.changeMasterPin(newPin);
      toast.success('¡PIN Maestro actualizado con éxito!');
      if (onSuccess) onSuccess(newPin);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error al actualizar el PIN Maestro');
    } finally {
      setLoading(false);
    }
  };

  // Validar contraseña de cuenta para recuperación
  const handleVerifyPassword = async (e) => {
    e.preventDefault();
    if (!accountPassword.trim()) {
      toast.error('Ingrese la contraseña de su cuenta.');
      return;
    }

    setLoading(true);
    try {
      // Verificar credenciales en Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: ownerEmail,
        password: accountPassword
      });

      if (error) {
        // Si no está registrado en Supabase Auth o es una clave local maestra
        const localMasterPass = localStorage.getItem('master_account_password');
        if (localMasterPass && localMasterPass === accountPassword) {
          // Aceptado vía fallback local
        } else {
          throw new Error('Contraseña de cuenta incorrecta. Verifique sus credenciales.');
        }
      }

      toast.success('Identidad confirmada. Ahora defina su nuevo PIN Maestro.');
      setViewMode('reset_pin');
    } catch (err) {
      toast.error(err.message || 'Error de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  // Validar código de Google Authenticator
  const handleVerifyTotp = async (e) => {
    e.preventDefault();
    if (!totpToken.trim() || totpToken.trim().length !== 6) {
      toast.error('Ingrese el código de 6 dígitos de Google Authenticator.');
      return;
    }

    setLoading(true);
    try {
      const totp = new OTPAuth.TOTP({
        issuer: 'AxonPOS',
        label: ownerEmail || 'Propietario',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(totpSecret)
      });

      const delta = totp.validate({ token: totpToken.trim(), window: 2 });
      if (delta === null) {
        throw new Error('Código de Google Authenticator incorrecto o expirado.');
      }

      // Si estaba en modo setup, persistir el secreto 2FA
      if (viewMode === 'setup_2fa' || !hasConfigured2FA) {
        localStorage.setItem(`axon_totp_secret_${workspaceId}`, totpSecret);
        try {
          const { data: ws } = await supabase.from('workspaces').select('config').eq('id', workspaceId).maybeSingle();
          const currentConfig = ws?.config || {};
          await supabase.from('workspaces').update({
            config: {
              ...currentConfig,
              totpSecret: totpSecret,
              totpEnabled: true
            }
          }).eq('id', workspaceId);
        } catch (e) {}
        setHasConfigured2FA(true);
        toast.success('¡Google Authenticator vinculado y verificado con éxito!');
      } else {
        toast.success('Código 2FA validado con éxito.');
      }

      // Si venía de recuperación, pasar a reset_pin
      if (viewMode === 'recovery') {
        setViewMode('reset_pin');
      } else {
        onClose();
      }
    } catch (err) {
      toast.error(err.message || 'Código 2FA inválido.');
    } finally {
      setLoading(false);
    }
  };

  // Guardar nuevo PIN tras rescate/recuperación
  const handleResetPinSubmit = async (e) => {
    e.preventDefault();
    if (newPin.trim().length < 4) {
      toast.error('El nuevo PIN debe tener al menos 4 dígitos.');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('Los nuevos PINes no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await authService.changeMasterPin(newPin, 'Recuperación de Propietario');
      
      // Registrar evento auditado de rescate
      await authService.addAuditLog(
        'MASTER_PIN_RESET',
        'master',
        ownerEmail || 'propietario',
        'MASTER',
        'Propietario',
        'PIN Maestro restablecido mediante recuperación de identidad (Contraseña/Google 2FA)',
        workspaceId
      );

      toast.success('¡Nuevo PIN Maestro establecido con éxito!');
      if (onSuccess) onSuccess(newPin);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error al restablecer el PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* ========================================================
            CABECERA DEL MODAL
            ======================================================== */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Crown size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-white leading-tight">
                {viewMode === 'change' && 'Cambiar PIN Maestro'}
                {viewMode === 'recovery' && 'Recuperar PIN Maestro'}
                {viewMode === 'reset_pin' && 'Nuevo PIN Maestro'}
                {viewMode === 'setup_2fa' && 'Google Authenticator (2FA)'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {viewMode === 'change' && 'Seguridad privada del Propietario'}
                {viewMode === 'recovery' && 'Verificación de identidad del dueño'}
                {viewMode === 'reset_pin' && 'Crea tu nuevo código de 4 dígitos'}
                {viewMode === 'setup_2fa' && 'Protege tu negocio con doble factor'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ========================================================
            MODO 1: CAMBIO DE PIN HABITUAL
            ======================================================== */}
        {viewMode === 'change' && (
          <form onSubmit={handleStandardSubmit} className="p-5 space-y-4 overflow-y-auto">
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-zinc-300 block mb-1">
                PIN Actual *
              </label>
              <input
                type={showPins ? 'text' : 'password'}
                maxLength={6}
                value={currentPin}
                onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-center font-mono text-xl tracking-widest text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-zinc-300 block mb-1">
                  Nuevo PIN (4-6 dígitos) *
                </label>
                <input
                  type={showPins ? 'text' : 'password'}
                  maxLength={6}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-center font-mono text-xl tracking-widest text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-zinc-300 block mb-1">
                  Confirmar Nuevo PIN *
                </label>
                <input
                  type={showPins ? 'text' : 'password'}
                  maxLength={6}
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-center font-mono text-xl tracking-widest text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <button
                type="button"
                onClick={() => setShowPins(!showPins)}
                className="flex items-center gap-1.5 text-orange-600 hover:text-orange-700 font-bold cursor-pointer"
              >
                {showPins ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{showPins ? 'Ocultar dígitos' : 'Mostrar dígitos'}</span>
              </button>
              <span className="text-[11px] text-slate-400">PIN inicial: 1234</span>
            </div>

            {/* BOTÓN RESCATE / RECUPERACIÓN */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setViewMode('recovery')}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl transition-colors cursor-pointer"
              >
                <ShieldAlert size={14} />
                <span>¿Olvidaste tu PIN Maestro? Recuperar acceso aquí</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('setup_2fa')}
                className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center gap-1.5 py-1 transition-colors cursor-pointer"
              >
                <Smartphone size={13} className="text-orange-500" />
                <span>{hasConfigured2FA ? 'Gestionar Google Authenticator (2FA)' : 'Vincular Google Authenticator (2FA)'}</span>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 transition-all cursor-pointer"
              >
                {loading ? 'Guardando...' : 'Guardar Nuevo PIN'}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================
            MODO 2: RECUPERACIÓN DE IDENTIDAD (SI OLVIDÓ EL PIN)
            ======================================================== */}
        {viewMode === 'recovery' && (
          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="p-3 bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl flex items-start gap-2.5 text-xs">
              <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-200">
                  Recuperación Segura de Propietario
                </p>
                <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                  Confirma tu identidad como dueño del negocio para restablecer el PIN sin necesidad de saber el anterior.
                </p>
              </div>
            </div>

            {/* Selector de Método de Recuperación */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl">
              <button
                type="button"
                onClick={() => setRecoveryMethod('password')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  recoveryMethod === 'password'
                    ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800'
                }`}
              >
                <Key size={13} />
                <span>Contraseña Cuenta</span>
              </button>

              <button
                type="button"
                onClick={() => setRecoveryMethod('totp')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  recoveryMethod === 'totp'
                    ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800'
                }`}
              >
                <Smartphone size={13} />
                <span>Google Auth (2FA)</span>
              </button>
            </div>

            {/* MÉTODO A: CONTRASEÑA DE CUENTA */}
            {recoveryMethod === 'password' && (
              <form onSubmit={handleVerifyPassword} className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-zinc-300 block mb-1">
                    Correo del Propietario
                  </label>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-zinc-300">
                    <Mail size={14} className="text-slate-400" />
                    <span className="font-medium truncate">{ownerEmail || 'admin@axonmarket.vip'}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-zinc-300 block mb-1">
                    Contraseña de tu Cuenta Axon / Supabase *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={accountPassword}
                      onChange={e => setAccountPassword(e.target.value)}
                      placeholder="Ingresa tu contraseña"
                      className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 pr-10"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setViewMode('change')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft size={13} />
                    <span>Volver</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/25 transition-all cursor-pointer"
                  >
                    {loading ? 'Verificando...' : 'Verificar y Restablecer'}
                  </button>
                </div>
              </form>
            )}

            {/* MÉTODO B: GOOGLE AUTHENTICATOR (TOTP) */}
            {recoveryMethod === 'totp' && (
              <form onSubmit={handleVerifyTotp} className="space-y-3.5">
                {hasConfigured2FA ? (
                  <>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                      Abre la aplicación <b>Google Authenticator</b> en tu teléfono e introduce el código numérico de 6 dígitos:
                    </p>

                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-zinc-300 block mb-1 text-center">
                        Código de 6 dígitos
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={totpToken}
                        onChange={e => setTotpToken(e.target.value.replace(/\D/g, ''))}
                        placeholder="000 000"
                        className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-center font-mono text-2xl tracking-widest text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        autoFocus
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-3 py-2">
                    <Smartphone size={32} className="mx-auto text-amber-500" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                        Aún no tienes Google Authenticator vinculado
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Puedes usar la opción de <b>Contraseña Cuenta</b> para recuperar el PIN ahora, o vincular Google Authenticator a continuación.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setViewMode('setup_2fa')}
                      className="w-full py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Configurar Google Authenticator Ahora
                    </button>
                  </div>
                )}

                {hasConfigured2FA && (
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setViewMode('change')}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft size={13} />
                      <span>Volver</span>
                    </button>

                    <button
                      type="submit"
                      disabled={loading || totpToken.length !== 6}
                      className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/25 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {loading ? 'Validando...' : 'Validar Código 2FA'}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        )}

        {/* ========================================================
            MODO 3: ESTABLECER NUEVO PIN TRAS IDENTIFICACIÓN
            ======================================================== */}
        {viewMode === 'reset_pin' && (
          <form onSubmit={handleResetPinSubmit} className="p-5 space-y-4 overflow-y-auto">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">Identidad Verificada</p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Establece un nuevo PIN Maestro de 4 a 6 dígitos para tu comercio.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-zinc-300 block mb-1">
                  Nuevo PIN *
                </label>
                <input
                  type={showPins ? 'text' : 'password'}
                  maxLength={6}
                  required
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-center font-mono text-xl tracking-widest text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-zinc-300 block mb-1">
                  Confirmar Nuevo PIN *
                </label>
                <input
                  type={showPins ? 'text' : 'password'}
                  maxLength={6}
                  required
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-center font-mono text-xl tracking-widest text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <button
                type="button"
                onClick={() => setShowPins(!showPins)}
                className="flex items-center gap-1.5 text-orange-600 hover:text-orange-700 font-bold cursor-pointer"
              >
                {showPins ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{showPins ? 'Ocultar dígitos' : 'Mostrar dígitos'}</span>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/25 transition-all cursor-pointer"
              >
                {loading ? 'Restableciendo...' : 'Restablecer y Guardar PIN'}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================
            MODO 4: VINCULACIÓN DE GOOGLE AUTHENTICATOR (2FA)
            ======================================================== */}
        {viewMode === 'setup_2fa' && (
          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="text-center space-y-1">
              <span className="bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <Smartphone size={11} />
                <span>Google Authenticator (2FA)</span>
              </span>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Escanea el código QR con la app <b>Google Authenticator</b> en tu teléfono.
              </p>
            </div>

            {/* Código QR */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-inner flex flex-col items-center justify-center">
              {totpSecret ? (
                <QRCodeSVG
                  value={getTotpQrUri()}
                  size={170}
                  level="M"
                  includeMargin={false}
                  className="rounded-lg"
                />
              ) : (
                <div className="w-40 h-40 bg-slate-100 flex items-center justify-center text-slate-400">
                  <RefreshCw size={24} className="animate-spin" />
                </div>
              )}
              <span className="text-[10px] text-slate-400 font-bold mt-2">
                Escanea con la app Google Authenticator
              </span>
            </div>

            {/* Clave Manual en Texto */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Clave Secreta Manual (si no puedes escanear)
              </label>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 p-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
                <span className="font-mono text-slate-700 dark:text-zinc-200 text-xs tracking-wider select-all truncate">
                  {totpSecret}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(totpSecret);
                    setCopiedSecret(true);
                    toast.success('Clave secreta copiada');
                    setTimeout(() => setCopiedSecret(false), 2000);
                  }}
                  className="p-1.5 bg-white dark:bg-zinc-700 hover:bg-orange-500 hover:text-white rounded-lg transition-colors shrink-0 cursor-pointer"
                  title="Copiar Clave Secreta"
                >
                  {copiedSecret ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            {/* Formulario de Confirmación de 6 Dígitos */}
            <form onSubmit={handleVerifyTotp} className="space-y-3 pt-1 border-t border-slate-100 dark:border-white/5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-200 block mb-1">
                  Introduce el código de 6 dígitos que muestra tu app *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={totpToken}
                  onChange={e => setTotpToken(e.target.value.replace(/\D/g, ''))}
                  placeholder="000 000"
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-center font-mono text-xl tracking-widest text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setViewMode('change')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>Volver</span>
                </button>

                <button
                  type="submit"
                  disabled={loading || totpToken.length !== 6}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Confirmando...' : 'Confirmar y Activar 2FA'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
