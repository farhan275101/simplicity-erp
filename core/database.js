/* ========================================================
   SIMPLICITY ERP - FIREBASE CLOUD & REALTIME SYNC (FIXED)
   File: core/database.js • Developed by Farhan Jawed
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

// 🔒 STRICT FIREBASE LISTENER (Delete Restore Bug Fixed)
function initFirebaseLiveListeners() {
    if (!db || !currentUserId) return;
    var uid = String(currentUserId).trim().toLowerCase();

    try {
        db.ref("users/" + uid).on("value", function(snapshot) {
            if (typeof isBackupPreviewMode !== "undefined" && isBackupPreviewMode) return;
            
            var val = snapshot.val();
            if (val) {
                isRemoteUpdating = true;
                
                for (var k in val) {
                    if (k === "app_active_session") continue; // Session change ko disturb mat karo

                    try {
                        var itemData = Array.isArray(val[k]) ? safeArray(val[k]) : val[k];
                        var fullKey = uid + "_" + k;
                        APP_MEMORY_CACHE[fullKey] = itemData;
                        if (typeof idbPut === "function") idbPut(fullKey, itemData);
                        try { localStorage.setItem(fullKey, JSON.stringify(itemData)); } catch(e) {}
                    } catch (e) {}
                }
                
                isRemoteUpdating = false;

                if (typeof triggerActiveSectionRefresh === "function") {
                    triggerActiveSectionRefresh();
                }

                showSyncStatus("online");
            }
        });
    } catch (e) {}
}
