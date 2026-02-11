import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { encryptContent, decryptContent } from '@/hooks/useContentProtection';

interface CraterDB extends DBSchema {
  chapters: {
    key: string;
    value: {
      id: string;
      bookId: string;
      content: string; // Encrypted content
      title: string;
      chapterOrder: number;
      cachedAt: Date;
      encrypted: boolean;
    };
    indexes: { 'by-book': string };
  };
  pendingSync: {
    key: string;
    value: {
      id: string;
      type: 'progress' | 'bookmark' | 'highlight';
      data: Record<string, unknown>;
      createdAt: Date;
    };
  };
  audioCache: {
    key: string;
    value: {
      id: string;
      bookId: string;
      type: 'audiobook' | 'soundtrack';
      url: string;
      cachedAt: Date;
    };
    indexes: { 'by-book': string };
  };
  userSession: {
    key: string;
    value: {
      id: string;
      oderId: string;
      deviceFingerprint: string;
      createdAt: Date;
    };
  };
}

let db: IDBPDatabase<CraterDB> | null = null;

// Generate a device-specific fingerprint for encryption
async function getDeviceFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
  ];
  
  const data = components.join('|');
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate encryption key from user ID + device fingerprint
async function getEncryptionKey(userId: string): Promise<string> {
  const fingerprint = await getDeviceFingerprint();
  return `${userId}:${fingerprint}:crater-mythos-secure`;
}

export async function initOfflineDB(): Promise<IDBPDatabase<CraterDB>> {
  if (db) return db;
  
  db = await openDB<CraterDB>('crater-mythos', 2, {
    upgrade(database, oldVersion) {
      // Chapters store
      if (!database.objectStoreNames.contains('chapters')) {
        const chaptersStore = database.createObjectStore('chapters', { keyPath: 'id' });
        chaptersStore.createIndex('by-book', 'bookId');
      }
      
      // Pending sync store
      if (!database.objectStoreNames.contains('pendingSync')) {
        database.createObjectStore('pendingSync', { keyPath: 'id' });
      }
      
      // Audio cache store
      if (!database.objectStoreNames.contains('audioCache')) {
        const audioStore = database.createObjectStore('audioCache', { keyPath: 'id' });
        audioStore.createIndex('by-book', 'bookId');
      }
      
      // User session store (for verifying decryption rights)
      if (!database.objectStoreNames.contains('userSession')) {
        database.createObjectStore('userSession', { keyPath: 'id' });
      }
    },
  });
  
  return db;
}

// Cache chapters for offline reading with encryption
export async function cacheChapters(
  chapters: Array<{
    id: string;
    book_id: string;
    content: string | null;
    title: string;
    chapter_order: number;
  }>,
  userId: string
): Promise<void> {
  if (!userId) {
    console.warn('Cannot cache chapters without user ID');
    return;
  }
  
  const database = await initOfflineDB();
  const encryptionKey = await getEncryptionKey(userId);
  const fingerprint = await getDeviceFingerprint();
  
  // Pre-encrypt all content BEFORE starting the transaction
  // This avoids the "transaction has finished" error
  const encryptedChapters: Array<{
    id: string;
    bookId: string;
    content: string;
    title: string;
    chapterOrder: number;
    cachedAt: Date;
    encrypted: boolean;
  }> = [];
  
  for (const chapter of chapters) {
    try {
      const encryptedContent = chapter.content 
        ? await encryptContent(chapter.content, encryptionKey)
        : '';
      
      encryptedChapters.push({
        id: chapter.id,
        bookId: chapter.book_id,
        content: encryptedContent,
        title: chapter.title,
        chapterOrder: chapter.chapter_order,
        cachedAt: new Date(),
        encrypted: true,
      });
    } catch (error) {
      console.error('Failed to encrypt chapter:', error);
    }
  }
  
  // Now write all encrypted data in a single synchronous transaction
  const tx = database.transaction('chapters', 'readwrite');
  for (const chapter of encryptedChapters) {
    tx.store.put(chapter);
  }
  await tx.done;
  
  // Store the user session for verification
  await database.put('userSession', {
    id: 'current',
    oderId: userId,
    deviceFingerprint: fingerprint,
    createdAt: new Date(),
  });
}

// Get cached chapters for a book (with decryption)
export async function getCachedChapters(
  bookId: string, 
  userId: string
): Promise<Array<{
  id: string;
  bookId: string;
  content: string;
  title: string;
  chapterOrder: number;
  cachedAt: Date;
}>> {
  if (!userId) {
    return [];
  }
  
  const database = await initOfflineDB();
  
  // Verify user session matches
  const session = await database.get('userSession', 'current');
  if (!session || session.oderId !== userId) {
    console.warn('User session mismatch - cached content unavailable for this user');
    return [];
  }
  
  // Verify device fingerprint
  const currentFingerprint = await getDeviceFingerprint();
  if (session.deviceFingerprint !== currentFingerprint) {
    console.warn('Device fingerprint changed - cached content unavailable');
    return [];
  }
  
  const encryptedChapters = await database.getAllFromIndex('chapters', 'by-book', bookId);
  const encryptionKey = await getEncryptionKey(userId);
  const decryptedChapters = [];
  
  for (const chapter of encryptedChapters) {
    try {
      const decryptedContent = chapter.encrypted && chapter.content
        ? await decryptContent(chapter.content, encryptionKey)
        : chapter.content;
      
      decryptedChapters.push({
        id: chapter.id,
        bookId: chapter.bookId,
        content: decryptedContent,
        title: chapter.title,
        chapterOrder: chapter.chapterOrder,
        cachedAt: chapter.cachedAt,
      });
    } catch (error) {
      console.error('Failed to decrypt chapter:', error);
      // Content was cached with different user/device - skip it
    }
  }
  
  return decryptedChapters;
}

// Check if a book has cached chapters (that current user can access)
export async function hasBookCached(bookId: string, userId: string): Promise<boolean> {
  if (!userId) return false;
  
  const database = await initOfflineDB();
  const session = await database.get('userSession', 'current');
  
  // Quick check - if no session or wrong user, return false without decryption attempt
  if (!session || session.oderId !== userId) {
    return false;
  }
  
  const chapters = await database.getAllFromIndex('chapters', 'by-book', bookId);
  return chapters.length > 0;
}

// Queue offline actions for sync
export async function queueOfflineAction(
  type: 'progress' | 'bookmark' | 'highlight',
  data: Record<string, unknown>
): Promise<void> {
  const database = await initOfflineDB();
  await database.put('pendingSync', {
    id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    data,
    createdAt: new Date(),
  });
}

// Get all pending sync actions
export async function getPendingActions(): Promise<CraterDB['pendingSync']['value'][]> {
  const database = await initOfflineDB();
  return database.getAll('pendingSync');
}

// Delete a pending action after successful sync
export async function deletePendingAction(id: string): Promise<void> {
  const database = await initOfflineDB();
  await database.delete('pendingSync', id);
}

// Cache audio file reference
export async function cacheAudioRef(
  id: string,
  bookId: string,
  type: 'audiobook' | 'soundtrack',
  url: string
): Promise<void> {
  const database = await initOfflineDB();
  await database.put('audioCache', {
    id,
    bookId,
    type,
    url,
    cachedAt: new Date(),
  });
}

// Check if audio is cached for a book
export async function hasAudioCached(bookId: string): Promise<boolean> {
  const database = await initOfflineDB();
  const audio = await database.getAllFromIndex('audioCache', 'by-book', bookId);
  return audio.length > 0;
}

// Clear all cached data (for logout)
export async function clearAllCache(): Promise<void> {
  const database = await initOfflineDB();
  
  const tx1 = database.transaction('chapters', 'readwrite');
  await tx1.store.clear();
  await tx1.done;
  
  const tx2 = database.transaction('audioCache', 'readwrite');
  await tx2.store.clear();
  await tx2.done;
  
  const tx3 = database.transaction('userSession', 'readwrite');
  await tx3.store.clear();
  await tx3.done;
}

// Clear old cache (older than 7 days)
export async function clearOldCache(): Promise<void> {
  const database = await initOfflineDB();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  // Clear old chapters
  const chapters = await database.getAll('chapters');
  const chaptersTx = database.transaction('chapters', 'readwrite');
  for (const chapter of chapters) {
    if (chapter.cachedAt < sevenDaysAgo) {
      chaptersTx.store.delete(chapter.id);
    }
  }
  await chaptersTx.done;
  
  // Clear old audio
  const audio = await database.getAll('audioCache');
  const audioTx = database.transaction('audioCache', 'readwrite');
  for (const a of audio) {
    if (a.cachedAt < sevenDaysAgo) {
      audioTx.store.delete(a.id);
    }
  }
  await audioTx.done;
}
