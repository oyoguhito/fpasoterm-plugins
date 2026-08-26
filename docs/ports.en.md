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

## INDEX

`INDEX` is the checked-in public catalog generated from every
`port.toml`. It contains the metadata needed to browse ports without reading
plugin source. Run `npm run ports -- index` after changing port metadata.
CI and `npm run check` reject a stale index with
`npm run ports -- index --check`.

GitHub updates are intentionally separate from installation. Run
npm run ports -- sync from the repository checkout to execute git pull
--ff-only and validate INDEX. The command does not copy, enable, or execute a
plugin. Review the diff before running an explicit install or update command.

## Local Port Operations

`npm run ports -- search <query>` searches port IDs, names, and
descriptions. `install` copies the selected source into the user plugin
directory. `update <id>` replaces that copied source with the source from the
current checkout; `update all` does the same for every installed port and does
not install a new port. `uninstall <id>` removes only that port's installed
source file. Add `--enable` to install or
update, or `--disable` to uninstall, when the local `fpasoterm` command is
available.

When the ports CLI prints or invokes fpasoterm enable/disable commands, it uses
the concise local selector form such as `productivity/plugin-search`. The
leading `plugins/` and `.ts`/`.js` suffix are optional in fpasoterm unless the
selector would be ambiguous.

These are intentionally local operations. Updating the repository itself is a
separate Git operation, so users can review source changes before installing
them.

Recent fpasoterm releases also support `fpasoterm --plugin-install <id>` for a
single-port direct download from the fixed official repository. That path does
not require this checkout or Node.js; it preserves existing files unless
`--plugin-install-force` is explicit. Use this ports CLI when reviewing or
contributing the full local tree.

## Validation And Compatibility

`npm run ports -- check` validates every port manifest, source file,
declared plugin version, and use of `window.fpasotermPluginApi`. It does not
write outside this checkout. `npm run ports -- compat [port|all]` runs the
installed `fpasoterm --version` command and compares it to each port's
`minFpasotermVersion`. Install and update run the same compatibility check
before copying. Use `--fpasoterm <command>` to check another binary. On Windows
prefer a release `fpasoterm.exe` path over the `.cmd` wrapper.
