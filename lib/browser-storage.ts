export type BrowserStorageName = "localStorage" | "sessionStorage";

export function getBrowserStorage(name: BrowserStorageName): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window[name] || null;
  } catch {
    return null;
  }
}

export function getBrowserStorageItem(name: BrowserStorageName, key: string): string {
  const storage = getBrowserStorage(name);
  if (!storage) return "";

  try {
    return storage.getItem(key) || "";
  } catch {
    return "";
  }
}

export function setBrowserStorageItem(
  name: BrowserStorageName,
  key: string,
  value: string
): boolean {
  const storage = getBrowserStorage(name);
  if (!storage) return false;

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeBrowserStorageItem(name: BrowserStorageName, key: string): boolean {
  const storage = getBrowserStorage(name);
  if (!storage) return false;

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function listBrowserStorageKeys(name: BrowserStorageName): string[] {
  const storage = getBrowserStorage(name);
  if (!storage) return [];

  try {
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key) keys.push(key);
    }
    return keys;
  } catch {
    return [];
  }
}

export function browserStorageAvailable(name: BrowserStorageName): boolean {
  const storage = getBrowserStorage(name);
  if (!storage) return false;

  try {
    const key = "__mbc_storage_test__";
    storage.setItem(key, key);
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
