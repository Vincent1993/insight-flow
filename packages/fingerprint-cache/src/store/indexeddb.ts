import type { AsyncKVStore } from "../types.js";

export interface IndexedDbStoreOptions {
  dbName?: string;
  storeName?: string;
}

interface StoredValue {
  key: string;
  value: unknown;
}

function openDb(options: IndexedDbStoreOptions): Promise<IDBDatabase> {
  const dbName = options.dbName ?? "insight-flow-cache";
  const storeName = options.storeName ?? "kv";

  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IF-CACHE-001: indexedDB is not available"));
      return;
    }

    const request = indexedDB.open(dbName, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export function createIndexedDbKvStore(options: IndexedDbStoreOptions = {}): AsyncKVStore {
  const storeName = options.storeName ?? "kv";
  const dbPromise = openDb(options);

  return {
    async get<T = unknown>(key: string): Promise<T | undefined> {
      const db = await dbPromise;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const request = tx.objectStore(storeName).get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const found = request.result as StoredValue | undefined;
          resolve((found?.value ?? undefined) as T | undefined);
        };
      });
    },
    async set<T = unknown>(key: string, value: T): Promise<void> {
      const db = await dbPromise;
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const request = tx.objectStore(storeName).put({ key, value } as StoredValue);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    },
    async delete(key: string): Promise<void> {
      const db = await dbPromise;
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const request = tx.objectStore(storeName).delete(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }
  };
}
