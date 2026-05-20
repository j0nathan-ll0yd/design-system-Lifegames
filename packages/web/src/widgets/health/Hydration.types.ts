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
