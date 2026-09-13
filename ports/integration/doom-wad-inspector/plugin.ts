/// <reference path="../../../api/fpasoterm-plugin.d.ts" />
// @fpasoterm-plugin version: 1.0.2
// @fpasoterm-plugin description: Validates one explicitly selected Doom IWAD locally and shows its metadata and SHA-256.

const api = window.fpasotermPluginApi;
const textDecoder = new TextDecoder('ascii');

function wadName(bytes, offset) {
  return textDecoder.decode(bytes.subarray(offset, offset + 8)).replace(/\0+$/, '').trim();
}

function hex(bytes) {
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function printableHeader(bytes) {
  return [...bytes.subarray(0, 4)].map((value) => (
    value >= 0x20 && value <= 0x7e ? String.fromCharCode(value) : `\\x${value.toString(16).padStart(2, '0')}`
  )).join('');
}

async function inspectWad(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.byteLength < 12) throw new Error('file is smaller than a WAD header');
  const kind = textDecoder.decode(bytes.subarray(0, 4));
  if (kind !== 'IWAD' && kind !== 'PWAD') {
    throw new Error(`header is "${printableHeader(bytes)}", not IWAD or PWAD`);
  }
  const view = new DataView(buffer);
  const lumpCount = view.getInt32(4, true);
  const directoryOffset = view.getInt32(8, true);
  if (lumpCount < 0 || lumpCount > 1_000_000) throw new Error('invalid lump count');
  if (directoryOffset < 12 || directoryOffset > bytes.byteLength) throw new Error('invalid directory offset');
  const directoryLength = lumpCount * 16;
  if (directoryLength > bytes.byteLength - directoryOffset) throw new Error('directory extends beyond the file');
  const names = new Set();
  for (let index = 0; index < lumpCount; index += 1) {
    const offset = directoryOffset + index * 16;
    const lumpOffset = view.getInt32(offset, true);
    const lumpLength = view.getInt32(offset + 4, true);
    if (lumpOffset < 0 || lumpLength < 0 || lumpOffset > bytes.byteLength - lumpLength) {
      throw new Error(`lump ${index} extends beyond the file`);
    }
    names.add(wadName(bytes, offset + 8));
  }
  if (kind !== 'IWAD') throw new Error('select a base IWAD, not a PWAD mod');
  const required = ['PLAYPAL', 'COLORMAP', 'PNAMES', 'TEXTURE1'];
  const missing = required.filter((name) => !names.has(name));
  if (missing.length > 0) throw new Error(`not a standard Doom IWAD; missing ${missing.join(', ')}`);
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return {
    kind,
    lumpCount,
    directoryOffset,
    standardLumps: [...names].filter((name) => required.includes(name) || /^(E[1-4]M[1-9]|MAP[0-3][0-9])$/.test(name)).slice(0, 36),
    sha256: hex(new Uint8Array(digest)),
  };
}

function drawLines(canvas, lines) {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.fillStyle = '#101820';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#d8e7f5';
  context.font = '16px ui-monospace, monospace';
  context.textBaseline = 'top';
  const wrapped = [];
  for (const source of lines) {
    let line = '';
    for (const character of String(source)) {
      if (line && context.measureText(line + character).width > canvas.width - 48) {
        wrapped.push(line);
        line = character;
      } else {
        line += character;
      }
    }
    wrapped.push(line);
  }
  wrapped.forEach((line, index) => context.fillText(line, 24, 24 + index * 25));
}

api.registerCommand('doom-wad-inspector', 'Inspect local Doom IWAD', () => {
  const overlay = api.openCanvasOverlay({ title: 'Doom IWAD inspector', width: 960, height: 600 });
  const { canvas } = overlay;
  let selecting = false;
  let retryRequiresKeyboard = false;
  drawLines(canvas, [
    'Select a Doom IWAD you are permitted to use.',
    'Click this canvas, or press Enter or Space. Escape closes.',
    'The file path is never exposed; selected bytes stay in memory only.',
  ]);
  const selectAndInspect = async () => {
    if (selecting) return;
    selecting = true;
    try {
      const asset = await api.selectLocalAsset({
        accept: ['.wad', 'application/octet-stream'],
        maxBytes: 64 * 1024 * 1024,
      });
      if (!asset) {
        drawLines(canvas, ['No file selected.', 'Click, Enter, or Space to select a Doom IWAD.']);
        return;
      }
      const wad = await inspectWad(asset.bytes);
      drawLines(canvas, [
        `Validated local ${wad.kind}: ${asset.name}`,
        `Size: ${asset.size.toLocaleString()} bytes   Lumps: ${wad.lumpCount.toLocaleString()}`,
        `Directory offset: ${wad.directoryOffset.toLocaleString()}`,
        `Standard lumps: ${wad.standardLumps.join(', ') || '(none found)'}`,
        `SHA-256: ${wad.sha256}`,
        '',
        'This confirms WAD structure only. It does not confirm ownership, engine compatibility,',
        'or redistribution rights. A future GPL-compatible engine may consume these in-memory bytes.',
      ]);
      api.log(`integration/doom-wad-inspector validated ${asset.name} sha256=${wad.sha256}`);
    } catch (error) {
      retryRequiresKeyboard = true;
      drawLines(canvas, ['Could not validate this Doom IWAD.', String(error), '', 'Press Enter or Space to try another file. Click only focuses this error message.']);
      api.log(`integration/doom-wad-inspector validation failed: ${String(error)}`);
    } finally {
      selecting = false;
    }
  };
  canvas.addEventListener('click', () => {
    if (retryRequiresKeyboard) {
      canvas.focus();
      return;
    }
    void selectAndInspect();
  });
  canvas.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      retryRequiresKeyboard = false;
      void selectAndInspect();
    }
  });
});
