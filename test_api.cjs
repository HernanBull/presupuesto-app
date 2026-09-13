const fs = require('fs');
const https = require('https');

const dataStr = fs.readFileSync('F:/memoria/contexto presupuesto/Presupuesto/.obsidian/plugins/obsidian-local-rest-api/data.json', 'utf8');
const data = JSON.parse(dataStr);

const options = {
  hostname: '127.0.0.1',
  port: data.port,
  path: '/',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + data.apiKey
  },
  rejectUnauthorized: false
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', (e) => {
  console.error('Error connecting:', e.message);
});
req.end();
