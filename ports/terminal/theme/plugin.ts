/// <reference path="../../../api/fpasoterm-plugin.d.ts" />
// @fpasoterm-plugin version: 1.0.0
// @fpasoterm-plugin description: Applies a visible teal terminal palette.

const api = window.fpasotermPluginApi;

api.log('terminal/theme loaded');
api.onReady(() => {
  api.terminal.options.theme = {
    background: '#073642',
    foreground: '#fdf6e3',
    cursor: '#2aa198',
    selectionBackground: '#2aa19866',
  };
  api.terminal.writeln('[fpasoterm] Teal theme plugin is active.');
  api.fitAddon.fit();
});
