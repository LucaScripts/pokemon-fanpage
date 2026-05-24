const fs = require('fs');
const path = require('path');
const { GifReader, GifWriter } = require('omggif');

const input = path.join(__dirname, 'Imagens', 'ezgif.com-speed.gif');
const output = path.join(__dirname, 'Imagens', 'jiggly-slow.gif');

const buf = Buffer.from(fs.readFileSync(input));
const reader = new GifReader(buf);

const frameCount = reader.numFrames();
console.log(`Frames: ${frameCount}, Size: ${reader.width}x${reader.height}`);

const frames = [];
for (let i = 0; i < frameCount; i++) {
  const info = reader.frameInfo(i);
  console.log(`  Frame ${i}: delay=${info.delay * 10}ms disposal=${info.disposal}`);
  const pixels = new Uint8Array(reader.width * reader.height * 4);
  reader.decodeAndBlitFrameRGBA(i, pixels);
  frames.push({ info, pixels });
}

// Slow down by 1.6x
const SLOW = 1.6;

// Build palette and indexed frames for GifWriter
// We'll use a simpler approach: copy raw GIF bytes and patch delay values
const rawBuf = Buffer.from(buf);

// Find and patch delay bytes in the raw GIF
// GIF delay is stored as 2 bytes (little-endian, in centiseconds) in graphic control extensions
// Graphic Control Extension: 0x21 0xF9 0x04 <flags> <delay_lo> <delay_hi> <transparent> 0x00
let patched = 0;
for (let i = 0; i < rawBuf.length - 5; i++) {
  if (rawBuf[i] === 0x21 && rawBuf[i+1] === 0xF9 && rawBuf[i+2] === 0x04) {
    const delayLo = rawBuf[i+4];
    const delayHi = rawBuf[i+5];
    const delay = delayLo | (delayHi << 8);
    const newDelay = Math.round(delay * SLOW);
    rawBuf[i+4] = newDelay & 0xFF;
    rawBuf[i+5] = (newDelay >> 8) & 0xFF;
    console.log(`  Patched frame delay: ${delay*10}ms -> ${newDelay*10}ms`);
    patched++;
  }
}

fs.writeFileSync(output, rawBuf);
console.log(`\nSaved: ${output} (${patched} frames patched)`);
