from flask import request, jsonify
from config import app

@app.route('/encrypt', methods=["POST"])
def encrypt():
    plaintext = request.json.get("plaintext")
    return (jsonify({"ciphertext":plaintext, "type": "AES-128"}), 200)

if __name__ == '__main__':
    app.run(debug=True)