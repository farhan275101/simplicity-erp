/* ========================================================
   SIMPLICITY ERP - KARIGER MASTER, KHATA SHEET & INACTIVE TRACKER
   File 4 of 7 • Developed by Farhan Jawed
======================================================== */

// ================= 1. KARIGER MASTER & ABSENCE TRACKER =================

function openKarigerModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("kariger-section", "block");
    renderKarigerTable();
}

function toggleKarigerForm() {
    var f = document.getElementById("add-kariger-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    document.getElementById("kar-date").value = getTodayDate();
    cancelKarigerEdit();
}

function cancelKarigerEdit() {
    document.getElementById("kar-edit-id").value = "";
    document.getElementById("kar-name").value = "";
    document.getElementById("kar-saree").value = "";
    document.getElementById("kar-date").value = getTodayDate();
    document.getElementById("kar-save-btn").textContent = "Save";
    setDisplay("kar-cancel-btn", "none");
}

function saveNewKariger() {
    var editId = document.getElementById("kar-edit-id").value;
    var n = (document.getElementById("kar-name").value || "").trim().toUpperCase();
    var s = (document.getElementById("kar-saree").value || "").trim();
    var d = document.getElementById("kar-date").value || getTodayDate();

    if (!n) return alert("Kariger ka naam zaroori hai!");

    var list = sanitizeKarigerList();

    if (editId) {
        var it = list.find(function(x) { return String(x.id) === String(editId); });
        if (it) {
            it.name = n;
            it.saree = s;
            it.date = d;
        }
    } else {
        list.push({
            id: "kar_" + Date.now(),
            name: n,
            saree: s,
            date: d
        });
    }

    setStore("karigers", list);
    cancelKarigerEdit();
    setDisplay("add-kariger-form", "none");
    renderKarigerTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function getKarigerLastActiveInfo(karId) {
    var sheets = getKarigerSheets(karId);
    var latestDate = null;

    sheets.forEach(function(sh) {
        if (sh && sh.rows) {
            var rows = safeArray(sh.rows);
            rows.forEach(function(r) {
                if (r && r.date) {
                    if (!latestDate || r.date > latestDate) {
                        latestDate = r.date;
                    }
                }
            });
        }
    });

    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(karId); });
    if (!latestDate) {
        latestDate = (k && k.date) ? k.date : null;
    }

    if (!latestDate) {
        return { lastDate: "-", daysAbsent: 0, hasActivity: false };
    }

    var today = new Date(getTodayDate());
    var lastD = new Date(latestDate);
    var diffTime = today - lastD;
    var diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) diffDays = 0;

    return {
        lastDate: latestDate,
        daysAbsent: diffDays,
        hasActivity: true
    };
}

function renderKarigerTable(flist) {
    var list = flist || sanitizeKarigerList();
    var tbody = document.getElementById("kariger-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!list.length) {
        tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; color:#888; padding:20px;'>Koi Kariger nahi mila.</td></tr>";
        return;
    }

    list.forEach(function(k) {
        var act = getKarigerLastActiveInfo(k.id);
        
        var statusBadge = "";
        if (act.daysAbsent >= 30) {
            statusBadge = "<span class='badge-red' style='font-size:11px;'>⚠️ " + act.daysAbsent + " Din se gayab</span>";
        } else if (act.daysAbsent >= 15) {
            statusBadge = "<span style='background:#fff7ed; color:#ea580c; border:1px solid #fed7aa; padding:4px 8px; border-radius:20px; font-weight:700; font-size:11px;'>🟠 " + act.daysAbsent + " Din hue</span>";
        } else {
            statusBadge = "<span class='badge-green' style='font-size:11px;'>🟢 Active (" + act.daysAbsent + " din pehle)</span>";
        }

        var tagadaBtn = "";
        if (act.daysAbsent >= 15) {
            tagadaBtn = " <button class='quick-btn btn-out' style='background:#fee2e2; border-color:#fca5a5; font-size:11px;' onclick='sendTagadaWhatsApp(\"" + k.id + "\", " + act.daysAbsent + ")'>📲 तगादा</button>";
        }

        tbody.innerHTML += "<tr>" +
            "<td><strong>" + k.name + "</strong></td>" +
            "<td>" + (k.saree || "-") + "</td>" +
            "<td>" + formatDateDisplay(act.lastDate) + "</td>" +
            "<td>" + statusBadge + "</td>" +
            "<td style='text-align:center;'>" +
                "<button class='sheet-btn' onclick='openKarigerSheet(\"" + k.id + "\")'>📊 Sheet</button> " +
                tagadaBtn + " " +
                "<button class='edit-btn' onclick='editKariger(\"" + k.id + "\")'>✏️</button> " +
                "<button class='delete-btn' onclick='deleteKariger(\"" + k.id + "\")'>🗑️</button>" +
            "</td>" +
        "</tr>";
    });
}

function filterInactiveKarigers() {
    var filterEl = document.getElementById("kariger-absent-filter");
    var minDays = parseInt(filterEl ? filterEl.value : 0) || 0;
    var txt = (document.getElementById("search-kariger-input").value || "").toLowerCase().trim();

    var all = sanitizeKarigerList();

    var filtered = all.filter(function(k) {
        var act = getKarigerLastActiveInfo(k.id);
        var matchDays = (minDays === 0) ? true : (act.daysAbsent >= minDays);
        var matchText = (String(k.name || "") + " " + String(k.saree || "")).toLowerCase().indexOf(txt) !== -1;
        return matchDays && matchText;
    });

    renderKarigerTable(filtered);
}

function searchKariger() {
    filterInactiveKarigers();
}

function sendTagadaWhatsApp(karId, days) {
    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(karId); });
    if (!k) return;

    var msg = "सलाम " + k.name + " भाई,\n\n" +
              "कारखाने से माल (बाना) ले जाए आपको *" + days + " दिन* हो चुके हैं, और अभी तक आपका कोई माल या हिसाब जमा नहीं हुआ है।\n\n" +
              "कृपया जल्द से जल्द कारखाने आकर तैयार साड़ी जमा कराएं और अपना हिसाब करें।\n\n" +
              "_Simplicity Karkhana ERP_";

    var mob = prompt(k.name + " ka 10-digit WhatsApp number daalein:");
    if (!mob || !mob.trim()) return;

    mob = mob.trim().replace(/[^0-9]/g, "");
    if (mob.length === 10) mob = "91" + mob;

    window.open("https://wa.me/" + mob + "?text=" + encodeURIComponent(msg), "_blank");
}

function editKariger(id) {
    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(id); });
    if (!k) return;
    document.getElementById("kar-edit-id").value = k.id;
    document.getElementById("kar-name").value = k.name;
    document.getElementById("kar-saree").value = k.saree || "";
    document.getElementById("kar-date").value = k.date || getTodayDate();
    document.getElementById("kar-save-btn").textContent = "Update";
    setDisplay("kar-cancel-btn", "inline-block");
    setDisplay("add-kariger-form", "block");
}

function deleteKariger(id) {
    if (!confirm("Kya aap is Kariger ko delete karna chahte hain?")) return;
    var list = sanitizeKarigerList();
    var k = list.find(function(x) { return String(x.id) === String(id); });
    var sheets = getKarigerSheets(id);

    if (sheets && sheets.length) {
        sheets.forEach(function(sh) {
            var rows = safeArray(sh.rows);
            rows.forEach(function(r) {
                reverseSheetRowStock(r, k ? k.name : "Kariger");
            });
        });
    }

    setStore("karigers", list.filter(function(x) { return String(x.id) !== String(id); }));
    try {
        localStorage.removeItem(currentUserId + "_kariger_sheets_" + id);
        if (db) db.ref("users/" + currentUserId + "/kariger_sheets_" + id).remove();
    } catch (e) {}

    renderKarigerTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

// ================= 2. INFORMATION LEDGER MODULE =================

function openInfoModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("info-section", "block");
    renderInfoTable();
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
    var s = (document.getElementById("info-saree").value || "").trim();
    var b = (document.getElementById("info-bana").value || "").trim();
    var z = (document.getElementById("info-zari").value || "").trim();
    var bani = parseFloat(document.getElementById("info-bani").value) || 0;
    var addr = (document.getElementById("info-address").value || "").trim();
    var booti = (document.getElementById("info-booti").value || "").trim();
    var kadi = (document.getElementById("info-kadi").value || "").trim();
    var dhaga = (document.getElementById("info-dhaga").value || "").trim();

    if (!n || !s) return alert("Kariger aur Saree ka naam zaroori hai!");

    var list = getStore("kariger_info_ledger");

    if (editId) {
        var it = list.find(function(x) { return String(x.id) === String(editId); });
        if (it) {
            it.name = n; it.saree = s; it.bana = b; it.zari = z; it.bani = bani;
            it.address = addr; it.booti = booti; it.kadi = kadi; it.dhaga = dhaga;
        }
    } else {
        list.push({
            id: "info_" + Date.now(),
            name: n, saree: s, bana: b, zari: z, bani: bani,
            address: addr, booti: booti, kadi: kadi, dhaga: dhaga
        });
    }

    setStore("kariger_info_ledger", list);
    cancelInfoEdit();
    setDisplay("add-info-form", "none");
    renderInfoTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function renderInfoTable(flist) {
    var list = flist || getStore("kariger_info_ledger");
    var tbody = document.getElementById("info-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!list.length) {
        tbody.innerHTML = "<tr><td colspan='11' style='text-align:center; color:#888; padding:20px;'>Koi Data nahi mila.</td></tr>";
        return;
    }

    list.forEach(function(item, idx) {
        tbody.innerHTML += "<tr>" +
            "<td>" + (idx + 1) + "</td>" +
            "<td><strong>" + item.name + "</strong></td>" +
            "<td>" + (item.saree || "-") + "</td>" +
            "<td>" + (item.bana || "-") + "</td>" +
            "<td>" + (item.zari || "-") + "</td>" +
            "<td style='color:#059669; font-weight:bold;'>₹ " + (item.bani || 0) + "</td>" +
            "<td>" + (item.address || "-") + "</td>" +
            "<td>" + (item.booti || "-") + "</td>" +
            "<td>" + (item.kadi || "-") + "</td>" +
            "<td>" + (item.dhaga || "-") + "</td>" +
            "<td style='text-align:center;'><button class='edit-btn' onclick='editInfoLedgerEntry(\"" + item.id + "\")'>✏️</button> <button class='delete-btn' onclick='deleteInfoLedgerEntry(\"" + item.id + "\")'>🗑️</button></td>" +
        "</tr>";
    });
}

function searchInfoLedger() {
    var txt = (document.getElementById("search-info-input").value || "").toLowerCase().trim();
    var list = getStore("kariger_info_ledger");
    if (!txt) return renderInfoTable(list);

    renderInfoTable(list.filter(function(i) {
        if (!i || typeof i !== 'object') return false;
        return Object.values(i).join(" ").toLowerCase().indexOf(txt) !== -1;
    }));
}

function editInfoLedgerEntry(id) {
    var item = getStore("kariger_info_ledger").find(function(x) { return String(x.id) === String(id); });
    if (!item) return;

    document.getElementById("info-edit-id").value = item.id;
    document.getElementById("info-name").value = item.name;
    document.getElementById("info-saree").value = item.saree || "";
    document.getElementById("info-bana").value = item.bana || "";
    document.getElementById("info-zari").value = item.zari || "";
    document.getElementById("info-bani").value = item.bani || "";
    document.getElementById("info-address").value = item.address || "";
    document.getElementById("info-booti").value = item.booti || "";
    document.getElementById("info-kadi").value = item.kadi || "";
    document.getElementById("info-dhaga").value = item.dhaga || "";

    document.getElementById("info-save-btn").textContent = "Update";
    setDisplay("info-cancel-btn", "inline-block");
    setDisplay("add-info-form", "block");
}

function deleteInfoLedgerEntry(id) {
    if (!confirm("Entry delete karna chahte hain?")) return;
    setStore("kariger_info_ledger", getStore("kariger_info_ledger").filter(function(x) {
        return String(x.id) !== String(id);
    }));
    renderInfoTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

// ================= 3. KARIGER SHEET & CALCULATION ENGINE =================

function getKarigerSheets(karId) {
    if (!karId) return [];
    var sheets = safeArray(getStore("kariger_sheets_" + karId));
    sheets.forEach(function(sh) {
        if (sh) sh.rows = safeArray(sh.rows);
    });
    return sheets;
}

function saveKarigerSheets(karId, sheets) {
    if (!karId) return;
    var cleanSheets = safeArray(sheets);
    cleanSheets.forEach(function(sh) {
        if (sh) sh.rows = safeArray(sh.rows);
    });
    setStore("kariger_sheets_" + karId, cleanSheets);
}

function openKarigerSheet(karId) {
    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(karId); });
    if (!k) return alert("Kariger nahi mila!");

    activeKarigerId = k.id;
    document.getElementById("sheet-banner-name").textContent = k.name + (k.saree ? " / " + k.saree : "");
    if (document.getElementById("line-tani-name")) document.getElementById("line-tani-name").value = "Tani-1";
    if (document.getElementById("line-date")) document.getElementById("line-date").value = getTodayDate();

    populateSheetDatalists();

    var bStock = getStore("bana_stock");
    if (bStock.length > 0 && !document.getElementById("line-bana-name").value) {
        document.getElementById("line-bana-name").value = bStock[0].name;
    }
    var zStock = getStore("zari_stock");
    if (zStock.length > 0 && !document.getElementById("line-zari-name").value) {
        document.getElementById("line-zari-name").value = zStock[0].name;
    }

    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("kariger-sheet-section", "block");

    var sheets = getKarigerSheets(activeKarigerId);
    if (!sheets || !sheets.length) {
        sheets = [{
            id: "tani_1",
            title: "Tani 1",
            banaRate: 0.311,
            zariRate: 0.110,
            baniRate: 240,
            closingBana: 0,
            closingZari: 0,
            closingBani: 0,
            note: "",
            rows: []
        }];
        saveKarigerSheets(activeKarigerId, sheets);
    }

    activeSheetId = sheets[0].id;
    renderTaniTabs();
    loadCurrentSheet();
}

function closeKarigerSheet() {
    activeKarigerId = null;
    activeSheetId = null;
    openKarigerModule();
}

function populateSheetDatalists() {
    var bDl = document.getElementById("sheet-bana-dl");
    var zDl = document.getElementById("sheet-zari-dl");
    var sDl = document.getElementById("sheet-sancha-dl");

    if (bDl) {
        bDl.innerHTML = "";
        getStore("bana_stock").forEach(function(b) {
            if (b && b.name) bDl.innerHTML += "<option value='" + b.name + "'>";
        });
    }
    if (zDl) {
        zDl.innerHTML = "";
        getStore("zari_stock").forEach(function(z) {
            if (z && z.name) zDl.innerHTML += "<option value='" + z.name + "'>";
        });
    }
    if (sDl && typeof getSanchaItems === "function") {
        sDl.innerHTML = "";
        getSanchaItems().forEach(function(s) {
            if (s && s.name) sDl.innerHTML += "<option value='" + s.name + "'>";
        });
    }
}

function updateLiveStockDisplay() {
    var bN = (document.getElementById("line-bana-name").value || "").trim();
    var zN = (document.getElementById("line-zari-name").value || "").trim();
    var sN = (document.getElementById("line-sancha-name").value || "").trim().toLowerCase();

    if (bN && typeof getBanaItemStats === "function") {
        var bStats = getBanaItemStats(bN);
        document.getElementById("live-bana-stock-badge").textContent = "Bacha: " + Number(bStats.bacha).toFixed(2);
    } else {
        document.getElementById("live-bana-stock-badge").textContent = "Bacha: 0.00";
    }

    if (zN && typeof getZariItemStats === "function") {
        var zStats = getZariItemStats(zN);
        document.getElementById("live-zari-stock-badge").textContent = "Bacha: " + Number(zStats.bacha).toFixed(2);
    } else {
        document.getElementById("live-zari-stock-badge").textContent = "Bacha: 0.00";
    }

    if (typeof getSanchaItems === "function" && typeof getSanchaItemStats === "function") {
        var sI = getSanchaItems().find(function(s) { return s && s.name && s.name.toLowerCase() === sN; });
        if (sI) {
            var sStats = getSanchaItemStats(sI.id, sI.name);
            document.getElementById("live-sancha-stock-badge").textContent = "Bacha: " + sStats.bacha.toFixed(2);
        } else {
            document.getElementById("live-sancha-stock-badge").textContent = "Bacha: 0.00";
        }
    }
}

function renderTaniTabs() {
    var sheets = getKarigerSheets(activeKarigerId);
    var box = document.getElementById("tani-tabs-container");
    if (!box) return;
    box.innerHTML = "";

    sheets.forEach(function(sh) {
        if (!sh) return;
        var btn = document.createElement("button");
        btn.className = "sheet-tab" + (String(sh.id) === String(activeSheetId) ? " active" : "");
        btn.innerHTML = sh.title + (sheets.length > 1 ? "<span class='del-tab-btn' onclick='deleteTaniSheet(\"" + sh.id + "\", event)'> ×</span>" : "");
        btn.onclick = function() { switchTaniTab(sh.id); };
        box.appendChild(btn);
    });
}

function switchTaniTab(id) {
    activeSheetId = id;
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(id); });
    if (sh && document.getElementById("line-tani-name")) {
        document.getElementById("line-tani-name").value = sh.title;
    }
    renderTaniTabs();
    loadCurrentSheet();
}

function addNewTaniSheet() {
    var sheets = getKarigerSheets(activeKarigerId);
    var cur = sheets.find(function(s) { return s && String(s.id) === String(activeSheetId); }) || sheets[sheets.length - 1];
    var calc = cur ? calculateSheetTotals(cur) : { remBana: 0, remZari: 0, remBani: 0 };

    var newS = {
        id: "tani_" + Date.now(),
        title: "Tani " + (sheets.length + 1),
        banaRate: cur ? cur.banaRate : 0.311,
        zariRate: cur ? cur.zariRate : 0.110,
        baniRate: 240,
        closingBana: Number(calc.remBana.toFixed(3)),
        closingZari: Number(calc.remZari.toFixed(3)),
        closingBani: Number(calc.remBani.toFixed(2)),
        note: "",
        rows: []
    };

    sheets.push(newS);
    saveKarigerSheets(activeKarigerId, sheets);
    activeSheetId = newS.id;
    renderTaniTabs();
    loadCurrentSheet();
    alert("✅ Nayi " + newS.title + " jud gayi! Pichla bacha hisab carry-forward ho gaya.");
}

function deleteTaniSheet(sheetId, e) {
    if (e) e.stopPropagation();
    var sheets = getKarigerSheets(activeKarigerId);
    if (sheets.length <= 1) return alert("Pehli sheet delete nahi ho sakti!");
    if (!confirm("Kya aap is Tani ko delete karna chahte hain?")) return;

    var toDel = sheets.find(function(s) { return s && String(s.id) === String(sheetId); });
    if (toDel && toDel.rows) {
        var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(activeKarigerId); });
        safeArray(toDel.rows).forEach(function(r) {
            reverseSheetRowStock(r, k ? k.name : "Kariger");
        });
    }

    sheets = sheets.filter(function(s) { return s && String(s.id) !== String(sheetId); });
    saveKarigerSheets(activeKarigerId, sheets);
    activeSheetId = sheets[0].id;
    renderTaniTabs();
    loadCurrentSheet();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function loadCurrentSheet() {
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeSheetId); });

    if (!sh) {
        if (sheets.length > 0) {
            sh = sheets[0];
            activeSheetId = sh.id;
        } else return;
    }

    sh.rows = safeArray(sh.rows);
    document.getElementById("sheet-active-badge").textContent = sh.title;
    var activeEl = document.activeElement;

    if (document.getElementById("line-date") && !document.getElementById("line-date").value) {
        document.getElementById("line-date").value = getTodayDate();
    }
    if (document.getElementById("line-tani-name") && activeEl !== document.getElementById("line-tani-name")) {
        document.getElementById("line-tani-name").value = sh.title;
    }

    if (document.getElementById("tani-bana") && activeEl !== document.getElementById("tani-bana")) document.getElementById("tani-bana").value = sh.closingBana || 0;
    if (document.getElementById("tani-zari") && activeEl !== document.getElementById("tani-zari")) document.getElementById("tani-zari").value = sh.closingZari || 0;
    if (document.getElementById("tani-bani") && activeEl !== document.getElementById("tani-bani")) document.getElementById("tani-bani").value = sh.closingBani || 0;
    if (document.getElementById("tani-note") && activeEl !== document.getElementById("tani-note")) document.getElementById("tani-note").value = sh.note || "";

    if (document.getElementById("rate-bana") && activeEl !== document.getElementById("rate-bana")) document.getElementById("rate-bana").value = (sh.banaRate !== undefined) ? sh.banaRate : 0.311;
    if (document.getElementById("rate-zari") && activeEl !== document.getElementById("rate-zari")) document.getElementById("rate-zari").value = (sh.zariRate !== undefined) ? sh.zariRate : 0.110;
    if (document.getElementById("rate-bani") && activeEl !== document.getElementById("rate-bani")) document.getElementById("rate-bani").value = (sh.baniRate !== undefined) ? sh.baniRate : 240;

    renderSheetRows(sh);
    updateLiveStockDisplay();
}

function saveCurrentSheetConfig() {
    if (!activeKarigerId) return;
    var sheets = getKarigerSheets(activeKarigerId);
    if (!sheets.length) return;

    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeSheetId); });
    if (!sh) sh = sheets[0];

    sh.closingBana = parseFloat(document.getElementById("tani-bana").value) || 0;
    sh.closingZari = parseFloat(document.getElementById("tani-zari").value) || 0;
    sh.closingBani = parseFloat(document.getElementById("tani-bani").value) || 0;
    sh.note = (document.getElementById("tani-note").value || "").trim();

    sh.banaRate = parseFloat(document.getElementById("rate-bana").value) || 0;
    sh.zariRate = parseFloat(document.getElementById("rate-zari").value) || 0;
    sh.baniRate = parseFloat(document.getElementById("rate-bani").value) || 0;

    saveKarigerSheets(activeKarigerId, sheets);
    renderSheetRows(sh);
}

function calculateSheetTotals(sheet) {
    var def = {
        totSaree: 0, totTaniWazan: 0, totBanaNet: 0, totZariNet: 0,
        totPaid: 0, totLott: 0, totRetBana: 0, totRetZari: 0,
        netSaree: 0, baniRate: 240, banaRate: 0.311, zariRate: 0.110,
        grossBani: 0, lastTaniBani: 0, remBani: 0,
        lastTaniBana: 0, banaConsumption: 0, remBana: 0,
        lastTaniZari: 0, zariConsumption: 0, remZari: 0
    };

    if (!sheet || typeof sheet !== 'object') return def;
    var rows = safeArray(sheet.rows);

    var totS = 0, totW = 0, netB = 0, netZ = 0, paid = 0, lott = 0, retB = 0, retZ = 0;

    rows.forEach(function(r) {
        if (!r) return;
        totS += (Number(r.saree) || 0);
        totW += (Number(r.taniWazan) || 0);
        netB += (Number(r.netBana) || 0);
        netZ += (Number(r.netZari) || 0);
        paid += (Number(r.paid) || 0);
        lott += (Number(r.lott) || 0);
        retB += (Number(r.retBana) || 0);
        retZ += (Number(r.retZari) || 0);
    });

    var netSaree = Math.max(0, totS - lott);

    var baniR = (sheet.baniRate !== undefined && sheet.baniRate !== "") ? Number(sheet.baniRate) : 240;
    var banaR = (sheet.banaRate !== undefined && sheet.banaRate !== "") ? Number(sheet.banaRate) : 0.311;
    var zariR = (sheet.zariRate !== undefined && sheet.zariRate !== "") ? Number(sheet.zariRate) : 0.110;

    var grossBani = netSaree * baniR;
    var lastBani = Number(sheet.closingBani) || 0;
    var remBani = (grossBani + lastBani) - paid;

    var lastBana = Number(sheet.closingBana) || 0;
    var bCons = netSaree * banaR;
    var remBana = (lastBana + netB - retB) - bCons;

    var lastZari = Number(sheet.closingZari) || 0;
    var zCons = netSaree * zariR;
    var remZari = (lastZari + netZ - retZ) - zCons;

    return {
        totSaree: totS, totTaniWazan: totW, totBanaNet: netB, totZariNet: netZ,
        totPaid: paid, totLott: lott, totRetBana: retB, totRetZari: retZ,
        netSaree: netSaree, baniRate: baniR, banaRate: banaR, zariRate: zariR,
        grossBani: grossBani, lastTaniBani: lastBani, remBani: remBani,
        lastTaniBana: lastBana, banaConsumption: bCons, remBana: remBana,
        lastTaniZari: lastZari, zariConsumption: zCons, remZari: remZari
    };
}

// AUTO SEPARATE FRESH SAREE & LOTT SAREE (AUTOMATIC FLOW)
function addSheetLineRow() {
    if (!activeKarigerId) return alert("Pehle koi Kariger chunein!");

    var sheets = getKarigerSheets(activeKarigerId);
    if (!sheets.length) {
        sheets = [{ id: "tani_1", title: "Tani 1", banaRate: 0.311, zariRate: 0.110, baniRate: 240, closingBana: 0, closingZari: 0, closingBani: 0, note: "", rows: [] }];
        activeSheetId = sheets[0].id;
    }

    var sheet = sheets.find(function(s) { return s && String(s.id) === String(activeSheetId); });
    if (!sheet) {
        sheet = sheets[0];
        activeSheetId = sheet.id;
    }
    sheet.rows = safeArray(sheet.rows);

    var kar = sanitizeKarigerList().find(function(k) { return String(k.id) === String(activeKarigerId); });
    var karName = kar ? kar.name : "Kariger";
    var karSaree = (kar && kar.saree) ? kar.saree.trim() : "Kariger Saree";

    var date = (document.getElementById("line-date") && document.getElementById("line-date").value) ? document.getElementById("line-date").value : getTodayDate();
    var saree = parseInt(document.getElementById("line-saree") ? document.getElementById("line-saree").value : 0) || 0;

    var sanchaEntryEl = document.getElementById("line-entry-sancha");
    var sanchaNameEl = document.getElementById("line-sancha-name");
    var sancha = ((sanchaEntryEl && sanchaEntryEl.value) || (sanchaNameEl && sanchaNameEl.value) || "").trim();

    var taniName = (document.getElementById("line-tani-name") && document.getElementById("line-tani-name").value.trim()) ? document.getElementById("line-tani-name").value.trim() : sheet.title;
    var taniWazan = parseFloat(document.getElementById("line-tani-wazan") ? document.getElementById("line-tani-wazan").value : 0) || 0;

    var bCone = parseFloat(document.getElementById("line-bana-cone") ? document.getElementById("line-bana-cone").value : 0) || 0;
    var bTp = parseFloat(document.getElementById("line-bana-tp") ? document.getElementById("line-bana-tp").value : 0) || 0;
    var bLess = parseFloat(document.getElementById("line-bana-less") ? document.getElementById("line-bana-less").value : 0) || 0;
    var netBana = 0;
    if (bCone > 0) {
        var banaDeduction = (bLess > 0) ? bLess : bTp;
        netBana = Math.max(0, bCone - banaDeduction);
    }

    var zQty = parseFloat(document.getElementById("line-zari") ? document.getElementById("line-zari").value : 0) || 0;
    var zTp = parseFloat(document.getElementById("line-zari-tp") ? document.getElementById("line-zari-tp").value : 0) || 0;
    var zTopi = parseFloat(document.getElementById("line-zari-topi") ? document.getElementById("line-zari-topi").value : 0) || 0;
    var netZari = 0;
    if (zQty > 0) {
        var zariDeduction = (zTopi > 0) ? zTopi : zTp;
        netZari = Math.max(0, zQty - zariDeduction);
    }

    var paid = parseFloat(document.getElementById("line-paid") ? document.getElementById("line-paid").value : 0) || 0;
    var lott = parseInt(document.getElementById("line-lott") ? document.getElementById("line-lott").value : 0) || 0;
    var retB = parseFloat(document.getElementById("line-ret-bana") ? document.getElementById("line-ret-bana").value : 0) || 0;
    var retZ = parseFloat(document.getElementById("line-ret-zari") ? document.getElementById("line-ret-zari").value : 0) || 0;

    if (saree === 0 && netBana === 0 && netZari === 0 && paid === 0 && lott === 0 && retB === 0 && retZ === 0 && taniWazan === 0) {
        return alert("Kripya kam se kam ek detail bharein (Saree, Bana, Zari, Wazan ya Paid)!");
    }

    var chosenBana = (document.getElementById("line-bana-name") ? document.getElementById("line-bana-name").value : "").trim();
    var chosenZari = (document.getElementById("line-zari-name") ? document.getElementById("line-zari-name").value : "").trim();
    if (!chosenBana && getStore("bana_stock").length > 0) chosenBana = getStore("bana_stock")[0].name;
    if (!chosenZari && getStore("zari_stock").length > 0) chosenZari = getStore("zari_stock")[0].name;

    var row = {
        id: "row_" + Date.now(),
        date: date,
        saree: saree,
        sareeName: karSaree,
        sancha: sancha,
        taniName: taniName,
        taniWazan: taniWazan,
        banaCone: bCone,
        banaTp: bTp,
        banaLess: bLess,
        netBana: Number(netBana.toFixed(3)),
        zariQty: zQty,
        zariTp: zTp,
        zariTopi: zTopi,
        netZari: Number(netZari.toFixed(3)),
        paid: paid,
        lott: lott,
        retBana: retB,
        retZari: retZ,
        banaItemName: chosenBana,
        zariItemName: chosenZari
    };

    sheet.rows.push(row);
    saveKarigerSheets(activeKarigerId, sheets);

    // 1. FRESH SAREE STOCK ENTRY (Net Pass Saree = saree - lott)
    var netPassSaree = Math.max(0, saree - lott);
    if (netPassSaree > 0) {
        var sStock = getStore("saree_stock");
        var item = sStock.find(function(s) {
            return s && s.name && s.kariger && s.name.toLowerCase() === karSaree.toLowerCase() && s.kariger.toLowerCase() === karName.toLowerCase();
        });
        if (item) {
            item.pcs = (Number(item.pcs) || 0) + netPassSaree;
            item.date = date;
        } else {
            sStock.push({ id: Date.now(), date: date, name: karSaree, kariger: karName, pcs: netPassSaree });
        }
        setStore("saree_stock", sStock);

        var sH = getStore("saree_history");
        sH.push({ id: Date.now(), date: date, name: karSaree, kariger: karName, type: "In (Received)", pcs: netPassSaree, note: "Kariger se aayi (" + taniName + ")" });
        setStore("saree_history", sH);
    }

    // 2. LOTT SAREE STOCK ENTRY (Lott saree automatically lott stock me darj hogi)
    if (lott > 0) {
        var lottStock = safeArray(getStore("lott_saree_stock"));
        var lItem = lottStock.find(function(x) { return x && x.name && x.name.toLowerCase() === karSaree.toLowerCase(); });
        if (lItem) {
            lItem.pcs = (Number(lItem.pcs) || 0) + lott;
            lItem.date = date;
        } else {
            lottStock.push({
                id: "lott_" + Date.now(),
                date: date,
                name: karSaree,
                source: karName + " (Loom Lott - " + taniName + ")",
                pcs: lott
            });
        }
        setStore("lott_saree_stock", lottStock);

        var sH2 = getStore("saree_history");
        sH2.push({ id: Date.now(), date: date, name: karSaree, kariger: karName, type: "Lott (Damage)", pcs: lott, note: "Kariger se Lott aayi (" + taniName + ")" });
        setStore("saree_history", sH2);
    }

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

    renderSheetRows(sheet);
    updateLiveStockDisplay();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();
}

function reverseSheetRowStock(r, karName) {
    if (!r) return;
    karName = karName || "Kariger";
    var kSaree = r.sareeName || "Kariger Saree";
    var rSaree = Number(r.saree) || 0;
    var rLott = Number(r.lott) || 0;
    var netPass = Math.max(0, rSaree - rLott);

    // Reverse Fresh Saree Stock
    if (netPass > 0) {
        var sStock = getStore("saree_stock");
        var sItem = sStock.find(function(s) {
            return s && s.name && s.kariger && s.name.toLowerCase() === kSaree.toLowerCase() && s.kariger.toLowerCase() === karName.toLowerCase();
        });
        if (sItem) {
            sItem.pcs = Math.max(0, (Number(sItem.pcs) || 0) - netPass);
            setStore("saree_stock", sStock);
        }
    }

    // Reverse Lott Saree Stock
    if (rLott > 0) {
        var lottStock = safeArray(getStore("lott_saree_stock"));
        var lItem = lottStock.find(function(x) { return x && x.name && x.name.toLowerCase() === kSaree.toLowerCase(); });
        if (lItem) {
            lItem.pcs = Math.max(0, (Number(lItem.pcs) || 0) - rLott);
            setStore("lott_saree_stock", lottStock);
        }
    }
}

function deleteSheetLineRow(idx) {
    if (!confirm("Kya aap is line entry ko delete karna chahte hain?")) return;

    var sheets = getKarigerSheets(activeKarigerId);
    var sheet = sheets.find(function(s) { return s && String(s.id) === String(activeSheetId); });
    if (!sheet) return;

    sheet.rows = safeArray(sheet.rows);
    var r = sheet.rows[idx];
    if (r) {
        var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(activeKarigerId); });
        reverseSheetRowStock(r, k ? k.name : "Kariger");
    }

    sheet.rows.splice(idx, 1);
    saveKarigerSheets(activeKarigerId, sheets);

    renderSheetRows(sheet);
    updateLiveStockDisplay();
    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function renderSheetRows(sheet) {
    var tbody = document.getElementById("sheet-rows-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var rows = (sheet && sheet.rows) ? safeArray(sheet.rows) : [];

    if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan='12' style='text-align:center; color:#888; padding:15px;'>Abhi tak koi entry nahi hui hai.</td></tr>";
    } else {
        rows.forEach(function(r, idx) {
            if (!r) return;
            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(r.date) + "</td>" +
                "<td><strong style='color:#2563eb;'>" + (r.saree || 0) + "</strong></td>" +
                "<td>" + (r.sancha || "-") + "</td>" +
                "<td>" + (r.taniName || "-") + "</td>" +
                "<td>" + Number(r.taniWazan || 0).toFixed(2) + "</td>" +
                "<td style='color:#059669; font-weight:bold;'>" + Number(r.netBana || 0).toFixed(2) + "</td>" +
                "<td style='color:#ea580c; font-weight:bold;'>" + Number(r.netZari || 0).toFixed(2) + "</td>" +
                "<td style='color:#059669;'>₹ " + (r.paid || 0) + "</td>" +
                "<td style='color:#dc2626;'>" + (r.lott || 0) + "</td>" +
                "<td>" + (r.retBana || 0) + "</td>" +
                "<td>" + (r.retZari || 0) + "</td>" +
                "<td><button class='delete-btn' onclick='deleteSheetLineRow(" + idx + ")'>🗑️</button></td>" +
            "</tr>";
        });
    }

    var c = calculateSheetTotals(sheet);

    var setT = function(id, v) {
        var el = document.getElementById(id);
        if (el) el.textContent = v;
    };

    setT("tot-saree", c.totSaree);
    setT("tot-tani-wazan", c.totTaniWazan.toFixed(2));
    setT("tot-bana-net", c.totBanaNet.toFixed(2));
    setT("tot-zari-net", c.totZariNet.toFixed(2));
    setT("tot-paid", "₹ " + c.totPaid);
    setT("tot-lott", c.totLott);
    setT("tot-ret-bana", c.totRetBana.toFixed(2));
    setT("tot-ret-zari", c.totRetZari.toFixed(2));

    setT("calc-tot-saree", c.totSaree);
    setT("calc-tot-lott", "- " + c.totLott);
    setT("calc-net-saree", c.netSaree);
    setT("calc-bani-rate", "₹ " + c.baniRate);
    setT("calc-gross-bani", "₹ " + c.grossBani.toFixed(2));
    setT("calc-last-tani-bani", "+ ₹ " + c.lastTaniBani.toFixed(2));
    setT("calc-tot-paid", "- ₹ " + c.totPaid.toFixed(2));
    setT("calc-remaining-amt", "₹ " + c.remBani.toFixed(2));

    setT("calc-last-tani-bana", c.lastTaniBana.toFixed(3));
    setT("calc-tot-bana", c.totBanaNet.toFixed(3));
    setT("calc-ret-bana", "- " + c.totRetBana.toFixed(3));
    setT("calc-bana-consumption", c.banaConsumption.toFixed(3));
    setT("calc-remaining-bana", c.remBana.toFixed(3) + " Qty");

    setT("calc-last-tani-zari", c.lastTaniZari.toFixed(3));
    setT("calc-tot-zari", c.totZariNet.toFixed(3));
    setT("calc-ret-zari", "- " + c.totRetZari.toFixed(3));
    setT("calc-zari-consumption", c.zariConsumption.toFixed(3));
    setT("calc-remaining-zari", c.remZari.toFixed(3) + " Qty");
}

// ================= 4. WHATSAPP PARCHI & RECEIPT =================

function getClientMobileNumber() {
    if (!currentUserId) return "";
    var users = getUsersList();
    var u = users.find(function(x) { return x.id === currentUserId; });
    return (u && u.mobile) ? String(u.mobile).trim().replace(/[^0-9]/g, "") : "";
}

function shareSheetOnWhatsApp() {
    if (!activeKarigerId || !activeSheetId) {
        return alert("Kripya pehle kisi Kariger ki Khata Sheet kholein!");
    }

    var kar = sanitizeKarigerList().find(function(k) { return String(k.id) === String(activeKarigerId); });
    var sheet = getKarigerSheets(activeKarigerId).find(function(s) { return s && String(s.id) === String(activeSheetId); });

    if (!kar || !sheet) return alert("Sheet ka data nahi mila!");

    var c = calculateSheetTotals(sheet);

    var text = "🧾 *KARKHANA HISAB PARCHI* 🧾\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "👤 *Kariger:* " + (kar.name || "Kariger") + "\n";
    text += "🥻 *Saree Design:* " + (kar.saree || "-") + "\n";
    text += "🧵 *Tani:* " + sheet.title + "\n";
    text += "📅 *Tarikh:* " + formatDateDisplay(getTodayDate()) + "\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "📋 *ROZANA ENTRY VIVRAN:*\n\n";

    var rows = safeArray(sheet.rows);

    if (!rows.length) {
        text += "_Is Tani me abhi koi line entry nahi hai_\n";
    } else {
        rows.forEach(function(r, idx) {
            if (!r) return;
            text += (idx + 1) + "️⃣ *Tarikh: " + formatDateDisplay(r.date) + "*\n";
            if (Number(r.saree) > 0) {
                text += "   • Saree Aayi: " + r.saree + " pcs" + (Number(r.lott) > 0 ? (" (Lott: " + r.lott + ")") : "") + "\n";
            }
            if (Number(r.taniWazan) > 0) text += "   • Tani Wazan: " + Number(r.taniWazan).toFixed(2) + " kg\n";
            if (Number(r.netBana) > 0) text += "   • Net Bana: " + Number(r.netBana).toFixed(2) + " Qty\n";
            if (Number(r.retBana) > 0) text += "   • Bana Wapas: " + Number(r.retBana).toFixed(2) + " Qty\n";
            if (Number(r.netZari) > 0) text += "   • Net Zari: " + Number(r.netZari).toFixed(2) + " Qty\n";
            if (Number(r.retZari) > 0) text += "   • Zari Wapas: " + Number(r.retZari).toFixed(2) + " Qty\n";
            if (Number(r.paid) > 0) text += "   • Paid: ₹ " + Number(r.paid).toFixed(2) + "\n";
            text += "\n";
        });
    }

    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "📊 *KUL MAZDOORI AUR HISAB:*\n";
    text += "🥻 Total Saree: *" + c.totSaree + " Pcs*\n";
    if (c.totLott > 0) text += "⚠️ Total Lott: *-" + c.totLott + " Pcs*\n";
    text += "✅ Net Pass Saree: *" + c.netSaree + " Pcs*\n";
    text += "💵 Bani Rate: *₹ " + c.baniRate + " / Saree*\n";
    text += "💰 Kul Mazdoori: *₹ " + c.grossBani.toFixed(2) + "*\n";
    if (c.lastTaniBani !== 0) text += "➕ Pichla Baki: *+₹ " + c.lastTaniBani.toFixed(2) + "*\n";
    text += "➖ Total Diya (Paid): *-₹ " + c.totPaid.toFixed(2) + "*\n";
    text += "-------------------------------------\n";
    text += "🔴 *FINAL BAKI RUPAYE:* *₹ " + c.remBani.toFixed(2) + "*\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "📦 *STOCK KHAPAT & BACHA:*\n";
    text += "🧶 Bacha Bana: *" + c.remBana.toFixed(3) + " Qty*\n";
    text += "✨ Bachi Zari: *" + c.remZari.toFixed(3) + " Qty*\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "_Simplicity ERP • Developed by Farhan Jawed_";

    var mobile = getClientMobileNumber();

    if (!mobile) {
        mobile = prompt("WhatsApp Mobile Number daalein (10-digit):");
        if (mobile === null) return;
        mobile = mobile.trim().replace(/[^0-9]/g, "");
    }

    var targetUrl = "";
    if (mobile.length === 10) {
        targetUrl = "https://wa.me/91" + mobile + "?text=" + encodeURIComponent(text);
    } else if (mobile.length > 10) {
        targetUrl = "https://wa.me/" + mobile + "?text=" + encodeURIComponent(text);
    } else {
        targetUrl = "https://api.whatsapp.com/send?text=" + encodeURIComponent(text);
    }

    window.open(targetUrl, "_blank");
}
