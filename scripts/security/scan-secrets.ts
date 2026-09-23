const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..', '..');
const ignoredDirectories = new Set(['.git', '.jj', 'node_modules']);
const ignoredFiles = new Set(['package-lock.json']);
const verifiedGeneratedWasmBundles = new Map([
  ['ports/integration/rdp-local-bridge/plugin.js', {
    marker: '// Third-party: ironrdp-wasm 1.1.0 (MIT)',
    sha256: '0e22cf04df744a34db2c8a4aee703c0ab0cab1b05393b3fbf72aff3640e608e7',
  }],
]);
const patterns: Array<[string, RegExp]> = [
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['GitHub token', /gh[pousr]_[A-Za-z0-9_]{36,}/],
  ['npm token', /npm_[A-Za-z0-9]{36,}/],
  ['Slack token', /xox[baprs]-[A-Za-z0-9-]{10,}/],
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/],
  ['Private key header', /-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/],
  ['Generic assigned secret', /\b(?:api[_-]?key|secret|token|password|passwd|pwd)\b\s*[:=]\s*['"][^'"]{12,}['"]/i],
];

// Recursively returns repository files that should be scanned for accidental credentials.
function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) {
      continue;
    }
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

// The reviewed RDP port is intentionally a single-file plugin. Its pinned
// third-party IronRDP WebAssembly payload is base64-embedded by the port build
// script; arbitrary binary bytes can accidentally resemble a credential. Scan
// the generated wrapper and metadata as usual, but mask only a valid WebAssembly
// payload in this one reviewed generated file.
function maskVerifiedGeneratedWasm(relative, contents) {
  const expected = verifiedGeneratedWasmBundles.get(relative);
  if (!expected || !contents.includes(expected.marker)) {
    return contents;
  }
  const match = /var wasmBase64 = "([A-Za-z0-9+/=]+)";/.exec(contents);
  if (!match) {
    return contents;
  }
  const wasm = Buffer.from(match[1], 'base64');
  const wasmHash = crypto.createHash('sha256').update(wasm).digest('hex');
  if (wasm.length < 4 || !wasm.subarray(0, 4).equals(Buffer.from([0, 97, 115, 109]))
    || wasmHash !== expected.sha256) {
    return contents;
  }
  return `${contents.slice(0, match.index)}var wasmBase64 = "<verified-generated-wasm>";${contents.slice(match.index + match[0].length)}`;
}

const findings = [];
for (const file of walk(root)) {
  const relative = path.relative(root, file);
  if (ignoredFiles.has(relative)) {
    continue;
  }
  const bytes = fs.readFileSync(file);
  if (bytes.includes(0)) {
    continue;
  }
  const contents = maskVerifiedGeneratedWasm(relative, bytes.toString('utf8'));
  for (const [lineNumber, line] of contents.split(/\r?\n/).entries()) {
    for (const [name, pattern] of patterns) {
      if (pattern.test(line)) {
        findings.push(`${relative}:${lineNumber + 1}: possible ${name}`);
      }
    }
  }
}

if (findings.length > 0) {
  console.error('Potential credentials found:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log('secret scan passed');
