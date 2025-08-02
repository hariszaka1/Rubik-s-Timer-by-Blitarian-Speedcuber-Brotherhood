
import React, { useMemo } from 'react';
import { applyScramble } from '../utils/cubeLogic';
import { MegaminxVisualization, PyraminxVisualization, Square1Visualization, SkewbVisualization, ClockVisualization } from './PuzzleVisualizations';
import type { CubeState, CubeType } from '../types';
import { CUBE_COLORS, generateInitialCubeState } from '../constants';

const FaceGrid: React.FC<{ face: string[][], size: number }> = ({ face, size }) => (
    <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {face.flat().map((color, i) => (
            <div key={i} className={`aspect-square ${CUBE_COLORS[color] || 'bg-gray-800'}`}></div>
        ))}
    </div>
);

const LoadingSkeleton: React.FC = () => (
    <div className="grid grid-cols-4 grid-rows-3 gap-0.5 w-48 h-36 scale-75 sm:scale-100 origin-top animate-pulse">
        <div className="col-start-2 bg-slate-300 dark:bg-slate-700/50 rounded-sm"></div>
        <div className="col-start-1 row-start-2 bg-slate-300 dark:bg-slate-700/50 rounded-sm"></div>
        <div className="col-start-2 row-start-2 bg-slate-300 dark:bg-slate-700/50 rounded-sm"></div>
        <div className="col-start-3 row-start-2 bg-slate-300 dark:bg-slate-700/50 rounded-sm"></div>
        <div className="col-start-4 row-start-2 bg-slate-300 dark:bg-slate-700/50 rounded-sm"></div>
        <div className="col-start-2 row-start-3 bg-slate-300 dark:bg-slate-700/50 rounded-sm"></div>
    </div>
)

const NxNVisualization: React.FC<{scramble: string; cubeType: CubeType}> = ({scramble, cubeType}) => {
    const n = parseInt(cubeType.charAt(0), 10);
    const cubeState = useMemo((): CubeState | null => {
        try {
            if (!scramble) {
                return generateInitialCubeState(cubeType);
            }
            return applyScramble(scramble, cubeType);
        } catch (e) {
            console.error("Failed to process cube state for visualization", e);
            try { return generateInitialCubeState(cubeType); } catch { return generateInitialCubeState('3x3'); }
        }
    }, [scramble, cubeType]);

    if (!cubeState) return null;

    return (
        <div className="relative w-48 h-36 scale-75 sm:scale-100 origin-center">
            <div className="grid grid-cols-4 grid-rows-3 gap-0.5 w-full h-full">
                <div className="col-start-2"><FaceGrid face={cubeState.U} size={n} /></div>
                <div className="col-start-1 row-start-2"><FaceGrid face={cubeState.L} size={n} /></div>
                <div className="col-start-2 row-start-2"><FaceGrid face={cubeState.F} size={n} /></div>
                <div className="col-start-3 row-start-2"><FaceGrid face={cubeState.R} size={n} /></div>
                <div className="col-start-4 row-start-2"><FaceGrid face={cubeState.B} size={n} /></div>
                <div className="col-start-2 row-start-3"><FaceGrid face={cubeState.D} size={n} /></div>
            </div>
        </div>
    );
};

export const CubeVisualization: React.FC<{ scramble: string; isLoading: boolean; cubeType: CubeType; }> = ({ scramble, isLoading, cubeType }) => {
    const renderVisualization = () => {
        if (isLoading) {
            return <LoadingSkeleton />;
        }

        switch (cubeType) {
            case '2x2':
            case '3x3':
            case '3x3 BLD':
            case '3x3 OH':
            case '3x3 FMC':
            case '4x4':
            case '4x4 BLD':
            case '5x5':
            case '5x5 BLD':
            case '6x6':
            case '7x7':
                return <NxNVisualization scramble={scramble} cubeType={cubeType} />;
            case 'Megaminx':
                return <MegaminxVisualization className="w-36 h-36" scramble={scramble} />;
            case 'Pyraminx':
                return <PyraminxVisualization className="w-36 h-36" scramble={scramble} />;
            case 'Square-1':
                return <Square1Visualization className="w-32 h-32" scramble={scramble} />;
            case 'Skewb':
                return <SkewbVisualization className="w-32 h-32" scramble={scramble} />;
            case 'Clock':
                return <ClockVisualization className="w-32 h-32" scramble={scramble} />;
            default:
                // This case should not be reached with the current cube types
                return <div className="text-center text-slate-700 dark:text-slate-400 p-4 font-semibold">Visualization not available</div>;
        }
    };

    return (
        <div className="p-2 bg-white/30 dark:bg-black/20 backdrop-blur-md border border-slate-900/10 dark:border-white/20 rounded-lg min-h-[160px] flex items-center justify-center">
            {renderVisualization()}
        </div>
    );
};