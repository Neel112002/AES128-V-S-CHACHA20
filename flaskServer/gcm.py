from aes import encrypt_block, key_expansion

def galois_mul(x, y):
    """Multiply two 128-bit values in GF(2^128) with the polynomial x^128 + x^7 + x^2 + x + 1."""
    R = 0xE1000000000000000000000000000000
    z = 0
    v = x
    for i in range(128):
        if (y >> (127 - i)) & 1:
            z ^= v
        if v & 1:
            v = (v >> 1) ^ R
        else:
            v >>= 1
    return z

def inc32(counter):
    # increment rightmost 32 bits mod 2^32
    c = int.from_bytes(counter, 'big')
    c = (c + 1) & 0xFFFFFFFF
    return (c.to_bytes(4, 'big'))

def build_ghash_table(H):
    # table[b] = (b << 120) * H in GF(2^128)
    table = [0]*256
    for b in range(256):
        # b << 120 puts the byte b in the top 8 bits of a 128-bit word
        table[b] = galois_mul(b << 120, H)
    return table

class AESGCM:
    def __init__(self, key_bytes):
        
        # key_bytes: 16-byte key
        self.round_keys = key_expansion(list(key_bytes))
        # H = AES_K(0^128)
        H = encrypt_block([0]*16, self.round_keys)
        self.H = int.from_bytes(bytes(H), 'big')
        self._ghash_table = build_ghash_table(self.H) #precompute GHASH table

    def _ctr_encrypt(self, iv, plaintext):
        # iv: 12 bytes; plaintext: bytes
        counter = iv + b'\x00\x00\x00\x01'
        ciphertext = bytearray()
        for i in range(0, len(plaintext), 16):
            block = plaintext[i:i+16]
            keystream = encrypt_block(list(counter), self.round_keys)
            keystream = bytes(keystream)
            cipher_block = bytes(a ^ b for a, b in zip(block, keystream[:len(block)]))
            ciphertext += cipher_block
            # increment counter
            counter = counter[:12] + inc32(counter[12:])
        return bytes(ciphertext)

    def _ghash(self, aad, ciphertext):
        # GHASH(H, A, C)
        auth = (len(aad)*8).to_bytes(8, 'big') + (len(ciphertext)*8).to_bytes(8, 'big')
        data = aad + ciphertext + auth
        Y = 0
        for i in range(0, len(data), 16):
            chunk = data[i:i+16].ljust(16, b'\x00')
            # XOR in the chunk
            W = Y ^ int.from_bytes(chunk, 'big')
            # Use table lookups instead of bit-by-bit multiply
            Wb = W.to_bytes(16, 'big')
            Z = 0
            for idx, b in enumerate(Wb):
                shift = 8 * (15 - idx)
                Z ^= self._ghash_table[b] >> shift
            Y = Z
        return Y.to_bytes(16, 'big')

    def encrypt(self, plaintext, iv, aad=b""):
        ciphertext = self._ctr_encrypt(iv, plaintext)
        S = self._ghash(aad, ciphertext)
        # compute tag: E(K, J0) XOR GHASH
        J0 = iv + b'\x00\x00\x00\x01'
        E0 = encrypt_block(list(J0), self.round_keys)
        tag = bytes(a ^ b for a, b in zip(bytes(E0), S))
        return ciphertext, tag

    def decrypt(self, ciphertext, iv, tag, aad=b""):
        # verify tag first
        S = self._ghash(aad, ciphertext)
        J0 = iv + b'\x00\x00\x00\x01'
        E0 = encrypt_block(list(J0), self.round_keys)
        expected_tag = bytes(a ^ b for a, b in zip(bytes(E0), S))
        if expected_tag != tag:
            raise ValueError("Tag mismatch! Ciphertext tampered or wrong key.")
        # then decrypt CTR
        # reuse same CTR logic
        return self._ctr_encrypt(iv, ciphertext)  # CTR decrypt = CTR encrypt
