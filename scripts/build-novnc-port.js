#!/usr/bin/env node

let esbuild;
try {
  esbuild = require('esbuild');
} catch (error) {
  if (error?.code === 'MODULE_NOT_FOUND') {
    throw new Error('noVNC port build requires development dependencies. Run "npm ci" in fpasoterm-plugins first (do not use --omit=dev).');
  }
  throw error;
}
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const entry = path.join(root, 'scripts', 'novnc-plugin-entry.js');
const output = path.join(root, 'ports', 'integration', 'novnc-local-bridge', 'plugin.js');

function declaredTarget(source) {
  const match = source.match(/openVncBridge\(\{ target: '((?:tcp|tls):\/\/[^']+)' \}\)/);
  if (!match) throw new Error('noVNC entry does not contain one strict openVncBridge target');
  return match[1];
}

function build() {
  const target = declaredTarget(fs.readFileSync(entry, 'utf8'));
  esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    target: 'es2020',
    banner: {
      js: [
        '// @fpasoterm-plugin version: 1.0.0',
        '// @fpasoterm-plugin description: Verification noVNC client for the strictly declared local TCP bridge.',
        `// @fpasoterm-plugin allowed-tcp-targets: ${target}`,
      ].join('\n'),
    },
    outfile: output,
  });
  console.log(`built noVNC verification port for ${target}`);
}

if (require.main === module) build();
module.exports = { build, declaredTarget };
