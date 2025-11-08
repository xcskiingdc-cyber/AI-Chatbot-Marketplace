

const DB_NAME = 'AIChatbotMarketplaceDB';
const DB_VERSION = 2;
const IMAGE_STORE_NAME = 'images';

let db: IDBDatabase | null = null;

const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error("IndexedDB error:", request.error);
            reject("IndexedDB error");
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;
            if (!database.objectStoreNames.contains(IMAGE_STORE_NAME)) {
                database.createObjectStore(IMAGE_STORE_NAME);
            }
        };
    });
};

export const saveImage = async (id: string, blob: Blob): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IMAGE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(IMAGE_STORE_NAME);
        const request = store.put(blob, id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getImage = async (id: string): Promise<Blob | null> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IMAGE_STORE_NAME, 'readonly');
        const store = transaction.objectStore(IMAGE_STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
};