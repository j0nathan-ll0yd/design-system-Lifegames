// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @j0nathan-ll0yd/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface SystemLine {
  key: string;
  // HTML (rendered with set:html); composeSystemLines escapes every value.
  value: string;
  dotClass: string;
  valClass?: string;
  // Source id ('health', 'githubEvents', ...) — composeSystemLines sets it.
  source?: string;
  // Full key class list; overrides the key-name colour map when present.
  keyClass?: string;
  // A hiding focus mode: the row renders data-ssr-state="suppressed", and
  // updateSystemStatus writes nothing to it until the focus gate releases it.
  suppressed?: boolean;
}

export interface SystemStatusProps {
  system: {
    lines: SystemLine[];
  };
  /** When true (default in production island), renders the consumer-shaped flat
   *  .left-panel-status root instead of the full .tri-card chrome. Matches the
   *  pre-migration DOM shape so visual tests pass without baseline updates. */
  compact?: boolean;
}
