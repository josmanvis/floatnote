#!/usr/bin/env node
/**
 * Generates proper macOS template tray icons for Floatnote.
 * Template images must be black pixels (RGB 0,0,0) with alpha channel only.
 * macOS automatically renders them white on dark menu bars.
 *
 * Generates:
 *   src/iconTemplate.png    (16x16)
 *   src/iconTemplate@2x.png (32x32)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(width, height, pixels) {
  // PNG file structure
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT chunk - raw pixel data with filter bytes
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0; // no filter
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * (1 + width * 4) + 1 + x * 4;
      rawData[dstIdx] = pixels[srcIdx];     // R
      rawData[dstIdx + 1] = pixels[srcIdx + 1]; // G
      rawData[dstIdx + 2] = pixels[srcIdx + 2]; // B
      rawData[dstIdx + 3] = pixels[srcIdx + 3]; // A
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function makeChunk(type, data) {
    const chunk = Buffer.alloc(4 + type.length + data.length + 4);
    chunk.writeUInt32BE(data.length, 0);
    chunk.write(type, 4);
    data.copy(chunk, 4 + type.length);
    // CRC32
    const crcData = Buffer.concat([Buffer.from(type), data]);
    const crc = crc32(crcData);
    chunk.writeInt32BE(crc, chunk.length - 4);
    return chunk;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) | 0;
}

/**
 * Draw a pencil/pen icon shape into a pixel buffer.
 * All pixels are black (0,0,0) with varying alpha.
 * The shape is a stylized pen nib / pencil tip.
 */
function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 4, 0); // all transparent black

  function setPixel(x, y, alpha) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (y * size + x) * 4;
    pixels[idx] = 0;     // R = black
    pixels[idx + 1] = 0; // G = black
    pixels[idx + 2] = 0; // B = black
    pixels[idx + 3] = Math.min(255, Math.max(0, Math.round(alpha)));
  }

  if (size === 16) {
    // 16x16 "F" letterform - clean and recognizable
    // Vertical bar
    for (let y = 3; y <= 12; y++) {
      setPixel(4, y, 230);
      setPixel(5, y, 230);
    }
    // Top horizontal bar
    for (let x = 4; x <= 11; x++) {
      setPixel(x, 3, 230);
      setPixel(x, 4, 230);
    }
    // Middle horizontal bar
    for (let x = 4; x <= 9; x++) {
      setPixel(x, 7, 230);
      setPixel(x, 8, 230);
    }
  } else if (size === 32) {
    // 32x32 "F" letterform - scaled up with anti-aliasing
    // Vertical bar (thicker)
    for (let y = 6; y <= 25; y++) {
      for (let x = 8; x <= 11; x++) {
        setPixel(x, y, 230);
      }
    }
    // Top horizontal bar
    for (let x = 8; x <= 23; x++) {
      setPixel(x, 6, 230);
      setPixel(x, 7, 230);
      setPixel(x, 8, 230);
      setPixel(x, 9, 230);
    }
    // Middle horizontal bar
    for (let x = 8; x <= 19; x++) {
      setPixel(x, 14, 230);
      setPixel(x, 15, 230);
      setPixel(x, 16, 230);
      setPixel(x, 17, 230);
    }
  }

  return pixels;
}

// Generate icons
const icon16 = drawIcon(16);
const icon32 = drawIcon(32);

const png16 = createPNG(16, 16, icon16);
const png32 = createPNG(32, 32, icon32);

const srcDir = path.join(__dirname, '..', 'src');
fs.writeFileSync(path.join(srcDir, 'iconTemplate.png'), png16);
fs.writeFileSync(path.join(srcDir, 'iconTemplate@2x.png'), png32);

console.log('Generated:');
console.log('  src/iconTemplate.png (16x16)');
console.log('  src/iconTemplate@2x.png (32x32)');
