# Port Format

各 port は `ports/<category>/<name>/` に配置し、`port.toml` と
`port.source` が指す source file を必須とします。

```toml
[port]
id = "terminal/example"
name = "example"
version = "1.0.0"
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

portを追加する前に`npm run check`を実行します。公開可能なsourceと
documentationだけを含め、credential、個人path、generated cache、install時に
codeをdownloadするdependencyは含めません。
