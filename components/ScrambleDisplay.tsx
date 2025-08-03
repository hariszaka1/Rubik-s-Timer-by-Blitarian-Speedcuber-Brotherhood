import React from 'react';
import { CubeVisualization } from './CubeVisualization';
import type { CubeType } from '../types';

interface ScrambleDisplayProps {
    scramble: string;
    isLoading: boolean;
    cubeType: CubeType;
}

export const ScrambleDisplay: React.FC<ScrambleDisplayProps> = ({ scramble, isLoading, cubeType }) => {
    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-4">
            <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter text-slate-900 dark:text-slate-200">Scramble</h2>
                {isLoading ? (
                     <div className="h-7 w-96 max-w-full bg-slate-300 dark:bg-slate-700/50 animate-pulse rounded-md mt-2 mx-auto"></div>
                ) : (
                    <p className="font-mono text-base sm:text-lg text-sky-800 dark:text-sky-400 mt-1 select-all">{scramble}</p>
                )}
            </div>
            <CubeVisualization scramble={scramble} isLoading={isLoading} cubeType={cubeType} />
        </div>
    );
};
