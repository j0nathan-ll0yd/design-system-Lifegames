// Shared same-document View Transition helper for @j0nathan-ll0yd/web runtime.
//
// Design constraints implemented here:
//   1. Graceful fallback: browsers without startViewTransition (or with
//      prefers-reduced-motion: reduce) execute `update` synchronously.
//   2. Concurrency guard: if a transition is already in-flight (e.g. a modal
//      open while live-data ticks), the new update runs synchronously rather
//      than cancelling the in-flight transition. This prevents the dashboard
//      periodic-poll from aborting a book-modal open/close animation.

/** Returns true when the View Transition API is available in this browser. */
function isViewTransitionSupported(): boolean {
  return typeof document !== 'undefined' && typeof document.startViewTransition === 'function'
}

/** Returns true when the user prefers reduced motion. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

// Module-level flag: true while a transition started via withViewTransition is
// actively running. Set before startViewTransition() and cleared in the
// returned ViewTransition.finished promise.
let _transitionActive = false

/**
 * Wraps a DOM update function in a same-document View Transition when the API
 * is available and the user has not opted out of motion.
 *
 * Concurrency: if a transition is already in-flight, `update` is called
 * synchronously (without wrapping) to avoid cancelling the active animation.
 *
 * @param update - Function that performs synchronous DOM mutations.
 * @returns The ViewTransition object if one was started, otherwise undefined.
 */
export function withViewTransition(update: () => void): ViewTransition | undefined {
  // Fall through to synchronous path when:
  // - API unavailable
  // - user prefers reduced motion
  // - a transition is already active (concurrency guard)
  if (!isViewTransitionSupported() || prefersReducedMotion() || _transitionActive) {
    update()
    return undefined
  }

  _transitionActive = true
  const transition = document.startViewTransition(update)

  // Clear the active flag once the transition completes (whether finished,
  // skipped, or errored). .finished is a Promise<void> that always settles.
  transition.finished.then(() => {
    _transitionActive = false
  }, () => {
    _transitionActive = false
  })

  return transition
}
