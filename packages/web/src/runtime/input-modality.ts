// Global input-modality tracker for @j0nathan-ll0yd/web runtime.
//
// Sets `document.documentElement.dataset.inputModality` to reflect the
// active input device: `'pointer'` after a mouse/touch interaction,
// `'keyboard'` after a key press. The value starts UNSET so the keyboard
// focus ring (a11y.css `:focus-visible`) is visible by default — the ring
// is only suppressed after the user confirms pointer input.
//
// The CSS companion rule in a11y.css reads:
//   :root[data-input-modality="pointer"] :focus-visible { outline: none; }
//
// Listeners run in capture phase so they fire before any widget handler
// can prevent the event from bubbling. `passive: true` is used on pointer
// and touch events to avoid blocking scroll.

/**
 * Initialises the global input-modality tracker. Idempotent: safe to call
 * multiple times (subsequent calls are no-ops). SSR-safe: returns immediately
 * when `document` is not available.
 */
export function initInputModality(): void {
  // SSR guard — no DOM on the server.
  if (typeof document === 'undefined') {
    return
  }

  // Idempotency guard — anchored to <html> to survive re-imports / HMR re-runs.
  interface RootWithGuard extends HTMLElement {
    _inputModalityInit?: boolean
  }
  const root = document.documentElement as RootWithGuard
  if (root._inputModalityInit) {
    return
  }
  root._inputModalityInit = true

  // Pointer (mouse or touch) — suppress the :focus-visible ring.
  const onPointer = (): void => {
    root.dataset.inputModality = 'pointer'
  }

  // Keyboard — restore the :focus-visible ring.
  const onKeydown = (): void => {
    root.dataset.inputModality = 'keyboard'
  }

  document.addEventListener('pointerdown', onPointer, {capture: true, passive: true})
  document.addEventListener('touchstart', onPointer, {capture: true, passive: true})
  document.addEventListener('keydown', onKeydown, {capture: true})
}
