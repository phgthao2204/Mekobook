import * as SecureStore from 'expo-secure-store';

export function getReadingProgressValue(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export function setReadingProgressValue(key: string, value: string): Promise<void> {
  return SecureStore.setItemAsync(key, value);
}
