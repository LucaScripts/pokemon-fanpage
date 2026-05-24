const fs = require('fs');
const path = require('path');

// Use the already-slowed version as input
const input  = path.join(__dirname, 'Imagens', 'jiggly-slow.gif');
const output = path.join(__dirname, 'Imagens', 'jiggly-loop.gif');
const LOOP_FROM = 15; // drop frames 0..2, loop frames 3..end

const buf = fs.readFileSync(input);
let pos = 0;

// --- Header + Logical Screen Descriptor ---
const header = buf.slice(0, 6); pos = 6;
const lsd    = buf.slice(pos, pos + 7); pos += 7;

const gctFlag = (lsd[4] >> 7) & 1;
const gctSize = gctFlag ? 3 * (1 << ((lsd[4] & 0x07) + 1)) : 0;
const gct     = gctFlag ? buf.slice(pos, pos + gctSize) : Buffer.alloc(0);
pos += gctSize;

// --- Parse every block, collect raw bytes per frame ---
function skipSubBlocks(b, p) {
  while (p < b.length) {
    const sz = b[p]; p += 1 + sz;
    if (sz === 0) break;
  }
  return p;
}

const frames = [];     // raw bytes of each frame (GCE + Image block)
let frameStart = -1;

while (pos < buf.length) {
  const byte = buf[pos];
  if (byte === 0x3B) break; // trailer

  if (byte === 0x21) {
    const label = buf[pos + 1];
    if (label === 0xF9) {
      // Graphic Control Extension — begins a new frame
      frameStart = pos;
      pos += 2;
      pos = skipSubBlocks(buf, pos);
    } else {
      // Any other extension (NETSCAPE loop etc.) — skip
      pos += 2;
      pos = skipSubBlocks(buf, pos);
    }
  } else if (byte === 0x2C) {
    // Image Descriptor
    if (frameStart === -1) frameStart = pos;
    pos += 10; // 0x2C (1) + left(2) + top(2) + width(2) + height(2) + flags(1)
    const flags = buf[pos - 1];
    const lctFlag = (flags >> 7) & 1;
    if (lctFlag) pos += 3 * (1 << ((flags & 0x07) + 1));
    pos += 1; // LZW min code size
    pos = skipSubBlocks(buf, pos);
    frames.push(buf.slice(frameStart, pos));
    frameStart = -1;
  } else {
    pos++;
  }
}

console.log(`Total frames: ${frames.length}`);
console.log(`Dropping frames 0-${LOOP_FROM - 1}, looping frames ${LOOP_FROM}-${frames.length - 1}`);

// --- NETSCAPE 2.0 loop-forever extension ---
const netscape = Buffer.from([
  0x21, 0xFF, 0x0B,
  0x4E,0x45,0x54,0x53,0x43,0x41,0x50,0x45,0x32,0x2E,0x30, // "NETSCAPE2.0"
  0x03, 0x01, 0x00, 0x00, 0x00
]);

// Output: header + LSD + GCT + loop ext + frames[LOOP_FROM..] + trailer
const parts = [header, lsd, gct, netscape, ...frames.slice(LOOP_FROM), Buffer.from([0x3B])];
fs.writeFileSync(output, Buffer.concat(parts));
console.log(`Saved: ${output}  (${frames.length - LOOP_FROM} frames, seamless loop from original frame ${LOOP_FROM})`);
