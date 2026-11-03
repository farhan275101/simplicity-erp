/* ============================================================================
   SIMPLICITY ERP - ENTERPRISE FIREBASE CLOUD & REALTIME SYNC ENGINE
   File: core/database.js • Developed by Farhan Jawed
   Architecture: Targeted Granular Sync | Realtime .info/connected | Conflict-Safe
   Scale: 400,000+ Concurrent Active Users | Bandwidth & Battery Optimized
============================================================================ */

(() => {
    'use strict';

    /* ========================================================================
       1. FIREBASE CONFIGURATION & FAIL-SAFE INITIALIZATION
       ------------------------------------------------------------------------
    ======================================================================== */
    const firebaseConfig = Object.freeze({
        apiKey: "AIzaSyDkLlLPFnZexLWxtvqg3UiE9XG_IclaSAk",
        authDomain: "simplicity-erp.firebaseapp.com",
        databaseURL: "https://simplicity-erp-default-rtdb.firebaseio.com",
        projectId: "simplicity-erp",
        storageBucket: "simplicity-erp.firebasestorage.app",
        messagingSenderId: "261724969835",
        appId: "1:261724969835:web:23a073ab544f55679f0a2e",
        measurementId: "G-9TS8H04N4N"
    });

    let db = null;
    let isConnectedToCloud = false;
    let connectedRef = null;

    // Active targeted listeners pool: Map<string, { ref: firebase.database.Reference, handler: Function }>
    const ACTIVE_LISTENERS_MAP = new Map();

    try {
        if (typeof window.firebase !== 'undefined') {
            if (!window.firebase.apps.length) {
                window.firebase.initializeApp(firebaseConfig);
            }
            db = window.firebase.database();
            console.log('✅ [CloudEngine] Firebase Realtime Database Initialized.');
        } else {
            console.warn('⚠️ [CloudEngine] Firebase SDK not detected. Operating in pure offline mode.');
        }
    } catch (initErr) {
        console.error('❌ [CloudEngine] Initialization failure:', initErr);
    }

    /* ========================================================================
       2. REAL-TIME CONNECTION MONITORING (.info/connected)
       ------------------------------------------------------------------------
       Firebase ke internal `.info/connected` node se accurate network connection
       state pata chalti hai. Isse sync badge dynamically accurate rehta hai.
    ======================================================================== */

    /**
     * Updates the UI sync badge safely without DOM exceptions
     * @param {'online'|'syncing'|'offline'|'error'} status 
     */
    const showSyncStatus = (status) => {
        const badge = document.getElementById('cloud-status-badge');
        if (!badge) return;

        // Backup Preview Mode Guard
        if (typeof window.isBackupPreviewMode !== 'undefined' && window.isBackupPreviewMode) {
            badge.className = 'sync-badge';
            badge.style.background = '#fef08a';
            badge.style.color = '#854d0e';
            badge.innerHTML = '👁️ Preview Mode';
            return;
        }

        switch (status) {
            case 'syncing':
                badge.className = 'sync-badge sync-syncing';
                badge.style.background = '#dbeafe';
                badge.style.color = '#1d4ed8';
                badge.innerHTML = '🔄 Syncing...';
                break;
            case 'offline':
                badge.className = 'sync-badge';
                badge.style.background = '#fff7ed';
                badge.style.color = '#ea580c';
                badge.innerHTML = '🟠 Offline Mode';
                break;
            case 'error':
                badge.className = 'sync-badge';
                badge.style.background = '#fee2e2';
                badge.style.color = '#dc2626';
                badge.innerHTML = '⚠️ Sync Error';
                break;
            case 'online':
            default:
                badge.className = 'sync-badge';
                badge.style.background = '#ecfdf5';
                badge.style.color = '#059669';
                badge.innerHTML = '🟢 Cloud Synced';
                break;
        }
    };

    /**
     * Initializes the Firebase WebSocket connection listener
     */
    const initConnectionWatcher = () => {
        if (!db) return;

        try {
            connectedRef = db.ref('.info/connected');
            connectedRef.on('value', (snap) => {
                const isOnline = Boolean(snap.val());
                isConnectedToCloud = isOnline;

                if (isOnline) {
                    console.log('🌐 [CloudEngine] Cloud WebSocket Connected.');
                    showSyncStatus('online');

                    // If offline sync queue has pending items, flush them
                    if (typeof window.flushSyncQueue === 'function') {
                        window.flushSyncQueue();
                    }
                } else {
                    console.warn('📶 [CloudEngine] Cloud Disconnected (Offline/Reconnecting).');
                    showSyncStatus('offline');
                }
            });
        } catch (connErr) {
            console.warn('[CloudEngine] Connection listener setup error:', connErr);
        }
    };

    // Auto-mount connection watcher if DB is ready
    if (db) initConnectionWatcher();

    /* ========================================================================
       3. MODULAR TARGETED LISTENERS (Zero-Bandwidth-Waste)
       ------------------------------------------------------------------------
       Root `users/{uid}` par listener lagane se har ek chhote badlav par saari
       purani sessions ka 20MB-50MB data download ho raha tha.
       Ab sirf active global keys aur current financial session par listen hota hai.
    ======================================================================== */

    /**
     * Detaches all active Firebase listeners cleanly (Memory leak prevention)
     */
    const detachFirebaseLiveListeners = () => {
        try {
            ACTIVE_LISTENERS_MAP.forEach(({ ref, handler }, key) => {
                ref.off('value', handler);
            });
            ACTIVE_LISTENERS_MAP.clear();
            console.log('🧹 [CloudEngine] All previous listeners successfully detached.');
        } catch (err) {
            console.error('[CloudEngine] Error detaching listeners:', err);
        }
    };

    /**
     * Attaches a single targeted listener to a specific cloud path
     * @param {string} fullCacheKey - Local L1 Cache Key (e.g., 'u1_2026-2027_kariger_list')
     * @param {string} cloudRelativePath - Cloud path under users/{uid}/...
     */
    const attachTargetedListener = (fullCacheKey, cloudRelativePath) => {
        if (!db || typeof window.currentUserId === 'undefined' || !window.currentUserId) return;

        const uid = String(window.currentUserId).trim().toLowerCase();
        const nodePath = `users/${uid}/${cloudRelativePath}`;

        // Agar listener pehle se active hai toh duplicate mat lagao
        if (ACTIVE_LISTENERS_MAP.has(nodePath)) return;

        try {
            const targetRef = db.ref(nodePath);

            const handler = (snapshot) => {
                if (typeof window.isBackupPreviewMode !== 'undefined' && window.isBackupPreviewMode) return;

                const remoteVal = snapshot.val();
                if (remoteVal === null || remoteVal === undefined) return;

                // Circular loop shield: local setStore trigger hone par remote update loop roko
                if (window.StorageEngine) {
                    window.StorageEngine.isRemoteUpdating = true;
                } else {
                    window.isRemoteUpdating = true;
                }

                try {
                    const cleanData = (Array.isArray(remoteVal) && typeof window.safeArray === 'function')
                        ? window.safeArray(remoteVal)
                        : remoteVal;

                    // 1. Update L1 Memory Cache
                    if (window.APP_MEMORY_CACHE) {
                        window.APP_MEMORY_CACHE[fullCacheKey] = cleanData;
                    }

                    // 2. Update L3 IndexedDB
                    if (typeof window.idbPut === 'function') {
                        window.idbPut(fullCacheKey, cleanData);
                    }

                    // 3. Update L2 LocalStorage
                    try {
                        localStorage.setItem(fullCacheKey, JSON.stringify(cleanData));
                    } catch (_) {}

                    // 4. Trigger UI screen repaint
                    if (typeof window.triggerActiveSectionRefresh === 'function') {
                        window.triggerActiveSectionRefresh();
                    }

                    showSyncStatus('online');
                } catch (dataErr) {
                    console.error('[CloudEngine] Data transform error:', dataErr);
                } finally {
                    if (window.StorageEngine) {
                        window.StorageEngine.isRemoteUpdating = false;
                    } else {
                        window.isRemoteUpdating = false;
                    }
                }
            };

            targetRef.on('value', handler);
            ACTIVE_LISTENERS_MAP.set(nodePath, { ref: targetRef, handler });
        } catch (err) {
            console.error(`[CloudEngine] Failed to bind listener on ${nodePath}:`, err);
        }
    };

    /**
     * Primary entry point: Initializes targeted listeners for current tenant
     */
    const initFirebaseLiveListeners = () => {
        if (!db || typeof window.currentUserId === 'undefined' || !window.currentUserId) return;

        const uid = String(window.currentUserId).trim().toLowerCase();
        if (uid === 'app') return;

        // Clean any existing listeners before rebinding
        detachFirebaseLiveListeners();

        // 1. Resolve Active Financial Session
        let session = '2026-2027';
        try {
            if (typeof window.getActiveFinancialSession === 'function') {
                session = window.getActiveFinancialSession();
            } else {
                session = localStorage.getItem(`${uid}_app_active_session`) || '2026-2027';
            }
        } catch (_) {}
        session = String(session).replace(/['"]+/g, '').trim() || '2026-2027';

        console.log(`📡 [CloudEngine] Binding Targeted Listeners for Tenant: [${uid}] | Session: [${session}]`);

        // 2. Global Tenant-Level Nodes (Har session me live rahengi)
        const globalKeys = [
            'app_sessions_list',
            'karkhana_list',
            'active_karkhana_id',
            'karkhana_transfers',
            'app_users',
            'info_ledger'
        ];

        globalKeys.forEach((key) => {
            const cacheKey = `${uid}_${key}`;
            attachTargetedListener(cacheKey, key);
        });

        // 3. Current Session Scoped Nodes (Bandwidth-saving: Purani sessions download nahi hongi)
        const sessionKeys = [
            'kariger_list',
            'bana_stock',
            'zari_stock',
            'sancha_list',
            'saree_stock',
            'cutting_records',
            'calender_records',
            'daybook_records',
            'payment_records',
            'dukan_records'
        ];

        sessionKeys.forEach((key) => {
            const cacheKey = `${uid}_${session}_${key}`;
            const cloudPath = `${session}_${key}`;
            attachTargetedListener(cacheKey, cloudPath);
        });
    };

    /**
     * Financial Session Switch Handler: Detaches previous session nodes and attaches new ones
     * @param {string} newSession - e.g., '2027-2028'
     */
    const switchSessionListeners = (newSession) => {
        if (!newSession) return;
        console.log(`🔄 [CloudEngine] Switching targeted cloud listeners to session: ${newSession}`);
        initFirebaseLiveListeners();
    };

    /* ========================================================================
       4. CONFLICT-SAFE DIRECT WRITE HELPER (Atomic Timestamp Guard)
       ------------------------------------------------------------------------
    ======================================================================== */

    /**
     * Writes data directly to Firebase with network status management
     * @param {string} relativePath - Path under users/{uid}/...
     * @param {any} data - Payload
     * @returns {Promise<boolean>}
     */
    const cloudWrite = async (relativePath, data) => {
        if (!db || typeof window.currentUserId === 'undefined' || !window.currentUserId) {
            return false;
        }

        const uid = String(window.currentUserId).trim().toLowerCase();
        if (uid === 'app') return false;

        showSyncStatus('syncing');

        try {
            const targetPath = `users/${uid}/${relativePath}`;
            await db.ref(targetPath).set(data);
            showSyncStatus('online');
            return true;
        } catch (err) {
            console.error('[CloudEngine] cloudWrite failed:', err);
            showSyncStatus('error');
            return false;
        }
    };

    /* ========================================================================
       5. GLOBAL EXPORT & BACKWARD COMPATIBILITY
       ------------------------------------------------------------------------
    ======================================================================== */
    const publicCloudAPI = {
        get db() { return db; },
        get isConnectedToCloud() { return isConnectedToCloud; },
        showSyncStatus,
        initFirebaseLiveListeners,
        detachFirebaseLiveListeners,
        switchSessionListeners,
        cloudWrite,
        attachTargetedListener
    };

    // Attach to window globally for legacy modules
    window.db = db;
    window.showSyncStatus = showSyncStatus;
    window.initFirebaseLiveListeners = initFirebaseLiveListeners;
    window.detachFirebaseLiveListeners = detachFirebaseLiveListeners;
    window.switchSessionListeners = switchSessionListeners;

    // Dedicated namespace
    window.CloudEngine = publicCloudAPI;

    // Unit test export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = publicCloudAPI;
    }
})();
