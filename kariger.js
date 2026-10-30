/* ========================================================
   SIMPLICITY ERP - KARIGER MASTER & SEQUENTIAL CLOSING
   File 2 of 5 • Developed by Farhan Jawed
======================================================== */

var activeKarigerId = null;
var activeSheetIndex = 0;
var currentKarigerKarkhanaFilter = "all";
var currentKarigerPage = 1;
var karigerPageSize = 50;

// 1. FINANCIAL YEAR SESSION SYSTEM
function getAppSessions() {
    var userKey = (currentUserId || "app") + "_app_sessions_list";
    var raw = localStorage.getItem(userKey);
    var list = [];
    try { list = JSON.parse(raw) || []; } catch (e) {}
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
    return String(sess).replace(/['"]+/g, '').trim() || "2026-2027";
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
        if (String(s) === String(activeSess)) opt.selected = true;
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

    if (typeof clearMemoryCache === "function") clearMemoryCache();
    setStore("app_active_session", cleanTarget);

    if (typeof initIndexedDBPreload === "function") {
        initIndexedDBPreload(function() {
            populateSessionDropdown();
            if (typeof backToDashboard === "function") backToDashboard();
            if (typeof renderKarigerKarkhanaTabs === "function") renderKarigerKarkhanaTabs();
            if (typeof renderKarigerTable === "function") renderKarigerTable();
            if (typeof renderStockKarkhanaTabs === "function") renderStockKarkhanaTabs();
            if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
            if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();
            alert("📅 Session badal gaya: Ab aap '" + cleanTarget + "' me hain!");
        });
    } else {
        populateSessionDropdown();
        if (typeof backToDashboard === "function") backToDashboard();
    }
}

function openSessionClosingModal() {
    populateSessionDropdown();
    var cur = getActiveFinancialSession();
    var curInp = document.getElementById("session-current-display");
    if (curInp) curInp.value = cur;

    var parts = String(cur).split("-");
    var nextYear = (parts.length === 2 && !isNaN(parseInt(parts[0], 10))) 
        ? ((parseInt(parts[0], 10) + 1) + "-" + (parseInt(parts[1], 10) + 1)) 
        : "2027-2028";

    var newInp = document.getElementById("session-new-input");
    if (newInp) newInp.value = nextYear;

    populateDeleteSessionDropdown();
    var uInp = document.getElementById("session-del-user-id");
    var pInp = document.getElementById("session-del-password");
    if (uInp) uInp.value = "";
    if (pInp) pInp.value = "";
    setDisplay("session-closing-modal", "flex");
}

function closeSessionClosingModal() { setDisplay("session-closing-modal", "none"); }

function populateDeleteSessionDropdown() {
    var delSel = document.getElementById("session-delete-select");
    if (!delSel) return;
    delSel.innerHTML = "";
    var sessions = getAppSessions();
    if (sessions.length <= 1) {
        delSel.innerHTML = "<option value=''>Sirf 1 session hai (Delete nahi ho sakta)</option>";
        return;
    }
    sessions.forEach(function(s) {
        var opt = document.createElement("option");
        opt.value = s; opt.textContent = "🗑️ " + s;
        delSel.appendChild(opt);
    });
}

function confirmAndDeleteSessionWithAuth() {
    var delSel = document.getElementById("session-delete-select");
    var targetSess = delSel ? delSel.value : "";
    if (!targetSess) return alert("Pehle delete karne ke liye session chunein!");

    var sessions = getAppSessions();
    if (sessions.length <= 1) return alert("Kam se kam 1 session hona zaroori hai!");

    var uIdInp = (document.getElementById("session-del-user-id").value || "").trim().toLowerCase();
    var passInp = (document.getElementById("session-del-password").value || "").trim();
    if (!uIdInp || !passInp) return alert("User ID aur Password dono bharein!");

    var users = (typeof getUsersList === "function") ? getUsersList() : [];
    var currentUser = users.find(function(u) { return u && String(u.id).toLowerCase() === String(currentUserId).toLowerCase(); });
    if (!currentUser) return alert("User verify nahi hua!");

    var matchId = (String(currentUser.id).toLowerCase() === uIdInp) || (String(currentUser.mobile).trim() === uIdInp);
    if (!matchId || String(currentUser.pass) !== passInp) return alert("⛔ GALAT USER ID YA PASSWORD!");

    if (!confirm("FINAL WARNING: Kya sach me Session '" + targetSess + "' delete karna chahte hain?")) return;

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
        if (typeof clearMemoryCache === "function") clearMemoryCache();

        if (db && currentUserId) {
            db.ref("users/" + currentUserId).once("value", function(snap) {
                var val = snap.val();
                if (val) {
                    var fbUpdates = {};
                    var targetPrefix = targetSess + "_";
                    for (var fbKey in val) {
                        if (fbKey.indexOf(targetPrefix) === 0) fbUpdates[fbKey] = null;
                    }
                    if (Object.keys(fbUpdates).length > 0) db.ref("users/" + currentUserId).update(fbUpdates);
                }
            });
        }
    } catch(err) {}

    localStorage.setItem((currentUserId || "app") + "_app_active_session", fallbackSess);
    setStore("app_active_session", fallbackSess);
    closeSessionClosingModal();
    populateSessionDropdown();

    if (typeof backToDashboard === "function") backToDashboard();
    alert("✅ Session '" + targetSess + "' delete ho gaya!");
}

// 2. 5-STEP SEQUENTIAL YEAR-END CLOSING
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
    if (!newSess) return alert("Naye Session ka naam daalein! Jaise: 2027-2028");
    if (newSess === curSess) return alert("Naya session purane se alag hona chahiye!");

    var sessions = getAppSessions();
    if (sessions.indexOf(newSess) !== -1) return alert("Session '" + newSess + "' pehle se bana hua hai!");

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
        if (badge) { badge.textContent = "⏸️ Waiting"; badge.style.background = "#e2e8f0"; badge.style.color = "#64748b"; }
        if (status) status.textContent = "Wait kar raha hai...";
    }
    var mainBar = document.getElementById("transfer-main-bar");
    if (mainBar) mainBar.style.width = "0%";

    setTimeout(function() { runStage1_Karigers(curSess, newSess); }, 150);
}

function runStage1_Karigers(curSess, newSess) {
    stage1_oldKarigers = safeArray(getStore("kariger_list"));
    stage1_newKarigerSheetsMap = {};
    stage1_idx = 0;
    var badge = document.getElementById("stage-badge-1");
    if (badge) { badge.textContent = "⏳ Downloading..."; badge.style.background = "#eff6ff"; badge.style.color = "#2563eb"; }
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
            banaWaste: 0, zariWaste: 0,
            rateBana: lastSheet ? (Number(lastSheet.rateBana) || 0.311) : 0.311,
            rateZari: lastSheet ? (Number(lastSheet.rateZari) || 0.110) : 0.110,
            rateBani: lastSheet ? (Number(lastSheet.rateBani) || 240) : 240,
            note: "📦 31st March (" + curSess + ") Closing Opening Balance",
            rows: []
        }];
    }
    stage1_idx = end;
    var pct = total > 0 ? Math.floor((stage1_idx / total) * 100) : 100;
    var bar1 = document.getElementById("stage-bar-1");
    var status1 = document.getElementById("stage-status-1");
    var mainBar = document.getElementById("transfer-main-bar");
    if (bar1) bar1.style.width = pct + "%";
    if (status1) status1.textContent = "⏳ " + stage1_idx + " / " + total + " Kariger (" + pct + "%)";
    if (mainBar) mainBar.style.width = Math.floor(pct * 0.4) + "%";

    if (stage1_idx < total) {
        setTimeout(function() { processNextKarigerChunk(curSess, newSess); }, 15);
    } else {
        var badge1 = document.getElementById("stage-badge-1");
        if (badge1) { badge1.textContent = "✅ Done (" + total + ")"; badge1.style.background = "#ecfdf5"; badge1.style.color = "#059669"; }
        if (status1) status1.textContent = "✅ Sabhi Karigaron Ka Hisab Naye Saal Me Transfer!";
        setTimeout(function() { runStage2_SareeStock(curSess, newSess); }, 200);
    }
}

function runStage2_SareeStock(curSess, newSess) {
    var badge2 = document.getElementById("stage-badge-2");
    var bar2 = document.getElementById("stage-bar-2");
    var status2 = document.getElementById("stage-status-2");
    var mainBar = document.getElementById("transfer-main-bar");
    if (badge2) { badge2.textContent = "⏳ Processing..."; badge2.style.background = "#eff6ff"; badge2.style.color = "#2563eb"; }
    if (bar2) bar2.style.width = "40%";
    if (status2) status2.textContent = "🥻 Saree Stock Pack Ho Raha Hai...";

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
                karkhanaId: k.id, karkhanaName: k.name,
                pcs: kPcs, openingPcs: kPcs, outPcs: 0, isOpening: true
            });
        }
    });

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
            pcs: calenderFinPcs, openingPcs: calenderFinPcs, isOpening: true
        });
    }

    if (cuttingFinPcs > 0) {
        stage2_newFinStock.push({
            id: "fin_cut_open_" + Date.now(),
            date: getTodayDate(),
            name: "Cutting Finished Saree",
            processType: "cutting",
            source: "📦 Opening Stock (" + curSess + " Se Aaya)",
            pcs: cuttingFinPcs, openingPcs: cuttingFinPcs, isOpening: true
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
                karkhanaId: k.id, karkhanaName: k.name,
                pcs: lPcs, openingPcs: lPcs, isOpening: true
            });
        }
    });

    setTimeout(function() {
        if (bar2) bar2.style.width = "100%";
        if (badge2) { badge2.textContent = "✅ Done"; badge2.style.background = "#ecfdf5"; badge2.style.color = "#059669"; }
        if (status2) status2.textContent = "✅ Fresh, Finished & Lott Saree Opening Stock Lock!";
        if (mainBar) mainBar.style.width = "55%";
        setTimeout(function() { runStage3_BanaZariStock(curSess, newSess); }, 200);
    }, 150);
}

function runStage3_BanaZariStock(curSess, newSess) {
    var badge3 = document.getElementById("stage-badge-3");
    var bar3 = document.getElementById("stage-bar-3");
    var status3 = document.getElementById("stage-status-3");
    var mainBar = document.getElementById("transfer-main-bar");
    if (badge3) { badge3.textContent = "⏳ Freezing..."; badge3.style.background = "#eff6ff"; badge3.style.color = "#2563eb"; }
    if (bar3) bar3.style.width = "40%";
    if (status3) status3.textContent = "🧶 Bana & ✨ Zari Stock Freeze Ho Raha Hai...";

    var karkhanas = getKarkhanas();
    stage3_newBanaStock = [];
    var banaItems = safeArray(getStore("bana_stock"));
    var uniqueBanaNames = [];
    banaItems.forEach(function(b) {
        if (b && b.name && uniqueBanaNames.indexOf(b.name.trim().toLowerCase()) === -1) {
            uniqueBanaNames.push(b.name.trim().toLowerCase());
        }
    });

    uniqueBanaNames.forEach(function(bNameLow) {
        var origItem = banaItems.find(function(x) { return x && x.name && x.name.trim().toLowerCase() === bNameLow; });
        var displayName = origItem ? origItem.name : bNameLow;
        karkhanas.forEach(function(k) {
            var bachaQty = 0;
            if (typeof getBanaItemStats === "function") {
                try { bachaQty = getBanaItemStats(displayName, k.id).bacha; } catch(e) {}
            }
            if (bachaQty > 0) {
                stage3_newBanaStock.push({
                    id: Date.now() + Math.random(),
                    name: displayName, date: getTodayDate(),
                    aaya: Number(bachaQty.toFixed(2)), openingAaya: Number(bachaQty.toFixed(2)),
                    gaya: 0, bacha: Number(bachaQty.toFixed(2)),
                    karkhanaId: k.id, karkhanaName: k.name,
                    note: "📦 Opening Stock (" + curSess + " Se Aaya)", isOpening: true
                });
            }
        });
    });

    stage3_newZariStock = [];
    var zariItems = safeArray(getStore("zari_stock"));
    var uniqueZariNames = [];
    zariItems.forEach(function(z) {
        if (z && z.name && uniqueZariNames.indexOf(z.name.trim().toLowerCase()) === -1) {
            uniqueZariNames.push(z.name.trim().toLowerCase());
        }
    });

    uniqueZariNames.forEach(function(zNameLow) {
        var origItem = zariItems.find(function(x) { return x && x.name && x.name.trim().toLowerCase() === zNameLow; });
        var displayName = origItem ? origItem.name : zNameLow;
        karkhanas.forEach(function(k) {
            var bachaQty = 0;
            if (typeof getZariItemStats === "function") {
                try { bachaQty = getZariItemStats(displayName, k.id).bacha; } catch(e) {}
            }
            if (bachaQty > 0) {
                stage3_newZariStock.push({
                    id: Date.now() + Math.random(),
                    name: displayName, date: getTodayDate(),
                    aaya: Number(bachaQty.toFixed(2)), openingAaya: Number(bachaQty.toFixed(2)),
                    gaya: 0, bacha: Number(bachaQty.toFixed(2)),
                    karkhanaId: k.id, karkhanaName: k.name,
                    note: "📦 Opening Stock (" + curSess + " Se Aayi)", isOpening: true
                });
            }
        });
    });

    setTimeout(function() {
        if (bar3) bar3.style.width = "100%";
        if (badge3) { badge3.textContent = "✅ Done"; badge3.style.background = "#ecfdf5"; badge3.style.color = "#059669"; }
        if (status3) status3.textContent = "✅ Bana & Zari Opening Stock Freeze!";
        if (mainBar) mainBar.style.width = "72%";
        setTimeout(function() {
            runStage4_SanchaJobwork(curSess, newSess);
        }, 200);
    }, 150);
}

// --- STAGE 4: ⚙️ SANCHA & ✂️ JOB WORK ACCOUNTS ---
function runStage4_SanchaJobwork(curSess, newSess) {
    var badge4 = document.getElementById("stage-badge-4");
    var bar4 = document.getElementById("stage-bar-4");
    var status4 = document.getElementById("stage-status-4");
    var mainBar = document.getElementById("transfer-main-bar");

    if (badge4) {
        badge4.textContent = "⏳ Processing...";
        badge4.style.background = "#eff6ff";
        badge4.style.color = "#2563eb";
    }
    if (bar4) bar4.style.width = "40%";
    if (status4) status4.textContent = "⚙️ Sancha & ✂️ Job Work Accounts Transfer...";

    var karkhanas = getKarkhanas();
    var sanchaItems = safeArray(getStore("sancha_items"));
    stage4_newSanchaItems = [];
    sanchaItems.forEach(function(item) {
        if (!item || !item.name) return;
        karkhanas.forEach(function(k) {
            var bachaQty = 0;
            if (typeof getSanchaItemStats === "function") {
                try { bachaQty = getSanchaItemStats(item.id, item.name, k.id).bacha; } catch(e) {}
            } else if (k.isDefault) {
                bachaQty = Number(item.aaya || 0);
            }
            if (bachaQty > 0) {
                stage4_newSanchaItems.push({
                    id: (item.id || "sancha_" + Date.now()) + "_" + k.id,
                    name: item.name,
                    person: item.person || "-",
                    karkhanaId: k.id,
                    karkhanaName: k.name,
                    date: getTodayDate(),
                    aaya: Math.max(0, bachaQty),
                    openingAaya: Math.max(0, bachaQty),
                    note: "📦 Opening Stock (" + curSess + " Se Aaya)",
                    isOpening: true
                });
            }
        });
    });

    stage4_oldJwWorkers = safeArray(getStore("jobwork_workers"));
    stage4_newJwSheetsMap = {};
    stage4_oldJwWorkers.forEach(function(w) {
        if (!w || !w.id) return;
        var sheets = (typeof getJobWorkerSheets === "function") ? getJobWorkerSheets(w.id) : [];
        var lastSh = sheets.length ? sheets[sheets.length - 1] : null;
        var calc = (lastSh && typeof calculateJobWorkSheetTotals === "function")
            ? calculateJobWorkSheetTotals(lastSh)
            : { pendingSaree: 0 };

        stage4_newJwSheetsMap[w.id] = [{
            id: "jw_sh_" + Date.now() + "_" + w.id,
            title: "Month 1 (Opening " + newSess + ")",
            closingPendingSaree: calc.pendingSaree || 0,
            closingBakiAmt: 0,
            note: "📦 Pichle Saal (" + curSess + ") ki Baki Saree",
            rows: []
        }];
    });

    stage4_pendingBills = safeArray(getStore("jw_bills_list")).filter(function(b) {
        var baki = Math.max(0, (Number(b.billAmt) || 0) - (Number(b.paidAmt) || 0));
        return baki > 0;
    }).map(function(b) {
        return Object.assign({}, b, { note: (b.note || "") + " (Opening Bill from " + curSess + ")" });
    });

    setTimeout(function() {
        if (bar4) bar4.style.width = "100%";
        if (badge4) {
            badge4.textContent = "✅ Done";
            badge4.style.background = "#ecfdf5";
            badge4.style.color = "#059669";
        }
        if (status4) status4.textContent = "✅ Sancha & Job Work Accounts Tayyar!";
        if (mainBar) mainBar.style.width = "88%";

        setTimeout(function() {
            runStage5_AtomicLock(curSess, newSess);
        }, 200);
    }, 150);
}

// --- STAGE 5: 🔒 10-10 CHUNKS FREEZE-PROOF SAVE ---
function runStage5_AtomicLock(curSess, newSess) {
    var badge5 = document.getElementById("stage-badge-5");
    var bar5 = document.getElementById("stage-bar-5");
    var status5 = document.getElementById("stage-status-5");

    if (badge5) {
        badge5.textContent = "⏳ Saving...";
        badge5.style.background = "#eff6ff";
        badge5.style.color = "#2563eb";
    }
    if (bar5) bar5.style.width = "5%";
    if (status5) status5.textContent = "🔒 Session & Master Stock Save Ho Raha Hai...";

    if (typeof isRemoteUpdating !== "undefined") isRemoteUpdating = true;
    if (typeof clearMemoryCache === "function") clearMemoryCache();

    var sessions = getAppSessions();
    if (sessions.indexOf(newSess) === -1) sessions.push(newSess);

    localStorage.setItem((currentUserId || "app") + "_app_sessions_list", JSON.stringify(sessions));
    localStorage.setItem((currentUserId || "app") + "_app_active_session", newSess);
    setStore("app_sessions_list", sessions);
    setStore("app_active_session", newSess);

    setStore("kariger_list", stage1_oldKarigers);
    setStore("saree_stock", stage2_newSareeStock);
    setStore("finished_saree_stock", stage2_newFinStock);
    setStore("lott_saree_stock", stage2_newLottStock);
    setStore("bana_stock", stage3_newBanaStock);
    setStore("zari_stock", stage3_newZariStock);
    setStore("sancha_items", stage4_newSanchaItems);
    setStore("sancha_history", []);
    setStore("jobwork_workers", stage4_oldJwWorkers);
    for (var wId in stage4_newJwSheetsMap) {
        setStore("jobwork_sheets_" + wId, stage4_newJwSheetsMap[wId]);
    }
    setStore("jw_bills_list", stage4_pendingBills);
    setStore("jw_payments_list", []);
    setStore("saree_history", []);
    setStore("bana_history", []);
    setStore("zari_history", []);
    setStore("material_transfers", []);
    setStore("saree_transfers", []);
    setStore("dukan_transfer_history", []);

    stage5_keys = Object.keys(stage1_newKarigerSheetsMap);
    stage5_idx = 0;

    setTimeout(function() {
        processNextSaveChunk(newSess);
    }, 100);
}

function processNextSaveChunk(newSess) {
    var total = stage5_keys.length;
    var end = Math.min(stage5_idx + stage5_chunkSize, total);

    for (var i = stage5_idx; i < end; i++) {
        var kId = stage5_keys[i];
        setStore("kariger_sheets_" + kId, stage1_newKarigerSheetsMap[kId]);
    }

    stage5_idx = end;

    var pct = total > 0 ? Math.floor((stage5_idx / total) * 100) : 100;
    var bar5 = document.getElementById("stage-bar-5");
    var status5 = document.getElementById("stage-status-5");
    var mainBar = document.getElementById("transfer-main-bar");

    if (bar5) bar5.style.width = pct + "%";
    if (status5) status5.textContent = "🔒 Database Save: " + stage5_idx + " / " + total + " (" + pct + "%)";
    if (mainBar) mainBar.style.width = (88 + Math.floor(pct * 0.12)) + "%";

    if (stage5_idx < total) {
        setTimeout(function() {
            processNextSaveChunk(newSess);
        }, 20);
    } else {
        if (typeof isRemoteUpdating !== "undefined") isRemoteUpdating = false;

        var badge5 = document.getElementById("stage-badge-5");
        if (badge5) {
            badge5.textContent = "✅ Done";
            badge5.style.background = "#ecfdf5";
            badge5.style.color = "#059669";
        }
        if (status5) status5.textContent = "✅ Naya Saal Safalta-purvak Surakshit Ho Chuka Hai!";
        if (mainBar) mainBar.style.width = "100%";

        setTimeout(function() {
            setDisplay("transfer-progress-view", "none");
            setDisplay("transfer-welcome-view", "block");
            var welSess = document.getElementById("welcome-session-name");
            if (welSess) welSess.textContent = newSess;
        }, 300);
    }
}

function finishSessionTransferAndEnter() {
    setDisplay("session-transfer-modal", "none");
    if (typeof clearMemoryCache === "function") clearMemoryCache();

    if (typeof initIndexedDBPreload === "function") {
        initIndexedDBPreload(function() {
            populateSessionDropdown();
            if (typeof backToDashboard === "function") backToDashboard();
            if (typeof renderKarigerKarkhanaTabs === "function") renderKarigerKarkhanaTabs();
            if (typeof renderKarigerTable === "function") renderKarigerTable();
            if (typeof renderStockKarkhanaTabs === "function") renderStockKarkhanaTabs();
            if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
            if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();
        });
    } else {
        populateSessionDropdown();
        if (typeof backToDashboard === "function") backToDashboard();
    }
}

// ================= 2. DYNAMIC KARKHANA MASTER =================

function getKarkhanas() {
    var list = safeArray(getStore("karkhana_list"));
    if (!list.length) {
        list = [{ id: "k_main", name: "Main Godown", location: "Head Office", isDefault: true }];
        saveKarkhanas(list);
    }
    return list;
}

function saveKarkhanas(list) {
    setStore("karkhana_list", safeArray(list));
}

function openKarkhanaManagerModal() {
    renderKarkhanaManagerTable();
    document.getElementById("karkhana-edit-id").value = "";
    document.getElementById("karkhana-input-name").value = "";
    document.getElementById("karkhana-input-location").value = "";
    document.getElementById("karkhana-save-btn").textContent = "Save";
    setDisplay("karkhana-manager-modal", "flex");
}

function closeKarkhanaManagerModal() {
    setDisplay("karkhana-manager-modal", "none");
    renderKarigerKarkhanaTabs();
    populateKarigerKarkhanaSelect();
    if (typeof renderStockKarkhanaTabs === "function") renderStockKarkhanaTabs();
}

function renderKarkhanaManagerTable() {
    var tbody = document.getElementById("karkhana-manager-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var list = getKarkhanas();
    list.forEach(function(k, idx) {
        var delBtn = k.isDefault ? 
            "<span style='color:#64748b; font-size:11px;'>Default</span>" : 
            ("<button class='delete-btn' onclick='deleteKarkhanaFromManager(\"" + k.id + "\")'>🗑️</button>");

        tbody.innerHTML += "<tr>" +
            "<td>" + (idx + 1) + "</td>" +
            "<td><strong style='color:#0284c7;'>🏭 " + k.name + "</strong></td>" +
            "<td>" + (k.location || "-") + "</td>" +
            "<td style='text-align:center;'><button class='edit-btn' onclick='editKarkhanaFromManager(\"" + k.id + "\")'>✏️ Edit</button> " + delBtn + "</td>" +
        "</tr>";
    });
}

function saveKarkhanaFromManager() {
    var editId = document.getElementById("karkhana-edit-id").value;
    var name = (document.getElementById("karkhana-input-name").value || "").trim();
    var loc = (document.getElementById("karkhana-input-location").value || "").trim();

    if (!name) return alert("Karkhane ka naam likhein!");

    var list = getKarkhanas();

    if (editId) {
        var it = list.find(function(x) { return String(x.id) === String(editId); });
        if (it) {
            it.name = name;
            it.location = loc;

            var karigers = safeArray(getStore("kariger_list"));
            karigers.forEach(function(w) {
                if (String(w.karkhanaId) === String(editId)) {
                    w.karkhanaName = name;
                }
            });
            setStore("kariger_list", karigers);
        }
    } else {
        list.push({
            id: "k_" + Date.now(),
            name: name,
            location: loc,
            isDefault: false
        });
    }

    saveKarkhanas(list);
    document.getElementById("karkhana-edit-id").value = "";
    document.getElementById("karkhana-input-name").value = "";
    document.getElementById("karkhana-input-location").value = "";
    document.getElementById("karkhana-save-btn").textContent = "Save";

    renderKarkhanaManagerTable();
    renderKarigerKarkhanaTabs();
    populateKarigerKarkhanaSelect();
    renderKarigerTable();
    if (typeof renderStockKarkhanaTabs === "function") renderStockKarkhanaTabs();
    alert("✅ Karkhana save ho gaya!");
}

function editKarkhanaFromManager(id) {
    var k = getKarkhanas().find(function(x) { return String(x.id) === String(id); });
    if (!k) return;

    document.getElementById("karkhana-edit-id").value = k.id;
    document.getElementById("karkhana-input-name").value = k.name;
    document.getElementById("karkhana-input-location").value = k.location || "";
    document.getElementById("karkhana-save-btn").textContent = "Update";
    document.getElementById("karkhana-input-name").focus();
}

function deleteKarkhanaFromManager(id) {
    var k = getKarkhanas().find(function(x) { return String(x.id) === String(id); });
    if (!k || k.isDefault) return alert("Default Godown delete nahi ho sakta!");

    if (!confirm("Kya '" + k.name + "' ko delete karna chahte hain? Sabhi kariger Main Godown me shift ho jayenge.")) return;

    var karigers = safeArray(getStore("kariger_list"));
    karigers.forEach(function(w) {
        if (String(w.karkhanaId) === String(id)) {
            w.karkhanaId = "k_main";
            w.karkhanaName = "Main Godown";
        }
    });
    setStore("kariger_list", karigers);

    var list = getKarkhanas().filter(function(x) { return String(x.id) !== String(id); });
    saveKarkhanas(list);

    renderKarkhanaManagerTable();
    renderKarigerKarkhanaTabs();
    populateKarigerKarkhanaSelect();
    renderKarigerTable();
    if (typeof renderStockKarkhanaTabs === "function") renderStockKarkhanaTabs();
}

// ================= 3. DYNAMIC KARKHANA TABS IN KARIGER MASTER =================

function renderKarigerKarkhanaTabs() {
    var bar = document.getElementById("kariger-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";

    var allKarigers = sanitizeKarigerList();
    var karkhanas = getKarkhanas();

    var allActive = (currentKarigerKarkhanaFilter === "all") ? " active" : "";
    bar.innerHTML += "<button class='sheet-tab" + allActive + "' onclick='switchKarigerKarkhanaTab(\"all\")'>👥 Sabhi Kariger (" + allKarigers.length + ")</button>";

    karkhanas.forEach(function(k) {
        var count = allKarigers.filter(function(w) { 
            return String(w.karkhanaId) === String(k.id) || (!w.karkhanaId && k.isDefault); 
        }).length;

        var isActive = (String(currentKarigerKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button class='sheet-tab" + isActive + "' onclick='switchKarigerKarkhanaTab(\"" + k.id + "\")'>🏭 " + k.name + " (" + count + ")</button>";
    });
}

function switchKarigerKarkhanaTab(kId) {
    currentKarigerKarkhanaFilter = kId;
    currentKarigerPage = 1;
    renderKarigerKarkhanaTabs();
    renderKarigerTable();
}

function populateKarigerKarkhanaSelect() {
    var sel = document.getElementById("kar-karkhana");
    if (!sel) return;
    sel.innerHTML = "";

    var list = getKarkhanas();
    list.forEach(function(k) {
        var opt = document.createElement("option");
        opt.value = k.id;
        opt.textContent = "🏭 " + k.name + (k.location ? " (" + k.location + ")" : "");
        sel.appendChild(opt);
    });

    if (currentKarigerKarkhanaFilter !== "all") {
        sel.value = currentKarigerKarkhanaFilter;
    }
}

// ================= 4. KARIGER MASTER ENGINE =================

function openKarigerModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("kariger-section", "block");
    populateSessionDropdown();
    renderKarigerKarkhanaTabs();
    populateKarigerKarkhanaSelect();
    currentKarigerPage = 1;
    renderKarigerTable();
}

function sanitizeKarigerList() {
    return safeArray(getStore("kariger_list"));
}

function saveKarigerList(list) {
    setStore("kariger_list", safeArray(list));
}

function getKarigerSheets(karigerId) {
    if (!karigerId) return [];
    var sheets = safeArray(getStore("kariger_sheets_" + karigerId));
    sheets.forEach(function(sh) {
        if (sh) sh.rows = safeArray(sh.rows);
    });
    return sheets;
}

function saveKarigerSheets(karigerId, sheets) {
    if (!karigerId) return;
    var clean = safeArray(sheets);
    clean.forEach(function(sh) {
        if (sh) sh.rows = safeArray(sh.rows);
    });
    setStore("kariger_sheets_" + karigerId, clean);
}

function deleteSheetRowByRefId(refId) {
    if (!refId) return false;
    var karigers = sanitizeKarigerList();
    var found = false;

    karigers.forEach(function(k) {
        var sheets = getKarigerSheets(k.id);
        var changed = false;

        sheets.forEach(function(sh) {
            if (sh && sh.rows) {
                var initialLen = sh.rows.length;
                sh.rows = safeArray(sh.rows).filter(function(r) {
                    return !r || String(r.id) !== String(refId);
                });
                if (sh.rows.length !== initialLen) {
                    changed = true;
                    found = true;
                }
            }
        });

        if (changed) {
            saveKarigerSheets(k.id, sheets);
        }
    });

    return found;
}

function getKarigerLastActiveInfo(karigerId) {
    var sheets = getKarigerSheets(karigerId);
    var latestDate = null;

    sheets.forEach(function(sh) {
        if (sh && sh.rows) {
            safeArray(sh.rows).forEach(function(r) {
                if (r && r.date) {
                    if (!latestDate || r.date > latestDate) latestDate = r.date;
                }
            });
        }
    });

    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(karigerId); });
    if (!latestDate) latestDate = (k && k.date) ? k.date : null;
    if (!latestDate) return { lastDate: "-", daysAbsent: 0 };

    var diffTime = new Date(getTodayDate()) - new Date(latestDate);
    var diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return { lastDate: latestDate, daysAbsent: Math.max(0, diffDays) };
}

function toggleKarigerForm() {
    var f = document.getElementById("add-kariger-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    document.getElementById("kar-date").value = getTodayDate();
    cancelKarigerEdit();
    populateKarigerKarkhanaSelect();
}

function cancelKarigerEdit() {
    document.getElementById("kar-edit-id").value = "";
    document.getElementById("kar-name").value = "";
    document.getElementById("kar-saree").value = "";
    document.getElementById("kar-date").value = getTodayDate();
    document.getElementById("kar-save-btn").textContent = "Save Kariger";
    setDisplay("kar-cancel-btn", "none");
}

function saveNewKariger() {
    var editId = document.getElementById("kar-edit-id").value;
    var n = (document.getElementById("kar-name").value || "").trim().toUpperCase();
    var s = (document.getElementById("kar-saree").value || "").trim();
    var d = document.getElementById("kar-date").value || getTodayDate();

    var kId = document.getElementById("kar-karkhana") ? document.getElementById("kar-karkhana").value : "k_main";
    var kObj = getKarkhanas().find(function(x) { return String(x.id) === String(kId); });
    var kName = kObj ? kObj.name : "Main Godown";

    if (!n) return alert("Kariger ka naam zaroori hai!");

    var list = sanitizeKarigerList();

    if (editId) {
        var it = list.find(function(x) { return String(x.id) === String(editId); });
        if (it) {
            it.name = n;
            it.saree = s;
            it.date = d;
            it.karkhanaId = kId;
            it.karkhanaName = kName;
        }
    } else {
        list.push({
            id: "kar_" + Date.now(),
            name: n,
            saree: s,
            date: d,
            karkhanaId: kId,
            karkhanaName: kName
        });
    }

    saveKarigerList(list);
    cancelKarigerEdit();
    setDisplay("add-kariger-form", "none");
    renderKarigerKarkhanaTabs();
    renderKarigerTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Kariger (" + kName + ") me save ho gaya!");
}

function editKariger(id) {
    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(id); });
    if (!k) return;

    toggle
