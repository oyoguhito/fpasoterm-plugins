/// <reference path="../../../api/fpasoterm-plugin.d.ts" />
// @fpasoterm-plugin version: 1.1.15
// @fpasoterm-plugin description: Prepares a reviewed terminal-browser command for fpasoterm and Herdr panes.

const api = window.fpasotermPluginApi;

function terminalBrowserUrl(value) {
  let url;
  try {
    url = new URL(String(value || '').trim());
  } catch {
    throw new Error('Enter a complete http:// or https:// URL.');
  }
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) {
    throw new Error('Only HTTP(S) URLs without embedded credentials are accepted.');
  }
  const normalized = url.toString();
  if (/[\u0000-\u001f\u007f'`$!]/u.test(normalized)) {
    throw new Error('The URL contains characters that cannot be inserted safely.');
  }
  return normalized;
}

api.log('integration/terminal-browser-helper loaded');
api.registerCommand('terminal-browser-helper.insert', 'Insert terminal-browser command', async () => {
  if (!api.capabilities.terminalGraphics) {
    throw new Error('terminal-browser is blocked because this fpasoterm build has no safe terminal graphics renderer. Use an external supported terminal; the command was not inserted.');
  }
  const value = await api.promptText({
    title: 'terminal-browser URL',
    message: 'Enter an HTTP(S) URL. Review the inserted command and press Enter to start. Use the title-bar − / Zoom / ＋ controls to adjust page size and Ctrl+Q to return to the terminal.',
    approve: 'Insert',
  });
  if (value === null) return;
  const url = terminalBrowserUrl(value);
  // The generated wrapper targets supported POSIX shells. The URL validator
  // rejects characters that could escape or interpolate its single quotes.
  // Herdr can retain the application's mouse/alternate-screen modes when the
  // child exits without forwarding its final VT cleanup to the outer terminal.
  // Emit only standard disable/reset sequences after terminal-browser returns;
  // the inserted text remains reviewable and does not include a literal C0
  // control character or Enter.
  const cleanup = "terminal_browser_cleanup() { printf '\\033[?1006l\\033[?1016l\\033[?1003l\\033[?1002l\\033[?1000l\\033[?1004l\\033[?2004l\\033[?1049l\\033[0m\\033[?25h'; stty sane 2>/dev/null || true; }";
  // fpasoterm's bounded renderer intentionally implements complete Kitty
  // frames, not terminal-browser's animation or patch presenters.  Pin the
  // public presenter environment variable so auto-detection cannot leave a
  // newer blank frame above a completed page frame.  Keep the normal GPU path;
  // disabling it did not improve Crostini and made startup/rendering slower.
  // Bound capture as well as presentation. At display-rate, complete frames
  // can keep a WebView main thread busy enough that fpasoterm title-bar clicks
  // are delayed. This is scoped to the inserted command and does not change
  // the user's global terminal-browser configuration.
  // Chromium's Wayland/DRM initialization is unreliable in ChromeOS's
  // Sommelier container even though its X11 bridge is available. Scope the
  // X11 preference to that environment; native Wayland sessions are unchanged.
  // In Herdr, opening terminal-browser in the current pane leaves one PTY
  // stream carrying browser graphics plus shell input/mouse state. Prefer a
  // Herdr-managed split pane so the browser pane can own focus and mouse
  // capture. Keep the frame rate lower there to reduce back-pressure through
  // Herdr's Kitty pass-through. The inserted text still contains no literal
  // control characters or Enter; the user reviews it and presses Enter.
  const herdrLaunch = `PIXEL_FPS=5 TERMINAL_BROWSER_PRESENT=full terminal-browser open '${url}' --split right --size 0.45`;
  const directLaunch = `if [ -n "\${SOMMELIER_VERSION:-}" ] && [ -n "\${DISPLAY:-}" ]; then WAYLAND_DISPLAY= XDG_SESSION_TYPE=x11 PIXEL_FPS=15 TERMINAL_BROWSER_PRESENT=full terminal-browser open '${url}'; else PIXEL_FPS=15 TERMINAL_BROWSER_PRESENT=full terminal-browser open '${url}'; fi`;
  const launch = `if [ -n "\${HERDR_PANE_ID:-}" ]; then ${herdrLaunch}; else ${directLaunch}; fi`;
  const restore = "terminal_browser_status=$?; trap - EXIT; terminal_browser_cleanup; (exit \"$terminal_browser_status\")";
  api.insertTerminalText(`${cleanup}; trap terminal_browser_cleanup EXIT; ${launch}; ${restore}`);
  api.log('terminal-browser command inserted with Herdr split-pane launch, Crostini X11 fallback, full-frame presentation, and trapped post-exit terminal recovery; press Enter to start; use the title-bar zoom controls, and Ctrl+Q returns');
});
