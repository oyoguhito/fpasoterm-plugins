/// <reference path="../../../api/fpasoterm-plugin.d.ts" />
// @fpasoterm-plugin version: 1.0.0
// @fpasoterm-plugin description: Applies a teal terminal palette with a translucent dark background.

const api = window.fpasotermPluginApi;

api.log('appearance/teal loaded');
api.onReady(() => {
  api.terminal.options.theme = {
    ...api.config.terminal.theme,
    background: 'rgba(8, 42, 48, 0.86)',
    foreground: '#d8f6f3',
    cursor: '#ffdc73',
    selectionBackground: '#246b73',
    blue: '#75c9ff',
    cyan: '#73e6dd',
    green: '#a9df7d',
  };
  api.fitAddon.fit();
  api.terminal.writeln('[fpasoterm] Teal appearance theme is active.');
});
