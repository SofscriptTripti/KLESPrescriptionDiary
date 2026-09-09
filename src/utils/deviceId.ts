import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'kles_device_id';

function randomId(): string {
  // Good enough as a stable per-install identifier (mirrors MAUI's DeviceIdHelper
  // usage — the backend treats this as free-form metadata, not a validated value).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cached: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  const existing = await AsyncStorage.getItem(KEY);
  if (existing) {
    cached = existing;
    return existing;
  }
  const id = randomId();
  await AsyncStorage.setItem(KEY, id);
  cached = id;
  return id;
}
