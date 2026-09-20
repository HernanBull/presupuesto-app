import React from 'react';
import { motion } from 'framer-motion';
import { Star, ShoppingBag, Plus, Heart } from 'lucide-react';

const ProductCard = ({ title, price, store, rating, imageColor, delay, yOffset, scale = 1 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className="absolute"
      style={{ top: yOffset, transform: `scale(${scale})` }}
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4 + Math.random() * 2, repeat: Infinity, ease: "easeInOut", delay: delay }}
        className="w-64 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
      >
        {/* Imagined Product Image Area */}
        <div className={`h-36 w-full relative ${imageColor} bg-opacity-20 flex items-center justify-center overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
          <motion.div 
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.4 }}
            className={`w-24 h-24 rounded-full ${imageColor} shadow-[0_0_40px_rgba(255,255,255,0.1)]`}
          />
          <button className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors">
            <Heart size={14} className="text-white" />
          </button>
        </div>
        
        {/* Product Details Area */}
        <div className="p-4 bg-zinc-900/60 flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-white font-medium text-sm">{title}</h3>
              <p className="text-zinc-400 text-xs mt-0.5">{store}</p>
            </div>
            <div className="flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-500 border border-amber-500/20">
              <Star size={10} fill="currentColor" /> {rating}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-white font-semibold">${price}</span>
            <button className="w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Plus size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const SocialProofBadge = ({ delay, top, left, right }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
    className="absolute z-30"
    style={{ top, left, right }}
  >
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: delay + 0.5 }}
      className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-4 py-3 flex items-center gap-3 shadow-2xl"
    >
      <div className="flex -space-x-2">
        {[1,2,3].map(i => (
          <div key={i} className="w-6 h-6 rounded-full bg-zinc-700 border border-zinc-900 flex items-center justify-center text-[8px] font-bold text-white/50">
            {String.fromCharCode(64 + i)}
          </div>
        ))}
      </div>
      <div className="flex flex-col">
        <div className="flex text-amber-400">
          {[1,2,3,4,5].map(i => <Star key={i} size={10} fill="currentColor" />)}
        </div>
        <span className="text-[10px] text-zinc-300 font-medium">Más de 10k reseñas</span>
      </div>
    </motion.div>
  </motion.div>
);

export const HeroShowcase = () => {
  return (
    <div className="relative w-full h-[600px] flex items-center justify-center">
      
      {/* Subtle Glow Behind the showcase */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Product Cards Floating */}
      <div className="relative w-full max-w-md h-full flex items-center justify-center">
        
        {/* Left Card - Back */}
        <ProductCard 
          title="Pizza Margherita" 
          price="14.99" 
          store="Luigi's Pizzería"
          rating="4.8"
          imageColor="bg-red-500"
          delay={0.4}
          yOffset="10%"
          scale={0.85}
        />
        
        {/* Right Card - Back */}
        <ProductCard 
          title="Fresh Avocado" 
          price="3.50" 
          store="Mercado Verde"
          rating="4.9"
          imageColor="bg-emerald-500"
          delay={0.6}
          yOffset="45%"
          scale={0.85}
        />
        
        {/* Center Card - Front */}
        <div className="z-20 absolute" style={{ top: '25%', left: '50%', transform: 'translateX(-50%)' }}>
           <ProductCard 
             title="Premium Sushi Roll" 
             price="24.00" 
             store="Sushi Club"
             rating="5.0"
             imageColor="bg-amber-500"
             delay={0.8}
             yOffset="0"
             scale={1.1}
           />
        </div>
        
        {/* Badges */}
        <SocialProofBadge delay={1.2} top="15%" right="-10%" />
        
        {/* Small floating element */}
        <motion.div
           initial={{ opacity: 0, scale: 0 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.8, delay: 1.5, ease: "backOut" }}
           className="absolute z-30 bottom-[25%] left-0 w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.4)]"
        >
          <ShoppingBag size={20} className="text-black" />
        </motion.div>
      </div>
    </div>
  );
};
