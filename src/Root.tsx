import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getFatalError, onFatalError } from './polyfills';

// Load the app inside a try/catch so an error while starting up shows a
// message instead of closing the app.
let App: React.ComponentType | null = null;
let loadError: Error | null = null;
try {
  App = require('../App').default;
} catch (e) {
  loadError = e instanceof Error ? e : new Error(String(e));
}

function deviceInfo(): string {
  const c: any = Platform.constants ?? {};
  const parts = [
    `${Platform.OS} ${Platform.Version}`,
    c.Manufacturer || c.Brand,
    c.Model,
    c.Release && `Android ${c.Release}`,
  ].filter(Boolean);
  return parts.join(' · ');
}

export function ErrorScreen({ error }: { error: Error }) {
  const stack = (error.stack ?? '').split('\n').slice(0, 25).join('\n');
  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Dice Roller hit a problem</Text>
        <Text style={styles.sub}>
          Please take a screenshot of this screen and send it to the developer.
        </Text>
        <Text selectable style={styles.message}>{error.name}: {error.message}</Text>
        <Text selectable style={styles.device}>{deviceInfo()}</Text>
        <Text selectable style={styles.stack}>{stack}</Text>
      </ScrollView>
    </View>
  );
}

class Boundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? <ErrorScreen error={this.state.error} /> : this.props.children;
  }
}

export default function Root() {
  const [fatal, setFatal] = useState<Error | null>(getFatalError());
  useEffect(() => onFatalError(setFatal), []);

  const error = loadError ?? fatal;
  if (error || !App) return <ErrorScreen error={error ?? new Error('App failed to load')} />;
  return (
    <Boundary>
      <App />
    </Boundary>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#FFF8F0' },
  content: { padding: 24, paddingTop: 64 },
  title: { fontSize: 22, fontWeight: '800', color: '#3D0E14' },
  sub: { fontSize: 15, color: '#6B4A4A', marginTop: 8, marginBottom: 20 },
  message: { fontSize: 15, fontWeight: '700', color: '#B3261E', marginBottom: 12 },
  device: { fontSize: 13, color: '#333', marginBottom: 12 },
  stack: { fontSize: 11, color: '#555', fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
});
