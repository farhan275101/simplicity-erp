/* ========================================================
   SIMPLICITY ERP - ENTERPRISE ADMIN CONTROL & APPROVAL ENGINE
   File: admin/admin.js • Developed by Farhan Jawed
   (Live Cloud Sync + Top Approval Banner + Master Protection)
======================================================== */

var fbUsersListenerAttached = false;

// 👑 ADMIN PANEL OPEN (Live Cloud Realtime Listener)
function openAdminModule() {
    var uid = (typeof currentUserId !== "undefined" ? String(currentUserId).trim().toLowerCase() : "");
    var role = (typeof currentUserRole !== "undefined" ? String(currentUserRole).trim().toLowerCase() : "");

    // Master Admin 'farhan' ya role 'admin' dono access kar sakte hain
    if (role !== "admin" && uid !== "farhan") {
        return alert("⛔ Security Alert: Sirf Master Admin (Farhan) is panel ko access kar sakte hain!");
    }

    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("admin-section", "block");

    // 1. Local Cache se turant render karo taaki screen blank na dikhe
    renderAdminUsersTable();

    // 2. Firebase Cloud Se Live Realtime Connection (.on listener)
    if (typeof db !== "undefined" && db && !fbUsersListenerAttached) {
        fbUsersListenerAttached = true;
        db.ref("app_users").on("value", function(snap) {
            var v = snap.val();
            var arr = [];

            if (Array.isArray(v)) {
                arr = v.filter(Boolean);
            } else if (v && typeof v === "object") {
                for (var k in v) { 
                    if (v[k] && typeof v[k] === "object") {
                        var uItem = v[k];
                        if (!uItem.id) uItem.id = k;
                        arr.push(uItem);
                    }
                }
            }

            // Master Admin 'farhan' ko hamesha list me barkarar rakho
            if (!arr.some(function(u) { return String(u.id).toLowerCase() === "farhan"; })) {
                arr.push({ 
                    id: "farhan", 
                    name: "Farhan jawed", 
                    mobile: "7065572191",
                    pass: "97438090641154", 
                    role: "admin", 
                    status: "active", 
                    date: "2026-01-01" 
                });
            }

            commitAdminUsersRegistry(arr);
            renderAdminUsersTable();
        });
    }
}

// 📦 MULTI-TIER SAVE (Har storage me save karega taaki mismatch na ho)
function commitAdminUsersRegistry(users) {
    var uid = (typeof currentUserId !== "undefined" ? String(currentUserId).trim().toLowerCase() : "farhan");

    try {
        localStorage.setItem("app_users", JSON.stringify(users));
        localStorage.setItem(uid + "_app_users", JSON.stringify(users));
    } catch (_) {}

    if (typeof APP_MEMORY_CACHE !== "undefined") {
        APP_MEMORY_CACHE["app_users"] = users;
        APP_MEMORY_CACHE[uid + "_app_users"] = users;
    }

    if (typeof idbPut === "function") {
        idbPut("app_users", users);
        idbPut(uid + "_app_users", users);
    }

    if (typeof setStore === "function") {
        setStore("app_users", users);
    }
}

// 👑 ADMIN TABLE RENDER (Full IDs List + Top Approval Banner)
function renderAdminUsersTable() {
    var uid = (typeof currentUserId !== "undefined" ? String(currentUserId).trim().toLowerCase() : "farhan");
    var users = [];

    // Sabhi sources se dhoondo taaki koi bhi user miss na ho
    if (typeof getUsersList === "function") {
        var gList = getUsersList();
        if (Array.isArray(gList) && gList.length > 0) users = gList;
    }

    if (!users.length && typeof getStore === "function") {
        var sList = getStore("app_users");
        if (Array.isArray(sList) && sList.length > 0) users = sList;
    }

    if (!users.length) {
        try {
            users = JSON.parse(localStorage.getItem("app_users")) || 
                    JSON.parse(localStorage.getItem(uid + "_app_users")) || [];
        } catch (_) {
            users = [];
        }
    }

    // Default Master Admin fallback
    if (!users.length) {
        users = [{
            id: "farhan",
            name: "Farhan jawed",
            mobile: "7065572191",
            pass: "97438090641154",
            role: "admin",
            status: "active",
            date: "2026-01-01"
        }];
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

        var stBadge = isA ? "<span class='badge-green' style='background:#10b981; color:#fff; padding:3px 8px; border-radius:12px; font-weight:700;'>👑 Owner</span>" : 
                     (isP ? "<span style='background:#fef3c7; color:#b45309; border:1px solid #fde68a; padding:3px 8px; border-radius:12px; font-weight:700; font-size:11px;'>⏳ Approval Pending</span>" : 
                     (isB ? "<span class='badge-red' style='background:#ef4444; color:#fff; padding:3px 8px; border-radius:12px; font-weight:700;'>⛔ Blocked</span>" : 
                     (isE ? "<span class='badge-red' style='background:#f97316; color:#fff; padding:3px 8px; border-radius:12px; font-weight:700;'>⌛ Expired</span>" : "<span class='badge-green' style='background:#10b981; color:#fff; padding:3px 8px; border-radius:12px; font-weight:700;'>Active</span>")));

        // Action Buttons
        var actionBtns = "";
        if (isP) {
            actionBtns = "<button type='button' class='quick-btn' style='background:#059669; color:white; font-weight:bold; padding:6px 12px; border-radius:6px; cursor:pointer;' onclick='approveUserByAdmin(\"" + u.id + "\")'>✅ Approve</button> " +
                         "<button type='button' class='delete-btn' style='padding:6px 10px;' onclick='deleteUserByAdmin(\"" + u.id + "\")'>🗑️ Reject</button>";
        } else if (!isA) {
            actionBtns = "<button type='button' class='quick-btn " + (isB ? "btn-in" : "btn-out") + "' onclick='toggleUserBlockStatus(\"" + u.id + "\")'>" + (isB ? "Unblock" : "Block") + "</button> " +
                         "<button type='button' class='edit-btn' onclick='resetUserPasswordByAdmin(\"" + u.id + "\")'>🔑 Pass</button> " +
                         "<button type='button' class='delete-btn' onclick='deleteUserByAdmin(\"" + u.id + "\")'>🗑️</button>";
        } else {
            actionBtns = "<span style='color:#059669; font-weight:bold; font-size:12px;'>👑 Full Control</span>";
        }

        var expiryDisplay = isA ? "<strong style='color:#059669;'>Lifetime</strong>" : 
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

    tbody.innerHTML = tableRowsHtml;

    // 🔔 TOP PENDING CARD: Approval Request Banner
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

    // Counters Update
    var elTot = document.getElementById("admin-total-users");
    var elAct = document.getElementById("admin-active-users");
    var elBlk = document.getElementById("admin-blocked-users");
    if (elTot) elTot.textContent = tot;
    if (elAct) elAct.textContent = act;
    if (elBlk) elBlk.textContent = blk;
}

// ✅ ADMIN APPROVE ENGINE (Instant 30 Days Validity)
function approveUserByAdmin(uid) {
    var users = getAdminUsersListCurrent();
    var u = users.find(function(x) { return String(x.id) === String(uid); });
    if (!u) return alert("User record nahi mila!");

    var exp = new Date();
    exp.setDate(exp.getDate() + 30);
    var formattedExp = exp.toISOString().split('T')[0];

    u.status = "active";
    u.expiryDate = formattedExp;

    commitAdminUsersRegistry(users);
    
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
    var users = getAdminUsersListCurrent();
    var u = users.find(function(x) { return String(x.id) === String(uid); });
    if (!u) return;

    u.expiryDate = dateVal;
    commitAdminUsersRegistry(users);

    if (typeof db !== "undefined" && db) {
        try { db.ref("app_users/" + uid + "/expiryDate").set(dateVal); } catch (e) {}
    }
    renderAdminUsersTable();
}

function extendValidity(uid, days) {
    var users = getAdminUsersListCurrent();
    var u = users.find(function(x) { return String(x.id) === String(uid); });
    if (!u) return;

    var base = (u.expiryDate && new Date(u.expiryDate) > new Date()) ? new Date(u.expiryDate) : new Date();
    base.setDate(base.getDate() + days);
    var formatted = base.toISOString().split('T')[0];

    u.expiryDate = formatted;
    if (u.status === "blocked" || u.status === "pending") u.status = "active";

    commitAdminUsersRegistry(users);

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
    var users = getAdminUsersListCurrent();
    var u = users.find(function(x) { return String(x.id) === String(uid); });
    if (!u) return;

    var newPass = prompt("User " + u.name + " ka naya password daalein:", Math.floor(100000 + Math.random() * 900000).toString());
    if (!newPass || !newPass.trim()) return;

    u.pass = newPass.trim();
    commitAdminUsersRegistry(users);

    if (typeof db !== "undefined" && db) {
        try { db.ref("app_users/" + uid + "/pass").set(u.pass); } catch (e) {}
    }
    renderAdminUsersTable();
    alert("✅ Password updated: " + u.pass);
}

function toggleUserBlockStatus(uid) {
    if (String(uid).toLowerCase() === "farhan") return alert("⛔ Master Admin ko block nahi kiya ja sakta!");

    var users = getAdminUsersListCurrent();
    var u = users.find(function(x) { return String(x.id) === String(uid); });
    if (!u) return;

    u.status = (u.status === "blocked" ? "active" : "blocked");
    commitAdminUsersRegistry(users);

    if (typeof db !== "undefined" && db) {
        try { db.ref("app_users/" + uid + "/status").set(u.status); } catch (e) {}
    }
    renderAdminUsersTable();
}

function deleteUserByAdmin(uid) {
    if (String(uid).toLowerCase() === "farhan") return alert("⛔ Master Admin ko delete nahi kiya ja sakta!");
    if (!confirm("Kya aap sach me is User aur iska SARRA DATA delete/reject karna chahte hain?")) return;
    
    if (typeof purgeUserDataPermanently === "function") {
        purgeUserDataPermanently(uid);
    }

    var users = getAdminUsersListCurrent().filter(function(x) { return String(x.id) !== String(uid); });
    commitAdminUsersRegistry(users);
    
    if (typeof db !== "undefined" && db) {
        try {
            db.ref("app_users/" + uid).remove();
        } catch (e) {
            console.error(e);
        }
    }
    
    renderAdminUsersTable();
    alert("🗑️ User delete ho gaya!");
}

function getAdminUsersListCurrent() {
    var uid = (typeof currentUserId !== "undefined" ? String(currentUserId).trim().toLowerCase() : "farhan");
    if (typeof getUsersList === "function") {
        var l = getUsersList();
        if (Array.isArray(l) && l.length > 0) return l;
    }
    try {
        return JSON.parse(localStorage.getItem("app_users")) || 
               JSON.parse(localStorage.getItem(uid + "_app_users")) || [];
    } catch (_) {
        return [];
    }
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
                commitAdminUsersRegistry(arr);
                renderAdminUsersTable();
                alert("✅ Admin Users List Refresh ho gayi!");
            }
        });
    } else {
        renderAdminUsersTable();
    }
}
