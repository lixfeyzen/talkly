import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

// expo-secure-store's web implementation is an empty stub (it only exists
// for native iOS/Android keychains) -- calling it on web hangs instead of
// throwing, which silently breaks any auth check running on load. Standard
// Expo pattern: fall back to localStorage on web, keep the OS keychain on
// native. localStorage is less secure than a keychain, which is an accepted
// trade-off for the web target, not an oversight.
export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
