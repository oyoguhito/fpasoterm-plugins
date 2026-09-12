# YouTube Web Panel Sample

Shows YouTube's public IFrame Player API sample video inside fpasoterm. The
video is loaded only after you choose **Plugins → Watch YouTube sample**.
Playback and volume are controlled by the official embedded YouTube player;
the fpasoterm terminal volume setting does not control this panel.

The plugin declares only `https://www.youtube-nocookie.com`. fpasoterm checks
that declaration and its application allowlist before it creates the iframe.
It does not search YouTube, access the clipboard, read local files, or send
terminal content.

## Install

Requires fpasoterm 1.6.4 or later.

```sh
fpasoterm --plugin-install integration/youtube-web-panel --enable
```

Restart fpasoterm, then choose **Plugins → Watch YouTube sample**. Use the
YouTube player controls to begin playback. The panel can be closed with its
Close button or Escape.
