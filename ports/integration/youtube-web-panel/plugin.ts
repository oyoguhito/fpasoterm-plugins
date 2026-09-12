/// <reference path="../../../api/fpasoterm-plugin.d.ts" />
// @fpasoterm-plugin version: 1.0.0
// @fpasoterm-plugin description: Shows the official YouTube iframe sample in an allowlisted in-app web panel.
// @fpasoterm-plugin allowed-origins: https://www.youtube-nocookie.com

const api = window.fpasotermPluginApi;

// This is YouTube's public IFrame Player API demonstration video. The plugin
// neither searches YouTube nor sends terminal, clipboard, or local-file data.
const sampleEmbedUrl = 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?rel=0&playsinline=1';

api.registerCommand('youtube-web-panel', 'Watch YouTube sample', () => {
  api.openWebPanel({
    title: 'YouTube sample',
    url: sampleEmbedUrl,
    width: 960,
    height: 540,
  });
});
