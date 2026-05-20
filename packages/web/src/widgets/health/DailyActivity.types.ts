export interface DailyActivityProps {
  health: {
    quantities: {
      stepCount: { value: number; unit: string };
      distanceWalkingRunning: { value: number; unit: string };
      exerciseTime: { value: number; unit: string };
      activeEnergyBurned: { value: number; unit: string };
      basalEnergyBurned: { value: number; unit: string };
    };
    derived: {
      totalCalories: number;
    };
  };
}
