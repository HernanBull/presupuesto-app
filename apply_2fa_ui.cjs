const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'modules', 'superadmin', 'pages', 'SuperAdminDashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add QRCode imports if not present
if (!content.includes('QRCodeCanvas')) {
  content = content.replace(
    /import React, \{ useState, useEffect \} from 'react';/,
    "import React, { useState, useEffect } from 'react';\nimport { QRCodeCanvas } from 'qrcode.react';"
  );
}

// Add QrCode to lucide-react imports
if (!content.includes('QrCode,')) {
  content = content.replace(
    /Key, /,
    "Key, QrCode, "
  );
}

// Add state variables for 2FA
if (!content.includes('is2faModalOpen')) {
  content = content.replace(
    /const \[isKeyModalOpen, setIsKeyModalOpen\] = useState\(false\);/,
    `const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [is2faModalOpen, setIs2faModalOpen] = useState(false);
  const [twoFaSetup, setTwoFaSetup] = useState(null);`
  );
}

// Add fetch function
if (!content.includes('fetch2FaSetup')) {
  content = content.replace(
    /const handleChangeKey = async \(\) => \{/,
    `const fetch2FaSetup = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch(\`https://axonmarket-api.onrender.com/api/superadmin/2fa/setup\`, {
        headers: { 'x-superadmin-key': superKey }
      });
      const data = await res.json();
      if (res.ok) {
        setTwoFaSetup(data);
      } else {
        alert('Error al generar 2FA');
      }
    } catch(e) {
      alert('Error de conexión');
    }
    setIsActionLoading(false);
  };

  const handleChangeKey = async () => {`
  );
}

// Add button to header
if (!content.includes('fetch2FaSetup()')) {
  content = content.replace(
    /<button \n            onClick=\{\(\) => \{ setIsKeyModalOpen\(true\); setKeyError\(''\); setNewKeyInput\(''\); \}\}\n            className="p-2 bg-zinc-900 border border-white\/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white\/5 transition-colors"\n            title="Cambiar Clave Maestra"\n          >\n            <Key size=\{18\} \/>\n          <\/button>/,
    `<button 
            onClick={() => { setIsKeyModalOpen(true); setKeyError(''); setNewKeyInput(''); }}
            className="p-2 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Cambiar Clave Maestra"
          >
            <Key size={18} />
          </button>
          <button 
            onClick={() => { setIs2faModalOpen(true); fetch2FaSetup(); }}
            className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 hover:text-white hover:bg-indigo-500 transition-colors"
            title="Configurar Google Authenticator (2FA)"
          >
            <QrCode size={18} />
          </button>`
  );
}

// Add 2FA Modal UI
if (!content.includes('Configuración 2FA')) {
  const modalUI = `
      {/* 2FA Modal */}
      <AnimatePresence>
        {is2faModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{scale:0.95, opacity:0, y: 20}} animate={{scale:1, opacity:1, y: 0}} exit={{scale:0.95, opacity:0, y: 20}} className="bg-zinc-950 border border-indigo-500/30 rounded-3xl p-8 max-w-md w-full relative z-10 shadow-[0_0_50px_rgba(99,102,241,0.2)]">
              <button onClick={() => setIs2faModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={24} /></button>
              
              <div className="flex justify-center mb-4 text-indigo-500">
                <QrCode size={48} />
              </div>
              <h2 className="text-xl font-black text-center text-white uppercase tracking-widest mb-2">Google Authenticator</h2>
              <p className="text-sm text-zinc-400 text-center mb-6">Escanea el código para habilitar la recuperación de contraseña por 2FA.</p>

              {isActionLoading && !twoFaSetup ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={32} className="animate-spin text-indigo-500" />
                </div>
              ) : twoFaSetup ? (
                <div className="flex flex-col items-center gap-6 mb-6">
                  <div className="bg-white p-4 rounded-xl shadow-lg">
                    <QRCodeCanvas value={twoFaSetup.uri} size={200} level="M" />
                  </div>
                  <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl text-center w-full">
                    <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-1">Tu llave secreta</p>
                    <p className="font-mono text-white tracking-widest text-lg">{twoFaSetup.secret}</p>
                    <p className="text-[10px] text-zinc-500 mt-2">Guárdala en un lugar seguro. Solo es visible para ti ahora.</p>
                  </div>
                </div>
              ) : null}

              <button 
                onClick={() => setIs2faModalOpen(false)}
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
              >
                Cerrar Ventana
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
`;
  content = content.replace(
    /\{ \/\* Change Key Modal \*\/ \}/,
    modalUI + "\n      {/* Change Key Modal */ }"
  );
}

fs.writeFileSync(filePath, content);
console.log("2FA UI added to SuperAdminDashboard!");
