# Session Marker

Adds **Insert Session Marker** to the fpasoterm `Plugins` menu. The action
writes a local ISO-8601 timestamp separator into the terminal, which is useful
when reviewing terminal output logs. It does not execute a shell command,
access files, or access the network.

```sh
fpasoterm --plugin-install productivity/session-marker --enable
```
