# kVNC / noVNC RA2ne live-capture handoff

This file is a copyable handoff for the currently failing noVNC connection.
It intentionally contains no password, private key, random value, clipboard
text, or raw packet body.

## Already captured from the failing connection

Connection identity:

```text
connection=ra2-mw0j36q3-dr187y
state=state-1
```

The server-key confirmation continued on the same RA2ne state:

```text
matchesVerification=true
```

The noVNC port captured these public-payload fingerprints:

```text
ClientPublicKey wire message
bytes=516
sha256=509b8973f3f5800c17dd42f1871c7152b3dbb5cbbed32343f69bc1918dc148d8

ServerRandom ciphertext
bytes=256
sha256=a6d8ecdeeb2debf6b5ea1e41298ec360d767284f446cf752c670100d5ff53315
```

The failure occurred after noVNC had removed the 256-byte server ciphertext
from its receive queue:

```text
RA2: corrupted server encrypted random
ra2Phase=server-encrypted-random-received
```

## Repeated-capture observation

Two fresh noVNC connections in the same kVNC process produced different client
public-key packet fingerprints but the same 256-byte server-random ciphertext
fingerprint:

```text
ClientPublicKey #1: 509b8973f3f5800c17dd42f1871c7152b3dbb5cbbed32343f69bc1918dc148d8
ClientPublicKey #2: c21d0132f49243d733934dd235b4a3e5235595b0742a33b22afa8462f74ca8a8
ServerRandom ciphertext #1: a6d8ecdeeb2debf6b5ea1e41298ec360d767284f446cf752c670100d5ff53315
ServerRandom ciphertext #2: a6d8ecdeeb2debf6b5ea1e41298ec360d767284f446cf752c670100d5ff53315
```

RSAES-PKCS1-v1_5 encryption uses fresh non-zero random padding. A ciphertext
for distinct client public keys should therefore not repeat. This is strong
evidence to compare the exact kVNC outbound ciphertext digest first. It does
not by itself identify whether stale bytes originated in kVNC, a relay, or a
client receive queue; the same-connection hashes below make that distinction.

The observation repeated after kVNC restarted with a new server-key
fingerprint. Within that new process, the client public key changed again while
the server ciphertext remained identical:

```text
Server key fingerprint: 6b:85:04:81:f2:c0:45:df:21:17:7c:0b:d6:e7:ae:db:da:44:bb:6f:0b:e4:7c:17:42:0d:d2:6b:14:fc:4c:9f
ClientPublicKey #3: 795b8eeb98923c0314d5ee6146cf1bcf29119553a2d741ecff877885733862c2
ClientPublicKey #4: f5548d407d0322d0008376b795b2faf59d1b74ee8d3a36246178bea00388527d
ServerRandom ciphertext #3/#4: 76b3c94be54f1136d988e2a93730833078364a2deda4a22b2a92456376193f46
```

A third connection with the same server key confirms the noVNC key lifecycle
and repeats the ciphertext again:

```text
ClientPublicKey #5: e92e7dd2df18bb49bdb7323c0408b1678aa00bd6852c799ae974ccdb5c70ed33
ServerRandom ciphertext #5: 76b3c94be54f1136d988e2a93730833078364a2deda4a22b2a92456376193f46
noVNC client private key: generated, exported, and used for decrypt (same object)
noVNC decrypt result: null
```

This rules out an approval-state mix-up or noVNC sending a public key from a
different generated private key. The received ciphertext does not decrypt with
the private key corresponding to the exact client public-key packet sent in
this connection. The remaining byte-origin check is the SHA-256 of the exact
256-byte ciphertext that kVNC writes to its TCP socket for this connection.

The `client-encrypted-random` Activity line may appear before the asynchronously
calculated public-key hash. That is log scheduling only; it does not change the
RA2ne wire send order.

## Reinstall and capture procedure

Run this from a sibling fpasoterm checkout after updating the local
`fpasoterm-plugins` worktree:

```bash
cd ~/github/oyoguhito/fpasoterm

bin/fpasoterm \
  --plugin-ports-dir ../fpasoterm-plugins/ports \
  --plugin-install integration/novnc-local-bridge \
  --plugin-tcp-target tcp://100.80.166.53:5900 \
  --enable --force

bin/fpasoterm --dev --plugin-activity --console-diagnostics
```

Open **Plugins → Open noVNC local bridge (test)**, approve the server key, and
record Plugin Activity through the disconnect. The updated plugin must show all
of these markers:

```text
noVNC RA2ne wire diagnostics armed:
noVNC RA2ne client-key diagnostics armed:
noVNC RA2ne trace: … bridge=<id>
noVNC RA2ne state created:
noVNC RA2ne server-key approval state: … matchesVerification=true
noVNC RA2ne client key generated: … privateKeyPresent=true
noVNC RA2ne client key export: … matchesGeneratedKey=true
noVNC RA2ne wire: … bridge=<id> … packet=client-public-key bytes=516 sha256=<hex>
noVNC RA2ne wire: … bridge=<id> … packet=server-encrypted-random bytes=256 sha256=<hex>
noVNC RA2ne client key decrypt: … bridge=<id> … ciphertext-bytes=256 result=<null-or-length>
```

If `client-key diagnostics armed` is absent, fpasoterm is still using a prior
installed plugin. Repeat the `--plugin-install … --force` command above and
fully close/reopen fpasoterm before testing.

The next diagnostic revision also records the ciphertext SHA-256 at the raw
browser WebSocket `ArrayBuffer` boundary, before noVNC appends it to its receive
queue:

```text
noVNC RA2ne wire: … packet=server-encrypted-random-websocket bytes=256 sha256=<hex>
noVNC RA2ne wire: … packet=server-encrypted-random bytes=256 sha256=<hex>
```

As a WebView-independent comparison point, the current local fpasoterm source
also records the first RA2ne server-random packet read from the remote TCP
stream after the 258-byte client-random packet. Start a rebuilt fpasoterm with
`--console-diagnostics`, then check Diagnostics or:

```bash
tail -f ~/.config/fpasoterm/User/logs/fpasoterm-debug.log
```

The expected native entries are:

```text
plugin VNC RA2ne native relay: client WebSocket binary frame bytes=<n> prefix=<hex> bridge=<id>
plugin VNC RA2ne native relay: observed RA2 client public key and client-encrypted-random; awaiting server-encrypted-random from TCP bridge=<id>
plugin VNC RA2ne native relay: server TCP read sequence=1 bytes=<n> prefix=<hex> sha256=<hex> bridge=<id>
plugin VNC RA2ne native relay: server TCP read sequence=2 bytes=256 prefix=<hex> sha256=<hex> bridge=<id>
plugin VNC RA2ne native relay: direction=server-to-client packet=server-encrypted-random bytes=256 sha256=<hex> bridge=<id>
plugin VNC RA2ne native relay: WebSocket binary send coalesced=true sequence=2 bytes=258 server-encrypted-random-sha256=<hex> bridge=<id>
```

The `bridge=<id>` is a fresh, non-secret 64-bit trace value. It is included in
both the native relay and noVNC Activity lines, so only values from the same
connection are compared. It is not the authorization token embedded in the
WebSocket path.

The capture showed that noVNC 1.5.0 waits for the two-byte RA2ne ciphertext
length, but does not wait again for the 256-byte ciphertext before it reads the
receive queue. A TCP bridge is allowed to choose WebSocket message boundaries
without changing the RFB byte stream. fpasoterm therefore holds the length and
ciphertext for this one RA2ne transition and forwards their 258 bytes as one
binary WebSocket message. The ciphertext hash in the coalesced-send line must
equal the native ciphertext line; no key, password, or plaintext is retained.

## kVNC comparison requested

For the same kVNC process and connection timestamp, log only the following:

1. SHA-256 of the complete 516-byte ClientPublicKey wire message received by
   kVNC.
2. SHA-256 of the complete 256-byte ServerRandom ciphertext sent by kVNC.
3. The kVNC process-scoped server-key fingerprint and the existing phase names.

Do not log plaintext random values, passwords, private keys, or raw packet
contents.

## Interpretation

| noVNC / kVNC observation | Next target |
| --- | --- |
| Either SHA-256 value differs | TCP-to-WebSocket relay framing or connection correlation |
| Hashes match, `matchesVerification=true`, `matchesGeneratedKey=true`, and decrypt `result=null` | kVNC encryption using the actual received ClientPublicKey, or noVNC legacy RSA interoperability |
| Decrypt result is a non-16 plaintext length | PKCS#1 v1.5 unpadding/plaintext-length handling |
| State/key markers are absent or false | noVNC RA2ne state lifecycle |

The native fpasoterm bridge currently accepts only binary WebSocket messages,
writes client frames to TCP with `write_all`, and relays TCP bytes to binary
WebSocket frames. The two fingerprints test that behavior on the actual
failing connection rather than trusting it only from code inspection.

See also [the broader RA2ne report](kvnc-ra2ne-novnc-report.md).
