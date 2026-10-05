# terminal-browser helper

Adds **Insert terminal-browser command** to the fpasoterm Plugins menu.

This port deliberately does not add pane splitting to fpasoterm and does not
execute a shell command. Run the menu action in the destination pane, review
the inserted command, and press Enter yourself. Direct and tmux launches
remain in the current pane. Herdr launches are rejected before terminal modes
are changed.

```sh
fpasoterm --plugin-install integration/terminal-browser-helper --enable
```

The helper accepts only complete HTTP(S) URLs without embedded credentials. It
inserts `terminal-browser open '<url>'` inside a small POSIX cleanup wrapper.
The wrapper installs an exit trap, disables terminal mouse, focus,
bracketed-paste, and alternate-screen modes, and runs `stty sane` so Herdr
returns to normal pane navigation even after an interrupted browser process.
The helper never adds `--split`, Enter, or a literal control character.

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

The command scopes `PIXEL_FPS=15` to a direct launch. Tests with Herdr 0.9.3
showed that its Kitty pass-through can deliver full raw frames with invalid
payload lengths or base64 data. The same PTY also carries keyboard and mouse
reports, producing intermittent input, missing clicks, and alternating frame
sizes. Lowering the frame rate to 1 FPS did not make this transport reliable,
so `HERDR_PANE_ID` now causes a clear error instead of starting an unusable
session. The helper intentionally stays in the current pane so a supported
direct launch can use the full terminal area and does not leave a split behind.
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
- Herdr Kitty pass-through is not supported for this helper. Run it from a
  direct fpasoterm shell. The guard uses `HERDR_PANE_ID` and avoids entering
  alternate-screen or mouse modes before reporting the limitation. The reject
  branch also skips the cleanup wrapper, so it does not reset Herdr's existing
  mouse, focus, bracketed-paste, alternate-screen, or tty state.
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

This helper is not a replacement for Codex's terminal-browser skill. After a
human reviews and runs the inserted command, a Codex process that can discover
the resulting browser may control it with `terminal-browser ls --all` and
`terminal-browser action --browser ...`. The helper itself does not expose a
browser session, tab ID, snapshot, click, or fill API to Codex. On fpasoterm
builds without a safe graphics renderer, starting the command still does not
make the browser image usable.

## Review

1. Rebuild and restart fpasoterm 1.6.11 or later.
2. Reinstall this port with `--force --enable`.
3. Run **Insert terminal-browser command**, enter an HTTP(S) URL, review the
   inserted command, and press Enter.
4. In a Herdr pane, confirm the command reports that pass-through is unsupported,
   does not open terminal-browser, and leaves the shell immediately responsive.
5. In a direct fpasoterm shell, confirm the page appears and terminal input remains responsive while the
   page updates. Confirm the reviewed command contains
   `PIXEL_FPS=15`, the Herdr rejection guard, no `--split`, and
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
