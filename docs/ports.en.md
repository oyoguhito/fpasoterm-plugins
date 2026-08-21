# Port Format

Each port lives in `ports/<category>/<name>/` and must contain `port.toml` and
the source file named by `port.source`.

```toml
[port]
id = "terminal/example"
name = "example"
version = "1.0.0"
description = "One-line public description."
license = "MIT"
minFpasotermVersion = "1.5.5"
source = "plugin.ts"
installPath = "terminal/example.ts"
```

`id` must match the directory path below `ports`. `installPath` is relative to
`~/.config/fpasoterm/User/plugins/`; it must end with `.js` or `.ts` and must
not escape that directory. Keep the plugin's `@fpasoterm-plugin version` header
aligned with `port.version`.

Before submitting a port, run `npm run check`. Include only public source and
documentation. Do not include credentials, personal paths, generated caches,
or dependencies that download code at install time.
