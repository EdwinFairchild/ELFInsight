// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn } from 'child_process';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information
    vscode.window.showInformationMessage('Congratulations, your extension "elfinsight" is now active!');

    // Register a command to show the webview
    const disposable = vscode.commands.registerCommand('elfinsight.showWebview', () => {
        // Create and show a new webview
        const panel = vscode.window.createWebviewPanel(
            'elfinsightWebview',
            'ELFInsight Webview',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'assets')]
            }
        );

        // Set the HTML content for the webview
        panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(message => {
            vscode.window.showInformationMessage(`Received message from webview: ${JSON.stringify(message)}`); // Visible message to confirm message receipt
            switch (message.command) {
                case 'loadSymbols':
                    vscode.window.showInformationMessage('Opening file dialog...'); // Debugging info
                    showOpenFileDialog(panel);
                    break;
                default:
                    vscode.window.showErrorMessage(`Unknown command: ${message.command}`);
            }
        }, undefined, context.subscriptions);
    });

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

// Helper function to get HTML content for the webview
function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const htmlPath = vscode.Uri.joinPath(extensionUri, 'assets', 'webview.html');
    let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');

    const bootstrapUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'bootstrap.min.css'));

    // Replace placeholders in the HTML content
    htmlContent = htmlContent.replace('{{bootstrapUri}}', bootstrapUri.toString());
    htmlContent = htmlContent.replace('{{cspSource}}', webview.cspSource);

    return htmlContent;
}

// Function to show open file dialog to select ELF file
function showOpenFileDialog(panel: vscode.WebviewPanel) {
    vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Select ELF File',
        filters: {
            'ELF Files': ['elf'],
            'All Files': ['*']
        }
    }).then(fileUri => {
        if (fileUri && fileUri[0]) {
            vscode.window.showInformationMessage(`Selected ELF file: ${fileUri[0].fsPath}`);
            loadElfSymbols(fileUri[0].fsPath, panel);
        } else {
            vscode.window.showErrorMessage('No file selected');
        }
    });
}

// Function to load symbols from the selected ELF file
function loadElfSymbols(elfFilePath: string, panel: vscode.WebviewPanel) {
    vscode.window.showInformationMessage(`Loading symbols from ELF file: ${elfFilePath}`);
    const nmCommand = os.platform() === 'win32' ? 'arm-none-eabi-nm.exe' : 'arm-none-eabi-nm';

    const process = spawn(nmCommand, ['-S', '-l', elfFilePath]);

    let output = '';
    process.stdout.on('data', (data: Buffer) => {
        output += data.toString();
    });

    process.stderr.on('data', (data: Buffer) => {
        vscode.window.showErrorMessage(`Error: ${data}`);
    });

    process.on('close', (code: number) => {
        if (code === 0) {
            vscode.window.showInformationMessage(`nm process completed successfully`);
            const symbols = parseElfSymbols(output);
            panel.webview.postMessage({ command: 'displaySymbols', symbols });
        } else {
            vscode.window.showErrorMessage(`nm process exited with code ${code}`);
        }
    });
}

// Function to parse symbols from the nm output
function parseElfSymbols(output: string) {
    const lines = output.split('\n');
    const symbols = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
            // Assuming parts[1] is the size in hexadecimal and needs to be converted to decimal (bytes)
            const sizeInBytes = parseInt(parts[1], 16); // Convert hex size to decimal

            // Extract the section information from the "Type" field
            const typeCode = parts[2];
            let section = 'Unknown';
            
            // Map the type code to actual section names
            switch (typeCode) {
                case 'T':
                case 't':
                    section = '.text';
                    break;
                case 'B':
                case 'b':
                    section = '.bss';
                    break;
                case 'D':
                case 'd':
                    section = '.data';
                    break;
                case 'R':
                case 'r':
                    section = '.rodata';
                    break;
                case 'W':
                    section = '.bss (weak)';
                    break;
                default:
                    section = 'Unknown';
            }

            return {
                address: parts[0],
                size: sizeInBytes.toString(), // Display size in bytes
                type: typeCode,
                name: parts[3],
                fileLocation: parts.length > 4 ? parts[4] : 'N/A', // Original file location information
                section: section // Section (.bss, .data, .text, etc.)
            };
        }
        return null;
    }).filter(symbol => symbol !== null);

    return symbols;
}
