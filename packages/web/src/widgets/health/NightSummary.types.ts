export interface NightSummaryProps {
  health: {
    sleepScore: number;
    sleepDurationFormatted: string;
    sleepPhaseFormatted: {
      deep: string;
      rem: string;
      core: string;
      awake: string;
    };
    derived: {
      deepPct: number;
      remPct: number;
    };
  };
}
