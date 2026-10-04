const fs = require('fs');
let content = fs.readFileSync('src/modules/ecommerce/pages/CustomerProfile.jsx', 'utf8');

// Replacement 1
content = content.replace(
  `  const [activeTab, setActiveTab] = useState('datos'); // 'datos', 'pedidos', 'favoritas', 'wishlist', 'direcciones', 'ajustes'
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', docId: '', phone: '', address: '' });`,
  `  const [activeTab, setActiveTab] = useState('datos'); // 'datos', 'pedidos', 'favoritas', 'wishlist', 'direcciones', 'ajustes'
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ 
    name: '', docId: '', phone: '', address: '', 
    pagoMovilBank: '', pagoMovilPhone: '', pagoMovilDoc: '', pagoMovilName: '', legalAccepted: false, profilePic: '' 
  });`
);

// Replacement 2
content = content.replace(
  `      setProfileForm({
        name: parsed.name || '',
        docId: parsed.docId || '',
        phone: parsed.phone || '',
        address: parsed.address || ''
      });`,
  `      setProfileForm({
        name: parsed.name || '',
        docId: parsed.docId || '',
        phone: parsed.phone || '',
        address: parsed.address || '',
        pagoMovilBank: parsed.pagoMovilBank || '',
        pagoMovilPhone: parsed.pagoMovilPhone || '',
        pagoMovilDoc: parsed.pagoMovilDoc || '',
        pagoMovilName: parsed.pagoMovilName || '',
        legalAccepted: parsed.legalAccepted || false,
        profilePic: parsed.profilePic || ''
      });`
);

// Replacement 3
content = content.replace(
  `  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    await updateCustomerData(profileForm);
    setIsEditingProfile(false);
  };`,
  `  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    await updateCustomerData(profileForm);
    setIsEditingProfile(false);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        await updateCustomerData({ profilePic: base64String });
        setProfileForm(prev => ({ ...prev, profilePic: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };`
);

// Replacement 4
content = content.replace(
  `           <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 text-black rounded-full flex items-center justify-center text-4xl font-black shadow-[0_0_30px_rgba(245,158,11,0.3)] shrink-0 relative">
             <div className="absolute inset-0 border border-white/20 rounded-full mix-blend-overlay"></div>
             {currentCustomer.name.charAt(0).toUpperCase()}
           </div>`,
  `           <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 text-black rounded-full flex items-center justify-center text-4xl font-black shadow-[0_0_30px_rgba(245,158,11,0.3)] shrink-0 relative overflow-hidden group">
             <div className="absolute inset-0 border border-white/20 rounded-full mix-blend-overlay z-10 pointer-events-none"></div>
             {currentCustomer.profilePic ? (
               <img src={currentCustomer.profilePic} alt="Perfil" className="w-full h-full object-cover" />
             ) : (
               <span>{currentCustomer.name.charAt(0).toUpperCase()}</span>
             )}
             <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity z-20">
               <span className="text-white text-xs font-bold text-center px-2">Cambiar<br/>Foto</span>
               <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
             </label>
           </div>`
);

// Replacement 5 & 6
content = content.replace(
  `                {!isEditingProfile ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block flex items-center gap-2"><User size={14} className="text-amber-500"/> Nombre Completo</label>
                      <p className="text-white font-semibold text-lg">{currentCustomer.name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block flex items-center gap-2"><FileText size={14} className="text-amber-500"/> Documento (CI/RUT)</label>
                      <p className="text-white font-semibold text-lg">{currentCustomer.docId || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block flex items-center gap-2"><Phone size={14} className="text-amber-500"/> Teléfono</label>
                      <p className="text-white font-semibold text-lg">{currentCustomer.phone || '-'}</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateProfile} className="space-y-6 relative z-10">
                    <div>
                      <label className="block text-sm font-bold text-zinc-400 mb-2">Nombre Completo</label>
                      <input type="text" required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-zinc-400 mb-2">Documento</label>
                        <input type="text" value={profileForm.docId} onChange={e => setProfileForm({...profileForm, docId: e.target.value})} className="w-full bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-zinc-400 mb-2">Teléfono</label>
                        <input type="tel" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                      </div>
                    </div>
                    <div className="pt-6 flex gap-4 border-t border-white/10">
                      <button type="button" onClick={() => setIsEditingProfile(false)} className="px-6 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-bold hover:bg-zinc-700 transition-colors">Cancelar</button>
                      <button type="submit" className="px-8 py-3 bg-amber-500 text-black rounded-xl font-bold hover:bg-amber-400 transition-colors shadow-[0_0_20px_rgba(245,158,11,0.3)]">Guardar Cambios</button>
                    </div>
                  </form>
                )}`,
  `                {!isEditingProfile ? (
                  <div className="space-y-8 relative z-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block flex items-center gap-2"><User size={14} className="text-amber-500"/> Nombre Completo</label>
                        <p className="text-white font-semibold text-lg">{currentCustomer.name}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block flex items-center gap-2"><FileText size={14} className="text-amber-500"/> Documento (CI/RUT)</label>
                        <p className="text-white font-semibold text-lg">{currentCustomer.docId || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block flex items-center gap-2"><Phone size={14} className="text-amber-500"/> Teléfono</label>
                        <p className="text-white font-semibold text-lg">{currentCustomer.phone || '-'}</p>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Lock size={18} className="text-emerald-500" />
                        <h3 className="text-lg font-bold text-white">Datos de Pago Móvil Autorizados</h3>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 mb-6">
                        <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">Seguridad Antifraude Activada</p>
                        <p className="text-emerald-500/80 text-sm leading-relaxed">Los comercios de AxonMarket <strong>solo aceptarán</strong> pagos provenientes de esta cuenta registrada. Los pagos de terceros (triangulación) serán rechazados automáticamente sin derecho a reembolso.</p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
                        <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Banco</label>
                          <p className="text-white font-medium">{currentCustomer.pagoMovilBank || 'No registrado'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Teléfono</label>
                          <p className="text-white font-medium">{currentCustomer.pagoMovilPhone || 'No registrado'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Cédula / RIF</label>
                          <p className="text-white font-medium">{currentCustomer.pagoMovilDoc || 'No registrado'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Titular</label>
                          <p className="text-white font-medium">{currentCustomer.pagoMovilName || 'No registrado'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateProfile} className="space-y-6 relative z-10">
                    <div>
                      <label className="block text-sm font-bold text-zinc-400 mb-2">Nombre Completo</label>
                      <input type="text" required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-zinc-400 mb-2">Documento de Identidad General</label>
                        <input type="text" value={profileForm.docId} onChange={e => setProfileForm({...profileForm, docId: e.target.value})} className="w-full bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-zinc-400 mb-2">Teléfono General</label>
                        <input type="tel" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                      </div>
                    </div>
                    
                    <div className="border-t border-white/10 pt-6 mt-6">
                      <h3 className="text-lg font-bold text-white mb-1">Registro de Pago Móvil</h3>
                      <p className="text-zinc-400 text-sm mb-6">Esta será la <strong>ÚNICA cuenta autorizada</strong> desde la cual los comercios aceptarán tus pagos.</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                        <div>
                          <label className="block text-sm font-bold text-zinc-400 mb-2">Banco Emisor</label>
                          <select required value={profileForm.pagoMovilBank} onChange={e => setProfileForm({...profileForm, pagoMovilBank: e.target.value})} className="w-full bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner">
                            <option value="">Selecciona un Banco...</option>
                            <option value="Banesco">Banesco</option>
                            <option value="Mercantil">Mercantil</option>
                            <option value="Provincial">Provincial</option>
                            <option value="Venezuela">Banco de Venezuela</option>
                            <option value="BNC">BNC</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-400 mb-2">Teléfono Asociado</label>
                          <input type="tel" required placeholder="04XX-XXXXXXX" value={profileForm.pagoMovilPhone} onChange={e => setProfileForm({...profileForm, pagoMovilPhone: e.target.value})} className="w-full bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-400 mb-2">Cédula / RIF</label>
                          <input type="text" required placeholder="V-XXXXXXXX" value={profileForm.pagoMovilDoc} onChange={e => setProfileForm({...profileForm, pagoMovilDoc: e.target.value})} className="w-full bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-400 mb-2">Nombre del Titular</label>
                          <input type="text" required value={profileForm.pagoMovilName} onChange={e => setProfileForm({...profileForm, pagoMovilName: e.target.value})} className="w-full bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                        </div>
                      </div>

                      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex gap-4">
                        <input type="checkbox" required checked={profileForm.legalAccepted} onChange={e => setProfileForm({...profileForm, legalAccepted: e.target.checked})} className="w-5 h-5 mt-0.5 rounded border-red-500/30 text-red-500 focus:ring-red-500 bg-zinc-950 shrink-0 cursor-pointer" />
                        <label className="text-sm text-red-200 cursor-pointer" onClick={() => setProfileForm({...profileForm, legalAccepted: !profileForm.legalAccepted})}>
                          <strong>Declaración Jurada Antifraude:</strong> Declaro bajo juramento que esta cuenta es de mi propiedad. Entiendo y acepto que cualquier pago enviado a AxonMarket o a sus comercios desde un número o cédula distinta a esta será considerado fraude, será rechazado automáticamente y los fondos NO me serán reembolsados por política de prevención de triangulación.
                        </label>
                      </div>
                    </div>

                    <div className="pt-6 flex gap-4 border-t border-white/10 mt-6">
                      <button type="button" onClick={() => setIsEditingProfile(false)} className="px-6 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-bold hover:bg-zinc-700 transition-colors">Cancelar</button>
                      <button type="submit" disabled={!profileForm.legalAccepted} className="px-8 py-3 bg-amber-500 text-black rounded-xl font-bold hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_20px_rgba(245,158,11,0.3)]">Guardar Cambios</button>
                    </div>
                  </form>
                )}`
);

fs.writeFileSync('src/modules/ecommerce/pages/CustomerProfile.jsx', content, 'utf8');
console.log("Replaced successfully!");
