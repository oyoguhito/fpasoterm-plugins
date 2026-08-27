# fpasoterm-plugins へのコントリビュート

公開 fpasoterm plugin ports collection の改善に協力いただきありがとう
ございます。この repository では、reviewしやすい小さな local plugin と
documentation の変更を受け付けます。

## 作業前の確認

- [port format](docs/ports.ja.md) と
  [fpasoterm plugin API](api/fpasoterm-plugin.d.ts) を確認してください。
- plugin code は terminal renderer で実行されます。download済み、難読化済み、
  または内容を確認できない code は提出しないでください。
- credential、token、private path、generated cache、binary artifact、個人情報を
  含めないでください。
- 大きな integration、新しい plugin API、既存portの動作変更は、先にIssueで相談して
  ください。

## 開発環境

Node.js 20 以降が必要です。forkをcloneし、branchまたはjj changeを作成してから
検証します。

```sh
git clone https://github.com/<your-account>/fpasoterm-plugins.git
cd fpasoterm-plugins
npm ci
npm run check
```

colocated checkoutではjjも使用できます。

```sh
jj git init --colocate
jj new
jj describe -m "Add terminal/example port"
```

PR用のbranch名は`add-terminal-example`のように短くし、無関係なformat変更や
generated file変更は同じPRに含めないでください。

## Port の追加・更新

1. `ports/<category>/<name>/` を作成します。
2. `port.toml`、`source`が指すsource file、簡潔な`README.md`を追加します。
3. `id`を`ports`からのpathと一致させ、公開`author`名またはGitHub account、semantic
   `version`、正確な`minFpasotermVersion`を設定します。
4. `.js`または`.ts` sourceに、対応する`@fpasoterm-plugin version`と
   description headerを追加します。
5. `api/fpasoterm-plugin.d.ts`に定義されたAPIだけを使用します。
6. 次の検証を実行します。

```sh
npm run check
npm run ports -- check
npm run ports -- compat <category/name>
```

`compat`はlocalにinstall済みのfpasoterm versionを確認します。特定binaryまたは
Windows wrapperを確認する場合は`--fpasoterm <command>`を指定してください。localへ
installしてfpasotermを再起動し、表示上の動作も確認します。

```sh
fpasoterm --plugin-install <category/name> --plugin-ports-dir . --enable
```

fpasotermは異なる内容の既存plugin fileを`--force`なしで置き換えません。このoptionを
使用する前にsourceを確認してください。

dependency、workflow file、external dataを扱うsourceを追加する場合は、PR前に
`npm run security`も実行してください。GitHub ActionsもすべてのPRで同じsecret scan、
production dependency audit、CodeQL analysisを実行します。

利用者に見える動作を変更した場合はport versionを上げてください。使用するAPIが変わらない
場合だけ`minFpasotermVersion`を維持できます。確認していないfpasoterm versionへの対応を
宣言しないでください。

## Pull Request

PR templateを使用し、次を記載してください。

- port IDと簡潔な動作説明
- 確認したfpasoterm versionとOS
- `npm run check`の結果
- 利用者に見えるplugin動作の場合は、必要に応じたscreenshotまたはterminal出力

maintainerはscope縮小、追加documentation、または新しいAPIに対応するための
`minFpasotermVersion`引き上げを依頼する場合があります。

## 問題報告

再現可能な問題はbug report form、新categoryまたは大きなintegrationはport proposal formを
使用してください。Issueにsecretやprivate terminal outputを記載しないでください。
