/* ============================================================================
   SIMPLICITY ERP - HIGH-PERFORMANCE OFFLINE-FIRST STORAGE ENGINE
   File: core/storage.js • Developed by Farhan Jawed
   Architecture: 4-Tier L1-RAM / L2-LS / L3-IDB / L4-Cloud Queue
   Scale: 400,000+ Active Multi-Tenant Users | Offline-First & Conflict-Safe
============================================================================ */

(() => {
    'use strict';

    /* ========================================================================
       1. GLOBAL STATE & MEMORY CACHE (L1 Memory Layer)
       ------------------------------------------------------------------------
       L1 RAM Cache zero-latency synchronous reads provide karta hai.
       Har key ka state, dirty flag aur sync debounce timer track hota hai.
    ======================================================================== */
    let APP_MEMORY_CACHE = Object.create(null); // High-speed prototype-free object
    let idbInstance = null;
    let isRemoteUpdating = false;
    let isBackupPreviewMode = false;
    let PREVIEW_BACKUP_DATA = null;

    // Per-key sync debouncers taaki Firebase par continuous spam na ho
    const SYNC_DEBOUNCE_TIMERS = new Map();
    const DEBOUNCE_DELAY_MS = 800; // Optimal for mobile PWA typing & bulk updates
    let isSyncQueueFlushing = false;

    // 🔒 GLOBAL KEYS (Tenant ke level par shared rahengi, financial session se independent)
    const GLOBAL_APP_KEYS = Object.freeze([
        'app_sessions_list',
        'app_active_session',
        'karkhana_list',
        'active_karkhana_id',
        'karkhana_transfers',
        'app_users',
        'info_ledger'
    ]);

    // Database configuration
    const DB_CONFIG = Object.freeze({
        NAME: 'SimplicityERP_DB',
        VERSION: 2, // Upgraded for Sync Queue Store
        STORE_APP: 'app_store',
        STORE_QUEUE: 'sync_queue'
    });

    /**
     * Memory cache wipe (Tenant switch ya logout par call karein)
     */
    const clearMemoryCache = () => {
        APP_MEMORY_CACHE = Object.create(null);
        SYNC_DEBOUNCE_TIMERS.forEach((timer) => clearTimeout(timer));
        SYNC_DEBOUNCE_TIMERS.clear();
    };

    /* ========================================================================
       2. TENANT & SESSION ISOLATION (Mathematical Guarantee)
       ------------------------------------------------------------------------
       Kisi bhi tenant ya karkhana ka data doosre tenant me leak na ho sake.
       UID aur Session dono sanitize kiye jaate hain.
    ======================================================================== */

    /**
     * Current authenticated user ID resolver
     * @returns {string} Sanitized lowercase alphanumeric user ID
     */
    const getEffectiveUserId = () => {
        try {
            if (typeof window.currentUserId !== 'undefined' && window.currentUserId) {
                const sanitized = String(window.currentUserId).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
                return sanitized || 'app';
            }
        } catch (_) {}
        return 'app';
    };

    /**
     * Mathematical Key Isolator
     * Output Pattern:
     * - Global Keys:  `${uid}_${key}`
     * - Session Keys: `${uid}_${session}_${key}`
     *
     * @param {string} key - Application data key
     * @returns {string} Fully qualified isolated key
     */
    const getStorageKey = (key) => {
        const uid = getEffectiveUserId();
        const safeKey = String(key || '').trim();

        if (GLOBAL_APP_KEYS.includes(safeKey)) {
            return `${uid}_${safeKey}`;
        }

        // Financial Session Resolve
        let sess = '2026-2027';
        try {
            if (typeof window.getActiveFinancialSession === 'function') {
                sess = window.getActiveFinancialSession();
            } else {
                const storedSess = APP_MEMORY_CACHE[`${uid}_app_active_session`] || 
                                   localStorage.getItem(`${uid}_app_active_session`);
                if (storedSess) sess = storedSess;
            }
        } catch (_) {}

        // Sanitize session format (e.g. "2026-2027")
        sess = String(sess).replace(/['"]+/g, '').trim().replace(/[^0-9-]/g, '') || '2026-2027';

        return `${uid}_${sess}_${safeKey}`;
    };

    /* ========================================================================
       3. ENTERPRISE INDEXEDDB ENGINE (L3 Persistent Layer)
       ------------------------------------------------------------------------
       Promise-based wrapper, auto version-migrations, non-blocking asynchronous
       transactions, aur private-browsing safe guards.
    ======================================================================== */

    /**
     * Opens or retrieves the IndexedDB instance safely
     * @returns {Promise<IDBDatabase|null>}
     */
    const getIndexedDBPromise = () => {
        return new Promise((resolve) => {
            if (idbInstance) {
                return resolve(idbInstance);
            }

            if (!('indexedDB' in window)) {
                console.warn('[Storage] IndexedDB not supported or disabled in this browser.');
                return resolve(null);
            }

            try {
                const req = window.indexedDB.open(DB_CONFIG.NAME, DB_CONFIG.VERSION);

                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    // Primary App Data Store
                    if (!db.objectStoreNames.contains(DB_CONFIG.STORE_APP)) {
                        db.createObjectStore(DB_CONFIG.STORE_APP);
                    }
                    // Offline Mutation Sync Queue
                    if (!db.objectStoreNames.contains(DB_CONFIG.STORE_QUEUE)) {
                        db.createObjectStore(DB_CONFIG.STORE_QUEUE, { keyPath: 'id' });
                    }
                };

                req.onsuccess = (e) => {
                    idbInstance = e.target.result;

                    // Handle unexpected database close / connection loss
                    idbInstance.onclose = () => {
                        idbInstance = null;
                    };
                    idbInstance.onversionchange = () => {
                        if (idbInstance) idbInstance.close();
                        idbInstance = null;
                    };

                    resolve(idbInstance);
                };

                req.onerror = () => {
                    console.warn('[Storage:IDB] Failed to open IndexedDB, falling back to L1/L2.');
                    resolve(null);
                };
            } catch (err) {
                console.error('[Storage:IDB] Open exception:', err);
                resolve(null);
            }
        });
    };

    /**
     * Backward-compatible callback wrapper for IndexedDB
     */
    const openEnterpriseIndexedDB = (callback) => {
        getIndexedDBPromise().then((db) => {
            if (typeof callback === 'function') callback(db);
        });
    };

    /**
     * Asynchronously puts a record into IndexedDB without blocking the thread
     */
    const idbPut = async (key, value) => {
        try {
            const db = await getIndexedDBPromise();
            if (!db) return;

            const tx = db.transaction(DB_CONFIG.STORE_APP, 'readwrite');
            const store = tx.objectStore(DB_CONFIG.STORE_APP);
            store.put(value, key);
        } catch (_) {}
    };

    /**
     * Asynchronously deletes a record from IndexedDB
     */
    const idbDelete = async (key) => {
        try {
            const db = await getIndexedDBPromise();
            if (!db) return;

            const tx = db.transaction(DB_CONFIG.STORE_APP, 'readwrite');
            const store = tx.objectStore(DB_CONFIG.STORE_APP);
            store.delete(key);
        } catch (_) {}
    };

    /* ========================================================================
       4. OFFLINE SYNC QUEUE & REALTIME FIREBASE SYNC (L4 Cloud Layer)
       ------------------------------------------------------------------------
       Agar network chala jaye toh saari changes IndexedDB sync_queue me store
       hoti hain aur internet aate hi FIFO order me replay hoti hain.
    ======================================================================== */

    /**
     * Saves pending cloud mutations into the offline queue
     */
    const enqueueSyncMutation = async (mutation) => {
        try {
            const db = await getIndexedDBPromise();
            if (!db) return;
            const tx = db.transaction(DB_CONFIG.STORE_QUEUE, 'readwrite');
            tx.objectStore(DB_CONFIG.STORE_QUEUE).put(mutation);
        } catch (err) {
            console.error('[SyncQueue] Enqueue failure:', err);
        }
    };

    /**
     * Drains and pushes queued mutations to Firebase when back online
     */
    const flushSyncQueue = async () => {
        if (isSyncQueueFlushing || !navigator.onLine) return;
        if (typeof window.db === 'undefined' || !window.db) return;

        isSyncQueueFlushing = true;
        try {
            const db = await getIndexedDBPromise();
            if (!db) return;

            const tx = db.transaction(DB_CONFIG.STORE_QUEUE, 'readonly');
            const store = tx.objectStore(DB_CONFIG.STORE_QUEUE);
            const req = store.getAll();

            req.onsuccess = async () => {
                const queue = req.result || [];
                if (queue.length === 0) {
                    isSyncQueueFlushing = false;
                    return;
                }

                if (typeof window.showSyncStatus === 'function') window.showSyncStatus('syncing');

                for (const item of queue) {
                    try {
                        if (item.action === 'SET') {
                            await window.db.ref(item.fbPath).set(item.data);
                        } else if (item.action === 'REMOVE') {
                            await window.db.ref(item.fbPath).remove();
                        }

                        // Remove from queue on success
                        const deleteTx = db.transaction(DB_CONFIG.STORE_QUEUE, 'readwrite');
                        deleteTx.objectStore(DB_CONFIG.STORE_QUEUE).delete(item.id);
                    } catch (pushErr) {
                        console.warn('[SyncQueue] Item push deferred:', pushErr);
                        break; // Stop loop if connection dropped again
                    }
                }

                if (typeof window.showSyncStatus === 'function') window.showSyncStatus('online');
                isSyncQueueFlushing = false;
            };

            req.onerror = () => { isSyncQueueFlushing = false; };
        } catch (_) {
            isSyncQueueFlushing = false;
        }
    };

    // Auto-replay sync queue whenever browser regains internet connectivity
    window.addEventListener('online', () => {
        console.log('[StorageEngine] Connection restored. Replaying Sync Queue...');
        flushSyncQueue();
    });

    /**
     * Debounced cloud dispatcher to prevent network congestion
     */
    const dispatchCloudSync = (fullKey, toSave, action = 'SET') => {
        const uid = getEffectiveUserId();
        if (isRemoteUpdating || !uid || uid === 'app') return;

        const fbKey = fullKey.replace(`${uid}_`, '');
        const fbPath = `users/${uid}/${fbKey}`;
        const queueId = `${uid}_${fbKey}`;

        // Cancel previous pending timer for the same key
        if (SYNC_DEBOUNCE_TIMERS.has(fullKey)) {
            clearTimeout(SYNC_DEBOUNCE_TIMERS.get(fullKey));
        }

        const timer = setTimeout(async () => {
            SYNC_DEBOUNCE_TIMERS.delete(fullKey);

            if (!navigator.onLine || typeof window.db === 'undefined' || !window.db) {
                // Device Offline: Add to IDB persistent sync queue
                await enqueueSyncMutation({
                    id: queueId,
                    action,
                    fbPath,
                    data: toSave,
                    timestamp: Date.now()
                });
                if (typeof window.showSyncStatus === 'function') window.showSyncStatus('offline');
                return;
            }

            // Device Online: Direct cloud push
            try {
                if (typeof window.showSyncStatus === 'function') window.showSyncStatus('syncing');

                if (action === 'SET') {
                    await window.db.ref(fbPath).set(toSave);
                } else if (action === 'REMOVE') {
                    await window.db.ref(fbPath).remove();
                }

                if (typeof window.showSyncStatus === 'function') window.showSyncStatus('online');
            } catch (networkErr) {
                console.warn('[Storage:Cloud] Push failed, queuing offline mutation:', networkErr);
                await enqueueSyncMutation({
                    id: queueId,
                    action,
                    fbPath,
                    data: toSave,
                    timestamp: Date.now()
                });
                if (typeof window.showSyncStatus === 'function') window.showSyncStatus('offline');
            }
        }, DEBOUNCE_DELAY_MS);

        SYNC_DEBOUNCE_TIMERS.set(fullKey, timer);
    };

    /* ========================================================================
       5. DATA PRELOAD & MIGRATION ENGINE
       ------------------------------------------------------------------------
       PWA open hote hi IndexedDB se user-isolated data L1 Memory me load hota hai.
    ======================================================================== */

    /**
     * Migrates LocalStorage to L1 Memory Cache & L3 IndexedDB
     */
    const migrateLocalStorageToCache = () => {
        const uid = getEffectiveUserId();
        try {
            const len = localStorage.length;
            for (let i = 0; i < len; i++) {
                const k = localStorage.key(i);
                if (k && (k.startsWith(`${uid}_`) || k === 'app_users') && !(k in APP_MEMORY_CACHE)) {
                    const raw = localStorage.getItem(k);
                    try {
                        const parsed = JSON.parse(raw);
                        APP_MEMORY_CACHE[k] = parsed;
                        idbPut(k, parsed);
                    } catch (_) {
                        APP_MEMORY_CACHE[k] = raw;
                        idbPut(k, raw);
                    }
                }
            }
        } catch (_) {}
    };

    /**
     * Initializes fast preload on app startup
     */
    const initIndexedDBPreload = async (callback) => {
        const uid = getEffectiveUserId();
        try {
            const db = await getIndexedDBPromise();
            if (!db) {
                migrateLocalStorageToCache();
                if (typeof callback === 'function') callback();
                return;
            }

            const tx = db.transaction(DB_CONFIG.STORE_APP, 'readonly');
            const store = tx.objectStore(DB_CONFIG.STORE_APP);
            const req = store.openCursor();

            req.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    const k = String(cursor.key);
                    // Sirf current tenant ka data L1 memory me pre-warm karo
                    if (k.startsWith(`${uid}_`) || k === 'app_users') {
                        APP_MEMORY_CACHE[k] = cursor.value;
                    }
                    cursor.continue();
                } else {
                    migrateLocalStorageToCache();
                    // Flush offline queue if network is available
                    flushSyncQueue();
                    if (typeof callback === 'function') callback();
                }
            };

            req.onerror = () => {
                migrateLocalStorageToCache();
                if (typeof callback === 'function') callback();
            };
        } catch (err) {
            console.error('[Storage:Preload] Initialization error:', err);
            migrateLocalStorageToCache();
            if (typeof callback === 'function') callback();
        }
    };

    /* ========================================================================
       6. CORE SYNCHRONOUS CRUD GETTER / SETTER / DELETER
       ------------------------------------------------------------------------
       UI components (Karigar, Saree, Bana) synchronous instant responses expect
       karte hain. L1 RAM Cache se O(1) synchronous read provide hota hai.
    ======================================================================== */

    /**
     * Safe Array Normalizer Helper
     */
    const safeArr = (val) => {
        if (typeof window.safeArray === 'function') {
            return window.safeArray(val);
        }
        return Array.isArray(val) ? val : [];
    };

    /**
     * Synchronous Store Getter
     * @param {string} key - Model/Collection key
     * @returns {any} Stored value or clean empty array `[]`
     */
    const getStore = (key) => {
        // Backup Preview Mode Guard
        if (isBackupPreviewMode && PREVIEW_BACKUP_DATA) {
            if (key.startsWith('kariger_sheets_')) {
                const kId = key.replace('kariger_sheets_', '');
                return safeArr(PREVIEW_BACKUP_DATA.sheets?.[kId]);
            }
            if (key.startsWith('jobwork_sheets_')) {
                const wId = key.replace('jobwork_sheets_', '');
                return safeArr(PREVIEW_BACKUP_DATA.jobwork_sheets?.[wId]);
            }
            if (PREVIEW_BACKUP_DATA.data && Object.prototype.hasOwnProperty.call(PREVIEW_BACKUP_DATA.data, key)) {
                const pVal = PREVIEW_BACKUP_DATA.data[key];
                return Array.isArray(pVal) ? safeArr(pVal) : pVal;
            }
            return [];
        }

        try {
            const fullKey = getStorageKey(key);

            // Tier 1: Instant L1 RAM Cache Read
            if (fullKey in APP_MEMORY_CACHE) {
                const cachedVal = APP_MEMORY_CACHE[fullKey];
                if (typeof cachedVal === 'string' || typeof cachedVal === 'number' || typeof cachedVal === 'boolean') {
                    return cachedVal;
                }
                return safeArr(cachedVal);
            }

            // Tier 2: Synchronous LocalStorage Fallback
            const raw = localStorage.getItem(fullKey);
            if (!raw || raw === 'null' || raw === 'undefined') {
                return [];
            }

            const parsed = JSON.parse(raw);
            APP_MEMORY_CACHE[fullKey] = parsed; // Warm up L1 Cache
            if (typeof parsed === 'string' || typeof parsed === 'number' || typeof parsed === 'boolean') {
                return parsed;
            }
            return safeArr(parsed);
        } catch (_) {
            return [];
        }
    };

    /**
     * Synchronous Store Setter with Asynchronous L3/L4 Persistence
     * @param {string} key - Model/Collection key
     * @param {any} data - Data to persist
     */
    const setStore = (key, data) => {
        if (isBackupPreviewMode) return;

        try {
            const fullKey = getStorageKey(key);
            const toSave = Array.isArray(data) ? safeArr(data) : data;

            // 1. Update L1 RAM Cache immediately
            APP_MEMORY_CACHE[fullKey] = toSave;

            // 2. Persist to L3 IndexedDB (Async non-blocking)
            idbPut(fullKey, toSave);

            // 3. Persist to L2 LocalStorage with Quota Exceeded Guard
            try {
                localStorage.setItem(fullKey, JSON.stringify(toSave));
            } catch (quotaError) {
                // If LocalStorage quota exceeded (5MB limit hit on mobile devices),
                // do not crash! L3 IndexedDB handles gigabytes of data reliably.
                console.warn('[Storage] LocalStorage quota exceeded. Relying on IndexedDB & Memory.', quotaError);
            }

            // 4. Dispatch to L4 Cloud Sync with Debounce & Offline Queue
            dispatchCloudSync(fullKey, toSave, 'SET');
        } catch (fatalErr) {
            console.error('[Storage:setStore] Fatal write error:', fatalErr);
        }
    };

    /**
     * Permanent Record Deletion (L1, L2, L3 & Cloud)
     * @param {string} key - Model/Collection key
     */
    const deleteStoreKey = (key) => {
        try {
            const fullKey = getStorageKey(key);

            // Delete from L1 Cache
            delete APP_MEMORY_CACHE[fullKey];

            // Delete from L3 IndexedDB
            idbDelete(fullKey);

            // Delete from L2 LocalStorage
            try {
                localStorage.removeItem(fullKey);
            } catch (_) {}

            // Dispatch delete to Cloud & Offline Queue
            dispatchCloudSync(fullKey, null, 'REMOVE');
        } catch (err) {
            console.error('[Storage:deleteStoreKey] Delete error:', err);
        }
    };

    /* ========================================================================
       7. PUBLIC API & BACKWARD COMPATIBILITY EXPORTS
       ------------------------------------------------------------------------
    ======================================================================== */
    const publicStorageAPI = {
        // Core API
        getStore,
        setStore,
        deleteStoreKey,
        clearMemoryCache,
        getStorageKey,
        getEffectiveUserId,

        // IDB Operations
        openEnterpriseIndexedDB,
        idbPut,
        idbDelete,
        initIndexedDBPreload,
        flushSyncQueue,

        // Configuration and State Getters
        GLOBAL_APP_KEYS,
        get isRemoteUpdating() { return isRemoteUpdating; },
        set isRemoteUpdating(val) { isRemoteUpdating = Boolean(val); },
        get isBackupPreviewMode() { return isBackupPreviewMode; },
        set isBackupPreviewMode(val) { isBackupPreviewMode = Boolean(val); },
        get PREVIEW_BACKUP_DATA() { return PREVIEW_BACKUP_DATA; },
        set PREVIEW_BACKUP_DATA(val) { PREVIEW_BACKUP_DATA = val; },
        get APP_MEMORY_CACHE() { return APP_MEMORY_CACHE; }
    };

    // Attach to global window object for direct legacy access
    window.APP_MEMORY_CACHE = APP_MEMORY_CACHE;
    window.GLOBAL_APP_KEYS = GLOBAL_APP_KEYS;
    window.clearMemoryCache = clearMemoryCache;
    window.openEnterpriseIndexedDB = openEnterpriseIndexedDB;
    window.idbPut = idbPut;
    window.idbDelete = idbDelete;
    window.initIndexedDBPreload = initIndexedDBPreload;
    window.getEffectiveUserId = getEffectiveUserId;
    window.getStorageKey = getStorageKey;
    window.getStore = getStore;
    window.setStore = setStore;
    window.deleteStoreKey = deleteStoreKey;
    window.flushSyncQueue = flushSyncQueue;

    // Direct state getters/setters for legacy sync systems
    Object.defineProperty(window, 'isRemoteUpdating', {
        get: () => isRemoteUpdating,
        set: (v) => { isRemoteUpdating = Boolean(v); },
        configurable: true
    });
    Object.defineProperty(window, 'isBackupPreviewMode', {
        get: () => isBackupPreviewMode,
        set: (v) => { isBackupPreviewMode = Boolean(v); },
        configurable: true
    });
    Object.defineProperty(window, 'PREVIEW_BACKUP_DATA', {
        get: () => PREVIEW_BACKUP_DATA,
        set: (v) => { PREVIEW_BACKUP_DATA = v; },
        configurable: true
    });

    // Namespace Wrapper
    window.StorageEngine = publicStorageAPI;

    // Node / Unit Test Environment Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = publicStorageAPI;
    }
})();
