const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const portsApi = require('./ports');
const ports = portsApi.discoverPorts();
for (const identifier of ['terminal/welcome-banner', 'terminal/status-banner', 'terminal/theme']) {
  assert.ok(ports.some((port) => port.id === identifier));
}

const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'fpasoterm-plugins-'));
const welcomeBanner = portsApi.selectPort('terminal/welcome-banner');
portsApi.installPort(welcomeBanner, tempDirectory, false);
assert.ok(fs.existsSync(path.join(tempDirectory, 'terminal', 'welcome-banner.ts')));

ports.forEach(portsApi.validatePort);
assert.equal(ports.length, 3);
console.log('ports checks passed');
