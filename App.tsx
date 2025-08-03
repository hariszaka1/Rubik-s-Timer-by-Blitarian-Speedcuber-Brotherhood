
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getNextScramble } from './services/geminiService';
import { useTimer } from './hooks/useTimer';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { useTheme } from './hooks/useTheme';
import { TimerDisplay } from './components/TimerDisplay';
import { ScrambleDisplay } from './components/ScrambleDisplay';
import { Stats } from './components/Stats';
import { SolveHistory } from './components/SolveHistory';
import { RefreshIcon, TrashIcon, UserIcon, HashtagIcon, InspectionIcon, SaweriaIcon, StopwatchIcon, LeaderboardIcon, ExpandIcon, CompressIcon, EyeOffIcon, UsersIcon, DownloadIcon } from './components/Icons';
import { ConfirmModal } from './components/ConfirmModal';
import { ScrambleTypeSelector } from './components/ScrambleTypeSelector';
import { Logo } from './components/Logo';
import { ThemeToggle } from './components/ThemeToggle';
import { Background } from './components/Background';
import { useTouchControls } from './hooks/useTouchControls';
import { Rankings } from './components/Rankings';
import { RoomModal } from './components/RoomModal';
import { CompetitionModal } from './components/CompetitionModal';
import * as db from './utils/db';
import * as audioService from './services/audioService';
import type { Solve, TimerStatus, CubeType, Theme, User, Penalty, Room, Competition } from './types';
import { RunningTimerDisplay } from './components/RunningTimerDisplay';
import { FMCView } from './components/FMCView';
import { formatTime } from './utils/time';
import { FloatingHeader } from './components/FloatingHeader';

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
                <h3 className="text-xl sm:text-2xl font-bold mb-4">Select or Create User</h3>
                <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-2">
                    {users.map(user => (
                        <div key={user.id} className="flex items-center gap-2 group">
                            <button onClick={() => onSelectUser(user)} className="flex-grow text-left p-3 rounded-md bg-slate-900/5 dark:bg-white/5 hover:bg-slate-900/10 dark:hover:bg-white/10 active:bg-slate-900/20 dark:active:bg-white/20 transition-colors">
                                {user.name}
                            </button>
                            {user.id !== GUEST_USER.id && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteUser(user); }}
                                    className="p-2 -m-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 active:bg-red-400/20 rounded-full opacity-30 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200"
                                    aria-label={`Delete user ${user.name}`}
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    ))}
                    {users.length === 1 && <p className="text-slate-600 dark:text-slate-400 text-center py-4">No custom users found. Create one below!</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center">
                    <input 
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="New user name..."
                        className="bg-white/40 dark:bg-slate-800/40 border border-slate-900/10 dark:border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
    const [isInspectionEnabled, setIsInspectionEnabled] = useState(true);
    
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User>(GUEST_USER);
    const [isUserModalOpen, setUserModalOpen] = useState(false);
    const [view, setView] = useState<'session' | 'rankings'>('session');
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [activeRoom, setActiveRoom] = useState<Room | null>(null);
    const [isRoomModalOpen, setRoomModalOpen] = useState(false);
    const [activeCompetition, setActiveCompetition] = useState<Competition | null>(null);
    const [isCompetitionModalOpen, setCompetitionModalOpen] = useState(false);
    const [allCompetitionSolves, setAllCompetitionSolves] = useState<Solve[]>([]);
    const [viewingUserId, setViewingUserId] = useState<number>(currentUser.id);


    const [isScrolled, setIsScrolled] = useState(false);

    const timerInteractionAreaRef = useRef<HTMLElement>(null);
    const isInspectionTimeUp = useRef(false);

    const [inspectionTime, setInspectionTime] = useState(15);
    const inspectionIntervalRef = useRef<number | null>(null);

    const [isAudioInitialized, setIsAudioInitialized] = useState(false);

    // Effect to reset the participant view when the context changes
    useEffect(() => {
        setViewingUserId(currentUser.id);
    }, [currentUser.id, activeCompetition]);

    // Handle scroll for floating header
    useEffect(() => {
        const handleScroll = () => {
            const offset = 100;
            setIsScrolled(window.scrollY > offset);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
        const savedInspectionSetting = localStorage.getItem('inspectionEnabled');
        
        setIsFullScreenEnabled(savedFullScreenSetting !== 'false');
        setIsInspectionEnabled(savedInspectionSetting !== 'false');

        loadInitialData();
    }, []);
    
    useEffect(() => {
        localStorage.setItem('fullScreenEnabled', String(isFullScreenEnabled));
    }, [isFullScreenEnabled]);

    useEffect(() => {
        localStorage.setItem('inspectionEnabled', String(isInspectionEnabled));
    }, [isInspectionEnabled]);

    const handleSetRoom = (room: Room | null) => {
        if (room && activeCompetition) {
            handleSetCompetition(null); // End competition if joining a room
        }
        setActiveRoom(room);
        if (room) {
            localStorage.setItem('activeRoomCode', room.code);
        } else {
            localStorage.removeItem('activeRoomCode');
        }
        setRoomModalOpen(false);
    };

    const handleSetCompetition = (competition: Competition | null) => {
        if (competition && activeRoom) {
            handleSetRoom(null); // Leave room if starting a competition
        }
        setActiveCompetition(competition);
        if (competition) {
            localStorage.setItem('activeCompetition', JSON.stringify(competition));
        } else {
            localStorage.removeItem('activeCompetition');
        }
        setCompetitionModalOpen(false);
    };

    const loadInitialData = async () => {
        const userList = await db.getUsers();
        setUsers(userList);
        
        const lastUserId = localStorage.getItem('lastUserId');
        if (lastUserId) {
            const id = Number(lastUserId);
            if (id === GUEST_USER.id) {
                setCurrentUser(GUEST_USER);
            } else {
                const userToSelect = userList.find(u => u.id === id) || GUEST_USER;
                setCurrentUser(userToSelect);
            }
        }

        const lastRoomCode = localStorage.getItem('activeRoomCode');
        const savedCompetition = localStorage.getItem('activeCompetition');

        if (lastRoomCode) {
            const room = await db.getRoom(lastRoomCode);
            if (room) {
                setActiveRoom(room);
                if (savedCompetition) localStorage.removeItem('activeCompetition');
            } else {
                localStorage.removeItem('activeRoomCode');
            }
        } else if (savedCompetition) {
            try {
                setActiveCompetition(JSON.parse(savedCompetition));
            } catch (e) {
                console.error("Failed to parse competition data", e);
                localStorage.removeItem('activeCompetition');
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
    
    const fetchAllCompetitionSolves = useCallback(async () => {
        if (activeCompetition) {
            const allSolvesFromDb = await db.getAllSolves();
            const participantIds = new Set(activeCompetition.participantIds);
            const filtered = allSolvesFromDb.filter(s => participantIds.has(s.userId));
            setAllCompetitionSolves(filtered);
        } else {
            setAllCompetitionSolves([]);
        }
    }, [activeCompetition]);

    useEffect(() => {
        fetchAllCompetitionSolves();
    }, [fetchAllCompetitionSolves]);

    const loadNewScramble = useCallback(async (type: CubeType) => {
        setIsLoadingScramble(true);
        const scramble = await getNextScramble(type);
        setCurrentScramble(scramble);
        setIsLoadingScramble(false);
    }, []);
    
    const loadRoomScramble = useCallback(async (room: Room, type: CubeType) => {
        setIsLoadingScramble(true);
        try {
            const roomSolves = await db.getSolvesForRoom(room.code);
            const lastSolveForType = roomSolves
                .filter(solve => solve.cubeType === type)
                .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

            if (lastSolveForType) {
                setCurrentScramble(lastSolveForType.scramble);
            } else {
                // No solves for this puzzle in the room yet, generate the first one.
                const scramble = await getNextScramble(type);
                setCurrentScramble(scramble);
            }
        } catch (error) {
            console.error("Failed to load room scramble, falling back to new scramble.", error);
            const scramble = await getNextScramble(type);
            setCurrentScramble(scramble);
        } finally {
            setIsLoadingScramble(false);
        }
    }, []);
    
    const loadCompetitionScramble = useCallback(async (competition: Competition, type: CubeType) => {
        setIsLoadingScramble(true);
        const competitionScramble = competition.scrambles[type];
        if (competitionScramble) {
            setCurrentScramble(competitionScramble);
        } else {
            // Generate first scramble for this type in the competition
            const scramble = await getNextScramble(type);
            setCurrentScramble(scramble);

            const updatedCompetition = {
                ...competition,
                scrambles: {
                    ...competition.scrambles,
                    [type]: scramble,
                },
            };
            setActiveCompetition(updatedCompetition);
            localStorage.setItem('activeCompetition', JSON.stringify(updatedCompetition));
        }
        setIsLoadingScramble(false);
    }, []);

    useEffect(() => {
        if (activeRoom) {
            loadRoomScramble(activeRoom, cubeType);
        } else if (activeCompetition) {
            loadCompetitionScramble(activeCompetition, cubeType);
        } else {
            loadNewScramble(cubeType);
        }
    }, [cubeType, activeRoom, activeCompetition, loadNewScramble, loadRoomScramble, loadCompetitionScramble]);

    const handleCubeTypeChange = (newType: CubeType) => {
        if (newType !== cubeType) {
            setCubeType(newType);
        }
    };
    
    const handleNextCompetitionScramble = () => {
        if (!activeCompetition) return;
        
        const updatedScrambles = { ...activeCompetition.scrambles };
        delete updatedScrambles[cubeType]; // Remove scramble for current cube type

        const updatedCompetition = {
            ...activeCompetition,
            scrambles: updatedScrambles
        };
        
        // This will trigger the useEffect to call loadCompetitionScramble
        setActiveCompetition(updatedCompetition);
        localStorage.setItem('activeCompetition', JSON.stringify(updatedCompetition));
    };

    const handleSolveComplete = useCallback(async (solveTime: number) => {
        const newSolveData: Omit<Solve, 'id' | 'date'> = {
            time: isInspectionTimeUp.current ? 0 : solveTime,
            scramble: currentScramble,
            cubeType: cubeType,
            userId: currentUser.id,
            penalty: isInspectionTimeUp.current ? 'DNF' as Penalty : 'none' as Penalty,
            roomId: activeRoom?.code,
        };
        await db.addSolve(newSolveData);
        fetchUserSolves(currentUser.id);

        if (activeCompetition) {
            fetchAllCompetitionSolves();
        }

        // When a solve is complete, decide whether to fetch a new scramble
        if (activeRoom) {
             loadRoomScramble(activeRoom, cubeType);
        } else if (activeCompetition) {
            // In competition mode, the scramble remains the same until manually changed.
        } else {
            loadNewScramble(cubeType);
        }
    }, [currentUser.id, currentScramble, loadNewScramble, cubeType, fetchUserSolves, activeRoom, loadRoomScramble, activeCompetition, fetchAllCompetitionSolves]);
    
    const handleFmcComplete = useCallback(async (solveData: Omit<Solve, 'id' | 'date'>) => {
        await db.addSolve({...solveData, roomId: activeRoom?.code });
        alert(`FMC session saved!\nMoves: ${solveData.time}\nTime: ${formatTime(solveData.fmcTime ?? 0)}`);
        // The FMCView component handles its own reset, which calls onNewScramble
        fetchUserSolves(currentUser.id);
        if (activeCompetition) {
            fetchAllCompetitionSolves();
        }
    }, [currentUser.id, fetchUserSolves, activeRoom, activeCompetition, fetchAllCompetitionSolves]);

    // Manages the inspection timer lifecycle
    useEffect(() => {
        if (timerStatus === 'inspecting') {
            setInspectionTime(15);
            isInspectionTimeUp.current = false; // Reset flag

            const intervalId = window.setInterval(() => {
                setInspectionTime(prevTime => {
                    if (prevTime <= 1) { // Countdown reaches 0 (from 1)
                        if (inspectionIntervalRef.current) {
                           clearInterval(inspectionIntervalRef.current);
                           inspectionIntervalRef.current = null;
                        }
                        isInspectionTimeUp.current = true;
                        // The timer will now show 0, but the user can still proceed.
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
            
            inspectionIntervalRef.current = intervalId;

            return () => {
                if (inspectionIntervalRef.current) {
                    clearInterval(inspectionIntervalRef.current);
                    inspectionIntervalRef.current = null;
                }
            };
        }
    }, [timerStatus]);

    const handleInteractionStart = useCallback(() => {
        if (cubeType === '3x3 FMC') return;
        switch (timerStatus) {
            case 'running': {
                const finalTime = stop();
                // Go directly to idle to streamline the process for the next solve.
                setTimerStatus('idle');
                handleSolveComplete(finalTime);
                audioService.playStopSound();
                break;
            }
            case 'idle':
                if (isInspectionEnabled) {
                    setTimerStatus('inspecting');
                } else {
                    setTimerStatus('ready');
                    reset();
                }
                break;
            case 'inspecting':
                setTimerStatus('ready');
                reset();
                break;
            default:
                break;
        }
    }, [timerStatus, stop, reset, handleSolveComplete, cubeType, isInspectionEnabled]);

    const handleInteractionEnd = useCallback(() => {
        if (cubeType === '3x3 FMC') return;
        if (timerStatus === 'ready') {
            setTimerStatus('running');
            start();
            audioService.playStartSound();
        }
    }, [timerStatus, start, cubeType]);
    
    const deleteSolve = useCallback(async (id: number) => {
        await db.deleteSolve(id);
        fetchUserSolves(currentUser.id);
        if (activeCompetition) {
            fetchAllCompetitionSolves();
        }
    }, [currentUser.id, fetchUserSolves, activeCompetition, fetchAllCompetitionSolves]);
    
    const handleUpdateSolve = useCallback(async (solve: Solve) => {
        await db.updateSolve(solve);
        fetchUserSolves(currentUser.id);
        if (activeCompetition) {
            fetchAllCompetitionSolves();
        }
    }, [currentUser.id, fetchUserSolves, activeCompetition, fetchAllCompetitionSolves]);

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

    const handleExportSession = useCallback(() => {
        if (solves.length === 0) {
            alert("No session solves to export.");
            return;
        }
    
        const headers = ['Date & Time', 'Cube Type', 'Time', 'Penalty', 'Final Time/Moves', 'Scramble', 'FMC Solution', 'FMC Time'];
    
        const escapeCsvCell = (cell: string | number | null | undefined): string => {
            const cellStr = String(cell ?? '').replace(/"/g, '""');
            return `"${cellStr}"`;
        };
    
        const sortedSolves = [...solves].sort((a, b) => b.date.getTime() - a.date.getTime());
    
        const csvRows = [
            headers.join(','),
            ...sortedSolves.map(solve => {
                const penalty = solve.penalty || 'none';
                let finalTime: string | number;
                let rawTimeStr: string;
    
                if (solve.cubeType === '3x3 FMC') {
                    finalTime = solve.time; // move count
                    rawTimeStr = 'N/A';
                } else {
                    if (penalty === 'DNF') {
                        finalTime = 'DNF';
                    } else {
                        const penalizedTime = solve.time + (penalty === '+2' ? 2000 : 0);
                        finalTime = formatTime(penalizedTime);
                    }
                    rawTimeStr = formatTime(solve.time);
                }
    
                return [
                    solve.date.toLocaleString(),
                    solve.cubeType,
                    rawTimeStr,
                    penalty === 'none' ? '' : penalty,
                    finalTime,
                    solve.scramble,
                    solve.solution || '',
                    solve.fmcTime ? formatTime(solve.fmcTime) : ''
                ].map(escapeCsvCell).join(',');
            })
        ];
    
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const date = new Date();
        const dateString = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
        const filename = `rubiks_timer_session_${currentUser.name.replace(/\s/g, '_')}_${dateString}.csv`;
    
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [solves, currentUser.name]);

    const anyModalOpen = isConfirmModalOpen || isUserModalOpen || !!userToDelete || isRoomModalOpen || isCompetitionModalOpen;
    
    useKeyboardControls(handleInteractionStart, handleInteractionEnd, anyModalOpen || cubeType === '3x3 FMC');
    useTouchControls(timerInteractionAreaRef, handleInteractionStart, handleInteractionEnd, anyModalOpen || cubeType === '3x3 FMC');

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
           if (event.key === 'Escape') {
               if (userToDelete) {
                    handleCancelDeleteUser();
               } else if (isConfirmModalOpen) {
                    closeClearConfirmModal();
               } else if (isCompetitionModalOpen) {
                   setCompetitionModalOpen(false);
               } else if (isRoomModalOpen) {
                   setRoomModalOpen(false);
               } else if (isUserModalOpen) {
                   setUserModalOpen(false);
               } else if (timerStatus === 'inspecting') {
                   setTimerStatus('idle');
               }
           }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isConfirmModalOpen, closeClearConfirmModal, isUserModalOpen, userToDelete, timerStatus, isRoomModalOpen, isCompetitionModalOpen]);

    const getTimerColor = (): string => {
        switch (timerStatus) {
            case 'ready':
                return 'text-amber-600 dark:text-amber-400';
            case 'inspecting':
                if (inspectionTime <= 0) return 'text-red-600 dark:text-red-500';
                return 'text-amber-600 dark:text-amber-400';
            case 'running': return 'text-emerald-600 dark:text-emerald-400';
            default: return 'text-slate-900 dark:text-slate-100';
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
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 active:bg-slate-200/50 dark:active:bg-slate-800/50'
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
    const competitionName = useMemo(() => {
        if (!activeCompetition) return 'Competition';
        return activeCompetition.name.length > 12 ? activeCompetition.name.substring(0, 10) + '...' : activeCompetition.name;
    }, [activeCompetition]);

    return (
        <>
            <Background theme={theme} />
            <FloatingHeader
                isVisible={isScrolled && !(timerStatus === 'running' && isFullScreenEnabled)}
                theme={theme}
                toggleTheme={toggleTheme}
                cubeType={cubeType}
                onCubeTypeChange={handleCubeTypeChange}
                currentUser={currentUser}
                onUserModalOpen={() => setUserModalOpen(true)}
                activeRoom={activeRoom}
                onRoomModalOpen={() => setRoomModalOpen(true)}
                activeCompetition={activeCompetition}
                onCompetitionModalOpen={() => setCompetitionModalOpen(true)}
                competitionName={competitionName}
                disabled={mainControlsDisabled}
            />
            {timerStatus === 'running' && isFullScreenEnabled && <RunningTimerDisplay time={time} />}
            
            {/* This overlay captures any screen tap to stop the timer when it's running */}
            {timerStatus === 'running' && (
                <div
                    className="fixed inset-0 z-40 cursor-pointer"
                    onClick={handleInteractionStart}
                    onTouchStart={(e) => {
                        e.preventDefault();
                        handleInteractionStart();
                    }}
                />
            )}

            <div 
                className={`min-h-screen text-slate-900 dark:text-slate-200 flex flex-col items-center p-4 sm:p-8 selection:bg-sky-300/30 ${timerStatus === 'running' && isFullScreenEnabled ? 'invisible' : ''}`}
                tabIndex={-1}
            >
                <main className="w-full max-w-7xl flex-grow flex flex-col">
                    <header className="w-full flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <Logo />
                             <div className="hidden sm:block">
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">Rubik's Timer</h1>
                                <p className="text-xs text-slate-600 dark:text-slate-400">by Blitarian Speedcuber Brotherhood</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <button
                                onClick={() => setUserModalOpen(true)}
                                className="flex items-center gap-2 p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 active:bg-slate-300 dark:active:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Select user"
                                disabled={mainControlsDisabled}
                            >
                                <UserIcon />
                                <span className="font-medium hidden md:inline">{currentUser.name}</span>
                            </button>
                            <button
                                onClick={() => setCompetitionModalOpen(true)}
                                className="flex items-center gap-2 p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 active:bg-slate-300 dark:active:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Offline competition"
                                disabled={mainControlsDisabled}
                                title={activeCompetition ? `Competition: ${activeCompetition.name}`: 'Offline Competition'}
                            >
                                <UsersIcon />
                                <span className="font-medium hidden md:inline">{competitionName}</span>
                            </button>
                            <button
                                onClick={() => setRoomModalOpen(true)}
                                className="flex items-center gap-2 p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 active:bg-slate-300 dark:active:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Room management"
                                disabled={mainControlsDisabled}
                                title={activeRoom ? `Room: ${activeRoom.name}` : 'Room Management'}
                            >
                                <HashtagIcon />
                                <span className="font-medium hidden md:inline">{activeRoom?.name || 'Room'}</span>
                            </button>
                            <a
                                href="https://saweria.co/hariszaka1"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 p-2 rounded-full text-amber-600 dark:text-amber-500 hover:bg-amber-100 dark:hover:bg-slate-700/50 active:bg-amber-200 dark:active:bg-slate-700 transition-colors ${mainControlsDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                aria-label="Support me on Saweria"
                                title="Support me on Saweria"
                            >
                                <SaweriaIcon className="w-6 h-6" />
                                <span className="font-medium hidden md:inline">Support me</span>
                            </a>
                            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                        </div>
                    </header>
                    
                    <div className="w-full flex flex-col items-center gap-4 mb-4 text-center">
                        <ScrambleTypeSelector value={cubeType} onChange={handleCubeTypeChange} theme={theme} disabled={mainControlsDisabled}/>
                        {activeRoom && (
                            <div className="text-center -mt-2">
                                <p className="text-sm font-medium text-sky-600 dark:text-sky-400">
                                    Online Mode: Scramble is shared with room <span className="font-bold">{activeRoom.name}</span>.
                                </p>
                            </div>
                        )}
                        {activeCompetition && !activeRoom && (
                            <div className="text-center -mt-2">
                                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                    Competition Mode: <span className="font-bold">{activeCompetition.name}</span>
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-500">Scramble is shared for all participants on this device.</p>
                            </div>
                        )}
                        <ScrambleDisplay scramble={currentScramble} isLoading={isLoadingScramble} cubeType={cubeType} />
                        {cubeType !== '3x3 FMC' && (
                            <div className="mt-2 mx-auto flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
                                <button
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if (activeCompetition) {
                                            handleNextCompetitionScramble();
                                        } else if (activeRoom) {
                                            loadRoomScramble(activeRoom, cubeType);
                                        } else {
                                            loadNewScramble(cubeType);
                                        }
                                    }}
                                    disabled={isLoadingScramble || mainControlsDisabled}
                                    className="flex items-center gap-2 p-2 sm:px-4 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 active:bg-white/80 dark:active:bg-slate-800/90 backdrop-blur-sm border border-slate-900/10 dark:border-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-slate-800 dark:text-slate-200 font-medium"
                                    title="New Scramble"
                                >
                                    <RefreshIcon />
                                    <span className="hidden sm:inline">New Scramble</span>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsInspectionEnabled(prev => !prev); }}
                                    disabled={mainControlsDisabled}
                                    className="flex items-center gap-2 p-2 sm:px-4 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 active:bg-white/80 dark:active:bg-slate-800/90 backdrop-blur-sm border border-slate-900/10 dark:border-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-slate-800 dark:text-slate-200 font-medium"
                                    title={`${isInspectionEnabled ? 'Disable' : 'Enable'} 15s inspection`}
                                >
                                    {isInspectionEnabled ? <InspectionIcon /> : <EyeOffIcon />}
                                    <span className="hidden sm:inline">{isInspectionEnabled ? 'Inspection On' : 'Inspection Off'}</span>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsFullScreenEnabled(prev => !prev); }}
                                    disabled={mainControlsDisabled}
                                    className="flex items-center gap-2 p-2 sm:px-4 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 active:bg-white/80 dark:active:bg-slate-800/90 backdrop-blur-sm border border-slate-900/10 dark:border-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-slate-800 dark:text-slate-200 font-medium"
                                    title={`${isFullScreenEnabled ? 'Disable' : 'Enable'} fullscreen timer`}
                                >
                                    {isFullScreenEnabled ? <CompressIcon className="w-5 h-5" /> : <ExpandIcon className="w-5 h-5" />}
                                    <span className="hidden sm:inline">{isFullScreenEnabled ? 'Fullscreen On' : 'Fullscreen Off'}</span>
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
                            <div className="flex-grow flex flex-col items-center justify-center">
                                <section
                                    ref={timerInteractionAreaRef}
                                    className="flex flex-col items-center justify-center cursor-pointer p-4 rounded-lg"
                                >
                                    <TimerDisplay
                                        time={timerStatus === 'inspecting' ? inspectionTime * 1000 : time}
                                        className={`font-timer transition-colors duration-200 ${getTimerColor()}`}
                                        status={timerStatus}
                                    />
                                    {isTouchDevice && timerStatus === 'idle' && (
                                        <p className="mt-4 text-slate-600 dark:text-slate-400 animate-pulse text-center">
                                            Tap and hold this area to start
                                        </p>
                                    )}
                                </section>
                            </div>

                            <footer className="w-full mt-8">
                                <div className="flex justify-center border-b border-slate-900/10 dark:border-white/10 mb-4">
                                    <TabButton label="Session" icon={<StopwatchIcon className="w-5 h-5" />} activeView={view} targetView="session" />
                                    <TabButton label="Leaderboard" icon={<LeaderboardIcon className="w-5 h-5" />} activeView={view} targetView="rankings" />
                                </div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    {view === 'session' ? (
                                        <>
                                            <div className="lg:col-span-5">
                                                <Stats 
                                                    solves={filteredSolves} 
                                                    cubeType={cubeType}
                                                    activeCompetition={activeCompetition}
                                                    allCompetitionSolves={allCompetitionSolves}
                                                    users={[GUEST_USER, ...users]}
                                                    viewingUserId={viewingUserId}
                                                    currentUser={currentUser}
                                                />
                                            </div>
                                            <div className="lg:col-span-7">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200">Solve History ({cubeType})</h2>
                                                    <div className="flex items-center gap-4">
                                                        {!activeCompetition && solves.length > 0 && (
                                                            <button
                                                                onClick={handleExportSession}
                                                                className="flex items-center gap-2 text-sm text-sky-700 dark:text-sky-500 hover:text-sky-800 dark:hover:text-sky-600 active:bg-sky-500/10 dark:active:bg-sky-500/20 transition-all px-2 py-1 rounded-md -mx-2 -my-1"
                                                                title="Export all session data to CSV"
                                                            >
                                                                <DownloadIcon className="w-4 h-4" />
                                                                <span>Export All</span>
                                                            </button>
                                                        )}
                                                        {!activeCompetition && filteredSolves.length > 0 && (
                                                            <button
                                                                onClick={openClearConfirmModal}
                                                                className="flex items-center gap-2 text-sm text-red-700 dark:text-red-500 hover:text-red-800 dark:hover:text-red-600 active:bg-red-500/10 dark:active:bg-red-500/20 transition-all px-2 py-1 rounded-md -mx-2 -my-1"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                                <span>Clear History</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <SolveHistory 
                                                    solves={filteredSolves} 
                                                    onDelete={deleteSolve} 
                                                    onUpdate={handleUpdateSolve}
                                                    activeCompetition={activeCompetition}
                                                    competitionSolves={allCompetitionSolves}
                                                    users={[GUEST_USER, ...users]}
                                                    cubeType={cubeType}
                                                    viewingUserId={viewingUserId}
                                                    onViewingUserChange={setViewingUserId}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="lg:col-span-12">
                                            <Rankings activeRoom={activeRoom} activeCompetition={activeCompetition} />
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
                 <RoomModal
                    isOpen={isRoomModalOpen}
                    onClose={() => setRoomModalOpen(false)}
                    activeRoom={activeRoom}
                    onSetRoom={handleSetRoom}
                />
                <CompetitionModal
                    isOpen={isCompetitionModalOpen}
                    onClose={() => setCompetitionModalOpen(false)}
                    activeCompetition={activeCompetition}
                    onSetCompetition={handleSetCompetition}
                    onNextScramble={handleNextCompetitionScramble}
                    users={[GUEST_USER, ...users]}
                    solves={solves}
                    cubeType={cubeType}
                    theme={theme}
                />
            </div>
        </>
    );
}
