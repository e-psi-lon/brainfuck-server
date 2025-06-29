export interface ASTNode {
    type: string;
    line: number;
    column: number;
}

export interface InitNode extends ASTNode {
    type: 'init';
    syscallName: string;
    cell: number;
    argCount: number;
}

export interface ParamNode extends ASTNode {
    type: 'param';
    name: string;
    cells: number[];
    dataType: 'INT' | 'STRUCT' | 'PTR';
    size?: number;
    value?: any;
}

export interface VariableNode extends ASTNode {
    type: 'variable';
    name: string;
    cells: number[];
    value?: any;
}

export interface ValueDeclaration {
    target: string; // variable name or cell number
    type: string;
}



export interface SetNode extends ASTNode {
    type: 'set';
    target: string | number; // variable name or cell number
    value: number | string | ValueDeclaration;
    range?: [number, number]; // for C0..C4
}

export interface MovNode extends ASTNode {
    type: 'mov';
    from: string | number;
    to: string | number;
}

export interface SyscallNode extends ASTNode {
    type: 'syscall';
    name: string;
    args: (string | number)[];
}

export interface WhileNode extends ASTNode {
    type: 'while';
    body: ASTNode[];
}

export type AST = ASTNode[];

export interface ValidationError {
    line: number;
    column: number;
    length: number;
    message: string;
    severity: 'error' | 'warning';
}

export interface CellInfo {
    cell: number;
    owner: string;
    type: 'INT' | 'STRUCT' | 'PTR' | 'SYSCALL';
    size: number;
}