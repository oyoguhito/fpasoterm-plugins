# Local Doom WebAssembly

Run Doom in a fpasoterm canvas with two assets you select yourself:

1. A `doom.wasm` built from the GPL-2.0-licensed
   [`jacobenget/doom.wasm`](https://github.com/jacobenget/doom.wasm) source.
2. A Doom base IWAD you are permitted to use.

No engine, WAD, save, mod, download, network connection, filesystem path, or
directory permission is included or requested by this port. Both selected files
remain in memory only while the canvas is open; saves are intentionally disabled.

The port accepts only the upstream's documented minimal WebAssembly interface:
the ten callbacks for loading, frames, time, logging, and disabled saves, plus
the four game functions and exported memory. It rejects modules with unexpected
imports so an arbitrary WebAssembly file cannot request additional host APIs.

`doom.wasm` currently has no sound support. See its upstream source and license
before building or distributing an engine. A structurally valid IWAD does not
prove ownership, compatibility, or redistribution permission.

## Install

Requires fpasoterm 1.6.3 or later.

```sh
fpasoterm --plugin-install integration/doom-wasm-local --enable
```

Restart fpasoterm, then choose **Plugins → Play local Doom (Wasm)**. Click the
canvas (or press Enter/Space) to select `doom.wasm`; do the same to select an
IWAD. Arrow keys move, Control fires, Space uses, Shift runs, and number/letter
keys retain Doom's usual meanings. Escape closes the canvas.
