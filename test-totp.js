import * as OTPAuth from 'otpauth';
const secret = '3GWJARUPY6BGBXKFWQ6SWZR32YRWCTLN';
const totp = new OTPAuth.TOTP({
  issuer: 'Axon Agency',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  secret: OTPAuth.Secret.fromBase32(secret)
});

let baseTime = new Date('2026-09-04T16:42:32Z').getTime();
for (let i = -100; i < 100; i++) {
  const ts = baseTime + (i * 30000);
  const code = totp.generate({ timestamp: ts });
  if (code === '521172' || code === '376640') {
    console.log('Match found for code', code, 'at drift', i * 30, 'seconds');
  }
}
