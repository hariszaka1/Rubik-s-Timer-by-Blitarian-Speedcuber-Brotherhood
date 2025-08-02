import React from 'react';

export const Logo: React.FC = () => (
    <svg 
        className="w-12 h-12 transform transition-transform duration-300 ease-out hover:rotate-[-15deg] hover:scale-110"
        viewBox="0 0 100 100"
        aria-label="Rubik's Timer Logo"
    >
        <g transform="translate(50, 55) rotate(45) scale(1.4)">
            {/* Top face (White in light, Yellow in dark) */}
            <path
                d="M 0,-25 L 21.65,-12.5 L 0,0 L -21.65,-12.5 Z"
                className="fill-white dark:fill-yellow-400 stroke-slate-800 dark:stroke-black"
                strokeWidth="2"
                strokeLinejoin="round"
            />
            {/* Left face (Orange) */}
            <path
                d="M -21.65,-12.5 L 0,0 L 0,25 L -21.65,12.5 Z"
                className="fill-orange-500 stroke-slate-800 dark:stroke-black"
                strokeWidth="2"
                strokeLinejoin="round"
            />
            {/* Right face (Red) */}
            <path
                d="M 21.65,-12.5 L 0,0 L 0,25 L 21.65,12.5 Z"
                className="fill-red-600 stroke-slate-800 dark:stroke-black"
                strokeWidth="2"
                strokeLinejoin="round"
            />
        </g>
    </svg>
);