const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(__dirname, urlPath === '/' ? 'tabu_mobil_kelime_oyunu.html' : urlPath);
  
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'tabu_mobil_kelime_oyunu.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  let contentType = 'text/html; charset=utf-8';
  if (ext === '.json') contentType = 'application/json; charset=utf-8';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.js') contentType = 'application/javascript; charset=utf-8';
  else if (ext === '.css') contentType = 'text/css; charset=utf-8';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Dosya bulunamadı.');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Tabu Sunucusu çalışıyor:`);
  console.log(`- Bilgisayarda: http://localhost:${PORT}`);
  console.log(`- Telefonda (Aynı Wi-Fi): http://172.16.22.71:${PORT}`);
});
