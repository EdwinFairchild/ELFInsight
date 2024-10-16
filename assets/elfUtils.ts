import * as vscode from 'vscode';
import * as os from 'os';
import { spawn } from 'child_process';

// Function to show open file dialog to select ELF file
export function showOpenFileDialog(panel: vscode.WebviewPanel) {
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
export function loadElfSymbols(elfFilePath: string, panel: vscode.WebviewPanel) {
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
            const symbols = parseElfSymbols(output, panel);  // Pass panel here
        } else {
            vscode.window.showErrorMessage(`nm process exited with code ${code}`);
        }
    });
}

// Function to parse symbols from the nm output
function parseElfSymbols(output: string, panel: vscode.WebviewPanel) {
    const lines = output.split('\n');
    const sectionSizes = {
        text: 0,
        bss: 0,
        bssWeak: 0,  // New .bss (weak) section
        data: 0,
        rodata: 0,
    };

    const symbols = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
            const sizeInBytes = parseInt(parts[1], 16); // Convert hex size to decimal
            const typeCode = parts[2];
            let section = 'Unknown';
            
            // Determine the section based on the type code
            switch (typeCode) {
                case 'T':
                case 't':
                    section = '.text';
                    sectionSizes.text += sizeInBytes;
                    break;
                case 'B':
                case 'b':
                    section = '.bss';
                    sectionSizes.bss += sizeInBytes;
                    break;
                case 'W':  // Weak symbols, typically for .bss (weak)
                    section = '.bss (weak)';
                    sectionSizes.bssWeak += sizeInBytes;
                    break;
                case 'D':
                case 'd':
                    section = '.data';
                    sectionSizes.data += sizeInBytes;
                    break;
                case 'R':
                case 'r':
                    section = '.rodata';
                    sectionSizes.rodata += sizeInBytes;
                    break;
                default:
                    section = 'Unknown';
            }

            // Return the symbol information excluding the 'type' field
            return {
                address: `0x${parts[0]}`,
                size: `${sizeInBytes} (bytes)`,
                name: parts[3],
                fileLocation: parts.length > 4 ? parts[4] : 'N/A',
                section: section
            };
        }
        return null;
    }).filter(symbol => symbol !== null);

    // Post message to webview with symbols and section sizes
    panel.webview.postMessage({
        command: 'displaySymbols',
        symbols,
        sectionSizes
    });

    return symbols;
}
