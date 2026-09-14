const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/google-proxy?url=' + encodeURIComponent('https://www.googleapis.com/calendar/v3/calendars/primary/events'),
  method: 'POST',
  headers: {
    'X-Google-Authorization': 'Bearer ya29.c.b0AXv0zTOgT2yP...',
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', (c) => data += c);
  res.on('end', () => console.log('Response:', res.statusCode, data));
});
req.write('{"summary": "Test"}');
req.end();
