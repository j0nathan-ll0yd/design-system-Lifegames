export interface ExplorationOdometerV3Props {
  totalVisits: number;
  totalPlaces: number;
  totalDurationHours: number;
  citiesVisited: number;
  explorationStats: {
    totalNeighborhoods: number;
    totalCities: number;
    totalStates: number;
  };
}
