import * as vscode from 'vscode';
import * as os from 'os';
import { spawn } from 'child_process';
import { exec } from 'child_process';

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
          //  vscode.window.showInformationMessage(`Selected ELF file: ${fileUri[0].fsPath}`);
            loadElfSymbols(fileUri[0].fsPath, panel);
        } else {
            vscode.window.showErrorMessage('No file selected');
        }
    });
}

// Function to load symbols from the selected ELF file
export function loadElfSymbols(elfFilePath: string, panel: vscode.WebviewPanel) {
  //  vscode.window.showInformationMessage(`Loading symbols from ELF file: ${elfFilePath}`);
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
       //     vscode.window.showInformationMessage(`nm process completed successfully`);
            const symbols = parseElfSymbols(output, panel,elfFilePath);  // Pass panel here
        } else {
            vscode.window.showErrorMessage(`nm process exited with code ${code}`);
        }
    });
}

// Make this function asynchronous
async function parseElfSymbols(output: string, panel: vscode.WebviewPanel, elfFilePath: string) {
    const lines = output.split('\n');
    const sectionSizes = {
        text: 0,       // Flash (.text)
        bss: 0,        // RAM (.bss)
        bssWeak: 0,    // RAM (.bssWeak)
        data: 0,       // Flash & RAM (.data)
        rodata: 0      // Flash (.rodata)
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
                case 'W': // Weak symbol in text section
                case 'w':
                    section = '.text';
                    sectionSizes.text += sizeInBytes;
                    break;
                case 'B':
                case 'b':
                    section = '.bss';
                    sectionSizes.bss += sizeInBytes;
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
                address: parts[0],
                size: `${sizeInBytes} (bytes)`,
                name: parts[3],
                fileLocation: parts.length > 4 ? parts[4] : 'N/A',
                section: section
            };
        }
        return null;
    }).filter(symbol => symbol !== null);

    // Calculate total flash usage (text + rodata + data)
    const totalFlashUsed = sectionSizes.text + sectionSizes.rodata + sectionSizes.data;

    // Calculate total RAM usage (bss + data + bssWeak)
    const totalRamUsed = sectionSizes.bss + sectionSizes.data + sectionSizes.bssWeak;

    // Show notifications to display the totals
    vscode.window.showInformationMessage(`Total Flash used: ${totalFlashUsed} bytes`);
    vscode.window.showInformationMessage(`Total RAM used: ${totalRamUsed} bytes`);

   // Fetch function symbols and call graph
   const { functions: functionSymbols, functionNameToAddress, addressToFunctionName } = await getFunctionSymbols(elfFilePath);

   const { functionCalls: callGraph } = await getCallGraph(elfFilePath, functionNameToAddress, addressToFunctionName, functionSymbols);

   // Convert the Map to a plain object
   const addressToFunctionNameObj = Object.fromEntries(addressToFunctionName);

   // Post message to webview with symbols and section sizes
   panel.webview.postMessage({
       command: 'displaySymbols',
       symbols,
       sectionSizes,
       flashUsed: totalFlashUsed,
       ramUsed: totalRamUsed
   });

   // Post message to webview with call graph and addressToFunctionName object
   panel.webview.postMessage({
       command: 'displayCallGraph',
       graph: {
           nodes: functionSymbols,  // List of function nodes
           edges: callGraph,        // Edges between functions
           addressToFunctionName: addressToFunctionNameObj  // Converted to object
       }
   });

   vscode.window.showInformationMessage(`Symbols length: ${symbols.length}`);

   return symbols;
}
interface FunctionSymbol {
    address: string;
    name: string;
}
function normalizeAddress(address: string): string {
    return address.toLowerCase().replace(/^0x/, '').padStart(8, '0');
}
function getFunctionSymbols(elfFilePath: string): Promise<{
    functions: FunctionSymbol[],
    functionNameToAddress: Map<string, string>,
    addressToFunctionName: Map<string, string>
}> {
    return new Promise((resolve, reject) => {
        exec(`arm-none-eabi-nm -C --defined-only ${elfFilePath}`, (err, stdout) => {
            if (err) {
                return reject(err);
            }
            const functions: FunctionSymbol[] = [];
            const functionNameToAddress = new Map<string, string>();
            const addressToFunctionName = new Map<string, string>();
            stdout
                .split('\n')
                .forEach(line => {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 3) {
                        const rawAddress = parts[0];
                        const address = normalizeAddress(rawAddress);
                        const typeCode = parts[1];
                        const name = parts.slice(2).join(' '); // In case name has spaces

                        // Include more symbol types that represent functions
                        if (['T', 't', 'W', 'w', 'U', 'u'].includes(typeCode)) {
                            // Log function name and address for debugging
                            console.log(`Parsed function: ${name} at address: ${address} with typeCode: ${typeCode}`);

                            functions.push({
                                address: address,
                                name: name  // Function name for label
                            });

                            functionNameToAddress.set(name, address);
                            addressToFunctionName.set(address, name);
                        }
                    }
                });
            resolve({ functions, functionNameToAddress, addressToFunctionName });
        });
    });
}

function getCallGraph(
    elfFilePath: string,
    functionNameToAddress: Map<string, string>,
    addressToFunctionName: Map<string, string>,
    functions: FunctionSymbol[]
): Promise<{ functionCalls: { [key: string]: string[] } }> {
    return new Promise((resolve, reject) => {
        exec(`arm-none-eabi-objdump -d ${elfFilePath}`, (err, stdout) => {
            if (err) {
                return reject(err);
            }
            const functionCalls: { [key: string]: string[] } = {};
            let currentFunctionAddress = '';
            const lines = stdout.split('\n');

            for (const line of lines) {
                const functionMatch = line.match(/^([0-9a-f]+)\s+<([^\+>]+)>:/);
                if (functionMatch) {
                    currentFunctionAddress = normalizeAddress(functionMatch[1]);
                    const currentFunctionName = functionMatch[2];
                    functionCalls[currentFunctionAddress] = [];

                    // If current function is not in addressToFunctionName, add it
                    if (!addressToFunctionName.has(currentFunctionAddress)) {
                        addressToFunctionName.set(currentFunctionAddress, currentFunctionName);
                        functions.push({
                            address: currentFunctionAddress,
                            name: currentFunctionName
                        });
                    }

                    console.log(`Found function: ${currentFunctionName} at address: ${currentFunctionAddress}`);
                    continue;
                }

                const callMatch = line.match(/\s+bl\s+([^\s]+)/);
                if (callMatch && currentFunctionAddress) {
                    const calledOperand = callMatch[1];
                    let calledAddress = '';

                    // Resolve the called function to its address
                    const address = functionNameToAddress.get(calledOperand);
                    if (address) {
                        calledAddress = normalizeAddress(address);
                    } else if (/^[0-9a-f]+$/.test(calledOperand)) {
                        calledAddress = normalizeAddress(calledOperand);
                    } else {
                        console.warn(`Unable to resolve called function ${calledOperand}`);
                        continue;
                    }

                    functionCalls[currentFunctionAddress].push(calledAddress);

                    // If called function is not in addressToFunctionName, add it
                    if (!addressToFunctionName.has(calledAddress)) {
                        addressToFunctionName.set(calledAddress, calledOperand);
                        functions.push({
                            address: calledAddress,
                            name: calledOperand
                        });
                    }

                    console.log(`Function at address ${currentFunctionAddress} calls address: ${calledAddress}`);
                }
            }
            resolve({ functionCalls });
        });
    });
}