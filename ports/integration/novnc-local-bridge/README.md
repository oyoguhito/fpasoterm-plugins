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

For fpasoterm 1.6.16 or later, install the exact target directly from this
checkout. This writes the same reviewed target into both the plugin program and
its native bridge permission; rebuilding a private `plugin.js` is unnecessary:

```bash
cd ../fpasoterm
bin/fpasoterm --plugin-ports-dir ../fpasoterm-plugins/ports \
  --plugin-install integration/novnc-local-bridge \
  --plugin-tcp-target tcp://host:port --enable --force
```

For older fpasoterm versions, configure the exact target and regenerate
`plugin.js` together:

```bash
npm run port:integration:novnc-local-bridge:configure -- tcp://host:port
```

Some Vine Server releases advertise RFB 3.8 but do not return the 3.8
security-type list. This release uses RFB 3.3 compatibility mode by default
for the verified Vine workflow. If a different server negotiates normally and
needs modern RFB negotiation, rebuild a private target without the
compatibility option:

```bash
npm run port:integration:novnc-local-bridge:configure -- \
  tcp://host:port --rfb-3.3
```

RFB 3.3 has a different, older security negotiation and cannot use later
authentication types. The compatibility mode also limits framebuffer encodings
to Hextile and Raw because affected Vine releases can stall on noVNC's complete
modern encoding and pseudo-encoding list. `reset` restores loopback and turns
the compatibility mode off.

The default test endpoint is `tcp://127.0.0.1:5900` (VNC display `:0`). Use
another trusted private-network endpoint only when it matches the server
configuration. Then,
from a sibling fpasoterm checkout, install the local port and start a freshly
rebuilt application:

```bash
cd ../fpasoterm
bin/fpasoterm --plugin-ports-dir ../fpasoterm-plugins/ports \
  --plugin-install integration/novnc-local-bridge \
  --plugin-tcp-target tcp://host:port --enable --force
bin/fpasoterm --dev --plugin-activity --console-diagnostics
```

Select **Open noVNC local bridge (test)** from Plugins. Confirm that the
connection dialog shows the exact configured target before selecting Connect.
The plugin requests username first (leave blank for password-only servers),
then password, before starting noVNC. The panel also provides **Zoom −**,
**Zoom +**, and **Fit** controls; Fit is the default automatic sizing mode.

## Japanese IME keys

The toolbar has **Ctrl+Space** and **Reset keys** controls. **Ctrl+Space** sends
a complete remote `Control+Space` chord. On macOS this can select another input
source when that standard shortcut is enabled; Windows and Linux remote systems
may bind it differently. It does not claim to select a particular source, and
it does not change Vine's Keyboard Layout or the local computer's input source.
It is a best-effort shortcut, not a way for the plugin to query or restore a
named macOS input source.

**Reset keys** explicitly releases remote Ctrl, Shift, Alt, and
Command/Windows keys, and resets noVNC's tracked keys. Use it if normal letters
start invoking shortcuts or a VNC server appears to retain a modifier. It is
not a toggle: pressing it again safely repeats the key releases, but cannot
undo a macOS input-source change that has already completed. The remote computer
must have a Japanese input source or IME configured; VNC cannot install or
select one that is absent. The controls report that a key was sent, rather than
claiming that a particular input mode was selected.

## Vine Server RFB 3.3 keyboard setup

For Vine Server RFB 3.3, the recommended configuration for ordinary keyboard
input is the following, followed by a macOS or Vine Server restart:

1. Select **Unicode Hex Input** as Vine's Keyboard Layout.
2. Make **Unicode Hex Input** the active macOS input source before Vine starts.

This is a Vine compatibility configuration, not a requirement for every VNC
server. It avoids ordinary `d` and `e` being interpreted as macOS function-key
actions in the verified RFB 3.3 setup. If the remote Mac needs another input
source after connecting, test that workflow separately: changing the active
source from Unicode Hex Input (for example US → Japanese → US) can make the
same `d`/`e` issue return. Standard RFB does not report the active macOS input
source and cannot select a named source, so this plugin cannot automatically
detect or restore Unicode Hex Input. The plugin sends ordinary RFB keys and
does not remap normal letters or emulate Fn, so its Ctrl/Command and clipboard
behavior remains intact.

If input-source switching is required, use **Ctrl+Space** and confirm that the
remote Mac has the needed sources and that **System Settings > Keyboard >
Keyboard Shortcuts > Input Sources** has not replaced that shortcut. The plugin
sends a complete press/release pair and resets any preceding remote modifiers
first; it does not invoke local browser shortcuts.

## Clipboard

Plain-text clipboard sharing is active only while that VNC connection is open.
Remote-to-local changes are written to fpasoterm's shared WebView/OS clipboard.
For local-to-remote transfer, focus the multi-line **Local → VNC** text area and
press Ctrl+V, then focus the VNC desktop and press Ctrl+V there. This explicit
paste flow avoids WebView clipboard-read restrictions and does not poll the
clipboard, so synchronization cannot starve VNC rendering or input. Clipboard
content is never logged or persisted; empty text, HTML/files/binary formats,
and text over 1 MiB are ignored.

In Vine Server compatibility mode the remote desktop is macOS: after text is
pasted into **Local → VNC**, the plugin sends it with legacy ClientCutText and
issues remote Command+V automatically. Physical Ctrl+C and Ctrl+V over the VNC
desktop are likewise translated to remote Command+C and Command+V. Other VNC
servers retain their native key handling.

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
