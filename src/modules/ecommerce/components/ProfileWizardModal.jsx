import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, MapPin, CreditCard, ChevronRight, Check, X, Loader2, User, Banknote, Image as ImageIcon, Navigation } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import ResponsiveModal from './ResponsiveModal';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

function LocationPickerMarker({ position, setPosition, setAddressDetail }) {
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition({ lat, lng });
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.display_name) setAddressDetail(data.display_name);
        }).catch(()=>{});
    }
  });

  useEffect(() => {
    if (position && map) {
      map.flyTo(position, 16, { animate: true });
    }
  }, [position, map]);

  return position ? <Marker position={position} /> : null;
}

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
    profile_pic: '',
    lat: null,
    lng: null
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  // Obtener cliente seguro de props o de localStorage
  const activeCustomer = customer || (() => {
    try {
      const saved = localStorage.getItem('ecommerce_current_customer');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  })();

  useEffect(() => {
    if (isOpen && activeCustomer) {
      const defaultName = activeCustomer.name;
      const isDefaultName = !defaultName || defaultName === activeCustomer.email || defaultName === activeCustomer.email?.split('@')[0];
      const rawPay = activeCustomer.payment_profile;
      const paymentProfile = (Array.isArray(rawPay) ? rawPay[0] : rawPay) || {};
      
      let defaultAddress = '';
      if (Array.isArray(activeCustomer.addresses) && activeCustomer.addresses.length > 0) {
        defaultAddress = activeCustomer.addresses.find(a => a.isDefault)?.address || activeCustomer.addresses[0].address;
      } else if (typeof activeCustomer.addresses === 'string') {
        try {
          const parsed = JSON.parse(activeCustomer.addresses);
          if (parsed.length > 0) defaultAddress = parsed.find(a => a.isDefault)?.address || parsed[0].address;
        } catch(e){}
      }
      if (!defaultAddress && activeCustomer.address) defaultAddress = activeCustomer.address;

      let defaultLat = null;
      let defaultLng = null;
      if (Array.isArray(activeCustomer.addresses) && activeCustomer.addresses.length > 0) {
        const addr = activeCustomer.addresses.find(a => a.isDefault) || activeCustomer.addresses[0];
        if (addr.lat) defaultLat = addr.lat;
        if (addr.lng) defaultLng = addr.lng;
      }

      setFormData({
        name: isDefaultName ? '' : (defaultName || ''),
        phone: activeCustomer.phone || '',
        docId: activeCustomer.docId || activeCustomer.doc_id || '',
        addressSector: '',
        addressDetail: defaultAddress || '',
        payment_bank: paymentProfile.bank || '',
        payment_phone: paymentProfile.phone || '',
        payment_cedula: paymentProfile.cedula || activeCustomer.docId || activeCustomer.doc_id || '',
        payment_titular: paymentProfile.titular || (isDefaultName ? '' : (defaultName || '')),
        profile_pic: activeCustomer.profile_pic || '',
        lat: defaultLat,
        lng: defaultLng
      });
      setStep(0);
    }
  }, [isOpen, customer]);

  if (!isOpen) return null;

  const handlePhoneChange = (e) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    }
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  const handleDocIdChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^0-9VEJG-]/g, '').slice(0, 12);
    setFormData(prev => ({ ...prev, docId: val }));
  };

  const handlePaymentPhoneChange = (e) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    }
    setFormData(prev => ({ ...prev, payment_phone: formatted }));
  };

  const cleanPhone = (formData.phone || '').replace(/\D/g, '');
  const cleanDoc = (formData.docId || '').replace(/\D/g, '');
  const isNameValid = (formData.name || '').trim().length >= 3;
  const isDocValid = cleanDoc.length >= 6;
  const isPhoneValid = cleanPhone.length >= 11;

  const cleanPayPhone = (formData.payment_phone || '').replace(/\D/g, '');
  const cleanPayCedula = (formData.payment_cedula || '').replace(/\D/g, '');
  const isPayPhoneValid = cleanPayPhone.length >= 11;
  const isPayDocValid = cleanPayCedula.length >= 6;

  const isStep0Valid = isNameValid && isDocValid && isPhoneValid;
  const isStep1Valid = Boolean(formData.payment_bank) && isPayPhoneValid && isPayDocValid && Boolean(formData.payment_titular);
  const isStep2Valid = Boolean(formData.addressSector) && Boolean(formData.addressDetail);
  const isStep3Valid = Boolean(imageFile) || Boolean(formData.profile_pic);

  let isCurrentStepValid = true;
  if (step === 0) isCurrentStepValid = isStep0Valid;
  if (step === 1) isCurrentStepValid = isStep1Valid;
  if (step === 2) isCurrentStepValid = isStep2Valid;
  if (step === 3) isCurrentStepValid = isStep3Valid;

  const isNextDisabled = isSubmitting || !isCurrentStepValid;

  const handleNext = async () => {
    // Validate current step
    if (step === 0) {
      if (!formData.name || formData.name.trim().length < 3) return alert('Por favor completa tu nombre completo.');
      if (cleanDoc.length < 6) return alert('La cédula o RIF debe tener al menos 6 números.');
      if (cleanPhone.length < 11) return alert('El teléfono debe tener al menos 11 números (Ej. 0414-1234567).');
    }
    if (step === 1) {
      if (!formData.payment_bank) return alert('Selecciona tu banco para Pago Móvil.');
      if (cleanPayPhone.length < 11) return alert('El teléfono de Pago Móvil debe tener al menos 11 números.');
      if (cleanPayCedula.length < 6) return alert('La cédula de Pago Móvil debe tener al menos 6 números.');
      if (!formData.payment_titular) return alert('El nombre del titular es requerido.');
    }
    if (step === 2 && (!formData.addressSector || !formData.addressDetail)) return alert('Ingresa tu sector y dirección exacta de entrega');

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
      if (!imageFile && !formData.profile_pic) {
        alert('Debes subir una foto de perfil obligatoriamente para identificarte al momento de la entrega.');
        return;
      }
      setIsSubmitting(true);

      const targetId = activeCustomer?.id;
      if (!targetId) {
        alert('No se pudo identificar tu sesión de cliente. Por favor inicia sesión nuevamente.');
        setIsSubmitting(false);
        return;
      }

      const currentDoc = activeCustomer?.doc_id || activeCustomer?.docId;
      let existingCustomer = null;
      if (formData.docId && formData.docId !== currentDoc) {
         const cleanInputDoc = formData.docId.trim();
         const { data } = await supabase
           .from('ecommerce_customers')
           .select('*')
           .or(`doc_id.eq.${cleanInputDoc},doc_id.ilike.%${cleanInputDoc}%`)
           .neq('id', targetId)
           .maybeSingle();
         existingCustomer = data;
      }

      try {
        let pictureUrl = formData.profile_pic;
        
        // Upload picture if selected
        if (imageFile) {
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `profiles/${fileName}`;
          
          const { error: uploadError } = await supabase.storage.from('ecommerce').upload(filePath, imageFile);
          if (uploadError) {
            alert('Error Storage Supabase: ' + uploadError.message + '. Asegúrate de crear el bucket "ecommerce" en Supabase Storage y darle permisos públicos.');
          } else {
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
        if (Array.isArray(activeCustomer?.addresses)) {
          existingAddresses = [...activeCustomer.addresses];
        } else if (typeof activeCustomer?.addresses === 'string') {
          try { existingAddresses = JSON.parse(activeCustomer.addresses); } catch (e) {}
        }

        if (existingAddresses.length === 0) {
          existingAddresses.push({
            id: Date.now().toString(),
            name: 'Principal',
            address: finalAddressText,
            lat: formData.lat,
            lng: formData.lng,
            isDefault: true
          });
        } else {
          // Actualizar la dirección principal o la primera
          const defaultIndex = existingAddresses.findIndex(a => a.isDefault);
          if (defaultIndex >= 0) {
            existingAddresses[defaultIndex].address = finalAddressText;
            existingAddresses[defaultIndex].lat = formData.lat;
            existingAddresses[defaultIndex].lng = formData.lng;
          } else {
            existingAddresses[0].address = finalAddressText;
            existingAddresses[0].lat = formData.lat;
            existingAddresses[0].lng = formData.lng;
          }
        }

        const updatePayload = {
          name: formData.name,
          phone: formData.phone,
          doc_id: formData.docId,
          address: finalAddressText,
          addresses: existingAddresses,
          payment_profile: [paymentProfile],
          profile_pic: pictureUrl
        };

        if (existingCustomer) {
          // Fusionar con el registro existente vinculado a esta cédula
          const finalId = existingCustomer.id;
          const mergedPayload = {
            ...updatePayload,
            email: activeCustomer?.email || existingCustomer.email,
            is_verified: true,
            auth_provider: activeCustomer?.auth_provider || existingCustomer.auth_provider || 'google'
          };
          
          await supabase.from('ecommerce_customers').update(mergedPayload).eq('id', finalId);

          // Eliminar el registro temporal autogenerado por OAuth si es distinto
          if (targetId && targetId !== finalId) {
            await supabase.from('ecommerce_customers').delete().eq('id', targetId);
          }

          const updatedCustomer = { 
            ...existingCustomer, 
            ...mergedPayload, 
            id: finalId,
            docId: formData.docId,
            payment_profile: [paymentProfile] 
          };
          localStorage.setItem('ecommerce_current_customer', JSON.stringify(updatedCustomer));
          onComplete(updatedCustomer);
        } else {
          let { error } = await supabase
            .from('ecommerce_customers')
            .update(updatePayload)
            .eq('id', targetId);
            
          if (error) {
            // Fallback if columns don't exist yet
            const fallbackPayload = {
              name: formData.name,
              phone: formData.phone,
              doc_id: formData.docId,
              address: finalAddressText
            };
            const retry = await supabase.from('ecommerce_customers').update(fallbackPayload).eq('id', targetId);
            if (retry.error) throw retry.error;
          }
          
          const updatedCustomer = { 
            ...activeCustomer, 
            ...updatePayload, 
            docId: formData.docId,
            payment_profile: [paymentProfile] 
          };
          localStorage.setItem('ecommerce_current_customer', JSON.stringify(updatedCustomer));
          onComplete(updatedCustomer);
        }
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
          setFormData({ ...formData, addressDetail: addr, lat: latitude, lng: longitude });
        } catch(e) {
          setFormData({ ...formData, addressDetail: `${latitude}, ${longitude}`, lat: latitude, lng: longitude });
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
    <div className="flex gap-2 mb-6">
      {[0,1,2,3].map((s) => (
        <div 
          key={s} 
          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-amber-500' : 'bg-slate-200'}`} 
        />
      ))}
    </div>
  );

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={canClose ? onClose : () => {}}
      title="Completa tu Perfil"
      showCloseButton={canClose}
      className="md:max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl"
      contentClassName="p-6 sm:p-8 relative bg-white text-slate-800"
    >
      <div className="mb-6 mt-1">
        {renderStepIndicator()}
      </div>

      <div className="min-h-[220px] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200/60 shadow-sm"><User size={24} /></div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Datos Personales</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Información básica para tus pedidos y entregas.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <input 
                    type="text" 
                    placeholder="Nombre Completo" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-sm font-medium shadow-sm" 
                  />
                </div>
                <div>
                  <input 
                    type="text" 
                    placeholder="Cédula o RIF (Mínimo 6 dígitos)" 
                    value={formData.docId} 
                    onChange={handleDocIdChange} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-sm font-mono shadow-sm" 
                  />
                  <div className="flex justify-between items-center text-[11px] px-1 mt-1">
                    <span className="text-slate-400">Mínimo 6 dígitos</span>
                    <span className={cleanDoc.length >= 6 ? "text-emerald-600 font-bold" : "text-amber-600 font-medium"}>
                      {cleanDoc.length}/6 {cleanDoc.length >= 6 ? "✓ Completa" : ""}
                    </span>
                  </div>
                </div>
                <div>
                  <input 
                    type="tel" 
                    inputMode="numeric" 
                    placeholder="Teléfono (Ej. 0414-1234567)" 
                    value={formData.phone} 
                    onChange={handlePhoneChange} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-sm font-mono shadow-sm" 
                  />
                  <div className="flex justify-between items-center text-[11px] px-1 mt-1">
                    <span className="text-slate-400">11 dígitos requeridos</span>
                    <span className={cleanPhone.length >= 11 ? "text-emerald-600 font-bold" : "text-amber-600 font-medium"}>
                      {cleanPhone.length}/11 {cleanPhone.length >= 11 ? "✓ Completo" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200/60 shadow-sm"><Banknote size={24} /></div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Tu Pago Móvil</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Cuenta desde donde emitirás tus pagos.</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl mb-4 text-xs text-amber-900 leading-relaxed shadow-sm">
                <strong>⚠️ Prevención de Fraude y Triangulación:</strong><br />
                El pago móvil afiliado DEBE pertenecer a tu misma titularidad. La cédula y nombre se han bloqueado por seguridad. No aceptamos pagos de terceros.
              </div>
              <div className="space-y-4">
                <div>
                  <select 
                    value={formData.payment_bank} 
                    onChange={e => setFormData({...formData, payment_bank: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm font-medium shadow-sm appearance-none"
                  >
                    <option value="" className="text-slate-900 bg-white">Selecciona tu Banco</option>
                    {VZLA_BANKS.map(b => <option key={b} value={b} className="text-slate-900 bg-white">{b}</option>)}
                  </select>
                </div>
                <div>
                  <input 
                    type="tel" 
                    inputMode="numeric" 
                    placeholder="Teléfono afiliado (Ej. 0414-1234567)" 
                    value={formData.payment_phone} 
                    onChange={handlePaymentPhoneChange} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm font-mono shadow-sm" 
                  />
                  <div className="flex justify-between items-center text-[11px] px-1 mt-1">
                    <span className="text-slate-400">11 dígitos requeridos</span>
                    <span className={cleanPayPhone.length >= 11 ? "text-emerald-600 font-bold" : "text-amber-600 font-medium"}>
                      {cleanPayPhone.length}/11 {cleanPayPhone.length >= 11 ? "✓ Completo" : ""}
                    </span>
                  </div>
                </div>
                <input 
                  type="text" 
                  placeholder="Cédula afiliada" 
                  value={formData.payment_cedula} 
                  disabled 
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-slate-500 text-sm font-mono cursor-not-allowed shadow-inner" 
                />
                <input 
                  type="text" 
                  placeholder="Nombre del titular" 
                  value={formData.payment_titular} 
                  disabled 
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-slate-500 text-sm cursor-not-allowed shadow-inner" 
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl border border-orange-200/60 shadow-sm"><MapPin size={24} /></div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Libreta de Direcciones</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Lugar donde entregaremos tus despachos.</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Urbanización / Zona</label>
                  <select 
                    value={formData.addressSector} 
                    onChange={e => setFormData({...formData, addressSector: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white text-sm font-medium transition-all appearance-none shadow-sm"
                  >
                    <option value="" className="text-slate-900 bg-white">Seleccione sector...</option>
                    <option value="Corinsa" className="text-slate-900 bg-white">Corinsa (Urbanización Corinsa)</option>
                    <option value="La Segundera / Rafael Urdaneta" className="text-slate-900 bg-white">La Segundera / Rafael Urdaneta</option>
                    <option value="Prados de la Encrucijada" className="text-slate-900 bg-white">Prados de la Encrucijada</option>
                    <option value="Prados de Aragua" className="text-slate-900 bg-white">Prados de Aragua</option>
                    <option value="Ciudad Jardín" className="text-slate-900 bg-white">Ciudad Jardín</option>
                    <option value="Suramericana" className="text-slate-900 bg-white">Suramericana</option>
                    <option value="Fundacagua" className="text-slate-900 bg-white">Fundacagua (Urb. La Fundación)</option>
                    <option value="Francisco de Miranda" className="text-slate-900 bg-white">Francisco de Miranda</option>
                    <option value="Santa Rosalía" className="text-slate-900 bg-white">Santa Rosalía</option>
                    <option value="Rómulo Gallegos" className="text-slate-900 bg-white">Rómulo Gallegos</option>
                    <option value="Blandín" className="text-slate-900 bg-white">Blandín</option>
                    <option value="El Corozal" className="text-slate-900 bg-white">El Corozal</option>
                    <option value="Residencias Codazzi" className="text-slate-900 bg-white">Residencias Codazzi</option>
                    <option value="La Exclusiva" className="text-slate-900 bg-white">La Exclusiva</option>
                    <option value="Tamborito" className="text-slate-900 bg-white">Tamborito</option>
                    <option value="La Carpiera" className="text-slate-900 bg-white">La Carpiera</option>
                    <option value="Huete" className="text-slate-900 bg-white">Huete (Brisas de Aragua)</option>
                    <option value="Alí Primera" className="text-slate-900 bg-white">Alí Primera</option>
                    <option value="Las Vegas" className="text-slate-900 bg-white">Las Vegas</option>
                    <option value="Guillén" className="text-slate-900 bg-white">Guillén</option>
                    <option value="Bella Vista" className="text-slate-900 bg-white">Bella Vista</option>
                    <option value="El Toco" className="text-slate-900 bg-white">El Toco</option>
                    <option value="La Comuna de Chávez" className="text-slate-900 bg-white">La Comuna de Chávez</option>
                    <option value="Casco Central" className="text-slate-900 bg-white">Casco Central (Centro de Cagua)</option>
                    <option value="Barrancón" className="text-slate-900 bg-white">Barrancón</option>
                    <option value="Los Meregotos" className="text-slate-900 bg-white">Los Meregotos</option>
                    <option value="Campo Alegre" className="text-slate-900 bg-white">Campo Alegre</option>
                    <option value="Zona Industrial Soco" className="text-slate-900 bg-white">Zona Industrial Soco</option>
                    <option value="Zona Industrial Corinsa" className="text-slate-900 bg-white">Zona Industrial Corinsa</option>
                    <option value="Zona Industrial Santa Rosalía" className="text-slate-900 bg-white">Zona Industrial Santa Rosalía</option>
                    <option value="Zona Industrial Cagua" className="text-slate-900 bg-white">Zona Industrial Cagua</option>
                    <option value="Otra Zona" className="text-slate-900 bg-white">Otra Zona (Cagua)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Calle / Casa / Piso <span className="font-normal text-slate-400">(Opcional con GPS)</span></label>
                  <input 
                    type="text"
                    placeholder="Ej. Calle 4, Casa 12" 
                    value={formData.addressDetail}
                    onChange={e => setFormData({...formData, addressDetail: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white text-sm font-medium transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">Punto GPS (Opcional)</label>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between h-[52px] shadow-sm">
                       {formData.lat && formData.lng ? (
                         <span className="font-mono text-sm text-amber-600 font-bold">
                           {formData.lat.toFixed(5)}, {formData.lng.toFixed(5)}
                         </span>
                       ) : (
                         <span className="text-sm text-slate-400 italic">No fijado en el mapa</span>
                       )}
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={isDetectingLocation}
                    className="w-full sm:w-auto px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 h-[52px]"
                  >
                    {isDetectingLocation ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
                    Usar GPS
                  </button>
                </div>
                
                <div className="h-[200px] w-full rounded-2xl overflow-hidden border border-slate-200 relative z-0 shadow-sm">
                  <MapContainer 
                    center={formData.lat && formData.lng ? [formData.lat, formData.lng] : [10.1833, -67.4500]} 
                    zoom={formData.lat && formData.lng ? 16 : 12} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer 
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                    />
                    <LocationPickerMarker 
                      position={formData.lat && formData.lng ? [formData.lat, formData.lng] : null} 
                      setPosition={(pos) => setFormData({...formData, lat: pos.lat, lng: pos.lng})} 
                      setAddressDetail={(addr) => setFormData(prev => ({...prev, addressDetail: addr}))}
                    />
                  </MapContainer>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-pink-50 text-pink-600 rounded-2xl border border-pink-200/60 shadow-sm"><ImageIcon size={24} /></div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Foto de Perfil</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Sube una foto de tu rostro para identificarte en tus entregas.</p>
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-center py-4">
                <label className="w-32 h-32 rounded-full border-2 border-dashed border-slate-300 hover:border-pink-500 bg-slate-50 flex items-center justify-center cursor-pointer transition-colors overflow-hidden relative group shadow-inner">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  {imagePreview || formData.profile_pic ? (
                     <img src={imagePreview || formData.profile_pic} alt="Perfil" className="w-full h-full object-cover" />
                  ) : (
                     <User size={40} className="text-slate-400 group-hover:text-pink-500 transition-colors" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold backdrop-blur-xs">
                    Cambiar
                  </div>
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8 flex justify-end items-center gap-3 pt-4 border-t border-slate-100">
        {step > 0 && (
           <button 
             onClick={() => setStep(step - 1)}
             className="text-slate-500 hover:text-slate-900 px-5 py-3 rounded-full font-bold text-sm transition-colors"
           >
             Atrás
           </button>
        )}
        <button 
          onClick={handleNext}
          disabled={isNextDisabled}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-7 py-3 rounded-full font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-500 disabled:active:scale-100"
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
    </ResponsiveModal>
  );
}
