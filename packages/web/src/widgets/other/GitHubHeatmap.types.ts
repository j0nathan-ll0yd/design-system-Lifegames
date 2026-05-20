export interface GitHubHeatmapProps {
  github: {
    contributions: number[][];
    stats: {
      repos: number;
      stars: number;
      contributions: number;
    };
  };
}
