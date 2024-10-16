import * as vscode from 'vscode';
import * as fs from 'fs';

// Function to get HTML content for the webview
export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const htmlPath = vscode.Uri.joinPath(extensionUri, 'assets', 'webview.html');
    let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');

    const bootstrapUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'bootstrap.min.css'));
    const chartJsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'chart.min.js'));
    const popperJsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'popper.min.js'));


    // Replace placeholders in the HTML content
    htmlContent = htmlContent.replace('{{bootstrapUri}}', bootstrapUri.toString());
    htmlContent = htmlContent.replace('{{chartJsUri}}', chartJsUri.toString());
    htmlContent = htmlContent.replace('{{popperJsUri}}', popperJsUri.toString());
    htmlContent = htmlContent.replace('{{cspSource}}', webview.cspSource);

    return htmlContent;
}
