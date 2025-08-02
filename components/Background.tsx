
import React from 'react';
import type { Theme } from '../types';

export const Background: React.FC<{ theme: Theme }> = ({ theme }) => {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden">
            <div className={`absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-50 dark:opacity-30 mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob -translate-x-10 -translate-y-10 ${
                theme === 'light' 
                ? 'bg-gradient-to-r from-pink-300 via-orange-200 to-yellow-200'
                : 'bg-gradient-to-r from-pink-400 via-sky-400 to-white'
            }`}></div>
            <div className={`absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full opacity-50 dark:opacity-30 mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob animation-delay-4000 translate-x-10 translate-y-10 ${
                 theme === 'light'
                 ? 'bg-gradient-to-r from-sky-300 via-teal-200 to-lime-200'
                 : 'bg-gradient-to-r from-sky-300 via-white to-pink-300'
            }`}></div>
        </div>
    );
};