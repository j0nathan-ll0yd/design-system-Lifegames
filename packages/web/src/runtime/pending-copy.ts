// User-visible strings that await a key in @j0nathan-ll0yd/copy.
//
// Atlas decision 0160 adds honest widget states. Their strings belong in the
// copy package (GOVERNANCE P3.1), but a copy release is in flight (decision
// 0158), so this change does not edit packages/copy. Each entry names the copy
// key it should move to; the PR that adds those keys replaces every import of
// this module with `widgets.widgetState.*` and deletes this file. The Swift
// side mirrors these values in `LifegamesWidgets/Runtime/PendingCopy.swift`.
export const pendingCopy = {
  widgetState: {
    /** Proposed key widgets.widgetState.noReading — accessible name of the no-reading mark. */
    noReading: 'No reading',
    /** Proposed key widgets.widgetState.unavailable — notice when an export cannot be read. */
    unavailable: 'Data unavailable',
    /** Proposed key widgets.widgetState.suppressed — notice while a hiding focus mode is active. */
    suppressed: 'Hidden during focus',
    /** Proposed key widgets.widgetState.asOf — stale timestamp prefix; ICU MF1 `{time}`. */
    asOf: 'as of {time}',
    /** Proposed key widgets.widgetState.needsJavaScript — <noscript> note in the loading state. */
    needsJavaScript: 'Live data needs JavaScript.'
  }
} as const
