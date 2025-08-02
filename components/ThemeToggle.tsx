
import React from 'react';
import { SunIcon, MoonIcon } from './Icons';
import type { Theme } from '../types';

interface ThemeToggleProps {
    theme: Theme;
    toggleTheme: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => {
    return (
        <button
            onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
            className="p-2 rounded-full text-black dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50 active:bg-slate-300 dark:active:bg-slate-700 transition-colors"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </button>
    );
};