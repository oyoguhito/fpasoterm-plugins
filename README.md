# fpasoterm-plugins

Community-maintained fpasoterm plugins in a ports-style layout.

Each port is self-contained under `ports/<category>/<name>/`:

```text
ports/terminal/welcome-banner/
├── port.toml       # Name, version, API requirement, and install path
├── plugin.ts       # Renderer-context plugin source
└── README.md       # Port-specific usage
```

Plugins are copied into `~/.config/fpasoterm/User/plugins/` and enabled by the
existing fpasoterm CLI. They are local renderer code, not sandboxed extensions.
Install only plugins you have reviewed and trust.

## Quick Start

```sh
git clone https://github.com/oyoguhito/fpasoterm-plugins.git
cd fpasoterm-plugins
npm ci
npm run ports -- list
npm run ports -- install terminal/welcome-banner
fpasoterm --plugin-enable terminal/welcome-banner.ts
```

Use `--enable` to ask the installer to invoke the fpasoterm CLI after copying:

```sh
npm run ports -- install terminal/status-banner --enable
```

## Direct Install From fpasoterm

Current fpasoterm releases can install one selected public port without a full
checkout or Node.js:

```sh
fpasoterm --plugin-install appearance/teal
fpasoterm --plugin-install appearance/teal --enable
```

The first command writes only the selected source below `User/plugins` for
review. `--enable` is explicit, and `--plugin-install-force` is required to
replace an existing plugin file. The installer fetches only from this official
repository and validates the manifest, relative paths, source size, version,
and plugin API header before writing the file.

## GitHub Sync

Run the following from this Git checkout to retrieve the latest port metadata
and source:

    npm run ports -- sync

The command runs git pull --ff-only and validates INDEX. It does not copy,
enable, or execute plugin source. Review the Git diff, then install or update
selected ports explicitly.

The local workflow is equivalent to a ports tree:

    npm run ports -- sync
    npm run ports -- search banner
    npm run ports -- install terminal/welcome-banner --enable

Search reads the local INDEX. Install reads only the selected local port recipe
and copies its reviewed source into the fpasoterm User/plugins directory.

## Port Commands

The commands operate only on this checked-out repository and your local plugin
directory. They do not download or execute remote code.

```sh
# Search IDs, names, public authors, and descriptions.
npm run ports -- search banner

# Refresh one installed plugin from this checkout, or every installed port.
npm run ports -- update terminal/welcome-banner --force
npm run ports -- update all --force

# Remove the copied plugin. Add --disable to also update fpasoterm config.
npm run ports -- uninstall terminal/welcome-banner --disable

# Install, update, or remove multiple ports with comma-separated IDs.
npm run ports -- install terminal/hello,terminal/welcome-banner
npm run ports -- update appearance/teal,appearance/high-contrast --force
npm run ports -- uninstall terminal/hello,terminal/welcome-banner --disable
```

Every install, update, and uninstall command accepts `--plugin-dir <path>`.

Existing plugin files are protected. `install` and `update` do not replace a
different file unless `--force` is explicit. An identical file is reported as
already up to date. fpasoterm's own root-level examples can be enabled by
basename while no duplicate exists; ports install category paths such as
`terminal/theme.ts` to remain unambiguous.

## Compatibility Checks

`port.toml` declares the minimum supported fpasoterm version. `install` and
`update` run this check automatically against `fpasoterm --version` before any
file is copied. Run it explicitly before changing ports:

```sh
npm run ports -- check
npm run ports -- compat all
npm run ports -- compat appearance/teal
```

Use `--fpasoterm <command>` when testing a specific binary or Windows wrapper:

```powershell
npm run ports -- compat all --fpasoterm .\fpasoterm.cmd
```

`check` validates every manifest, plugin metadata header, source path, and API
entry point without changing the user configuration. `compat` additionally
checks the installed application's version against each port requirement.

## Maintaining INDEX

INDEX is generated from every port.toml and is the public search catalog. When
adding or changing a port, run:

    npm run ports -- index
    npm run check

## Categories

- `terminal`: fpasoterm's public `hello`, `welcome-banner`, `status-banner`,
  and `theme` examples.
- `appearance`: runtime terminal palette samples: `amber`, `teal`, and
  `high-contrast`.
- `integration`: reserved for documented local tool integrations.
- `productivity`: local workflow helpers: `git-status` and `session-marker`.

Profiles are persistent fpasoterm configuration selected with `--profile`.
Appearance ports instead change the terminal at runtime. Do not enable multiple
theme ports unless their order and overrides are intentional.

On a Windows source checkout, run the installer with Node and use the packaged
`fpasoterm.cmd` wrapper or installed `fpasoterm` command for enablement:

```powershell
npm run ports -- install terminal/theme
fpasoterm --plugin-enable terminal/theme.ts
```

See [Japanese documentation](README.ja.md), [port format](docs/ports.en.md),
the fpasoterm [plugin API](api/fpasoterm-plugin.d.ts), and
[contributing guidelines](CONTRIBUTING.md). See [authors and maintainers](AUTHORS.md)
for public project attribution.

## Security

Plugin source executes in the fpasoterm renderer beside the terminal UI. Do not
place secrets in plugin files and do not install unreviewed third-party code.

GitHub Actions runs syntax and port tests, a credential-pattern scan,
`npm audit --omit=dev`, and CodeQL JavaScript/TypeScript analysis on pull
requests and changes to `main`. Port tests run on Ubuntu and Windows runners.
