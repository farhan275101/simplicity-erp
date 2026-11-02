/* ========================================================
   SIMPLICITY ERP - FINANCIAL YEAR SESSION CONTROLLER
   File: session/session.js • Developed by Farhan Jawed
   (2000+ Kariger Safe Wipe • Zero-Freeze Session Delete)
======================================================== */

function getEffectiveUserId() {
    if (typeof currentUserId !== "undefined" && currentUserId) return String(currentUserId).trim().toLowerCase();
    var stored = localStorage.getItem("app_current_user_id");
    if (stored) return String(stored).trim().toLowerCase();
    return "app";
}

function getAppSessions() {
    var uId = getEffectiveUserId();
    var userKey = uId + "_app_sessions_list";
    var raw = (typeof APP_MEMORY_CACHE !== "undefined" && APP_MEMORY_CACHE[userKey]) || localStorage.getItem(userKey);
    var list = [];
    try {
        list = (typeof raw === "string") ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
    } catch (e) {}

    if (!Array.isArray(list) || !list.length) {
        list = ["2026-2027"];
        try { 
            localStorage.setItem(userKey, JSON.stringify(list));
            if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE[userKey] = list;
            if (typeof idbPut === "function") idbPut(userKey, list);
        } catch(e) {}
    }
    return list.map(function(s) { return String(s).replace(/['"]+/g, '').trim(); });
}

function getActiveFinancialSession() {
    var uId = getEffectiveUserId();
    var userKey = uId + "_app_active_session";
    var sess = (typeof APP_MEMORY_CACHE !== "undefined" && APP_MEMORY_CACHE[userKey]) || localStorage.getItem(userKey);
    if (!sess || typeof sess !== "string" || sess === "[]") {
        var list = getAppSessions();
        sess = list[list.length - 1] || "2026-2027";
        try { 
            localStorage.setItem(userKey, sess);
            if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE[userKey] = sess;
            if (typeof idbPut === "function") idbPut(userKey, sess);
        } catch(e) {}
    }
    return String(sess).replace(/['"]+/g, '').trim() || "2026-2027";
}

function populateSessionDropdown() {
    var sel = document.getElementById("app-session-select");
    if (!sel) return;
    sel.innerHTML = "";
    var sessions = getAppSessions();
    var activeSess = getActiveFinancialSession();
    sessions.forEach(function(s) {
        var opt = document.createElement("option");
        opt.value = s;
        opt.textContent = "📅 " + s;
        if (String(s) === String(activeSess)) opt.selected = true;
        sel.appendChild(opt);
    });
}

function switchAppFinancialSession(targetSession) {
    var activeSess = getActiveFinancialSession();
    if (!targetSession || targetSession === activeSess) return;

    if (!confirm("Kya aap Session badal kar '" + targetSession + "' me jana chahte hain?")) {
        populateSessionDropdown();
        return;
    }

    var cleanTarget = String(targetSession).replace(/['"]+/g, '').trim();
    var uId = getEffectiveUserId();

    localStorage.setItem(uId + "_app_active_session", cleanTarget);
    if (typeof APP_MEMORY_CACHE !== "undefined") {
        APP_MEMORY_CACHE[uId + "_app_active_session"] = cleanTarget;
    }
    if (typeof idbPut === "function") idbPut(uId + "_app_active_session", cleanTarget);

    if (typeof db !== "undefined" && db && uId && uId !== "app") {
        try { db.ref("users/" + uId + "/app_active_session").set(cleanTarget); } catch(e) {}
    }

    if (typeof clearMemoryCache === "function") clearMemoryCache();
    if (typeof APP_MEMORY_CACHE !== "undefined") {
        APP_MEMORY_CACHE[uId + "_app_active_session"] = cleanTarget;
    }

    if (typeof initIndexedDBPreload === "function") {
        initIndexedDBPreload(function() {
            populateSessionDropdown();
            if (typeof backToDashboard === "function") backToDashboard();
            if (typeof triggerActiveSectionRefresh === "function") triggerActiveSectionRefresh();
            if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
        });
    } else {
        populateSessionDropdown();
        if (typeof backToDashboard === "function") backToDashboard();
        if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    }
}

// ================= MODAL OPEN & CLOSE CONTROLS =================
function openSessionClosingModal() {
    var modal = document.getElementById("session-closing-modal");
    if (!modal) return;

    var curDisplay = document.getElementById("session-current-display");
    var cur = getActiveFinancialSession();
    if (curDisplay) curDisplay.value = cur;

    var newInp = document.getElementById("session-new-input");
    if (newInp) {
        var parts = cur.split("-");
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            newInp.value = (parseInt(parts[0], 10) + 1) + "-" + (parseInt(parts[1], 10) + 1);
        } else {
            newInp.value = "";
        }
    }

    var checklistBox = document.getElementById("session-closing-guidelines-box");
    if (!checklistBox && newInp && newInp.parentNode) {
        checklistBox = document.createElement("div");
        checklistBox.id = "session-closing-guidelines-box";
        checklistBox.style.cssText = "background:#f0fdf4; border:1px solid #86efac; border-radius:10px; padding:12px; margin:12px 0; text-align:left; font-size:12px;";
        newInp.parentNode.parentNode.insertBefore(checklistBox, document.querySelector("#session-closing-modal button[onclick*='startSequentialYearClosing']"));
    }

    if (checklistBox) {
        checklistBox.innerHTML = 
            "<strong style='color:#15803d; font-size:13px; display:block; margin-bottom:6px;'>📋 Naye Saal Me Kya-Kya Badlaav Honge:</strong>" +
            "<div style='color:#166534; line-height:1.7;'>" +
                "<div>🧵 <strong>Kariger Khata:</strong> Pichli mazdoori, pichla bana & zari naye saal ki <b>Tani 1</b> ka Opening Balance banegi.</div>" +
                "<div>🥻 <strong>Saree Stock:</strong> Sabhi godamon ki bachi hui saree naye saal ka <b>Opening Stock</b> ban kar aayegi.</div>" +
                "<div>🧶 <strong>Bana & ✨ Zari:</strong> Godam ka bacha wazan naye saal ke godam mein <b>Opening Stock</b> judega.</div>" +
                "<div>⚙️ <strong>Sancha & Job Work:</strong> Baki bacha maal aage carry-forward hoga.</div>" +
                "<div>🔒 <strong>Purana Saal Safe:</strong> Pichla saal freeze ho jayega, jise aap dropdown se kabhi bhi khol kar dekh sakte hain.</div>" +
            "</div>";
    }

    var delSel = document.getElementById("session-delete-select");
    if (delSel) {
        delSel.innerHTML = "<option value=''>-- Chunein --</option>";
        var sessions = getAppSessions();
        sessions.forEach(function(s) {
            delSel.innerHTML += "<option value='" + s + "'>" + s + "</option>";
        });
    }

    modal.style.display = "flex";
}

function closeSessionClosingModal() {
    var modal = document.getElementById("session-closing-modal");
    if (modal) modal.style.display = "none";
}

/**
 * 🌟 ZERO-CRASH SESSION DELETE ENGINE (2000+ Kariger Safe)
 */
function confirmAndDeleteSessionWithAuth() {
    var delSel = document.getElementById("session-delete-select");
    var targetSess = delSel ? delSel.value : "";
    var uInp = (document.getElementById("session-del-user-id") && document.getElementById("session-del-user-id").value || "").trim().toLowerCase();
    var pInp = (document.getElementById("session-del-password") && document.getElementById("session-del-password").value || "").trim();

    if (!targetSess) return alert("Pehle delete karne ke liye session chunein!");
    if (!uInp || !pInp) return alert("User ID aur Password daalna zaroori hai!");

    var users = (typeof getUsersList === "function") ? getUsersList() : [];
    var foundUser = users.find(function(u) {
        var matchId = (u.id && String(u.id).toLowerCase() === uInp);
        var matchMob = (u.mobile && String(u.mobile).trim() === uInp);
        return (matchId || matchMob) && String(u.pass) === String(pInp);
    });

    if (!foundUser) {
        return alert("❌ Galat User ID ya Password! Session delete nahi hoga.");
    }

    var sessions = getAppSessions();
    if (sessions.length <= 1) {
        return alert("❌ Aakhri bacha hua Session delete nahi ho sakta!");
    }

    if (!confirm("⚠️ KYA AAP SACH ME '" + targetSess + "' KA PURA DATA DELETE KARNA CHAHTE HAIN?\nIs saal ka sara hisab phone aur cloud dono se permanently delete ho jayega!")) {
        return;
    }

    var uId = getEffectiveUserId();

    // 🔒 1. Cloud Listener Mute (Taaki delete ke waqt 2000 events se browser crash na ho)
    if (typeof db !== "undefined" && db && uId && uId !== "app") {
        try { db.ref("users/" + uId).off(); } catch(e) {}
    }

    // 2. Target Session ke Karigers aur Workers ki list nikal lo (Sheets saaf karne ke liye)
    var karigerListKey = uId + "_" + targetSess + "_kariger_list";
    var jwListKey = uId + "_" + targetSess + "_jobwork_workers";
    
    var oldKarigers = (typeof APP_MEMORY_CACHE !== "undefined" && APP_MEMORY_CACHE[karigerListKey]) || [];
    if (!oldKarigers.length) {
        try { oldKarigers = JSON.parse(localStorage.getItem(karigerListKey) || "[]"); } catch(e) {}
    }

    var oldWorkers = (typeof APP_MEMORY_CACHE !== "undefined" && APP_MEMORY_CACHE[jwListKey]) || [];
    if (!oldWorkers.length) {
        try { oldWorkers = JSON.parse(localStorage.getItem(jwListKey) || "[]"); } catch(e) {}
    }

    // 3. Session list update
    sessions = sessions.filter(function(s) { return s !== targetSess; });
    localStorage.setItem(uId + "_app_sessions_list", JSON.stringify(sessions));
    if (typeof idbPut === "function") idbPut(uId + "_app_sessions_list", sessions);

    // 4. LocalStorage & Memory Clean
    var prefix = uId + "_" + targetSess + "_";
    var keysToRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(prefix) === 0) keysToRemove.push(k);
    }
    keysToRemove.forEach(function(k) { localStorage.removeItem(k); });

    if (typeof APP_MEMORY_CACHE !== "undefined") {
        for (var mk in APP_MEMORY_CACHE) {
            if (mk.indexOf(prefix) === 0) delete APP_MEMORY_CACHE[mk];
        }
    }

    // 5. ⭐ IndexedDB Clean (Without loading in RAM - Cursor engine)
    if (typeof openEnterpriseIndexedDB === "function") {
        openEnterpriseIndexedDB(function(dbase) {
            if (!dbase) return;
            try {
                var tx = dbase.transaction("app_store", "readwrite");
                var store = tx.objectStore("app_store");
                var req = store.openCursor();
                req.onsuccess = function(e) {
                    var cursor = e.target.result;
                    if (cursor) {
                        if (String(cursor.key).indexOf(prefix) === 0) {
                            cursor.delete();
                        }
                        cursor.continue();
                    }
                };
            } catch(e) {}
        });
    }

    // 6. ⭐ SAFE CLOUD WIPE (Standard Keys + 2000 Kariger Sheets Safe Deletion)
    if (typeof db !== "undefined" && db && uId && uId !== "app") {
        try {
            db.ref("users/" + uId + "/app_sessions_list").set(sessions);
            
            // Standard session keys delete
            var standardKeys = [
                "kariger_list", "saree_history", "bana_stock", "bana_history",
                "zari_stock", "zari_history", "sancha_items", "sancha_history",
                "jobwork_workers", "jw_bills_list", "jw_payments_list", "dukan_transfer_history"
            ];

            var deleteBatch = {};
            standardKeys.forEach(function(sk) {
                deleteBatch[targetSess + "_" + sk] = null;
            });

            // 🧵 2000 Kariger Sheets ko bhi null mark karo (Taaki cloud par kachra na bache)
            if (Array.isArray(oldKarigers)) {
                oldKarigers.forEach(function(k) {
                    if (k && k.id) deleteBatch[targetSess + "_kariger_sheets_" + k.id] = null;
                });
            }

            if (Array.isArray(oldWorkers)) {
                oldWorkers.forEach(function(w) {
                    if (w && w.id) deleteBatch[targetSess + "_jobwork_sheets_" + w.id] = null;
                });
            }

            // Cloud wipe execute
            db.ref("users/" + uId).update(deleteBatch);

        } catch(e) {}
    }

    // 7. Fallback Active Session Align
    var cur = getActiveFinancialSession();
    if (cur === targetSess) {
        var nextActive = sessions[sessions.length - 1];
        localStorage.setItem(uId + "_app_active_session", nextActive);
        if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE[uId + "_app_active_session"] = nextActive;
        if (typeof db !== "undefined" && db && uId && uId !== "app") {
            try { db.ref("users/" + uId + "/app_active_session").set(nextActive); } catch(e) {}
        }
    }

    if (typeof clearMemoryCache === "function") clearMemoryCache();

    closeSessionClosingModal();
    populateSessionDropdown();

    // Re-attach live listener
    if (typeof initFirebaseLiveListeners === "function") {
        initFirebaseLiveListeners();
    }

    if (typeof backToDashboard === "function") backToDashboard();
    alert("✅ Session '" + targetSess + "' aur uske sabhi kariger accounts bina kisi crash ke safalata-poorvak delete ho gaye!");
}

document.addEventListener("DOMContentLoaded", function() {
    populateSessionDropdown();
});
