
import type { CubeState, Face, CubeType } from '../types';
import { generateInitialCubeState as generateInitialCubeStateFromConstants } from '../constants';

const cloneCubeState = (state: CubeState): CubeState => JSON.parse(JSON.stringify(state));

const rotateMatrix = <T>(matrix: T[][], clockwise: boolean): T[][] => {
    const n = matrix.length;
    const newMatrix = Array.from({ length: n }, () => Array(n).fill(null));
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (clockwise) {
                newMatrix[j][n - 1 - i] = matrix[i][j];
            } else { // Counter-clockwise
                newMatrix[n - 1 - j][i] = matrix[i][j];
            }
        }
    }
    return newMatrix;
};

const applyMoveOnce = (state: CubeState, face: Face, depth: number, n: number): CubeState => {
    let newState = cloneCubeState(state);

    // Rotate the main face(s) if they are part of the block
    const facesToRotate: Face[] = [];
    if (face === 'U' || face === 'D') facesToRotate.push(face);
    if (face === 'L' || face === 'R') facesToRotate.push(face);
    if (face === 'F' || face === 'B') facesToRotate.push(face);

    for (const f of facesToRotate) {
        if (depth >=1 ) newState[f] = rotateMatrix(newState[f], true);
    }
    
    // Rotate slices for moves like M, E, S (whole cube rotations are not standard WCA moves)
    // For simplicity, we handle all rotations as block moves from an outer face.

    switch (face) {
        case 'U': { // F -> R -> B -> L -> F
            for (let d = 0; d < depth; d++) {
                const tempRow = newState.F[d];
                newState.F[d] = newState.R[d];
                newState.R[d] = newState.B[d];
                newState.B[d] = newState.L[d];
                newState.L[d] = tempRow;
            }
            break;
        }
        case 'D': { // F -> L -> B -> R -> F
            for (let d = 0; d < depth; d++) {
                const rowIdx = n - 1 - d;
                const tempRow = newState.F[rowIdx];
                newState.F[rowIdx] = newState.L[rowIdx];
                newState.L[rowIdx] = newState.B[rowIdx];
                newState.B[rowIdx] = newState.R[rowIdx];
                newState.R[rowIdx] = tempRow;
            }
            break;
        }
        case 'R': { // U -> B -> D -> F -> U (with flips)
            for (let d = 0; d < depth; d++) {
                const colIdx = n - 1 - d;
                const tempCol = newState.U.map(row => row[colIdx]);
                for (let i = 0; i < n; i++) newState.U[i][colIdx] = newState.F[i][colIdx];
                for (let i = 0; i < n; i++) newState.F[i][colIdx] = newState.D[i][colIdx];
                for (let i = 0; i < n; i++) newState.D[i][colIdx] = newState.B[n - 1 - i][d];
                for (let i = 0; i < n; i++) newState.B[n - 1 - i][d] = tempCol[i];
            }
            break;
        }
        case 'L': { // U -> F -> D -> B -> U (with flips)
            for (let d = 0; d < depth; d++) {
                const colIdx = d;
                const tempCol = newState.U.map(row => row[colIdx]);
                for(let i=0; i<n; i++) newState.U[i][colIdx] = newState.B[n-1-i][n-1-colIdx];
                for(let i=0; i<n; i++) newState.B[n-1-i][n-1-colIdx] = newState.D[i][colIdx];
                for(let i=0; i<n; i++) newState.D[i][colIdx] = newState.F[i][colIdx];
                for(let i=0; i<n; i++) newState.F[i][colIdx] = tempCol[i];
            }
            break;
        }
        case 'F': { // U -> R -> D -> L -> U (with flips)
             for (let d = 0; d < depth; d++) {
                const rowIdx = n - 1 - d;
                const tempRow = [...newState.U[rowIdx]];
                // L to U
                for(let i=0; i<n; i++) newState.U[rowIdx][i] = newState.L[n-1-i][rowIdx];
                // D to L
                for(let i=0; i<n; i++) newState.L[i][rowIdx] = newState.D[d][i];
                // R to D
                for(let i=0; i<n; i++) newState.D[d][i] = newState.R[n-1-i][d];
                // temp (U) to R
                for(let i=0; i<n; i++) newState.R[i][d] = tempRow[i];
            }
            break;
        }
        case 'B': { // U -> L -> D -> R -> U (with flips)
            for (let d = 0; d < depth; d++) {
                const rowIdx = d;
                const tempRow = [...newState.U[rowIdx]];
                // R to U
                for(let i=0; i<n; i++) newState.U[rowIdx][i] = newState.R[i][n-1-rowIdx];
                // D to R
                for(let i=0; i<n; i++) newState.R[i][n-1-rowIdx] = newState.D[n-1-rowIdx][n-1-i];
                // L to D
                for(let i=0; i<n; i++) newState.D[n-1-rowIdx][i] = newState.L[n-1-i][rowIdx];
                // temp (U) to L
                for(let i=0; i<n; i++) newState.L[i][rowIdx] = tempRow[n-1-i];
            }
            break;
        }
    }
    return newState;
};

const parseMove = (move: string): { face: Face; depth: number; turns: number } => {
    const moveRegex = /^(\d*)?([RLUDFB])(w)?(['2])?$/;
    let [, depthStr, faceChar, wide, modifier] = move.match(moveRegex) || [];
    
    if (!faceChar) {
        faceChar = move.charAt(0);
        modifier = move.substring(1);
    }
    
    const face = faceChar as Face;
    let depth = parseInt(depthStr, 10);
    if (isNaN(depth)) {
        depth = wide ? 2 : 1;
    }
    const turns = modifier === "'" ? 3 : (modifier === '2' ? 2 : 1);
    
    return { face, depth, turns };
};

export const applyScramble = (scramble: string, type: CubeType): CubeState => {
    const n = parseInt(type.split('x')[0], 10);
    if (isNaN(n)) {
        throw new Error(`Cannot apply scramble for non-NxN cube type: ${type}`);
    }
    let state = generateInitialCubeStateFromConstants(type);
    const moves = scramble.split(' ').filter(m => m);

    for (const moveStr of moves) {
        if (!moveStr) continue;
        const { face, depth, turns } = parseMove(moveStr);

        for (let i = 0; i < turns; i++) {
            state = applyMoveOnce(state, face, depth, n);
        }
    }
    return state;
};

const generateNxNScramble = (n: number, length: number): string => {
    const axes: string[][] = [
        ['U', 'D'],
        ['L', 'R'],
        ['F', 'B']
    ];
    let moves: string[] = [...axes.flat()];
    
    if (n >= 4) { // Wide moves for 4x4+
        moves.push(...axes.flat().map(m => m + 'w'));
    }
    if (n >= 6) { // Deep slice moves for 6x6+
        moves.push(...axes.flat().map(m => '3' + m + 'w'));
    }
     if (n === 2) { // 2x2 only uses 3 faces
        moves = ['R', 'U', 'F'];
    }

    const modifiers = ["", "'", "2"];
    let scramble: string[] = [];
    let lastAxis = -1;

    for (let i = 0; i < length; i++) {
        let move: string;
        let currentAxis: number;
        
        do {
            move = moves[Math.floor(Math.random() * moves.length)];
            const baseMove = move.replace(/['w23]/g, '');
            currentAxis = axes.findIndex(axis => axis.includes(baseMove));
        } while (currentAxis === lastAxis);
        
        lastAxis = currentAxis;

        const modifier = modifiers[Math.floor(Math.random() * 3)];
        scramble.push(move + modifier);
    }
    return scramble.join(' ');
}

const generatePyraminxScramble = (length: number, tips: boolean): string => {
    const moves = ['U', 'L', 'R', 'B'];
    const tipMoves = ['u', 'l', 'r', 'b'];
    const modifiers = ["", "'"];
    let scramble = [];
    let lastMove = '';
    for (let i = 0; i < length; i++) {
        let move;
        do {
            move = moves[Math.floor(Math.random() * moves.length)];
        } while (move === lastMove);
        lastMove = move;
        scramble.push(move + modifiers[Math.floor(Math.random() * modifiers.length)]);
    }

    if (tips) {
        const numTips = Math.floor(Math.random() * 5); // 0 to 4 tips
        const shuffledTips = tipMoves.sort(() => 0.5 - Math.random());
        for (let i = 0; i < numTips; i++) {
            scramble.push(shuffledTips[i] + modifiers[Math.floor(Math.random() * modifiers.length)]);
        }
    }
    return scramble.join(' ');
};

const generateSkewbScramble = (length: number): string => {
    const moves = ['U', 'L', 'R', 'B'];
    const modifiers = ["", "'"];
    let scramble = [];
    let lastMove = '';
    for (let i = 0; i < length; i++) {
        let move;
        do {
            move = moves[Math.floor(Math.random() * moves.length)];
        } while (move === lastMove);
        lastMove = move;
        scramble.push(move + modifiers[Math.floor(Math.random() * modifiers.length)]);
    }
    return scramble.join(' ');
};

const generateSquare1Scramble = (length: number): string => {
    let scramble = [];
    for (let i = 0; i < length; i++) {
        let u, d;
        do {
            u = Math.floor(Math.random() * 12) - 5; // -5 to 6
            d = Math.floor(Math.random() * 12) - 5; // -5 to 6
        } while (u === 0 && d === 0);
        scramble.push(`(${u},${d})`);
    }
    return scramble.join(' / ');
};

const generateMegaminxScramble = (): string => {
    const r_moves = ['R++', 'R--'];
    const d_moves = ['D++', 'D--'];
    const u_moves = ['U', "U'"];
    let scramble_parts = [];
    for(let i = 0; i < 7; i++) {
        for (let j = 0; j < 5; j++) {
            scramble_parts.push(r_moves[Math.floor(Math.random() * 2)]);
            scramble_parts.push(d_moves[Math.floor(Math.random() * 2)]);
        }
        scramble_parts.push(u_moves[Math.floor(Math.random() * 2)]);
    }
    return scramble_parts.join(' ');
};

const generateClockScramble = (): string => {
    const moves = ['UR', 'DR', 'DL', 'UL', 'U', 'R', 'D', 'L', 'ALL'];
    const generateSideScramble = () => {
        return moves.map(move => {
            const value = Math.floor(Math.random() * 6) + 1; // 1-6
            const sign = Math.random() < 0.5 ? '+' : '-';
            return `${move}${value}${sign}`;
        }).join(' ');
    };
    return `${generateSideScramble()} y2 ${generateSideScramble()}`;
};


export const generateLocalScramble = (type: CubeType): string => {
    switch(type) {
        case '2x2': return generateNxNScramble(2, Math.floor(Math.random() * 4) + 9); // 9-12 moves
        case '3x3':
        case '3x3 BLD':
        case '3x3 OH':
        case '3x3 FMC':
            return generateNxNScramble(3, Math.floor(Math.random() * 6) + 20); // 20-25 moves
        case '4x4':
        case '4x4 BLD':
            return generateNxNScramble(4, Math.floor(Math.random() * 6) + 40); // 40-45 moves
        case '5x5':
        case '5x5 BLD':
            return generateNxNScramble(5, Math.floor(Math.random() * 6) + 60); // 60-65 moves
        case '6x6': return generateNxNScramble(6, Math.floor(Math.random() * 6) + 80); // 80-85 moves
        case '7x7': return generateNxNScramble(7, Math.floor(Math.random() * 6) + 100); // 100-105 moves
        case 'Megaminx': return generateMegaminxScramble();
        case 'Pyraminx': return generatePyraminxScramble(Math.floor(Math.random() * 4) + 8, true); // 8-11 moves + tips
        case 'Square-1': return generateSquare1Scramble(Math.floor(Math.random() * 5) + 12); // 12-16 pairs
        case 'Skewb': return generateSkewbScramble(Math.floor(Math.random() * 4) + 7); // 7-10 moves
        case 'Clock': return generateClockScramble();
        default: return generateNxNScramble(3, 22);
    }
};