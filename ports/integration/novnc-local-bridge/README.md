# noVNC local bridge (test)

This is a verification port for fpasoterm's local VNC bridge. It bundles
noVNC 1.5.0 and can connect only to the exact target declared in its source:
`tcp://127.0.0.1:59999`. This deliberately unused default avoids contacting an
existing local VNC server during ordinary plugin development.

For an actual VNC check, change both the `allowed-tcp-targets` source header
and the `openVncBridge({ target })` value to the intended endpoint (for example
`tcp://127.0.0.1:5900`), rebuild with `npm run build:novnc-port`, and install
that reviewed local port. Then select **Open noVNC local bridge (test)** from
Plugins. Run `npm run reset:novnc-port` after the check to restore the unused
default target and regenerate `plugin.js`. fpasoterm asks before every
connection and asks for a VNC password only when the server requires one.
Neither password nor VNC traffic is written to fpasoterm configuration or
Diagnostics.

`tcp://` is VNC's normal unencrypted RFB transport; use it only for localhost
or another trusted network. A reviewed plugin may instead declare a strict
`tls://host:port` target. fpasoterm validates that TLS certificate and host
name against the operating system trust store and has no insecure override.

The generated `plugin.js` is intentionally checked in: public ports install a
single reviewed script. Regenerate it after changing the entry source with
`npm run build:novnc-port`.
