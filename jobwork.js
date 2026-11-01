/* ========================================================
   SIMPLICITY ERP - JOB WORK HUB, BATCH & BILLING ENGINE
   File: jobwork.js • Developed by Farhan Jawed
======================================================== */

var currentJobWorkMode = "hub";
var activeJobWorkerId = null;
var activeJobSheetId = null;
var currentDiyaBatch = [];
var currentAayiBatch = [];
var activeBatchModalInfo = null;
var currentJwBillTab = "pending";
var currentJwMovementTab = "cutting";

function openJobWorkModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("jobwork-section", "block");
    showJobWorkHub();
}

function showJobWorkHub() {
    currentJobWorkMode = "hub";
    activeJobWorkerId = null;
    activeJobSheetId = null;
    setDisplay("jw-hub-view", "block");
    setDisplay("jw-workers-view", "none");
    setDisplay("jw-sheet-view", "none");
    setDisplay("jw-dukan-view", "none");
    setDisplay("jw-billing-view", "none");
    setDisplay("jw-movement-view", "none");
    updateJobWorkHubBadges();
}

function openJobWorkSubSection(mode) {
    currentJobWorkMode = mode;
    setDisplay("jw-hub-view", "none");

    if (mode === "cutting" || mode === "calender") {
        setDisplay("jw-sheet-view", "none");
        setDisplay("jw-dukan-view", "none");
        setDisplay("jw-billing-view", "none");
        setDisplay("jw-movement-view", "none");
        setDisplay("jw-workers-view", "block");

        var titleEl = document.getElementById("jw-workers-title");
        var addBtnEl = document.getElementById("jw-add-worker-btn-text");
        if (mode === "cutting") {
            if (titleEl) titleEl.textContent = "✂️ Booti Cutting Workers List";
            if (addBtnEl) addBtnEl.textContent = "+ Naya Cutting Kariger";
        } else {
            if (titleEl) titleEl.textContent = "🎛️ Calender Workers List";
            if (addBtnEl) addBtnEl.textContent = "+ Naya Calender Kariger";
        }
        renderJobWorkWorkersTable();
    } else if (mode === "dukan") {
        setDisplay("jw-workers-view", "none");
        setDisplay("jw-sheet-view", "none");
        setDisplay("jw-billing-view", "none");
        setDisplay("jw-movement-view", "none");
        setDisplay("jw-dukan-view", "block");
        if (typeof renderDukanTransferTable === "function") renderDukanTransferTable();
    } else if (mode === "billing") {
        setDisplay("jw-workers-view", "none");
        setDisplay("jw-sheet-view", "none");
        setDisplay("jw-dukan-view", "none");
        setDisplay("jw-movement-view", "none");
        setDisplay("jw-billing-view", "block");
        initJobWorkBillingView();
    } else if (mode === "movement") {
        setDisplay("jw-workers-view", "none");
        setDisplay("jw-sheet-view", "none");
        setDisplay("jw-dukan-view", "none");
        setDisplay("jw-billing-view", "none");
        setDisplay("jw-movement-view", "block");
        setJwMovementToday();
    }
}

function updateJobWorkHubBadges() {
    var workers = getJobWorkers();
    var cutCount = workers.filter(function(w) { return w && w.type === "cutting"; }).length;
    var calCount = workers.filter(function(w) { return w && w.type === "calender"; }).length;

    var elCut = document.getElementById("jw-hub-badge-cutting");
    var elCal = document.getElementById("jw-hub-badge-calender");
    var elDuk = document.getElementById("jw-hub-badge-dukan");
    var elBill = document.getElementById("jw-hub-badge-billing");

    if (elCut) elCut.textContent = cutCount + " Kariger";
    if (elCal) elCal.textContent = calCount + " Kariger";

    var totSent = 0;
    if (typeof getDukanTransfers === "function") {
        getDukanTransfers().forEach(function(d) { totSent += (Number(d.pcs) || 0); });
    }
    if (elDuk) elDuk.textContent = totSent + " Pcs Bheje";

    if (elBill) elBill.textContent = "Baki: ₹ " + getJwBillingStats().pending.toFixed(0);

    if (typeof getCuttingSareeLiveStats === "function") {
        var cutStats = getCuttingSareeLiveStats();
        var elCutAayi = document.getElementById("jw-stat-cut-aayi");
        var elCutSent = document.getElementById("jw-stat-cut-sent-cal");
        var elCutBacha = document.getElementById("jw-stat-cut-bacha");
        if (elCutAayi) elCutAayi.textContent = cutStats.totAayi + " Pcs";
        if (elCutSent) elCutSent.textContent = cutStats.sentToCal + " Pcs";
        if (elCutBacha) elCutBacha.textContent = cutStats.bacha + " Pcs";
    }
}

function getJobWorkers() { return safeArray(getStore("jobwork_workers")); }
function saveJobWorkers(list) { setStore("jobwork_workers", safeArray(list)); }

function getJobWorkerLastActiveInfo(workerId) {
    var latestDate = null;
    getJobWorkerSheets(workerId).forEach(function(sh) {
        if (sh && sh.rows) {
            safeArray(sh.rows).forEach(function(r) {
                if (r && r.date && (!latestDate || r.date > latestDate)) latestDate = r.date;
            });
        }
    });
    var w = getJobWorkers().find(function(x) { return String(x.id) === String(workerId); });
    if (!latestDate) latestDate = (w && w.date) ? w.date : null;
    if (!latestDate) return { lastDate: "-", daysAbsent: 0 };
    var diffDays = Math.floor((new Date(getTodayDate()) - new Date(latestDate)) / (1000 * 60 * 60 * 24));
    return { lastDate: latestDate, daysAbsent: Math.max(0, diffDays) };
}

function toggleJobWorkerForm() {
    var f = document.getElementById("add-jw-worker-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    var dEl = document.getElementById("jw-worker-date");
    if (dEl) dEl.value = getTodayDate();
    cancelJobWorkerEdit();
}

function cancelJobWorkerEdit() {
    var setV = function(id, v) { var el = document.getElementById(id); if (el) el.value = v; };
    setV("jw-worker-edit-id", "");
    setV("jw-worker-name", "");
    setV("jw-worker-address", "");
    setV("jw-worker-mobile", "");
    setV("jw-worker-date", getTodayDate());
    var btn = document.getElementById("jw-worker-save-btn");
    if (btn) btn.textContent = "Save Kariger";
    setDisplay("jw-worker-cancel-btn", "none");
}

function saveNewJobWorker() {
    var editId = document.getElementById("jw-worker-edit-id").value;
    var d = document.getElementById("jw-worker-date").value || getTodayDate();
    var n = (document.getElementById("jw-worker-name").value || "").trim().toUpperCase();
    var addr = (document.getElementById("jw-worker-address").value || "").trim();
    var m = (document.getElementById("jw-worker-mobile").value || "").trim();
    if (!n) return alert("Kariger ka naam zaroori hai!");

    var list = getJobWorkers();
    if (editId) {
        var it = list.find(function(x) { return String(x.id) === String(editId); });
        if (it) { it.name = n; it.address = addr; it.mobile = m; it.date = d; }
    } else {
        list.push({ id: "jw_" + Date.now(), type: currentJobWorkMode, date: d, name: n, address: addr, mobile: m });
    }
    saveJobWorkers(list);
    cancelJobWorkerEdit();
    setDisplay("add-jw-worker-form", "none");
    renderJobWorkWorkersTable();
    updateJobWorkHubBadges();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function editJobWorker(workerId) {
    var w = getJobWorkers().find(function(x) { return String(x.id) === String(workerId); });
    if (!w) return;
    var f = document.getElementById("add-jw-worker-form");
    if (f) f.style.display = "block";
    document.getElementById("jw-worker-edit-id").value = w.id;
    document.getElementById("jw-worker-date").value = w.date || getTodayDate();
    document.getElementById("jw-worker-name").value = w.name;
    document.getElementById("jw-worker-address").value = w.address || "";
    document.getElementById("jw-worker-mobile").value = w.mobile || "";
    document.getElementById("jw-worker-save-btn").textContent = "Update Kariger";
    setDisplay("jw-worker-cancel-btn", "inline-block");
}

function deleteJobWorker(workerId) {
    if (!confirm("Kya is Job Worker ko delete karna chahte hain?")) return;
    saveJobWorkers(getJobWorkers().filter(function(x) { return String(x.id) !== String(workerId); }));
    renderJobWorkWorkersTable();
    updateJobWorkHubBadges();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function filterJobWorkWorkers() { renderJobWorkWorkersTable(); }

function renderJobWorkWorkersTable() {
    var tbody = document.getElementById("jw-workers-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var filtered = getJobWorkers().filter(function(w) { return w && w.type === currentJobWorkMode; });
    var txt = (document.getElementById("jw-search-worker-input") && document.getElementById("jw-search-worker-input").value || "").toLowerCase().trim();
    if (txt) {
        filtered = filtered.filter(function(w) {
            return (String(w.name || "") + " " + String(w.address || "") + " " + String(w.mobile || "")).toLowerCase().indexOf(txt) !== -1;
        });
    }

    var minDays = parseInt(document.getElementById("jw-absent-filter") && document.getElementById("jw-absent-filter").value || 0, 10) || 0;
    if (minDays > 0) {
        filtered = filtered.filter(function(w) { return getJobWorkerLastActiveInfo(w.id).daysAbsent >= minDays; });
    }

    var totGayi = 0, totAayi = 0, totDmg = 0;
    getJobWorkers().filter(function(w) { return w && w.type === currentJobWorkMode; }).forEach(function(w) {
        var sum = getJobWorkerOverallSummary(w.id);
        totGayi += sum.totGayi; totAayi += sum.totAayi; totDmg += sum.totDmg;
    });

    var elGayi = document.getElementById("jw-stat-total-gayi");
    var elAayi = document.getElementById("jw-stat-total-aayi");
    var elDmg = document.getElementById("jw-stat-total-damage");
    if (elGayi) elGayi.textContent = totGayi + " Pcs";
    if (elAayi) elAayi.textContent = totAayi + " Pcs";
    if (elDmg) elDmg.textContent = totDmg + " Pcs";

    if (!filtered.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Koi Kariger nahi mila.</td></tr>";
        return;
    }

    filtered.forEach(function(w) {
        var act = getJobWorkerLastActiveInfo(w.id);
        var statusBadge = act.daysAbsent >= 30 
            ? "<span class='badge-red' style='font-size:11px;'>⚠️ " + act.daysAbsent + " Din se nahi aaye</span>"
            : (act.daysAbsent >= 15 ? "<span style='background:#fff7ed; color:#ea580c; border:1px solid #fed7aa; padding:3px 7px; border-radius:20px; font-weight:700; font-size:11px;'>🟠 " + act.daysAbsent + " Din hue</span>" : "<span class='badge-green' style='font-size:11px;'>🟢 Active</span>");

        var tagadaBtn = act.daysAbsent >= 15 
            ? " <button class='quick-btn btn-out' style='background:#fee2e2; border-color:#fca5a5; font-size:11px;' onclick='sendJobWorkerTagadaWhatsApp(\"" + w.id + "\", " + act.daysAbsent + ")'>📲 तगादा</button>" : "";

        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(w.date) + "</td>" +
            "<td><strong>" + w.name + "</strong></td>" +
            "<td>" + (w.address || "-") + "</td>" +
            "<td>" + (w.mobile || "-") + "</td>" +
            "<td>" + statusBadge + "</td>" +
            "<td style='text-align:center;'><button class='sheet-btn' onclick='openJobWorkerSheet(\"" + w.id + "\")'>📊 Sheet Khata</button> " + tagadaBtn + " <button class='edit-btn' onclick='editJobWorker(\"" + w.id + "\")'>✏️</button> <button class='delete-btn' onclick='deleteJobWorker(\"" + w.id + "\")'>🗑️</button></td>" +
        "</tr>";
    });
}

function sendJobWorkerTagadaWhatsApp(workerId, days) {
    var w = getJobWorkers().find(function(x) { return String(x.id) === String(workerId); });
    if (!w) return;
    var typeTitle = (w.type === "calender") ? "कैलेंडर" : "कटिंग";
    var msg = "सलाम " + w.name + " भाई,\n\nकारखाने से साड़ी (" + typeTitle + ") का काम ले जाए आपको *" + days + " दिन* हो चुके हैं।\nकृपया जल्द से जल्द आकर हिसाब करें।\n\n_Simplicity ERP_";
    var mob = (w.mobile || "").trim().replace(/[^0-9]/g, "");
    if (!mob) {
        mob = prompt(w.name + " ka WhatsApp number:");
        if (!mob) return;
        mob = mob.trim().replace(/[^0-9]/g, "");
    }
    if (mob.length === 10) mob = "91" + mob;
    window.open("https://wa.me/" + mob + "?text=" + encodeURIComponent(msg), "_blank");
}

function viewJobWorkSummaryPassbook(boxCategory) {
    var typeTitle = (currentJobWorkMode === "calender") ? "Calender" : "Cutting";
    var catTitle = (boxCategory === "gayi") ? "Saree Gayi" : (boxCategory === "aayi" ? "Saree Wapas Aayi" : "Damage Saree");
    var entries = [];

    getJobWorkers().filter(function(w) { return w && w.type === currentJobWorkMode; }).forEach(function(w) {
        getJobWorkerSheets(w.id).forEach(function(sh) {
            safeArray(sh.rows).forEach(function(r) {
                if (!r) return;
                if (boxCategory === "gayi" && Number(r.gayiQty) > 0) {
                    var sourceLabel = (r.stockSource === "cutting") ? "Cutting Se" : "Fresh Godown Se";
                    entries.push({ date: r.date, type: "Gayi (" + sourceLabel + ")", qty: Number(r.gayiQty) + " Pcs", kariger: w.name + " (" + sh.title + ")" });
                } else if (boxCategory === "aayi" && Number(r.aayiQty) > 0) {
                    entries.push({ date: r.date, type: "Wapas Aayi", qty: Number(r.aayiQty) + " Pcs", kariger: w.name + " (" + sh.title + ")" });
                } else if (boxCategory === "damage" && Number(r.damagePcs) > 0) {
                    entries.push({ date: r.date, type: "Damage Saree", qty: Number(r.damagePcs) + " Pcs (-₹" + (r.damageAmt || 0) + ")", kariger: w.name + " (" + sh.title + ")" });
                }
            });
        });
    });

    if (typeof isModalSareePassbookMode !== "undefined") isModalSareePassbookMode = false;
    if (typeof viewCustomDatePassbook === "function") viewCustomDatePassbook(typeTitle + " - " + catTitle, entries, "saree_history");
}

function getJobWorkerSheets(workerId) {
    if (!workerId) return [];
    var sheets = safeArray(getStore("jobwork_sheets_" + workerId));
    sheets.forEach(function(sh) { if (sh) sh.rows = safeArray(sh.rows); });
    return sheets;
}

function saveJobWorkerSheets(workerId, sheets) {
    if (!workerId) return;
    var cleanSheets = safeArray(sheets);
    cleanSheets.forEach(function(sh) { if (sh) sh.rows = safeArray(sh.rows); });
    setStore("jobwork_sheets_" + workerId, cleanSheets);
}

function calculateJobWorkSheetTotals(sh) {
    var def = { closingPendingSaree: 0, closingBakiAmt: 0, totGayiQty: 0, totAayiQty: 0, totDamageAmt: 0, totDamagePcs: 0, pendingSaree: 0 };
    if (!sh || typeof sh !== "object") return def;
    var gayiQ = 0, aayiQ = 0, dmgAmt = 0, dmgPcs = 0;

    safeArray(sh.rows).forEach(function(r) {
        if (!r) return;
        gayiQ += (Number(r.gayiQty) || 0);
        aayiQ += (Number(r.aayiQty) || 0);
        dmgAmt += (Number(r.damageAmt) || 0);
        dmgPcs += (Number(r.damagePcs) || 0);
    });

    var pichliSaree = Number(sh.closingPendingSaree) || 0;
    return {
        closingPendingSaree: pichliSaree, closingBakiAmt: Number(sh.closingBakiAmt) || 0,
        totGayiQty: gayiQ, totAayiQty: aayiQ, totDamageAmt: dmgAmt, totDamagePcs: dmgPcs,
        pendingSaree: Math.max(0, (pichliSaree + gayiQ) - (aayiQ + dmgPcs))
    };
}

function getJobWorkerOverallSummary(workerId) {
    var sheets = getJobWorkerSheets(workerId);
    if (!sheets || !sheets.length) return { totGayi: 0, totAayi: 0, totDmg: 0, pendingSaree: 0 };
    var gTot = 0, aTot = 0, dTot = 0;
    sheets.forEach(function(sh) {
        var c = calculateJobWorkSheetTotals(sh);
        gTot += c.totGayiQty; aTot += c.totAayiQty; dTot += c.totDamagePcs;
    });
    return { totGayi: gTot, totAayi: aTot, totDmg: dTot, pendingSaree: calculateJobWorkSheetTotals(sheets[sheets.length - 1]).pendingSaree };
}

function openJobWorkerSheet(workerId) {
    var w = getJobWorkers().find(function(x) { return String(x.id) === String(workerId); });
    if (!w) return alert("Kariger nahi mila!");
    activeJobWorkerId = w.id;
    var typeTitle = (w.type === "calender") ? "Calender" : "Booti Cutting";
    var sess = (typeof getActiveFinancialSession === "function") ? getActiveFinancialSession() : "2026-2027";
    document.getElementById("jw-sheet-banner-name").textContent = w.name + " (" + typeTitle + " • " + sess + " Khata)";

    var dToday = getTodayDate();
    if (document.getElementById("jw-form-diya-date")) document.getElementById("jw-form-diya-date").value = dToday;
    if (document.getElementById("jw-form-aayi-date")) document.getElementById("jw-form-aayi-date").value = dToday;

    currentDiyaBatch = []; currentAayiBatch = [];
    renderDiyaBatchChips(); renderAayiBatchChips();
    populateKarigersDatalist();

    var stockSelectWrap = document.getElementById("jw-calender-stock-source-wrap");
    var cuttingNotice = document.getElementById("jw-cutting-notice");
    if (w.type === "calender") {
        if (stockSelectWrap) stockSelectWrap.style.display = "flex";
        if (cuttingNotice) cuttingNotice.style.display = "none";
    } else {
        if (stockSelectWrap) stockSelectWrap.style.display = "none";
        if (cuttingNotice) cuttingNotice.style.display = "block";
    }

    setDisplay("jw-workers-view", "none");
    setDisplay("jw-sheet-view", "block");

    var sheets = getJobWorkerSheets(activeJobWorkerId);
    if (!sheets || !sheets.length) {
        sheets = [{ id: "jw_sh_" + Date.now(), title: "Month 1 (" + dToday.substring(0, 7) + ")", closingPendingSaree: 0, closingBakiAmt: 0, rows: [] }];
        saveJobWorkerSheets(activeJobWorkerId, sheets);
    }
    activeJobSheetId = sheets[sheets.length - 1].id;
    renderJobWorkSheetTabs();
    loadCurrentJobWorkSheet();
}

function closeJobWorkerSheet() {
    activeJobWorkerId = null; activeJobSheetId = null;
    currentDiyaBatch = []; currentAayiBatch = [];
    setDisplay("jw-sheet-view", "none");
    setDisplay("jw-workers-view", "block");
    renderJobWorkWorkersTable();
    updateJobWorkHubBadges();
}

function renderJobWorkSheetTabs() {
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var box = document.getElementById("jw-month-tabs-container");
    if (!box) return;
    box.innerHTML = "";
    sheets.forEach(function(sh) {
        if (!sh) return;
        var btn = document.createElement("button");
        btn.className = "sheet-tab" + (String(sh.id) === String(activeJobSheetId) ? " active" : "");
        btn.innerHTML = sh.title + (sheets.length > 1 ? "<span class='del-tab-btn' onclick='deleteJobWorkerMonthlySheet(\"" + sh.id + "\", event)'> ×</span>" : "");
        btn.onclick = function() { switchJobWorkerSheetTab(sh.id); };
        box.appendChild(btn);
    });
}

function switchJobWorkerSheetTab(id) {
    activeJobSheetId = id;
    renderJobWorkSheetTabs();
    loadCurrentJobWorkSheet();
}

function addNewJobWorkerMonthlySheet() {
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var cur = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); }) || sheets[sheets.length - 1];
    var calc = cur ? calculateJobWorkSheetTotals(cur) : { pendingSaree: 0 };
    var newS = {
        id: "jw_sh_" + Date.now(),
        title: "Month " + (sheets.length + 1) + " (" + getTodayDate().substring(0, 7) + ")",
        closingPendingSaree: calc.pendingSaree, closingBakiAmt: 0, rows: []
    };
    sheets.push(newS);
    saveJobWorkerSheets(activeJobWorkerId, sheets);
    activeJobSheetId = newS.id;
    renderJobWorkSheetTabs();
    loadCurrentJobWorkSheet();
    alert("✅ Naya Mahina jud gaya! Pichla hisab carry-forward ho gaya.");
}

function deleteJobWorkerMonthlySheet(sheetId, e) {
    if (e) e.stopPropagation();
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    if (sheets.length <= 1) return alert("Pehli sheet delete nahi ho sakti!");
    if (!confirm("Kya is Mahine ki Sheet ko delete karna chahte hain?")) return;
    sheets = sheets.filter(function(s) { return s && String(s.id) !== String(sheetId); });
    saveJobWorkerSheets(activeJobWorkerId, sheets);
    activeJobSheetId = sheets[0].id;
    renderJobWorkSheetTabs();
    loadCurrentJobWorkSheet();
}

function loadCurrentJobWorkSheet() {
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); }) || sheets[0];
    if (!sh) return;
    activeJobSheetId = sh.id;
    document.getElementById("jw-sheet-active-badge").textContent = sh.title;
    var elPichliSaree = document.getElementById("jw-top-pichli-saree");
    if (elPichliSaree) elPichliSaree.value = sh.closingPendingSaree || 0;
    renderJobWorkSheetTable(sh);
}

function saveJobWorkSheetConfig() {
    if (!activeJobWorkerId) return;
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;
    sh.closingPendingSaree = parseInt(document.getElementById("jw-top-pichli-saree").value, 10) || 0;
    saveJobWorkerSheets(activeJobWorkerId, sheets);
    renderJobWorkSheetTable(sh);
}

function populateKarigersDatalist() {
    var dl = document.getElementById("dl-karigers-list");
    if (!dl) return;
    dl.innerHTML = "";
    safeArray(getStore("kariger_list")).forEach(function(k) {
        if (k && k.name) {
            var opt = document.createElement("option"); opt.value = k.name; dl.appendChild(opt);
        }
    });
}

function addDiyaBatchKarigarItem() {
    var kName = (document.getElementById("jw-diya-karigar").value || "").trim().toUpperCase();
    var qty = parseInt(document.getElementById("jw-diya-qty").value, 10) || 0;
    if (!kName || qty <= 0) return alert("Karigar aur Saree QTY bharein!");
    currentDiyaBatch.push({ id: "d_item_" + Date.now() + "_" + Math.floor(Math.random() * 1000), karigar: kName, qty: qty });
    document.getElementById("jw-diya-karigar").value = "";
    document.getElementById("jw-diya-qty").value = "";
    document.getElementById("jw-diya-karigar").focus();
    renderDiyaBatchChips();
}

function removeDiyaBatchItem(idx) { currentDiyaBatch.splice(idx, 1); renderDiyaBatchChips(); }

function renderDiyaBatchChips() {
    var wrap = document.getElementById("jw-diya-batch-chips");
    var totText = document.getElementById("jw-diya-batch-total-text");
    if (!wrap) return;
    wrap.innerHTML = "";
    var tot = 0;
    currentDiyaBatch.forEach(function(item, idx) {
        tot += item.qty;
        wrap.innerHTML += "<span style='background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; padding:3px 8px; border-radius:14px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:4px;'>" +
            item.karigar + ": " + item.qty + " Pcs <span style='cursor:pointer; color:#ef4444;' onclick='removeDiyaBatchItem(" + idx + ")'>✕</span></span>";
    });
    if (totText) totText.textContent = currentDiyaBatch.length ? ("👉 Gayi Saree Batch Total: " + tot + " Pcs") : "";
}

function addAayiBatchKarigarItem() {
    var kName = (document.getElementById("jw-aayi-karigar").value || "").trim().toUpperCase();
    var qty = parseInt(document.getElementById("jw-aayi-qty").value, 10) || 0;
    if (!kName || qty <= 0) return alert("Karigar aur Saree QTY bharein!");
    currentAayiBatch.push({ id: "a_item_" + Date.now() + "_" + Math.floor(Math.random() * 1000), karigar: kName, qty: qty });
    document.getElementById("jw-aayi-karigar").value = "";
    document.getElementById("jw-aayi-qty").value = "";
    document.getElementById("jw-aayi-karigar").focus();
    renderAayiBatchChips();
}

function removeAayiBatchItem(idx) { currentAayiBatch.splice(idx, 1); renderAayiBatchChips(); }

function renderAayiBatchChips() {
    var wrap = document.getElementById("jw-aayi-batch-chips");
    var totText = document.getElementById("jw-aayi-batch-total-text");
    if (!wrap) return;
    wrap.innerHTML = "";
    var tot = 0;
    currentAayiBatch.forEach(function(item, idx) {
        tot += item.qty;
        wrap.innerHTML += "<span style='background:#dcfce7; color:#15803d; border:1px solid #86efac; padding:3px 8px; border-radius:14px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:4px;'>" +
            item.karigar + ": " + item.qty + " Pcs <span style='cursor:pointer; color:#dc2626;' onclick='removeAayiBatchItem(" + idx + ")'>✕</span></span>";
    });
    if (totText) totText.textContent = currentAayiBatch.length ? ("👉 Wapas Aayi Batch Total: " + tot + " Pcs") : "";
}

// ================= BATCH SAVE & ACCURATE IN/OUT TRACKING =================
function saveJobWorkBatchLine() {
    if (!activeJobWorkerId) return;
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;

    var worker = getJobWorkers().find(function(x) { return String(x.id) === String(activeJobWorkerId); });
    var workerName = worker ? worker.name : "Worker";
    var isCalender = (worker && worker.type === "calender");

    var totGayi = 0; currentDiyaBatch.forEach(function(x) { totGayi += (Number(x.qty) || 0); });
    var totAayi = 0; currentAayiBatch.forEach(function(x) { totAayi += (Number(x.qty) || 0); });
    var damagePcs = parseInt(document.getElementById("jw-form-damage-pcs").value, 10) || 0;
    var damageAmt = parseFloat(document.getElementById("jw-form-damage-amt").value) || 0;

    if (totGayi === 0 && totAayi === 0 && damagePcs === 0) return alert("Jane ya Aane wali saree ke karigar [+] jodein!");

    var stockSource = (isCalender && document.getElementById("jw-source-cutting") && document.getElementById("jw-source-cutting").checked) ? "cutting" : "fresh";
    var batchRowId = "jwb_" + Date.now();
    var dDate = (document.getElementById("jw-form-diya-date") && document.getElementById("jw-form-diya-date").value) || getTodayDate();
    var aDate = (document.getElementById("jw-form-aayi-date") && document.getElementById("jw-form-aayi-date").value) || getTodayDate();

    var allKars = safeArray(getStore("kariger_list"));

    // 1. SAREE GAYI (OUTWARD ENTRY)
    if (totGayi > 0) {
        var sH = safeArray(getStore("saree_history"));

        currentDiyaBatch.forEach(function(item) {
            var wKarName = (item.karigar || "General").trim().toUpperCase();
            var foundKar = allKars.find(function(k) { return k && k.name && k.name.trim().toUpperCase() === wKarName; });
            var sDesign = (foundKar && foundKar.saree) ? foundKar.saree : (foundKar ? foundKar.name : "Saree");
            var kGodown = (foundKar && foundKar.karkhanaId) ? foundKar.karkhanaId : "k_main";

            sH.push({
                id: "sh_diya_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                refId: batchRowId,
                date: dDate,
                sareeName: sDesign,
                karigerName: wKarName,
                kariger: wKarName,
                karkhanaId: kGodown,
                type: (stockSource === "cutting") ? "cutting" : "fresh",
                typeLabel: workerName + " (" + (isCalender ? "Calender" : "Cutting Worker") + ") ko bheja",
                aai: 0,
                gai: Number(item.qty || 0),
                isOut: true,
                note: workerName + " ko bheja"
            });
        });
        setStore("saree_history", sH);
    }

    // 2. SAREE AAYI (INWARD ENTRY)
    if (totAayi > 0) {
        var sH2 = safeArray(getStore("saree_history"));

        currentAayiBatch.forEach(function(item) {
            var wKarName = (item.karigar || "General").trim().toUpperCase();
            var foundKar = allKars.find(function(k) { return k && k.name && k.name.trim().toUpperCase() === wKarName; });
            var sDesign = (foundKar && foundKar.saree) ? foundKar.saree : (foundKar ? foundKar.name : "Saree");
            var kGodown = (foundKar && foundKar.karkhanaId) ? foundKar.karkhanaId : "k_main";

            sH2.push({
                id: "sh_aayi_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                refId: batchRowId,
                date: aDate,
                sareeName: sDesign,
                karigerName: wKarName,
                kariger: wKarName,
                karkhanaId: kGodown,
                type: isCalender ? "finished" : "cutting",
                typeLabel: workerName + " (" + (isCalender ? "Calender" : "Cutting") + ") se tayyar aayi",
                aai: Number(item.qty || 0),
                gai: 0,
                isOut: false,
                note: workerName + " se tayyar aayi"
            });
        });
        setStore("saree_history", sH2);
    }

    // 3. DAMAGE SAREE (LOTT)
    if (damagePcs > 0) {
        var sH3 = safeArray(getStore("saree_history"));
        sH3.push({
            id: "sh_dmg_" + Date.now(),
            refId: batchRowId,
            date: getTodayDate(),
            sareeName: "Damage Saree",
            karigerName: workerName,
            kariger: workerName,
            karkhanaId: "k_main",
            type: "lott",
            typeLabel: workerName + " se Damage Aayi (Fine: ₹" + damageAmt + ")",
            aai: damagePcs,
            gai: 0,
            isOut: false,
            note: "Damage Saree"
        });
        setStore("saree_history", sH3);
    }

    sh.rows = safeArray(sh.rows);
    sh.rows.push({
        id: batchRowId,
        date: (totGayi > 0) ? dDate : aDate,
        gayiQty: totGayi,
        gayiItems: [].concat(currentDiyaBatch),
        stockSource: stockSource,
        aayiQty: totAayi,
        aayiItems: [].concat(currentAayiBatch),
        damagePcs: damagePcs,
        damageAmt: damageAmt
    });

    saveJobWorkerSheets(activeJobWorkerId, sheets);
    currentDiyaBatch = [];
    currentAayiBatch = [];
    renderDiyaBatchChips();
    renderAayiBatchChips();
    document.getElementById("jw-form-damage-pcs").value = "";
    document.getElementById("jw-form-damage-amt").value = "";
    renderJobWorkSheetTable(sh);
    updateJobWorkHubBadges();
    if (typeof renderSareeTable === "function") renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Batch Entry Save ho gayi!");
}

function renderJobWorkSheetTable(sh) {
    var tbody = document.getElementById("jw-sheet-rows-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    var rows = safeArray(sh.rows);

    if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan='8' style='text-align:center; padding:15px; color:#888;'>Is Mahine me abhi koi entry nahi hui hai.</td></tr>";
    } else {
        rows.forEach(function(r, idx) {
            if (!r) return;
            var gayiBtn = (r.gayiQty > 0) ? ("<button class='detail-btn' style='background:#e11d48; font-size:11px;' onclick='openJwBatchModal(\"" + sh.id + "\", \"" + r.id + "\", \"gayi\")'>📖 " + (r.gayiItems ? r.gayiItems.length : 1) + " Kariger</button>") : "-";
            var aayiBtn = (r.aayiQty > 0) ? ("<button class='detail-btn' style='background:#059669; font-size:11px;' onclick='openJwBatchModal(\"" + sh.id + "\", \"" + r.id + "\", \"aayi\")'>📖 " + (r.aayiItems ? r.aayiItems.length : 1) + " Kariger</button>") : "-";

            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(r.date) + "</td>" +
                "<td>" + (r.gayiQty > 0 ? ("<strong style='color:#dc2626;'>-" + r.gayiQty + " Pcs</strong>") : "-") + "</td>" +
                "<td>" + gayiBtn + "</td>" +
                "<td>" + (r.aayiQty > 0 ? ("<strong style='color:#059669;'>+" + r.aayiQty + " Pcs</strong>") : "-") + "</td>" +
                "<td>" + aayiBtn + "</td>" +
                "<td>" + (r.damagePcs > 0 ? ("<strong style='color:#ea580c;'>⚠️ " + r.damagePcs + " Pcs</strong>") : "-") + "</td>" +
                "<td>" + (r.damageAmt > 0 ? ("₹ " + r.damageAmt) : "-") + "</td>" +
                "<td style='text-align:center;'><button class='delete-btn' onclick='deleteJobWorkBatchRow(" + idx + ")'>🗑️ Delete</button></td>" +
            "</tr>";
        });
    }

    var c = calculateJobWorkSheetTotals(sh);
    var setT = function(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
    setT("jw-card-total-gayi", c.totGayiQty + " Pcs");
    setT("jw-card-total-aayi", c.totAayiQty + " Pcs");
    setT("jw-card-total-lott", c.totDamagePcs + " Pcs");
    setT("jw-calc-baki-saree-display", c.pendingSaree + " Pcs Baki");
}

function deleteJobWorkBatchRow(idx) {
    if (!confirm("Kya is poori Batch Line ko delete karna chahte hain? Saree stock theek ho jayega.")) return;
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;
    var r = safeArray(sh.rows)[idx];
    if (!r) return;

    if (r.id) {
        var sH = safeArray(getStore("saree_history")).filter(function(h) { return !h || String(h.refId) !== String(r.id); });
        setStore("saree_history", sH);
    }

    sh.rows.splice(idx, 1);
    saveJobWorkerSheets(activeJobWorkerId, sheets);
    renderJobWorkSheetTable(sh);
    updateJobWorkHubBadges();
    if (typeof renderSareeTable === "function") renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("🗑️ Line delete ho gayi!");
}

function openJwBatchModal(sheetId, rowId, type) {
    activeBatchModalInfo = { sheetId: sheetId, rowId: rowId, type: type };
    var sh = getJobWorkerSheets(activeJobWorkerId).find(function(s) { return s && String(s.id) === String(sheetId); });
    var r = sh ? safeArray(sh.rows).find(function(x) { return x && String(x.id) === String(rowId); }) : null;
    if (!r) return;

    document.getElementById("jw-batch-modal-title").textContent = (type === "gayi") ? "📤 Gayi Saree Batch Breakdown" : "📥 Wapas Aayi Batch Breakdown";
    document.getElementById("jw-batch-modal-subtitle").textContent = "Tarikh: " + formatDateDisplay(r.date) + " | Kul Pcs: " + (type === "gayi" ? r.gayiQty : r.aayiQty);
    renderJwBatchModalTable();
    setDisplay("jw-batch-modal", "flex");
}

function closeJwBatchModal() { setDisplay("jw-batch-modal", "none"); activeBatchModalInfo = null; }

function renderJwBatchModalTable() {
    if (!activeBatchModalInfo) return;
    var sh = getJobWorkerSheets(activeJobWorkerId).find(function(s) { return s && String(s.id) === String(activeBatchModalInfo.sheetId); });
    var r = sh ? safeArray(sh.rows).find(function(x) { return x && String(x.id) === String(activeBatchModalInfo.rowId); }) : null;
    if (!r) return;

    var tbody = document.getElementById("jw-batch-modal-tbody");
    var tfoot = document.getElementById("jw-batch-modal-tfoot");
    if (!tbody) return;
    tbody.innerHTML = "";
    var items = (activeBatchModalInfo.type === "gayi") ? safeArray(r.gayiItems) : safeArray(r.aayiItems);
    var tot = 0;

    items.forEach(function(item, idx) {
        tot += (Number(item.qty) || 0);
        tbody.innerHTML += "<tr>" +
            "<td>" + (idx + 1) + "</td><td><strong>" + item.karigar + "</strong></td>" +
            "<td><strong style='color:#0d9488;'>" + item.qty + " Pcs</strong></td>" +
            "<td style='text-align:center;'><button class='edit-btn' onclick='editJwBatchItem(" + idx + ")'>✏️</button> <button class='delete-btn' onclick='deleteJwBatchItem(" + idx + ")'>🗑️</button></td>" +
        "</tr>";
    });
    if (tfoot) tfoot.innerHTML = "<tr style='background:#f0fdf4; font-weight:800; border-top:2px solid #0d9488;'><td colspan='2'>TOTAL:</td><td style='color:#0d9488;'>" + tot + " Pcs</td><td>-</td></tr>";
}

function editJwBatchItem(itemIdx) {
    if (!activeBatchModalInfo) return;
    var sh = getJobWorkerSheets(activeJobWorkerId).find(function(s) { return s && String(s.id) === String(activeBatchModalInfo.sheetId); });
    var r = sh ? safeArray(sh.rows).find(function(x) { return x && String(x.id) === String(activeBatchModalInfo.rowId); }) : null;
    if (!r) return;

    var isGayi = (activeBatchModalInfo.type === "gayi");
    var items = isGayi ? safeArray(r.gayiItems) : safeArray(r.aayiItems);
    var it = items[itemIdx];
    if (!it) return;

    var newKarName = prompt("Karigar Ka Naam:", it.karigar);
    if (!newKarName) return;
    var newQty = parseInt(prompt("Saree Qty (Pcs):", it.qty), 10);
    if (isNaN(newQty) || newQty <= 0) return alert("Sahi Qty daalein!");

    it.karigar = newKarName.trim().toUpperCase();
    it.qty = newQty;
    var newTot = 0; items.forEach(function(x) { newTot += (Number(x.qty) || 0); });
    if (isGayi) r.gayiQty = newTot; else r.aayiQty = newTot;

    saveJobWorkerSheets(activeJobWorkerId, getJobWorkerSheets(activeJobWorkerId));
    renderJwBatchModalTable();
    renderJobWorkSheetTable(sh);
    updateJobWorkHubBadges();
}

function deleteJwBatchItem(itemIdx) {
    if (!confirm("Kya is item ko delete karna chahte hain?")) return;
    if (!activeBatchModalInfo) return;
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeBatchModalInfo.sheetId); });
    var r = sh ? safeArray(sh.rows).find(function(x) { return x && String(x.id) === String(activeBatchModalInfo.rowId); }) : null;
    if (!r) return;

    var isGayi = (activeBatchModalInfo.type === "gayi");
    var items = isGayi ? safeArray(r.gayiItems) : safeArray(r.aayiItems);
    items.splice(itemIdx, 1);
    var newTot = 0; items.forEach(function(x) { newTot += (Number(x.qty) || 0); });
    if (isGayi) r.gayiQty = newTot; else r.aayiQty = newTot;

    saveJobWorkerSheets(activeJobWorkerId, sheets);
    renderJwBatchModalTable();
    renderJobWorkSheetTable(sh);
    updateJobWorkHubBadges();
}

function getJwBills() { return safeArray(getStore("jw_bills_list")); }
function saveJwBills(list) { setStore("jw_bills_list", safeArray(list)); }
function getJwPayments() { return safeArray(getStore("jw_payments_list")); }
function saveJwPayments(list) { setStore("jw_payments_list", safeArray(list)); }

function initJobWorkBillingView() {
    populateWorkerSelectOptions();
    if (document.getElementById("jw-bill-input-date")) document.getElementById("jw-bill-input-date").value = getTodayDate();
    renderJwBillsTable();
}

function populateWorkerSelectOptions() {
    var sel = document.getElementById("jw-bill-input-worker");
    if (!sel) return;
    sel.innerHTML = "";
    var workers = getJobWorkers();
    if (!workers.length) { sel.innerHTML = "<option value=''>Pehle Naya Kariger Banayein</option>"; return; }
    workers.forEach(function(w) {
        var opt = document.createElement("option"); opt.value = w.id;
        opt.textContent = w.name + " (" + ((w.type === "calender") ? "Calender" : "Cutting") + ")";
        sel.appendChild(opt);
    });
}

function toggleAddJwBillForm() {
    var f = document.getElementById("add-jw-bill-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    document.getElementById("jw-bill-input-date").value = getTodayDate();
}

function saveJobWorkNewBill() {
    var d = document.getElementById("jw-bill-input-date") ? document.getElementById("jw-bill-input-date").value : getTodayDate();
    var billNo = (document.getElementById("jw-bill-input-no") && document.getElementById("jw-bill-input-no").value.trim()) || "-";
    var note = (document.getElementById("jw-bill-input-note") && document.getElementById("jw-bill-input-note").value.trim()) || billNo;
    var wId = document.getElementById("jw-bill-input-worker") ? document.getElementById("jw-bill-input-worker").value : "";
    var pcs = parseInt(document.getElementById("jw-bill-input-pcs") ? document.getElementById("jw-bill-input-pcs").value : 0, 10) || 0;
    var amt = parseFloat(document.getElementById("jw-bill-input-amt") ? document.getElementById("jw-bill-input-amt").value : 0) || 0;
    if (!wId || amt <= 0) return alert("Worker aur Sahi Bill Amount (₹) bharein!");

    var worker = getJobWorkers().find(function(x) { return String(x.id) === String(wId); });
    var bills = getJwBills();
    bills.push({
        id: "bill_" + Date.now(), billNo: billNo, date: d || getTodayDate(),
        workerId: wId, workerName: worker ? worker.name : "Worker", workType: worker ? worker.type : "Job Work",
        pcs: pcs, billAmt: amt, paidAmt: 0, note: note
    });
    saveJwBills(bills);
    toggleAddJwBillForm();
    renderJwBillsTable();
    updateJobWorkHubBadges();
    alert("✅ Bill No: " + billNo + " save ho gaya!");
}

function getJwBillingStats() {
    var totBilled = 0, totPaid = 0;
    getJwBills().forEach(function(b) {
        if (!b) return;
        totBilled += (Number(b.billAmt) || 0);
        totPaid += (Number(b.paidAmt) || 0);
    });
    return { total: totBilled, paid: totPaid, pending: Math.max(0, totBilled - totPaid) };
}

function switchJwBillTab(tab) {
    currentJwBillTab = tab;
    var btnP = document.getElementById("btn-jw-bill-pending");
    var btnPd = document.getElementById("btn-jw-bill-paid");
    if (btnP) btnP.className = (tab === "pending") ? "sheet-tab active" : "sheet-tab";
    if (btnPd) btnPd.className = (tab === "paid") ? "sheet-tab active" : "sheet-tab";
    renderJwBillsTable();
}

function filterJwBills() {
    var txt = (document.getElementById("jw-search-bill-input") && document.getElementById("jw-search-bill-input").value || "").toLowerCase().trim();
    if (!txt) { renderJwBillsTable(); return; }
    renderJwBillsTable(getJwBills().filter(function(b) {
        return b && (String(b.workerName || "") + " " + String(b.billNo || "") + " " + String(b.date || "")).toLowerCase().indexOf(txt) !== -1;
    }));
}

function renderJwBillsTable(customList) {
    var thead = document.getElementById("jw-bills-table-thead");
    var tbody = document.getElementById("jw-bills-table-tbody");
    if (!thead || !tbody) return;
    tbody.innerHTML = "";

    var stats = getJwBillingStats();
    var setEl = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
    setEl("jw-bill-stat-total", "₹ " + stats.total.toFixed(2));
    setEl("jw-bill-stat-paid", "₹ " + stats.paid.toFixed(2));
    setEl("jw-bill-stat-pending", "₹ " + stats.pending.toFixed(2));

    var isPending = (currentJwBillTab === "pending");
    thead.innerHTML = "<tr style='background:" + (isPending ? "#dc2626" : "#059669") + "; color:white;'>" +
        "<th>Date</th><th>Bill No.</th><th>Job Worker</th><th>Process</th><th>Saree Pcs</th><th>Total (₹)</th><th>Paid (₹)</th><th>Baki (₹)</th><th>Status</th><th style='text-align:center;'>Action</th></tr>";

    var filtered = (customList || getJwBills()).filter(function(b) {
        if (!b) return false;
        var baki = Math.max(0, (Number(b.billAmt) || 0) - (Number(b.paidAmt) || 0));
        return isPending ? (baki > 0) : (baki <= 0);
    });

    if (!filtered.length) {
        tbody.innerHTML = "<tr><td colspan='10' style='text-align:center; padding:20px; color:#888;'>" + (isPending ? "Koi dena baki nahi hai!" : "Abhi koi paid bill nahi hai.") + "</td></tr>";
        return;
    }

    filtered.forEach(function(b) {
        var baki = Math.max(0, (Number(b.billAmt) || 0) - (Number(b.paidAmt) || 0));
        var payBtn = (baki > 0) ? ("<button class='quick-btn btn-in' style='background:#059669; color:white; font-size:11px;' onclick='openJwPayModal(\"" + b.id + "\")'>💰 Pay</button> ") : "";

        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(b.date) + "</td><td><strong style='color:#7c3aed;'>" + (b.billNo || "-") + "</strong></td>" +
            "<td><strong>" + b.workerName + "</strong></td><td>" + (b.workType === "calender" ? "🎛️ Calender" : "✂️ Cutting") + "</td>" +
            "<td>" + (b.pcs > 0 ? (b.pcs + " Pcs") : "-") + "</td>" +
            "<td><strong style='color:#dc2626;'>₹ " + Number(b.billAmt).toFixed(2) + "</strong></td>" +
            "<td><strong style='color:#059669;'>₹ " + Number(b.paidAmt).toFixed(2) + "</strong></td>" +
            "<td><strong style='color:#ea580c;'>₹ " + baki.toFixed(2) + "</strong></td>" +
            "<td>" + (baki > 0 ? ("<span class='badge-red'>Baki</span>") : ("<span class='badge-green'>✅ Clear</span>")) + "</td>" +
            "<td style='text-align:center;'><button class='detail-btn' style='background:#7c3aed; font-size:11px;' onclick='viewJwBillPassbook(\"" + b.id + "\")'>📖</button> " + payBtn + "<button class='whatsapp-btn' style='padding:4px 8px; font-size:11px;' onclick='sendJwPaymentWhatsAppReceipt(\"" + b.id + "\")'>📲</button> <button class='delete-btn' onclick='deleteJwBill(\"" + b.id + "\")'>🗑️</button></td>" +
        "</tr>";
    });
}

function viewJwBillPassbook(billId) {
    var b = getJwBills().find(function(x) { return String(x.id) === String(billId); });
    if (!b) return;
    var payments = getJwPayments().filter(function(p) { return p && String(p.billId) === String(billId); });
    document.getElementById("modal-item-title").textContent = "📖 Bill History: " + (b.billNo || "-") + " (" + b.workerName + ")";
    var tbody = document.getElementById("modal-history-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!payments.length) {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Is Bill par koi payment nahi hai.</td></tr>";
    } else {
        payments.forEach(function(p) {
            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(p.date) + "</td><td>" + (p.note || "Bill Payment") + " (" + p.mode + ")</td>" +
                "<td style='color:#059669; font-weight:700;'>₹ " + Number(p.amount).toFixed(2) + "</td>" +
                "<td style='text-align:center;'><button class='delete-btn' onclick='deleteJwPaymentEntry(\"" + p.id + "\", \"" + billId + "\")'>🗑️</button></td>" +
            "</tr>";
        });
    }
    setDisplay("item-modal", "flex");
}

function deleteJwPaymentEntry(payId, billId) {
    if (!confirm("Kya is payment record ko delete karna chahte hain?")) return;
    var payments = getJwPayments();
    var p = payments.find(function(x) { return x && String(x.id) === String(payId); });
    if (!p) return;

    var bills = getJwBills();
    var b = bills.find(function(x) { return x && String(x.id) === String(billId); });
    if (b) {
        b.paidAmt = Math.max(0, (Number(b.paidAmt) || 0) - (Number(p.amount) || 0));
        saveJwBills(bills);
    }
    saveJwPayments(payments.filter(function(x) { return !x || String(x.id) !== String(payId); }));
    viewJwBillPassbook(billId);
    renderJwBillsTable();
    updateJobWorkHubBadges();
    alert("🗑️ Payment delete ho gaya!");
}

function openJwPayModal(billId) {
    var b = getJwBills().find(function(x) { return String(x.id) === String(billId); });
    if (!b) return;
    var baki = Math.max(0, (Number(b.billAmt) || 0) - (Number(b.paidAmt) || 0));
    document.getElementById("jw-pay-bill-id").value = b.id;
    document.getElementById("jw-pay-modal-worker-text").textContent = "Bill: " + (b.billNo || "-") + " | " + b.workerName;
    document.getElementById("jw-pay-modal-baki-text").textContent = "Abhi Dena Baki: ₹ " + baki.toFixed(2);
    document.getElementById("jw-pay-date").value = getTodayDate();
    document.getElementById("jw-pay-amount").value = baki;
    document.getElementById("jw-pay-note").value = "Payment for Bill " + (b.billNo || "");
    setDisplay("jw-pay-modal", "flex");
}

function closeJwPayModal() { setDisplay("jw-pay-modal", "none"); }

function saveJobWorkPayment() {
    var billId = document.getElementById("jw-pay-bill-id").value;
    var d = document.getElementById("jw-pay-date").value || getTodayDate();
    var payAmt = parseFloat(document.getElementById("jw-pay-amount").value) || 0;
    var mode = document.getElementById("jw-pay-mode").value || "Cash";
    var note = (document.getElementById("jw-pay-note").value || "").trim();
    if (payAmt <= 0) return alert("Sahi Payment Amount bharein!");

    var bills = getJwBills();
    var b = bills.find(function(x) { return String(x.id) === String(billId); });
    if (!b) return;

    b.paidAmt = (Number(b.paidAmt) || 0) + payAmt;
    saveJwBills(bills);

    var payments = getJwPayments();
    payments.push({ id: "pay_" + Date.now(), billId: billId, billNo: b.billNo || "-", date: d, workerName: b.workerName, amount: payAmt, mode: mode, note: note });
    saveJwPayments(payments);

    closeJwPayModal();
    renderJwBillsTable();
    updateJobWorkHubBadges();
    alert("✅ ₹" + payAmt + " Payment save ho gaya!");
}

function sendJwPaymentWhatsAppReceipt(billId) {
    var b = getJwBills().find(function(x) { return String(x.id) === String(billId); });
    if (!b) return;
    var worker = getJobWorkers().find(function(w) { return String(w.id) === String(b.workerId); });
    var baki = Math.max(0, (Number(b.billAmt) || 0) - (Number(b.paidAmt) || 0));

    var text = "🧾 *JOB WORK PAYMENT RASEED* 🧾\n━━━━━━━━━━━━━━━━━━━━━\n" +
        "📄 *Bill No:* " + (b.billNo || "-") + "\n👤 *Job Worker:* " + b.workerName + "\n📅 *Tarikh:* " + formatDateDisplay(getTodayDate()) + "\n━━━━━━━━━━━━━━━━━━━━━\n" +
        "💰 Total Bill: ₹ " + Number(b.billAmt).toFixed(2) + "\n🟢 Paid: ₹ " + Number(b.paidAmt).toFixed(2) + "\n-------------------------------------\n" +
        (baki > 0 ? ("🔴 *BAKI HAI: ₹ " + baki.toFixed(2) + "*\n") : "🟢 *STATUS: CHUKTA HO GAYA*\n") +
        "━━━━━━━━━━━━━━━━━━━━━\n_Simplicity ERP • by Farhan Jawed_";

    var mobile = worker ? (worker.mobile || "").trim().replace(/[^0-9]/g, "") : "";
    if (!mobile) {
        mobile = prompt("WhatsApp Number (10-digit):");
        if (!mobile) return;
        mobile = mobile.trim().replace(/[^0-9]/g, "");
    }
    if (mobile.length === 10) mobile = "91" + mobile;
    window.open("https://wa.me/" + mobile + "?text=" + encodeURIComponent(text), "_blank");
}

function deleteJwBill(billId) {
    if (!confirm("Kya is Bill ko delete karna chahte hain? Sabhi jude payments bhi delete honge.")) return;
    saveJwBills(getJwBills().filter(function(x) { return !x || String(x.id) !== String(billId); }));
    saveJwPayments(getJwPayments().filter(function(p) { return !p || String(p.billId) !== String(billId); }));
    renderJwBillsTable();
    updateJobWorkHubBadges();
    alert("🗑️ Bill delete ho gaya!");
}

function shareJobWorkOnWhatsApp() {
    if (!activeJobWorkerId || !activeJobSheetId) return alert("Pehle koi Khata Sheet kholein!");
    var w = getJobWorkers().find(function(x) { return String(x.id) === String(activeJobWorkerId); });
    var sheet = getJobWorkerSheets(activeJobWorkerId).find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!w || !sheet) return alert("Data nahi mila!");

    var c = calculateJobWorkSheetTotals(sheet);
    var text = "🧾 *" + ((w.type === "calender") ? "CALENDER" : "BOOTI CUTTING") + " HISAB PARCHI* 🧾\n━━━━━━━━━━━━━━━━━━━━━\n" +
        "👤 *Kariger:* " + w.name + "\n📅 *Mahina:* " + sheet.title + "\n📅 *Tarikh:* " + formatDateDisplay(getTodayDate()) + "\n━━━━━━━━━━━━━━━━━━━━━\n" +
        (c.closingPendingSaree > 0 ? ("➕ Pichli Baki: *" + c.closingPendingSaree + " Pcs*\n") : "") +
        "🔴 Kul Gayi: *" + c.totGayiQty + " Pcs*\n🟢 Wapas Aayi: *" + c.totAayiQty + " Pcs*\n" +
        (c.totDamagePcs > 0 ? ("⚠️ Damage: *" + c.totDamagePcs + " Pcs*\n") : "") +
        "-------------------------------------\n🟠 *ABHI BAKI SAREE: " + c.pendingSaree + " Pcs*\n━━━━━━━━━━━━━━━━━━━━━\n_Simplicity ERP • by Farhan Jawed_";

    var mobile = (w.mobile || "").trim().replace(/[^0-9]/g, "");
    if (!mobile) {
        mobile = prompt("WhatsApp Number (10-digit):");
        if (!mobile) return;
        mobile = mobile.trim().replace(/[^0-9]/g, "");
    }
    if (mobile.length === 10) mobile = "91" + mobile;
    window.open("https://wa.me/" + mobile + "?text=" + encodeURIComponent(text), "_blank");
}

function setJwMovementToday() {
    var dEl = document.getElementById("jw-mov-date");
    if (dEl) dEl.value = getTodayDate();
    renderJwMovementDaybook();
}

function switchJwMovementTab(tab) {
    currentJwMovementTab = tab;
    ["cutting", "calender", "payment"].forEach(function(t) {
        var el = document.getElementById("btn-jw-mov-" + t);
        if (el) { if (t === tab) el.classList.add("active"); else el.classList.remove("active"); }
    });
    renderJwMovementDaybook();
}

function renderJwMovementDaybook() {
    var d = (document.getElementById("jw-mov-date") && document.getElementById("jw-mov-date").value) || getTodayDate();
    var thead = document.getElementById("jw-mov-table-thead");
    var tbody = document.getElementById("jw-mov-table-tbody");
    var tfoot = document.getElementById("jw-mov-table-tfoot");
    if (!thead || !tbody || !tfoot) return;
    tbody.innerHTML = "";

    var txt = (document.getElementById("jw-mov-search") && document.getElementById("jw-mov-search").value || "").toLowerCase().trim();
    var cutG = 0, cutA = 0, calG = 0, calA = 0, payOut = 0;
    var cuttingRows = [], calenderRows = [], paymentRows = [];

    getJobWorkers().forEach(function(w) {
        var isCal = (w.type === "calender");
        getJobWorkerSheets(w.id).forEach(function(sh) {
            safeArray(sh.rows).forEach(function(r) {
                if (!r || r.date !== d) return;
                var gQty = Number(r.gayiQty) || 0, aQty = Number(r.aayiQty) || 0;
                if (isCal) {
                    if (gQty > 0 || aQty > 0) {
                        calG += gQty; calA += aQty;
                        calenderRows.push({ worker: w.name, sheet: sh.title, gayi: gQty, aayi: aQty, damagePcs: r.damagePcs || 0 });
                    }
                } else {
                    if (gQty > 0 || aQty > 0) {
                        cutG += gQty; cutA += aQty;
                        cuttingRows.push({ worker: w.name, sheet: sh.title, gayi: gQty, aayi: aQty, damagePcs: r.damagePcs || 0 });
                    }
                }
            });
        });
    });

    getJwPayments().forEach(function(p) {
        if (p && p.date === d) {
            var amt = Number(p.amount) || 0; payOut += amt;
            paymentRows.push({ worker: p.workerName || "-", billNo: p.billNo || "-", amount: amt, mode: p.mode || "Cash" });
        }
    });

    var setSub = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
    setSub("sub-jw-mov-cutting", "Gayi: -" + cutG + " | Aayi: +" + cutA);
    setSub("sub-jw-mov-calender", "Gayi: -" + calG + " | Aayi: +" + calA);
    setSub("sub-jw-mov-payment", "Diya: -₹ " + payOut.toFixed(0));

    if (currentJwMovementTab === "cutting") {
        thead.innerHTML = "<tr style='background:#e11d48; color:white;'><th>Cutting Kariger</th><th>Sheet</th><th style='text-align:center;'>📤 Gayi</th><th style='text-align:center;'>📥 Wapas Aayi</th><th>⚠️ Damage</th></tr>";
        var filteredCut = cuttingRows.filter(function(r) { return !txt || (r.worker + " " + r.sheet).toLowerCase().indexOf(txt) !== -1; });
        if (!filteredCut.length) { tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:18px; color:#888;'>Koi entry nahi hai.</td></tr>"; }
        else {
            filteredCut.forEach(function(r) {
                tbody.innerHTML += "<tr><td><strong>" + r.worker + "</strong></td><td>" + r.sheet + "</td><td style='text-align:center;'><strong style='color:#dc2626;'>-" + r.gayi + " Pcs</strong></td><td style='text-align:center;'><strong style='color:#059669;'>+" + r.aayi + " Pcs</strong></td><td>" + (r.damagePcs > 0 ? ("⚠️ " + r.damagePcs) : "-") + "</td></tr>";
            });
        }
        tfoot.innerHTML = "<tr style='background:#fff1f2; font-weight:800; border-top:2px solid #e11d48;'><td colspan='2'>TOTAL CUTTING:</td><td style='color:#dc2626; text-align:center;'>-" + cutG + " Pcs</td><td style='color:#059669; text-align:center;'>+" + cutA + " Pcs</td><td>-</td></tr>";
    } else if (currentJwMovementTab === "calender") {
        thead.innerHTML = "<tr style='background:#0284c7; color:white;'><th>Calender Kariger</th><th>Sheet</th><th style='text-align:center;'>📤 Gayi</th><th style='text-align:center;'>📥 Wapas Aayi</th><th>⚠️ Damage</th></tr>";
        var filteredCal = calenderRows.filter(function(r) { return !txt || (r.worker + " " + r.sheet).toLowerCase().indexOf(txt) !== -1; });
        if (!filteredCal.length) { tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:18px; color:#888;'>Koi entry nahi hai.</td></tr>"; }
        else {
            filteredCal.forEach(function(r) {
                tbody.innerHTML += "<tr><td><strong>" + r.worker + "</strong></td><td>" + r.sheet + "</td><td style='text-align:center;'><strong style='color:#dc2626;'>-" + r.gayi + " Pcs</strong></td><td style='text-align:center;'><strong style='color:#059669;'>+" + r.aayi + " Pcs</strong></td><td>" + (r.damagePcs > 0 ? ("⚠️ " + r.damagePcs) : "-") + "</td></tr>";
            });
        }
        tfoot.innerHTML = "<tr style='background:#e0f2fe; font-weight:800; border-top:2px solid #0284c7;'><td colspan='2'>TOTAL CALENDER:</td><td style='color:#dc2626; text-align:center;'>-" + calG + " Pcs</td><td style='color:#059669; text-align:center;'>+" + calA + " Pcs</td><td>-</td></tr>";
    } else if (currentJwMovementTab === "payment") {
        thead.innerHTML = "<tr style='background:#7c3aed; color:white;'><th>Job Worker</th><th>Bill No.</th><th>Mode</th><th style='text-align:center;'>Diya (Paid)</th></tr>";
        var filteredPay = paymentRows.filter(function(r) { return !txt || (r.worker + " " + r.billNo).toLowerCase().indexOf(txt) !== -1; });
        if (!filteredPay.length) { tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:18px; color:#888;'>Koi payment nahi diya gaya.</td></tr>"; }
        else {
            filteredPay.forEach(function(r) {
                tbody.innerHTML += "<tr><td><strong>" + r.worker + "</strong></td><td>" + r.billNo + "</td><td>" + r.mode + "</td><td style='text-align:center;'><strong style='color:#dc2626;'>- ₹ " + r.amount.toFixed(2) + "</strong></td></tr>";
            });
        }
        tfoot.innerHTML = "<tr style='background:#f3e8ff; font-weight:800; border-top:2px solid #7c3aed;'><td colspan='3'>TOTAL BHUGTAN:</td><td style='color:#dc2626; text-align:center;'>- ₹ " + payOut.toFixed(2) + "</td></tr>";
    }
}
