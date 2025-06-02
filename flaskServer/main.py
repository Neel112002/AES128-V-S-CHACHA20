from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
from encryption import AES128Encryptor
from decryption import AES128Decryptor

app = Flask(__name__)
CORS(app)

aes_key = "thisisa128bitkey"  # Must be 16 bytes
encryptor = AES128Encryptor(aes_key)
decryptor = AES128Decryptor(aes_key)


@app.route("/encrypt", methods=["POST"])
def encrypt():
    data = request.get_json()
    plaintext = data.get("plaintext", "")

    # pad to 16 bytes manually if needed
    if len(plaintext) < 16:
        plaintext = plaintext.ljust(16)
    elif len(plaintext) > 16:
        return jsonify({"error": "Only 16-byte input supported"}), 400

    ct = encryptor.encrypt_block(plaintext.encode())
    b64_ct = base64.b64encode(ct).decode()
    return jsonify({"ciphertext": b64_ct})


@app.route("/decrypt", methods=["POST"])
def decrypt():
    data = request.get_json()
    b64_cipher = data.get("plaintext", "")

    try:
        ct = base64.b64decode(b64_cipher)
        pt = decryptor.decrypt_block(ct)
        return jsonify({"ciphertext": pt.decode("utf-8").strip()})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    app.run(debug=True)
