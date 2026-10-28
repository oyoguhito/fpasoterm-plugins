# terminal-browser helper

Adds **Insert terminal-browser command** to the fpasoterm Plugins menu.

This port deliberately does not add pane splitting to fpasoterm itself and does
not execute a shell command. Run the menu action in the destination pane,
review the inserted command, and press Enter yourself. Direct and tmux launches
remain in the current pane. Herdr launches use terminal-browser's own
`--split right` support so the browser pane can own focus and mouse capture
instead of competing with the shell pane.

```sh
fpasoterm --plugin-install integration/terminal-browser-helper --enable
```

The helper accepts only complete HTTP(S) URLs without embedded credentials. It
inserts `terminal-browser open '<url>'` inside a small POSIX cleanup wrapper.
The wrapper installs an exit trap, disables terminal mouse, focus,
bracketed-paste, and alternate-screen modes, and runs `stty sane` so Herdr
returns to normal pane navigation even after an interrupted browser process.
The helper never adds Enter or a literal control character.

The inserted command sets `TERMINAL_BROWSER_PRESENT=full`. fpasoterm's bounded
Kitty renderer supports complete frames but deliberately does not implement
terminal-browser's animation presenter. Pinning the public presenter prevents
a blank replacement frame from remaining above the completed page frame. The
normal GPU path remains enabled on every platform.

Inside a ChromeOS Crostini container detected through `SOMMELIER_VERSION`, the
inserted command uses Sommelier's X11 bridge for terminal-browser only. This
avoids Chromium's repeated Wayland/DRM initialization failures which can
produce a slow monochrome startup frame. Native Linux Wayland sessions and all
other applications keep their existing display backend.

The command scopes `PIXEL_FPS=15` to a direct launch. When `HERDR_PANE_ID` is
present, it instead uses `PIXEL_FPS=5 terminal-browser open --split right
--size 0.45`. The split keeps terminal-browser's keyboard and mouse capture in
the browser pane and leaves the original shell pane available for Herdr
navigation. The lower Herdr frame rate reduces pressure on the multiplexed PTY
while still keeping the page usable for verification. If the page is visible
but clicks or keys do not affect it, first move Herdr focus to the browser pane
with Herdr's pane selection shortcut or by clicking inside the browser pane;
the original fpasoterm title bar still controls the fpasoterm window, not the
new Herdr pane.
These settings do not change the user's global terminal-browser configuration
or affect ordinary terminal rendering.

After starting it with Enter, press **Ctrl+Q** to close terminal-browser and
return to the shell in the same pane. The fpasoterm title-bar **X** closes the
whole terminal window instead.

The browser page zoom can be changed while it is open. With fpasoterm's
default `terminal.kittyKeyboard = false`, terminal-browser uses its Alt-key
fallback for Command/Super shortcuts:

- **Alt+-** makes page text and content smaller. Five presses select 50%
  (100 → 90 → 80 → 75 → 67 → 50%).
- **Alt+=** (or **Alt++**) makes page text and content larger.
- **Alt+0** restores 100%.

These shortcuts change the rendered web page, not fpasoterm's terminal font.
terminal-browser does not expose an initial zoom option in its public
`open` command, so the helper does not modify the installed terminal-browser
program or depend on a private setting. If Kitty keyboard mode is explicitly
enabled and the terminal can transmit Super, terminal-browser uses Super
instead of the Alt fallback; that is not fpasoterm's default configuration.

On ChromeOS, where Alt may be reserved for pointer or window behavior,
fpasoterm displays `− / Zoom / ＋` directly in the title bar while terminal
graphics are active. `Zoom` opens these presets:

- **50%**
- **100%**

The controls disappear when terminal-browser exits. They require a current
fpasoterm 1.6.11 development build and do not add commands to the Plugins menu.

To verify resize handling, leave terminal-browser running, restore the
fpasoterm window from maximized state, and drag a window edge. The browser page
and its scrollbar should follow the new terminal size; maximize the window
again to verify a second resize. A narrow unused strip can remain at the right
or bottom because the terminal surface is fitted to whole character cells.

Requirements and current limits:

- `terminal-browser` must already be installed and available in the pane's
  `PATH`.
- tmux owns pane creation and lifecycle. fpasoterm remains a single PTY.
- Herdr owns pane creation and focus. The helper asks terminal-browser to open
  a Herdr split, but it cannot force Herdr focus from inside the shell command.
  If input stays in the original pane, select the browser pane before testing
  click/key handling.
- terminal-browser still needs a terminal graphics protocol supported by the
  host terminal. fpasoterm 1.6.11 adds a bounded direct Kitty PNG/RGB/RGBA
  renderer which serializes decode work and drops stale pending frames. The
  helper checks `capabilities.terminalGraphics` and refuses to insert the
  command on older or explicitly graphics-disabled builds.
- Update terminal-browser before diagnosing a Herdr-only failure:
  `terminal-browser upgrade`, followed by `terminal-browser shutdown`, ensures
  that a daemon started by an older installation is not reused. Fully restart
  Herdr as well; reloading only its config does not replace an old server or
  client process.
- The plugin does not use terminal-browser's private daemon socket or CDP
  database. Those are not public stable APIs.

## Codex use

This helper is not a replacement for Codex's terminal-browser skill, but it is
intended to make the same terminal-browser daemon usable from fpasoterm and
Herdr-backed fpasoterm sessions. After a human reviews and runs the inserted
command, a Codex process that can discover the resulting browser may control it
with `terminal-browser ls --all` and `terminal-browser action --browser ...`.
In Herdr, first make sure the browser split pane is focused for manual
click/key verification; Codex action commands can then target the discovered
browser by id. The helper itself does not expose a browser session, tab ID,
snapshot, click, or fill API to Codex. On fpasoterm builds without a safe
graphics renderer, starting the command still does not make the browser image
usable.

## Review

1. Rebuild and restart fpasoterm 1.6.11 or later.
2. Reinstall this port with `--force --enable`.
3. Run **Insert terminal-browser command**, enter an HTTP(S) URL, review the
   inserted command, and press Enter.
4. In a Herdr pane, confirm the reviewed command contains
   `PIXEL_FPS=5`, `--split right --size 0.45`, no literal control characters,
   and no inserted Enter. Press Enter, select the new browser pane if Herdr
   focus remains in the original shell pane, then confirm clicks, text input,
   and Ctrl+Q act on the browser pane. Confirm the original shell pane remains
   available for Herdr navigation after the browser closes.
5. In a direct fpasoterm shell, confirm the page appears and terminal input remains responsive while the
   page updates. Confirm the reviewed command contains
   `PIXEL_FPS=15`, no Herdr rejection guard, and
   `TERMINAL_BROWSER_PRESENT=full`. On Crostini, also confirm it
   contains `WAYLAND_DISPLAY= XDG_SESSION_TYPE=x11`. Confirm the fpasoterm
   title-bar buttons and menu remain responsive while the page updates. Press **Alt+-**,
   **Alt+=**, and **Alt+0** and confirm page
   zoom changes and resets. Restore/maximize or drag a window edge and confirm
   the page follows the terminal size.
6. Press **Ctrl+Q**, confirm terminal-browser closes, and confirm the shell in
   the same pane remains responsive.
7. Set `[terminal.images] enabled = false`, restart, and confirm the helper
   refuses to insert the command instead of starting an unusable session.
