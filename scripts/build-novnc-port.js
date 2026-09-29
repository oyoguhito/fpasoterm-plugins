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
const defaultTarget = 'tcp://127.0.0.1:5999';
function usage(target = defaultTarget) {
  return `Usage:
  npm run port:integration:novnc-local-bridge:build
  npm run port:integration:novnc-local-bridge:configure -- tcp://host:port
  npm run port:integration:novnc-local-bridge:reset

Default after reset: ${defaultTarget}
Currently configured target: ${target}

The build command uses the strict target currently recorded in the noVNC entry.`;
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

function main(args = process.argv.slice(2)) {
  if (args.length === 1 && ['--help', '-h', 'help'].includes(args[0])) {
    console.log(usage(currentTargetOrDefault()));
    return;
  }
  if (args.length > 0) {
    console.error(`Error: unsupported argument: ${args.join(' ')}`);
    console.error(`\n${usage(currentTargetOrDefault())}`);
    process.exitCode = 2;
    return;
  }
  try {
    build();
  } catch (error) {
    console.error(`Error: ${error?.message || error}`);
    console.error(`\n${usage(currentTargetOrDefault())}`);
    process.exitCode = 1;
  }
}
if (require.main === module) main();
module.exports = { build, declaredTarget, currentTargetOrDefault, defaultTarget, main, usage };
