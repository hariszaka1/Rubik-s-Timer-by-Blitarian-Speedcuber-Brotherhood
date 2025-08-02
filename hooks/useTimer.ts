
import { useState, useRef, useCallback } from 'react';

export const useTimer = () => {
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const animationFrameId = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);

    const runTimer = useCallback((timestamp: number) => {
        if (startTimeRef.current === null) {
            startTimeRef.current = timestamp;
        }
        const elapsedTime = timestamp - startTimeRef.current;
        setTime(elapsedTime);
        animationFrameId.current = requestAnimationFrame(runTimer);
    }, []);

    const start = useCallback(() => {
        if (!isRunning) {
            setIsRunning(true);
            startTimeRef.current = null;
            animationFrameId.current = requestAnimationFrame(runTimer);
        }
    }, [isRunning, runTimer]);

    const stop = useCallback((): number => {
        if (isRunning) {
            setIsRunning(false);
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        }
        return time;
    }, [isRunning, time]);

    const reset = useCallback(() => {
        setTime(0);
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
        setIsRunning(false);
    }, []);

    return { time, start, stop, reset };
};
