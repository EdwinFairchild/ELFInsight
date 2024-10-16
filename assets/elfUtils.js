"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showOpenFileDialog = showOpenFileDialog;
exports.loadElfSymbols = loadElfSymbols;
const vscode = __importStar(require("vscode"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
// Function to show open file dialog to select ELF file
function showOpenFileDialog(panel) {
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
        }
        else {
            vscode.window.showErrorMessage('No file selected');
        }
    });
}
// Function to load symbols from the selected ELF file
function loadElfSymbols(elfFilePath, panel) {
    vscode.window.showInformationMessage(`Loading symbols from ELF file: ${elfFilePath}`);
    const nmCommand = os.platform() === 'win32' ? 'arm-none-eabi-nm.exe' : 'arm-none-eabi-nm';
    const process = (0, child_process_1.spawn)(nmCommand, ['-S', '-l', elfFilePath]);
    let output = '';
    process.stdout.on('data', (data) => {
        output += data.toString();
    });
    process.stderr.on('data', (data) => {
        vscode.window.showErrorMessage(`Error: ${data}`);
    });
    process.on('close', (code) => {
        if (code === 0) {
            vscode.window.showInformationMessage(`nm process completed successfully`);
            const symbols = parseElfSymbols(output, panel); // Pass panel here
        }
        else {
            vscode.window.showErrorMessage(`nm process exited with code ${code}`);
        }
    });
}
// Function to parse symbols from the nm output
function parseElfSymbols(output, panel) {
    const lines = output.split('\n');
    const sectionSizes = {
        text: 0,
        bss: 0,
        bssWeak: 0, // New .bss (weak) section
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
                case 'W': // Weak symbols, typically for .bss (weak)
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
//# sourceMappingURL=elfUtils.js.map