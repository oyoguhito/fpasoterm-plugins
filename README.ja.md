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
npm ci
npm run ports -- list
npm run ports -- install terminal/welcome-banner
fpasoterm --plugin-enable terminal/welcome-banner
```

`--enable` を追加すると、copy後に fpasoterm CLI を実行します。

```sh
npm run ports -- install terminal/status-banner --enable
```

## fpasoterm からの直接install

現在のfpasoterm releaseでは、ports checkout全体やNode.jsを使わずに、指定した公開portだけを導入できます。

```sh
fpasoterm --plugin-install appearance/teal
fpasoterm --plugin-install appearance/teal --enable
```

最初のcommandは選択したsourceだけをreview用に`User/plugins`へ保存します。`--enable`は明示指定が必要で、既存plugin fileを置き換えるには`--plugin-install-force`が必要です。installerはこの公式repositoryだけから取得し、manifest、相対path、source size、version、plugin API headerを検証してからfileを書き込みます。

## GitHub Sync

GitHub上の現在のcheckoutから新しいport metadataとsourceを取得する場合は、次を実行します。

    npm run ports -- sync

このcommandはgit pull --ff-onlyとINDEX検証だけを行います。plugin sourceのcopy、enable、実行はしません。Git diffをreviewしてから、必要なportだけを明示的にinstallまたはupdateしてください。

localでの利用フローはPorts treeと同様です。

    npm run ports -- sync
    npm run ports -- search banner
    npm run ports -- install terminal/welcome-banner --enable

searchはlocal INDEXを検索します。installは選択したlocal port recipeだけを読み、review済みsourceをfpasotermのUser/plugins directoryへcopyします。

## Port Command

各 command はこの checkout と local plugin directory のみを操作します。
networkからのdownloadやremote codeの実行は行いません。

```sh
# ID、name、公開author、descriptionを検索する
npm run ports -- search banner

# このcheckoutのsourceで導入済みの1件、または全portを再copyする
npm run ports -- update terminal/welcome-banner --force
npm run ports -- update all --force

# copy済みpluginを削除する。--disableでfpasotermの設定も解除する
npm run ports -- uninstall terminal/welcome-banner --disable

# comma区切りで複数portをinstall、update、uninstallする
npm run ports -- install terminal/hello,terminal/welcome-banner
npm run ports -- update appearance/teal,appearance/high-contrast --force
npm run ports -- uninstall terminal/hello,terminal/welcome-banner --disable
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
npm run ports -- check
npm run ports -- compat all
npm run ports -- compat appearance/teal
```

特定のbinaryを確認する場合は`--fpasoterm <command>`を指定します。Windowsでは`.cmd`
wrapperではなくreleaseの`fpasoterm.exe`を直接指定してください。

```powershell
$fpasoterm = (Resolve-Path "..\pr53\src-tauri\target\release\fpasoterm.exe").Path
npm run ports -- compat all --fpasoterm $fpasoterm
npm run ports -- install productivity/plugin-search --fpasoterm $fpasoterm
```

Windowsではcurrent directory、`%APPDATA%\\npm`、`%USERPROFILE%\\.local\\bin`、
`Path`から`fpasoterm.cmd`または`fpasoterm.exe`を検索します。これらにinstallされて
いない場合は、`--fpasoterm`で明示的なpathを指定してください。

`check` は全manifest、plugin metadata header、source path、API entry pointを確認し、
User設定は変更しません。`compat` は追加で、実行できるfpasoterm本体のversionがportの
必要versionを満たすか確認します。

## INDEXの保守

INDEXは全port.tomlから生成する公開検索catalogです。portを追加・変更した場合は次を実行します。

    npm run ports -- index
    npm run check

## Category

- `terminal`: fpasotermの公開exampleである`hello`、`welcome-banner`、
  `status-banner`、`theme`。
- `appearance`: `amber`、`teal`、`high-contrast`など、runtime terminal paletteのsample。
- `integration`: local tool integration用の予約category。
- `productivity`: `git-status`、`session-marker`などのlocal workflow helper。

profileは`--profile`で選択する永続的なfpasoterm設定です。appearance portはruntimeで
terminalを変更します。複数のtheme portを有効にする場合は、読み込み順と上書きを意図して
設定してください。

Windows の source checkout では Node からinstallerを実行し、packaged
`fpasoterm.cmd` または install済みの `fpasoterm` command でenableします。

```powershell
npm run ports -- install terminal/theme
fpasoterm --plugin-enable terminal/theme
```

[port format](docs/ports.ja.md)、[plugin API](api/fpasoterm-plugin.d.ts)、
[contributing guidelines](CONTRIBUTING.ja.md)、
[authors and maintainers](AUTHORS.md) を参照してください。

## Security

plugin source は terminal UI と同じ renderer context で実行されます。plugin fileにsecretを書かず、未確認のthird-party codeをinstallしないでください。

GitHub ActionsはPRと`main`への変更に対して、syntax・port test、credential pattern scan、
`npm audit --omit=dev`、CodeQL JavaScript/TypeScript analysisを実行します。port testは
UbuntuとWindows runnerで実行します。
