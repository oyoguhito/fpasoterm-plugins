import init, { DesktopSize, Extension, SessionBuilder, setup } from 'ironrdp-wasm';
const wasmBase64 = '__FPASOTERM_RDP_WASM_BASE64__';

// The port build replaces this inert default with FPASOTERM_RDP_TARGET and
// writes the same exact target to the generated capability header.
const target = '__FPASOTERM_RDP_TARGET__';
const api = window.fpasotermPluginApi;

function wasmBytes() {
  const binary = atob(wasmBase64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

api.registerCommand('rdp-local-bridge', 'Open RDP local bridge (prototype)', async () => {
  if (typeof api.openRdpBridge !== 'function') {
    throw new Error('RDP local bridge requires fpasoterm 1.6.8 or later.');
  }
  const username = await api.promptText({ title: 'RDP username', message: 'Username for the configured target.', approve: 'Continue' });
  if (username === null) return;
  const domain = await api.promptText({ title: 'RDP domain', message: 'Optional; leave blank for a local account.', approve: 'Continue' });
  if (domain === null) return;
  const password = await api.promptSecret({ title: 'RDP password', message: 'Held only for this connection.', approve: 'Connect' });
  if (password === null) return;

  const overlay = api.openElementOverlay({ title: 'RDP local bridge (prototype)', width: 1280, height: 820 });
  const root = overlay.element;
  root.replaceChildren();
  root.style.cssText = 'display:flex;flex-direction:column;gap:8px;height:100%;box-sizing:border-box;padding:10px;background:#15171c;color:#eee';
  const status = document.createElement('div'); status.textContent = `Connecting to ${target}…`;
  const canvas = document.createElement('canvas'); canvas.tabIndex = 0; canvas.style.cssText = 'width:100%;flex:1;min-height:0;background:#000;outline:none;object-fit:contain';
  const disconnect = document.createElement('button'); disconnect.type = 'button'; disconnect.textContent = 'Disconnect';
  root.append(status, canvas, disconnect);
  let session = null;
  disconnect.addEventListener('click', () => { session?.shutdown(); overlay.close(); });
  try {
    const proxyAddress = await api.openRdpBridge({ target });
    await init(wasmBytes()); setup('warn');
    const builder = new SessionBuilder();
    builder.username(username); builder.password(password); builder.destination(target.replace(/^(?:tcp|tls):\/\//, ''));
    if (domain.trim()) builder.serverDomain(domain.trim());
    builder.proxyAddress(proxyAddress); builder.authToken('none');
    builder.desktopSize(new DesktopSize(1280, 720)); builder.renderCanvas(canvas);
    builder.extension(new Extension('enable_credssp', true));
    session = await builder.connect();
    const desktop = session.desktopSize(); canvas.width = desktop.width; canvas.height = desktop.height;
    status.textContent = `Connected: ${desktop.width} × ${desktop.height}`; canvas.focus();
    session.run().finally(() => { status.textContent = 'RDP session ended.'; session = null; });
  } catch (error) {
    status.textContent = `Connection failed: ${error instanceof Error ? error.message : String(error)}`;
    api.log(`RDP prototype connection failed for ${target}`);
  }
});
