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
  host terminal. Current fpasoterm builds intentionally disable Kitty/SIXEL/
  iTerm image rendering because the available xterm image addon can freeze the
  Tauri/WebKitGTK WebView on ChromeOS. On that platform this helper prepares a
  command correctly, but the browser image is not yet expected to render.
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
