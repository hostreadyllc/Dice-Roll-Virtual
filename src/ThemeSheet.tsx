import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEMES, type Theme } from './themes';
import type { Settings } from './storage';

type Props = {
  visible: boolean;
  theme: Theme;
  settings: Settings;
  premium: boolean;
  priceLabel: string;
  busy: boolean;
  testMode: boolean;
  onClose: () => void;
  onSelectTheme: (t: Theme) => void;
  onUnlock: () => void;
  onRestore: () => void;
  onToggle: (key: 'sound' | 'vibration' | 'shakeToRoll', value: boolean) => void;
};

function Swatch({ t, selected, locked, onPress, ui }: {
  t: Theme; selected: boolean; locked: boolean; onPress: () => void; ui: Theme;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.swatchWrap}
      accessibilityRole="button"
      accessibilityLabel={`${t.name} theme${locked ? ', locked' : ''}${selected ? ', selected' : ''}`}
    >
      <LinearGradient
        colors={t.background}
        style={[styles.swatch, { borderColor: selected ? ui.accent : 'transparent' }]}
      >
        <LinearGradient
          colors={t.dieFace}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.miniDie, { borderColor: t.dieBorder }]}
        >
          <View style={[styles.miniPip, { backgroundColor: t.pip, top: 7, left: 7 }]} />
          <View style={[styles.miniPip, { backgroundColor: t.pip, top: 16, left: 16 }]} />
          <View style={[styles.miniPip, { backgroundColor: t.pip, top: 25, left: 25 }]} />
        </LinearGradient>
        {locked && (
          <View style={styles.lock}>
            <Text style={styles.lockText}>🔒</Text>
          </View>
        )}
      </LinearGradient>
      <Text numberOfLines={1} style={[styles.swatchName, { color: ui.text }]}>{t.name}</Text>
    </Pressable>
  );
}

export default function ThemeSheet(p: Props) {
  const insets = useSafeAreaInsets();
  const ui = p.theme;
  const free = THEMES.filter((t) => !t.premium);
  const paid = THEMES.filter((t) => t.premium);

  return (
    <Modal visible={p.visible} animationType="slide" transparent onRequestClose={p.onClose}>
      <Pressable style={styles.backdrop} onPress={p.onClose} accessibilityLabel="Close" />
      <LinearGradient
        colors={ui.background}
        style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
      >
        <View style={[styles.handle, { backgroundColor: ui.muted }]} />
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: ui.text }]}>Themes & Settings</Text>
          <Pressable onPress={p.onClose} hitSlop={12} accessibilityRole="button">
            <Text style={[styles.done, { color: ui.accent }]}>Done</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.section, { color: ui.muted }]}>FREE</Text>
          <View style={styles.grid}>
            {free.map((t) => (
              <Swatch key={t.id} t={t} ui={ui} selected={t.id === ui.id} locked={false}
                onPress={() => p.onSelectTheme(t)} />
            ))}
          </View>

          <Text style={[styles.section, { color: ui.muted }]}>PREMIUM</Text>
          {!p.premium && (
            <View style={[styles.unlockCard, { backgroundColor: ui.card }]}>
              <Text style={[styles.unlockTitle, { color: ui.text }]}>
                Unlock all {paid.length} premium themes
              </Text>
              <Text style={[styles.unlockSub, { color: ui.muted }]}>
                One-time purchase. Yours forever, on all your devices.
              </Text>
              <Pressable
                onPress={p.onUnlock}
                disabled={p.busy}
                style={[styles.unlockBtn, { backgroundColor: ui.accent, opacity: p.busy ? 0.6 : 1 }]}
                accessibilityRole="button"
              >
                {p.busy ? (
                  <ActivityIndicator color={ui.onAccent} />
                ) : (
                  <Text style={[styles.unlockBtnText, { color: ui.onAccent }]}>
                    Unlock for {p.priceLabel}
                  </Text>
                )}
              </Pressable>
              <Pressable onPress={p.onRestore} disabled={p.busy} hitSlop={8}>
                <Text style={[styles.restore, { color: ui.muted }]}>Restore purchases</Text>
              </Pressable>
              {p.testMode && (
                <Text style={[styles.testNote, { color: ui.muted }]}>
                  Test mode: store not connected yet.
                </Text>
              )}
            </View>
          )}
          <View style={styles.grid}>
            {paid.map((t) => (
              <Swatch key={t.id} t={t} ui={ui} selected={t.id === ui.id} locked={!p.premium}
                onPress={() => p.onSelectTheme(t)} />
            ))}
          </View>

          <Text style={[styles.section, { color: ui.muted }]}>SETTINGS</Text>
          <View style={[styles.settingsCard, { backgroundColor: ui.card }]}>
            {([
              ['sound', 'Sound effects'],
              ['vibration', 'Vibration'],
              ['shakeToRoll', 'Shake phone to roll'],
            ] as const).map(([key, label], i) => (
              <View key={key} style={[styles.settingRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ui.muted }]}>
                <Text style={[styles.settingLabel, { color: ui.text }]}>{label}</Text>
                <Switch
                  value={p.settings[key]}
                  onValueChange={(v) => p.onToggle(key, v)}
                  trackColor={{ true: ui.accent, false: undefined }}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    maxHeight: '86%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', opacity: 0.5, marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 22, fontWeight: '800' },
  done: { fontSize: 17, fontWeight: '700' },
  section: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginTop: 18, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  swatchWrap: { width: '25%', paddingHorizontal: 6, marginBottom: 12 },
  swatch: {
    aspectRatio: 0.8,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniDie: { width: 38, height: 38, borderRadius: 9, borderWidth: 1 },
  miniPip: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
  lock: {
    position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  lockText: { fontSize: 11 },
  swatchName: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 6 },
  unlockCard: { borderRadius: 18, padding: 16, marginBottom: 14, alignItems: 'center' },
  unlockTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  unlockSub: { fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 12 },
  unlockBtn: { alignSelf: 'stretch', height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  unlockBtnText: { fontSize: 16, fontWeight: '800' },
  restore: { fontSize: 13, fontWeight: '600', marginTop: 12, textDecorationLine: 'underline' },
  testNote: { fontSize: 11, marginTop: 8, fontStyle: 'italic' },
  settingsCard: { borderRadius: 18, paddingHorizontal: 16 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  settingLabel: { fontSize: 16, fontWeight: '500' },
});
