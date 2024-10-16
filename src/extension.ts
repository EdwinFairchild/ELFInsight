import * as vscode from 'vscode';
import { getWebviewContent } from '../assets/webviewContent';
import { showOpenFileDialog } from '../assets/elfUtils';


export function activate(context: vscode.ExtensionContext) {

    vscode.window.showInformationMessage('Congratulations, your extension "elfinsight" is now active!');

    const disposable = vscode.commands.registerCommand('elfinsight.showWebview', () => {
        const panel = vscode.window.createWebviewPanel(
            'elfinsightWebview',
            'ELFInsight Webview',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'assets')]
            }
        );

        panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);

        panel.webview.onDidReceiveMessage(message => {
            vscode.window.showInformationMessage(`Received message from webview: ${JSON.stringify(message)}`);
            switch (message.command) {
                case 'loadSymbols':
                    vscode.window.showInformationMessage('Opening file dialog...');
                    showOpenFileDialog(panel);
                    break;
                default:
                    vscode.window.showErrorMessage(`Unknown command: ${message.command}`);
            }
        }, undefined, context.subscriptions);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
