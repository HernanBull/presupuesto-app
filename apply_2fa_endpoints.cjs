const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const filePath = path.join(__dirname, 'server', 'index.js');
let content = fs.readFileSync(filePath, 'utf8');

// Ensure otpauth is imported in server/index.js
if (!content.includes("import * as OTPAuth from 'otpauth';")) {
  content = content.replace(
    /import express from 'express';/,
    "import express from 'express';\nimport * as OTPAuth from 'otpauth';"
  );
}

// Add 2FA endpoints below /api/superadmin/key
const twoFaEndpoints = `
app.get('/api/superadmin/2fa/setup', requireSuperAdmin, (req, res) => {
  try {
    let secret = process.env.SUPERADMIN_2FA_SECRET;
    
    // Generate if it doesn't exist
    if (!secret) {
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
    }

    const totp = new OTPAuth.TOTP({
      issuer: 'AxonMarket SuperAdmin',
      label: 'Admin Panel',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret
    });

    res.json({ success: true, uri: totp.toString(), secret: secret });
  } catch (err) {
    res.status(500).json({ error: 'Error setting up 2FA: ' + err.message });
  }
});
`;

if (!content.includes('/api/superadmin/2fa/setup')) {
  content = content.replace(
    /app\.delete\('\/api\/superadmin\/merchants\/:id', requireSuperAdmin, \(req, res\) => \{/,
    twoFaEndpoints + "\napp.delete('/api/superadmin/merchants/:id', requireSuperAdmin, (req, res) => {"
  );
}

fs.writeFileSync(filePath, content);
console.log("Server endpoints for 2FA injected!");
