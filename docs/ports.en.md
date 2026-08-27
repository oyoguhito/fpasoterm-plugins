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
plugin. Review the diff before installing through fpasoterm.

## Development Port Operations

`npm run ports -- search <query>` searches port IDs, names, authors, and
descriptions in the checked-in local INDEX. `npm run ports -- info <id>` prints
one port's public metadata and renders its `README.md` for a terminal. `list`,
`index`, `sync`, `check`, and `compat` support port author development and
validation. They never modify `User/plugins`.

End users should install a reviewed checkout with
`fpasoterm --plugin-install <id> --plugin-ports-dir <checkout>` or a
trusted standalone source with `fpasoterm --plugin-install-file <path>`.
Updating the repository itself is a separate Git operation, so users can review
source changes before installing them.

Recent fpasoterm releases also support `fpasoterm --plugin-install <id>` for a
single-port direct download from the fixed official repository. That path does
not require this checkout or Node.js; it preserves existing files unless
`--force` is explicit. Use this ports CLI when reviewing or
contributing the full local tree.

## Validation And Compatibility

`npm run ports -- check` validates every port manifest, source file,
declared plugin version, and use of `window.fpasotermPluginApi`. It does not
write outside this checkout. `npm run ports -- compat [port|all]` runs the
installed `fpasoterm --version` command and compares it to each port's
`minFpasotermVersion`. Use `--fpasoterm <command>` to check another binary. On Windows
prefer a release `fpasoterm.exe` path over the `.cmd` wrapper.
