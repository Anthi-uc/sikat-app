// scripts/generate-icons.mjs
// Generates SIKAT app icons using pure Node.js — no native deps required.
// Icon design: solid green circle (#16a34a) with a white water-drop in the center.

import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { deflateSync } from 'zlib';

// ─── Minimal PNG encoder ─────────────────────────────────────────────────────

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (const b of buf) crc = table[(crc ^ b) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.concat([typeBytes, data]);
  const crcVal = Buffer.allocUnsafe(4); crcVal.writeUInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([len, typeBytes, data, crcVal]);
}

function encodePNG(pixels, size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: width, height, bit depth 8, color type 2 (RGB)
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Build raw scanlines (filter byte 0 + RGB per pixel)
  const rowBytes = size * 3;
  const raw = Buffer.allocUnsafe(size * (1 + rowBytes));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + rowBytes)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      const dst = y * (1 + rowBytes) + 1 + x * 3;
      raw[dst]     = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
    }
  }

  const compressed = deflateSync(raw);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Icon drawing ─────────────────────────────────────────────────────────────

function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2;

  // Green: #16a34a = rgb(22, 163, 74)
  const gR = 22, gG = 163, gB = 74;
  // White
  const wR = 255, wG = 255, wB = 255;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > r) {
        // Outside circle — white background
        pixels[idx] = wR; pixels[idx + 1] = wG; pixels[idx + 2] = wB; pixels[idx + 3] = 255;
        continue;
      }

      // Inside circle — fill green by default
      pixels[idx] = gR; pixels[idx + 1] = gG; pixels[idx + 2] = gB; pixels[idx + 3] = 255;

      // Water-drop shape (teardrop): round bottom + triangular top, pointing up
      const dropR  = r * 0.28;           // radius of round bottom
      const dropCx = cx;
      const dropCy = cy + r * 0.05;      // center of round part, slightly below circle center
      const apexY  = cy - r * 0.38;      // tip of the triangle

      // Round bottom of drop
      const ddx = x - dropCx;
      const ddy = y - dropCy;
      if (Math.sqrt(ddx * ddx + ddy * ddy) < dropR) {
        pixels[idx] = wR; pixels[idx + 1] = wG; pixels[idx + 2] = wB;
        continue;
      }

      // Triangular top (pointing upward, blending into the round bottom)
      if (y >= apexY && y <= dropCy) {
        const t = (y - apexY) / (dropCy - apexY);
        const halfWidth = t * dropR * 1.1;
        if (x >= dropCx - halfWidth && x <= dropCx + halfWidth) {
          pixels[idx] = wR; pixels[idx + 1] = wG; pixels[idx + 2] = wB;
        }
      }
    }
  }

  return pixels;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const outDir = 'assets/icons';
await mkdir(outDir, { recursive: true });

const sizes = [
  { name: 'icon-16.png',          size: 16  },
  { name: 'icon-32.png',          size: 32  },
  { name: 'icon-192.png',         size: 192 },
  { name: 'icon-512.png',         size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size } of sizes) {
  const pixels = drawIcon(size);
  const png    = encodePNG(pixels, size);
  const outPath = `${outDir}/${name}`;

  await new Promise((resolve, reject) => {
    const ws = createWriteStream(outPath);
    ws.on('finish', resolve);
    ws.on('error', reject);
    ws.write(png);
    ws.end();
  });

  console.log(`✓ Generated ${outPath} (${size}×${size} px, ${png.length} bytes)`);
}

console.log('\n✅ All icons generated successfully.');
