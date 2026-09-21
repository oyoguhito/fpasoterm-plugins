#!/usr/bin/env node
const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const entry = path.join(root, 'scripts', 'rdp-plugin-entry.js');
const output = path.join(root, 'ports', 'integration', 'rdp-local-bridge', 'plugin.js');
const wasm = path.join(root, 'node_modules', 'ironrdp-wasm', 'pkg', 'rdp_client_bg.wasm');
const defaultTarget = 'tcp://127.0.0.1:53389';

function configuredTarget(value = process.env.FPASOTERM_RDP_TARGET || defaultTarget) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('FPASOTERM_RDP_TARGET must be an exact tcp://host:port or tls://host:port URL');
  }
  if (!['tcp:', 'tls:'].includes(parsed.protocol) || !parsed.hostname || !parsed.port
    || parsed.username || parsed.password || !['', '/'].includes(parsed.pathname) || parsed.search || parsed.hash) {
    throw new Error('FPASOTERM_RDP_TARGET must be an exact tcp://host:port or tls://host:port URL');
  }
  const port = Number(parsed.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('FPASOTERM_RDP_TARGET must use a port from 1 through 65535');
  }
  return `${parsed.protocol.slice(0, -1)}://${parsed.hostname.toLowerCase()}:${port}`;
}

function build() {
  const target = configuredTarget();
  esbuild.buildSync({
    entryPoints: [entry], bundle: true, format: 'iife', target: 'es2020',
    define: {
      '__FPASOTERM_RDP_WASM_BASE64__': JSON.stringify(fs.readFileSync(wasm).toString('base64')),
      '__FPASOTERM_RDP_TARGET__': JSON.stringify(target),
    },
    outfile: output,
    banner: { js: `// @fpasoterm-plugin version: 0.1.0\n// @fpasoterm-plugin description: Prototype RDP client using the declared local bridge.\n// @fpasoterm-plugin allowed-tcp-targets: ${target}\n// Third-party: ironrdp-wasm 1.1.0 (MIT), https://github.com/electerm/ironrdp-wasm\n// License: ports/integration/rdp-local-bridge/THIRD_PARTY_LICENSES/ironrdp-wasm-MIT.txt` },
  });
  console.log(`built RDP prototype port for ${target}`);
}
if (require.main === module) build();
module.exports = { build, configuredTarget };
