/// <reference path="../../../api/fpasoterm-plugin.d.ts" />
// @fpasoterm-plugin version: 1.0.1
// @fpasoterm-plugin description: Runs a user-selected Doom WebAssembly engine and user-owned IWAD in a local canvas.

const api = window.fpasotermPluginApi;
const requiredImports = new Set([
  'console.onErrorMessage', 'console.onInfoMessage',
  'gameSaving.readSaveGame', 'gameSaving.sizeOfSaveGame', 'gameSaving.writeSaveGame',
  'loading.onGameInit', 'loading.readWads', 'loading.wadSizes',
  'runtimeControl.timeInMilliseconds', 'ui.drawFrame',
]);
const requiredExports = ['initGame', 'reportKeyDown', 'reportKeyUp', 'tickGame', 'memory'];

function inspectIwad(bytes) {
  const data = new Uint8Array(bytes);
  if (data.byteLength < 12 || new TextDecoder('ascii').decode(data.subarray(0, 4)) !== 'IWAD') {
    throw new Error('select a base IWAD file');
  }
  const view = new DataView(bytes);
  const lumps = view.getInt32(4, true);
  const directory = view.getInt32(8, true);
  if (lumps < 0 || directory < 12 || lumps > 1_000_000 || lumps * 16 > data.byteLength - directory) {
    throw new Error('IWAD directory is invalid');
  }
}

function validateEngine(module) {
  const imports = WebAssembly.Module.imports(module);
  const importsSeen = new Set(imports.map((entry) => `${entry.module}.${entry.name}`));
  if (imports.length !== requiredImports.size || importsSeen.size !== requiredImports.size
    || [...importsSeen].some((entry) => !requiredImports.has(entry))) {
    throw new Error('engine does not match the supported doom.wasm interface');
  }
  const exports = new Map(WebAssembly.Module.exports(module).map((entry) => [entry.name, entry.kind]));
  if (requiredExports.some((name) => !exports.has(name)) || exports.get('memory') !== 'memory'
    || requiredExports.slice(0, -1).some((name) => exports.get(name) !== 'function')) {
    throw new Error('engine is missing a required doom.wasm export');
  }
}

function drawMessage(canvas, lines) {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.fillStyle = '#101820';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#d8e7f5';
  context.font = '16px ui-monospace, monospace';
  context.textBaseline = 'top';
  lines.forEach((line, index) => context.fillText(line, 24, 24 + index * 25));
}

api.registerCommand('doom-wasm-local', 'Play local Doom (Wasm)', () => {
  const overlay = api.openCanvasOverlay({ title: 'Local Doom (Wasm)', width: 960, height: 600 });
  const { canvas } = overlay;
  let engine;
  let selecting = false;
  let gameStarted = false;
  let selectionStage = 'selecting a doom.wasm engine';
  drawMessage(canvas, ['Click, Enter, or Space to select a GPL-compatible doom.wasm engine.', 'Escape closes. No file path, save data, or network access is used.']);

  const selectAsset = async () => {
    if (selecting || gameStarted) return;
    selecting = true;
    try {
      if (!engine) {
        selectionStage = 'validating the doom.wasm engine';
        const asset = await api.selectLocalAsset({ accept: ['.wasm', 'application/wasm'], maxBytes: 16 * 1024 * 1024 });
        if (!asset) return;
        const module = await WebAssembly.compile(asset.bytes);
        validateEngine(module);
        engine = asset.bytes;
        drawMessage(canvas, ['Validated doom.wasm interface.', 'Click, Enter, or Space to select your base IWAD.']);
        return;
      }
      selectionStage = 'reading the selected IWAD';
      const wad = await api.selectLocalAsset({ accept: ['.wad', 'application/octet-stream'], maxBytes: 64 * 1024 * 1024 });
      if (!wad) return;
      inspectIwad(wad.bytes);
      selectionStage = 'initializing Doom with the selected IWAD';
      await startGame(canvas, engine, wad.bytes, wad.name);
      gameStarted = true;
    } catch (error) {
      drawMessage(canvas, [
        `Could not start local Doom while ${selectionStage}.`,
        String(error),
        '',
        'Click, Enter, or Space to try again. The selected files remain in memory only.',
      ]);
      api.log(`integration/doom-wasm-local failed while ${selectionStage}: ${String(error)}`);
    } finally {
      selecting = false;
    }
  };
  canvas.addEventListener('click', () => { void selectAsset(); });
  canvas.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void selectAsset();
    }
  });
});

async function startGame(canvas, engineBytes, wadBytes, wadName) {
  const wad = new Uint8Array(wadBytes);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas is unavailable');
  let exports;
  let width = 320;
  let height = 200;
  let image;
  let running = true;
  const readText = (pointer, length) => {
    if (!exports || pointer < 0 || length < 0 || pointer > exports.memory.buffer.byteLength - length) return '';
    return new TextDecoder().decode(new Uint8Array(exports.memory.buffer, pointer, length));
  };
  const module = await WebAssembly.compile(engineBytes);
  validateEngine(module);
  const instance = await WebAssembly.instantiate(module, {
    loading: {
      onGameInit: (nextWidth, nextHeight) => {
        width = nextWidth;
        height = nextHeight;
        if (width <= 0 || height <= 0 || width * height > 1_000_000) throw new Error('engine requested an unsafe frame size');
        canvas.width = width;
        canvas.height = height;
        image = context.createImageData(width, height);
      },
      wadSizes: (countPointer, sizePointer) => {
        const memory = new DataView(exports.memory.buffer);
        memory.setInt32(countPointer, 1, true);
        memory.setInt32(sizePointer, wad.byteLength, true);
      },
      readWads: (destination, lengths) => {
        const memory = new Uint8Array(exports.memory.buffer);
        if (destination < 0 || wad.byteLength > memory.byteLength - destination || lengths < 0 || lengths > memory.byteLength - 4) {
          throw new Error('engine supplied an invalid WAD memory range');
        }
        memory.set(wad, destination);
        new DataView(exports.memory.buffer).setInt32(lengths, wad.byteLength, true);
      },
    },
    runtimeControl: { timeInMilliseconds: () => BigInt(Math.floor(performance.now())) },
    ui: {
      drawFrame: (pointer) => {
        if (!image || pointer < 0 || width * height * 4 > exports.memory.buffer.byteLength - pointer) return;
        const source = new Uint8ClampedArray(exports.memory.buffer, pointer, width * height * 4);
        for (let index = 0; index < source.length; index += 4) {
          image.data[index] = source[index + 2];
          image.data[index + 1] = source[index + 1];
          image.data[index + 2] = source[index];
          image.data[index + 3] = source[index + 3];
        }
        context.putImageData(image, 0, 0);
      },
    },
    gameSaving: { sizeOfSaveGame: () => 0, readSaveGame: () => 0, writeSaveGame: () => 0 },
    console: {
      onInfoMessage: (pointer, length) => api.log(`doom: ${readText(pointer, length)}`),
      onErrorMessage: (pointer, length) => api.log(`doom error: ${readText(pointer, length)}`),
    },
  });
  exports = instance.exports;
  exports.initGame();
  api.log(`integration/doom-wasm-local started ${wadName}; saves are disabled`);
  const specialKey = (event) => {
    const names = {
      ArrowLeft: 'KEY_LEFTARROW', ArrowRight: 'KEY_RIGHTARROW', ArrowUp: 'KEY_UPARROW', ArrowDown: 'KEY_DOWNARROW',
      Control: 'KEY_FIRE', ' ': 'KEY_USE', Shift: 'KEY_SHIFT', Alt: 'KEY_ALT', Backspace: 'KEY_BACKSPACE',
    };
    const name = names[event.key];
    if (name && exports[name] instanceof WebAssembly.Global) return exports[name].value;
    return event.key.length === 1 && event.key.charCodeAt(0) >= 32 && event.key.charCodeAt(0) <= 126 ? event.key.toLowerCase().charCodeAt(0) : undefined;
  };
  const sendKey = (down) => (event) => {
    const key = specialKey(event);
    if (key === undefined || !canvas.isConnected) return;
    event.preventDefault();
    (down ? exports.reportKeyDown : exports.reportKeyUp)(key);
  };
  const onKeyDown = sendKey(true);
  const onKeyUp = sendKey(false);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('keyup', onKeyUp, true);
  const frame = () => {
    if (!running || !canvas.isConnected) {
      running = false;
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup', onKeyUp, true);
      return;
    }
    try {
      exports.tickGame();
      requestAnimationFrame(frame);
    } catch (error) {
      running = false;
      drawMessage(canvas, ['Doom engine stopped.', String(error)]);
      api.log(`integration/doom-wasm-local runtime failed: ${String(error)}`);
    }
  };
  requestAnimationFrame(frame);
}
