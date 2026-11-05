# kVNC RA2ne / noVNC interoperability report

## Current evidence

The noVNC port negotiates RFB 3.8 and SecurityType 6 (`RA2ne`), displays the
server-key fingerprint for explicit, connection-scoped approval, then fails
before credentials are sent with:

```text
RA2: corrupted server encrypted random
```

kVNC has now verified its RA2ne wire format against the legacy RSA operation
used by noVNC: it successfully decrypts a live-listener `ServerRandom` using
the same BigInt modular private-key operation and PKCS#1 v1.5 unpadding. The
result has type-2 (`00 02`) padding and a 16-byte plaintext. kVNC also records
that it receives the noVNC client public key and encrypted client random, sends
the expected U16 `256` plus 256-byte encrypted server random, then receives an
EOF roughly 76 ms later.

This means the next investigation is not password, clipboard, or server-key
approval. It must compare the exact connection's noVNC RA2ne state and the
opaque wire payloads that traverse the local TCP-to-WebSocket bridge.

Two live captures subsequently produced different client public-key SHA-256
values but an identical server-random ciphertext SHA-256. Because RSAES-PKCS1-
v1_5 encryption uses fresh random padding and the client public keys differ,
the kVNC digest for the actual outbound ciphertext is now the highest-priority
comparison. The exact values and reproduction record are in
[`kvnc-ra2ne-novnc-live-capture.md`](kvnc-ra2ne-novnc-live-capture.md).

A third capture verified dynamically that noVNC generated, exported, and used
the same client private-key object for the sent public key and decrypt attempt;
the decrypt result was `null`. This removes the noVNC key-pair identity as the
remaining explanation. It does not alone distinguish a stale kVNC TCP write
from a stale relay/client receive buffer, which is why the kVNC outbound digest
is still required.

The kVNC server RSA key is process-scoped: its fingerprint remains stable for
all connections in one process and changes only after a server restart. Earlier
different fingerprints therefore do **not** establish per-connection rekeying.

## noVNC port diagnostics

The port adds Activity entries that contain no password, private key, random,
clipboard body, or raw packet data:

```text
noVNC RA2ne state created: connection=ra2-… state=state-1
noVNC server-key verification requested …; connection=ra2-…; state=state-1
noVNC RA2ne server-key approval state: … matchesVerification=true
noVNC RA2ne client key generated: … key=client-key-1
noVNC RA2ne client key export: … key=client-key-1 matchesGeneratedKey=true
noVNC RA2ne wire: connection=ra2-… state=state-1 direction=client-to-server packet=client-public-key bytes=516 sha256=<hex>
noVNC RA2ne wire: connection=ra2-… state=state-1 direction=client-to-server packet=client-encrypted-random bytes=258
noVNC RA2ne wire: connection=ra2-… state=state-1 direction=server-to-client packet=server-encrypted-random bytes=256 sha256=<hex>
noVNC RA2ne client key decrypt: … key=client-key-1 ciphertext-bytes=256 result=null
```

The final protocol-failure entry also includes the RA2ne connection ID, state
ID, and phase. `matchesVerification=true` proves that the user approved the
same noVNC RA2 state that continued the handshake. The `client-public-key`
and `server-encrypted-random` SHA-256 values are safe, public-payload
fingerprints. They let kVNC and the port compare bytes without publishing
key material or random values. The client-key entries prove that noVNC exported
the public key and attempted to decrypt the server random with the same
generated private-key object. `result` is only `null` or a plaintext length;
the plaintext is never logged.

The fpasoterm native bridge accepts only binary WebSocket messages, sends them
to the remote TCP stream with `write_all`, and relays TCP reads back as binary
WebSocket messages. It performs no text, UTF-8, or base64 conversion. The
per-connection hashes are retained to verify this property on the failing
connection rather than merely infer it from source code.

## Joint reproduction

1. Start kVNC with password-only authentication and its debug log enabled.
2. Open the noVNC local bridge using automatic RFB negotiation, then approve
   the displayed server-key fingerprint.
3. Preserve the Activity lines from `RA2ne state created` through the failure.
4. On the same kVNC connection ID and timestamp, record only:
   - the SHA-256 of the received 516-byte `ClientPublicKey` wire message;
   - the SHA-256 of the sent 256-byte `ServerRandom` ciphertext (not its
     plaintext or ciphertext body);
   - the server key fingerprint and phase names already logged by kVNC.
5. Compare the two SHA-256 values with noVNC Activity. They must match exactly.

Interpretation:

- A `client-public-key` hash mismatch indicates a framing or state-correlated
  bridge/client issue before kVNC encrypts the server random.
- A matching client public key but different server-random cipher hash means
  the server's TCP output and noVNC receive queue differ; continue at the
  bridge framing boundary.
- Matching hashes together with `matchesVerification=true` and
  `matchesGeneratedKey=true` means the bridge delivered the exact ciphertext
  to the state that approved the key and noVNC used its generated private key
  for the decrypt attempt. A `result=null` then focuses investigation on the
  kVNC encryption of the actual received ClientPublicKey or on a narrowly
  scoped noVNC legacy-RSA interoperability defect.

Do not disable RA2ne, RSA encryption, or server-key verification to work
around the failure.

## References

- [noVNC RA2 implementation](https://github.com/novnc/noVNC/blob/master/core/ra2.js)
- [RA2ne Security Type specification](https://gist.github.com/pdlan/81245e3d83d7fa586b8dcbb4e2d507cc)
