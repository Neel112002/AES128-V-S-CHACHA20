import os
from gcm import AESGCM

def encrypt_message(plaintext: bytes, key: bytes, aad: bytes = b""):
    # key must be 16 bytes for AES-128
    if len(key) != 16:
        raise ValueError("Key must be 16 bytes")
    # random 12-byte IV
    iv = os.urandom(12)
    aesgcm = AESGCM(key)
    ciphertext, tag = aesgcm.encrypt(plaintext, iv, aad)
    return iv, ciphertext, tag
