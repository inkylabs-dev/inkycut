import type { LocalFile } from '../../composition/types';

/**
 * Interface for file storage implementations
 */
export interface IFileStorage {
  readonly mode: 'indexeddb' | 'memory';
  init(): Promise<void>;
  storeFile(file: LocalFile): Promise<void>;
  getFile(id: string): Promise<LocalFile | null>;
  getAllFiles(): Promise<LocalFile[]>;
  deleteFile(id: string): Promise<void>;
  clearAllFiles(): Promise<void>;
  storeFiles(files: LocalFile[]): Promise<void>;
  getTotalStorageSize(): Promise<number>;
  getStorageStats(): Promise<{
    fileCount: number;
    totalSize: number;
    fileTypes: Record<string, number>;
  }>;
}

/**
 * In-memory file storage for shared/temporary projects
 * Does not persist data across page reloads
 */
class MemoryFileStorage implements IFileStorage {
  public readonly mode = 'memory' as const;
  private files = new Map<string, LocalFile>();

  async init(): Promise<void> {
    // No initialization needed for memory storage
  }

  async storeFile(file: LocalFile): Promise<void> {
    this.files.set(file.id, { ...file });
  }

  async getFile(id: string): Promise<LocalFile | null> {
    return this.files.get(id) || null;
  }

  async getAllFiles(): Promise<LocalFile[]> {
    return Array.from(this.files.values());
  }

  async deleteFile(id: string): Promise<void> {
    this.files.delete(id);
  }

  async clearAllFiles(): Promise<void> {
    this.files.clear();
  }

  async storeFiles(files: LocalFile[]): Promise<void> {
    for (const file of files) {
      this.files.set(file.id, { ...file });
    }
  }

  async getTotalStorageSize(): Promise<number> {
    const files = Array.from(this.files.values());
    return files.reduce((total, file) => {
      const base64Data = file.dataUrl.split(',')[1] || '';
      return total + Math.ceil(base64Data.length * 0.75);
    }, 0);
  }

  async getStorageStats(): Promise<{
    fileCount: number;
    totalSize: number;
    fileTypes: Record<string, number>;
  }> {
    const files = Array.from(this.files.values());
    const fileTypes: Record<string, number> = {};
    let totalSize = 0;

    files.forEach(file => {
      const type = file.type.split('/')[0] || 'unknown';
      fileTypes[type] = (fileTypes[type] || 0) + 1;
      
      const base64Data = file.dataUrl.split(',')[1] || '';
      totalSize += Math.ceil(base64Data.length * 0.75);
    });

    return {
      fileCount: files.length,
      totalSize,
      fileTypes
    };
  }
}

/**
 * IndexedDB wrapper for storing project files
 * Provides persistent storage across browser sessions
 */
class IndexedDBFileStorage implements IFileStorage {
  public readonly mode = 'indexeddb' as const;
  private dbName = 'InkyCutFiles';
  private dbVersion = 1;
  private storeName = 'files';
  private db: IDBDatabase | null = null;

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  /**
   * Store a file in IndexedDB
   */
  async storeFile(file: LocalFile): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(file);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Retrieve a file from IndexedDB by ID
   */
  async getFile(id: string): Promise<LocalFile | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  /**
   * Get all files for the current project
   */
  async getAllFiles(): Promise<LocalFile[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Delete a file from IndexedDB
   */
  async deleteFile(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Clear all files from IndexedDB
   */
  async clearAllFiles(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Store multiple files at once
   */
  async storeFiles(files: LocalFile[]): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      let completed = 0;
      
      if (files.length === 0) {
        resolve();
        return;
      }
      
      files.forEach(file => {
        const request = store.put(file);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          completed++;
          if (completed === files.length) {
            resolve();
          }
        };
      });
    });
  }

  /**
   * Get the total size of all stored files
   */
  async getTotalStorageSize(): Promise<number> {
    const files = await this.getAllFiles();
    return files.reduce((total, file) => {
      // Estimate size from base64 data URL
      const base64Data = file.dataUrl.split(',')[1] || '';
      return total + Math.ceil(base64Data.length * 0.75); // Base64 is ~33% larger than binary
    }, 0);
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    fileCount: number;
    totalSize: number;
    fileTypes: Record<string, number>;
  }> {
    const files = await this.getAllFiles();
    const fileTypes: Record<string, number> = {};
    let totalSize = 0;

    files.forEach(file => {
      // Count file types
      const type = file.type.split('/')[0] || 'unknown';
      fileTypes[type] = (fileTypes[type] || 0) + 1;
      
      // Calculate size
      const base64Data = file.dataUrl.split(',')[1] || '';
      totalSize += Math.ceil(base64Data.length * 0.75);
    });

    return {
      fileCount: files.length,
      totalSize,
      fileTypes
    };
  }
}

// Storage instances
let indexedDBStorage: IndexedDBFileStorage | null = null;
let memoryStorage: MemoryFileStorage | null = null;

/**
 * Create or get file storage instance based on mode
 */
export function createFileStorage(mode: 'indexeddb' | 'memory'): IFileStorage {
  if (mode === 'indexeddb') {
    if (!indexedDBStorage) {
      indexedDBStorage = new IndexedDBFileStorage();
    }
    return indexedDBStorage;
  } else {
    // Always create a new memory storage instance to avoid sharing between projects
    return new MemoryFileStorage();
  }
}

/**
 * Get the appropriate storage mode for a project type
 */
export function getStorageModeForProject(isSharedProject: boolean): 'indexeddb' | 'memory' {
  if (isSharedProject) {
    return 'memory';
  }
  return isIndexedDBSupported() ? 'indexeddb' : 'memory';
}

/**
 * Migrate files from one storage to another
 */
export async function migrateFiles(from: IFileStorage, to: IFileStorage): Promise<void> {
  const files = await from.getAllFiles();
  if (files.length > 0) {
    await to.storeFiles(files);
  }
}

// Export a default instance for backward compatibility
export const fileStorage = createFileStorage('indexeddb');

/**
 * Helper function to check if IndexedDB is supported
 */
export function isIndexedDBSupported(): boolean {
  return typeof indexedDB !== 'undefined';
}

/**
 * Helper function to format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}