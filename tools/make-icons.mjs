// Genera le icone PWA (PNG) senza dipendenze: sfondo evergreen, ghirlanda crema.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'public', 'icons')

const EVERGREEN = [18, 58, 43]
const CREAM = [241, 236, 224]
const BRASS = [201, 168, 105]

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeBuffer = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))
  return Buffer.concat([length, typeBuffer, data, crc])
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const smooth = (edge) => Math.min(1, Math.max(0, edge))

function render(size) {
  const buffer = Buffer.alloc(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const ringOuter = size * 0.3
  const ringInner = size * 0.21
  const diamond = size * 0.115

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = x + 0.5
      const py = y + 0.5
      const dx = px - cx
      const dy = py - cy
      const dist = Math.hypot(dx, dy)
      const radial = dist / (size * 0.62)

      // sfondo con leggera vignettatura
      const shade = 1 - Math.min(0.28, radial * 0.28)
      let r = EVERGREEN[0] * shade
      let g = EVERGREEN[1] * shade
      let b = EVERGREEN[2] * shade

      // filo d'oro attorno alla ghirlanda
      const brassAlpha = smooth(1 - Math.abs(dist - (ringOuter + size * 0.022)) / 1.4)
      r = r * (1 - brassAlpha) + BRASS[0] * brassAlpha
      g = g * (1 - brassAlpha) + BRASS[1] * brassAlpha
      b = b * (1 - brassAlpha) + BRASS[2] * brassAlpha

      // ghirlanda crema
      const ringAlpha = smooth(ringOuter - dist) * smooth(dist - ringInner)
      r = r * (1 - ringAlpha) + CREAM[0] * ringAlpha
      g = g * (1 - ringAlpha) + CREAM[1] * ringAlpha
      b = b * (1 - ringAlpha) + CREAM[2] * ringAlpha

      // rombo centrale scavato: torna il verde della carta
      const diamondDist = Math.abs(dx) + Math.abs(dy)
      const holeAlpha = smooth(diamond - diamondDist)
      r = r * (1 - holeAlpha) + EVERGREEN[0] * 0.9 * holeAlpha
      g = g * (1 - holeAlpha) + EVERGREEN[1] * 0.9 * holeAlpha
      b = b * (1 - holeAlpha) + EVERGREEN[2] * 0.9 * holeAlpha

      const offset = (y * size + x) * 4
      buffer[offset] = Math.round(r)
      buffer[offset + 1] = Math.round(g)
      buffer[offset + 2] = Math.round(b)
      buffer[offset + 3] = 255
    }
  }

  return encodePng(size, size, buffer)
}

mkdirSync(outDir, { recursive: true })
for (const [size, name] of [
  [512, 'icon-512.png'],
  [192, 'icon-192.png'],
  [180, 'icon-180.png'],
]) {
  writeFileSync(join(outDir, name), render(size))
  console.log(`scritto public/icons/${name} (${size}px)`)
}
