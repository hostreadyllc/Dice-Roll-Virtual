/**
 * Must be imported before anything else (see index.ts).
 */
const g = globalThis as any;

// three.js (0.18x) prints a deprecation notice with `process.emitWarning`
// when loaded through `require`, which react-three-fiber does on native.
// React Native has no `process.emitWarning`, so without this the app
// crashes on launch with "undefined is not a function".
g.process = g.process ?? {};
if (typeof g.process.emitWarning !== 'function') {
  g.process.emitWarning = () => {};
}

// ---------------------------------------------------------------------------
// Catch fatal JavaScript errors so the app shows them on screen (see
// src/Root.tsx) instead of closing with no explanation.
// ---------------------------------------------------------------------------
type Listener = (error: Error) => void;
const listeners = new Set<Listener>();
let firstFatal: Error | null = null;

export function reportFatal(error: unknown) {
  const e = error instanceof Error ? error : new Error(String(error));
  if (!firstFatal) firstFatal = e;
  listeners.forEach((l) => l(e));
}

export function getFatalError(): Error | null {
  return firstFatal;
}

export function onFatalError(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const ErrorUtils = g.ErrorUtils;
if (ErrorUtils?.setGlobalHandler) {
  const previous = ErrorUtils.getGlobalHandler?.();
  ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    if (isFatal) {
      reportFatal(error);
    } else {
      previous?.(error, isFatal);
    }
  });
}
