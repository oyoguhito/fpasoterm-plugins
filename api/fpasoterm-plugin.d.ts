// Copied from fpasoterm's public plugin API declaration.
// Keep this file compatible with the minimum API version declared by each port.
type FpasotermPluginApi = {
  version: string;
  terminal: {
    options: Record<string, unknown>;
    write: (data: string) => void;
    writeln: (data: string) => void;
    focus: () => void;
  };
  fitAddon: {
    fit: () => void;
  };
  config: {
    window: {
      width: number;
      height: number;
      minWidth: number;
      minHeight: number;
      backgroundColor: string;
      themeSource: 'system' | 'light' | 'dark';
    };
    terminal: Record<string, unknown>;
    ime: {
      duplicateGuard: boolean;
      duplicateWindowMs: number;
      repeatedTextWindowMs: number;
    };
    plugins: {
      enabled: string[];
    };
  };
  log: (message: string) => void;
  /** Reads plain UTF-8 text from the native system clipboard. */
  readClipboard: () => Promise<string>;
  /** Writes plain UTF-8 text to the native system clipboard. */
  writeClipboard: (text: string) => Promise<void>;
  /** Opens an HTTP(S) URL in the external browser after an explicit user action. */
  openExternalUrl: (url: string) => Promise<void>;
  onReady: (callback: () => void) => void;
  registerCommand: (
    id: string,
    title: string,
    handler: () => void | Promise<void>,
  ) => void;
};

declare global {
  interface Window {
    fpasotermPluginApi: FpasotermPluginApi;
  }
}

export {};
