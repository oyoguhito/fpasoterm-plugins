/// <reference path="../../../api/fpasoterm-plugin.d.ts" />
// @fpasoterm-plugin version: 1.0.0
// @fpasoterm-plugin description: Applies an amber-on-charcoal terminal palette.

// Applies a visible runtime theme without persisting configuration changes.
const api = window.fpasotermPluginApi;

api.log('appearance/amber loaded');
api.onReady(() => {
  api.terminal.options.theme = {
    ...api.config.terminal.theme,
    background: 'rgba(31, 25, 18, 0.88)',
    foreground: '#ffe4a3',
    cursor: '#ffd166',
    selectionBackground: '#8a5a1f99',
    black: '#2b2118',
    red: '#ff8f70',
    green: '#b9d68b',
    yellow: '#ffd166',
    blue: '#9cc9ff',
    magenta: '#e5b7ff',
    cyan: '#8ee0d0',
    white: '#fff1c9',
  };
  api.fitAddon.fit();
  api.terminal.writeln('[fpasoterm] Amber appearance theme is active.');
});
