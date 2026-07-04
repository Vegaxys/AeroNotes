const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lengthBuf = Buffer.alloc(4)
  lengthBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lengthBuf, typeBuf, data, crcBuf])
}

/** Renders a rounded-square post-it icon: warm yellow fill, soft amber border, folded corner. */
function renderIcon(size) {
  const raw = Buffer.alloc(size * (1 + size * 4))
  const radius = Math.round(size * 0.18)
  const fold = Math.round(size * 0.28)

  const fill = [253, 224, 71] // #fde047
  const border = [217, 164, 6] // darker amber
  const foldColor = [240, 199, 60]

  const margin = Math.round(size * 0.06)
  const left = margin
  const top = margin
  const right = size - margin
  const bottom = size - margin

  function insideRoundedSquare(x, y) {
    if (x < left || x >= right || y < top || y >= bottom) return false

    const nearLeft = x < left + radius
    const nearRight = x >= right - radius
    const nearTop = y < top + radius
    const nearBottom = y >= bottom - radius

    if (nearLeft && nearTop) {
      return distSq(x, y, left + radius, top + radius) <= radius * radius
    }
    if (nearRight && nearTop) {
      return distSq(x, y, right - radius, top + radius) <= radius * radius
    }
    if (nearLeft && nearBottom) {
      return distSq(x, y, left + radius, bottom - radius) <= radius * radius
    }
    if (nearRight && nearBottom) {
      return distSq(x, y, right - radius, bottom - radius) <= radius * radius
    }
    return true
  }

  function distSq(x, y, cx, cy) {
    const dx = x - cx
    const dy = y - cy
    return dx * dx + dy * dy
  }

  function isFoldedCorner(x, y) {
    const margin = Math.round(size * 0.06)
    const right = size - margin
    const bottom = size - margin
    return x > right - fold && y > bottom - fold && x - (right - fold) + (y - (bottom - fold)) > fold * 0.9
  }

  function isBorder(x, y) {
    const borderWidth = Math.max(1, Math.round(size * 0.035))
    if (!insideRoundedSquare(x, y)) return false
    return (
      !insideRoundedSquare(x - borderWidth, y) ||
      !insideRoundedSquare(x + borderWidth, y) ||
      !insideRoundedSquare(x, y - borderWidth) ||
      !insideRoundedSquare(x, y + borderWidth)
    )
  }

  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4)
    raw[rowStart] = 0
    for (let x = 0; x < size; x++) {
      const offset = rowStart + 1 + x * 4
      const inside = insideRoundedSquare(x, y)
      const color = inside
        ? isFoldedCorner(x, y)
          ? foldColor
          : isBorder(x, y)
            ? border
            : fill
        : [0, 0, 0]
      raw[offset] = color[0]
      raw[offset + 1] = color[1]
      raw[offset + 2] = color[2]
      raw[offset + 3] = inside ? 255 : 0
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: truecolor with alpha
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const idat = zlib.deflateSync(raw)

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ])
}

const outputs = [
  ['build/icon.png', 256],
  ['resources/tray-icon.png', 32]
]

for (const [relPath, size] of outputs) {
  const fullPath = path.join(__dirname, '..', relPath)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, renderIcon(size))
  console.log(`wrote ${relPath} (${size}x${size})`)
}
