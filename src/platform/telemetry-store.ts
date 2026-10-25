// The only place that touches local storage, the clipboard and file download for the tester build's
// telemetry (S05-05b). Nothing here sends anything anywhere: the text leaves the phone only when the
// tester copies it or saves it, and sends it on by hand.

/** Where the serialised log lives between launches. */
export interface TelemetryStorage {
  load(): string | null;
  save(text: string): void;
}

export const TELEMETRY_KEY = 'bestiariusz.telemetry.v1';

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>;

function browserStorage(): KeyValueStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // access can throw (private mode, blocked site data)
  }
}

/** Storage backed by localStorage; every failure is swallowed, the game must never break over telemetry. */
export function createLocalStore(
  storage: KeyValueStorage | null = browserStorage(),
  key: string = TELEMETRY_KEY,
): TelemetryStorage {
  return {
    load() {
      try {
        return storage ? storage.getItem(key) : null;
      } catch {
        return null;
      }
    },
    save(text) {
      try {
        storage?.setItem(key, text);
      } catch {
        // quota or blocked storage: the log of this launch is simply not kept
      }
    },
  };
}

/** `copied`: the text is on the clipboard. `manual`: the screen must show it for copying by hand. */
export type ExportOutcome = 'copied' | 'manual';

export interface ExportEnv {
  readonly clipboard: Pick<Clipboard, 'writeText'> | null;
  /** Saves the text as a file; null where that is not safe (see `isNativeShell`). */
  readonly download: ((filename: string, text: string) => void) | null;
}

/** True inside the Capacitor shell, where a blob download would navigate the WebView away from the game. */
export function isNativeShell(): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

function downloadFile(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function browserExportEnv(): ExportEnv {
  return {
    clipboard: typeof navigator !== 'undefined' ? (navigator.clipboard ?? null) : null,
    download: isNativeShell() || typeof document === 'undefined' ? null : downloadFile,
  };
}

/** Gives the text to the tester: a file where the browser allows it, and always the clipboard. */
export async function exportTelemetry(
  text: string,
  filename: string,
  env: ExportEnv = browserExportEnv(),
): Promise<ExportOutcome> {
  try {
    env.download?.(filename, text);
  } catch {
    // the clipboard below is the main way; a failed download changes nothing
  }
  try {
    if (!env.clipboard) return 'manual';
    await env.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'manual';
  }
}
