import * as vscode from 'vscode';
import * as fs from 'fs';

// Function to get HTML content for the webview
export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const htmlPath = vscode.Uri.joinPath(extensionUri, 'assets', 'webview.html');
    let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');

    const bootstrapUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'bootstrap.min.css'));
    const chartJsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'chart.min.js'));
    const popperJsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'popper.min.js'));
    // make uri for cytoscape.min.js
    const cytoscapeJsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'cytoscape.min.js'));



    // Replace placeholders in the HTML content
    htmlContent = htmlContent.replace('{{bootstrapUri}}', bootstrapUri.toString());
    htmlContent = htmlContent.replace('{{chartJsUri}}', chartJsUri.toString());
    htmlContent = htmlContent.replace('{{popperJsUri}}', popperJsUri.toString());
    htmlContent = htmlContent.replace('{{cytoscapeJsUri}}', cytoscapeJsUri.toString());
    // show me the uri strings
    vscode.window.showInformationMessage(`bootstrapUri: ${bootstrapUri.toString()}`);
    vscode.window.showInformationMessage(`chartJsUri: ${chartJsUri.toString()}`);
    vscode.window.showInformationMessage(`popperJsUri: ${popperJsUri.toString()}`);
    vscode.window.showInformationMessage(`cytoscapeJsUri: ${cytoscapeJsUri.toString()}`);

    

    return htmlContent;
}
