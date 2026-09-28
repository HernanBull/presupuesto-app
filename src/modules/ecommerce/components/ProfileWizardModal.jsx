import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, MapPin, CreditCard, ChevronRight, Check, X, Loader2, User, Banknote, Image as ImageIcon, Navigation } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const VZLA_BANKS = [
  '0102 - Banco de Venezuela',
  '0104 - Banco Venezolano de Crédito',
  '0105 - Banco Mercantil',
  '0108 - Banco Provincial',
  '0114 - Bancaribe',
  '0115 - Banco Exterior',
  '0128 - Banco Caroní',
  '0134 - Banesco',
  '0138 - Banco Plaza',
  '0151 - Fondo Común (BFC)',
  '0156 - 100% Banco',
  '0157 - Del Sur',
  '0163 - Banco del Tesoro',
  '0166 - Banco Agrícola',
  '0168 - Bancrecer',
  '0169 - Mi Banco',
  '0171 - Banco Activo',
  '0172 - Bancamiga',
  '0174 - Banplus',
  '0175 - Banco Bicentenario',
  '0177 - Banco de las Fuerzas Armadas (Banfanb)',
  '0191 - Banco Nacional de Crédito (BNC)'
];

export default function ProfileWizardModal({ isOpen, onClose, customer, onComplete, canClose = true }) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    docId: '',
    addressSector: '',
    addressDetail: '',
    payment_bank: '',
    payment_phone: '',
    payment_cedula: '',
    payment_titular: '',
    profile_picture: ''
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (isOpen && customer) {
      const defaultName = customer.name;
      const isDefaultName = defaultName === customer.email || defaultName === customer.email.split('@')[0];
      const paymentProfile = customer.payment_profile || {};
      
      let defaultAddress = '';
      if (Array.isArray(customer.addresses) && customer.addresses.length > 0) {
        defaultAddress = customer.addresses.find(a => a.isDefault)?.address || customer.addresses[0].address;
      } else if (typeof customer.addresses === 'string') {
        try {
          const parsed = JSON.parse(customer.addresses);
          if (parsed.length > 0) defaultAddress = parsed.find(a => a.isDefault)?.address || parsed[0].address;
        } catch(e){}
      }
      if (!defaultAddress && customer.address) defaultAddress = customer.address;

      setFormData({
        name: isDefaultName ? '' : (defaultName || ''),
        phone: customer.phone || '',
        docId: customer.docId || '',
        addressSector: '',
        addressDetail: defaultAddress || '',
        payment_bank: paymentProfile.bank || '',
        payment_phone: paymentProfile.phone || '',
        payment_cedula: paymentProfile.cedula || '',
        payment_titular: paymentProfile.titular || '',
        profile_picture: customer.profile_picture || ''
      });
      setStep(0);
    }
  }, [isOpen, customer]);

  if (!isOpen) return null;

  const handleNext = async () => {
    // Validate current step
    if (step === 0 && (!formData.name || !formData.docId || !formData.phone)) return alert('Completa los datos personales');
    if (step === 1 && (!formData.payment_bank || !formData.payment_phone || !formData.payment_cedula || !formData.payment_titular)) return alert('Completa los datos de pago móvil');
    if (step === 2 && !formData.addressDetail) return alert('Ingresa tu dirección de entrega');

    if (step < 3) {
      if (step === 0) {
        setFormData(prev => ({
          ...prev,
          payment_cedula: prev.docId,
          payment_titular: prev.name
        }));
      }
      setStep(step + 1);
    } else {
      setIsSubmitting(true);
      try {
        let pictureUrl = formData.profile_picture;
        
        // Upload picture if selected
        if (imageFile) {
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `profiles/${fileName}`;
          
          const { error: uploadError } = await supabase.storage.from('ecommerce').upload(filePath, imageFile);
          if (!uploadError) {
            const { data } = supabase.storage.from('ecommerce').getPublicUrl(filePath);
            if (data && data.publicUrl) pictureUrl = data.publicUrl;
          }
        }

        const paymentProfile = {
          bank: formData.payment_bank,
          phone: formData.payment_phone,
          cedula: formData.payment_cedula,
          titular: formData.payment_titular
        };

        const finalAddressText = formData.addressSector ? `${formData.addressSector}, ${formData.addressDetail}` : formData.addressDetail;
        
        let existingAddresses = [];
        if (Array.isArray(customer.addresses)) {
          existingAddresses = customer.addresses;
        } else if (typeof customer.addresses === 'string') {
          try { existingAddresses = JSON.parse(customer.addresses); } catch (e) {}
        }

        if (existingAddresses.length === 0) {
          existingAddresses.push({
            id: Date.now().toString(),
            name: 'Principal',
            address: finalAddressText,
            isDefault: true
          });
        } else {
          // Actualizar la dirección principal o la primera
          const defaultIndex = existingAddresses.findIndex(a => a.isDefault);
          if (defaultIndex >= 0) {
            existingAddresses[defaultIndex].address = finalAddressText;
          } else {
            existingAddresses[0].address = finalAddressText;
          }
        }

        const updatePayload = {
          name: formData.name,
          phone: formData.phone,
          doc_id: formData.docId,
          addresses: existingAddresses,
          payment_profile: paymentProfile,
          profile_picture: pictureUrl
        };

        const { error } = await supabase
          .from('ecommerce_customers')
          .update(updatePayload)
          .eq('id', customer.id);
          
        if (error) throw error;
        
        const updatedCustomer = { ...customer, ...updatePayload, docId: formData.docId };
        onComplete(updatedCustomer);
      } catch (err) {
        console.error(err);
        alert('Error guardando los datos. Por favor reintente. (Verifica si agregaste las columnas en Supabase)');
      }
      setIsSubmitting(false);
    }
  };

  const handleDetectLocation = () => {
    setIsDetectingLocation(true);
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      setIsDetectingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const addr = data.display_name || `Lat: ${latitude}, Lng: ${longitude}`;
          setFormData({ ...formData, addressDetail: addr });
        } catch(e) {
          setFormData({ ...formData, addressDetail: `${latitude}, ${longitude}` });
        }
        setIsDetectingLocation(false);
      },
      (error) => {
        alert('No se pudo obtener la ubicación');
        setIsDetectingLocation(false);
      }
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex gap-2 mb-8 mt-2">
      {[0,1,2,3].map((s) => (
        <div key={s} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${s <= step ? 'bg-indigo-500' : 'bg-white/10'}`} />
      ))}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-[#111111] border border-white/10 rounded-3xl p-8 shadow-2xl relative w-full max-w-md z-10 overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {canClose && (
              <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-2">
                <X size={20} />
              </button>
            )}

            {renderStepIndicator()}

            <div className="min-h-[200px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div key="step0" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl"><User size={24} /></div>
                      <h3 className="text-xl font-bold text-white">Datos Personales</h3>
                    </div>
                    <div className="space-y-4">
                      <input type="text" placeholder="Nombre Completo" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500" />
                      <input type="text" placeholder="Cédula o RIF" value={formData.docId} onChange={e => setFormData({...formData, docId: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500" />
                      <input type="tel" placeholder="Teléfono (Ej. 0414-1234567)" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500" />
                    </div>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl"><Banknote size={24} /></div>
                      <h3 className="text-xl font-bold text-white">Tu Pago Móvil</h3>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-4 text-xs text-red-200">
                      <strong>⚠️ Prevención de Fraude y Triangulación:</strong><br />
                      El pago móvil afiliado DEBE pertenecer a tu misma titularidad. La cédula y nombre se han bloqueado por seguridad. No aceptamos pagos de terceros.
                    </div>
                    <p className="text-zinc-400 text-xs mb-4">Ingresa los datos desde donde harás los pagos para aprobarlos más rápido.</p>
                    <div className="space-y-4">
                      <select value={formData.payment_bank} onChange={e => setFormData({...formData, payment_bank: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 appearance-none">
                        <option value="" className="text-black bg-white">Selecciona un Banco</option>
                        {VZLA_BANKS.map(b => <option key={b} value={b} className="text-black bg-white">{b}</option>)}
                      </select>
                      <input type="tel" placeholder="Teléfono afiliado" value={formData.payment_phone} onChange={e => setFormData({...formData, payment_phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500" />
                      <input type="text" placeholder="Cédula afiliada" value={formData.payment_cedula} disabled className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed" />
                      <input type="text" placeholder="Nombre del titular" value={formData.payment_titular} disabled className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed" />
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-orange-500/10 text-orange-400 rounded-xl"><MapPin size={24} /></div>
                      <h3 className="text-xl font-bold text-white">Libreta de Direcciones</h3>
                    </div>
                    {isMobile && (
                      <button onClick={handleDetectLocation} disabled={isDetectingLocation} className="w-full mb-4 bg-orange-500/20 text-orange-400 py-3 rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-orange-500/30 transition-colors">
                        {isDetectingLocation ? <Loader2 size={18} className="animate-spin"/> : <Navigation size={18}/>}
                        Detectar Ubicación (GPS)
                      </button>
                    )}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1">Urbanización / Zona</label>
                        <select 
                          value={formData.addressSector} 
                          onChange={e => setFormData({...formData, addressSector: e.target.value})} 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-all appearance-none"
                        >
                          <option value="" className="text-black bg-white">Seleccione sector...</option>
                          <option value="Corinsa" className="text-black bg-white">Corinsa (Urbanización Corinsa)</option>
                          <option value="La Segundera / Rafael Urdaneta" className="text-black bg-white">La Segundera / Rafael Urdaneta</option>
                          <option value="Prados de la Encrucijada" className="text-black bg-white">Prados de la Encrucijada</option>
                          <option value="Prados de Aragua" className="text-black bg-white">Prados de Aragua</option>
                          <option value="Ciudad Jardín" className="text-black bg-white">Ciudad Jardín</option>
                          <option value="Suramericana" className="text-black bg-white">Suramericana</option>
                          <option value="Fundacagua" className="text-black bg-white">Fundacagua (Urb. La Fundación)</option>
                          <option value="Francisco de Miranda" className="text-black bg-white">Francisco de Miranda</option>
                          <option value="Santa Rosalía" className="text-black bg-white">Santa Rosalía</option>
                          <option value="Rómulo Gallegos" className="text-black bg-white">Rómulo Gallegos</option>
                          <option value="Blandín" className="text-black bg-white">Blandín</option>
                          <option value="El Corozal" className="text-black bg-white">El Corozal</option>
                          <option value="Residencias Codazzi" className="text-black bg-white">Residencias Codazzi</option>
                          <option value="La Exclusiva" className="text-black bg-white">La Exclusiva</option>
                          <option value="Tamborito" className="text-black bg-white">Tamborito</option>
                          <option value="La Carpiera" className="text-black bg-white">La Carpiera</option>
                          <option value="Huete" className="text-black bg-white">Huete (Brisas de Aragua)</option>
                          <option value="Alí Primera" className="text-black bg-white">Alí Primera</option>
                          <option value="Las Vegas" className="text-black bg-white">Las Vegas</option>
                          <option value="Guillén" className="text-black bg-white">Guillén</option>
                          <option value="Bella Vista" className="text-black bg-white">Bella Vista</option>
                          <option value="El Toco" className="text-black bg-white">El Toco</option>
                          <option value="La Comuna de Chávez" className="text-black bg-white">La Comuna de Chávez</option>
                          <option value="Casco Central" className="text-black bg-white">Casco Central (Centro de Cagua)</option>
                          <option value="Barrancón" className="text-black bg-white">Barrancón</option>
                          <option value="Los Meregotos" className="text-black bg-white">Los Meregotos</option>
                          <option value="Campo Alegre" className="text-black bg-white">Campo Alegre</option>
                          <option value="Zona Industrial Soco" className="text-black bg-white">Zona Industrial Soco</option>
                          <option value="Zona Industrial Corinsa" className="text-black bg-white">Zona Industrial Corinsa</option>
                          <option value="Zona Industrial Santa Rosalía" className="text-black bg-white">Zona Industrial Santa Rosalía</option>
                          <option value="Zona Industrial Cagua" className="text-black bg-white">Zona Industrial Cagua</option>
                          <option value="Otra Zona" className="text-black bg-white">Otra Zona (Cagua)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1">Calle / Casa / Piso <span className="font-normal text-zinc-500">(Opcional con GPS)</span></label>
                        <textarea 
                          placeholder="Ej. Calle 4, Casa 12" 
                          value={formData.addressDetail}
                          onChange={e => setFormData({...formData, addressDetail: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 h-24 resize-none"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-pink-500/10 text-pink-400 rounded-xl"><ImageIcon size={24} /></div>
                      <h3 className="text-xl font-bold text-white">Foto de Perfil</h3>
                    </div>
                    <p className="text-zinc-400 text-xs mb-6">Sube una foto de tu rostro para identificarte mejor al momento de las entregas.</p>
                    
                    <div className="flex flex-col items-center justify-center">
                      <label className="w-32 h-32 rounded-full border-2 border-dashed border-zinc-600 flex items-center justify-center cursor-pointer hover:border-pink-500 transition-colors overflow-hidden relative group">
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        {imagePreview || formData.profile_picture ? (
                           <img src={imagePreview || formData.profile_picture} alt="Perfil" className="w-full h-full object-cover" />
                        ) : (
                           <User size={40} className="text-zinc-600 group-hover:text-pink-500 transition-colors" />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
                          Cambiar
                        </div>
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              {step > 0 && (
                 <button 
                   onClick={() => setStep(step - 1)}
                   className="text-zinc-400 hover:text-white px-4 py-3 rounded-full font-bold transition-colors"
                 >
                   Atrás
                 </button>
              )}
              <button 
                onClick={handleNext}
                disabled={isSubmitting}
                className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:hover:bg-indigo-500"
              >
                {isSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    {step < 3 ? 'Siguiente' : 'Finalizar'}
                    {step < 3 ? <ChevronRight size={18} /> : <Check size={18} />}
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
