# decryption.py

from constants import INV_S_BOX
from key_expansion import key_expansion

def inv_sub_bytes(state):
    for i in range(4):
        for j in range(4):
            state[i][j] = INV_S_BOX[state[i][j]]
    return state

def inv_shift_rows(state):
    state[1] = state[1][-1:] + state[1][:-1]
    state[2] = state[2][-2:] + state[2][:-2]
    state[3] = state[3][-3:] + state[3][:-3]
    return state

def gmul(a, b):
    p = 0
    for _ in range(8):
        if b & 1:
            p ^= a
        hi_bit_set = a & 0x80
        a = (a << 1) & 0xFF
        if hi_bit_set:
            a ^= 0x1B
        b >>= 1
    return p

def inv_mix_single_column(s):
    t = s[:]
    s[0] = gmul(t[0], 0x0e) ^ gmul(t[1], 0x0b) ^ gmul(t[2], 0x0d) ^ gmul(t[3], 0x09)
    s[1] = gmul(t[0], 0x09) ^ gmul(t[1], 0x0e) ^ gmul(t[2], 0x0b) ^ gmul(t[3], 0x0d)
    s[2] = gmul(t[0], 0x0d) ^ gmul(t[1], 0x09) ^ gmul(t[2], 0x0e) ^ gmul(t[3], 0x0b)
    s[3] = gmul(t[0], 0x0b) ^ gmul(t[1], 0x0d) ^ gmul(t[2], 0x09) ^ gmul(t[3], 0x0e)

def inv_mix_columns(state):
    for i in range(4):
        inv_mix_single_column(state[i])
    return state

def add_round_key(state, round_key):
    for i in range(4):
        for j in range(4):
            state[i][j] ^= round_key[i][j]
    return state

class AES128Decryptor:
    def __init__(self, key):
        assert len(key) == 16, "Key must be 16 bytes."
        key_bytes = [ord(c) for c in key]
        self.round_keys = key_expansion(key_bytes)

    def decrypt_block(self, ciphertext):
        assert len(ciphertext) == 16, "Ciphertext must be 16 bytes."
        state = [list(ciphertext[i:i+4]) for i in range(0, 16, 4)]
        state = add_round_key(state, self.round_keys[10])

        for rnd in range(9, 0, -1):
            state = inv_shift_rows(state)
            state = inv_sub_bytes(state)
            state = add_round_key(state, self.round_keys[rnd])
            state = inv_mix_columns(state)

        state = inv_shift_rows(state)
        state = inv_sub_bytes(state)
        state = add_round_key(state, self.round_keys[0])

        return bytes(sum(state, []))
