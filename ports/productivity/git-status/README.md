# Git Status

Adds **Insert git status** to the fpasoterm `Plugins` menu. The action writes
`git status --short` at the current prompt but never sends Enter or executes a
command. Review or edit the text before running it.

```sh
fpasoterm --plugin-install productivity/git-status --enable
```

The command requires Git only when the user chooses to run the inserted text.
