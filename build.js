const { execSync } = require('child_process');
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const distMain = path.join(__dirname, 'dist', 'main');
const distRenderer = path.join(__dirname, 'dist', 'renderer');

console.log('[1/3] Compiling main process...');
execSync('npx tsc -p tsconfig.main.json', { stdio: 'inherit', cwd: __dirname });

console.log('[2/3] Bundling renderer...');
esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'src', 'renderer', 'index.tsx')],
  bundle: true,
  outfile: path.join(distMain, 'renderer.js'),
  platform: 'browser',
  target: 'es2022',
  format: 'iife',
  external: ['electron'],
  loader: { '.tsx': 'tsx', '.ts': 'ts', '.css': 'text' },
  jsx: 'automatic',
});

console.log('[3/3] Copying static files...');
fs.copyFileSync(
  path.join(__dirname, 'src', 'renderer', 'index.html'),
  path.join(distMain, 'index.html')
);
fs.copyFileSync(
  path.join(__dirname, 'src', 'renderer', 'styles', 'global.css'),
  path.join(distMain, 'global.css')
);

console.log('Build complete!');
