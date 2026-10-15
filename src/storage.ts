import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_THEME_ID } from './themes';

export type Settings = {
  themeId: string;
  diceCount: number;
  sound: boolean;
  vibration: boolean;
  shakeToRoll: boolean;
  /** Local unlock used only in test mode (development builds without store keys). */
  testPremium: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  themeId: DEFAULT_THEME_ID,
  diceCount: 2,
  sound: true,
  vibration: true,
  shakeToRoll: true,
  testPremium: false,
};

const KEY = 'dice-settings-v1';

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Non-critical: settings simply won't persist this time.
  }
}
