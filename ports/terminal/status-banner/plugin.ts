/// <reference path="../../../api/fpasoterm-plugin.d.ts" />
// @fpasoterm-plugin version: 1.0.0
// @fpasoterm-plugin description: Adds a Plugins menu command that prints terminal status.

const api = window.fpasotermPluginApi;
const { width, height } = api.config.window;
const enabledCount = api.config.plugins.enabled.length;

api.log(`terminal/status-banner loaded for ${width}x${height}, plugins=${enabledCount}`);
api.registerCommand('status-banner.show', 'Show Plugin Status', () => {
  api.terminal.writeln(`[fpasoterm] Status: ${width}x${height}, enabled plugins: ${enabledCount}.`);
  api.terminal.focus();
});
