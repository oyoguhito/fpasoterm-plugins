# Third-party notices

`plugin.js` bundles [noVNC](https://github.com/novnc/noVNC) 1.5.0 from the
`@novnc/novnc` npm package. noVNC is Copyright (C) 2022 The noVNC Authors and
is licensed under MPL-2.0. The packaged upstream license notice is preserved
verbatim in
[`THIRD_PARTY_LICENSES/noVNC-LICENSE.txt`](THIRD_PARTY_LICENSES/noVNC-LICENSE.txt).
The generated bundle also retains its esbuild source notice at the end of
`plugin.js`.

The fpasoterm-specific UI, declared-target policy, and loopback bridge wiring
are original code in `scripts/novnc-plugin-entry.js`. During the reproducible
build, `scripts/build-novnc-port.js` applies a narrow RA2ne frame-boundary fix
to an in-memory copy of noVNC's RFB module; it does not alter `node_modules`.
The exact Source Code Form for that MPL-covered modification is the locked
`@novnc/novnc` 1.5.0 package together with this build script. Source for noVNC
is available from the [noVNC project](https://github.com/novnc/noVNC), and the
exact upstream package can be reproduced from the version and integrity locked
in `package-lock.json`.
