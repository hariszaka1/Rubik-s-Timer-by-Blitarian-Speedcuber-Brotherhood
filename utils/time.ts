
export const formatTime = (timeInMs: number): string => {
    if (timeInMs < 0) return '0.00';

    const totalSeconds = Math.floor(timeInMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((timeInMs % 1000) / 10);

    const secondsStr = seconds.toString().padStart(2, '0');
    const millisecondsStr = milliseconds.toString().padStart(2, '0');
    
    if (minutes > 0) {
        const minutesStr = minutes.toString();
        return `${minutesStr}:${secondsStr}.${millisecondsStr}`;
    }

    return `${seconds}.${millisecondsStr}`;
};
