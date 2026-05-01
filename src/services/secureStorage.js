// src/services/secureStorage.js — keychain-backed storage for secrets.
//
// Thin wrapper around expo-secure-store with an AsyncStorage fallback so
// the app keeps booting if the native module isn't installed yet. Use
// this for ANYTHING that's a secret (bearer tokens, refresh tokens).
// Plain user prefs / cache should stay on AsyncStorage.
//
// Once you run `npx expo install expo-secure-store` and rebuild the dev
// client, this wrapper automatically switches to the keychain — no other
// code changes required. The first call after the upgrade auto-migrates
// legacy values from AsyncStorage so existing users don't get logged out.

import AsyncStorage from '@react-native-async-storage/async-storage';

// eslint-disable-next-line @typescript-eslint/no-var-requires
let SecureStore = null;
try {
  SecureStore = require('expo-secure-store');
} catch {
  SecureStore = null;
}

const isAvailable = () =>
  !!(SecureStore?.getItemAsync && SecureStore?.setItemAsync && SecureStore?.deleteItemAsync);

const migratedKeys = new Set();

// One-shot migration: copy a value out of AsyncStorage into SecureStore
// the first time we hit it after an upgrade. Idempotent — subsequent
// calls are no-ops once the value moves.
const migrateIfNeeded = async (key) => {
  if (!isAvailable() || migratedKeys.has(key)) return;
  migratedKeys.add(key);
  try {
    const legacy = await AsyncStorage.getItem(key);
    if (legacy) {
      const already = await SecureStore.getItemAsync(key);
      if (!already) await SecureStore.setItemAsync(key, legacy);
      await AsyncStorage.removeItem(key);
    }
  } catch {
    // Migration is best-effort; swallow errors so reads keep working.
  }
};

export async function getItem(key) {
  if (isAvailable()) {
    await migrateIfNeeded(key);
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
}

export async function setItem(key, value) {
  if (isAvailable()) {
    return SecureStore.setItemAsync(key, value);
  }
  return AsyncStorage.setItem(key, value);
}

export async function removeItem(key) {
  if (isAvailable()) {
    // Belt-and-braces: clear both stores so a half-migrated key can't
    // resurrect after logout.
    await Promise.allSettled([
      SecureStore.deleteItemAsync(key),
      AsyncStorage.removeItem(key),
    ]);
    return;
  }
  return AsyncStorage.removeItem(key);
}

export const SECURE_STORAGE_AVAILABLE = isAvailable;

export default { getItem, setItem, removeItem };
