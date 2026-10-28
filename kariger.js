/* ========================================================
   SIMPLICITY ERP - KARIGER MASTER, MULTI-KARKHANA & SESSION ENGINE
   File 2 of 5 • Developed by Farhan Jawed
   (Enterprise Pagination Engine, 2000+ Fast Render, Wastage & Tagada System)
======================================================== */

var activeKarigerId = null;
var activeSheetIndex = 0;
var currentKarigerKarkhanaFilter = "all"; // "all" ya specific karkhanaId

// 🎯 ULTRA-FAST PAGINATION ENGINE (2,000+ Kariger Mobile Optimization)
var currentKarigerPage = 1;
var karigerPageSize = 50;

// ================= 1. 📅 FINANCIAL YEAR SESSION SYSTEM (1 APRIL CLOSING) =================

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
    setStore("app_active_session", cleanTarget);

    populateSessionDropdown();
    if (typeof backToDashboard === "function") backToDashboard();
    if (typeof renderKarigerKarkhanaTabs === "function") renderKarigerKarkhanaTabs();
    if (typeof renderKarigerTable === "function") renderKarigerTable();
    if (typeof renderStockKarkhanaTabs === "function") renderStockKarkhanaTabs();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();

    alert("📅 Session badal gaya: Ab aap '" + cleanTarget + "' me hain! Sabhi hisab is saal ke dikhenge.");
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

    setDisplay("session-closing-modal", "flex");
}

function closeSessionClosingModal() {
    setDisplay("session-closing-modal", "none");
}

function executeYearEndClosingProcess() {
    var curSess = getActiveFinancialSession();
    var newSessEl = document.getElementById("session-new-input");
    var newSess = (newSessEl ? newSessEl.value : "").trim();

    if (!newSess) return alert("Naye Saal (Session) ka naam daalein! Jaise: 2027-2028");
    if (newSess === curSess) return alert("Naya session purane se alag hona chahiye!");

    var sessions = getAppSessions();
    if (sessions.indexOf(newSess) !== -1) {
        return alert("Ye Session '" + newSess + "' pehle se bana hua hai! Upar dropdown se switch karein.");
    }

    if (!confirm("⚠️ KYA AAP 1 APRIL / YEAR-END CLOSING KARNA CHAHTE HAIN?\n\n" +
        "• Purana saal (" + curSess + ") hamesha ke liye सुरक्षित (Locked) rahega.\n" +
        "• Sabhi Godamo (Main + Branch) ka bacha stock unhi ke Opening me jayega.\n" +
        "• Karigaron ki closing naye saal me Tani 1 Opening hisab ban jayegi.\n" +
        "• Naye saal me app bilkul halka aur fresh khulega!\n" +
        "• Aap jab chahein upar session dropdown se purane saal me jakar purana hisab dekh sakte hain.")) {
        return;
    }

    var karkhanas = getKarkhanas();

    var oldKarigers = safeArray(getStore("kariger_list"));
    var newKarigerSheetsMap = {};

    oldKarigers.forEach(function(k) {
        if (!k || !k.id) return;
        var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
        var lastSheet = sheets.length ? sheets[sheets.length - 1] : null;
        var calc = (lastSheet && typeof calculateSheetTotals === "function")
            ? calculateSheetTotals(lastSheet)
            : { remainingBana: 0, remainingZari: 0, remainingAmt: 0 };

        newKarigerSheetsMap[k.id] = [{
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
    });

    var allSarees = safeArray(getStore("saree_stock"));
    var newSareeStock = [];

    karkhanas.forEach(function(k) {
        var kPcs = 0;
        allSarees.forEach(function(s) {
            var matchK = (String(s.karkhanaId) === String(k.id)) || (!s.karkhanaId && k.isDefault);
            if (matchK) {
                kPcs += (Number(s.pcs) || 0);
            }
        });

        if (kPcs > 0) {
            newSareeStock.push({
                id: "saree_open_" + k.id + "_" + Date.now(),
                date: getTodayDate(),
                name: "Fresh Saree Opening Stock",
                kariger: "📦 Opening Stock (" + curSess + " Se Aaya)",
                karkhanaId: k.id,
                karkhanaName: k.name,
                pcs: kPcs,
                outPcs: 0,
                isOpening: true
            });
        }
    });

    var finTotalPcs = 0;
    safeArray(getStore("finished_saree_stock")).forEach(function(f) { finTotalPcs += (Number(f.pcs) || 0); });
    var newFinStock = [];
    if (finTotalPcs > 0) {
        newFinStock.push({
            id: "fin_open_" + Date.now(),
            date: getTodayDate(),
            name: "Calender Finished Saree",
            source: "📦 Opening Stock (" + curSess + " Se Aaya)",
            pcs: finTotalPcs,
            isOpening: true
        });
    }

    var allLott = safeArray(getStore("lott_saree_stock"));
    var newLottStock = [];
    karkhanas.forEach(function(k) {
        var lPcs = 0;
        allLott.forEach(function(l) {
            var matchL = (String(l.karkhanaId) === String(k.id)) || (!l.karkhanaId && k.isDefault);
            if (matchL) lPcs += (Number(l.pcs) || 0);
        });
        if (lPcs > 0) {
            newLottStock.push({
                id: "lott_open_" + k.id + "_" + Date.now(),
                date: getTodayDate(),
                name: "Damage Saree Opening Stock",
                source: "📦 Opening Stock (" + curSess + " Se Aaya)",
                karkhanaId: k.id,
                karkhanaName: k.name,
                pcs: lPcs,
                isOpening: true
            });
        }
    });

    var newBanaStock = [];
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
                newBanaStock.push({
                    id: Date.now() + Math.random(),
                    name: displayName,
                    date: getTodayDate(),
                    aaya: Number(bachaQty.toFixed(2)),
                    gaya: 0,
                    bacha: Number(bachaQty.toFixed(2)),
                    karkhanaId: k.id,
                    karkhanaName: k.name,
                    note: "📦 Opening Stock (" + curSess + " Se Aaya)",
                    isOpening: true
                });
            }
        });
    });

    var newZariStock = [];
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
                newZariStock.push({
                    id: Date.now() + Math.random(),
                    name: displayName,
                    date: getTodayDate(),
                    aaya: Number(bachaQty.toFixed(2)),
                    gaya: 0,
                    bacha: Number(bachaQty.toFixed(2)),
                    karkhanaId: k.id,
                    karkhanaName: k.name,
                    note: "📦 Opening Stock (" + curSess + " Se Aayi)",
                    isOpening: true
                });
            }
        });
    });

    var sanchaItems = safeArray(getStore("sancha_items"));
    var newSanchaItems = [];
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
                newSanchaItems.push({
                    id: (item.id || "sancha_" + Date.now()) + "_" + k.id,
                    name: item.name,
                    person: item.person || "-",
                    karkhanaId: k.id,
                    karkhanaName: k.name,
                    date: getTodayDate(),
                    aaya: Math.max(0, bachaQty),
                    note: "📦 Opening Stock (" + curSess + " Se Aaya)",
                    isOpening: true
                });
            }
        });
    });

    var oldJwWorkers = safeArray(getStore("jobwork_workers"));
    var newJwSheetsMap = {};
    oldJwWorkers.forEach(function(w) {
        if (!w || !w.id) return;
        var sheets = (typeof getJobWorkerSheets === "function") ? getJobWorkerSheets(w.id) : [];
        var lastSh = sheets.length ? sheets[sheets.length - 1] : null;
        var calc = (lastSh && typeof calculateJobWorkSheetTotals === "function")
            ? calculateJobWorkSheetTotals(lastSh)
            : { pendingSaree: 0 };

        newJwSheetsMap[w.id] = [{
            id: "jw_sh_" + Date.now() + "_" + w.id,
            title: "Month 1 (Opening " + newSess + ")",
            closingPendingSaree: calc.pendingSaree || 0,
            closingBakiAmt: 0,
            note: "📦 Pichle Saal (" + curSess + ") ki Baki Saree",
            rows: []
        }];
    });

    var pendingBills = safeArray(getStore("jw_bills_list")).filter(function(b) {
        var baki = Math.max(0, (Number(b.billAmt) || 0) - (Number(b.paidAmt) || 0));
        return baki > 0;
    }).map(function(b) {
        return Object.assign({}, b, { note: (b.note || "") + " (Opening Bill from " + curSess + ")" });
    });

    sessions.push(newSess);
    localStorage.setItem((currentUserId || "app") + "_app_sessions_list", JSON.stringify(sessions));
    localStorage.setItem((currentUserId || "app") + "_app_active_session", newSess);
    setStore("app_sessions_list", sessions);
    setStore("app_active_session", newSess);

    setStore("kariger_list", oldKarigers);
    for (var kId in newKarigerSheetsMap) {
        setStore("kariger_sheets_" + kId, newKarigerSheetsMap[kId]);
    }
    setStore("saree_stock", newSareeStock);
    setStore("finished_saree_stock", newFinStock);
    setStore("lott_saree_stock", newLottStock);
    setStore("bana_stock", newBanaStock);
    setStore("zari_stock", newZariStock);
    setStore("sancha_items", newSanchaItems);
    setStore("sancha_history", []);
    setStore("jobwork_workers", oldJwWorkers);
    for (var wId in newJwSheetsMap) {
        setStore("jobwork_sheets_" + wId, newJwSheetsMap[wId]);
    }
    setStore("jw_bills_list", pendingBills);
    setStore("jw_payments_list", []);
    setStore("saree_history", []);
    setStore("bana_history", []);
    setStore("zari_history", []);
    setStore("material_transfers", []);
    setStore("saree_transfers", []);
    setStore("dukan_transfer_history", []);

    closeSessionClosingModal();
    populateSessionDropdown();

    if (typeof backToDashboard === "function") backToDashboard();
    if (typeof renderKarigerKarkhanaTabs === "function") renderKarigerKarkhanaTabs();
    if (typeof renderKarigerTable === "function") renderKarigerTable();
    if (typeof renderStockKarkhanaTabs === "function") renderStockKarkhanaTabs();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();

    alert("🎉 MUBARAK HO! 1 April Year-End Closing safalta-purvak poori hui!\n\n" +
          "• Pichla saal (" + curSess + ") hamesha ke liye safe ho gaya hai.\n" +
          "• Sabhi Godamo (Main + Branch) ka bacha stock unhi ke Opening me live ho gaya hai!\n" +
          "• Karigar hisab aur stock bilkul fresh aur opening balance ke sath tayyar hai.");
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

function deleteKarkhanaFromManager(id) {
    var k = getKarkhanas().find(function(x) { return String(x.id) === String(id); });
    if (!k || k.isDefault) return alert("Default Godown delete nahi ho sakta!");

    if (!confirm("⚠️ Kya aap '" + k.name + "' ko delete karna chahte hain?\nIs karkhane ke sabhi kariger safe hokar 'Main Godown' me shift ho jayenge.")) return;

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
    currentKarigerPage = 1; // Tab badalne par Page 1 par jaye
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

// ================= 4. KARIGER MASTER ENGINE (PAGINATED & OPTIMIZED) =================

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
    currentKarigerPage = 1;
    renderKarigerTable();
}

function searchKariger() {
    currentKarigerPage = 1;
    renderKarigerTable();
}

// 🎯 ULTRA-FAST PAGINATION RENDERER (50 PER PAGE - 0ms LAG)
function renderKarigerTable() {
    var tbody = document.getElementById("kariger-table-body");
    if (!tbody) return;

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

    var minDays = parseInt(document.getElementById("kariger-absent-filter") && document.getElementById("kariger-absent-filter").value || 0, 10) || 0;
    if (minDays > 0) {
        list = list.filter(function(k) {
            return getKarigerLastActiveInfo(k.id).daysAbsent >= minDays;
        });
    }

    var totalKarigers = list.length;
    var totalPages = Math.ceil(totalKarigers / karigerPageSize) || 1;
    if (currentKarigerPage > totalPages) currentKarigerPage = totalPages;
    if (currentKarigerPage < 1) currentKarigerPage = 1;

    // Pagination container setup
    var pagContainer = document.getElementById("kariger-pagination-bar");
    if (!pagContainer) {
        var tableWrap = tbody.closest(".table-responsive");
        if (tableWrap) {
            pagContainer = document.createElement("div");
            pagContainer.id = "kariger-pagination-bar";
            pagContainer.style.cssText = "display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-top:10px; padding:10px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; font-size:13px; font-weight:700;";
            tableWrap.parentNode.insertBefore(pagContainer, tableWrap.nextSibling);
        }
    }

    if (!totalKarigers) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:25px; color:#888;'>Koi Kariger nahi mila.</td></tr>";
        if (pagContainer) pagContainer.style.display = "none";
        return;
    }

    if (pagContainer) {
        pagContainer.style.display = "flex";
        var startIdx = (currentKarigerPage - 1) * karigerPageSize + 1;
        var endIdx = Math.min(currentKarigerPage * karigerPageSize, totalKarigers);

        var prevDisabled = (currentKarigerPage <= 1) ? "disabled style='opacity:0.5; cursor:not-allowed; padding:6px 14px;'" : "style='padding:6px 14px; cursor:pointer;'";
        var nextDisabled = (currentKarigerPage >= totalPages) ? "disabled style='opacity:0.5; cursor:not-allowed; padding:6px 14px;'" : "style='padding:6px 14px; cursor:pointer;'";

        pagContainer.innerHTML = 
            "<div style='color:#0f766e;'>📊 Dikh rahe hain: " + startIdx + " - " + endIdx + " (Kul: " + totalKarigers + " Kariger)</div>" +
            "<div style='display:flex; align-items:center; gap:8px;'>" +
                "<button class='quick-btn btn-out' " + prevDisabled + " onclick='prevKarigerPage()'>◀️ Pichla Page</button>" +
                "<span style='background:#ffffff; border:1px solid #cbd5e1; padding:5px 12px; border-radius:6px; color:#1e3a8a;'>Page " + currentKarigerPage + " / " + totalPages + "</span>" +
                "<button class='quick-btn btn-in' " + nextDisabled + " onclick='nextKarigerPage()'>Agla Page ▶️</button>" +
            "</div>";
    }

    // 0ms Fast Slice & Single Buffer Render
    var pageList = list.slice((currentKarigerPage - 1) * karigerPageSize, currentKarigerPage * karigerPageSize);
    var htmlBuffer = "";

    pageList.forEach(function(k) {
        var act = getKarigerLastActiveInfo(k.id);
        var statusBadge = "";
        if (act.daysAbsent >= 30) {
            statusBadge = "<span class='badge-red' style='font-size:11px;'>⚠️ " + act.daysAbsent + " Din se nahi aaye</span>";
        } else if (act.daysAbsent >= 15) {
            statusBadge = "<span style='background:#fff7ed; color:#ea580c; border:1px solid #fed7aa; padding:3px 7px; border-radius:20px; font-weight:700; font-size:11px;'>🟠 " + act.daysAbsent + " Din hue</span>";
        } else {
            statusBadge = "<span class='badge-green' style='font-size:11px;'>🟢 Active</span>";
        }

        var tagadaBtn = "";
        if (act.daysAbsent >= 15) {
            tagadaBtn = " <button class='quick-btn btn-out' style='background:#fee2e2; border-color:#fca5a5; font-size:11px;' onclick='sendKarigerTagadaWhatsApp(\"" + k.id + "\", " + act.daysAbsent + ")'>📲 तगादा</button>";
        }

        var kNameBadge = "<span class='badge-blue' style='font-size:11px; font-weight:700;'>🏭 " + (k.karkhanaName || "Main Godown") + "</span>";

        htmlBuffer += "<tr>" +
            "<td>" + kNameBadge + "</td>" +
            "<td><strong>" + k.name + "</strong></td>" +
            "<td>" + (k.saree || "-") + "</td>" +
            "<td>" + formatDateDisplay(act.lastDate) + "</td>" +
            "<td>" + statusBadge + "</td>" +
            "<td style='text-align:center;'><button class='sheet-btn' onclick='openKarigerSheet(\"" + k.id + "\")'>📊 Khata Sheet</button> " + tagadaBtn + " <button class='edit-btn' onclick='editKariger(\"" + k.id + "\")'>✏️</button> <button class='delete-btn' onclick='deleteKariger(\"" + k.id + "\")'>🗑️</button></td>" +
        "</tr>";
    });

    tbody.innerHTML = htmlBuffer;
}

function nextKarigerPage() {
    currentKarigerPage++;
    renderKarigerTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevKarigerPage() {
    if (currentKarigerPage > 1) {
        currentKarigerPage--;
        renderKarigerTable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function sendKarigerTagadaWhatsApp(karId, days) {
    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(karId); });
    if (!k) return;

    var info = safeArray(getStore("info_ledger")).find(function(i) { 
        return i && i.name && i.name.toUpperCase() === k.name.toUpperCase(); 
    });

    var msg = "सलाम " + k.name + " भाई,\n\n" +
              "कारखाने से साड़ी का काम ले जाए आपको *" + days + " दिन* हो चुके हैं, और अभी तक कोई माल या हिसाब जमा नहीं हुआ है।\n\n" +
              "कृपया जल्द से जल्द कारखाने आकर तैयार साड़ी जमा कराएं और अपना हिसाब करें।\n\n" +
              "_Simplicity Karkhana ERP_";

    var mob = prompt(k.name + " ka 10-digit WhatsApp number daalein:");
    if (!mob || !mob.trim()) return;
    mob = mob.trim().replace(/[^0-9]/g, "");
    if (mob.length === 10) mob = "91" + mob;

    window.open("https://wa.me/" + mob + "?text=" + encodeURIComponent(msg), "_blank");
}

function populateSheetDatalists() {
    var sanchaDl = document.getElementById("sheet-sancha-dl");
    if (sanchaDl && typeof getSanchaItems === "function") {
        sanchaDl.innerHTML = "";
        var sItems = getSanchaItems();
        var uniqueS = [];
        sItems.forEach(function(s) {
            if (s && s.name && uniqueS.indexOf(s.name.trim().toLowerCase()) === -1) {
                uniqueS.push(s.name.trim().toLowerCase());
                var opt = document.createElement("option");
                opt.value = s.name.trim();
                sanchaDl.appendChild(opt);
            }
        });
    }

    var banaDl = document.getElementById("sheet-bana-dl");
    if (banaDl) {
        banaDl.innerHTML = "";
        var bItems = safeArray(getStore("bana_stock"));
        var uniqueB = [];
        bItems.forEach(function(b) {
            if (b && b.name && uniqueB.indexOf(b.name.trim().toLowerCase()) === -1) {
                uniqueB.push(b.name.trim().toLowerCase());
                var opt = document.createElement("option");
                opt.value = b.name.trim();
                banaDl.appendChild(opt);
            }
        });
    }

    var zariDl = document.getElementById("sheet-zari-dl");
    if (zariDl) {
        zariDl.innerHTML = "";
        var zItems = safeArray(getStore("zari_stock"));
        var uniqueZ = [];
        zItems.forEach(function(z) {
            if (z && z.name && uniqueZ.indexOf(z.name.trim().toLowerCase()) === -1) {
                uniqueZ.push(z.name.trim().toLowerCase());
                var opt = document.createElement("option");
                opt.value = z.name.trim();
                zariDl.appendChild(opt);
            }
        });
    }
}

// ================= 5. KARIGER KHATA SHEET ENGINE =================

function openKarigerSheet(id) {
    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(id); });
    if (!k) return alert("Kariger nahi mila!");

    activeKarigerId = k.id;
    activeSheetIndex = 0;

    var sess = getActiveFinancialSession();
    document.getElementById("sheet-banner-name").textContent = k.name + " • 🏭 " + (k.karkhanaName || "Main Godown") + " (" + sess + " Khata)";

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
            banaWaste: 0,
            zariWaste: 0,
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

    populateSheetDatalists();
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
        pichlaBana: Number((calc.remainingBana || 0).toFixed(2)),
        pichlaZari: Number((calc.remainingZari || 0).toFixed(2)),
        pichlaBani: Number((calc.remainingAmt || 0).toFixed(2)),
        banaWaste: 0,
        zariWaste: 0,
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
    
    if (document.getElementById("tani-bana-waste")) {
        document.getElementById("tani-bana-waste").value = (sh.banaWaste !== undefined && sh.banaWaste !== null) ? sh.banaWaste : 0;
    }
    if (document.getElementById("tani-zari-waste")) {
        document.getElementById("tani-zari-waste").value = (sh.zariWaste !== undefined && sh.zariWaste !== null) ? sh.zariWaste : 0;
    }
    
    document.getElementById("tani-note").value = sh.note || "";

    document.getElementById("rate-bana").value = (sh.rateBana !== undefined && sh.rateBana !== null) ? sh.rateBana : 0.311;
    document.getElementById("rate-zari").value = (sh.rateZari !== undefined && sh.rateZari !== null) ? sh.rateZari : 0.110;
    document.getElementById("rate-bani").value = (sh.rateBani !== undefined && sh.rateBani !== null) ? sh.rateBani : 240;

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

    if (document.getElementById("tani-bana-waste")) {
        sh.banaWaste = parseFloat(document.getElementById("tani-bana-waste").value) || 0;
    }
    if (document.getElementById("tani-zari-waste")) {
        sh.zariWaste = parseFloat(document.getElementById("tani-zari-waste").value) || 0;
    }

    sh.note = document.getElementById("tani-note").value || "";

    sh.rateBana = parseFloat(document.getElementById("rate-bana").value) || 0;
    sh.rateZari = parseFloat(document.getElementById("rate-zari").value) || 0;
    sh.rateBani = parseFloat(document.getElementById("rate-bani").value) || 0;

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
        banaWaste: 0,
        remainingBana: 0,
        totZari: 0,
        retZari: 0,
        zariConsumption: 0,
        zariWaste: 0,
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
    var rateBani = (sh.rateBani !== undefined && sh.rateBani !== null) ? Number(sh.rateBani) : 240;
    var grossBani = netSaree * rateBani;
    var pichlaBani = Number(sh.pichlaBani) || 0;
    var remAmt = (grossBani + pichlaBani) - paid;

    var rateB = (sh.rateBana !== undefined && sh.rateBana !== null) ? Number(sh.rateBana) : 0.311;
    var banaCons = saree * rateB;
    var pichlaB = Number(sh.pichlaBana) || 0;
    var bWaste = Number(sh.banaWaste) || 0;
    var remBana = (pichlaB + netB) - (retB + banaCons + bWaste);

    var rateZ = (sh.rateZari !== undefined && sh.rateZari !== null) ? Number(sh.rateZari) : 0.110;
    var zariCons = saree * rateZ;
    var pichlaZ = Number(sh.pichlaZari) || 0;
    var zWaste = Number(sh.zariWaste) || 0;
    var remZari = (pichlaZ + netZ) - (retZ + zariCons + zWaste);

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
        banaWaste: bWaste,
        remainingBana: remBana,
        totZari: netZ,
        retZari: retZ,
        zariConsumption: zariCons,
        zariWaste: zWaste,
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
    var saree = parseInt(document.getElementById("line-saree").value, 10) || 0;
    var sancha = (document.getElementById("line-entry-sancha").value || "").trim();
    var taniName = (document.getElementById("line-tani-name").value || "").trim();
    var taniWazan = parseFloat(document.getElementById("line-tani-wazan").value) || 0;

    var bCone = parseFloat(document.getElementById("line-bana-cone").value) || 0;
    var bLess = parseFloat(document.getElementById("line-bana-less").value) || 0;
    var netBana = Math.max(0, bCone - bLess);

    var zQty = parseFloat(document.getElementById("line-zari").value) || 0;
    var zTopi = parseFloat(document.getElementById("line-zari-topi").value) || 0;
    var netZari = Math.max(0, zQty - zTopi);

    var paid = parseFloat(document.getElementById("line-paid").value) || 0;
    var lott = parseInt(document.getElementById("line-lott").value, 10) || 0;
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
        banaCone: bCone,
        banaLess: bLess,
        netBana: netBana,
        zariQty: zQty,
        zariTopi: zTopi,
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
            karkhanaId: kKarkhanaId,
            note: "Loom se tayyar aayi"
        });
        setStore("saree_history", sH);
    }

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

    document.getElementById("line-saree").value = "";
    document.getElementById("line-tani-wazan").value = "";
    document.getElementById("line-bana-cone").value = "";
    document.getElementById("line-bana-less").value = "";
    document.getElementById("line-zari").value = "";
    document.getElementById("line-zari-topi").value = "";
    document.getElementById("line-paid").value = "";
    document.getElementById("line-lott").value = "";
    document.getElementById("line-ret-bana").value = "";
    document.getElementById("line-ret-zari").value = "";

    renderSheetTable(sh);
    if (typeof updateLiveStockDisplay === "function") updateLiveStockDisplay();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();
    alert("✅ Line jud gayi aur " + kKarkhanaName + " ke stock me auto-adjust ho gayi!");
}

function deleteSheetLineRow(idx) {
    if (!confirm("Kya aap is line entry ko delete karna chahte hain?\nIska kata hua stock wapas godam me jud jayega.")) return;

    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    if (!sh) return;

    sh.rows = safeArray(sh.rows);
    var r = sh.rows[idx];
    if (!r) return;

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
    alert("🗑️ Line delete ho gayi aur Godam ka Stock wapas restore ho gaya!");
}

function renderSheetTable(sh) {
    var tbody = document.getElementById("sheet-rows-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var rows = safeArray(sh.rows);
    var totS = 0, totW = 0, totB = 0, totZ = 0, totP = 0, totL = 0, totRB = 0, totRZ = 0;

    if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan='12' style='text-align:center; padding:15px; color:#888;'>Is Tani me koi rozana entry nahi hai. Upar se line jodein.</td></tr>";
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
                "<td>" + (r.retBana ? Number(r.retBana).toFixed(2) : "-") + "</td>" +
                "<td>" + (r.retZari ? Number(r.retZari).toFixed(2) : "-") + "</td>" +
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
    setEl("calc-bani-rate", "₹ " + (sh.rateBani !== undefined ? sh.rateBani : 240));
    setEl("calc-gross-bani", "₹ " + c.grossBani.toFixed(2));
    setEl("calc-last-tani-bani", "+ ₹ " + (sh.pichlaBani || 0));
    setEl("calc-tot-paid", "- ₹ " + c.totPaid.toFixed(2));
    setEl("calc-remaining-amt", "₹ " + c.remainingAmt.toFixed(2));

    setEl("calc-last-tani-bana", (sh.pichlaBana || 0));
    setEl("calc-tot-bana", c.totBana.toFixed(2));
    setEl("calc-ret-bana", "- " + c.retBana.toFixed(2));
    setEl("calc-bana-consumption", c.banaConsumption.toFixed(2));
    setEl("calc-bana-wastage", "- " + c.banaWaste.toFixed(2));
    setEl("calc-remaining-bana", c.remainingBana.toFixed(2));

    setEl("calc-last-tani-zari", (sh.pichlaZari || 0));
    setEl("calc-tot-zari", c.totZari.toFixed(2));
    setEl("calc-ret-zari", "- " + c.retZari.toFixed(2));
    setEl("calc-zari-consumption", c.zariConsumption.toFixed(2));
    setEl("calc-zari-wastage", "- " + c.zariWaste.toFixed(2));
    setEl("calc-remaining-zari", c.remainingZari.toFixed(2));
}

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
    text += "• Bani Rate: ₹" + (sh.rateBani !== undefined ? sh.rateBani : 240) + " / Saree\n";
    text += "• Gross Bani: ₹" + c.grossBani.toFixed(2) + "\n";
    if (sh.pichlaBani) text += "• Pichla Baki: +₹" + sh.pichlaBani + "\n";
    text += "• Paid (Diya): -₹" + c.totPaid.toFixed(2) + "\n";
    text += "-------------------------------------\n";
    text += "🔴 *FINAL BAKI RUPAYE:* *₹ " + c.remainingAmt.toFixed(2) + "*\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "🧶 *BANA HISAB:*\n";
    text += "• Diya: " + c.totBana.toFixed(2) + " Kg | Khapat: " + c.banaConsumption.toFixed(2) + " Kg\n";
    if (c.retBana > 0) text += "• Returning Wapas: +" + c.retBana.toFixed(2) + " Kg\n";
    if (c.banaWaste > 0) text += "• Bana Wastage: -" + c.banaWaste.toFixed(2) + " Kg\n";
    text += "🟢 *Bacha Bana:* *" + c.remainingBana.toFixed(2) + " Kg*\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "✨ *ZARI HISAB:*\n";
    text += "• Diya: " + c.totZari.toFixed(2) + " Kg | Khapat: " + c.zariConsumption.toFixed(2) + " Kg\n";
    if (c.retZari > 0) text += "• Returning Wapas: +" + c.retZari.toFixed(2) + " Kg\n";
    if (c.zariWaste > 0) text += "• Zari Wastage: -" + c.zariWaste.toFixed(2) + " Kg\n";
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

// ================= 8. 🧪 2,000 TEST KARIGER GENERATOR =================

function generate2000TestKarigers() {
    if (!currentUserId) return alert("Pehle login karein!");
    
    var btn = document.getElementById("btn-generate-dummy");
    if (btn) btn.textContent = "⏳ 2,000 Kariger Ban Rahe Hain...";

    setTimeout(function() {
        var names = [
            "RAMESH", "SURESH", "MOHAN", "ASLAM", "IMRAN", 
            "BABLU", "RAJU", "GUDDU", "CHANDAN", "SALIM", 
            "DILSHAD", "AKHTAR", "MUKESH", "NAEEM", "SUNIL", 
            "KALLU", "RASHID", "FAROOQ", "DINESH", "ANIL"
        ];
        var sarees = [
            "Banarasi Katan", "Tanchoi Silk", "Organza Zari", 
            "Georgette Booti", "Tissue Fancy", "Chiffon Handwork", 
            "Kora Kadwa", "Meena Buti"
        ];
        
        var list = [];
        var today = getTodayDate();

        for (var i = 1; i <= 2000; i++) {
            var nameIdx = (i - 1) % names.length;
            var sareeIdx = (i - 1) % sarees.length;
            var karId = "kar_test_" + i;

            list.push({
                id: karId,
                name: names[nameIdx] + " (NO. " + i + ")",
                saree: sarees[sareeIdx],
                date: today,
                karkhanaId: "k_main",
                karkhanaName: "Main Godown"
            });
        }

        saveKarigerList(list);
        currentKarigerPage = 1;
        renderKarigerKarkhanaTabs();
        renderKarigerTable();
        if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();

        if (btn) btn.textContent = "🧪 +2,000 Test Kariger";
        alert("🎉 2,000 Kariger successfully IndexedDB me load ho gaye!\nAb dekhein mobile kitna fast bina ruke chal raha hai.");
    }, 100);
}

function clearAllTestKarigers() {
    if (!confirm("Kya aap saare kariger delete karke list wapas saaf karna chahte hain?")) return;
    saveKarigerList([]);
    currentKarigerPage = 1;
    renderKarigerKarkhanaTabs();
    renderKarigerTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("🗑️ List wapas bilkul saaf ho gayi!");
}
