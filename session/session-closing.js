/* ========================================================
   SIMPLICITY ERP - 5-STAGE SEQUENTIAL YEAR-END CLOSING
   File: session/session-closing.js • Developed by Farhan Jawed
   (Accurate Opening Stock + Passbook History + Celebration Card)
======================================================== */

var pendingTransferNewSession = null;
var stage1_oldKarigers = [];
var stage1_newKarigerSheetsMap = {};
var stage1_idx = 0;
var stage1_chunkSize = 25;

var stage2_newSareeHistory = [];
var stage2_totFreshPcs = 0;
var stage2_totFinPcs = 0;
var stage2_totLottPcs = 0;

var stage3_newBanaStock = [];
var stage3_newBanaHistory = [];
var stage3_newZariStock = [];
var stage3_newZariHistory = [];

var stage4_newSanchaItems = [];
var stage4_newSanchaHistory = [];
var stage4_oldJwWorkers = [];
var stage4_newJwSheetsMap = {};

function startSequentialYearClosing() {
    var curSess = getActiveFinancialSession();
    var newSessEl = document.getElementById("session-new-input");
    var newSess = (newSessEl ? newSessEl.value : "").trim();

    if (!newSess) return alert("Naye Saal ka naam daalein! (Jaise: 2027-2028)");
    if (newSess === curSess) return alert("Naya session purane se alag hona chahiye!");

    var sessions = getAppSessions();
    if (sessions.indexOf(newSess) !== -1) {
        return alert("Ye Session pehle se bana hua hai! Pehle ise Delete Zone se delete karein, fir fresh banayein.");
    }

    closeSessionClosingModal();
    pendingTransferNewSession = newSess;

    var modal = document.getElementById("session-transfer-modal");
    if (!modal) return;

    var modalBody = modal.querySelector(".modal-body");
    if (modalBody) {
        modalBody.innerHTML = 
            "<div style='background:#e2e8f0; height:10px; margin-bottom:14px; border-radius:5px; overflow:hidden;'>" +
                "<div id='transfer-main-bar' style='background:#2563eb; width:0%; height:100%; transition:width 0.3s;'></div>" +
            "</div>" +
            "<div><span id='stage-badge-1' class='badge-blue'>Waiting</span> <small id='stage-status-1'>1. Kariger Opening Carry-Forward</small><div style='background:#e2e8f0; height:4px; margin-top:4px;'><div id='stage-bar-1' style='background:#2563eb; width:0%; height:100%;'></div></div></div>" +
            "<div style='margin-top:10px;'><span id='stage-badge-2' class='badge-blue'>Waiting</span> <small id='stage-status-2'>2. Saree Opening Stock</small><div style='background:#e2e8f0; height:4px; margin-top:4px;'><div id='stage-bar-2' style='background:#2563eb; width:0%; height:100%;'></div></div></div>" +
            "<div style='margin-top:10px;'><span id='stage-badge-3' class='badge-blue'>Waiting</span> <small id='stage-status-3'>3. Bana & Zari Opening Stock</small><div style='background:#e2e8f0; height:4px; margin-top:4px;'><div id='stage-bar-3' style='background:#2563eb; width:0%; height:100%;'></div></div></div>" +
            "<div style='margin-top:10px;'><span id='stage-badge-4' class='badge-blue'>Waiting</span> <small id='stage-status-4'>4. Sancha & Job Work Carry-Forward</small><div style='background:#e2e8f0; height:4px; margin-top:4px;'><div id='stage-bar-4' style='background:#2563eb; width:0%; height:100%;'></div></div></div>" +
            "<div style='margin-top:10px;'><span id='stage-badge-5' class='badge-blue'>Waiting</span> <small id='stage-status-5'>5. Safe Commit & Cloud Lock</small><div style='background:#e2e8f0; height:4px; margin-top:4px;'><div id='stage-bar-5' style='background:#2563eb; width:0%; height:100%;'></div></div></div>";
    }

    modal.style.display = "flex";

    setTimeout(function() {
        runStage1_Karigers(curSess, newSess);
    }, 150);
}

// STAGE 1: KARIGER KHATA (25-25 CHUNKS)
function runStage1_Karigers(curSess, newSess) {
    stage1_oldKarigers = safeArray(getStore("kariger_list"));
    stage1_newKarigerSheetsMap = {};
    stage1_idx = 0;

    var badge = document.getElementById("stage-badge-1");
    if (badge) {
        badge.textContent = "⏳ Transferring...";
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

        var remBana = Number(calc.remainingBana || calc.bachaBana || 0);
        var remZari = Number(calc.remainingZari || calc.bachiZari || 0);
        var remAmt = Number(calc.remainingAmt || calc.bakiMazdoori || 0);

        stage1_newKarigerSheetsMap[k.id] = [{
            id: "tani_1",
            title: "Tani 1 (Opening " + newSess + ")",
            pichlaBana: Number(remBana.toFixed(2)),
            pichlaZari: Number(remZari.toFixed(2)),
            pichlaBani: Number(remAmt.toFixed(2)),
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
    if (status1) status1.textContent = "⏳ " + stage1_idx + " / " + total + " Kariger Done (" + pct + "%)";
    if (mainBar) mainBar.style.width = Math.floor(pct * 0.25) + "%";

    if (stage1_idx < total) {
        setTimeout(function() { processNextKarigerChunk(curSess, newSess); }, 20);
    } else {
        var badge1 = document.getElementById("stage-badge-1");
        if (badge1) {
            badge1.textContent = "✅ Done (" + total + ")";
            badge1.style.background = "#ecfdf5";
            badge1.style.color = "#059669";
        }
        setTimeout(function() { runStage2_SareeStock(curSess, newSess); }, 150);
    }
}

// STAGE 2: SAREE STOCK (Opening Stock in saree_history)
function runStage2_SareeStock(curSess, newSess) {
    var rawHistory = safeArray(getStore("saree_history"));

    stage2_newSareeHistory = [];
    stage2_totFreshPcs = 0;
    stage2_totFinPcs = 0;
    stage2_totLottPcs = 0;

    var tabs = ["fresh", "finished", "lott"];
    tabs.forEach(function(tb) {
        var rows = (typeof groupSareeStockByTab === "function") 
            ? groupSareeStockByTab(rawHistory, tb, "all") 
            : [];

        rows.forEach(function(r) {
            var bachiQty = Number(r.bachi || (r.aai - r.gai) || 0);
            if (bachiQty > 0) {
                if (tb === "fresh") stage2_totFreshPcs += bachiQty;
                else if (tb === "finished") stage2_totFinPcs += bachiQty;
                else if (tb === "lott") stage2_totLottPcs += bachiQty;

                stage2_newSareeHistory.push({
                    id: "saree_open_" + tb + "_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                    date: getTodayDate(),
                    sareeName: r.sareeName,
                    karigerName: r.karigerName || "📦 Opening Stock",
                    kariger: r.karigerName || "📦 Opening Stock",
                    karkhanaId: r.karkhanaId || "k_main",
                    type: tb,
                    typeLabel: "📦 Opening Stock (" + curSess + " Se Aaya)",
                    aai: bachiQty,
                    gai: 0,
                    isOut: false,
                    isOpening: true,
                    note: "Opening Stock"
                });
            }
        });
    });

    var bar2 = document.getElementById("stage-bar-2");
    var badge2 = document.getElementById("stage-badge-2");
    var status2 = document.getElementById("stage-status-2");
    var mainBar = document.getElementById("transfer-main-bar");
    if (bar2) bar2.style.width = "100%";
    if (mainBar) mainBar.style.width = "50%";
    if (status2) status2.textContent = "✅ Fresh: " + stage2_totFreshPcs + " | Finished: " + stage2_totFinPcs + " Pcs";
    if (badge2) { badge2.textContent = "✅ Done"; badge2.style.background = "#ecfdf5"; badge2.style.color = "#059669"; }

    setTimeout(function() { runStage3_BanaZariStock(curSess, newSess); }, 150);
}

// STAGE 3: BANA & ZARI STOCK (Stock + History Both Created)
function runStage3_BanaZariStock(curSess, newSess) {
    // 1. BANA OPENING
    stage3_newBanaStock = [];
    stage3_newBanaHistory = [];
    var banaItems = safeArray(getStore("bana_stock"));
    var seenBana = [];

    banaItems.forEach(function(b) {
        if (!b || !b.name) return;
        var kid = b.karkhanaId || "k_main";
        var key = b.name.trim().toLowerCase() + "___" + kid;

        if (seenBana.indexOf(key) === -1) {
            seenBana.push(key);
            var stats = (typeof getBanaItemStats === "function") 
                ? getBanaItemStats(b.name.trim(), kid) 
                : { bacha: Number(b.bacha || b.aaya || 0) };

            var bachaVal = Number(stats.bacha !== undefined ? stats.bacha : (b.bacha || b.aaya || 0));
            bachaVal = Math.max(0, Number(bachaVal.toFixed(2)));

            stage3_newBanaStock.push({
                id: "bana_open_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                name: b.name.trim(),
                date: getTodayDate(),
                aaya: bachaVal,
                openingAaya: bachaVal,
                gaya: 0,
                bacha: bachaVal,
                karkhanaId: kid,
                isOpening: true,
                note: "📦 Opening Stock (" + curSess + " Se Aaya)"
            });

            if (bachaVal > 0) {
                stage3_newBanaHistory.push({
                    id: "bhist_open_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                    date: getTodayDate(),
                    name: b.name.trim(),
                    kariger: "📦 Opening Stock",
                    type: "📦 Opening Stock (" + curSess + " Se Aaya)",
                    aaya: bachaVal,
                    gaya: 0,
                    karkhanaId: kid,
                    isOpening: true
                });
            }
        }
    });

    // 2. ZARI OPENING
    stage3_newZariStock = [];
    stage3_newZariHistory = [];
    var zariItems = safeArray(getStore("zari_stock"));
    var seenZari = [];

    zariItems.forEach(function(z) {
        if (!z || !z.name) return;
        var kid = z.karkhanaId || "k_main";
        var key = z.name.trim().toLowerCase() + "___" + kid;

        if (seenZari.indexOf(key) === -1) {
            seenZari.push(key);
            var statsZ = (typeof getZariItemStats === "function") 
                ? getZariItemStats(z.name.trim(), kid) 
                : { bacha: Number(z.bacha || z.aaya || 0) };

            var bachaValZ = Number(statsZ.bacha !== undefined ? statsZ.bacha : (z.bacha || z.aaya || 0));
            bachaValZ = Math.max(0, Number(bachaValZ.toFixed(2)));

            stage3_newZariStock.push({
                id: "zari_open_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                name: z.name.trim(),
                date: getTodayDate(),
                aaya: bachaValZ,
                openingAaya: bachaValZ,
                gaya: 0,
                bacha: bachaValZ,
                karkhanaId: kid,
                isOpening: true,
                note: "📦 Opening Stock (" + curSess + " Se Aaya)"
            });

            if (bachaValZ > 0) {
                stage3_newZariHistory.push({
                    id: "zhist_open_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                    date: getTodayDate(),
                    name: z.name.trim(),
                    kariger: "📦 Opening Stock",
                    type: "📦 Opening Stock (" + curSess + " Se Aaya)",
                    aaya: bachaValZ,
                    gaya: 0,
                    karkhanaId: kid,
                    isOpening: true
                });
            }
        }
    });

    var bar3 = document.getElementById("stage-bar-3");
    var badge3 = document.getElementById("stage-badge-3");
    var mainBar = document.getElementById("transfer-main-bar");
    if (bar3) bar3.style.width = "100%";
    if (mainBar) mainBar.style.width = "75%";
    if (badge3) { badge3.textContent = "✅ Done"; badge3.style.background = "#ecfdf5"; badge3.style.color = "#059669"; }

    setTimeout(function() { runStage4_SanchaAndJobwork(curSess, newSess); }, 150);
}

// STAGE 4: SANCHA & JOB WORK CARRY-FORWARD
function runStage4_SanchaAndJobwork(curSess, newSess) {
    stage4_newSanchaItems = safeArray(getStore("sancha_items")).map(function(s) {
        var bacha = Number(s.bacha !== undefined ? s.bacha : (s.aaya || 0));
        return {
            id: s.id,
            name: s.name,
            category: s.category || "tani",
            aaya: bacha,
            gaya: 0,
            bacha: bacha,
            date: getTodayDate(),
            karkhanaId: s.karkhanaId || "k_main",
            note: "📦 Opening (" + curSess + " Se Aaya)"
        };
    });

    stage4_oldJwWorkers = safeArray(getStore("jobwork_workers"));
    stage4_newJwSheetsMap = {};

    stage4_oldJwWorkers.forEach(function(w) {
        if (!w || !w.id) return;
        var sheets = safeArray(getStore("jobwork_sheets_" + w.id));
        var lastSh = sheets.length ? sheets[sheets.length - 1] : null;
        var pSaree = 0;
        if (lastSh && typeof calculateJobWorkSheetTotals === "function") {
            pSaree = calculateJobWorkSheetTotals(lastSh).pendingSaree || 0;
        }
        stage4_newJwSheetsMap[w.id] = [{
            id: "jws_open_1",
            title: "Khata 1 (Opening " + newSess + ")",
            closingPendingSaree: pSaree,
            closingBakiAmt: 0,
            rows: []
        }];
    });

    var bar4 = document.getElementById("stage-bar-4");
    var badge4 = document.getElementById("stage-badge-4");
    var mainBar = document.getElementById("transfer-main-bar");
    if (bar4) bar4.style.width = "100%";
    if (mainBar) mainBar.style.width = "90%";
    if (badge4) { badge4.textContent = "✅ Done"; badge4.style.background = "#ecfdf5"; badge4.style.color = "#059669"; }

    setTimeout(function() { commitStage5_Finalize(curSess, newSess); }, 150);
}

// STAGE 5: SAVE TO NEW SESSION & FIREBASE LOCK
function commitStage5_Finalize(curSess, newSess) {
    var uId = getEffectiveUserId();
    var sessions = getAppSessions();
    if (sessions.indexOf(newSess) === -1) sessions.push(newSess);

    localStorage.setItem(uId + "_app_sessions_list", JSON.stringify(sessions));
    localStorage.setItem(uId + "_app_active_session", newSess);
    if (typeof APP_MEMORY_CACHE !== "undefined") {
        APP_MEMORY_CACHE[uId + "_app_sessions_list"] = sessions;
        APP_MEMORY_CACHE[uId + "_app_active_session"] = newSess;
    }
    if (typeof idbPut === "function") {
        idbPut(uId + "_app_sessions_list", sessions);
        idbPut(uId + "_app_active_session", newSess);
    }

    if (typeof db !== "undefined" && db && uId && uId !== "app") {
        try {
            db.ref("users/" + uId + "/app_active_session").set(newSess);
            db.ref("users/" + uId + "/app_sessions_list").set(sessions);
        } catch(e) {}
    }

    var setTargetStore = function(key, data) {
        var fullKey = uId + "_" + newSess + "_" + key;
        if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE[fullKey] = data;
        if (typeof idbPut === "function") idbPut(fullKey, data);
        try { localStorage.setItem(fullKey, JSON.stringify(data)); } catch(e) {}
        if (typeof db !== "undefined" && db && uId && uId !== "app") {
            try { db.ref("users/" + uId + "/" + newSess + "_" + key).set(data); } catch(e) {}
        }
    };

    setTargetStore("kariger_list", stage1_oldKarigers);
    for (var kId in stage1_newKarigerSheetsMap) {
        setTargetStore("kariger_sheets_" + kId, stage1_newKarigerSheetsMap[kId]);
    }

    setTargetStore("saree_history", stage2_newSareeHistory);
    setTargetStore("bana_stock", stage3_newBanaStock);
    setTargetStore("bana_history", stage3_newBanaHistory);
    setTargetStore("zari_stock", stage3_newZariStock);
    setTargetStore("zari_history", stage3_newZariHistory);

    setTargetStore("sancha_items", stage4_newSanchaItems);
    setTargetStore("sancha_history", []);

    setTargetStore("jobwork_workers", stage4_oldJwWorkers);
    for (var wId in stage4_newJwSheetsMap) {
        setTargetStore("jobwork_sheets_" + wId, stage4_newJwSheetsMap[wId]);
    }
    setTargetStore("jw_bills_list", []);
    setTargetStore("jw_payments_list", []);
    setTargetStore("dukan_transfer_history", []);

    var bar5 = document.getElementById("stage-bar-5");
    var badge5 = document.getElementById("stage-badge-5");
    var mainBar = document.getElementById("transfer-main-bar");
    if (bar5) bar5.style.width = "100%";
    if (mainBar) mainBar.style.width = "100%";
    if (badge5) { badge5.textContent = "✅ Complete"; badge5.style.background = "#ecfdf5"; badge5.style.color = "#059669"; }

    // 🎉 CELEBRATION WISH SCREEN
    setTimeout(function() {
        var modal = document.getElementById("session-transfer-modal");
        if (!modal) return;
        var modalBody = modal.querySelector(".modal-body");
        if (modalBody) {
            modalBody.innerHTML = 
                "<div style='text-align:center; padding:15px;'>" +
                    "<div style='font-size:55px; margin-bottom:8px;'>🎉 ✨ 🚀</div>" +
                    "<h2 style='color:#1e3a8a; font-size:22px; font-weight:800; margin-bottom:6px;'>NAYA SAAL MUBARAK HO!</h2>" +
                    "<p style='color:#059669; font-size:14px; font-weight:700;'>Session '" + newSess + "' Successfully Start Ho Gaya Hai!</p>" +
                    "<div style='background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:14px; margin:16px 0; text-align:left; font-size:13px; display:grid; grid-template-columns:1fr 1fr; gap:8px;'>" +
                        "<div>🧵 <strong>Kariger Carry:</strong> " + stage1_oldKarigers.length + " Kariger</div>" +
                        "<div>🥻 <strong>Saree Opening:</strong> " + stage2_totFreshPcs + " Fresh Pcs</div>" +
                        "<div>🧶 <strong>Bana Items:</strong> " + stage3_newBanaStock.length + " Items Safe</div>" +
                        "<div>✨ <strong>Zari Items:</strong> " + stage3_newZariStock.length + " Items Safe</div>" +
                        "<div>⚙️ <strong>Sancha Stock:</strong> Carry Forward</div>" +
                        "<div>✂️ <strong>Job Work Khata:</strong> Carry Forward</div>" +
                    "</div>" +
                    "<p style='font-size:12px; color:#64748b; margin-bottom:15px;'>* Pichla saal safely freeze ho chuka hai. Naye saal me Opening Stock live add ho chuka hai.</p>" +
                    "<button class='btn' style='background:linear-gradient(135deg, #10b981, #059669); font-size:15px; font-weight:bold; padding:12px; cursor:pointer;' onclick='completeNewSessionStartup(\"" + newSess + "\")'>🚀 Naye Saal Me Kaam Shuru Karein</button>" +
                "</div>";
        }
    }, 400);
}

function completeNewSessionStartup(targetSess) {
    var modal = document.getElementById("session-transfer-modal");
    if (modal) modal.style.display = "none";

    var uId = getEffectiveUserId();
    var s = targetSess || pendingTransferNewSession || getActiveFinancialSession();

    localStorage.setItem(uId + "_app_active_session", s);
    if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE[uId + "_app_active_session"] = s;
    if (typeof idbPut === "function") idbPut(uId + "_app_active_session", s);
    if (typeof db !== "undefined" && db && uId && uId !== "app") {
        try { db.ref("users/" + uId + "/app_active_session").set(s); } catch(e) {}
    }

    populateSessionDropdown();
    var sel = document.getElementById("app-session-select");
    if (sel) sel.value = s;

    if (typeof clearMemoryCache === "function") clearMemoryCache();
    if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE[uId + "_app_active_session"] = s;

    if (typeof initIndexedDBPreload === "function") {
        initIndexedDBPreload(function() {
            populateSessionDropdown();
            if (typeof backToDashboard === "function") backToDashboard();
            if (typeof triggerActiveSectionRefresh === "function") triggerActiveSectionRefresh();
            if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
        });
    } else {
        populateSessionDropdown();
        if (typeof backToDashboard === "function") backToDashboard();
        if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    }
}
