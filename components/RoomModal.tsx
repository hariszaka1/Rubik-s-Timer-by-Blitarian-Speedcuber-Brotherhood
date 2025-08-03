
import React, { useState, useEffect } from 'react';
import * as db from '../utils/db';
import type { Room } from '../types';
import { ClipboardIcon, CheckIcon } from './Icons';

interface RoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeRoom: Room | null;
    onSetRoom: (room: Room | null) => void;
}

export const RoomModal: React.FC<RoomModalProps> = ({ isOpen, onClose, activeRoom, onSetRoom }) => {
    const [joinCode, setJoinCode] = useState('');
    const [createName, setCreateName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setError('');
            setJoinCode('');
            setCreateName('');
            setIsLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCreateRoom = async () => {
        if (!createName.trim()) {
            setError("Room name cannot be empty.");
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const newRoom = await db.addRoom(createName.trim());
            onSetRoom(newRoom);
        } catch (err) {
            console.error(err);
            setError("Failed to create room. Please try again.");
        }
        setIsLoading(false);
    };

    const handleJoinRoom = async () => {
        const code = joinCode.trim().toUpperCase();
        if (!code) {
            setError("Room code cannot be empty.");
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const room = await db.getRoom(code);
            if (room) {
                onSetRoom(room);
            } else {
                setError("Room not found. Check the code and try again.");
            }
        } catch (err) {
            console.error(err);
            setError("Failed to join room. Please try again.");
        }
        setIsLoading(false);
    };

    const handleLeaveRoom = () => {
        onSetRoom(null);
    };

    const handleCopyCode = () => {
        if (!activeRoom) return;
        navigator.clipboard.writeText(activeRoom.code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
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
                className="bg-slate-100/80 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-900/10 dark:border-white/20 rounded-lg p-6 sm:p-8 w-full max-w-md text-slate-900 dark:text-slate-200 shadow-2xl m-4"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-2xl font-bold mb-6 text-center">Room Management</h3>

                {activeRoom ? (
                    <div className="text-center">
                        <p className="text-slate-600 dark:text-slate-400">You are in the room:</p>
                        <p className="text-2xl font-bold text-sky-600 dark:text-sky-400 my-2">{activeRoom.name}</p>
                        <div className="my-4 p-3 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center gap-4">
                            <span className="font-mono text-3xl tracking-widest">{activeRoom.code}</span>
                            <button onClick={handleCopyCode} className="p-2 rounded-full hover:bg-slate-300 dark:hover:bg-slate-700 active:bg-slate-400 dark:active:bg-slate-600 transition-colors" aria-label="Copy room code">
                                {copied ? <CheckIcon className="text-green-500" /> : <ClipboardIcon />}
                            </button>
                        </div>
                        <button onClick={handleLeaveRoom} className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-lg transition-colors">
                            Leave Room
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Join Room Section */}
                        <div className="space-y-2">
                            <h4 className="font-semibold text-lg">Join a Room</h4>
                             <input 
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                placeholder="Enter 6-character code..."
                                className={inputClass}
                                maxLength={6}
                                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                                disabled={isLoading}
                            />
                            <button onClick={handleJoinRoom} disabled={isLoading || !joinCode.trim()} className={`${buttonClass} bg-sky-600 hover:bg-sky-700 active:bg-sky-800`}>
                                {isLoading ? 'Joining...' : 'Join'}
                            </button>
                        </div>
                        
                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-slate-300 dark:border-slate-700"></div>
                            <span className="flex-shrink mx-4 text-slate-500 dark:text-slate-400">OR</span>
                            <div className="flex-grow border-t border-slate-300 dark:border-slate-700"></div>
                        </div>

                        {/* Create Room Section */}
                        <div className="space-y-2">
                            <h4 className="font-semibold text-lg">Create a New Room</h4>
                            <input 
                                type="text"
                                value={createName}
                                onChange={(e) => setCreateName(e.target.value)}
                                placeholder="Enter a room name..."
                                className={inputClass}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                                disabled={isLoading}
                            />
                             <button onClick={handleCreateRoom} disabled={isLoading || !createName.trim()} className={`${buttonClass} bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800`}>
                                {isLoading ? 'Creating...' : 'Create & Join'}
                            </button>
                        </div>
                    </div>
                )}
                {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
            </div>
        </div>
    );
};
