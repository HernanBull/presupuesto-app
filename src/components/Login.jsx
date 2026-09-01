import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Loader2, ArrowRight, Shield, User, Key, Mail, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logoAxon from '../logo/logo-sin-fondo.png';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  
  const [viewMode, setViewMode] = useState('admin'); // 'admin' | 'client'
  const [clientCode, setClientCode] = useState('');

  const TRANSITION_DURATION = 1500; // 1.5 seconds

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isResetting) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage('Te hemos enviado un correo con las instrucciones para recuperar tu contraseña.');
        setLoading(false);
      } else {
        // Trigger Deconstruction Animation
        setIsExiting(true);
        setTimeout(async () => {
          try {
            const { error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            if (error) throw error;
          } catch (err) {
            setIsExiting(false);
            setError(err.message || 'Error de autenticación');
            setLoading(false);
          }
        }, TRANSITION_DURATION);
      }
    } catch (err) {
      setError(err.message || 'Error de autenticación');
      setLoading(false);
    }
  };

  const handleClientLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('sdd_projects')
        .select('client_code')
        .eq('client_code', clientCode.trim().toUpperCase())
        .single();
        
      if (error || !data) {
        throw new Error('Código de acceso inválido o expirado.');
      }
      
      // Trigger Deconstruction Animation
      setIsExiting(true);
      setTimeout(() => {
        // Guardar el código en localStorage para que App.jsx lo detecte
        localStorage.setItem('sdd_client_code', data.client_code);
        window.location.reload();
      }, TRANSITION_DURATION);
      
    } catch (err) {
      setError(err.message || 'Código incorrecto');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full font-sans overflow-hidden bg-white">
      
      {/* ====================================================
          PHASE 1: THE BLANK CANVAS GRID (Z-INDEX: 0)
          This is the 3D blueprint that gets revealed when 
          the black world dissolves.
      ==================================================== */}
      <div className="absolute inset-0 z-0 flex items-center justify-center bg-white" style={{
        backgroundImage: `
          linear-gradient(to right, #e5e7eb 1px, transparent 1px),
          linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }}>
        {/* Subtle radial gradient to make the center pop */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(255,255,255,0.8)_100%)]"></div>
        {/* Fake loading spinner that appears when grid is fully revealed */}
        {isExiting && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin z-10"
          ></motion.div>
        )}
      </div>

      {/* ====================================================
          PHASE 2: THE SHATTERING BLACK WORLD (Z-INDEX: 5)
          A grid of blocks that breaks apart to reveal the canvas.
      ==================================================== */}
      <div className="absolute inset-0 z-[5] grid" style={{ gridTemplateColumns: 'repeat(15, 1fr)', gridTemplateRows: 'repeat(15, 1fr)' }}>
        {[...Array(225)].map((_, i) => {
          const x = i % 15;
          const y = Math.floor(i / 15);
          // Calculate diagonal delay (top-left to bottom-right)
          const delay = (x + y) * 0.04;
          // Cols 0-5 are left side (black), Cols 6-14 are right side (zinc-950)
          const isRightSide = x >= 6;
          
          return (
            <motion.div
              key={`block-${i}`}
              className={`w-full h-full ${isRightSide ? 'bg-zinc-950' : 'bg-black'}`}
              // We scale up slightly initially to avoid sub-pixel gaps between grid items
              initial={{ scale: 1.02 }}
              animate={{ 
                scale: isExiting ? 0 : 1.02,
                opacity: isExiting ? 0 : 1,
                rotate: isExiting ? (Math.random() * 90 - 45) : 0, // Chaos rotation
              }}
              transition={{ 
                duration: 0.6, 
                delay: isExiting ? delay : 0, 
                ease: "backIn" 
              }}
            />
          );
        })}
      </div>

      {/* ====================================================
          PHASE 3: THE UI CONTENT (Z-INDEX: 10)
          Transparent backgrounds, fades out quickly before blocks shatter.
      ==================================================== */}
      <div className="absolute inset-0 z-10 flex overflow-hidden pointer-events-none">
        
        {/* We use pointer-events-auto on the inner content to allow clicks */}
        <motion.div 
          className="flex w-full h-full pointer-events-auto"
          animate={{
            scale: isExiting ? 0.8 : 1,
            opacity: isExiting ? 0 : 1,
            filter: isExiting ? 'blur(10px)' : 'blur(0px)'
          }}
          transition={{ duration: 0.5, ease: "easeIn" }} // Fades out faster than blocks shatter
        >

          {/* Lado Izquierdo: Formulario Minimalista */}
          <div className="w-full lg:w-5/12 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 relative z-10 shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
            
            {/* Logo (Solo visible en móviles) */}
            <div className="lg:hidden mb-12 flex justify-center">
              <img src={logoAxon} alt="Axon Logo" className="h-16 w-auto object-contain brightness-200" />
            </div>

            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="w-full max-w-md mx-auto lg:mx-0"
            >
              {/* Header del Formulario */}
              <div className="mb-12">
                <h1 className="text-4xl font-light text-white tracking-wide mb-3">
                  Bienvenido a <span className="font-bold text-amber-500">AXON</span>
                </h1>
                <p className="text-zinc-500 text-sm tracking-widest uppercase">
                  Plataforma de Desarrollo High-End
                </p>
              </div>

              {/* Selector de Modo (Agencia / Cliente) */}
              <div className="flex gap-8 mb-10 border-b border-zinc-900">
                <button
                  type="button"
                  onClick={() => { setViewMode('admin'); setError(null); setMessage(null); }}
                  className={`pb-4 text-sm font-medium tracking-wider uppercase transition-all duration-300 relative ${
                    viewMode === 'admin' ? 'text-amber-500' : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  Acceso Agencia
                  {viewMode === 'admin' && (
                    <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setViewMode('client'); setError(null); setMessage(null); }}
                  className={`pb-4 text-sm font-medium tracking-wider uppercase transition-all duration-300 relative ${
                    viewMode === 'client' ? 'text-amber-500' : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  Portal del Cliente
                  {viewMode === 'client' && (
                    <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                  )}
                </button>
              </div>

              {/* Alertas */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 bg-red-950/30 border-l-4 border-red-500 p-4 text-red-200 text-sm">
                    {error}
                  </motion.div>
                )}
                {message && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 bg-emerald-950/30 border-l-4 border-emerald-500 p-4 text-emerald-200 text-sm">
                    {message}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Formularios Condicionales */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={viewMode}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  {viewMode === 'client' ? (
                    // --- FORMULARIO CLIENTE ---
                    <form onSubmit={handleClientLogin} className="space-y-8">
                      <div className="relative group">
                        <Fingerprint className="absolute left-0 top-3 text-zinc-600 group-focus-within:text-amber-500 transition-colors" size={20} />
                        <input
                          id="clientCode"
                          name="clientCode"
                          type="text"
                          required
                          value={clientCode}
                          onChange={(e) => setClientCode(e.target.value)}
                          placeholder="Código de Proyecto (Ej: PRO-1234)"
                          className="w-full bg-transparent border-0 border-b border-zinc-800 focus:border-amber-500 focus:ring-0 text-white transition-colors py-3 pl-10 pr-0 placeholder-zinc-700 outline-none uppercase tracking-widest text-sm"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading || isExiting}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold tracking-widest uppercase py-4 transition-all duration-300 flex justify-center items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] mt-4"
                      >
                        {loading || isExiting ? <Loader2 className="animate-spin" size={20} /> : (
                          <>
                            Ingresar al Portal <ArrowRight size={18} />
                          </>
                        )}
                      </button>
                      <p className="text-center text-xs text-zinc-600 mt-6 tracking-wide">
                        Contacta a tu Project Manager si perdiste tu código de acceso.
                      </p>
                    </form>

                  ) : (
                    // --- FORMULARIO AGENCIA ---
                    <form onSubmit={handleAuth} className="space-y-8">
                      <div className="relative group">
                        <Mail className="absolute left-0 top-3 text-zinc-600 group-focus-within:text-amber-500 transition-colors" size={20} />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Correo Electrónico Corporativo"
                          className="w-full bg-transparent border-0 border-b border-zinc-800 focus:border-amber-500 focus:ring-0 text-white transition-colors py-3 pl-10 pr-0 placeholder-zinc-700 outline-none text-sm"
                        />
                      </div>

                      {!isResetting && (
                        <div className="relative group">
                          <Key className="absolute left-0 top-3 text-zinc-600 group-focus-within:text-amber-500 transition-colors" size={20} />
                          <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Contraseña Maestra"
                            className="w-full bg-transparent border-0 border-b border-zinc-800 focus:border-amber-500 focus:ring-0 text-white transition-colors py-3 pl-10 pr-0 placeholder-zinc-700 outline-none text-sm"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <button
                          type="button"
                          onClick={() => setIsResetting(!isResetting)}
                          className="text-xs text-zinc-500 hover:text-amber-500 transition-colors tracking-wide"
                        >
                          {isResetting ? 'Volver al inicio de sesión' : '¿Olvidaste tu contraseña?'}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || isExiting}
                        className="w-full bg-zinc-900 border border-zinc-800 hover:border-amber-500 text-white hover:text-amber-500 font-bold tracking-widest uppercase py-4 transition-all duration-300 flex justify-center items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] mt-4"
                      >
                        {loading || isExiting ? <Loader2 className="animate-spin" size={20} /> : (
                          <>
                            {isResetting ? 'Enviar Instrucciones' : 'Desbloquear Bóveda'} <Shield size={18} />
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </motion.div>
              </AnimatePresence>

            </motion.div>
          </div>

          {/* Lado Derecho: Arte y Marca (Oculto en móviles) */}
          <div className="hidden lg:flex lg:w-7/12 relative items-center justify-center overflow-hidden">
            
            {/* Luces y Efectos de Fondo */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.15)_0%,transparent_70%)]"></div>
            <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>
            
            {/* Lluvia de Meteoritos (Estrellas Fugaces) */}
            {[...Array(6)].map((_, i) => {
              const delay = Math.random() * 5;
              const duration = Math.random() * 1.5 + 1.5;
              const top = Math.random() * 50 - 20; 
              const left = Math.random() * 100 - 50; 
              return (
                <motion.div
                  key={`meteor-${i}`}
                  className="absolute h-[2px] w-[150px] bg-gradient-to-r from-transparent via-amber-500 to-white rounded-full shadow-[0_0_10px_rgba(245,158,11,0.8)] z-0"
                  style={{
                    top: `${top}%`,
                    left: `${left}%`,
                    rotate: '45deg',
                  }}
                  initial={{ opacity: 0, x: -500, y: -500 }}
                  animate={{ opacity: [0, 1, 0], x: [0, 1500], y: [0, 1500] }}
                  transition={{
                    duration: duration,
                    repeat: Infinity,
                    repeatDelay: delay,
                    ease: "linear"
                  }}
                >
                  {/* Cabeza del meteorito */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-[3px] bg-white rounded-full shadow-[0_0_15px_#fff]"></div>
                </motion.div>
              );
            })}

            {/* Logo Gigante Central */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, filter: 'blur(10px)' }}
              animate={{ scale: 1, opacity: 0.8, filter: 'blur(0px)' }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
              className="relative z-10 w-96 h-96 flex items-center justify-center"
            >
              {/* Resplandor detrás del logo */}
              <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-[100px] animate-pulse"></div>
              
              <img 
                src={logoAxon} 
                alt="Axon Large Logo" 
                className="w-full h-full object-contain filter drop-shadow-[0_0_30px_rgba(245,158,11,0.3)] brightness-150" 
              />
            </motion.div>

            {/* Partículas Flotantes Decorativas */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute bg-amber-500 rounded-full"
                style={{
                  width: Math.random() * 3 + 1 + 'px',
                  height: Math.random() * 3 + 1 + 'px',
                  top: Math.random() * 100 + '%',
                  left: Math.random() * 100 + '%',
                  opacity: Math.random() * 0.5 + 0.1,
                }}
                animate={{
                  y: [0, Math.random() * -100 - 50],
                  opacity: [null, 0]
                }}
                transition={{
                  duration: Math.random() * 10 + 10,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            ))}

            {/* Marca de Agua Inferior */}
            <div className="absolute bottom-8 right-12 text-zinc-700 text-xs font-medium tracking-[0.3em] uppercase">
              Axon Development Systems © 2026
            </div>
          </div>
          
        </motion.div>
      </div>
    </div>
  );
}
