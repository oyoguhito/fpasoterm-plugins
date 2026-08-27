# Plugin Search

This port adds **Search Plugin Ports** to the fpasoterm `Plugins` menu. It
opens a GUI catalog loaded from the same official `INDEX` used by
`fpasoterm --plugin-search`. It retrieves only current port metadata when the
dialog opens, then filters by port ID, name, author, and description.

Use **Copy install command** to copy an explicit command such as:

```sh
fpasoterm --plugin-install appearance/amber --enable
```

Run the copied command in a shell. fpasoterm downloads only the selected
official port source into `User/plugins`; it does not require this repository
checkout or Node.js. The GUI does not download plugin source, install, enable,
or execute a port automatically.
