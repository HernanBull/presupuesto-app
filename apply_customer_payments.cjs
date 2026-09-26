const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'modules', 'ecommerce', 'pages', 'CustomerProfile.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state variables
content = content.replace(
  /const \[profileForm, setProfileForm\] = useState\(\{([\s\S]*?)pagoMovilBank: '', pagoMovilPhone: '', pagoMovilDoc: '', pagoMovilName: '', legalAccepted: false, profilePic: '' \n  \}\);/,
  `const [profileForm, setProfileForm] = useState({ 
    name: '', docId: '', phone: '', address: '', profilePic: '' 
  });
  const [paymentProfiles, setPaymentProfiles] = useState([]);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({ bank: '', phone: '', legalAccepted: false });`
);

// 2. Modify useEffect
content = content.replace(
  /parsed\.addresses = Array\.isArray\(parsed\.addresses\) \? parsed\.addresses : \(typeof parsed\.addresses === 'string' \? JSON\.parse\(parsed\.addresses \|\| '\[\]'\) : \[\]\);\n      setCurrentCustomer\(parsed\);\n      setProfileForm\(\{([\s\S]*?)\}\);/g,
  `parsed.addresses = Array.isArray(parsed.addresses) ? parsed.addresses : (typeof parsed.addresses === 'string' ? JSON.parse(parsed.addresses || '[]') : []);
      
      let pProfile = parsed.payment_profile;
      if (typeof pProfile === 'string') {
        try { pProfile = JSON.parse(pProfile); } catch(e) { pProfile = []; }
      }
      if (pProfile && !Array.isArray(pProfile)) pProfile = [pProfile];
      if (!pProfile) pProfile = [];
      parsed.payment_profile = pProfile;
      
      setCurrentCustomer(parsed);
      setPaymentProfiles(pProfile);
      setProfileForm({
        name: parsed.name || '',
        docId: parsed.docId || '',
        phone: parsed.phone || '',
        address: parsed.address || '',
        profilePic: parsed.profilePic || ''
      });`
);

// 3. Update customer data function to include payment_profile
content = content.replace(
  /const payload = \{\n        name: newUser\.name,\n        phone: newUser\.phone,\n        doc_id: newUser\.docId,\n        address: newUser\.address,\n        wishlist: newUser\.wishlist\n      \};/g,
  `const payload = {
        name: newUser.name,
        phone: newUser.phone,
        doc_id: newUser.docId,
        address: newUser.address,
        wishlist: newUser.wishlist,
        payment_profile: newUser.payment_profile
      };`
);

// 4. Add the payment profile management functions
content = content.replace(
  /const handleUpdateProfile = async \(e\) => \{/g,
  `const handleAddPaymentProfile = async (e) => {
    e.preventDefault();
    if (!newPayment.legalAccepted) return;
    const newProfile = {
      bank: newPayment.bank,
      phone: newPayment.phone,
      cedula: currentCustomer.docId,
      titular: currentCustomer.name
    };
    const updatedProfiles = [...paymentProfiles, newProfile];
    setPaymentProfiles(updatedProfiles);
    await updateCustomerData({ payment_profile: updatedProfiles });
    setIsAddingPayment(false);
    setNewPayment({ bank: '', phone: '', legalAccepted: false });
  };

  const handleDeletePaymentProfile = async (idx) => {
    if(!confirm('¿Estás seguro de eliminar esta cuenta?')) return;
    const updatedProfiles = paymentProfiles.filter((_, i) => i !== idx);
    setPaymentProfiles(updatedProfiles);
    await updateCustomerData({ payment_profile: updatedProfiles });
  };

  const handleUpdateProfile = async (e) => {`
);

// 5. Replace the UI in "Datos" tab
content = content.replace(
  /<div className="border-t border-white\/10 pt-6">([\s\S]*?)<\/div>\n                  <\/div>\n                \) : \(/,
  `<div className="border-t border-white/10 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Lock size={18} className="text-emerald-500" />
                          <h3 className="text-lg font-bold text-white">Cuentas de Pago Móvil Autorizadas</h3>
                        </div>
                        <button onClick={() => setIsAddingPayment(true)} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm font-bold border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                          <Plus size={16} /> Añadir
                        </button>
                      </div>
                      
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 mb-6">
                        <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">Seguridad Antifraude Activada</p>
                        <p className="text-emerald-500/80 text-sm leading-relaxed">Los comercios de AxonMarket <strong>solo aceptarán</strong> pagos provenientes de estas cuentas registradas, las cuales están ancladas obligatoriamente a tu cédula. Pagos de terceros no registrados serán retenidos por sospecha de triangulación/fraude.</p>
                      </div>
                      
                      <div className="space-y-4">
                        {paymentProfiles.map((p, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-zinc-900/50 p-6 rounded-2xl border border-white/5 relative group">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full">
                              <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Banco</label>
                                <p className="text-white font-medium">{p.bank}</p>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Teléfono</label>
                                <p className="text-white font-medium">{p.phone}</p>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Cédula</label>
                                <p className="text-white font-medium">{p.cedula}</p>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Titular</label>
                                <p className="text-white font-medium">{p.titular}</p>
                              </div>
                            </div>
                            <button onClick={() => handleDeletePaymentProfile(idx)} className="mt-4 sm:mt-0 p-2 text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        {paymentProfiles.length === 0 && (
                          <p className="text-zinc-500 text-sm text-center py-4 bg-white/5 rounded-xl border border-white/5">No tienes cuentas de Pago Móvil autorizadas. Añade una para poder realizar compras.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (`
);

// 6. Remove the legacy payment_profile edit block from the profile form
content = content.replace(
  /<div className="border-t border-white\/10 pt-6 mt-6">\n                      <h3 className="text-lg font-bold text-white mb-1">Registro de Pago Móvil<\/h3>([\s\S]*?)<\/div>\n\n                    <div className="pt-6 flex gap-4 border-t border-white\/10 mt-6">/,
  `<div className="pt-6 flex gap-4 border-t border-white/10 mt-6">`
);

// 7. Add Add Payment Profile Modal
content = content.replace(
  /\{isChatOpen && activeChatOrder && \(/,
  `{isAddingPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><Banknote className="text-emerald-500" /> Añadir Pago Móvil</h3>
              <button onClick={() => setIsAddingPayment(false)} className="text-zinc-400 hover:text-white transition-colors p-2"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleAddPaymentProfile} className="p-6 space-y-6">
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-xs text-red-200">
                <strong>⚠️ Prevención de Triangulación:</strong><br />
                Por seguridad, la cuenta que afilies <strong>DEBE</strong> pertenecer a ti. Tu Cédula y Nombre están bloqueados permanentemente para esta acción.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-400 mb-2">Cédula Bloqueada</label>
                  <input type="text" disabled value={currentCustomer?.docId || ''} className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-400 mb-2">Nombre Bloqueado</label>
                  <input type="text" disabled value={currentCustomer?.name || ''} className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-400 mb-2">Banco Emisor</label>
                  <select required value={newPayment.bank} onChange={e => setNewPayment({...newPayment, bank: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all appearance-none">
                    <option value="">Selecciona...</option>
                    <option value="Banesco">Banesco</option>
                    <option value="Mercantil">Mercantil</option>
                    <option value="Provincial">Provincial</option>
                    <option value="Venezuela">Banco de Venezuela</option>
                    <option value="BNC">BNC</option>
                    <option value="Bicentenario">Bicentenario</option>
                    <option value="BOD">BOD</option>
                    <option value="Exterior">Exterior</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-400 mb-2">Teléfono Asociado</label>
                  <input type="tel" required placeholder="Ej. 04141234567" value={newPayment.phone} onChange={e => setNewPayment({...newPayment, phone: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-all" />
                </div>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex gap-4 mt-2">
                <input type="checkbox" required checked={newPayment.legalAccepted} onChange={e => setNewPayment({...newPayment, legalAccepted: e.target.checked})} className="w-5 h-5 mt-0.5 rounded border-emerald-500/30 text-emerald-500 bg-zinc-950 shrink-0 cursor-pointer" />
                <label className="text-sm text-emerald-200 cursor-pointer leading-relaxed" onClick={() => setNewPayment({...newPayment, legalAccepted: !newPayment.legalAccepted})}>
                  <strong>Declaración Jurada:</strong> Declaro que esta cuenta bancaria me pertenece. Acepto que pagos de terceros serán retenidos y procesados como sospechosos de fraude.
                </label>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsAddingPayment(false)} className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-bold hover:bg-zinc-700 transition-colors">Cancelar</button>
                <button type="submit" disabled={!newPayment.legalAccepted} className="flex-1 py-3 bg-emerald-500 text-black rounded-xl font-bold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Añadir Cuenta</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {isChatOpen && activeChatOrder && (`
);

// We need to import Banknote at the top if it's missing, but wait, it's not missing because I didn't see Banknote imported in CustomerProfile? Let me check.
if (!content.includes('Banknote,')) {
    content = content.replace(/\{ User, FileText,/, '{ User, FileText, Banknote,');
}

fs.writeFileSync(filePath, content);
console.log('CustomerProfile modifications applied successfully!');
