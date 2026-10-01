/// <reference path="../../../api/fpasoterm-plugin.d.ts" />
// @fpasoterm-plugin version: 1.1.0
// @fpasoterm-plugin description: Prepares a reviewed terminal-browser command for the current tmux or herdr pane.

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
    message: 'Enter an HTTP(S) URL. The command is inserted into the current pane but is not executed.',
    approve: 'Insert',
  });
  if (value === null) return;
  const url = terminalBrowserUrl(value);
  // Single quotes work in the supported POSIX shells and PowerShell. The URL
  // validator rejects the characters that could escape or interpolate it.
  api.insertTerminalText(`terminal-browser open '${url}'`);
  api.log('terminal-browser command inserted; waiting for user Enter');
});
