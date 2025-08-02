
import { useEffect, useCallback } from 'react';

export const useTouchControls = (onTouchStart: () => void, onTouchEnd: () => void, disabled = false) => {
    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (disabled) return;
        // Prevent default touch behavior like scrolling or zooming on the timer area
        e.preventDefault();
        onTouchStart();
    }, [onTouchStart, disabled]);

    const handleTouchEnd = useCallback((e: TouchEvent) => {
        if (disabled) return;
        e.preventDefault();
        onTouchEnd();
    }, [onTouchEnd, disabled]);

    useEffect(() => {
        // Use { passive: false } to allow preventDefault to work
        window.addEventListener('touchstart', handleTouchStart, { passive: false });
        window.addEventListener('touchend', handleTouchEnd, { passive: false });

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchEnd]);
};
