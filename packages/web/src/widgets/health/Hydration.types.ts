// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @j0nathan-ll0yd/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface HydrationProps {
  health: {
    hydration: {
      waterOz: number;
      waterMax: number;
      waterRangeLo: number;
      waterRangeHi: number;
      caffeineMg: number | null;
      caffeineMax: number | null;
      caffeineRangeLo: number | null;
      caffeineRangeHi: number | null;
    };
  };
}
