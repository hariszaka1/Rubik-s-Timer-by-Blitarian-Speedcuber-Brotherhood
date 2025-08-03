
import React from 'react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { ScrambleTypeSelector } from './ScrambleTypeSelector';
import { UserIcon, HashtagIcon, UsersIcon } from './Icons';
import type { Theme, CubeType, User, Room, Competition } from '../types';

interface FloatingHeaderProps {
    isVisible: boolean;
    theme: Theme;
    toggleTheme: () => void;
    cubeType: CubeType;
    onCubeTypeChange: (value: CubeType) => void;
    currentUser: User;
    onUserModalOpen: () => void;
    activeRoom: Room | null;
    onRoomModalOpen: () => void;
    activeCompetition: Competition | null;
    onCompetitionModalOpen: () => void;
    competitionName: string;
    disabled: boolean;
}

export const FloatingHeader: React.FC<FloatingHeaderProps> = ({
    isVisible,
    theme,
    toggleTheme,
    cubeType,
    onCubeTypeChange,
    currentUser,
    onUserModalOpen,
    activeRoom,
    onRoomModalOpen,
    activeCompetition,
    onCompetitionModalOpen,
    competitionName,
    disabled,
}) => {
    return (
        <header
            className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ease-in-out ${
                isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
            }`}
            aria-hidden={!isVisible}
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-8">
                <div className="flex h-16 items-center justify-between bg-slate-100/70 dark:bg-slate-900/70 backdrop-blur-lg border-b border-slate-900/10 dark:border-white/20 rounded-b-2xl px-4 shadow-lg">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <Logo />
                        <ScrambleTypeSelector 
                            value={cubeType} 
                            onChange={onCubeTypeChange} 
                            theme={theme} 
                            disabled={disabled}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onUserModalOpen}
                            className="flex items-center gap-2 p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 active:bg-slate-300/50 dark:active:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Select user"
                            disabled={disabled}
                        >
                            <UserIcon />
                            <span className="font-medium hidden md:inline">{currentUser.name}</span>
                        </button>
                        <button
                            onClick={onCompetitionModalOpen}
                            className="flex items-center gap-2 p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 active:bg-slate-300/50 dark:active:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Offline competition"
                            disabled={disabled}
                            title={activeCompetition ? `Competition: ${activeCompetition.name}`: 'Offline Competition'}
                        >
                            <UsersIcon />
                            <span className="font-medium hidden md:inline">{competitionName}</span>
                        </button>
                        <button
                            onClick={onRoomModalOpen}
                            className="flex items-center gap-2 p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 active:bg-slate-300/50 dark:active:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Room management"
                            disabled={disabled}
                            title={activeRoom ? `Room: ${activeRoom.name}`: 'Room Management'}
                        >
                            <HashtagIcon />
                            <span className="font-medium hidden md:inline">{activeRoom?.name || 'Room'}</span>
                        </button>
                        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                    </div>
                </div>
            </div>
        </header>
    );
};