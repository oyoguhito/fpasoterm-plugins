# Third-party notices

`plugin.js` bundles [noVNC](https://github.com/novnc/noVNC) 1.5.0 from the
`@novnc/novnc` npm package. noVNC is Copyright (C) 2022 The noVNC Authors and
is licensed under MPL-2.0. The packaged upstream license notice is preserved
verbatim in
[`THIRD_PARTY_LICENSES/noVNC-LICENSE.txt`](THIRD_PARTY_LICENSES/noVNC-LICENSE.txt).
The generated bundle also retains its esbuild source notice at the end of
`plugin.js`.

The fpasoterm-specific UI, declared-target policy, and loopback bridge wiring
are original code in `scripts/novnc-plugin-entry.js`. The upstream noVNC
sources are not modified. Source for noVNC is available from the
[noVNC project](https://github.com/novnc/noVNC). The exact upstream package
can be reproduced from the version and integrity locked in `package-lock.json`.
