// Browser-only dev session: cleared when the tab closes. This is not an
// encrypted vault; production web authentication needs a server-side session.
export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 0;
export async function getItemAsync(key: string): Promise<string | null> {
  return typeof window === 'undefined' ? null : window.sessionStorage.getItem(key);
}
export async function setItemAsync(key: string, value: string, _options?: { keychainAccessible: number }): Promise<void> {
  if (typeof window !== 'undefined') window.sessionStorage.setItem(key, value);
}
export async function deleteItemAsync(key: string): Promise<void> {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(key);
}
