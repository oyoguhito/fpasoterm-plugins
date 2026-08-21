/// <reference path="../../../api/fpasoterm-plugin.d.ts" />
// @fpasoterm-plugin version: 1.0.0
// @fpasoterm-plugin description: Writes a confirmation after the terminal is ready.

// This port matches the fpasoterm hello example and demonstrates the minimum plugin shape.
const api = window.fpasotermPluginApi;

api.log('terminal/hello loaded');
api.onReady(() => {
  api.terminal.writeln('');
  api.terminal.writeln('[fpasoterm plugin] hello.ts loaded');
});
