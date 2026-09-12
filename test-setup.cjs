const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/security/2fa/setup',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer test'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', data));
});
req.on('error', console.error);
req.end();
