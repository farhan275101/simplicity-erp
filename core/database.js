/* ========================================================
   SIMPLICITY ERP - FIREBASE CLOUD & REALTIME SYNC (FIXED)
   File: core/database.js • Developed by Farhan Jawed
   (Instant Multi-Device Session Sync: Laptop <-> Mobile)
======================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyDkLlLPFnZexLWxtvqg3UiE9XG_IclaSAk",
    authDomain: "simplicity-erp.firebaseapp.com",
    databaseURL: "https://simplicity-erp-default-rtdb.firebaseio.com",
    projectId: "simplicity-erp",
    storageBucket: "simplicity-erp.firebasestorage.app",
    messagingSenderId: "261724969835",
    appId: "1:261724969835:web:23a073ab544f55679f0a2e",
    measurementId: "G-9TS8H04N4N"
};

var db = null;

try {
    if (typeof firebase !== "undefined") {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        console.log("✅ Cloud Connected!");
    }
} catch (error) {
    console.error("Firebase Init Error:", error);
}

function showSyncStatus(status) {
    var badge = document.getElementById("cloud-status-badge");
    if (!badge) return;

    if (typeof isBackupPreviewMode !== "undefined" && isBackupPreviewMode) {
        badge.className = "sync-badge";
        badge.style.background = "#fef08a"; badge.style.color = "#854d0e";
        badge.innerHTML = "👁️ Preview Mode";
        return;
    }

    if (status === "syncing") {
        badge.className = "sync-badge sync-syncing";
        badge.innerHTML = "🔄 Syncing...";
    } else if (status === "offline") {
        badge.className = "sync-badge";
        badge.style.background = "#fff7ed"; badge.style.color = "#ea580c";
        badge.innerHTML = "🟠 Offline Mode";
    } else {
        badge.className = "sync-badge";
        badge.style.background = "#ecfdf5"; badge.style.color = "#059669";
        badge.innerHTML = "🟢 Cloud Synced";
    }
}

// 🔒 MULTI-DEVICE LIVE SYNC (Laptop & Mobile Always Same)
function initFirebaseLiveListeners() {
    if (!db || !currentUserId) return;
    var uid = String(currentUserId).trim().toLowerCase();

    try {
        db.ref("users/" + uid).on("value", function(snapshot) {
            if (typeof isBackupPreviewMode !== "undefined" && isBackupPreviewMode) return;
            
            var val = snapshot.val();
            if (val) {
                isRemoteUpdating = true;
                
                // 1. Cloud se saara data aur sessions download karo
                for (var k in val) {
                    try {
                        var itemData = Array.isArray(val[k]) ? safeArray(val[k]) : val[k];
                        var fullKey = uid + "_" + k;
                        APP_MEMORY_CACHE[fullKey] = itemData;
                        if (typeof idbPut === "function") idbPut(fullKey, itemData);
                        try { localStorage.setItem(fullKey, JSON.stringify(itemData)); } catch(e) {}
                    } catch (e) {}
                }
                
                isRemoteUpdating = false;

                // 2. 🚨 SESSIONS & ACTIVE SAAL AUTO-ALIGN (Dono Device Par Ek Jaisa Hoga)
                if (typeof populateSessionDropdown === "function") {
                    populateSessionDropdown();
                }

                if (val["app_active_session"]) {
                    var cleanCloudSess = String(val["app_active_session"]).replace(/['"]+/g, '').trim();
                    var sel = document.getElementById("app-session-select");
                    if (sel && sel.value !== cleanCloudSess) {
                        sel.value = cleanCloudSess;
                    }
                }

                // 3. Live Dashboard aur Badges Refresh
                if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();
                if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
                if (typeof triggerActiveSectionRefresh === "function") triggerActiveSectionRefresh();

                showSyncStatus("online");
            }
        });
    } catch (e) {}
}
