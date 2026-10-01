# terminal-browser helper

Adds **Insert terminal-browser command** to the fpasoterm Plugins menu.

This port deliberately does not add pane splitting to fpasoterm and does not
execute a shell command. Prepare the destination pane with tmux or herdr, run
the menu action in that pane, review the inserted command, and press Enter
yourself.

```sh
fpasoterm --plugin-install integration/terminal-browser-helper --enable
```

The helper accepts only complete HTTP(S) URLs without embedded credentials. It
inserts `terminal-browser open '<url>'`; it never adds `--split`, Enter, Escape,
or another control character.

Requirements and current limits:

- `terminal-browser` must already be installed and available in the pane's
  `PATH`.
- tmux/herdr owns pane creation and lifecycle. fpasoterm remains a single PTY.
- terminal-browser still needs a terminal graphics protocol supported by the
  host terminal. fpasoterm 1.6.11 adds a bounded direct Kitty PNG/RGB/RGBA
  renderer which serializes decode work and drops stale pending frames. The
  helper checks `capabilities.terminalGraphics` and refuses to insert the
  command on older or explicitly graphics-disabled builds.
- The plugin does not use terminal-browser's private daemon socket or CDP
  database. Those are not public stable APIs in terminal-browser 0.5.3.

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
4. Confirm the page appears and terminal input remains responsive while the
   page updates. Close it with terminal-browser's normal quit command.
5. Set `[terminal.images] enabled = false`, restart, and confirm the helper
   refuses to insert the command instead of starting an unusable session.
