
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatTime } from '../utils/time';
import { countFtmMoves } from '../utils/fmcLogic';
import type { Solve, CubeType, User } from '../types';

interface FMCViewProps {
    scramble: string;
    cubeType: CubeType;
    currentUser: User;
    onSave: (solveData: Omit<Solve, 'id' | 'date'>) => void;
    onNewScramble: () => void;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

export const FMCView: React.FC<FMCViewProps> = ({ scramble, cubeType, currentUser, onSave, onNewScramble }) => {
    const [solution, setSolution] = useState('');
    const [moveCount, setMoveCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(ONE_HOUR_MS);
    const [isActive, setIsActive] = useState(false);
    const intervalRef = useRef<number | null>(null);

    const stopSession = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsActive(false);
    }, []);

    const startSession = useCallback(() => {
        if (isActive) return;
        setIsActive(true);
        setTimeLeft(ONE_HOUR_MS);
        const startTime = Date.now();

        intervalRef.current = window.setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            const newTimeLeft = ONE_HOUR_MS - elapsedTime;

            if (newTimeLeft <= 0) {
                stopSession();
                setTimeLeft(0);
                alert("Time's up! Your FMC session has ended.");
            } else {
                setTimeLeft(newTimeLeft);
            }
        }, 1000);
    }, [isActive, stopSession]);
    
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const handleSolutionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setSolution(e.target.value);
    };

    const handleCountMoves = useCallback(() => {
        const count = countFtmMoves(solution);
        setMoveCount(count);
    }, [solution]);

    const handleReset = useCallback(() => {
        stopSession();
        setTimeLeft(ONE_HOUR_MS);
        setSolution('');
        setMoveCount(0);
        onNewScramble();
    }, [stopSession, onNewScramble]);

    const handleSave = () => {
        if (!solution.trim()) {
            alert("Solution cannot be empty.");
            return;
        }
        
        handleCountMoves(); // Final count before saving
        
        const finalMoveCount = countFtmMoves(solution);

        onSave({
            time: finalMoveCount, // Using 'time' field for move count
            scramble,
            cubeType,
            userId: currentUser.id,
            penalty: 'none',
            solution: solution.trim(),
            fmcTime: ONE_HOUR_MS - timeLeft, // Time taken
        });
        
        stopSession();
    };
    
    const buttonClass = "px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-md active:shadow-inner";

    return (
        <section className="w-full flex-grow flex flex-col items-center justify-start p-4 bg-white/30 dark:bg-black/20 backdrop-blur-md border border-slate-900/10 dark:border-white/20 rounded-lg">
            <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-100">Fewest Moves Challenge</h2>

            <div className="text-5xl font-timer font-bold mb-4 text-slate-800 dark:text-slate-200">
                {formatTime(timeLeft).split('.')[0]}
            </div>

            <div className="w-full max-w-lg mb-4">
                <label htmlFor="solution-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Write solution here
                </label>
                <textarea
                    id="solution-input"
                    rows={8}
                    value={solution}
                    onChange={handleSolutionChange}
                    className="w-full p-2 font-mono text-sm bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-sky-500 focus:outline-none transition-colors"
                    placeholder="e.g., R U R' U'..."
                    disabled={!isActive}
                />
            </div>
            
            <div className="mt-2 text-lg text-slate-800 dark:text-slate-200">
                Move count: <span className="font-bold font-mono text-sky-600 dark:text-sky-400">{moveCount} moves</span>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mt-6">
                <button
                    onClick={startSession}
                    disabled={isActive}
                    className={`${buttonClass} bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-green-600/50`}
                >
                    Start FMC Session
                </button>
                <button
                    onClick={handleCountMoves}
                    className={`${buttonClass} bg-sky-600 hover:bg-sky-700 active:bg-sky-800`}
                >
                    Count Moves
                </button>
                 <button
                    onClick={handleReset}
                    className={`${buttonClass} bg-amber-600 hover:bg-amber-700 active:bg-amber-800`}
                >
                    Reset
                </button>
                <button
                    onClick={handleSave}
                    disabled={!solution.trim()}
                    className={`${buttonClass} bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-600/50`}
                >
                    Save
                </button>
            </div>
        </section>
    );
};
