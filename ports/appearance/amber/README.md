# Amber Appearance

Applies an amber-on-charcoal palette to the current terminal window at runtime.
It does not modify `config.toml` and does not start external commands.

```sh
fpasoterm --plugin-install appearance/amber --enable
```

Restart the affected fpasoterm window after enabling the plugin. Do not enable
multiple appearance ports unless their load order and overrides are intentional.
