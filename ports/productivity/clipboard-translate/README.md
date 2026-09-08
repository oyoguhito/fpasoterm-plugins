# Clipboard Translate

Adds **Translate Clipboard** to the fpasoterm `Plugins` menu. It opens a panel
similar to Log Show: the source text is read from the system clipboard, a
translation destination can be selected, and the selected provider opens in an
external browser.

The panel labels and safety note follow the selected destination language:
Japanese, English, Korean, Simplified Chinese, German, Spanish, or French.

The plugin does not contain a translation engine, API key, or network client.
It opens the selected provider only after an explicit button click:

- **Google Translate** receives the source text and selected target language in
  its browser URL. The source text can therefore be retained in browser
  history or provider logs.
- **Other translation website** opens an explicit HTTPS URL entered in the
  panel. The edited source text is copied immediately before the browser opens,
  so paste it into the service there.

After copying translated text in the browser, paste it directly into the target
terminal or application with its normal paste shortcut. In fpasoterm, use
`Ctrl+Shift+v`; the plugin does not retain a second copy of the result.

Only send text that you are permitted to share with the selected website.
Translation services may retain or process submitted content under their own
terms. This plugin does not open a provider or transmit clipboard text
automatically.

```sh
fpasoterm --plugin-install productivity/clipboard-translate --enable
```

This port requires fpasoterm 1.6.2 or later because it uses the public
`openExternalUrl()` plugin API.
