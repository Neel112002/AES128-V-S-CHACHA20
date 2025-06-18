# backend/app.py
# -----------------------------
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from encrypt import encrypt_message
from decrypt import decrypt_message

app = Flask(__name__)
CORS(app)

AES_KEY = os.urandom(16)

@app.route('/encrypt', methods=['POST'])
def encrypt_route():
    data = request.get_json()
    pt = data.get('plaintext', '')
    aad_hex = data.get('aad', '')
    aad = bytes.fromhex(aad_hex) if aad_hex else b""
    
    iv, ct, tag = encrypt_message(pt.encode('ascii'), AES_KEY, aad)
    return jsonify({
        'ciphertext': iv.hex() + "|" + ct.hex() + "|" + tag.hex() 
    })

@app.route('/decrypt', methods=['POST'])
def decrypt_route():
    data = request.get_json()
    cipher = data.get("plaintext", "").split("|")
    iv  = bytes.fromhex(cipher[0])
    ct  = bytes.fromhex(cipher[1])
    tag = bytes.fromhex(cipher[2])
    aad_hex   = data.get('aad', '')
    aad       = bytes.fromhex(aad_hex) if aad_hex else b""
    
    pt = decrypt_message(ct, iv, tag, AES_KEY, aad)
    return jsonify({
        'ciphertext': pt.decode('ascii')
    })

if __name__ == '__main__':
    app.run(debug=True)
