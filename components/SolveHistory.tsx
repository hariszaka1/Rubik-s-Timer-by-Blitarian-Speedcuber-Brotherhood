
import React, { useState, useEffect, useRef } from 'react';
import type { Solve, Penalty } from '../types';
import { formatTime } from '../utils/time';
import { TrashIcon, PencilIcon } from './Icons';

const PenaltyEditor: React.FC<{
    onUpdate: (penalty: Penalty) => void;
    onCancel: () => void;
}> = ({ onUpdate, onCancel }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (editorRef.current && !editorRef.current.contains(event.target as Node)) {
                onCancel();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onCancel]);
    
    const buttonClass = "px-3 py-1 text-xs font-semibold rounded-md transition-colors";
    const okButtonClass = `${buttonClass} bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500 active:bg-slate-500 dark:active:bg-slate-400`;
    const penaltyButtonClass = `${buttonClass} bg-amber-400 hover:bg-amber-500 dark:bg-amber-500 dark:hover:bg-amber-600 text-slate-900 active:bg-amber-600`;
    const dnfButtonClass = `${buttonClass} bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:red-700 text-white active:bg-red-700`;

    return (
        <div ref={editorRef} className="absolute inset-y-0 -left-2 -right-2 bg-slate-200/80 dark:bg-slate-800/80 backdrop-blur-sm flex justify-evenly items-center p-1 z-10 rounded-md shadow-lg">
            <button onClick={() => onUpdate('none')} className={okButtonClass}>OK</button>
            <button onClick={() => onUpdate('+2')} className={penaltyButtonClass}>+2</button>
            <button onClick={() => onUpdate('DNF')} className={dnfButtonClass}>DNF</button>
        </div>
    );
};


interface SolveHistoryProps {
  solves: Solve[];
  onDelete: (id: number) => void;
  onUpdate: (solve: Solve) => void;
}

export const SolveHistory: React.FC<SolveHistoryProps> = ({ solves, onDelete, onUpdate }) => {
    const [editingSolveId, setEditingSolveId] = useState<number | null>(null);
    const isFMC = solves.length > 0 && solves[0].cubeType === '3x3 FMC';
    
    const handleUpdatePenalty = (solve: Solve, penalty: Penalty) => {
        onUpdate({ ...solve, penalty });
        setEditingSolveId(null);
    };

    const displayFormattedTime = (solve: Solve) => {
        const penalty = solve.penalty || 'none';
        if (penalty === 'DNF') return <span className="text-red-600 dark:text-red-500 font-semibold">DNF</span>;
        
        const finalTime = penalty === '+2' ? solve.time + 2000 : solve.time;
        const display = formatTime(finalTime);
        
        if (penalty === '+2') {
            return <>{display}<sup className="ml-0.5 font-sans font-semibold text-red-600 dark:text-red-500">+</sup></>;
        }
        
        return display;
    };

    if (solves.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 bg-white/30 dark:bg-black/20 backdrop-blur-md border border-slate-900/10 dark:border-white/20 rounded-lg">
                <p className="text-slate-600 dark:text-slate-500">No solves recorded yet.</p>
            </div>
        );
    }

    return (
        <div className="bg-white/30 dark:bg-black/20 backdrop-blur-md border border-slate-900/10 dark:border-white/20 rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-600 dark:text-slate-400 uppercase bg-black/5 dark:bg-black/30 backdrop-blur-sm sticky top-0">
                        <tr>
                            <th scope="col" className="px-4 py-3 w-8">#</th>
                            {isFMC ? (
                                <>
                                    <th scope="col" className="px-4 py-3">Moves</th>
                                    <th scope="col" className="px-4 py-3">Time Used</th>
                                    <th scope="col" className="px-4 py-3">Solution</th>
                                </>
                            ) : (
                                <>
                                    <th scope="col" className="px-4 py-3">Time</th>
                                    <th scope="col" className="px-4 py-3">Scramble</th>
                                </>
                            )}
                            <th scope="col" className="px-4 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {solves.map((solve, index) => (
                            <tr key={solve.id} className="group border-b border-slate-900/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{solves.length - index}</td>
                                {isFMC ? (
                                    <>
                                        <th scope="row" className="px-4 py-3 font-mono font-medium whitespace-nowrap text-slate-900 dark:text-slate-100">
                                            {solve.time}
                                        </th>
                                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{formatTime(solve.fmcTime ?? 0)}</td>
                                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 truncate max-w-xs" title={solve.solution}>{solve.solution}</td>
                                    </>
                                ) : (
                                    <>
                                        <th scope="row" className="px-4 py-3 font-mono font-medium whitespace-nowrap text-slate-900 dark:text-slate-100">
                                            <div className="relative h-5 flex items-center">
                                                {editingSolveId === solve.id ? (
                                                    <PenaltyEditor 
                                                        onUpdate={(penalty) => handleUpdatePenalty(solve, penalty)}
                                                        onCancel={() => setEditingSolveId(null)}
                                                    />
                                                ) : (
                                                    <div onClick={() => setEditingSolveId(solve.id)} className="cursor-pointer w-full h-full flex items-center gap-2 px-2 -mx-2 py-1 -my-1 rounded-md active:bg-slate-900/10 dark:active:bg-white/10 transition-colors">
                                                        <span>{displayFormattedTime(solve)}</span>
                                                        <PencilIcon className="w-3.5 h-3.5 text-black dark:text-slate-400 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity" />
                                                    </div>
                                                )}
                                            </div>
                                        </th>
                                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 truncate max-w-xs">{solve.scramble}</td>
                                    </>
                                )}
                                <td className="px-4 py-3">
                                    <button onClick={(e) => { e.stopPropagation(); onDelete(solve.id); }} className="p-2 -m-2 rounded-full text-black dark:text-slate-400 hover:text-red-500 dark:hover:text-red-500 active:bg-red-400/20 transition-colors">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
