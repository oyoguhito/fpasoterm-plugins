import RFB from '@novnc/novnc/lib/rfb.js';

const api = window.fpasotermPluginApi;

api.registerCommand('novnc-local-bridge', 'Open noVNC local bridge (test)', async () => {
  const overlay = api.openElementOverlay({ title: 'noVNC local bridge (test)', width: 1100, height: 720 });
  const status = document.createElement('p');
  status.style.cssText = 'margin:0;padding:8px;color:#d8e7f5;background:#17212b;font:13px ui-monospace,monospace';
  const screen = document.createElement('div');
  screen.style.cssText = 'height:calc(100% - 38px);overflow:hidden;background:#000';
  overlay.element.replaceChildren(status, screen);
  status.textContent = 'Waiting for connection confirmation…';
  let rfb;
  let connected = false;
  try {
    // This exact target is declared in the installed plugin header. To connect
    // elsewhere, make a reviewed plugin with a matching target declaration.
    const bridgeUrl = await api.openVncBridge({ target: 'tcp://127.0.0.1:59999' });
    status.textContent = 'Connecting to the configured verification target through the local bridge…';
    rfb = new RFB(screen, bridgeUrl, { credentials: {} });
    rfb.scaleViewport = true;
    rfb.resizeSession = false;
    rfb.addEventListener('connect', (event) => {
      connected = true;
      api.dismissPrompts();
      status.textContent = `Connected: ${event.detail?.name || 'VNC server'}`;
      overlay.focus();
    });
    rfb.addEventListener('disconnect', (event) => {
      status.textContent = event.detail?.clean ? 'Disconnected.' : 'Connection closed unexpectedly. Check Plugin Activity.';
    });
    rfb.addEventListener('credentialsrequired', async (event) => {
      if (connected) {
        api.log('noVNC ignored a credential request received after connection');
        return;
      }
      const types = Array.isArray(event.detail?.types) ? event.detail.types : ['password'];
      const credentials = {};
      for (const type of types) {
        const isPassword = type === 'password';
        const value = await (isPassword ? api.promptSecret : api.promptText)({
          title: `VNC ${type} required`,
          message: `The VNC server requested ${type}. It is held only in memory and is not saved or logged.`,
          approve: `Send ${type}`,
        });
        if (value === null) {
          status.textContent = `VNC ${type} entry cancelled.`;
          if (!connected) rfb.disconnect();
          return;
        }
        credentials[type] = value;
      }
      if (!connected) rfb.sendCredentials(credentials);
    });
  } catch (error) {
    status.textContent = `Could not start noVNC: ${String(error)}`;
    api.log(`integration/novnc-local-bridge failed: ${String(error)}`);
  }
});
