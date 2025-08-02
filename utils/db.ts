
import type { CubeType, User, Solve, Penalty } from '../types';

const DB_NAME = 'rubiks-timer-db';
const DB_VERSION = 3;
const SCRAMBLE_STORE = 'scrambles';
const USERS_STORE = 'users';
const SOLVES_STORE = 'solves';
const SCRAMBLE_TYPE_INDEX = 'type_index';
const SOLVE_USER_INDEX = 'user_index';

let db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error("Error opening IndexedDB:", request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const dbInstance = (event.target as IDBOpenDBRequest).result;
            const oldVersion = event.oldVersion;

            if (oldVersion < 2) {
                if (dbInstance.objectStoreNames.contains(SCRAMBLE_STORE)) {
                    dbInstance.deleteObjectStore(SCRAMBLE_STORE);
                }
                const store = dbInstance.createObjectStore(SCRAMBLE_STORE, { autoIncrement: true });
                store.createIndex(SCRAMBLE_TYPE_INDEX, 'type', { unique: false });
            }
             if (oldVersion < 3) {
                if (!dbInstance.objectStoreNames.contains(USERS_STORE)) {
                    dbInstance.createObjectStore(USERS_STORE, { keyPath: 'id', autoIncrement: true });
                }
                if (!dbInstance.objectStoreNames.contains(SOLVES_STORE)) {
                    const solveStore = dbInstance.createObjectStore(SOLVES_STORE, { keyPath: 'id', autoIncrement: true });
                    solveStore.createIndex(SOLVE_USER_INDEX, 'userId', { unique: false });
                }
            }
        };
    });
}

// Scramble Functions (existing)
export async function addScrambles(scrambles: string[], type: CubeType): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction(SCRAMBLE_STORE, 'readwrite');
    const store = transaction.objectStore(SCRAMBLE_STORE);
    const scramblesToAdd = scrambles.map(scramble => ({ scramble, type }));

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        scramblesToAdd.forEach(item => store.add(item));
    });
}

export async function getScramble(type: CubeType): Promise<string | null> {
    const db = await openDB();
    const transaction = db.transaction(SCRAMBLE_STORE, 'readwrite');
    const store = transaction.objectStore(SCRAMBLE_STORE);
    const index = store.index(SCRAMBLE_TYPE_INDEX);
    const range = IDBKeyRange.only(type);
    
    return new Promise((resolve, reject) => {
        const cursorRequest = index.openCursor(range);
        cursorRequest.onerror = () => reject(cursorRequest.error);
        cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (cursor) {
                const scrambleData = cursor.value;
                store.delete(cursor.primaryKey);
                resolve(scrambleData.scramble);
            } else {
                resolve(null);
            }
        };
    });
}

export async function getScrambleCount(type: CubeType): Promise<number> {
    const db = await openDB();
    const transaction = db.transaction(SCRAMBLE_STORE, 'readonly');
    const store = transaction.objectStore(SCRAMBLE_STORE);
    const index = store.index(SCRAMBLE_TYPE_INDEX);
    const range = IDBKeyRange.only(type);


    return new Promise((resolve, reject) => {
        const countRequest = index.count(range);
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => reject(countRequest.error);
    });
}

// User Functions
export async function getUsers(): Promise<User[]> {
    const db = await openDB();
    const transaction = db.transaction(USERS_STORE, 'readonly');
    const store = transaction.objectStore(USERS_STORE);
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function addUser(name: string): Promise<User> {
    const db = await openDB();
    const transaction = db.transaction(USERS_STORE, 'readwrite');
    const store = transaction.objectStore(USERS_STORE);
    return new Promise((resolve, reject) => {
        const request = store.add({ name });
        request.onsuccess = () => {
            resolve({ id: request.result as number, name });
        };
        request.onerror = () => reject(request.error);
    });
}

export async function deleteUser(userId: number): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction([USERS_STORE, SOLVES_STORE], 'readwrite');
    const usersStore = transaction.objectStore(USERS_STORE);
    const solvesStore = transaction.objectStore(SOLVES_STORE);

    usersStore.delete(userId);

    const solvesIndex = solvesStore.index(SOLVE_USER_INDEX);
    const solvesCursorRequest = solvesIndex.openCursor(IDBKeyRange.only(userId));
    solvesCursorRequest.onsuccess = () => {
        const cursor = solvesCursorRequest.result;
        if (cursor) {
            cursor.delete();
            cursor.continue();
        }
    };

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}


// Solve Functions
interface StorableSolve extends Omit<Solve, 'date'> {
    date: number; // Store date as timestamp
}

export async function addSolve(solveData: Omit<Solve, 'id' | 'date'>): Promise<Solve> {
    const db = await openDB();
    const transaction = db.transaction(SOLVES_STORE, 'readwrite');
    const store = transaction.objectStore(SOLVES_STORE);
    
    const storableSolve: Omit<StorableSolve, 'id'> = {
        ...solveData,
        date: new Date().getTime(),
    };

    return new Promise((resolve, reject) => {
        const request = store.add(storableSolve);
        request.onsuccess = () => {
            const newSolve: Solve = {
                ...solveData,
                id: request.result as number,
                date: new Date(storableSolve.date),
            };
            resolve(newSolve);
        };
        request.onerror = () => reject(request.error);
    });
}

export async function updateSolve(solve: Solve): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction(SOLVES_STORE, 'readwrite');
    const store = transaction.objectStore(SOLVES_STORE);

    const storableSolve: StorableSolve = {
        ...solve,
        date: solve.date.getTime(),
    };
    
    return new Promise((resolve, reject) => {
        const request = store.put(storableSolve);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}


export async function getSolvesForUser(userId: number): Promise<Solve[]> {
    const db = await openDB();
    const transaction = db.transaction(SOLVES_STORE, 'readonly');
    const store = transaction.objectStore(SOLVES_STORE);
    const index = store.index(SOLVE_USER_INDEX);
    const range = IDBKeyRange.only(userId);
    
    return new Promise((resolve, reject) => {
        const request = index.getAll(range);
        request.onsuccess = () => {
            const results = request.result.map(s => ({...s, date: new Date(s.date), penalty: s.penalty || 'none'}));
            resolve(results);
        };
        request.onerror = () => reject(request.error);
    });
}

export async function getAllSolves(): Promise<Solve[]> {
    const db = await openDB();
    const transaction = db.transaction(SOLVES_STORE, 'readonly');
    const store = transaction.objectStore(SOLVES_STORE);
     return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
             const results = request.result.map(s => ({...s, date: new Date(s.date), penalty: s.penalty || 'none'}));
            resolve(results);
        };
        request.onerror = () => reject(request.error);
    });
}

export async function deleteSolve(id: number): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction(SOLVES_STORE, 'readwrite');
    const store = transaction.objectStore(SOLVES_STORE);
    
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function clearSolvesForUser(userId: number, cubeType: CubeType): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction(SOLVES_STORE, 'readwrite');
    const store = transaction.objectStore(SOLVES_STORE);
    const index = store.index(SOLVE_USER_INDEX);
    const range = IDBKeyRange.only(userId);

    return new Promise((resolve, reject) => {
        const cursorRequest = index.openCursor(range);
        cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (cursor) {
                if (cursor.value.cubeType === cubeType) {
                    cursor.delete();
                }
                cursor.continue();
            } else {
                resolve();
            }
        };
        cursorRequest.onerror = () => reject(cursorRequest.error);
    });
}
