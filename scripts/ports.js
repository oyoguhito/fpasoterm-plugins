#!/usr/bin/env node

const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const portsRoot = path.join(root, 'ports');

// Reads the small, intentionally restricted TOML metadata format used by a port.
function readPort(portDirectory) {
  const manifestPath = path.join(portDirectory, 'port.toml');
  const text = fs.readFileSync(manifestPath, 'utf8');
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9]*)\s*=\s*"([^"]*)"\s*$/);
    if (match) {
      values[match[1]] = match[2];
    }
  }
  return { ...values, directory: portDirectory, manifestPath };
}

// Finds every checked-in port manifest below the ports root.
function discoverPorts(directory = portsRoot) {
  const ports = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      ports.push(...discoverPorts(entryPath));
    } else if (entry.isFile() && entry.name === 'port.toml') {
      ports.push(readPort(path.dirname(entryPath)));
    }
  }
  return ports.sort((left, right) => left.id.localeCompare(right.id));
}

// Rejects malformed port metadata before copy or enable operations use it.
function validatePort(port) {
  const relativeDirectory = path.relative(portsRoot, port.directory).replaceAll(path.sep, '/');
  if (!port.id || port.id !== relativeDirectory) {
    throw new Error(`${port.manifestPath}: id must match ${relativeDirectory}`);
  }
  if (!port.name || !port.version || !port.description || !port.license || !port.minFpasotermVersion) {
    throw new Error(`${port.manifestPath}: required port metadata is missing`);
  }
  if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(port.version)) {
    throw new Error(`${port.manifestPath}: version must use major.minor.patch`);
  }
  if (!port.source || !/\.([jt]s)$/.test(port.source) || path.basename(port.source) !== port.source) {
    throw new Error(`${port.manifestPath}: source must be a local .js or .ts file name`);
  }
  if (!port.installPath || !/\.([jt]s)$/.test(port.installPath) || path.isAbsolute(port.installPath)) {
    throw new Error(`${port.manifestPath}: installPath must be a relative .js or .ts path`);
  }
  const sourcePath = path.join(port.directory, port.source);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`${port.manifestPath}: source file ${port.source} does not exist`);
  }
  const installPath = path.normalize(port.installPath);
  if (installPath.startsWith(`..${path.sep}`) || installPath === '..') {
    throw new Error(`${port.manifestPath}: installPath must not escape User/plugins`);
  }
  const source = fs.readFileSync(sourcePath, 'utf8');
  if (!source.includes(`@fpasoterm-plugin version: ${port.version}`)) {
    throw new Error(`${port.manifestPath}: plugin version header must match port.version`);
  }
}

// Returns the default writable plugin directory used by fpasoterm.
function defaultPluginDirectory() {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(configHome, 'fpasoterm', 'User', 'plugins');
}

function printUsage() {
  console.log(`Usage:
  node scripts/ports.js list
  node scripts/ports.js check
  node scripts/ports.js install <category/name> [--enable] [--plugin-dir <path>]
`);
}

function selectPort(id) {
  const port = discoverPorts().find((candidate) => candidate.id === id);
  if (!port) {
    throw new Error(`unknown port: ${id}`);
  }
  validatePort(port);
  return port;
}

function listPorts() {
  for (const port of discoverPorts()) {
    validatePort(port);
    console.log(`${port.id}\t${port.version}\t${port.description}`);
  }
}

function installPort(port, pluginDirectory, enable) {
  const destination = path.join(pluginDirectory, port.installPath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(port.directory, port.source), destination);
  console.log(`installed ${port.id} -> ${destination}`);
  const selector = port.installPath.replaceAll(path.sep, '/');
  if (!enable) {
    console.log(`enable with: fpasoterm --plugin-enable ${selector}`);
    return;
  }
  const result = childProcess.spawnSync('fpasoterm', ['--plugin-enable', selector], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error || result.status !== 0) {
    throw new Error(`installed ${selector}, but automatic enable failed; run: fpasoterm --plugin-enable ${selector}`);
  }
}

function main() {
  const [command, identifier, ...rest] = process.argv.slice(2);
  if (command === 'list') {
    listPorts();
  } else if (command === 'check') {
    discoverPorts().forEach(validatePort);
    console.log(`checked ${discoverPorts().length} ports`);
  } else if (command === 'install' && identifier) {
    let pluginDirectory = defaultPluginDirectory();
    const directoryIndex = rest.indexOf('--plugin-dir');
    if (directoryIndex !== -1) {
      pluginDirectory = rest[directoryIndex + 1] || '';
    }
    if (!pluginDirectory) {
      throw new Error('--plugin-dir requires a path');
    }
    installPort(selectPort(identifier), path.resolve(pluginDirectory), rest.includes('--enable'));
  } else {
    printUsage();
    return command ? 2 : 0;
  }
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`fpasoterm-plugins: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  defaultPluginDirectory,
  discoverPorts,
  installPort,
  selectPort,
  validatePort,
};
