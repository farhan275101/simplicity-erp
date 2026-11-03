/* ========================================================
   SIMPLICITY ERP - ADMIN CONTROL & APPROVAL ENGINE
   File: admin/admin.js • Developed by Farhan Jawed
   (Instant Realtime Sync + Approval System + Cloud Delete)
======================================================== */

var fbUsersListenerAttached = false;

// 👑 ADMIN PANEL OPEN (Live Cloud Fetch & Sync)
function openAdminModule() {
    var uid = (typeof currentUserId !== "undefined" ? String(currentUserId).trim().toLowerCase() : "");
    var role = (typeof currentUserRole !== "undefined" ? String(currentUserRole).trim().toLowerCase() : "");

    // Master Admin 'farhan' ya role 'admin' dono access kar sakte hain
    if (role !== "admin" && uid !== "farhan") {
        return alert("Sirf Admin is panel ko access kar sakte hain!");
    }

    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("admin-section", "block");

    // 1. Local Cache se turant dikhao taaki screen blank na lage
    renderAdminUsersTable();

    // 2. Firebase Cloud Se Live Realtime Connection (.on listener)
    if (typeof db !== "undefined" && db && !fbUsersListenerAttached) {
        fbUsersListenerAttached = true;
        db.ref("app_users").on("value", function(snap) {
            var v = snap.val();
            if (v) {
                var arr = [];
                for (var k in v) { 
                    if (v[k]) {
                        var uItem = v[k];
                        if (!uItem.id) uItem.id = k;
                        arr.push(uItem);
                    }
                }

                // Guarantee Master Admin presence
                if (!arr.some(function(u) { return String(u.id).toLowerCase() === "farhan"; })) {
                    arr.push({ 
                        id: "farhan", 
                        name: "Farhan jawed", 
                        pass: "97438090641154", 
                        role: "admin", 
                        status: "active", 
                        date: "2026-01-01" 
                    });
                }

                // Multi-Tier Caches Update
                localStorage.setItem("app_users", JSON.stringify(arr));
                if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE["app_users"] = arr;
                if (typeof idbPut === "function") idbPut("app_users", arr);
                if (typeof setStore === "function") setStore("app_users", arr);

                renderAdminUsersTable();
            }
        });
    }
}

// 👑 ADMIN TABLE RENDER (Pending Detection + Highlighted Banner + Approve Button)
function renderAdminUsersTable() {
    // 1. Safe Users Retrieval (Original Code 3 Standard)
    var users = [];
    if (typeof getUsersList === "function") {
        users = getUsersList();
    }
    if (!users || !users.length) {
        try {
            users = JSON.parse(localStorage.getItem("app_users")) || [];
        } catch (e) {
            users = [];
        }
    }

    var tbody = document.getElementById("admin-users-table-body");
    if (!tbody) return;

    var tot = 0, act = 0, blk = 0, pnd = 0;
    var pendingUsersList = [];
    var tableRowsHtml = "";

    users.forEach(function(u, idx) {
        if (!u || !u.id) return;
        tot++;
        var isA = (u.role === "admin" || String(u.id).toLowerCase() === "farhan");
        var isP = (u.status === "pending");
        var isB = (u.status === "blocked");
        var isE = (typeof isUserExpired === "function") ? isUserExpired(u) : false;

        if (isP) {
            pnd++;
            pendingUsersList.push(u);
        } else if (isB || isE) {
            blk++;
        } else {
            act++;
        }

        var stBadge = isA ? "<span class='badge-green'>👑 Owner</span>" : 
                     (isP ? "<span style='background:#fef3c7; color:#b45309; border:1px solid #fde68a; padding:4px 8px; border-radius:20px; font-weight:700; font-size:11px;'>⏳ Approval Pending</span>" : 
                     (isB ? "<span class='badge-red'>⛔ Blocked</span>" : 
                     (isE ? "<span class='badge-red'>⌛ Expired</span>" : "<span class='badge-green'>Active</span>")));

        // Action Buttons: Pending ke liye APPROVE, active ke liye BLOCK
        var actionBtns = "";
        if (isP) {
            actionBtns = "<button type='button' class='quick-btn' style='background:#059669; color:white; font-weight:bold; padding:6px 12px; border-radius:6px; cursor:pointer;' onclick='approveUserByAdmin(\"" + u.id + "\")'>✅ Approve</button> " +
                         "<button type='button' class='delete-btn' onclick='deleteUserByAdmin(\"" + u.id + "\")'>🗑️ Reject</button>";
        } else if (!isA) {
            actionBtns = "<button type='button' class='quick-btn " + (isB ? "btn-in" : "btn-out") + "' onclick='toggleUserBlockStatus(\"" + u.id + "\")'>" + (isB ? "Unblock" : "Block") + "</button> " +
                         "<button type='button' class='edit-btn' onclick='resetUserPasswordByAdmin(\"" + u.id + "\")'>🔑 Pass</button> " +
                         "<button type='button' class='delete-btn' onclick='deleteUserByAdmin(\"" + u.id + "\")'>🗑️</button>";
        } else {
            actionBtns = "<span style='color:#059669; font-weight:bold; font-size:12px;'>👑 Full Control</span>";
        }

        var expiryDisplay = isA ? "Lifetime" : 
                            (isP ? "<span style='color:#b45309; font-weight:bold;'>Approval Ka Intezar</span>" : 
                            ("<input type='date' value='" + (u.expiryDate || "") + "' onchange='updateUserExpiryDate(\"" + u.id + "\", this.value)' style='padding:2px 4px;font-size:11px;border-radius:4px;border:1px solid #cbd5e1;'> " + (typeof formatDateDisplay === "function" ? formatDateDisplay(u.expiryDate) : (u.expiryDate || "-")) + " <button type='button' onclick='extendValidity(\"" + u.id + "\", 30)' style='padding:2px 6px;font-size:10px;border-radius:4px;border:none;background:#2563eb;color:white;cursor:pointer;'>+30D</button>"));

        tableRowsHtml += "<tr>" +
            "<td>" + (idx + 1) + "</td>" +
            "<td><strong>" + (u.name || "-") + "</strong></td>" +
            "<td>" + (u.mobile || "-") + "</td>" +
            "<td><code>" + u.id + "</code></td>" +
            "<td><strong style='color:#1e3a8a;'>" + (u.pass || "-") + "</strong></td>" +
            "<td>" + (typeof formatDateDisplay === "function" ? formatDateDisplay(u.date) : (u.date || "-")) + "</td>" +
            "<td>" + expiryDisplay + "</td>" +
            "<td>" + stBadge + "</td>" +
            "<td style='text-align:center; white-space:nowrap;'>" + actionBtns + "</td>" +
        "</tr>";
    });

    // Single Reflow Render
    tbody.innerHTML = tableRowsHtml;

    // 🔔 TOP PENDING CARD: Table Ke Upar Bada Card
    var adminSec = document.getElementById("admin-section");
    var pendingBanner = document.getElementById("admin-pending-approval-banner");
    if (!pendingBanner && adminSec) {
        pendingBanner = document.createElement("div");
        pendingBanner.id = "admin-pending-approval-banner";
        var tableWrap = adminSec.querySelector(".table-responsive");
        if (tableWrap) adminSec.insertBefore(pendingBanner, tableWrap);
    }

    if (pendingBanner) {
        if (pendingUsersList.length > 0) {
            var pHtml = "<div style='background:#fffbeb; border:2px solid #f59e0b; border-radius:12px; padding:14px; margin-bottom:16px;'>" +
                "<div style='color:#b45309; font-size:14px; font-weight:800; margin-bottom:10px;'>🔔 Naye Account Approval Requests (" + pendingUsersList.length + "):</div>" +
                "<div style='display:flex; flex-direction:column; gap:8px;'>";

            pendingUsersList.forEach(function(pu) {
                pHtml += "<div style='background:white; border:1px solid #fde68a; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;'>" +
                    "<div>" +
                        "<strong style='color:#1e3a8a; font-size:14px;'>👤 " + pu.name + "</strong> &bull; <code>User ID: " + pu.id + "</code> &bull; 📞 " + (pu.mobile || "-") +
                        "<div style='font-size:11px; color:#64748b;'>Request Date: " + (typeof formatDateDisplay === "function" ? formatDateDisplay(pu.date) : (pu.date || "-")) + "</div>" +
                    "</div>" +
                    "<div style='display:flex; gap:8px;'>" +
                        "<button type='button' class='quick-btn' style='background:#059669; color:white; font-weight:bold; padding:8px 16px; border-radius:6px; cursor:pointer;' onclick='approveUserByAdmin(\"" + pu.id + "\")'>✅ Approve Karein</button>" +
                        "<button type='button' class='delete-btn' style='padding:8px 12px;' onclick='deleteUserByAdmin(\"" + pu.id + "\")'>🗑️ Reject</button>" +
                    "</div>" +
                "</div>";
            });

            pHtml += "</div></div>";
            pendingBanner.innerHTML = pHtml;
            pendingBanner.style.display = "block";
        } else {
            pendingBanner.style.display = "none";
        }
    }

    var elTot = document.getElementById("admin-total-users");
    var elAct = document.getElementById("admin-active-users");
    var elBlk = document.getElementById("admin-blocked-users");
    if (elTot) elTot.textContent = tot;
    if (elAct) elAct.textContent = act;
    if (elBlk) elBlk.textContent = blk;
}

// Helper: Save across all storage engines
function commitUsersRegistry(users) {
    localStorage.setItem("app_users", JSON.stringify(users));
    if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE["app_users"] = users;
    if (typeof idbPut === "function") idbPut("app_users", users);
    if (typeof setStore === "function") setStore("app_users", users);
}

// ✅ ADMIN APPROVE ENGINE (1-Click Instant Approval)
function approveUserByAdmin(uid) {
    var users = (typeof getUsersList === "function") ? getUsersList() : JSON.parse(localStorage.getItem("app_users") || "[]");
    var u = users.find(function(x) { return String(x.id) === String(uid); });
    if (!u) return alert("User record nahi mila!");

    var exp = new Date();
    exp.setDate(exp.getDate() + 30);
    var formattedExp = exp.toISOString().split('T')[0];

    u.status = "active";
    u.expiryDate = formattedExp;

    commitUsersRegistry(users);
    
    // Direct Cloud Update (Safe Child Path)
    if (typeof db !== "undefined" && db) {
        try {
            db.ref("app_users/" + uid + "/status").set("active");
            db.ref("app_users/" + uid + "/expiryDate").set(formattedExp);
        } catch (e) {
            console.error(e);
        }
    }

    renderAdminUsersTable();
    alert("🎉 User '" + u.name + "' (" + u.id + ") ko APPROVE kar diya gaya hai!\nAb wo turant login kar sakta hai.");
}

function updateUserExpiryDate(uid, dateVal) {
    var users = (typeof getUsersList === "function") ? getUsersList() : JSON.parse(localStorage.getItem("app_users") || "[]");
    var u = users.find(function(x) { return String(x.id) === String(uid); });
    if (!u) return;

    u.expiryDate = dateVal;
    commitUsersRegistry(users);

    if (typeof db !== "undefined" && db) {
        try { db.ref("app_users/" + uid + "/expiryDate").set(dateVal); } catch (e) {}
    }
    renderAdminUsersTable();
}

function extendValidity(uid, days) {
    var users = (typeof getUsersList === "function") ? getUsersList() : JSON.parse(localStorage.getItem("app_users") || "[]");
    var u = users.find(function(x) { return String(x.id) === String(uid); });
    if (!u) return;

    var base = (u.expiryDate && new Date(u.expiryDate) > new Date()) ? new Date(u.expiryDate) : new Date();
    base.setDate(base.getDate() + days);
    var formatted = base.toISOString().split('T')[0];

    u.expiryDate = formatted;
    if (u.status === "blocked" || u.status === "pending") u.status = "active";

    commitUsersRegistry(users);

    if (typeof db !== "undefined" && db) {
        try {
            db.ref("app_users/" + uid + "/expiryDate").set(formatted);
            db.ref("app_users/" + uid + "/status").set("active");
        } catch (e) {}
    }
    renderAdminUsersTable();
    alert("✅ User " + u.name + " ki validity " + (typeof formatDateDisplay === "function" ? formatDateDisplay(formatted) : formatted) + " tak badh gayi!");
}

function resetUserPasswordByAdmin(uid) {
    var users = (typeof getUsersList === "function") ? getUsersList() : JSON.parse(localStorage.getItem("app_users") || "[]");
    var u = users.find(function(x) { return String(x.id) === String(uid); });
    if (!u) return;

    var newPass = prompt("User " + u.name + " ka naya password daalein:", Math.floor(100000 + Math.random() * 900000).toString());
    if (!newPass || !newPass.trim()) return;

    u.pass = newPass.trim();
    commitUsersRegistry(users);

    if (typeof db !== "undefined" && db) {
        try { db.ref("app_users/" + uid + "/pass").set(u.pass); } catch (e) {}
    }
    renderAdminUsersTable();
    alert("✅ Password updated: " + u.pass);
}

function toggleUserBlockStatus(uid) {
    if (String(uid).toLowerCase() === "farhan") return alert("⛔ Master Admin ko block nahi kiya ja sakta!");

    var users = (typeof getUsersList === "function") ? getUsersList() : JSON.parse(localStorage.getItem("app_users") || "[]");
    var u = users.find(function(x) { return String(x.id) === String(uid); });
    if (!u) return;

    u.status = (u.status === "blocked" ? "active" : "blocked");
    commitUsersRegistry(users);

    if (typeof db !== "undefined" && db) {
        try { db.ref("app_users/" + uid + "/status").set(u.status); } catch (e) {}
    }
    renderAdminUsersTable();
}

// 🗑️ USER DELETE / REJECT ENGINE (Permanent Cloud + Local Purge)
function deleteUserByAdmin(uid) {
    if (String(uid).toLowerCase() === "farhan") return alert("⛔ Master Admin ko delete nahi kiya ja sakta!");
    if (!confirm("Kya aap sach me is User aur iska SARRA DATA delete/reject karna chahte hain?\nYeh action undo nahi ho sakta.")) return;
    
    if (typeof purgeUserDataPermanently === "function") {
        purgeUserDataPermanently(uid);
    }

    // 1. Local Cache Se Hatao
    var users = ((typeof getUsersList === "function") ? getUsersList() : JSON.parse(localStorage.getItem("app_users") || "[]"))
        .filter(function(x) { return String(x.id) !== String(uid); });

    commitUsersRegistry(users);
    
    // 2. Firebase Cloud Se Bhi Permanently Hatao (Taaki refresh par wapas na aaye)
    if (typeof db !== "undefined" && db) {
        try {
            db.ref("app_users/" + uid).remove();
        } catch (e) {
            console.error("Firebase remove error:", e);
        }
    }
    
    renderAdminUsersTable();
    alert("🗑️ User permanently delete ho gaya!");
}

function refreshAdminUsersList() {
    if (typeof db !== "undefined" && db) {
        db.ref("app_users").once("value", function(snap) {
            var v = snap.val();
            if (v) {
                var arr = [];
                for (var k in v) { 
                    if (v[k]) {
                        var it = v[k];
                        if (!it.id) it.id = k;
                        arr.push(it);
                    }
                }
                commitUsersRegistry(arr);
                renderAdminUsersTable();
                alert("✅ Admin Users List Refresh ho gayi!");
            }
        });
    } else {
        renderAdminUsersTable();
    }
}
