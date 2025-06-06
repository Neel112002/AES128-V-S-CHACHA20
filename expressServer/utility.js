// 3-Bit left rotate
function rotl32(v, c) {
  return ((v << c) | (v >>> (32 - c))) >>> 0;
}

// Converts 4 bytes (little‐endian) to a 32‐bit word
function u8ToU32Le(b, offset) {
  return (
    ((b[offset] & 0xff) |
      ((b[offset + 1] & 0xff) << 8) |
      ((b[offset + 2] & 0xff) << 16) |
      ((b[offset + 3] & 0xff) << 24)) >>>
    0
  );
}

// Converts a 32‐bit word to 4 bytes (little‐endian)
function u32ToU8Le(word, out, offset) {
  out[offset] = word & 0xff;
  out[offset + 1] = (word >>> 8) & 0xff;
  out[offset + 2] = (word >>> 16) & 0xff;
  out[offset + 3] = (word >>> 24) & 0xff;
}

// Read 16 bytes from `b` at offset as a BigInt (little‐endian)
function read16LE(b, offset) {
  let n = 0n;
  for (let i = 0; i < 16; i++) {
    n |= BigInt(b[offset + i]) << BigInt(8 * i);
  }
  return n;
}

// Write a 128‐bit (16 bytes) BigInt `x` (mod 2^128) into a Uint8Array at offset
function write16LE(x, out, offset) {
  let v = x & ((1n << 128n) - 1n);
  for (let i = 0; i < 16; i++) {
    out[offset + i] = Number((v >> BigInt(8 * i)) & 0xffn);
  }
}

// Convert unsigned 64‐bit number (BigInt) to 8‐byte little‐endian Uint8Array
function u64ToU8Le(x) {
  const out = new Uint8Array(8);
  let v = BigInt(x);
  for (let i = 0; i < 8; i++) {
    out[i] = Number((v >> BigInt(8 * i)) & 0xffn);
  }
  return out;
}

// Convert hex‐string to Uint8Array
function hexToU8(hex) {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex length");
  const len = hex.length / 2;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(hex.slice(2 * i, 2 * i + 2), 16);
  }
  return out;
}

// Convert Uint8Array to hex‐string
function u8ToHex(u8) {
  return Buffer.from(u8).toString("hex");
}

module.exports = {
  rotl32,
  u8ToU32Le,
  u32ToU8Le,
  read16LE,
  write16LE,
  u64ToU8Le,
  hexToU8,
  u8ToHex
};
