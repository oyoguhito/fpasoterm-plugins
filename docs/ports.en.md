# Port Format

Each port lives in `ports/<category>/<name>/` and must contain `port.toml` and
the source file named by `port.source`.

```toml
[port]
id = "terminal/example"
name = "example"
version = "1.0.0"
author = "github-account-or-public-name"
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

`author` is a required public attribution field. Use a public name or GitHub
account, never a private email address. Repository-level maintainers are listed
in [`AUTHORS.md`](../AUTHORS.md).

Before submitting a port, run `npm run check`. Include only public source and
documentation. Do not include credentials, personal paths, generated caches,
or dependencies that download code at install time.

## Local Port Operations

`node scripts/ports.js search <query>` searches port IDs, names, and
descriptions. `install` copies the selected source into the user plugin
directory. `update <id>` replaces that copied source with the source from the
current checkout; `update all` does the same for every installed port and does
not install a new port. `uninstall <id>` removes only that port's installed
source file. Add `--enable` to install or
update, or `--disable` to uninstall, when the local `fpasoterm` command is
available.

These are intentionally local operations. Updating the repository itself is a
separate Git operation, so users can review source changes before installing
them.

Install and update preserve an existing file with different contents. Pass
`--force` only after reviewing the replacement source. The fpasoterm CLI accepts
a basename only when it resolves to one plugin; ports install category paths so
users can enable a port with an unambiguous selector such as
`terminal/welcome-banner.ts`.

`install`, `update`, `uninstall`, and `compat` accept comma-separated port IDs.
For example: `node scripts/ports.js install terminal/hello,terminal/theme`.
`update all` updates every installed port. The command validates every selected
port before changing files, avoiding partial changes when one requested port is
missing.

## Validation And Compatibility

`node scripts/ports.js check` validates every port manifest, source file,
declared plugin version, and use of `window.fpasotermPluginApi`. It does not
write outside this checkout. `node scripts/ports.js compat [port|all]` runs the
installed `fpasoterm --version` command and compares it to each port's
`minFpasotermVersion`. Install and update run the same compatibility check
before copying. Use `--fpasoterm <command>` to check another binary or a
Windows `fpasoterm.cmd` wrapper.
