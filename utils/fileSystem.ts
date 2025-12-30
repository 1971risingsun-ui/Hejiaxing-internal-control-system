/**
 * 使用 File System Access API 進行本機資料夾存取
 * 並透過 IndexedDB 持久化 Handle 與 App 狀態
 */

const DB_NAME = 'hjx_handle_db';
const STORE_NAME = 'handles';
const APP_STATE_KEY = 'app_full_state';
const HANDLE_KEY = 'current_dir';
const STORAGE_HANDLE_KEY = 'storage_dir'; // 新增：專供下載使用的目錄鍵值
const DB_FILENAME = 'db.json';

// 初始化 IndexedDB
const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2); // 升級版本以確保 Store 存在
    request.onupgradeneeded = (e: any) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// 儲存整個 App 狀態到 IndexedDB (用於手機端大量資料儲存)
export const saveAppStateToIdb = async (state: any) => {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(state, APP_STATE_KEY);
    return new Promise((resolve) => (tx.oncomplete = resolve));
  } catch (e) {
    console.error('IndexedDB 儲存失敗', e);
  }
};

// 從 IndexedDB 讀取 App 狀態
export const loadAppStateFromIdb = async (): Promise<any | null> => {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(APP_STATE_KEY);
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (e) {
    return null;
  }
};

// 自動備份目錄 Handle
export const saveHandleToIdb = async (handle: FileSystemDirectoryHandle) => {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
  return new Promise((resolve) => (tx.oncomplete = resolve));
};

export const getHandleFromIdb = async (): Promise<FileSystemDirectoryHandle | null> => {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (e) {
    return null;
  }
};

// 設定下載目錄 Handle (新增)
export const saveStorageHandleToIdb = async (handle: FileSystemDirectoryHandle) => {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(handle, STORAGE_HANDLE_KEY);
  return new Promise((resolve) => (tx.oncomplete = resolve));
};

export const getStorageHandleFromIdb = async (): Promise<FileSystemDirectoryHandle | null> => {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(STORAGE_HANDLE_KEY);
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (e) {
    return null;
  }
};

export const clearHandleFromIdb = async () => {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
  return new Promise((resolve) => (tx.oncomplete = resolve));
};

export const getDirectoryHandle = async (): Promise<FileSystemDirectoryHandle> => {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('您的瀏覽器不支援此功能。手機版請使用手動另存新檔。');
  }

  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents'
    });
    return handle;
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error('已取消選擇');
    throw new Error('無法取得權限：' + e.message);
  }
};

export const saveDbToLocal = async (handle: FileSystemDirectoryHandle, data: any, filename: string = DB_FILENAME) => {
  try {
    const status = await (handle as any).queryPermission({ mode: 'readwrite' });
    if (status !== 'granted') return;
    
    const fileHandle = await handle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  } catch (e) {
    console.error('儲存本機檔案失敗', e);
  }
};

export const loadDbFromLocal = async (handle: FileSystemDirectoryHandle): Promise<any | null> => {
  try {
    const status = await (handle as any).queryPermission({ mode: 'read' });
    if (status !== 'granted') return null;
    
    const fileHandle = await handle.getFileHandle(DB_FILENAME);
    const file = await fileHandle.getFile();
    const content = await file.text();
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
};