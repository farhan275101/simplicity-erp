/* ========================================================
   SIMPLICITY ERP - 5-STAGE ENTERPRISE BULLETPROOF CLOSING
   File: session/session-closing.js • Developed by Farhan Jawed
   (Multi-Godam Separate Opening Stock • 2000+ Kariger Safe)
======================================================== */

var pendingTransferNewSession = null;
var stage1_oldKarigers = [];
var stage1_newKarigerSheetsMap = {};
var stage1_idx = 0;
var stage1_chunkSize = 20; // ⚡ 20-20 Kariger Chunk for Stage 1

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

// Safe LocalStorage Writer (5MB Quota Crash se bachne ke liye)
function safeSetLocalStorage(key, val) {
    try {
        localStorage.setItem(key, typeof val === "string" ? val : JSON.stringify(val));
    } catch(e) {
        // Quota bharne par crash hone se rokega, IndexedDB data sambhal lega
    }
}

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

    var uId = getEffectiveUserId();

    // 🔒 1. CLOUD LISTENER MUTE (Background events se screen freeze na ho)
    if (typeof db !== "undefined" && db && uId && uId !== "app") {
        try { db.ref("users/" + uId).off(); } catch(e) {}
    }

    closeSessionClosingModal();
    pendingTransferNewSession = newSess;

    var modal = document.getElementById("session-transfer-modal");
    if (!modal) return;

    var modalBody = modal.querySelector(".modal-body");
    if (modalBody) {
        modalBody.innerHTML = 
            "<div style='background:#e2e8f0; height:10px; margin-bottom:14px; border-radius:5px; overflow:hidden;'>" +
                "<div id='transfer-main-bar' style='background:#2563eb; width:0%; height:100%; transition:width 0.2s;'></div>" +
            "</div>" +
            "<div><span id='stage-badge-1' class='badge-blue'>Waiting</span> <small id='stage-status-1'>1. Kariger Opening Carry-Forward</small><div style='background:#e2e8f0; height:4px; margin-top:4px;'><div id='stage-bar-1' style='background:#2563eb; width:0%; height:100%;'></div></div></div>" +
            "<div style='margin-top:10px;'><span id='stage-badge-2' class='badge-blue'>Waiting</span> <small id='stage-status-2'>2. Saree Opening Stock</small><div style='background:#e2e8f0; height:4px; margin-top:4px;'><div id='stage-bar-2' style='background:#2563eb; width:0%; height:100%;'></div></div></div>" +
            "<div style='margin-top:10px;'><span id='stage-badge-3' class='badge-blue'>Waiting</span> <small id='stage-status-3'>3. Bana & Zari Multi-Godam Opening</small><div style='background:#e2e8f0; height:4px; margin-top:4px;'><div id='stage-bar-3' style='background:#2563eb; width:0%; height:100%;'></div></div></div>" +
            "<div style='margin-top:10px;'><span id='stage-badge-4' class='badge-blue'>Waiting</span> <small id='stage-status-4'>4. Sancha & Job Work Carry-Forward</small><div style='background:#e2e8f0; height:4px; margin-top:4px;'><div id='stage-bar-4' style='background:#2563eb; width:0%; height:100%;'></div></div></div>" +
            "<div style='margin-top:10px;'><span id='stage-badge-5' class='badge-blue'>Waiting</span> <small id='stage-status-5'>5. Safe 20-Chunk Batch Commit</small><div style='background:#e2e8f0; height:4px; margin-top:4px;'><div id='stage-bar-5' style='background:#2563eb; width:0%; height:100%;'></div></div></div>";
    }

    modal.style.display = "flex";

    setTimeout(function() {
        runStage1_Karigers(curSess, newSess);
    }, 150);
}

// ================= STAGE 1: KARIGER KHATA (20-20 CHUNKS) =================
function runStage1_Karigers(curSess, newSess) {
    stage1_oldKarigers = safeArray(getStore("kariger_list"));
    stage1_newKarigerSheetsMap = {};
    stage1_idx = 0;

    var badge = document.getElementById("stage-badge-1");
    if (badge) {
        badge.textContent = "⏳ Calculating...";
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
    if (mainBar) mainBar.style.width = Math.floor(pct * 0.20) + "%";

    if (stage1_idx < total) {
        setTimeout(function() { processNextKarigerChunk(curSess, newSess); }, 15);
    } else {
        var badge1 = document.getElementById("stage-badge-1");
        if (badge1) {
            badge1.textContent = "✅ Done (" + total + ")";
            badge1.style.background = "#ecfdf5";
            badge1.style.color = "#059669";
        }
        setTimeout(function() { runStage2_SareeStock(curSess, newSess); }, 100);
    }
}

// ================= STAGE 2: SAREE STOCK =================
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
            if (bachachiQty = bachiQty, bachiQty > 0) {
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
    if (mainBar) mainBar.style.width = "40%";
    if (status2) status2.textContent = "✅ Fresh: " + stage2_totFreshPcs + " | Finished: " + stage2_totFinPcs + " Pcs";
    if (badge2) { badge2.textContent = "✅ Done"; badge2.style.background = "#ecfdf5"; badge2.style.color = "#059669"; }

    setTimeout(function() { runStage3_BanaZariStock(curSess, newSess); }, 100);
}

// ================= STAGE 3: ⭐ MULTI-GODAM BANA & ZARI OPENING (SEPARATE PER GODOWN) =================
function runStage3_BanaZariStock(curSess, newSess) {
    stage3_newBanaStock = [];
    stage3_newBanaHistory = [];

    // Sabhi karkhane / godamon ki list nikalna
    var karkhanas = [];
    if (typeof getKarkhanasSafe === "function") {
        karkhanas = getKarkhanasSafe();
    } else {
        karkhanas = safeArray(getStore("karkhana_list"));
        if (!karkhanas.length) karkhanas = [{ id: "k_main", name: "Main Godown", isDefault: true }];
    }

    // 1. BANA OPENING (Har Godam ka alag-alag hisab)
    var rawBana = safeArray(getStore("bana_stock"));
    var uniqueBanaNames = [];
    rawBana.forEach(function(b) {
        if (!b || !b.name) return;
        var n = b.name.trim();
        if (uniqueBanaNames.map(function(x) { return x.toLowerCase(); }).indexOf(n.toLowerCase()) === -1) {
            uniqueBanaNames.push(n);
        }
    });

    uniqueBanaNames.forEach(function(bName) {
        if (karkhanas.length <= 1) {
            // Sirf ek Godam (Main Godown): Poora bacha wazan Main me jayega
            var stats = (typeof getBanaItemStats === "function") ? getBanaItemStats(bName, "all") : { bacha: 0 };
            var bachaVal = Math.max(0, Number((stats.bacha !== undefined ? stats.bacha : 0).toFixed(2)));

            if (bachaVal > 0) {
                stage3_newBanaStock.push({
                    id: "bana_open_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                    name: bName,
                    date: getTodayDate(),
                    aaya: bachaVal,
                    openingAaya: bachaVal,
                    gaya: 0,
                    bacha: bachaVal,
                    karkhanaId: "k_main",
                    isOpening: true,
                    note: "📦 Opening Stock (" + curSess + " Se Aaya)"
                });

                stage3_newBanaHistory.push({
                    id: "bhist_open_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                    date: getTodayDate(),
                    name: bName,
                    kariger: "📦 Opening Stock",
                    type: "📦 Opening Stock (" + curSess + " Se Aaya)",
                    aaya: bachaVal,
                    gaya: 0,
                    karkhanaId: "k_main",
                    isOpening: true
                });
            }
        } else {
            // ⭐ MULTI-GODAM: Har godam ka apna bacha wazan usi godam ki ID ke sath alag opening banega
            karkhanas.forEach(function(k) {
                var statsK = (typeof getBanaItemStats === "function") ? getBanaItemStats(bName, k.id) : { bacha: 0 };
                var bachaValK = Math.max(0, Number((statsK.bacha !== undefined ? statsK.bacha : 0).toFixed(2)));

                if (bachaValK > 0) {
                    stage3_newBanaStock.push({
                        id: "bana_open_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                        name: bName,
                        date: getTodayDate(),
                        aaya: bachaValK,
                        openingAaya: bachaValK,
                        gaya: 0,
                        bacha: bachaValK,
                        karkhanaId: k.id, // 🎯 Godam ki apni alag ID
                        isOpening: true,
                        note: "📦 Opening Stock (" + curSess + " Se Aaya)"
                    });

                    stage3_newBanaHistory.push({
                        id: "bhist_open_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                        date: getTodayDate(),
                        name: bName,
                        kariger: "📦 Opening Stock",
                        type: "📦 Opening Stock (" + curSess + " Se Aaya)",
                        aaya: bachaValK,
                        gaya: 0,
                        karkhanaId: k.id, // 🎯 Godam ki apni alag ID
                        isOpening: true
                    });
                }
            });
        }
    });

    // 2. ZARI OPENING (Har Godam ka alag-alag hisab)
    stage3_newZariStock = [];
    stage3_newZariHistory = [];

    var rawZari = safeArray(getStore("zari_stock"));
    var uniqueZariNames = [];
    rawZari.forEach(function(z) {
        if (!z || !z.name) return;
        var n = z.name.trim();
        if (uniqueZariNames.map(function(x) { return x.toLowerCase(); }).indexOf(n.toLowerCase()) === -1) {
            uniqueZariNames.push(n);
        }
    });

    uniqueZariNames.forEach(function(zName) {
        if (karkhanas.length <= 1) {
            // Sirf ek Godam (Main Godown)
            var statsZ = (typeof getZariItemStats === "function") ? getZariItemStats(zName, "all") : { bacha: 0 };
            var bachaValZ = Math.max(0, Number((statsZ.bacha !== undefined ? statsZ.bacha : 0).toFixed(2)));

            if (bachaValZ > 0) {
                stage3_newZariStock.push({
                    id: "zari_open_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                    name: zName,
                    date: getTodayDate(),
                    aaya: bachaValZ,
                    openingAaya: bachaValZ,
                    gaya: 0,
                    bacha: bachaValZ,
                    karkhanaId: "k_main",
                    isOpening: true,
                    note: "📦 Opening Stock (" + curSess + " Se Aaya)"
                });

                stage3_newZariHistory.push({
                    id: "zhist_open_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                    date: getTodayDate(),
                    name: zName,
                    kariger: "📦 Opening Stock",
                    type: "📦 Opening Stock (" + curSess + " Se Aaya)",
                    aaya: bachaValZ,
                    gaya: 0,
                    karkhanaId: "k_main",
                    isOpening: true
                });
            }
        } else {
            // ⭐ MULTI-GODAM: Har godam ka apna bacha wazan usi godam ki ID ke sath alag opening banega
            karkhanas.forEach(function(k) {
                var statsZK = (typeof getZariItemStats === "function") ? getZariItemStats(zName, k.id) : { bacha: 0 };
                var bachaValZK = Math.max(0, Number((statsZK.bacha !== undefined ? statsZK.bacha : 0).toFixed(2)));

                if (bachaValZK > 0) {
                    stage3_newZariStock.push({
                        id: "zari_open_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                        name: zName,
                        date: getTodayDate(),
                        aaya: bachaValZK,
                        openingAaya: bachaValZK,
                        gaya: 0,
                        bacha: bachaValZK,
                        karkhanaId: k.id, // 🎯 Godam ki apni alag ID
                        isOpening: true,
                        note: "📦 Opening Stock (" + curSess + " Se Aaya)"
                    });

                    stage3_newZariHistory.push({
                        id: "zhist_open_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                        date: getTodayDate(),
                        name: zName,
                        kariger: "📦 Opening Stock",
                        type: "📦 Opening Stock (" + curSess + " Se Aaya)",
                        aaya: bachaValZK,
                        gaya: 0,
                        karkhanaId: k.id, // 🎯 Godam ki apni alag ID
                        isOpening: true
                    });
                }
            });
        }
    });

    var bar3 = document.getElementById("stage-bar-3");
    var badge3 = document.getElementById("stage-badge-3");
    var mainBar = document.getElementById("transfer-main-bar");
    if (bar3) bar3.style.width = "100%";
    if (mainBar) mainBar.style.width = "60%";
    if (badge3) { badge3.textContent = "✅ Done"; badge3.style.background = "#ecfdf5"; badge3.style.color = "#059669"; }

    setTimeout(function() { runStage4_SanchaAndJobwork(curSess, newSess); }, 100);
}

// ================= STAGE 4: SANCHA & JOB WORK =================
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
    if (mainBar) mainBar.style.width = "80%";
    if (badge4) { badge4.textContent = "✅ Done"; badge4.style.background = "#ecfdf5"; badge4.style.color = "#059669"; }

    setTimeout(function() { commitStage5_Finalize(curSess, newSess); }, 100);
}

// ================= STAGE 5: ⭐ 20-20 MICRO BATCH COMMIT ENGINE =================
var stage5_karigerKeys = [];
var stage5_commitIdx = 0;
var stage5_batchSize = 20; // ⚡ Ek bar mein sirf 20 Kariger save honge (Ultra Safe)

function commitStage5_Finalize(curSess, newSess) {
    var uId = getEffectiveUserId();
    var sessions = getAppSessions();
    if (sessions.indexOf(newSess) === -1) sessions.push(newSess);

    // 1. Core Metadata Save
    safeSetLocalStorage(uId + "_app_sessions_list", sessions);
    safeSetLocalStorage(uId + "_app_active_session", newSess);
    if (typeof APP_MEMORY_CACHE !== "undefined") {
        APP_MEMORY_CACHE[uId + "_app_sessions_list"] = sessions;
        APP_MEMORY_CACHE[uId + "_app_active_session"] = newSess;
    }
    if (typeof idbPut === "function") {
        idbPut(uId + "_app_sessions_list", sessions);
        idbPut(uId + "_app_active_session", newSess);
    }

    var setGeneralStore = function(key, data) {
        var fullKey = uId + "_" + newSess + "_" + key;
        if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE[fullKey] = data;
        if (typeof idbPut === "function") idbPut(fullKey, data);
        safeSetLocalStorage(fullKey, data);
    };

    // General stores save
    setGeneralStore("kariger_list", stage1_oldKarigers);
    setGeneralStore("saree_history", stage2_newSareeHistory);
    setGeneralStore("bana_stock", stage3_newBanaStock);
    setGeneralStore("bana_history", stage3_newBanaHistory);
    setGeneralStore("zari_stock", stage3_newZariStock);
    setGeneralStore("zari_history", stage3_newZariHistory);
    setGeneralStore("sancha_items", stage4_newSanchaItems);
    setGeneralStore("sancha_history", []);
    setGeneralStore("jobwork_workers", stage4_oldJwWorkers);
    for (var wId in stage4_newJwSheetsMap) {
        setGeneralStore("jobwork_sheets_" + wId, stage4_newJwSheetsMap[wId]);
    }
    setGeneralStore("jw_bills_list", []);
    setGeneralStore("jw_payments_list", []);
    setGeneralStore("dukan_transfer_history", []);

    // 2. Base Cloud Payload (General Info)
    if (typeof db !== "undefined" && db && uId && uId !== "app") {
        try {
            var baseBatch = {};
            baseBatch["app_active_session"] = newSess;
            baseBatch["app_sessions_list"] = sessions;
            baseBatch[newSess + "_kariger_list"] = stage1_oldKarigers;
            baseBatch[newSess + "_saree_history"] = stage2_newSareeHistory;
            baseBatch[newSess + "_bana_stock"] = stage3_newBanaStock;
            baseBatch[newSess + "_bana_history"] = stage3_newBanaHistory;
            baseBatch[newSess + "_zari_stock"] = stage3_newZariStock;
            baseBatch[newSess + "_zari_history"] = stage3_newZariHistory;
            baseBatch[newSess + "_sancha_items"] = stage4_newSanchaItems;
            baseBatch[newSess + "_sancha_history"] = [];
            baseBatch[newSess + "_jobwork_workers"] = stage4_oldJwWorkers;
            for (var cWId in stage4_newJwSheetsMap) {
                baseBatch[newSess + "_jobwork_sheets_" + cWId] = stage4_newJwSheetsMap[cWId];
            }
            baseBatch[newSess + "_jw_bills_list"] = [];
            baseBatch[newSess + "_jw_payments_list"] = [];
            baseBatch[newSess + "_dukan_transfer_history"] = [];

            db.ref("users/" + uId).update(baseBatch);
        } catch(e) {}
    }

    // 3. Kariger Sheets ko 20-20 ke Batch me save karne ki tayari
    stage5_karigerKeys = Object.keys(stage1_newKarigerSheetsMap);
    stage5_commitIdx = 0;

    var badge5 = document.getElementById("stage-badge-5");
    if (badge5) {
        badge5.textContent = "⏳ Saving in 20-Batches...";
        badge5.style.background = "#eff6ff";
        badge5.style.color = "#2563eb";
    }

    commitNextKariger20Batch(curSess, newSess, uId);
}

function commitNextKariger20Batch(curSess, newSess, uId) {
    var total = stage5_karigerKeys.length;
    var end = Math.min(stage5_commitIdx + stage5_batchSize, total);

    var cloudMiniBatch = {};

    for (var i = stage5_commitIdx; i < end; i++) {
        var kId = stage5_karigerKeys[i];
        var sheetData = stage1_newKarigerSheetsMap[kId];
        var fullKey = uId + "_" + newSess + "_kariger_sheets_" + kId;

        // Local Memory & IndexedDB
        if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE[fullKey] = sheetData;
        if (typeof idbPut === "function") idbPut(fullKey, sheetData);
        safeSetLocalStorage(fullKey, sheetData);

        // Mini Cloud Batch
        cloudMiniBatch[newSess + "_kariger_sheets_" + kId] = sheetData;
    }

    // Single lightweight call for 20 Karigers
    if (typeof db !== "undefined" && db && uId && uId !== "app") {
        try {
            db.ref("users/" + uId).update(cloudMiniBatch);
        } catch(e) {}
    }

    stage5_commitIdx = end;
    var pct = total > 0 ? Math.floor((stage5_commitIdx / total) * 100) : 100;

    var bar5 = document.getElementById("stage-bar-5");
    var status5 = document.getElementById("stage-status-5");
    var mainBar = document.getElementById("transfer-main-bar");

    if (bar5) bar5.style.width = pct + "%";
    if (status5) status5.textContent = "💾 Saving: " + stage5_commitIdx + " / " + total + " Kariger (" + pct + "%)";
    if (mainBar) mainBar.style.width = (80 + Math.floor(pct * 0.20)) + "%";

    if (stage5_commitIdx < total) {
        // ⚡ 15ms ka break browser ko rendering aur UI free karne ke liye
        setTimeout(function() {
            commitNextKariger20Batch(curSess, newSess, uId);
        }, 15);
    } else {
        // Complete!
        var badge5 = document.getElementById("stage-badge-5");
        if (badge5) {
            badge5.textContent = "✅ Complete";
            badge5.style.background = "#ecfdf5";
            badge5.style.color = "#059669";
        }
        showClosingCelebrationScreen(newSess);
    }
}

// ================= CELEBRATION WISH CARD =================
function showClosingCelebrationScreen(newSess) {
    setTimeout(function() {
        var modal = document.getElementById("session-transfer-modal");
        if (!modal) return;
        var modalBody = modal.querySelector(".modal-body");
        if (modalBody) {
            modalBody.innerHTML = 
                "<div style='text-align:center; padding:15px;'>" +
                    "<div style='font-size:55px; margin-bottom:8px;'>🎉 ✨ 🚀</div>" +
                    "<h2 style='color:#1e3a8a; font-size:22px; font-weight:800; margin-bottom:6px;'>NAYA SAAL MUBARAK HO!</h2>" +
                    "<p style='color:#059669; font-size:14px; font-weight:700;'>Session '" + newSess + "' Safalta-poorvak Shuru Ho Gaya!</p>" +
                    "<div style='background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:14px; margin:16px 0; text-align:left; font-size:13px; display:grid; grid-template-columns:1fr 1fr; gap:8px;'>" +
                        "<div>🧵 <strong>Kariger Carry:</strong> " + stage1_oldKarigers.length + " Kariger Safe</div>" +
                        "<div>🥻 <strong>Saree Opening:</strong> " + stage2_totFreshPcs + " Fresh Pcs</div>" +
                        "<div>🧶 <strong>Bana Items:</strong> " + stage3_newBanaStock.length + " Items Safe</div>" +
                        "<div>✨ <strong>Zari Items:</strong> " + stage3_newZariStock.length + " Items Safe</div>" +
                        "<div>⚙️ <strong>Sancha Stock:</strong> Carry Forward</div>" +
                        "<div>✂️ <strong>Job Work Khata:</strong> Carry Forward</div>" +
                    "</div>" +
                    "<p style='font-size:12px; color:#64748b; margin-bottom:15px;'>* Sabhi godamon ka bacha hua maal unhi ke godam me alag-alag opening stock ban kar live ho chuka hai.</p>" +
                    "<button class='btn' style='background:linear-gradient(135deg, #10b981, #059669); font-size:15px; font-weight:bold; padding:12px; cursor:pointer;' onclick='completeNewSessionStartup(\"" + newSess + "\")'>🚀 Naye Saal Me Kaam Shuru Karein</button>" +
                "</div>";
        }
    }, 300);
}

// ================= COMPLETE STARTUP & RE-ATTACH LISTENERS =================
function completeNewSessionStartup(targetSess) {
    var modal = document.getElementById("session-transfer-modal");
    if (modal) modal.style.display = "none";

    var uId = getEffectiveUserId();
    var s = targetSess || pendingTransferNewSession || getActiveFinancialSession();

    safeSetLocalStorage(uId + "_app_active_session", s);
    if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE[uId + "_app_active_session"] = s;
    if (typeof idbPut === "function") idbPut(uId + "_app_active_session", s);

    populateSessionDropdown();
    var sel = document.getElementById("app-session-select");
    if (sel) sel.value = s;

    if (typeof clearMemoryCache === "function") clearMemoryCache();
    if (typeof APP_MEMORY_CACHE !== "undefined") APP_MEMORY_CACHE[uId + "_app_active_session"] = s;

    // 🔄 RE-ATTACH FIREBASE LIVE LISTENERS
    if (typeof initFirebaseLiveListeners === "function") {
        initFirebaseLiveListeners();
    }

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
