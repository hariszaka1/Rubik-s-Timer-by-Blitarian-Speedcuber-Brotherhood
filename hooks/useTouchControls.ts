
import { useEffect, useCallback, RefObject } from 'react';

export const useTouchControls = (
    targetRef: RefObject<HTMLElement>,
    onTouchStart: () => void,
    onTouchEnd: () => void,
    disabled = false
) => {
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
        const element = targetRef.current;
        if (!element) return;

        // Use { passive: false } to allow preventDefault to work
        element.addEventListener('touchstart', handleTouchStart, { passive: false });
        element.addEventListener('touchend', handleTouchEnd, { passive: false });

        return () => {
            if (element) {
                element.removeEventListener('touchstart', handleTouchStart);
                element.removeEventListener('touchend', handleTouchEnd);
            }
        };
    }, [targetRef, handleTouchStart, handleTouchEnd]);
};
