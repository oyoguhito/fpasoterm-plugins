#!/usr/bin/env node
const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const entry = path.join(root, 'scripts', 'rdp-plugin-entry.js');
const output = path.join(root, 'ports', 'integration', 'rdp-local-bridge', 'plugin.js');
const wasm = path.join(root, 'node_modules', 'ironrdp-wasm', 'pkg', 'rdp_client_bg.wasm');
const defaultTarget = 'tcp://127.0.0.1:53389';
const usage = `Usage:
  npm run port:integration:rdp-local-bridge:build
  FPASOTERM_RDP_TARGET=tcp://host:3389 npm run port:integration:rdp-local-bridge:build

The target must be one exact tcp://host:port or tls://host:port URL.
The default target is ${defaultTarget}.`;

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
    banner: { js: `// @fpasoterm-plugin version: 0.1.1\n// @fpasoterm-plugin description: Prototype RDP client using the declared local bridge.\n// @fpasoterm-plugin allowed-tcp-targets: ${target}\n// Third-party: ironrdp-wasm 1.1.0 (MIT), https://github.com/electerm/ironrdp-wasm\n// License: ports/integration/rdp-local-bridge/THIRD_PARTY_LICENSES/ironrdp-wasm-MIT.txt` },
  });
  console.log(`built RDP prototype port for ${target}`);
}
function main(args = process.argv.slice(2)) {
  if (args.length === 1 && ['--help', '-h', 'help'].includes(args[0])) {
    console.log(usage);
    return;
  }
  if (args.length > 0) {
    console.error(`Error: unsupported argument: ${args.join(' ')}`);
    console.error(`\n${usage}`);
    process.exitCode = 2;
    return;
  }
  try {
    build();
  } catch (error) {
    console.error(`Error: ${error?.message || error}`);
    console.error(`\n${usage}`);
    process.exitCode = 1;
  }
}
if (require.main === module) main();
module.exports = { build, configuredTarget, main, usage };
