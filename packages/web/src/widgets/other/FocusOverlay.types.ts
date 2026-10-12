// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @j0nathan-ll0yd/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface FocusOverlayProps {
  /**
   * The focus export's `currentFocus`. When it names this overlay's focus mode,
   * the overlay renders VISIBLE in server markup, so a client without
   * JavaScript sees it too (atlas decision 0160). Omitted → hidden until the
   * client runtime (updateFocusOverlay) shows it.
   */
  currentFocus?: string | null;
  /** ISO time of the render; seeds the clock in the owner's time zone. */
  now?: string;
}
