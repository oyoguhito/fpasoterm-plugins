# noVNC local bridge (test)

This is a verification port for fpasoterm's local VNC bridge. It bundles
noVNC 1.5.0 and can connect only to the exact target declared in its source:
`tcp://127.0.0.1:5900`. This loopback-only default uses VNC display `:0` and
does not permit a connection to any other host or port.

## Prerequisite

The configuration command rebuilds the bundled `plugin.js` with `esbuild`.
After cloning the `fpasoterm-plugins` checkout, first install its development
dependencies (including on Windows):

```bash
npm ci
```

Use Node.js 20 or later. Do not use `npm ci --omit=dev`, because that omits
`esbuild` and causes `Cannot find module 'esbuild'`.

For an actual VNC check, configure the exact target and regenerate `plugin.js`
together:

```bash
npm run port:integration:novnc-local-bridge:configure -- tcp://host:port
```

Some Vine Server releases advertise RFB 3.8 but do not return the 3.8
security-type list. If Diagnostics remains at connection setup with no desktop,
rebuild that exact private target in RFB 3.3 compatibility mode:

```bash
npm run port:integration:novnc-local-bridge:configure -- \
  tcp://host:port --rfb-3.3
```

Do not enable this switch for servers that negotiate normally. RFB 3.3 has a
different, older security negotiation and cannot use later authentication
types. The compatibility mode also limits framebuffer encodings to Hextile and
Raw because affected Vine releases can stall on noVNC's complete modern
encoding and pseudo-encoding list. `reset` always turns the compatibility mode
off.

The default test endpoint is `tcp://127.0.0.1:5900` (VNC display `:0`). Use
another trusted private-network endpoint only when it matches the server
configuration. Then,
from a sibling fpasoterm checkout, install the local port and start a freshly
rebuilt application:

```bash
cd ../fpasoterm
bin/fpasoterm --plugin-ports-dir ../fpasoterm-plugins/ports \
  --plugin-install integration/novnc-local-bridge --enable --force
bin/fpasoterm --dev --plugin-activity --console-diagnostics
```

Select **Open noVNC local bridge (test)** from Plugins. Confirm that the
connection dialog shows the exact configured target before selecting Connect.
The plugin requests username first (leave blank for password-only servers),
then password, before starting noVNC. The panel also provides **Zoom −**,
**Zoom +**, and **Fit** controls; Fit is the default automatic sizing mode.

## Clipboard

Plain-text clipboard sharing is active only while that VNC connection is open.
Remote-to-local changes are written to fpasoterm's shared WebView/OS clipboard.
For local-to-remote transfer, focus the multi-line **Local → VNC** text area and
press Ctrl+V, then focus the VNC desktop and press Ctrl+V there. This explicit
paste flow avoids WebView clipboard-read restrictions and does not poll the
clipboard, so synchronization cannot starve VNC rendering or input. Clipboard
content is never logged or persisted; empty text, HTML/files/binary formats,
and text over 1 MiB are ignored.

Clipboard transfer also requires support from the VNC server. If Plugin
Activity reports `mode=legacy formats=none actions=none`, noVNC sent the
standard legacy `ClientCutText` message because the server advertised no
extended clipboard capability. A server that ignores legacy clipboard messages
cannot provide clipboard sharing, and remote-to-local transfer produces no
`noVNC clipboard remote event` entry. Enable clipboard transfer in that VNC
server or use a server implementation that supports RFB clipboard messages.

Apple's **Edit > Use Shared Clipboard** option belongs to Apple's Screen
Sharing client and applies when one Mac uses that app to control another Mac.
It is not a server-side switch exposed to a third-party VNC client such as
noVNC. For third-party access, macOS Sharing settings provide **VNC viewers may
control screen with password**, but Apple does not document that option as
enabling standard RFB clipboard messages. Consequently, a macOS server that
reports no clipboard capability and emits no `ServerCutText` cannot be made to
share its clipboard by changing this plugin alone.

Verify both directions with disposable text: copy in the remote desktop and
paste in a local editor, then copy in the local editor and paste remotely.

After the check, restore both the checkout and installed plugin to the safe
unused default:

```bash
cd ../fpasoterm-plugins
npm run port:integration:novnc-local-bridge:reset
cd ../fpasoterm
bin/fpasoterm --plugin-ports-dir ../fpasoterm-plugins/ports \
  --plugin-install integration/novnc-local-bridge --enable --force
```

fpasoterm asks before every connection. When the server requests credentials,
noVNC asks for exactly the requested fields (such as username and password).
They are held only in memory; neither credentials nor VNC traffic are written
to fpasoterm configuration or Diagnostics.

`tcp://` is VNC's normal unencrypted RFB transport; use it only for localhost
or another trusted network. A reviewed plugin may instead declare a strict
`tls://host:port` target. fpasoterm validates that TLS certificate and host
name against the operating system trust store and has no insecure override.

The generated `plugin.js` is intentionally checked in: public ports install a
single reviewed script. Regenerate it after changing the entry source with
`npm run port:integration:novnc-local-bridge:build`.

## Third-party notices

This port bundles noVNC 1.5.0. Its copyright and MPL-2.0 licensing notice,
plus information for obtaining its source, are recorded in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
