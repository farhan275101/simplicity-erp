/* ========================================================
   SIMPLICITY ERP - AUTH & STORAGE ENGINE (File 1 of 5)
   Developed by Farhan Jawed
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
var currentUserId = null;
var currentUserRole = null;
var activeKarigerId = null;
var activeSheetId = null;
var currentDayBookTab = "bana";
var targetResetUser = null;
var currentPassbookContext = null;
var activeSanchaItemId = null;
var isRemoteUpdating = false;

var isBackupPreviewMode = false;
var PREVIEW_BACKUP_DATA = null;
var APP_MEMORY_CACHE = {};

function clearMemoryCache() {
    APP_MEMORY_CACHE = {};
}

try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    console.log("✅ Firebase Database Connected Successfully!");
} catch (error) {
    console.error("❌ Firebase Init Error:", error);
}

function setDisplay(id, val) {
    var el = document.getElementById(id);
    if (el) el.style.display = val;
}

function getTodayDate() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

function formatDateDisplay(d) {
    if (!d) return "-";
    var p = String(d).split("-");
    return (p.length === 3 && p[0].length === 4) ? (p[2] + "-" + p[1] + "-" + p[0]) : d;
}

function isDateInRange(itemDate, fromDate, toDate) {
    if (!itemDate) return true;
    if (fromDate && itemDate < fromDate) return false;
    if (toDate && itemDate > toDate) return false;
    return true;
}

function showSyncStatus(status) {
    var badge = document.getElementById("cloud-status-badge");
    if (!badge) return;
    if (isBackupPreviewMode) {
        badge.className = "sync-badge";
        badge.style.background = "#fef08a"; badge.style.color = "#854d0e"; badge.style.borderColor = "#eab308";
        badge.innerHTML = "👁️ Preview Mode (No Sync)";
        return;
    }
    if (status === "syncing") {
        badge.className = "sync-badge sync-syncing";
        badge.innerHTML = "🔄 Syncing...";
    } else if (status === "offline") {
        badge.className = "sync-badge";
        badge.style.background = "#fff7ed"; badge.style.color = "#ea580c"; badge.style.borderColor = "#fed7aa";
        badge.innerHTML = "🟠 Offline Mode";
    } else if (status === "error") {
        badge.className = "sync-badge";
        badge.style.background = "#fef2f2"; badge.style.color = "#dc2626"; badge.style.borderColor = "#fecaca";
        badge.innerHTML = "⚠️ Sync Error";
    } else {
        badge.className = "sync-badge";
        badge.style.background = "#ecfdf5"; badge.style.color = "#059669"; badge.style.borderColor = "#a7f3d0";
        badge.innerHTML = "🟢 Cloud Synced";
    }
}

var idbInstance = null;
function openEnterpriseIndexedDB(callback) {
    if (idbInstance) { if (callback) callback(idbInstance); return; }
    try {
        var req = window.indexedDB.open("SimplicityERP_DB", 1);
        req.onupgradeneeded = function(e) {
            var dbase = e.target.result;
            if (!dbase.objectStoreNames.contains("app_store")) dbase.createObjectStore("app_store");
        };
        req.onsuccess = function(e) { idbInstance = e.target.result; if (callback) callback(idbInstance); };
        req.onerror = function() { if (callback) callback(null); };
    } catch(err) { if (callback) callback(null); }
}

function idbPut(key, value) {
    openEnterpriseIndexedDB(function(dbase) {
        if (!dbase) return;
        try {
            var tx = dbase.transaction("app_store", "readwrite");
            tx.objectStore("app_store").put(value, key);
        } catch(e) {}
    });
}

function initIndexedDBPreload(callback) {
    openEnterpriseIndexedDB(function(dbase) {
        if (!dbase) { migrateLocalStorageToCache(); if (callback) callback(); return; }
        try {
            var tx = dbase.transaction("app_store", "readonly");
            var req = tx.objectStore("app_store").openCursor();
            req.onsuccess = function(e) {
                var cursor = e.target.result;
                if (cursor) {
                    APP_MEMORY_CACHE[cursor.key] = cursor.value;
                    cursor.continue();
                } else {
                    migrateLocalStorageToCache();
                    if (callback) callback();
                }
            };
            req.onerror = function() { migrateLocalStorageToCache(); if (callback) callback(); };
        } catch(err) { migrateLocalStorageToCache(); if (callback) callback(); }
    });
}

function migrateLocalStorageToCache() {
    try {
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && !APP_MEMORY_CACHE.hasOwnProperty(k)) {
                var raw = localStorage.getItem(k);
                try {
                    var parsed = JSON.parse(raw);
                    APP_MEMORY_CACHE[k] = parsed;
                    idbPut(k, parsed);
                } catch(e) {
                    APP_MEMORY_CACHE[k] = raw;
                    idbPut(k, raw);
                }
            }
        }
    } catch(e) {}
}

var GLOBAL_APP_KEYS = ["app_sessions_list", "app_active_session", "karkhana_list", "app_users", "info_ledger"];

function safeArray(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data.filter(function(item) { return item !== null && item !== undefined; });
    if (typeof data === "object") {
        var keys = Object.keys(data);
        var isNum = keys.length > 0 && keys.every(function(k) { return !isNaN(parseInt(k, 10)); });
        if (isNum) {
            var arr = [];
            keys.sort(function(a, b) { return parseInt(a, 10) - parseInt(b, 10); }).forEach(function(k) {
                if (data[k] !== null && data[k] !== undefined) arr.push(data[k]);
            });
            return arr;
        }
        return data;
    }
    return [];
}

function getStorageKey(key) {
    if (!currentUserId) return key;
    if (GLOBAL_APP_KEYS.indexOf(key) !== -1) return currentUserId + "_" + key;
    var sess = "2026-2027";
    if (typeof getActiveFinancialSession === "function") {
        sess = getActiveFinancialSession();
    } else {
        var storedSess = APP_MEMORY_CACHE[currentUserId + "_app_active_session"] || localStorage.getItem(currentUserId + "_app_active_session");
        if (storedSess) sess = String(storedSess).replace(/['"]+/g, '').trim();
    }
    sess = String(sess).replace(/['"]+/g, '').trim() || "2026-2027";
    return currentUserId + "_" + sess + "_" + key;
}

function getStore(key) {
    if (isBackupPreviewMode && PREVIEW_BACKUP_DATA) {
        if (key.indexOf("kariger_sheets_") === 0) {
            var kId = key.replace("kariger_sheets_", "");
            return safeArray(PREVIEW_BACKUP_DATA.sheets ? PREVIEW_BACKUP_DATA.sheets[kId] : []);
        }
        if (key.indexOf("jobwork_sheets_") === 0) {
            var wId = key.replace("jobwork_sheets_", "");
            return safeArray(PREVIEW_BACKUP_DATA.jobwork_sheets ? PREVIEW_BACKUP_DATA.jobwork_sheets[wId] : []);
        }
        if (PREVIEW_BACKUP_DATA.data && PREVIEW_BACKUP_DATA.data.hasOwnProperty(key)) {
            var pVal = PREVIEW_BACKUP_DATA.data[key];
            return Array.isArray(pVal) ? safeArray(pVal) : pVal;
        }
        return [];
    }
    if (!currentUserId) return [];
    try {
        var fullKey = getStorageKey(key);
        if (APP_MEMORY_CACHE.hasOwnProperty(fullKey)) {
            var val = APP_MEMORY_CACHE[fullKey];
            if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") return val;
            return safeArray(val);
        }
        var raw = localStorage.getItem(fullKey);
        if (raw === null || raw === undefined) {
            var oldKey = currentUserId + "_" + key;
            var oldRaw = localStorage.getItem(oldKey);
            if (oldRaw !== null && oldRaw !== undefined) raw = oldRaw;
        }
        if (!raw) return [];
        var parsed = JSON.parse(raw);
        APP_MEMORY_CACHE[fullKey] = parsed;
        idbPut(fullKey, parsed);
        if (typeof parsed === "string" || typeof parsed === "number" || typeof parsed === "boolean") return parsed;
        return safeArray(parsed);
    } catch (e) {
        return [];
    }
}

function setStore(key, data) {
    if (isBackupPreviewMode) {
        console.warn("Write blocked: Read-Only Backup Preview Mode.");
        return;
    }
    if (!currentUserId) return;
    try {
        var fullKey = getStorageKey(key);
        var toSave = Array.isArray(data) ? safeArray(data) : data;
        APP_MEMORY_CACHE[fullKey] = toSave;
        idbPut(fullKey, toSave);
        try { localStorage.setItem(fullKey, JSON.stringify(toSave)); } catch(err) {}

        if (db && !isRemoteUpdating && currentUserId) {
            showSyncStatus("syncing");
            var fbKey = fullKey.replace(currentUserId + "_", "");
            db.ref("users/" + currentUserId + "/" + fbKey).set(toSave)
                .then(function() { showSyncStatus("online"); })
                .catch(function() { showSyncStatus("error"); });
        }
    } catch (e) {}
}

function getCurrentActiveSection() {
    var sections = [
        "dashboard-view", "admin-section", "info-section", 
        "kariger-section", "kariger-sheet-section", "bana-section", 
        "zari-section", "saree-section", "payment-section", "sancha-section",
        "jobwork-section"
    ];
    for (var i = 0; i < sections.length; i++) {
        var el = document.getElementById(sections[i]);
        if (el && el.style.display === "block") return sections[i];
    }
    return "dashboard-view";
}

function initFirebaseLiveListeners() {
    if (!db || !currentUserId) return;
    try {
        db.ref("users/" + currentUserId).on("value", function(snapshot) {
            if (isBackupPreviewMode) return;
            var val = snapshot.val();
            if (val) {
                isRemoteUpdating = true;
                for (var k in val) {
                    try {
                        var itemData = Array.isArray(val[k]) ? safeArray(val[k]) : val[k];
                        var fullKey = currentUserId + "_" + k;
                        APP_MEMORY_CACHE[fullKey] = itemData;
                        idbPut(fullKey, itemData);
                        try { localStorage.setItem(fullKey, JSON.stringify(itemData)); } catch(e) {}
                    } catch (e) {}
                }
                isRemoteUpdating = false;

                if (typeof populateSessionDropdown === "function") populateSessionDropdown();

                var cur = getCurrentActiveSection();
                if (cur === "dashboard-view") {
                    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();
                    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
                } else if (cur === "kariger-section" && typeof renderKarigerTable === "function") {
                    renderKarigerTable();
                } else if (cur === "kariger-sheet-section" && activeKarigerId && typeof loadCurrentSheetData === "function") {
                    loadCurrentSheetData();
                } else if (cur === "bana-section" && typeof renderBanaTable === "function") {
                    renderBanaTable();
                } else if (cur === "zari-section" && typeof renderZariTable === "function") {
                    renderZariTable();
                } else if (cur === "saree-section" && typeof renderSareeTable === "function") {
                    renderSareeTable();
                } else if (cur === "payment-section" && typeof renderPaymentTable === "function") {
                    renderPaymentTable();
                } else if (cur === "sancha-section" && typeof renderSanchaTable === "function") {
                    renderSanchaTable();
                } else if (cur === "jobwork-section") {
                    if (typeof renderJobWorkWorkersTable === "function") renderJobWorkWorkersTable();
                    if (typeof updateJobWorkHubBadges === "function") updateJobWorkHubBadges();
                }
                if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
                showSyncStatus("online");
            }
        });
    } catch (e) {}
}

function sanitizeKarigerList() {
    var list = safeArray(getStore("kariger_list"));
    return list.filter(function(k) { return k && k.name && String(k.name).trim() !== ""; });
}

function exportUserFullData() {
    var sess = (typeof getActiveFinancialSession === "function") ? getActiveFinancialSession() : "2026-2027";
    var keys = [
        "kariger_list", "info_ledger", "karkhana_list", "app_sessions_list", "app_active_session",
        "bana_stock", "bana_history", "zari_stock", "zari_history",
        "saree_stock", "finished_saree_stock", "lott_saree_stock", "saree_history",
        "material_transfers", "saree_transfers",
        "sancha_items", "sancha_history",
        "jobwork_workers", "jw_bills_list", "jw_payments_list", "dukan_transfer_history"
    ];
    var obj = { userId: currentUserId, session: sess, exportDate: new Date().toISOString(), data: {}, sheets: {}, jobwork_sheets: {} };
    keys.forEach(function(k) { obj.data[k] = getStore(k); });

    var karigers = sanitizeKarigerList();
    karigers.forEach(function(k) {
        if (k && k.id) {
            var sh = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : getStore("kariger_sheets_" + k.id);
            if (sh && sh.length) obj.sheets[k.id] = sh;
        }
    });

    var jwWorkers = (typeof getJobWorkers === "function") ? getJobWorkers() : safeArray(getStore("jobwork_workers"));
    jwWorkers.forEach(function(w) {
        if (w && w.id) {
            var jwSh = (typeof getJobWorkerSheets === "function") ? getJobWorkerSheets(w.id) : getStore("jobwork_sheets_" + w.id);
            if (jwSh && jwSh.length) obj.jobwork_sheets[w.id] = jwSh;
        }
    });
    return obj;
}

function syncToGoogleDrive() { downloadBackupFile(); }

function downloadBackupFile() {
    if (!currentUserId) return alert("Pehle login karein!");
    var btn = document.querySelector(".welcome-banner button[onclick*='syncToGoogleDrive']");
    var origHtml = btn ? btn.innerHTML : "";
    if (btn) btn.innerHTML = "⏳ File Ban Rahi Hai...";
    setTimeout(function() {
        try {
            var data = exportUserFullData();
            var sess = (typeof getActiveFinancialSession === "function") ? getActiveFinancialSession() : "2026-2027";
            var fileName = currentUserId + "_" + sess + "_Backup_" + formatDateDisplay(getTodayDate()) + ".json";
            var blob = new Blob([JSON.stringify(data)], { type: "application/json;charset=utf-8" });
            var downloadUrl = window.URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.style.display = "none";
            a.href = downloadUrl; a.download = fileName;
            document.body.appendChild(a); a.click();
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(downloadUrl);
                if (btn) btn.innerHTML = origHtml;
            }, 300);
        } catch (err) {
            if (btn) btn.innerHTML = origHtml;
            alert("Download Error: " + err.message);
        }
    }, 50);
}

function openBackupViewer(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(evt) {
        try {
            var parsed = JSON.parse(evt.target.result);
            if (parsed && (parsed.data || parsed.sheets)) {
                isBackupPreviewMode = true;
                PREVIEW_BACKUP_DATA = parsed;
                var banner = document.getElementById("backup-preview-banner");
                var dateText = document.getElementById("preview-banner-date");
                if (banner) banner.style.display = "flex";
                if (dateText) {
                    var sLabel = parsed.session ? (parsed.session + " • ") : "";
                    var dLabel = parsed.exportDate ? formatDateDisplay(String(parsed.exportDate).substring(0, 10)) : "Purana Backup";
                    dateText.textContent = sLabel + dLabel;
                }
                if (typeof backToDashboard === "function") backToDashboard();
                showSyncStatus("preview");
                alert("👁️ BACKUP PREVIEW MODE CHALU HO GAYA!\n\n• Yeh data sirf dekhne ke liye khula hai.\n• Aaj ka live data 100% surakshit hai.");
            } else {
                alert("Galat backup file format!");
            }
        } catch(err) { alert("File Error: " + err.message); }
    };
    reader.readAsText(file);
    e.target.value = "";
}

function exitBackupPreviewMode() {
    isBackupPreviewMode = false;
    PREVIEW_BACKUP_DATA = null;
    var banner = document.getElementById("backup-preview-banner");
    if (banner) banner.style.display = "none";
    clearMemoryCache();
    initIndexedDBPreload(function() {
        if (typeof backToDashboard === "function") backToDashboard();
        showSyncStatus("online");
        alert("✅ Preview Mode band ho gaya!");
    });
}

function restoreBackupFile(e) {
    var file = e.target.files[0];
    if (!file) return;
    if (!confirm("⚠️ KYA AAP IS BACKUP KO LIVE RESTORE KARNA CHAHTE HAIN?")) { e.target.value = ""; return; }
    var reader = new FileReader();
    reader.onload = function(evt) {
        try {
            var parsed = JSON.parse(evt.target.result);
            if (parsed && parsed.data) {
                clearMemoryCache();
                for (var key in parsed.data) setStore(key, parsed.data[key]);
                if (parsed.sheets) {
                    for (var sheetKarId in parsed.sheets) setStore("kariger_sheets_" + sheetKarId, parsed.sheets[sheetKarId]);
                }
                if (parsed.jobwork_sheets) {
                    for (var jwWorkerId in parsed.jobwork_sheets) setStore("jobwork_sheets_" + jwWorkerId, parsed.jobwork_sheets[jwWorkerId]);
                }
                alert("✅ Data successfully live restore ho gaya!");
                if (typeof populateSessionDropdown === "function") populateSessionDropdown();
                if (typeof backToDashboard === "function") backToDashboard();
            }
        } catch (err) { alert("Restore Error: " + err.message); }
    };
    reader.readAsText(file);
    e.target.value = "";
}

function getUsersList() {
    var defaultAdmin = [{
        id: "farhan", name: "Farhan Bhai (Admin)", pass: "1234",
        mobile: "9876543210", pin: "1234", role: "admin", status: "active",
        date: "2026-01-01", expiryDate: ""
    }];
    try {
        var local = APP_MEMORY_CACHE["app_users"] || localStorage.getItem("app_users");
        if (local) {
            var parsed = (typeof local === "string") ? JSON.parse(local) : local;
            if (Array.isArray(parsed) && parsed.length > 0) {
                if (!parsed.some(function(u) { return u.id === "farhan"; })) parsed.push(defaultAdmin[0]);
                return parsed;
            }
        }
    } catch (e) {}
    localStorage.setItem("app_users", JSON.stringify(defaultAdmin));
    APP_MEMORY_CACHE["app_users"] = defaultAdmin;
    idbPut("app_users", defaultAdmin);
    return defaultAdmin;
}

function syncUsersWithFirebase() {
    if (!db) return;
    try {
        db.ref(
