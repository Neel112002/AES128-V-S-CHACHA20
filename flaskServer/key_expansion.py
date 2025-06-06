from constants import S_BOX, RCON

def rot_word(word):
    return word[1:] + word[:1]

def sub_word(word):
    return [S_BOX[b] for b in word]

def key_expansion(key):
    assert len(key) == 16, "Key must be exactly 16 bytes."
    expanded_key = [b for b in key]
    bytes_generated = 16
    rcon_iteration = 0

    while bytes_generated < 176:
        temp = expanded_key[-4:]

        if bytes_generated % 16 == 0:
            temp = sub_word(rot_word(temp))
            temp = [a ^ b for a, b in zip(temp, RCON[rcon_iteration])]
            rcon_iteration += 1

        for i in range(4):
            new_byte = expanded_key[bytes_generated - 16] ^ temp[i]
            expanded_key.append(new_byte)
            bytes_generated += 1

    # Split expanded key into 11 round keys (each 16 bytes)
    round_keys = [expanded_key[i:i+16] for i in range(0, 176, 16)]
    # Convert each round key to a 4x4 matrix
    return [[rk[i:i+4] for i in range(0, 16, 4)] for rk in round_keys]
