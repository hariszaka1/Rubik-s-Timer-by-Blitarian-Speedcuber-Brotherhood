
/**
 * Calculates the number of moves in a solution string according to the Face Turn Metric (FTM).
 * FTM rules:
 * - Any turn of an outer face (R, U, F, etc.) is 1 move, regardless of angle (R, R', R2).
 * - Any rotation of the whole cube (x, y, z) is 0 moves.
 * - Any wide move (Rw, Uu, r, etc.) is counted as 2 moves.
 * - Any slice move (M, E, S) is counted as 2 moves.
 * 
 * @param solution The solution string.
 * @returns The total number of moves in FTM.
 */
export const countFtmMoves = (solution: string): number => {
    if (!solution) return 0;
    
    // Remove comments (// to end of line) and block comments (/* ... */)
    let cleanSolution = solution.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove grouping symbols like parentheses
    cleanSolution = cleanSolution.replace(/[()\[\]{}]/g, '');

    // Split into individual move notations
    const moves = cleanSolution.trim().split(/\s+/);
    let count = 0;

    for (const move of moves) {
        if (!move) continue;

        // Check for slice moves (M, E, S) - 2 moves
        if (/^[MES]'?2?$/.test(move)) {
            count += 2;
            continue;
        }
        
        // Check for wide moves (r, u, l, d, f, b or Rw, Uw, etc.) - 2 moves
        // Note: 'u' could also be a pyraminx tip move, but context here is 3x3 solution.
        if (/^[ruldfb]'?2?$/.test(move) || /^[RULDFB]w'?2?$/.test(move)) {
            count += 2;
            continue;
        }
        
        // Check for regular moves (R, U, L, D, F, B) - 1 move
        if (/^[RULDFB]'?2?$/.test(move)) {
            count += 1;
            continue;
        }
        
        // Check for rotations (x, y, z) - 0 moves
        if (/^[xyz]'?2?$/.test(move)) {
            // No increment, these are free
            continue;
        }
    }
    
    return count;
};
