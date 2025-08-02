
import React, { useState, useEffect, useMemo } from 'react';
import * as db from '../utils/db';
import { formatTime } from '../utils/time';
import type { User, Solve, CubeType } from '../types';
import { CUBE_TYPES } from '../types';
import { DownloadIcon } from './Icons';

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
    if (dnfCount >= 2) return 'DNF';

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

const formatStat = (value: StatResult): string => {
    if (value === null) return 'N/A';
    if (value === 'DNF') return 'DNF';
    return formatTime(value);
};

const RenderSolveTime: React.FC<{ solve: Solve }> = ({ solve }) => {
    const penalty = solve.penalty || 'none';

    if (penalty === 'DNF') {
        return <span className="text-xs font-semibold text-white bg-red-600/90 rounded px-1.5 py-0.5">DNF</span>;
    }

    const finalTime = penalty === '+2' ? solve.time + 2000 : solve.time;
    const display = formatTime(finalTime);

    return (
        <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
            {display}
            {penalty === '+2' && <span className="font-sans font-bold text-red-600/90">+</span>}
        </span>
    );
};

interface RankingData {
    user: User;
    solveCount: number;
    best: number | null;
    worst: StatResult;
    currentAo5: StatResult;
    last5Solves: Solve[];
}

interface Leaderboard {
    cubeType: CubeType;
    rankings: RankingData[];
}

const GUEST_USER: User = { id: 0, name: 'Guest' };

export const Rankings: React.FC = () => {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allSolves, setAllSolves] = useState<Solve[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const [dbUsers, solves] = await Promise.all([db.getUsers(), db.getAllSolves()]);
            setAllUsers([GUEST_USER, ...dbUsers]);
            setAllSolves(solves);
            setIsLoading(false);
        };
        fetchData();
    }, []);

    const leaderboards = useMemo<Leaderboard[]>(() => {
        const cubeTypesWithSolves = [...new Set(allSolves.map(s => s.cubeType))] as CubeType[];
        
        const cubeTypeOrderMap = CUBE_TYPES.reduce((acc, type, index) => {
            acc[type] = index;
            return acc;
        }, {} as Record<CubeType, number>);

        cubeTypesWithSolves.sort((a, b) => (cubeTypeOrderMap[a] ?? 99) - (cubeTypeOrderMap[b] ?? 99));

        return cubeTypesWithSolves.map(cubeType => {
            const rankings = allUsers.map(user => {
                const userSolves = allSolves
                    .filter(solve => solve.userId === user.id && solve.cubeType === cubeType)
                    .sort((a, b) => b.date.getTime() - a.date.getTime());
                
                const finalTimes = userSolves.map(getFinalTime);
                const numericTimes = finalTimes.filter(t => typeof t === 'number') as number[];
                
                const best = numericTimes.length > 0 ? Math.min(...numericTimes) : null;
                
                let worst: StatResult;
                if (finalTimes.some(t => t === 'DNF')) {
                    worst = 'DNF';
                } else if (numericTimes.length > 0) {
                    worst = Math.max(...numericTimes);
                } else {
                    worst = null;
                }

                const last5Solves = userSolves.slice(0, 5);
                const currentAo5 = calculateAoN(last5Solves, 5);

                return { user, solveCount: userSolves.length, best, worst, currentAo5, last5Solves };
            })
            .filter(data => data.solveCount > 0)
            .sort((a, b) => {
                 const bestA = a.best ?? Infinity;
                 const bestB = b.best ?? Infinity;
                 if (bestA !== bestB) return bestA - bestB;
                 const ao5A = a.currentAo5 === 'DNF' || a.currentAo5 === null ? Infinity : a.currentAo5;
                 const ao5B = b.currentAo5 === 'DNF' || b.currentAo5 === null ? Infinity : b.currentAo5;
                 return ao5A - ao5B;
            });

            return { cubeType, rankings };
        }).filter(lb => lb.rankings.length > 0);
    }, [allUsers, allSolves]);
    
    const handleExportToCSV = (rankings: RankingData[], cubeType: CubeType) => {
        const headers = ['Rank', 'User', 'Solves', 'Best', 'Worst', 'Current Ao5'];

        const escapeCsvCell = (cell: string | number) => {
            const cellStr = String(cell).replace(/"/g, '""');
            return `"${cellStr}"`;
        };

        const csvRows = [
            headers.join(','),
            ...rankings.map((rank, index) => [
                index + 1,
                rank.user.name,
                rank.solveCount,
                formatStat(rank.best),
                formatStat(rank.worst),
                formatStat(rank.currentAo5)
            ].map(escapeCsvCell).join(','))
        ];

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `leaderboard_${cubeType.replace(/ /g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48 bg-white/30 dark:bg-black/20 backdrop-blur-md border border-slate-900/10 dark:border-white/20 rounded-lg">
                <p className="text-slate-600 dark:text-slate-500">Loading leaderboards...</p>
            </div>
        );
    }
    
    if (leaderboards.length === 0) {
        return (
             <div className="flex items-center justify-center h-48 bg-white/30 dark:bg-black/20 backdrop-blur-md border border-slate-900/10 dark:border-white/20 rounded-lg">
                <p className="text-slate-600 dark:text-slate-500">No solves recorded for any puzzle yet.</p>
            </div>
        )
    }

    return (
        <div className="space-y-12">
            {leaderboards.map(({ cubeType, rankings }) => (
                <div key={cubeType}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-200">{cubeType}</h3>
                        {rankings.length > 0 && (
                            <button
                                onClick={() => handleExportToCSV(rankings, cubeType)}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 active:bg-white/80 dark:active:bg-slate-800/90 backdrop-blur-sm border border-slate-900/10 dark:border-white/20 rounded-lg transition-colors text-black dark:text-slate-200 font-medium"
                                aria-label={`Export ${cubeType} leaderboard to CSV`}
                                title="Export to CSV"
                            >
                                <DownloadIcon className="w-4 h-4" />
                                <span>Export</span>
                            </button>
                        )}
                    </div>
                    <div className="bg-white/30 dark:bg-black/20 backdrop-blur-md border border-slate-900/10 dark:border-white/20 rounded-lg overflow-hidden">
                        <div className="max-h-[30rem] overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-600 dark:text-slate-400 uppercase bg-black/5 dark:bg-black/30 backdrop-blur-sm sticky top-0">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 w-8">Rank</th>
                                        <th scope="col" className="px-4 py-3">User</th>
                                        <th scope="col" className="px-4 py-3">Solves</th>
                                        <th scope="col" className="px-4 py-3">Best</th>
                                        <th scope="col" className="px-4 py-3">Worst</th>
                                        <th scope="col" className="px-4 py-3">Current Ao5</th>
                                        <th scope="col" className="px-4 py-3">Last 5</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rankings.map((rank, index) => (
                                        <tr key={rank.user.id} className="border-b border-slate-900/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-bold">{index + 1}</td>
                                            <th scope="row" className="px-4 py-3 font-medium whitespace-nowrap text-slate-900 dark:text-slate-100">{rank.user.name}</th>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{rank.solveCount}</td>
                                            <td className={`px-4 py-3 font-mono ${rank.best === null ? 'text-slate-500 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>{formatStat(rank.best)}</td>
                                            <td className={`px-4 py-3 font-mono ${rank.worst === 'DNF' ? 'text-red-600 dark:text-red-500' : rank.worst === null ? 'text-slate-500 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>{formatStat(rank.worst)}</td>
                                            <td className={`px-4 py-3 font-mono ${rank.currentAo5 === 'DNF' ? 'text-red-600 dark:text-red-500' : rank.currentAo5 === null ? 'text-slate-500 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>{formatStat(rank.currentAo5)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                                    {rank.last5Solves.map((solve) => (
                                                        <RenderSolveTime key={solve.id} solve={solve} />
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};