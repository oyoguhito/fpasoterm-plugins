/// <reference path="../../../api/fpasoterm-plugin.d.ts" />
// @fpasoterm-plugin version: 1.0.0
// @fpasoterm-plugin description: Opens a clipboard translation panel for explicit Google Translate or other translation website use.

const api = window.fpasotermPluginApi;

const providers = {
  google: {
    label: 'Google Translate',
    urlFor: (text, target) => `https://translate.google.com/?sl=auto&tl=${encodeURIComponent(target)}&text=${encodeURIComponent(text)}&op=translate`,
    note: 'Opens Google Translate with the clipboard text and selected target language.',
  },
  other: {
    label: 'Other translation website',
    urlFor: () => '',
    note: 'Enter an HTTPS translation website URL. The clipboard text remains ready to paste into the service.',
  },
};

const targetLanguages = [
  ['ja', 'Japanese'],
  ['en', 'English'],
  ['ko', 'Korean'],
  ['zh-CN', 'Chinese (Simplified)'],
  ['de', 'German'],
  ['es', 'Spanish'],
  ['fr', 'French'],
];

const uiText = {
  en: { title: 'Translate Clipboard', close: 'Close', provider: 'Provider', target: 'Translate to', otherUrl: 'Other website URL (HTTPS)', source: 'Source text', load: 'Load clipboard', open: 'Open translator', sourcePlaceholder: 'Copy text in fpasoterm, then load and edit it here.', otherPlaceholder: 'https://example.com/translate', note: 'The provider opens only when you choose Open translator. Google Translate receives source text in its browser URL; do not send secrets or text you are not permitted to share.' },
  ja: { title: 'クリップボードを翻訳', close: '閉じる', provider: '翻訳サービス', target: '翻訳先', otherUrl: '他の翻訳サイト URL (HTTPS)', source: '原文', load: 'クリップボードを読み込む', open: '翻訳サイトを開く', sourcePlaceholder: 'fpasoterm で文字列をコピーしてから、ここへ読み込んで編集します。', otherPlaceholder: 'https://example.com/translate', note: '翻訳サイトは「翻訳サイトを開く」を選んだ場合だけ開きます。Google Translate には原文がブラウザ URL として渡ります。秘密情報や共有を許可されていない内容は送信しないでください。' },
  ko: { title: '클립보드 번역', close: '닫기', provider: '번역 서비스', target: '번역 언어', otherUrl: '다른 번역 사이트 URL (HTTPS)', source: '원문', load: '클립보드 불러오기', open: '번역기 열기', sourcePlaceholder: 'fpasoterm에서 텍스트를 복사한 뒤 여기에서 불러와 편집합니다.', otherPlaceholder: 'https://example.com/translate', note: '번역기는 "번역기 열기"를 선택할 때만 열립니다. Google Translate에는 원문이 브라우저 URL로 전달됩니다. 비밀 정보는 보내지 마세요.' },
  'zh-CN': { title: '翻译剪贴板', close: '关闭', provider: '翻译服务', target: '目标语言', otherUrl: '其他翻译网站 URL (HTTPS)', source: '原文', load: '读取剪贴板', open: '打开翻译器', sourcePlaceholder: '在 fpasoterm 中复制文本，然后在此处读取和编辑。', otherPlaceholder: 'https://example.com/translate', note: '仅在选择“打开翻译器”时打开翻译服务。Google Translate 会通过浏览器 URL 接收原文。请勿发送机密信息。' },
  de: { title: 'Zwischenablage übersetzen', close: 'Schließen', provider: 'Übersetzungsdienst', target: 'Zielsprache', otherUrl: 'Andere Übersetzungswebsite-URL (HTTPS)', source: 'Quelltext', load: 'Zwischenablage laden', open: 'Übersetzer öffnen', sourcePlaceholder: 'Text in fpasoterm kopieren, dann hier laden und bearbeiten.', otherPlaceholder: 'https://example.com/translate', note: 'Der Übersetzer wird nur über „Übersetzer öffnen“ gestartet. Google Translate erhält den Quelltext in der Browser-URL. Keine vertraulichen Daten senden.' },
  es: { title: 'Traducir portapapeles', close: 'Cerrar', provider: 'Servicio de traducción', target: 'Traducir a', otherUrl: 'URL de otro sitio de traducción (HTTPS)', source: 'Texto original', load: 'Cargar portapapeles', open: 'Abrir traductor', sourcePlaceholder: 'Copie texto en fpasoterm y cárguelo aquí para editarlo.', otherPlaceholder: 'https://example.com/translate', note: 'El traductor se abre solo al elegir “Abrir traductor”. Google Translate recibe el texto en la URL del navegador. No envíe información confidencial.' },
  fr: { title: 'Traduire le presse-papiers', close: 'Fermer', provider: 'Service de traduction', target: 'Traduire vers', otherUrl: 'URL d’un autre site de traduction (HTTPS)', source: 'Texte source', load: 'Charger le presse-papiers', open: 'Ouvrir le traducteur', sourcePlaceholder: 'Copiez le texte dans fpasoterm, puis chargez-le et modifiez-le ici.', otherPlaceholder: 'https://example.com/translate', note: 'Le traducteur ne s’ouvre que lorsque vous choisissez « Ouvrir le traducteur ». Google Translate reçoit le texte dans l’URL du navigateur. N’envoyez pas de données confidentielles.' },
};

let overlay;
let sourceText;
let providerSelect;
let targetSelect;
let websiteUrl;
let statusText;
let translateUi;

function selectedUiText() {
  return uiText[targetSelect?.value] || uiText.en;
}

function refreshUiLanguage() {
  const text = selectedUiText();
  translateUi?.heading && (translateUi.heading.textContent = text.title);
  translateUi?.close && (translateUi.close.textContent = text.close);
  translateUi?.provider && (translateUi.provider.firstChild.textContent = text.provider);
  translateUi?.target && (translateUi.target.firstChild.textContent = text.target);
  translateUi?.website && (translateUi.website.firstChild.textContent = text.otherUrl);
  translateUi?.source && (translateUi.source.firstChild.textContent = text.source);
  translateUi?.load && (translateUi.load.textContent = text.load);
  translateUi?.open && (translateUi.open.textContent = text.open);
  if (sourceText) sourceText.placeholder = text.sourcePlaceholder;
  if (websiteUrl) websiteUrl.placeholder = text.otherPlaceholder;
  if (translateUi?.note) translateUi.note.textContent = text.note;
}

function setStatus(message) {
  if (statusText) statusText.textContent = message;
}

function closeDialog() {
  overlay?.remove();
  overlay = undefined;
  sourceText = undefined;
  providerSelect = undefined;
  targetSelect = undefined;
  websiteUrl = undefined;
  statusText = undefined;
  translateUi = undefined;
  api.terminal.focus();
}

async function readClipboardInto(textarea, label) {
  try {
    const value = await api.readClipboard();
    if (!value) {
      setStatus(`Clipboard has no ${label} text.`);
      return '';
    }
    textarea.value = value;
    setStatus(`${label} text loaded from clipboard.`);
    return value;
  } catch (error) {
    setStatus(`Could not read clipboard ${label.toLowerCase()} text.`);
    api.log(`productivity/clipboard-translate clipboard read failed: ${String(error)}`);
    return '';
  }
}

// Copies the final editable source immediately before an external provider opens.
async function writeSourceToClipboard() {
  if (!sourceText?.value.trim()) {
    throw new Error('source text is empty');
  }
  try {
    await api.writeClipboard(sourceText.value);
  } catch (error) {
    api.log(`productivity/clipboard-translate clipboard write failed: ${String(error)}`);
    throw error;
  }
}

async function openProvider() {
  const text = sourceText?.value.trim();
  const provider = providers[providerSelect?.value];
  if (!text || !provider || !targetSelect) {
    setStatus('Enter or load source text before opening a translator.');
    return;
  }
  if (providerSelect.value === 'google' && text.length > 5000) {
    setStatus('Source text exceeds the 5,000-character browser-link limit. Copy it and open the provider manually.');
    return;
  }
  const customUrl = websiteUrl?.value.trim() || '';
  if (providerSelect.value === 'other' && !/^https:\/\/[^\s]+$/i.test(customUrl)) {
    setStatus('Enter a valid HTTPS URL for the other translation website.');
    websiteUrl?.focus();
    return;
  }
  try {
    await writeSourceToClipboard();
    const url = providerSelect.value === 'other' ? customUrl : provider.urlFor(text, targetSelect.value);
    await api.openExternalUrl(url);
    setStatus(`${provider.label} opened externally. Copy its result, then paste it directly where needed with Ctrl+Shift+v.`);
    api.log(`productivity/clipboard-translate opened ${provider.label} target=${targetSelect.value}`);
  } catch (error) {
    setStatus(`Could not open ${provider.label}.`);
    api.log(`productivity/clipboard-translate external open failed: ${String(error)}`);
  }
}

function focusableElements() {
  return overlay ? [...overlay.querySelectorAll('button, input, select, textarea')]
    .filter((element) => !element.disabled) : [];
}

function trapFocus(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeDialog();
    return;
  }
  if (event.key !== 'Tab') return;
  const controls = focusableElements();
  if (controls.length === 0) return;
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function openDialog() {
  if (overlay) {
    sourceText?.focus();
    return;
  }

  overlay = document.createElement('div');
  overlay.className = 'fpasoterm-clipboard-translate-overlay';
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeDialog();
  });

  const style = document.createElement('style');
  style.textContent = [
    '.fpasoterm-clipboard-translate-overlay { position: fixed; inset: 0; z-index: 11000; display: grid; place-items: center; padding: 16px; background: rgba(0, 0, 0, .46); }',
    '.fpasoterm-clipboard-translate-dialog { width: min(820px, 100%); max-height: min(760px, 100%); overflow: auto; box-sizing: border-box; padding: 16px; border: 1px solid #5a7088; border-radius: 6px; background: #17212b; color: #edf5fc; box-shadow: 0 18px 48px rgba(0, 0, 0, .48); font: 13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }',
    '.fpasoterm-clipboard-translate-header, .fpasoterm-clipboard-translate-actions { display: flex; justify-content: space-between; gap: 10px; align-items: center; }',
    '.fpasoterm-clipboard-translate-header h2 { margin: 0; font-size: 16px; }',
    '.fpasoterm-clipboard-translate-controls { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 14px 0; }',
    '.fpasoterm-clipboard-translate-dialog label { display: grid; gap: 5px; }',
    '.fpasoterm-clipboard-translate-dialog textarea { width: 100%; min-height: 132px; resize: vertical; box-sizing: border-box; padding: 8px; font: inherit; }',
    '.fpasoterm-clipboard-translate-dialog input, .fpasoterm-clipboard-translate-dialog select, .fpasoterm-clipboard-translate-dialog button { box-sizing: border-box; padding: 7px 9px; font: inherit; }',
    '.fpasoterm-clipboard-translate-dialog button { border: 1px solid #59738c; border-radius: 4px; background: #263b4e; color: inherit; cursor: pointer; }',
    '.fpasoterm-clipboard-translate-dialog button:focus-visible, .fpasoterm-clipboard-translate-dialog input:focus-visible, .fpasoterm-clipboard-translate-dialog select:focus-visible, .fpasoterm-clipboard-translate-dialog textarea:focus-visible { outline: 2px solid #83c5ff; outline-offset: 2px; }',
    '.fpasoterm-clipboard-translate-note, .fpasoterm-clipboard-translate-status { margin: 10px 0; color: #b8c7d6; line-height: 1.45; }',
    '@media (max-width: 560px) { .fpasoterm-clipboard-translate-controls { grid-template-columns: 1fr; } .fpasoterm-clipboard-translate-actions { align-items: stretch; flex-direction: column; } }',
  ].join('');

  const dialog = document.createElement('section');
  dialog.className = 'fpasoterm-clipboard-translate-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', 'Translate clipboard');
  dialog.addEventListener('keydown', trapFocus);

  const header = document.createElement('header');
  header.className = 'fpasoterm-clipboard-translate-header';
  const heading = document.createElement('h2');
  heading.textContent = 'Translate Clipboard';
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = 'Close';
  closeButton.addEventListener('click', closeDialog);
  header.append(heading, closeButton);

  const controls = document.createElement('div');
  controls.className = 'fpasoterm-clipboard-translate-controls';
  const providerLabel = document.createElement('label');
  providerLabel.append(document.createTextNode(''));
  providerSelect = document.createElement('select');
  for (const [id, provider] of Object.entries(providers)) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = provider.label;
    providerSelect.append(option);
  }
  const targetLabel = document.createElement('label');
  targetLabel.append(document.createTextNode(''));
  targetSelect = document.createElement('select');
  for (const [code, label] of targetLanguages) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = label;
    targetSelect.append(option);
  }
  providerLabel.append(providerSelect);
  targetLabel.append(targetSelect);
  controls.append(providerLabel, targetLabel);

  const websiteLabel = document.createElement('label');
  websiteLabel.append(document.createTextNode(''));
  websiteUrl = document.createElement('input');
  websiteUrl.type = 'url';
  websiteUrl.placeholder = 'https://example.com/translate';
  websiteUrl.disabled = true;
  websiteLabel.append(websiteUrl);

  const sourceLabel = document.createElement('label');
  sourceLabel.append(document.createTextNode(''));
  sourceText = document.createElement('textarea');
  sourceLabel.append(sourceText);
  const sourceActions = document.createElement('div');
  sourceActions.className = 'fpasoterm-clipboard-translate-actions';
  const loadButton = document.createElement('button');
  loadButton.type = 'button';
  loadButton.addEventListener('click', () => { void readClipboardInto(sourceText, 'Source'); });
  const openButton = document.createElement('button');
  openButton.type = 'button';
  openButton.addEventListener('click', () => { void openProvider(); });
  sourceActions.append(loadButton, openButton);

  const note = document.createElement('p');
  note.className = 'fpasoterm-clipboard-translate-note';
  statusText = document.createElement('p');
  statusText.className = 'fpasoterm-clipboard-translate-status';
  statusText.setAttribute('aria-live', 'polite');
  statusText.textContent = providers.google.note;

  providerSelect.addEventListener('change', () => {
    const isOther = providerSelect.value === 'other';
    websiteUrl.disabled = !isOther;
    setStatus(providers[providerSelect.value].note);
  });
  targetSelect.addEventListener('change', refreshUiLanguage);
  translateUi = { heading, close: closeButton, provider: providerLabel, target: targetLabel, website: websiteLabel, source: sourceLabel, load: loadButton, open: openButton, note };
  refreshUiLanguage();
  dialog.append(header, controls, websiteLabel, sourceLabel, sourceActions, note, statusText);
  overlay.append(style, dialog);
  document.body.append(overlay);
  sourceText.focus();
  void readClipboardInto(sourceText, 'Source');
}

api.log('productivity/clipboard-translate loaded');
api.registerCommand('clipboard-translate.open', 'Translate Clipboard', openDialog);
