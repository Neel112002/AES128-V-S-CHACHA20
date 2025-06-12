const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const crypto = require("crypto"); // Only used for random key/nonce generation, not for encryption

const { encrypt, decrypt } = require("./aead");
const { hexToU8, u8ToHex } = require("./utility");

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
// app.use(bodyParser.json());

const KEY_BYTES = crypto.randomBytes(32); // 256‐bit key

// Encrypt
// Body: { plaintext: "<ASCII string>" }
// Returns JSON: { ciphertext: "<hex>", tag: "<hex>", nonce: "<hex>" }
app.post("/encrypt", (req, res) => {
  try {
    const plaintext = req.body.plaintext;
    if (typeof plaintext !== "string") {
      return res.status(400).json({ error: "plaintext must be a string" });
    }

    // Convert ASCII string to Uint8Array
    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);

    // Generate a random 12‐byte nonce
    const nonceBytes = crypto.randomBytes(12);

    // No AAD in this example (empty Uint8Array)
    const aadBytes = new Uint8Array(0);

    // Perform encryption
    const { ciphertext, tag } = encrypt(
      KEY_BYTES,
      nonceBytes,
      plaintextBytes,
      aadBytes
    );

    res.json({
      ciphertext: `${u8ToHex(nonceBytes)}|${u8ToHex(ciphertext)}|${u8ToHex(
        tag
      )}`,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Decrypt
// Body: { ciphertext: "<hex>", tag: "<hex>", nonce: "<hex>" }
// Returns JSON: { plaintext: "<ASCII string>" } or 401 on auth failure
app.post("/decrypt", (req, res) => {
  try {
    let ciphertextarray = req.body.plaintext.split("|");
    const nonce = ciphertextarray[0];
    const ciphertext = ciphertextarray[1];
    const tag = ciphertextarray[2];
    if (
      typeof ciphertext !== "string" ||
      typeof tag !== "string" ||
      typeof nonce !== "string"
    ) {
      return res
        .status(400)
        .json({ error: "ciphertext, tag, nonce must be hex strings" });
    }

    // console.log("BLOCKS", ciphertext, nonce, tag, KEY_BYTES);
    const ctBytes = hexToU8(ciphertext);
    const tagBytes = hexToU8(tag);
    const nonceBytes = hexToU8(nonce);

    // No AAD in this example (empty)
    const aadBytes = new Uint8Array(0);

    // Perform decryption (may throw if auth fails)
    const plaintextBytes = decrypt(
      KEY_BYTES,
      nonceBytes,
      ctBytes,
      aadBytes,
      tagBytes
    );

    // Convert back to ASCII string
    const decoder = new TextDecoder();
    const plaintext = decoder.decode(plaintextBytes);
    res.json({ ciphertext: plaintext });
  } catch (e) {
    console.error(e);
    return res.status(401).json({ error: "Decryption/authentication failed" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
