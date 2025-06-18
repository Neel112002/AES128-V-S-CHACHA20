from gcm import AESGCM

def decrypt_message(ciphertext: bytes, iv: bytes, tag: bytes, key: bytes, aad: bytes = b"") -> bytes:
    if len(key) != 16:
        raise ValueError("Key must be 16 bytes")
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(ciphertext, iv, tag, aad)
