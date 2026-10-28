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
cd ../fpasoterm
bin/fpasoterm --plugin-list --plugin-ports-dir ../fpasoterm-plugins
bin/fpasoterm --plugin-install terminal/welcome-banner \
  --plugin-ports-dir ../fpasoterm-plugins --enable
```

fpasoterm 1.6.16以降でcheckoutに含まれるportを導入する利用者には、`npm ci`、`npm run build`、port固有の`configure` scriptは不要です。`npm run ports -- ...`と`configure`は、bundleの再生成、noVNC RFB互換modeの変更、`INDEX`検証を行うport author向けに残します。

## fpasoterm からの直接install

現在のfpasoterm releaseでは、ports checkout全体やNode.jsを使わずに、指定した公開portだけを導入できます。

```sh
fpasoterm --plugin-install appearance/teal
fpasoterm --plugin-install appearance/teal --enable
```

最初のcommandは選択したsourceだけをreview用に`User/plugins`へ保存します。`--enable`は明示指定が必要で、既存plugin fileを置き換えるには`--force`が必要です。installerはこの公式repositoryだけから取得し、manifest、相対path、source size、version、plugin API headerを検証してからfileを書き込みます。

### local install時のRDP/noVNC接続先指定

fpasoterm 1.6.16以降では、review済みlocal RDP/noVNC portのinstallと、接続を許可する一つのbridge target指定を一つのcommandで実行できます。targetはplugin内のbridge callとnative permission headerの両方へ同じ値で保存されるため、pluginに任意のTCP endpointへの接続権限を与えません。

```sh
# siblingのfpasoterm checkoutから実行する。
cd ../fpasoterm

# RDPはtcp://だけを受け付ける。host:portはtcp://host:portへ正規化される。
bin/fpasoterm --plugin-ports-dir ../fpasoterm-plugins/ports \
  --plugin-install integration/rdp-local-bridge \
  --plugin-tcp-target 192.0.2.25:3389 --enable --force

# noVNCはtcp://またはtls://を受け付ける。
bin/fpasoterm --plugin-ports-dir ../fpasoterm-plugins/ports \
  --plugin-install integration/novnc-local-bridge \
  --plugin-tcp-target tcp://192.0.2.10:5900 --enable --force
```

install後はfpasotermを再起動してください。初回installでは`--force`は不要です。`fpasoterm --plugin-update-all`で更新しても指定済みtargetは維持されます。

### CLI helpと確認

利用者が導入済みpluginを管理する場合は、`npm run ports`ではなくfpasoterm CLIを使用します。不足または組み合わせが不正なoptionは、理由に加えてcopy可能なbridge install形式を表示します。全optionは`--help`で確認できます。

```sh
fpasoterm --help
fpasoterm --plugin-list       # --plugins-listもalias
fpasoterm --plugin-info integration/rdp-local-bridge
fpasoterm --plugin-info integration/novnc-local-bridge
```

`--plugin-list`と`--plugin-info`は設定済みの場合に`TCP target`を表示します。どちらもplugin sourceを実行せずheaderだけを読むため、windowを開きません。

導入済み`User/plugins`ではなくcheckoutを導入前にreviewするには、`--plugin-ports-dir`を追加します。

```sh
bin/fpasoterm --plugin-list --plugin-ports-dir ./fpasoterm-plugins
bin/fpasoterm --plugin-info integration/novnc-local-bridge \
  --plugin-ports-dir ./fpasoterm-plugins/ports
```

## GitHub Sync

GitHub上の現在のcheckoutから新しいport metadataとsourceを取得する場合は、次を実行します。

    npm run ports -- sync

このcommandはgit pull --ff-onlyとINDEX検証だけを行います。plugin sourceのcopy、enable、実行はしません。Git diffをreviewしてから、必要なportをfpasoterm本体でinstallしてください。

localでの利用フローはPorts treeと同様です。

    npm run ports -- sync
    npm run ports -- search banner
    npm run ports -- info terminal/welcome-banner
    fpasoterm --plugin-install terminal/welcome-banner --plugin-ports-dir . --enable

searchはlocal INDEXを検索します。installはport authorの開発test用として残します。通常は`fpasoterm --plugin-install <id> --plugin-ports-dir .`を使用し、copy、上書き、enableはfpasoterm本体に任せます。

## Port開発用Command

ports CLI は `User/plugins` を変更しません。install、update、uninstall、enable、plugin sourceの実行は行いません。

```sh
# ID、name、公開author、descriptionを検索する
npm run ports -- search banner

# 1つのportのmetadataと整形済みREADME.mdを読む
npm run ports -- info appearance/teal

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
