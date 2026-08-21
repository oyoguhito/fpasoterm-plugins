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

## Local Port 操作

`node scripts/ports.js search <query>` はportのID、name、descriptionを検索します。
`install` は選択したsourceをUser plugin directoryへcopyします。`update <id>` は
そのcopy済みsourceを現在のcheckoutにあるsourceで置き換えます。`update all` は導入済みの
全portを同様に処理し、新しいportは導入しません。`uninstall <id>` は対象portがinstallした
source fileだけを削除します。
localの`fpasoterm` commandを利用できる場合、installまたはupdateでは`--enable`、
uninstallでは`--disable`を追加できます。

これらは意図的にlocal操作だけです。repositoryの更新は別途Gitで行うため、利用者は
source変更を確認してからinstallできます。

installとupdateは内容が異なる既存fileを保持します。置き換える場合だけ、sourceを確認して
`--force`を指定してください。fpasoterm CLIは1件に解決できる場合のみbasenameを受け付けます。
portsはcategory pathへ導入するため、`terminal/welcome-banner.ts`のように曖昧でないselectorで
有効化できます。

`install`、`update`、`uninstall`、`compat` はcomma区切りの複数port IDを受け付けます。
例: `node scripts/ports.js install terminal/hello,terminal/theme`。`update all`は導入済みの
全portを更新します。commandはfile変更前に選択した全portを検証するため、要求したportの一部が
存在しない場合に部分更新しません。

## 検証と互換性

`node scripts/ports.js check` は全portのmanifest、source file、宣言plugin version、
`window.fpasotermPluginApi`の使用を確認します。このcheckout外への書き込みは行いません。
`node scripts/ports.js compat [port|all]` はinstall済みの`fpasoterm --version`を実行し、
各portの`minFpasotermVersion`と比較します。installとupdateもcopy前に同じ互換性確認を
行います。別binaryまたはWindowsの`fpasoterm.cmd` wrapperを確認する場合は、
`--fpasoterm <command>`を使用します。
