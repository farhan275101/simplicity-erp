/* ========================================================
   SIMPLICITY ERP - JOB WORK, BATCH & BILLING ENGINE
   File 4 of 5 • Developed by Farhan Jawed
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
        renderDukanTransferTable();
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

function getCuttingSareeLiveStats() {
    var totCuttingAayi = 0;
    var totSentToCalender = 0;
    var allWorkers = getJobWorkers();

    allWorkers.filter(function(w) { return w && w.type === "cutting"; }).forEach(function(w) {
        getJobWorkerSheets(w.id).forEach(function(sh) {
            safeArray(sh.rows).forEach(function(r) { totCuttingAayi += (Number(r.aayiQty) || 0); });
        });
    });

    allWorkers.filter(function(w) { return w && w.type === "calender"; }).forEach(function(w) {
        getJobWorkerSheets(w.id).forEach(function(sh) {
            safeArray(sh.rows).forEach(function(r) {
                if (r && r.stockSource === "cutting") totSentToCalender += (Number(r.gayiQty) || 0);
            });
        });
    });

    return {
        totAayi: totCuttingAayi,
        sentToCal: totSentToCalender,
        bacha: Math.max(0, totCuttingAayi - totSentToCalender)
    };
}

function getMainGodownFreshSareeStockQty() {
    var tot = 0;
    safeArray(getStore("saree_stock")).filter(function(s) { return !s.karkhanaId || s.karkhanaId === "k_main"; }).forEach(function(s) {
        tot += (Number(s.pcs) || 0);
    });
    return tot;
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
    getDukanTransfers().forEach(function(d) { totSent += (Number(d.pcs) || 0); });
    if (elDuk) elDuk.textContent = totSent + " Pcs Bheje";

    if (elBill) elBill.textContent = "Baki: ₹ " + getJwBillingStats().pending.toFixed(0);

    var cutStats = getCuttingSareeLiveStats();
    var elCutAayi = document.getElementById("jw-stat-cut-aayi");
    var elCutSent = document.getElementById("jw-stat-cut-sent-cal");
    var elCutBacha = document.getElementById("jw-stat-cut-bacha");
    if (elCutAayi) elCutAayi.textContent = cutStats.totAayi + " Pcs";
    if (elCutSent) elCutSent.textContent = cutStats.sentToCal + " Pcs";
    if (elCutBacha) elCutBacha.textContent = cutStats.bacha + " Pcs";
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
    document.getElementById("jw-worker-date").value = getTodayDate();
    cancelJobWorkerEdit();
}

function cancelJobWorkerEdit() {
    document.getElementById("jw-worker-edit-id").value = "";
    document.getElementById("jw-worker-name").value = "";
    document.getElementById("jw-worker-address").value = "";
    document.getElementById("jw-worker-mobile").value = "";
    document.getElementById("jw-worker-date").value = getTodayDate();
    document.getElementById("jw-worker-save-btn").textContent = "Save Kariger";
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
    var sheets = getJobWorkerSh
