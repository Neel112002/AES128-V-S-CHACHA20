# encryption.py

from constants import S_BOX
from key_expansion import key_expansion

def sub_bytes(state):
    for i in range(4):
        for j in range(4):
            state[i][j] = S_BOX[state[i][j]]
    return state

def shift_rows(state):
    state[1] = state[1][1:] + state[1][:1]
    state[2] = state[2][2:] + state[2][:2]
    state[3] = state[3][3:] + state[3][:3]
    return state

def xtime(a):
    return ((a << 1) ^ 0x1B) & 0xFF if a & 0x80 else a << 1

def mix_single_column(a):
    t = a[0] ^ a[1] ^ a[2] ^ a[3]
    u = a[0]
    a[0] ^= t ^ xtime(a[0] ^ a[1])
    a[1] ^= t ^ xtime(a[1] ^ a[2])
    a[2] ^= t ^ xtime(a[2] ^ a[3])
    a[3] ^= t ^ xtime(a[3] ^ u)

def mix_columns(state):
    for i in range(4):
        mix_single_column(state[i])
    return state

def add_round_key(state, round_key):
    for i in range(4):
        for j in range(4):
            state[i][j] ^= round_key[i][j]
    return state

class AES128Encryptor:
    def __init__(self, key):
        assert len(key) == 16, "Key must be 16 bytes."
        key_bytes = [ord(c) for c in key]
        self.round_keys = key_expansion(key_bytes)

    def encrypt_block(self, plaintext):
        assert len(plaintext) == 16, "Plaintext must be 16 bytes."
        state = [list(plaintext[i:i+4]) for i in range(0, 16, 4)]
        state = add_round_key(state, self.round_keys[0])

        for rnd in range(1, 10):
            state = sub_bytes(state)
            state = shift_rows(state)
            state = mix_columns(state)
            state = add_round_key(state, self.round_keys[rnd])

        state = sub_bytes(state)
        state = shift_rows(state)
        state = add_round_key(state, self.round_keys[10])

        return bytes(sum(state, []))
