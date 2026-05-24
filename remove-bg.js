const fs = require('fs');
const path = require('path');
const { GifReader } = require('omggif');
const { PNG } = require('pngjs');

const input = path.join(__dirname, 'Imagens', 'Jigglypuff cantando.gif');
const output = path.join(__dirname, 'Imagens', 'Jigglypuff-cantando.png');

const buf = fs.readFileSync(input);
const reader = new GifReader(Buffer.from(buf));

const w = reader.width;
const h = reader.height;
const pixels = new Uint8Array(w * h * 4);
reader.decodeAndBlitFrameRGBA(0, pixels);

// Sample corners to detect background color
const corners = [0, (w - 1), (h - 1) * w, (h - 1) * w + (w - 1)];
let rSum = 0, gSum = 0, bSum = 0;
for (const i of corners) {
  rSum += pixels[i * 4];
  gSum += pixels[i * 4 + 1];
  bSum += pixels[i * 4 + 2];
}
const bgR = Math.round(rSum / corners.length);
const bgG = Math.round(gSum / corners.length);
const bgB = Math.round(bSum / corners.length);
console.log(`Detected background color: rgb(${bgR}, ${bgG}, ${bgB})`);

const TOLERANCE = 30;

const png = new PNG({ width: w, height: h, filterType: -1 });
for (let i = 0; i < w * h; i++) {
  const r = pixels[i * 4];
  const g = pixels[i * 4 + 1];
  const b = pixels[i * 4 + 2];
  const a = pixels[i * 4 + 3];

  const isBg = Math.abs(r - bgR) <= TOLERANCE &&
               Math.abs(g - bgG) <= TOLERANCE &&
               Math.abs(b - bgB) <= TOLERANCE;

  png.data[i * 4]     = r;
  png.data[i * 4 + 1] = g;
  png.data[i * 4 + 2] = b;
  png.data[i * 4 + 3] = (a === 0 || isBg) ? 0 : 255;
}

const outBuf = PNG.sync.write(png);
fs.writeFileSync(output, outBuf);
console.log(`Saved: ${output} (${w}x${h})`);
