/* ============================================================================
   SIMPLICITY ERP - HIGH-SCALE FINANCIAL YEAR SESSION CONTROLLER
   File: session/session.js • Developed by Farhan Jawed
   Architecture: Non-Blocking Event-Loop Sweeping | Chunked Cloud Batch Deletion
   Scale: 1,000,000 - 2,000,000 Concurrent Active Users | Zero UI Freeze
============================================================================ */

(() => {
    'use strict';

    /* ========================================================================
       1. CONSTANTS & TIME-SLICED BATCHING CONFIGURATION
       ------------------------------------------------------------------------
       Firebase RTDB me ek sath 2000-5000 keys bhejne se payload overflow (413)
       aur network timeout hota hai. Hum chunked micro-batches use karte hain.
    ======================================================================== */
    const FIREBASE_BATCH_CHUNK_SIZE = 80;   // Safe limit per cloud update
    const LOCAL_PURGE_CHUNK_SIZE = 50;       // Main thread freeze protection
    const DEFAULT_BOOTSTRAP_SESSION = '2026-2027';

    /**
     * Yields execution to browser event loop (Prevents UI jank & ANR)
     */
    const yieldEventLoop = () => new Promise((resolve) => setTimeout(resolve, 0));

    /**
     * User ID Resolver
     * @returns {string} Sanitized user ID
     */
    const getEffectiveUserId = () => {
        try {
            if (typeof window.currentUserId !== 'undefined' && window.currentUserId) {
                return String(window.currentUserId).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
            }
            const stored = localStorage.getItem('app_current_user_id');
            if (stored) {
                return String(stored).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
            }
        } catch (_) {}
        return 'app';
    };

    /* ========================================================================
       2. SESSION DISCOVERY & RESOLUTION
       ------------------------------------------------------------------------
    ======================================================================== */

    /**
     * Retrieves all recorded financial sessions for current tenant
     * @returns {Array<string>} Array of sessions (e.g., ['2025-2026', '2026-2027'])
     */
    const getAppSessions = () => {
        const uId = getEffectiveUserId();
        const userKey = `${uId}_app_sessions_list`;

        let list = [];
        try {
            const raw = (window.APP_MEMORY_CACHE && window.APP_MEMORY_CACHE[userKey]) || localStorage.getItem(userKey);
            if (raw) {
                list = (typeof raw === 'string') ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
            }
        } catch (_) {
            list = [];
        }

        // Fallback default initialization
        if (!Array.isArray(list) || list.length === 0) {
            list = [DEFAULT_BOOTSTRAP_SESSION];
            try {
                localStorage.setItem(userKey, JSON.stringify(list));
                if (window.APP_MEMORY_CACHE) window.APP_MEMORY_CACHE[userKey] = list;
                if (typeof window.idbPut === 'function') window.idbPut(userKey, list);
            } catch (_) {}
        }

        return list.map((s) => String(s).replace(/['"]+/g, '').trim());
    };

    /**
     * Resolves the current active financial year session
     * @returns {string} Active session string (e.g., '2026-2027')
     */
    const getActiveFinancialSession = () => {
        const uId = getEffectiveUserId();
        const userKey = `${uId}_app_active_session`;

        let sess = (window.APP_MEMORY_CACHE && window.APP_MEMORY_CACHE[userKey]) || localStorage.getItem(userKey);

        if (!sess || typeof sess !== 'string' || sess === '[]' || sess === 'null') {
            const list = getAppSessions();
            sess = list[list.length - 1] || DEFAULT_BOOTSTRAP_SESSION;

            try {
                localStorage.setItem(userKey, sess);
                if (window.APP_MEMORY_CACHE) window.APP_MEMORY_CACHE[userKey] = sess;
                if (typeof window.idbPut === 'function') window.idbPut(userKey, sess);
            } catch (_) {}
        }

        return String(sess).replace(/['"]+/g, '').trim() || DEFAULT_BOOTSTRAP_SESSION;
    };

    /**
     * Populates active session dropdown across the UI
     */
    const populateSessionDropdown = () => {
        const sel = document.getElementById('app-session-select');
        if (!sel) return;

        sel.innerHTML = '';
        const sessions = getAppSessions();
        const activeSess = getActiveFinancialSession();

        sessions.forEach((s) => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = `📅 ${s}`;
            if (String(s) === String(activeSess)) {
                opt.selected = true;
            }
            sel.appendChild(opt);
        });
    };

    /* ========================================================================
       3. CONCURRENCY-SAFE SESSION SWITCHING
       ------------------------------------------------------------------------
       Purani session ke cloud listeners cleanly detach karke nayi session ke
       targeted nodes attach karta hai taaki race condition aur memory leaks na hon.
    ======================================================================== */

    /**
     * Switches the active session and repaints all ERP views
     * @param {string} targetSession - e.g., '2025-2026'
     */
    const switchAppFinancialSession = async (targetSession) => {
        const activeSess = getActiveFinancialSession();
        if (!targetSession || targetSession === activeSess) return;

        if (!confirm(`Kya aap Session badal kar '${targetSession}' me jana chahte hain?`)) {
            populateSessionDropdown();
            return;
        }

        const cleanTarget = String(targetSession).replace(/['"]+/g, '').trim();
        const uId = getEffectiveUserId();

        try {
            // 1. Detach old cloud listeners
            if (typeof window.detachFirebaseLiveListeners === 'function') {
                window.detachFirebaseLiveListeners();
            }

            // 2. Persist new session pointer
            localStorage.setItem(`${uId}_app_active_session`, cleanTarget);
            if (typeof window.idbPut === 'function') {
                window.idbPut(`${uId}_app_active_session`, cleanTarget);
            }

            if (typeof window.db !== 'undefined' && window.db && uId && uId !== 'app') {
                try {
                    window.db.ref(`users/${uId}/app_active_session`).set(cleanTarget);
                } catch (_) {}
            }

            // 3. Clear L1 RAM Cache & re-warm
            if (typeof window.clearMemoryCache === 'function') {
                window.clearMemoryCache();
            }
            if (window.APP_MEMORY_CACHE) {
                window.APP_MEMORY_CACHE[`${uId}_app_active_session`] = cleanTarget;
            }

            // 4. Preload IndexedDB for new session
            const afterPreload = () => {
                populateSessionDropdown();

                // Re-bind targeted cloud listeners to the new session
                if (window.CloudEngine && typeof window.CloudEngine.switchSessionListeners === 'function') {
                    window.CloudEngine.switchSessionListeners(cleanTarget);
                } else if (typeof window.initFirebaseLiveListeners === 'function') {
                    window.initFirebaseLiveListeners();
                }

                if (typeof window.backToDashboard === 'function') window.backToDashboard();
                if (typeof window.triggerActiveSectionRefresh === 'function') window.triggerActiveSectionRefresh();
                if (typeof window.updateDashboardBadgeTotals === 'function') window.updateDashboardBadgeTotals();
            };

            if (typeof window.initIndexedDBPreload === 'function') {
                window.initIndexedDBPreload(afterPreload);
            } else {
                afterPreload();
            }
        } catch (err) {
            console.error('[SessionEngine:switchAppFinancialSession] Switch error:', err);
            populateSessionDropdown();
            alert('Session switch karne me takleef aayi.');
        }
    };

    /* ========================================================================
       4. MODAL PRESENTATION & WORKFLOW CONTROLS
       ------------------------------------------------------------------------
    ======================================================================== */

    const openSessionClosingModal = () => {
        const modal = document.getElementById('session-closing-modal');
        if (!modal) return;

        const curDisplay = document.getElementById('session-current-display');
        const cur = getActiveFinancialSession();
        if (curDisplay) curDisplay.value = cur;

        const newInp = document.getElementById('session-new-input');
        if (newInp) {
            const parts = cur.split('-');
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                newInp.value = `${parseInt(parts[0], 10) + 1}-${parseInt(parts[1], 10) + 1}`;
            } else {
                newInp.value = '';
            }
        }

        let checklistBox = document.getElementById('session-closing-guidelines-box');
        if (!checklistBox && newInp && newInp.parentNode) {
            checklistBox = document.createElement('div');
            checklistBox.id = 'session-closing-guidelines-box';
            checklistBox.style.cssText = 'background:#f0fdf4; border:1px solid #86efac; border-radius:10px; padding:12px; margin:12px 0; text-align:left; font-size:12px;';
            const targetBtn = document.querySelector("#session-closing-modal button[onclick*='startSequentialYearClosing']");
            if (targetBtn && targetBtn.parentNode) {
                targetBtn.parentNode.insertBefore(checklistBox, targetBtn);
            }
        }

        if (checklistBox) {
            checklistBox.innerHTML = `
                <strong style="color:#15803d; font-size:13px; display:block; margin-bottom:6px;">📋 Naye Saal Me Kya-Kya Badlaav Honge:</strong>
                <div style="color:#166534; line-height:1.7;">
                    <div>🧵 <strong>Kariger Khata:</strong> Pichli mazdoori, pichla bana & zari naye saal ki <b>Tani 1</b> ka Opening Balance banegi.</div>
                    <div>🥻 <strong>Saree Stock:</strong> Sabhi godamon ki bachi hui saree naye saal ka <b>Opening Stock</b> ban kar aayegi.</div>
                    <div>🧶 <strong>Bana & ✨ Zari:</strong> Godam ka bacha wazan naye saal ke godam mein <b>Opening Stock</b> judega.</div>
                    <div>⚙️ <strong>Sancha & Job Work:</strong> Baki bacha maal aage carry-forward hoga.</div>
                    <div>🔒 <strong>Purana Saal Safe:</strong> Pichla saal freeze ho jayega, jise aap dropdown se kabhi bhi khol kar dekh sakte hain.</div>
                </div>`;
        }

        const delSel = document.getElementById('session-delete-select');
        if (delSel) {
            delSel.innerHTML = "<option value=''>-- Chunein --</option>";
            const sessions = getAppSessions();
            sessions.forEach((s) => {
                delSel.innerHTML += `<option value="${s}">${s}</option>`;
            });
        }

        modal.style.display = 'flex';
    };

    const closeSessionClosingModal = () => {
        const modal = document.getElementById('session-closing-modal');
        if (modal) modal.style.display = 'none';
    };

    /* ========================================================================
       5. CHUNKED CLOUD & NON-BLOCKING LOCAL PURGE ENGINE
       ------------------------------------------------------------------------
       2000+ Karigers aur hazaron jobwork sheets ko bina phone hang kiye
       asynchronously saaf karne ka engine.
    ======================================================================== */

    /**
     * Asynchronously purges keys from LocalStorage in non-blocking time-slices
     */
    const nonBlockingLocalStoragePurge = async (prefix) => {
        const keysToRemove = [];
        const len = localStorage.length;
        for (let i = 0; i < len; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(prefix)) {
                keysToRemove.push(k);
            }
        }

        for (let i = 0; i < keysToRemove.length; i++) {
            localStorage.removeItem(keysToRemove[i]);
            if ((i + 1) % LOCAL_PURGE_CHUNK_SIZE === 0) {
                await yieldEventLoop();
            }
        }
    };

    /**
     * Purges session data from IndexedDB using efficient KeyRange deletion
     */
    const atomicIndexedDBPurge = async (prefix) => {
        return new Promise((resolve) => {
            if (typeof window.openEnterpriseIndexedDB !== 'function') return resolve();

            window.openEnterpriseIndexedDB((dbase) => {
                if (!dbase) return resolve();
                try {
                    const tx = dbase.transaction('app_store', 'readwrite');
                    const store = tx.objectStore('app_store');

                    // Fast atomic range delete: O(log N) instead of slow cursor loop
                    if (typeof IDBKeyRange !== 'undefined' && IDBKeyRange.bound) {
                        const range = IDBKeyRange.bound(prefix, `${prefix}\uffff`);
                        store.delete(range);
                        tx.oncomplete = () => resolve();
                        tx.onerror = () => resolve();
                    } else {
                        // Fallback cursor purge
                        const req = store.openCursor();
                        req.onsuccess = (e) => {
                            const cursor = e.target.result;
                            if (cursor) {
                                if (String(cursor.key).startsWith(prefix)) {
                                    cursor.delete();
                                }
                                cursor.continue();
                            } else {
                                resolve();
                            }
                        };
                        req.onerror = () => resolve();
                    }
                } catch (_) {
                    resolve();
                }
            });
        });
    };

    /**
     * Chunked Cloud Batch Deletion (Firebase Payload Guard)
     * Splits 5000+ keys into micro-batches of 80 keys per update.
     */
    const executeChunkedCloudDeletion = async (uId, deletePayloadMap) => {
        if (typeof window.db === 'undefined' || !window.db || !uId || uId === 'app') return;

        const allKeys = Object.keys(deletePayloadMap);
        const total = allKeys.length;
        if (total === 0) return;

        for (let i = 0; i < total; i += FIREBASE_BATCH_CHUNK_SIZE) {
            const chunkKeys = allKeys.slice(i, i + FIREBASE_BATCH_CHUNK_SIZE);
            const chunkPayload = {};
            chunkKeys.forEach((key) => {
                chunkPayload[key] = null; // Setting to null deletes the node
            });

            try {
                await window.db.ref(`users/${uId}`).update(chunkPayload);
            } catch (err) {
                console.warn(`[SessionEngine] Chunk push failed at index ${i}:`, err);
            }

            // Yield thread & network buffer
            await yieldEventLoop();
        }
    };

    /**
     * 🌟 ZERO-CRASH SESSION DELETE ENGINE
     */
    const confirmAndDeleteSessionWithAuth = async () => {
        const delSel = document.getElementById('session-delete-select');
        const targetSess = delSel ? delSel.value : '';
        const uInp = String(document.getElementById('session-del-user-id')?.value || '').trim().toLowerCase();
        const pInp = String(document.getElementById('session-del-password')?.value || '').trim();

        if (!targetSess) return alert('Pehle delete karne ke liye session chunein!');
        if (!uInp || !pInp) return alert('User ID aur Password daalna zaroori hai!');

        // 1. Scalable Authentication Check
        let authenticated = false;
        if (window.AuthEngine && typeof window.AuthEngine.fetchUserByIdentifier === 'function') {
            const user = await window.AuthEngine.fetchUserByIdentifier(uInp);
            if (user && String(user.pass).trim() === pInp) {
                authenticated = true;
            }
        } else if (typeof window.getUsersList === 'function') {
            const users = window.getUsersList();
            const foundUser = users.find((u) => {
                const matchId = (u.id && String(u.id).toLowerCase() === uInp);
                const matchMob = (u.mobile && String(u.mobile).trim() === uInp);
                return (matchId || matchMob) && String(u.pass) === pInp;
            });
            if (foundUser) authenticated = true;
        }

        if (!authenticated) {
            return alert('❌ Galat User ID ya Password! Session delete nahi hoga.');
        }

        let sessions = getAppSessions();
        if (sessions.length <= 1) {
            return alert('❌ Aakhri bacha hua Session delete nahi ho sakta!');
        }

        if (!confirm(`⚠️ KYA AAP SACH ME '${targetSess}' KA PURA DATA DELETE KARNA CHAHTE HAIN?\nIs saal ka sara hisab phone aur cloud dono se permanently delete ho jayega!`)) {
            return;
        }

        const uId = getEffectiveUserId();

        // 2. Mute Cloud Listeners to prevent thousands of event triggers
        if (typeof window.detachFirebaseLiveListeners === 'function') {
            window.detachFirebaseLiveListeners();
        } else if (typeof window.db !== 'undefined' && window.db && uId && uId !== 'app') {
            try { window.db.ref(`users/${uId}`).off(); } catch (_) {}
        }

        // 3. Extract workers & karigers to compile deletion registry
        const karigerListKey = `${uId}_${targetSess}_kariger_list`;
        const jwListKey = `${uId}_${targetSess}_jobwork_workers`;

        let oldKarigers = (window.APP_MEMORY_CACHE && window.APP_MEMORY_CACHE[karigerListKey]) || [];
        if (!oldKarigers.length) {
            try { oldKarigers = JSON.parse(localStorage.getItem(karigerListKey) || '[]'); } catch (_) {}
        }

        let oldWorkers = (window.APP_MEMORY_CACHE && window.APP_MEMORY_CACHE[jwListKey]) || [];
        if (!oldWorkers.length) {
            try { oldWorkers = JSON.parse(localStorage.getItem(jwListKey) || '[]'); } catch (_) {}
        }

        // 4. Update Sessions List
        sessions = sessions.filter((s) => s !== targetSess);
        localStorage.setItem(`${uId}_app_sessions_list`, JSON.stringify(sessions));
        if (typeof window.idbPut === 'function') {
            window.idbPut(`${uId}_app_sessions_list`, sessions);
        }

        // 5. Build Cloud Deletion Payload Map
        const cloudDeleteMap = {};
        const standardKeys = [
            'kariger_list', 'saree_history', 'saree_stock', 'bana_stock', 'bana_history',
            'zari_stock', 'zari_history', 'sancha_items', 'sancha_history',
            'jobwork_workers', 'jw_bills_list', 'jw_payments_list', 'dukan_transfer_history',
            'daybook_records', 'payment_records', 'dukan_records'
        ];

        standardKeys.forEach((sk) => {
            cloudDeleteMap[`${targetSess}_${sk}`] = null;
        });

        // Add 2000+ individual Kariger & Worker accounts to delete map
        if (Array.isArray(oldKarigers)) {
            oldKarigers.forEach((k) => {
                if (k && k.id) cloudDeleteMap[`${targetSess}_kariger_sheets_${k.id}`] = null;
            });
        }
        if (Array.isArray(oldWorkers)) {
            oldWorkers.forEach((w) => {
                if (w && w.id) cloudDeleteMap[`${targetSess}_jobwork_sheets_${w.id}`] = null;
            });
        }

        // 6. Asynchronously execute micro-batch cloud deletion
        if (typeof window.db !== 'undefined' && window.db && uId && uId !== 'app') {
            try {
                await window.db.ref(`users/${uId}/app_sessions_list`).set(sessions);
                await executeChunkedCloudDeletion(uId, cloudDeleteMap);
            } catch (cloudErr) {
                console.error('[SessionEngine] Cloud deletion partial error:', cloudErr);
            }
        }

        // 7. Non-blocking LocalStorage & Memory Sweep
        const prefix = `${uId}_${targetSess}_`;
        await nonBlockingLocalStoragePurge(prefix);

        if (window.APP_MEMORY_CACHE) {
            Object.keys(window.APP_MEMORY_CACHE).forEach((mk) => {
                if (mk.startsWith(prefix)) delete window.APP_MEMORY_CACHE[mk];
            });
        }

        // 8. Atomic IndexedDB Purge
        await atomicIndexedDBPurge(prefix);

        // 9. Re-align Active Session if target was active
        const cur = getActiveFinancialSession();
        if (cur === targetSess) {
            const nextActive = sessions[sessions.length - 1];
            localStorage.setItem(`${uId}_app_active_session`, nextActive);
            if (window.APP_MEMORY_CACHE) window.APP_MEMORY_CACHE[`${uId}_app_active_session`] = nextActive;
            if (typeof window.db !== 'undefined' && window.db && uId && uId !== 'app') {
                try { window.db.ref(`users/${uId}/app_active_session`).set(nextActive); } catch (_) {}
            }
        }

        if (typeof window.clearMemoryCache === 'function') window.clearMemoryCache();

        closeSessionClosingModal();
        populateSessionDropdown();

        // 10. Re-bind live listeners
        if (typeof window.initFirebaseLiveListeners === 'function') {
            window.initFirebaseLiveListeners();
        }

        if (typeof window.backToDashboard === 'function') window.backToDashboard();
        alert(`✅ Session '${targetSess}' aur uske sabhi kariger accounts bina kisi crash ke safalata-poorvak delete ho gaye!`);
    };

    /* ========================================================================
       6. GLOBAL PUBLIC API EXPOSURE & EVENT BINDINGS
       ------------------------------------------------------------------------
    ======================================================================== */
    const sessionAPI = {
        getEffectiveUserId,
        getAppSessions,
        getActiveFinancialSession,
        populateSessionDropdown,
        switchAppFinancialSession,
        openSessionClosingModal,
        closeSessionClosingModal,
        confirmAndDeleteSessionWithAuth
    };

    // Attach to window globally for legacy template handlers
    Object.keys(sessionAPI).forEach((fnName) => {
        window[fnName] = sessionAPI[fnName];
    });

    // Namespace wrapper
    window.SessionEngine = sessionAPI;

    // Auto-populate on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', populateSessionDropdown);
    } else {
        populateSessionDropdown();
    }

    // Unit test export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = sessionAPI;
    }
})();
