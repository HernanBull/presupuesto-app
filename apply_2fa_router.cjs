const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'modules', 'superadmin', 'SuperAdminRouter.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add CheckCircle and Copy to lucide-react imports
if (!content.includes('CheckCircle')) {
  content = content.replace(
    /ShieldAlert, ArrowRight, Loader2, X, Key/,
    "ShieldAlert, ArrowRight, Loader2, X, Key, CheckCircle, Copy, ShieldCheck"
  );
}

// 2. Add state
if (!content.includes('captchaPassed')) {
  content = content.replace(
    /const \[isRecoveryOpen, setIsRecoveryOpen\] = useState\(false\);/,
    `const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [captchaQ, setCaptchaQ] = useState({ a: 0, b: 0 });
  const [captchaA, setCaptchaA] = useState('');
  const [captchaPassed, setCaptchaPassed] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [recoveredKey, setRecoveredKey] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);`
  );
}

// 3. Add effect to generate captcha on open
if (!content.includes('setCaptchaQ({ a: Math.floor')) {
  content = content.replace(
    /useEffect\(\(\) => \{/,
    `useEffect(() => {
    if (isRecoveryOpen && !captchaPassed && !recoveredKey) {
      setCaptchaQ({ a: Math.floor(Math.random() * 10) + 1, b: Math.floor(Math.random() * 10) + 1 });
      setCaptchaA('');
      setRecoveryError('');
    }
  }, [isRecoveryOpen]);

  const handleVerifyCaptcha = () => {
    if (parseInt(captchaA) === (captchaQ.a + captchaQ.b)) {
      setCaptchaPassed(true);
      setRecoveryError('');
    } else {
      setRecoveryError('Captcha incorrecto. Intenta de nuevo.');
      setCaptchaQ({ a: Math.floor(Math.random() * 10) + 1, b: Math.floor(Math.random() * 10) + 1 });
      setCaptchaA('');
    }
  };

  const handleRecover = async () => {
    if (totpCode.length !== 6) return;
    setIsRecovering(true);
    try {
      const res = await fetch(\`https://axonmarket-api.onrender.com/api/superadmin/recover\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: totpCode })
      });
      const data = await res.json();
      if (res.ok) {
        setRecoveredKey(data.key);
        setRecoveryError('');
      } else {
        setRecoveryError(data.error || 'Código incorrecto');
      }
    } catch(e) {
      setRecoveryError('Error de conexión');
    }
    setIsRecovering(false);
  };

  useEffect(() => {`
  );
}

// 4. Replace Recovery Modal UI
const newRecoveryModal = `
        {/* Modal de Recuperación */}
        <AnimatePresence>
          {isRecoveryOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                className="absolute inset-0 bg-black/90 backdrop-blur-md" 
                onClick={() => setIsRecoveryOpen(false)} 
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} 
                className="bg-zinc-950 border border-red-500/30 rounded-[2rem] p-8 max-w-md w-full relative z-10 shadow-[0_0_50px_rgba(239,68,68,0.15)] text-center"
              >
                <button onClick={() => { setIsRecoveryOpen(false); setCaptchaPassed(false); setRecoveredKey(''); setTotpCode(''); }} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
                
                {recoveredKey ? (
                  <>
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-500">
                      <ShieldCheck size={32} />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-widest mb-4">Identidad Verificada</h2>
                    <p className="text-sm text-zinc-400 font-light leading-relaxed mb-6">
                      Se ha validado tu autenticador. Tu clave maestra es:
                    </p>
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 mb-8 relative flex flex-col items-center justify-center">
                      <p className="text-2xl font-mono font-bold text-white tracking-[0.2em]">{recoveredKey}</p>
                      <button onClick={() => { navigator.clipboard.writeText(recoveredKey); alert('Copiado'); }} className="mt-4 flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-lg text-xs uppercase tracking-widest font-bold hover:bg-emerald-500 hover:text-white transition-colors">
                        <Copy size={16} /> Copiar Clave
                      </button>
                    </div>
                  </>
                ) : !captchaPassed ? (
                  <>
                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500">
                      <ShieldAlert size={32} />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-widest mb-4">Verificación Anti-Bot</h2>
                    <p className="text-sm text-zinc-400 font-light leading-relaxed mb-6">
                      Demuestra que eres humano resolviendo el siguiente problema.
                    </p>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 mb-6 flex flex-col items-center justify-center">
                      <span className="text-3xl font-mono font-bold text-white mb-4">{captchaQ.a} + {captchaQ.b} = ?</span>
                      <input 
                        type="number"
                        value={captchaA}
                        onChange={e => setCaptchaA(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleVerifyCaptcha()}
                        className="w-24 bg-black border border-white/10 rounded-xl px-4 py-3 text-center text-white font-mono text-xl focus:outline-none focus:border-red-500 transition-colors"
                        autoFocus
                      />
                    </div>
                    {recoveryError && <p className="text-red-500 text-xs font-bold uppercase tracking-wider mb-4">{recoveryError}</p>}
                    <button 
                      onClick={handleVerifyCaptcha}
                      className="w-full bg-red-600 hover:bg-red-500 text-white rounded-full py-4 text-xs font-bold uppercase tracking-[0.2em] transition-colors"
                    >
                      Verificar Humano
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-500">
                      <Key size={32} />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-widest mb-4">Autenticación 2FA</h2>
                    <p className="text-sm text-zinc-400 font-light leading-relaxed mb-6">
                      Ingresa el código de 6 dígitos generado por tu app Google Authenticator.
                    </p>
                    <div className="mb-6">
                      <input 
                        type="text"
                        maxLength="6"
                        value={totpCode}
                        onChange={e => setTotpCode(e.target.value.replace(/\\D/g, ''))}
                        onKeyDown={e => e.key === 'Enter' && handleRecover()}
                        placeholder="000000"
                        className="w-full bg-black border border-indigo-500/30 rounded-xl px-4 py-4 text-center text-white font-mono text-3xl tracking-[0.5em] focus:outline-none focus:border-indigo-500 transition-colors"
                        autoFocus
                      />
                    </div>
                    {recoveryError && <p className="text-red-500 text-xs font-bold uppercase tracking-wider mb-4">{recoveryError}</p>}
                    <button 
                      onClick={handleRecover}
                      disabled={totpCode.length !== 6 || isRecovering}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-full py-4 text-xs font-bold uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isRecovering ? <Loader2 size={18} className="animate-spin" /> : <>Validar 2FA <ArrowRight size={18} /></>}
                    </button>
                  </>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
`;

content = content.replace(
  /\{\/\* Modal de Recuperación \*\/\}[\s\S]*?<\/AnimatePresence>/,
  newRecoveryModal
);

fs.writeFileSync(filePath, content);
console.log("SuperAdminRouter UI injected!");
