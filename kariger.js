/* ========================================================
   SIMPLICITY ERP - KARIGER MASTER, MULTI-KARKHANA & SEQUENTIAL CLOSING
   File 2 of 5 • Developed by Farhan Jawed
   (10-10 Sequential Engine, Session Delete with ID/Password & Welcome Celebration)
======================================================== */

var activeKarigerId = null;
var activeSheetIndex = 0;
var currentKarigerKarkhanaFilter = "all"; // "all" ya specific karkhanaId

// 🎯 ULTRA-FAST PAGINATION ENGINE (50 Karigers Per Page)
var currentKarigerPage = 1;
var karigerPageSize = 50;

// ================= 1. 📅 FINANCIAL YEAR SESSION SYSTEM =================

function getAppSessions() {
    var userKey = (currentUserId || "app") + "_app_sessions_list";
    var raw = localStorage.getItem(userKey);
    var list = [];
    try {
        list = JSON.parse(raw) || [];
    } catch (e) {}

    if (!Array.isArray(list) || !list.length) {
        list = ["2026-2027"];
        localStorage.setItem(userKey, JSON.stringify(list));
    }
    return list.map(function(s) { return String(s).replace(/['"]+/g, '').trim(); });
}

function getActiveFinancialSession() {
    var userKey = (currentUserId || "app") + "_app_active_session";
    var sess = localStorage.getItem(userKey);
    if (!sess || typeof sess !== "string" || sess === "[]") {
        var list = getAppSessions();
        sess = list[list.length - 1] || "2026-2027";
        localStorage.setItem(userKey, sess);
    }
    sess = String(sess).replace(/['"]+/g, '').trim();
    return sess || "2026-2027";
}

function populateSessionDropdown() {
    var sel = document.getElementById("app-session-select");
    if (!sel) return;
    sel.innerHTML = "";

    var sessions = getAppSessions();
    var activeSess = getActiveFinancialSession();

    sessions.forEach(function(s) {
        var opt = document.createElement("option");
        opt.value = s;
        opt.textContent = "📅 " + s;
        if (String(s) === String(activeSess)) {
            opt.selected = true;
        }
        sel.appendChild(opt);
    });
}

function switchAppFinancialSession(targetSession) {
    var activeSess = getActiveFinancialSession();
    if (!targetSession || targetSession === activeSess) return;

    if (!confirm("Kya aap Session badal kar '" + targetSession + "' me jana chahte hain?\nIs session ka pura hisab khul jayega.")) {
        populateSessionDropdown();
        return;
    }

    var cleanTarget = String(targetSession).replace(/['"]+/g, '').trim();
    var userKey = (currentUserId || "app") + "_app_active_session";
    localStorage.setItem(userKey, cleanTarget);

    // 🔴 CRITICAL FIX: Memory Cache completely flush karein taaki purana session ka data na rahe
    if (typeof clearMemoryCache === "function") {
        clearMemoryCache();
    } else if (typeof APP_MEMORY_CACHE === "object") {
        APP_MEMORY_CACHE = {};
    }

    setStore("app_active_session", cleanTarget);

    // IndexedDB se naye session ka data preload karein
    if (typeof initIndexedDBPreload === "function") {
        initIndexedDBPreload(function() {
            populateSessionDropdown();
            if (typeof backToDashboard === "function") backToDashboard();
            if (typeof renderKarigerKarkhanaTabs === "function") renderKarigerKarkhanaTabs();
            if (typeof renderKarigerTable === "function") renderKarigerTable();
            if (typeof renderStockKarkhanaTabs === "function") renderStockKarkhanaTabs();
            if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
            if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();

            alert("📅 Session badal gaya: Ab aap '" + cleanTarget + "' me hain! Sabhi hisab is saal ke dikhenge.");
        });
    } else {
        populateSessionDropdown();
        if (typeof backToDashboard === "function") backToDashboard();
        if (typeof renderKarigerKarkhanaTabs === "function") renderKarigerKarkhanaTabs();
        if (typeof renderKarigerTable === "function") renderKarigerTable();
        if (typeof renderStockKarkhanaTabs === "function") renderStockKarkhanaTabs();
        if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
        if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();

        alert("📅 Session badal gaya: Ab aap '" + cleanTarget + "' me hain! Sabhi hisab is saal ke dikhenge.");
    }
}

function openSessionClosingModal() {
    populateSessionDropdown();
    var cur = getActiveFinancialSession();
    var curInp = document.getElementById("session-current-display");
    if (curInp) curInp.value = cur;

    var parts = String(cur).split("-");
    var nextYear = "";
    if (parts.length === 2 && !isNaN(parseInt(parts[0], 10)) && !isNaN(parseInt(parts[1], 10))) {
        nextYear = (parseInt(parts[0], 10) + 1) + "-" + (parseInt(parts[1], 10) + 1);
    } else {
        nextYear = "2027-2028";
    }

    var newInp = document.getElementById("session-new-input");
    if (newInp) newInp.value = nextYear;

    populateDeleteSessionDropdown();

    var uInp = document.getElementById("session-del-user-id");
    var pInp = document.getElementById("session-del-password");
    if (uInp) uInp.value = "";
    if (pInp) pInp.value = "";

    setDisplay("session-closing-modal", "flex");
}

function closeSessionClosingModal() {
    setDisplay("session-closing-modal", "none");
}

function populateDeleteSessionDropdown() {
    var delSel = document.getElementById("session-delete-select");
    if (!delSel) return;
    delSel.innerHTML = "";

    var sessions = getAppSessions();
    if (sessions.length <= 1) {
        delSel.innerHTML = "<option value=''>Sirf 1 hi session hai (Delete nahi ho sakta)</option>";
        return;
    }

    sessions.forEach(function(s) {
        var opt = document.createElement("option");
        opt.value = s;
        opt.textContent = "🗑️ " + s;
        delSel.appendChild(opt);
    });
}

// 🔒 STRICT ID & PASSWORD PROTECTED SESSION DELETE FUNCTION
function confirmAndDeleteSessionWithAuth() {
    var delSel = document.getElementById("session-delete-select");
    var targetSess = delSel ? delSel.value : "";

    if (!targetSess) return alert("Pehle delete karne ke liye session chunein!");

    var sessions = getAppSessions();
    if (sessions.length <= 1) {
        return alert("⚠️ Kam se kam 1 Financial Session hona zaroori hai! Aakhiri session delete nahi kiya ja sakta.");
    }

    var uIdInp = (document.getElementById("session-del-user-id").value || "").trim().toLowerCase();
    var passInp = (document.getElementById("session-del-password").value || "").trim();

    if (!uIdInp || !passInp) {
        return alert("⚠️ Suraksha ke liye apna User ID aur Password dono bharein!");
    }

    var users = (typeof getUsersList === "function") ? getUsersList() : [];
    var currentUser = users.find(function(u) {
        return u && String(u.id).toLowerCase() === String(currentUserId).toLowerCase();
    });

    if (!currentUser) {
        return alert("User verify nahi ho paya! Kripya dobara login karein.");
    }

    var matchId = (String(currentUser.id).toLowerCase() === uIdInp) || (String(currentUser.mobile).trim() === uIdInp);
    var matchPass = (String(currentUser.pass) === passInp);

    if (!matchId || !matchPass) {
        return alert("⛔ GALAT USER ID YA PASSWORD!\nSuraksha ki wajah se Session delete karne ki permission nahi di gayi.");
    }

    if (!confirm("⚠️ FINAL WARNING:\nKya aap sach me Session '" + targetSess + "' ko hamesha ke liye delete karna chahte hain?\nIska sara fasa hua ya aadha-adhura data mit jayega!")) {
        return;
    }

    var updatedSessions = sessions.filter(function(s) { return s !== targetSess; });
    var fallbackSess = updatedSessions[updatedSessions.length - 1] || "2026-2027";

    localStorage.setItem((currentUserId || "app") + "_app_sessions_list", JSON.stringify(updatedSessions));
    setStore("app_sessions_list", updatedSessions);

    var prefix = currentUserId + "_" + targetSess + "_";
    try {
        var toDeleteLocal = [];
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.indexOf(prefix) === 0) toDeleteLocal.push(k);
        }
        toDeleteLocal.forEach(function(k) { localStorage.removeItem(k); });

        if (typeof clearMemoryCache === "function") {
            clearMemoryCache();
        } else if (typeof APP_MEMORY_CACHE === "object") {
            APP_MEMORY_CACHE = {};
        }

        if (db && currentUserId) {
            db.ref("users/" + currentUserId).once("value", function(snap) {
                var val = snap.val();
                if (val) {
                    var fbUpdates = {};
                    var targetPrefix = targetSess + "_";
                    for (var fbKey in val) {
                        if (fbKey.indexOf(targetPrefix) === 0) {
                            fbUpdates[fbKey] = null;
                        }
                    }
                    if (Object.keys(fbUpdates).length > 0) {
                        db.ref("users/" + currentUserId).update(fbUpdates);
                    }
                }
            });
        }
    } catch(err) {}

    localStorage.setItem((currentUserId || "app") + "_app_active_session", fallbackSess);
    setStore("app_active_session", fallbackSess);

    closeSessionClosingModal();
    populateSessionDropdown();

    if (typeof backToDashboard === "function") backToDashboard();
    if (typeof renderKarigerKarkhanaTabs === "function") renderKarigerKarkhanaTabs();
    if (typeof renderKarigerTable === "function") renderKarigerTable();
    if (typeof renderStockKarkhanaTabs === "function") renderStockKarkhanaTabs();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();

    alert("✅ SUCCESS: Fasa hua Session '" + targetSess + "' safalta-purvak delete ho gaya!\nAb aap surakshit hokar '" + fallbackSess + "' me hain.");
}

// ================= 🎬 5-STEP SEQUENTIAL CHUNKED ENGINE =================

var pendingTransferNewSession = null;
var stage1_oldKarigers = [];
var stage1_newKarigerSheetsMap = {};
var stage1_idx = 0;
var stage1_chunkSize = 10;

var stage2_newSareeStock = [];
var stage2_newFinStock = [];
var stage2_newLottStock = [];

var stage3_newBanaStock = [];
var stage3_newZariStock = [];

var stage4_newSanchaItems = [];
var stage4_oldJwWorkers = [];
var stage4_newJwSheetsMap = {};
var stage4_pendingBills = [];

var stage5_keys = [];
var stage5_idx = 0;
var stage5_chunkSize = 10;

function startSequentialYearClosing() {
    var curSess = getActiveFinancialSession();
    var newSessEl = document.getElementById("session-new-input");
    var newSess = (newSessEl ? newSessEl.value : "").trim();

    if (!newSess) return alert("Naye Saal (Session) ka naam daalein! Jaise: 2027-2028");
    if (newSess === curSess) return alert("Naya session purane se alag hona chahiye!");

    var sessions = getAppSessions();
    if (sessions.indexOf(newSess) !== -1) {
        return alert("Ye Session '" + newSess + "' pehle se bana hua hai! Agar ye kharab hai to niche 'Delete Zone' se ise delete karein.");
    }

    closeSessionClosingModal();
    pendingTransferNewSession = newSess;

    setDisplay("session-transfer-modal", "flex");
    setDisplay("transfer-progress-view", "block");
    setDisplay("transfer-welcome-view", "none");

    for (var i = 1; i <= 5; i++) {
        var bar = document.getElementById("stage-bar-" + i);
        var badge = document.getElementById("stage-badge-" + i);
        var status = document.getElementById("stage-status-" + i);
        if (bar) bar.style.width = "0%";
        if (badge) {
            badge.textContent = "⏸️ Waiting";
            badge.style.background = "#e2e8f0";
            badge.style.color = "#64748b";
        }
        if (status) status.textContent = "Wait kar raha hai...";
    }
    var mainBar = document.getElementById("transfer-main-bar");
    if (mainBar) mainBar.style.width = "0%";

    setTimeout(function() {
        runStage1_Karigers(curSess, newSess);
    }, 150);
}

// --- STAGE 1: 🧵 KARIGER KHATA (10-10 CHUNKS) ---
function runStage1_Karigers(curSess, newSess) {
    stage1_oldKarigers = safeArray(getStore("kariger_list"));
    stage1_newKarigerSheetsMap = {};
    stage1_idx = 0;

    var badge = document.getElementById("stage-badge-1");
    if (badge) {
        badge.textContent = "⏳ Downloading...";
        badge.style.background = "#eff6ff";
        badge.style.color = "#2563eb";
    }

    processNextKarigerChunk(curSess, newSess);
}

function processNextKarigerChunk(curSess, newSess) {
    var total = stage1_oldKarigers.length;
    var end = Math.min(stage1_idx + stage1_chunkSize, total);

    for (var i = stage1_idx; i < end; i++) {
        var k = stage1_oldKarigers[i];
        if (!k || !k.id) continue;
        var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
        var lastSheet = sheets.length ? sheets[sheets.length - 1] : null;
        var calc = (lastSheet && typeof calculateSheetTotals === "function")
            ? calculateSheetTotals(lastSheet)
            : { remainingBana: 0, remainingZari: 0, remainingAmt: 0 };

        stage1_newKarigerSheetsMap[k.id] = [{
            id: "tani_1",
            title: "Tani 1 (Opening " + newSess + ")",
            pichlaBana: Number((calc.remainingBana || 0).toFixed(2)),
            pichlaZari: Number((calc.remainingZari || 0).toFixed(2)),
            pichlaBani: Number((calc.remainingAmt || 0).toFixed(2)),
            banaWaste: 0,
            zariWaste: 0,
            rateBana: lastSheet ? (Number(lastSheet.rateBana) || 0.311) : 0.311,
            rateZari: lastSheet ? (Number(lastSheet.rateZari) || 0.110) : 0.110,
            rateBani: lastSheet ? (Number(lastSheet.rateBani) || 240) : 240,
            note: "📦 31st March (" + curSess + ") Closing se Aaya Opening Balance",
            rows: []
        }];
    }

    stage1_idx = end;

    var pct = total > 0 ? Math.floor((stage1_idx / total) * 100) : 100;
    var bar1 = document.getElementById("stage-bar-1");
    var status1 = document.getElementById("stage-status-1");
    var mainBar = document.getElementById("transfer-main-bar");

    if (bar1) bar1.style.width = pct + "%";
    if (status1) status1.textContent = "⏳ Downloading: " + stage1_idx + " / " + total + " Kariger (" + pct + "%)";
    if (mainBar) mainBar.style.width = Math.floor(pct * 0.4) + "%";

    if (stage1_idx < total) {
        setTimeout(function() {
            processNextKarigerChunk(curSess, newSess);
        }, 15);
    } else {
        var badge1 = document.getElementById("stage-badge-1");
        if (badge1) {
            badge1.textContent = "✅ Done (" + total + ")";
            badge1.style.background = "#ecfdf5";
            badge1.style.color = "#059669";
        }
        if (status1) status1.textContent = "✅ Sabhi " + total + " Karigaron Ka Hisab Naye Saal Me Transfer Ho Gaya!";
        
        setTimeout(function() {
            runStage2_SareeStock(curSess, newSess);
        }, 200);
    }
}

// --- STAGE 2: 🥻 SAREE STOCK TRANSFER (CALENDER & CUTTING SEPARATE FIX) ---
function runStage2_SareeStock(curSess, newSess) {
    var badge2 = document.getElementById("stage-badge-2");
    var bar2 = document.getElementById("stage-bar-2");
    var status2 = document.getElementById("stage-status-2");
    var mainBar = document.getElementById("transfer-main-bar");

    if (badge2) {
        badge2.textContent = "⏳ Processing...";
        badge2.style.background = "#eff6ff";
        badge2.style.color = "#2563eb";
    }
    if (bar2) bar2.style.width = "40%";
    if (status2) status2.textContent = "🥻 Main Godam & Branch Godam Saree Pack Ho Rahi Hai...";

    var karkhanas = getKarkhanas();
    var allSarees = safeArray(getStore("saree_stock"));
    stage2_newSareeStock = [];

    karkhanas.forEach(function(k) {
        var kPcs = 0;
        allSarees.forEach(function(s) {
            var matchK = (String(s.karkhanaId) === String(k.id)) || (!s.karkhanaId && k.isDefault);
            if (matchK) kPcs += (Number(s.pcs) || 0);
        });
        if (kPcs > 0) {
            stage2_newSareeStock.push({
                id: "saree_open_" + k.id + "_" + Date.now(),
                date: getTodayDate(),
                name: "Fresh Saree Opening Stock",
                kariger: "📦 Opening Stock (" + curSess + " Se Aaya)",
                karkhanaId: k.id,
                karkhanaName: k.name,
                pcs: kPcs,
                openingPcs: kPcs,
                outPcs: 0,
                isOpening: true
            });
        }
    });

    // 🔴 FIX: Calender aur Cutting finished stock ko alag-alag preserve karein
    var allFinStock = safeArray(getStore("finished_saree_stock"));
    stage2_newFinStock = [];
    var calenderFinPcs = 0;
    var cuttingFinPcs = 0;

    allFinStock.forEach(function(f) {
        if (!f) return;
        var pcs = Number(f.pcs) || 0;
        if (pcs <= 0) return;
        var pType = String(f.processType || "").toLowerCase();
        var nLow = String(f.name || "").toLowerCase();
        if (pType === "cutting" || nLow.indexOf("cutting") !== -1) {
            cuttingFinPcs += pcs;
        } else {
            calenderFinPcs += pcs;
        }
    });

    if (calenderFinPcs > 0) {
        stage2_newFinStock.push({
            id: "fin_cal_open_" + Date.now(),
            date: getTodayDate(),
            name: "Calender Finished Saree",
            processType: "calender",
            source: "📦 Opening Stock (" + curSess + " Se Aaya)",
            pcs: calenderFinPcs,
            openingPcs: calenderFinPcs,
            isOpening: true
        });
    }

    if (cuttingFinPcs > 0) {
        stage2_newFinStock.push({
            id: "fin_cut_open_" + Date.now(),
            date: getTodayDate(),
            name: "Cutting Finished Saree",
            processType: "cutting",
            source: "📦 Opening Stock (" + curSess + " Se Aaya)",
            pcs: cuttingFinPcs,
            openingPcs: cuttingFinPcs,
            isOpening: true
        });
    }

    var allLott = safeArray(getStore("lott_saree_stock"));
    stage2_newLottStock = [];
    karkhanas.forEach(function(k) {
        var lPcs = 0;
        allLott.forEach(function(l) {
            var matchL = (String(l.karkhanaId) === String(k.id)) || (!l.karkhanaId && k.isDefault);
            if (matchL) lPcs += (Number(l.pcs) || 0);
        });
        if (lPcs > 0) {
            stage2_newLottStock.push({
                id: "lott_open_" + k.id + "_" + Date.now(),
                date: getTodayDate(),
                name: "Damage Saree Opening Stock",
                source: "📦 Opening Stock (" + curSess + " Se Aaya)",
                karkhanaId: k.id,
                karkhanaName: k.name,
                pcs: lPcs,
                openingPcs: lPcs,
                isOpening: true
            });
        }
    });

    setTimeout(function() {
        if (bar2) bar2.style.width = "100%";
        if (badge2) {
            badge2.textContent = "✅ Done";
            badge2.style.background = "#ecfdf5";
            badge2.style.color = "#059669";
        }
        if (status2) status2.textContent = "✅ Fresh, Finished Aur Lott Saree Opening Stock Lock Ho Gaya!";
        if (mainBar) mainBar.style.width = "55%";

        setTimeout(function() {
            runStage3_BanaZariStock(curSess, newSess);
        }, 200);
    }, 150);
}

// --- STAGE 3: 🧶 BANA & ✨ ZARI STOCK FREEZE ---
function runStage3_BanaZariStock(curSess, newSess) {
    var badge3 = document.getElementById("stage-badge-3");
    var bar3 = document.getElementById("stage-bar-3");
    var status3 = document.getElementById("stage-status-3");
    var mainBar = document.getElementById("transfer-main-bar");

    if (badge3) {
        badge3.textContent 
