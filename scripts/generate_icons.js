import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const iconsDir = path.resolve(rootDir, 'assets/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate favicon.svg directly
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
  <rect width="80" height="80" rx="16" fill="#1e293b"/>
  <path d="M54 22c0-5.5-4.5-10-10-10H30c-5.5 0-10 4.5-10 10 0 4 2.4 7.5 6 9.2l12.5 6.3c1.7.85 2.5 2.1 2.5 3.75S39.7 44 38 44.8L25.5 51.2C23.5 52.2 22 54.5 22 57c0 5.5 4.5 10 10.3 10H50c5.5 0 10-4.5 10-10" stroke="#0d9488" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="57" cy="57" r="6" fill="#eab308"/>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'favicon.svg'), faviconSvg, 'utf8');
console.log('Saved favicon.svg');

const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Icon Generator</title></head>
<body style="background:#000;color:#fff;font-family:sans-serif;">
  <h2>Generating SIKAT PWA Icons...</h2>
  <div id="status">Working...</div>
  <script>
    const svgStandard = \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
      <rect width="80" height="80" fill="#1e293b"/>
      <path d="M54 22c0-5.5-4.5-10-10-10H30c-5.5 0-10 4.5-10 10 0 4 2.4 7.5 6 9.2l12.5 6.3c1.7.85 2.5 2.1 2.5 3.75S39.7 44 38 44.8L25.5 51.2C23.5 52.2 22 54.5 22 57c0 5.5 4.5 10 10.3 10H50c5.5 0 10-4.5 10-10" stroke="#0d9488" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <circle cx="57" cy="57" r="6" fill="#eab308"/>
    </svg>\`;

    // Maskable SVG has safe margin: logo is scaled to 62% in the center
    const svgMaskable = \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <rect width="120" height="120" fill="#1e293b"/>
      <g transform="translate(20, 20)">
        <path d="M54 22c0-5.5-4.5-10-10-10H30c-5.5 0-10 4.5-10 10 0 4 2.4 7.5 6 9.2l12.5 6.3c1.7.85 2.5 2.1 2.5 3.75S39.7 44 38 44.8L25.5 51.2C23.5 52.2 22 54.5 22 57c0 5.5 4.5 10 10.3 10H50c5.5 0 10-4.5 10-10" stroke="#0d9488" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="57" cy="57" r="6" fill="#eab308"/>
      </g>
    </svg>\`;

    async function svgToPng(svgStr, size) {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        img.onload = () => {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, size, size);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/png'));
        };
        img.src = url;
      });
    }

    async function run() {
      const targets = [
        { name: 'icon-512.png', size: 512, maskable: false },
        { name: 'icon-192.png', size: 192, maskable: false },
        { name: 'icon-maskable-512.png', size: 512, maskable: true },
        { name: 'apple-touch-icon.png', size: 180, maskable: false },
        { name: 'icon-32.png', size: 32, maskable: false },
        { name: 'icon-16.png', size: 16, maskable: false }
      ];

      const results = {};
      for (const t of targets) {
        const svg = t.maskable ? svgMaskable : svgStandard;
        results[t.name] = await svgToPng(svg, t.size);
      }

      await fetch('/save-icons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(results)
      });

      document.getElementById('status').textContent = 'DONE!';
    }

    run();
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlContent);
  } else if (req.method === 'POST' && req.url === '/save-icons') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        for (const [filename, dataUrl] of Object.entries(data)) {
          const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
          fs.writeFileSync(path.join(iconsDir, filename), Buffer.from(base64Data, 'base64'));
          console.log(`Saved ${filename} (${fs.statSync(path.join(iconsDir, filename)).size} bytes)`);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        console.log('All icons generated successfully!');
        setTimeout(() => process.exit(0), 500);
      } catch (err) {
        console.error('Error saving icons:', err);
        res.writeHead(500);
        res.end(err.message);
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(4892, () => {
  console.log('Icon generation server listening on http://localhost:4892');
  // Launch Edge in app mode or headless
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  if (fs.existsSync(edgePath)) {
    spawn(edgePath, ['--headless', '--disable-gpu', 'http://localhost:4892'], { detached: true });
  } else {
    console.log('Please open http://localhost:4892 in your browser to complete icon generation.');
  }
});
