const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const serverPath = path.join(__dirname, 'server', 'index.js');
let serverContent = fs.readFileSync(serverPath, 'utf8');

// 1. Add public setup endpoint
const publicSetupEndpoint = `
app.post('/api/superadmin/2fa/setup-public', (req, res) => {
  try {
    let secret = process.env.SUPERADMIN_2FA_SECRET;
    
    // If it already exists, refuse to generate a new one publicly
    if (secret) {
      return res.status(403).json({ error: 'El 2FA ya fue inicializado.' });
    }

    // Generate a random 20 byte buffer and encode it in base32
    const randomBuffer = crypto.randomBytes(20);
    const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    secret = '';
    for (let i = 0; i < randomBuffer.length; i++) {
      secret += base32chars[randomBuffer[i] % 32];
    }
    
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    if (envContent.includes('SUPERADMIN_2FA_SECRET=')) {
      envContent = envContent.replace(/SUPERADMIN_2FA_SECRET=.*/g, \`SUPERADMIN_2FA_SECRET="\${secret}"\`);
    } else {
      envContent += \`\\nSUPERADMIN_2FA_SECRET="\${secret}"\\n\`;
    }
    fs.writeFileSync(envPath, envContent);
    process.env.SUPERADMIN_2FA_SECRET = secret;

    const totp = new OTPAuth.TOTP({
      issuer: 'AxonMarket SuperAdmin',
      label: 'Admin Panel',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret
    });

    res.json({ success: true, uri: totp.toString() });
  } catch (err) {
    res.status(500).json({ error: 'Error setting up 2FA: ' + err.message });
  }
});
`;

if (!serverContent.includes('/api/superadmin/2fa/setup-public')) {
  serverContent = serverContent.replace(
    /app\.get\('\/api\/superadmin\/2fa\/status',/,
    publicSetupEndpoint + "\napp.get('/api/superadmin/2fa/status',"
  );
  fs.writeFileSync(serverPath, serverContent);
}

// 2. Modify SuperAdminRouter.jsx
const routerPath = path.join(__dirname, 'src', 'modules', 'superadmin', 'SuperAdminRouter.jsx');
let routerContent = fs.readFileSync(routerPath, 'utf8');

if (!routerContent.includes('import { QRCodeCanvas } from \'qrcode.react\'')) {
  routerContent = routerContent.replace(
    /import \{ ShieldAlert, ArrowRight/,
    "import { QRCodeCanvas } from 'qrcode.react';\nimport { ShieldAlert, ArrowRight"
  );
}

if (!routerContent.includes('publicQrUri')) {
  routerContent = routerContent.replace(
    /const \[isChecking2fa, setIsChecking2fa\] = useState\(false\);/,
    `const [isChecking2fa, setIsChecking2fa] = useState(false);
  const [publicQrUri, setPublicQrUri] = useState('');`
  );
}

// Replace the fallback UI with the new interactive setup
const interactiveFallback = `
                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500">
                      <ShieldAlert size={32} />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-widest mb-4">Inicialización 2FA</h2>
                    <p className="text-sm text-zinc-400 font-light leading-relaxed mb-6">
                      El sistema 2FA no ha sido configurado. Puedes generar el código QR ahora mismo por única vez para recuperar el acceso.
                    </p>
                    
                    {!publicQrUri ? (
                      <button 
                        onClick={async () => {
                          setIsChecking2fa(true);
                          try {
                            const res = await fetch(\`https://axonmarket-api.onrender.com/api/superadmin/2fa/setup-public\`, { method: 'POST' });
                            const data = await res.json();
                            if (res.ok) setPublicQrUri(data.uri);
                            else alert(data.error);
                          } catch(e) { alert('Error'); }
                          setIsChecking2fa(false);
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-full py-4 text-xs font-bold uppercase tracking-[0.2em] transition-colors mb-4"
                      >
                        Generar Código QR Único
                      </button>
                    ) : (
                      <div className="flex flex-col items-center gap-6 mb-6 animate-in zoom-in-95">
                        <div className="bg-white p-4 rounded-xl shadow-lg">
                          <QRCodeCanvas value={publicQrUri} size={200} level="M" />
                        </div>
                        <p className="text-xs text-red-400 font-bold uppercase tracking-widest px-4">¡Escanéalo rápido! Una vez escaneado, presiona Continuar para ingresar el código.</p>
                        <button 
                          onClick={() => {
                            setPublicQrUri('');
                            setIs2faActive(true); // Jump to captcha -> 2FA flow
                            setCaptchaQ({ a: Math.floor(Math.random() * 10) + 1, b: Math.floor(Math.random() * 10) + 1 });
                            setCaptchaA('');
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-full py-4 text-xs font-bold uppercase tracking-[0.2em] transition-colors"
                        >
                          Ya lo escaneé, Continuar
                        </button>
                      </div>
                    )}
`;

routerContent = routerContent.replace(
  /<div className="w-16 h-16 bg-red-500\/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500">[\s\S]*?Entendido\n                    <\/button>/,
  interactiveFallback
);

fs.writeFileSync(routerPath, routerContent);
console.log("Interactive setup injected!");
