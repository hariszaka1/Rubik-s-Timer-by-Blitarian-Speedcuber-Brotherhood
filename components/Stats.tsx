
import React, { useMemo } from 'react';
import type { Solve, CubeType } from '../types';
import { formatTime } from '../utils/time';

interface StatsProps {
    solves: Solve[];
    cubeType: CubeType;
}

type StatResult = number | 'DNF' | null;

const getFinalTime = (solve: Solve): number | 'DNF' => {
    const penalty = solve.penalty || 'none';
    if (penalty === 'DNF') return 'DNF';
    if (penalty === '+2') return solve.time + 2000;
    return solve.time;
};

const calculateAverage = (times: number[]): number | null => {
    if (times.length === 0) return null;
    return times.reduce((a, b) => a + b, 0) / times.length;
};

const calculateAoN = (solves: Solve[], n: number): StatResult => {
    if (solves.length < n) return null;
    const lastNSolves = solves.slice(0, n);
    const finalTimes = lastNSolves.map(getFinalTime);
    
    const dnfCount = finalTimes.filter(t => t === 'DNF').length;
    
    if ((n === 5 && dnfCount >= 2) || (n > 5 && dnfCount >= 2)) return 'DNF'; 

    const numericTimes = finalTimes.map(t => t === 'DNF' ? Infinity : t);

    if (n < 3) {
        const validTimes = numericTimes.filter(t => t !== Infinity);
        return calculateAverage(validTimes);
    }
    
    const sorted = [...numericTimes].sort((a, b) => a - b);
    const trimmed = sorted.slice(1, -1);

    if (trimmed.some(t => t === Infinity)) return 'DNF';

    return calculateAverage(trimmed);
};

const StatItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between items-baseline">
        <span className="text-slate-600 dark:text-slate-400">{label}</span>
        <span className={`font-mono text-lg font-medium ${
            value === 'DNF' 
            ? 'text-red-600 dark:text-red-500' 
            : value === 'N/A'
            ? 'text-slate-500 dark:text-slate-500'
            : 'text-slate-900 dark:text-slate-100'
        }`}>
            {value}
        </span>
    </div>
);

export const Stats: React.FC<StatsProps> = ({ solves, cubeType }) => {
    const isFMC = cubeType === '3x3 FMC';

    const formatStat = (value: StatResult): string => {
        if (value === null) return 'N/A';
        if (value === 'DNF') return 'DNF';
        if (isFMC) return `${Math.round(value * 100) / 100}`; // Round to 2 decimal for mean
        return formatTime(value);
    };

    const { solveCount, best, worst, mean, ao5, ao12, ao50 } = useMemo(() => {
        const relevantSolves = solves;
        
        if (isFMC) {
            const moveCounts = relevantSolves.map(s => s.time);
            return {
                solveCount: moveCounts.length,
                best: moveCounts.length > 0 ? Math.min(...moveCounts) : null,
                worst: moveCounts.length > 0 ? Math.max(...moveCounts) : null,
                mean: calculateAverage(moveCounts),
                ao5: null, ao12: null, ao50: null,
            };
        }

        const finalTimes = relevantSolves.map(getFinalTime);
        const numericTimes = finalTimes.filter(t => typeof t === 'number') as number[];

        const bestTime = numericTimes.length > 0 ? Math.min(...numericTimes) : null;
        
        let worstTime: StatResult;
        if (finalTimes.some(t => t === 'DNF')) {
            worstTime = 'DNF';
        } else if (numericTimes.length > 0) {
            worstTime = Math.max(...numericTimes);
        } else {
            worstTime = null;
        }

        return {
            solveCount: relevantSolves.length,
            best: bestTime,
            worst: worstTime,
            mean: calculateAverage(numericTimes),
            ao5: calculateAoN(relevantSolves, 5),
            ao12: calculateAoN(relevantSolves, 12),
            ao50: calculateAoN(relevantSolves, 50),
        };
    }, [solves, isFMC]);

    return (
        <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200 mb-1">Statistics</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">For {cubeType}</p>
            <div className="bg-white/30 dark:bg-black/20 backdrop-blur-md border border-slate-900/10 dark:border-white/20 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 dark:text-slate-400">Solves</span>
                    <span className="font-mono text-lg font-medium text-slate-900 dark:text-slate-100">{solveCount}</span>
                </div>
                <StatItem label={isFMC ? 'Best Moves' : 'Best'} value={formatStat(best)} />
                <StatItem label={isFMC ? 'Worst Moves' : 'Worst'} value={formatStat(worst)} />
                <hr className="border-slate-900/10 dark:border-white/10"/>
                <StatItem label={isFMC ? 'Mean Moves' : 'Mean'} value={formatStat(mean)} />
                {!isFMC && (
                    <>
                        <StatItem label="Ao5" value={formatStat(ao5)} />
                        <StatItem label="Ao12" value={formatStat(ao12)} />
                        <StatItem label="Ao50" value={formatStat(ao50)} />
                    </>
                )}
            </div>
        </div>
    );
};
