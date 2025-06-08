from constant import SBOX, RCON

def sub_bytes(state):
    return [SBOX[b] for b in state]

def shift_rows(state):
    return [
        state[0],  state[5],  state[10], state[15],
        state[4],  state[9],  state[14], state[3],
        state[8],  state[13], state[2],  state[7],
        state[12], state[1],  state[6],  state[11],
    ]

def xtime(a):
    return ((a << 1) ^ 0x1B) & 0xFF if (a & 0x80) else (a << 1)

def mix_single_column(a):
    t = a[0] ^ a[1] ^ a[2] ^ a[3]
    u = a[0]
    a[0] ^= t ^ xtime(a[0] ^ a[1])
    a[1] ^= t ^ xtime(a[1] ^ a[2])
    a[2] ^= t ^ xtime(a[2] ^ a[3])
    a[3] ^= t ^ xtime(a[3] ^ u)

def mix_columns(state):
    for i in range(4):
        col = state[i*4:(i+1)*4]
        mix_single_column(col)
        state[i*4:(i+1)*4] = col
    return state

def add_round_key(state, round_key):
    return [b ^ k for b, k in zip(state, round_key)]

def key_expansion(key):
    expanded = list(key)
    i = 16
    rcon_iter = 0
    while i < 176:
        temp = expanded[i-4:i]
        if i % 16 == 0:
            temp = temp[1:] + temp[:1]
            temp = [SBOX[b] for b in temp]
            rc = RCON[rcon_iter]
            temp = [t ^ rc[j] for j, t in enumerate(temp)]
            rcon_iter += 1
        for j in range(4):
            expanded.append(expanded[i-16] ^ temp[j])
            i += 1
    return [expanded[16*r:16*(r+1)] for r in range(11)]

def encrypt_block(block, round_keys):
    state = add_round_key(block, round_keys[0])
    for rnd in range(1, 10):
        state = sub_bytes(state)
        state = shift_rows(state)
        state = mix_columns(state)
        state = add_round_key(state, round_keys[rnd])
    # final round
    state = sub_bytes(state)
    state = shift_rows(state)
    state = add_round_key(state, round_keys[10])
    return state

def xor_bytes(a, b):
    return [x ^ y for x, y in zip(a, b)]
