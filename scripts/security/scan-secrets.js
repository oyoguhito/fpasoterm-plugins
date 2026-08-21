const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const ignoredDirectories = new Set(['.git', '.jj', 'node_modules']);
const ignoredFiles = new Set(['package-lock.json']);
const patterns = [
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

const findings = [];
for (const file of walk(root)) {
  const relative = path.relative(root, file);
  if (ignoredFiles.has(relative)) {
    continue;
  }
  const contents = fs.readFileSync(file);
  if (contents.includes(0)) {
    continue;
  }
  for (const [lineNumber, line] of contents.toString('utf8').split(/\r?\n/).entries()) {
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
