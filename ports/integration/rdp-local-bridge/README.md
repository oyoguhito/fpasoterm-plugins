# RDP local bridge (prototype)

This prototype uses IronRDP WebAssembly 1.1.0. It requires fpasoterm 1.6.8 or
later, which provides `openRdpBridge()` and verifies that an RDP handshake uses
the exact target declared by this port. The checked-in build target is the
inert `tcp://127.0.0.1:53389`, so it does not contact an ordinary RDP server.

Credentials are requested only for a connection and are not persisted or
written to Diagnostics. The protocol implementation is not reimplemented by
this port; it is supplied by the pinned third-party WebAssembly dependency.

## Build and verification

Use a Windows host on a network you trust, with Remote Desktop enabled and a
separate target address such as `192.0.2.25:3389`. RDP authentication and its
own negotiated security remain the responsibility of the RDP server and
IronRDP; `tcp://` means only that the native loopback bridge does not add a
second TLS wrapper.

Build a port for the target. The build validates and normalizes the target,
embeds it in the plugin, and writes the identical value into the
`allowed-tcp-targets` header:

```bash
npm ci
FPASOTERM_RDP_TARGET=tcp://192.0.2.25:3389 \
  npm run port:integration:rdp-local-bridge:build
npm run ports -- index
npm run check
```

IronRDP's WebAssembly makes this generated port approximately 5.5 MiB.
Accordingly, its reviewed `port.toml` declares `maxSourceBytes = 8388608`.
fpasoterm keeps the normal 1 MiB limit for arbitrary local plugin files and
for ports without that explicit declaration.

Install the resulting reviewed local port with fpasoterm 1.6.8, then restart
fpasoterm so it loads the enabled plugin:

```bash
fpasoterm --plugin-install integration/rdp-local-bridge \
  --plugin-ports-dir . --enable
fpasoterm --plugin-info integration/rdp-local-bridge.js
```

Run **Open RDP local bridge (prototype)** from the plugin command UI. Verify
that fpasoterm first shows a **Connect RDP** confirmation containing the same
host and port, then requests username, optional domain, and password. A
successful connection changes the overlay status to `Connected: WIDTH ×
HEIGHT`; cancel, a refused connection, or invalid credentials leave a visible
failure status and do not persist credentials.

For a compatibility-only check against a specific development binary, run:

```bash
npm run ports -- compat integration/rdp-local-bridge \
  --fpasoterm /absolute/path/to/fpasoterm
```
