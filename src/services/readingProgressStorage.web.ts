export async function getReadingProgressValue(key: string): Promise<string | null> {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

export async function setReadingProgressValue(key: string, value: string): Promise<void> {
  try { window.localStorage.setItem(key, value); } catch { /* Storage may be disabled in private browsing. */ }
}
