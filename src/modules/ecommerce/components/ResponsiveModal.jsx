import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { createPortal } from 'react-dom';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function ResponsiveModal({ isOpen, onClose, title, children, className, contentClassName }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Use createPortal to mount modal at the end of document.body
  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center font-sans">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "relative bg-white dark:bg-zinc-950 shadow-2xl flex flex-col overflow-hidden",
              isMobile
                ? "w-full max-h-[90dvh] rounded-t-3xl pb-6" // Bottom Sheet for mobile
                : "w-full max-w-2xl max-h-[85dvh] rounded-2xl", // Centered Modal for desktop
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle (Mobile only) */}
            {isMobile && (
              <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full" />
              </div>
            )}

            {/* Header - Only render if title is provided */}
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5 shrink-0">
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-full transition-colors active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>
            )}
            
            {/* Close button if no title but we still need a way to close (floating) */}
            {!title && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-white/50 hover:bg-slate-100 dark:bg-black/20 dark:hover:bg-white/10 backdrop-blur-md rounded-full transition-colors active:scale-95"
              >
                <X size={20} />
              </button>
            )}

            {/* Body */}
            <div className={cn("p-6 overflow-y-auto custom-scrollbar flex-1", contentClassName)}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // Solamente renderizar en el cliente (evitar SSR errors si se aplicara) y cuando isOpen o AnimatePresence está activo
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  
  return null;
}
