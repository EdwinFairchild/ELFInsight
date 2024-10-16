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
exports.getWebviewContent = getWebviewContent;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
// Function to get HTML content for the webview
function getWebviewContent(webview, extensionUri) {
    const htmlPath = vscode.Uri.joinPath(extensionUri, 'assets', 'webview.html');
    let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');
    const bootstrapUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'bootstrap.min.css'));
    const chartJsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'chart.min.js'));
    // Replace placeholders in the HTML content
    htmlContent = htmlContent.replace('{{bootstrapUri}}', bootstrapUri.toString());
    htmlContent = htmlContent.replace('{{chartJsUri}}', chartJsUri.toString());
    htmlContent = htmlContent.replace('{{cspSource}}', webview.cspSource);
    return htmlContent;
}
//# sourceMappingURL=webviewContent.js.map