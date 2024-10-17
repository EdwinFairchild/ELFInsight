import * as vscode from 'vscode';
import { getWebviewContent } from '../assets/webviewContent';
import { showOpenFileDialog } from '../assets/elfUtils';


export function activate(context: vscode.ExtensionContext) {

    vscode.window.showInformationMessage('Aww snap, it just got real!');

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

            switch (message.command) {
                case 'loadSymbols':

                    showOpenFileDialog(panel);
                    break;
                default:
                    vscode.window.showErrorMessage(`Unknown command: ${message.command}`);
            }
        }, undefined, context.subscriptions);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() { }
