/// <reference path="../../../api/fpasoterm-plugin.d.ts" />
// @fpasoterm-plugin version: 1.0.0
// @fpasoterm-plugin description: Applies a high-contrast palette for clearly separated terminal colors.

const api = window.fpasotermPluginApi;

api.log('appearance/high-contrast loaded');
api.onReady(() => {
  api.terminal.options.theme = {
    ...api.config.terminal.theme,
    background: '#000000',
    foreground: '#ffffff',
    cursor: '#ffff00',
    selectionBackground: '#ffffff66',
    black: '#000000',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#8be9fd',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#ffffff',
  };
  api.fitAddon.fit();
  api.terminal.writeln('[fpasoterm] High contrast appearance theme is active.');
});
