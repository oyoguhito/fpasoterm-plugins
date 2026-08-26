# Plugin Search

This port adds **Search Plugin Ports** to the fpasoterm `Plugins` menu. It
opens a local GUI catalog of the public ports included with this release and
filters by port ID, name, author, and description.

Use **Copy install command** to copy an explicit command such as:

```sh
fpasoterm --plugin-install appearance/amber --enable
```

Run the copied command in a shell. fpasoterm downloads only the selected
official port source into `User/plugins`; it does not require this repository
checkout or Node.js. The GUI is an embedded catalog snapshot: update this
plugin and restart fpasoterm to refresh it. It never fetches, installs,
enables, or executes a port automatically.
