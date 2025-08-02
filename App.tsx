
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getNextScramble } from './services/geminiService';
import { useTimer } from './hooks/useTimer';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { useTheme } from './hooks/useTheme';
import { TimerDisplay } from './components/TimerDisplay';
import { ScrambleDisplay } from './components/ScrambleDisplay';
import { Stats } from './components/Stats';
import { SolveHistory } from './components/SolveHistory';
import { RefreshIcon, TrashIcon, UserIcon, InspectionIcon, SaweriaIcon, CommunityIcon, StopwatchIcon, LeaderboardIcon, ExpandIcon, CompressIcon } from './components/Icons';
import { ConfirmModal } from './components/ConfirmModal';
import { ScrambleTypeSelector } from './components/ScrambleTypeSelector';
import { Logo } from './components/Logo';
import { ThemeToggle } from './components/ThemeToggle';
import { Background } from './components/Background';
import { useTouchControls } from './hooks/useTouchControls';
import { Rankings } from './components/Rankings';
import * as db from './utils/db';
import * as audioService from './services/audioService';
import type { Solve, TimerStatus, CubeType, Theme, User, Penalty } from './types';
import { RunningTimerDisplay } from './components/RunningTimerDisplay';
import { FMCView } from './components/FMCView';
import { formatTime } from './utils/time';

const GUEST_USER: User = { id: 0, name: 'Guest' };

const UserModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    users: User[];
    onSelectUser: (user: User) => void;
    onCreateUser: (name: string) => Promise<boolean>;
    onDeleteUser: (user: User) => void;
}> = ({ isOpen, onClose, users, onSelectUser, onCreateUser, onDeleteUser }) => {
    const [newUserName, setNewUserName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    if (!isOpen) return null;

    const handleCreate = async () => {
        if (newUserName.trim() && !isCreating) {
            setIsCreating(true);
            const success = await onCreateUser(newUserName.trim());
            if (success) {
                setNewUserName('');
            }
            setIsCreating(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-slate-100/80 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-900/10 dark:border-white/20 rounded-lg p-6 sm:p-8 w-full max-w-md text-slate-900 dark:text-slate-200 shadow-2xl m-4"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-2xl font-bold mb-4">Select or Create User</h3>
                <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                    {users.map(user => (
                        <div key={user.id} className="flex items-center gap-2 group">
                            <button onClick={() => onSelectUser(user)} className="flex-grow text-left p-3 rounded-md bg-slate-900/5 dark:bg-white/5 hover:bg-slate-900/10 dark:hover:bg-white/10 active:bg-slate-900/20 dark:active:bg-white/20 transition-colors">
                                {user.name}
                            </button>
                            {user.id !== GUEST_USER.id && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteUser(user); }}
                                    className="p-2 -m-2 text-black dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 active:bg-red-400/20 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-colors"
                                    aria-label={`Delete user ${user.name}`}
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    ))}
                    {users.length === 1 && <p className="text-slate-600 dark:text-slate-400 text-center py-4">No custom users found. Create one below!</p>}
                </div>
                <div className="flex gap-2">
                    <input 
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="New user name..."
                        className="flex-grow bg-white/40 dark:bg-slate-800/40 border border-slate-900/10 dark:border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        disabled={isCreating}
                    />
                    <button 
                        onClick={handleCreate} 
                        disabled={isCreating || !newUserName.trim()}
                        className="px-5 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-lg font-semibold disabled:bg-sky-800 disabled:cursor-not-allowed transition-colors"
                    >
                        {isCreating ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
};


export default function App(): React.ReactNode {
    const [solves, setSolves] = useState<Solve[]>([]);
    const [cubeType, setCubeType] = useState<CubeType>('3x3');
    const [currentScramble, setCurrentScramble] = useState<string>('');
    const [isLoadingScramble, setIsLoadingScramble] = useState<boolean>(true);
    const [timerStatus, setTimerStatus] = useState<TimerStatus>('idle');
    const { time, start, stop, reset } = useTimer();
    const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
    const [theme, toggleTheme] = useTheme();
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [isFullScreenEnabled, setIsFullScreenEnabled] = useState(true);
    
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User>(GUEST_USER);
    const [isUserModalOpen, setUserModalOpen] = useState(false);
    const [view, setView] = useState<'session' | 'rankings'>('session');
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const [inspectionTime, setInspectionTime] = useState(15);
    const inspectionIntervalRef = useRef<number | null>(null);

    const [isAudioInitialized, setIsAudioInitialized] = useState(false);

    // Initialize audio on the first user interaction to comply with browser policies
    useEffect(() => {
        const initialize = () => {
            if (!isAudioInitialized) {
                audioService.initAudio();
                setIsAudioInitialized(true);
            }
        };

        window.addEventListener('mousedown', initialize, { once: true });
        window.addEventListener('keydown', initialize, { once: true });
        window.addEventListener('touchstart', initialize, { once: true });

        // Cleanup isn't strictly necessary with `once: true`, but it's good practice.
        return () => {
            window.removeEventListener('mousedown', initialize);
            window.removeEventListener('keydown', initialize);
            window.removeEventListener('touchstart', initialize);
        };
    }, [isAudioInitialized]);


    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
        }
        const savedFullScreenSetting = localStorage.getItem('fullScreenEnabled');
        // Default to true for new users or if not set, otherwise respect their choice.
        setIsFullScreenEnabled(savedFullScreenSetting !== 'false');
        loadInitialData();
    }, []);
    
    useEffect(() => {
        localStorage.setItem('fullScreenEnabled', String(isFullScreenEnabled));
    }, [isFullScreenEnabled]);

    const loadInitialData = async () => {
        const userList = await db.getUsers();
        setUsers(userList);
        
        const lastUserId = localStorage.getItem('lastUserId');
        if (lastUserId) {
            const id = Number(lastUserId);
            if (id === GUEST_USER.id) {
                setCurrentUser(GUEST_USER);
            } else {
                const userToSelect = userList.find(u => u.id === id);
                if (userToSelect) {
                    setCurrentUser(userToSelect);
                }
            }
        }
    };

    const fetchUserSolves = useCallback(async (userId: number) => {
        const userSolves = await db.getSolvesForUser(userId);
        setSolves(userSolves.sort((a, b) => b.date.getTime() - a.date.getTime()));
    }, []);

    useEffect(() => {
        fetchUserSolves(currentUser.id);
    }, [currentUser.id, fetchUserSolves]);

    const loadNewScramble = useCallback(async (type: CubeType) => {
        setIsLoadingScramble(true);
        const scramble = await getNextScramble(type);
        setCurrentScramble(scramble);
        setIsLoadingScramble(false);
    }, []);

    useEffect(() => {
        loadNewScramble(cubeType);
    }, [cubeType, loadNewScramble]);

    const handleCubeTypeChange = (newType: CubeType) => {
        if (newType !== cubeType) {
            setCubeType(newType);
        }
    };

    const handleSolveComplete = useCallback(async (solveTime: number) => {
        const newSolveData = {
            time: solveTime,
            scramble: currentScramble,
            cubeType: cubeType,
            userId: currentUser.id,
            penalty: 'none' as Penalty,
        };
        await db.addSolve(newSolveData);
        fetchUserSolves(currentUser.id);
        loadNewScramble(cubeType);
    }, [currentUser.id, currentScramble, loadNewScramble, cubeType, fetchUserSolves]);
    
    const handleFmcComplete = useCallback(async (solveData: Omit<Solve, 'id' | 'date'>) => {
        await db.addSolve(solveData);
        alert(`FMC session saved!\nMoves: ${solveData.time}\nTime: ${formatTime(solveData.fmcTime ?? 0)}`);
        // The FMCView component handles its own reset, which calls onNewScramble
        fetchUserSolves(currentUser.id);
    }, [currentUser.id, fetchUserSolves]);

    const handleInspectionTimeout = useCallback(async () => {
        const dnfSolveData = {
            time: 0,
            scramble: currentScramble,
            cubeType,
            userId: currentUser.id,
            penalty: 'DNF' as Penalty,
        };
        await db.addSolve(dnfSolveData);
        fetchUserSolves(currentUser.id);
        loadNewScramble(cubeType);
        setTimerStatus('idle');
    }, [currentUser.id, currentScramble, cubeType, fetchUserSolves, loadNewScramble]);

    const startInspection = useCallback(() => {
        if (timerStatus !== 'idle') return;
        setInspectionTime(15);
        setTimerStatus('inspecting');

        inspectionIntervalRef.current = window.setInterval(() => {
            setInspectionTime(prevTime => {
                if (prevTime <= 1) {
                    if (inspectionIntervalRef.current) clearInterval(inspectionIntervalRef.current);
                    inspectionIntervalRef.current = null;
                    handleInspectionTimeout();
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);
    }, [timerStatus, handleInspectionTimeout]);

    const handleInteractionStart = useCallback(() => {
        if (cubeType === '3x3 FMC') return;
        switch (timerStatus) {
            case 'running': {
                const finalTime = stop();
                setTimerStatus('stopped');
                handleSolveComplete(finalTime);
                audioService.playStopSound();
                break;
            }
            case 'stopped':
                setTimerStatus('idle');
                break;
            case 'idle':
            case 'inspecting':
                if (timerStatus === 'inspecting' && inspectionIntervalRef.current) {
                    clearInterval(inspectionIntervalRef.current);
                    inspectionIntervalRef.current = null;
                }
                setTimerStatus('ready');
                reset();
                break;
            default:
                break;
        }
    }, [timerStatus, stop, reset, handleSolveComplete, cubeType]);

    const handleInteractionEnd = useCallback(() => {
        if (cubeType === '3x3 FMC') return;
        if (timerStatus === 'ready') {
            setTimerStatus('running');
            start();
            audioService.playStartSound();
        }
    }, [timerStatus, start, cubeType]);
    
    useEffect(() => {
        if (timerStatus !== 'inspecting' && inspectionIntervalRef.current) {
            clearInterval(inspectionIntervalRef.current);
            inspectionIntervalRef.current = null;
        }
        return () => {
            if (inspectionIntervalRef.current) {
                clearInterval(inspectionIntervalRef.current);
            }
        };
    }, [timerStatus]);

    const deleteSolve = useCallback(async (id: number) => {
        await db.deleteSolve(id);
        fetchUserSolves(currentUser.id);
    }, [currentUser.id, fetchUserSolves]);
    
    const handleUpdateSolve = useCallback(async (solve: Solve) => {
        await db.updateSolve(solve);
        fetchUserSolves(currentUser.id);
    }, [currentUser.id, fetchUserSolves]);

    const openClearConfirmModal = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmModalOpen(true);
    }, []);

    const closeClearConfirmModal = useCallback(() => {
        setConfirmModalOpen(false);
    }, []);

    const handleClearHistory = useCallback(async () => {
        await db.clearSolvesForUser(currentUser.id, cubeType);
        fetchUserSolves(currentUser.id);
        setConfirmModalOpen(false);
    }, [currentUser.id, fetchUserSolves, cubeType]);

    const handleInitiateDeleteUser = (user: User) => {
        setUserModalOpen(false); // Close user list first
        setUserToDelete(user);
    };

    const handleCancelDeleteUser = () => {
        setUserToDelete(null);
    };

    const handleConfirmDeleteUser = async () => {
        if (!userToDelete) return;

        await db.deleteUser(userToDelete.id);

        if (currentUser.id === userToDelete.id) {
            setCurrentUser(GUEST_USER);
            localStorage.setItem('lastUserId', String(GUEST_USER.id));
        }

        const userList = await db.getUsers();
        setUsers(userList);

        setUserToDelete(null);
    };

    const anyModalOpen = isConfirmModalOpen || isUserModalOpen || !!userToDelete;
    
    useKeyboardControls(handleInteractionStart, handleInteractionEnd, anyModalOpen || cubeType === '3x3 FMC');
    useTouchControls(handleInteractionStart, handleInteractionEnd, anyModalOpen || cubeType === '3x3 FMC');

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
           if (event.key === 'Escape') {
               if (userToDelete) {
                    handleCancelDeleteUser();
               } else if (isConfirmModalOpen) {
                    closeClearConfirmModal();
               } else if (isUserModalOpen) {
                   setUserModalOpen(false);
               } else if (timerStatus === 'inspecting') {
                   setTimerStatus('idle');
               }
           }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isConfirmModalOpen, closeClearConfirmModal, isUserModalOpen, userToDelete, timerStatus]);

    const getTimerColor = (): string => {
        switch (timerStatus) {
            case 'ready':
            case 'inspecting':
                return 'text-amber-600 dark:text-amber-400';
            case 'running': return 'text-emerald-600 dark:text-emerald-400';
            default: return 'text-slate-900 dark:text-white';
        }
    };
    
    const handleSelectUser = (user: User) => {
        setCurrentUser(user);
        localStorage.setItem('lastUserId', String(user.id));
        if (user.id !== GUEST_USER.id && !users.find(u => u.id === user.id)) {
            setUsers([...users, user]);
        }
        setUserModalOpen(false);
    };

    const handleCreateUser = async (name: string): Promise<boolean> => {
        const normalizedName = name.trim();

        if (normalizedName.toLowerCase() === GUEST_USER.name.toLowerCase()) {
            alert(`"${GUEST_USER.name}" is a reserved name. Please choose another one.`);
            return false;
        }

        const existingUser = users.find(u => u.name.toLowerCase() === normalizedName.toLowerCase());
        if (existingUser) {
            alert(`A user with the name "${normalizedName}" already exists.`);
            return false;
        }

        const newUser = await db.addUser(normalizedName);
        handleSelectUser(newUser);
        return true;
    };

    const TabButton: React.FC<{
        label: string;
        icon: React.ReactNode;
        activeView: typeof view;
        targetView: typeof view;
    }> = ({ label, icon, activeView, targetView }) => (
        <button
            onClick={() => setView(targetView)}
            className={`flex items-center gap-2 px-4 py-2 text-lg font-bold rounded-t-lg transition-colors ${
                activeView === targetView
                    ? 'text-sky-600 dark:text-sky-400 border-b-2 border-sky-500'
                    : 'text-black dark:text-slate-400 hover:text-black/80 dark:hover:text-slate-300 active:bg-slate-200/50 dark:active:bg-slate-800/50'
            }`}
            aria-current={activeView === targetView ? 'page' : undefined}
        >
            {icon}
            {label}
        </button>
    );

    const filteredSolves = useMemo(() => {
        return solves.filter(solve => solve.cubeType === cubeType);
    }, [solves, cubeType]);

    const mainControlsDisabled = timerStatus !== 'idle';

    return (
        <>
            <Background theme={theme} />
            {timerStatus === 'running' && isFullScreenEnabled && <RunningTimerDisplay time={time} />}
            <div 
                className={`min-h-screen text-slate-900 dark:text-slate-200 flex flex-col items-center p-4 sm:p-8 selection:bg-sky-300/30 ${timerStatus === 'running' && isFullScreenEnabled ? 'invisible' : ''}`}
                tabIndex={-1}
            >
                <main className="w-full max-w-7xl flex-grow flex flex-col">
                    <header className="w-full flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <Logo />
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black dark:text-slate-100 leading-tight">Rubik's Timer</h1>
                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">by Blitarian Speedcuber Brotherhood</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setUserModalOpen(true)}
                                className="flex items-center gap-2 p-2 rounded-full text-black dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 active:bg-slate-300 dark:active:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Select user"
                                disabled={mainControlsDisabled}
                            >
                                <UserIcon />
                                <span className="font-medium hidden sm:inline">{currentUser.name}</span>
                            </button>
                            <a
                                href="https://www.facebook.com/groups/rubikjawatimur/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 p-2 rounded-full text-black dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 active:bg-slate-300 dark:active:bg-slate-700 transition-colors ${mainControlsDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                aria-label="Join our Community"
                                title="Join our Community"
                            >
                                <CommunityIcon className="w-6 h-6" />
                                <span className="font-medium hidden sm:inline">Community</span>
                            </a>
                            <a
                                href="https://saweria.co/hariszaka1"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 p-2 rounded-full text-black dark:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-700/50 active:bg-slate-300 dark:active:bg-slate-700 transition-colors ${mainControlsDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                aria-label="Support me on Saweria"
                                title="Support me on Saweria"
                            >
                                <SaweriaIcon className="w-6 h-6" />
                                <span className="font-medium hidden sm:inline">Support me</span>
                            </a>
                            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                        </div>
                    </header>
                    
                    <div className="w-full flex flex-col items-center gap-4 mb-4 text-center">
                        <ScrambleTypeSelector value={cubeType} onChange={handleCubeTypeChange} theme={theme} disabled={mainControlsDisabled}/>
                        <ScrambleDisplay scramble={currentScramble} isLoading={isLoadingScramble} cubeType={cubeType} />
                        {cubeType !== '3x3 FMC' && (
                            <div className="mt-2 mx-auto flex items-center gap-4 flex-wrap justify-center">
                                <button
                                    onClick={(e) => { e.stopPropagation(); loadNewScramble(cubeType); }}
                                    disabled={isLoadingScramble || mainControlsDisabled}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 active:bg-white/80 dark:active:bg-slate-800/90 backdrop-blur-sm border border-slate-900/10 dark:border-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-black dark:text-slate-200 font-medium"
                                >
                                    <RefreshIcon />
                                    New Scramble
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); startInspection(); }}
                                    disabled={isLoadingScramble || mainControlsDisabled}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 active:bg-white/80 dark:active:bg-slate-800/90 backdrop-blur-sm border border-slate-900/10 dark:border-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-black dark:text-slate-200 font-medium"
                                >
                                    <InspectionIcon />
                                    Start Inspection
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsFullScreenEnabled(prev => !prev); }}
                                    disabled={mainControlsDisabled}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 active:bg-white/80 dark:active:bg-slate-800/90 backdrop-blur-sm border border-slate-900/10 dark:border-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-black dark:text-slate-200 font-medium"
                                    title={`${isFullScreenEnabled ? 'Disable' : 'Enable'} fullscreen timer`}
                                >
                                    {isFullScreenEnabled ? <CompressIcon className="w-5 h-5" /> : <ExpandIcon className="w-5 h-5" />}
                                    <span>{isFullScreenEnabled ? 'Fullscreen On' : 'Fullscreen Off'}</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {cubeType === '3x3 FMC' ? (
                        <FMCView
                            scramble={currentScramble}
                            cubeType={cubeType}
                            currentUser={currentUser}
                            onSave={handleFmcComplete}
                            onNewScramble={() => loadNewScramble(cubeType)}
                        />
                    ) : (
                        <>
                            <section className="flex-grow flex flex-col items-center justify-center">
                                <TimerDisplay
                                    time={timerStatus === 'inspecting' ? inspectionTime * 1000 : time}
                                    className={`font-timer transition-colors duration-200 ${getTimerColor()}`}
                                    status={timerStatus}
                                />
                                {isTouchDevice && timerStatus === 'idle' && (
                                    <p className="mt-4 text-slate-600 dark:text-slate-400 animate-pulse">
                                        Tap and hold screen to start
                                    </p>
                                )}
                            </section>

                            <footer className="w-full mt-8">
                                <div className="flex justify-center border-b border-slate-900/10 dark:border-white/10 mb-4">
                                    <TabButton label="Session" icon={<StopwatchIcon className="w-5 h-5" />} activeView={view} targetView="session" />
                                    <TabButton label="Leaderboard" icon={<LeaderboardIcon className="w-5 h-5" />} activeView={view} targetView="rankings" />
                                </div>
                                
                                <div className="grid grid-cols-1 landscape:grid-cols-12 md:grid-cols-12 gap-8">
                                    {view === 'session' ? (
                                        <>
                                            <div className="landscape:col-span-5 md:col-span-4">
                                                <Stats solves={filteredSolves} cubeType={cubeType} />
                                            </div>
                                            <div className="landscape:col-span-7 md:col-span-8">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200">Solve History ({cubeType})</h2>
                                                    {filteredSolves.length > 0 && (
                                                        <button
                                                            onClick={openClearConfirmModal}
                                                            className="flex items-center gap-2 text-sm text-red-700 dark:text-red-500 hover:text-red-800 dark:hover:text-red-600 active:bg-red-500/10 dark:active:bg-red-500/20 transition-all px-2 py-1 rounded-md -mx-2 -my-1"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                            Clear History
                                                        </button>
                                                    )}
                                                </div>
                                                <SolveHistory solves={filteredSolves} onDelete={deleteSolve} onUpdate={handleUpdateSolve} />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="landscape:col-span-12 md:col-span-12">
                                            <Rankings />
                                        </div>
                                    )}
                                </div>
                            </footer>
                        </>
                    )}
                </main>
                <footer className="w-full text-center py-4 text-sm text-slate-500 dark:text-slate-400 mt-4">
                    <p>© 2025 Blitarian Speedcuber Brotherhood</p>
                </footer>
                <ConfirmModal
                    isOpen={isConfirmModalOpen}
                    onClose={closeClearConfirmModal}
                    onConfirm={handleClearHistory}
                    title={`Clear ${cubeType} History?`}
                    message={`This action is permanent and cannot be undone. Are you sure you want to delete this user's solve history for ${cubeType}?`}
                />
                 <ConfirmModal
                    isOpen={!!userToDelete}
                    onClose={handleCancelDeleteUser}
                    onConfirm={handleConfirmDeleteUser}
                    title={`Delete User: ${userToDelete?.name || ''}`}
                    message="This will permanently delete the user and all associated solve data. This action cannot be undone."
                />
                 <UserModal
                    isOpen={isUserModalOpen}
                    onClose={() => setUserModalOpen(false)}
                    users={[GUEST_USER, ...users]}
                    onSelectUser={handleSelectUser}
                    onCreateUser={handleCreateUser}
                    onDeleteUser={handleInitiateDeleteUser}
                />
            </div>
        </>
    );
}
