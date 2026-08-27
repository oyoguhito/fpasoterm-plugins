const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const portsApi = require('./ports');
const portsSource = fs.readFileSync(path.join(root, 'scripts', 'ports.ts'), 'utf8');
assert.doesNotMatch(portsSource, /command === 'install'/);
assert.doesNotMatch(portsSource, /command === 'update'/);
assert.doesNotMatch(portsSource, /command === 'uninstall'/);
const ports = portsApi.discoverPorts();
assert.equal(portsApi.readPortIndex().length, 10);
for (const identifier of [
  'appearance/amber',
  'terminal/hello',
  'terminal/welcome-banner',
  'terminal/status-banner',
  'terminal/theme',
  'appearance/teal',
  'appearance/high-contrast',
  'productivity/git-status',
  'productivity/plugin-search',
  'productivity/session-marker',
]) {
  assert.ok(ports.some((port) => port.id === identifier));
}

const welcomeBanner = portsApi.selectPort('terminal/welcome-banner');
assert.deepEqual(
  portsApi.selectPorts('terminal/hello,terminal/welcome-banner').map((port) => port.id),
  ['terminal/hello', 'terminal/welcome-banner'],
);
assert.equal(portsApi.selectPorts('all', true).length, 10);
assert.throws(() => portsApi.selectPorts('all,terminal/hello', true), /must be used alone/);
assert.deepEqual(
  portsApi.searchPorts('WELCOME').map((port) => port.id),
  ['terminal/welcome-banner'],
);
assert.equal(portsApi.searchPorts('banner').length, 2);
assert.deepEqual(portsApi.searchPorts('session').map((port) => port.id), [
  'productivity/session-marker',
]);
assert.deepEqual(portsApi.searchPorts('search').map((port) => port.id), ['productivity/plugin-search']);
assert.equal(portsApi.searchPorts('oyoguhito').length, 10);
assert.match(
  portsApi.formatMarkdownForTerminal('# Title\n\nUse **fpasoterm**.\n[Docs](https://example.test)\n```sh\necho ok\n```'),
  /Title[\s\S]*fpasoterm[\s\S]*Docs[\s\S]*https:\/\/example\.test[\s\S]*echo ok/,
);
assert.doesNotThrow(() => portsApi.printPortInfo(welcomeBanner));
assert.equal(portsApi.compareVersions('1.5.7', '1.5.5'), 2);
assert.equal(portsApi.compareVersions('1.5.5', '1.5.5'), 0);
assert.equal(portsApi.parseFpasotermVersion('fpasoterm 1.5.7 (commit abcdef)'), '1.5.7');
const windowsCommandDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'fpasoterm-windows-command-'));
fs.writeFileSync(path.join(windowsCommandDirectory, 'fpasoterm.cmd'), '@echo off\r\n');
fs.writeFileSync(path.join(windowsCommandDirectory, 'fpasoterm.exe'), 'test executable');
assert.deepEqual(
  portsApi.fpasotermInvocation('fpasoterm', ['--version'], 'win32', {
    PATH: windowsCommandDirectory,
    ComSpec: 'cmd-test.exe',
  }),
  {
    command: path.join(windowsCommandDirectory, 'fpasoterm.exe'),
    args: ['--version'],
  },
);
assert.throws(
  () => portsApi.assertCompatible(welcomeBanner, '1.5.4'),
  /requires fpasoterm >= 1.5.5/,
);
portsApi.assertCompatible(welcomeBanner, '1.5.7');
ports.forEach((port) => portsApi.assertCompatible(port, '1.5.11'));
assert.throws(
  () => portsApi.validatePort({ ...welcomeBanner, author: 'person@example.com' }),
  /must be a public name or GitHub account/,
);
ports.forEach(portsApi.validatePort);
assert.equal(ports.length, 10);
assert.doesNotThrow(() => portsApi.assertPortIndexCurrent());
assert.equal(portsApi.normalizeIndexLineEndings('one\r\ntwo\rthree\n'), 'one\ntwo\nthree\n');
assert.equal(typeof portsApi.syncCheckout, 'function');
console.log('ports checks passed');
