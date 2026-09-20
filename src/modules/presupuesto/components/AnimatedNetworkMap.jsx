import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Box, Zap } from 'lucide-react';

export const AnimatedNetworkMap = () => {
  // SVG Paths representing delivery routes
  const paths = [
    "M 100 400 Q 250 200 400 300 T 700 150",
    "M 150 150 Q 350 350 550 200 T 800 400",
    "M 200 500 Q 400 600 600 400 T 850 250",
    "M 50 250 Q 250 100 500 300 T 750 500"
  ];

  const nodes = [
    { x: 100, y: 400, label: "Centro Logístico" },
    { x: 400, y: 300, label: "Bodega Norte" },
    { x: 700, y: 150, label: "Cliente Final" },
    { x: 150, y: 150, label: "Tienda Matriz" },
    { x: 550, y: 200, label: "Picking Hub" },
    { x: 800, y: 400, label: "Punto de Entrega" },
    { x: 200, y: 500, label: "Proveedor" },
    { x: 600, y: 400, label: "Bodega Sur" }
  ];

  return (
    <div className="relative w-full h-[500px] bg-zinc-950/40 rounded-[3rem] overflow-hidden border border-white/5 flex items-center justify-center">
      {/* Abstract Tech Background Grid */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at center, #f59e0b 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Main SVG Container */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="15" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Static Routes Base Lines */}
        {paths.map((path, i) => (
          <path
            key={`base-${i}`}
            d={path}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="3"
            strokeDasharray="10 10"
          />
        ))}

        {/* Animated Moving Routes (The 'GPS / Vehicles') */}
        {paths.map((path, i) => (
          <motion.path
            key={`anim-${i}`}
            d={path}
            fill="none"
            stroke="url(#glowGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            filter="url(#neonGlow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 1, 0] }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              ease: "linear",
              delay: i * 1.5
            }}
          />
        ))}

        {/* Radar Pings & Nodes */}
        {nodes.map((node, i) => (
          <g key={`node-${i}`} transform={`translate(${node.x}, ${node.y})`}>
            {/* Pulsing Radar Ring */}
            <motion.circle
              r="20"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
            />
            {/* Core Node Dot */}
            <circle r="6" fill="#f59e0b" filter="url(#neonGlow)" />
            {/* Node Label Text */}
            <text 
              y="25" 
              textAnchor="middle" 
              fill="#a1a1aa" 
              fontSize="12" 
              className="font-bold tracking-widest font-mono"
            >
              {node.label.toUpperCase()}
            </text>
          </g>
        ))}

        {/* Tiny Moving Delivery Icon (GPS simulation) */}
        {paths.map((path, i) => (
           <motion.circle
             key={`veh-${i}`}
             r="4"
             fill="#ffffff"
             filter="url(#neonGlow)"
             animate={{
               offsetDistance: ["0%", "100%"],
               opacity: [0, 1, 1, 0]
             }}
             transition={{
               duration: 4 + Math.random() * 3,
               repeat: Infinity,
               ease: "linear",
               delay: i * 1.5
             }}
             style={{ offsetPath: `path("${path}")` }}
           />
        ))}
      </svg>

      {/* Floating UI Overlay for realism */}
      <div className="absolute top-6 left-6 flex flex-col gap-3">
        <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-white text-xs font-mono font-bold tracking-widest uppercase">Live Tracking</span>
        </div>
        <div className="bg-black/60 backdrop-blur-md border border-white/5 rounded-xl p-4 w-48">
          <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-2">Órdenes Activas</p>
          <p className="text-3xl font-light text-white">1,429</p>
        </div>
      </div>

    </div>
  );
};
