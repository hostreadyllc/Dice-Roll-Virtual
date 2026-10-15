import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Theme } from './themes';

// Pip positions on a 3×3 grid (row, col) for each face.
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

type Props = {
  value: number;
  size: number;
  theme: Theme;
  held: boolean;
  /** Increments each roll; triggers the tumble animation. */
  rollKey: number;
  onPress: () => void;
};

export default function Die({ value, size, theme, held, rollKey, onPress }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const direction = useRef(1);

  useEffect(() => {
    if (rollKey === 0 || held) return;
    direction.current = Math.random() > 0.5 ? 1 : -1;
    spin.setValue(0);
    hop.setValue(0);
    Animated.parallel([
      Animated.timing(spin, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(hop, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(hop, { toValue: 0, duration: 260, easing: Easing.bounce, useNativeDriver: true }),
      ]),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollKey]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${direction.current * 720}deg`],
  });
  const translateY = hop.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.35] });
  const scale = hop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  const pip = size * 0.16;
  const pad = size * 0.16;
  const cell = (size - pad * 2) / 3;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Die showing ${value}${held ? ', held' : ''}`}
      accessibilityHint="Tap to hold or release this die"
    >
      <Animated.View style={{ transform: [{ translateY }, { rotate }, { scale }] }}>
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
              shadowColor: '#000',
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
      </Animated.View>
      <View style={styles.badgeRow}>
        {held && (
          <Text style={[styles.badge, { color: theme.onAccent, backgroundColor: theme.accent }]}>
            HELD
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  die: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  badgeRow: { height: 22, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
