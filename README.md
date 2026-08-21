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

On a Windows source checkout, run the installer with Node and use the packaged
`fpasoterm.cmd` wrapper or installed `fpasoterm` command for enablement:

```powershell
node .\scripts\ports.js install terminal/theme
fpasoterm --plugin-enable terminal/theme.ts
```

See [Japanese documentation](README.ja.md), [port format](docs/ports.en.md),
and the fpasoterm [plugin API](api/fpasoterm-plugin.d.ts).

## Security

Plugin source executes in the fpasoterm renderer beside the terminal UI. Do not
place secrets in plugin files and do not install unreviewed third-party code.
The repository intentionally contains no automatic download or update feature.
