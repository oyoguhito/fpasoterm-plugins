# noVNC local bridge (test)

This is a verification port for fpasoterm's local VNC bridge. It bundles
noVNC 1.5.0 and can connect only to the exact target declared in its source:
`tcp://127.0.0.1:59999`. This deliberately unused default avoids contacting an
existing local VNC server during ordinary plugin development.

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

For example, the normal VNC port is `5900`; use
`tcp://127.0.0.1:5900` or another trusted private-network endpoint. Then,
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
