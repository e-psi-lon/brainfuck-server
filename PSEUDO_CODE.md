# Pseudo Code for Brainfuck Server

## Introduction

This document explains the pseudo code for the Brainfuck server in the [main.bf](main.bf) file. It provides a low-level, readable representation of the Brainfuck code.

## Pseudo Code Syntax

- **SYSCALLs**: Represented by `SYS_` prefixed functions with arguments in parentheses.
  - Example: `SYS_WRITE(C0, C1, C2)`

- **Defining SYSCALL Numbers**: Use `SYS_SYSCALL_NAME AT Cn WITH m`.
  - `Cn`: Cell where the syscall number is stored.
  - `m`: Number of arguments the syscall takes (stored at `Cn+1`).
  - Example: `SYS_SOCKET AT C0 WITH 3`

- **Memory Cells**: Represented by `C` followed by a number (e.g., `C0`, `C1`).

- **Commands**:
  - `MOV`: Move data between cells.
    - Example: `MOV C0 C1`
  - `SET`: Set a cell to a specific value.
    - Example: `SET C0 42`

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
  