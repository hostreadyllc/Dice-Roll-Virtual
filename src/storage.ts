import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_THEME_ID } from './themes';

export type Settings = {
  themeId: string;
  diceCount: number;
  sound: boolean;
  vibration: boolean;
  shakeToRoll: boolean;
  /** Real 3D dice (turned off automatically if the device can't run them). */
  use3D: boolean;
  /** Local unlock used only in test mode (development builds without store keys). */
  testPremium: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  themeId: DEFAULT_THEME_ID,
  diceCount: 2,
  sound: true,
  vibration: true,
  shakeToRoll: true,
  use3D: true,
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

// ---------------------------------------------------------------------------
// Crash guard for 3D: set a flag before starting the 3D view and clear it once
// it has run for a few seconds. If the flag is still set on the next launch,
// the app closed while starting 3D, so we fall back to flat dice.
// ---------------------------------------------------------------------------
const LAUNCH_KEY = 'dice-3d-launch-pending';

export async function wasLast3DLaunchInterrupted(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(LAUNCH_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function mark3DLaunchStarted(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAUNCH_KEY, '1');
  } catch {}
}

export async function mark3DLaunchOk(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LAUNCH_KEY);
  } catch {}
}
