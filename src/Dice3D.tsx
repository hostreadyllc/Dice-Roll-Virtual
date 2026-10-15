import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Theme } from './themes';

// ---------------------------------------------------------------------------
// Geometry shared by every die
// ---------------------------------------------------------------------------
const DIE = 1;
const HALF = DIE / 2;
const SPACING = 1.6;
const HOVER_Y = 1.7;
const LAND_SECONDS = 0.75;

const bodyGeometry = new RoundedBoxGeometry(DIE, DIE, DIE, 5, 0.16);
const pipGeometry = new THREE.CircleGeometry(0.088, 28);
const ringGeometry = new THREE.RingGeometry(0.74, 0.84, 56);

// Which face shows which number (opposite faces add up to 7).
type Face = { normal: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3 };
const FACES: Record<number, Face> = {
  1: { normal: new THREE.Vector3(0, 1, 0), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, -1) },
  6: { normal: new THREE.Vector3(0, -1, 0), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, 1) },
  2: { normal: new THREE.Vector3(0, 0, 1), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 1, 0) },
  5: { normal: new THREE.Vector3(0, 0, -1), u: new THREE.Vector3(-1, 0, 0), v: new THREE.Vector3(0, 1, 0) },
  3: { normal: new THREE.Vector3(1, 0, 0), u: new THREE.Vector3(0, 0, -1), v: new THREE.Vector3(0, 1, 0) },
  4: { normal: new THREE.Vector3(-1, 0, 0), u: new THREE.Vector3(0, 0, 1), v: new THREE.Vector3(0, 1, 0) },
};

// Pip positions on a 3×3 grid: [column, row] with (0,0) top-left.
const PIP_GRID: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

/** Position + orientation of every pip on the cube. */
const PIPS = (() => {
  const out: { position: THREE.Vector3; quaternion: THREE.Quaternion }[] = [];
  const z = new THREE.Vector3(0, 0, 1);
  for (let face = 1; face <= 6; face++) {
    const { normal, u, v } = FACES[face];
    const q = new THREE.Quaternion().setFromUnitVectors(z, normal);
    for (const [c, r] of PIP_GRID[face]) {
      const p = normal.clone().multiplyScalar(HALF + 0.002)
        .addScaledVector(u, (c - 1) * 0.27)
        .addScaledVector(v, (1 - r) * 0.27);
      out.push({ position: p, quaternion: q });
    }
  }
  return out;
})();

/** Rotation that turns `face` to point straight up. */
const UP = new THREE.Vector3(0, 1, 0);
const FACE_UP: Record<number, THREE.Quaternion> = Object.fromEntries(
  [1, 2, 3, 4, 5, 6].map((f) => [f, new THREE.Quaternion().setFromUnitVectors(FACES[f].normal, UP)]),
);

function restingRotation(value: number): THREE.Quaternion {
  const yaw = new THREE.Quaternion().setFromAxisAngle(UP, (Math.random() - 0.5) * 0.9);
  return yaw.multiply(FACE_UP[value]);
}

function randomAxis(): THREE.Vector3 {
  return new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
}

/** Grid slot for die `i` of `n`, centered on the origin. */
export function slotPosition(i: number, n: number): [number, number] {
  const perRow = n === 1 ? 1 : n === 2 ? 2 : n === 4 ? 2 : 3;
  const rows = Math.ceil(n / perRow);
  const row = Math.floor(i / perRow);
  const inRow = row === rows - 1 ? n - row * perRow : perRow;
  const col = i % perRow;
  return [(col - (inRow - 1) / 2) * SPACING, (row - (rows - 1) / 2) * SPACING];
}

// ---------------------------------------------------------------------------
// One die
// ---------------------------------------------------------------------------
type DieProps = {
  index: number;
  count: number;
  value: number;
  held: boolean;
  tumbling: boolean;
  landKey: number;
  theme: Theme;
  onPress: () => void;
};

function Die3D({ index, count, value, held, tumbling, landKey, theme, onPress }: DieProps) {
  const group = useRef<THREE.Group>(null);
  const [sx, sz] = slotPosition(index, count);

  const state = useRef({
    spinAxis: randomAxis(),
    spinSpeed: 14,
    wobble: Math.random() * 10,
    landing: false,
    landStart: 0,
    fromQ: new THREE.Quaternion(),
    toQ: FACE_UP[value].clone(),
    fromPos: new THREE.Vector3(sx, HALF, sz),
    extraAxis: randomAxis(),
    extraTurns: 0,
    placed: false,
  }).current;

  // Place the die on first render.
  useEffect(() => {
    const g = group.current;
    if (!g || state.placed) return;
    g.position.set(sx, HALF, sz);
    state.toQ = restingRotation(value);
    g.quaternion.copy(state.toQ);
    state.placed = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // New tumble: pick a fresh spin.
  useEffect(() => {
    if (tumbling && !held) {
      state.spinAxis = randomAxis();
      state.spinSpeed = 11 + Math.random() * 7;
      state.landing = false;
    }
  }, [tumbling, held, state]);

  // Land on the new value.
  const clock = useThree((s) => s.clock);
  useEffect(() => {
    const g = group.current;
    if (landKey === 0 || held || !g) return;
    state.landing = true;
    state.landStart = clock.getElapsedTime() + index * 0.04;
    state.fromQ.copy(g.quaternion);
    state.fromPos.copy(g.position);
    state.toQ = restingRotation(value);
    state.extraAxis = randomAxis();
    state.extraTurns = Math.PI * 2 * (1 + Math.floor(Math.random() * 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landKey]);

  const tmpQ = useMemo(() => new THREE.Quaternion(), []);
  const spinQ = useMemo(() => new THREE.Quaternion(), []);

  useFrame((s, delta) => {
    const g = group.current;
    if (!g) return;
    const now = s.clock.getElapsedTime();

    if (tumbling && !held) {
      // Rattling in the air: spin, hover and wobble around the slot.
      state.wobble += delta;
      const w = state.wobble;
      spinQ.setFromAxisAngle(state.spinAxis, state.spinSpeed * delta);
      g.quaternion.premultiply(spinQ);
      const targetY = HOVER_Y + Math.sin(w * 9 + index) * 0.25;
      g.position.x += (sx + Math.sin(w * 7.3 + index * 2) * 0.35 - g.position.x) * Math.min(1, delta * 10);
      g.position.z += (sz + Math.cos(w * 6.1 + index) * 0.35 - g.position.z) * Math.min(1, delta * 10);
      g.position.y += (targetY - g.position.y) * Math.min(1, delta * 12);
      // Nudge the spin axis now and then so it never looks repetitive.
      if (Math.random() < delta * 3) state.spinAxis = randomAxis();
      return;
    }

    if (state.landing) {
      const t = Math.min(1, Math.max(0, (now - state.landStart) / LAND_SECONDS));
      const e = 1 - Math.pow(1 - t, 3);
      tmpQ.slerpQuaternions(state.fromQ, state.toQ, e);
      spinQ.setFromAxisAngle(state.extraAxis, state.extraTurns * (1 - e));
      g.quaternion.copy(spinQ).multiply(tmpQ);

      // Fall to the table, then two small bounces.
      const fall = Math.min(1, t / 0.45);
      let y = THREE.MathUtils.lerp(state.fromPos.y, HALF, fall * fall);
      if (t > 0.45) {
        const b = (t - 0.45) / 0.55;
        y = HALF + Math.abs(Math.sin(b * Math.PI * 2)) * 0.28 * Math.pow(1 - b, 2);
      }
      g.position.set(
        THREE.MathUtils.lerp(state.fromPos.x, sx, e),
        y,
        THREE.MathUtils.lerp(state.fromPos.z, sz, e),
      );
      if (t >= 1) state.landing = false;
      return;
    }

    // At rest: ease into the slot (e.g. when the dice count changes).
    g.position.x += (sx - g.position.x) * Math.min(1, delta * 8);
    g.position.z += (sz - g.position.z) * Math.min(1, delta * 8);
    g.position.y += (HALF - g.position.y) * Math.min(1, delta * 8);
  });

  const m = theme.die3d;
  return (
    <>
      <group
        ref={group}
        onClick={(e) => {
          e.stopPropagation();
          onPress();
        }}
      >
        <mesh geometry={bodyGeometry} castShadow>
          <meshPhysicalMaterial
            color={m.body}
            roughness={m.roughness}
            metalness={m.metalness}
            clearcoat={m.clearcoat}
            clearcoatRoughness={0.15}
            transparent={m.opacity !== undefined}
            opacity={m.opacity ?? 1}
          />
        </mesh>
        {PIPS.map((p, i) => (
          <mesh key={i} geometry={pipGeometry} position={p.position} quaternion={p.quaternion}>
            {m.pipGlow ? (
              <meshBasicMaterial color={theme.pip} toneMapped={false} />
            ) : (
              <meshStandardMaterial color={theme.pip} roughness={0.55} metalness={0} />
            )}
          </mesh>
        ))}
      </group>
      {held && (
        <mesh geometry={ringGeometry} position={[sx, 0.004, sz]} rotation={[-Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color={theme.accent} toneMapped={false} />
        </mesh>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Camera that frames however many dice there are
// ---------------------------------------------------------------------------
function FitCamera({ count }: { count: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const perRow = count === 1 ? 1 : count === 2 || count === 4 ? 2 : 3;
    const rows = Math.ceil(count / perRow);
    const halfW = (perRow * SPACING) / 2 + 0.35;
    const halfD = (rows * SPACING) / 2 + 0.5;
    const cam = camera as THREE.PerspectiveCamera;
    const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const aspect = size.width / Math.max(1, size.height);
    const dist = Math.max(halfD / tanV, halfW / (tanV * aspect), count === 1 ? 4.6 : 5.4) + 0.8;
    // Look down at a slight angle so the dice read as 3D.
    const tilt = THREE.MathUtils.degToRad(28);
    cam.position.set(0, Math.cos(tilt) * dist, Math.sin(tilt) * dist);
    cam.lookAt(0, 0.4, 0);
    cam.updateProjectionMatrix();
  }, [camera, size, count]);
  return null;
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------
type Props = {
  values: number[];
  held: boolean[];
  tumbling: boolean;
  landKey: number;
  theme: Theme;
  onToggleHold: (i: number) => void;
  onBackgroundPress: () => void;
};

export default function Dice3D(p: Props) {
  const dark = p.theme.statusBar === 'light';
  return (
    <View style={styles.fill}>
      <Canvas
        shadows
        flat
        dpr={[1, 2]}
        camera={{ fov: 32, position: [0, 9, 4] }}
        gl={{ alpha: true, antialias: true }}
        onPointerMissed={p.onBackgroundPress}
        style={styles.fill}
      >
        <ambientLight intensity={dark ? 0.75 : 0.95} />
        <hemisphereLight args={['#ffffff', p.theme.background[1], 0.5]} />
        <directionalLight
          position={[3.5, 9, 5]}
          intensity={dark ? 2.1 : 1.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
          shadow-radius={6}
        />
        <pointLight position={[-4, 5, -2]} intensity={dark ? 18 : 10} color={p.theme.accent} distance={14} />

        {/* Invisible table that only shows shadows. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <shadowMaterial opacity={dark ? 0.55 : 0.22} />
        </mesh>

        <FitCamera count={p.values.length} />

        {p.values.map((v, i) => (
          <Die3D
            key={i}
            index={i}
            count={p.values.length}
            value={v}
            held={p.held[i]}
            tumbling={p.tumbling}
            landKey={p.landKey}
            theme={p.theme}
            onPress={() => p.onToggleHold(i)}
          />
        ))}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignSelf: 'stretch' },
});
