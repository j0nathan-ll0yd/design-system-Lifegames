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
}
