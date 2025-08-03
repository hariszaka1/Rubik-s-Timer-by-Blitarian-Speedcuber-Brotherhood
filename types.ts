
export type CubeType = '2x2' | '3x3' | '3x3 BLD' | '4x4' | '4x4 BLD' | '5x5' | '5x5 BLD' | '6x6' | '7x7' | 'Megaminx' | 'Pyraminx' | 'Square-1' | 'Skewb' | '3x3 OH' | 'Clock' | '3x3 FMC';

export const CUBE_TYPES: CubeType[] = ['2x2', '3x3', '4x4', '5x5', '6x6', '7x7', 'Megaminx', 'Pyraminx', 'Square-1', 'Skewb', 'Clock', '3x3 OH', '3x3 FMC', '3x3 BLD', '4x4 BLD', '5x5 BLD'];

export interface User {
  id: number;
  name: string;
}

export type Penalty = 'none' | '+2' | 'DNF';

export interface Room {
  code: string;
  name: string;
  createdAt: Date;
}

export interface Competition {
  name: string;
  participantIds: number[];
  scrambles: Partial<Record<CubeType, string>>;
}

export interface Solve {
  id: number;
  userId: number;
  time: number; // Raw time for normal solves, move count for FMC
  scramble: string;
  date: Date;
  cubeType: CubeType;
  penalty: Penalty;
  solution?: string; // For FMC solves
  fmcTime?: number; // Time taken for FMC solve in ms
  roomId?: string; // To associate solve with a room
}

export type TimerStatus = 'idle' | 'ready' | 'running' | 'inspecting';

export type Face = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';

export type CubeState = Record<Face, string[][]>;

export type Theme = 'light' | 'dark';