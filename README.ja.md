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

## Port Command

各 command はこの checkout と local plugin directory のみを操作します。
networkからのdownloadやremote codeの実行は行いません。

```sh
# ID、name、公開author、descriptionを検索する
node scripts/ports.js search banner

# このcheckoutのsourceで導入済みの1件、または全portを再copyする
node scripts/ports.js update terminal/welcome-banner --force
node scripts/ports.js update all --force

# copy済みpluginを削除する。--disableでfpasotermの設定も解除する
node scripts/ports.js uninstall terminal/welcome-banner --disable

# comma区切りで複数portをinstall、update、uninstallする
node scripts/ports.js install terminal/hello,terminal/welcome-banner
node scripts/ports.js update appearance/teal,appearance/high-contrast --force
node scripts/ports.js uninstall terminal/hello,terminal/welcome-banner --disable
```

`install`、`update`、`uninstall` にはすべて `--plugin-dir <path>` を
指定できます。`update` はnetwork package updateではなく、このcheckoutからの
local再copyで、新しいportを導入することはありません。plugin fileまたはenable状態を
変更した後はfpasotermを再起動します。

既存plugin fileは保護します。`install` と `update` は異なる内容のfileを`--force`なしで
上書きしません。同一内容の場合は最新として表示します。fpasoterm本体のroot-level exampleは
同名pluginが無ければbasenameで有効化できますが、portsは`terminal/theme.ts`のような
category pathへ導入するため曖昧になりません。

## 互換性確認

`port.toml` には対応する最小fpasoterm versionを定義します。`install` と `update`
はcopy前に自動で `fpasoterm --version` を実行して確認します。変更前の確認には次を
使用します。

```sh
node scripts/ports.js check
node scripts/ports.js compat all
node scripts/ports.js compat appearance/teal
```

特定のbinaryまたはWindows wrapperを確認する場合は`--fpasoterm <command>`を指定します。

```powershell
node .\scripts\ports.js compat all --fpasoterm .\fpasoterm.cmd
```

`check` は全manifest、plugin metadata header、source path、API entry pointを確認し、
User設定は変更しません。`compat` は追加で、実行できるfpasoterm本体のversionがportの
必要versionを満たすか確認します。

## Category

- `terminal`: fpasotermの公開exampleである`hello`、`welcome-banner`、
  `status-banner`、`theme`。
- `appearance`: `teal`、`high-contrast`など、runtime terminal paletteのsample。
- `integration`: local tool integration用の予約category。
- `productivity`: local workflow helper用の予約category。

profileは`--profile`で選択する永続的なfpasoterm設定です。appearance portはruntimeで
terminalを変更します。複数のtheme portを有効にする場合は、読み込み順と上書きを意図して
設定してください。

Windows の source checkout では Node からinstallerを実行し、packaged
`fpasoterm.cmd` または install済みの `fpasoterm` command でenableします。

```powershell
node .\scripts\ports.js install terminal/theme
fpasoterm --plugin-enable terminal/theme.ts
```

[port format](docs/ports.ja.md)、[plugin API](api/fpasoterm-plugin.d.ts)、
[contributing guidelines](CONTRIBUTING.ja.md)、
[authors and maintainers](AUTHORS.md) を参照してください。

## Security

plugin source は terminal UI と同じ renderer context で実行されます。plugin fileにsecretを書かず、未確認のthird-party codeをinstallしないでください。

GitHub ActionsはPRと`main`への変更に対して、syntax・port test、credential pattern scan、
`npm audit --omit=dev`、CodeQL JavaScript/TypeScript analysisを実行します。port testは
UbuntuとWindows runnerで実行します。
