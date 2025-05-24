# Brainfuck cheat sheet

## Data manipulation

### Moving data 

You can move data between cells in Brainfuck by using loops to decrement one cell while incrementing another. The following examples shows how to move data from cell A to cell B. Those examples assumes that the pointer is initially at cell A. When moving data, you'll move the pointer in the direction of the target (i.e. left if moving to a lower cell, right if moving to a higher cell).

```bf
>           # Move to cell B
[-]         # Clear cell B first (optional, but ensures no leftover data)
<           # Move back to A
[
    -       # Remove 1 from cell A
    >       # Move back to cell B
    +       # Add 1 to cell B
    <       # Move back to cell A
]           # Loop until cell A is empty
```
Ready to paste code :
```bf
>[-]<[->+<]
```

> [!IMPORTANT]
> In the previous example `>` and `<` need to be repeated according to the distance between cells A and B. For example, if A is cell n°1 and B is cell n°3, you would use 2 `>` or `<` commands to move between them. Add as many `>` or `<` commands as needed to reach the target cell.

### Copying data
You can copy data from one cell to another by using a similar approach to moving data, but you need to ensure that the source cell is not cleared. To do so, you can use a temporary C cell to hold the value during the copy process. The example below assumes that the pointer is initially at cell A and you want to copy its value to cell B.

```bf
>           # Move to cell B
[-]         # Clear it (optional, but ensures no leftover data)
>           # Move to cell C (temporary cell)
[-]         # Clear it (optional, but ensures no leftover data)
<<           # Move back to cell A
[
    -           # Remove 1 from cell A
    >           # Move to cell B
    +           # Add 1 to cell B
    >+          # Move to cell C to add 1 (temporarily)
    <<          # Move back to cell A
]               # Loop until cell A is empty

===============================================================================
At this point, A is empty, B has the original value of A, and C also has a 
second copy of that value. Now we restore A from C, see moving data for a 
detailed explanation of how to move data between cells.
===============================================================================

>>               # Move back to cell C
[->>+<<]         # Move C to A, clearing C in the process
```
Ready to paste code :
```bf
>[-]>[-]<<[->+>+<<]>>[->>+<<]
```

> [!CAUTION]
> The above example uses a temporary cell C to hold the value during the copy process. Ensure that C is not used for any other purpose during this operation or that it doesn't contain any important data before running the code.


### Miscellaneous 

#### Clear a cell

This is pretty simple and straightforward but it's worth mentioning. You just have to loop until the cell is empty, decrementing it each time:

```bf
[-]         # Loop until the cell is empty
```


## Syscalls (Dialect-specific)

The interpreter used and defined in the [interpreter](interpreter/) supports executing Linux x86-64 syscalls through an extra command `%` that executes a syscall.
It requires to provide informations about the syscall and its arguments in at least 5 cells as follows:
- Cell 0: syscall number (e.g. `60` for `exit`)
- Cell 1: syscall arguments count (e.g. `1` for `exit`)
- Cell 2-5:
    - Type flag : `0` for raw data, `1` for pointer to data, `2` for pointer to a cell number.
    - Cell length: the number of cells that will be used for the argument.
    - Argument contents: the actual data for the argument, which can be multi-cell and is interpreted as bytes in big-endian form.
    - e.g. `0 1 0` for an `exit` call with a success code of `0`.
Examples can be found in the [examples](interpreter/examples/) directory given by the interpreter developers alongside with some other miscellaneous examples.



## Project specific conventions

### Formatting

To make the code more readable, you can use the following formatting conventions:
- Group `+` 5 by 5 with at most 2 groups per line :

| Example | Status | Explanation |
|---------|--------|-------------|
| `+++++` | ✅ Good | Single group of 5 `+` |
| `+++++ +++++` | ✅ Good | Two groups of 5, separated by space |
| `+++++ +++++ +++++` | ❌ Bad | Three groups on one line (max is 2) |
| `++++++++++` | ❌ Bad | 10 `+` without grouping |
| `+++++ ++++` | ✅ Good | Valid when you need exactly 9 |
| `++++` | ✅ Good | Single partial group when you need exactly 4 |
| `++++ +++++` | ❌ Bad | First group not filled, shouldn't start a new one |
| `+++++ +++++`<br>`+++++` | ✅ Good | Two groups on first line, continue on next |
| `+++ ++` | ❌ Bad | Groups are not 5 `+` each |
| `+++++     +++++` | 😐 Meh | Multiple spaces acceptable but not ideal |