/* ============================================================================
   SIMPLICITY ERP - HIGH-SCALE FINANCIAL YEAR SESSION CONTROLLER
   File: session/session.js • Developed by Farhan Jawed
   Architecture: Supabase PostgreSQL Realtime Engine & Crash-Proof Session Switch
============================================================================ */

(() => {
    'use strict';

    const LOCAL_PURGE_CHUNK_SIZE = 50;
    const DEFAULT_BOOTSTRAP_SESSION = '2026-2027';

    const yieldEventLoop = () => new Promise((resolve) => setTimeout(resolve, 0));

    const getEffectiveUserId = () => {
        try {
            if (typeof window.currentUserId !== 'undefined' && window.currentUserId) {
                return String(window.currentUserId).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
            }
            const stored = localStorage.getItem('app_current_user_id') || localStorage.getItem('currentUserId');
            if (stored) {
                return String(stored).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
            }
        } catch (_) {}
        return 'farhan';
    };

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

    const initCloudSessionSync = () => {
        // Handled directly via Supabase Realtime in database.js
    };

    /* ========================================================================
       🌟 100% BULLETPROOF SESSION SWITCH (WITH CLEAN PAGE RELOAD)
       ======================================================================== */
    const switchAppFinancialSession = async (targetSession) => {
        const activeSess = getActiveFinancialSession();
        if (!targetSession || targetSession === activeSess) return;

        if (!confirm(`Kya aap Session badal kar '${targetSession}' me jana chahte hain?\nApp fresh naye saal ke data ke sath reload hoga.`)) {
            populateSessionDropdown();
            return;
        }

        const cleanTarget = String(targetSession).replace(/['"]+/g, '').trim();
        const uId = getEffectiveUserId();

        try {
            // ✅ Detach Supabase Realtime Listener cleanly
            if (typeof window.detachSupabaseRealtime === 'function') {
                window.detachSupabaseRealtime();
            } else if (typeof window.detachFirebaseLiveListeners === 'function') {
                window.detachFirebaseLiveListeners();
            }

            localStorage.setItem(`${uId}_app_active_session`, cleanTarget);
            if (window.APP_MEMORY_CACHE) {
                window.APP_MEMORY_CACHE[`${uId}_app_active_session`] = cleanTarget;
            }

            if (typeof window.idbPut === 'function') {
                await window.idbPut(`${uId}_app_active_session`, cleanTarget);
            }

            if (typeof window.clearMemoryCache === 'function') {
                window.clearMemoryCache();
            }

            // 🚀 REFRESH TO LOAD PURE SESSION DATA
            window.location.reload();
        } catch (err) {
            console.error('[SessionSwitch] Error:', err);
            window.location.reload();
        }
    };

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
                    <div>🧵 <strong>Kariger Khata:</strong> Pichli mazdoori, bana & zari naye saal ki <b>Tani 1</b> ka Opening Balance banegi.</div>
                    <div>🥻 <strong>Saree Stock:</strong> Sabhi godamon ki bachi hui saree naye saal ka <b>Opening Stock</b> banegi.</div>
                    <div>🧶 <strong>Bana & ✨ Zari:</strong> Godam ka bacha wazan naye saal me <b>Opening Stock</b> judega.</div>
                    <div>⚙️ <strong>Sancha & Job Work:</strong> Baki bacha maal carry-forward hoga.</div>
                    <div>🔒 <strong>Purana Saal Safe:</strong> Pichla saal freeze ho jayega, jise aap kabhi bhi dekh sakte hain.</div>
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

    const nonBlockingLocalStoragePurge = async (prefix) => {
        const keysToRemove = [];
        const len = localStorage.length;
        for (let i = 0; i < len; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(prefix)) keysToRemove.push(k);
        }
        for (let i = 0; i < keysToRemove.length; i++) {
            localStorage.removeItem(keysToRemove[i]);
            if ((i + 1) % LOCAL_PURGE_CHUNK_SIZE === 0) await yieldEventLoop();
        }
    };

    const atomicIndexedDBPurge = async (prefix) => {
        return new Promise((resolve) => {
            if (typeof window.openEnterpriseIndexedDB !== 'function') return resolve();
            window.openEnterpriseIndexedDB((dbase) => {
                if (!dbase) return resolve();
                try {
                    const tx = dbase.transaction('app_store', 'readwrite');
                    const store = tx.objectStore('app_store');
                    if (typeof IDBKeyRange !== 'undefined' && IDBKeyRange.bound) {
                        store.delete(IDBKeyRange.bound(prefix, `${prefix}\uffff`));
                        tx.oncomplete = () => resolve();
                        tx.onerror = () => resolve();
                    } else {
                        resolve();
                    }
                } catch (_) { resolve(); }
            });
        });
    };

    /* ========================================================================
       🗑️ SECURE SESSION DELETE (SUPABASE & MULTI-USER AUTHENTICATED)
       ======================================================================== */
    const confirmAndDeleteSessionWithAuth = async () => {
        const delSel = document.getElementById('session-delete-select');
        const targetSess = delSel ? delSel.value : '';
        const uInp = String(document.getElementById('session-del-user-id')?.value || '').trim().toLowerCase();
        const pInp = String(document.getElementById('session-del-password')?.value || '').trim();

        if (!targetSess) return alert('Pehle delete karne ke liye session chunein!');
        if (!uInp || !pInp) return alert('User ID aur Password daalna zaroori hai!');

        let authenticated = false;

        // 1. Current Logged-in Session Check (Instant O(1))
        try {
            const activeSessionRaw = localStorage.getItem('app_active_session_auth');
            if (activeSessionRaw) {
                const s = JSON.parse(activeSessionRaw);
                const matchId = (s.id && String(s.id).toLowerCase() === uInp);
                const matchMob = (s.mobile && String(s.mobile).trim() === uInp);
                if ((matchId || matchMob) && String(s.pass).trim() === pInp) {
                    authenticated = true;
                }
            }
        } catch (_) {}

        // 2. Supabase Live Query Check (Works for all Karkhana owners)
        if (!authenticated && typeof window.fetchUserByIdentifier === 'function') {
            try {
                const u = await window.fetchUserByIdentifier(uInp);
                if (u && String(u.pass).trim() === pInp) {
                    authenticated = true;
                }
            } catch (_) {}
        }

        // 3. Fallback Master Admin Credentials
        if (!authenticated && (uInp === 'farhan' || uInp === 'admin')) {
            authenticated = (pInp === '97438090641154' || pInp === '1234');
        }

        if (!authenticated) {
            return alert('❌ Galat User ID ya Password! Session delete nahi hoga.');
        }

        let sessions = getAppSessions();
        if (sessions.length <= 1) {
            return alert('❌ Aakhri bacha hua Session delete nahi ho sakta!');
        }

        if (!confirm(`⚠️ KYA AAP SACH ME '${targetSess}' KA PURA DATA DELETE KARNA CHAHTE HAIN?\nIs saal ka sara hisab permanently delete ho jayega!`)) {
            return;
        }

        const uId = getEffectiveUserId();

        // Remove from session list
        sessions = sessions.filter((s) => s !== targetSess);
        localStorage.setItem(`${uId}_app_sessions_list`, JSON.stringify(sessions));
        if (typeof window.idbPut === 'function') {
            await window.idbPut(`${uId}_app_sessions_list`, sessions);
        }

        // Purge local data keys for this session
        const prefix = `${uId}_${targetSess}_`;
        await nonBlockingLocalStoragePurge(prefix);
        await atomicIndexedDBPurge(prefix);

        // Switch to next active session if deleted was active
        const cur = getActiveFinancialSession();
        if (cur === targetSess) {
            const nextActive = sessions[sessions.length - 1];
            localStorage.setItem(`${uId}_app_active_session`, nextActive);
            if (typeof window.idbPut === 'function') {
                await window.idbPut(`${uId}_app_active_session`, nextActive);
            }
        }

        if (typeof window.clearMemoryCache === 'function') {
            window.clearMemoryCache();
        }

        closeSessionClosingModal();
        populateSessionDropdown();

        alert(`✅ Session '${targetSess}' safalata-poorvak delete ho gaya!`);
        window.location.reload();
    };

    const sessionAPI = {
        getEffectiveUserId,
        getAppSessions,
        getActiveFinancialSession,
        populateSessionDropdown,
        switchAppFinancialSession,
        openSessionClosingModal,
        closeSessionClosingModal,
        confirmAndDeleteSessionWithAuth,
        initCloudSessionSync
    };

    Object.keys(sessionAPI).forEach((fnName) => {
        window[fnName] = sessionAPI[fnName];
    });

    window.SessionEngine = sessionAPI;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            populateSessionDropdown();
            initCloudSessionSync();
        });
    } else {
        populateSessionDropdown();
        initCloudSessionSync();
    }
})();
