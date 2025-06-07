from constants import S_BOX, INV_S_BOX, RCON

def sub_bytes(state):
    for i in range(4):
        for j in range(4):
            state[i][j] = S_BOX[state[i][j]]
    return state

def inv_sub_bytes(state):
    for i in range(4):
        for j in range(4):
            state[i][j] = INV_S_BOX[state[i][j]]
    return state

def shift_rows(state):
    state[1] = state[1][1:] + state[1][:1]
    state[2] = state[2][2:] + state[2][:2]
    state[3] = state[3][3:] + state[3][:3]
    return state

def inv_shift_rows(state):
    state[1] = state[1][-1:] + state[1][:-1]
    state[2] = state[2][-2:] + state[2][:-2]
    state[3] = state[3][-3:] + state[3][:-3]
    return state

def xtime(a):
    return ((a << 1) ^ 0x1B) & 0xFF if a & 0x80 else a << 1

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

def mix_single_column(a):
    t = a[0] ^ a[1] ^ a[2] ^ a[3]
    u = a[0]
    a[0] ^= t ^ xtime(a[0] ^ a[1])
    a[1] ^= t ^ xtime(a[1] ^ a[2])
    a[2] ^= t ^ xtime(a[2] ^ a[3])
    a[3] ^= t ^ xtime(a[3] ^ u)

def inv_mix_single_column(s):
    t = s[:]
    s[0] = gmul(t[0], 0x0e) ^ gmul(t[1], 0x0b) ^ gmul(t[2], 0x0d) ^ gmul(t[3], 0x09)
    s[1] = gmul(t[0], 0x09) ^ gmul(t[1], 0x0e) ^ gmul(t[2], 0x0b) ^ gmul(t[3], 0x0d)
    s[2] = gmul(t[0], 0x0d) ^ gmul(t[1], 0x09) ^ gmul(t[2], 0x0e) ^ gmul(t[3], 0x0b)
    s[3] = gmul(t[0], 0x0b) ^ gmul(t[1], 0x0d) ^ gmul(t[2], 0x09) ^ gmul(t[3], 0x0e)

def mix_columns(state):
    for i in range(4):
        mix_single_column(state[i])
    return state

def inv_mix_columns(state):
    for i in range(4):
        inv_mix_single_column(state[i])
    return state

def add_round_key(state, round_key):
    for i in range(4):
        for j in range(4):
            state[i][j] ^= round_key[i][j]
    return state

def rot_word(word):
    return word[1:] + word[:1]

def sub_word(word):
    return [S_BOX[b] for b in word]

def key_expansion(key):
    expanded_key = [b for b in key]
    bytes_generated = 16
    rcon_iteration = 0

    while bytes_generated < 176:
        temp = expanded_key[-4:]
        if bytes_generated % 16 == 0:
            temp = [a ^ b for a, b in zip(sub_word(rot_word(temp)), RCON[rcon_iteration])]
            rcon_iteration += 1
        for i in range(4):
            expanded_key.append(expanded_key[bytes_generated - 16] ^ temp[i])
            bytes_generated += 1

    round_keys = [expanded_key[i:i+16] for i in range(0, 176, 16)]
    round_keys = [[round_key[i:i+4] for i in range(0, 16, 4)] for round_key in round_keys]

    return round_keys

class AES128:
    def __init__(self, key):
        assert len(key) == 16, "Key must be exactly 16 bytes (128-bit)."
        key_bytes = [ord(c) for c in key]
        self.round_keys = key_expansion(key_bytes)

    def encrypt_block(self, plaintext):
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

    def decrypt_block(self, ciphertext):
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
