
import { GoogleGenAI, Type } from "@google/genai";
import { addScrambles, getScramble as getScrambleFromDb, getScrambleCount } from '../utils/db';
import { generateLocalScramble } from '../utils/cubeLogic';
import type { CubeType } from "../types";

const API_KEY = process.env.API_KEY;

const getAiClient = () => {
    if (!API_KEY) return null;
    return new GoogleGenAI({ apiKey: API_KEY });
};

const model = "gemini-2.5-flash";

const SCRAMBLE_BATCH_SIZE = 25;
const MIN_SCRAMBLE_BUFFER = 10;

const replenishmentPromises = new Map<CubeType, Promise<void>>();

const getWcaInfo = (type: CubeType): string => {
    switch (type) {
        case '2x2': return `A 2x2x2 cube.`;
        case '3x3': return `A 3x3x3 cube.`;
        case '3x3 BLD': return `A 3x3x3 cube for a blindfolded solve. The scramble is standard WCA notation.`;
        case '3x3 OH': return `A 3x3x3 cube for a one-handed solve. The scramble is a standard WCA notation for 3x3x3.`;
        case '3x3 FMC': return `A 3x3x3 cube for a fewest moves challenge. The scramble is a standard WCA notation for 3x3x3.`;
        case '4x4': return `A 4x4x4 cube. Use moves like 'Rw' for wide turns.`;
        case '4x4 BLD': return `A 4x4x4 cube for a blindfolded solve. The scramble is standard WCA notation with wide turns like 'Rw'.`;
        case '5x5': return `A 5x5x5 cube. Use moves like 'Uw' for wide turns.`;
        case '5x5 BLD': return `A 5x5x5 cube for a blindfolded solve. The scramble is standard WCA notation with wide turns like 'Uw'.`;
        case '6x6': return `A 6x6x6 cube. Use moves like '3Rw' for deep wide turns.`;
        case '7x7': return `A 7x7x7 cube. Use moves like '3Uw' for deep wide turns.`;
        case 'Megaminx': return `A dodecahedron-shaped puzzle. Scrambles consist of 'R' and 'D' moves with '++' or '--' modifiers, and 'U' or 'U\\'' moves.`;
        case 'Pyraminx': return `A tetrahedron-shaped puzzle. Moves include U, L, R, B and optional tip moves u, l, r, b.`;
        case 'Square-1': return `A cube that changes shape. Notation uses pairs of numbers in parentheses, separated by slashes, like (3,0) / (-1,-1).`;
        case 'Skewb': return `A corner-turning cube. Moves include U, L, R, B.`;
        case 'Clock': return 'A Rubik\'s Clock puzzle. Scrambles consist of pin settings (UR, DR, DL, UL), wheel turns (U, R, D, L, ALL), and a y2 rotation in the middle. Example format: UR1+ DR2+ ... ALL3+ y2 UR4+ ... ALL5+';
        default: return `A 3x3x3 cube.`;
    }
}

async function fetchAndStoreScrambles(type: CubeType): Promise<void> {
    const ai = getAiClient();
    if (!ai) {
        throw new Error("Attempted to fetch scrambles without an API key.");
    }

    try {
        console.log(`Fetching new batch of ${type} scrambles from API...`);
        const prompt = `
Generate a list of ${SCRAMBLE_BATCH_SIZE} standard ${type} Rubik's Cube scramble sequences using official WCA notation.
${getWcaInfo(type)}
`;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        scrambles: {
                            type: Type.ARRAY,
                            description: `An array of ${SCRAMBLE_BATCH_SIZE} unique and valid WCA scrambles for a ${type} cube.`,
                            items: {
                                type: Type.STRING,
                                description: `A single valid WCA scramble for a ${type} cube.`
                            }
                        }
                    },
                    required: ["scrambles"]
                }
            }
        });
        
        const rawText = response.text.trim();
        const responseJson = JSON.parse(rawText);
        const scrambles = responseJson.scrambles;

        if (!scrambles || !Array.isArray(scrambles) || scrambles.length === 0) {
            throw new Error("API returned invalid data format or empty scrambles array.");
        }

        // A more general validation regex for various WCA notations
        const validScrambles = scrambles.filter(s => typeof s === 'string' && s.length > 5 && /^[RLUDFBw'23ulrby0-9(),/+\- ]+$/i.test(s));
        
        if (validScrambles.length > 0) {
            await addScrambles(validScrambles, type);
            console.log(`Added ${validScrambles.length} new ${type} scrambles to the database.`);
        } else {
            console.warn(`API returned ${type} scrambles, but none passed validation.`);
        }
    } catch (error) {
        console.error(`Error fetching and storing ${type} scrambles:`, error);
        throw new Error(`Failed to generate and store ${type} scrambles from Gemini API.`);
    }
}

function replenishIfNeeded(type: CubeType): Promise<void> {
    if (replenishmentPromises.has(type)) {
        return replenishmentPromises.get(type)!;
    }

    const promise = (async () => {
        if (!getAiClient()) {
            return;
        }

        try {
            const count = await getScrambleCount(type);
            if (count < MIN_SCRAMBLE_BUFFER) {
                await fetchAndStoreScrambles(type);
            }
        } catch (error) {
            console.error(`Failed to replenish ${type} scramble buffer:`, error);
            throw error;
        } finally {
            replenishmentPromises.delete(type);
        }
    })();
    
    replenishmentPromises.set(type, promise);
    return promise;
}

export async function getNextScramble(type: CubeType): Promise<string> {
    const dbScramble = await getScrambleFromDb(type);

    replenishIfNeeded(type).catch(err => {
        console.warn(`Background ${type} scramble replenishment failed.`, err.message);
    });

    if (dbScramble) {
        return dbScramble;
    }
    
    try {
        // Wait for the replenishment attempt to finish.
        await replenishIfNeeded(type);
        const newDbScramble = await getScrambleFromDb(type);
        if (newDbScramble) {
            return newDbScramble;
        }
    } catch (err) {
        console.warn(`Foreground ${type} replenishment failed, falling back to local generation.`, err.message);
    }
    
    console.log(`Using local scramble generator for ${type} as primary or fallback.`);
    return generateLocalScramble(type);
}