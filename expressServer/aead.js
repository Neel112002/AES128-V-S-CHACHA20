const { chacha20Block, encryptChaCha20 } = require("./chacha20");
const { computePoly1305Tag } = require("./poly1305");
const { u64ToU8Le } = require("./utility");

// Encrypt function: returns { ciphertext, tag } ----
// keyBytes: Uint8Array(32), nonceBytes: Uint8Array(12),
// plaintextBytes: Uint8Array, aadBytes: Uint8Array (can be empty Uint8Array).
function encrypt(keyBytes, nonceBytes, plaintextBytes, aadBytes) {
  const keyByte1 = keyBytes.slice(0,32)
  const keyByte2 = keyBytes.slice(32,64)
  
  if (!(keyByte1 instanceof Uint8Array) || keyByte1.length !== 32) {
    throw new Error("Key must be 32 bytes");
  }
  if (!(keyByte2 instanceof Uint8Array) || keyByte2.length !== 32) {
    throw new Error("Key must be 32 bytes");
  }
  if (!(nonceBytes instanceof Uint8Array) || nonceBytes.length !== 12) {
    throw new Error("Nonce must be 12 bytes");
  }
  if (!(plaintextBytes instanceof Uint8Array)) {
    throw new Error("Plaintext must be Uint8Array");
  }
  if (!(aadBytes instanceof Uint8Array)) {
    throw new Error("AAD must be Uint8Array (can be empty)");
  }

  // 1) Compute Poly1305 one-time key: use counter=0
  const block0 = chacha20Block(keyByte2, 0, nonceBytes);
  const rKey = block0.slice(0, 16); // r (Poly1305 r)
  const sKey = block0.slice(16, 32); // s (Poly1305 s)

  // 2) Encrypt plaintext with ChaCha20 using counter=1
  const ciphertext = encryptChaCha20(keyByte1, 1, nonceBytes, plaintextBytes);

  // 3) Build data for Poly1305: AAD padded to 16, ciphertext padded to 16, then lengths
  function pad16(arr) {
    const len = arr.length;
    const rem = len % 16;
    if (rem === 0) return arr;
    const padLen = 16 - rem;
    const padded = new Uint8Array(len + padLen);
    padded.set(arr, 0);
    // zeros already by default
    return padded;
  }

  const aadPadded = pad16(aadBytes);
  const ctPadded = pad16(ciphertext);

  // 4) Concatenate: aadPadded || ctPadded || 8‐byte little‐endian(len(AAD)) || 8‐byte little‐endian(len(CT))
  const aadLenBlock = u64ToU8Le(BigInt(aadBytes.length));
  const ctLenBlock = u64ToU8Le(BigInt(ciphertext.length));

  const macData = new Uint8Array(
    aadPadded.length + ctPadded.length + 16
  );
  macData.set(aadPadded, 0);
  macData.set(ctPadded, aadPadded.length);
  macData.set(aadLenBlock, aadPadded.length + ctPadded.length);
  macData.set(
    ctLenBlock,
    aadPadded.length + ctPadded.length + aadLenBlock.length
  );

  // 5) Compute Poly1305 tag over macData with key = rKey || sKey
  const polyKey = new Uint8Array(32);
  polyKey.set(rKey, 0);
  polyKey.set(sKey, 16);
  const tag = computePoly1305Tag(polyKey, macData);

  return {
    ciphertext,
    tag,
  };
}

// Decrypt function: verifies tag, returns plaintext or throws Error
function decrypt(keyBytes, nonceBytes, ciphertextBytes, aadBytes, tagBytes) {
  const keyByte1 = keyBytes.slice(0,32)
  const keyByte2 = keyBytes.slice(32,64)
  if (!(keyByte1 instanceof Uint8Array) || keyByte1.length !== 32) {
    throw new Error("Key must be 32 bytes");
  }
  if (!(keyByte2 instanceof Uint8Array) || keyByte2.length !== 32) {
    throw new Error("Key must be 32 bytes");
  }
  if (!(nonceBytes instanceof Uint8Array) || nonceBytes.length !== 12) {
    throw new Error("Nonce must be 12 bytes");
  }
  if (!(ciphertextBytes instanceof Uint8Array)) {
    throw new Error("Ciphertext must be Uint8Array");
  }
  if (!(aadBytes instanceof Uint8Array)) {
    throw new Error("AAD must be Uint8Array");
  }
  if (!(tagBytes instanceof Uint8Array) || tagBytes.length !== 16) {
    throw new Error("Tag must be 16 bytes");
  }

  // 1) Recompute one-time Poly1305 key (counter=0)
  const block0 = chacha20Block(keyByte2, 0, nonceBytes);
  const rKey = block0.slice(0, 16);
  const sKey = block0.slice(16, 32);

  // 2) Build same macData as in encryption
  function pad16(arr) {
    const len = arr.length;
    const rem = len % 16;
    if (rem === 0) return arr;
    const padLen = 16 - rem;
    const padded = new Uint8Array(len + padLen);
    padded.set(arr, 0);
    return padded;
  }

  const aadPadded = pad16(aadBytes);
  const ctPadded = pad16(ciphertextBytes);
  const aadLenBlock = u64ToU8Le(BigInt(aadBytes.length));
  const ctLenBlock = u64ToU8Le(BigInt(ciphertextBytes.length));

  const macData = new Uint8Array(
    aadPadded.length + ctPadded.length + 16
  );
  macData.set(aadPadded, 0);
  macData.set(ctPadded, aadPadded.length);
  macData.set(aadLenBlock, aadPadded.length + ctPadded.length);
  macData.set(
    ctLenBlock,
    aadPadded.length + ctPadded.length + aadLenBlock.length
  );

  // 3) Compute expected tag
  const polyKey = new Uint8Array(32);
  polyKey.set(rKey, 0);
  polyKey.set(sKey, 16);
  const expectedTag = computePoly1305Tag(polyKey, macData);

  // 4) Constant‐time compare
  let good = 0;
  for (let i = 0; i < 16; i++) {
    good |= expectedTag[i] ^ tagBytes[i];
  }
  if (good !== 0) {
    throw new Error("Authentication failed: tags do not match");
  }

  // 5) Tags match → decrypt ciphertext with ChaCha20 (counter=1)
  const plaintext = encryptChaCha20(keyByte1, 1, nonceBytes, ciphertextBytes);
  return plaintext;
}

module.exports = {
  encrypt,
  decrypt,
};