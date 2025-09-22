# DSL for Brainfuck Server

## Introduction

This document explains the DSL/pseudocode for the Brainfuck server in the [main.bf](main.bf) file. It provides a low-level, readable representation of the Brainfuck code.

## DSL Syntax

### Base syntax


A newline is enough to indicate a new command. Semi-colons are not required and will be classed as invalid syntax. You can use indentation to make the code more readable, but it is not required. Comments are similar as Python. Everything after a `#` on a line is ignored.

Variables are just labels for specific memory cells. See [Variables](#variables) for more details.

To represents a Brainfuck memory cell, you should use `C` followed by a number (e.g., `C0`, `C1`, etc.).

As this DSL represents Brainfuck code, conditional instruction and loops are very limited. Only while loop are supported and the condition is only a cell value. You can use them as so:
```
while C0:
    # Do something
    # Decrement C0 (or don't if you want an infinite loop)
endwhile 
```

### Base commands

This DSL provides a small set of basic commands for data manipulation, allowing for the minimal operations needed to implement essential logic. A creative use of them might be necessary to achieve more complex operations.

- `MOV` : Move data between cells. Variable names can also be used.
  - Example: `MOV C0 C1`
- `SET` : Set a cell to a specific value. You can use a range (`Cs..Ce`) to set multiple cells at once.
  - Example: `SET C0 42`
  - Range Example: `SET C0..C4 0`

### Variables

Variables are simple labels for specific memory cells. They can represent single values, pointers, or complex structures. Here are the different ways to define variables:
- **Single Value**: `variable (Cn) = value`
  - Example: `my_variable (C0) = 42`
- **Pointer**: `variable (Cn)`
  - Example: `pointer_variable (C1)`
- **Complex Structures**: `variable (Cs, Ce) = { field1: value1, field2: value2 }`
  - Example:
    ```
    ### my_variable definition
    my_variable (C2, C4) = {
        field1: 10,
        field2: 20,
    }

### Syscalls

- **SYSCALLs**: Represented by `SYS_` prefixed functions with arguments in parentheses.
  - Example: `SYS_WRITE(C0, C1, C2)`

- **Defining SYSCALL Numbers**: Use `INIT SYS_SYSCALL_NAME Cn m`.
  - `Cn`: Cell where the syscall number is stored.
  - `m`: Number of arguments the syscall takes (stored at `Cn+1`).
  - Example: `INIT SYS_SOCKET C0 3`

- **Memory Cells**: Represented by `C` followed by a number (e.g., `C0`, `C1`).

- **Commands**:
  - `MOV`: Move data between cells. Variable names can also be used.
    - Example: `MOV C0 C1`
  - `SET`: Set a cell to a specific value. You can use a range (`Cs..Ce`) to set multiple cells at once.
    - Example: `SET C0 42`
    - Range Example: `SET C0..C4 0`
    
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
