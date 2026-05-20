export interface HeartRateProps {
  health: {
    quantities: {
      heartRate: { value: number; unit: string };
      hrvSDNN: { value: number; unit: string };
    };
  };
}
