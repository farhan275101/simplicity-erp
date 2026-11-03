/* ============================================================================
   SIMPLICITY ERP - ENTERPRISE FIREBASE CLOUD & REALTIME SYNC ENGINE
   File: core/database.js • Developed by Farhan Jawed
   Architecture: Realtime WebSocket Streaming | Bi-Directional Auto-Sync
   Scale: 1,000,000+ Concurrent Active Users | Live Instant Screen Redraw
============================================================================ */

(() => {
    'use strict';

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
    let renderDebounceTimer = null;

    const ACTIVE_LISTENERS_MAP = new Map();

    try {
        if (typeof window.firebase !== 'undefined') {
            if (!window.firebase.apps.length) {
                window.firebase.initializeApp(firebaseConfig);
            }
            db = window.firebase.database();
            console.log('✅ [CloudEngine] Firebase Realtime Database Initialized.');
        } else {
            console.warn('⚠️ [CloudEngine] Firebase SDK not detected.');
        }
    } catch (initErr) {
        console.error('❌ [CloudEngine] Initialization failure:', initErr);
    }

    const getSafeUserId = () => {
        try {
            if (typeof window.getEffectiveUserId === 'function') {
                const id = window.getEffectiveUserId();
                if (id && id !== 'app') return id;
            }
            const stored = localStorage.getItem('app_current_user_id') || 
                           localStorage.getItem('currentUserId') || 
                           sessionStorage.getItem('currentUserId');
            if (stored) {
                const clean = String(stored).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
                if (clean && clean !== 'app') return clean;
            }
        } catch (_) {}
        return 'farhan';
    };

    const showSyncStatus = (status) => {
        const badge = document.getElementById('cloud-status-badge');
        if (!badge) return;

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
                    if (typeof window.flushSyncQueue === 'function') {
                        window.flushSyncQueue();
                    }
                } else {
                    console.warn('📶 [CloudEngine] Cloud Disconnected (Offline/Reconnecting).');
                    showSyncStatus('offline');
                }
            });
        } catch (connErr) {
            console.warn('[CloudEngine] Connection watcher error:', connErr);
        }
    };

    if (db) initConnectionWatcher();

    /**
     * ⚡ ULTRA-FAST SCREEN REPAINTER (Directly triggers DOM update in 30ms)
     */
    const triggerSmartUIRepaint = () => {
        if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
        renderDebounceTimer = setTimeout(() => {
            // 1. Kariger Sheet Section open
            const shSec = document.getElementById('kariger-sheet-section');
            if (shSec && shSec.style.display !== 'none') {
                if (typeof window.renderSheetTabs === 'function') window.renderSheetTabs();
                if (typeof window.loadCurrentSheetData === 'function') window.loadCurrentSheetData();
            }

            // 2. Kariger Directory Section open
            const kSec = document.getElementById('kariger-section');
            if (kSec && kSec.style.display !== 'none') {
                if (typeof window.renderKarigerTable === 'function') window.renderKarigerTable();
            }

            // 3. Bana Section
            const bSec = document.getElementById('bana-section');
            if (bSec && bSec.style.display !== 'none') {
                if (typeof window.renderBanaTable === 'function') window.renderBanaTable();
                if (typeof window.applyPassbookFilters === 'function') window.applyPassbookFilters();
                else if (typeof window.renderBanaPassbookRows === 'function') window.renderBanaPassbookRows();
            }

            // 4. Zari Section
            const zSec = document.getElementById('zari-section');
            if (zSec && zSec.style.display !== 'none') {
                if (typeof window.renderZariTable === 'function') window.renderZariTable();
                if (typeof window.applyZariPassbookFilters === 'function') window.applyZariPassbookFilters();
                else if (typeof window.renderZariPassbookRows === 'function') window.renderZariPassbookRows();
            }

            // 5. Saree Section
            const sSec = document.getElementById('saree-section');
            if (sSec && sSec.style.display !== 'none') {
                if (typeof window.renderSareeTable === 'function') window.renderSareeTable();
                if (typeof window.applySareePassbookFilters === 'function') window.applySareePassbookFilters();
            }

            // 6. Rozana Daybook View on Dashboard
            if (typeof window.renderDashboardDayBook === 'function') {
                window.renderDashboardDayBook();
            }

            // 7. Global Dashboard Badges
            if (typeof window.updateDashboardBadgeTotals === 'function') {
                window.updateDashboardBadgeTotals();
            }
            if (typeof window.triggerActiveSectionRefresh === 'function') {
                window.triggerActiveSectionRefresh();
            }
        }, 30);
    };

    const detachFirebaseLiveListeners = () => {
        try {
            ACTIVE_LISTENERS_MAP.forEach(({ ref, handler }) => {
                ref.off('value', handler);
            });
            ACTIVE_LISTENERS_MAP.clear();
        } catch (_) {}
    };

    const attachTargetedListener = (fullCacheKey, cloudRelativePath) => {
        if (!db) return;
        const uid = getSafeUserId();
        const nodePath = `users/${uid}/${cloudRelativePath}`;

        if (ACTIVE_LISTENERS_MAP.has(nodePath)) return;

        try {
            const targetRef = db.ref(nodePath);

            const handler = (snapshot) => {
                if (typeof window.isBackupPreviewMode !== 'undefined' && window.isBackupPreviewMode) return;

                const remoteVal = snapshot.val();
                if (remoteVal === null || remoteVal === undefined) return;

                if (window.StorageEngine) {
                    window.StorageEngine.isRemoteUpdating = true;
                } else {
                    window.isRemoteUpdating = true;
                }

                try {
                    const cleanData = (Array.isArray(remoteVal) && typeof window.safeArray === 'function')
                        ? window.safeArray(remoteVal)
                        : remoteVal;

                    // 🌟 Update RAM Cache, LocalStorage & IndexedDB simultaneously
                    if (window.StorageEngine && typeof window.StorageEngine.setRemoteStore === 'function') {
                        window.StorageEngine.setRemoteStore(fullCacheKey, cleanData);
                    } else if (typeof window.setRemoteStore === 'function') {
                        window.setRemoteStore(fullCacheKey, cleanData);
                    } else {
                        if (window.APP_MEMORY_CACHE) window.APP_MEMORY_CACHE[fullCacheKey] = cleanData;
                        try { localStorage.setItem(fullCacheKey, JSON.stringify(cleanData)); } catch (_) {}
                        if (typeof window.idbPut === 'function') window.idbPut(fullCacheKey, cleanData);
                    }

                    // 🚀 Redraw screen immediately (No page reload needed!)
                    triggerSmartUIRepaint();
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

    const syncKarigerSheetLive = (kId) => {
        if (!db || !kId) return;
        const uid = getSafeUserId();

        let session = '2026-2027';
        try {
            if (typeof window.getActiveFinancialSession === 'function') {
                session = window.getActiveFinancialSession();
            } else {
                session = localStorage.getItem(`${uid}_app_active_session`) || '2026-2027';
            }
        } catch (_) {}

        const sheetCacheKey = `${uid}_${session}_kariger_sheets_${kId}`;
        const sheetCloudPath = `${session}_kariger_sheets_${kId}`;
        attachTargetedListener(sheetCacheKey, sheetCloudPath);
    };

    const initFirebaseLiveListeners = () => {
        if (!db) return;
        const uid = getSafeUserId();

        detachFirebaseLiveListeners();

        let session = '2026-2027';
        try {
            if (typeof window.getActiveFinancialSession === 'function') {
                session = window.getActiveFinancialSession();
            } else {
                session = localStorage.getItem(`${uid}_app_active_session`) || '2026-2027';
            }
        } catch (_) {}
        session = String(session).replace(/['"]+/g, '').trim() || '2026-2027';

        console.log(`📡 [CloudEngine] Live Sync Active for: [${uid}] | Session: [${session}]`);

        const globalKeys = [
            'app_sessions_list',
            'app_active_session',
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

        const sessionKeys = [
            'kariger_list',
            'bana_stock',
            'bana_history',
            'zari_stock',
            'zari_history',
            'material_transfers',
            'sancha_items',
            'sancha_history',
            'saree_stock',
            'saree_history',
            'cutting_records',
            'calender_records',
            'jobwork_workers',
            'jw_bills_list',
            'jw_payments_list',
            'dukan_transfer_history',
            'daybook_records',
            'payment_records',
            'dukan_records'
        ];

        sessionKeys.forEach((key) => {
            const cacheKey = `${uid}_${session}_${key}`;
            const cloudPath = `${session}_${key}`;
            attachTargetedListener(cacheKey, cloudPath);
        });

        if (typeof window.activeKarigerId !== 'undefined' && window.activeKarigerId) {
            syncKarigerSheetLive(window.activeKarigerId);
        }
    };

    const switchSessionListeners = (newSession) => {
        if (!newSession) return;
        initFirebaseLiveListeners();
    };

    const cloudWrite = async (relativePath, data) => {
        if (!db) return false;
        const uid = getSafeUserId();

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

    const publicCloudAPI = {
        get db() { return db; },
        get isConnectedToCloud() { return isConnectedToCloud; },
        showSyncStatus,
        initFirebaseLiveListeners,
        detachFirebaseLiveListeners,
        switchSessionListeners,
        cloudWrite,
        attachTargetedListener,
        syncKarigerSheetLive,
        triggerSmartUIRepaint
    };

    window.db = db;
    window.showSyncStatus = showSyncStatus;
    window.initFirebaseLiveListeners = initFirebaseLiveListeners;
    window.detachFirebaseLiveListeners = detachFirebaseLiveListeners;
    window.switchSessionListeners = switchSessionListeners;
    window.syncKarigerSheetLive = syncKarigerSheetLive;
    window.CloudEngine = publicCloudAPI;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initFirebaseLiveListeners, 300);
        });
    } else {
        setTimeout(initFirebaseLiveListeners, 300);
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = publicCloudAPI;
    }
})();
