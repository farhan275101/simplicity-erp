/* ========================================================
   SIMPLICITY ERP - KARIGER MASTER, DYNAMIC MULTI-KARKHANA & SESSION ENGINE
   File 2 of 7 • Developed by Farhan Jawed (All Bugs Fixed & Year-End Ready)
======================================================== */

var activeKarigerId = null;
var activeSheetIndex = 0;
var currentKarigerKarkhanaFilter = "all"; // "all" ya specific karkhanaId

// ================= 1. 📅 FINANCIAL YEAR SESSION SYSTEM (1 APRIL CLOSING) =================

function getAppSessions() {
    var list = safeArray(getStore("app_sessions_list"));
    if (!list.length) {
        list = ["2026-2027"];
        setStore("app_sessions_list", list);
    }
    return list;
}

function getActiveFinancialSession() {
    var userKey = (currentUserId || "app") + "_app_active_session";
    var sess = localStorage.getItem(userKey);
    if (!sess) {
        var storeSess = getStore("app_active_session");
        if (storeSess && typeof storeSess === "string") {
            sess = storeSess;
        } else {
            var list = getAppSessions();
            sess = list[list.length - 1] || "2026-2027";
        }
        localStorage.setItem(userKey, sess);
        setStore("app_active_session", sess);
    }
    return sess;
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
        opt.textContent = s;
        if (String(s) === String(activeSess)) {
            opt.selected = true;
        }
        sel.appendChild(opt);
    });
}

function switchAppFinancialSession(targetSession) {
    var activeSess = getActiveFinancialSession();
    if (!targetSession || targetSession === activeSess) return;

    if (!confirm("Kya aap Session badal kar '" + targetSession + "' me jana chahte hain?")) {
        populateSessionDropdown();
        return;
    }

    // 1. Current Session Data ko Backup karein
    backupCurrentSessionData(activeSess);

    // 2. Target Session Data ko Load karein
    restoreSessionData(targetSession);

    var userKey = (currentUserId || "app") + "_app_active_session";
    localStorage.setItem(userKey, targetSession);
    setStore("app_active_session", targetSession);
    populateSessionDropdown();

    // Re-render all views safely
    if (typeof renderKarigerKarkhanaTabs === "function") renderKarigerKarkhanaTabs();
    if (typeof renderKarigerTable === "function") renderKarigerTable();
    if (typeof renderStockKarkhanaTabs === "function") renderStockKarkhanaTabs();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();

    alert("📅 Session badal gaya: Ab aap '" + targetSession + "' me hain!");
}

function backupCurrentSessionData(sessionName) {
    var snapshot = {
        kariger_list: getStore("kariger_list"),
        karkhana_list: getStore("karkhana_list"),
        bana_stock: getStore("bana_stock"),
        zari_stock: getStore("zari_stock"),
        saree_stock: getStore("saree_stock"),
        finished_saree_stock: getStore("finished_saree_stock"),
        lott_saree_stock: getStore("lott_saree_stock"),
        jw_bills_list: getStore("jw_bills_list"),
        jw_payments_list: getStore("jw_payments_list"),
        saree_history: getStore("saree_history"),
        bana_history: getStore("bana_history"),
        zari_history: getStore("zari_history"),
        material_transfers: getStore("material_transfers"),
        saree_transfers: getStore("saree_transfers")
    };

    // Kariger sheets backup
    var karigers = safeArray(getStore("kariger_list"));
    var sheetsMap = {};
    karigers.forEach(function(k) {
        if (k && k.id) {
            sheetsMap[k.id] = getStore("kariger_sheets_" + k.id);
        }
    });
    snapshot.sheetsMap = sheetsMap;

    setStore("session_backup_" + sessionName, snapshot);
}

function restoreSessionData(targetSession) {
    var snapshot = getStore("session_backup_" + targetSession);
    if (!snapshot || typeof snapshot !== "object") return;

    setStore("kariger_list", snapshot.kariger_list || []);
    setStore("karkhana_list", snapshot.karkhana_list || []);
    setStore("bana_stock", snapshot.bana_stock || []);
    setStore("zari_stock", snapshot.zari_stock || []);
    setStore("saree_stock", snapshot.saree_stock || []);
    setStore("finished_saree_stock", snapshot.finished_saree_stock || []);
    setStore("lott_saree_stock", snapshot.lott_saree_stock || []);
    setStore("jw_bills_list", snapshot.jw_bills_list || []);
    setStore("jw_payments_list", snapshot.jw_payments_list || []);
    setStore("saree_history", snapshot.saree_history || []);
    setStore("bana_history", snapshot.bana_history || []);
    setStore("zari_history", snapshot.zari_history || []);
    setStore("material_transfers", snapshot.material_transfers || []);
    setStore("saree_transfers", snapshot.saree_transfers || []);

    if (snapshot.sheetsMap) {
        for (var kId in snapshot.sheetsMap) {
            setStore("kariger_sheets_" + kId, snapshot.sheetsMap[kId]);
        }
    }
}

function openSessionClosingModal() {
    populateSessionDropdown();
    var cur = getActiveFinancialSession();
    var curInp = document.getElementById("session-current-display");
    if (curInp) curInp.value = cur;

    // Suggest Next Year (Jaise 2026-2027 -> 2027-2028)
    var parts = String(cur).split("-");
    var nextYear = "";
    if (parts.length === 2 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1]))) {
        nextYear = (parseInt(parts[0]) + 1) + "-" + (parseInt(parts[1]) + 1);
    } else {
        nextYear = "2027-2028";
    }

    var newInp = document.getElementById("session-new-input");
    if (newInp) newInp.value = nextYear;

    setDisplay("session-closing-modal", "flex");
}

function closeSessionClosingModal() {
    setDisplay("session-closing-modal", "none");
}

// 🚀 1 APRIL YEAR-END CLOSING PROCESS (CARRY FORWARD CLOSING TO OPENING)
function executeYearEndClosingProcess() {
    var curSess = getActiveFinancialSession();
    var newSessEl = document.getElementById("session-new-input");
    var newSess = (newSessEl ? newSessEl.value : "").trim();

    if (!newSess) return alert("Naye Saal (Session) ka naam daalein!");
    if (newSess === curSess) return alert("Naya session purane se alag hona chahiye!");

    var sessions = getAppSessions();
    if (sessions.indexOf(newSess) !== -1) {
        return alert("Ye Session '" + newSess + "' pehle se bana hua hai! Upar dropdown se switch karein.");
    }

    if (!confirm("⚠️ KYA AAP 1 APRIL / YEAR-END CLOSING CHALU KARNA CHAHTE HAIN?\n\n• Purana saal (" + curSess + ") hamesha ke liye सुरक्षित (Locked) ho jayega.\n• Sabhi Karigaron ki closing nayi Tani 1 me OPENING ban jayegi.\n• Sabhi Stock ka bacha hua maal naye saal ka OPENING STOCK ban jayegi.\n• Naye saal me app bilkul halka aur fresh khulega!")) {
        return;
    }

    // STEP 1: Purane saal ka pura backup lein
    backupCurrentSessionData(curSess);

    // STEP 2: Naye saal ke liye Opening Balances calculate karein
    var karigers = safeArray(getStore("kariger_list"));
    karigers.forEach(function(k) {
        if (!k || !k.id) return;
        var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
        var lastSheet = sheets.length ? sheets[sheets.length - 1] : null;
        var calc = (lastSheet && typeof calculateSheetTotals === "function")
            ? calculateSheetTotals(lastSheet)
            : { remainingBana: 0, remainingZari: 0, remainingAmt: 0 };

        // Naye saal me sirf 1 Tani Sheet khulegi (Exact Opening Balance ke sath)
        var newSheet = [{
            id: "tani_1",
            title: "Tani 1 (Opening " + newSess + ")",
            pichlaBana: Number((calc.remainingBana || 0).toFixed(2)),
            pichlaZari: Number((calc.remainingZari || 0).toFixed(2)),
            pichlaBani: Number((calc.remainingAmt || 0).toFixed(2)),
            rateBana: lastSheet ? (Number(lastSheet.rateBana) || 0.311) : 0.311,
            rateZari: lastSheet ? (Number(lastSheet.rateZari) || 0.110) : 0.110,
            rateBani: lastSheet ? (Number(lastSheet.rateBani) || 240) : 240,
            note: "Year-End Opening Balance from " + curSess,
            rows: []
        }];
        if (typeof saveKarigerSheets === "function") {
            saveKarigerSheets(k.id, newSheet);
        }
    });

    // STEP 3: SAREE STOCKS CARRY FORWARD
    var freshTotalPcs = 0;
    safeArray(getStore("saree_stock")).forEach(function(s) { freshTotalPcs += (Number(s.pcs) || 0); });
    var newSareeStock = [];
    if (freshTotalPcs > 0) {
        newSareeStock.push({
            id: "saree_open_" + Date.now(),
            date: getTodayDate(),
            name: "Fresh Saree Opening Stock",
            kariger: "Opening Balance (" + curSess + ")",
            karkhanaId: "k_main",
            karkhanaName: "Main Godown",
            pcs: freshTotalPcs,
            outPcs: 0
        });
    }
    setStore("saree_stock", newSareeStock);

    // Finished Calender Saree Opening
    var finTotalPcs = 0;
    safeArray(getStore("finished_saree_stock")).forEach(function(f) { finTotalPcs += (Number(f.pcs) || 0); });
    var newFinStock = [];
    if (finTotalPcs > 0) {
        newFinStock.push({
            id: "fin_open_" + Date.now(),
            date: getTodayDate(),
            name: "Calender Finished Saree",
            source: "Opening Balance (" + curSess + ")",
            pcs: finTotalPcs
        });
    }
    setStore("finished_saree_stock", newFinStock);

    // Lott Saree Opening
    var lottTotalPcs = 0;
    safeArray(getStore("lott_saree_stock")).forEach(function(l) { lottTotalPcs += (Number(l.pcs) || 0); });
    var newLottStock = [];
    if (lottTotalPcs > 0) {
        newLottStock.push({
            id: "lott_open_" + Date.now(),
            date: getTodayDate(),
            name: "Damage Saree Opening Stock",
            source: "Opening Balance (" + curSess + ")",
            pcs: lottTotalPcs
        });
    }
    setStore("lott_saree_stock", newLottStock);

    // STEP 4: BANA & ZARI STOCK CARRY FORWARD (Safe with fallback)
    var banaItems = safeArray(getStore("bana_stock"));
    var newBanaStock = [];
    banaItems.forEach(function(b) {
        if (!b || !b.name) return;
        var bachaQty = Number(b.bacha || b.aaya || 0);
        if (typeof getBanaItemStats === "function") {
            try {
                bachaQty = getBanaItemStats(b.name, "k_main").bacha;
            } catch(e) {}
        }
        if (bachaQty > 0) {
            newBanaStock.push({
                id: Date.now() + Math.random(),
                name: b.name,
                date: getTodayDate(),
                aaya: Number(bachaQty.toFixed(2)),
                gaya: 0,
                bacha: Number(bachaQty.toFixed(2))
            });
        }
    });
    setStore("bana_stock", newBanaStock);

    var zariItems = safeArray(getStore("zari_stock"));
    var newZariStock = [];
    zariItems.forEach(function(z) {
        if (!z || !z.name) return;
        var bachaQty = Number(z.bacha || z.aaya || 0);
        if (typeof getZariItemStats === "function") {
            try {
                bachaQty = getZariItemStats(z.name, "k_main").bacha;
            } catch(e) {}
        }
        if (bachaQty > 0) {
            newZariStock.push({
                id: Date.now() + Math.random(),
                name: z.name,
                date: getTodayDate(),
                aaya: Number(bachaQty.toFixed(2)),
                gaya: 0,
                bacha: Number(bachaQty.toFixed(2))
            });
        }
    });
    setStore("zari_stock", newZariStock);

    // STEP 5: JOB WORK PENDING BILLS CARRY FORWARD (Only Unpaid bills remain)
    var pendingBills = safeArray(getStore("jw_bills_list")).filter(function(b) {
        var baki = Math.max(0, (Number(b.billAmt) || 0) - (Number(b.paidAmt) || 0));
        return baki > 0;
    });
    setStore("jw_bills_list", pendingBills);
    setStore("jw_payments_list", []);

    // Clean Daily Histories for New Year
    setStore("saree_history", []);
    setStore("bana_history", []);
    setStore("zari_history", []);
    setStore("material_transfers", []);
    setStore("saree_transfers", []);

    // STEP 6: Sessions List me naya saal jod kar activate karein
    sessions.push(newSess);
    setStore("app_sessions_list", sessions);

    var userKey = (currentUserId || "app") + "_app_active_session";
    localStorage.setItem(userKey, newSess);
    setStore("app_active_session", newSess);

    closeSessionClosingModal();
    populateSessionDropdown();

    // Refresh UI
    if (typeof renderKarigerKarkhanaTabs === "function") renderKarigerKarkhanaTabs();
    if (typeof renderKarigerTable === "function") renderKarigerTable();
    if (typeof renderStockKarkhanaTabs === "function") renderStockKarkhanaTabs();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();

    alert("🎉 MUBARAK HO! 1 April Year-End Closing safalta-purvak poori hui!\n\nNaya Saal '" + newSess + "' bilkul fresh aur opening balance ke sath chalu ho gaya hai!");
}

// ================= 2. DYNAMIC KARKHANA MASTER (ADD, EDIT & SYNC) =================

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

// SAVE & AUTO-UPDATE KARIGER KARKHANA NAME ON EDIT
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

            // AUTO-SYNC: Purane sabhi Karigaron par naya Karkhana Name update karein
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
    alert("✅ Karkhana save ho gaya aur karigaron ke sath sync ho gaya!");
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

// DELETE PROTECTION: Shift karigers to Main Godown
function deleteKarkhanaFromManager(id) {
    var k = getKarkhanas().find(function(x) { return String(x.id) === String(id); });
    if (!k || k.isDefault) return alert("Default Godown delete nahi ho sakta!");

    if (!confirm("⚠️ Kya aap '" + k.name + "' ko delete karna chahte hain?\nIs karkhane ke sabhi kariger safe hokar 'Main Godown' me shift ho jayenge.")) return;

    // Shift karigers safely
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
    alert("🗑️ Karkhana delete ho gaya aur sabhi kariger Main Godown me shift ho gaye!");
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

// 🎯 MASTER CASCADING DELETE: DELETES ROW FROM SHEET WHEN DELETED FROM PASSBOOK
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

    toggleKarigerForm();
    document.getElementById("kar-edit-id").value = k.id;
    document.getElementById("kar-name").value = k.name;
    document.getElementById("kar-saree").value = k.saree || "";
    document.getElementById("kar-date").value = k.date || getTodayDate();

    if (document.getElementById("kar-karkhana") && k.karkhanaId) {
        document.getElementById("kar-karkhana").value = k.karkhanaId;
    }

    document.getElementById("kar-save-btn").textContent = "Update Kariger";
    setDisplay("kar-cancel-btn", "inline-block");
}

function deleteKariger(id) {
    if (!confirm("Kya aap is Kariger ko delete karna chahte hain?")) return;
    saveKarigerList(sanitizeKarigerList().filter(function(x) { return String(x.id) !== String(id); }));
    renderKarigerKarkhanaTabs();
    renderKarigerTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function filterInactiveKarigers() {
    renderKarigerTable();
}

function searchKariger() {
    renderKarigerTable();
}

function renderKarigerTable() {
    var tbody = document.getElementById("kariger-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var list = sanitizeKarigerList();

    if (currentKarigerKarkhanaFilter !== "all") {
        list = list.filter(function(k) {
            return String(k.karkhanaId) === String(currentKarigerKarkhanaFilter) || (!k.karkhanaId && currentKarigerKarkhanaFilter === "k_main");
        });
    }

    var txt = (document.getElementById("search-kariger-input") && document.getElementById("search-kariger-input").value || "").toLowerCase().trim();
    if (txt) {
        list = list.filter(function(k) {
            return (String(k.name || "") + " " + String(k.saree || "") + " " + String(k.karkhanaName || "")).toLowerCase().indexOf(txt) !== -1;
        });
    }

    var minDays = parseInt(document.getElementById("kariger-absent-filter") && document.getElementById("kariger-absent-filter").value || 0) || 0;
    if (minDays > 0) {
        list = list.filter(function(k) {
            return getKarigerLastActiveInfo(k.id).daysAbsent >= minDays;
        });
    }

    if (!list.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Koi Kariger nahi mila.</td></tr>";
        return;
    }

    list.forEach(function(k) {
        var act = getKarigerLastActiveInfo(k.id);
        var statusBadge = "";
        if (act.daysAbsent >= 30) {
            statusBadge = "<span class='badge-red' style='font-size:11px;'>⚠️ " + act.daysAbsent + " Din se nahi aaye</span>";
        } else if (act.daysAbsent >= 15) {
            statusBadge = "<span style='background:#fff7ed; color:#ea580c; border:1px solid #fed7aa; padding:3px 7px; border-radius:20px; font-weight:700; font-size:11px;'>🟠 " + act.daysAbsent + " Din hue</span>";
        } else {
            statusBadge = "<span class='badge-green' style='font-size:11px;'>🟢 Active</span>";
        }

        var kNameBadge = "<span class='badge-blue' style='font-size:11px; font-weight:700;'>🏭 " + (k.karkhanaName || "Main Godown") + "</span>";

        tbody.innerHTML += "<tr>" +
            "<td>" + kNameBadge + "</td>" +
            "<td><strong>" + k.name + "</strong></td>" +
            "<td>" + (k.saree || "-") + "</td>" +
            "<td>" + formatDateDisplay(act.lastDate) + "</td>" +
            "<td>" + statusBadge + "</td>" +
            "<td style='text-align:center;'><button class='sheet-btn' onclick='openKarigerSheet(\"" + k.id + "\")'>📊 Khata Sheet</button> <button class='edit-btn' onclick='editKariger(\"" + k.id + "\")'>✏️</button> <button class='delete-btn' onclick='deleteKariger(\"" + k.id + "\")'>🗑️</button></td>" +
        "</tr>";
    });
}

// ================= 5. KARIGER KHATA SHEET ENGINE =================

function openKarigerSheet(id) {
    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(id); });
    if (!k) return alert("Kariger nahi mila!");

    activeKarigerId = k.id;
    activeSheetIndex = 0;

    document.getElementById("sheet-banner-name").textContent = k.name + " • 🏭 " + (k.karkhanaName || "Main Godown") + " (Khata Sheet)";

    var dToday = getTodayDate();
    if (document.getElementById("line-date")) document.getElementById("line-date").value = dToday;

    var sheets = getKarigerSheets(activeKarigerId);
    if (!sheets || !sheets.length) {
        sheets = [{
            id: "tani_1",
            title: "Tani 1",
            pichlaBana: 0,
            pichlaZari: 0,
            pichlaBani: 0,
            rateBana: 0.311,
            rateZari: 0.110,
            rateBani: 240,
            note: "",
            rows: []
        }];
        saveKarigerSheets(activeKarigerId, sheets);
    }

    setDisplay("kariger-section", "none");
    setDisplay("kariger-sheet-section", "block");

    renderKarigerSheetTabs();
    loadCurrentSheetData();
}

function closeKarigerSheet() {
    activeKarigerId = null;
    setDisplay("kariger-sheet-section", "none");
    setDisplay("kariger-section", "block");
    renderKarigerTable();
}

function renderKarigerSheetTabs() {
    var sheets = getKarigerSheets(activeKarigerId);
    var box = document.getElementById("tani-tabs-container");
    if (!box) return;
    box.innerHTML = "";

    sheets.forEach(function(sh, idx) {
        if (!sh) return;
        var btn = document.createElement("button");
        btn.className = "sheet-tab" + (idx === activeSheetIndex ? " active" : "");
        btn.innerHTML = sh.title + (sheets.length > 1 ? "<span class='del-tab-btn' onclick='deleteTaniSheet(" + idx + ", event)'> ×</span>" : "");
        btn.onclick = function() { switchTaniSheetTab(idx); };
        box.appendChild(btn);
    });
}

function switchTaniSheetTab(idx) {
    activeSheetIndex = idx;
    renderKarigerSheetTabs();
    loadCurrentSheetData();
}

function addNewTaniSheet() {
    var sheets = getKarigerSheets(activeKarigerId);
    var cur = sheets[activeSheetIndex] || sheets[sheets.length - 1];
    var calc = cur ? calculateSheetTotals(cur) : { remainingBana: 0, remainingZari: 0, remainingAmt: 0 };

    var nextNum = sheets.length + 1;
    var newS = {
        id: "tani_" + nextNum,
        title: "Tani " + nextNum,
        pichlaBana: Number(calc.remainingBana.toFixed(2)),
        pichlaZari: Number(calc.remainingZari.toFixed(2)),
        pichlaBani: Number(calc.remainingAmt.toFixed(2)),
        rateBana: cur ? (Number(cur.rateBana) || 0.311) : 0.311,
        rateZari: cur ? (Number(cur.rateZari) || 0.110) : 0.110,
        rateBani: cur ? (Number(cur.rateBani) || 240) : 240,
        note: "",
        rows: []
    };

    sheets.push(newS);
    saveKarigerSheets(activeKarigerId, sheets);
    activeSheetIndex = sheets.length - 1;

    renderKarigerSheetTabs();
    loadCurrentSheetData();
    alert("✅ Nayi Tani Sheet jud gayi! Pichla hisab carry-forward ho gaya.");
}

function deleteTaniSheet(idx, e) {
    if (e) e.stopPropagation();
    var sheets = getKarigerSheets(activeKarigerId);
    if (sheets.length <= 1) return alert("Pehli Tani Sheet delete nahi ho sakti!");
    if (!confirm("Kya aap is Tani Sheet ko delete karna chahte hain?")) return;

    sheets.splice(idx, 1);
    saveKarigerSheets(activeKarigerId, sheets);
    activeSheetIndex = 0;
    renderKarigerSheetTabs();
    loadCurrentSheetData();
}

function loadCurrentSheetData() {
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex] || sheets[0];
    if (!sh) return;

    document.getElementById("sheet-active-badge").textContent = sh.title;
    document.getElementById("tani-bana").value = sh.pichlaBana || 0;
    document.getElementById("tani-zari").value = sh.pichlaZari || 0;
    document.getElementById("tani-bani").value = sh.pichlaBani || 0;
    document.getElementById("tani-note").value = sh.note || "";

    document.getElementById("rate-bana").value = sh.rateBana || 0.311;
    document.getElementById("rate-zari").value = sh.rateZari || 0.110;
    document.getElementById("rate-bani").value = sh.rateBani || 240;

    renderSheetTable(sh);
    if (typeof updateLiveStockDisplay === "function") updateLiveStockDisplay();
}

function saveCurrentSheetConfig() {
    if (!activeKarigerId) return;
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    if (!sh) return;

    sh.pichlaBana = parseFloat(document.getElementById("tani-bana").value) || 0;
    sh.pichlaZari = parseFloat(document.getElementById("tani-zari").value) || 0;
    sh.pichlaBani = parseFloat(document.getElementById("tani-bani").value) || 0;
    sh.note = document.getElementById("tani-note").value || "";

    sh.rateBana = parseFloat(document.getElementById("rate-bana").value) || 0.311;
    sh.rateZari = parseFloat(document.getElementById("rate-zari").value) || 0.110;
    sh.rateBani = parseFloat(document.getElementById("rate-bani").value) || 240;

    saveKarigerSheets(activeKarigerId, sheets);
    renderSheetTable(sh);
}

function calculateSheetTotals(sh) {
    var def = {
        totSaree: 0,
        totLott: 0,
        netSaree: 0,
        grossBani: 0,
        totPaid: 0,
        remainingAmt: 0,
        totBana: 0,
        retBana: 0,
        banaConsumption: 0,
        remainingBana: 0,
        totZari: 0,
        retZari: 0,
        zariConsumption: 0,
        remainingZari: 0
    };

    if (!sh || typeof sh !== "object") return def;

    var saree = 0, lott = 0, paid = 0;
    var netB = 0, retB = 0;
    var netZ = 0, retZ = 0;

    safeArray(sh.rows).forEach(function(r) {
        if (!r) return;
        saree += (Number(r.saree) || 0);
        lott += (Number(r.lott) || 0);
        paid += (Number(r.paid) || 0);
        netB += (Number(r.netBana) || 0);
        retB += (Number(r.retBana) || 0);
        netZ += (Number(r.netZari) || 0);
        retZ += (Number(r.retZari) || 0);
    });

    var netSaree = Math.max(0, saree - lott);
    var rateBani = Number(sh.rateBani) || 240;
    var grossBani = netSaree * rateBani;
    var pichlaBani = Number(sh.pichlaBani) || 0;
    var remAmt = (grossBani + pichlaBani) - paid;

    var rateB = Number(sh.rateBana) || 0.311;
    var banaCons = saree * rateB;
    var pichlaB = Number(sh.pichlaBana) || 0;
    var remBana = (pichlaB + netB) - (retB + banaCons);

    var rateZ = Number(sh.rateZari) || 0.110;
    var zariCons = saree * rateZ;
    var pichlaZ = Number(sh.pichlaZari) || 0;
    var remZari = (pichlaZ + netZ) - (retZ + zariCons);

    return {
        totSaree: saree,
        totLott: lott,
        netSaree: netSaree,
        grossBani: grossBani,
        totPaid: paid,
        remainingAmt: remAmt,
        totBana: netB,
        retBana: retB,
        banaConsumption: banaCons,
        remainingBana: remBana,
        totZari: netZ,
        retZari: retZ,
        zariConsumption: zariCons,
        remainingZari: remZari
    };
}

function addSheetLineRow() {
    if (!activeKarigerId) return;
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    if (!sh) return;

    var kariger = sanitizeKarigerList().find(function(x) { return String(x.id) === String(activeKarigerId); });
    var kName = kariger ? kariger.name : "Kariger";
    var kKarkhanaId = kariger ? (kariger.karkhanaId || "k_main") : "k_main";
    var kKarkhanaName = kariger ? (kariger.karkhanaName || "Main Godown") : "Main Godown";

    var d = document.getElementById("line-date").value || getTodayDate();
    var saree = parseInt(document.getElementById("line-saree").value) || 0;
    var sancha = (document.getElementById("line-entry-sancha").value || "").trim();
    var taniName = (document.getElementById("line-tani-name").value || "").trim();
    var taniWazan = parseFloat(document.getElementById("line-tani-wazan").value) || 0;

    var bCone = parseFloat(document.getElementById("line-bana-cone").value) || 0;
    var bTp = parseFloat(document.getElementById("line-bana-tp").value) || 0;
    var bLess = parseFloat(document.getElementById("line-bana-less").value) || 0;
    var netBana = Math.max(0, (bCone + bTp) - bLess);

    var zQty = parseFloat(document.getElementById("line-zari").value) || 0;
    var zTp = parseFloat(document.getElementById("line-zari-tp").value) || 0;
    var zTopi = parseFloat(document.getElementById("line-zari-topi").value) || 0;
    var netZari = Math.max(0, (zQty + zTp) - zTopi);

    var paid = parseFloat(document.getElementById("line-paid").value) || 0;
    var lott = parseInt(document.getElementById("line-lott").value) || 0;
    var retBana = parseFloat(document.getElementById("line-ret-bana").value) || 0;
    var retZari = parseFloat(document.getElementById("line-ret-zari").value) || 0;

    var banaItem = (document.getElementById("line-bana-name").value || "").trim();
    var zariItem = (document.getElementById("line-zari-name").value || "").trim();

    var rowId = "row_" + Date.now();

    var newRow = {
        id: rowId,
        date: d,
        saree: saree,
        sancha: sancha,
        taniName: taniName,
        taniWazan: taniWazan,
        netBana: netBana,
        netZari: netZari,
        paid: paid,
        lott: lott,
        retBana: retBana,
        retZari: retZari,
        banaItemName: banaItem,
        zariItemName: zariItem,
        karkhanaId: kKarkhanaId,
        karkhanaName: kKarkhanaName
    };

    sh.rows = safeArray(sh.rows);
    sh.rows.push(newRow);
    saveKarigerSheets(activeKarigerId, sheets);

    // 1. Saree Stock auto-entry
    if (saree > 0) {
        var sStock = safeArray(getStore("saree_stock"));
        sStock.push({
            id: "saree_" + Date.now(),
            refId: rowId,
            date: d,
            name: (kariger ? kariger.saree : "Saree") || "Fresh Saree",
            kariger: kName,
            karkhanaId: kKarkhanaId,
            karkhanaName: kKarkhanaName,
            pcs: saree,
            outPcs: 0
        });
        setStore("saree_stock", sStock);

        var sH = safeArray(getStore("saree_history"));
        sH.push({
            id: "sh_" + Date.now(),
            refId: rowId,
            date: d,
            name: (kariger ? kariger.saree : "Saree") || "Fresh Saree",
            kariger: kName + " (" + kKarkhanaName + ")",
            type: "In (Kariger Weave)",
            pcs: saree,
            note: "Loom se tayyar aayi"
        });
        setStore("saree_history", sH);
    }

    // 2. Lott Saree Stock
    if (lott > 0) {
        var lottStock = safeArray(getStore("lott_saree_stock"));
        lottStock.push({
            id: "lott_" + Date.now(),
            refId: rowId,
            date: d,
            name: "Lott Saree",
            source: kName + " (" + kKarkhanaName + ")",
            karkhanaId: kKarkhanaId,
            karkhanaName: kKarkhanaName,
            pcs: lott
        });
        setStore("lott_saree_stock", lottStock);
    }

    // Reset inputs
    document.getElementById("line-saree").value = "";
    document.getElementById("line-tani-wazan").value = "";
    document.getElementById("line-bana-cone").value = "";
    document.getElementById("line-bana-tp").value = "";
    document.getElementById("line-bana-less").value = "";
    document.getElementById("line-zari").value = "";
    document.getElementById("line-zari-tp").value = "";
    document.getElementById("line-zari-topi").value = "";
    document.getElementById("line-paid").value = "";
    document.getElementById("line-lott").value = "";
    document.getElementById("line-ret-bana").value = "";
    document.getElementById("line-ret-zari").value = "";

    renderSheetTable(sh);
    if (typeof updateLiveStockDisplay === "function") updateLiveStockDisplay();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();
    alert("✅ Line jud gayi aur " + kKarkhanaName + " ke hisab me darj ho gayi!");
}

function deleteSheetLineRow(idx) {
    if (!confirm("Kya aap is line entry ko delete karna chahte hain?")) return;

    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    if (!sh) return;

    sh.rows = safeArray(sh.rows);
    var r = sh.rows[idx];
    if (!r) return;

    // Clean linked Saree Stock
    if (Number(r.saree) > 0) {
        var sStock = safeArray(getStore("saree_stock")).filter(function(x) {
            return !x || String(x.refId) !== String(r.id);
        });
        setStore("saree_stock", sStock);

        var sH = safeArray(getStore("saree_history")).filter(function(h) {
            return !h || String(h.refId) !== String(r.id);
        });
        setStore("saree_history", sH);
    }

    // Clean linked Lott Stock
    if (Number(r.lott) > 0) {
        var lStock = safeArray(getStore("lott_saree_stock")).filter(function(x) {
            return !x || String(x.refId) !== String(r.id);
        });
        setStore("lott_saree_stock", lStock);
    }

    sh.rows.splice(idx, 1);
    saveKarigerSheets(activeKarigerId, sheets);

    renderSheetTable(sh);
    if (typeof updateLiveStockDisplay === "function") updateLiveStockDisplay();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();
    alert("🗑️ Line delete ho gayi!");
}

function renderSheetTable(sh) {
    var tbody = document.getElementById("sheet-rows-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var rows = safeArray(sh.rows);
    var totS = 0, totW = 0, totB = 0, totZ = 0, totP = 0, totL = 0, totRB = 0, totRZ = 0;

    if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan='12' style='text-align:center; padding:15px; color:#888;'>Is Tani me koi entry nahi hai. Upar se line jodein.</td></tr>";
    } else {
        rows.forEach(function(r, idx) {
            if (!r) return;
            totS += (Number(r.saree) || 0);
            totW += (Number(r.taniWazan) || 0);
            totB += (Number(r.netBana) || 0);
            totZ += (Number(r.netZari) || 0);
            totP += (Number(r.paid) || 0);
            totL += (Number(r.lott) || 0);
            totRB += (Number(r.retBana) || 0);
            totRZ += (Number(r.retZari) || 0);

            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(r.date) + "</td>" +
                "<td><strong style='color:#2563eb;'>" + (r.saree || "-") + "</strong></td>" +
                "<td>" + (r.sancha || "-") + "</td>" +
                "<td>" + (r.taniName || "-") + "</td>" +
                "<td>" + (r.taniWazan || "-") + "</td>" +
                "<td><strong style='color:#059669;'>" + (r.netBana ? Number(r.netBana).toFixed(2) : "-") + "</strong></td>" +
                "<td><strong style='color:#ea580c;'>" + (r.netZari ? Number(r.netZari).toFixed(2) : "-") + "</strong></td>" +
                "<td>" + (r.paid ? ("₹ " + r.paid) : "-") + "</td>" +
                "<td>" + (r.lott ? ("⚠️ " + r.lott) : "-") + "</td>" +
                "<td>" + (r.retBana || "-") + "</td>" +
                "<td>" + (r.retZari || "-") + "</td>" +
                "<td style='text-align:center;'><button class='delete-btn' onclick='deleteSheetLineRow(" + idx + ")'>🗑️</button></td>" +
            "</tr>";
        });
    }

    var setEl = function(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setEl("tot-saree", totS);
    setEl("tot-tani-wazan", totW.toFixed(2));
    setEl("tot-bana-net", totB.toFixed(2));
    setEl("tot-zari-net", totZ.toFixed(2));
    setEl("tot-paid", "₹ " + totP);
    setEl("tot-lott", totL);
    setEl("tot-ret-bana", totRB.toFixed(2));
    setEl("tot-ret-zari", totRZ.toFixed(2));

    var c = calculateSheetTotals(sh);

    setEl("calc-tot-saree", c.totSaree);
    setEl("calc-tot-lott", "- " + c.totLott);
    setEl("calc-net-saree", c.netSaree);
    setEl("calc-bani-rate", "₹ " + (sh.rateBani || 240));
    setEl("calc-gross-bani", "₹ " + c.grossBani.toFixed(2));
    setEl("calc-last-tani-bani", "+ ₹ " + (sh.pichlaBani || 0));
    setEl("calc-tot-paid", "- ₹ " + c.totPaid.toFixed(2));
    setEl("calc-remaining-amt", "₹ " + c.remainingAmt.toFixed(2));

    setEl("calc-last-tani-bana", (sh.pichlaBana || 0));
    setEl("calc-tot-bana", c.totBana.toFixed(2));
    setEl("calc-ret-bana", "- " + c.retBana.toFixed(2));
    setEl("calc-bana-consumption", c.banaConsumption.toFixed(2));
    setEl("calc-remaining-bana", c.remainingBana.toFixed(2));

    setEl("calc-last-tani-zari", (sh.pichlaZari || 0));
    setEl("calc-tot-zari", c.totZari.toFixed(2));
    setEl("calc-ret-zari", "- " + c.retZari.toFixed(2));
    setEl("calc-zari-consumption", c.zariConsumption.toFixed(2));
    setEl("calc-remaining-zari", c.remainingZari.toFixed(2));
}

// 🎯 LIVE STOCK BADGE FIX
function updateLiveStockDisplay() {
    var bName = (document.getElementById("line-bana-name") && document.getElementById("line-bana-name").value || "").trim();
    var zName = (document.getElementById("line-zari-name") && document.getElementById("line-zari-name").value || "").trim();

    var elB = document.getElementById("live-bana-stock-badge");
    var elZ = document.getElementById("live-zari-stock-badge");

    var kariger = sanitizeKarigerList().find(function(x) { return String(x.id) === String(activeKarigerId); });
    var kId = kariger ? (kariger.karkhanaId || "k_main") : "k_main";

    if (elB && typeof getBanaItemStats === "function") {
        try {
            var stB = getBanaItemStats(bName, kId);
            elB.textContent = "Bacha: " + Number(stB.bacha || 0).toFixed(2) + " Kg";
        } catch(e) {}
    }

    if (elZ && typeof getZariItemStats === "function") {
        try {
            var stZ = getZariItemStats(zName, kId);
            elZ.textContent = "Bacha: " + Number(stZ.bacha || 0).toFixed(2) + " Kg";
        } catch(e) {}
    }
}

// ================= 6. WHATSAPP HISAB PARCHI =================

function shareSheetOnWhatsApp() {
    if (!activeKarigerId) return alert("Pehle koi Khata Sheet kholein!");

    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(activeKarigerId); });
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    if (!k || !sh) return alert("Data nahi mila!");

    var c = calculateSheetTotals(sh);

    var text = "🧾 *SIMPLICITY KARIGER KHATA PARCHI* 🧾\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "👤 *Kariger:* " + k.name + "\n";
    text += "🏭 *Karkhana:* " + (k.karkhanaName || "Main Godown") + "\n";
    text += "🧵 *Saree:* " + (k.saree || "-") + "\n";
    text += "📑 *Sheet:* " + sh.title + "\n";
    text += "📅 *Tarikh:* " + formatDateDisplay(getTodayDate()) + "\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "💰 *MAZDOORI HISAB:*\n";
    text += "• Kul Saree Aayi: " + c.totSaree + " Pcs\n";
    if (c.totLott > 0) text += "• Damage / Lott: -" + c.totLott + " Pcs\n";
    text += "• Net Saree: *" + c.netSaree + " Pcs*\n";
    text += "• Bani Rate: ₹" + (sh.rateBani || 240) + " / Saree\n";
    text += "• Gross Bani: ₹" + c.grossBani.toFixed(2) + "\n";
    if (sh.pichlaBani) text += "• Pichla Baki: +₹" + sh.pichlaBani + "\n";
    text += "• Paid (Diya): -₹" + c.totPaid.toFixed(2) + "\n";
    text += "-------------------------------------\n";
    text += "🔴 *FINAL BAKI RUPAYE:* *₹ " + c.remainingAmt.toFixed(2) + "*\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "🧶 *BANA HISAB:*\n";
    text += "• Diya: " + c.totBana.toFixed(2) + " Kg | Khapat: " + c.banaConsumption.toFixed(2) + " Kg\n";
    text += "🟢 *Bacha Bana:* *" + c.remainingBana.toFixed(2) + " Kg*\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "✨ *ZARI HISAB:*\n";
    text += "• Diya: " + c.totZari.toFixed(2) + " Kg | Khapat: " + c.zariConsumption.toFixed(2) + " Kg\n";
    text += "🟠 *Bachi Zari:* *" + c.remainingZari.toFixed(2) + " Kg*\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "_Simplicity ERP • Developed by Farhan Jawed_";

    window.open("https://api.whatsapp.com/send?text=" + encodeURIComponent(text), "_blank");
}

// ================= 7. INFORMATION LEDGER MODULE =================

function openInfoModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("info-section", "block");
    renderInfoTable();
}

function renderInfoTable(customList) {
    var tbody = document.getElementById("info-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var list = customList || safeArray(getStore("info_ledger"));
    if (!list.length) {
        tbody.innerHTML = "<tr><td colspan='11' style='text-align:center; padding:20px; color:#888;'>Koi Information Entry nahi mili.</td></tr>";
        return;
    }

    list.forEach(function(item, idx) {
        if (!item) return;
        tbody.innerHTML += "<tr>" +
            "<td>" + (idx + 1) + "</td>" +
            "<td><strong>" + item.name + "</strong></td>" +
            "<td>" + (item.saree || "-") + "</td>" +
            "<td>" + (item.bana || "-") + "</td>" +
            "<td>" + (item.zari || "-") + "</td>" +
            "<td>" + (item.bani ? ("₹ " + item.bani) : "-") + "</td>" +
            "<td>" + (item.address || "-") + "</td>" +
            "<td>" + (item.booti || "-") + "</td>" +
            "<td>" + (item.kadi || "-") + "</td>" +
            "<td>" + (item.dhaga || "-") + "</td>" +
            "<td style='text-align:center;'><button class='edit-btn' onclick='editInfoEntry(\"" + item.id + "\")'>✏️</button> <button class='delete-btn' onclick='deleteInfoEntry(\"" + item.id + "\")'>🗑️</button></td>" +
        "</tr>";
    });
}

function toggleInfoForm() {
    var f = document.getElementById("add-info-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    cancelInfoEdit();
}

function cancelInfoEdit() {
    document.getElementById("info-edit-id").value = "";
    document.getElementById("info-name").value = "";
    document.getElementById("info-saree").value = "";
    document.getElementById("info-bana").value = "";
    document.getElementById("info-zari").value = "";
    document.getElementById("info-bani").value = "";
    document.getElementById("info-address").value = "";
    document.getElementById("info-booti").value = "";
    document.getElementById("info-kadi").value = "";
    document.getElementById("info-dhaga").value = "";
    document.getElementById("info-save-btn").textContent = "Save";
    setDisplay("info-cancel-btn", "none");
}

function saveInfoLedgerEntry() {
    var editId = document.getElementById("info-edit-id").value;
    var n = (document.getElementById("info-name").value || "").trim().toUpperCase();
    if (!n) return alert("Kariger ka naam zaroori hai!");

    var list = safeArray(getStore("info_ledger"));

    var obj = {
        name: n,
        saree: (document.getElementById("info-saree").value || "").trim(),
        bana: (document.getElementById("info-bana").value || "").trim(),
        zari: (document.getElementById("info-zari").value || "").trim(),
        bani: parseFloat(document.getElementById("info-bani").value) || 0,
        address: (document.getElementById("info-address").value || "").trim(),
        booti: (document.getElementById("info-booti").value || "").trim(),
        kadi: (document.getElementById("info-kadi").value || "").trim(),
        dhaga: (document.getElementById("info-dhaga").value || "").trim()
    };

    if (editId) {
        var it = list.find(function(x) { return String(x.id) === String(editId); });
        if (it) Object.assign(it, obj);
    } else {
        obj.id = "info_" + Date.now();
        list.push(obj);
    }

    setStore("info_ledger", list);
    cancelInfoEdit();
    setDisplay("add-info-form", "none");
    renderInfoTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Information Ledger Save ho gaya!");
}

function editInfoEntry(id) {
    var it = safeArray(getStore("info_ledger")).find(function(x) { return String(x.id) === String(id); });
    if (!it) return;

    toggleInfoForm();
    document.getElementById("info-edit-id").value = it.id;
    document.getElementById("info-name").value = it.name;
    document.getElementById("info-saree").value = it.saree || "";
    document.getElementById("info-bana").value = it.bana || "";
    document.getElementById("info-zari").value = it.zari || "";
    document.getElementById("info-bani").value = it.bani || "";
    document.getElementById("info-address").value = it.address || "";
    document.getElementById("info-booti").value = it.booti || "";
    document.getElementById("info-kadi").value = it.kadi || "";
    document.getElementById("info-dhaga").value = it.dhaga || "";

    document.getElementById("info-save-btn").textContent = "Update";
    setDisplay("info-cancel-btn", "inline-block");
}

function deleteInfoEntry(id) {
    if (!confirm("Kya aap is entry ko delete karna chahte hain?")) return;
    setStore("info_ledger", safeArray(getStore("info_ledger")).filter(function(x) { return String(x.id) !== String(id); }));
    renderInfoTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function searchInfoLedger() {
    var txt = (document.getElementById("search-info-input").value || "").toLowerCase().trim();
    var list = safeArray(getStore("info_ledger")).filter(function(i) {
        return (String(i.name || "") + " " + String(i.saree || "") + " " + String(i.address || "")).toLowerCase().indexOf(txt) !== -1;
    });
    renderInfoTable(list);
}
