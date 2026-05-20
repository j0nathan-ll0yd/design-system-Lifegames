export interface TerminalLine {
  type: 'cursor' | 'blank' | 'prompt' | 'output';
  text?: string;
}

export interface BioTerminalProps {
  profile: {
    terminalLines: TerminalLine[];
  };
}
