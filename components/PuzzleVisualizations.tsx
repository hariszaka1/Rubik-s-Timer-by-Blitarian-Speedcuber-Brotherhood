import React, { useMemo } from 'react';
import { getShuffledColors, PUZZLE_COLORS, createScramblePrng, shuffleWithPrng, hashCode } from '../utils/visualizationUtils';

interface PuzzleVisualizationProps {
    className?: string;
    scramble: string;
}

const STROKE_COLOR = "rgba(15, 23, 42, 0.7)"; // slate-900 with opacity
const STROKE_WIDTH = "0.5";

export const MegaminxVisualization: React.FC<PuzzleVisualizationProps> = ({ className, scramble }) => {
    const faceColors = useMemo(() => {
        const megaminxColorPalette = [
            PUZZLE_COLORS.W, PUZZLE_COLORS.PU, PUZZLE_COLORS.B, PUZZLE_COLORS.R, PUZZLE_COLORS.G, PUZZLE_COLORS.Y,
            PUZZLE_COLORS.CR, PUZZLE_COLORS.LB, PUZZLE_COLORS.O, PUZZLE_COLORS.LG, PUZZLE_COLORS.PK, PUZZLE_COLORS.GY
        ];
        // Ensure we have 12 colors for 12 faces
        while(megaminxColorPalette.length < 12) {
            megaminxColorPalette.push(...Object.values(PUZZLE_COLORS));
        }
        return getShuffledColors(scramble, megaminxColorPalette.slice(0, 12));
    }, [scramble]);

    const PENTAGON_POINTS = "0,-22 20.9,-11 12.9,18 -12.9,18 -20.9,-11";

    // This layout is designed to visually replicate the common 2D net of a dodecahedron.
    // The coordinates and rotations are hand-tuned to create the desired appearance.
    const layout = [
        // Central U and F faces
        { x: 0, y: -19, r: 180 },     // U Face
        { x: 0, y: 21, r: 0 },       // F Face

        // Ring around U
        { x: -38.5, y: 1, r: -72 },    // Left of U
        { x: 38.5, y: 1, r: 72 },     // Right of U
        { x: -23.8, y: -54.2, r: -144 },// Top-Left of U
        { x: 23.8, y: -54.2, r: 144 }, // Top-Right of U

        // Outer ring attached to the first ring
        { x: -62.3, y: -18, r: -108 }, // Outer Top-Left
        { x: 62.3, y: -18, r: 108 },  // Outer Top-Right
        { x: 77, y: 22, r: 72 },     // Far Right
        { x: -77, y: 22, r: -72 },    // Far Left
        { x: 38.5, y: 61, r: 36 },     // Bottom-Right of F
        { x: -38.5, y: 61, r: -36 },   // Bottom-Left of F
    ];

    return (
        <svg viewBox="-115 -95 230 170" className={className} stroke={STROKE_COLOR} strokeWidth={STROKE_WIDTH} strokeLinejoin="round">
            <g>
                {layout.map((pos, i) => (
                    <polygon
                        key={i}
                        points={PENTAGON_POINTS}
                        transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.r})`}
                        fill={faceColors[i]}
                    />
                ))}
            </g>
            <text
                x={0}
                y={5}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={24}
                fontWeight="bold"
                paintOrder="stroke"
                strokeWidth="1.6"
                className="fill-slate-800/50 stroke-slate-50/70 dark:fill-slate-200/60 dark:stroke-slate-900/60"
                style={{ fontFamily: 'Poppins, sans-serif', pointerEvents: 'none' }}
            >
                Not Available
            </text>
        </svg>
    );
};


export const PyraminxVisualization: React.FC<PuzzleVisualizationProps> = ({ className, scramble }) => {
    const colors = useMemo(() => {
         const pyraminxColorPalette = [PUZZLE_COLORS.R, PUZZLE_COLORS.G, PUZZLE_COLORS.B, PUZZLE_COLORS.Y];
         return getShuffledColors(scramble, pyraminxColorPalette);
    }, [scramble]);
    
    // Divide each face into 4 triangles (1 center, 3 edge tips)
    const getSubColors = (faceColor: string) => {
        const subPalette = [faceColor, colors[(colors.indexOf(faceColor) + 1) % 4], colors[(colors.indexOf(faceColor) + 2) % 4], colors[(colors.indexOf(faceColor) + 3) % 4]];
        return getShuffledColors(scramble + faceColor, subPalette);
    };

    const face1SubColors = getSubColors(colors[0]);
    const face2SubColors = getSubColors(colors[1]);
    const face3SubColors = getSubColors(colors[2]);

    return (
        <svg viewBox="0 0 100 100" className={className} stroke={STROKE_COLOR} strokeWidth={STROKE_WIDTH} strokeLinejoin="round">
            <g transform="translate(50 55) scale(1.1)">
                {/* Face 1 (Top) */}
                <g>
                    <polygon points="0,-22.5 13,-2.5 -13,-2.5" fill={face1SubColors[0]} />
                    <polygon points="0,-42.5 13,-22.5 -13,-22.5" fill={face1SubColors[1]} />
                    <polygon points="13,-2.5 26,17.5 0,-2.5" fill={face1SubColors[2]} />
                    <polygon points="-13,-2.5 0,-2.5 -26,17.5" fill={face1SubColors[3]} />
                </g>
                {/* Face 2 (Left) */}
                <g transform="rotate(-120) translate(0, 20) rotate(120)">
                    <polygon points="-26,17.5 -13,-2.5 -39,-2.5" fill={face2SubColors[0]} />
                    <polygon points="-13,-2.5 -26,17.5 0,17.5" fill={face2SubColors[1]} />
                    <polygon points="-39,-2.5 -52,-22.5 -26,-2.5" fill={face2SubColors[2]} />
                    <polygon points="-26,17.5 -39,37.5 -13,17.5" fill={face2SubColors[3]} />
                </g>
                 {/* Face 3 (Right) */}
                 <g transform="rotate(120) translate(0, 20) rotate(-120)">
                    <polygon points="26,17.5 39,-2.5 13,-2.5" fill={face3SubColors[0]} />
                    <polygon points="13,-2.5 0,17.5 26,17.5" fill={face3SubColors[1]} />
                    <polygon points="39,-2.5 26,-2.5 52,-22.5" fill={face3SubColors[2]} />
                    <polygon points="26,17.5 13,17.5 39,37.5" fill={face3SubColors[3]} />
                </g>
            </g>
            <text
                x={50}
                y={55}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={14}
                fontWeight="bold"
                paintOrder="stroke"
                strokeWidth="1"
                className="fill-slate-800/50 stroke-slate-50/70 dark:fill-slate-200/60 dark:stroke-slate-900/60"
                style={{ fontFamily: 'Poppins, sans-serif', pointerEvents: 'none' }}
            >
                Not Available
            </text>
        </svg>
    );
};


export const Square1Visualization: React.FC<PuzzleVisualizationProps> = ({ className, scramble }) => {
    const { shapes, colors, sliceCut } = useMemo(() => {
        const random = createScramblePrng(scramble);

        const shapeData = [
            'M -30,0 A 30 30 0 0 1 30 0 L 22.5,0 A 22.5 22.5 0 0 0 -22.5 0 Z', // Scallop
            'M -20,-20 L 20,-20 L 30,0 L -30,0 Z', // Trapezoid
            'M -30,0 L 0,-25 L 30,0 Z', // Triangle Wedge
            'M -30,-20 L 30,-20 L 30,0 L -30,0 Z', // Rectangle
        ];
        
        const topShapeIndex = Math.floor(random() * shapeData.length);
        const bottomShapeIndex = Math.floor(random() * shapeData.length);
        const shapes = { top: shapeData[topShapeIndex], bottom: shapeData[bottomShapeIndex] };

        // Use the same PRNG to shuffle colors
        const sq1SliceColors = [PUZZLE_COLORS.R, PUZZLE_COLORS.G, PUZZLE_COLORS.B, PUZZLE_COLORS.O];
        const colors = shuffleWithPrng(random, sq1SliceColors);
        
        // Use the same PRNG to determine the cut
        const sliceCut = 15 + Math.floor(random() * 40); // Random width between 15 and 55 (total width is 70)

        return { shapes, colors, sliceCut };
    }, [scramble]);

    return (
        <svg viewBox="-50 -50 100 100" className={className} stroke={STROKE_COLOR} strokeWidth={STROKE_WIDTH}>
            {/* Top Layer */}
            <path d={shapes.top} transform="translate(0, -15)" fill={PUZZLE_COLORS.W} />
            {/* Bottom Layer */}
            <path d={shapes.bottom} transform="translate(0, 15) scale(1, -1)" fill={PUZZLE_COLORS.Y} />
            {/* Middle Layer Slice */}
             <rect x="-35" y="-5" width="70" height="10" rx="2" fill={colors[0]} />
             <rect x="-35" y="-5" width={sliceCut} height="10" rx="2" fill={colors[1]} />
            <text
                x={0}
                y={0}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={14}
                fontWeight="bold"
                paintOrder="stroke"
                strokeWidth="1"
                className="fill-slate-800/50 stroke-slate-50/70 dark:fill-slate-200/60 dark:stroke-slate-900/60"
                style={{ fontFamily: 'Poppins, sans-serif', pointerEvents: 'none' }}
            >
                Not Available
            </text>
        </svg>
    );
};


export const SkewbVisualization: React.FC<PuzzleVisualizationProps> = ({ className, scramble }) => {
    const colors = useMemo(() => {
        const skewbColorPalette = [PUZZLE_COLORS.W, PUZZLE_COLORS.R, PUZZLE_COLORS.B, PUZZLE_COLORS.Y, PUZZLE_COLORS.G, PUZZLE_COLORS.O];
        return getShuffledColors(scramble, skewbColorPalette);
    }, [scramble]);

    return (
        <svg viewBox="-50 -50 100 100" className={className} stroke={STROKE_COLOR} strokeWidth={STROKE_WIDTH} strokeLinejoin="round">
            <g transform="scale(1.2)">
                {/* Center pieces */}
                <polygon points="0,0 -25,-14.4 -0,-28.8 25,-14.4" fill={colors[0]} /> {/* Top */}
                <polygon points="0,0 -25,-14.4 -25,14.4 0,28.8" fill={colors[1]} /> {/* Left */}
                <polygon points="0,0 25,-14.4 25,14.4 0,28.8" fill={colors[2]} /> {/* Right */}

                {/* Corner pieces (3 visible faces) */}
                {/* Top-Left-Front corner */}
                <polygon points="-25,-14.4 -25,14.4 -37.5,7.2" fill={colors[3]} />
                <polygon points="-25,-14.4 0,-28.8 -12.5,-36" fill={colors[4]} />
                <polygon points="-25,-14.4 -12.5,-36 -37.5,7.2" fill={colors[5]} />
                
                {/* Top-Right-Front corner */}
                <polygon points="25,-14.4 25,14.4 37.5,7.2" fill={colors[1]} />
                <polygon points="25,-14.4 0,-28.8 12.5,-36" fill={colors[2]} />
                <polygon points="25,-14.4 12.5,-36 37.5,7.2" fill={colors[0]} />
                
                {/* Bottom-Front corner */}
                 <polygon points="0,28.8 -25,14.4 -12.5,21.6" fill={colors[4]} />
                 <polygon points="0,28.8 25,14.4 12.5,21.6" fill={colors[5]} />
                 <polygon points="0,28.8 -12.5,21.6 0,36 12.5,21.6" fill={colors[3]} />
            </g>
            <text
                x={0}
                y={0}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={14}
                fontWeight="bold"
                paintOrder="stroke"
                strokeWidth="1"
                className="fill-slate-800/50 stroke-slate-50/70 dark:fill-slate-200/60 dark:stroke-slate-900/60"
                style={{ fontFamily: 'Poppins, sans-serif', pointerEvents: 'none' }}
            >
                Not Available
            </text>
        </svg>
    );
};

export const ClockVisualization: React.FC<PuzzleVisualizationProps> = ({ className, scramble }) => {
    const { colors, rotations } = useMemo(() => {
        const colorPalette = [
            PUZZLE_COLORS.W, PUZZLE_COLORS.Y, PUZZLE_COLORS.B, PUZZLE_COLORS.G,
            PUZZLE_COLORS.R, PUZZLE_COLORS.O, PUZZLE_COLORS.PK, PUZZLE_COLORS.LB, PUZZLE_COLORS.LG
        ];
        const shuffled = getShuffledColors(scramble, colorPalette);
        const random = createScramblePrng(scramble);
        const rots = Array.from({length: 9}, () => Math.floor(random() * 12) * 30);
        return { colors: shuffled, rotations: rots };
    }, [scramble]);

    return (
        <svg viewBox="-50 -50 100 100" className={className} stroke="currentColor" strokeWidth="0.5">
            <g className="text-slate-900/70 dark:text-slate-200/70">
                {[-30, 0, 30].map((y, i) =>
                    [-30, 0, 30].map((x, j) => {
                        const index = i * 3 + j;
                        return (
                            <g key={index} transform={`translate(${x}, ${y})`}>
                                <circle cx="0" cy="0" r="12" fill={colors[index]} strokeWidth="0.8" />
                                <line x1="0" y1="0" x2="0" y2="-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${rotations[index]})`} />
                            </g>
                        )
                    })
                )}
            </g>
             <text
                x={0}
                y={0}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={14}
                fontWeight="bold"
                paintOrder="stroke"
                strokeWidth="1"
                className="fill-slate-800/50 stroke-slate-50/70 dark:fill-slate-200/60 dark:stroke-slate-900/60"
                style={{ fontFamily: 'Poppins, sans-serif', pointerEvents: 'none' }}
            >
                Not Available
            </text>
        </svg>
    );
};