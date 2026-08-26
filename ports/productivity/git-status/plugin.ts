/// <reference path="../../../api/fpasoterm-plugin.d.ts" />
// @fpasoterm-plugin version: 1.0.0
// @fpasoterm-plugin description: Adds a command that inserts git status --short without executing it.

// Inserts a reviewable command into the active prompt; Enter remains the user's choice.
const api = window.fpasotermPluginApi;

api.log('productivity/git-status loaded');
api.registerCommand('git-status.insert', 'Insert git status', () => {
  api.terminal.write('git status --short');
  api.terminal.focus();
});
