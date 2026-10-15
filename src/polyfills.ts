/**
 * Must be imported before anything else (see index.ts).
 *
 * three.js (0.18x) prints a deprecation notice with `process.emitWarning`
 * when loaded through `require`, which react-three-fiber does on native.
 * React Native has no `process.emitWarning`, so without this the app
 * crashes on launch with "undefined is not a function".
 */
const g = globalThis as any;
g.process = g.process ?? {};
if (typeof g.process.emitWarning !== 'function') {
  g.process.emitWarning = () => {};
}

export {};
