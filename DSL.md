# DSL for Brainfuck Server

## Introduction

This document explains the DSL/pseudocode for the Brainfuck server in the [main.bf](main.bf) file. You can access the actual DSL code in the file [main.pseudo](main.pseudo). It provides a low-level, readable representation of the Brainfuck code. It is NOT meant to be a full programming language, that's why no compiler will be created. The point of doing Brainfuck is to write Brainfuck yourself, not to write a higher-level language that compiles to Brainfuck.

## DSL Syntax

### Core language syntax


A newline is enough to indicate a new command. Semi-colons are not required and will be classed as invalid syntax. You can use indentation to make the code more readable, but it is not required. Comments are similar as Python. Everything after a `#` on a line is ignored.

Variables are just labels for specific memory cells. See [Variables](#variables) for more details.

To represents a Brainfuck memory cell, you should use `C` followed by a number (e.g., `C0`, `C1`, etc.).

As this DSL represents Brainfuck code, conditional instruction and loops are very limited. Only while loop are supported and the condition is only a cell value. You can use them as so:
```pseudo
while C0:
    # Do something
    # Decrement C0 (or don't if you want an infinite loop)
endwhile 
```

### Data types

This DSL supports three main data types, the same as SystemF does for syscalls. The size of each type is configurable, using `[n]` after the type name. If not specified, the default size is 1 cell.
- `INT`: Represents a single integer value. Default size is 1 cell.
- `STRUCT[n]`: Represents a structure occupying `n` cells. Useful for complex data types like `sockaddr`. While technically a `STRUCT` can be of size 1, it's recommended to use `INT` for single-cell values for clarity and simplicity.
- `PTR`: Represents a pointer to a memory region. It is essentially just a number that points to another cell number. Should normally be only 1 cell in size.

Structures, since they represents C data-structures have a syntax very similar to C or to JSON, but with an extra redundancy for size to keep explicit the memory mapping, essential for Brainfuck. For example:

```pseudo
{
    field1: 10,             # 1 cell wide, value 10
    field2[2]: 20 30,       # 2 cells, single value requiring multiple bytes/cells
    field3[4]: [0, 0, 0, 0] # 4 cells, array of data
}
```

### Base commands

This DSL provides a small set of basic commands for data manipulation, allowing for the minimal operations needed to implement essential logic. A creative use of them might be necessary to achieve more complex operations.

- `MOV` : Move data between cells. Variable names can also be used.
  - Example: `MOV C0 C1`
- `SET` : Set a cell to a specific value. You can use a range (`Cs..Ce`) to set multiple cells at once.
  - Example: `SET C0 42`
  - Range Example: `SET C0..C4 0`

### Variables

Variables are simple labels for specific memory cells. They can represent single values, pointers, or complex structures. To define them, you should use the patterns mentioned in [Data Types](#data-types) that specifically define how many cells they occupy.
Variables are defined with the following syntax:
```
<name> (<cell>|<cell_range>) [= <value>]
```
Where:
- `<name>`: Name of the variable.
- `<cell>` and `<cell_range>`: Memory cell(s) associated with the variable. *Use only ONE of those options*
- `<value>`: Optional initial value for the variable.

Examples:
```pseudo
# Simple cell name
my_variable (C0)

# Naming and initializing a variable
my_variable2 (C1) = 42   # Note that it's equivalent to a simple name and a SET command

# Complex structure
my_variable3 (C2, C4) = {
    field1: 10,
    field2[3]: [20, 30, 40], # Array of 3 values
    field3[2]: 0x0F 0xA0     # 2-bytes value (big-endian)
}

```

### Syscalls

#### Parameters

Parameters are defined with the `PARAM` statement. They are fundamentally just variable but with a type and an optional value. They should be used only to map for the actual syscall call. Similarly to the `INIT` statement, they do not represents an actual Brainfuck operation, but are just for documentation and mapping purposes.
Their syntax is as follows:
```
PARAM  <name> (<cell>|<cell_range>) : <TYPE>[ = <value>]
```
Where:
- `<name>`: Name of the parameter.
- `<cell>` and `<cell_range>`: Memory cell(s) associated with the parameter. Only use one of the options. A variable name can be used though making it confusing between which is variable and which is parameter.
- `<TYPE>`: Type of the parameter. Can be `INT`, `STRUCT[n]`, or `PTR`. See [Data types](#data-types) for more details.
- `<value>`: Optional value for the parameter. It must be defined following the same conventions as defined in variables.

- **SYSCALLs**: Represented by `SYS_` prefixed functions with arguments in parentheses.
  - Example: `SYS_WRITE(C0, C1, C2)`

- **Defining SYSCALL Numbers**: Use `INIT SYS_SYSCALL_NAME Cn m`.
  - `Cn`: Cell where the syscall number is stored.
  - `m`: Number of arguments the syscall takes (stored at `Cn+1`).
  - Example: `INIT SYS_SOCKET C0 3`

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
