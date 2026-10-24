/* ========================================================
   SIMPLICITY ERP - FIREBASE, STORAGE, AUTH & ADMIN ENGINE
   File 3 of 6 • Developed by Farhan Jawed
======================================================== */

// 1. FIREBASE CONFIGURATION & INITIALIZATION
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

try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
    console.log("✅ Firebase Database Connected Successfully!");
} catch (error) {
    console.error("❌ Firebase Initialization Error:", error);
}

// 2. BASIC UTILITY FUNCTIONS
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

    if (status === "syncing") {
        badge.className = "sync-badge sync-syncing";
        badge.innerHTML = "🔄 Syncing...";
    } else if (status === "offline") {
        badge.className = "sync-badge";
        badge.style.background = "#fff7ed";
        badge.style.color = "#ea580c";
        badge.style.borderColor = "#fed7aa";
        badge.innerHTML = "🟠 Offline Mode";
    } else if (status === "error") {
        badge.className = "sync-badge";
        badge.style.background = "#fef2f2";
        badge.style.color = "#dc2626";
        badge.style.borderColor = "#fecaca";
        badge.innerHTML = "⚠️ Sync Error";
    } else {
        badge.className = "sync-badge";
        badge.style.background = "#ecfdf5";
        badge.style.color = "#059669";
        badge.style.borderColor = "#a7f3d0";
        badge.innerHTML = "🟢 Cloud Synced";
    }
}

// 3. CRITICAL STORAGE NORMALIZER (Fixes Calculation Crashes)
function safeArray(data) {
    if (!data) return [];
    if (Array.isArray(data)) {
        return data.filter(function(item) {
            return item !== null && item !== undefined;
        });
    }
    if (typeof data === "object") {
        var arr = [];
        for (var key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                if (data[key] !== null && data[key] !== undefined) {
                    arr.push(data[key]);
                }
            }
        }
        return arr;
    }
    return [];
}

function getStore(key) {
    if (!currentUserId) return [];
    try {
        var raw = localStorage.getItem(currentUserId + "_" + key);
        if (!raw) return [];
        var parsed = JSON.parse(raw);
        return safeArray(parsed);
    } catch (e) {
        return [];
    }
}

function setStore(key, data) {
    if (!currentUserId) return;
    try {
        var cleanData = safeArray(data);
        localStorage.setItem(currentUserId + "_" + key, JSON.stringify(cleanData));

        if (db && !isRemoteUpdating && currentUserId) {
            showSyncStatus("syncing");
            db.ref("users/" + currentUserId + "/" + key).set(cleanData)
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
            var val = snapshot.val();
            if (val) {
                isRemoteUpdating = true;
                for (var k in val) {
                    try {
                        var normalized = safeArray(val[k]);
                        localStorage.setItem(currentUserId + "_" + k, JSON.stringify(normalized));
                    } catch (e) {}
                }
                isRemoteUpdating = false;

                var cur = getCurrentActiveSection();
                if (cur === "dashboard-view") {
                    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();
                    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
                } else if (cur === "kariger-section" && typeof renderKarigerTable === "function") {
                    renderKarigerTable();
                } else if (cur === "kariger-sheet-section" && activeKarigerId && typeof loadCurrentSheet === "function") {
                    loadCurrentSheet();
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
                } else if (cur === "jobwork-section" && typeof renderJobWorkTable === "function") {
                    renderJobWorkTable();
                }

                if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
                showSyncStatus("online");
            }
        });
    } catch (e) {}
}

function sanitizeKarigerList() {
    var list = getStore("karigers");
    var clean = list.filter(function(k) {
        return k && k.name && String(k.name).trim() !== "";
    });
    if (clean.length !== list.length) {
        setStore("karigers", clean);
    }
    return clean;
}

// 4. DATA BACKUP & RESTORE
function exportUserFullData() {
    var keys = [
        "karigers", "kariger_info_ledger", "bana_stock", "bana_history",
        "zari_stock", "zari_history", "saree_stock", "saree_history",
        "sancha_items", "sancha_history", "jobwork_workers"
    ];
    var obj = {
        userId: currentUserId,
        exportDate: new Date().toISOString(),
        data: {},
        sheets: {},
        jobwork_sheets: {}
    };

    keys.forEach(function(k) { obj.data[k] = getStore(k); });

    var karigers = sanitizeKarigerList();
    karigers.forEach(function(k) {
        if (typeof getKarigerSheets === "function") {
            obj.sheets[k.id] = getKarigerSheets(k.id);
        }
    });

    if (typeof getJobWorkers === "function" && typeof getJobWorkerSheets === "function") {
        getJobWorkers().forEach(function(w) {
            if (w && w.id) {
                obj.jobwork_sheets[w.id] = getJobWorkerSheets(w.id);
            }
        });
    }

    return obj;
}

async function syncToGoogleDrive() {
    if (!currentUserId) return alert("Pehle login karein!");
    var data = exportUserFullData();
    var fileName = currentUserId + "_Backup_" + formatDateDisplay(getTodayDate()) + ".json";
    var file = new File([JSON.stringify(data, null, 2)], fileName, { type: "application/json" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: "Karkhana ERP Backup" });
        } catch (err) {
            downloadBackupFile();
        }
    } else {
        downloadBackupFile();
    }
}

function downloadBackupFile() {
    if (!currentUserId) return alert("Pehle login karein!");
    var data = exportUserFullData();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = currentUserId + "_Backup_" + formatDateDisplay(getTodayDate()) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function restoreBackupFile(e) {
    var file = e.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(evt) {
        try {
            var parsed = JSON.parse(evt.target.result);
            if (parsed && parsed.data) {
                for (var key in parsed.data) {
                    setStore(key, parsed.data[key]);
                }
                if (parsed.sheets) {
                    for (var sheetKarId in parsed.sheets) {
                        setStore("kariger_sheets_" + sheetKarId, parsed.sheets[sheetKarId]);
                    }
                }
                if (parsed.jobwork_sheets) {
                    for (var jwWorkerId in parsed.jobwork_sheets) {
                        setStore("jobwork_sheets_" + jwWorkerId, parsed.jobwork_sheets[jwWorkerId]);
                    }
                }
                alert("✅ Data successfully restore ho gaya!");
                if (typeof backToDashboard === "function") backToDashboard();
            }
        } catch (err) {
            alert("Restore Error: " + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = "";
}

// 5. AUTHENTICATION & LOGIN PRIVACY ENGINE
function getUsersList() {
    var defaultAdmin = [{
        id: "farhan",
        name: "Farhan Bhai (Admin)",
        pass: "1234",
        mobile: "9876543210",
        pin: "1234",
        role: "admin",
        status: "active",
        date: "2026-01-01",
        expiryDate: ""
    }];

    try {
        var local = localStorage.getItem("app_users");
        if (local) {
            var parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) {
                if (!parsed.some(function(u) { return u.id === "farhan"; })) {
                    parsed.push(defaultAdmin[0]);
                }
                return parsed;
            }
        }
    } catch (e) {}

    localStorage.setItem("app_users", JSON.stringify(defaultAdmin));
    return defaultAdmin;
}

function syncUsersWithFirebase() {
    if (!db) return;
    try {
        db.ref("app_users").on("value", function(snap) {
            var val = snap.val();
            if (val) {
                var arr = [];
                for (var uid in val) { if (val[uid]) arr.push(val[uid]); }
                if (!arr.some(function(u) { return u.id === "farhan"; })) {
                    var defaultAdmin = {
                        id: "farhan", name: "Farhan Bhai (Admin)", pass: "1234",
                        mobile: "9876543210", pin: "1234", role: "admin",
                        status: "active", date: "2026-01-01", expiryDate: ""
                    };
                    arr.push(defaultAdmin);
                    db.ref("app_users/farhan").set(defaultAdmin);
                }
                localStorage.setItem("app_users", JSON.stringify(arr));
                if (currentUserRole === "admin") renderAdminUsersTable();
            }
        });
    } catch (e) {}
}

function showSignup() {
    setDisplay("login-box", "none");
    setDisplay("forgot-box", "none");
    setDisplay("signup-box", "block");
}

function showLogin() {
    setDisplay("signup-box", "none");
    setDisplay("forgot-box", "none");
    setDisplay("login-box", "block");
}

function showForgotPassword() {
    setDisplay("login-box", "none");
    setDisplay("signup-box", "none");
    setDisplay("forgot-box", "block");
    setDisplay("forgot-step-1", "block");
    setDisplay("forgot-step-2", "none");
}

function isUserExpired(user) {
    if (!user || user.role === "admin" || user.id === "farhan" || !user.expiryDate) return false;
    return getTodayDate() > user.expiryDate;
}

function handleRegister() {
    var name = (document.getElementById("reg-name").value || "").trim();
    var mobile = (document.getElementById("reg-mobile").value || "").trim();
    var id = (document.getElementById("reg-id").value || "").trim().toLowerCase();
    var pass = (document.getElementById("reg-pass").value || "").trim();
    var pin = (document.getElementById("reg-pin").value || "").trim();
    var msg = document.getElementById("signup-msg");

    if (!name || !id || !pass || !mobile || !pin || pin.length !== 4) {
        msg.textContent = "Sabhi details bharein (4-digit PIN zaroori hai)!";
        msg.className = "message error";
        msg.style.display = "block";
        return;
    }

    var users = getUsersList();
    if (users.some(function(u) { return u.id && u.id.toLowerCase() === id; })) {
        msg.textContent = "Yeh User ID pehle se maujood hai!";
        msg.className = "message error";
        msg.style.display = "block";
        return;
    }

    var exp = new Date();
    exp.setDate(exp.getDate() + 30);

    var newUser = {
        id: id, name: name, pass: pass, mobile: mobile, pin: pin,
        role: (id === "farhan" ? "admin" : "user"), status: "active",
        date: getTodayDate(), expiryDate: exp.toISOString().split('T')[0]
    };

    users.push(newUser);
    localStorage.setItem("app_users", JSON.stringify(users));

    if (db) {
        try { db.ref("app_users/" + id).set(newUser); } catch (e) {}
    }

    msg.textContent = "✅ Account ban gaya! 30 din ki validity shuru.";
    msg.className = "message success";
    msg.style.display = "block";

    setTimeout(function() {
        showLogin();
        document.getElementById("reg-name").value = "";
        document.getElementById("reg-mobile").value = "";
        document.getElementById("reg-id").value = "";
        document.getElementById("reg-pass").value = "";
        document.getElementById("reg-pin").value = "";
        msg.style.display = "none";
    }, 1200);
}

// STRICT CLEAN LOGIN (No Auto-Fill)
function handleLogin() {
    var idInput = document.getElementById("login-id");
    var passInput = document.getElementById("login-pass");
    var err = document.getElementById("login-error");

    var id = (idInput ? idInput.value : "").trim().toLowerCase();
    var pass = (passInput ? passInput.value : "").trim();

    if (!id || !pass) {
        err.textContent = "Kripya User ID aur Password dono bharein!";
        err.style.display = "block";
        return;
    }

    var users = getUsersList();
    var user = users.find(function(u) {
        var matchId = (u.id && String(u.id).toLowerCase() === id);
        var matchMob = (u.mobile && String(u.mobile).trim() === id);
        return (matchId || matchMob) && String(u.pass) === String(pass);
    });

    if (user) {
        if (user.status === "blocked") {
            err.textContent = "⛔ Account Block hai! Admin se contact karein.";
            err.style.display = "block";
            return;
        }

        if (isUserExpired(user)) {
            err.innerHTML = "⌛ Account Expired (" + formatDateDisplay(user.expiryDate) + ")! Admin se contact karein.";
            err.style.display = "block";
            return;
        }

        currentUserId = user.id;
        currentUserRole = user.role || (user.id === "farhan" ? "admin" : "user");

        err.style.display = "none";
        setDisplay("login-wrapper", "none");
        setDisplay("desktop-screen", "flex");

        if (currentUserRole === "admin") {
            document.getElementById("welcome-text").textContent = "👑 Swagat hai Admin, " + user.name + "!";
            setDisplay("nav-admin-btn", "inline-block");
        } else {
            document.getElementById("welcome-text").textContent = "Swagat hai, " + user.name + "!";
            setDisplay("nav-admin-btn", "none");
        }

        initFirebaseLiveListeners();
        if (typeof backToDashboard === "function") backToDashboard();
    } else {
        err.textContent = "Galat User ID ya Password!";
        err.style.display = "block";
    }
}

function logout() {
    currentUserId = null;
    currentUserRole = null;
    activeKarigerId = null;
    activeSheetId = null;

    var idInput = document.getElementById("login-id");
    var passInput = document.getElementById("login-pass");
    var err = document.getElementById("login-error");

    if (idInput) idInput.value = "";
    if (passInput) passInp.value = "";
    if (err) err.style.display = "none";

    setDisplay("desktop-screen", "none");
    setDisplay("login-wrapper", "flex");
    showLogin();
}

function verifyForgotPin() {
    var q = (document.getElementById("forgot-query").value || "").trim().toLowerCase();
    var pin = (document.getElementById("forgot-pin").value || "").trim();
    var msg = document.getElementById("forgot-msg");

    var users = getUsersList();
    var user = users.find(function(u) {
        return (u.id && u.id.toLowerCase() === q) || (u.mobile && u.mobile.trim() === q);
    });

    if (!user || String(pin) !== String(user.pin || "1234")) {
        msg.textContent = "Galat User details ya PIN!";
        msg.className = "message error";
        msg.style.display = "block";
        return;
    }

    targetResetUser = user;
    setDisplay("forgot-step-1", "none");
    setDisplay("forgot-step-2", "block");
    msg.textContent = "✅ PIN Verified! Naya password banayein.";
    msg.className = "message success";
    msg.style.display = "block";
}

function saveNewPassword() {
    var p1 = (document.getElementById("forgot-new-pass").value || "").trim();
    var p2 = (document.getElementById("forgot-confirm-pass").value || "").trim();
    var msg = document.getElementById("forgot-msg");

    if (!p1 || p1 !== p2) {
        msg.textContent = "Dono password match hone chahiye!";
        msg.className = "message error";
        msg.style.display = "block";
        return;
    }

    var users = getUsersList();
    var idx = users.findIndex(function(u) { return u.id === targetResetUser.id; });

    if (idx !== -1) {
        users[idx].pass = p1;
        localStorage.setItem("app_users", JSON.stringify(users));

        if (db) {
            try { db.ref("app_users/" + targetResetUser.id + "/pass").set(p1); } catch (e) {}
        }

        msg.textContent = "✅ Password update ho gaya! Login karein.";
        msg.className = "message success";
        msg.style.display = "block";

        setTimeout(function() {
            showLogin();
            document.getElementById("forgot-query").value = "";
            document.getElementById("forgot-pin").value = "";
            document.getElementById("forgot-new-pass").value = "";
            document.getElementById("forgot-confirm-pass").value = "";
            msg.style.display = "none";
        }, 1200);
    }
}

// 6. ADMIN CONTROL PANEL
function openAdminModule() {
    if (currentUserRole !== "admin") return alert("Sirf Admin is panel ko access kar sakte hain!");
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("admin-section", "block");
    renderAdminUsersTable();
}

function renderAdminUsersTable() {
    var users = getUsersList();
    var tbody = document.getElementById("admin-users-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var tot = 0, act = 0, blk = 0;

    users.forEach(function(u, idx) {
        tot++;
        var isB = (u.status === "blocked");
        var isE = isUserExpired(u);
        if (isB || isE) blk++; else act++;

        var isA = (u.role === "admin" || u.id === "farhan");
        var stBadge = isA ? "<span class='badge-green'>👑 Owner</span>" : 
                     (isB ? "<span class='badge-red'>⛔ Blocked</span>" : 
                     (isE ? "<span class='badge-red'>⌛ Expired</span>" : 
                            "<span class='badge-green'>Active</span>"));

        tbody.innerHTML += "<tr>" +
            "<td>" + (idx + 1) + "</td>" +
            "<td><strong>" + u.name + "</strong></td>" +
            "<td>" + (u.mobile || "-") + "</td>" +
            "<td><code>" + u.id + "</code></td>" +
            "<td><strong style='color:#1e3a8a;'>" + (u.pass || "-") + "</strong></td>" +
            "<td>" + formatDateDisplay(u.date) + "</td>" +
            "<td>" + (isA ? "Lifetime" : ("<input type='date' value='" + (u.expiryDate || "") + "' onchange='updateUserExpiryDate(\"" + u.id + "\", this.value)' style='padding:2px 4px;font-size:11px;border-radius:4px;border:1px solid #cbd5e1;'> " + formatDateDisplay(u.expiryDate) + " <button onclick='extendValidity(\"" + u.id + "\", 30)' style='padding:2px 6px;font-size:10px;border-radius:4px;border:none;background:#2563eb;color:white;cursor:pointer;'>+30D</button>")) + "</td>" +
            "<td>" + stBadge + "</td>" +
            "<td style='text-align:center;'>" + (isA ? "-" : ("<button class='quick-btn " + (isB ? "btn-in" : "btn-out") + "' onclick='toggleUserBlockStatus(\"" + u.id + "\")'>" + (isB ? "Unblock" : "Block") + "</button> <button class='edit-btn' onclick='resetUserPasswordByAdmin(\"" + u.id + "\")'>🔑 Pass</button> <button class='delete-btn' onclick='deleteUserByAdmin(\"" + u.id + "\")'>🗑️</button>")) + "</td>" +
        "</tr>";
    });

    var elTot = document.getElementById("admin-total-users");
    var elAct = document.getElementById("admin-active-users");
    var elBlk = document.getElementById("admin-blocked-users");

    if (elTot) elTot.textContent = tot;
    if (elAct) elAct.textContent = act;
    if (elBlk) elBlk.textContent = blk;
}

function updateUserExpiryDate(uid, dateVal) {
    var users = getUsersList();
    var u = users.find(function(x) { return x.id === uid; });
    if (!u) return;
    u.expiryDate = dateVal;
    localStorage.setItem("app_users", JSON.stringify(users));
    if (db) try { db.ref("app_users/" + uid + "/expiryDate").set(dateVal); } catch (e) {}
    renderAdminUsersTable();
}

function extendValidity(uid, days) {
    var users = getUsersList();
    var u = users.find(function(x) { return x.id === uid; });
    if (!u) return;

    var base = (u.expiryDate && new Date(u.expiryDate) > new Date()) ? new Date(u.expiryDate) : new Date();
    base.setDate(base.getDate() + days);
    var formatted = base.toISOString().split('T')[0];

    u.expiryDate = formatted;
    if (u.status === "blocked") u.status = "active";

    localStorage.setItem("app_users", JSON.stringify(users));
    if (db) {
        try {
            db.ref("app_users/" + uid + "/expiryDate").set(formatted);
            db.ref("app_users/" + uid + "/status").set("active");
        } catch (e) {}
    }
    renderAdminUsersTable();
    alert("✅ User " + u.name + " ki validity " + formatDateDisplay(formatted) + " tak badh gayi!");
}

function resetUserPasswordByAdmin(uid) {
    var users = getUsersList();
    var u = users.find(function(x) { return x.id === uid; });
    if (!u) return;

    var newPass = prompt("User " + u.name + " ka naya password daalein:", Math.floor(100000 + Math.random() * 900000).toString());
    if (!newPass || !newPass.trim()) return;

    u.pass = newPass.trim();
    localStorage.setItem("app_users", JSON.stringify(users));
    if (db) try { db.ref("app_users/" + uid + "/pass").set(u.pass); } catch (e) {}
    renderAdminUsersTable();
    alert("✅ Password updated: " + u.pass);
}

function toggleUserBlockStatus(uid) {
    var users = getUsersList();
    var u = users.find(function(x) { return x.id === uid; });
    if (!u) return;

    u.status = (u.status === "blocked" ? "active" : "blocked");
    localStorage.setItem("app_users", JSON.stringify(users));
    if (db) try { db.ref("app_users/" + uid + "/status").set(u.status); } catch (e) {}
    renderAdminUsersTable();
}

function deleteUserByAdmin(uid) {
    if (!confirm("User ko delete karna chahte hain?")) return;
    var users = getUsersList().filter(function(x) { return x.id !== uid; });
    localStorage.setItem("app_users", JSON.stringify(users));
    if (db) {
        try {
            db.ref("app_users/" + uid).remove();
            db.ref("users/" + uid).remove();
        } catch (e) {}
    }
    renderAdminUsersTable();
}

function refreshAdminUsersList() {
    if (db) {
        try {
            db.ref("app_users").once("value", function(snap) {
                var v = snap.val();
                if (v) {
                    var arr = [];
                    for (var k in v) { if (v[k]) arr.push(v[k]); }
                    localStorage.setItem("app_users", JSON.stringify(arr));
                    renderAdminUsersTable();
                    alert("✅ Admin Users List Refresh ho gayi!");
                }
            });
        } catch (e) {
            renderAdminUsersTable();
        }
    } else {
        renderAdminUsersTable();
    }
}

// 7. USER PROFILE & SETTINGS
function openProfileModal() {
    if (!currentUserId) return alert("Pehle login karein!");
    var u = getUsersList().find(function(x) { return x.id === currentUserId; });
    if (!u) return;

    document.getElementById("prof-name").value = u.name || "";
    document.getElementById("prof-id").value = u.id || "";
    document.getElementById("prof-mobile").value = u.mobile || "";
    document.getElementById("prof-pin").value = u.pin || "1234";
    document.getElementById("prof-pass").value = u.pass || "";
    setDisplay("profile-modal", "flex");
}

function closeProfileModal() {
    setDisplay("profile-modal", "none");
}

function saveProfileSettings() {
    var n = (document.getElementById("prof-name").value || "").trim();
    var m = (document.getElementById("prof-mobile").value || "").trim();
    var p = (document.getElementById("prof-pin").value || "").trim();
    var pass = (document.getElementById("prof-pass").value || "").trim();

    if (!n || !m || p.length !== 4 || !pass) {
        return alert("Kripya sabhi details sahi bharein (4-digit PIN zaroori hai)!");
    }

    var users = getUsersList();
    var idx = users.findIndex(function(x) { return x.id === currentUserId; });

    if (idx !== -1) {
        users[idx].name = n;
        users[idx].mobile = m;
        users[idx].pin = p;
        users[idx].pass = pass;

        localStorage.setItem("app_users", JSON.stringify(users));
        if (db) try { db.ref("app_users/" + currentUserId).set(users[idx]); } catch (e) {}

        document.getElementById("welcome-text").textContent = "Swagat hai, " + n + "!";
        closeProfileModal();
        alert("✅ Settings successfully save ho gayi!");
    }
}
