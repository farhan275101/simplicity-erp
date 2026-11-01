/* ========================================================
   SIMPLICITY ERP - USER PROFILE & SECURITY SETTINGS
   File: auth/profile.js • Developed by Farhan Jawed
======================================================== */

function openProfileModal() {
    if (!currentUserId) return alert("Pehle login karein!");
    var u = getUsersList().find(function(x) { return x.id === currentUserId; });
    if (!u) return;

    var nameEl = document.getElementById("prof-name");
    var idEl = document.getElementById("prof-id");
    var mobEl = document.getElementById("prof-mobile");
    var pinEl = document.getElementById("prof-pin");
    var passEl = document.getElementById("prof-pass");

    if (nameEl) nameEl.value = u.name || "";
    if (idEl) idEl.value = u.id || "";
    if (mobEl) mobEl.value = u.mobile || "";
    if (pinEl) pinEl.value = u.pin || "1234";
    if (passEl) passEl.value = u.pass || "";

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
        APP_MEMORY_CACHE["app_users"] = users;
        if (typeof idbPut === "function") idbPut("app_users", users);

        if (db) {
            try { db.ref("app_users/" + currentUserId).set(users[idx]); } catch (e) {}
        }

        var wText = document.getElementById("welcome-text");
        if (wText) wText.textContent = "Swagat hai, " + n + "!";

        closeProfileModal();
        alert("✅ Settings successfully save ho gayi!");
    }
}
