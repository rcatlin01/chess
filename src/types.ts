export type GameMode = 'pvp' | 'ai';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Color = 'w' | 'b';

export interface ClockConfig {
  minutes: number;
  increment: number;
}

export interface ClockState {
  whiteTime: number;
  blackTime: number;
  active: Color | null;
  increment: number;
}

export interface GameCallbacks {
  onMove: () => void;
  onGameOver: (result: string) => void;
  onClockTick: () => void;
}
