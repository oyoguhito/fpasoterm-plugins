import init, { DesktopSize, DeviceEvent, Extension, InputTransaction, IronErrorKind, RotationUnit, SessionBuilder, setup } from 'ironrdp-wasm';
const wasmBase64 = __FPASOTERM_RDP_WASM_BASE64__;

// The port build replaces this inert default with FPASOTERM_RDP_TARGET and
// writes the same exact target to the generated capability header.
const target = __FPASOTERM_RDP_TARGET__;
const api = window.fpasotermPluginApi;

function wasmBytes() {
  const binary = atob(wasmBase64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

// wasm-bindgen rejects with IronError objects rather than JavaScript Error.
// Do not collapse their useful kind/details into "[object Object]".
function formatRdpError(error) {
  if (error instanceof Error) return error.message || error.name;
  if (!error || typeof error !== 'object') return String(error);
  const details = [];
  try {
    if (typeof error.kind === 'function') {
      const kind = error.kind();
      details.push(`IronRDP ${IronErrorKind[kind] || `error ${kind}`}`);
    }
  } catch (_) {}
  try {
    if (typeof error.rdcleanpathDetails === 'function') {
      const cleanPath = error.rdcleanpathDetails();
      if (cleanPath) {
        for (const field of ['httpStatusCode', 'tlsAlertCode', 'wsaErrorCode']) {
          if (cleanPath[field] !== undefined) details.push(`${field}=${cleanPath[field]}`);
        }
      }
    }
  } catch (_) {}
  try {
    if (typeof error.backtrace === 'function') {
      const backtrace = error.backtrace().trim();
      if (backtrace) details.push(backtrace.slice(0, 500));
    }
  } catch (_) {}
  if (typeof error.message === 'string' && error.message) details.unshift(error.message);
  return details.join('; ') || error.constructor?.name || 'unknown IronRDP error';
}

// PS/2 Set 1 keyboard codes expected by IronRDP.  The mapping follows the
// upstream ironrdp-wasm example input handler (MIT; see this port's third-party
// notice), but the listeners remain scoped to this plugin canvas.
const SCANCODE_MAP = {
  Escape: 0x01, Digit1: 0x02, Digit2: 0x03, Digit3: 0x04, Digit4: 0x05, Digit5: 0x06,
  Digit6: 0x07, Digit7: 0x08, Digit8: 0x09, Digit9: 0x0a, Digit0: 0x0b, Minus: 0x0c,
  Equal: 0x0d, Backspace: 0x0e, Tab: 0x0f,
  KeyQ: 0x10, KeyW: 0x11, KeyE: 0x12, KeyR: 0x13, KeyT: 0x14, KeyY: 0x15,
  KeyU: 0x16, KeyI: 0x17, KeyO: 0x18, KeyP: 0x19, BracketLeft: 0x1a, BracketRight: 0x1b,
  Enter: 0x1c, ControlLeft: 0x1d,
  KeyA: 0x1e, KeyS: 0x1f, KeyD: 0x20, KeyF: 0x21, KeyG: 0x22, KeyH: 0x23,
  KeyJ: 0x24, KeyK: 0x25, KeyL: 0x26, Semicolon: 0x27, Quote: 0x28, Backquote: 0x29,
  ShiftLeft: 0x2a, Backslash: 0x2b,
  KeyZ: 0x2c, KeyX: 0x2d, KeyC: 0x2e, KeyV: 0x2f, KeyB: 0x30, KeyN: 0x31,
  KeyM: 0x32, Comma: 0x33, Period: 0x34, Slash: 0x35, ShiftRight: 0x36,
  NumpadMultiply: 0x37, AltLeft: 0x38, Space: 0x39, CapsLock: 0x3a,
  F1: 0x3b, F2: 0x3c, F3: 0x3d, F4: 0x3e, F5: 0x3f, F6: 0x40,
  F7: 0x41, F8: 0x42, F9: 0x43, F10: 0x44, NumLock: 0x45, ScrollLock: 0x46,
  Numpad7: 0x47, Numpad8: 0x48, Numpad9: 0x49, NumpadSubtract: 0x4a,
  Numpad4: 0x4b, Numpad5: 0x4c, Numpad6: 0x4d, NumpadAdd: 0x4e,
  Numpad1: 0x4f, Numpad2: 0x50, Numpad3: 0x51, Numpad0: 0x52, NumpadDecimal: 0x53,
  F11: 0x57, F12: 0x58,
  NumpadEnter: 0xe01c, ControlRight: 0xe01d, NumpadDivide: 0xe035, PrintScreen: 0xe037,
  AltRight: 0xe038, Home: 0xe047, ArrowUp: 0xe048, PageUp: 0xe049, ArrowLeft: 0xe04b,
  ArrowRight: 0xe04d, End: 0xe04f, ArrowDown: 0xe050, PageDown: 0xe051, Insert: 0xe052,
  Delete: 0xe053, MetaLeft: 0xe05b, MetaRight: 0xe05c, ContextMenu: 0xe05d, Pause: 0xe11d45,
};

function applyInput(session, event) {
  const transaction = new InputTransaction();
  transaction.addEvent(event);
  session.applyInputs(transaction);
}

function setupRdpInputHandlers(canvas, session) {
  canvas.addEventListener('keydown', (event) => {
    event.preventDefault(); event.stopPropagation();
    const scancode = SCANCODE_MAP[event.code];
    if (scancode !== undefined) applyInput(session, DeviceEvent.keyPressed(scancode));
  });
  canvas.addEventListener('keyup', (event) => {
    event.preventDefault(); event.stopPropagation();
    const scancode = SCANCODE_MAP[event.code];
    if (scancode !== undefined) applyInput(session, DeviceEvent.keyReleased(scancode));
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.round((event.clientX - rect.left) * canvas.width / rect.width);
    const y = Math.round((event.clientY - rect.top) * canvas.height / rect.height);
    applyInput(session, DeviceEvent.mouseMove(x, y));
  });
  canvas.addEventListener('mousedown', (event) => {
    event.preventDefault(); event.stopPropagation(); canvas.focus();
    applyInput(session, DeviceEvent.mouseButtonPressed(event.button));
  });
  canvas.addEventListener('mouseup', (event) => {
    event.preventDefault(); event.stopPropagation();
    applyInput(session, DeviceEvent.mouseButtonReleased(event.button));
  });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault(); event.stopPropagation();
    if (event.deltaY) applyInput(session, DeviceEvent.wheelRotations(true, event.deltaY > 0 ? -1 : 1, RotationUnit.Line));
    if (event.deltaX) applyInput(session, DeviceEvent.wheelRotations(false, event.deltaX > 0 ? -1 : 1, RotationUnit.Line));
  }, { passive: false });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
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
    // IronRDP requires a cursor callback before connect(). Keep the callback
    // local to the canvas so a remote cursor never changes the terminal UI.
    builder.setCursorStyleCallbackContext(canvas);
    builder.setCursorStyleCallback((style) => { canvas.style.cursor = style || 'default'; });
    session = await builder.connect();
    const desktop = session.desktopSize(); canvas.width = desktop.width; canvas.height = desktop.height;
    setupRdpInputHandlers(canvas, session);
    status.textContent = `Connected: ${desktop.width} × ${desktop.height} — click the desktop to control it.`; canvas.focus();
    session.run().finally(() => { status.textContent = 'RDP session ended.'; session = null; });
  } catch (error) {
    const detail = formatRdpError(error);
    status.textContent = `Connection failed: ${detail}`;
    api.log(`RDP prototype connection failed for ${target}: ${detail}`);
  }
});
