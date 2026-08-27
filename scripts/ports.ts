#!/usr/bin/env node

const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const portsRoot = path.join(root, 'ports');
const indexPath = path.join(root, 'INDEX');

type Port = Record<string, string> & {
  directory: string;
  manifestPath: string;
};

// Reads the small, intentionally restricted TOML metadata format used by a port.
function readPort(portDirectory: string): Port {
  const manifestPath = path.join(portDirectory, 'port.toml');
  const text = fs.readFileSync(manifestPath, 'utf8');
  const values: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9]*)\s*=\s*"([^"]*)"\s*$/);
    if (match) {
      values[match[1]] = match[2];
    }
  }
  return { ...values, directory: portDirectory, manifestPath };
}

// Finds every checked-in port manifest below the ports root.
function discoverPorts(directory: string = portsRoot): Port[] {
  const ports: Port[] = [];
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

// Rejects malformed port metadata before catalog and compatibility operations use it.
function validatePort(port: Port): void {
  const relativeDirectory = path.relative(portsRoot, port.directory).replaceAll(path.sep, '/');
  if (!port.id || port.id !== relativeDirectory) {
    throw new Error(`${port.manifestPath}: id must match ${relativeDirectory}`);
  }
  if (!port.name || !port.version || !port.description || !port.author || !port.license || !port.minFpasotermVersion) {
    throw new Error(`${port.manifestPath}: required port metadata is missing`);
  }
  if (/[\r\n@]/.test(port.author)) {
    throw new Error(`${port.manifestPath}: author must be a public name or GitHub account, not an email address`);
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
  if (!source.includes('window.fpasotermPluginApi')) {
    throw new Error(`${port.manifestPath}: plugin source must use window.fpasotermPluginApi`);
  }
}

function printUsage() {
  console.log(`Usage:
  npm run ports -- list
  npm run ports -- index [--check]
  npm run ports -- sync
  npm run ports -- search <query>
  npm run ports -- check
  npm run ports -- compat [category/name[,category/name...]|all] [--fpasoterm <command>]
  npm run ports -- --help
`);
}

// Produces the public, portable metadata catalog consumed by tools and reviewers.
function portIndex() {
  return discoverPorts().map((port) => {
    validatePort(port);
    const fields = [
      port.id,
      port.name,
      port.version,
      port.author,
      port.description,
      port.license,
      port.minFpasotermVersion,
      port.installPath,
    ];
    if (fields.some((value) => /[|\r\n]/.test(value))) {
      throw new Error(`${port.manifestPath}: INDEX fields must not contain | or line breaks`);
    }
    return {
      id: port.id,
      name: port.name,
      version: port.version,
      author: port.author,
      description: port.description,
      license: port.license,
      minFpasotermVersion: port.minFpasotermVersion,
      installPath: port.installPath,
    };
  });
}

// Uses a BSD Ports-style line-oriented format to keep the catalog compact.
function serializedPortIndex() {
  return portIndex().map((port) => [
    port.id,
    port.name,
    port.version,
    port.author,
    port.description,
    port.license,
    port.minFpasotermVersion,
    port.installPath,
  ].join('|')).join('\n') + '\n';
}

// Reads the compact local catalog that `sync` and `index` have already validated.
function readPortIndex() {
  if (!fs.existsSync(indexPath)) {
    throw new Error('INDEX does not exist; run: npm run ports -- sync');
  }
  return fs.readFileSync(indexPath, 'utf8').split(/\r?\n/).filter(Boolean).map((line, number) => {
    const fields = line.split('|');
    if (fields.length !== 8 || fields.some((field) => !field)) {
      throw new Error(`${indexPath}:${number + 1}: malformed INDEX record`);
    }
    const [id, name, version, author, description, license, minFpasotermVersion, installPath] = fields;
    return { id, name, version, author, description, license, minFpasotermVersion, installPath };
  });
}

// Writes the checked-in catalog after all manifests have passed validation.
function writePortIndex() {
  fs.writeFileSync(indexPath, serializedPortIndex());
  console.log(`wrote ${indexPath}`);
}

// Git may check INDEX out with CRLF on Windows even though generation uses LF.
function normalizeIndexLineEndings(text) {
  return text.replace(/\r\n?/g, '\n');
}

// Rejects a stale checked-in catalog in CI before contributors publish a port change.
function assertPortIndexCurrent() {
  if (!fs.existsSync(indexPath)
    || normalizeIndexLineEndings(fs.readFileSync(indexPath, 'utf8')) !== serializedPortIndex()) {
    throw new Error('INDEX is stale; run: npm run ports -- index');
  }
  console.log(`INDEX contains ${portIndex().length} ports`);
}

// Updates only the current Git checkout; plugin files are never copied or run here.
function syncCheckout() {
  const result = childProcess.spawnSync('git', ['pull', '--ff-only'], {
    cwd: root,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message || `exit status ${result.status}`;
    throw new Error(`could not sync the Git checkout: ${detail}`);
  }
  assertPortIndexCurrent();
  console.log('synced checkout; review changes, then use fpasoterm --plugin-install <id> --plugin-ports-dir .');
}

function selectPort(id) {
  const port = discoverPorts().find((candidate) => candidate.id === id);
  if (!port) {
    throw new Error(`unknown port: ${id}`);
  }
  validatePort(port);
  return port;
}

// Parses comma-separated IDs and removes duplicates while preserving command order.
function selectPorts(selectors, allowAll = false) {
  const identifiers = [...new Set(String(selectors).split(',').map((value) => value.trim()).filter(Boolean))];
  if (identifiers.length === 0) {
    throw new Error('at least one port ID is required');
  }
  if (identifiers.includes('all')) {
    if (!allowAll || identifiers.length !== 1) {
      throw new Error("'all' must be used alone with compat");
    }
    return discoverPorts();
  }
  return identifiers.map(selectPort);
}

function listPorts() {
  for (const port of discoverPorts()) {
    validatePort(port);
    console.log(`${port.id}\t${port.version}\t${port.author}\t${port.description}`);
  }
}

// Searches the generated local INDEX, then returns the matching local port recipes.
function searchPorts(query) {
  assertPortIndexCurrent();
  const needle = query.toLocaleLowerCase();
  const localPorts = new Map(discoverPorts().map((port) => [port.id, port]));
  return readPortIndex()
    .filter((port) => [port.id, port.name, port.author, port.description]
      .some((value) => value.toLocaleLowerCase().includes(needle)))
    .map((entry) => {
      const port = localPorts.get(entry.id);
      if (!port) {
        throw new Error(`INDEX references a missing local port: ${entry.id}`);
      }
      return port;
    });
}

function printPorts(ports) {
  for (const port of ports) {
    validatePort(port);
    console.log(`${port.id}\t${port.version}\t${port.author}\t${port.description}`);
  }
}

// Finds Windows command wrappers explicitly instead of relying on shell:true.
function resolveWindowsCommand(command: string, environment = process.env): string {
  if (path.extname(command) || command.includes('/') || command.includes('\\')) {
    return command;
  }
  const pathEntries = [environment.Path, environment.PATH]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .flatMap((value) => value.split(';'));
  const directories = [
    process.cwd(),
    environment.APPDATA && path.join(environment.APPDATA, 'npm'),
    environment.USERPROFILE && path.join(environment.USERPROFILE, '.local', 'bin'),
    ...pathEntries,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map((value) => value.replace(/^"|"$/g, ''));
  for (const extension of ['.cmd', '.exe', '.bat', '']) {
    for (const directory of directories) {
      const candidate = path.join(directory, `${command}${extension}`);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return command;
}

// Quotes one argv component for cmd.exe when a Windows .cmd/.bat wrapper is selected.
function quoteWindowsCommandArgument(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

// Builds a shell-free child-process invocation for native executables and Windows wrappers.
function fpasotermInvocation(command: string, args: string[], platform = process.platform, environment = process.env) {
  const resolved = platform === 'win32' ? resolveWindowsCommand(command, environment) : command;
  if (platform === 'win32' && /\.(?:cmd|bat)$/i.test(resolved)) {
    // Release artifacts ship fpasoterm.cmd beside fpasoterm.exe. Prefer the
    // native executable so cmd.exe does not reinterpret relative path arguments.
    const nativeExecutable = resolved.replace(/\.(?:cmd|bat)$/i, '.exe');
    if (fs.existsSync(nativeExecutable)) {
      return { command: nativeExecutable, args };
    }
    const commandLine = [resolved, ...args].map(quoteWindowsCommandArgument).join(' ');
    return {
      command: environment.ComSpec || 'cmd.exe',
      args: ['/d', '/s', '/c', commandLine],
    };
  }
  return { command: resolved, args };
}

// Compares stable major.minor.patch versions used by the port compatibility field.
function compareVersions(left, right) {
  const parse = (value) => value.split('.').map((part) => Number.parseInt(part, 10));
  const leftParts = parse(left);
  const rightParts = parse(right);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }
  return 0;
}

function parseFpasotermVersion(output) {
  const match = output.match(/fpasoterm\s+(\d+\.\d+\.\d+)/i);
  if (!match) {
    throw new Error('cannot determine fpasoterm version from --version output');
  }
  return match[1];
}

// Reads the application version from an installed binary or fpasoterm.cmd wrapper.
function readFpasotermVersion(command = 'fpasoterm') {
  const invocation = fpasotermInvocation(command, ['--version']);
  const result = childProcess.spawnSync(invocation.command, invocation.args, {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr?.trim() || `exit status ${result.status}`;
    const hint = process.platform === 'win32'
      ? ' Specify the installed wrapper explicitly, for example: --fpasoterm C:\\path\\to\\fpasoterm.cmd'
      : '';
    throw new Error(`cannot run ${command} --version: ${detail}.${hint}`);
  }
  try {
    return parseFpasotermVersion(`${result.stdout}\n${result.stderr}`);
  } catch {
    throw new Error(`cannot determine fpasoterm version from ${command} --version output`);
  }
}

function assertCompatible(port, fpasotermVersion) {
  validatePort(port);
  if (compareVersions(fpasotermVersion, port.minFpasotermVersion) < 0) {
    throw new Error(`${port.id} requires fpasoterm >= ${port.minFpasotermVersion}; found ${fpasotermVersion}`);
  }
}

function checkCompatibility(ports, command) {
  const fpasotermVersion = readFpasotermVersion(command);
  for (const port of ports) {
    assertCompatible(port, fpasotermVersion);
    console.log(`compatible ${port.id}\tfpasoterm ${fpasotermVersion}\trequires >= ${port.minFpasotermVersion}`);
  }
  return fpasotermVersion;
}

function readFpasotermCommand(arguments_) {
  const commandIndex = arguments_.indexOf('--fpasoterm');
  if (commandIndex === -1) {
    return 'fpasoterm';
  }
  const command = arguments_[commandIndex + 1] || '';
  if (!command) {
    throw new Error('--fpasoterm requires a command path');
  }
  return command;
}

function main() {
  const [command, firstArgument, ...remaining] = process.argv.slice(2);
  if (command === '--help' || command === '-h') {
    printUsage();
    return 0;
  }
  const optionOnlyCommand = command === 'compat' && firstArgument?.startsWith('--');
  const identifier = optionOnlyCommand ? undefined : firstArgument;
  const rest = optionOnlyCommand ? [firstArgument, ...remaining] : remaining;
  if (command === 'list') {
    listPorts();
  } else if (command === 'sync' && !firstArgument) {
    syncCheckout();
  } else if (command === 'index') {
    if (firstArgument && firstArgument !== '--check') {
      throw new Error('index accepts only --check');
    }
    if (firstArgument === '--check') {
      assertPortIndexCurrent();
    } else {
      writePortIndex();
    }
  } else if (command === 'search' && identifier) {
    const matches = searchPorts(identifier);
    printPorts(matches);
    if (matches.length === 0) {
      return 1;
    }
  } else if (command === 'check') {
    discoverPorts().forEach(validatePort);
    console.log(`checked ${discoverPorts().length} ports`);
  } else if (command === 'compat') {
    const ports = !identifier ? discoverPorts() : selectPorts(identifier, true);
    checkCompatibility(ports, readFpasotermCommand(rest));
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
  assertCompatible,
  checkCompatibility,
  compareVersions,
  discoverPorts,
  fpasotermInvocation,
  portIndex,
  readPortIndex,
  normalizeIndexLineEndings,
  serializedPortIndex,
  assertPortIndexCurrent,
  syncCheckout,
  printPorts,
  parseFpasotermVersion,
  readFpasotermVersion,
  searchPorts,
  selectPort,
  selectPorts,
  validatePort,
};
