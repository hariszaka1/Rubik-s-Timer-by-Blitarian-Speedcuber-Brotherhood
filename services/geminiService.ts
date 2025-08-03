
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

// Fetch more scrambles less often to reduce API calls and avoid hitting rate limits.
const SCRAMBLE_BATCH_SIZE = 50;
const MIN_SCRAMBLE_BUFFER = 20;

const replenishmentPromises = new Map<CubeType, Promise<void>>();

// Variables to manage exponential backoff for API calls
let apiCoolDownUntil = 0;
const INITIAL_BACKOFF_MS = 5000; // Start with 5 seconds, suitable for free tier limits
const MAX_BACKOFF_MS = 60000; // Max backoff of 1 minute
let currentBackoff = INITIAL_BACKOFF_MS;

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
    // Check if we are in a cool-down period due to rate limiting
    if (Date.now() < apiCoolDownUntil) {
        console.warn(`API is in cool-down. Skipping scramble fetch for ${type}.`);
        return;
    }

    const ai = getAiClient();
    if (!ai) {
        console.log("Gemini API key not configured. Skipping online scramble fetch.");
        return;
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
        
        // If the API call was successful, reset the backoff state.
        apiCoolDownUntil = 0;
        currentBackoff = INITIAL_BACKOFF_MS;
        
        const rawText = response.text?.trim();
        if (!rawText) {
             console.warn(`API returned an empty response for ${type}.`);
             return;
        }

        let responseJson;
        try {
            responseJson = JSON.parse(rawText);
        } catch (e) {
            console.error(`Failed to parse JSON response from API for ${type}. Response text:`, rawText);
            return;
        }

        const scrambles = responseJson.scrambles;

        if (!scrambles || !Array.isArray(scrambles) || scrambles.length === 0) {
            console.warn("API returned invalid data format or empty scrambles array.");
            return;
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
        
        // Check if the error is a rate limit error (429) and apply backoff.
        const errorMessage = JSON.stringify(error); // Stringify to catch nested properties
        if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
            console.warn(`Rate limit hit. Activating API cool-down for ${currentBackoff / 1000} seconds.`);
            apiCoolDownUntil = Date.now() + currentBackoff;
            // Increase backoff for the next time it's triggered.
            currentBackoff = Math.min(currentBackoff * 2, MAX_BACKOFF_MS);
        }
        
        // Do not re-throw the error. This allows the application to gracefully fall back
        // to the local scramble generator if the API is unavailable or rate-limited.
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
            // Do not re-throw, to allow fallback to local generator
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
        // This catch is a safeguard, but errors within replenishIfNeeded are now handled internally.
        console.warn(`Background ${type} scramble replenishment failed.`, err.message);
    });

    if (dbScramble) {
        return dbScramble;
    }
    
    try {
        // Wait for any ongoing replenishment attempt to finish.
        // This won't throw an error on API failure because we handled it inside.
        await replenishIfNeeded(type);
        const newDbScramble = await getScrambleFromDb(type);
        if (newDbScramble) {
            return newDbScramble;
        }
    } catch (err) {
        // This catch is for unexpected errors in DB access or promise management, not the API.
        console.warn(`Foreground ${type} replenishment failed, falling back to local generation.`, err.message);
    }
    
    console.log(`Using local scramble generator for ${type} as primary or fallback.`);
    return generateLocalScramble(type);
}
