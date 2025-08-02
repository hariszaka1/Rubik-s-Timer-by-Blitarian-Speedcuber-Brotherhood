
import React from 'react';
import { formatTime } from '../utils/time';
import type { TimerStatus } from '../types';

interface TimerDisplayProps {
  time: number;
  className?: string;
  status: TimerStatus;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ time, className = '', status }) => {
  if (status === 'inspecting') {
    return (
      <div className={`text-center transition-colors duration-200 ${className}`}>
        <span 
          className="text-8xl sm:text-9xl md:text-[10rem] lg:text-[12rem] font-bold"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {Math.ceil(time / 1000)}
        </span>
      </div>
    );
  }

  const formattedTime = formatTime(time);
  const [integerPart, fractionalPart] = formattedTime.split('.');

  return (
    <div className="flex w-full items-center justify-center">
      <div 
        className={`text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] font-bold tracking-tight select-none ${className}`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        <span>{integerPart}</span>
        <span className="text-6xl sm:text-7xl md:text-8xl lg:text-[8rem]">.{fractionalPart}</span>
      </div>
    </div>
  );
};
