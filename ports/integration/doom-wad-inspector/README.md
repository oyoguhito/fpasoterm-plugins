# Doom WAD Inspector

This plugin lets you explicitly choose one local Doom-format WAD file and
validates it entirely in fpasoterm's renderer. It displays the WAD kind, lump
count, selected standard Doom lumps, and SHA-256 fingerprint in a canvas modal.
An eligible base file begins with the ASCII bytes `IWAD`; `PWAD` is a mod and
is reported separately rather than accepted as the base game data.

It is an asset-inspection foundation for a future Doom engine integration; it
does not include, download, launch, or modify a game engine, WAD, save file, or
mod. It never receives the selected file path or a directory permission. The
chosen bytes remain in memory only while this plugin modal is open.

Use only WAD files you are permitted to use. A valid IWAD structure does not
establish ownership, compatibility with a particular engine, or permission to
redistribute the game data.

## Install

Requires fpasoterm 1.6.3 or later.

```sh
fpasoterm --plugin-install integration/doom-wad-inspector --enable
```

Restart fpasoterm, then choose **Plugins → Inspect local Doom IWAD**. Click the
canvas, or press Enter or Space, to select one `.wad` file. Escape closes the
panel.
