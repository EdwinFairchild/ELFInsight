// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "elfinsight" is now active!');

    // Register a command to show the webview
    const disposable = vscode.commands.registerCommand('elfinsight.showWebview', () => {
        // Create and show a new webview
        const panel = vscode.window.createWebviewPanel(
            'elfinsightWebview',
            'ELFInsight Webview',
            vscode.ViewColumn.One,
            {
                enableScripts: true // Enable JavaScript in the webview
            }
        );

        // Set the HTML content for the webview
        panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);
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
