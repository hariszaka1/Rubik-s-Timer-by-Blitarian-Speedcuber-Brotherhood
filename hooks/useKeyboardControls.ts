
import { useEffect, useCallback } from 'react';

export const useKeyboardControls = (onKeyDown: () => void, onKeyUp: () => void, disabled = false) => {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (disabled) return;
        if (e.code === 'Space') {
            e.preventDefault();
            onKeyDown();
        }
    }, [onKeyDown, disabled]);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        if (disabled) return;
        if (e.code === 'Space') {
            e.preventDefault();
            onKeyUp();
        }
    }, [onKeyUp, disabled]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleKeyDown, handleKeyUp]);
};
