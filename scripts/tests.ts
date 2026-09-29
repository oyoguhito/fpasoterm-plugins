const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(packageJson.scripts['port:integration:rdp-local-bridge:help'], 'node scripts/build-rdp-port.js --help');
assert.equal(packageJson.scripts['port:integration:novnc-local-bridge:help'], 'node scripts/build-novnc-port.js --help');
assert.match(fs.readFileSync(path.join(root, 'scripts', 'build-rdp-port.js'), 'utf8'), /FPASOTERM_RDP_TARGET=tcp:\/\/host:3389/);
assert.match(fs.readFileSync(path.join(root, 'scripts', 'build-novnc-port.js'), 'utf8'), /novnc-local-bridge:configure -- tcp:\/\/host:port/);
assert.match(fs.readFileSync(path.join(root, 'scripts', 'build-novnc-port.js'), 'utf8'), /Default after reset: \$\{defaultTarget\}/);
assert.match(fs.readFileSync(path.join(root, 'scripts', 'build-novnc-port.js'), 'utf8'), /Currently configured target: \$\{target\}/);
assert.match(fs.readFileSync(path.join(root, 'scripts', 'build-novnc-port.js'), 'utf8'), /const defaultTarget = 'tcp:\/\/127\.0\.0\.1:5900'/);
const portsApi = require('./ports');
const portsSource = fs.readFileSync(path.join(root, 'scripts', 'ports.ts'), 'utf8');
assert.doesNotMatch(portsSource, /command === 'install'/);
assert.doesNotMatch(portsSource, /command === 'update'/);
assert.doesNotMatch(portsSource, /command === 'uninstall'/);
const ports = portsApi.discoverPorts();
assert.equal(portsApi.readPortIndex().length, 16);
for (const identifier of [
  'appearance/amber',
  'terminal/hello',
  'terminal/welcome-banner',
  'terminal/status-banner',
  'terminal/theme',
  'appearance/teal',
  'appearance/high-contrast',
  'integration/doom-wad-inspector',
  'integration/doom-wasm-local',
  'integration/youtube-web-panel',
  'integration/novnc-local-bridge',
  'productivity/git-status',
  'productivity/plugin-search',
  'productivity/clipboard-translate',
  'productivity/session-marker',
  'integration/rdp-local-bridge',
]) {
  assert.ok(ports.some((port) => port.id === identifier));
}

const welcomeBanner = portsApi.selectPort('terminal/welcome-banner');
assert.deepEqual(
  portsApi.selectPorts('terminal/hello,terminal/welcome-banner').map((port) => port.id),
  ['terminal/hello', 'terminal/welcome-banner'],
);
assert.equal(portsApi.selectPorts('all', true).length, 16);
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
assert.deepEqual(portsApi.searchPorts('translate').map((port) => port.id), ['productivity/clipboard-translate']);
assert.deepEqual(portsApi.searchPorts('doom').map((port) => port.id), [
  'integration/doom-wad-inspector',
  'integration/doom-wasm-local',
]);
assert.equal(portsApi.searchPorts('oyoguhito').length, 16);
const doomWadInspectorSource = fs.readFileSync(
  path.join(root, 'ports', 'integration', 'doom-wad-inspector', 'plugin.ts'),
  'utf8',
);
assert.match(doomWadInspectorSource, /selectLocalAsset/);
assert.match(doomWadInspectorSource, /maxBytes: 64 \* 1024 \* 1024/);
assert.match(doomWadInspectorSource, /crypto\.subtle\.digest\('SHA-256'/);
assert.match(doomWadInspectorSource, /kind !== 'IWAD' && kind !== 'PWAD'/);
assert.match(doomWadInspectorSource, /printableHeader/);
assert.doesNotMatch(doomWadInspectorSource, /\bfetch\s*\(/);
assert.doesNotMatch(doomWadInspectorSource, /openExternalUrl/);
assert.doesNotMatch(doomWadInspectorSource, /localStorage|sessionStorage|\.path\b/);
// The native fpasoterm launcher evaluates installed .ts ports as browser
// scripts. Keep these source files JavaScript-compatible until it transpiles
// TypeScript itself.
assert.doesNotThrow(() => new Function(doomWadInspectorSource));
const doomWasmSource = fs.readFileSync(
  path.join(root, 'ports', 'integration', 'doom-wasm-local', 'plugin.ts'),
  'utf8',
);
assert.match(doomWasmSource, /WebAssembly\.Module\.imports/);
assert.match(doomWasmSource, /validateEngine/);
assert.match(doomWasmSource, /requiredImports/);
assert.match(doomWasmSource, /gameSaving: \{ sizeOfSaveGame: \(\) => 0/);
assert.match(doomWasmSource, /selectLocalAsset/);
assert.match(doomWasmSource, /maxBytes: 16 \* 1024 \* 1024/);
assert.match(doomWasmSource, /selectionStage/);
assert.match(doomWasmSource, /image\.data\[index \+ 3\] = 255/);
assert.match(doomWasmSource, /Waiting for the first rendered frame/);
assert.match(doomWasmSource, /event\.code === 'Enter' \|\| event\.code === 'NumpadEnter'/);
assert.match(doomWasmSource, /Enter: 'KEY_ENTER', Escape: 'KEY_ESCAPE'/);
assert.match(doomWasmSource, /if \(inputKey === ' ' && exports\.KEY_ENTER instanceof WebAssembly\.Global\)/);
assert.match(doomWasmSource, /event\.stopPropagation\(\)/);
assert.match(doomWasmSource, /document\.activeElement !== canvas/);
assert.doesNotMatch(doomWasmSource, /confirmClose/);
assert.match(doomWasmSource, /call_indirect to a signature that does not match/);
assert.doesNotMatch(doomWasmSource, /\bfetch\s*\(|openExternalUrl|localStorage|sessionStorage|\.path\b/);
assert.doesNotThrow(() => new Function(doomWasmSource));
const youtubeWebPanelSource = fs.readFileSync(
  path.join(root, 'ports', 'integration', 'youtube-web-panel', 'plugin.ts'),
  'utf8',
);
assert.match(youtubeWebPanelSource, /@fpasoterm-plugin allowed-origins: https:\/\/www\.youtube-nocookie\.com/);
assert.match(youtubeWebPanelSource, /openWebPanel/);
assert.match(youtubeWebPanelSource, /https:\/\/www\.youtube-nocookie\.com\/embed\//);
assert.doesNotMatch(youtubeWebPanelSource, /\bfetch\s*\(|openExternalUrl|localStorage|sessionStorage|\.path\b/);
assert.doesNotThrow(() => new Function(youtubeWebPanelSource));
assert.deepEqual(portsApi.searchPorts('rdp').map((port) => port.id), [
  'integration/rdp-local-bridge',
]);
const pluginApiDeclaration = fs.readFileSync(path.join(root, 'api', 'fpasoterm-plugin.d.ts'), 'utf8');
assert.match(pluginApiDeclaration, /allowed-tcp-targets[\s\S]*openVncBridge:/);
assert.match(pluginApiDeclaration, /system trust roots[\s\S]*openVncBridge:/);
assert.match(pluginApiDeclaration, /RDCleanPath[\s\S]*openRdpBridge:/);
assert.match(pluginApiDeclaration, /tcp:\/\/host:port[\s\S]*openRdpBridge:/);
const vncReadme = fs.readFileSync(
  path.join(root, 'ports', 'integration', 'novnc-local-bridge', 'README.md'),
  'utf8',
);
assert.match(vncReadme, /exact configured target/);
assert.match(vncReadme, /system trust store/);
assert.match(vncReadme, /no insecure override/);
const vncEntrySource = fs.readFileSync(path.join(root, 'scripts', 'novnc-plugin-entry.js'), 'utf8');
assert.match(vncEntrySource, /document\.createElement\('textarea'\)/);
assert.match(vncEntrySource, /clipboardPaste\.rows = 3/);
assert.match(vncEntrySource, /clipboardPaste\.addEventListener\('paste'/);
assert.match(vncEntrySource, /event\.clipboardData\?\.getData\('text\/plain'\)/);
assert.match(vncEntrySource, /clipboardSyncEnabled = true;\s*clipboardPaste\.disabled = false/);
assert.match(vncEntrySource, /isClipboardPasteEvent\(keyEvent\)/);
assert.match(vncEntrySource, /const normalizePointerCoordinates = \(\) =>/);
assert.match(vncEntrySource, /\(x \/ width\) \* canvas\.width/);
assert.match(vncEntrySource, /remote\._viewportLoc\.x \+ 16/);
assert.match(vncEntrySource, /\(y \/ height\) \* canvas\.height/);
assert.match(vncEntrySource, /const handledHostKeyEvents = new WeakSet\(\)/);
assert.match(vncEntrySource, /handledHostKeyEvents\.has\(keyEvent\)/);
assert.match(vncEntrySource, /clipboard local-to-remote announced bytes=/);
assert.match(vncEntrySource, /clipboard remote event bytes=/);
assert.doesNotMatch(vncEntrySource, /Enable clipboard sync/);
assert.doesNotMatch(vncEntrySource, /api\.readClipboard\(\)/);
assert.doesNotMatch(vncEntrySource, /setInterval\(/);
const rdpReadme = fs.readFileSync(
  path.join(root, 'ports', 'integration', 'rdp-local-bridge', 'README.md'),
  'utf8',
);
assert.match(rdpReadme, /TLS\s+plaintext RDP stream/);
assert.match(rdpReadme, /does not wrap the loopback WebSocket in a second TLS layer/);
const rdpEntrySource = fs.readFileSync(path.join(root, 'scripts', 'rdp-plugin-entry.js'), 'utf8');
assert.match(rdpEntrySource, /const wasmBase64 = __FPASOTERM_RDP_WASM_BASE64__;/);
assert.match(rdpEntrySource, /const target = __FPASOTERM_RDP_TARGET__;/);
assert.doesNotMatch(rdpEntrySource, /'__FPASOTERM_RDP_(?:WASM_BASE64|TARGET)__'/);
assert.match(rdpEntrySource, /IronErrorKind/);
assert.match(rdpEntrySource, /function formatRdpError\(error\)/);
assert.match(rdpEntrySource, /builder\.setCursorStyleCallbackContext\(canvas\)/);
assert.match(rdpEntrySource, /builder\.setCursorStyleCallback\(/);
assert.match(rdpEntrySource, /DeviceEvent, Extension, InputTransaction/);
assert.match(rdpEntrySource, /function rdpPointerCoordinates\(canvas, event\)/);
assert.match(rdpEntrySource, /const scale = Math\.min\(rect\.width \/ canvas\.width, rect\.height \/ canvas\.height\)/);
assert.match(rdpEntrySource, /renderedWidth/);
assert.match(rdpEntrySource, /function setupRdpInputHandlers\(canvas, session, options = \{\}\)/);
assert.match(rdpEntrySource, /DeviceEvent\.mouseButtonPressed/);
assert.match(rdpEntrySource, /requestAnimationFrame\(flushPointerMove\)/);
assert.match(rdpEntrySource, /cancelAnimationFrame\(pointerFrame\)/);
assert.match(rdpEntrySource, /const DESKTOP_WIDTH = 1280/);
assert.match(rdpEntrySource, /const DESKTOP_HEIGHT = 720/);
assert.match(rdpEntrySource, /new DesktopSize\(DESKTOP_WIDTH, DESKTOP_HEIGHT\)/);
assert.match(rdpEntrySource, /DeviceEvent\.keyPressed/);
assert.match(rdpEntrySource, /overlay\.captureKeys\?\.\(\(event\) =>/);
assert.match(rdpEntrySource, /event\.code !== 'Escape' && event\.key !== 'Escape'/);
assert.match(rdpEntrySource, /event\.type === 'keyup'.*DeviceEvent\.keyReleased/);
assert.match(rdpEntrySource, /content\.addText\('text\/plain', text\)/);
assert.match(rdpEntrySource, /const sendLocalClipboard = async \(text, logSuccess = true\) =>/);
assert.match(rdpEntrySource, /clipboardPaste\.addEventListener\('paste'/);
assert.match(rdpEntrySource, /document\.createElement\('textarea'\)/);
assert.match(rdpEntrySource, /clipboardPaste\.rows = 3/);
assert.match(rdpEntrySource, /clipboardPaste\.value = text/);
assert.match(rdpEntrySource, /event\.clipboardData\?\.getData\('text\/plain'\)/);
assert.match(rdpEntrySource, /Local clipboard sent to RDP\. Click the desktop and press Ctrl\+V/);
assert.match(rdpEntrySource, /Remote clipboard copied to the local clipboard/);
assert.doesNotMatch(rdpEntrySource, /clipboardShortcut.*event\.code === 'KeyV'/);
assert.doesNotMatch(rdpEntrySource, /function applyInputs/);
assert.doesNotMatch(rdpEntrySource, /Enable clipboard sync/);
assert.doesNotMatch(rdpEntrySource, /clipboardSync\.addEventListener/);
assert.match(rdpEntrySource, /session = await builder\.connect\(\);\s*clipboardSyncEnabled = true/);
assert.doesNotMatch(rdpEntrySource, /RDP clipboard remote update received formats=/);
assert.match(rdpEntrySource, /sendLocalClipboard\(lastLocalClipboard, false\)/);
assert.doesNotMatch(rdpEntrySource, /lastRemoteClipboard = text;\s*lastLocalClipboard = text/);
assert.doesNotMatch(rdpEntrySource, /disconnect\.addEventListener/);
assert.match(rdpEntrySource, /onClose: \(\) => \{ releaseRdpKeyCapture\(\); session\?\.shutdown\(\); \}/);
assert.doesNotMatch(rdpEntrySource, /api\.readClipboard\(\)/);
assert.doesNotMatch(rdpEntrySource, /setInterval\(/);
assert.match(rdpEntrySource, /remote update contained no supported plain text/);
assert.doesNotMatch(rdpEntrySource, /disableClipboardSyncAfterReadFailure/);
assert.match(rdpReadme, /WebView platforms deny programmatic clipboard reads/);
assert.match(rdpReadme, /Remote-to-local synchronization\s+remains automatic/);
assert.match(rdpEntrySource, /setupRdpInputHandlers\(canvas, session, \{/);
const pluginSearchSource = fs.readFileSync(
  path.join(root, 'ports', 'productivity', 'plugin-search', 'plugin.ts'),
  'utf8',
);
assert.match(pluginSearchSource, /getOfficialPluginIndex/);
assert.doesNotMatch(pluginSearchSource, /bundled ports|const catalog:\s*PortEntry/);
assert.doesNotThrow(() => new Function(pluginSearchSource));
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
ports.forEach((port) => portsApi.assertCompatible(port, port.minFpasotermVersion));
assert.throws(
  () => portsApi.validatePort({ ...welcomeBanner, author: 'person@example.com' }),
  /must be a public name or GitHub account/,
);
ports.forEach(portsApi.validatePort);
assert.equal(ports.length, 16);
assert.doesNotThrow(() => portsApi.assertPortIndexCurrent());
assert.equal(portsApi.normalizeIndexLineEndings('one\r\ntwo\rthree\n'), 'one\ntwo\nthree\n');
assert.equal(typeof portsApi.syncCheckout, 'function');
console.log('ports checks passed');
