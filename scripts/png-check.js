// 解码 PNG 并采样若干区域像素，用于验证页面主题明暗
const fs = require('fs');
const zlib = require('zlib');

function readU32(buf, off) { return buf.readUInt32BE(off); }

function decodePNG(buf) {
  let off = 8; // skip signature
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = readU32(buf, off);
    const type = buf.toString('latin1', off + 4, off + 8);
    if (type === 'IHDR') {
      width = readU32(buf, off + 8);
      height = readU32(buf, off + 12);
      bitDepth = buf[off + 16];
      colorType = buf[off + 17];
    } else if (type === 'IDAT') {
      idat.push(buf.slice(off + 8, off + 8 + len));
    } else if (type === 'IEND') break;
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let prev = Buffer.alloc(stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.slice(pos, pos + stride);
    pos += stride;
    const cur = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      switch (filter) {
        case 1: v = (v + a) & 0xff; break;
        case 2: v = (v + b) & 0xff; break;
        case 3: v = (v + ((a + b) >> 1)) & 0xff; break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
          v = (v + pr) & 0xff;
          break;
        }
      }
      cur[x] = v;
    }
    cur.copy(out, y * stride);
    prev = cur;
  }
  return { width, height, channels, data: out };
}

function sample(img, fx, fy, label) {
  const x = Math.floor(img.width * fx);
  const y = Math.floor(img.height * fy);
  const i = (y * img.width + x) * img.channels;
  const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  console.log(`${label} @(${fx},${fy}): rgb(${r},${g},${b}) lum=${lum.toFixed(0)}`);
}

function regionAvg(img, fx, fy, w, h) {
  const x0 = Math.floor(img.width * fx), y0 = Math.floor(img.height * fy);
  const x1 = Math.min(img.width, x0 + w), y1 = Math.min(img.height, y0 + h);
  let sum = 0, n = 0;
  for (let y = y0; y < y1; y += 4) {
    for (let x = x0; x < x1; x += 4) {
      const i = (y * img.width + x) * img.channels;
      sum += 0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2];
      n++;
    }
  }
  return (sum / n).toFixed(0);
}

const file = process.argv[2];
const buf = fs.readFileSync(file);
const img = decodePNG(buf);
console.log(`${file}: ${img.width}x${img.height}`);
sample(img, 0.5, 0.05, 'top-center');
sample(img, 0.5, 0.5, 'center');
sample(img, 0.05, 0.5, 'left');
sample(img, 0.5, 0.95, 'bottom');
console.log(`region avg lum: top-third=${regionAvg(img, 0, 0, img.width, img.height / 3)}, middle=${regionAvg(img, 0, 0.33, img.width, img.height / 3)}, bottom=${regionAvg(img, 0, 0.66, img.width, img.height / 3)}`);
