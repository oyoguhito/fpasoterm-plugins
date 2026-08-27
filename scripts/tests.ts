const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const portsApi = require('./ports');
const ports = portsApi.discoverPorts();
assert.equal(portsApi.readPortIndex().length, 9);
for (const identifier of [
  'appearance/amber',
  'terminal/hello',
  'terminal/welcome-banner',
  'terminal/status-banner',
  'terminal/theme',
  'appearance/teal',
  'appearance/high-contrast',
  'productivity/git-status',
  'productivity/session-marker',
]) {
  assert.ok(ports.some((port) => port.id === identifier));
}

const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'fpasoterm-plugins-'));
const welcomeBanner = portsApi.selectPort('terminal/welcome-banner');
assert.deepEqual(
  portsApi.selectPorts('terminal/hello,terminal/welcome-banner').map((port) => port.id),
  ['terminal/hello', 'terminal/welcome-banner'],
);
assert.equal(portsApi.selectPorts('all', true).length, 9);
assert.throws(() => portsApi.selectPorts('all,terminal/hello', true), /must be used alone/);
portsApi.installPort(welcomeBanner, tempDirectory, false);
assert.ok(fs.existsSync(path.join(tempDirectory, 'terminal', 'welcome-banner.ts')));
const hello = portsApi.selectPort('terminal/hello');
portsApi.installPort(hello, tempDirectory, false);
const amber = portsApi.selectPort('appearance/amber');
portsApi.installPort(amber, tempDirectory, false);
assert.ok(fs.existsSync(path.join(tempDirectory, 'appearance', 'amber.ts')));
portsApi.assertInstalled([welcomeBanner, hello, amber], tempDirectory);
portsApi.updatePort(welcomeBanner, tempDirectory, false);
assert.deepEqual(
  portsApi.searchPorts('WELCOME').map((port) => port.id),
  ['terminal/welcome-banner'],
);
assert.equal(portsApi.searchPorts('banner').length, 2);
assert.deepEqual(portsApi.searchPorts('session').map((port) => port.id), [
  'productivity/session-marker',
]);
assert.deepEqual(portsApi.searchPorts('search'), []);
assert.equal(portsApi.searchPorts('oyoguhito').length, 9);
assert.equal(portsApi.compareVersions('1.5.7', '1.5.5'), 2);
assert.equal(portsApi.compareVersions('1.5.5', '1.5.5'), 0);
assert.equal(portsApi.parseFpasotermVersion('fpasoterm 1.5.7 (commit abcdef)'), '1.5.7');
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
portsApi.uninstallPort(welcomeBanner, tempDirectory, false);
assert.ok(!fs.existsSync(path.join(tempDirectory, 'terminal', 'welcome-banner.ts')));
portsApi.uninstallPort(hello, tempDirectory, false);
portsApi.uninstallPort(amber, tempDirectory, false);
assert.ok(!fs.existsSync(path.join(tempDirectory, 'appearance', 'amber.ts')));
portsApi.installPort(welcomeBanner, tempDirectory, false);
fs.writeFileSync(path.join(tempDirectory, 'terminal', 'welcome-banner.ts'), '// local plugin\n');
assert.throws(
  () => portsApi.installPort(welcomeBanner, tempDirectory, false),
  /rerun with --force to replace it/,
);
assert.throws(
  () => portsApi.updatePort(welcomeBanner, tempDirectory, false),
  /rerun with --force to replace it/,
);
portsApi.updatePort(welcomeBanner, tempDirectory, false, 'fpasoterm', true);
assert.ok(fs.existsSync(path.join(tempDirectory, 'terminal', 'welcome-banner.ts')));
assert.throws(
  () => portsApi.updatePort(portsApi.selectPort('terminal/theme'), tempDirectory, false),
  /is not installed/,
);

ports.forEach(portsApi.validatePort);
assert.equal(ports.length, 9);
assert.doesNotThrow(() => portsApi.assertPortIndexCurrent());
assert.equal(portsApi.normalizeIndexLineEndings('one\r\ntwo\rthree\n'), 'one\ntwo\nthree\n');
assert.equal(typeof portsApi.syncCheckout, 'function');
console.log('ports checks passed');
