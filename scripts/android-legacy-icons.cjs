// Writes the pre-Android-8 launcher PNGs (mipmap-*/ic_launcher*.png) by
// downscaling resources/app-icon.png, the desktop icon. Android 8+ uses the
// adaptive vector icon in res/drawable instead. No image library: the PNG is
// decoded and re-encoded with zlib, and scaled with a box filter.
// Usage: node scripts/android-legacy-icons.cjs
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const SOURCE = path.join(__dirname, '..', 'resources', 'app-icon.png')
const RES = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res')
const SIZES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }

function decodeRgba(buffer) {
  let offset = 8
  let width = 0
  let height = 0
  const idat = []
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      if (data[8] !== 8 || data[9] !== 6) throw new Error('Expected an 8-bit RGBA PNG')
    }
    if (type === 'IDAT') idat.push(data)
    offset += 12 + length
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = width * 4
  const pixels = Buffer.alloc(height * stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? pixels[y * stride + x - 4] : 0
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0
      const upLeft = x >= 4 && y > 0 ? pixels[(y - 1) * stride + x - 4] : 0
      const value = raw[y * (stride + 1) + 1 + x]
      let predictor = 0
      if (filter === 1) predictor = left
      else if (filter === 2) predictor = up
      else if (filter === 3) predictor = (left + up) >> 1
      else if (filter === 4) {
        const p = left + up - upLeft
        const pa = Math.abs(p - left)
        const pb = Math.abs(p - up)
        const pc = Math.abs(p - upLeft)
        predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft
      }
      pixels[y * stride + x] = (value + predictor) & 255
    }
  }
  return { width, height, pixels }
}

/** Box filter on premultiplied alpha, so transparent edges don't darken. */
function downscale({ width, height, pixels }, size) {
  const out = Buffer.alloc(size * size * 4)
  const scale = width / size
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0
      for (let sy = Math.floor(y * scale); sy < Math.floor((y + 1) * scale); sy++) {
        for (let sx = Math.floor(x * scale); sx < Math.floor((x + 1) * scale); sx++) {
          const i = (sy * width + sx) * 4
          const alpha = pixels[i + 3] / 255
          r += pixels[i] * alpha
          g += pixels[i + 1] * alpha
          b += pixels[i + 2] * alpha
          a += alpha
          n++
        }
      }
      const o = (y * size + x) * 4
      out[o] = a ? Math.round(r / a) : 0
      out[o + 1] = a ? Math.round(g / a) : 0
      out[o + 2] = a ? Math.round(b / a) : 0
      out[o + 3] = Math.round((a / n) * 255)
    }
  }
  return out
}

function encodeRgba(size, pixels) {
  const chunk = (type, data) => {
    const head = Buffer.alloc(8)
    head.writeUInt32BE(data.length, 0)
    head.write(type, 4, 'ascii')
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(zlib.crc32(Buffer.concat([head.subarray(4), data])), 0)
    return Buffer.concat([head, data, crc])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6
  const rows = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) pixels.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

const source = decodeRgba(fs.readFileSync(SOURCE))
for (const [density, size] of Object.entries(SIZES)) {
  const png = encodeRgba(size, downscale(source, size))
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
    fs.writeFileSync(path.join(RES, `mipmap-${density}`, name), png)
  }
  console.log(`mipmap-${density}: ${size}px`)
}
