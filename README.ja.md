# fpasoterm-plugins

fpasoterm 用 plugin を Ports 形式で管理する repository です。

各 port は `ports/<category>/<name>/` 配下で完結します。

```text
ports/terminal/welcome-banner/
├── port.toml       # 名前、version、API要件、install先
├── plugin.ts       # renderer contextで実行するplugin source
└── README.md       # port固有の説明
```

plugin は `~/.config/fpasoterm/User/plugins/` へcopyし、既存の fpasoterm CLIでenableします。sandbox化された拡張機構ではないため、内容を確認して信頼できるlocal pluginだけを使ってください。

## Quick Start

```sh
git clone https://github.com/oyoguhito/fpasoterm-plugins.git
cd fpasoterm-plugins
node scripts/ports.js list
node scripts/ports.js install terminal/welcome-banner
fpasoterm --plugin-enable terminal/welcome-banner.ts
```

`--enable` を追加すると、copy後に fpasoterm CLI を実行します。

```sh
node scripts/ports.js install terminal/status-banner --enable
```

Windows の source checkout では Node からinstallerを実行し、packaged
`fpasoterm.cmd` または install済みの `fpasoterm` command でenableします。

```powershell
node .\scripts\ports.js install terminal/theme
fpasoterm --plugin-enable terminal/theme.ts
```

[port format](docs/ports.ja.md) と [plugin API](api/fpasoterm-plugin.d.ts) を参照してください。

## Security

plugin source は terminal UI と同じ renderer context で実行されます。plugin fileにsecretを書かず、未確認のthird-party codeをinstallしないでください。このrepositoryは自動downloadや自動updateを行いません。
