export interface Workout {
  activity_type: string;
  duration: number;
  energy_burned: number;
  distance: number;
}

export interface WorkoutsProps {
  health: {
    workouts: Workout[];
  };
}
