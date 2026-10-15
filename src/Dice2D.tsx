import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Theme } from './themes';

/**
 * Flat dice used when 3D is turned off or not supported on the device.
 * Same props as Dice3D so App can swap between them.
 */

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

const randomFace = () => 1 + Math.floor(Math.random() * 6);

function Face({ value, size, theme, held }: { value: number; size: number; theme: Theme; held: boolean }) {
  const pip = size * 0.16;
  const pad = size * 0.16;
  const cell = (size - pad * 2) / 3;
  return (
    <LinearGradient
      colors={theme.dieFace}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.die,
        {
          width: size,
          height: size,
          borderRadius: size * 0.2,
          borderColor: held ? theme.accent : theme.dieBorder,
          borderWidth: held ? 3 : 1.5,
        },
      ]}
    >
      {PIPS[value].map(([r, c], i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: pip,
            height: pip,
            borderRadius: pip / 2,
            backgroundColor: theme.pip,
            left: pad + c * cell + (cell - pip) / 2,
            top: pad + r * cell + (cell - pip) / 2,
          }}
        />
      ))}
    </LinearGradient>
  );
}

function Die({ value, size, theme, held, tumbling, onPress }: {
  value: number; size: number; theme: Theme; held: boolean; tumbling: boolean; onPress: () => void;
}) {
  const [shown, setShown] = useState(value);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!tumbling || held) {
      setShown(value);
      Animated.spring(spin, { toValue: 0, useNativeDriver: true, friction: 5 }).start();
      return;
    }
    const flicker = setInterval(() => setShown(randomFace()), 80);
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 300, easing: Easing.linear, useNativeDriver: true }),
    );
    spin.setValue(0);
    loop.start();
    return () => {
      clearInterval(flicker);
      loop.stop();
    };
  }, [tumbling, held, value, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = tumbling && !held ? 0.9 : 1;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Die showing ${shown}${held ? ', held' : ''}`}>
      <Animated.View style={{ transform: [{ rotate }, { scale }] }}>
        <Face value={shown} size={size} theme={theme} held={held} />
      </Animated.View>
    </Pressable>
  );
}

type Props = {
  values: number[];
  held: boolean[];
  tumbling: boolean;
  landKey: number;
  theme: Theme;
  onToggleHold: (i: number) => void;
  onBackgroundPress: () => void;
};

export default function Dice2D(p: Props) {
  const { width } = useWindowDimensions();
  const n = p.values.length;
  const perRow = n === 1 ? 1 : n <= 4 ? 2 : 3;
  const gap = 22;
  const maxSize = n === 1 ? 160 : n <= 4 ? 120 : 92;
  const size = Math.min(maxSize, (Math.min(width, 520) - 48 - gap * (perRow - 1)) / perRow);

  return (
    <Pressable style={styles.area} onPress={p.onBackgroundPress} accessibilityLabel="Roll the dice">
      <View style={[styles.grid, { maxWidth: perRow * size + (perRow - 1) * gap, gap }]}>
        {p.values.map((v, i) => (
          <Die
            key={i}
            value={v}
            size={size}
            theme={p.theme}
            held={p.held[i]}
            tumbling={p.tumbling}
            onPress={() => p.onToggleHold(i)}
          />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  die: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
});
