const https = require('https');
https.get('https://k165.com:9801/leaderboard', (res) => {
  console.log('Status:', res.statusCode);
}).on('error', (e) => {
  console.log('HTTPS Error:', e.message);
});
