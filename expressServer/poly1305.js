const { read16LE, write16LE } = require("./utility");

// Compute Poly1305 tag
// key: Uint8Array(32), msg: Uint8Array(n). Returns Uint8Array(16) tag.
function computePoly1305Tag(key, msg) {
  if (!(key instanceof Uint8Array) || key.length !== 32) {
    throw new Error("Key must be 32 bytes for Poly1305");
  }
  const rBytes = key.slice(0, 16);
  const sBytes = key.slice(16, 32);

  // Clear bits 4,5,6,7 of r[3], r[7], r[11], r[15], lower 2 bits of r[4], r[8], r[12].
  // Equivalent to: r &= 0x0ffffffc0ffffffc0ffffffc0fffffff
  let r = 0n;
  for (let i = 0; i < 16; i++) {
    r |= BigInt(rBytes[i]) << BigInt(8 * i);
  }

  // Clear bits 0..2 of byte 3 → highest 3 bits of word17? Actually reference: r[3] &= 15, r[7] &= 15, r[11] &= 15, r[15] &= 15
  // Clear bits 4..7: so rBytes[3] &= 0x0f, rBytes[7] &= 0x0f, etc. Also rBytes[4]&=252, etc.
  // Easiest: apply big‐mask:
  const rMask = (BigInt(1) << 128n) - 1n; // 128 bits of 1
  const rClamped = r & 0x0ffffffc0ffffffc0ffffffc0fffffn;

  r = rClamped;

  // s is 128‐bit "shift"
  let s = 0n;
  for (let i = 0; i < 16; i++) {
    s |= BigInt(sBytes[i]) << BigInt(8 * i);
  }

  // The prime is 2^130 − 5
  const p = (1n << 130n) - 5n;

  // Accumulator starts at 0
  let acc = 0n;

  // Process each 16‐byte block of the message
  const blockCount = Math.ceil(msg.length / 16);
  for (let i = 0; i < blockCount; i++) {
    const offset = i * 16;
    const chunkSize = Math.min(16, msg.length - offset);
    // copy chunk into a 16‐byte array padded with zeros
    const chunk = new Uint8Array(16);
    for (let j = 0; j < chunkSize; j++) {
      chunk[j] = msg[offset + j];
    }
    // Append 1 bit by adding 2^(8*16) to the number:
    let n_i = read16LE(chunk, 0) + (1n << BigInt(8 * chunkSize));
    // acc = (acc + n_i) * r mod p
    acc = (acc + n_i) * r;
    acc %= p;
  }

  // At the end, tag = (acc + s) mod 2^128
  const tag = (acc + s) & ((1n << 128n) - 1n);

  // Return tag as 16 bytes little‐endian
  const out = new Uint8Array(16);
  write16LE(tag, out, 0);
  return out;
}

module.exports = {
  computePoly1305Tag,
};
