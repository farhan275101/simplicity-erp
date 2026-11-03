/* ========================================================
   SIMPLICITY ERP - LIVE ADMIN CONTROL & REALTIME USER APPROVAL
   File: admin/admin.js • Developed by Farhan Jawed
   (Auto-Inject Approval Banner + Case-Insensitive Pending Detection)
======================================================== */

window.adminUsersData = [];
var fbUsersListenerAttached = false;

// 👑 1. ADMIN PANEL OPEN (Direct Realtime Connection)
function openAdminModule() {
    var uid = (typeof currentUserId !== "undefined" ? String(currentUserId).trim().toLowerCase() : "");
    var role = (typeof currentUserRole !== "undefined" ? String(currentUserRole).trim().toLowerCase() : "");

    // Farhan Master Admin hamesha allowed hai
    if (role !== "admin" && uid !== "farhan") {
        return alert("⛔ Sirf Master Admin (Farhan) is panel ko access kar sakte hain!");
    }

    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("admin-section", "block");

    // Pehle jo local hai wo dikhao
    renderAdminUsersTable();

    // Firebase Cloud se LIVE sync karo
    fetchAndListenAdminUsers();
}

// 🌐 2. FIREBASE REALTIME LISTENER (Live Streaming)
function fetchAndListenAdminUsers() {
    if (typeof db === "undefined" || !db) return;

    db.ref("app_users").on("value", function(snap) {
        var v = snap.val();
        var arr = [];

        if (v && typeof v === "object") {
            for (var key in v) {
                if (v[key] && typeof v[key] === "object") {
                    var userObj = v[key];
                    userObj.id = userObj.id || key;
                    userObj.name = userObj.name || key;
                    arr.push(userObj);
                }
            }
        }

        // Farhan ko hamesha barkarar rakho
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

        window.adminUsersData = arr;

        try {
            localStorage.setItem("app_users", JSON.stringify(arr));
            localStorage.setItem("farhan_app_users", JSON.stringify(arr));
            if (typeof APP_MEMORY_CACHE !== "undefined") {
                APP_MEMORY_CACHE["app_users"] = arr;
                APP_MEMORY_CACHE["farhan_app_users"] = arr;
            }
            if (typeof setStore === "function") setStore("app_users", arr);
        } catch (_) {}

        renderAdminUsersTable();
    }, function(error) {
        console.error("Firebase fetch error:", error);
    });
}

// 📊 3. TABLE & APPROVAL BANNER RENDERER (Auto-Inject Banner)
function renderAdminUsersTable() {
    var users = window.adminUsersData;
    
    if (!users || !users.length) {
        try {
            users = JSON.parse(localStorage.getItem("app_users")) || 
                    JSON.parse(localStorage.getItem("farhan_app_users")) || [];
        } catch (_) {
            users = [];
        }
    }

    if (!users.length && typeof getUsersList === "function") {
        var gList = getUsersList();
        if (Array.isArray(gList) && gList.length > 0) users = gList;
    }

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
    var rowsHtml = "";

    users.forEach(function(u, idx) {
        if (!u) return;
        tot++;

        var uIdStr = String(u.id || "").trim();
        var isOwner = (uIdStr.toLowerCase() === "farhan" || u.role === "admin");
        
        // ⭐ Case-Insensitive Pending Detection
        var st = String(u.status || "").toLowerCase().trim();
        var isPending = !isOwner && (st === "pending" || st === "pending_approval" || st === "waiting");
        var isBlocked = (st === "blocked");
        var isExpired = false;

        if (u.expiryDate) {
            var today = new Date().toISOString().split("T")[0];
            if (u.expiryDate < today) isExpired = true;
        }

        if (isPending) {
            pnd++;
            pendingUsersList.push(u);
        } else if (isBlocked || isExpired) {
            blk++;
        } else {
            act++;
        }

        // Badges
        var stBadge = "";
        if (isOwner) {
            stBadge = "<span class='badge-green' style='background:#10b981; color:#fff; padding:3px 8px; border-radius:12px; font-weight:700;'>👑 Owner</span>";
        } else if (isPending) {
            stBadge = "<span style='background:#fef3c7; color:#b45309; border:1px solid #fde68a; padding:3px 8px; border-radius:12px; font-weight:700; font-size:11px;'>⏳ Approval Pending</span>";
        } else if (isBlocked) {
            stBadge = "<span class='badge-red' style='background:#ef4444; color:#fff; padding:3px 8px; border-radius:12px; font-weight:700;'>⛔ Blocked</span>";
        } else if (isExpired) {
            stBadge = "<span class='badge-red' style='background:#f97316; color:#fff; padding:3px 8px; border-radius:12px; font-weight:700;'>⌛ Expired</span>";
        } else {
            stBadge = "<span class='badge-green' style='background:#10b981; color:#fff; padding:3px 8px; border-radius:12px; font-weight:700;'>Active</span>";
        }

        // Action Buttons
        var actionBtns = "";
        var safeId = uIdStr.replace(/'/g, "\\'");

        if (isPending) {
            actionBtns = "<button type='button' class='quick-btn' style='background:#059669; color:white; font-weight:bold; padding:6px 12px; border-radius:6px; cursor:pointer;' onclick='approveUserByAdmin(\"" + safeId + "\")'>✅ Approve</button> " +
                         "<button type='button' class='delete-btn' style='padding:6px 10px;' onclick='deleteUserByAdmin(\"" + safeId + "\")'>🗑️ Reject</button>";
        } else if (!isOwner) {
            actionBtns = "<button type='button' class='quick-btn " + (isBlocked ? "btn-in" : "btn-out") + "' onclick='toggleUserBlockStatus(\"" + safeId + "\")'>" + (isBlocked ? "Unblock" : "Block") + "</button> " +
                         "<button type='button' class='edit-btn' onclick='resetUserPasswordByAdmin(\"" + safeId + "\")'>🔑 Pass</button> " +
                         "<button type='button' class='delete-btn' onclick='deleteUserByAdmin(\"" + safeId + "\")'>🗑️</button>";
        } else {
            actionBtns = "<span style='color:#059669; font-weight:bold; font-size:12px;'>👑 Full Control</span>";
        }

        var expiryDisplay = "";
        if (isOwner) {
            expiryDisplay = "<strong style='color:#059669;'>Lifetime</strong>";
        } else if (isPending) {
            expiryDisplay = "<span style='color:#b45309; font-weight:bold;'>Approval Ka Intezar</span>";
        } else {
            expiryDisplay = "<input type='date' value='" + (u.expiryDate || "") + "' onchange='updateUserExpiryDate(\"" + safeId + "\", this.value)' style='padding:2px 4px;font-size:11px;border-radius:4px;border:1px solid #cbd5e1;'> " + 
                            (typeof formatDateDisplay === "function" ? formatDateDisplay(u.expiryDate) : (u.expiryDate || "-")) + 
                            " <button type='button' onclick='extendValidity(\"" + safeId + "\", 30)' style='padding:2px 6px;font-size:10px;border-radius:4px;border:none;background:#2563eb;color:white;cursor:pointer;'>+30D</button>";
        }

        rowsHtml += "<tr>" +
            "<td>" + (idx + 1) + "</td>" +
            "<td><strong>" + (u.name || "-") + "</strong></td>" +
            "<td>" + (u.mobile || "-") + "</td>" +
            "<td><code>" + uIdStr + "</code></td>" +
            "<td><strong style='color:#1e3a8a;'>" + (u.pass || "-") + "</strong></td>" +
            "<td>" + (typeof formatDateDisplay === "function" ? formatDateDisplay(u.date) : (u.date || "-")) + "</td>" +
            "<td>" + expiryDisplay + "</td>" +
            "<td>" + stBadge + "</td>" +
            "<td style='text-align:center; white-space:nowrap;'>" + actionBtns + "</td>" +
        "</tr>";
    });

    tbody.innerHTML = rowsHtml;

    // 🔔 TOP PENDING CARD (Auto-Creates itself right above the table if missing)
    var adminSec = document.getElementById("admin-section");
    var pendingBanner = document.getElementById("admin-pending-approval-banner");
    
    if (!pendingBanner && adminSec) {
        pendingBanner = document.createElement("div");
        pendingBanner.id = "admin-pending-approval-banner";
        var tableWrap = adminSec.querySelector(".table-responsive");
        if (tableWrap) adminSec.insertBefore(pendingBanner, tableWrap);
        else adminSec.appendChild(pendingBanner);
    }

    if (pendingBanner) {
        if (pendingUsersList.length > 0) {
            var pHtml = "<div style='background:#fffbeb; border:2px solid #f59e0b; border-radius:12px; padding:14px; margin-bottom:16px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);'>" +
                "<div style='color:#b45309; font-size:15px; font-weight:800; margin-bottom:10px;'>🔔 Naye Account Approval Requests (" + pendingUsersList.length + "):</div>" +
                "<div style='display:flex; flex-direction:column; gap:8px;'>";

            pendingUsersList.forEach(function(pu) {
                var pId = String(pu.id).replace(/'/g, "\\'");
                pHtml += "<div style='background:white; border:1px solid #fde68a; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;'>" +
                    "<div>" +
                        "<strong style='color:#1e3a8a; font-size:14px;'>👤 " + (pu.name || "-") + "</strong> &bull; <code>ID: " + pu.id + "</code> &bull; 📞 " + (pu.mobile || "-") +
                        "<div style='font-size:11px; color:#64748b;'>Request Date: " + (typeof formatDateDisplay === "function" ? formatDateDisplay(pu.date) : (pu.date || "-")) + "</div>" +
                    "</div>" +
                    "<div style='display:flex; gap:8px;'>" +
                        "<button type='button' class='quick-btn' style='background:#059669; color:white; font-weight:bold; padding:8px 16px; border-radius:6px; cursor:pointer;' onclick='approveUserByAdmin(\"" + pId + "\")'>✅ Approve Karein</button>" +
                        "<button type='button' class='delete-btn' style='padding:8px 12px;' onclick='deleteUserByAdmin(\"" + pId + "\")'>🗑️ Reject</button>" +
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
}

// ✅ ACTIONS
function approveUserByAdmin(uid) {
    var exp = new Date();
    exp.setDate(exp.getDate() + 30);
    var formattedExp = exp.toISOString().split("T")[0];

    if (typeof db !== "undefined" && db) {
        db.ref("app_users/" + uid).update({
            status: "active",
            expiryDate: formattedExp
        }).then(function() {
            alert("🎉 User '" + uid + "' approve ho gaya!\nAb wo turant login kar sakta hai.");
        });
    }
}

function updateUserExpiryDate(uid, dateVal) {
    if (typeof db !== "undefined" && db) {
        db.ref("app_users/" + uid + "/expiryDate").set(dateVal);
    }
}

function extendValidity(uid, days) {
    var u = (window.adminUsersData || []).find(function(x) { return String(x.id) === String(uid); });
    var base = (u && u.expiryDate && new Date(u.expiryDate) > new Date()) ? new Date(u.expiryDate) : new Date();
    base.setDate(base.getDate() + days);
    var formatted = base.toISOString().split("T")[0];

    if (typeof db !== "undefined" && db) {
        db.ref("app_users/" + uid).update({
            expiryDate: formatted,
            status: "active"
        }).then(function() {
            alert("✅ Validity 30 din badh gayi!");
        });
    }
}

function resetUserPasswordByAdmin(uid) {
    var newPass = prompt("Naya password daalein:", Math.floor(100000 + Math.random() * 900000).toString());
    if (!newPass || !newPass.trim()) return;

    if (typeof db !== "undefined" && db) {
        db.ref("app_users/" + uid + "/pass").set(newPass.trim()).then(function() {
            alert("✅ Password update ho gaya!");
        });
    }
}

function toggleUserBlockStatus(uid) {
    if (String(uid).toLowerCase() === "farhan") return alert("⛔ Master Admin block nahi ho sakta!");
    var u = (window.adminUsersData || []).find(function(x) { return String(x.id) === String(uid); });
    var nextStatus = (u && u.status === "blocked") ? "active" : "blocked";

    if (typeof db !== "undefined" && db) {
        db.ref("app_users/" + uid + "/status").set(nextStatus);
    }
}

function deleteUserByAdmin(uid) {
    if (String(uid).toLowerCase() === "farhan") return alert("⛔ Master Admin delete nahi ho sakta!");
    if (!confirm("Kya aap sach me is User ko delete karna chahte hain?")) return;

    if (typeof db !== "undefined" && db) {
        db.ref("app_users/" + uid).remove().then(function() {
            alert("🗑️ User delete ho gaya!");
        });
    }
}

function refreshAdminUsersList() {
    fetchAndListenAdminUsers();
}

window.openAdminModule = openAdminModule;
window.renderAdminUsersTable = renderAdminUsersTable;
window.approveUserByAdmin = approveUserByAdmin;
window.updateUserExpiryDate = updateUserExpiryDate;
window.extendValidity = extendValidity;
window.resetUserPasswordByAdmin = resetUserPasswordByAdmin;
window.toggleUserBlockStatus = toggleUserBlockStatus;
window.deleteUserByAdmin = deleteUserByAdmin;
window.refreshAdminUsersList = refreshAdminUsersList;
