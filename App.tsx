import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Accelerometer } from 'expo-sensors';
import { useAudioPlayer } from 'expo-audio';

import Dice2D from './src/Dice2D';
import ThemeSheet from './src/ThemeSheet';
import { getTheme, type Theme } from './src/themes';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  mark3DLaunchOk,
  mark3DLaunchStarted,
  saveSettings,
  wasLast3DLaunchInterrupted,
  type Settings,
} from './src/storage';

type DiceViewProps = React.ComponentProps<typeof Dice2D>;

/** Load the 3D view only when it's used, so a device that can't run it still opens. */
let Dice3DView: React.ComponentType<DiceViewProps> | null | undefined;
function load3D(): React.ComponentType<DiceViewProps> | null {
  if (Dice3DView === undefined) {
    try {
      Dice3DView = require('./src/Dice3D').default;
    } catch (e) {
      console.warn('3D dice unavailable', e);
      Dice3DView = null;
    }
  }
  return Dice3DView ?? null;
}

/** If the 3D view throws while rendering, show flat dice instead. */
class Fallback3D extends React.Component<
  { fallback: React.ReactNode; onError: () => void; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.warn('3D dice failed', e);
    this.props.onError();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
import { allowTestUnlock, buyPremium, initStore, isTestMode, restorePremium, storeAvailable } from './src/purchases';
import { FALLBACK_PRICE_LABEL } from './src/config';

const MIN_DICE = 1;
const MAX_DICE = 6;
/** Acceleration (in g) that starts a shake roll. */
const SHAKE_START_G = 1.8;
/** While already shaking, smaller movements keep the dice in the air. */
const SHAKE_KEEP_G = 1.3;
/** Dice land this long after the shaking stops. */
const SHAKE_SETTLE_MS = 450;
/** A ROLL-button tap tumbles this long before landing. */
const BUTTON_TUMBLE_MS = 550;
/** Time from landing start until every die is at rest. */
const LAND_MS = 950;

type HistoryItem = { id: number; values: number[]; total: number };

const randomFace = () => 1 + Math.floor(Math.random() * 6);
const canVibrate = Platform.OS !== 'web';

function DiceApp() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [values, setValues] = useState<number[]>([randomFace(), randomFace()]);
  const [held, setHeld] = useState<boolean[]>([false, false]);
  const [tumbling, setTumbling] = useState(false);
  const [landKey, setLandKey] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [storePremium, setStorePremium] = useState(false);
  const [priceLabel, setPriceLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice3D, setNotice3D] = useState(false);

  const rattleSound = useAudioPlayer(require('./assets/sounds/rattle.wav'));
  const landSound = useAudioPlayer(require('./assets/sounds/land.wav'));
  const tapSound = useAudioPlayer(require('./assets/sounds/tap.wav'));

  const premium = storePremium || (allowTestUnlock && settings.testPremium);
  const theme: Theme = useMemo(() => {
    const t = getTheme(settings.themeId);
    return t.premium && !premium ? getTheme(DEFAULT_SETTINGS.themeId) : t;
  }, [settings.themeId, premium]);

  // ---------- Load saved settings + store status ----------
  useEffect(() => {
    (async () => {
      let s = await loadSettings();
      if (s.use3D && (await wasLast3DLaunchInterrupted())) {
        // The app closed while starting 3D last time: use flat dice instead.
        s = { ...s, use3D: false };
        saveSettings(s);
        await mark3DLaunchOk();
        setNotice3D(true);
      }
      if (s.use3D) await mark3DLaunchStarted();
      setSettings(s);
      setValues(Array.from({ length: s.diceCount }, randomFace));
      setHeld(Array(s.diceCount).fill(false));
      setLoaded(true);
    })();
    initStore(setStorePremium).then(({ premium: p, priceLabel: price }) => {
      setStorePremium(p);
      setPriceLabel(price);
    });
  }, []);

  // 3D has been running fine for a while: clear the crash guard.
  useEffect(() => {
    if (!loaded || !settings.use3D) return;
    mark3DLaunchStarted(); // also covers turning 3D back on in settings
    const t = setTimeout(mark3DLaunchOk, 6000);
    return () => clearTimeout(t);
  }, [loaded, settings.use3D]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  // Latest values for timers and sensor callbacks.
  const live = useRef({ settings, held, values });
  live.current = { settings, held, values };

  // ---------- Feedback ----------
  const playTap = useCallback(() => {
    if (settings.sound) {
      tapSound.seekTo(0);
      tapSound.play();
    }
    if (settings.vibration && canVibrate) Haptics.selectionAsync();
  }, [settings.sound, settings.vibration, tapSound]);

  // ---------- Rolling: tumble in the air, then land ----------
  const phase = useRef<'idle' | 'tumbling' | 'landing'>('idle');
  const rattleTicker = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Start the dice tumbling. Returns false if nothing can roll. */
  const startTumble = useCallback((): boolean => {
    if (phase.current !== 'idle') return false;
    const { settings: s, held: h } = live.current;
    if (h.every(Boolean)) return false;
    phase.current = 'tumbling';
    setRolling(true);
    setTumbling(true);

    if (s.sound) {
      rattleSound.loop = true;
      rattleSound.seekTo(0);
      rattleSound.play();
    }
    if (s.vibration && canVibrate) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Light ticks feel like dice knocking together in your hand.
      rattleTicker.current = setInterval(() => Haptics.selectionAsync(), 110);
    }
    return true;
  }, [rattleSound]);

  /** Pick the results and drop the dice onto the table. */
  const land = useCallback(() => {
    if (phase.current !== 'tumbling') return;
    phase.current = 'landing';
    const { settings: s, held: h, values: v } = live.current;
    if (rattleTicker.current) clearInterval(rattleTicker.current);
    rattleTicker.current = null;
    rattleSound.pause();

    const final = v.map((x, i) => (h[i] ? x : randomFace()));
    setValues(final);
    setTumbling(false);
    setLandKey((k) => k + 1);

    // Sound and thud timed to when the dice hit the table.
    setTimeout(() => {
      if (s.sound) {
        landSound.seekTo(0);
        landSound.play();
      }
      if (s.vibration && canVibrate) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 300);

    setTimeout(() => {
      setHistory((hist) => [
        { id: Date.now(), values: final, total: final.reduce((a, b) => a + b, 0) },
        ...hist,
      ].slice(0, 30));
      phase.current = 'idle';
      setRolling(false);
    }, LAND_MS);
  }, [rattleSound, landSound]);

  /** ROLL button / tapping the table. */
  const roll = useCallback(() => {
    if (!startTumble()) {
      if (phase.current === 'idle') playTap(); // all dice held
      return;
    }
    setTimeout(land, BUTTON_TUMBLE_MS);
  }, [startTumble, land, playTap]);

  // ---------- Shake to roll: dice rattle for as long as you shake ----------
  useEffect(() => {
    if (!settings.shakeToRoll || sheetOpen || Platform.OS === 'web') return;
    let shaking = false;
    let landAt = 0;
    Accelerometer.setUpdateInterval(60);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const g = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (!shaking && g > SHAKE_START_G && startTumble()) {
        shaking = true;
        landAt = now + SHAKE_SETTLE_MS;
      } else if (shaking && Math.abs(g - 1) > SHAKE_KEEP_G - 1) {
        landAt = now + SHAKE_SETTLE_MS;
      }
    });
    const check = setInterval(() => {
      if (shaking && Date.now() > landAt) {
        shaking = false;
        land();
      }
    }, 50);
    return () => {
      sub.remove();
      clearInterval(check);
      if (shaking) land();
    };
  }, [settings.shakeToRoll, sheetOpen, startTumble, land]);

  // Stop sounds and ticks if the app closes mid-roll.
  useEffect(() => () => {
    if (rattleTicker.current) clearInterval(rattleTicker.current);
  }, []);

  // ---------- Dice count + hold ----------
  const changeCount = (delta: number) => {
    const n = Math.min(MAX_DICE, Math.max(MIN_DICE, settings.diceCount + delta));
    if (n === settings.diceCount || rolling) return;
    playTap();
    update({ diceCount: n });
    setValues((v) => (n > v.length ? [...v, ...Array.from({ length: n - v.length }, randomFace)] : v.slice(0, n)));
    setHeld((h) => (n > h.length ? [...h, ...Array(n - h.length).fill(false)] : h.slice(0, n)));
  };

  const toggleHold = (i: number) => {
    if (rolling || settings.diceCount === 1) return;
    playTap();
    setHeld((h) => h.map((x, j) => (j === i ? !x : x)));
  };

  // ---------- Themes + purchase ----------
  const selectTheme = (t: Theme) => {
    if (t.premium && !premium) {
      handleUnlock();
      return;
    }
    playTap();
    update({ themeId: t.id });
  };

  const handleUnlock = async () => {
    if (busy) return;
    setBusy(true);
    const result = await buyPremium();
    setBusy(false);
    if (result === 'purchased') {
      if (isTestMode) update({ testPremium: true });
      else setStorePremium(true);
      if (settings.vibration && canVibrate) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Unlocked!', 'All premium themes are now yours. Enjoy!');
    } else if (result === 'unavailable') {
      Alert.alert('Not available', 'Purchases are not available right now. Please try again later.');
    } else if (result === 'error') {
      Alert.alert('Purchase failed', 'Something went wrong. You have not been charged.');
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    const ok = await restorePremium();
    setBusy(false);
    if (ok) {
      setStorePremium(true);
      Alert.alert('Restored', 'Your premium themes are back.');
    } else if (ok === false) {
      Alert.alert('Nothing to restore', 'No previous purchase was found for this account.');
    } else {
      Alert.alert('Restore unavailable', 'Could not reach the store. Please try again later.');
    }
  };

  // ---------- Layout ----------
  const n = settings.diceCount;
  const total = values.reduce((a, b) => a + b, 0);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: theme.background[1] }} />;

  return (
    <LinearGradient colors={theme.background} style={styles.fill}>
      <StatusBar style={theme.statusBar} />
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.label, { color: theme.muted }]}>TOTAL</Text>
            <Text style={[styles.total, { color: theme.text }]} accessibilityLiveRegion="polite">
              {rolling ? '–' : total}
            </Text>
          </View>
          <Pressable
            onPress={() => { playTap(); setSheetOpen(true); }}
            style={[styles.iconBtn, { backgroundColor: theme.card }]}
            accessibilityRole="button"
            accessibilityLabel="Themes and settings"
          >
            <Text style={styles.iconText}>🎨</Text>
          </Pressable>
        </View>

        {/* Dice */}
        <View style={styles.diceArea}>
          {(() => {
            const props: DiceViewProps = {
              values,
              held,
              tumbling,
              landKey,
              theme,
              onToggleHold: toggleHold,
              onBackgroundPress: roll,
            };
            const flat = <Dice2D {...props} />;
            const Dice3D = settings.use3D ? load3D() : null;
            if (!Dice3D) return flat;
            return (
              <Fallback3D fallback={flat} onError={() => { update({ use3D: false }); mark3DLaunchOk(); setNotice3D(true); }}>
                <Dice3D {...props} />
              </Fallback3D>
            );
          })()}
          {notice3D && (
            <Pressable onPress={() => setNotice3D(false)} style={[styles.notice, { backgroundColor: theme.card }]}>
              <Text style={[styles.noticeText, { color: theme.text }]}>
                3D dice are off on this phone so the app runs smoothly. You can try turning them back on in 🎨 settings.
              </Text>
            </Pressable>
          )}
          <Text style={[styles.hint, { color: theme.muted }]}>
            {n > 1 ? 'Tap a die to hold it · ' : ''}
            {settings.shakeToRoll && Platform.OS !== 'web' ? 'Shake your phone or tap ROLL' : 'Tap ROLL to roll'}
          </Text>
        </View>

        {/* History */}
        <View style={styles.historyWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.history}>
            {history.length === 0 ? (
              <Text style={[styles.historyEmpty, { color: theme.muted }]}>Your rolls will show here</Text>
            ) : (
              history.map((h, i) => (
                <View key={h.id} style={[styles.chip, { backgroundColor: theme.card, opacity: 1 - i * 0.03 }]}>
                  <Text style={[styles.chipTotal, { color: theme.text }]}>{h.total}</Text>
                  {n > 1 && <Text style={[styles.chipDetail, { color: theme.muted }]}>{h.values.join(' · ')}</Text>}
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <View style={[styles.stepper, { backgroundColor: theme.card }]}>
            <Pressable onPress={() => changeCount(-1)} style={styles.stepBtn} hitSlop={6}
              accessibilityRole="button" accessibilityLabel="Fewer dice" disabled={n <= MIN_DICE}>
              <Text style={[styles.stepText, { color: theme.text, opacity: n <= MIN_DICE ? 0.3 : 1 }]}>−</Text>
            </Pressable>
            <Text style={[styles.count, { color: theme.text }]}>
              {n} {n === 1 ? 'die' : 'dice'}
            </Text>
            <Pressable onPress={() => changeCount(1)} style={styles.stepBtn} hitSlop={6}
              accessibilityRole="button" accessibilityLabel="More dice" disabled={n >= MAX_DICE}>
              <Text style={[styles.stepText, { color: theme.text, opacity: n >= MAX_DICE ? 0.3 : 1 }]}>+</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={roll}
            disabled={rolling}
            style={({ pressed }) => [
              styles.rollBtn,
              { backgroundColor: theme.accent, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Roll"
          >
            <Text style={[styles.rollText, { color: theme.onAccent }]}>{rolling ? 'Rolling…' : 'ROLL'}</Text>
          </Pressable>

          {history.length > 0 && (
            <Pressable onPress={() => { playTap(); setHistory([]); setHeld(Array(n).fill(false)); }} hitSlop={8}>
              <Text style={[styles.reset, { color: theme.muted }]}>Clear history & holds</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>

      <ThemeSheet
        visible={sheetOpen}
        theme={theme}
        settings={settings}
        premium={premium}
        priceLabel={priceLabel ?? FALLBACK_PRICE_LABEL}
        busy={busy}
        testMode={isTestMode}
        purchasable={storeAvailable || allowTestUnlock}
        onClose={() => setSheetOpen(false)}
        onSelectTheme={selectTheme}
        onUnlock={handleUnlock}
        onRestore={handleRestore}
        onToggle={(key, v) => update({ [key]: v })}
      />
    </LinearGradient>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DiceApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  total: { fontSize: 52, fontWeight: '900', lineHeight: 58, fontVariant: ['tabular-nums'] },
  iconBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 22 },
  diceArea: { flex: 1, alignItems: 'center' },
  hint: { fontSize: 13, marginBottom: 6, fontWeight: '500' },
  historyWrap: { height: 64 },
  history: { paddingHorizontal: 24, gap: 8, alignItems: 'center' },
  historyEmpty: { fontSize: 13 },
  chip: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 48 },
  chipTotal: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  chipDetail: { fontSize: 10, marginTop: 1 },
  controls: { paddingHorizontal: 24, paddingBottom: 12, paddingTop: 8, alignItems: 'center' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 6,
    marginBottom: 14,
  },
  stepBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 26, fontWeight: '600' },
  count: { fontSize: 16, fontWeight: '700', minWidth: 72, textAlign: 'center' },
  rollBtn: {
    alignSelf: 'center',
    maxWidth: 480,
    width: '100%',
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  rollText: { fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  reset: { fontSize: 13, fontWeight: '600', marginTop: 12, textDecorationLine: 'underline' },
  notice: { marginHorizontal: 24, marginBottom: 8, borderRadius: 14, padding: 12 },
  noticeText: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
