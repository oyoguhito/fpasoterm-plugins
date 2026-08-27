# fpasoterm-plugins

fpasoterm 用 plugin を Ports 形式で管理する repository です。このrepositoryはcatalog / `INDEX`検索、port開発、検証用です。利用者はreview済みlocal portまたは信頼済みlocal fileをfpasoterm本体CLIからinstallします。

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
fpasoterm --plugin-install terminal/welcome-banner \
  --plugin-ports-dir . --enable
```

`npm run ports -- ...`はport authorがlocal検索、`INDEX`生成・検証、port recipeのテストに使うため残します。利用者向けの主なinstallerではありません。

## fpasoterm からの直接install

現在のfpasoterm releaseでは、ports checkout全体やNode.jsを使わずに、指定した公開portだけを導入できます。

```sh
fpasoterm --plugin-install appearance/teal
fpasoterm --plugin-install appearance/teal --enable
```

最初のcommandは選択したsourceだけをreview用に`User/plugins`へ保存します。`--enable`は明示指定が必要で、既存plugin fileを置き換えるには`--force`が必要です。installerはこの公式repositoryだけから取得し、manifest、相対path、source size、version、plugin API headerを検証してからfileを書き込みます。

## GitHub Sync

GitHub上の現在のcheckoutから新しいport metadataとsourceを取得する場合は、次を実行します。

    npm run ports -- sync

このcommandはgit pull --ff-onlyとINDEX検証だけを行います。plugin sourceのcopy、enable、実行はしません。Git diffをreviewしてから、必要なportをfpasoterm本体でinstallしてください。

localでの利用フローはPorts treeと同様です。

    npm run ports -- sync
    npm run ports -- search banner
    fpasoterm --plugin-install terminal/welcome-banner --plugin-ports-dir . --enable

searchはlocal INDEXを検索します。installはport authorの開発test用として残します。通常は`fpasoterm --plugin-install <id> --plugin-ports-dir .`を使用し、copy、上書き、enableはfpasoterm本体に任せます。

## Port開発用Command

ports CLI は `User/plugins` を変更しません。install、update、uninstall、enable、plugin sourceの実行は行いません。

```sh
# ID、name、公開author、descriptionを検索する
npm run ports -- search banner

```

このcheckoutからinstallする場合は`fpasoterm --plugin-install <category/name> --plugin-ports-dir .`を使用します。再installは`--force`を追加し、削除は`fpasoterm --plugin-uninstall <file>`を使用します。

## 互換性確認

`port.toml` には対応する最小fpasoterm versionを定義します。port変更前には次を実行して確認します。

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

Windows の source checkoutでは、packaged `fpasoterm.cmd` またはinstall済みの
`fpasoterm` commandでreview済みportをinstallします。

```powershell
fpasoterm --plugin-install terminal/theme --plugin-ports-dir . --enable
```

[port format](docs/ports.ja.md)、[plugin API](api/fpasoterm-plugin.d.ts)、
[contributing guidelines](CONTRIBUTING.ja.md)、
[authors and maintainers](AUTHORS.md) を参照してください。

## Security

plugin source は terminal UI と同じ renderer context で実行されます。plugin fileにsecretを書かず、未確認のthird-party codeをinstallしないでください。

GitHub ActionsはPRと`main`への変更に対して、syntax・port test、credential pattern scan、
`npm audit --omit=dev`、CodeQL JavaScript/TypeScript analysisを実行します。port testは
UbuntuとWindows runnerで実行します。
