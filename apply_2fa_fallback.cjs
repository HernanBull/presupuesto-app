const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'modules', 'superadmin', 'SuperAdminRouter.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add new state
if (!content.includes('is2faActive')) {
  content = content.replace(
    /const \[isRecovering, setIsRecovering\] = useState\(false\);/,
    `const [isRecovering, setIsRecovering] = useState(false);
  const [is2faActive, setIs2faActive] = useState(null);
  const [isChecking2fa, setIsChecking2fa] = useState(false);`
  );
}

// 2. Replace useEffect
content = content.replace(
  /useEffect\(\(\) => \{\n    if \(isRecoveryOpen && !captchaPassed && !recoveredKey\) \{\n      setCaptchaQ\(\{ a: Math\.floor\(Math\.random\(\) \* 10\) \+ 1, b: Math\.floor\(Math\.random\(\) \* 10\) \+ 1 \}\);\n      setCaptchaA\(''\);\n      setRecoveryError\(''\);\n    \}\n  \}, \[isRecoveryOpen\]\);/,
  `useEffect(() => {
    if (isRecoveryOpen) {
      setIsChecking2fa(true);
      fetch(\`https://axonmarket-api.onrender.com/api/superadmin/2fa/status\`)
        .then(res => res.json())
        .then(data => {
          setIs2faActive(data.isActive);
          if (data.isActive && !captchaPassed && !recoveredKey) {
            setCaptchaQ({ a: Math.floor(Math.random() * 10) + 1, b: Math.floor(Math.random() * 10) + 1 });
            setCaptchaA('');
            setRecoveryError('');
          }
        })
        .catch(() => setIs2faActive(false))
        .finally(() => setIsChecking2fa(false));
    } else {
      setIs2faActive(null);
    }
  }, [isRecoveryOpen]);`
);

// 3. Update the Modal UI to handle the fallback
content = content.replace(
  /\{recoveredKey \? \(/,
  `{isChecking2fa || is2faActive === null ? (
                  <div className="py-12 flex flex-col items-center justify-center">
                    <Loader2 size={40} className="animate-spin text-red-500 mb-4" />
                    <p className="text-sm text-zinc-500 uppercase tracking-widest font-bold animate-pulse">Verificando Seguridad...</p>
                  </div>
                ) : !is2faActive ? (
                  <>
                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500">
                      <ShieldAlert size={32} />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-widest mb-4">Intervención Manual</h2>
                    <p className="text-sm text-zinc-400 font-light leading-relaxed mb-6">
                      El sistema 2FA <strong className="text-red-400">no fue inicializado</strong> en tu cuenta. Por motivos de seguridad máxima, la clave maestra del ecosistema no puede ser extraída ni reseteada desde esta interfaz pública.
                    </p>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 mb-8 text-left relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                      <p className="text-xs text-zinc-300 font-medium">
                        Para visualizar o cambiar tu clave actual, por favor dirígete a los archivos de tu servidor (Render/cPanel), abre el archivo <code className="text-red-400 font-mono bg-red-500/10 px-1 py-0.5 rounded">.env</code> y busca la variable:
                      </p>
                      <p className="text-center text-white font-mono font-bold mt-4 tracking-wider text-sm bg-black/50 py-2 rounded-lg border border-white/5">
                        VITE_SUPERADMIN_KEY
                      </p>
                    </div>
                    <button 
                      onClick={() => setIsRecoveryOpen(false)}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full py-3 text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                      Entendido
                    </button>
                  </>
                ) : recoveredKey ? (`
);

fs.writeFileSync(filePath, content);
console.log("SuperAdmin fallback implemented");
