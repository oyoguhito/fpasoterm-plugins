/// <reference path="../../../api/fpasoterm-plugin.d.ts" />
// @fpasoterm-plugin version: 1.2.0
// @fpasoterm-plugin description: Opens a searchable GUI catalog of official public plugin ports.

// Provides a local catalog UI. Installation stays an explicit, reviewable fpasoterm CLI action.
const api = window.fpasotermPluginApi;

type PortEntry = {
  id: string;
  name: string;
  author: string;
  description: string;
};

const catalog: PortEntry[] = [
  ['appearance/amber', 'amber', 'Applies an amber-on-charcoal terminal palette for a warm high-contrast appearance.'],
  ['appearance/high-contrast', 'high-contrast', 'Applies a high-contrast palette for clearly separated terminal colors.'],
  ['appearance/teal', 'teal', 'Applies a teal terminal palette with a translucent dark background.'],
  ['productivity/git-status', 'git-status', 'Adds a Plugins menu action that inserts git status --short without executing it.'],
  ['productivity/plugin-search', 'plugin-search', 'Opens a searchable GUI catalog of official public plugin ports.'],
  ['productivity/session-marker', 'session-marker', 'Adds a Plugins menu action that writes a local timestamp marker for terminal logs.'],
  ['terminal/hello', 'hello', 'Writes the minimal fpasoterm plugin confirmation after startup.'],
  ['terminal/status-banner', 'status-banner', 'Adds a Plugins menu command that prints terminal status.'],
  ['terminal/theme', 'theme', 'Applies the visible teal terminal palette from the fpasoterm example.'],
  ['terminal/welcome-banner', 'welcome-banner', 'Prints a concise welcome message after the terminal is ready.'],
].map(([id, name, description]) => ({ id, name, author: 'oyoguhito', description }));

let overlay: HTMLDivElement | undefined;
let searchInput: HTMLInputElement | undefined;
let resultList: HTMLDivElement | undefined;
let statusText: HTMLDivElement | undefined;

// Closes the plugin-owned dialog and returns keyboard input to the terminal.
function closeDialog() {
  overlay?.remove();
  overlay = undefined;
  searchInput = undefined;
  resultList = undefined;
  statusText = undefined;
  api.terminal.focus();
}

// Creates a result row with an explicit command that the user can review before execution.
function createResult(port: PortEntry): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'fpasoterm-port-search-result';
  const details = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = port.id;
  const description = document.createElement('div');
  description.textContent = port.description;
  const author = document.createElement('small');
  author.textContent = `author: ${port.author}`;
  details.append(title, description, author);

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.textContent = 'Copy install command';
  copyButton.addEventListener('click', async () => {
    const command = `fpasoterm --plugin-install ${port.id} --enable`;
    try {
      await navigator.clipboard.writeText(command);
      if (statusText) statusText.textContent = `Copied: ${command}`;
    } catch (error) {
      if (statusText) statusText.textContent = `Copy failed. Run: ${command}`;
      api.log(`productivity/plugin-search clipboard copy failed: ${String(error)}`);
    }
  });
  row.append(details, copyButton);
  return row;
}

// Filters the embedded catalog without fetching metadata or plugin source at runtime.
function renderResults() {
  if (!searchInput || !resultList || !statusText) return;
  const query = searchInput.value.trim().toLocaleLowerCase();
  const matches = catalog.filter((port) => [port.id, port.name, port.author, port.description]
    .some((value) => value.toLocaleLowerCase().includes(query)));
  resultList.replaceChildren(...matches.map(createResult));
  statusText.textContent = `${matches.length} ${matches.length === 1 ? 'port' : 'ports'} found`;
}

// Opens one accessible overlay and keeps it constrained to the fpasoterm renderer viewport.
function openDialog() {
  if (overlay) {
    searchInput?.focus();
    return;
  }
  overlay = document.createElement('div');
  overlay.className = 'fpasoterm-port-search-overlay';
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeDialog();
  });

  const style = document.createElement('style');
  style.textContent = [
    '.fpasoterm-port-search-overlay { position: fixed; inset: 0; z-index: 11000; display: grid; place-items: center; padding: 16px; background: rgba(0, 0, 0, 0.42); }',
    '.fpasoterm-port-search-dialog { width: min(720px, 100%); max-height: min(680px, 100%); overflow: auto; box-sizing: border-box; padding: 16px; border: 1px solid #5a7088; border-radius: 6px; background: #17212b; color: #edf5fc; box-shadow: 0 18px 48px rgba(0, 0, 0, 0.48); font: 13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }',
    '.fpasoterm-port-search-header, .fpasoterm-port-search-result { display: flex; justify-content: space-between; gap: 12px; align-items: center; }',
    '.fpasoterm-port-search-header h2 { margin: 0; font-size: 16px; }',
    '.fpasoterm-port-search-dialog input { width: 100%; box-sizing: border-box; margin: 14px 0 8px; padding: 8px; }',
    '.fpasoterm-port-search-result { padding: 10px 0; border-top: 1px solid #334454; }',
    '.fpasoterm-port-search-result div { min-width: 0; overflow-wrap: anywhere; }',
    '.fpasoterm-port-search-result small, .fpasoterm-port-search-status { color: #b8c7d6; }',
    '.fpasoterm-port-search-dialog button { border: 1px solid #59738c; border-radius: 4px; padding: 6px 8px; background: #263b4e; color: inherit; cursor: pointer; }',
    '.fpasoterm-port-search-dialog button:focus-visible, .fpasoterm-port-search-dialog input:focus-visible { outline: 2px solid #83c5ff; outline-offset: 2px; }',
    '@media (max-width: 560px) { .fpasoterm-port-search-result { align-items: flex-start; flex-direction: column; gap: 8px; } }',
  ].join('');

  const card = document.createElement('section');
  card.className = 'fpasoterm-port-search-dialog';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-label', 'Plugin search');
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog();
    }
  });
  const header = document.createElement('header');
  header.className = 'fpasoterm-port-search-header';
  const heading = document.createElement('h2');
  heading.textContent = 'Plugin Search';
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = 'Close';
  closeButton.addEventListener('click', closeDialog);
  header.append(heading, closeButton);

  searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search port ID, name, author, or description';
  searchInput.setAttribute('aria-label', 'Search ports');
  searchInput.addEventListener('input', renderResults);
  statusText = document.createElement('div');
  statusText.className = 'fpasoterm-port-search-status';
  resultList = document.createElement('div');
  card.append(header, searchInput, statusText, resultList);
  overlay.append(style, card);
  document.body.append(overlay);
  renderResults();
  searchInput.focus();
}

api.log(`productivity/plugin-search loaded with ${catalog.length} bundled ports`);
api.registerCommand('plugin-search.open', 'Search Plugin Ports', openDialog);
