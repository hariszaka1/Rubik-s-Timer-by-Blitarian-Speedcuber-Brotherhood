
import type { CubeState, CubeType, Face } from './types';

export const CUBE_COLORS: Record<string, string> = {
    W: 'bg-white', // Up
    Y: 'bg-yellow-400', // Down
    B: 'bg-blue-600', // Front
    G: 'bg-green-600', // Back
    R: 'bg-red-600', // Right
    O: 'bg-orange-500', // Left
};

const FACE_COLORS: Record<Face, string> = {
    U: 'W',
    D: 'Y',
    L: 'O',
    R: 'R',
    F: 'B',
    B: 'G',
};

export const generateInitialCubeState = (type: CubeType): CubeState => {
    const n = parseInt(type.split('x')[0], 10);
    if (isNaN(n)) {
        throw new Error(`Cannot generate initial state for non-NxN cube type: ${type}`);
    }
    const state: Partial<CubeState> = {};

    for (const face of (Object.keys(FACE_COLORS) as Face[])) {
        state[face] = Array(n).fill(null).map(() => Array(n).fill(FACE_COLORS[face]));
    }

    return state as CubeState;
};