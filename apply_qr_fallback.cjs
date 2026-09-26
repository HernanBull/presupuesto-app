const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'modules', 'superadmin', 'SuperAdminRouter.jsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('import { QRCodeCanvas }')) {
  content = content.replace(
    /import \{ ShieldAlert, ArrowRight/,
    "import { QRCodeCanvas } from 'qrcode.react';\nimport { ShieldAlert, ArrowRight"
  );
}

if (!content.includes('publicQrUri')) {
  content = content.replace(
    /const \[isAuthenticating, setIsAuthenticating\] = useState\(false\);/,
    `const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isChecking2fa, setIsChecking2fa] = useState(true);
  const [is2faActive, setIs2faActive] = useState(true);
  const [publicQrUri, setPublicQrUri] = useState('');`
  );
}

if (!content.includes('api/superadmin/2fa/status')) {
  content = content.replace(
    /const generateCaptcha = \(\) => \{/,
    `const check2FaStatus = async () => {
    try {
      const res = await fetch(\`https://axonmarket-api.onrender.com/api/superadmin/2fa/status\`);
      const data = await res.json();
      setIs2faActive(data.isActive);
    } catch(e) {}
    setIsChecking2fa(false);
  };

  const generateCaptcha = () => {`
  );
}

content = content.replace(
  /setIsLoading\(false\);\n      generateCaptcha\(\);/,
  `setIsLoading(false);
      generateCaptcha();
      check2FaStatus();`
);

const new2faFallback = `
          <AnimatePresence mode="wait">
            {isChecking2fa ? (
              <div className="py-12 flex flex-col items-center justify-center text-white" key="loading">
                <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
                <p className="text-sm font-bold tracking-widest animate-pulse">Verificando Seguridad...</p>
              </div>
            ) : !is2faActive ? (
              <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-red-500/10 text-red-500 rounded-2xl"><ShieldAlert size={40} /></div>
                </div>
                <h1 className="text-xl font-black tracking-tight text-white mb-2 uppercase">Inicialización 2FA</h1>
                <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
                  El sistema no tiene un código 2FA configurado en la base de datos segura.
                </p>
                {!publicQrUri ? (
                  <button 
                    onClick={async () => {
                      setIsChecking2fa(true);
                      try {
                        const res = await fetch(\`https://axonmarket-api.onrender.com/api/superadmin/2fa/setup-public\`, { method: 'POST' });
                        const data = await res.json();
                        if (res.ok) setPublicQrUri(data.uri);
                        else setError(data.error);
                      } catch(e) { setError('Error de red'); }
                      setIsChecking2fa(false);
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-[0.2em] py-4 rounded-full transition-all flex items-center justify-center"
                  >
                    Generar Código QR Único
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-lg">
                      <QRCodeCanvas value={publicQrUri} size={200} level="M" />
                    </div>
                    <p className="text-xs text-red-400 font-bold uppercase tracking-widest">Escanéalo y presiona Continuar.</p>
                    <button 
                      onClick={() => {
                        setPublicQrUri('');
                        setIs2faActive(true);
                        setCaptchaPassed(false);
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-full py-4 text-xs font-bold uppercase tracking-[0.2em] transition-colors"
                    >
                      Ya lo escaneé, Continuar
                    </button>
                  </div>
                )}
                {error && <p className="text-red-500 text-xs font-bold uppercase tracking-wider mt-4">{error}</p>}
              </motion.div>
            ) : !captchaPassed ? (
`;

content = content.replace(
  /<AnimatePresence mode="wait">\n            \{\!captchaPassed \? \(/,
  new2faFallback
);

fs.writeFileSync(filePath, content);
console.log("QR fallback re-injected!");
