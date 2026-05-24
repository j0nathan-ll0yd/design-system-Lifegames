export interface SystemLine {
  key: string;
  value: string;
  dotClass: string;
  valClass?: string;
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
