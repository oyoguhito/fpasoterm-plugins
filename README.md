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
node scripts/ports.js list
node scripts/ports.js install terminal/welcome-banner
fpasoterm --plugin-enable terminal/welcome-banner.ts
```

Use `--enable` to ask the installer to invoke the fpasoterm CLI after copying:

```sh
node scripts/ports.js install terminal/status-banner --enable
```

## Port Commands

The commands operate only on this checked-out repository and your local plugin
directory. They do not download or execute remote code.

```sh
# Search IDs, names, public authors, and descriptions.
node scripts/ports.js search banner

# Refresh one installed plugin from this checkout, or every installed port.
node scripts/ports.js update terminal/welcome-banner --force
node scripts/ports.js update all --force

# Remove the copied plugin. Add --disable to also update fpasoterm config.
node scripts/ports.js uninstall terminal/welcome-banner --disable

# Install, update, or remove multiple ports with comma-separated IDs.
node scripts/ports.js install terminal/hello,terminal/welcome-banner
node scripts/ports.js update appearance/teal,appearance/high-contrast --force
node scripts/ports.js uninstall terminal/hello,terminal/welcome-banner --disable
```

Every install, update, and uninstall command accepts `--plugin-dir <path>`.
`update` is a local recopy operation, not a network package update; it never
installs a new port. Restart fpasoterm after changing plugin files or enabled
state.

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
node scripts/ports.js check
node scripts/ports.js compat all
node scripts/ports.js compat appearance/teal
```

Use `--fpasoterm <command>` when testing a specific binary or Windows wrapper:

```powershell
node .\scripts\ports.js compat all --fpasoterm .\fpasoterm.cmd
```

`check` validates every manifest, plugin metadata header, source path, and API
entry point without changing the user configuration. `compat` additionally
checks the installed application's version against each port requirement.

## Categories

- `terminal`: fpasoterm's public `hello`, `welcome-banner`, `status-banner`,
  and `theme` examples.
- `appearance`: runtime terminal palette samples, including `teal` and
  `high-contrast`.
- `integration`: reserved for documented local tool integrations.
- `productivity`: reserved for local workflow helpers.

Profiles are persistent fpasoterm configuration selected with `--profile`.
Appearance ports instead change the terminal at runtime. Do not enable multiple
theme ports unless their order and overrides are intentional.

On a Windows source checkout, run the installer with Node and use the packaged
`fpasoterm.cmd` wrapper or installed `fpasoterm` command for enablement:

```powershell
node .\scripts\ports.js install terminal/theme
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
