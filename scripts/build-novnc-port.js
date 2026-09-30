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
const defaultTarget = 'tcp://127.0.0.1:5900';
function configuredRfbMode(source) {
  return /const forceRfb33 = true;/.test(source) ? '3.3 (Vine compatibility)' : 'automatic (up to 3.8)';
}

function usage(target = defaultTarget, rfbMode = 'automatic (up to 3.8)') {
  return `Usage:
  npm run port:integration:novnc-local-bridge:build
  npm run port:integration:novnc-local-bridge:configure -- tcp://host:port [--rfb-3.3]
  npm run port:integration:novnc-local-bridge:reset

Vine Server example:
  npm run port:integration:novnc-local-bridge:configure -- tcp://192.0.2.10:5900 --rfb-3.3

Default after reset: ${defaultTarget}
Currently configured target: ${target}
Currently configured RFB mode: ${rfbMode}

Use --rfb-3.3 only for a Vine Server that advertises 3.8 but stalls during
security negotiation. The build command uses the strict target and protocol
compatibility mode currently recorded in the noVNC entry.`;
}

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
        '// @fpasoterm-plugin version: 1.0.1',
        '// @fpasoterm-plugin description: Verification noVNC client for the strictly declared local TCP bridge.',
        `// @fpasoterm-plugin allowed-tcp-targets: ${target}`,
      ].join('\n'),
    },
    outfile: output,
  });
  console.log(`built noVNC verification port for ${target}`);
}

function currentTargetOrDefault() {
  try {
    return declaredTarget(fs.readFileSync(entry, 'utf8'));
  } catch {
    return defaultTarget;
  }
}

function currentConfiguration() {
  try {
    const source = fs.readFileSync(entry, 'utf8');
    return { target: declaredTarget(source), rfbMode: configuredRfbMode(source) };
  } catch {
    return { target: defaultTarget, rfbMode: 'automatic (up to 3.8)' };
  }
}

function main(args = process.argv.slice(2)) {
  if (args.length === 1 && ['--help', '-h', 'help'].includes(args[0])) {
    const current = currentConfiguration();
    console.log(usage(current.target, current.rfbMode));
    return;
  }
  if (args.length > 0) {
    console.error(`Error: unsupported argument: ${args.join(' ')}`);
    const current = currentConfiguration();
    console.error(`\n${usage(current.target, current.rfbMode)}`);
    process.exitCode = 2;
    return;
  }
  try {
    build();
  } catch (error) {
    console.error(`Error: ${error?.message || error}`);
    const current = currentConfiguration();
    console.error(`\n${usage(current.target, current.rfbMode)}`);
    process.exitCode = 1;
  }
}
if (require.main === module) main();
module.exports = { build, configuredRfbMode, currentConfiguration, declaredTarget, currentTargetOrDefault, defaultTarget, main, usage };
