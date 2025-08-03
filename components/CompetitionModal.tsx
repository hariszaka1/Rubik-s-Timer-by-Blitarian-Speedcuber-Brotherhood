
import React, { useState, useEffect, useMemo } from 'react';
import Select, { StylesConfig } from 'react-select';
import type { Competition, User, Solve, CubeType, Theme } from '../types';
import { RefreshIcon } from './Icons';
import { formatTime } from '../utils/time';

interface CompetitionModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeCompetition: Competition | null;
    onSetCompetition: (competition: Competition | null) => void;
    onNextScramble: () => void;
    users: User[];
    solves: Solve[];
    cubeType: CubeType;
    theme: Theme;
}

const getFinalTime = (solve: Solve): number | 'DNF' => {
    if (solve.penalty === 'DNF') return 'DNF';
    return solve.penalty === '+2' ? solve.time + 2000 : solve.time;
};

const getSelectStyles = (theme: Theme): StylesConfig => {
    const isDark = theme === 'dark';
    return {
        control: (provided) => ({
            ...provided,
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.4)',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.1)'}`,
            borderRadius: '0.5rem',
            backdropFilter: 'blur(4px)',
            minHeight: '42px',
        }),
        valueContainer: (provided) => ({...provided, padding: '2px 8px'}),
        multiValue: (provided) => ({
            ...provided,
            backgroundColor: isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(56, 189, 248, 0.2)',
        }),
        multiValueLabel: (provided) => ({...provided, color: isDark ? '#e0f2fe' : '#075985'}),
        menu: (provided) => ({
            ...provided,
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: '0.5rem',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(15, 23, 42, 0.2)'}`,
            overflow: 'hidden',
        }),
        option: (provided, state) => ({
          ...provided,
          backgroundColor: state.isSelected 
              ? '#38bdf8'
              : state.isFocused 
              ? isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(56, 189, 248, 0.1)'
              : 'transparent',
          color: state.isSelected ? 'white' : (isDark ? '#f1f5f9' : '#0f172a'),
          fontWeight: 500,
          cursor: 'default',
        }),
        indicatorSeparator: () => ({ display: 'none' }),
        dropdownIndicator: (provided) => ({...provided, color: isDark ? '#94a3b8' : '#64748b' }),
    };
};

export const CompetitionModal: React.FC<CompetitionModalProps> = ({ isOpen, onClose, activeCompetition, onSetCompetition, onNextScramble, users, solves, cubeType, theme }) => {
    const [competitionName, setCompetitionName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<{ value: number; label: string; }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const userOptions = users.map(u => ({ value: u.id, label: u.name }));
    
    const leaderboardData = useMemo(() => {
        if (!activeCompetition) return [];

        const competitionSolvesForType = solves.filter(s => s.cubeType === cubeType && activeCompetition.participantIds.includes(s.userId));
    
        return activeCompetition.participantIds.map(id => {
            const user = users.find(u => u.id === id);
            const userSolves = competitionSolvesForType.filter(s => s.userId === id);
    
            const finalTimes = userSolves.map(getFinalTime).filter(t => typeof t === 'number') as number[];
            const best = finalTimes.length > 0 ? Math.min(...finalTimes) : null;
    
            return { user, best };
        }).filter(data => !!data.user)
          .sort((a, b) => (a.best ?? Infinity) - (b.best ?? Infinity));
    
    }, [activeCompetition, users, solves, cubeType]);


    useEffect(() => {
        if (!isOpen) {
            setError('');
            setIsLoading(false);
            setCompetitionName('');
            setSelectedUsers([]);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCreateCompetition = () => {
        if (!competitionName.trim()) {
            setError("Competition name cannot be empty.");
            return;
        }
        if (selectedUsers.length < 2) {
            setError("Please select at least two participants.");
            return;
        }
        setIsLoading(true);
        setError('');
        
        const newCompetition: Competition = {
            name: competitionName.trim(),
            participantIds: selectedUsers.map(u => u.value),
            scrambles: {},
        };
        onSetCompetition(newCompetition);
        setIsLoading(false);
    };

    const handleEndCompetition = () => {
        onSetCompetition(null);
    };

    const inputClass = "w-full bg-white/40 dark:bg-slate-800/40 border border-slate-900/10 dark:border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors";
    const buttonClass = "w-full px-5 py-2 text-white rounded-lg font-semibold transition-colors disabled:bg-sky-800 disabled:cursor-not-allowed";

    return (
        <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-slate-100/80 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-900/10 dark:border-white/20 rounded-lg p-6 sm:p-8 w-full max-w-lg text-slate-900 dark:text-slate-200 shadow-2xl m-4"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-2xl font-bold mb-6 text-center">Offline Competition</h3>

                {activeCompetition ? (
                    <div className="text-center">
                        <p className="text-slate-600 dark:text-slate-400">Current competition:</p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 my-2">{activeCompetition.name}</p>
                        
                        <div className="my-4 text-left">
                           <h4 className="font-semibold text-lg mb-2">{cubeType} Leaderboard (Best Single)</h4>
                           <div className="bg-slate-200/50 dark:bg-slate-800/50 rounded-lg p-3 max-h-60 overflow-y-auto">
                               {leaderboardData.length > 0 ? (
                                    <ol className="space-y-2">
                                        {leaderboardData.map(({ user, best }, index) => (
                                            <li key={user?.id} className="flex justify-between items-center text-sm">
                                                <span className="font-semibold">
                                                   <span className="inline-block w-6 text-slate-500 dark:text-slate-400">{index + 1}.</span>
                                                   {user?.name}
                                                </span>
                                                <span className="font-mono font-medium">
                                                    {best !== null ? formatTime(best) : 'N/A'}
                                                </span>
                                            </li>
                                        ))}
                                    </ol>
                               ) : (
                                   <p className="text-center text-slate-500 dark:text-slate-400 py-4">No solves recorded for {cubeType} in this competition yet.</p>
                               )}
                           </div>
                        </div>

                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                             <button 
                                onClick={onNextScramble}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold rounded-lg transition-colors"
                            >
                                <RefreshIcon /> New Scramble
                            </button>
                            <button onClick={handleEndCompetition} className="flex-1 px-6 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-lg transition-colors">
                                End Competition
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h4 className="font-semibold text-lg">Create a Competition</h4>
                            <input 
                                type="text"
                                value={competitionName}
                                onChange={(e) => setCompetitionName(e.target.value)}
                                placeholder="Enter competition name..."
                                className={inputClass}
                                disabled={isLoading}
                            />
                        </div>
                         <div className="space-y-2">
                            <h4 className="font-semibold text-lg">Select Participants</h4>
                             <Select
                                isMulti
                                options={userOptions}
                                value={selectedUsers}
                                onChange={(options) => setSelectedUsers(options as any)}
                                styles={getSelectStyles(theme)}
                                placeholder="Choose at least 2 users..."
                                isDisabled={isLoading}
                                instanceId="competition-user-selector"
                            />
                        </div>
                        <button onClick={handleCreateCompetition} disabled={isLoading || !competitionName.trim() || selectedUsers.length < 2} className={`${buttonClass} bg-purple-600 hover:bg-purple-700 active:bg-purple-800`}>
                            {isLoading ? 'Starting...' : 'Start Competition'}
                        </button>
                    </div>
                )}
                {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
            </div>
        </div>
    );
};