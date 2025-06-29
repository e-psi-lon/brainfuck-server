import * as vscode from 'vscode';
import { PseudoCodeValidator, generateCellMapHTML } from './validator';
import { PseudoCodeParser } from './parser';

export function activate(context: vscode.ExtensionContext) {
    const validator = new PseudoCodeValidator();
    const parser = new PseudoCodeParser();
    
    // Register diagnostics for .pseudo files
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('pseudo');
    
    // Validate on document change
    const validateDocument = (document: vscode.TextDocument) => {
        if (document.languageId !== 'pseudo') return;
        
        try {
            const ast = parser.parse(document.getText());
            const errors = validator.validate(ast);
            
            const diagnostics: vscode.Diagnostic[] = errors.map(error => ({
                range: new vscode.Range(error.line, error.column, error.line, error.column + error.length),
                message: error.message,
                severity: error.severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning,
                source: 'pseudo-validator'
            }));
            
            diagnosticCollection.set(document.uri, diagnostics);
        } catch (parseError: any) {
            const diagnostic = new vscode.Diagnostic(
                new vscode.Range(0, 0, 0, 0),
                `Parse error: ${parseError.message}`,
                vscode.DiagnosticSeverity.Error
            );
            diagnosticCollection.set(document.uri, [diagnostic]);
        }
    };
    
    // Validate current document
    if (vscode.window.activeTextEditor) {
        validateDocument(vscode.window.activeTextEditor.document);
    }
    
    // Validate on document changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => validateDocument(e.document)),
        vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor | undefined) => {
            if (editor) validateDocument(editor.document);
        })
    );
    
    // Command to show cell allocation map
    context.subscriptions.push(
        vscode.commands.registerCommand('pseudo.showCellMap', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || editor.document.languageId !== 'pseudo') return;
            
            const ast = parser.parse(editor.document.getText());
            const cellMap = validator.getCellAllocationMap(ast);
            
            const panel = vscode.window.createWebviewPanel(
                'cellMap',
                'Cell Allocation Map',
                vscode.ViewColumn.Two,
                { enableScripts: true }
            );
            
            panel.webview.html = generateCellMapHTML(cellMap);
        })
    );
}