/* ========================================================
   SIMPLICITY ERP - FINANCIAL YEAR SESSION CONTROLLER
   File: session/session.js • Developed by Farhan Jawed
   (Guidance Checklist + Auto Session Align + Cloud Delete)
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

    // 1. LocalStorage & Memory
    localStorage.setItem(uId + "_app_active_session", cleanTarget);
    if (typeof APP_MEMORY_CACHE !== "undefined") {
        APP_MEMORY_CACHE[uId + "_app_active_session"] = cleanTarget;
    }
    if (typeof idbPut === "function") idbPut(uId + "_app_active_session", cleanTarget);

    // 2. 🚨 FIREBASE AUTO SESSION SYNC (Dono Device Par Same Saal Khulega)
    if (typeof db !== "undefined" && db && uId && uId !== "app") {
        try { db.ref("users/" + uId + "/app_active_session").set(cleanTarget); } catch(e) {}
    }

    // 3. Clear Cache & Refresh
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

    // 📋 GUIDANCE CHECKLIST CARD (Karkhana Malik Ke Samne Saaf Badlaav)
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

    // Populate Delete Session Dropdown
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

// ================= DELETE SESSION WITH AUTHENTICATION & CLOUD WIPE =================
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
    sessions = sessions.filter(function(s) { return s !== targetSess; });
    localStorage.setItem(uId + "_app_sessions_list", JSON.stringify(sessions));
    if (typeof idbPut === "function") idbPut(uId + "_app_sessions_list", sessions);

    // 1. LocalStorage & Memory Se Delete
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

    // 2. 🚨 FIREBASE CLOUD SE BHI PERMANENT REMOVE
    if (typeof db !== "undefined" && db && uId && uId !== "app") {
        try {
            db.ref("users/" + uId + "/app_sessions_list").set(sessions);
            db.ref("users/" + uId).once("value", function(snap) {
                var val = snap.val();
                if (val) {
                    for (var rk in val) {
                        if (rk.indexOf(targetSess + "_") === 0) {
                            db.ref("users/" + uId + "/" + rk).remove();
                        }
                    }
                }
            });
        } catch(e) {}
    }

    // 3. Fallback Active Session
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
    if (typeof backToDashboard === "function") backToDashboard();
    alert("✅ Session '" + targetSess + "' safalata-poorvak delete ho gaya!");
}

document.addEventListener("DOMContentLoaded", function() {
    populateSessionDropdown();
});
