/* ========================================================
   SIMPLICITY ERP - OFFLINE STORAGE & DATA CACHE ENGINE
   File: core/storage.js • Developed by Farhan Jawed
   (Strict User Isolation + Multi-Karkhana & Session Support)
======================================================== */

// Global Memory Cache & State
var APP_MEMORY_CACHE = {};
var idbInstance = null;
var isRemoteUpdating = false;
var isBackupPreviewMode = false;
var PREVIEW_BACKUP_DATA = null;

// Safe Array Helper (Script loading safety)
if (typeof safeArray !== "function") {
    window.safeArray = function(arr) {
        if (!arr) return [];
        return Array.isArray(arr) ? arr : [];
    };
}

// 🔒 GLOBAL KEYS (Ye keys har session me common aur live rahengi)
var GLOBAL_APP_KEYS = [
    "app_sessions_list", 
    "app_active_session", 
    "karkhana_list", 
    "active_karkhana_id",
    "karkhana_transfers",
    "app_users", 
    "info_ledger"
];

// Memory Cache Clear
function clearMemoryCache() {
    APP_MEMORY_CACHE = {};
}

// Enterprise IndexedDB Initialization
function openEnterpriseIndexedDB(callback) {
    if (idbInstance) { 
        if (callback) callback(idbInstance); 
        return; 
    }
    try {
        var req = window.indexedDB.open("SimplicityERP_DB", 1);
        req.onupgradeneeded = function(e) {
            var dbase = e.target.result;
            if (!dbase.objectStoreNames.contains("app_store")) {
                dbase.createObjectStore("app_store");
            }
        };
        req.onsuccess = function(e) { 
            idbInstance = e.target.result; 
            if (callback) callback(idbInstance); 
        };
        req.onerror = function() { 
            if (callback) callback(null); 
        };
    } catch(err) { 
        if (callback) callback(null); 
    }
}

// IndexedDB Put Record
function idbPut(key, value) {
    openEnterpriseIndexedDB(function(dbase) {
        if (!dbase) return;
        try {
            var tx = dbase.transaction("app_store", "readwrite");
            tx.objectStore("app_store").put(value, key);
        } catch(e) {}
    });
}

// IndexedDB Delete Record
function idbDelete(key) {
    openEnterpriseIndexedDB(function(dbase) {
        if (!dbase) return;
        try {
            var tx = dbase.transaction("app_store", "readwrite");
            tx.objectStore("app_store").delete(key);
        } catch(e) {}
    });
}

// IndexedDB Preload into Memory Cache (User Isolated)
function initIndexedDBPreload(callback) {
    var uid = getEffectiveUserId();
    openEnterpriseIndexedDB(function(dbase) {
        if (!dbase) { 
            migrateLocalStorageToCache(); 
            if (callback) callback(); 
            return; 
        }
        try {
            var tx = dbase.transaction("app_store", "readonly");
            var req = tx.objectStore("app_store").openCursor();
            req.onsuccess = function(e) {
                var cursor = e.target.result;
                if (cursor) {
                    var k = String(cursor.key);
                    // Sirf current user aur global app keys memory me aayengi
                    if (k.indexOf(uid + "_") === 0 || k === "app_users") {
                        APP_MEMORY_CACHE[k] = cursor.value;
                    }
                    cursor.continue();
                } else {
                    migrateLocalStorageToCache();
                    if (callback) callback();
                }
            };
            req.onerror = function() { 
                migrateLocalStorageToCache(); 
                if (callback) callback(); 
            };
        } catch(err) { 
            migrateLocalStorageToCache(); 
            if (callback) callback(); 
        }
    });
}

// Migration from LocalStorage to Memory Cache
function migrateLocalStorageToCache() {
    var uid = getEffectiveUserId();
    try {
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && (k.indexOf(uid + "_") === 0 || k === "app_users") && !APP_MEMORY_CACHE.hasOwnProperty(k)) {
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

// Current User ID Resolver
function getEffectiveUserId() {
    if (typeof currentUserId !== "undefined" && currentUserId) {
        return String(currentUserId).trim().toLowerCase();
    }
    return "app";
}

// Key Generator: Session & Multi-Tenant Isolated
function getStorageKey(key) {
    var uid = getEffectiveUserId();
    if (GLOBAL_APP_KEYS.indexOf(key) !== -1) {
        return uid + "_" + key;
    }
    var sess = "2026-2027";
    if (typeof getActiveFinancialSession === "function") {
        sess = getActiveFinancialSession();
    } else {
        var storedSess = APP_MEMORY_CACHE[uid + "_app_active_session"] || localStorage.getItem(uid + "_app_active_session");
        if (storedSess) sess = String(storedSess).replace(/['"]+/g, '').trim();
    }
    sess = String(sess).replace(/['"]+/g, '').trim() || "2026-2027";
    return uid + "_" + sess + "_" + key;
}

// Strict Secure Store Getter
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

    try {
        var fullKey = getStorageKey(key);

        // 1. Direct Memory Cache
        if (APP_MEMORY_CACHE.hasOwnProperty(fullKey)) {
            var val = APP_MEMORY_CACHE[fullKey];
            if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") return val;
            return safeArray(val);
        }

        // 2. Direct LocalStorage Check
        var raw = localStorage.getItem(fullKey);
        if (!raw || raw === "null" || raw === "undefined") {
            return []; // Naye account ke liye fresh EMPTY array
        }

        var parsed = JSON.parse(raw);
        APP_MEMORY_CACHE[fullKey] = parsed;
        if (typeof parsed === "string" || typeof parsed === "number" || typeof parsed === "boolean") return parsed;
        return safeArray(parsed);
    } catch (e) {
        return [];
    }
}

// Strict Secure Store Setter with Realtime Firebase Sync
function setStore(key, data) {
    if (isBackupPreviewMode) return;

    try {
        var fullKey = getStorageKey(key);
        var toSave = Array.isArray(data) ? safeArray(data) : data;
        
        APP_MEMORY_CACHE[fullKey] = toSave;
        idbPut(fullKey, toSave);
        
        try { 
            localStorage.setItem(fullKey, JSON.stringify(toSave)); 
        } catch(err) {}

        var uid = getEffectiveUserId();
        if (typeof db !== "undefined" && db && !isRemoteUpdating && uid && uid !== "app") {
            if (typeof showSyncStatus === "function") showSyncStatus("syncing");
            var fbKey = fullKey.replace(uid + "_", "");
            db.ref("users/" + uid + "/" + fbKey).set(toSave)
                .then(function() { 
                    if (typeof showSyncStatus === "function") showSyncStatus("online"); 
                })
                .catch(function() { 
                    if (typeof showSyncStatus === "function") showSyncStatus("error"); 
                });
        }
    } catch (e) {}
}

// Permanent Delete Key (Cloud + Local Both Cleaned)
function deleteStoreKey(key) {
    try {
        var fullKey = getStorageKey(key);
        delete APP_MEMORY_CACHE[fullKey];
        idbDelete(fullKey);
        localStorage.removeItem(fullKey);

        var uid = getEffectiveUserId();
        if (typeof db !== "undefined" && db && uid && uid !== "app") {
            var fbKey = fullKey.replace(uid + "_", "");
            db.ref("users/" + uid + "/" + fbKey).remove();
        }
    } catch (e) {}
}
