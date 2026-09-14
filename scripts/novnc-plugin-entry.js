import RFB from '@novnc/novnc/lib/rfb.js';
import Keysyms from '@novnc/novnc/lib/input/keysym.js';

const api = window.fpasotermPluginApi;

api.registerCommand('novnc-local-bridge', 'Open noVNC local bridge (test)', async () => {
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
  const control = document.createElement('button');
  const alt = document.createElement('button');
  const shift = document.createElement('button');
  const superKey = document.createElement('button');
  const releaseKeys = document.createElement('button');
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
  ]) {
    button.type = 'button'; button.textContent = label;
    button.style.cssText = 'padding:5px 7px;border:1px solid #59738c;border-radius:4px;background:#263b4e;color:#edf5fc';
  }
  panLeft.title = 'Pan left'; panUp.title = 'Pan up';
  panDown.title = 'Pan down'; panRight.title = 'Pan right';
  overview.title = 'Show a clickable overview of the complete remote desktop';
  toolbar.append(status, zoomOut, zoomIn, fit, overview, panLeft, panUp, panDown, panRight);
  screen.append(panCapture, navigator);
  overlay.element.replaceChildren(toolbar, screen);
  status.textContent = 'Waiting for connection confirmation…';
  let rfb;
  let connected = false;
  let zoom = 1;
  let dragPan = null;
  let lastPointer = { x: 24, y: 24 };
  let prefixTimer = null;
  let prefixPalette = null;
  let removePrefixListener = () => {};
  const heldModifiers = new Map();
  const setToggleAppearance = (button, enabled) => {
    button.setAttribute('aria-pressed', String(enabled));
    button.style.background = enabled ? '#2d7d46' : '#263b4e';
  };
  const display = () => rfb?._display;
  const viewport = () => display()?._viewportLoc;
  const fittedScale = () => {
    const remote = display();
    if (!remote?.width || !remote?.height) return 1;
    return Math.min(screen.clientWidth / remote.width, screen.clientHeight / remote.height);
  };
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
  const enablePan = (preserveFitScale = false) => {
    if (!rfb) return null;
    const remote = display();
    // Preserve Fit's current visual scale before disabling automatic scaling.
    // Previously this reset to 100%, which made simply enabling Pan look like
    // an unexpected zoom-in.
    if (preserveFitScale && rfb.scaleViewport) zoom = fittedScale();
    rfb.scaleViewport = false;
    rfb.clipViewport = true;
    // A clipped noVNC viewport is an internal framebuffer region, not a DOM
    // scroll container. Resize that region for the desired visual zoom.
    if (remote && zoom > 0) {
      remote.scale = zoom;
      remote.viewportChangeSize(screen.clientWidth / zoom, screen.clientHeight / zoom);
    }
    drawNavigator();
    return display();
  };
  const panBy = (left, top) => {
    const remote = enablePan(true);
    if (!remote) return;
    remote.viewportChangePos(left / zoom, top / zoom);
    drawNavigator();
    const position = viewport();
    api.log(`noVNC pan: x=${position.x}, y=${position.y}, viewport=${position.w}x${position.h}, framebuffer=${remote.width}x${remote.height}`);
    status.textContent = 'Panning at 100%. Enable Pan to drag with the mouse.';
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
  const sendChord = (modifiers, character, code) => {
    if (!rfb) return;
    for (const modifier of modifiers) rfb.sendKey(modifier.keysym, modifier.code, true);
    rfb.sendKey(character.codePointAt(0), code, true);
    rfb.sendKey(character.codePointAt(0), code, false);
    for (const modifier of [...modifiers].reverse()) rfb.sendKey(modifier.keysym, modifier.code, false);
  };
  const sendCtrlChord = (character, includeShift = false) => {
    const upper = character.toUpperCase();
    const code = /^[A-Z]$/.test(upper) ? `Key${upper}` : `Digit${upper}`;
    const modifiers = [{ keysym: Keysyms.XK_Control_L, code: 'ControlLeft' }];
    if (includeShift) modifiers.push({ keysym: Keysyms.XK_Shift_L, code: 'ShiftLeft' });
    sendChord(modifiers, upper, code);
    api.log(`noVNC physical shortcut sent: Ctrl${includeShift ? '+Shift' : ''}+${upper}`);
    status.textContent = `Shortcut sent: Ctrl${includeShift ? '+Shift' : ''}+${upper}`;
  };
  const sendSuperShiftB = () => {
    if (!rfb) return;
    // Ctrl may have reached noVNC before Shift armed the local prefix. Release
    // it before sending the requested remote-only chord.
    rfb.sendKey(Keysyms.XK_Control_L, 'ControlLeft', false);
    rfb.sendKey(Keysyms.XK_Shift_L, 'ShiftLeft', false);
    rfb.sendKey(Keysyms.XK_Super_L, 'MetaLeft', true);
    rfb.sendKey(Keysyms.XK_Shift_L, 'ShiftLeft', true);
    rfb.sendKey('B'.codePointAt(0), 'KeyB', true);
    rfb.sendKey('B'.codePointAt(0), 'KeyB', false);
    rfb.sendKey(Keysyms.XK_Shift_L, 'ShiftLeft', false);
    rfb.sendKey(Keysyms.XK_Super_L, 'MetaLeft', false);
    api.log('noVNC shortcut sent: Super+Shift+B (client Ctrl+Shift+B)');
    status.textContent = 'Shortcut sent: Super+Shift+B';
  };
  const dismissPrefixPalette = () => {
    if (prefixTimer) { window.clearTimeout(prefixTimer); prefixTimer = null; }
    prefixPalette?.remove(); prefixPalette = null;
    // Restore normal pointer control only after the shortcut UI is gone.
    if (rfb?._canvas) rfb._canvas.style.pointerEvents = '';
  };
  const showPrefixPalette = () => {
    if (prefixPalette || !rfb) return;
    // The palette floats over the canvas, but browsers can still deliver a
    // preceding move to noVNC while the user aims at a button. Disable canvas
    // hit-testing for the entire palette lifetime to keep the remote cursor
    // exactly where it was.
    if (rfb._canvas) rfb._canvas.style.pointerEvents = 'none';
    const palette = document.createElement('div');
    const title = document.createElement('strong');
    const keyButtons = [control, alt, shift, superKey];
    const releaseButton = releaseKeys;
    const escapeButton = escapeKey;
    const closeButton = document.createElement('button');
    control.textContent = 'Ctrl'; alt.textContent = 'Alt'; shift.textContent = 'Shift'; superKey.textContent = 'Super';
    releaseButton.textContent = 'Release'; escapeButton.textContent = 'Esc'; closeButton.textContent = 'Close';
    palette.style.cssText = `position:absolute;z-index:30;left:${Math.max(8, Math.min(screen.clientWidth - 500, lastPointer.x))}px;top:${Math.max(8, Math.min(screen.clientHeight - 42, lastPointer.y))}px;display:flex;align-items:center;gap:6px;padding:7px;border:1px solid #9ac7ee;border-radius:5px;background:#17212b;color:#edf5fc;font:13px ui-monospace,monospace`;
    // A noVNC canvas must never receive pointer events aimed at the shortcut
    // UI.  Otherwise selecting Ctrl/Alt/etc. also moves the remote cursor.
    palette.style.pointerEvents = 'auto';
    palette.tabIndex = 0;
    palette.setAttribute('aria-label', 'VNC shortcuts: choose modifiers, then press an alphanumeric key to send the chord');
    for (const button of [...keyButtons, releaseButton, escapeButton, closeButton]) {
      button.type = 'button';
      button.style.cssText = 'padding:5px 7px;border:1px solid #59738c;border-radius:4px;background:#263b4e;color:#edf5fc';
    }
    control.onclick = () => toggleModifier(control, 'Control', Keysyms.XK_Control_L, 'ControlLeft');
    alt.onclick = () => toggleModifier(alt, 'Alt', Keysyms.XK_Alt_L, 'AltLeft');
    shift.onclick = () => toggleModifier(shift, 'Shift', Keysyms.XK_Shift_L, 'ShiftLeft');
    superKey.onclick = () => toggleModifier(superKey, 'Super', Keysyms.XK_Super_L, 'MetaLeft');
    releaseButton.onclick = releaseModifiers;
    escapeButton.onclick = () => {
      rfb.sendKey(Keysyms.XK_Escape, 'Escape', true);
      rfb.sendKey(Keysyms.XK_Escape, 'Escape', false);
      api.log('noVNC palette key sent: Escape');
      dismissPrefixPalette();
    };
    closeButton.onclick = dismissPrefixPalette;
    for (const eventName of ['pointerdown', 'pointermove', 'pointerup', 'mousedown', 'mousemove', 'mouseup', 'click']) {
      // Bubble phase preserves the button's own click handler, then prevents
      // the event from reaching the RFB host below the palette.
      palette.addEventListener(eventName, (event) => event.stopPropagation());
    }
    palette.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); dismissPrefixPalette(); return; }
      if (!/^[a-z0-9]$/i.test(event.key) || !rfb) return;
      event.preventDefault(); event.stopPropagation();
      const character = event.key.toUpperCase();
      const code = /^[A-Z]$/.test(character) ? `Key${character}` : `Digit${character}`;
      const modifiers = [...heldModifiers.values()];
      sendChord(modifiers, character, code);
      api.log(`noVNC palette shortcut sent: ${[...heldModifiers.keys(), character].join('+')}`);
      releaseModifiers(); dismissPrefixPalette();
    });
    palette.append(title, ...keyButtons, releaseButton, escapeButton, closeButton); screen.append(palette); prefixPalette = palette;
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
  zoomOut.addEventListener('click', () => { zoom = Math.max(0.1, zoom - 0.1); applyZoom(); });
  zoomIn.addEventListener('click', () => { zoom = Math.min(2.5, zoom + 0.1); applyZoom(); });
  fit.addEventListener('click', () => {
    if (rfb) {
      rfb.clipViewport = false;
      rfb.scaleViewport = true;
      requestAnimationFrame(() => {
        zoom = fittedScale();
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
    if (zoom < 1.5) { zoom = 1.5; applyZoom(); }
    const remote = enablePan();
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
      removePrefixListener();
      const capturedControlKeys = new Set();
      const prefixHandler = (keyEvent) => {
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
        if (keyEvent.type !== 'keydown' || !keyEvent.ctrlKey || keyEvent.shiftKey || !/^Key[A-Z]$/.test(keyEvent.code)) return;
        keyEvent.preventDefault(); keyEvent.stopImmediatePropagation();
        capturedControlKeys.add(keyEvent.code);
        sendCtrlChord(keyEvent.key);
      };
      // noVNC registers its keyboard handler directly on its canvas. Capture
      // at every DOM level that can receive a desktop WebView key event.
      // ChromeOS/WebKit variants differ on whether it reaches window, document,
      // or only the focused canvas.
      const keyboardCanvas = rfb._canvas;
      const keyboardTargets = [window, document, keyboardCanvas];
      for (const target of keyboardTargets) {
        target.addEventListener('keydown', prefixHandler, true);
        target.addEventListener('keyup', prefixHandler, true);
        target.addEventListener('keydown', ctrlHandler, true);
      }
      api.log('noVNC keyboard capture armed (window + document + canvas)');
      removePrefixListener = () => {
        for (const target of keyboardTargets) {
          target.removeEventListener('keydown', prefixHandler, true);
          target.removeEventListener('keyup', prefixHandler, true);
          target.removeEventListener('keydown', ctrlHandler, true);
        }
      };
      requestAnimationFrame(() => {
        rfb.scaleViewport = true;
        zoom = fittedScale();
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
      removePrefixListener(); dismissPrefixPalette();
      for (const modifier of heldModifiers.values()) setToggleAppearance(modifier.button, false);
      heldModifiers.clear();
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
