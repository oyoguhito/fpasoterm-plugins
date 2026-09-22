# RDP local bridge (prototype)

This prototype uses IronRDP WebAssembly 1.1.0. It requires fpasoterm 1.6.8 or
later, which provides `openRdpBridge()` and verifies that an RDP handshake uses
the exact target declared by this port. The checked-in build target is the
inert `tcp://127.0.0.1:53389`, so it does not contact an ordinary RDP server.

Credentials are requested only for a connection and are not persisted or
written to Diagnostics. The protocol implementation is not reimplemented by
this port; it is supplied by the pinned third-party WebAssembly dependency.

`openRdpBridge()` is an RDCleanPath-compatible local proxy, not the raw TCP
relay used by the VNC port. On each connection, fpasoterm validates the
one-time loopback URL and the exact plugin-declared destination, forwards the
IronRDP X.224 negotiation to that destination, performs the RDP TLS hop, and
returns the server's certificate chain to IronRDP before relaying the encrypted
RDP stream. This is necessary for IronRDP WebAssembly to connect to a normal
Windows RDP server.

Many Windows RDP servers use a self-signed certificate. The local bridge does
not silently add that certificate to the operating-system trust store or retain
it. It preserves TLS handshake-signature verification, forwards the presented
certificate to IronRDP as required by RDCleanPath, and confines the connection
to the reviewed exact target. Connect only to a host whose identity and network
you trust; certificate pinning/interactive certificate approval is future work.

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

During pre-release testing, use the fpasoterm build that contains the RDP
bridge and reviewed-port source-limit support from the same change set. The RDP
bundle is about 5.5 MiB. An older build with the same nominal version that has
only the normal 1 MiB local-plugin limit reports `exceeds 1048576 bytes`; that
message means the application build is too old, not that the reviewed port is
corrupt. Do not use `--plugin-install-file` for this port: it intentionally
uses the stricter 1 MiB limit for an arbitrary local file. Use the port ID and
`--plugin-ports-dir` command shown above.

Run **Open RDP local bridge (prototype)** from the plugin command UI. Verify
that fpasoterm first shows a **Connect RDP** confirmation containing the same
host and port, then requests username, optional domain, and password. A
successful connection changes the overlay status to `Connected: WIDTH ×
HEIGHT`; cancel, a refused connection, or invalid credentials leave a visible
failure status and do not persist credentials.

## Interaction and cross-platform verification

After the status changes to `Connected`, click inside the remote desktop before
typing. The port forwards keyboard, pointer, button, and wheel events only from
the RDP canvas, so fpasoterm shortcuts outside the overlay remain available.

ChromeOS (Crostini) verification passed on 2026-09-23. Before publishing for
another OS, record the OS version, window system, browser engine, and RDP
server in the pull-request test notes and perform the following checks:

1. Connect to a reviewed, explicitly declared Windows RDP target and complete
   the normal Windows sign-in flow.
2. Click a desktop item or an application button, move the pointer, and scroll
   a window in both directions.
3. Type ASCII text, then test Backspace, Enter, arrow keys, and a modifier
   shortcut appropriate for a disposable remote test account.
4. Disconnect from the RDP overlay, close it, and confirm that fpasoterm input
   and shortcuts still work normally.

The current prototype maps common browser keys to PS/2 Set 1 scancodes for
IronRDP. Non-US layouts, IME composition, touch input, clipboard redirection,
and certificate pinning require separate compatibility work; do not mark them
as supported without an OS-specific test.

For a compatibility-only check against a specific development binary, run:

```bash
npm run ports -- compat integration/rdp-local-bridge \
  --fpasoterm /absolute/path/to/fpasoterm
```
