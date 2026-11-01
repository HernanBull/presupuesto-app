// ==============================================================================
// AXONMARKET & AXONPOS — Modal para Cambio Seguro de PIN Maestro del Propietario
// ==============================================================================

import React, { useState } from 'react';
import { Crown, KeyRound, ShieldAlert, Eye, EyeOff, Lock, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';

export default function ChangeMasterPinModal({ isOpen, onClose, onSuccess }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPins, setShowPins] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
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

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-md overflow-hidden">
        
        <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Crown size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-white">Cambiar PIN Maestro</h3>
              <p className="text-xs text-slate-400">Seguridad privada del Propietario</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-zinc-300 block mb-1">PIN Actual *</label>
            <div className="relative">
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-zinc-300 block mb-1">Nuevo PIN (4-6 dígitos) *</label>
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
              <label className="text-xs font-bold text-slate-600 dark:text-zinc-300 block mb-1">Confirmar Nuevo PIN *</label>
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
            <span className="text-[11px] text-slate-400">Por defecto inicial: 1234</span>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
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

      </div>
    </div>
  );
}
