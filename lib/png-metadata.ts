// Minimal PNG tEXt-chunk writer. canvas.toDataURL() emits a bare PNG with no
// textual metadata, so we splice a tEXt chunk in ourselves to embed e.g. the
// source URL. See the PNG spec, section 11.3.4.3.

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

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function latin1Bytes(str: string): Uint8Array {
  const out = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) {
    // tEXt is Latin-1; drop anything outside the byte range to stay valid.
    out[i] = str.charCodeAt(i) & 0xff
  }
  return out
}

function buildTextChunk(keyword: string, text: string): Uint8Array {
  const type = latin1Bytes("tEXt")
  const data = new Uint8Array([...latin1Bytes(keyword), 0, ...latin1Bytes(text)])
  const length = data.length

  const chunk = new Uint8Array(4 + 4 + length + 4)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, length)
  chunk.set(type, 4)
  chunk.set(data, 8)
  view.setUint32(8 + length, crc32(new Uint8Array([...type, ...data])))
  return chunk
}

/**
 * Returns a copy of `png` with a tEXt chunk inserted right after IHDR.
 * IHDR is always the first chunk: 8-byte signature + 25-byte IHDR chunk.
 */
export function addPngTextChunk(png: Uint8Array, keyword: string, text: string): Uint8Array {
  const insertAt = 8 + 25
  const chunk = buildTextChunk(keyword, text)
  const out = new Uint8Array(png.length + chunk.length)
  out.set(png.subarray(0, insertAt), 0)
  out.set(chunk, insertAt)
  out.set(png.subarray(insertAt), insertAt + chunk.length)
  return out
}

/** Decode a `data:image/png;base64,...` URL into raw PNG bytes. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
