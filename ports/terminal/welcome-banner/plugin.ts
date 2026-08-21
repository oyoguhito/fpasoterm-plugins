/// <reference path="../../../api/fpasoterm-plugin.d.ts" />
// @fpasoterm-plugin version: 1.0.0
// @fpasoterm-plugin description: Displays a concise startup message.

const api = window.fpasotermPluginApi;

api.log('terminal/welcome-banner loaded');
api.onReady(() => {
  api.terminal.writeln('');
  api.terminal.writeln(`[fpasoterm ${api.version}] Welcome banner plugin is active.`);
});
