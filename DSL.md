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
- `STRUCT[n]`: Represents a structure occupying `n` cells. Useful for complex data types like `sockaddr`. While technically a `STRUCT` can be of size 1, it's recommended to use `INT` for single-cell values for clarity and simplicity. It also explains why `STRUCT`s are assumed to always have a `[n]` attached. 
- `PTR`: Represents a pointer to a memory region. The size `n` of it is the number of cells it points to. Default size is 1 cell. 

Structures, since they represents C data-structures have a syntax very similar to C or to JSON, but with an extra redundancy for size to keep explicit the memory mapping, essential for Brainfuck. For example:

```pseudo
{
    field1: 10,             # 1 cell wide, value 10
    field2[2]: 20 30,       # 2 cells, single value requiring multiple bytes/cells
    field3[4]: [0, 0, 0, 0] # 4 cells, array of data
}
```

Type examples:
```pseudo
INT            # Single cell integer
INT[2]         # 2-cells integer (big-endian)
STRUCT[3]      # Structure occupying 3 cells
STRUCT[5]      # Structure with initial values
PTR            # Pointer to 1 cell
PTR[10]        # Pointer to a memory region of 10 cells
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
```pseudo
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

This DSL provides a way to define and use syscalls, which are essential for interacting with the operating system. Syscalls are represented by `SYS_` prefixed functions. To thoughtfully define and use syscalls the way you would do in the Brainfuck code, you need to follow a three-step process:
1. **Initialize the syscall** using the `INIT` statement. [See](#initializing-syscalls)
2. **Define the parameters** using the `PARAM` statement. [See](#parameters)
3. **Invoke the syscall** using the `SYS_<SYSCALL_NAME>` function. [See](#invoking-syscalls)

See the following sections for more details about each step.

### Initializing SYSCALLs

To define a syscall, you must first initialize it using the `INIT` statement. This statement sets up the syscall number and the number of arguments it takes. The syntax is as follows:
```pseudo
INIT SYS_<SYSCALL_NAME> Cn m
```

Where:
- `<SYSCALL_NAME>`: Name of the syscall (e.g., `WRITE`, `READ`, etc.).
- `Cn`: Cell where the syscall number is stored.
- `m`: Number of arguments the syscall takes (stored at `Cn+1`).

#### Parameters

Parameters are defined with the `PARAM` statement. They are fundamentally just variable but with a type and an optional value. They should be used only to map for the actual syscall call. Similarly to the `INIT` statement, they do not represents an actual Brainfuck operation, but are just for documentation and mapping purposes. In the Brainfuck code, a parameter is at least 3 cells wide. The first cell represents the size, the second the type and the rest is the actual data
Their syntax is as follows:
```pseudo
PARAM  <name> (<type_cell>,<cell>|<cell_range>) : <TYPE>[ = <value>]
```

Where:
- `<name>`: Name of the parameter. 
- `<type_cell>`: The cell that contains the type of the parameter (stored in the first cell of the structure). Its value is represented by the `<TYPE>` element of the parameter. (see after)
- `<cell>` and `<cell_range>`: Memory cell(s) associated with the parameter's content. Only use one of the options. A variable name can be used though making it confusing between which is variable and which is parameter.
- `<TYPE>`: Type of the parameter, stored in `<type_cell>`. Can be `INT`, `STRUCT`, or `PTR`. See [Data types](#data-types) for more details.
- `<value>`: Optional value for the parameter. It must be defined following the same conventions as defined in variables. It is stored in the cells defined by `<cell>` or `<cell_range>`.

Examples:
```pseudo
# Simple INT parameter
PARAM socket_fd (C2, C4) : INT
# Pointer to memory
PARAM buffer (C8, C10..C25) : PTR[16]
# Structure parameter
PARAM sockaddr (C5, C7..C22) : STRUCT[15] = {
    sa_family: 2,              # AF_INET
    sa_data[14]: [
      0x0F 0xA0,               # Port (4000)
      0, 0, 0, 0,               # IP 0.0.0.0
      0, 0, 0, 0, 0, 0, 0, 0    # Padding
    ]
}
```

### Invoking SYSCALLs

Once a syscall is initialized and its parameters are defined, you can invoke it using the `SYS_<SYSCALL_NAME>` function. This function represents the actual syscall invocation in Brainfuck, represented by the `%` command. It's the most straightforward step of syscall execution. The syntax is as follows:
```pseudo
SYS_<SYSCALL_NAME>
```

Where `<SYSCALL_NAME>` is the name of the syscall you want to invoke.

Examples:
```pseudo
SYS_SOCKET_OPT(socket_fd, SOL_SOCKET, SO_REUSEADDR, option_value, option_size)
SYS_BIND(socket_fd, sockaddr, sockaddr_size)
SYS_LISTEN(socket_fd, backlog)
```
Where the parameters used in the syscall invocation should match those defined in the `PARAM` statements as seen above.