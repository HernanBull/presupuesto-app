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

  const TRANSITION_DURATION = 3500; // 3.5 seconds

  const playShatterSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // Bass Drop (Sci-Fi Boom)
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.5);
      gainNode.gain.setValueAtTime(1.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.5);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 2.5);

      // Glass Shatter (Filtered white noise)
      const bufferSize = ctx.sampleRate * 2.0;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 4000;
      
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.8, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
      
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start();
    } catch (e) {
      console.log("Audio not supported", e);
    }
  };

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
        playShatterSound();
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
      playShatterSound();
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
          A grid of blocks that breaks apart physically to reveal the canvas.
      ==================================================== */}
      <div className="absolute inset-0 z-[5] grid" style={{ gridTemplateColumns: 'repeat(15, 1fr)', gridTemplateRows: 'repeat(15, 1fr)', perspective: '1000px' }}>
        {[...Array(225)].map((_, i) => {
          const x = i % 15;
          const y = Math.floor(i / 15);
          // Calculate diagonal delay (top-left to bottom-right)
          const delay = (x + y) * 0.08;
          
          return (
            <motion.div
              key={`block-${i}`}
              className="w-full h-full bg-zinc-950"
              // We scale up slightly initially to avoid sub-pixel gaps between grid items
              initial={{ scale: 1.05, x: 0, y: 0, z: 0 }}
              animate={{ 
                scale: isExiting ? 0 : 1.05,
                opacity: isExiting ? 0 : 1,
                x: isExiting ? (Math.random() * 600 - 300) : 0,      // Explode outwards X
                y: isExiting ? (Math.random() * 600 - 300) : 0,      // Explode outwards Y
                z: isExiting ? (Math.random() * 800 - 200) : 0,      // Fly into 3D space
                rotateX: isExiting ? (Math.random() * 720 - 360) : 0, // Crazy 3D tumble
                rotateY: isExiting ? (Math.random() * 720 - 360) : 0, // Crazy 3D tumble
                rotateZ: isExiting ? (Math.random() * 180 - 90) : 0,  // Spin
              }}
              transition={{ 
                duration: 2.2, 
                delay: isExiting ? delay : 0, 
                ease: [0.16, 1, 0.3, 1] // Snappy exponential out
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
        
        {/* ====================================================
            GLOBAL BACKGROUND EFFECTS (Full Screen)
        ==================================================== */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {/* Luces y Efectos de Fondo Globales */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.1)_0%,transparent_80%)]"></div>
          
          {/* Lluvia de Meteoritos (Estrellas Fugaces) */}
          {[...Array(8)].map((_, i) => {
            const delay = Math.random() * 5;
            const duration = Math.random() * 1.5 + 1.5;
            const top = Math.random() * 80 - 10; 
            const left = Math.random() * 120 - 10; 
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

          {/* Partículas Flotantes Decorativas */}
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute bg-amber-500 rounded-full"
              style={{
                width: Math.random() * 3 + 1 + 'px',
                height: Math.random() * 3 + 1 + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                opacity: Math.random() * 0.4 + 0.1,
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
        </div>

        {/* We use pointer-events-auto on the inner content to allow clicks */}
        <motion.div 
          className="flex flex-col lg:flex-row w-full h-full pointer-events-auto relative z-10 p-4 lg:p-0"
          animate={{
            scale: isExiting ? 0.8 : 1,
            opacity: isExiting ? 0 : 1,
            filter: isExiting ? 'blur(10px)' : 'blur(0px)'
          }}
          transition={{ duration: 0.5, ease: "easeIn" }} // Fades out faster than blocks shatter
        >

          {/* Lado Izquierdo: Formulario Minimalista */}
          <div className="w-full max-w-md mx-auto lg:max-w-none lg:mx-0 lg:w-5/12 flex flex-col justify-center px-6 sm:px-12 lg:px-24 xl:px-32 relative z-20 bg-zinc-950 shadow-[0_20px_50px_rgba(0,0,0,0.8)] lg:shadow-[20px_0_50px_rgba(0,0,0,0.8)] border border-white/[0.04] lg:border-t-0 lg:border-b-0 lg:border-l-0 rounded-3xl lg:rounded-none my-auto lg:my-0 py-10 lg:py-0 h-auto lg:h-full">
            
            {/* Reflejo de luz orgánico y premium en el borde de cristal */}
            <div className="hidden lg:block absolute top-0 right-0 w-[1px] h-full overflow-hidden opacity-80 mix-blend-screen">
              <motion.div
                className="w-full h-[40vh] bg-gradient-to-b from-transparent via-amber-400/80 to-transparent"
                animate={{ 
                  y: ["-100%", "250%"],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: [0.4, 0, 0.2, 1], // Cubic bezier para un movimiento muy orgánico (lento en los bordes, rápido al centro)
                }}
              />
              <motion.div
                className="absolute top-0 w-full h-[20vh] bg-gradient-to-b from-transparent via-white/50 to-transparent"
                animate={{ 
                  y: ["250%", "-100%"],
                }}
                transition={{
                  duration: 12,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </div>
            
            {/* Logo Animado (Solo visible en móviles) */}
            <div className="lg:hidden mb-12 flex justify-center relative" style={{ perspective: '1000px' }}>
              <motion.img 
                src={logoAxon} 
                alt="Axon Logo" 
                className="h-16 w-auto object-contain brightness-200 relative z-10"
                animate={{ 
                  y: [-3, 3, -3],
                  rotateY: [-15, 15, -15],
                  rotateX: [5, -5, 5],
                  scale: [1, 1.05, 1]
                }}
                transition={{
                  duration: 6, repeat: Infinity, ease: "easeInOut" 
                }}
              />
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
                        className="group relative w-full overflow-hidden bg-[#111] hover:bg-[#1a1a1a] border border-white/5 hover:border-amber-500/30 text-zinc-400 hover:text-amber-400 font-light tracking-[0.2em] uppercase py-4 px-6 transition-all duration-500 flex justify-center items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_30px_rgba(245,158,11,0.1)] mt-6 rounded-sm"
                      >
                        {/* Brillo dinámico en hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>
                        
                        <span className="relative z-10 flex items-center gap-3">
                          {loading || isExiting ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                              {isResetting ? 'Enviar Instrucciones' : 'Iniciar Sesión'} 
                              <ArrowRight size={18} className="transition-transform duration-500 group-hover:translate-x-2 opacity-70 group-hover:opacity-100" />
                            </>
                          )}
                        </span>
                      </button>
                    </form>
                  )}
                </motion.div>
              </AnimatePresence>

            </motion.div>
          </div>

          {/* Lado Derecho: Arte y Marca (Oculto en móviles) */}
          <div className="hidden lg:flex lg:w-7/12 relative items-center justify-center overflow-hidden pointer-events-none">
            
            {/* Logo Gigante Central */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, filter: 'blur(10px)' }}
              animate={{ scale: 1, opacity: 0.8, filter: 'blur(0px)' }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
              className="relative z-10 w-96 h-96 flex items-center justify-center"
              style={{ perspective: '1000px' }}
            >
              <motion.img 
                src={logoAxon} 
                alt="Axon Large Logo" 
                className="w-full h-full object-contain brightness-150"
                animate={{ 
                  y: [-8, 8, -8],
                  rotateY: [-15, 15, -15],
                  rotateX: [5, -5, 5],
                  scale: [1, 1.03, 1]
                }}
                transition={{
                  duration: 8, repeat: Infinity, ease: "easeInOut" 
                }}
              />
            </motion.div>

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
