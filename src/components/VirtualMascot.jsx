import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import mascotaImg from '../logo/mascota.png';

export function VirtualMascot() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Generate random properties for speed lines once
  const speedLines = React.useMemo(() => {
    return Array.from({ length: 20 }).map(() => ({
      left: `${Math.random() * 100}%`,
      height: `${Math.random() * 100 + 50}px`,
      duration: Math.random() * 1.5 + 0.5,
      delay: Math.random() * 2
    }));
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Calculate mouse position relative to center of screen for tilt
      const x = (e.clientX / window.innerWidth) - 0.5;
      const y = (e.clientY / window.innerHeight) - 0.5;
      
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Calculate tilt based on mouse position
  // Suave para que se vea natural como un render 3D
  const rotateX = mousePosition.y * -25;
  const rotateY = mousePosition.x * 25;

  return (
    <div className="relative flex justify-center items-center w-full h-full lg:h-[600px] perspective-[1000px]">
      {/* Sci-Fi Flying Grid */}
      <div 
        className="absolute inset-0 pointer-events-none overflow-hidden -z-10"
        style={{
          WebkitMaskImage: 'radial-gradient(circle at center, black 10%, transparent 60%)',
          maskImage: 'radial-gradient(circle at center, black 10%, transparent 60%)'
        }}
      >
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%]"
          style={{ transform: 'perspective(400px) rotateX(60deg) translateY(100px)' }}
        >
          <motion.div 
            className="absolute inset-0 bg-[linear-gradient(to_right,rgba(245,158,11,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(245,158,11,0.2)_1px,transparent_1px)] bg-[size:50px_50px]"
            animate={{
              backgroundPosition: ['0px 0px', '0px 50px']
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </div>
      </div>

      {/* Speed Lines / Data Streams */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden"
        style={{
          WebkitMaskImage: 'radial-gradient(circle at center, black 20%, transparent 70%)',
          maskImage: 'radial-gradient(circle at center, black 20%, transparent 70%)'
        }}
      >
         {speedLines.map((line, i) => (
           <motion.div
             key={i}
             className="absolute w-px bg-gradient-to-b from-transparent via-amber-400 to-transparent opacity-40"
             style={{ 
               left: line.left,
               height: line.height,
             }}
             animate={{
               top: ['-20%', '120%']
             }}
             transition={{
               duration: line.duration,
               repeat: Infinity,
               ease: "linear",
               delay: line.delay
             }}
           />
         ))}
      </div>

      {/* Decorative Background Glow for the whole hero side */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-amber-500/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none z-0"></div>

      <motion.div
        animate={{ 
          rotateX, 
          rotateY, 
          y: [0, -20, 0] // Levitation effect
        }}
        transition={{ 
          y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" }, 
          rotateX: { type: "spring", stiffness: 100, damping: 20 }, 
          rotateY: { type: "spring", stiffness: 100, damping: 20 } 
        }}
        className="relative flex justify-center items-center z-10"
      >

          <img 
            src={mascotaImg} 
            alt="Axon AI Assistant" 
            className="w-64 h-64 sm:w-80 sm:h-80 lg:w-[450px] lg:h-[450px] object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.8)] pointer-events-none relative z-10"
            draggable="false"
          />
        </motion.div>
      </div>
  );
}
