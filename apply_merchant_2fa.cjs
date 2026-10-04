const fs = require('fs');

const path = 'f:/Presupuesto/src/modules/ecommerce/pages/MarketplaceDirectory.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add imports
content = content.replace(
  "import { motion, AnimatePresence } from 'framer-motion';",
  "import { motion, AnimatePresence } from 'framer-motion';\nimport { QRCodeSVG } from 'qrcode.react';\nimport * as OTPAuth from 'otpauth';"
);

// 2. Add states for merchant 2FA
content = content.replace(
  "const [merchantAuthMode, setMerchantAuthMode] = useState('register');",
  `const [merchantAuthMode, setMerchantAuthMode] = useState('register');
  const [merchantRegStep, setMerchantRegStep] = useState(1); // 1: Email, 2: Name, 3: 2FA
  const [merchantMfaSecret, setMerchantMfaSecret] = useState('');
  const [merchantMfaUrl, setMerchantMfaUrl] = useState('');
  const [merchantMfaCode, setMerchantMfaCode] = useState('');
  const [tempWorkspace, setTempWorkspace] = useState(null);`
);

// 3. Modify handleMerchantRegister
const handleMerchantRegisterOld = `  const handleMerchantRegister = async (e) => {
    e.preventDefault();
    setMerchantLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: merchantForm.businessName })
      });
      if (!res.ok) throw new Error('Error al crear la tienda virtual');
      const data = await res.json();
      
      const generatedSlug = merchantForm.businessName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\\u0300-\\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const configRes = await fetch(\`http://localhost:3001/api/workspaces/\${data.id}/config\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          store_slug: generatedSlug,
          config: {
            business_type: 'viveres',
            modules: ['orders', 'inventory', 'analytics', 'product_studio'],
            categories: ['General'],
            expediente: {
              legalType: 'V',
              rif: 'V-00000000-0',
              state: 'Por definir',
              city: 'Por definir',
              whatsapp: '',
              instagram: ''
            },
            adminEmail: merchantForm.email,
            adminPassword: merchantForm.password
          }
        })
      });

      if (!configRes.ok) throw new Error('Error al configurar la tienda');

      localStorage.setItem('activeWorkspace', data.id);
      localStorage.setItem('storeSlug', generatedSlug);

      setTimeout(() => {
        navigate('/ecommerce');
      }, 500);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error de conexión');
      setMerchantLoading(false);
    }
  };`;

const handleMerchantRegisterNew = `  const handleMerchantRegisterStep1 = (e) => {
    e.preventDefault();
    if (merchantForm.email) setMerchantRegStep(2);
  };

  const handleMerchantRegisterStep2 = async (e) => {
    e.preventDefault();
    setMerchantLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: merchantForm.businessName })
      });
      if (!res.ok) throw new Error('Error al crear la tienda virtual');
      const data = await res.json();
      
      const generatedSlug = merchantForm.businessName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\\u0300-\\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      // Generar 2FA
      const secret = new OTPAuth.Secret({ size: 20 });
      const totp = new OTPAuth.TOTP({
        issuer: 'Axon Market',
        label: merchantForm.businessName,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret
      });
      setMerchantMfaSecret(secret.base32);
      setMerchantMfaUrl(totp.toString());
      setTempWorkspace({ id: data.id, slug: generatedSlug });
      setMerchantRegStep(3);
      setMerchantLoading(false);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error de conexión');
      setMerchantLoading(false);
    }
  };

  const handleMerchantVerify2FA = async (e) => {
    e.preventDefault();
    setMerchantLoading(true);
    try {
      const totp = new OTPAuth.TOTP({
        issuer: 'Axon Market',
        label: merchantForm.businessName,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(merchantMfaSecret)
      });
      
      const delta = totp.validate({ token: merchantMfaCode, window: 10 });
      if (delta === null) throw new Error('Código 2FA inválido');

      const configRes = await fetch(\`http://localhost:3001/api/workspaces/\${tempWorkspace.id}/config\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          store_slug: tempWorkspace.slug,
          config: {
            business_type: 'viveres',
            modules: ['orders', 'inventory', 'analytics', 'product_studio'],
            categories: ['General'],
            expediente: {
              legalType: 'V',
              rif: 'V-00000000-0',
              state: 'Por definir',
              city: 'Por definir',
              whatsapp: '',
              instagram: ''
            },
            adminEmail: merchantForm.email,
            adminPassword: merchantForm.password,
            mfaSecret: merchantMfaSecret,
            mfaEnabled: true
          }
        })
      });

      if (!configRes.ok) throw new Error('Error al configurar la tienda');

      localStorage.setItem('activeWorkspace', tempWorkspace.id);
      localStorage.setItem('storeSlug', tempWorkspace.slug);

      setTimeout(() => {
        navigate('/ecommerce');
      }, 500);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error de verificación');
      setMerchantLoading(false);
    }
  };`;

content = content.replace(handleMerchantRegisterOld, handleMerchantRegisterNew);

// 4. Modify UI of the register form
const oldFormUiRegex = /<form onSubmit=\{merchantAuthMode === 'register' \? handleMerchantRegister : handleMerchantLogin\} className="p-8 pt-4 space-y-5">[\s\S]*?<\/form>/;

const newFormUi = `<form onSubmit={merchantAuthMode === 'register' ? (merchantRegStep === 1 ? handleMerchantRegisterStep1 : merchantRegStep === 2 ? handleMerchantRegisterStep2 : handleMerchantVerify2FA) : handleMerchantLogin} className="p-8 pt-4 space-y-5">
                  {merchantAuthMode === 'register' ? (
                    <>
                      {merchantRegStep === 1 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Correo Electrónico</label>
                          <input type="email" required value={merchantForm.email} onChange={e => setMerchantForm({...merchantForm, email: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="admin@empresa.com" autoFocus />
                        </motion.div>
                      )}
                      
                      {merchantRegStep === 2 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Nombre del Negocio</label>
                            <input type="text" required value={merchantForm.businessName} onChange={e => setMerchantForm({...merchantForm, businessName: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="Ej. Inversiones San José" autoFocus />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Contraseña Administrativa</label>
                            <input type="password" required value={merchantForm.password} onChange={e => setMerchantForm({...merchantForm, password: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="••••••••" />
                          </div>
                        </motion.div>
                      )}

                      {merchantRegStep === 3 && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center space-y-4">
                          <p className="text-center text-sm text-zinc-400">Escanea este código QR en tu app de Google Authenticator para asegurar tu cuenta de comercio.</p>
                          <div className="bg-white p-4 rounded-xl shadow-lg border border-white/20">
                            <QRCodeSVG value={merchantMfaUrl} size={180} />
                          </div>
                          <p className="text-xs text-zinc-600">Clave manual: <span className="font-mono text-amber-500">{merchantMfaSecret}</span></p>
                          
                          <div className="w-full mt-4">
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest text-center">Código de 6 dígitos</label>
                            <input type="text" required maxLength={6} value={merchantMfaCode} onChange={e => setMerchantMfaCode(e.target.value.replace(/\\D/g, ''))} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-mono text-center tracking-[0.5em] text-lg" placeholder="123456" autoFocus />
                          </div>
                        </motion.div>
                      )}

                      <button 
                        type="submit" 
                        disabled={merchantLoading || (merchantRegStep === 1 && !merchantForm.email) || (merchantRegStep === 2 && (!merchantForm.businessName || !merchantForm.password)) || (merchantRegStep === 3 && merchantMfaCode.length < 6)}
                        className="w-full bg-amber-500 text-black rounded-full py-4 mt-6 font-bold text-xs tracking-[0.2em] uppercase transition-all shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center gap-3"
                      >
                        {merchantLoading ? (
                          <><Loader2 className="animate-spin" size={18} /> Procesando...</>
                        ) : (
                          <>{merchantRegStep === 1 ? 'Continuar' : merchantRegStep === 2 ? 'Crear Instancia' : 'Verificar y Acceder'} <ArrowRight size={16} /></>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Correo Electrónico</label>
                        <input type="email" required value={merchantForm.email} onChange={e => setMerchantForm({...merchantForm, email: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="admin@empresa.com" />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Contraseña Administrativa</label>
                        <input type="password" required value={merchantForm.password} onChange={e => setMerchantForm({...merchantForm, password: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="••••••••" />
                      </div>

                      <div className="flex justify-end mt-2">
                        <button type="button" onClick={() => setMerchantAuthMode('recover')} className="text-[10px] text-amber-500 hover:text-amber-400 font-bold uppercase tracking-wider transition-colors">
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>

                      <button 
                        type="submit" 
                        disabled={merchantLoading || !merchantForm.email}
                        className="w-full bg-amber-500 text-black rounded-full py-4 mt-4 font-bold text-xs tracking-[0.2em] uppercase transition-all shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:bg-amber-400 hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                      >
                        {merchantLoading ? (
                          <><Loader2 className="animate-spin" size={18} /> Procesando...</>
                        ) : (
                          <>Acceder al ERP <ArrowRight size={16} /></>
                        )}
                      </button>
                    </>
                  )}
                </form>`;

content = content.replace(oldFormUiRegex, newFormUi);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated MarketplaceDirectory.jsx');
