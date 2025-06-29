import { AST, WhileNode, ASTNode, InitNode, ParamNode, VariableNode, SetNode, MovNode, SyscallNode } from "./types";

export class PseudoCodeParser {
    parse(text: string): AST {
        const lines = text.split('\n');
        const ast: AST = [];
        let i = 0;
        
        while (i < lines.length) {
            const line = this.removeInlineComments(lines[i].trim());
            const lineNum = i;
            
            if (!line || line.startsWith('#') || line.startsWith('##')) {
                i++;
                continue;
            }
            
            try {
                const node = this.parseLine(line, lineNum);
                if (node) {
                    // Handle multi-line constructs like while loops
                    if (node.type === 'while') {
                        const whileNode = node as WhileNode;
                        whileNode.body = [];
                        i++; // Move past the 'while:' line
                        
                        while (i < lines.length) {
                            const bodyLine = this.removeInlineComments(lines[i].trim());
                            if (bodyLine === 'endwhile') {
                                i++; // Move past the 'endwhile' line
                                break;
                            }
                            if (bodyLine && !bodyLine.startsWith('#') && !bodyLine.startsWith('##')) {
                                const bodyNode = this.parseLine(bodyLine, i);
                                if (bodyNode) whileNode.body.push(bodyNode);
                            }
                            i++;
                        }
                        // Don't increment i again at the end since we've already positioned it correctly
                        ast.push(node);
                        continue; // Skip the final i++ at the end of the main loop
                    }
                    ast.push(node);
                }
            } catch (error: any) {
                throw new Error(`Line ${lineNum + 1}: ${error.message}`);
            }
            
            i++;
        }
        
        return ast;
    }

    private removeInlineComments(line: string): string {
        const commentIndex = line.indexOf('#');
        if (commentIndex === -1) return line;
        return line.substring(0, commentIndex).trimEnd();
    }
    
    private parseLine(line: string, lineNum: number): ASTNode | null {
        const column = 0; // Simplified for now
        
        // INIT SYS_SOCKET AT C0 WITH 3
        if (line.startsWith('INIT SYS_')) {
            const match = line.match(/^INIT (SYS_\w+) AT C(\d+) WITH (\d+)$/);
            if (!match) throw new Error('Invalid INIT syntax');
            
            return {
                type: 'init',
                line: lineNum,
                column,
                syscallName: match[1],
                cell: parseInt(match[2]),
                argCount: parseInt(match[3])
            } as InitNode;
        }
        
        // PARAM name (C0..C4): TYPE = value
        if (line.startsWith('PARAM ')) {
            const match = line.match(/^PARAM (\w+) \((C\d+(?:\.\.C\d+)?(?:,\s*C\d+(?:\.\.C\d+)?)*)\):\s*(\w+)(?:\[(\d+)\])?(?:\s*=\s*(.+))?$/);
            if (!match) throw new Error(`Invalid PARAM syntax: "${line}"`);
            
            const cells = this.parseCellList(match[2]);
            return {
                type: 'param',
                line: lineNum,
                column,
                name: match[1],
                cells,
                dataType: match[3] as 'INT' | 'STRUCT' | 'PTR',
                size: match[4] ? parseInt(match[4]) : undefined,
                value: match[5] ? this.parseValue(match[5]) : undefined
            } as ParamNode;
        }
        
        // Variable: name (C0) = value
        if (line.includes('(C') && line.includes(')') && line.includes('=')) {
            const match = line.match(/^(\w+) \((C\d+(?:,\s*C\d+)*)\) = (.+)$/);
            if (!match) throw new Error('Invalid variable syntax');
            
            return {
                type: 'variable',
                line: lineNum,
                column,
                name: match[1],
                cells: this.parseCellList(match[2]),
                value: this.parseValue(match[3])
            } as VariableNode;
        }
        
        // SET C0 42 or SET C0..C4 0 or SET variable value
        if (line.startsWith('SET ')) {
            const match = line.match(/^SET (C\d+(?:\.\.C\d+)?|\w+) (.+)$/);
            if (!match) throw new Error('Invalid SET syntax');
            
            const target = match[1];
            const value = this.parseValue(match[2]);
            
            if (target.includes('..')) {
                const [start, end] = target.split('..').map(c => parseInt(c.substring(1)));
                return {
                    type: 'set',
                    line: lineNum,
                    column,
                    target,
                    value,
                    range: [start, end]
                } as SetNode;
            }
            
            return {
                type: 'set',
                line: lineNum,
                column,
                target: target.startsWith('C') ? parseInt(target.substring(1)) : target,
                value
            } as SetNode;
        }
        
        // MOV C0 C1 or MOV variable cell
        if (line.startsWith('MOV ')) {
            const match = line.match(/^MOV (C\d+|\w+) (C\d+|\w+)$/);
            if (!match) throw new Error('Invalid MOV syntax');
            
            return {
                type: 'mov',
                line: lineNum,
                column,
                from: match[1].startsWith('C') ? parseInt(match[1].substring(1)) : match[1],
                to: match[2].startsWith('C') ? parseInt(match[2].substring(1)) : match[2]
            } as MovNode;
        }

        // while: (check this BEFORE SYS_ patterns)
        if (line === 'while:') {
            return {
                type: 'while',
                line: lineNum,
                column,
                body: []
            } as WhileNode;
        }
        
        // endwhile
        if (line === 'endwhile') {
            return null; // This will be handled by the while loop parsing
        }
        
        // SYS_WRITE(C0, C1, C2)
        if (line.startsWith('SYS_')) {
            const match = line.match(/^(SYS_\w+)\(([^)]+)\)$/);
            if (!match) throw new Error('Invalid SYSCALL syntax');
            
            const args = match[2].split(',').map(arg => {
                const trimmed = arg.trim();
                return trimmed.startsWith('C') ? parseInt(trimmed.substring(1)) : trimmed;
            });
            
            return {
                type: 'syscall',
                line: lineNum,
                column,
                name: match[1],
                args
            } as SyscallNode;
        }
        return null;
    }
    
    private parseCellList(cellStr: string): number[] {
        const cells: number[] = [];
        const parts = cellStr.split(',').map(s => s.trim());
        
        for (const part of parts) {
            if (part.includes('..')) {
                const rangeParts = part.split('..');
                if (rangeParts.length !== 2) {
                    throw new Error(`Invalid cell range: "${part}". Expected format: C1..C5`);
                }
                
                const startStr = rangeParts[0].trim();
                const endStr = rangeParts[1].trim();
                
                if (!startStr.startsWith('C') || !endStr.startsWith('C')) {
                    throw new Error(`Invalid cell range: "${part}". Both sides must start with 'C'`);
                }
                
                const start = parseInt(startStr.substring(1));
                const end = parseInt(endStr.substring(1));
                
                if (isNaN(start) || isNaN(end)) {
                    throw new Error(`Invalid cell range: "${part}". Cell numbers must be valid integers`);
                }
                
                if (start > end) {
                    throw new Error(`Invalid cell range: "${part}". Start cell must be <= end cell`);
                }
                
                for (let i = start; i <= end; i++) {
                    cells.push(i);
                }
            } else {
                if (!part.startsWith('C')) {
                    throw new Error(`Invalid cell: "${part}". Must start with 'C'`);
                }
                
                const cellNum = parseInt(part.substring(1));
                if (isNaN(cellNum)) {
                    throw new Error(`Invalid cell: "${part}". Cell number must be a valid integer`);
                }
                
                cells.push(cellNum);
            }
        }
        
        return cells;
    }
    
    private parseValue(valueStr: string): any {
        const trimmed = valueStr.trim();
        
        // &reference
        if (trimmed.startsWith('&')) {
            return { type: 'reference', target: trimmed.substring(1) };
        }
        
        // Hex number
        if (trimmed.startsWith('0x')) {
            return parseInt(trimmed, 16);
        }
        
        // Regular number
        if (/^\d+$/.test(trimmed)) {
            return parseInt(trimmed);
        }
        
        
        if (trimmed.startsWith('{')) {
            try {
                if (trimmed.includes(':')) {
                    // First clean up the string to handle multi-line objects
                    let cleanStr = trimmed;
                    
                    // Simple object parser for objects
                    let result: Record<string, any> = {};
                    
                    // Extract content between { and }
                    const objectContent = cleanStr.substring(
                        cleanStr.indexOf('{') + 1, 
                        cleanStr.lastIndexOf('}')
                    ).trim();
                    
                    // If we have an array inside
                    if (objectContent.includes('[')) {
                        // Parse key-value pairs
                        const parts = objectContent.split(',');
                        for (const part of parts) {
                            const trimmedPart = part.trim();
                            if (!trimmedPart) continue;
                            
                            // Check if this is a key-value with array
                            if (trimmedPart.includes(':') && trimmedPart.includes('[')) {
                                const key = trimmedPart.split(':')[0].trim();
                                
                                // Extract array content
                                const fullText = objectContent.substring(
                                    objectContent.indexOf(key + ':'), 
                                    objectContent.length
                                );
                                
                                const arrayStart = fullText.indexOf('[');
                                let arrayEnd = -1;
                                let bracketCount = 1;
                                
                                for (let i = arrayStart + 1; i < fullText.length; i++) {
                                    if (fullText[i] === '[') bracketCount++;
                                    if (fullText[i] === ']') {
                                        bracketCount--;
                                        if (bracketCount === 0) {
                                            arrayEnd = i;
                                            break;
                                        }
                                    }
                                }
                                
                                if (arrayEnd !== -1) {
                                    const arrayContent = fullText.substring(arrayStart + 1, arrayEnd);
                                    // Parse array items
                                    const items = arrayContent.split(',').map(item => {
                                        const trimmedItem = item.trim();
                                        return isNaN(Number(trimmedItem)) ? trimmedItem : Number(trimmedItem);
                                    });
                                    
                                    result[key] = items;
                                }
                            } else if (trimmedPart.includes(':')) {
                                // Regular key-value pair
                                const [key, value] = trimmedPart.split(':').map(s => s.trim());
                                result[key] = isNaN(Number(value)) ? value : Number(value);
                            }
                        }
                        
                        return result;
                    } else {
                        // Simple object without arrays
                        const pairs = objectContent.split(',');
                        for (const pair of pairs) {
                            if (pair.includes(':')) {
                                const [key, value] = pair.split(':').map(s => s.trim());
                                result[key] = isNaN(Number(value)) ? value : Number(value);
                            }
                        }
                        return result;
                    }
                }
                
                // Fallback to JSON.parse for simpler cases
                return JSON.parse(trimmed.replace(/(\w+):/g, '"$1":'));
            } catch (error) {
                console.error("Error parsing object:", error);
                // Return as-is if parsing fails
                return trimmed;
            }
        }
        
        // Array
        if (trimmed.startsWith('[')) {
            try {
                // Try to parse as a regular array
                const arrayContent = trimmed.substring(1, trimmed.lastIndexOf(']')).trim();
                if (!arrayContent) return [];
                
                return arrayContent.split(',').map(item => {
                    const trimmedItem = item.trim();
                    return isNaN(Number(trimmedItem)) ? trimmedItem : Number(trimmedItem);
                });
            } catch (error) {
                console.error("Error parsing array:", error);
                return trimmed;
            }
        }
        
        return trimmed;
    }
}