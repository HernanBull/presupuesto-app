const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'index.js');
let content = fs.readFileSync(filePath, 'utf8');

const recoverEndpoint = `
app.post('/api/superadmin/recover', (req, res) => {
  try {
    const { token } = req.body;
    const secret = process.env.SUPERADMIN_2FA_SECRET;

    if (!secret) {
      return res.status(400).json({ error: 'El administrador no ha configurado la recuperación 2FA todavía.' });
    }

    if (!token || token.length !== 6) {
      return res.status(400).json({ error: 'Token inválido' });
    }

    const totp = new OTPAuth.TOTP({
      issuer: 'AxonMarket SuperAdmin',
      label: 'Admin Panel',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret
    });

    const delta = totp.validate({ token: token, window: 2 });
    
    if (delta !== null) {
      const currentKey = process.env.VITE_SUPERADMIN_KEY || 'cac2003';
      return res.json({ success: true, key: currentKey });
    } else {
      return res.status(401).json({ error: 'El código 2FA es incorrecto o ha expirado.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error interno de recuperación: ' + err.message });
  }
});
`;

if (!content.includes('/api/superadmin/recover')) {
  content = content.replace(
    /app\.delete\('\/api\/superadmin\/merchants\/:id', requireSuperAdmin, \(req, res\) => \{/,
    recoverEndpoint + "\napp.delete('/api/superadmin/merchants/:id', requireSuperAdmin, (req, res) => {"
  );
}

fs.writeFileSync(filePath, content);
console.log("Recover endpoint injected!");
