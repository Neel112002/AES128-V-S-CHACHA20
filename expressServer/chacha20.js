const { rotl32, u8ToU32Le, u32ToU8Le } = require("./utility");

// ChaCha20 Quarter round function
function quarterRound(state, a, b, c, d) {
  state[a] = (state[a] + state[b]) >>> 0;
  state[d] = rotl32(state[d] ^ state[a], 16);

  state[c] = (state[c] + state[d]) >>> 0;
  state[b] = rotl32(state[b] ^ state[c], 12);

  state[a] = (state[a] + state[b]) >>> 0;
  state[d] = rotl32(state[d] ^ state[a], 8);

  state[c] = (state[c] + state[d]) >>> 0;
  state[b] = rotl32(state[b] ^ state[c], 7);
}

// The ChaCha20 block function: given key, counter, nonce, produce 64‐byte keystream
// key: Uint8Array(32), counter: 32‐bit number, nonce: Uint8Array(12).
// returns: Uint8Array(64)
function chacha20Block(key, counter, nonce) {
  if (!(key instanceof Uint8Array) || key.length !== 32) {
    throw new Error("Key must be 32‐byte Uint8Array");
  }
  if (!(nonce instanceof Uint8Array) || nonce.length !== 12) {
    throw new Error("Nonce must be 12‐byte Uint8Array");
  }

  // 1) Initialize the 16‐word ChaCha state constants: "expand 32‐byte k"
  const constants = new Uint8Array([
    0x65,
    0x78,
    0x70,
    0x61, // "expa"
    0x6e,
    0x64,
    0x20,
    0x33, // "nd 3"
    0x32,
    0x2d,
    0x62,
    0x79, // "2‐by"
    0x74,
    0x65,
    0x20,
    0x6b, // "te k"
  ]);

  // Build initial state (16 little‐endian words)
  const state = new Uint32Array(16);
  // Constants
  for (let i = 0; i < 4; i++) {
    state[i] = u8ToU32Le(constants, 4 * i);
  }
  // Key
  for (let i = 0; i < 8; i++) {
    state[4 + i] = u8ToU32Le(key, 4 * i);
  }
  // Counter
  state[12] = counter >>> 0;
  // Nonce (3 words)
  state[13] = u8ToU32Le(nonce, 0);
  state[14] = u8ToU32Le(nonce, 4);
  state[15] = u8ToU32Le(nonce, 8);

  // 2) Make a working copy (the “working state”)
  const working = new Uint32Array(state);

  // 3) 20 rounds: 10 “column” + 10 “diagonal” rounds
  for (let i = 0; i < 10; i++) {
    // Column rounds
    quarterRound(working, 0, 4, 8, 12);
    quarterRound(working, 1, 5, 9, 13);
    quarterRound(working, 2, 6, 10, 14);
    quarterRound(working, 3, 7, 11, 15);
    // Diagonal rounds
    quarterRound(working, 0, 5, 10, 15);
    quarterRound(working, 1, 6, 11, 12);
    quarterRound(working, 2, 7, 8, 13);
    quarterRound(working, 3, 4, 9, 14);
  }

  // 4) Add original state to working state, serialize to bytes
  const output = new Uint8Array(64);
  for (let i = 0; i < 16; i++) {
    const resultWord = (working[i] + state[i]) >>> 0;
    u32ToU8Le(resultWord, output, 4 * i);
  }
  return output;
}

// Given key, initial counter, nonce, and plaintext bytes, produce ciphertext bytes
//   plaintextBytes: Uint8Array of any length.
//   Returns new Uint8Array(ciphertextLength).
function encryptChaCha20(key, counter, nonce, plaintextBytes) {
  if (!(plaintextBytes instanceof Uint8Array)) {
    throw new Error("Plaintext must be a Uint8Array");
  }
  const out = new Uint8Array(plaintextBytes.length);
  let remaining = plaintextBytes.length;
  let blockCount = 0;
  let offset = 0;

  while (remaining > 0) {
    const keystream = chacha20Block(key, counter + blockCount, nonce);
    blockCount++;

    const chunkSize = Math.min(64, remaining);
    for (let i = 0; i < chunkSize; i++) {
      out[offset + i] = plaintextBytes[offset + i] ^ keystream[i];
    }
    offset += chunkSize;
    remaining -= chunkSize;
  }

  return out;
}

module.exports = {
  chacha20Block,
  encryptChaCha20,
};
