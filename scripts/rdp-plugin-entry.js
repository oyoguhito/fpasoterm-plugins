import init, { ClipboardData, DesktopSize, DeviceEvent, Extension, InputTransaction, IronErrorKind, RotationUnit, SessionBuilder, setup } from 'ironrdp-wasm';
const wasmBase64 = __FPASOTERM_RDP_WASM_BASE64__;

// The port build replaces this inert default with FPASOTERM_RDP_TARGET and
// writes the same exact target to the generated capability header.
const target = __FPASOTERM_RDP_TARGET__;
const api = window.fpasotermPluginApi;
const DESKTOP_WIDTH = 1280;
const DESKTOP_HEIGHT = 720;

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

// object-fit: contain can place letterbox space inside the canvas element.
// Translate browser coordinates from the rendered remote-desktop rectangle,
// rather than the wider element rectangle, before sending RDP coordinates.
function rdpPointerCoordinates(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height || !canvas.width || !canvas.height) return null;
  const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
  const renderedWidth = canvas.width * scale;
  const renderedHeight = canvas.height * scale;
  const localX = event.clientX - rect.left - (rect.width - renderedWidth) / 2;
  const localY = event.clientY - rect.top - (rect.height - renderedHeight) / 2;
  if (localX < 0 || localY < 0 || localX > renderedWidth || localY > renderedHeight) return null;
  return {
    x: Math.min(canvas.width - 1, Math.max(0, Math.round(localX / scale))),
    y: Math.min(canvas.height - 1, Math.max(0, Math.round(localY / scale))),
  };
}

function setupRdpInputHandlers(canvas, session, options = {}) {
  let pendingPointerMove = null;
  let pointerFrame = 0;
  const flushPointerMove = () => {
    pointerFrame = 0;
    const coordinates = pendingPointerMove;
    pendingPointerMove = null;
    if (coordinates) applyInput(session, DeviceEvent.mouseMove(coordinates.x, coordinates.y));
  };
  canvas.addEventListener('keydown', (event) => {
    const clipboardShortcut = (event.ctrlKey || event.metaKey) && !event.altKey;
    event.preventDefault(); event.stopPropagation();
    const scancode = SCANCODE_MAP[event.code];
    if (scancode !== undefined) applyInput(session, DeviceEvent.keyPressed(scancode));
    if (clipboardShortcut && event.code === 'KeyC' && options.clipboardSyncEnabled?.()) {
      options.remoteCopyStarted?.();
    }
  });
  canvas.addEventListener('keyup', (event) => {
    event.preventDefault(); event.stopPropagation();
    const scancode = SCANCODE_MAP[event.code];
    if (scancode !== undefined) applyInput(session, DeviceEvent.keyReleased(scancode));
  });
  canvas.addEventListener('mousemove', (event) => {
    const coordinates = rdpPointerCoordinates(canvas, event);
    if (!coordinates) return;
    // High-DPI pointing devices can emit hundreds of events per second. Each
    // applyInputs call crosses the JS/Wasm boundary and creates an RDP input
    // transaction, which can starve canvas painting. Keep only the newest
    // position and send at most one move per rendered browser frame.
    pendingPointerMove = coordinates;
    if (!pointerFrame) pointerFrame = requestAnimationFrame(flushPointerMove);
  });
  canvas.addEventListener('mousedown', (event) => {
    event.preventDefault(); event.stopPropagation(); canvas.focus();
    const coordinates = rdpPointerCoordinates(canvas, event);
    if (pointerFrame) cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    pendingPointerMove = null;
    if (coordinates) applyInput(session, DeviceEvent.mouseMove(coordinates.x, coordinates.y));
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

// RDP clipboard redirection carries multiple formats.  This reviewed port
// intentionally accepts only bounded plain text, which keeps clipboard data
// out of diagnostics and avoids transferring files, HTML, or binary payloads.
const MAX_CLIPBOARD_BYTES = 1024 * 1024;
function boundedClipboardText(value) {
  const text = String(value || '');
  return new TextEncoder().encode(text).byteLength <= MAX_CLIPBOARD_BYTES ? text : null;
}

function remotePlainText(content) {
  for (const item of content?.items?.() || []) {
    const mimeType = item.mimeType?.().toLowerCase();
    if (mimeType === 'text/plain' || mimeType === 'text/plain;charset=utf-8' || mimeType === 'text') {
      const value = item.value?.();
      if (typeof value === 'string') return boundedClipboardText(value);
    }
  }
  return '';
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

  let session = null;
  let releaseRdpKeyCapture = () => {};
  const overlay = api.openElementOverlay({
    title: 'RDP local bridge (prototype)', width: 1280, height: 820,
    onClose: () => { releaseRdpKeyCapture(); session?.shutdown(); },
  });
  const root = overlay.element;
  root.replaceChildren();
  root.style.cssText = 'display:flex;flex-direction:column;gap:8px;height:100%;box-sizing:border-box;padding:10px;background:#15171c;color:#eee';
  const status = document.createElement('div'); status.textContent = `Connecting to ${target}…`;
  const canvas = document.createElement('canvas'); canvas.tabIndex = 0; canvas.style.cssText = 'width:100%;flex:1;min-height:0;background:#000;outline:none;object-fit:contain';
  const clipboardSync = document.createElement('button'); clipboardSync.type = 'button'; clipboardSync.textContent = 'Enable clipboard sync';
  clipboardSync.title = 'Share plain text clipboard with this remote desktop while this connection is open';
  const clipboardPaste = document.createElement('input'); clipboardPaste.type = 'text';
  clipboardPaste.placeholder = 'Local → RDP: click here, then press Ctrl+V';
  clipboardPaste.title = 'Uses a user-initiated paste event when this WebView blocks clipboard reads';
  clipboardPaste.disabled = true;
  root.append(status, canvas, clipboardSync, clipboardPaste);
  let clipboardSyncEnabled = false;
  let lastLocalClipboard = '';
  let lastRemoteClipboard = '';
  const setClipboardSyncAppearance = () => {
    clipboardSync.textContent = clipboardSyncEnabled ? 'Disable clipboard sync' : 'Enable clipboard sync';
    clipboardSync.style.background = clipboardSyncEnabled ? '#2d7d46' : '';
    clipboardSync.setAttribute('aria-pressed', String(clipboardSyncEnabled));
    clipboardPaste.disabled = !clipboardSyncEnabled;
  };
  const sendLocalClipboard = async (text, logSuccess = true) => {
    if (!clipboardSyncEnabled || !session || !text) return;
    const content = new ClipboardData();
    try {
      // IronRDP and Windows advertise the generic plain-text format here.
      // Adding only a charset-qualified MIME type can leave the remote side
      // with no format it recognises and therefore no data request.
      content.addText('text/plain', text);
      await session.onClipboardPaste(content);
      if (logSuccess) api.log(`RDP clipboard local-to-remote synced bytes=${new TextEncoder().encode(text).byteLength}`);
    } finally {
      content.free?.();
    }
  };
  clipboardPaste.addEventListener('paste', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!clipboardSyncEnabled || !session) return;
    const text = boundedClipboardText(event.clipboardData?.getData('text/plain') || '');
    if (text === null) {
      api.log('RDP clipboard sync skipped local text over 1048576 bytes');
      return;
    }
    if (!text) {
      api.log('RDP clipboard paste event contained no plain text');
      return;
    }
    try {
      await sendLocalClipboard(text);
      lastLocalClipboard = text;
      status.textContent = 'Local clipboard sent to RDP. Click the desktop and press Ctrl+V.';
      canvas.focus();
    } catch (error) {
      api.log(`RDP clipboard local announce failed: ${error}`);
    }
  });
  clipboardSync.addEventListener('click', () => {
    if (!session) {
      status.textContent = 'Connect before enabling clipboard sync.';
      return;
    }
    clipboardSyncEnabled = !clipboardSyncEnabled;
    // Changing focus between the remote canvas and local clipboard controls can
    // prevent a browser keyup from reaching the canvas. Clear remote modifier
    // state before entering or leaving clipboard mode.
    session.releaseAllInputs();
    setClipboardSyncAppearance();
    if (clipboardSyncEnabled) {
      status.textContent = 'Clipboard sync enabled. For local → RDP, use the Ctrl+V field below.';
      clipboardPaste.focus();
    } else {
      status.textContent = 'Clipboard sync disabled for this connection.';
    }
  });
  setClipboardSyncAppearance();
  try {
    const proxyAddress = await api.openRdpBridge({ target });
    await init(wasmBytes()); setup('warn');
    const builder = new SessionBuilder();
    builder.username(username); builder.password(password); builder.destination(target.replace(/^(?:tcp|tls):\/\//, ''));
    if (domain.trim()) builder.serverDomain(domain.trim());
    builder.proxyAddress(proxyAddress); builder.authToken('none');
    builder.desktopSize(new DesktopSize(DESKTOP_WIDTH, DESKTOP_HEIGHT)); builder.renderCanvas(canvas);
    builder.extension(new Extension('enable_credssp', true));
    builder.forceClipboardUpdateCallback(async () => {
      // CLIPRDR is announce-then-request. Re-send the last value already
      // announced instead of attempting a new WebView read while RDP has focus.
      try { await sendLocalClipboard(lastLocalClipboard, false); }
      catch (error) { api.log(`RDP clipboard cached update failed: ${error}`); }
    });
    builder.remoteClipboardChangedCallback(async (content) => {
      const mimeTypes = Array.from(content?.items?.() || [], (item) => item.mimeType?.() || 'unknown');
      if (!clipboardSyncEnabled) return;
      const text = remotePlainText(content);
      if (text === null) {
        api.log('RDP clipboard remote-to-local skipped text over 1048576 bytes');
        return;
      }
      if (!text) {
        api.log(`RDP clipboard remote update contained no supported plain text formats=${mimeTypes.join(',') || 'none'}`);
        return;
      }
      if (text === lastRemoteClipboard) return;
      try {
        await api.writeClipboard(text);
        lastRemoteClipboard = text;
        status.textContent = 'Remote clipboard copied to the local clipboard.';
        api.log(`RDP clipboard remote-to-local synced bytes=${new TextEncoder().encode(text).byteLength}`);
      } catch (error) {
        api.log(`RDP clipboard remote write failed: ${error}`);
      }
    });
    // IronRDP requires a cursor callback before connect(). Keep the callback
    // local to the canvas so a remote cursor never changes the terminal UI.
    builder.setCursorStyleCallbackContext(canvas);
    builder.setCursorStyleCallback((style) => { canvas.style.cursor = style || 'default'; });
    session = await builder.connect();
    const desktop = session.desktopSize(); canvas.width = desktop.width; canvas.height = desktop.height;
    setupRdpInputHandlers(canvas, session, {
      clipboardSyncEnabled: () => clipboardSyncEnabled,
      remoteCopyStarted: () => { status.textContent = 'Waiting for the remote clipboard…'; },
    });
    // `openElementOverlay` normally interprets Escape as Close. Claim Escape
    // before that host handler and forward both its press and release to RDP.
    // The host Close control is the only close action and invokes onClose,
    // which shuts down the RDP session before removing the overlay.
    releaseRdpKeyCapture = overlay.captureKeys?.((event) => {
      if (event.code !== 'Escape' && event.key !== 'Escape') return false;
      const scancode = SCANCODE_MAP[event.code];
      if (scancode === undefined) return true;
      if (event.type === 'keydown') applyInput(session, DeviceEvent.keyPressed(scancode));
      if (event.type === 'keyup') applyInput(session, DeviceEvent.keyReleased(scancode));
      return true;
    }) || (() => {});
    status.textContent = `Connected: ${desktop.width} × ${desktop.height} — click the desktop to control it.`; canvas.focus();
    session.run().finally(() => { releaseRdpKeyCapture(); clipboardSyncEnabled = false; setClipboardSyncAppearance(); status.textContent = 'RDP session ended.'; session = null; });
  } catch (error) {
    const detail = formatRdpError(error);
    status.textContent = `Connection failed: ${detail}`;
    api.log(`RDP prototype connection failed for ${target}: ${detail}`);
  }
});
