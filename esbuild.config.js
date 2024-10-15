// esbuild.config.js
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/extension.ts'], // Entry point of your extension
  bundle: true, // Bundle all dependencies into one file
  platform: 'node', // VS Code extensions run in a Node.js environment
  external: ['vscode'], // Do not include vscode in the bundle, as it's provided by VS Code runtime
  outfile: 'out/extension.js', // Output file
  sourcemap: true, // Generate source maps for debugging
  target: 'node16', // Target Node.js version (matches your "module" version)
}).catch(() => process.exit(1));
