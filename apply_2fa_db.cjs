const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'index.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Rewrite setup-public
const newSetupPublic = `
app.post('/api/superadmin/2fa/setup-public', async (req, res) => {
  try {
    const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'superadmin_2fa_secret').single();
    let secret = setting ? setting.value : null;
    
    if (secret) {
      return res.status(403).json({ error: 'El 2FA ya fue inicializado.' });
    }

    const randomBuffer = crypto.randomBytes(20);
    const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    secret = '';
    for (let i = 0; i < randomBuffer.length; i++) {
      secret += base32chars[randomBuffer[i] % 32];
    }
    
    // Save to DB
    const { error } = await supabase.from('platform_settings').upsert({ key: 'superadmin_2fa_secret', value: secret }, { onConflict: 'key' });
    if (error) throw error;

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
content = content.replace(
  /app\.post\('\/api\/superadmin\/2fa\/setup-public', \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: 'Error setting up 2FA: ' \+ err\.message \}\);\n  \}\n\}\);/,
  newSetupPublic.trim()
);

// 2. Rewrite status
const newStatus = `
app.get('/api/superadmin/2fa/status', async (req, res) => {
  const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'superadmin_2fa_secret').single();
  res.json({ isActive: !!(setting && setting.value) });
});
`;
content = content.replace(
  /app\.get\('\/api\/superadmin\/2fa\/status', \(req, res\) => \{[\s\S]*?\}\);/,
  newStatus.trim()
);

// 3. Rewrite recover
const newRecover = `
app.post('/api/superadmin/recover', async (req, res) => {
  try {
    const { token } = req.body;
    const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'superadmin_2fa_secret').single();
    const secret = setting ? setting.value : null;

    if (!secret) {
      return res.status(400).json({ error: 'EL ADMINISTRADOR NO HA CONFIGURADO LA RECUPERACIÓN 2FA TODAVÍA.' });
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
content = content.replace(
  /app\.post\('\/api\/superadmin\/recover', \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: 'Error interno de recuperación: ' \+ err\.message \}\);\n  \}\n\}\);/,
  newRecover.trim()
);

fs.writeFileSync(filePath, content);
console.log("Backend 2FA migrated to Supabase!");
