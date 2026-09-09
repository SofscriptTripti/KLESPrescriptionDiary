import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../api/constants';
import type { User } from '../types/models';

// Replaces MAUI's Preferences (Constants.usermobileno / userdetail / usertype /
// userID / selectedpatient / authtoken / mode).

export async function getUserMobileNo(): Promise<string> {
  return (await AsyncStorage.getItem(STORAGE_KEYS.userMobileNo)) ?? '';
}
export async function setUserMobileNo(value: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.userMobileNo, value);
}

export async function getUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.userDetail);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}
export async function setUser(user: User): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.userDetail, JSON.stringify(user));
  await AsyncStorage.setItem(STORAGE_KEYS.userType, String(user.UserTyp ?? ''));
  await AsyncStorage.setItem(STORAGE_KEYS.userId, String(user.USERID ?? ''));
}

export async function getUserType(): Promise<string> {
  return (await AsyncStorage.getItem(STORAGE_KEYS.userType)) ?? '';
}

export async function getUserId(): Promise<string> {
  return (await AsyncStorage.getItem(STORAGE_KEYS.userId)) ?? '';
}

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.authToken);
}
export async function setAuthTokenStorage(token: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.authToken, token);
}

export async function getSelectedPatientRaw(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.selectedPatient);
}
export async function setSelectedPatient(patientJson: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.selectedPatient, patientJson);
}

export async function getMode(): Promise<string> {
  return (await AsyncStorage.getItem(STORAGE_KEYS.mode)) ?? '';
}
export async function setMode(mode: 'ip' | 'op'): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.mode, mode);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeMany(Object.values(STORAGE_KEYS));
}
