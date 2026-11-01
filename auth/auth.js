/* ========================================================
   SIMPLICITY ERP - AUTH & ADMIN APPROVAL ENGINE (LIVE SYNC)
   File: auth/auth.js • Developed by Farhan Jawed
   (Manager Approval Contact: +91 79854 02962)
======================================================== */

var currentUserId = null;
var currentUserRole = null;
var activeKarigerId = null;
var activeSheetId = null;
var currentDayBookTab = "bana";
var targetResetUser = null;
var currentPassbookContext = null;
var activeSanchaItemId = null;

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

// 🗑️ PERMANENT PURGE ENGINE
function purgeUserDataPermanently(uid) {
    if (!uid) return;
    var cleanUid = String(uid).trim().toLowerCase();

    var keysToRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && (k.indexOf(cleanUid + "_") === 0 || k === cleanUid)) {
            keysToRemove.push(k);
        }
    }
    keysToRemove.forEach(function(k) { localStorage.removeItem(k); });

    if (typeof APP_MEMORY_CACHE !== "undefined") {
        for (var mk in APP_MEMORY_CACHE) {
            if (mk.indexOf(cleanUid + "_") === 0) delete APP_MEMORY_CACHE[mk];
        }
    }

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
                        if (String(cursor.key).indexOf(cleanUid + "_") === 0) {
                            cursor.delete();
                        }
                        cursor.continue();
                    }
                };
            } catch(e) {}
        });
    }

    if (typeof db !== "undefined" && db) {
        try {
            db.ref("users/" + cleanUid).remove();
            db.ref("app_users/" + cleanUid).remove();
        } catch(e) {}
    }
}

function getUsersList() {
    var defaultAdmin = [{
        id: "farhan", name: "Farhan Bhai (Admin)", pass: "1234",
        mobile: "9876543210", pin: "1234", role: "admin", status: "active",
        date: "2026-01-01", expiryDate: ""
    }];
    try {
        var local = (typeof APP_MEMORY_CACHE !== "undefined" && APP_MEMORY_CACHE["app_users"]) || localStorage.getItem("app_users");
        if (local) {
            var parsed = (typeof local === "string") ? JSON.parse(local) : local;
            if (Array.isArray(parsed) && parsed.length > 0) {
                if (!parsed.some(function(u) { return u.id === "farhan"; })) parsed.push(defaultAdmin[0]);
                return parsed;
            }
        }
    } catch (e) {}
    localStorage.setItem("app_users", JSON.stringify(defaultAdmin));
    if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE["app_users"] = defaultAdmin;
    if (typeof idbPut === "function") idbPut("app_users", defaultAdmin);
    return defaultAdmin;
}

function syncUsersWithFirebase() {
    if (typeof db === "undefined" || !db) return;
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
                if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE["app_users"] = arr;
                if (typeof idbPut === "function") idbPut("app_users", arr);
                if (currentUserRole === "admin" && typeof renderAdminUsersTable === "function") {
                    renderAdminUsersTable();
                }
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

// 🔒 REGISTRATION ENGINE
function handleRegister() {
    var name = (document.getElementById("reg-name").value || "").trim();
    var mobile = (document.getElementById("reg-mobile").value || "").trim();
    var id = (document.getElementById("reg-id").value || "").trim().toLowerCase();
    var pass = (document.getElementById("reg-pass").value || "").trim();
    var pin = (document.getElementById("reg-pin").value || "").trim();
    var msg = document.getElementById("signup-msg");

    if (!name || !id || !pass || !mobile || !pin || pin.length !== 4) {
        msg.textContent = "Sabhi details bharein (4-digit PIN zaroori hai)!";
        msg.className = "message error"; msg.style.display = "block";
        return;
    }
    var users = getUsersList();
    if (users.some(function(u) { return u.id && u.id.toLowerCase() === id; })) {
        msg.textContent = "Yeh User ID pehle se maujood hai!";
        msg.className = "message error"; msg.style.display = "block";
        return;
    }

    purgeUserDataPermanently(id);

    var isOwner = (id === "farhan");
    var exp = new Date(); exp.setDate(exp.getDate() + 30);
    
    var newUser = {
        id: id, 
        name: name, 
        pass: pass, 
        mobile: mobile, 
        pin: pin,
        role: (isOwner ? "admin" : "user"), 
        status: (isOwner ? "active" : "pending"), 
        date: getTodayDate(), 
        expiryDate: exp.toISOString().split('T')[0]
    };

    users.push(newUser);
    localStorage.setItem("app_users", JSON.stringify(users));
    if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE["app_users"] = users;
    if (typeof idbPut === "function") idbPut("app_users", users);
    if (typeof db !== "undefined" && db) try { db.ref("app_users/" + id).set(newUser); } catch (e) {}

    if (isOwner) {
        msg.textContent = "✅ Admin Account Ban Gaya!";
    } else {
        msg.innerHTML = "⏳ <strong>Account Request Bheji Gayi!</strong><br>Approval ke liye Manager se sampark karein:<br>📞 <a href='tel:+917985402962' style='color:#2563eb; font-weight:bold;'>+91 79854 02962</a>";
    }
    msg.className = "message success"; msg.style.display = "block";

    setTimeout(function() {
        showLogin();
        document.getElementById("reg-name").value = "";
        document.getElementById("reg-mobile").value = "";
        document.getElementById("reg-id").value = "";
        document.getElementById("reg-pass").value = "";
        document.getElementById("reg-pin").value = "";
        msg.style.display = "none";
    }, 3000);
}

// 🔓 LOGIN ENGINE (Manager Contact Added)
function handleLogin() {
    var idInput = document.getElementById("login-id");
    var passInput = document.getElementById("login-pass");
    var err = document.getElementById("login-error");

    var id = (idInput ? idInput.value : "").trim().toLowerCase();
    var pass = (passInput ? passInput.value : "").trim();

    if (!id || !pass) {
        if (err) {
            err.textContent = "Kripya User ID aur Password dono bharein!";
            err.style.display = "block";
        }
        return;
    }

    var verifyAndProceed = function(users) {
        var user = users.find(function(u) {
            var matchId = (u.id && String(u.id).toLowerCase() === id);
            var matchMob = (u.mobile && String(u.mobile).trim() === id);
            return (matchId || matchMob) && String(u.pass) === String(pass);
        });

        if (user) {
            // 🚨 PENDING CHECK (Manager Number)
            if (user.status === "pending") {
                if (err) {
                    err.innerHTML = "⏳ <strong>Account Approval Pending Hai!</strong><br>Approval ke liye Manager se sampark karein:<br>📞 <a href='tel:+917985402962' style='color:#2563eb; font-weight:800; text-decoration:underline;'>+91 79854 02962</a> &bull; <a href='https://wa.me/917985402962?text=Hello%20Manager%20Sahab,%20mera%20Simplicity%20ERP%20account%20(ID:%20" + user.id + ")%20approve%20kar%20dijiye.' target='_blank' style='color:#16a34a; font-weight:800;'>📲 WhatsApp</a>";
                    err.style.display = "block";
                }
                return;
            }

            // 🚨 BLOCKED CHECK
            if (user.status === "blocked") {
                if (err) {
                    err.innerHTML = "⛔ Account Block hai! Manager se contact karein:<br>📞 <a href='tel:+917985402962' style='color:#2563eb; font-weight:bold;'>+91 79854 02962</a>";
                    err.style.display = "block";
                }
                return;
            }

            // 🚨 EXPIRED CHECK
            if (isUserExpired(user)) {
                if (err) {
                    err.innerHTML = "⌛ Account Expired (" + formatDateDisplay(user.expiryDate) + ")! Renew karane ke liye Manager se contact karein:<br>📞 <a href='tel:+917985402962' style='color:#2563eb; font-weight:bold;'>+91 79854 02962</a>";
                    err.style.display = "block";
                }
                return;
            }

            if (typeof clearMemoryCache === "function") clearMemoryCache();
            currentUserId = user.id;
            currentUserRole = user.role || (user.id === "farhan" ? "admin" : "user");
            localStorage.setItem("app_current_user_id", user.id);

            if (err) err.style.display = "none";
            setDisplay("login-wrapper", "none");
            setDisplay("desktop-screen", "flex");

            if (currentUserRole === "admin") {
                document.getElementById("welcome-text").textContent = "👑 Swagat hai Admin, " + user.name + "!";
                setDisplay("nav-admin-btn", "inline-block");
            } else {
                document.getElementById("welcome-text").textContent = "Swagat hai, " + user.name + "!";
                setDisplay("nav-admin-btn", "none");
            }

            if (typeof initIndexedDBPreload === "function") {
                initIndexedDBPreload(function() {
                    if (typeof initFirebaseLiveListeners === "function") initFirebaseLiveListeners();
                    if (typeof populateSessionDropdown === "function") populateSessionDropdown();
                    if (typeof backToDashboard === "function") backToDashboard();
                });
            }
        } else {
            if (err) {
                err.textContent = "Galat User ID ya Password!";
                err.style.display = "block";
            }
        }
    };

    if (typeof db !== "undefined" && db) {
        db.ref("app_users").once("value", function(snap) {
            var val = snap.val();
            if (val) {
                var arr = [];
                for (var uid in val) { if (val[uid]) arr.push(val[uid]); }
                localStorage.setItem("app_users", JSON.stringify(arr));
                if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE["app_users"] = arr;
                verifyAndProceed(arr);
            } else {
                verifyAndProceed(getUsersList());
            }
        }).catch(function() {
            verifyAndProceed(getUsersList());
        });
    } else {
        verifyAndProceed(getUsersList());
    }
}

function logout() {
    if (typeof clearMemoryCache === "function") clearMemoryCache();
    currentUserId = null;
    currentUserRole = null;
    activeKarigerId = null;
    activeSheetId = null;
    localStorage.removeItem("app_current_user_id");

    var idInput = document.getElementById("login-id");
    var passInput = document.getElementById("login-pass");
    var err = document.getElementById("login-error");
    if (idInput) idInput.value = "";
    if (passInput) passInput.value = "";
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
        msg.className = "message error"; msg.style.display = "block";
        return;
    }
    targetResetUser = user;
    setDisplay("forgot-step-1", "none");
    setDisplay("forgot-step-2", "block");
    msg.textContent = "✅ PIN Verified! Naya password banayein.";
    msg.className = "message success"; msg.style.display = "block";
}

function saveNewPassword() {
    var p1 = (document.getElementById("forgot-new-pass").value || "").trim();
    var p2 = (document.getElementById("forgot-confirm-pass").value || "").trim();
    var msg = document.getElementById("forgot-msg");

    if (!p1 || p1 !== p2) {
        msg.textContent = "Dono password match hone chahiye!";
        msg.className = "message error"; msg.style.display = "block";
        return;
    }
    var users = getUsersList();
    var idx = users.findIndex(function(u) { return u.id === targetResetUser.id; });
    if (idx !== -1) {
        users[idx].pass = p1;
        localStorage.setItem("app_users", JSON.stringify(users));
        if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE["app_users"] = users;
        if (typeof idbPut === "function") idbPut("app_users", users);
        if (typeof db !== "undefined" && db) try { db.ref("app_users/" + targetResetUser.id + "/pass").set(p1); } catch (e) {}

        msg.textContent = "✅ Password update ho gaya! Login karein.";
        msg.className = "message success"; msg.style.display = "block";

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

function closeProfileModal() { setDisplay("profile-modal", "none"); }

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
        users[idx].name = n; users[idx].mobile = m; users[idx].pin = p; users[idx].pass = pass;
        localStorage.setItem("app_users", JSON.stringify(users));
        if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE["app_users"] = users;
        if (typeof idbPut === "function") idbPut("app_users", users);
        if (typeof db !== "undefined" && db) try { db.ref("app_users/" + currentUserId).set(users[idx]); } catch (e) {}
        document.getElementById("welcome-text").textContent = "Swagat hai, " + n + "!";
        closeProfileModal();
        alert("✅ Settings successfully save ho gayi!");
    }
}
