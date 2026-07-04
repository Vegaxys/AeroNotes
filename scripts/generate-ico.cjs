// Wraps build/icon.png (256x256) into a minimal single-image .ico container.
// Modern Windows (Vista+) accepts PNG-compressed image data inside .ico entries,
// so no BMP/AND-mask conversion is needed.
const fs = require('fs')
const path = require('path')

const pngPath = path.join(__dirname, '../build/icon.png')
const icoPath = path.join(__dirname, '../build/icon.ico')

const png = fs.readFileSync(pngPath)

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(1, 4) // image count

const entry = Buffer.alloc(16)
entry[0] = 0 // width: 0 means 256
entry[1] = 0 // height: 0 means 256
entry[2] = 0 // color count
entry[3] = 0 // reserved
entry.writeUInt16LE(1, 4) // color planes
entry.writeUInt16LE(32, 6) // bits per pixel
entry.writeUInt32LE(png.length, 8) // size of image data
entry.writeUInt32LE(header.length + entry.length, 12) // offset of image data

fs.writeFileSync(icoPath, Buffer.concat([header, entry, png]))
console.log(`wrote build/icon.ico (${png.length + header.length + entry.length} bytes)`)
