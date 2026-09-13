import RFB from '@novnc/novnc/lib/rfb.js';

const api = window.fpasotermPluginApi;

api.registerCommand('novnc-local-bridge', 'Open noVNC local bridge (test)', async () => {
  const overlay = api.openElementOverlay({ title: 'noVNC local bridge (test)', width: 1100, height: 720 });
  const status = document.createElement('p');
  const toolbar = document.createElement('div');
  const zoomOut = document.createElement('button');
  const zoomIn = document.createElement('button');
  const fit = document.createElement('button');
  const panLeft = document.createElement('button');
  const panUp = document.createElement('button');
  const panDown = document.createElement('button');
  const panRight = document.createElement('button');
  const screen = document.createElement('div');
  // Do not rely on percentage-height calculations here.  A noVNC RFB creates
  // its canvas inside this element, and a zero-height host looks like a black
  // remote desktop even when the connection itself succeeded.
  // Preserve the height that openElementOverlay set on this content element.
  // Assigning cssText here would clear that inline height and leave noVNC with
  // a 0px-high viewport.
  overlay.element.style.display = 'flex';
  overlay.element.style.flexDirection = 'column';
  overlay.element.style.overflow = 'hidden';
  status.style.cssText = 'flex:1;margin:0;padding:8px;color:#d8e7f5;font:13px ui-monospace,monospace';
  toolbar.style.cssText = 'display:flex;flex:0 0 auto;align-items:center;gap:6px;background:#17212b';
  screen.style.cssText = 'flex:1 1 auto;min-height:0;width:100%;overflow:auto;background:#000';
  for (const [button, label] of [
    [zoomOut, 'Zoom −'], [zoomIn, 'Zoom +'], [fit, 'Fit'],
    [panLeft, '←'], [panUp, '↑'], [panDown, '↓'], [panRight, '→'],
  ]) {
    button.type = 'button'; button.textContent = label;
    button.style.cssText = 'padding:5px 7px;border:1px solid #59738c;border-radius:4px;background:#263b4e;color:#edf5fc';
  }
  panLeft.title = 'Pan left'; panUp.title = 'Pan up';
  panDown.title = 'Pan down'; panRight.title = 'Pan right';
  toolbar.append(status, zoomOut, zoomIn, fit, panLeft, panUp, panDown, panRight);
  overlay.element.replaceChildren(toolbar, screen);
  status.textContent = 'Waiting for connection confirmation…';
  let rfb;
  let connected = false;
  let zoom = 1;
  let dragPan = null;
  const panViewport = () => screen.firstElementChild || screen;
  const enablePan = () => {
    if (!rfb) return null;
    rfb.scaleViewport = false;
    // Without clipping, noVNC keeps the complete native framebuffer in its
    // flex layout and there is no scrollable viewport to pan.  Clipping makes
    // the panel a viewport over the virtual desktop, including a second
    // monitor positioned to the right or below the first one.
    rfb.clipViewport = true;
    screen.style.zoom = '1';
    return panViewport();
  };
  const panBy = (left, top) => {
    const viewport = enablePan();
    if (!viewport) return;
    viewport.scrollBy({ left, top, behavior: 'smooth' });
    status.textContent = 'Panning at 100%. Hold Alt and drag to pan with the mouse.';
  };
  const reportFramebuffer = (stage) => {
    const canvas = screen.querySelector('canvas');
    const viewport = `${screen.clientWidth}x${screen.clientHeight}`;
    const framebuffer = canvas ? `${canvas.width}x${canvas.height}` : 'not created';
    const message = `noVNC ${stage}: viewport=${viewport}, framebuffer=${framebuffer}`;
    api.log(message);
    return { canvas, viewport, framebuffer };
  };
  const applyZoom = () => {
    if (!rfb) return;
    rfb.scaleViewport = false;
    screen.style.zoom = String(zoom);
    status.textContent = `Manual zoom: ${Math.round(zoom * 100)}%`;
  };
  zoomOut.addEventListener('click', () => { zoom = Math.max(0.5, zoom - 0.1); applyZoom(); });
  zoomIn.addEventListener('click', () => { zoom = Math.min(2.5, zoom + 0.1); applyZoom(); });
  fit.addEventListener('click', () => {
    zoom = 1;
    screen.style.zoom = '1';
    if (rfb) {
      rfb.clipViewport = false;
      rfb.scaleViewport = true;
    }
    status.textContent = 'Fit to panel.';
  });
  panLeft.addEventListener('click', () => panBy(-Math.max(160, screen.clientWidth * 0.7), 0));
  panRight.addEventListener('click', () => panBy(Math.max(160, screen.clientWidth * 0.7), 0));
  panUp.addEventListener('click', () => panBy(0, -Math.max(120, screen.clientHeight * 0.7)));
  panDown.addEventListener('click', () => panBy(0, Math.max(120, screen.clientHeight * 0.7)));
  // Normal pointer drags are sent to the remote desktop.  Alt+drag is kept
  // local so users can pan a multi-monitor framebuffer without losing remote
  // drag-and-drop support.
  screen.addEventListener('pointerdown', (event) => {
    if (!event.altKey || event.button !== 0 || !rfb) return;
    const viewport = enablePan();
    if (!viewport) return;
    event.preventDefault(); event.stopPropagation();
    dragPan = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    screen.setPointerCapture?.(event.pointerId);
    screen.style.cursor = 'grabbing';
  }, true);
  screen.addEventListener('pointermove', (event) => {
    if (!dragPan || dragPan.pointerId !== event.pointerId) return;
    const viewport = panViewport();
    viewport.scrollLeft = dragPan.left - (event.clientX - dragPan.x);
    viewport.scrollTop = dragPan.top - (event.clientY - dragPan.y);
    event.preventDefault(); event.stopPropagation();
  }, true);
  const stopDragPan = (event) => {
    if (!dragPan || dragPan.pointerId !== event.pointerId) return;
    screen.releasePointerCapture?.(event.pointerId);
    dragPan = null; screen.style.cursor = '';
    event.preventDefault(); event.stopPropagation();
  };
  screen.addEventListener('pointerup', stopDragPan, true);
  screen.addEventListener('pointercancel', stopDragPan, true);
  try {
    // This exact target is declared in the installed plugin header. To connect
    // elsewhere, make a reviewed plugin with a matching target declaration.
    const bridgeUrl = await api.openVncBridge({ target: 'tcp://127.0.0.1:59999' });
    status.textContent = 'Connecting to the configured verification target through the local bridge…';
    const username = await api.promptText({
      title: 'VNC username',
      message: 'Enter the VNC username. Leave it blank when the server uses password-only authentication. This value is not saved.',
      approve: 'Continue',
    });
    if (username === null) { status.textContent = 'VNC username entry cancelled.'; return; }
    const password = await api.promptSecret({
      title: 'VNC password',
      message: 'Enter the VNC password. This value is held only in memory and is not saved or logged.',
      approve: 'Connect',
    });
    if (password === null) { status.textContent = 'VNC password entry cancelled.'; return; }
    rfb = new RFB(screen, bridgeUrl, { credentials: { username, password } });
    rfb.scaleViewport = true;
    rfb.resizeSession = false;
    reportFramebuffer('RFB created');
    rfb.addEventListener('connect', (event) => {
      connected = true;
      api.dismissPrompts();
      status.textContent = `Connected: ${event.detail?.name || 'VNC server'}; waiting for remote framebuffer…`;
      overlay.focus();
      requestAnimationFrame(() => {
        rfb.scaleViewport = true;
        const details = reportFramebuffer('connected');
        status.textContent = `Connected: ${event.detail?.name || 'VNC server'} (${details.framebuffer})`;
      });
      window.setTimeout(() => {
        const details = reportFramebuffer('after connection');
        if (!details.canvas || details.canvas.width === 0 || details.canvas.height === 0) {
          status.textContent = `Connected, but no framebuffer yet (${details.framebuffer}). Check Plugin Activity.`;
        }
      }, 750);
    });
    rfb.addEventListener('disconnect', (event) => {
      status.textContent = event.detail?.clean ? 'Disconnected.' : 'Connection closed unexpectedly. Check Plugin Activity.';
      api.log(`noVNC disconnected: clean=${Boolean(event.detail?.clean)}`);
    });
    rfb.addEventListener('securityfailure', (event) => {
      api.log(`noVNC security failure: ${JSON.stringify(event.detail || {})}`);
      status.textContent = 'VNC security negotiation failed. Check Plugin Activity.';
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
