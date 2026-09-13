const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: '123', role: 'DIRECTOR', leadsVoicePart: null }, 'fallback-secret-for-dev-only');
const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3333,
  path: '/api/v1/songs/c1034c73-85e6-460a-8317-928feff596dd',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${data}`);
  });
});
req.end();
