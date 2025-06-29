import { AST, WhileNode, ASTNode, InitNode, ParamNode, VariableNode, SetNode, MovNode, SyscallNode, ValidationError, CellInfo } from "./types";

export class PseudoCodeValidator {
    private symbolTable: Map<string, ParamNode | VariableNode> = new Map();
    private syscallTable: Map<string, InitNode> = new Map();
    private cellMap: Map<number, CellInfo[]> = new Map(); // Changed to array to track multiple allocations
    private cellUsageHistory: Map<number, { owner: string; line: number; type: 'allocation' | 'usage' }[]> = new Map();
    
    validate(ast: AST): ValidationError[] {
        const errors: ValidationError[] = [];
        this.symbolTable.clear();
        this.syscallTable.clear();
        this.cellMap.clear();
        this.cellUsageHistory.clear();
        
        // First pass: collect declarations and track cell usage
        for (const node of ast) {
            this.collectDeclarations(node, errors);
        }
        
        // Second pass: validate usage
        for (const node of ast) {
            this.validateNode(node, errors);
        }
        
        // Third pass: check for potential cell conflicts (warnings only)
        this.checkCellConflicts(errors);
        
        return errors;
    }
    
    getCellAllocationMap(ast: AST): Map<number, CellInfo> {
        this.validate(ast); // This populates the cell map
        
        // Convert the multi-allocation map to a single allocation map for display
        // Show the most recent allocation for each cell
        const displayMap = new Map<number, CellInfo>();
        
        for (const [cell, allocations] of this.cellMap.entries()) {
            if (allocations.length > 0) {
                const latest = allocations[allocations.length - 1];
                displayMap.set(cell, latest);
            }
        }
        
        return displayMap;
    }
    
    private collectDeclarations(node: ASTNode, errors: ValidationError[]) {
        switch (node.type) {
            case 'init':
                const initNode = node as InitNode;
                this.syscallTable.set(initNode.syscallName, initNode);
                this.allocateCell(initNode.cell, initNode.syscallName, 'SYSCALL', 1, initNode.line);
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
                    this.allocateCells(paramNode.cells, paramNode.name, paramNode.dataType, paramNode.line);
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
                    this.allocateCells(varNode.cells, varNode.name, 'INT', varNode.line);
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
    
    private allocateCell(cell: number, owner: string, type: 'INT' | 'STRUCT' | 'PTR' | 'SYSCALL', size: number, line: number) {
        if (!this.cellMap.has(cell)) {
            this.cellMap.set(cell, []);
        }
        
        const cellInfo: CellInfo = {
            cell,
            owner,
            type,
            size
        };
        
        this.cellMap.get(cell)!.push(cellInfo);
        
        // Track usage history
        if (!this.cellUsageHistory.has(cell)) {
            this.cellUsageHistory.set(cell, []);
        }
        this.cellUsageHistory.get(cell)!.push({
            owner,
            line,
            type: 'allocation'
        });
    }
    
    private allocateCells(cells: number[], owner: string, type: 'INT' | 'STRUCT' | 'PTR' | 'SYSCALL', line: number) {
        for (const cell of cells) {
            this.allocateCell(cell, owner, type, cells.length, line);
        }
    }
    
    private checkCellConflicts(errors: ValidationError[]) {
        // Only warn about potential conflicts, don't error
        // This is more informational for the developer
        
        for (const [cell, allocations] of this.cellMap.entries()) {
            if (allocations.length > 1) {
                // Group by owner to avoid spam
                const owners = new Set(allocations.map(a => a.owner));
                if (owners.size > 1) {
                    const ownerList = Array.from(owners).join(', ');
                    // Only add one warning per cell, not per allocation
                    const firstAllocation = allocations[0];
                    errors.push({
                        line: firstAllocation.cell, // Use cell number as a pseudo-line for display
                        column: 0,
                        length: 10,
                        message: `Cell C${cell} is shared between: ${ownerList}. Ensure this is intentional for space optimization.`,
                        severity: 'warning'
                    });
                }
            }
        }
    }
    
    private trackCellUsage(cell: number, owner: string, line: number) {
        if (!this.cellUsageHistory.has(cell)) {
            this.cellUsageHistory.set(cell, []);
        }
        this.cellUsageHistory.get(cell)!.push({
            owner,
            line,
            type: 'usage'
        });
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
        } else if (typeof node.target === 'number') {
            // Track direct cell usage
            this.trackCellUsage(node.target, `SET_operation`, node.line);
        }
        
        // Validate reference in value
        if (typeof node.value === 'object' && node.value.type === 'reference') {
            const target = node.value.target;
            if (target.startsWith('C')) {
                const cellNum = parseInt(target.substring(1));
                this.trackCellUsage(cellNum, `reference`, node.line);
                
                // Check if cell has been allocated (warning, not error)
                if (!this.cellMap.has(cellNum)) {
                    errors.push({
                        line: node.line,
                        column: node.column,
                        length: target.length,
                        message: `Reference to unallocated cell '${target}'. Consider declaring it first.`,
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
        } else if (typeof node.from === 'number') {
            this.trackCellUsage(node.from, `MOV_source`, node.line);
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
        } else if (typeof node.to === 'number') {
            this.trackCellUsage(node.to, `MOV_target`, node.line);
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
        
        // Validate argument references and track usage
        for (const arg of node.args) {
            if (typeof arg === 'string') {
                if (!this.symbolTable.has(arg)) {
                    errors.push({
                        line: node.line,
                        column: node.column,
                        length: 10,
                        message: `Undefined variable '${arg}' in syscall`,
                        severity: 'error'
                    });
                } else {
                    // Track usage of variable's cells
                    const variable = this.symbolTable.get(arg)!;
                    for (const cell of variable.cells) {
                        this.trackCellUsage(cell, `${node.name}_arg`, node.line);
                    }
                }
            } else if (typeof arg === 'number') {
                this.trackCellUsage(arg, `${node.name}_arg`, node.line);
            }
        }
    }
}

// Helper function for webview - updated to show cell reuse information
export function generateCellMapHTML(cellMap: Map<number, CellInfo>): string {
    const cells = Array.from(cellMap.entries()).sort(([a], [b]) => a - b);
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
                .cell { display: inline-block; margin: 2px; padding: 8px; border: 1px solid #555; border-radius: 4px; min-width: 60px; text-align: center; }
                .syscall { background-color: #3c3c00; border-color: #ffeb3b; }
                .int { background-color: #003c00; border-color: #4caf50; }
                .struct { background-color: #001e3c; border-color: #2196f3; }
                .ptr { background-color: #3c1e00; border-color: #ff9800; }
                .cell-number { font-weight: bold; font-size: 12px; }
                .cell-owner { font-size: 10px; margin-top: 2px; }
                .cell-type { font-size: 9px; margin-top: 1px; opacity: 0.8; }
                .legend { margin-bottom: 20px; }
                .legend-item { display: inline-block; margin-right: 15px; padding: 5px 10px; border-radius: 3px; font-size: 12px; }
                h2 { color: #569cd6; }
                .info { color: #608b4e; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <h2>Cell Allocation Map</h2>
            <div class="info">
                ℹ️ Cells can be reused for space optimization. This map shows the current/latest allocation for each cell.
            </div>
            
            <div class="legend">
                <div class="legend-item syscall">SYSCALL</div>
                <div class="legend-item int">INT</div>
                <div class="legend-item struct">STRUCT</div>
                <div class="legend-item ptr">PTR</div>
            </div>
            
            <div>
                ${cells.map(([cell, info]) => 
                    `<div class="cell ${info.type.toLowerCase()}">
                        <div class="cell-number">C${cell}</div>
                        <div class="cell-owner">${info.owner}</div>
                        <div class="cell-type">${info.type}</div>
                    </div>`
                ).join('')}
            </div>
        </body>
        </html>
    `;
}