import React from 'react';
import { formatTime } from '../utils/time';

interface RunningTimerDisplayProps {
    time: number;
}

export const RunningTimerDisplay: React.FC<RunningTimerDisplayProps> = ({ time }) => {
    const rawFormattedTime = formatTime(time);
    
    // For sub-minute times, change "05.12" to "5.12" to match the image.
    const displayedTime = rawFormattedTime.includes(':') 
        ? rawFormattedTime 
        : rawFormattedTime.replace(/^0(\d\.)/, '$1');

    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-[#f0fdd9] dark:bg-black font-timer"
            style={{ 
                fontVariantNumeric: 'tabular-nums' 
            }}
        >
            <span className="text-black dark:text-[#f0fdd9] text-[25vw] leading-none font-bold select-none">
                {displayedTime}
            </span>
        </div>
    );
};