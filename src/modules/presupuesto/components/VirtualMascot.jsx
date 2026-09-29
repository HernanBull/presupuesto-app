import React from 'react';
import { motion } from 'framer-motion';
import mascotaImg from '../logo/mascota.png';

export function VirtualMascot() {
  return (
    <div className="relative flex justify-center items-center w-full h-full lg:h-[600px]">
      
      {/* Decorative Background Glow (Lighter for mobile) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] md:w-[80%] md:h-[80%] bg-amber-500/10 blur-[60px] md:blur-[100px] rounded-full mix-blend-screen pointer-events-none z-0"></div>

      <motion.div
        animate={{ 
          y: [0, -15, 0] // Levitación suave
        }}
        transition={{ 
          y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }}
        className="relative flex justify-center items-center z-10"
      >
        <img 
          src={mascotaImg} 
          alt="Axon AI Assistant" 
          className="w-64 h-64 sm:w-80 sm:h-80 lg:w-[450px] lg:h-[450px] object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)] pointer-events-none relative z-10"
          draggable="false"
        />
      </motion.div>
    </div>
  );
}
