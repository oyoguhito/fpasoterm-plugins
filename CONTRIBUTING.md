# Contributing To fpasoterm-plugins

Thank you for improving the public fpasoterm plugin ports collection. This
repository accepts small, reviewable local plugins and documentation changes.

## Before You Start

- Read the [port format](docs/ports.en.md) and the
  [fpasoterm plugin API](api/fpasoterm-plugin.d.ts).
- Review the security model: plugin code runs in the terminal renderer. Do not
  submit downloaded, obfuscated, or unreviewed code.
- Do not include credentials, tokens, private paths, generated caches, binary
  artifacts, or personal data.
- Open an issue first for a large integration, a new plugin API requirement, or
  behavior that changes existing ports.

## Development Setup

Node.js 20 or later is required. Clone your fork, create a branch or jj change,
and run the checks:

```sh
git clone https://github.com/<your-account>/fpasoterm-plugins.git
cd fpasoterm-plugins
npm ci
npm run check
```

The repository also works with jj in a colocated checkout:

```sh
jj git init --colocate
jj new
jj describe -m "Add terminal/example port"
```

Use a short branch name such as `add-terminal-example` when creating a pull
request. Keep unrelated formatting and generated-file changes out of the same
PR.

## Adding Or Updating A Port

1. Create `ports/<category>/<name>/`.
2. Add `port.toml`, the source named by `source`, and a concise `README.md`.
3. Set `id` to the path below `ports`, add your public `author` name or GitHub
   account, use semantic `version`, and set an accurate `minFpasotermVersion`.
4. Include matching `@fpasoterm-plugin version` and description headers in the
   `.js` or `.ts` source.
5. Use only APIs documented in `api/fpasoterm-plugin.d.ts`.
6. Run the required checks:

```sh
npm run check
npm run ports -- check
npm run ports -- compat <category/name>
```

`compat` tests the locally installed fpasoterm version. To test a specific
binary or the Windows wrapper, pass `--fpasoterm <command>`. Install the port
with fpasoterm and restart it to verify visible behavior:

```sh
fpasoterm --plugin-install <category/name> --plugin-ports-dir . --enable
```

fpasoterm does not replace a different existing plugin file unless
`--force` is supplied. Review the source before using that option.

Run `npm run security` before a PR when the change adds dependencies, workflow
files, or source that handles external data. GitHub Actions runs the same secret
scan, production dependency audit, and CodeQL analysis for every PR.

For an update, increment the port version for a user-visible behavior change.
Keep `minFpasotermVersion` unchanged only when the supported API surface is
unchanged. Do not claim support for a fpasoterm version you have not checked.

## Pull Requests

Use the pull request template and include:

- The port ID and a concise behavioral summary.
- The fpasoterm version and operating systems tested.
- Output from `npm run check`.
- A screenshot or terminal output for user-visible plugin behavior when useful.

Maintainers may request a smaller scope, additional documentation, or a higher
minimum fpasoterm version when a plugin depends on newer APIs.

## Reporting Problems

Use the bug report form for reproducible problems and the port proposal form
before implementing a new category or significant integration. Never include
secrets or private terminal output in an issue.
