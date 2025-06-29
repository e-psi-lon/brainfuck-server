import { AST, WhileNode, ASTNode, InitNode, ParamNode, VariableNode, SetNode, MovNode, SyscallNode, ValidationError, CellInfo } from "./types";

export class PseudoCodeValidator {
    private symbolTable: Map<string, ParamNode | VariableNode> = new Map();
    private syscallTable: Map<string, InitNode> = new Map();
    private cellMap: Map<number, CellInfo> = new Map();
    
    validate(ast: AST): ValidationError[] {
        const errors: ValidationError[] = [];
        this.symbolTable.clear();
        this.syscallTable.clear();
        this.cellMap.clear();
        
        // First pass: collect declarations
        for (const node of ast) {
            this.collectDeclarations(node, errors);
        }
        
        // Second pass: validate usage
        for (const node of ast) {
            this.validateNode(node, errors);
        }
        
        return errors;
    }
    
    getCellAllocationMap(ast: AST): Map<number, CellInfo> {
        this.validate(ast); // This populates the cell map
        return new Map(this.cellMap);
    }
    
    private collectDeclarations(node: ASTNode, errors: ValidationError[]) {
        switch (node.type) {
            case 'init':
                const initNode = node as InitNode;
                this.syscallTable.set(initNode.syscallName, initNode);
                this.cellMap.set(initNode.cell, {
                    cell: initNode.cell,
                    owner: initNode.syscallName,
                    type: 'SYSCALL',
                    size: 1
                });
                break;
                
            case 'param':
                const paramNode = node as ParamNode;
                if (this.symbolTable.has(paramNode.name)) {
                    errors.push({
                        line: paramNode.line,
                        column: paramNode.column,
                        length: paramNode.name.length,
                        message: `Variable '${paramNode.name}' already declared`,
                        severity: 'error'
                    });
                } else {
                    this.symbolTable.set(paramNode.name, paramNode);
                    this.allocateCells(paramNode.cells, paramNode.name, paramNode.dataType, errors, paramNode.line);
                }
                break;
                
            case 'variable':
                const varNode = node as VariableNode;
                if (this.symbolTable.has(varNode.name)) {
                    errors.push({
                        line: varNode.line,
                        column: varNode.column,
                        length: varNode.name.length,
                        message: `Variable '${varNode.name}' already declared`,
                        severity: 'error'
                    });
                } else {
                    this.symbolTable.set(varNode.name, varNode);
                    this.allocateCells(varNode.cells, varNode.name, 'INT', errors, varNode.line);
                }
                break;
                
            case 'while':
                const whileNode = node as WhileNode;
                for (const childNode of whileNode.body) {
                    this.collectDeclarations(childNode, errors);
                }
                break;
        }
    }
    
    private allocateCells(cells: number[], owner: string, type: 'INT' | 'STRUCT' | 'PTR' | 'SYSCALL', errors: ValidationError[], line: number) {
        for (const cell of cells) {
            if (this.cellMap.has(cell)) {
                const existing = this.cellMap.get(cell)!;
                errors.push({
                    line,
                    column: 0,
                    length: 10,
                    message: `Cell C${cell} already allocated to '${existing.owner}'`,
                    severity: 'error'
                });
            } else {
                this.cellMap.set(cell, {
                    cell,
                    owner,
                    type,
                    size: cells.length
                });
            }
        }
    }
    
    private validateNode(node: ASTNode, errors: ValidationError[]) {
        switch (node.type) {
            case 'set':
                this.validateSet(node as SetNode, errors);
                break;
            case 'mov':
                this.validateMov(node as MovNode, errors);
                break;
            case 'syscall':
                this.validateSyscall(node as SyscallNode, errors);
                break;
            case 'while':
                const whileNode = node as WhileNode;
                for (const childNode of whileNode.body) {
                    this.validateNode(childNode, errors);
                }
                break;
        }
    }
    
    private validateSet(node: SetNode, errors: ValidationError[]) {
        // Validate target
        if (typeof node.target === 'string' && !this.symbolTable.has(node.target)) {
            errors.push({
                line: node.line,
                column: node.column,
                length: node.target.length,
                message: `Undefined variable '${node.target}'`,
                severity: 'error'
            });
        }
        
        // Validate reference in value
        if (typeof node.value === 'object' && node.value.type === 'reference') {
            const target = node.value.target;
            if (target.startsWith('C')) {
                const cellNum = parseInt(target.substring(1));
                if (!this.cellMap.has(cellNum)) {
                    errors.push({
                        line: node.line,
                        column: node.column,
                        length: target.length,
                        message: `Reference to unallocated cell '${target}'`,
                        severity: 'warning'
                    });
                }
            } else if (!this.symbolTable.has(target)) {
                errors.push({
                    line: node.line,
                    column: node.column,
                    length: target.length,
                    message: `Reference to undefined variable '${target}'`,
                    severity: 'error'
                });
            }
        }
    }
    
    private validateMov(node: MovNode, errors: ValidationError[]) {
        // Validate from
        if (typeof node.from === 'string' && !this.symbolTable.has(node.from)) {
            errors.push({
                line: node.line,
                column: node.column,
                length: 10,
                message: `Undefined variable '${node.from}'`,
                severity: 'error'
            });
        }
        
        // Validate to
        if (typeof node.to === 'string' && !this.symbolTable.has(node.to)) {
            errors.push({
                line: node.line,
                column: node.column,
                length: 10,
                message: `Undefined variable '${node.to}'`,
                severity: 'error'
            });
        }
    }
    
    private validateSyscall(node: SyscallNode, errors: ValidationError[]) {
        if (!this.syscallTable.has(node.name)) {
            errors.push({
                line: node.line,
                column: node.column,
                length: node.name.length,
                message: `Undefined syscall '${node.name}'. Use INIT to declare it.`,
                severity: 'error'
            });
            return;
        }
        
        const syscallDef = this.syscallTable.get(node.name)!;
        if (node.args.length !== syscallDef.argCount) {
            errors.push({
                line: node.line,
                column: node.column,
                length: 20,
                message: `${node.name} expects ${syscallDef.argCount} arguments, got ${node.args.length}`,
                severity: 'error'
            });
        }
        
        // Validate argument references
        for (const arg of node.args) {
            if (typeof arg === 'string' && !this.symbolTable.has(arg)) {
                errors.push({
                    line: node.line,
                    column: node.column,
                    length: 10,
                    message: `Undefined variable '${arg}' in syscall`,
                    severity: 'error'
                });
            }
        }
    }
}

// Helper function for webview
export function generateCellMapHTML(cellMap: Map<number, CellInfo>): string {
    const cells = Array.from(cellMap.entries()).sort(([a], [b]) => a - b);
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: monospace; padding: 20px; }
                .cell { display: inline-block; margin: 2px; padding: 8px; border: 1px solid #ccc; }
                .syscall { background-color: #ffeb3b; }
                .int { background-color: #4caf50; }
                .struct { background-color: #2196f3; }
                .ptr { background-color: #ff9800; }
            </style>
        </head>
        <body>
            <h2>Cell Allocation Map</h2>
            ${cells.map(([cell, info]) => 
                `<div class="cell ${info.type.toLowerCase()}">
                    C${cell}<br>
                    ${info.owner}<br>
                    ${info.type}
                </div>`
            ).join('')}
        </body>
        </html>
    `;
}