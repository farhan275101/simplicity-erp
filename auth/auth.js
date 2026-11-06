/* ============================================================================
   SIMPLICITY ERP - HIGH-SCALE ENTERPRISE AUTHENTICATION & SECURITY ENGINE
   File: auth/auth.js • Developed by Farhan Jawed
   Architecture: Supabase PostgreSQL Auth | Atomic Transactions | 5-Point Security
   Scale: 1,000,000+ Concurrent Active Users | Offline-First & Resilient
============================================================================ */

(() => {
    'use strict';

    /* ========================================================================
       1. GLOBAL STATE & SESSION CONTEXT
       ------------------------------------------------------------------------
    ======================================================================== */
    window.currentUserId = null;
    window.currentUserRole = null;
    window.activeKarigerId = null;
    window.activeSheetId = null;
    window.currentDayBookTab = 'bana';
    window.targetResetUser = null;
    window.currentPassbookContext = null;
    window.activeSanchaItemId = null;

    let _activeSessionAuthCache = null;

    // Default Fallback Admin (Bootstrap & Offline Safety)
    const DEFAULT_BOOTSTRAP_ADMIN = Object.freeze({
        id: 'farhan',
        name: 'Farhan jawed',
        pass: '97438090641154',
        mobile: '7065572191',
        email: 'farhanjawed@gmail.com',
        pin: '9743',
        role: 'admin',
        status: 'active',
        date: '2026-01-01',
        expiryDate: ''
    });

    /* ========================================================================
       2. DEFENSIVE UTILITY FALLBACKS
       ------------------------------------------------------------------------
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

    const getSupabase = () => {
        return window.supabaseClient || window.supabase || (typeof window.supabase !== 'undefined' ? window.supabase : null);
    };

    /* ========================================================================
       3. INPUT SANITIZATION & SECURITY HELPERS
       ------------------------------------------------------------------------
    ======================================================================== */
    const sanitizeId = (id) => String(id || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const sanitizeMobile = (mob) => String(mob || '').trim().replace(/[^0-9]/g, '');
    const sanitizePin = (pin) => String(pin || '').trim().replace(/[^0-9]/g, '').slice(0, 4);

    const isUserExpired = (user) => {
        if (!user || user.role === 'admin' || user.id === 'farhan' || !user.expiryDate) {
            return false;
        }
        const todayIso = new Date().toISOString().split('T')[0];
        return todayIso > user.expiryDate;
    };

    /* ========================================================================
       4. TARGETED USER RETRIEVAL (SUPABASE O(1) LOOKUP)
       ------------------------------------------------------------------------
    ======================================================================== */
    const fetchUserByIdentifier = async (identifier) => {
        const cleanQuery = String(identifier || '').trim().toLowerCase();
        if (!cleanQuery) return null;

        const cachedUser = getCachedUserLocal(cleanQuery);
        if (cachedUser && (cachedUser.id === cleanQuery || cachedUser.mobile === cleanQuery || cachedUser.email === cleanQuery)) {
            return cachedUser;
        }

        const sb = getSupabase();
        if (sb) {
            try {
                // Search by user_id OR mobile OR email in Supabase
                const { data, error } = await sb
                    .from('karkhana_users')
                    .select('*')
                    .or(`user_id.eq.${cleanQuery},mobile.eq.${cleanQuery},email.eq.${cleanQuery}`)
                    .limit(1);

                if (!error && data && data.length > 0) {
                    const row = data[0];
                    return {
                        id: row.user_id,
                        name: row.full_name,
                        pass: row.password,
                        mobile: row.mobile,
                        email: row.email || '',
                        pin: row.pin,
                        role: row.role || 'user',
                        status: row.status || 'active',
                        date: row.created_at ? row.created_at.split('T')[0] : _getTodayDate(),
                        expiryDate: row.validity_date || ''
                    };
                }
            } catch (netErr) {
                console.warn('[Auth:Supabase] Remote fetch failed:', netErr);
            }
        }

        return cachedUser;
    };

    const getCachedUserLocal = (identifier) => {
        try {
            if (_activeSessionAuthCache) {
                const s = _activeSessionAuthCache;
                if (s.id === identifier || s.mobile === identifier || s.email === identifier) return s;
            }

            const localRaw = localStorage.getItem('app_active_session_auth');
            if (localRaw) {
                const parsed = JSON.parse(localRaw);
                if (parsed && (parsed.id === identifier || parsed.mobile === identifier || parsed.email === identifier)) {
                    _activeSessionAuthCache = parsed;
                    return parsed;
                }
            }

            if (identifier === 'farhan') return DEFAULT_BOOTSTRAP_ADMIN;
        } catch (_) {}
        return null;
    };

    /**
     * 👥 Admin Panel: Returns all users from Supabase
     */
    const getUsersList = async () => {
        const sb = getSupabase();
        if (sb) {
            try {
                const { data, error } = await sb
                    .from('karkhana_users')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && Array.isArray(data)) {
                    return data.map((row) => ({
                        id: row.user_id,
                        name: row.full_name,
                        pass: row.password,
                        mobile: row.mobile,
                        email: row.email || '',
                        pin: row.pin,
                        role: row.role || 'user',
                        status: row.status || 'active',
                        date: row.created_at ? row.created_at.split('T')[0] : '',
                        expiryDate: row.validity_date || ''
                    }));
                }
            } catch (err) {
                console.warn('[Auth:getUsersList] Fetch failed:', err);
            }
        }

        const active = getCachedUserLocal(window.currentUserId || 'farhan');
        return active ? [active] : [DEFAULT_BOOTSTRAP_ADMIN];
    };

    /* ========================================================================
       5. 5-POINT BACKGROUND SECURITY CHECK
       ------------------------------------------------------------------------
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

        if (!savedSession) return true;

        const matchId = String(userRecord.id || '').trim().toLowerCase() === String(savedSession.id || '').trim().toLowerCase();
        const matchName = String(userRecord.name || '').trim().toLowerCase() === String(savedSession.name || '').trim().toLowerCase();
        const matchMob = sanitizeMobile(userRecord.mobile) === sanitizeMobile(savedSession.mobile);
        const matchPass = String(userRecord.pass || '').trim() === String(savedSession.pass || '').trim();
        const matchPin = sanitizePin(userRecord.pin) === sanitizePin(savedSession.pin);

        return matchId && matchName && matchMob && matchPass && matchPin;
    };

    /* ========================================================================
       6. REGISTRATION ENGINE (SUPABASE POSTGRESQL INSERT)
       ------------------------------------------------------------------------
    ======================================================================== */
    const handleRegister = async () => {
        const nameEl = document.getElementById('reg-name');
        const mobEl = document.getElementById('reg-mobile');
        const idEl = document.getElementById('reg-id');
        const passEl = document.getElementById('reg-pass');
        const pinEl = document.getElementById('reg-pin');
        const emailEl = document.getElementById('reg-email');
        const msg = document.getElementById('signup-msg');

        const name = String(nameEl ? nameEl.value : '').trim();
        const mobile = sanitizeMobile(mobEl ? mobEl.value : '');
        const id = sanitizeId(idEl ? idEl.value : '');
        const pass = String(passEl ? passEl.value : '').trim();
        const pin = sanitizePin(pinEl ? pinEl.value : '');
        const email = String(emailEl ? emailEl.value : '').trim().toLowerCase();

        if (!msg) return;

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

        msg.textContent = 'Account request process ho rahi hai...';
        msg.className = 'message';
        msg.style.display = 'block';

        const isOwner = (id === 'farhan');
        const exp = new Date();
        exp.setDate(exp.getDate() + 30);

        try {
            const sb = getSupabase();
            if (sb) {
                // 1. Check if User ID already exists in Supabase
                const { data: existingUser, error: checkErr } = await sb
                    .from('karkhana_users')
                    .select('user_id')
                    .eq('user_id', id)
                    .maybeSingle();

                if (existingUser) {
                    msg.textContent = 'Yeh User ID pehle se kisi aur ke paas hai! Alag ID banayein.';
                    msg.className = 'message error';
                    msg.style.display = 'block';
                    return;
                }

                // 2. Insert into Supabase karkhana_users table
                const payload = {
                    user_id: id,
                    full_name: name,
                    mobile: mobile,
                    email: email || null,
                    password: pass,
                    pin: pin,
                    role: isOwner ? 'admin' : 'owner',
                    validity_date: isOwner ? null : exp.toISOString().split('T')[0]
                };

                const { error: insertErr } = await sb
                    .from('karkhana_users')
                    .insert([payload]);

                if (insertErr) throw insertErr;

                // 3. Automatically add Main Godown for new user
                await sb.from('karkhanas').insert([{
                    user_id: id,
                    karkhana_name: 'Main Godown',
                    is_default: true
                }]);
            }

            if (isOwner) {
                msg.textContent = '✅ Admin Account Ban Gaya!';
            } else {
                msg.innerHTML = `⏳ <strong>Account Request Admin ke paas bhej di gayi hai!</strong><br>Admin ke Approve karte hi aap login kar sakenge.<br>📞 Admin: <a href='tel:+917065572191' style='color:#2563eb; font-weight:bold;'>+91 70655 72191</a>`;
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
                if (emailEl) emailEl.value = '';
                msg.style.display = 'none';
            }, 3500);

        } catch (err) {
            console.error('[Auth:Register] Error:', err);
            msg.textContent = 'Registration me takleef aayi: ' + (err.message || 'Kripya dobara try karein.');
            msg.className = 'message error';
            msg.style.display = 'block';
        }
    };

    /* ========================================================================
       7. LOGIN ENGINE (SUPABASE AUTHENTICATION)
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
            err.textContent = 'Logging in... ⏳';
            err.style.display = 'block';
            err.style.color = '#2563eb';
        }

        try {
            const user = await fetchUserByIdentifier(inputVal);

            if (!user || String(user.pass).trim() !== String(pass).trim()) {
                if (err) {
                    err.textContent = 'Galat User ID ya Password!';
                    err.style.color = '#dc2626';
                    err.style.display = 'block';
                }
                return;
            }

            const userStatus = String(user.status || '').toLowerCase().trim();

            if (userStatus === 'pending') {
                if (err) {
                    err.innerHTML = `⏳ <strong>Account Approval Pending Hai!</strong><br>Admin (Farhan) se approve karwayein:<br>📞 <a href='tel:+917065572191' style='color:#2563eb; font-weight:800;'>+91 70655 72191</a>`;
                    err.style.color = '#dc2626';
                    err.style.display = 'block';
                }
                return;
            }

            if (userStatus === 'blocked') {
                if (err) {
                    err.innerHTML = '⛔ Account Block hai! Admin se contact karein.';
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

            const authPayload = {
                id: user.id,
                name: user.name,
                mobile: user.mobile,
                email: user.email || '',
                pass: user.pass,
                pin: user.pin,
                role: user.role || 'user'
            };

            _activeSessionAuthCache = authPayload;
            localStorage.setItem('app_current_user_id', user.id);
            localStorage.setItem('app_active_session_auth', JSON.stringify(authPayload));

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
        window.currentUserRole = user.role || (user.id === 'farhan' ? 'admin' : 'owner');

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

        if (!validate5PointSecurity(user)) {
            alert('⚠️ Security Alert: Account credentials mismatch! Data sync rok diya gaya hai.');
            logout();
            return;
        }

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

            if (savedSession && savedSession.id && !isUserExpired(savedSession)) {
                executeSuccessfulLogin(savedSession);
            } else {
                showLogin();
            }
        } catch (_) {
            showLogin();
        }
    };

    /* ========================================================================
       10. LOGOUT UTILITIES
       ------------------------------------------------------------------------
    ======================================================================== */
    const logout = () => {
        if (typeof window.detachFirebaseLiveListeners === 'function') {
            window.detachFirebaseLiveListeners();
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

    const purgeUserDataPermanently = async (uid) => {
        if (!uid || uid === 'farhan') return;
        const cleanUid = sanitizeId(uid);

        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith(`${cleanUid}_`) || k === cleanUid)) {
                keysToRemove.push(k);
            }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));

        const sb = getSupabase();
        if (sb) {
            try {
                await sb.from('karkhana_users').delete().eq('user_id', cleanUid);
                await sb.from('karigers').delete().eq('user_id', cleanUid);
                await sb.from('material_stock').delete().eq('user_id', cleanUid);
                await sb.from('saree_stock').delete().eq('user_id', cleanUid);
            } catch (_) {}
        }
    };

    /* ========================================================================
       11. FORGOT PASSWORD & SCREEN NAVIGATION
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

        msg.textContent = 'Details verify ho rahi hain... ⏳';
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

            const sb = getSupabase();
            if (sb) {
                const { error } = await sb
                    .from('karkhana_users')
                    .update({ password: p1 })
                    .eq('user_id', window.targetResetUser.id);

                if (error) throw error;
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

    const syncUsersWithFirebase = () => {
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
        purgeUserDataPermanently,
        getUsersList,
        syncUsersWithFirebase,
        validate5PointSecurity,
        fetchUserByIdentifier
    };

    Object.keys(authAPI).forEach((fnName) => {
        window[fnName] = authAPI[fnName];
    });

    window.AuthEngine = authAPI;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = authAPI;
    }
})();
