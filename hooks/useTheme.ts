import { useState, useEffect, useCallback } from 'react';
import type { Theme } from '../types';

export const useTheme = (): [Theme, () => void] => {
    const [theme, setTheme] = useState<Theme>(() => {
        // This function runs only on the initial render to prevent flickering.
        // It checks for a saved theme in localStorage and defaults to 'dark' if none is found.
        if (typeof window !== 'undefined') {
            const storedTheme = localStorage.getItem('theme') as Theme | null;
            return storedTheme || 'dark';
        }
        // Default for non-browser environments or if window is not available yet.
        return 'dark';
    });

    useEffect(() => {
        // This effect synchronizes the theme state with the DOM (by adding/removing the 'dark' class)
        // and persists the choice to localStorage.
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        
        if (typeof window !== 'undefined') {
            localStorage.setItem('theme', theme);
        }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    }, []);

    return [theme, toggleTheme];
};
