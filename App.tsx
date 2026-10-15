import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Accelerometer } from 'expo-sensors';
import { useAudioPlayer } from 'expo-audio';

import Die from './src/Die';
import ThemeSheet from './src/ThemeSheet';
import { getTheme, type Theme } from './src/themes';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from './src/storage';
import { buyPremium, initStore, isTestMode, restorePremium } from './src/purchases';
import { FALLBACK_PRICE_LABEL } from './src/config';

const MIN_DICE = 1;
const MAX_DICE = 6;
const ROLL_MS = 650;
const SHAKE_THRESHOLD_G = 1.8;

type HistoryItem = { id: number; values: number[]; total: number };

const randomFace = () => 1 + Math.floor(Math.random() * 6);
const canVibrate = Platform.OS !== 'web';

function DiceApp() {
  const { width } = useWindowDimensions();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [values, setValues] = useState<number[]>([randomFace(), randomFace()]);
  const [held, setHeld] = useState<boolean[]>([false, false]);
  const [rollKey, setRollKey] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [storePremium, setStorePremium] = useState(false);
  const [priceLabel, setPriceLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rollSound = useAudioPlayer(require('./assets/sounds/roll.wav'));
  const tapSound = useAudioPlayer(require('./assets/sounds/tap.wav'));

  const premium = storePremium || (isTestMode && __DEV__ && settings.testPremium);
  const theme: Theme = useMemo(() => {
    const t = getTheme(settings.themeId);
    return t.premium && !premium ? getTheme(DEFAULT_SETTINGS.themeId) : t;
  }, [settings.themeId, premium]);

  // ---------- Load saved settings + store status ----------
  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setValues(Array.from({ length: s.diceCount }, randomFace));
      setHeld(Array(s.diceCount).fill(false));
      setLoaded(true);
    });
    initStore(setStorePremium).then(({ premium: p, priceLabel: price }) => {
      setStorePremium(p);
      setPriceLabel(price);
    });
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  // ---------- Feedback ----------
  const playTap = useCallback(() => {
    if (settings.sound) {
      tapSound.seekTo(0);
      tapSound.play();
    }
    if (settings.vibration && canVibrate) Haptics.selectionAsync();
  }, [settings.sound, settings.vibration, tapSound]);

  // ---------- Rolling ----------
  const rollingRef = useRef(false);
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const roll = useCallback(() => {
    if (rollingRef.current) return;
    if (held.every(Boolean)) {
      playTap();
      return;
    }
    rollingRef.current = true;
    setRolling(true);
    setRollKey((k) => k + 1);

    if (settings.sound) {
      rollSound.seekTo(0);
      rollSound.play();
    }
    if (settings.vibration && canVibrate) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Flicker faces while tumbling.
    const flicker = setInterval(() => {
      setValues((v) => v.map((x, i) => (held[i] ? x : randomFace())));
      if (settings.vibration && canVibrate) Haptics.selectionAsync();
    }, 90);

    setTimeout(() => {
      clearInterval(flicker);
      const final = valuesRef.current.map((x, i) => (held[i] ? x : randomFace()));
      setValues(final);
      setHistory((h) => [
        { id: Date.now(), values: final, total: final.reduce((a, b) => a + b, 0) },
        ...h,
      ].slice(0, 30));
      if (settings.vibration && canVibrate) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      rollingRef.current = false;
      setRolling(false);
    }, ROLL_MS);
  }, [held, settings.sound, settings.vibration, rollSound, playTap]);

  // ---------- Shake to roll ----------
  const rollRef = useRef(roll);
  rollRef.current = roll;
  useEffect(() => {
    if (!settings.shakeToRoll || sheetOpen || Platform.OS === 'web') return;
    let lastShake = 0;
    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const g = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (g > SHAKE_THRESHOLD_G && now - lastShake > 1200) {
        lastShake = now;
        rollRef.current();
      }
    });
    return () => sub.remove();
  }, [settings.shakeToRoll, sheetOpen]);

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
  const perRow = n === 1 ? 1 : n <= 4 ? 2 : 3;
  const gap = 22;
  const maxSize = n === 1 ? 170 : n <= 4 ? 128 : 96;
  const dieSize = Math.min(maxSize, (Math.min(width, 520) - 48 - gap * (perRow - 1)) / perRow);
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
        <Pressable style={styles.diceArea} onPress={roll} accessibilityLabel="Roll the dice">
          <View style={[styles.diceGrid, { maxWidth: perRow * dieSize + (perRow - 1) * gap, gap }]}>
            {values.map((v, i) => (
              <Die
                key={i}
                value={v}
                size={dieSize}
                theme={theme}
                held={held[i]}
                rollKey={rollKey}
                onPress={() => toggleHold(i)}
              />
            ))}
          </View>
          <Text style={[styles.hint, { color: theme.muted }]}>
            {n > 1 ? 'Tap a die to hold it · ' : ''}
            {settings.shakeToRoll && Platform.OS !== 'web' ? 'Shake or tap to roll' : 'Tap to roll'}
          </Text>
        </Pressable>

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
  diceArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  diceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  hint: { fontSize: 13, marginTop: 18, fontWeight: '500' },
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
    alignSelf: 'stretch',
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
});
