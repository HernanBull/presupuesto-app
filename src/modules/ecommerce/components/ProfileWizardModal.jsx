import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, MapPin, CreditCard, ChevronRight, Check, X, Loader2, User } from 'lucide-react';

export default function ProfileWizardModal({ isOpen, onClose, customer, onComplete, canClose = true }) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    docId: '',
    address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determinar los pasos necesarios
  const steps = [];
  if (!customer?.name || customer?.name === customer?.email.split('@')[0] || customer?.name === customer?.email) {
    steps.push({ id: 'name', title: 'Nombre Completo', icon: User, placeholder: 'Ej. Juan Pérez', type: 'text' });
  }
  if (!customer?.phone) steps.push({ id: 'phone', title: '¿Cuál es tu número de teléfono?', icon: Phone, placeholder: 'Ej. 0414-1234567', type: 'tel' });
  if (!customer?.docId) steps.push({ id: 'docId', title: 'Cédula o RIF', icon: CreditCard, placeholder: 'Ej. V-20123456', type: 'text' });
  if (!customer?.address) steps.push({ id: 'address', title: 'Dirección de Entrega', icon: MapPin, placeholder: 'Ej. Av. Principal, Res. Las Rosas...', type: 'textarea' });

  useEffect(() => {
    if (isOpen && customer) {
      const defaultName = customer.name;
      const isDefaultName = defaultName === customer.email || defaultName === customer.email.split('@')[0];
      
      setFormData({
        name: isDefaultName ? '' : (defaultName || ''),
        phone: customer.phone || '',
        docId: customer.docId || '',
        address: customer.address || ''
      });
      setStep(0);
    }
  }, [isOpen, customer]);

  if (!isOpen || steps.length === 0) return null;

  const currentStep = steps[step];

  const handleNext = async () => {
    if (!formData[currentStep.id].trim()) return;
    
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      // Guardar
      setIsSubmitting(true);
      try {
        const res = await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/customers/${customer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...customer,
            ...formData
          })
        });
        
        if (res.ok) {
          const updatedCustomer = { ...customer, ...formData };
          onComplete(updatedCustomer);
        } else {
          alert('Error al guardar los datos');
        }
      } catch (err) {
        console.error(err);
        alert('Error de conexión');
      }
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNext();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-[#111111] border border-white/10 rounded-3xl p-8 shadow-2xl relative w-full max-w-md z-10 overflow-hidden"
          >
            {canClose && (
              <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-2">
                <X size={20} />
              </button>
            )}

            {/* Progreso */}
            <div className="flex gap-2 mb-8 mt-2">
              {steps.map((s, idx) => (
                <div key={s.id} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${idx <= step ? 'bg-indigo-500' : 'bg-white/10'}`} />
              ))}
            </div>

            <div className="min-h-[160px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep.id}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                      <currentStep.icon size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white">{currentStep.title}</h3>
                  </div>

                  {currentStep.type === 'textarea' ? (
                    <textarea 
                      autoFocus
                      value={formData[currentStep.id]}
                      onChange={(e) => setFormData({...formData, [currentStep.id]: e.target.value})}
                      onKeyDown={handleKeyDown}
                      placeholder={currentStep.placeholder}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
                    />
                  ) : (
                    <input 
                      autoFocus
                      type={currentStep.type}
                      value={formData[currentStep.id]}
                      onChange={(e) => setFormData({...formData, [currentStep.id]: e.target.value})}
                      onKeyDown={handleKeyDown}
                      placeholder={currentStep.placeholder}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-8 flex justify-end">
              <button 
                onClick={handleNext}
                disabled={!formData[currentStep.id]?.trim() || isSubmitting}
                className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:hover:bg-indigo-500"
              >
                {isSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    {step < steps.length - 1 ? 'Siguiente' : 'Completar'}
                    {step < steps.length - 1 ? <ChevronRight size={18} /> : <Check size={18} />}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
