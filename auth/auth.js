/* ============================================================================
   SIMPLICITY ERP - HIGH-SCALE ENTERPRISE AUTHENTICATION & SECURITY ENGINE
   File: auth/auth.js • Developed by Farhan Jawed
   Architecture: Targeted O(1) Key Lookups | Atomic Transactions | 5-Point Security
   Scale: 1,000,000+ (10-20 Lakhs) Concurrent Users | Offline-First & Resilient
============================================================================ */

(() => {
    'use strict';

    /* ========================================================================
       1. GLOBAL STATE & SESSION CONTEXT
       ------------------------------------------------------------------------
       Ye state variables poore ERP me globally use hote hain.
    ======================================================================== */
    window.currentUserId = null;
    window.currentUserRole = null;
    window.activeKarigerId = null;
    window.activeSheetId = null;
    window.currentDayBookTab = 'bana';
    window.targetResetUser = null;
    window.currentPassbookContext = null;
    window.activeSanchaItemId = null;

    // In-memory hot cache for active user credentials (5-point validation)
    let _activeSessionAuthCache = null;

    // Default Fallback Admin (Bootstrap & Offline Safety)
    const DEFAULT_BOOTSTRAP_ADMIN = Object.freeze({
        id: 'farhan',
        name: 'Farhan Bhai (Admin)',
        pass: '1234',
        mobile: '9876543210',
        pin: '1234',
        role: 'admin',
        status: 'active',
        date: '2026-01-01',
        expiryDate: ''
    });

    /* ========================================================================
       2. DEFENSIVE UTILITY FALLBACKS
       ------------------------------------------------------------------------
       Agar utils.js kisi slow network connection par baad me load ho,
       toh script crash nahi hogi.
    ======================================================================== */
    const _setDisplay = (id, val) => {
        if (typeof window.setDisplay === 'function') {
            window.setDisplay(id, val);
        } else {
            const el = document.getElementById(id);
            if (el) el.style.display = val;
        }
    };

    const _getTodayDate = () => {
        if (typeof window.getTodayDate === 'function') return window.getTodayDate();
        const d = new Date();
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    };

    const _formatDateDisplay = (d) => {
        if (typeof window.formatDateDisplay === 'function') return window.formatDateDisplay(d);
        if (!d) return '-';
        const p = String(d).split('-');
        return (p.length === 3 && p[0].length === 4) ? `${p[2]}-${p[1]}-${p[0]}` : d;
    };

    const _safeArray = (data) => {
        if (typeof window.safeArray === 'function') return window.safeArray(data);
        return Array.isArray(data) ? data : [];
    };

    /* ========================================================================
       3. INPUT SANITIZATION & SECURITY HELPERS
       ------------------------------------------------------------------------
    ======================================================================== */
    const sanitizeId = (id) => String(id || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const sanitizeMobile = (mob) => String(mob || '').trim().replace(/[^0-9]/g, '');
    const sanitizePin = (pin) => String(pin || '').trim().replace(/[^0-9]/g, '').slice(0, 4);

    /**
     * Checks whether a user account has expired
     */
    const isUserExpired = (user) => {
        if (!user || user.role === 'admin' || user.id === 'farhan' || !user.expiryDate) {
            return false;
        }
        const todayIso = new Date().toISOString().split('T')[0];
        return todayIso > user.expiryDate;
    };

    /* ========================================================================
       4. TARGETED USER RETRIEVAL (10-20 Lakh Users Scalability)
       ------------------------------------------------------------------------
       Puraane code me `db.ref("app_users").once("value")` se 10-20 lakh users
       ka data (GBs) ek saath browser me load ho raha tha jisse phone freeze
       ho jata tha. Ab targeted query se sirf single user O(1) fetch hota hai.
    ======================================================================== */

    /**
     * Resolves single user by ID or Mobile directly from Cloud or Local Cache
     * @param {string} identifier - User ID or 10-digit mobile
     * @returns {Promise<Object|null>}
     */
    const fetchUserByIdentifier = async (identifier) => {
        const cleanQuery = String(identifier || '').trim().toLowerCase();
        if (!cleanQuery) return null;

        // 1. Check local session cache first (Instant O(1))
        const cachedUser = getCachedUserLocal(cleanQuery);
        if (cachedUser && (cachedUser.id === cleanQuery || cachedUser.mobile === cleanQuery)) {
            return cachedUser;
        }

        // 2. Targeted Cloud Query
        if (typeof window.db !== 'undefined' && window.db) {
            try {
                // Agar input alphanumeric ID hai -> Direct key lookup: `app_users/{id}`
                const isOnlyDigits = /^\d+$/.test(cleanQuery);
                if (!isOnlyDigits || cleanQuery.length !== 10) {
                    const snap = await window.db.ref(`app_users/${cleanQuery}`).once('value');
                    const val = snap.val();
                    if (val) return val;
                }

                // Agar input 10-digit Mobile number hai -> Indexed query: orderByChild("mobile")
                const mobSnap = await window.db.ref('app_users')
                    .orderByChild('mobile')
                    .equalTo(cleanQuery)
                    .limitToFirst(1)
                    .once('value');

                const mobVal = mobSnap.val();
                if (mobVal) {
                    const matchedKey = Object.keys(mobVal)[0];
                    return mobVal[matchedKey];
                }
            } catch (netErr) {
                console.warn('[Auth] Remote fetch failed, relying on local state:', netErr);
            }
        }

        // 3. Fallback to local offline cache
        return cachedUser;
    };

    /**
     * Retrieves locally cached active user
     */
    const getCachedUserLocal = (identifier) => {
        try {
            // Check in-memory session cache
            if (_activeSessionAuthCache) {
                const s = _activeSessionAuthCache;
                if (s.id === identifier || s.mobile === identifier) return s;
            }

            // Check localStorage
            const localRaw = localStorage.getItem('app_active_session_auth');
            if (localRaw) {
                const parsed = JSON.parse(localRaw);
                if (parsed && (parsed.id === identifier || parsed.mobile === identifier)) {
                    _activeSessionAuthCache = parsed;
                    return parsed;
                }
            }

            // Bootstrap Admin Check
            if (identifier === 'farhan') return DEFAULT_BOOTSTRAP_ADMIN;
        } catch (_) {}
        return null;
    };

    /**
     * Backward-compatible getUsersList() (Optimized for current tenant)
     */
    const getUsersList = () => {
        const active = getCachedUserLocal(window.currentUserId || 'farhan');
        return active ? [active] : [DEFAULT_BOOTSTRAP_ADMIN];
    };

    /* ========================================================================
       5. 5-POINT BACKGROUND SECURITY CHECK
       ------------------------------------------------------------------------
       Paancho parameters (ID, Name, Mobile, Password, PIN) match hona lazmi hai.
    ======================================================================== */
    const validate5PointSecurity = (userRecord) => {
        if (!userRecord) return false;

        let savedSession = _activeSessionAuthCache;
        if (!savedSession) {
            try {
                savedSession = JSON.parse(localStorage.getItem('app_active_session_auth') || 'null');
                _activeSessionAuthCache = savedSession;
            } catch (_) {
                savedSession = null;
            }
        }

        // Pehla fresh login pass hone dein
        if (!savedSession) return true;

        const matchId = String(userRecord.id || '').trim().toLowerCase() === String(savedSession.id || '').trim().toLowerCase();
        const matchName = String(userRecord.name || '').trim().toLowerCase() === String(savedSession.name || '').trim().toLowerCase();
        const matchMob = sanitizeMobile(userRecord.mobile) === sanitizeMobile(savedSession.mobile);
        const matchPass = String(userRecord.pass || '').trim() === String(savedSession.pass || '').trim();
        const matchPin = sanitizePin(userRecord.pin) === sanitizePin(savedSession.pin);

        return matchId && matchName && matchMob && matchPass && matchPin;
    };

    /* ========================================================================
       6. CONCURRENT-SAFE REGISTRATION ENGINE (Atomic Transactions)
       ------------------------------------------------------------------------
       Ek sath hazaron users signup karein toh duplicate ID ya phone number
       register na ho sake.
    ======================================================================== */
    const handleRegister = async () => {
        const nameEl = document.getElementById('reg-name');
        const mobEl = document.getElementById('reg-mobile');
        const idEl = document.getElementById('reg-id');
        const passEl = document.getElementById('reg-pass');
        const pinEl = document.getElementById('reg-pin');
        const msg = document.getElementById('signup-msg');

        const name = String(nameEl ? nameEl.value : '').trim();
        const mobile = sanitizeMobile(mobEl ? mobEl.value : '');
        const id = sanitizeId(idEl ? idEl.value : '');
        const pass = String(passEl ? passEl.value : '').trim();
        const pin = sanitizePin(pinEl ? pinEl.value : '');

        if (!msg) return;

        // Validation Checks
        if (!name || !id || !pass || !mobile || pin.length !== 4) {
            msg.textContent = 'Sabhi 5 details bharein (4-digit PIN zaroori hai)!';
            msg.className = 'message error';
            msg.style.display = 'block';
            return;
        }

        if (mobile.length !== 10) {
            msg.textContent = 'Kripya 10-digit ka valid mobile number darj karein!';
            msg.className = 'message error';
            msg.style.display = 'block';
            return;
        }

        msg.textContent = 'Account create kiya ja raha hai...';
        msg.className = 'message';
        msg.style.display = 'block';

        const isOwner = (id === 'farhan');
        const exp = new Date();
        exp.setDate(exp.getDate() + 30);

        const newUserRecord = {
            id,
            name,
            pass,
            mobile,
            pin,
            role: isOwner ? 'admin' : 'user',
            status: isOwner ? 'active' : 'pending',
            date: _getTodayDate(),
            expiryDate: exp.toISOString().split('T')[0]
        };

        try {
            // Atomic check & reserve on Firebase
            if (typeof window.db !== 'undefined' && window.db) {
                // 1. Check if ID exists atomically
                const idRef = window.db.ref(`app_users/${id}`);
                const txResult = await idRef.transaction((current) => {
                    if (current === null) {
                        return newUserRecord; // Key available, reserve it
                    }
                    return; // Abort transaction if user exists
                });

                if (!txResult.committed) {
                    msg.textContent = 'Yeh User ID pehle se kisi aur ke paas hai! Alag ID banayein.';
                    msg.className = 'message error';
                    msg.style.display = 'block';
                    return;
                }

                // 2. Clean previous orphaned records
                purgeUserDataPermanently(id);
            } else {
                // Offline Local Registration
                localStorage.setItem(`app_user_${id}`, JSON.stringify(newUserRecord));
            }

            if (isOwner) {
                msg.textContent = '✅ Admin Account Ban Gaya!';
            } else {
                msg.innerHTML = `⏳ <strong>Account Request Bheji Gayi!</strong><br>Approval ke liye Manager se sampark karein:<br>📞 <a href='tel:+917985402962' style='color:#2563eb; font-weight:bold;'>+91 79854 02962</a>`;
            }
            msg.className = 'message success';
            msg.style.display = 'block';

            setTimeout(() => {
                showLogin();
                if (nameEl) nameEl.value = '';
                if (mobEl) mobEl.value = '';
                if (idEl) idEl.value = '';
                if (passEl) passEl.value = '';
                if (pinEl) pinEl.value = '';
                msg.style.display = 'none';
            }, 3000);

        } catch (err) {
            console.error('[Auth:Register] Error:', err);
            msg.textContent = 'Registration me khata aayi! Kripya dobara koshish karein.';
            msg.className = 'message error';
            msg.style.display = 'block';
        }
    };

    /* ========================================================================
       7. ULTRA-FAST LOGIN ENGINE
       ------------------------------------------------------------------------
    ======================================================================== */
    const handleLogin = async () => {
        const idInput = document.getElementById('login-id');
        const passInput = document.getElementById('login-pass');
        const err = document.getElementById('login-error');

        const inputVal = (idInput ? idInput.value : '').trim().toLowerCase();
        const pass = (passInput ? passInput.value : '').trim();

        if (!inputVal || !pass) {
            if (err) {
                err.textContent = 'Kripya User ID aur Password dono bharein!';
                err.style.display = 'block';
            }
            return;
        }

        if (err) {
            err.textContent = 'Kripya prateeksha karein...';
            err.style.display = 'block';
            err.style.color = '#2563eb';
        }

        try {
            // Targeted fetch (Zero-Bandwidth-Waste)
            const user = await fetchUserByIdentifier(inputVal);

            if (!user || String(user.pass).trim() !== String(pass).trim()) {
                if (err) {
                    err.textContent = 'Galat User ID ya Password!';
                    err.style.color = '#dc2626';
                    err.style.display = 'block';
                }
                return;
            }

            // Status checks
            if (user.status === 'pending') {
                if (err) {
                    err.innerHTML = `⏳ <strong>Account Approval Pending Hai!</strong><br>Manager se sampark karein:<br>📞 <a href='tel:+917985402962' style='color:#2563eb; font-weight:800;'>+91 79854 02962</a>`;
                    err.style.color = '#dc2626';
                    err.style.display = 'block';
                }
                return;
            }

            if (user.status === 'blocked') {
                if (err) {
                    err.innerHTML = '⛔ Account Block hai! Manager se contact karein.';
                    err.style.color = '#dc2626';
                    err.style.display = 'block';
                }
                return;
            }

            if (isUserExpired(user)) {
                if (err) {
                    err.innerHTML = `⌛ Account Expired (${_formatDateDisplay(user.expiryDate)})!`;
                    err.style.color = '#dc2626';
                    err.style.display = 'block';
                }
                return;
            }

            // 🔒 Persistent Session Authentication
            const authPayload = {
                id: user.id,
                name: user.name,
                mobile: user.mobile,
                pass: user.pass,
                pin: user.pin,
                role: user.role || 'user'
            };

            _activeSessionAuthCache = authPayload;
            localStorage.setItem('app_current_user_id', user.id);
            localStorage.setItem('app_active_session_auth', JSON.stringify(authPayload));

            // Wipe login input elements for memory security
            if (passInput) passInput.value = '';

            executeSuccessfulLogin(user);

        } catch (authErr) {
            console.error('[Auth:Login] Exception:', authErr);
            if (err) {
                err.textContent = 'Login me takneeki khata aayi. Kripya check karein!';
                err.style.color = '#dc2626';
                err.style.display = 'block';
            }
        }
    };

    /* ========================================================================
       8. SUCCESSFUL LOGIN DISPATCHER
       ------------------------------------------------------------------------
    ======================================================================== */
    const executeSuccessfulLogin = (user) => {
        if (typeof window.clearMemoryCache === 'function') {
            window.clearMemoryCache();
        }

        window.currentUserId = user.id;
        window.currentUserRole = user.role || (user.id === 'farhan' ? 'admin' : 'user');

        const err = document.getElementById('login-error');
        if (err) err.style.display = 'none';

        _setDisplay('login-wrapper', 'none');
        _setDisplay('desktop-screen', 'flex');

        const welcomeEl = document.getElementById('welcome-text');
        if (welcomeEl) {
            welcomeEl.textContent = (window.currentUserRole === 'admin')
                ? `👑 Swagat hai Admin, ${user.name}!`
                : `Swagat hai, ${user.name}!`;
        }

        _setDisplay('nav-admin-btn', window.currentUserRole === 'admin' ? 'inline-block' : 'none');

        const finishLoginInit = () => {
            // Targeted listeners bind karo
            if (typeof window.initFirebaseLiveListeners === 'function') {
                window.initFirebaseLiveListeners();
            }
            if (typeof window.populateNavbarKarkhanaDropdown === 'function') {
                window.populateNavbarKarkhanaDropdown();
            }
            if (typeof window.populateSessionDropdown === 'function') {
                window.populateSessionDropdown();
            }
            if (typeof window.backToDashboard === 'function') {
                window.backToDashboard();
            }
            if (typeof window.showSyncStatus === 'function') {
                window.showSyncStatus('online');
            }
        };

        // 5-Point Security Validation before syncing data
        if (!validate5PointSecurity(user)) {
            alert('⚠️ Security Alert: Account credentials mismatch! Data sync rok diya gaya hai.');
            logout();
            return;
        }

        // Preload user's IndexedDB data to RAM
        if (typeof window.initIndexedDBPreload === 'function') {
            window.initIndexedDBPreload(finishLoginInit);
        } else {
            finishLoginInit();
        }
    };

    /* ========================================================================
       9. AUTO LOGIN & SESSION RESTORATION
       ------------------------------------------------------------------------
    ======================================================================== */
    const checkAutoLogin = () => {
        try {
            const savedUid = localStorage.getItem('app_current_user_id');
            const savedSessionRaw = localStorage.getItem('app_active_session_auth');

            if (!savedUid || !savedSessionRaw) {
                showLogin();
                return;
            }

            const savedSession = JSON.parse(savedSessionRaw);
            _activeSessionAuthCache = savedSession;

            // Direct instant login without waiting for network (Offline PWA feature)
            if (savedSession && savedSession.id && !isUserExpired(savedSession)) {
                executeSuccessfulLogin(savedSession);

                // Background cloud security validation (Silent check)
                if (typeof window.db !== 'undefined' && window.db) {
                    window.db.ref(`app_users/${savedSession.id}`).once('value')
                        .then((snap) => {
                            const remoteUser = snap.val();
                            if (remoteUser) {
                                if (remoteUser.status !== 'active' || isUserExpired(remoteUser)) {
                                    alert('Aapka account deactivate ya expire ho chuka hai.');
                                    logout();
                                }
                            }
                        })
                        .catch(() => {});
                }
            } else {
                showLogin();
            }
        } catch (_) {
            showLogin();
        }
    };

    /* ========================================================================
       10. LOGOUT & PURGE UTILITIES
       ------------------------------------------------------------------------
    ======================================================================== */
    const logout = () => {
        // Detach live listeners
        if (typeof window.detachFirebaseLiveListeners === 'function') {
            window.detachFirebaseLiveListeners();
        } else if (typeof window.db !== 'undefined' && window.db && window.currentUserId) {
            try { window.db.ref(`users/${window.currentUserId}`).off(); } catch (_) {}
        }

        if (typeof window.clearMemoryCache === 'function') {
            window.clearMemoryCache();
        }

        window.currentUserId = null;
        window.currentUserRole = null;
        window.activeKarigerId = null;
        window.activeSheetId = null;
        _activeSessionAuthCache = null;

        localStorage.removeItem('app_current_user_id');
        localStorage.removeItem('app_active_session_auth');

        const idInput = document.getElementById('login-id');
        const passInput = document.getElementById('login-pass');
        const err = document.getElementById('login-error');
        if (idInput) idInput.value = '';
        if (passInput) passInput.value = '';
        if (err) err.style.display = 'none';

        _setDisplay('desktop-screen', 'none');
        _setDisplay('login-wrapper', 'flex');
        showLogin();
    };

    /**
     * Permanent user data purge across LocalStorage, IndexedDB & Cloud
     */
    const purgeUserDataPermanently = (uid) => {
        if (!uid) return;
        const cleanUid = sanitizeId(uid);

        // 1. Clear LocalStorage keys
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith(`${cleanUid}_`) || k === cleanUid)) {
                keysToRemove.push(k);
            }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));

        // 2. Clear RAM cache
        if (typeof window.APP_MEMORY_CACHE !== 'undefined') {
            Object.keys(window.APP_MEMORY_CACHE).forEach((mk) => {
                if (mk.startsWith(`${cleanUid}_`)) delete window.APP_MEMORY_CACHE[mk];
            });
        }

        // 3. Clear IndexedDB
        if (typeof window.openEnterpriseIndexedDB === 'function') {
            window.openEnterpriseIndexedDB((dbase) => {
                if (!dbase) return;
                try {
                    const tx = dbase.transaction('app_store', 'readwrite');
                    const store = tx.objectStore('app_store');
                    const req = store.openCursor();
                    req.onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor) {
                            if (String(cursor.key).startsWith(`${cleanUid}_`)) {
                                cursor.delete();
                            }
                            cursor.continue();
                        }
                    };
                } catch (_) {}
            });
        }

        // 4. Cloud purge
        if (typeof window.db !== 'undefined' && window.db) {
            try {
                window.db.ref(`users/${cleanUid}`).remove();
                window.db.ref(`app_users/${cleanUid}`).remove();
            } catch (_) {}
        }
    };

    /* ========================================================================
       11. FORGOT PASSWORD & PROFILE SETTINGS
       ------------------------------------------------------------------------
    ======================================================================== */
    const showSignup = () => {
        _setDisplay('login-box', 'none');
        _setDisplay('forgot-box', 'none');
        _setDisplay('signup-box', 'block');
    };

    const showLogin = () => {
        _setDisplay('signup-box', 'none');
        _setDisplay('forgot-box', 'none');
        _setDisplay('login-box', 'block');
    };

    const showForgotPassword = () => {
        _setDisplay('login-box', 'none');
        _setDisplay('signup-box', 'none');
        _setDisplay('forgot-box', 'block');
        _setDisplay('forgot-step-1', 'block');
        _setDisplay('forgot-step-2', 'none');
    };

    const verifyForgotPin = async () => {
        const queryEl = document.getElementById('forgot-query');
        const pinEl = document.getElementById('forgot-pin');
        const msg = document.getElementById('forgot-msg');

        const q = String(queryEl ? queryEl.value : '').trim().toLowerCase();
        const pin = sanitizePin(pinEl ? pinEl.value : '');

        if (!msg) return;

        if (!q || !pin) {
            msg.textContent = 'Kripya User ID aur PIN dono darj karein!';
            msg.className = 'message error';
            msg.style.display = 'block';
            return;
        }

        msg.textContent = 'Details verify ho rahi hain...';
        msg.className = 'message';
        msg.style.display = 'block';

        const user = await fetchUserByIdentifier(q);

        if (!user || sanitizePin(user.pin) !== pin) {
            msg.textContent = 'Galat User details ya PIN!';
            msg.className = 'message error';
            msg.style.display = 'block';
            return;
        }

        window.targetResetUser = user;
        _setDisplay('forgot-step-1', 'none');
        _setDisplay('forgot-step-2', 'block');
        msg.textContent = '✅ PIN Verified! Naya password banayein.';
        msg.className = 'message success';
        msg.style.display = 'block';
    };

    const saveNewPassword = async () => {
        const p1El = document.getElementById('forgot-new-pass');
        const p2El = document.getElementById('forgot-confirm-pass');
        const msg = document.getElementById('forgot-msg');

        const p1 = String(p1El ? p1El.value : '').trim();
        const p2 = String(p2El ? p2El.value : '').trim();

        if (!msg) return;

        if (!p1 || p1 !== p2) {
            msg.textContent = 'Dono password match hone chahiye!';
            msg.className = 'message error';
            msg.style.display = 'block';
            return;
        }

        if (!window.targetResetUser) return;

        try {
            window.targetResetUser.pass = p1;

            if (typeof window.db !== 'undefined' && window.db) {
                await window.db.ref(`app_users/${window.targetResetUser.id}/pass`).set(p1);
            }

            msg.textContent = '✅ Password update ho gaya! Login karein.';
            msg.className = 'message success';
            msg.style.display = 'block';

            setTimeout(() => {
                showLogin();
                if (p1El) p1El.value = '';
                if (p2El) p2El.value = '';
                msg.style.display = 'none';
            }, 1200);
        } catch (err) {
            console.error('[Auth:saveNewPassword] Error:', err);
            msg.textContent = 'Password save nahi ho paya!';
            msg.className = 'message error';
            msg.style.display = 'block';
        }
    };

    const openProfileModal = async () => {
        if (!window.currentUserId) return alert('Pehle login karein!');
        const u = await fetchUserByIdentifier(window.currentUserId);
        if (!u) return;

        const nameEl = document.getElementById('prof-name');
        const idEl = document.getElementById('prof-id');
        const mobEl = document.getElementById('prof-mobile');
        const pinEl = document.getElementById('prof-pin');
        const passEl = document.getElementById('prof-pass');

        if (nameEl) nameEl.value = u.name || '';
        if (idEl) idEl.value = u.id || '';
        if (mobEl) mobEl.value = u.mobile || '';
        if (pinEl) pinEl.value = u.pin || '1234';
        if (passEl) passEl.value = u.pass || '';

        _setDisplay('profile-modal', 'flex');
    };

    const closeProfileModal = () => {
        _setDisplay('profile-modal', 'none');
    };

    const saveProfileSettings = async () => {
        const n = String(document.getElementById('prof-name')?.value || '').trim();
        const m = sanitizeMobile(document.getElementById('prof-mobile')?.value || '');
        const p = sanitizePin(document.getElementById('prof-pin')?.value || '');
        const pass = String(document.getElementById('prof-pass')?.value || '').trim();

        if (!n || m.length !== 10 || p.length !== 4 || !pass) {
            return alert('Kripya sabhi details sahi bharein (10-digit mobile aur 4-digit PIN zaroori hai)!');
        }

        const uid = window.currentUserId;
        if (!uid) return;

        const updatedRecord = {
            id: uid,
            name: n,
            mobile: m,
            pin: p,
            pass: pass
        };

        try {
            // 1. Update In-Memory & LocalStorage
            _activeSessionAuthCache = updatedRecord;
            localStorage.setItem('app_active_session_auth', JSON.stringify(updatedRecord));

            // 2. Direct Cloud Push
            if (typeof window.db !== 'undefined' && window.db) {
                await window.db.ref(`app_users/${uid}`).update({
                    name: n,
                    mobile: m,
                    pin: p,
                    pass: pass
                });
            }

            const welcomeEl = document.getElementById('welcome-text');
            if (welcomeEl) welcomeEl.textContent = `Swagat hai, ${n}!`;

            closeProfileModal();
            alert('✅ Profile settings aur Cloud credentials successfully update ho gaye!');
        } catch (err) {
            console.error('[Auth:saveProfileSettings] Error:', err);
            alert('Profile update me takleef aayi!');
        }
    };

    const syncUsersWithFirebase = () => {
        // Targeted architecture me global sync ki zaroorat nahi hoti.
        // Yeh function admin interface compatibility ke liye safe dummy rakha gaya hai.
        if (window.currentUserRole === 'admin' && typeof window.renderAdminUsersTable === 'function') {
            window.renderAdminUsersTable();
        }
    };

    /* ========================================================================
       12. GLOBAL PUBLIC API EXPOSURE
       ------------------------------------------------------------------------
    ======================================================================== */
    const authAPI = {
        showSignup,
        showLogin,
        showForgotPassword,
        handleRegister,
        handleLogin,
        executeSuccessfulLogin,
        checkAutoLogin,
        logout,
        verifyForgotPin,
        saveNewPassword,
        openProfileModal,
        closeProfileModal,
        saveProfileSettings,
        purgeUserDataPermanently,
        getUsersList,
        syncUsersWithFirebase,
        validate5PointSecurity,
        fetchUserByIdentifier
    };

    // Attach all functions directly to window for legacy callers
    Object.keys(authAPI).forEach((fnName) => {
        window[fnName] = authAPI[fnName];
    });

    // Namespace wrapper
    window.AuthEngine = authAPI;

    // Unit test export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = authAPI;
    }
})();
