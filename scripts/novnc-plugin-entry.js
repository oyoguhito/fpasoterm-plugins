import RFB from '@novnc/novnc/lib/rfb.js';
import Keysyms from '@novnc/novnc/lib/input/keysym.js';
import Crypto from '@novnc/novnc/lib/crypto/crypto.js';

const api = window.fpasotermPluginApi;
// Use modern RFB negotiation by default. Some historical Vine Server releases
// stop before sending the security-type list unless the client negotiates RFB
// 3.3; a port author can opt a private-target build into that compatibility
// mode with `configure -- ... --rfb-3.3`.
const forceRfb33 = false;

api.registerCommand('novnc-local-bridge', 'Open noVNC local bridge (test)', async () => {
  // Vine maps X11 Super/Meta to macOS Option (for example +V produces √).
  // Its macOS Command key is exposed as X11 Alt.
  const remoteSuperKeysym = forceRfb33 ? Keysyms.XK_Alt_L : Keysyms.XK_Super_L;
  const remoteSuperCode = forceRfb33 ? 'AltLeft' : 'MetaLeft';
  const remoteOptionKeysym = forceRfb33 ? Keysyms.XK_Super_L : Keysyms.XK_Alt_L;
  const remoteOptionCode = forceRfb33 ? 'MetaLeft' : 'AltLeft';
  const overlay = api.openElementOverlay({ title: 'noVNC local bridge (test)', width: 1100, height: 720 });
  const status = document.createElement('p');
  const toolbar = document.createElement('div');
  const zoomOut = document.createElement('button');
  const zoomIn = document.createElement('button');
  const fit = document.createElement('button');
  const overview = document.createElement('button');
  const panLeft = document.createElement('button');
  const panUp = document.createElement('button');
  const panDown = document.createElement('button');
  const panRight = document.createElement('button');
  const metaNext = document.createElement('button');
  const ctrlSpace = document.createElement('button');
  const shortcuts = document.createElement('button');
  const resetKeys = document.createElement('button');
  const clipboardPaste = document.createElement('textarea');
  const control = document.createElement('button');
  const alt = document.createElement('button');
  const shift = document.createElement('button');
  const superKey = document.createElement('button');
  const escapeKey = document.createElement('button');
  const screen = document.createElement('div');
  const panCapture = document.createElement('div');
  const navigator = document.createElement('canvas');
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
  toolbar.style.cssText = 'display:flex;flex:0 0 auto;flex-wrap:wrap;align-items:center;gap:6px;background:#17212b';
  screen.style.cssText = 'position:relative;flex:1 1 auto;min-height:0;width:100%;overflow:hidden;background:#000';
  panCapture.style.cssText = 'display:none;position:absolute;inset:0;z-index:10;cursor:grab;touch-action:none';
  navigator.width = 220; navigator.height = 124;
  navigator.style.cssText = 'display:none;position:absolute;right:12px;bottom:12px;z-index:20;width:220px;height:124px;border:2px solid #9ac7ee;background:#111;cursor:crosshair';
  for (const [button, label] of [
    [zoomOut, 'Zoom −'], [zoomIn, 'Zoom +'], [fit, 'Fit'], [overview, 'Overview'],
    [panLeft, '←'], [panUp, '↑'], [panDown, '↓'], [panRight, '→'],
    [metaNext, 'Command / Windows'], [shortcuts, 'Shortcuts'], [resetKeys, 'Reset keys'],
  ]) {
    button.type = 'button'; button.textContent = label;
    button.style.cssText = 'padding:5px 7px;border:1px solid #59738c;border-radius:4px;background:#263b4e;color:#edf5fc';
  }
  panLeft.title = 'Pan left'; panUp.title = 'Pan up';
  panDown.title = 'Pan down'; panRight.title = 'Pan right';
  overview.title = 'Show a clickable overview of the complete remote desktop';
  metaNext.title = 'Apply the remote Command/Windows modifier to the next key only';
  shortcuts.title = 'Open remote Ctrl, Alt, Shift, and Super shortcut controls';
  resetKeys.title = 'Release remote modifier keys if a VNC server has left Ctrl, Shift, Alt, or Command/Windows stuck';
  toolbar.append(status, zoomOut, zoomIn, fit, overview, panLeft, panUp, panDown, panRight, metaNext, shortcuts, resetKeys);
  clipboardPaste.rows = 3;
  clipboardPaste.placeholder = 'Local → VNC: click here, then press Ctrl+V';
  clipboardPaste.title = 'Uses a user-initiated paste event when this WebView blocks clipboard reads';
  clipboardPaste.spellcheck = false;
  clipboardPaste.disabled = true;
  clipboardPaste.style.cssText = 'box-sizing:border-box;flex:0 0 auto;width:100%;min-height:4.5em;resize:vertical';
  screen.append(panCapture, navigator);
  overlay.element.replaceChildren(toolbar, screen, clipboardPaste);
  status.textContent = 'Waiting for connection confirmation…';
  let rfb;
  let connected = false;
  let zoom = 1;
  // noVNC only supports its automatic Fit scale or its native 100% scale.
  // Keep this separate from `zoom`: it records that this plugin owns the
  // Display scale and must restore it after noVNC handles a layout change.
  let manualZoomActive = false;
  let manualZoomRestoreQueued = false;
  let dragPan = null;
  let lastPointer = { x: 24, y: 24 };
  let prefixTimer = null;
  let prefixPalette = null;
  let prefixShield = null;
  let removePrefixListener = () => {};
  let releaseHostKeyCapture = () => {};
  let releaseRemotePointerCapture = () => {};
  let pausedPointerHandlers = null;
  let paletteViewOnly = null;
  let pausedSendMouse = null;
  let ctrlBPrefixUntil = 0;
  let suppressCtrlBPrefixKeyup = false;
  const handledHostKeyEvents = new WeakSet();
  // Clipboard text is never logged or persisted. Local text is accepted only
  // through this connection-scoped textarea's user-initiated paste event, so
  // no clipboard polling competes with VNC rendering or remote input.
  const maxClipboardBytes = 1024 * 1024;
  let clipboardSyncEnabled = false;
  let lastRemoteClipboard = '';
  let remotePasteTimer = null;
  let metaNextArmed = false;
  let serverVerificationInProgress = false;
  let connectionFailure = '';
  // RA2ne diagnostics intentionally expose no key material, random values,
  // credentials, or raw traffic.  They provide enough connection-scoped
  // identity and SHA-256 digests for the VNC server to compare the public
  // client key and encrypted server-random byte-for-byte with what noVNC
  // received through the loopback WebSocket bridge.
  const ra2ConnectionId = `ra2-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  let ra2State = null;
  let ra2StateId = 'none';
  let ra2StateSequence = 0;
  let ra2Phase = 'not-started';
  let ra2DiagnosticsInstalled = false;
  let ra2ClientKey = null;
  let ra2ClientKeyId = 'none';
  let ra2BridgeTraceId = 'unopened';
  let restoreRa2CryptoDiagnostics = () => {};
  let rawServerRandom = new Uint8Array(0);
  let rawServerRandomLogged = false;
  let rawServerRandomCaptureArmed = false;
  let restoreRa2WebsockReceiveDiagnostics = () => {};
  let restoreVncBridgeCloseDiagnostics = () => {};
  const bytesDigest = async (bytes) => {
    const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  };
  const logRa2Packet = (direction, label, bytes) => {
    const packet = new Uint8Array(bytes);
    bytesDigest(packet).then((sha256) => {
      api.log(`noVNC RA2ne wire: connection=${ra2ConnectionId} bridge=${ra2BridgeTraceId} state=${ra2StateId} direction=${direction} packet=${label} bytes=${packet.byteLength} sha256=${sha256}`);
    }).catch((error) => {
      api.log(`noVNC RA2ne wire digest failed: connection=${ra2ConnectionId} bridge=${ra2BridgeTraceId} state=${ra2StateId} packet=${label} bytes=${packet.byteLength} error=${String(error).slice(0, 160)}`);
    });
  };
  const receiveQueueState = (socket) => {
    const read = Number(socket?._rQi);
    const written = Number(socket?._rQlen);
    return Number.isFinite(read) && Number.isFinite(written)
      ? `rQi=${read} rQlen=${written} available=${written - read}`
      : 'queue-state=unavailable';
  };
  const observeRawServerRandom = (data) => {
    if (!rawServerRandomCaptureArmed || rawServerRandomLogged) return;
    let frame;
    try {
      // A Tauri WebView event can originate in another JavaScript Realm.
      // `instanceof ArrayBuffer` then returns false for a valid binary
      // WebSocket payload, so use its cross-Realm brand instead.
      if (Object.prototype.toString.call(data) !== '[object ArrayBuffer]') {
        throw new TypeError('not an ArrayBuffer');
      }
      frame = new Uint8Array(data);
    } catch {
      api.log(`noVNC RA2ne raw WebSocket frame unavailable: connection=${ra2ConnectionId} state=${ra2StateId} type=${Object.prototype.toString.call(data)}`);
      return;
    }
    api.log(`noVNC RA2ne raw WebSocket frame: connection=${ra2ConnectionId} bridge=${ra2BridgeTraceId} bytes=${frame.byteLength} ${receiveQueueState(rfb?._sock)}`);
    const remaining = 258 - rawServerRandom.byteLength;
    const next = frame.subarray(0, Math.max(0, remaining));
    const combined = new Uint8Array(rawServerRandom.byteLength + next.byteLength);
    combined.set(rawServerRandom);
    combined.set(next, rawServerRandom.byteLength);
    rawServerRandom = combined;
    if (rawServerRandom.byteLength !== 258) return;
    rawServerRandomLogged = true;
    rawServerRandomCaptureArmed = false;
    if (rawServerRandom[0] !== 1 || rawServerRandom[1] !== 0) {
      api.log(`noVNC RA2ne raw WebSocket frame has unexpected ServerRandom length prefix: connection=${ra2ConnectionId} state=${ra2StateId} prefix=${rawServerRandom[0]},${rawServerRandom[1]}`);
      return;
    }
    logRa2Packet('server-to-client', 'server-encrypted-random-websocket', rawServerRandom.subarray(2));
  };
  const installRa2WebsockReceiveDiagnostics = () => {
    const socket = rfb?._sock;
    const rawWebSocket = socket?._websocket;
    if (!rawWebSocket || typeof rawWebSocket.onmessage !== 'function') {
      api.log(`noVNC RA2ne raw WebSocket capture unavailable: connection=${ra2ConnectionId} bridge=${ra2BridgeTraceId}`);
      return;
    }
    const originalMessageHandler = rawWebSocket.onmessage;
    const wrappedMessageHandler = function receiveRa2WebSocketMessage(event) {
      observeRawServerRandom(event?.data);
      return originalMessageHandler.call(this, event);
    };
    rawWebSocket.onmessage = wrappedMessageHandler;
    restoreRa2WebsockReceiveDiagnostics = () => {
      if (rawWebSocket.onmessage === wrappedMessageHandler) {
        rawWebSocket.onmessage = originalMessageHandler;
      }
      restoreRa2WebsockReceiveDiagnostics = () => {};
    };
  };
  const installVncBridgeCloseDiagnostics = () => {
    const rawWebSocket = rfb?._sock?._websocket;
    if (!rawWebSocket || typeof rawWebSocket.addEventListener !== 'function') {
      api.log(`noVNC bridge close diagnostics unavailable: connection=${ra2ConnectionId} bridge=${ra2BridgeTraceId}`);
      return;
    }
    const reportClose = (event) => {
      if (connected || connectionFailure) return;
      const reason = typeof event?.reason === 'string' ? event.reason.trim().slice(0, 240) : '';
      const code = Number.isFinite(Number(event?.code)) ? ` (WebSocket code ${Number(event.code)})` : '';
      connectionFailure = `VNC bridge closed before connection${reason ? `: ${reason}` : code}. Verify the configured target, firewall, and Plugin Activity.`;
      status.textContent = connectionFailure;
      api.log(`noVNC bridge closed before connection: connection=${ra2ConnectionId} bridge=${ra2BridgeTraceId}${code}${reason ? ` reason=${reason}` : ''}`);
    };
    rawWebSocket.addEventListener('close', reportClose);
    restoreVncBridgeCloseDiagnostics = () => {
      rawWebSocket.removeEventListener('close', reportClose);
      restoreVncBridgeCloseDiagnostics = () => {};
    };
  };
  const rememberRa2State = () => {
    const state = rfb?._rfbRSAAESAuthenticationState || null;
    if (state && state !== ra2State) {
      ra2State = state;
      ra2StateSequence += 1;
      ra2StateId = `state-${ra2StateSequence}`;
      api.log(`noVNC RA2ne state created: connection=${ra2ConnectionId} state=${ra2StateId}`);
    }
    return state;
  };
  const installRa2WireDiagnostics = () => {
    const socket = rfb?._sock;
    if (ra2DiagnosticsInstalled || !socket
      || typeof socket.sQpushBytes !== 'function' || typeof socket.rQshiftBytes !== 'function') {
      return;
    }
    ra2DiagnosticsInstalled = true;
    const originalPushBytes = socket.sQpushBytes.bind(socket);
    const originalShiftBytes = socket.rQshiftBytes.bind(socket);
    const originalShift16 = socket.rQshift16.bind(socket);
    socket.sQpushBytes = (bytes) => {
      const packet = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
      if (ra2Phase === 'await-client-public-key'
        && packet.byteLength === 516
        && packet[0] === 0 && packet[1] === 0 && packet[2] === 8 && packet[3] === 0) {
        ra2Phase = 'await-client-encrypted-random';
        logRa2Packet('client-to-server', 'client-public-key', packet);
      } else if (ra2Phase === 'await-client-encrypted-random'
        && packet.byteLength === 258
        && packet[0] === 1 && packet[1] === 0) {
        ra2Phase = 'await-server-encrypted-random';
        rawServerRandomCaptureArmed = true;
        // The encrypted client random is intentionally represented only by
        // its length. It is not needed to prove the server-to-client path.
        api.log(`noVNC RA2ne wire: connection=${ra2ConnectionId} bridge=${ra2BridgeTraceId} state=${ra2StateId} direction=client-to-server packet=client-encrypted-random bytes=${packet.byteLength}`);
        api.log(`noVNC RA2ne queue before server-random: connection=${ra2ConnectionId} bridge=${ra2BridgeTraceId} ${receiveQueueState(socket)}`);
      }
      return originalPushBytes(bytes);
    };
    socket.rQshift16 = () => {
      const before = receiveQueueState(socket);
      const value = originalShift16();
      if (ra2Phase === 'await-server-encrypted-random') {
        api.log(`noVNC RA2ne queue server-random length: connection=${ra2ConnectionId} bridge=${ra2BridgeTraceId} value=${value} before=${before} after=${receiveQueueState(socket)}`);
      }
      return value;
    };
    socket.rQshiftBytes = (length, copy = true) => {
      const before = receiveQueueState(socket);
      const packet = originalShiftBytes(length, copy);
      if (ra2Phase === 'await-server-encrypted-random' && length === 256) {
        ra2Phase = 'server-encrypted-random-received';
        logRa2Packet('server-to-client', 'server-encrypted-random', packet);
        api.log(`noVNC RA2ne queue server-random ciphertext: connection=${ra2ConnectionId} bridge=${ra2BridgeTraceId} before=${before} after=${receiveQueueState(socket)}`);
      }
      return packet;
    };
    api.log(`noVNC RA2ne wire diagnostics armed: connection=${ra2ConnectionId}`);
  };
  const installRa2CryptoDiagnostics = () => {
    const originalGenerateKey = Crypto.generateKey;
    const originalExportKey = Crypto.exportKey;
    const originalDecrypt = Crypto.decrypt;
    const isRa2ClientKey = (algorithm) => (
      ra2Phase === 'await-client-public-key'
      && algorithm?.name === 'RSA-PKCS1-v1_5'
      && Number(algorithm?.modulusLength) === 2048
    );
    const wrappedGenerateKey = function generateRa2ClientKey(algorithm, ...args) {
      const generated = originalGenerateKey.call(Crypto, algorithm, ...args);
      if (!isRa2ClientKey(algorithm)) return generated;
      // LegacyCrypto's RSA generator is async.  The RA2 state awaits this
      // promise and then passes `keyPair.privateKey` to both exportKey and
      // decrypt, so record the identity only after it resolves.
      return Promise.resolve(generated).then((keyPair) => {
        ra2ClientKey = keyPair?.privateKey || keyPair;
        ra2ClientKeyId = 'client-key-1';
        api.log(`noVNC RA2ne client key generated: connection=${ra2ConnectionId} state=${ra2StateId} key=${ra2ClientKeyId} privateKeyPresent=${Boolean(keyPair?.privateKey)}`);
        return keyPair;
      });
    };
    const wrappedExportKey = function exportRa2ClientKey(format, key) {
      const exported = originalExportKey.call(Crypto, format, key);
      if (key === ra2ClientKey && format === 'raw') {
        api.log(`noVNC RA2ne client key export: connection=${ra2ConnectionId} state=${ra2StateId} key=${ra2ClientKeyId} matchesGeneratedKey=true`);
      }
      return exported;
    };
    const wrappedDecrypt = function decryptRa2ServerRandom(algorithm, key, data) {
      const isServerRandom = key === ra2ClientKey
        && algorithm?.name === 'RSA-PKCS1-v1_5'
        && Number(data?.byteLength) === 256;
      try {
        const decrypted = originalDecrypt.call(Crypto, algorithm, key, data);
        if (!isServerRandom) return decrypted;
        // Legacy RSA decrypt is async; preserve the Promise contract that
        // RA2 awaits, but log the resolved result rather than the Promise.
        return Promise.resolve(decrypted).then((plaintext) => {
          const result = plaintext === null ? 'null' : `plaintext-bytes=${plaintext.byteLength}`;
          api.log(`noVNC RA2ne client key decrypt: connection=${ra2ConnectionId} bridge=${ra2BridgeTraceId} state=${ra2StateId} key=${ra2ClientKeyId} ciphertext-bytes=256 result=${result}`);
          return plaintext;
        }).catch((error) => {
          api.log(`noVNC RA2ne client key decrypt threw: connection=${ra2ConnectionId} bridge=${ra2BridgeTraceId} state=${ra2StateId} key=${ra2ClientKeyId} ciphertext-bytes=256 error=${String(error).slice(0, 160)}`);
          throw error;
        });
      } catch (error) {
        if (isServerRandom) {
          api.log(`noVNC RA2ne client key decrypt threw: connection=${ra2ConnectionId} bridge=${ra2BridgeTraceId} state=${ra2StateId} key=${ra2ClientKeyId} ciphertext-bytes=256 error=${String(error).slice(0, 160)}`);
        }
        throw error;
      }
    };
    Crypto.generateKey = wrappedGenerateKey;
    Crypto.exportKey = wrappedExportKey;
    Crypto.decrypt = wrappedDecrypt;
    restoreRa2CryptoDiagnostics = () => {
      if (Crypto.generateKey === wrappedGenerateKey) Crypto.generateKey = originalGenerateKey;
      if (Crypto.exportKey === wrappedExportKey) Crypto.exportKey = originalExportKey;
      if (Crypto.decrypt === wrappedDecrypt) Crypto.decrypt = originalDecrypt;
      restoreRa2CryptoDiagnostics = () => {};
    };
    api.log(`noVNC RA2ne client-key diagnostics armed: connection=${ra2ConnectionId}`);
  };
  const clipboardText = (value) => {
    const text = String(value || '');
    return new TextEncoder().encode(text).byteLength <= maxClipboardBytes ? text : null;
  };
  const stopClipboardSync = () => {
    clipboardSyncEnabled = false;
    clipboardPaste.disabled = true;
    if (remotePasteTimer !== null) {
      window.clearTimeout(remotePasteTimer);
      remotePasteTimer = null;
    }
  };
  const isClipboardPasteEvent = (event) => (
    event.target === clipboardPaste ||
    document.activeElement === clipboardPaste ||
    event.composedPath?.().includes(clipboardPaste)
  );
  const heldModifiers = new Map();
  const setToggleAppearance = (button, enabled) => {
    button.setAttribute('aria-pressed', String(enabled));
    button.style.background = enabled ? '#2d7d46' : '#263b4e';
  };
  const setMetaNextArmed = (enabled) => {
    metaNextArmed = enabled;
    setToggleAppearance(metaNext, enabled);
    status.textContent = enabled
      ? 'Command / Windows armed for the next key.'
      : 'Command / Windows modifier cancelled.';
  };
  const display = () => rfb?._display;
  const viewport = () => display()?._viewportLoc;
  const clipboardTransport = () => {
    const formats = Object.keys(rfb?._clipboardServerCapabilitiesFormats || {});
    const actions = Object.keys(rfb?._clipboardServerCapabilitiesActions || {}).filter(
      (key) => rfb._clipboardServerCapabilitiesActions[key],
    );
    return { mode: formats.length && actions.length ? 'extended' : 'legacy', formats, actions };
  };
  const sendLocalClipboard = (value, source) => {
    if (!clipboardSyncEnabled || !connected || !rfb) {
      status.textContent = 'Clipboard send is unavailable until the VNC connection is ready.';
      return false;
    }
    const text = clipboardText(value);
    if (text === null) {
      api.log('noVNC clipboard local-to-remote skipped text over 1048576 bytes');
      status.textContent = 'Clipboard text is over 1 MiB and was not sent.';
      return false;
    }
    if (!text) {
      api.log('noVNC clipboard paste event contained no plain text');
      status.textContent = 'Clipboard contains no plain text.';
      return false;
    }
    rfb.clipboardPasteFrom(text);
    clipboardPaste.value = text;
    const transport = clipboardTransport();
    if (forceRfb33) {
      // Vine serves a macOS desktop. ClientCutText updates its clipboard, then
      // Command+V performs the actual paste in the focused remote application.
      // Give Vine time to publish ClientCutText to the macOS pasteboard first.
      if (remotePasteTimer !== null) window.clearTimeout(remotePasteTimer);
      status.textContent = 'Local clipboard sent to Vine Server; waiting for the remote pasteboard…';
      remotePasteTimer = window.setTimeout(() => {
        remotePasteTimer = null;
        if (!clipboardSyncEnabled || !connected || !rfb) return;
        rfb.focus();
        sendSuperChord('v');
        status.textContent = 'Local clipboard sent to Vine Server and remote Command+V issued.';
      }, 400);
    } else {
      status.textContent = transport.mode === 'legacy'
        ? 'Legacy clipboard sent, but this server advertised no clipboard capability. Click the desktop and use the remote platform paste shortcut; server-side clipboard support may be required.'
        : 'Local clipboard sent to VNC. Click the desktop and use the remote platform paste shortcut.';
    }
    api.log(`noVNC clipboard local-to-remote announced source=${source} bytes=${new TextEncoder().encode(text).byteLength} mode=${transport.mode} formats=${transport.formats.join(',') || 'none'} actions=${transport.actions.join(',') || 'none'}`);
    return true;
  };
  clipboardPaste.addEventListener('paste', (event) => {
    event.preventDefault();
    event.stopPropagation();
    sendLocalClipboard(event.clipboardData?.getData('text/plain') || '', 'paste-event');
  });
  const normalizePointerCoordinates = () => {
    const remote = display();
    const canvas = rfb?._canvas;
    if (!remote || !canvas) return;
    // WebView layout can round or constrain the CSS canvas independently of
    // Display.scale. Normalize through the measured canvas rectangle so the
    // remote pointer stays aligned in Fit and manual zoom modes.
    remote.absX = (x) => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      // Vine/macOS uses an 8px text-cell alignment in the verified desktop.
      // Keep one cell of calibration here: no offset starts a drag one cell
      // too far left, while the former +16px correction skipped two cells.
      const pointerOffsetX = 8;
      return Math.max(0, Math.min(remote.width - 1, Math.floor((x / width) * canvas.width + remote._viewportLoc.x + pointerOffsetX)));
    };
    remote.absY = (y) => {
      const bounds = canvas.getBoundingClientRect();
      const height = Math.max(1, bounds.height);
      const pointerOffsetY = forceRfb33 ? 8 : 0;
      return Math.max(0, Math.min(remote.height - 1, Math.floor((y / height) * canvas.height + remote._viewportLoc.y + pointerOffsetY)));
    };
    const bounds = canvas.getBoundingClientRect();
    api.log(`noVNC pointer mapping normalized css=${Math.round(bounds.width)}x${Math.round(bounds.height)} pixels=${canvas.width}x${canvas.height} scale=${remote.scale}`);
  };
  const fittedScale = () => {
    const remote = display();
    if (!remote?.width || !remote?.height) return 1;
    return Math.min(screen.clientWidth / remote.width, screen.clientHeight / remote.height);
  };
  const currentZoom = () => (
    !manualZoomActive && rfb?.scaleViewport ? fittedScale() : zoom
  );
  const drawNavigator = () => {
    const remote = display();
    const position = viewport();
    if (!remote || !position || !remote.width || !remote.height) return;
    const context = navigator.getContext('2d');
    const scale = Math.min(navigator.width / remote.width, navigator.height / remote.height);
    const drawWidth = Math.max(1, Math.round(remote.width * scale));
    const drawHeight = Math.max(1, Math.round(remote.height * scale));
    const offsetX = Math.floor((navigator.width - drawWidth) / 2);
    const offsetY = Math.floor((navigator.height - drawHeight) / 2);
    context.fillStyle = '#111'; context.fillRect(0, 0, navigator.width, navigator.height);
    // noVNC keeps the complete virtual desktop in its backbuffer even while
    // the visible canvas is clipped to a smaller viewport.
    context.drawImage(remote._backbuffer, offsetX, offsetY, drawWidth, drawHeight);
    context.strokeStyle = '#fff'; context.lineWidth = 2;
    context.strokeRect(
      offsetX + (position.x / remote.width) * drawWidth,
      offsetY + (position.y / remote.height) * drawHeight,
      Math.min(drawWidth, (position.w / remote.width) * drawWidth),
      Math.min(drawHeight, (position.h / remote.height) * drawHeight),
    );
  };
  const applyManualViewport = () => {
    const remote = display();
    if (!remote || zoom <= 0) return null;
    // Use noVNC's actual host when available. Its inner screen can differ by
    // a few pixels from the overlay while scrollbars/layout are settling.
    const host = rfb?._screen || screen;
    const width = Math.max(1, Math.floor(host.clientWidth / zoom));
    const height = Math.max(1, Math.floor(host.clientHeight / zoom));
    remote.scale = zoom;
    remote.viewportChangeSize(width, height);
    // viewportChangeSize may rescale its canvas. Set this once more so this
    // pass cannot leave a manual viewport at noVNC's native 100% scale.
    remote.scale = zoom;
    return remote;
  };
  const restoreManualViewportSoon = () => {
    if (!manualZoomActive || manualZoomRestoreQueued) return;
    manualZoomRestoreQueued = true;
    window.requestAnimationFrame(() => {
      manualZoomRestoreQueued = false;
      if (!manualZoomActive || !rfb) return;
      if (applyManualViewport()) drawNavigator();
    });
  };
  const installManualZoomGuard = () => {
    if (!rfb || rfb._fpasotermManualZoomGuard || typeof rfb._updateScale !== 'function') return;
    const updateScale = rfb._updateScale;
    rfb._updateScale = function updateScaleWithManualZoom(...args) {
      const result = updateScale.apply(this, args);
      // noVNC calls _updateScale during ResizeObserver layout passes and
      // forces Display.scale back to 1 when scaleViewport is false. Schedule
      // our restoration after that pass without changing noVNC's Fit mode.
      restoreManualViewportSoon();
      return result;
    };
    rfb._fpasotermManualZoomGuard = true;
  };
  const enablePan = (preserveFitScale = false) => {
    if (!rfb) return null;
    // Preserve Fit's current visual scale before disabling automatic scaling.
    // This makes first pan retain the visible Fit size, while every later pan
    // retains the explicit Zoom −/Zoom + value.
    if (preserveFitScale && !manualZoomActive && rfb.scaleViewport) zoom = fittedScale();
    manualZoomActive = true;
    if (rfb.scaleViewport) rfb.scaleViewport = false;
    if (!rfb.clipViewport) rfb.clipViewport = true;
    const remote = applyManualViewport();
    // The immediate application makes controls responsive; the queued pass
    // covers a ResizeObserver update noVNC performs after a toolbar click.
    restoreManualViewportSoon();
    drawNavigator();
    return remote;
  };
  const panBy = (left, top) => {
    const remote = enablePan(true);
    if (!remote) return;
    remote.viewportChangePos(left / zoom, top / zoom);
    drawNavigator();
    const position = viewport();
    api.log(`noVNC pan: x=${position.x}, y=${position.y}, viewport=${position.w}x${position.h}, framebuffer=${remote.width}x${remote.height}`);
    status.textContent = `Panning at ${Math.round(zoom * 100)}%.`;
  };
  const toggleModifier = (button, name, keysym, code) => {
    if (!rfb) return;
    const next = !heldModifiers.has(name);
    if (next) heldModifiers.set(name, { keysym, code, button });
    else heldModifiers.delete(name);
    setToggleAppearance(button, next);
    // Keep modifiers local until the following key is chosen.  Sending a
    // standalone modifier through noVNC makes browser focus/modifier-state
    // handling race the next key on some platforms (notably ChromeOS).
    api.log(`noVNC palette modifier selected: ${name}=${next}`);
    status.textContent = next ? `${name} selected for the next shortcut.` : `${name} removed from the next shortcut.`;
  };
  const releaseModifiers = () => {
    for (const [, modifier] of heldModifiers) {
      setToggleAppearance(modifier.button, false);
    }
    heldModifiers.clear();
    status.textContent = 'Remote modifier keys released.';
  };
  const sendChord = (modifiers, character, code, keysym = character.codePointAt(0)) => {
    if (!rfb) return;
    const wasViewOnly = rfb._viewOnly;
    // VNC Shortcuts intentionally blocks all mouse traffic with viewOnly,
    // but its reviewed buttons must still be able to send one explicit key
    // sequence. Keep that exception scoped to this synchronous operation.
    rfb._viewOnly = false;
    try {
      for (const modifier of modifiers) rfb.sendKey(modifier.keysym, modifier.code, true);
      rfb.sendKey(keysym, code, true);
      rfb.sendKey(keysym, code, false);
      for (const modifier of [...modifiers].reverse()) rfb.sendKey(modifier.keysym, modifier.code, false);
    } finally {
      rfb._viewOnly = wasViewOnly;
    }
  };
  const releaseRemoteModifiers = () => {
    if (!rfb) return;
    // Clear both noVNC's local key map and the server's key state. The explicit
    // releases matter for Vine/macOS after a WebView has delivered only part
    // of an earlier modifier gesture.
    const wasViewOnly = rfb._viewOnly;
    rfb._viewOnly = false;
    try {
      rfb._keyboard?._allKeysUp?.();
      const released = new Set();
      for (const modifier of [
        { keysym: Keysyms.XK_Control_L, code: 'ControlLeft' },
        { keysym: Keysyms.XK_Shift_L, code: 'ShiftLeft' },
        { keysym: Keysyms.XK_Alt_L, code: 'AltLeft' },
        { keysym: remoteSuperKeysym, code: remoteSuperCode },
        { keysym: remoteOptionKeysym, code: remoteOptionCode },
      ]) {
        const key = `${modifier.keysym}:${modifier.code}`;
        if (released.has(key)) continue;
        released.add(key);
        rfb.sendKey(modifier.keysym, modifier.code, false);
      }
    } finally {
      rfb._viewOnly = wasViewOnly;
    }
  };
  const sendCtrlChord = (character, includeShift = false) => {
    const lower = character.toLowerCase();
    // Shift is sent as a separate modifier.  Keep the keysym itself lowercase:
    // VNC servers distinguish a shifted lowercase keysym from an uppercase
    // keysym for shortcuts such as fpasoterm's Ctrl+Shift+m.
    const key = lower;
    const code = /^[a-z]$/i.test(lower) ? `Key${lower.toUpperCase()}` : `Digit${lower}`;
    const modifiers = [{ keysym: Keysyms.XK_Control_L, code: 'ControlLeft' }];
    if (includeShift) modifiers.push({ keysym: Keysyms.XK_Shift_L, code: 'ShiftLeft' });
    sendChord(modifiers, key, code);
    if (!includeShift && lower === 'b') {
      ctrlBPrefixUntil = Date.now() + 2000;
      api.log('noVNC Ctrl+b prefix armed for next b');
    }
    api.log(`noVNC physical shortcut sent: Ctrl${includeShift ? '+Shift' : ''}+${key}`);
    status.textContent = `Shortcut sent: Ctrl${includeShift ? '+Shift' : ''}+${key}`;
  };
  const sendSuperChord = (character, includeShift = false) => {
    const lower = character.toLowerCase();
    const code = /^[a-z]$/i.test(lower) ? `Key${lower.toUpperCase()}` : `Digit${lower}`;
    const modifiers = [{ keysym: remoteSuperKeysym, code: remoteSuperCode }];
    if (includeShift) modifiers.push({ keysym: Keysyms.XK_Shift_L, code: 'ShiftLeft' });
    sendChord(modifiers, lower, code);
    api.log(`noVNC physical shortcut sent: Super${includeShift ? '+Shift' : ''}+${lower}`);
    status.textContent = `Shortcut sent: Super${includeShift ? '+Shift' : ''}+${lower}`;
  };
  const sendSuperShiftB = () => {
    if (!rfb) return;
    // Ctrl may have reached noVNC before Shift armed the local prefix. Release
    // it before sending the requested remote-only chord.
    sendChord([
      { keysym: remoteSuperKeysym, code: remoteSuperCode },
      { keysym: Keysyms.XK_Shift_L, code: 'ShiftLeft' },
    ], 'b', 'KeyB');
    api.log('noVNC shortcut sent: Super+Shift+b (client Ctrl+Shift+b)');
    status.textContent = 'Shortcut sent: Super+Shift+b';
  };
  const sendMacInputSourceShortcut = () => {
    if (!connected || !rfb) {
      status.textContent = 'Ctrl+Space is unavailable until the VNC connection is ready.';
      return;
    }
    // This is a complete remote chord, not a local browser shortcut. macOS may
    // bind Ctrl+Space to input-source selection, but the OS owns that result.
    releaseRemoteModifiers();
    sendChord([{ keysym: Keysyms.XK_Control_L, code: 'ControlLeft' }], ' ', 'Space');
    rfb.focus();
    status.textContent = 'Remote Ctrl+Space sent.';
    api.log('noVNC remote Ctrl+Space sent');
  };
  const resetRemoteKeys = () => {
    if (!connected || !rfb) {
      status.textContent = 'Remote key reset is unavailable until the VNC connection is ready.';
      return;
    }
    releaseRemoteModifiers();
    rfb.focus();
    status.textContent = 'Remote modifier keys released.';
    api.log('noVNC remote key state reset');
  };
  const dismissPrefixPalette = () => {
    if (prefixTimer) { window.clearTimeout(prefixTimer); prefixTimer = null; }
    prefixPalette?.remove(); prefixPalette = null;
    prefixShield?.remove(); prefixShield = null;
    // Restore normal pointer control only after the shortcut UI is gone.
    if (rfb?._canvas) rfb._canvas.style.pointerEvents = '';
    if (paletteViewOnly !== null && rfb) {
      rfb._viewOnly = paletteViewOnly;
      paletteViewOnly = null;
    }
    if (pausedSendMouse && rfb) {
      rfb._sendMouse = pausedSendMouse;
      pausedSendMouse = null;
    }
    if (pausedPointerHandlers) {
      const { canvas, handler, focusHandler } = pausedPointerHandlers;
      for (const eventName of ['mousedown', 'mouseup', 'mousemove', 'click', 'contextmenu']) {
        canvas.addEventListener(eventName, handler);
      }
      canvas.addEventListener('mousedown', focusHandler);
      pausedPointerHandlers = null;
    }
  };
  const showPrefixPalette = () => {
    if (prefixPalette || !rfb) return;
    // The palette floats over the canvas, but browsers can still deliver a
    // preceding move to noVNC while the user aims at a button. Disable canvas
    // hit-testing for the entire palette lifetime to keep the remote cursor
    // exactly where it was.
    if (rfb._canvas) rfb._canvas.style.pointerEvents = 'none';
    paletteViewOnly = rfb._viewOnly;
    rfb._viewOnly = true;
    // noVNC's own source intentionally lets mouse events flow in view-only
    // mode for viewport handling. Override the final network send method as
    // well, so even a queued/native-captured mouse event cannot reach VNC.
    pausedSendMouse = rfb._sendMouse;
    rfb._sendMouse = () => {};
    const canvas = rfb._canvas;
    const handler = rfb._eventHandlers?.handleMouse;
    const focusHandler = rfb._eventHandlers?.focusCanvas;
    // pointer-events alone is insufficient on several WebKit builds when a
    // canvas has a native pointer capture. Temporarily detach noVNC's own
    // handlers as the final guarantee that palette interaction is local.
    if (canvas && handler && focusHandler) {
      for (const eventName of ['mousedown', 'mouseup', 'mousemove', 'click', 'contextmenu']) {
        canvas.removeEventListener(eventName, handler);
      }
      canvas.removeEventListener('mousedown', focusHandler);
      pausedPointerHandlers = { canvas, handler, focusHandler };
      api.log('noVNC remote mouse sending paused for VNC Shortcuts');
    }
    const shield = document.createElement('div');
    const palette = document.createElement('div');
    const title = document.createElement('strong');
    const keyButtons = [control, alt, shift, superKey];
    const escapeButton = escapeKey;
    const tabButton = document.createElement('button');
    const closeButton = document.createElement('button');
    title.textContent = 'VNC Shortcuts (drag):';
    control.textContent = 'Ctrl'; alt.textContent = 'Alt'; shift.textContent = 'Shift'; superKey.textContent = 'Super';
    ctrlSpace.textContent = 'Ctrl+Space';
    escapeButton.textContent = 'Esc'; tabButton.textContent = 'Tab'; closeButton.textContent = '×';
    closeButton.title = 'Close VNC Shortcuts';
    closeButton.setAttribute('aria-label', 'Close VNC Shortcuts');
    shield.style.cssText = 'position:absolute;inset:0;z-index:2147483647;pointer-events:auto;background:transparent';
    palette.style.cssText = `position:absolute;left:${Math.max(8, Math.min(screen.clientWidth - 500, lastPointer.x))}px;top:${Math.max(8, Math.min(screen.clientHeight - 42, lastPointer.y))}px;display:flex;align-items:center;gap:6px;padding:7px;border:1px solid #9ac7ee;border-radius:5px;background:#17212b;color:#edf5fc;font:13px ui-monospace,monospace`;
    // A noVNC canvas must never receive pointer events aimed at the shortcut
    // UI.  Otherwise selecting Ctrl/Alt/etc. also moves the remote cursor.
    palette.style.pointerEvents = 'auto';
    palette.tabIndex = 0;
    palette.setAttribute('aria-label', 'VNC shortcuts: choose modifiers, then press an alphanumeric key to send the chord');
    title.style.cssText = 'cursor:grab;user-select:none;touch-action:none';
    for (const button of [...keyButtons, ctrlSpace, escapeButton, tabButton, closeButton]) {
      button.type = 'button';
      button.style.cssText = 'padding:5px 7px;border:1px solid #59738c;border-radius:4px;background:#263b4e;color:#edf5fc';
    }
    control.onclick = () => toggleModifier(control, 'Control', Keysyms.XK_Control_L, 'ControlLeft');
    alt.onclick = () => toggleModifier(alt, 'Alt', Keysyms.XK_Alt_L, 'AltLeft');
    shift.onclick = () => toggleModifier(shift, 'Shift', Keysyms.XK_Shift_L, 'ShiftLeft');
    superKey.onclick = () => toggleModifier(superKey, 'Super', remoteSuperKeysym, remoteSuperCode);
    ctrlSpace.onclick = () => {
      sendMacInputSourceShortcut();
      dismissPrefixPalette();
    };
    escapeButton.onclick = () => {
      sendChord([], '', 'Escape', Keysyms.XK_Escape);
      api.log('noVNC palette key sent: Escape');
      dismissPrefixPalette();
    };
    tabButton.onclick = () => {
      sendChord([], '', 'Tab', Keysyms.XK_Tab);
      api.log('noVNC palette key sent: Tab');
      dismissPrefixPalette();
    };
    closeButton.onclick = dismissPrefixPalette;
    let paletteDrag = null;
    const stopPaletteDrag = (event) => {
      if (!paletteDrag || paletteDrag.pointerId !== event.pointerId) return;
      title.releasePointerCapture?.(event.pointerId);
      paletteDrag = null;
      title.style.cursor = 'grab';
      event.preventDefault();
      event.stopPropagation();
    };
    title.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const paletteBounds = palette.getBoundingClientRect();
      paletteDrag = {
        pointerId: event.pointerId,
        offsetX: event.clientX - paletteBounds.left,
        offsetY: event.clientY - paletteBounds.top,
      };
      title.setPointerCapture?.(event.pointerId);
      title.style.cursor = 'grabbing';
      palette.focus({ preventScroll: true });
      event.preventDefault();
      event.stopPropagation();
    });
    title.addEventListener('pointermove', (event) => {
      if (!paletteDrag || paletteDrag.pointerId !== event.pointerId) return;
      const screenBounds = screen.getBoundingClientRect();
      const left = event.clientX - screenBounds.left - paletteDrag.offsetX;
      const top = event.clientY - screenBounds.top - paletteDrag.offsetY;
      const maxLeft = Math.max(8, screen.clientWidth - palette.offsetWidth - 8);
      const maxTop = Math.max(8, screen.clientHeight - palette.offsetHeight - 8);
      palette.style.left = `${Math.max(8, Math.min(maxLeft, left))}px`;
      palette.style.top = `${Math.max(8, Math.min(maxTop, top))}px`;
      event.preventDefault();
      event.stopPropagation();
    });
    title.addEventListener('pointerup', stopPaletteDrag);
    title.addEventListener('pointercancel', stopPaletteDrag);
    for (const eventName of ['pointerdown', 'pointermove', 'pointerup', 'mousedown', 'mousemove', 'mouseup', 'click']) {
      // Bubble phase preserves the button's own click handler, then prevents
      // the event from reaching the RFB host below the palette.
      palette.addEventListener(eventName, (event) => event.stopPropagation());
      shield.addEventListener(eventName, (event) => event.stopPropagation());
    }
    palette.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); dismissPrefixPalette(); return; }
      if (!/^[a-z0-9]$/i.test(event.key) || !rfb) return;
      event.preventDefault(); event.stopPropagation();
      const lower = event.key.toLowerCase();
      // Modifiers are delivered independently; the printable keysym remains
      // lowercase so palette and physical-key paths have identical semantics.
      const character = lower;
      const code = /^[a-z]$/i.test(lower) ? `Key${lower.toUpperCase()}` : `Digit${lower}`;
      const modifiers = [...heldModifiers.values()];
      sendChord(modifiers, character, code);
      api.log(`noVNC palette shortcut sent: ${[...heldModifiers.keys(), character].join('+')}`);
      releaseModifiers(); dismissPrefixPalette();
    });
    palette.append(title, ...keyButtons, ctrlSpace, escapeButton, tabButton, closeButton);
    shield.append(palette); screen.append(shield);
    prefixShield = shield; prefixPalette = palette;
    palette.focus();
  };
  screen.addEventListener('pointermove', (event) => {
    const bounds = screen.getBoundingClientRect();
    lastPointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }, true);
  const reportFramebuffer = (stage) => {
    const remote = display();
    const panel = `${screen.clientWidth}x${screen.clientHeight}`;
    const framebuffer = remote ? `${remote.width}x${remote.height}` : 'not created';
    const message = `noVNC ${stage}: viewport=${panel}, framebuffer=${framebuffer}`;
    api.log(message);
    return { canvas: remote?._target, viewport: panel, framebuffer };
  };
  const applyZoom = () => {
    if (!rfb) return;
    if (!enablePan(false)) return;
    drawNavigator();
    status.textContent = `Manual zoom: ${Math.round(zoom * 100)}%`;
  };
  zoomOut.addEventListener('click', () => { zoom = Math.max(0.1, currentZoom() - 0.1); applyZoom(); });
  zoomIn.addEventListener('click', () => { zoom = Math.min(2.5, currentZoom() + 0.1); applyZoom(); });
  metaNext.addEventListener('click', () => {
    setMetaNextArmed(!metaNextArmed);
    rfb?.focus();
  });
  shortcuts.addEventListener('click', () => {
    if (!connected || !rfb) {
      status.textContent = 'VNC Shortcuts are unavailable until the VNC connection is ready.';
      return;
    }
    dismissPrefixPalette();
    showPrefixPalette();
    status.textContent = 'VNC Shortcuts opened.';
  });
  resetKeys.addEventListener('click', resetRemoteKeys);
  fit.addEventListener('click', () => {
    if (rfb) {
      manualZoomActive = false;
      rfb.clipViewport = false;
      rfb.scaleViewport = true;
      requestAnimationFrame(() => {
        if (!manualZoomActive) zoom = fittedScale();
      });
    }
    navigator.style.display = 'none';
    status.textContent = 'Fit to panel.';
  });
  overview.addEventListener('click', () => {
    navigator.style.display = navigator.style.display === 'none' ? 'block' : 'none';
    if (navigator.style.display !== 'none') drawNavigator();
  });
  panLeft.addEventListener('click', () => panBy(-screen.clientWidth * 0.1, 0));
  panRight.addEventListener('click', () => panBy(screen.clientWidth * 0.1, 0));
  panUp.addEventListener('click', () => panBy(0, -screen.clientHeight * 0.1));
  panDown.addEventListener('click', () => panBy(0, screen.clientHeight * 0.1));
  navigator.addEventListener('click', (event) => {
    if (!manualZoomActive && rfb?.scaleViewport) zoom = fittedScale();
    if (zoom < 1.5) zoom = 1.5;
    const remote = enablePan(false);
    const position = viewport();
    if (!remote || !position) return;
    const box = navigator.getBoundingClientRect();
    const remoteX = ((event.clientX - box.left) / box.width) * remote.width;
    const remoteY = ((event.clientY - box.top) / box.height) * remote.height;
    remote.viewportChangePos(remoteX - position.w / 2 - position.x, remoteY - position.h / 2 - position.y);
    drawNavigator();
    status.textContent = 'Overview position selected.';
  });
  // This dormant capture surface is kept out of the layout. Navigation uses
  // Overview and small-step direction buttons, avoiding a disruptive switch
  // from Fit scale to a panning viewport.
  panCapture.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !rfb) return;
    if (!enablePan(true)) return;
    event.preventDefault();
    dragPan = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    panCapture.setPointerCapture?.(event.pointerId);
    panCapture.style.cursor = 'grabbing';
  });
  panCapture.addEventListener('pointermove', (event) => {
    if (!dragPan || dragPan.pointerId !== event.pointerId) return;
    const remote = display();
    if (!remote) return;
    remote.viewportChangePos((dragPan.x - event.clientX) / zoom, (dragPan.y - event.clientY) / zoom);
    dragPan.x = event.clientX; dragPan.y = event.clientY;
    drawNavigator();
    event.preventDefault();
  });
  const stopDragPan = (event) => {
    if (!dragPan || dragPan.pointerId !== event.pointerId) return;
    panCapture.releasePointerCapture?.(event.pointerId);
    dragPan = null; panCapture.style.cursor = 'grab';
    event.preventDefault();
  };
  panCapture.addEventListener('pointerup', stopDragPan);
  panCapture.addEventListener('pointercancel', stopDragPan);
  try {
    // This exact safe default is declared in the installed plugin header. It
    // is deliberately not VNC's standard 5900; install with
    // --plugin-tcp-target tcp://host:5900 (or tls://host:5900) to connect.
    const bridgeUrl = await api.openVncBridge({ target: 'tcp://127.0.0.1:53390' });
    try {
      ra2BridgeTraceId = new URL(bridgeUrl).searchParams.get('trace') || 'missing';
    } catch {
      ra2BridgeTraceId = 'invalid-url';
    }
    api.log(`noVNC RA2ne trace: connection=${ra2ConnectionId} bridge=${ra2BridgeTraceId}`);
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
    installVncBridgeCloseDiagnostics();
    installRa2WebsockReceiveDiagnostics();
    installRa2WireDiagnostics();
    installRa2CryptoDiagnostics();
    // noVNC reports several RA2ne errors only through its internal `_fail`
    // path, then emits a generic disconnect event. Preserve the actual reason
    // for this connection in both the status line and Plugin Activity.
    if (typeof rfb._fail === 'function') {
      const originalFail = rfb._fail.bind(rfb);
      rfb._fail = (details) => {
        const detail = String(details || 'unknown VNC protocol failure').trim().slice(0, 240);
        const rfbVersion = Number.isFinite(Number(rfb._rfbVersion)) ? rfb._rfbVersion : 'unknown';
        const securityType = Number.isFinite(Number(rfb._rfbAuthScheme)) ? rfb._rfbAuthScheme : 'unknown';
        const handshakeStage = String(rfb._rfbInitState || 'unknown');
        connectionFailure = `VNC protocol failure: ${detail}`;
        status.textContent = connectionFailure;
        api.log(`noVNC protocol failure: ${detail}; rfb=${rfbVersion}; security=${securityType}; stage=${handshakeStage}; ra2Connection=${ra2ConnectionId}; ra2State=${ra2StateId}; ra2Phase=${ra2Phase}`);
        return originalFail(details);
      };
    }
    if (forceRfb33) {
      // noVNC has no public maximum-version option.  Set its internal maximum
      // before the asynchronously delivered server banner is negotiated.
      rfb._rfbMaxVersion = 3.3;
      // Vine also stalls after ServerInit when noVNC advertises its complete
      // modern encoding/pseudo-encoding list. Keep this compatibility path to
      // two encodings verified against Vine: Hextile (5), then Raw (0).
      rfb._sendEncodings = function sendVineEncodings() {
        RFB.messages.clientEncodings(this._sock, [5, 0]);
      };
      api.log('noVNC compatibility: forcing RFB 3.3 with Hextile/Raw for Vine Server');
    } else {
      api.log('noVNC transport: automatic RFB negotiation (maximum 3.8)');
    }
    installManualZoomGuard();
    manualZoomActive = false;
    rfb.scaleViewport = true;
    rfb.resizeSession = false;
    reportFramebuffer('RFB created');
    rfb.addEventListener('connect', (event) => {
      connected = true;
      clipboardSyncEnabled = true;
      clipboardPaste.disabled = false;
      api.dismissPrompts();
      status.textContent = `Connected: ${event.detail?.name || 'VNC server'}; waiting for remote framebuffer…`;
      // RFB's keyboard listener is attached to its canvas, not the element
      // overlay container.  Focusing the container left Ctrl chords in the
      // terminal/WebView focus path on ChromeOS.
      rfb.focus();
      api.log('noVNC canvas focused for keyboard input');
      removePrefixListener();
      releaseHostKeyCapture();
      const capturedControlKeys = new Set();
      const handleHostCtrlKey = (keyEvent) => {
        if (isClipboardPasteEvent(keyEvent)) return false;
        if (metaNextArmed && keyEvent.type === 'keydown' && /^[a-z0-9]$/i.test(keyEvent.key)) {
          keyEvent.preventDefault(); keyEvent.stopImmediatePropagation();
          const character = keyEvent.key.toLowerCase();
          const code = /^[a-z]$/i.test(character) ? `Key${character.toUpperCase()}` : `Digit${character}`;
          setMetaNextArmed(false);
          sendChord([{ keysym: remoteSuperKeysym, code: remoteSuperCode }], character, code);
          status.textContent = `Command / Windows+${character} sent.`;
          return true;
        }
        const isSuperShift = keyEvent.metaKey && keyEvent.shiftKey;
        if (isSuperShift && keyEvent.code === 'Space') {
          rfb.sendKey(remoteSuperKeysym, remoteSuperCode, false);
          rfb.sendKey(Keysyms.XK_Shift_L, 'ShiftLeft', false);
          dismissPrefixPalette(); showPrefixPalette();
          api.log('noVNC VNC Shortcuts opened by Super+Shift+Space');
          status.textContent = 'VNC Shortcuts opened (Super+Shift+Space)';
          return true;
        }
        // On macOS, Meta is the fpasoterm Mod key. Own the complete remote
        // Super chord so the local fpasoterm menu does not also react.
        if (keyEvent.metaKey && (keyEvent.code === 'MetaLeft' || keyEvent.code === 'MetaRight')) {
          return true;
        }
        if (isSuperShift && (keyEvent.code === 'ShiftLeft' || keyEvent.code === 'ShiftRight')) {
          return true;
        }
        if (keyEvent.metaKey && /^Key[A-Z]$/.test(keyEvent.code)) {
          sendSuperChord(keyEvent.key, keyEvent.shiftKey);
          return true;
        }
        // Keep the VNC Shortcuts trigger before generic navigation handling.
        // Windows WebView can retain the overlay focus after a remote menu is
        // opened, so this must be handled by the same host capture path.
        if (keyEvent.ctrlKey && keyEvent.shiftKey && keyEvent.code === 'Space') {
          rfb.sendKey(Keysyms.XK_Control_L, 'ControlLeft', false);
          rfb.sendKey(Keysyms.XK_Shift_L, 'ShiftLeft', false);
          dismissPrefixPalette(); showPrefixPalette();
          api.log('noVNC VNC Shortcuts opened by Ctrl+Shift+Space');
          status.textContent = 'VNC Shortcuts opened (Ctrl+Shift+Space)';
          return true;
        }
        // The explicit chord sender below owns Ctrl+Shift shortcuts. Do not
        // also let noVNC forward the physical Shift (or the Windows NumLock
        // state event sometimes emitted alongside it), otherwise the remote
        // WebView can observe a mismatched modifier state for KeyM/KeyL.
        if (keyEvent.ctrlKey && keyEvent.shiftKey && ['ShiftLeft', 'ShiftRight', 'NumLock'].includes(keyEvent.code)) {
          return true;
        }
        // Element overlays live inside a WebView whose focus can remain on a
        // host control after the remote application opens a menu. Send menu
        // navigation explicitly instead of relying on noVNC's canvas handler
        // to receive the bubbling browser event.
        const navigationKeys = {
          ArrowLeft: { key: 'Left', keysym: Keysyms.XK_Left },
          ArrowUp: { key: 'Up', keysym: Keysyms.XK_Up },
          ArrowRight: { key: 'Right', keysym: Keysyms.XK_Right },
          ArrowDown: { key: 'Down', keysym: Keysyms.XK_Down },
          Enter: { key: 'Enter', keysym: Keysyms.XK_Return },
          NumpadEnter: { key: 'Enter', keysym: Keysyms.XK_Return },
        };
        const navigation = navigationKeys[keyEvent.code];
        if (navigation) {
          sendChord([], '', navigation.key, navigation.keysym);
          api.log(`noVNC physical key sent: ${navigation.key}`);
          status.textContent = `Key sent: ${navigation.key}`;
          return true;
        }
        if (keyEvent.code === 'Escape') {
          sendChord([], '', 'Escape', Keysyms.XK_Escape);
          api.log('noVNC physical key sent: Escape');
          status.textContent = 'Key sent: Escape';
          return true;
        }
        if (keyEvent.code === 'Tab') {
          const modifiers = keyEvent.shiftKey ? [{ keysym: Keysyms.XK_Shift_L, code: 'ShiftLeft' }] : [];
          const label = keyEvent.shiftKey ? 'Shift+Tab' : 'Tab';
          sendChord(modifiers, '', 'Tab', Keysyms.XK_Tab);
          api.log(`noVNC physical key sent: ${label}`);
          status.textContent = `Key sent: ${label}`;
          return true;
        }
        if (
          ctrlBPrefixUntil > Date.now() &&
          !keyEvent.altKey && !keyEvent.metaKey &&
          keyEvent.code === 'KeyB'
        ) {
          ctrlBPrefixUntil = 0;
          const key = keyEvent.shiftKey ? 'B' : 'b';
          sendChord([], key, 'KeyB');
          api.log(`noVNC Ctrl+b prefix key sent: ${key}`);
          status.textContent = `Shortcut sent: Ctrl+b ${key}`;
          return true;
        }
        if (ctrlBPrefixUntil <= Date.now()) ctrlBPrefixUntil = 0;
        if (keyEvent.code === 'ControlLeft' || keyEvent.code === 'ControlRight') {
          api.log(`noVNC host keyboard capture: ${keyEvent.code}`);
          return true;
        }
        if (!keyEvent.ctrlKey) return false;
        if (keyEvent.shiftKey && keyEvent.code === 'KeyB') {
          dismissPrefixPalette(); sendSuperShiftB();
          return true;
        }
        if (/^Key[A-Z]$/.test(keyEvent.code)) {
          handledHostKeyEvents.add(keyEvent);
          // Ctrl+C must remain a remote terminal interrupt. Translating it
          // into a macOS Command/Option shortcut produces characters such as
          // "Ã§" on Vine rather than delivering Control+C.
          sendCtrlChord(keyEvent.key, keyEvent.shiftKey);
          return true;
        }
        return false;
      };
      releaseHostKeyCapture = overlay.captureKeys?.(handleHostCtrlKey) || (() => {});
      api.log('noVNC host keyboard capture armed');
      const originalKeyboardEvent = rfb._keyboard?.onkeyevent;
      if (typeof originalKeyboardEvent === 'function') {
        rfb._keyboard.onkeyevent = (keysym, code, down) => {
          if (ctrlBPrefixUntil > Date.now() && code === 'KeyB') {
            if (down) {
              ctrlBPrefixUntil = 0;
              suppressCtrlBPrefixKeyup = true;
              sendChord([], 'b', 'KeyB');
              api.log('noVNC Ctrl+b prefix key sent from canvas: b');
            } else if (suppressCtrlBPrefixKeyup) {
              suppressCtrlBPrefixKeyup = false;
            } else {
              originalKeyboardEvent(keysym, code, down);
            }
            return;
          }
          originalKeyboardEvent(keysym, code, down);
        };
      }
      const prefixHandler = (keyEvent) => {
        if (isClipboardPasteEvent(keyEvent)) return;
        if (handledHostKeyEvents.has(keyEvent)) return;
        // noVNC's browser keyboard synchronisation can consume a physical
        // Control press before the next key reaches the remote desktop.  Own
        // Ctrl+key chords here and send a complete press/release sequence.
        // This makes Ctrl+B (tmux/herd) and Ctrl+H (Emacs) deterministic.
        if (keyEvent.type === 'keyup') {
          if (keyEvent.code === 'ControlLeft' || keyEvent.code === 'ControlRight' || capturedControlKeys.delete(keyEvent.code)) {
            keyEvent.preventDefault(); keyEvent.stopImmediatePropagation();
          }
          return;
        }
        if (keyEvent.code === 'ControlLeft' || keyEvent.code === 'ControlRight') {
          api.log(`noVNC keyboard capture: ${keyEvent.code}`);
          keyEvent.preventDefault(); keyEvent.stopImmediatePropagation();
          return;
        }
        if (keyEvent.metaKey && keyEvent.shiftKey && keyEvent.code === 'Space') {
          keyEvent.preventDefault(); keyEvent.stopImmediatePropagation();
          rfb.sendKey(remoteSuperKeysym, remoteSuperCode, false);
          rfb.sendKey(Keysyms.XK_Shift_L, 'ShiftLeft', false);
          dismissPrefixPalette(); showPrefixPalette();
          api.log('noVNC VNC Shortcuts opened by canvas Super+Shift+Space');
          status.textContent = 'VNC Shortcuts opened (Super+Shift+Space)';
          return;
        }
        if (!keyEvent.ctrlKey || !keyEvent.shiftKey) return;
        if (keyEvent.code === 'KeyB') {
          keyEvent.preventDefault(); keyEvent.stopImmediatePropagation();
          dismissPrefixPalette(); sendSuperShiftB();
          return;
        }
        if (keyEvent.code === 'Space') {
          keyEvent.preventDefault(); keyEvent.stopImmediatePropagation();
          rfb.sendKey(Keysyms.XK_Control_L, 'ControlLeft', false);
          rfb.sendKey(Keysyms.XK_Shift_L, 'ShiftLeft', false);
          dismissPrefixPalette(); showPrefixPalette();
          api.log('noVNC VNC Shortcuts opened by canvas Ctrl+Shift+Space');
          status.textContent = 'VNC Shortcuts opened (Ctrl+Shift+Space)';
          return;
        }
        if (/^Key[A-Z]$/.test(keyEvent.code)) {
          keyEvent.preventDefault(); keyEvent.stopImmediatePropagation();
          capturedControlKeys.add(keyEvent.code);
          sendCtrlChord(keyEvent.key, true);
          return;
        }
        return;
      };
      const ctrlHandler = (keyEvent) => {
        if (isClipboardPasteEvent(keyEvent)) return;
        if (handledHostKeyEvents.has(keyEvent)) return;
        if (keyEvent.type !== 'keydown' || !keyEvent.ctrlKey || keyEvent.shiftKey || !/^Key[A-Z]$/.test(keyEvent.code)) return;
        keyEvent.preventDefault(); keyEvent.stopImmediatePropagation();
        capturedControlKeys.add(keyEvent.code);
        sendCtrlChord(keyEvent.key);
      };
      // The host capture on document owns the regular Ctrl+Shift path. Keep a
      // fallback only on document/canvas for WebViews that bypass it, but do
      // not register this fallback on window: window capture ran before the
      // host path and previously split modifier and KeyM/KeyL handling.
      const keyboardCanvas = rfb._canvas;
      const keyboardTargets = [document, keyboardCanvas];
      for (const target of keyboardTargets) {
        target.addEventListener('keydown', prefixHandler, true);
        target.addEventListener('keyup', prefixHandler, true);
        target.addEventListener('keydown', ctrlHandler, true);
      }
      api.log('noVNC keyboard capture armed (document + canvas)');
      const releaseRemotePointer = () => {
        if (!rfb || !rfb._mouseButtonMask) return;
        const position = rfb._mousePos || { x: 0, y: 0 };
        rfb._mouseButtonMask = 0;
        rfb._sendMouse(position.x, position.y, 0);
        api.log('noVNC recovered a missing remote mouse-button release');
      };
      // Let noVNC process normal canvas mouseup first. The bubbling window
      // listener is only a fallback when release occurs outside the canvas.
      window.addEventListener('mouseup', releaseRemotePointer);
      window.addEventListener('blur', releaseRemotePointer, true);
      clipboardPaste.addEventListener('focus', releaseRemotePointer);
      releaseRemotePointerCapture = () => {
        window.removeEventListener('mouseup', releaseRemotePointer);
        window.removeEventListener('blur', releaseRemotePointer, true);
        clipboardPaste.removeEventListener('focus', releaseRemotePointer);
        releaseRemotePointer();
      };
      removePrefixListener = () => {
        for (const target of keyboardTargets) {
          target.removeEventListener('keydown', prefixHandler, true);
          target.removeEventListener('keyup', prefixHandler, true);
          target.removeEventListener('keydown', ctrlHandler, true);
        }
      };
      requestAnimationFrame(() => {
        manualZoomActive = false;
        rfb.scaleViewport = true;
        zoom = fittedScale();
        normalizePointerCoordinates();
        const details = reportFramebuffer('connected');
        status.textContent = `Connected: ${event.detail?.name || 'VNC server'} (${details.framebuffer}) — clipboard sync is active.`;
      });
      window.setTimeout(() => {
        const details = reportFramebuffer('after connection');
        if (!details.canvas || details.canvas.width === 0 || details.canvas.height === 0) {
          status.textContent = `Connected, but no framebuffer yet (${details.framebuffer}). Check Plugin Activity.`;
        }
      }, 750);
    });
    rfb.addEventListener('clipboard', async (event) => {
      if (!clipboardSyncEnabled) return;
      const text = clipboardText(event.detail?.text);
      if (text === null) {
        api.log('noVNC clipboard remote-to-local skipped text over 1048576 bytes');
        return;
      }
      api.log(`noVNC clipboard remote event bytes=${new TextEncoder().encode(text || '').byteLength}`);
      if (!text || text === lastRemoteClipboard) return;
      try {
        await api.writeClipboard(text);
        lastRemoteClipboard = text;
        status.textContent = 'Remote clipboard copied to the local clipboard.';
        api.log(`noVNC clipboard remote-to-local synced bytes=${new TextEncoder().encode(text).byteLength}`);
      } catch (error) {
        api.log(`noVNC clipboard remote write failed: ${error}`);
      }
    });
    rfb.addEventListener('disconnect', (event) => {
      restoreVncBridgeCloseDiagnostics();
      restoreRa2WebsockReceiveDiagnostics();
      restoreRa2CryptoDiagnostics();
      stopClipboardSync();
      removePrefixListener(); releaseHostKeyCapture(); releaseRemotePointerCapture(); dismissPrefixPalette();
      for (const modifier of heldModifiers.values()) setToggleAppearance(modifier.button, false);
      heldModifiers.clear();
      const clean = Boolean(event.detail?.clean);
      status.textContent = connectionFailure || (clean
        ? 'Disconnected.'
        : 'Connection closed unexpectedly. Check Plugin Activity.');
      api.log(`noVNC disconnected: clean=${clean}${connectionFailure ? ` failure=${connectionFailure}` : ''}`);
    });
    rfb.addEventListener('securityfailure', (event) => {
      const detail = event.detail || {};
      const reason = typeof detail.reason === 'string' && detail.reason.trim()
        ? detail.reason.trim().slice(0, 240)
        : '';
      const securityStatus = Number.isFinite(Number(detail.status)) ? ` (status ${detail.status})` : '';
      connectionFailure = `VNC security negotiation failed${securityStatus}${reason ? `: ${reason}` : '.'}`;
      api.log(`noVNC security failure: ${JSON.stringify(detail)}`);
      status.textContent = connectionFailure;
    });
    rfb.addEventListener('serververification', async (event) => {
      if (connected || serverVerificationInProgress) {
        api.log('noVNC ignored an unexpected duplicate server-key verification request');
        return;
      }
      serverVerificationInProgress = true;
      const verificationState = rememberRa2State();
      if (!verificationState) {
        connectionFailure = 'VNC server key verification lost its RA2ne state.';
        status.textContent = connectionFailure;
        api.log(`noVNC RA2ne state missing at server-key verification: connection=${ra2ConnectionId}`);
        rfb.disconnect();
        serverVerificationInProgress = false;
        return;
      }
      ra2Phase = 'await-server-key-approval';
      const detail = event.detail || {};
      const publickey = detail.publickey instanceof Uint8Array
        ? detail.publickey
        : new Uint8Array(detail.publickey || []);
      let fingerprint = 'unavailable';
      try {
        const digest = await crypto.subtle.digest('SHA-256', publickey);
        fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(':');
      } catch (error) {
        api.log(`noVNC server-key fingerprint calculation failed: ${error}`);
      }
      const keyType = String(detail.type || 'unknown');
      api.log(`noVNC server-key verification requested type=${keyType} bytes=${publickey.byteLength} sha256=${fingerprint}; connection=${ra2ConnectionId}; state=${ra2StateId}`);
      status.textContent = 'VNC server key verification required.';
      let approved = false;
      try {
        if (typeof api.promptConfirm !== 'function') {
          // Keep older fpasoterm installs usable while making the required
          // host update visible. Their text field is ignored; any approval
          // button click accepts this connection-scoped server key.
          api.log('noVNC server-key verification: host lacks promptConfirm; using legacy confirmation prompt');
          const legacyApproval = await api.promptText({
            title: 'Verify VNC server key',
            message: `Security type: ${keyType}\nSHA-256: ${fingerprint}\n\nCompare this fingerprint with a trusted server administrator when possible. Select Trust and continue to approve this server key for this connection only. The text field is ignored.`,
            approve: 'Trust and continue',
          });
          approved = legacyApproval !== null;
        } else {
          approved = await api.promptConfirm({
            title: 'Verify VNC server key',
            message: `Security type: ${keyType}\nSHA-256: ${fingerprint}\n\nCompare this fingerprint with a trusted server administrator when possible. Select Trust and continue to approve this server key for this connection only.`,
            approve: 'Trust and continue',
            cancel: 'Reject',
          });
        }
      } catch (error) {
        connectionFailure = 'VNC server key confirmation could not be displayed.';
        status.textContent = connectionFailure;
        api.log(`noVNC server-key verification prompt failed: ${error}`);
        rfb.disconnect();
        return;
      } finally {
        serverVerificationInProgress = false;
      }
      if (!approved) {
        connectionFailure = 'VNC server key was not approved; connection cancelled.';
        status.textContent = connectionFailure;
        api.log('noVNC server-key verification rejected by user');
        rfb.disconnect();
        return;
      }
      if (typeof rfb.approveServer !== 'function') {
        connectionFailure = 'This noVNC build cannot approve the requested server key.';
        status.textContent = connectionFailure;
        api.log('noVNC server-key verification failed: approveServer is unavailable');
        rfb.disconnect();
        return;
      }
      const approvalState = rfb._rfbRSAAESAuthenticationState || null;
      const stateMatches = approvalState === verificationState;
      api.log(`noVNC RA2ne server-key approval state: connection=${ra2ConnectionId} state=${ra2StateId} matchesVerification=${stateMatches}`);
      if (!stateMatches) {
        connectionFailure = 'VNC server key verification state changed before approval.';
        status.textContent = connectionFailure;
        api.log(`noVNC RA2ne state mismatch before server-key approval: connection=${ra2ConnectionId} expected=${ra2StateId}`);
        rfb.disconnect();
        return;
      }
      ra2Phase = 'await-client-public-key';
      rfb.approveServer();
      status.textContent = 'VNC server key approved; continuing authentication…';
      api.log(`noVNC server-key approved for this connection; connection=${ra2ConnectionId}; state=${ra2StateId}`);
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
    restoreVncBridgeCloseDiagnostics();
    restoreRa2WebsockReceiveDiagnostics();
    restoreRa2CryptoDiagnostics();
    status.textContent = `Could not start noVNC: ${String(error)}`;
    api.log(`integration/novnc-local-bridge failed: ${String(error)}`);
  }
});
