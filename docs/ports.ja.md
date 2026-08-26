# Port Format

各 port は `ports/<category>/<name>/` に配置し、`port.toml` と
`port.source` が指す source file を必須とします。

```toml
[port]
id = "terminal/example"
name = "example"
version = "1.0.0"
author = "github-account-or-public-name"
description = "公開可能な一行説明。"
license = "MIT"
minFpasotermVersion = "1.5.5"
source = "plugin.ts"
installPath = "terminal/example.ts"
```

`id` は `ports` 配下のdirectory pathと一致させます。`installPath` は
`~/.config/fpasoterm/User/plugins/` からの相対pathで、`.js` または `.ts`
で終わり、そのdirectory外を指してはいけません。pluginの
`@fpasoterm-plugin version` headerと`port.version`も一致させてください。

`author` は必須の公開attribution fieldです。公開名またはGitHub accountを使用し、
private email addressは記載しないでください。repository全体のmaintainerは
[`AUTHORS.md`](../AUTHORS.md)に記載します。

portを追加する前に`npm run check`を実行します。公開可能なsourceと
documentationだけを含め、credential、個人path、generated cache、install時に
codeをdownloadするdependencyは含めません。

## INDEX

`INDEX` は全`port.toml`から生成するcommit対象の公開catalogです。plugin sourceを読まなくてもport metadataを一覧できます。port metadataを変更した後は`npm run ports -- index`を実行してください。CIと`npm run check`は`npm run ports -- index --check`で古いINDEXを検出します。

GitHubからの更新とinstallは意図的に分離します。repository checkoutで
npm run ports -- syncを実行するとgit pull --ff-onlyとINDEX検証を行います。このcommandはpluginをcopy、enable、実行しません。明示的なinstallまたはupdateの前にdiffをreviewしてください。

## Local Port 操作

`npm run ports -- search <query>` はportのID、name、descriptionを検索します。
`install` は選択したsourceをUser plugin directoryへcopyします。`update <id>` は
そのcopy済みsourceを現在のcheckoutにあるsourceで置き換えます。`update all` は導入済みの
全portを同様に処理し、新しいportは導入しません。`uninstall <id>` は対象portがinstallした
source fileだけを削除します。
localの`fpasoterm` commandを利用できる場合、installまたはupdateでは`--enable`、
uninstallでは`--disable`を追加できます。

ports CLI が表示・実行する fpasoterm のenable/disable commandでは、`productivity/plugin-search` のような短いlocal selectorを使用します。fpasotermでは、selectorが曖昧でない場合に`plugins/` prefixと`.ts`/`.js` suffixを省略できます。

これらは意図的にlocal操作だけです。repositoryの更新は別途Gitで行うため、利用者は
source変更を確認してからinstallできます。

新しいfpasoterm releaseでは、`fpasoterm --plugin-install <id>`で固定の公式repositoryから1件だけを直接取得する方法も利用できます。この方法はcheckoutやNode.jsを必要とせず、`--plugin-install-force`を明示しない限り既存fileを置き換えません。tree全体のreviewやcontributionには、このports CLIを使用します。

## 検証と互換性

`npm run ports -- check` は全portのmanifest、source file、宣言plugin version、
`window.fpasotermPluginApi`の使用を確認します。このcheckout外への書き込みは行いません。
`npm run ports -- compat [port|all]` はinstall済みの`fpasoterm --version`を実行し、
各portの`minFpasotermVersion`と比較します。installとupdateもcopy前に同じ互換性確認を
行います。別binaryを確認する場合は`--fpasoterm <command>`を使用します。Windowsでは
`.cmd` wrapperよりreleaseの`fpasoterm.exe`を直接指定してください。
