/* ========================================================
   SIMPLICITY ERP - KARIGER UI & SHEET CONTROLLER
   File: kariger/kariger-ui.js • Developed by Farhan Jawed
   (Master Directory, Tani Khata Sheet & Absent Tracker)
======================================================== */

var activeKarigerId = null;
var activeSheetIndex = 0;
var currentKarigerKarkhanaFilter = "all";
var currentKarigerPage = 1;
var karigerPageSize = 50;
var editingRowIndex = null;

function setVal(id, v) {
    var el = document.getElementById(id);
    if (el) el.value = (v !== undefined && v !== null) ? v : "";
}

function setText(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = (v !== undefined && v !== null) ? v : "";
}

function sanitizeKarigerList() {
    var list = safeArray(getStore("kariger_list"));
    return list.filter(function(k) { return k && k.name && String(k.name).trim() !== ""; });
}

// 0. ABSENT DAYS CALCULATION ENGINE
function getKarigerAbsentDays(kId, joinDate) {
    var sheets = typeof getKarigerSheets === "function" ? getKarigerSheets(kId) : [];
    var lastDate = joinDate || getTodayDate();

    sheets.forEach(function(sh) {
        safeArray(sh.rows).forEach(function(r) {
            if (r && r.date && r.date > lastDate) {
                lastDate = r.date;
            }
        });
    });

    var today = new Date(getTodayDate());
    var last = new Date(lastDate);
    var diffTime = today - last;
    var diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
}

// 1. NAVIGATION
function openKarigerModule() {
    var dView = document.getElementById("dashboard-view");
    if (dView) dView.style.display = "none";
    var shView = document.getElementById("kariger-sheet-section");
    if (shView) shView.style.display = "none";
    var kSec = document.getElementById("kariger-section");
    if (kSec) kSec.style.display = "block";

    currentKarigerPage = 1;
    renderKarigerKarkhanaTabs();
    renderKarigerTable();
}

function backToDashboard() {
    var kSec = document.getElementById("kariger-section");
    if (kSec) kSec.style.display = "none";
    var shSec = document.getElementById("kariger-sheet-section");
    if (shSec) shSec.style.display = "none";
    var dView = document.getElementById("dashboard-view");
    if (dView) dView.style.display = "block";
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

// 2. MASTER TABLE & ABSENT FILTER
function renderKarigerKarkhanaTabs() {
    var bar = document.getElementById("kariger-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";
    var allKarigers = sanitizeKarigerList();
    var karkhanas = safeArray(getStore("karkhana_list"));
    if (!karkhanas.length) karkhanas = [{ id: "k_main", name: "Main Godown", isDefault: true }];

    var allActive = (currentKarigerKarkhanaFilter === "all") ? " active" : "";
    bar.innerHTML += "<button class='sheet-tab" + allActive + "' onclick='switchKarigerKarkhanaTab(\"all\")'>👥 Sabhi (" + allKarigers.length + ")</button>";

    karkhanas.forEach(function(k) {
        var count = allKarigers.filter(function(w) { return String(w.karkhanaId) === String(k.id) || (!w.karkhanaId && k.isDefault); }).length;
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

function filterKariger() {
    currentKarigerPage = 1;
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
            return (String(k.name || "") + " " + String(k.saree || "") + " " + String(k.mobile || "")).toLowerCase().indexOf(txt) !== -1;
        });
    }

    // 15, 20, 30, 40 Din Absent Filter Engine
    var absentFilterVal = parseInt(document.getElementById("kariger-absent-filter")?.value) || 0;
    if (absentFilterVal > 0) {
        list = list.filter(function(k) {
            return getKarigerAbsentDays(k.id, k.date) >= absentFilterVal;
        });
    }

    var totalItems = list.length;
    var totalPages = Math.ceil(totalItems / karigerPageSize) || 1;
    if (currentKarigerPage > totalPages) currentKarigerPage = totalPages;
    if (currentKarigerPage < 1) currentKarigerPage = 1;

    var pagBar = document.getElementById("kariger-pagination-bar");
    if (pagBar) {
        if (!totalItems) {
            pagBar.style.display = "none";
        } else {
            pagBar.style.display = "flex";
            var startIdx = (currentKarigerPage - 1) * karigerPageSize + 1;
            var endIdx = Math.min(currentKarigerPage * karigerPageSize, totalItems);
            pagBar.innerHTML = "<div style='color:#2563eb;'>📊 Dikh rahe hain: " + startIdx + " - " + endIdx + " (Kul: " + totalItems + ")</div>" +
                "<div style='display:flex; gap:8px; align-items:center;'>" +
                    "<button class='quick-btn btn-out' onclick='prevKarigerPage()'>◀️ Pichla</button>" +
                    "<span style='background:#fff; border:1px solid #cbd5e1; padding:4px 10px; border-radius:6px;'>Page " + currentKarigerPage + " / " + totalPages + "</span>" +
                    "<button class='quick-btn btn-in' onclick='nextKarigerPage()'>Agla ▶️</button>" +
                "</div>";
        }
    }

    if (!totalItems) {
        tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding:20px; color:#888;'>Koi Kariger nahi mila" + (absentFilterVal > 0 ? (" jo " + absentFilterVal + " din se absent ho.") : ".") + "</td></tr>";
        return;
    }

    var pageList = list.slice((currentKarigerPage - 1) * karigerPageSize, currentKarigerPage * karigerPageSize);
    var html = "";
    pageList.forEach(function(k, idx) {
        var actualIdx = (currentKarigerPage - 1) * karigerPageSize + (idx + 1);
        var kBadge = "<span class='badge-blue' style='font-size:11px;'>🏭 " + (k.karkhanaName || "Main Godown") + "</span>";

        var absentDays = getKarigerAbsentDays(k.id, k.date);
        var absentBadge = "";
        if (absentDays >= 30) {
            absentBadge = " <span style='background:#fef2f2; color:#b91c1c; border:1px solid #f87171; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px;'>🔴 " + absentDays + " Din Gayab</span>";
        } else if (absentDays >= 15) {
            absentBadge = " <span style='background:#fffbeb; color:#b45309; border:1px solid #fcd34d; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px;'>⚠️ " + absentDays + " Din Gayab</span>";
        }

        html += "<tr>" +
            "<td>" + actualIdx + "</td>" +
            "<td>" + kBadge + "</td>" +
            "<td><strong>" + k.name + "</strong>" + absentBadge + "</td>" +
            "<td>" + (k.saree || "-") + "</td>" +
            "<td>" + (k.mobile || "-") + "</td>" +
            "<td>" + (k.date || "-") + "</td>" +
            "<td style='text-align:center;'><button class='sheet-btn' onclick='openKarigerSheet(\"" + k.id + "\")'>📊 Tani Khata</button> <button class='edit-btn' onclick='editKariger(\"" + k.id + "\")'>✏️</button> <button class='delete-btn' onclick='deleteKariger(\"" + k.id + "\")'>🗑️</button></td>" +
        "</tr>";
    });
    tbody.innerHTML = html;
}

function nextKarigerPage() { currentKarigerPage++; renderKarigerTable(); }
function prevKarigerPage() { if (currentKarigerPage > 1) { currentKarigerPage--; renderKarigerTable(); } }

function toggleKarigerForm() {
    var f = document.getElementById("add-kariger-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    setVal("kar-date", getTodayDate());
}

function saveKariger() {
    var editId = (document.getElementById("kar-edit-id") && document.getElementById("kar-edit-id").value) || "";
    var n = (document.getElementById("kar-name") && document.getElementById("kar-name").value || "").trim().toUpperCase();
    var s = (document.getElementById("kar-saree") && document.getElementById("kar-saree").value || "").trim();
    var m = (document.getElementById("kar-mobile") && document.getElementById("kar-mobile").value || "").trim();
    var d = (document.getElementById("kar-date") && document.getElementById("kar-date").value) || getTodayDate();
    if (!n) return alert("Kariger ka naam zaroori hai!");

    var list = sanitizeKarigerList();
    if (editId) {
        var it = list.find(function(x) { return String(x.id) === String(editId); });
        if (it) { it.name = n; it.saree = s; it.mobile = m; it.date = d; }
    } else {
        list.push({ id: "kar_" + Date.now(), name: n, saree: s, mobile: m, date: d, karkhanaId: "k_main", karkhanaName: "Main Godown" });
    }
    setStore("kariger_list", list);
    toggleKarigerForm();
    renderKarigerTable();
}

function editKariger(id) {
    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(id); });
    if (!k) return;
    toggleKarigerForm();
    setVal("kar-edit-id", k.id);
    setVal("kar-name", k.name);
    setVal("kar-saree", k.saree || "");
    setVal("kar-mobile", k.mobile || "");
    setVal("kar-date", k.date || getTodayDate());
}

function deleteKariger(id) {
    if (!confirm("Kya is Kariger ko delete karna chahte hain?")) return;
    var list = sanitizeKarigerList().filter(function(x) { return String(x.id) !== String(id); });
    setStore("kariger_list", list);
    renderKarigerTable();
}

// 3. DROPDOWNS & LIVE STOCK DISPLAY
function populateSheetDatalists() {
    var banaDl = document.getElementById("sheet-bana-dl");
    if (banaDl) {
        banaDl.innerHTML = "";
        var uB = [];
        safeArray(getStore("bana_stock")).forEach(function(b) {
            if (b && b.name && uB.indexOf(b.name.trim().toLowerCase()) === -1) {
                uB.push(b.name.trim().toLowerCase());
                var opt = document.createElement("option"); opt.value = b.name.trim(); banaDl.appendChild(opt);
            }
        });
    }

    var zariDl = document.getElementById("sheet-zari-dl");
    if (zariDl) {
        zariDl.innerHTML = "";
        var uZ = [];
        safeArray(getStore("zari_stock")).forEach(function(z) {
            if (z && z.name && uZ.indexOf(z.name.trim().toLowerCase()) === -1) {
                uZ.push(z.name.trim().toLowerCase());
                var opt = document.createElement("option"); opt.value = z.name.trim(); zariDl.appendChild(opt);
            }
        });
    }

    var taniDl = document.getElementById("sheet-sancha-tani-dl");
    if (taniDl) {
        taniDl.innerHTML = "";
        var uT = [];
        safeArray(getStore("sancha_items")).filter(function(s) { return (s.category || "tani") === "tani"; }).forEach(function(s) {
            if (s && s.name && uT.indexOf(s.name.trim().toLowerCase()) === -1) {
                uT.push(s.name.trim().toLowerCase());
                var opt = document.createElement("option"); opt.value = s.name.trim(); taniDl.appendChild(opt);
            }
        });
    }

    var chukDl = document.getElementById("sheet-sancha-chukka-dl");
    if (chukDl) {
        chukDl.innerHTML = "";
        var uC = [];
        safeArray(getStore("sancha_items")).filter(function(s) { return (s.category || "") === "chukka"; }).forEach(function(s) {
            if (s && s.name && uC.indexOf(s.name.trim().toLowerCase()) === -1) {
                uC.push(s.name.trim().toLowerCase());
                var opt = document.createElement("option"); opt.value = s.name.trim(); chukDl.appendChild(opt);
            }
        });
    }
}

function updateLiveStockDisplay() {
    var bName = (document.getElementById("line-bana-name") && document.getElementById("line-bana-name").value || "").trim().toLowerCase();
    var zName = (document.getElementById("line-zari-name") && document.getElementById("line-zari-name").value || "").trim().toLowerCase();
    var tName = (document.getElementById("sheet-tani-item") && document.getElementById("sheet-tani-item").value || "").trim().toLowerCase();
    var cName = (document.getElementById("sheet-chukka-item") && document.getElementById("sheet-chukka-item").value || "").trim().toLowerCase();

    var bItem = safeArray(getStore("bana_stock")).find(function(x) { return x && x.name && x.name.trim().toLowerCase() === bName; });
    var zItem = safeArray(getStore("zari_stock")).find(function(x) { return x && x.name && x.name.trim().toLowerCase() === zName; });
    var tItem = safeArray(getStore("sancha_items")).find(function(x) { return x && x.name && x.name.trim().toLowerCase() === tName; });
    var cItem = safeArray(getStore("sancha_items")).find(function(x) { return x && x.name && x.name.trim().toLowerCase() === cName; });

    setText("live-bana-stock-badge", "Bacha: " + (bItem ? Number(bItem.bacha || 0).toFixed(2) : "0.00") + " Kg");
    setText("live-zari-stock-badge", "Bacha: " + (zItem ? Number(zItem.bacha || 0).toFixed(2) : "0.00") + " Kg");
    setText("live-tani-stock-badge", "Bacha: " + (tItem ? Number(tItem.bacha !== undefined ? tItem.bacha : tItem.aaya || 0).toFixed(2) : "0.00") + " Kg");
    setText("live-chukka-stock-badge", "Bacha: " + (cItem ? Number(cItem.bacha !== undefined ? cItem.bacha : cItem.aaya || 0).toFixed(2) : "0.00") + " Kg");
}

// 4. TANI KHATA SHEET CONTROLLER
function openKarigerSheet(id) {
    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(id); });
    if (!k) return alert("Kariger nahi mila!");

    activeKarigerId = k.id;
    activeSheetIndex = 0;
    editingRowIndex = null;

    var kSec = document.getElementById("kariger-section");
    if (kSec) kSec.style.display = "none";
    var shSec = document.getElementById("kariger-sheet-section");
    if (shSec) shSec.style.display = "block";

    setText("sheet-kariger-title", k.name + " (" + (k.karkhanaName || "Main Godown") + ") - Saree: " + (k.saree || "-"));
    setVal("row-date", getTodayDate());

    var sheets = getKarigerSheets(activeKarigerId);
    if (!sheets || !sheets.length) {
        sheets = [{
            id: "tani_1", title: "Tani 1",
            pichlaBana: 0, pichlaZari: 0, pichlaBani: 0,
            banaWaste: 0, zariWaste: 0,
            rateBana: 0.311, rateZari: 0.110, rateBani: 240,
            note: "", rows: []
        }];
        saveKarigerSheets(activeKarigerId, sheets);
    }

    populateSheetDatalists();
    renderSheetTabs();
    loadCurrentSheetData();
}

function renderSheetTabs() {
    var sheets = getKarigerSheets(activeKarigerId);
    var box = document.getElementById("sheet-tabs-container");
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
    editingRowIndex = null;
    var btn = document.getElementById("row-submit-btn");
    if (btn) btn.textContent = "+ Line Jodein & Stock Minus";
    renderSheetTabs();
    loadCurrentSheetData();
}

function addNewTaniSheet() {
    var sheets = getKarigerSheets(activeKarigerId);
    var cur = sheets[activeSheetIndex] || sheets[sheets.length - 1];
    var calc = cur ? calculateSheetTotals(cur) : { remainingBana: 0, remainingZari: 0, remainingAmt: 0 };
    var nextNum = sheets.length + 1;
    sheets.push({
        id: "tani_" + nextNum, title: "Tani " + nextNum,
        pichlaBana: Number((calc.remainingBana || 0).toFixed(2)),
        pichlaZari: Number((calc.remainingZari || 0).toFixed(2)),
        pichlaBani: Number((calc.remainingAmt || 0).toFixed(2)),
        banaWaste: 0, zariWaste: 0,
        rateBana: cur ? (Number(cur.rateBana) || 0.311) : 0.311,
        rateZari: cur ? (Number(cur.rateZari) || 0.110) : 0.110,
        rateBani: cur ? (Number(cur.rateBani) || 240) : 240,
        note: "", rows: []
    });
    saveKarigerSheets(activeKarigerId, sheets);
    activeSheetIndex = sheets.length - 1;
    renderSheetTabs();
    loadCurrentSheetData();
}

function deleteTaniSheet(idx, e) {
    if (e) e.stopPropagation();
    var sheets = getKarigerSheets(activeKarigerId);
    if (sheets.length <= 1) return alert("Pehli Tani Sheet delete nahi ho sakti!");
    if (!confirm("Kya is Tani Sheet ko delete karna chahte hain?")) return;
    
    var delSh = sheets[idx];
    if (delSh) {
        if (delSh.taniItem && Number(delSh.taniWazan) > 0) {
            revertSanchaStock(delSh.taniItem, "tani", Number(delSh.taniWazan));
        }
        if (delSh.chukkaItem && Number(delSh.chukkaWazan) > 0) {
            revertSanchaStock(delSh.chukkaItem, "chukka", Number(delSh.chukkaWazan));
        }
    }

    sheets.splice(idx, 1);
    saveKarigerSheets(activeKarigerId, sheets);
    activeSheetIndex = 0;
    renderSheetTabs();
    loadCurrentSheetData();
}

function loadCurrentSheetData() {
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex] || sheets[0];
    if (!sh) return;

    setVal("rate-bana-input", (sh.rateBana !== undefined) ? sh.rateBana : 0.311);
    setVal("rate-zari-input", (sh.rateZari !== undefined) ? sh.rateZari : 0.110);
    setVal("rate-bani-input", (sh.rateBani !== undefined) ? sh.rateBani : 240);
    setVal("pichla-bana-input", sh.pichlaBana || 0);
    setVal("pichla-zari-input", sh.pichlaZari || 0);
    setVal("pichla-bani-input", sh.pichlaBani || 0);
    setVal("waste-bana-input", sh.banaWaste || 0);
    setVal("waste-zari-input", sh.zariWaste || 0);

    setVal("line-bana-name", sh.banaItem || "");
    setVal("line-zari-name", sh.zariItem || "");
    setVal("sheet-tani-item", sh.taniItem || "");
    setVal("sheet-tani-sancha", sh.taniSancha || "");
    setVal("sheet-tani-wazan", sh.taniWazan || "");
    setVal("sheet-chukka-item", sh.chukkaItem || "");
    setVal("sheet-chukka-sancha", sh.chukkaSancha || "");
    setVal("sheet-chukka-wazan", sh.chukkaWazan || "");

    renderSheetRows(sh);
    updateLiveStockDisplay();
}

// SANCHA STOCK REVERT HELPER
function revertSanchaStock(itemName, category, wazan) {
    if (!itemName || !wazan) return;
    var sList = safeArray(getStore("sancha_items"));
    var found = sList.find(function(x) {
        return x && x.name && x.name.toLowerCase() === itemName.toLowerCase() && (x.category || "tani").toLowerCase() === category.toLowerCase();
    });
    if (found) {
        found.gaya = Math.max(0, Number(((Number(found.gaya) || 0) - Number(wazan)).toFixed(2)));
        found.bacha = Number(((Number(found.aaya) || 0) - found.gaya).toFixed(2));
        setStore("sancha_items", sList);
    }
}

// 5. CONFIG SAVE WITH AUTO SANCHA STOCK DEDUCTION
function saveCurrentSheetConfig() {
    if (!activeKarigerId) return;
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    if (!sh) return;

    var kariger = sanitizeKarigerList().find(function(x) { return String(x.id) === String(activeKarigerId); });
    var kName = kariger ? kariger.name : "Kariger";

    sh.rateBana = parseFloat(document.getElementById("rate-bana-input")?.value) || 0;
    sh.rateZari = parseFloat(document.getElementById("rate-zari-input")?.value) || 0;
    sh.rateBani = parseFloat(document.getElementById("rate-bani-input")?.value) || 0;
    sh.pichlaBana = parseFloat(document.getElementById("pichla-bana-input")?.value) || 0;
    sh.pichlaZari = parseFloat(document.getElementById("pichla-zari-input")?.value) || 0;
    sh.pichlaBani = parseFloat(document.getElementById("pichla-bani-input")?.value) || 0;
    sh.banaWaste = parseFloat(document.getElementById("waste-bana-input")?.value) || 0;
    sh.zariWaste = parseFloat(document.getElementById("waste-zari-input")?.value) || 0;

    sh.banaItem = (document.getElementById("line-bana-name")?.value || "").trim();
    sh.zariItem = (document.getElementById("line-zari-name")?.value || "").trim();

    var oldTaniWazan = Number(sh.taniWazan || 0);
    var newTaniWazan = parseFloat(document.getElementById("sheet-tani-wazan")?.value) || 0;
    var oldChukkaWazan = Number(sh.chukkaWazan || 0);
    var newChukkaWazan = parseFloat(document.getElementById("sheet-chukka-wazan")?.value) || 0;

    var oldTaniItem = sh.taniItem || "";
    var oldChukkaItem = sh.chukkaItem || "";

    sh.taniItem = (document.getElementById("sheet-tani-item")?.value || "").trim();
    sh.taniSancha = (document.getElementById("sheet-tani-sancha")?.value || "").trim();
    sh.taniWazan = newTaniWazan;
    sh.chukkaItem = (document.getElementById("sheet-chukka-item")?.value || "").trim();
    sh.chukkaSancha = (document.getElementById("sheet-chukka-sancha")?.value || "").trim();
    sh.chukkaWazan = newChukkaWazan;

    // Tani Stock Auto-Minus
    if (sh.taniItem && (newTaniWazan !== oldTaniWazan || sh.taniItem !== oldTaniItem)) {
        var sList = safeArray(getStore("sancha_items"));
        if (oldTaniItem && oldTaniItem !== sh.taniItem && oldTaniWazan > 0) {
            revertSanchaStock(oldTaniItem, "tani", oldTaniWazan);
            oldTaniWazan = 0;
        }

        var tFound = sList.find(function(x) {
            return x && x.name && x.name.toLowerCase() === sh.taniItem.toLowerCase() && (x.category || "tani").toLowerCase() === "tani";
        });

        if (tFound) {
            var diffT = newTaniWazan - oldTaniWazan;
            tFound.gaya = Math.max(0, Number(((Number(tFound.gaya) || 0) + diffT).toFixed(2)));
            tFound.bacha = Number(((Number(tFound.aaya) || 0) - tFound.gaya).toFixed(2));
            setStore("sancha_items", sList);
        }

        var sHist = safeArray(getStore("sancha_history"));
        var refKey = activeKarigerId + "_" + sh.id + "_tani";
        sHist = sHist.filter(function(h) { return !h || h.refId !== refKey; });
        if (newTaniWazan > 0) {
            sHist.push({
                id: "shist_" + Date.now() + "_t",
                refId: refKey,
                date: getTodayDate(),
                category: "tani",
                name: sh.taniItem,
                kariger: kName,
                type: "Kariger Issue (Tani)",
                aaya: 0,
                gaya: newTaniWazan,
                karkhanaId: kariger ? (kariger.karkhanaId || "k_main") : "k_main"
            });
        }
        setStore("sancha_history", sHist);
    }

    // Chukka Stock Auto-Minus
    if (sh.chukkaItem && (newChukkaWazan !== oldChukkaWazan || sh.chukkaItem !== oldChukkaItem)) {
        var sList2 = safeArray(getStore("sancha_items"));
        if (oldChukkaItem && oldChukkaItem !== sh.chukkaItem && oldChukkaWazan > 0) {
            revertSanchaStock(oldChukkaItem, "chukka", oldChukkaWazan);
            oldChukkaWazan = 0;
        }

        var cFound = sList2.find(function(x) {
            return x && x.name && x.name.toLowerCase() === sh.chukkaItem.toLowerCase() && (x.category || "").toLowerCase() === "chukka";
        });

        if (cFound) {
            var diffC = newChukkaWazan - oldChukkaWazan;
            cFound.gaya = Math.max(0, Number(((Number(cFound.gaya) || 0) + diffC).toFixed(2)));
            cFound.bacha = Number(((Number(cFound.aaya) || 0) - cFound.gaya).toFixed(2));
            setStore("sancha_items", sList2);
        }

        var sHist2 = safeArray(getStore("sancha_history"));
        var refKey2 = activeKarigerId + "_" + sh.id + "_chukka";
        sHist2 = sHist2.filter(function(h) { return !h || h.refId !== refKey2; });
        if (newChukkaWazan > 0) {
            sHist2.push({
                id: "shist_" + Date.now() + "_c",
                refId: refKey2,
                date: getTodayDate(),
                category: "chukka",
                name: sh.chukkaItem,
                kariger: kName,
                type: "Kariger Issue (Chukka)",
                aaya: 0,
                gaya: newChukkaWazan,
                karkhanaId: kariger ? (kariger.karkhanaId || "k_main") : "k_main"
            });
        }
        setStore("sancha_history", sHist2);
    }

    saveKarigerSheets(activeKarigerId, sheets);
    renderSheetRows(sh);
    updateLiveStockDisplay();
}

// 6. SAVE / UPDATE LINE ROW (BANA, ZARI & SAREE/LOTT STOCK)
function saveTaniRow() {
    if (!activeKarigerId) return alert("Pehle Kariger chunein!");
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    if (!sh) return;

    var kariger = sanitizeKarigerList().find(function(x) { return String(x.id) === String(activeKarigerId); });
    var kName = kariger ? kariger.name : "Kariger";
    var sDesign = (kariger && kariger.saree) ? kariger.saree : "General Saree";
    var kGodown = kariger ? (kariger.karkhanaId || "k_main") : "k_main";

    var d = (document.getElementById("row-date") && document.getElementById("row-date").value) || getTodayDate();
    var bCone = parseFloat(document.getElementById("row-cone") && document.getElementById("row-cone").value) || 0;
    var bLess = parseFloat(document.getElementById("row-lesstp") && document.getElementById("row-lesstp").value) || 0;
    var zQty = parseFloat(document.getElementById("row-zariqty") && document.getElementById("row-zariqty").value) || 0;
    var topi = parseFloat(document.getElementById("row-topi") && document.getElementById("row-topi").value) || 0;

    var saree = parseFloat(document.getElementById("row-saree") && document.getElementById("row-saree").value) || 0;
    var lott = parseFloat(document.getElementById("row-lott") && document.getElementById("row-lott").value) || 0;
    var paid = parseFloat(document.getElementById("row-paid") && document.getElementById("row-paid").value) || 0;
    var retB = parseFloat(document.getElementById("row-retbana") && document.getElementById("row-retbana").value) || 0;
    var retZ = parseFloat(document.getElementById("row-retzari") && document.getElementById("row-retzari").value) || 0;

    var banaItemName = (document.getElementById("line-bana-name")?.value || sh.banaItem || "").trim();
    var zariItemName = (document.getElementById("line-zari-name")?.value || sh.zariItem || "").trim();
    sh.banaItem = banaItemName;
    sh.zariItem = zariItemName;

    var nBana = Math.max(0, bCone - bLess);
    var nZari = Math.max(0, zQty - topi);

    var rowId = (editingRowIndex !== null && sh.rows[editingRowIndex]) ? sh.rows[editingRowIndex].id : ("row_" + Date.now());

    var rowObj = {
        id: rowId,
        date: d,
        cone: bCone,
        lessTp: bLess,
        netBana: Number(nBana.toFixed(2)),
        zariQty: zQty,
        topi: topi,
        netZari: Number(nZari.toFixed(2)),
        saree: saree,
        lott: lott,
        paid: paid,
        retBana: retB,
        retZari: retZ,
        banaItem: banaItemName,
        zariItem: zariItemName
    };

    sh.rows = safeArray(sh.rows);

    if (editingRowIndex !== null) {
        sh.rows[editingRowIndex] = rowObj;
        editingRowIndex = null;
        var sBtn = document.getElementById("row-submit-btn");
        if (sBtn) sBtn.textContent = "+ Line Jodein & Stock Minus";
    } else {
        sh.rows.push(rowObj);
    }

    saveKarigerSheets(activeKarigerId, sheets);

    // Saree & Lott Stock Sync
    if (typeof removeSareeByRefId === "function") {
        removeSareeByRefId(rowId);
    }
    if (typeof recordSareeFromKariger === "function") {
        recordSareeFromKariger(d, sDesign, kName, kGodown, saree, lott, rowId);
    } else {
        var sHist = safeArray(getStore("saree_history")).filter(function(h) { return !h || String(h.refId) !== String(rowId); });
        if (saree > 0) {
            sHist.push({
                id: "saree_" + Date.now() + "_f",
                refId: rowId,
                date: d,
                sareeName: sDesign,
                karigerName: kName,
                karkhanaId: kGodown,
                type: "fresh",
                typeLabel: "Fresh Saree (Kariger Sheet)",
                aai: saree,
                gai: 0
            });
        }
        if (lott > 0) {
            sHist.push({
                id: "saree_" + Date.now() + "_l",
                refId: rowId,
                date: d,
                sareeName: sDesign,
                karigerName: kName,
                karkhanaId: kGodown,
                type: "lott",
                typeLabel: "Lott Saree (Kariger Sheet)",
                aai: lott,
                gai: 0
            });
        }
        setStore("saree_history", sHist);
    }

    // Bana Stock Adjustments
    if (banaItemName && (nBana > 0 || retB > 0)) {
        var bStock = safeArray(getStore("bana_stock"));
        var bFound = bStock.find(function(x) { return x && x.name && x.name.toLowerCase() === banaItemName.toLowerCase(); });
        if (bFound) {
            bFound.gaya = Number(((Number(bFound.gaya) || 0) + nBana).toFixed(2));
            if (retB > 0) bFound.aaya = Number(((Number(bFound.aaya) || 0) + retB).toFixed(2));
            bFound.bacha = Number(((Number(bFound.aaya) || 0) - (Number(bFound.gaya) || 0)).toFixed(2));
            setStore("bana_stock", bStock);
        }

        var bHist = safeArray(getStore("bana_history"));
        bHist.push({
            id: "bhist_" + Date.now(),
            refId: rowId,
            date: d,
            name: banaItemName,
            kariger: kName,
            type: "Kariger Issue",
            aaya: retB > 0 ? retB : 0,
            gaya: nBana > 0 ? nBana : 0,
            karkhanaId: kGodown
        });
        setStore("bana_history", bHist);
    }

    // Zari Stock Adjustments
    if (zariItemName && (nZari > 0 || retZ > 0)) {
        var zStock = safeArray(getStore("zari_stock"));
        var zFound = zStock.find(function(x) { return x && x.name && x.name.toLowerCase() === zariItemName.toLowerCase(); });
        if (zFound) {
            zFound.gaya = Number(((Number(zFound.gaya) || 0) + nZari).toFixed(2));
            if (retZ > 0) zFound.aaya = Number(((Number(zFound.aaya) || 0) + retZ).toFixed(2));
            zFound.bacha = Number(((Number(zFound.aaya) || 0) - (Number(zFound.gaya) || 0)).toFixed(2));
            setStore("zari_stock", zStock);
        }

        var zHist = safeArray(getStore("zari_history"));
        zHist.push({
            id: "zhist_" + Date.now(),
            refId: rowId,
            date: d,
            name: zariItemName,
            kariger: kName,
            type: "Kariger Issue",
            aaya: retZ > 0 ? retZ : 0,
            gaya: nZari > 0 ? nZari : 0,
            karkhanaId: kGodown
        });
        setStore("zari_history", zHist);
    }

    // Reset Form
    setVal("row-saree", "");
    setVal("row-lott", "");
    setVal("row-cone", "");
    setVal("row-lesstp", "");
    setVal("row-zariqty", "");
    setVal("row-topi", "");
    setVal("row-paid", "");
    setVal("row-retbana", "");
    setVal("row-retzari", "");

    setVal("line-bana-name", sh.banaItem || "");
    setVal("line-zari-name", sh.zariItem || "");

    renderSheetRows(sh);
    updateLiveStockDisplay();
    alert("✅ Line jud gayi! Saree & Karkhana Stock adjust ho gaya!");
}

// 7. EDIT ROW
function editTaniRow(idx) {
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    if (!sh || !sh.rows || !sh.rows[idx]) return;
    var r = sh.rows[idx];

    editingRowIndex = idx;
    setVal("row-date", r.date || getTodayDate());
    setVal("row-cone", r.cone || "");
    setVal("row-lesstp", r.lessTp || "");
    setVal("row-zariqty", r.zariQty || "");
    setVal("row-topi", r.topi || "");
    setVal("row-saree", r.saree || "");
    setVal("row-lott", r.lott || "");
    setVal("row-paid", r.paid || "");
    setVal("row-retbana", r.retBana || "");
    setVal("row-retzari", r.retZari || "");

    var sBtn = document.getElementById("row-submit-btn");
    if (sBtn) sBtn.textContent = "✏️ Update Line";
    window.scrollTo({ top: 350, behavior: 'smooth' });
}

// 8. DELETE ROW
function deleteTaniRow(idx) {
    if (!confirm("Kya aap is row ko delete karna chahte hain?")) return;
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    if (!sh) return;
    sh.rows = safeArray(sh.rows);
    var r = sh.rows[idx];
    if (!r) return;

    if (typeof removeSareeByRefId === "function") {
        removeSareeByRefId(r.id);
    } else {
        var sHist = safeArray(getStore("saree_history")).filter(function(h) { return !h || String(h.refId) !== String(r.id); });
        setStore("saree_history", sHist);
    }

    if (r.banaItem && (r.netBana > 0 || r.retBana > 0)) {
        var bStock = safeArray(getStore("bana_stock"));
        var bFound = bStock.find(function(x) { return x && x.name && x.name.toLowerCase() === r.banaItem.toLowerCase(); });
        if (bFound) {
            bFound.gaya = Math.max(0, Number(((Number(bFound.gaya) || 0) - (Number(r.netBana) || 0)).toFixed(2)));
            if (r.retBana > 0) bFound.aaya = Math.max(0, Number(((Number(bFound.aaya) || 0) - Number(r.retBana)).toFixed(2)));
            bFound.bacha = Number(((Number(bFound.aaya) || 0) - (Number(bFound.gaya) || 0)).toFixed(2));
            setStore("bana_stock", bStock);
        }
        var bHist = safeArray(getStore("bana_history")).filter(function(h) { return !h || String(h.refId) !== String(r.id); });
        setStore("bana_history", bHist);
    }

    if (r.zariItem && (r.netZari > 0 || r.retZari > 0)) {
        var zStock = safeArray(getStore("zari_stock"));
        var zFound = zStock.find(function(x) { return x && x.name && x.name.toLowerCase() === r.zariItem.toLowerCase(); });
        if (zFound) {
            zFound.gaya = Math.max(0, Number(((Number(zFound.gaya) || 0) - (Number(r.netZari) || 0)).toFixed(2)));
            if (r.retZari > 0) zFound.aaya = Math.max(0, Number(((Number(zFound.aaya) || 0) - Number(r.retZari)).toFixed(2)));
            zFound.bacha = Number(((Number(zFound.aaya) || 0) - (Number(zFound.gaya) || 0)).toFixed(2));
            setStore("zari_stock", zStock);
        }
        var zHist = safeArray(getStore("zari_history")).filter(function(h) { return !h || String(h.refId) !== String(r.id); });
        setStore("zari_history", zHist);
    }

    sh.rows.splice(idx, 1);
    saveKarigerSheets(activeKarigerId, sheets);
    renderSheetRows(sh);
    updateLiveStockDisplay();
    alert("🗑️ Line delete ho gayi!");
}

// 9. RENDER TABLE ROWS (9 COLUMNS)
function renderSheetRows(sh) {
    var tbody = document.getElementById("sheet-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    var rows = safeArray(sh.rows);

    var totS = 0, totL = 0, totB = 0, totZ = 0, totP = 0, totRB = 0, totRZ = 0;

    if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan='9' style='text-align:center; padding:15px; color:#888;'>Is Tani me koi entry nahi hai.</td></tr>";
    } else {
        rows.forEach(function(r, idx) {
            if (!r) return;
            totS += (Number(r.saree) || 0);
            totL += (Number(r.lott) || 0);
            totB += (Number(r.netBana) || 0);
            totZ += (Number(r.netZari) || 0);
            totP += (Number(r.paid) || 0);
            totRB += (Number(r.retBana) || 0);
            totRZ += (Number(r.retZari) || 0);

            tbody.innerHTML += "<tr>" +
                "<td>" + (r.date || "-") + "</td>" +
                "<td><strong style='color:#059669;'>" + (r.netBana ? Number(r.netBana).toFixed(2) : "-") + "</strong></td>" +
                "<td><strong style='color:#ea580c;'>" + (r.netZari ? Number(r.netZari).toFixed(2) : "-") + "</strong></td>" +
                "<td>" + (r.saree || 0) + "</td>" +
                "<td style='color:#dc2626;'><strong>" + (r.lott || 0) + "</strong></td>" +
                "<td style='color:#059669; font-weight:700;'>₹ " + (r.paid || 0) + "</td>" +
                "<td>" + (r.retBana || 0) + "</td>" +
                "<td>" + (r.retZari || 0) + "</td>" +
                "<td style='text-align:center;'><button class='edit-btn' onclick='editTaniRow(" + idx + ")'>✏️</button> <button class='delete-btn' onclick='deleteTaniRow(" + idx + ")'>🗑️</button></td>" +
            "</tr>";
        });
    }

    setText("tot-bana-net", totB.toFixed(2));
    setText("tot-zari-net", totZ.toFixed(2));
    setText("tot-saree", totS);
    setText("tot-lott", totL);
    setText("tot-paid", "₹ " + totP);
    setText("tot-ret-bana", totRB.toFixed(2));
    setText("tot-ret-zari", totRZ.toFixed(2));

    var c = calculateSheetTotals(sh);

    setText("calc-tot-saree", c.totSaree);
    setText("calc-tot-lott", "- " + c.totLott);
    setText("calc-net-saree", c.netSaree);
    setText("calc-bani-rate", "₹ " + (sh.rateBani !== undefined ? sh.rateBani : 240));
    setText("calc-gross-bani", "₹ " + c.grossBani.toFixed(2));
    setText("calc-last-tani-bani", "+ ₹ " + (sh.pichlaBani || 0));
    setText("calc-tot-paid", "- ₹ " + c.totPaid.toFixed(2));
    setText("calc-remaining-amt", "₹ " + c.remainingAmt.toFixed(2));

    setText("calc-last-tani-bana", (sh.pichlaBana || 0));
    setText("calc-tot-bana", c.totBana.toFixed(2));
    setText("calc-ret-bana", "- " + c.retBana.toFixed(2));
    setText("calc-bana-consumption", c.banaConsumption.toFixed(2));
    setText("calc-bana-wastage", "- " + c.banaWaste.toFixed(2));
    setText("calc-remaining-bana", c.remainingBana.toFixed(2));

    setText("calc-last-tani-zari", (sh.pichlaZari || 0));
    setText("calc-tot-zari", c.totZari.toFixed(2));
    setText("calc-ret-zari", "- " + c.retZari.toFixed(2));
    setText("calc-zari-consumption", c.zariConsumption.toFixed(2));
    setText("calc-zari-wastage", "- " + c.zariWaste.toFixed(2));
    setText("calc-remaining-zari", c.remainingZari.toFixed(2));
}

function sendKarigerWhatsAppParchi() {
    if (!activeKarigerId) return;
    var k = sanitizeKarigerList().find(function(x) { return String(x.id) === String(activeKarigerId); });
    var sheets = getKarigerSheets(activeKarigerId);
    var sh = sheets[activeSheetIndex];
    if (!k || !sh) return;
    var c = calculateSheetTotals(sh);

    var mob = (k.mobile || "").trim().replace(/[^0-9]/g, "");
    if (!mob || mob.length < 10) {
        mob = prompt("Kariger ka 10-digit WhatsApp number:", mob);
        if (!mob) return;
        mob = mob.trim().replace(/[^0-9]/g, "");
    }
    if (mob.length === 10) mob = "91" + mob;

    var msg = "🧵 *SIMPLICITY KARKHANA ERP*\n" +
              "👤 *कारीगर:* " + k.name + "\n" +
              "📑 *खाता:* " + sh.title + "\n" +
              "🥻 कुल साड़ी: *" + c.totSaree + " Pcs*\n" +
              "⚠️ लोट साड़ी: *" + c.totLott + " Pcs*\n" +
              "✅ नेट साड़ी: *" + c.netSaree + " Pcs*\n" +
              "🧶 बाना बकाया: *" + c.remainingBana + " Kg*\n" +
              "✨ जरी बकाया: *" + c.remainingZari + " Kg*\n" +
              "💰 कुल मजदूरी: *₹ " + c.grossBani + "*\n" +
              "💵 दिया गया: *₹ " + c.totPaid + "*\n" +
              "🔴 *अंतिम बाकी रुपया: ₹ " + c.remainingAmt + "*";

    window.open("https://wa.me/" + mob + "?text=" + encodeURIComponent(msg), "_blank");
}
