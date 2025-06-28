# Pseudo Code for Brainfuck server

## Introduction

This document represents the pseudo code for the brainfuck server in the [main.bf](main.bf) file.
It is intended to be a low-level representation of the Brainfuck code, but in a more readable format 'deobfuscated' from the original Brainfuck code.

## Info

- SYSCALL are represented by `SYS_` prefixed functions with arguments within parentheses.
- Memory cells are represented by `C` followed by a number (e.g., `C0`, `C1`, etc.).
- The `MOV` command is used to move data between cells.
- The `SET` command is used to set a cell to a specific value.
- To set multiple variables at once, use `SET CA-CB value`. `CA` and `CB` are the start and end cells of the range to set, and `value` is the value to set them to.
- Variabe can be: 
    - `variable (CN) = value` for a single value where `N` is the cell number.
    - For a structure or complex value:

    ```
    ### my_variable definition
    my_variable (CA, CB) = {
        field1: value1,
        field2: value2,
    }
    ### SET my_variable
    SET CA value1
    SET CB value2
    ```
    Where `CA` and `CB` are the cells of start and end of the variable. More cells can be used for larger or more complex structures.


## Actual Code

```
# Initialize the server


## Setup socket

SYS_SOCKET(AF_INET, SOCK_STREAM, 0)

MOV C0 C5 # C0 is the socket file descriptor and C5

SYS_SOCKET_OPT(C5, SOL_SOCKET, SO_REUSEADDR, 1, 4)

## Bind the socket


### sockaddr definition
sockaddr (C17, C32) = {
    sa_family: 2,               # AF_INET
    sa_data: [
        4000                    # In two bytes (big-endian) 0x0F and 0xA0 (15*256 + 160 = 4000)
        0, 0, 0, 0,             # IP 0.0.0.0 (INADDR_ANY)
        0, 0, 0, 0, 0, 0, 0, 0  # Padding
    ]
}

### SET sockaddr
SET C17 2
SET C18 0x0F
SET C19 0xA0
SET C20-C32 0 # No change needed for those cells since they are already 0

SYS_BIND(C5, sockaddr, 16)
```