# Pseudo Code for Brainfuck Server

## Introduction

This document explains the pseudo code for the Brainfuck server in the [main.bf](main.bf) file. It provides a low-level, readable representation of the Brainfuck code.

## Pseudo Code Syntax

- **SYSCALLs**: Represented by `SYS_` prefixed functions with arguments in parentheses.
  - Example: `SYS_WRITE(C0, C1, C2)`

- **Defining SYSCALL Numbers**: Use `INIT SYS_SYSCALL_NAME AT Cn WITH m`.
  - `Cn`: Cell where the syscall number is stored.
  - `m`: Number of arguments the syscall takes (stored at `Cn+1`).
  - Example: `INIT SYS_SOCKET AT C0 WITH 3`

- **Memory Cells**: Represented by `C` followed by a number (e.g., `C0`, `C1`).

- **Commands**:
  - `MOV`: Move data between cells. Variable names can also be used.
    - Example: `MOV C0 C1`
  - `SET`: Set a cell to a specific value. You can use a range (`Cs..Ce`) to set multiple cells at once.
    - Example: `SET C0 42`
    - Range Example: `SET C0..C4 0`

- **Comments**: Use `#` for comments.
  - Example: `# This is a comment`

- **Variables**:
  - Single Value: `variable (Cn) = value`
    - Example: `my_variable (C0) = 42`
  - Pointer: `variable (Cn)`
    - Example: `pointer_variable (C1)`
  - Complex Structures: `variable (Cs, Ce) = { field1: value1, field2: value2 }`
    - Example:
      ```
      ### my_variable definition
      my_variable (C2, C4) = {
          field1: 10,
          field2: 20,
      }
      ```
      You also must specify how you'll build the structure in the code AFTER the definition:
      ```
      ### SET my_variable
      SET C2 10
      SET C3 20

- **Loops**: Loops are made exactly as you would in Brainfuck. You set a variable and loop until it is empty.
  - Example:
    ```
    SET C0 5
    while:
        # Do something
        C0 -= 1
    endwhile
    ```  
  - Infinite loops can be represented as:
    ```
    SET C0 1
    while:
        # Do something but don't change C0
    endwhile
    ```

- **Parameter Declarations**:
  - Use `PARAM` to declare a parameter, its cell(s), and its type. This is for documentation and mapping only.
  - Syntax:
    - `PARAM <name> (<cell>[, <cell_range>...]) : <TYPE>[ = <value>]`
    - Example (simple INT):
      ```
      PARAM socket_fd (C4) : INT
      ```
    - Example (pointer to memory):
      ```
      PARAM buffer (C10..C25) : PTR[16]
      ```
    - Example (structure):
      ```
      PARAM sockaddr (C7..C22) : STRUCT[15] = {
          sa_family: 2,              # AF_INET
          sa_data: [
              4000,                  # Port (0x0F, 0xA0)
              0, 0, 0, 0,            # IP 0.0.0.0
              0, 0, 0, 0, 0, 0, 0, 0 # Padding
          ]
      }
      ```
  - For `INT` and `PTR`, value assignment is implicit and does not require a `SET`.
  - For `STRUCT`, you must use `SET` to assign values to the structure's cells:
    ```
    SET C7 2
    SET C8 0x0F
    SET C9 0xA0
    SET C10..C22 0
    ```
  - **Types**:
    - `INT`: Single integer value (1 cell)
    - `STRUCT[n]`: Structure occupying n cells (e.g., sockaddr). `n` can also be a cell if the size is alredy mentioned above.
    - `PTR`: Pointer to a memory region (just a number that point to a cell)
