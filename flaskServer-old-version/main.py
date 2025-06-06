from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
from encryption import AES128Encryptor
from decryption import AES128Decryptor

app = Flask(__name__)
CORS(app)

aes_key = "thisisa128bitkey"  # 16 bytes
encryptor = AES128Encryptor(aes_key)
decryptor = AES128Decryptor(aes_key)

BLOCK_SIZE = 16

def pad(text):
    pad_len = BLOCK_SIZE - (len(text) % BLOCK_SIZE)
    return text + chr(pad_len) * pad_len

def unpad(text):
    try:
        pad_len = ord(text[-1])
        return text[:-pad_len]
    except Exception:
        raise ValueError("Unpadding error. Possibly incorrect ciphertext or block length.")

def split_blocks(data, block_size=16):
    return [data[i:i + block_size] for i in range(0, len(data), block_size)]

@app.route("/encrypt", methods=["POST"])
def encrypt():
    data = request.get_json()
    plaintext = data.get("plaintext", "")

    padded_text = pad(plaintext)
    blocks = split_blocks(padded_text.encode("utf-8"), BLOCK_SIZE)

    ciphertext_blocks = []
    for block in blocks:
        ct = encryptor.encrypt_block(block)
        ciphertext_blocks.append(ct)

    combined = b"".join(ciphertext_blocks)
    b64_ct = base64.b64encode(combined).decode()
    return jsonify({"ciphertext": b64_ct})

@app.route("/decrypt", methods=["POST"])
def decrypt():
    data = request.get_json()
    b64_cipher = data.get("plaintext", "")

    try:
        ciphertext = base64.b64decode(b64_cipher)
        if len(ciphertext) % BLOCK_SIZE != 0:
            raise ValueError("Ciphertext length must be a multiple of 16.")

        blocks = split_blocks(ciphertext, BLOCK_SIZE)

        plaintext_blocks = []
        for block in blocks:
            if len(block) != BLOCK_SIZE:
                raise ValueError("Invalid block length: expected 16 bytes.")
            pt = decryptor.decrypt_block(block)
            plaintext_blocks.append(pt.decode("utf-8"))

        full_text = unpad("".join(plaintext_blocks))
        return jsonify({"ciphertext": full_text})
    except Exception as e:
        print("Decryption error:", str(e))
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    app.run(debug=True)
