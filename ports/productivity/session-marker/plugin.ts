/// <reference path="../../../api/fpasoterm-plugin.d.ts" />
// @fpasoterm-plugin version: 1.0.0
// @fpasoterm-plugin description: Adds a command that writes a local timestamp marker for terminal logs.

// Uses browser-local time to add a visible separator without calling the shell or network.
const api = window.fpasotermPluginApi;

api.log('productivity/session-marker loaded');
api.registerCommand('session-marker.insert', 'Insert Session Marker', () => {
  const timestamp = new Date().toISOString();
  api.terminal.writeln(`\r\n--- fpasoterm session marker ${timestamp} ---`);
  api.terminal.focus();
});
