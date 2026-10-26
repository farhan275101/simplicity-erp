/* ========================================================
   SIMPLICITY ERP - JOB WORK (BATCH BUILDER, BILLING & SEARCH)
   File 7 of 7 • Developed by Farhan Jawed (Full Feature Engine)
======================================================== */

var currentJobWorkMode = "hub"; // "hub", "cutting", "calender", "dukan", "billing"
var activeJobWorkerId = null;
var activeJobSheetId = null;

// Temporary Batch Lists
var currentDiyaBatch = [];
var currentAayiBatch = [];

// Active Batch Modal Tracker
var activeBatchModalInfo = null;

// Billing active tab
var currentJwBillTab = "pending"; // "pending" ya "paid"

// ================= 1. NAVIGATION & HUB =================

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

    updateJobWorkHubBadges();
}

function openJobWorkSubSection(mode) {
    currentJobWorkMode = mode;
    setDisplay("jw-hub-view", "none");

    if (mode === "cutting" || mode === "calender") {
        setDisplay("jw-sheet-view", "none");
        setDisplay("jw-dukan-view", "none");
        setDisplay("jw-billing-view", "none");
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
        setDisplay("jw-dukan-view", "block");

        renderDukanTransferTable();
    } else if (mode === "billing") {
        setDisplay("jw-workers-view", "none");
        setDisplay("jw-sheet-view", "none");
        setDisplay("jw-dukan-view", "none");
        setDisplay("jw-billing-view", "block");

        initJobWorkBillingView();
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

    var dukanList = getDukanTransfers();
    var totSent = 0;
    dukanList.forEach(function(d) { totSent += (Number(d.pcs) || 0); });
    if (elDuk) elDuk.textContent = totSent + " Pcs Bheje";

    var bSummary = getJwBillingStats();
    if (elBill) elBill.textContent = "Baki: ₹ " + bSummary.pending.toFixed(0);
}

// ================= 2. WORKERS MASTER DATA & ABSENT FILTER =================

function getJobWorkers() {
    return safeArray(getStore("jobwork_workers"));
}

function saveJobWorkers(list) {
    setStore("jobwork_workers", safeArray(list));
}

function getJobWorkerLastActiveInfo(workerId) {
    var sheets = getJobWorkerSheets(workerId);
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

    var w = getJobWorkers().find(function(x) { return String(x.id) === String(workerId); });
    if (!latestDate) latestDate = (w && w.date) ? w.date : null;
    if (!latestDate) return { lastDate: "-", daysAbsent: 0 };

    var diffTime = new Date(getTodayDate()) - new Date(latestDate);
    var diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
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
        if (it) {
            it.name = n;
            it.address = addr;
            it.mobile = m;
            it.date = d;
        }
    } else {
        list.push({
            id: "jw_" + Date.now(),
            type: currentJobWorkMode,
            date: d,
            name: n,
            address: addr,
            mobile: m
        });
    }

    saveJobWorkers(list);
    cancelJobWorkerEdit();
    setDisplay("add-jw-worker-form", "none");
    renderJobWorkWorkersTable();
    updateJobWorkHubBadges();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function filterJobWorkWorkers() {
    renderJobWorkWorkersTable();
}

function renderJobWorkWorkersTable() {
    var tbody = document.getElementById("jw-workers-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var allWorkers = getJobWorkers();
    var filtered = allWorkers.filter(function(w) { return w && w.type === currentJobWorkMode; });

    var txt = (document.getElementById("jw-search-worker-input") && document.getElementById("jw-search-worker-input").value || "").toLowerCase().trim();
    if (txt) {
        filtered = filtered.filter(function(w) {
            return (String(w.name || "") + " " + String(w.address || "") + " " + String(w.mobile || "")).toLowerCase().indexOf(txt) !== -1;
        });
    }

    var minDays = parseInt(document.getElementById("jw-absent-filter") && document.getElementById("jw-absent-filter").value || 0) || 0;
    if (minDays > 0) {
        filtered = filtered.filter(function(w) {
            return getJobWorkerLastActiveInfo(w.id).daysAbsent >= minDays;
        });
    }

    var totGayi = 0, totAayi = 0, totDmg = 0;
    allWorkers.filter(function(w) { return w && w.type === currentJobWorkMode; }).forEach(function(w) {
        var sum = getJobWorkerOverallSummary(w.id);
        totGayi += sum.totGayi;
        totAayi += sum.totAayi;
        totDmg += sum.totDmg;
    });

    var elGayi = document.getElementById("jw-stat-total-gayi");
    var elAayi = document.getElementById("jw-stat-total-aayi");
    var elDmg = document.getElementById("jw-stat-total-damage");

    if (elGayi) elGayi.textContent = totGayi + " Pcs";
    if (elAayi) elAayi.textContent = totAayi + " Pcs";
    if (elDmg) elDmg.textContent = totDmg + " Pcs";

    if (!filtered.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Koi Kariger nahi mila. Upar '+ Naya Kariger' se jodein.</td></tr>";
        return;
    }

    filtered.forEach(function(w) {
        var act = getJobWorkerLastActiveInfo(w.id);
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
            tagadaBtn = " <button class='quick-btn btn-out' style='background:#fee2e2; border-color:#fca5a5; font-size:11px;' onclick='sendJobWorkerTagadaWhatsApp(\"" + w.id + "\", " + act.daysAbsent + ")'>📲 तगादा</button>";
        }

        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(w.date) + "</td>" +
            "<td><strong>" + w.name + "</strong></td>" +
            "<td>" + (w.address || "-") + "</td>" +
            "<td>" + (w.mobile || "-") + "</td>" +
            "<td>" + statusBadge + "</td>" +
            "<td style='text-align:center;'>" +
                "<button class='sheet-btn' onclick='openJobWorkerSheet(\"" + w.id + "\")'>📊 Sheet Khata</button>" +
                tagadaBtn + " " +
                "<button class='edit-btn' onclick='editJobWorker(\"" + w.id + "\")'>✏️</button> " +
                "<button class='delete-btn' onclick='deleteJobWorker(\"" + w.id + "\")'>🗑️</button>" +
            "</td>" +
        "</tr>";
    });
}

function sendJobWorkerTagadaWhatsApp(workerId, days) {
    var w = getJobWorkers().find(function(x) { return String(x.id) === String(workerId); });
    if (!w) return;

    var typeTitle = (w.type === "calender") ? "कैलेंडर" : "कटिंग";
    var msg = "सलाम " + w.name + " भाई,\n\n" +
              "कारखाने से साड़ी (" + typeTitle + ") का काम ले जाए आपको *" + days + " दिन* हो चुके हैं, और अभी तक आपका कोई माल या हिसाब जमा नहीं हुआ है।\n\n" +
              "कृपया जल्द से जल्द कारखाने आकर तैयार साड़ी जमा कराएं और अपना हिसाब करें।\n\n" +
              "_Simplicity Karkhana ERP_";

    var mob = (w.mobile || "").trim().replace(/[^0-9]/g, "");
    if (!mob) {
        mob = prompt(w.name + " ka 10-digit WhatsApp number daalein:");
        if (!mob || !mob.trim()) return;
        mob = mob.trim().replace(/[^0-9]/g, "");
    }
    if (mob.length === 10) mob = "91" + mob;

    window.open("https://wa.me/" + mob + "?text=" + encodeURIComponent(msg), "_blank");
}

// ================= 3. PASSBOOK FOR GAYI, AAYI, DAMAGE SUMMARY =================

function viewJobWorkSummaryPassbook(boxCategory) {
    var typeTitle = (currentJobWorkMode === "calender") ? "Calender" : "Cutting";
    var catTitle = (boxCategory === "gayi") ? "Saree Gayi" : (boxCategory === "aayi" ? "Saree Wapas Aayi" : "Damage Saree");

    var allWorkers = getJobWorkers().filter(function(w) { return w && w.type === currentJobWorkMode; });
    var entries = [];

    allWorkers.forEach(function(w) {
        var sheets = getJobWorkerSheets(w.id);
        sheets.forEach(function(sh) {
            safeArray(sh.rows).forEach(function(r) {
                if (!r) return;
                if (boxCategory === "gayi" && Number(r.gayiQty) > 0) {
                    entries.push({
                        date: r.date,
                        type: "Gayi (" + (r.stockSource || "Stock") + ")",
                        qty: Number(r.gayiQty) + " Pcs",
                        kariger: w.name + " (" + sh.title + ")"
                    });
                } else if (boxCategory === "aayi" && Number(r.aayiQty) > 0) {
                    entries.push({
                        date: r.date,
                        type: "Wapas Aayi",
                        qty: Number(r.aayiQty) + " Pcs",
                        kariger: w.name + " (" + sh.title + ")"
                    });
                } else if (boxCategory === "damage" && Number(r.damagePcs) > 0) {
                    entries.push({
                        date: r.date,
                        type: "Damage Saree",
                        qty: Number(r.damagePcs) + " Pcs (-₹" + (r.damageAmt || 0) + ")",
                        kariger: w.name + " (" + sh.title + ")"
                    });
                }
            });
        });
    });

    viewCustomDatePassbook(typeTitle + " - " + catTitle, entries, "saree_history");
}

// ================= 4. WORKER MONTHLY KHATA SHEET CONTROLLER =================

function getJobWorkerSheets(workerId) {
    if (!workerId) return [];
    var sheets = safeArray(getStore("jobwork_sheets_" + workerId));
    sheets.forEach(function(sh) {
        if (sh) sh.rows = safeArray(sh.rows);
    });
    return sheets;
}

function saveJobWorkerSheets(workerId, sheets) {
    if (!workerId) return;
    var cleanSheets = safeArray(sheets);
    cleanSheets.forEach(function(sh) {
        if (sh) sh.rows = safeArray(sh.rows);
    });
    setStore("jobwork_sheets_" + workerId, cleanSheets);
}

function calculateJobWorkSheetTotals(sh) {
    var def = {
        closingPendingSaree: 0,
        closingBakiAmt: 0,
        totGayiQty: 0,
        totAayiQty: 0,
        totDamageAmt: 0,
        totDamagePcs: 0,
        pendingSaree: 0
    };

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
    var pendingSaree = Math.max(0, (pichliSaree + gayiQ) - (aayiQ + dmgPcs));

    return {
        closingPendingSaree: pichliSaree,
        closingBakiAmt: Number(sh.closingBakiAmt) || 0,
        totGayiQty: gayiQ,
        totAayiQty: aayiQ,
        totDamageAmt: dmgAmt,
        totDamagePcs: dmgPcs,
        pendingSaree: pendingSaree
    };
}

function getJobWorkerOverallSummary(workerId) {
    var sheets = getJobWorkerSheets(workerId);
    if (!sheets || !sheets.length) {
        return { totGayi: 0, totAayi: 0, totDmg: 0, pendingSaree: 0 };
    }

    var gTot = 0, aTot = 0, dTot = 0;
    sheets.forEach(function(sh) {
        var c = calculateJobWorkSheetTotals(sh);
        gTot += c.totGayiQty;
        aTot += c.totAayiQty;
        dTot += c.totDamagePcs;
    });

    var latestSheet = sheets[sheets.length - 1];
    var latestCalc = calculateJobWorkSheetTotals(latestSheet);

    return {
        totGayi: gTot,
        totAayi: aTot,
        totDmg: dTot,
        pendingSaree: latestCalc.pendingSaree
    };
}

function openJobWorkerSheet(workerId) {
    var w = getJobWorkers().find(function(x) { return String(x.id) === String(workerId); });
    if (!w) return alert("Kariger nahi mila!");

    activeJobWorkerId = w.id;
    var typeTitle = (w.type === "calender") ? "Calender" : "Booti Cutting";
    document.getElementById("jw-sheet-banner-name").textContent = w.name + " (" + typeTitle + " Khata)";

    var dToday = getTodayDate();
    if (document.getElementById("jw-form-diya-date")) document.getElementById("jw-form-diya-date").value = dToday;
    if (document.getElementById("jw-form-aayi-date")) document.getElementById("jw-form-aayi-date").value = dToday;

    currentDiyaBatch = [];
    currentAayiBatch = [];
    renderDiyaBatchChips();
    renderAayiBatchChips();
    populateKarigersDatalist();

    // POINT 1: Stock Source Selection in Calender
    var stockSelectWrap = document.getElementById("jw-calender-stock-source-wrap");
    if (stockSelectWrap) {
        stockSelectWrap.style.display = (w.type === "calender") ? "flex" : "none";
    }

    setDisplay("jw-workers-view", "none");
    setDisplay("jw-sheet-view", "block");

    var sheets = getJobWorkerSheets(activeJobWorkerId);
    if (!sheets || !sheets.length) {
        sheets = [{
            id: "jw_sh_" + Date.now(),
            title: "Month 1 (" + dToday.substring(0, 7) + ")",
            closingPendingSaree: 0,
            closingBakiAmt: 0,
            rows: []
        }];
        saveJobWorkerSheets(activeJobWorkerId, sheets);
    }

    activeJobSheetId = sheets[sheets.length - 1].id;
    renderJobWorkSheetTabs();
    loadCurrentJobWorkSheet();
}

function closeJobWorkerSheet() {
    activeJobWorkerId = null;
    activeJobSheetId = null;
    currentDiyaBatch = [];
    currentAayiBatch = [];
    setDisplay("jw-sheet-view", "none");
    setDisplay("jw-workers-view", "block");
    renderJobWorkWorkersTable();
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
    var calc = cur ? calculateJobWorkSheetTotals(cur) : { pendingSaree: 0, finalBakiAmt: 0 };

    var nextMonthNum = sheets.length + 1;
    var monthName = "Month " + nextMonthNum + " (" + getTodayDate().substring(0, 7) + ")";

    var newS = {
        id: "jw_sh_" + Date.now(),
        title: monthName,
        closingPendingSaree: calc.pendingSaree,
        closingBakiAmt: 0,
        rows: []
    };

    sheets.push(newS);
    saveJobWorkerSheets(activeJobWorkerId, sheets);
    activeJobSheetId = newS.id;

    renderJobWorkSheetTabs();
    loadCurrentJobWorkSheet();
    alert("✅ Naya Mahina jud gaya! Pichla pending hisab carry-forward ho gaya.");
}

function deleteJobWorkerMonthlySheet(sheetId, e) {
    if (e) e.stopPropagation();
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    if (sheets.length <= 1) return alert("Pehli sheet delete nahi ho sakti!");
    if (!confirm("Kya aap is Mahine ki Sheet ko delete karna chahte hain?")) return;

    sheets = sheets.filter(function(s) { return s && String(s.id) !== String(sheetId); });
    saveJobWorkerSheets(activeJobWorkerId, sheets);
    activeJobSheetId = sheets[0].id;
    renderJobWorkSheetTabs();
    loadCurrentJobWorkSheet();
}

function loadCurrentJobWorkSheet() {
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });

    if (!sh) {
        if (sheets.length > 0) {
            sh = sheets[0];
            activeJobSheetId = sh.id;
        } else return;
    }

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

    sh.closingPendingSaree = parseInt(document.getElementById("jw-top-pichli-saree").value) || 0;
    saveJobWorkerSheets(activeJobWorkerId, sheets);
    renderJobWorkSheetTable(sh);
}

// ================= 5. [+] BATCH BUILDER SYSTEM (POINT 3) =================

function populateKarigersDatalist() {
    var dl = document.getElementById("dl-karigers-list");
    if (!dl) return;
    dl.innerHTML = "";

    var kList = (typeof sanitizeKarigerList === "function") ? sanitizeKarigerList() : [];
    kList.forEach(function(k) {
        if (k && k.name) {
            var opt = document.createElement("option");
            opt.value = k.name;
            dl.appendChild(opt);
        }
    });
}

function addDiyaBatchKarigarItem() {
    var kName = (document.getElementById("jw-diya-karigar").value || "").trim().toUpperCase();
    var qty = parseInt(document.getElementById("jw-diya-qty").value) || 0;

    if (!kName) return alert("Karigar ka naam daalein!");
    if (qty <= 0) return alert("Saree QTY bharein!");

    currentDiyaBatch.push({
        id: "d_item_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        karigar: kName,
        qty: qty
    });

    document.getElementById("jw-diya-karigar").value = "";
    document.getElementById("jw-diya-qty").value = "";
    document.getElementById("jw-diya-karigar").focus();

    renderDiyaBatchChips();
}

function removeDiyaBatchItem(idx) {
    currentDiyaBatch.splice(idx, 1);
    renderDiyaBatchChips();
}

function renderDiyaBatchChips() {
    var wrap = document.getElementById("jw-diya-batch-chips");
    var totText = document.getElementById("jw-diya-batch-total-text");
    if (!wrap) return;
    wrap.innerHTML = "";

    var tot = 0;
    currentDiyaBatch.forEach(function(item, idx) {
        tot += item.qty;
        wrap.innerHTML += "<span style='background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; padding:3px 8px; border-radius:14px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:4px;'>" +
            item.karigar + ": " + item.qty + " Pcs " +
            "<span style='cursor:pointer; color:#ef4444; font-weight:bold;' onclick='removeDiyaBatchItem(" + idx + ")'>✕</span>" +
        "</span>";
    });

    if (totText) {
        totText.textContent = currentDiyaBatch.length ? ("👉 Gayi Saree Batch Total: " + tot + " Pcs (" + currentDiyaBatch.length + " Kariger)") : "";
    }
}

function addAayiBatchKarigarItem() {
    var kName = (document.getElementById("jw-aayi-karigar").value || "").trim().toUpperCase();
    var qty = parseInt(document.getElementById("jw-aayi-qty").value) || 0;

    if (!kName) return alert("Karigar ka naam daalein!");
    if (qty <= 0) return alert("Saree QTY bharein!");

    currentAayiBatch.push({
        id: "a_item_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        karigar: kName,
        qty: qty
    });

    document.getElementById("jw-aayi-karigar").value = "";
    document.getElementById("jw-aayi-qty").value = "";
    document.getElementById("jw-aayi-karigar").focus();

    renderAayiBatchChips();
}

function removeAayiBatchItem(idx) {
    currentAayiBatch.splice(idx, 1);
    renderAayiBatchChips();
}

function renderAayiBatchChips() {
    var wrap = document.getElementById("jw-aayi-batch-chips");
    var totText = document.getElementById("jw-aayi-batch-total-text");
    if (!wrap) return;
    wrap.innerHTML = "";

    var tot = 0;
    currentAayiBatch.forEach(function(item, idx) {
        tot += item.qty;
        wrap.innerHTML += "<span style='background:#dcfce7; color:#15803d; border:1px solid #86efac; padding:3px 8px; border-radius:14px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:4px;'>" +
            item.karigar + ": " + item.qty + " Pcs " +
            "<span style='cursor:pointer; color:#dc2626; font-weight:bold;' onclick='removeAayiBatchItem(" + idx + ")'>✕</span>" +
        "</span>";
    });

    if (totText) {
        totText.textContent = currentAayiBatch.length ? ("👉 Wapas Aayi Batch Total: " + tot + " Pcs (" + currentAayiBatch.length + " Kariger)") : "";
    }
}

// SAVE SINGLE BATCH SUMMARY ROW (POINT 3)
function saveJobWorkBatchLine() {
    if (!activeJobWorkerId) return;
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;

    var worker = getJobWorkers().find(function(x) { return String(x.id) === String(activeJobWorkerId); });
    var workerName = worker ? worker.name : "Worker";
    var isCalender = (worker && worker.type === "calender");

    var totGayi = 0;
    currentDiyaBatch.forEach(function(x) { totGayi += (Number(x.qty) || 0); });

    var totAayi = 0;
    currentAayiBatch.forEach(function(x) { totAayi += (Number(x.qty) || 0); });

    var damagePcs = parseInt(document.getElementById("jw-form-damage-pcs").value) || 0;
    var damageAmt = parseFloat(document.getElementById("jw-form-damage-amt").value) || 0;

    if (totGayi === 0 && totAayi === 0 && damagePcs === 0) {
        return alert("Kripya Jane wali ya Aane wali saree ke karigar [+] jodein ya damage bharein!");
    }

    var dDate = document.getElementById("jw-form-diya-date").value || getTodayDate();
    var aDate = document.getElementById("jw-form-aayi-date").value || getTodayDate();
    var rowDate = (totGayi > 0) ? dDate : aDate;

    // POINT 1: Stock Source selection in Calender
    var stockSource = "fresh";
    if (isCalender) {
        var rCut = document.getElementById("jw-source-cutting");
        if (rCut && rCut.checked) stockSource = "cutting";
    }

    var rowId = "jwb_" + Date.now();

    var newRow = {
        id: rowId,
        date: rowDate,
        gayiQty: totGayi,
        gayiItems: [].concat(currentDiyaBatch),
        stockSource: stockSource,
        aayiQty: totAayi,
        aayiItems: [].concat(currentAayiBatch),
        damagePcs: damagePcs,
        damageAmt: damageAmt
    };

    sh.rows = safeArray(sh.rows);
    sh.rows.push(newRow);
    saveJobWorkerSheets(activeJobWorkerId, sheets);

    // POINT 1 STOCK DEDUCTION
    if (totGayi > 0) {
        if (stockSource === "cutting") {
            var cStock = safeArray(getStore("finished_saree_stock"));
            var cutItem = cStock.find(function(x) { return x && x.name && x.name.toLowerCase().indexOf("cutting") !== -1; });
            if (cutItem) {
                cutItem.pcs = Math.max(0, (Number(cutItem.pcs) || 0) - totGayi);
                setStore("finished_saree_stock", cStock);
            }
        } else {
            var sStock = safeArray(getStore("saree_stock"));
            if (sStock.length > 0) {
                var rem = totGayi;
                for (var i = 0; i < sStock.length; i++) {
                    if (rem <= 0) break;
                    var cur = Number(sStock[i].pcs) || 0;
                    if (cur > 0) {
                        var take = Math.min(cur, rem);
                        sStock[i].pcs -= take;
                        rem -= take;
                    }
                }
                setStore("saree_stock", sStock);
            }
        }

        var sH = safeArray(getStore("saree_history"));
        sH.push({
            id: "sh_diya_" + Date.now(),
            refId: rowId,
            date: dDate,
            name: (isCalender ? "Calender" : "Cutting") + " Maal Diya (" + (stockSource === "cutting" ? "Cutting Stock Se" : "Fresh Stock Se") + ")",
            kariger: workerName + " (" + currentDiyaBatch.length + " Kariger Batch)",
            type: "Out (" + (isCalender ? "Calender" : "Cutting") + ")",
            pcs: totGayi,
            note: workerName + " ko " + totGayi + " Saree bheji gayi"
        });
        setStore("saree_history", sH);
    }

    // POINT 2: SAREE WAPAS AANE PAR STOCK ADDITION
    if (totAayi > 0) {
        var finishedName = isCalender ? "Calender Finished Saree" : "Cutting Finished Saree";
        var finishedSource = isCalender ? "🎛️ Calender Process" : "✂️ Booti Cutting Process";

        var fStock = safeArray(getStore("finished_saree_stock"));
        var fItem = fStock.find(function(x) { return x && x.name && x.name.toLowerCase() === finishedName.toLowerCase(); });

        if (fItem) {
            fItem.pcs = (Number(fItem.pcs) || 0) + totAayi;
            fItem.date = aDate;
        } else {
            fStock.push({
                id: "fin_" + (isCalender ? "cal" : "cut"),
                date: aDate,
                name: finishedName,
                processType: isCalender ? "calender" : "cutting",
                source: finishedSource + " (" + workerName + ")",
                pcs: totAayi
            });
        }
        setStore("finished_saree_stock", fStock);

        var sH2 = safeArray(getStore("saree_history"));
        sH2.push({
            id: "sh_aayi_" + Date.now(),
            refId: rowId,
            date: aDate,
            name: finishedName,
            kariger: workerName + " (" + currentAayiBatch.length + " Kariger Batch)",
            type: "In (Finished - " + (isCalender ? "Calender" : "Cutting") + ")",
            pcs: totAayi,
            note: workerName + " se " + totAayi + " Tayaar Saree wapas aayi"
        });
        setStore("saree_history", sH2);
    }

    // Damage to Lott Saree Stock
    if (damagePcs > 0) {
        var lottStock = safeArray(getStore("lott_saree_stock"));
        var lItem = lottStock.find(function(x) { return x && x.source && x.source.indexOf(workerName) !== -1; });
        if (lItem) {
            lItem.pcs = (Number(lItem.pcs) || 0) + damagePcs;
            lItem.date = rowDate;
        } else {
            lottStock.push({
                id: "lott_" + Date.now(),
                refId: rowId,
                date: rowDate,
                name: "Damage Saree",
                source: workerName + " (" + (isCalender ? "Calender" : "Cutting") + " Damage)",
                pcs: damagePcs
            });
        }
        setStore("lott_saree_stock", lottStock);
    }

    // Reset Form
    currentDiyaBatch = [];
    currentAayiBatch = [];
    renderDiyaBatchChips();
    renderAayiBatchChips();
    document.getElementById("jw-form-damage-pcs").value = "";
    document.getElementById("jw-form-damage-amt").value = "";

    renderJobWorkSheetTable(sh);
    if (typeof renderSareeTable === "function") renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Batch Entry Save ho gayi! 1 Single Line register me jud gayi.");
}

function renderJobWorkSheetTable(sh) {
    var tbody = document.getElementById("jw-sheet-rows-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var rows = safeArray(sh.rows);

    if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan='8' style='text-align:center; padding:15px; color:#888;'>Is Mahine me abhi koi entry nahi hui hai. Upar se batch line jodein.</td></tr>";
    } else {
        rows.forEach(function(r, idx) {
            if (!r) return;

            var gayiCount = (r.gayiItems && r.gayiItems.length) ? r.gayiItems.length : 0;
            var aayiCount = (r.aayiItems && r.aayiItems.length) ? r.aayiItems.length : 0;

            var gayiBtn = (r.gayiQty > 0) ?
                ("<button class='detail-btn' style='background:#e11d48; font-size:11px;' onclick='openJwBatchModal(\"" + sh.id + "\", \"" + r.id + "\", \"gayi\")'>📖 " + gayiCount + " Kariger Detail</button>") : "-";

            var aayiBtn = (r.aayiQty > 0) ?
                ("<button class='detail-btn' style='background:#059669; font-size:11px;' onclick='openJwBatchModal(\"" + sh.id + "\", \"" + r.id + "\", \"aayi\")'>📖 " + aayiCount + " Kariger Detail</button>") : "-";

            var sourceTag = r.stockSource === "cutting" ? "<span style='font-size:10px; color:#059669; display:block;'>(Cutting Stock Se)</span>" : "";

            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(r.date) + "</td>" +
                "<td>" + (r.gayiQty > 0 ? ("<strong style='color:#dc2626; font-size:14px;'>-" + r.gayiQty + " Pcs</strong>" + sourceTag) : "-") + "</td>" +
                "<td>" + gayiBtn + "</td>" +
                "<td>" + (r.aayiQty > 0 ? ("<strong style='color:#059669; font-size:14px;'>+" + r.aayiQty + " Pcs</strong>") : "-") + "</td>" +
                "<td>" + aayiBtn + "</td>" +
                "<td>" + (r.damagePcs > 0 ? ("<strong style='color:#ea580c;'>⚠️ " + r.damagePcs + " Pcs</strong>") : "-") + "</td>" +
                "<td>" + (r.damageAmt > 0 ? ("₹ " + r.damageAmt) : "-") + "</td>" +
                "<td style='text-align:center;'><button class='delete-btn' onclick='deleteJobWorkBatchRow(" + idx + ")'>🗑️ Line Delete</button></td>" +
            "</tr>";
        });
    }

    var c = calculateJobWorkSheetTotals(sh);

    var setT = function(id, v) {
        var el = document.getElementById(id);
        if (el) el.textContent = v;
    };

    setT("jw-card-total-gayi", c.totGayiQty + " Pcs");
    setT("jw-card-total-aayi", c.totAayiQty + " Pcs");
    setT("jw-card-total-lott", c.totDamagePcs + " Pcs (-₹ " + c.totDamageAmt.toFixed(0) + ")");
    setT("jw-calc-baki-saree-display", c.pendingSaree + " Pcs Baki");
}

function deleteJobWorkBatchRow(idx) {
    if (!confirm("Kya aap is poori Batch Line ko delete karna chahte hain? Iska sara stock wapas theek ho jayega.")) return;

    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;

    sh.rows = safeArray(sh.rows);
    var r = sh.rows[idx];
    if (!r) return;

    var worker = getJobWorkers().find(function(x) { return String(x.id) === String(activeJobWorkerId); });
    var isCalender = (worker && worker.type === "calender");

    // 1. REVERSE GAYI STOCK
    if (Number(r.gayiQty) > 0) {
        if (r.stockSource === "cutting") {
            var cStock = safeArray(getStore("finished_saree_stock"));
            var cutItem = cStock.find(function(x) { return x && x.name && x.name.toLowerCase().indexOf("cutting") !== -1; });
            if (cutItem) {
                cutItem.pcs = (Number(cutItem.pcs) || 0) + Number(r.gayiQty);
                setStore("finished_saree_stock", cStock);
            }
        } else {
            var sStock = safeArray(getStore("saree_stock"));
            if (sStock.length > 0) {
                sStock[0].pcs = (Number(sStock[0].pcs) || 0) + Number(r.gayiQty);
                setStore("saree_stock", sStock);
            }
        }
    }

    // 2. REVERSE AAYI FINISHED STOCK
    if (Number(r.aayiQty) > 0) {
        var finishedName = isCalender ? "Calender Finished Saree" : "Cutting Finished Saree";
        var fStock = safeArray(getStore("finished_saree_stock"));
        var fItem = fStock.find(function(x) { return x && x.name && x.name.toLowerCase() === finishedName.toLowerCase(); });
        if (fItem) {
            fItem.pcs = Math.max(0, (Number(fItem.pcs) || 0) - Number(r.aayiQty));
            setStore("finished_saree_stock", fStock);
        }
    }

    // 3. REVERSE DAMAGE FROM LOTT
    if (Number(r.damagePcs) > 0) {
        var lottStock = safeArray(getStore("lott_saree_stock"));
        if (lottStock.length > 0) {
            lottStock[0].pcs = Math.max(0, (Number(lottStock[0].pcs) || 0) - Number(r.damagePcs));
            setStore("lott_saree_stock", lottStock);
        }
    }

    // 4. CLEAN SAREE HISTORY
    var sH = safeArray(getStore("saree_history"));
    sH = sH.filter(function(h) { return !h || String(h.refId) !== String(r.id); });
    setStore("saree_history", sH);

    sh.rows.splice(idx, 1);
    saveJobWorkerSheets(activeJobWorkerId, sheets);

    renderJobWorkSheetTable(sh);
    if (typeof renderSareeTable === "function") renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("🗑️ Batch line delete ho gayi!");
}

// ================= 6. BATCH PASSBOOK MODAL (WITH ✏️ EDIT & 🗑️ DELETE) =================

function openJwBatchModal(sheetId, rowId, type) {
    activeBatchModalInfo = { sheetId: sheetId, rowId: rowId, type: type };

    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(sheetId); });
    if (!sh) return;

    var r = safeArray(sh.rows).find(function(x) { return x && String(x.id) === String(rowId); });
    if (!r) return;

    var isGayi = (type === "gayi");
    var title = isGayi ? "📤 Gayi Saree Batch Breakdown" : "📥 Wapas Aayi Batch Breakdown";
    document.getElementById("jw-batch-modal-title").textContent = title;
    document.getElementById("jw-batch-modal-subtitle").textContent = "Tarikh: " + formatDateDisplay(r.date) + " | Kul Pcs: " + (isGayi ? r.gayiQty : r.aayiQty);

    renderJwBatchModalTable();
    setDisplay("jw-batch-modal", "flex");
}

function closeJwBatchModal() {
    setDisplay("jw-batch-modal", "none");
    activeBatchModalInfo = null;
}

function renderJwBatchModalTable() {
    if (!activeBatchModalInfo) return;
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeBatchModalInfo.sheetId); });
    if (!sh) return;

    var r = safeArray(sh.rows).find(function(x) { return x && String(x.id) === String(activeBatchModalInfo.rowId); });
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
            "<td>" + (idx + 1) + "</td>" +
            "<td><strong>" + item.karigar + "</strong></td>" +
            "<td><strong style='color:#0d9488; font-size:14px;'>" + item.qty + " Pcs</strong></td>" +
            "<td style='text-align:center;'>" +
                "<button class='edit-btn' onclick='editJwBatchItem(" + idx + ")'>✏️ Edit</button> " +
                "<button class='delete-btn' onclick='deleteJwBatchItem(" + idx + ")'>🗑️</button>" +
            "</td>" +
        "</tr>";
    });

    if (tfoot) {
        tfoot.innerHTML = "<tr style='background:#f0fdf4; font-weight:800; border-top:2px solid #0d9488;'>" +
            "<td colspan='2'>📊 BATCH TOTAL:</td>" +
            "<td style='color:#0d9488; font-size:15px;'>" + tot + " Pcs</td>" +
            "<td>-</td>" +
        "</tr>";
    }
}

// ✏️ EDIT KARIGAR ITEM INSIDE PASSBOOK
function editJwBatchItem(itemIdx) {
    if (!activeBatchModalInfo) return;
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeBatchModalInfo.sheetId); });
    var r = sh ? safeArray(sh.rows).find(function(x) { return x && String(x.id) === String(activeBatchModalInfo.rowId); }) : null;
    if (!r) return;

    var isGayi = (activeBatchModalInfo.type === "gayi");
    var items = isGayi ? safeArray(r.gayiItems) : safeArray(r.aayiItems);
    var it = items[itemIdx];
    if (!it) return;

    var newKarName = prompt("Karigar Ka Naam:", it.karigar);
    if (newKarName === null) return;
    var newQty = parseInt(prompt(newKarName + " Ki Saree Qty (Pcs):", it.qty));
    if (isNaN(newQty) || newQty <= 0) return alert("Sahi Qty daalein!");

    var diff = newQty - it.qty;
    it.karigar = newKarName.trim().toUpperCase();
    it.qty = newQty;

    var newTot = 0;
    items.forEach(function(x) { newTot += (Number(x.qty) || 0); });

    var worker = getJobWorkers().find(function(x) { return String(x.id) === String(activeJobWorkerId); });
    var isCalender = (worker && worker.type === "calender");

    if (isGayi) {
        r.gayiQty = newTot;
        if (r.stockSource === "cutting") {
            var cStock = safeArray(getStore("finished_saree_stock"));
            var cutItem = cStock.find(function(x) { return x && x.name && x.name.toLowerCase().indexOf("cutting") !== -1; });
            if (cutItem) {
                cutItem.pcs = Math.max(0, (Number(cutItem.pcs) || 0) - diff);
                setStore("finished_saree_stock", cStock);
            }
        } else {
            var sStock = safeArray(getStore("saree_stock"));
            if (sStock.length > 0) {
                sStock[0].pcs = (Number(sStock[0].pcs) || 0) - diff;
                setStore("saree_stock", sStock);
            }
        }
    } else {
        r.aayiQty = newTot;
        var finishedName = isCalender ? "Calender Finished Saree" : "Cutting Finished Saree";
        var fStock = safeArray(getStore("finished_saree_stock"));
        var fItem = fStock.find(function(x) { return x && x.name && x.name.toLowerCase() === finishedName.toLowerCase(); });
        if (fItem) {
            fItem.pcs = Math.max(0, (Number(fItem.pcs) || 0) + diff);
            setStore("finished_saree_stock", fStock);
        }
    }

    saveJobWorkerSheets(activeJobWorkerId, sheets);
    renderJwBatchModalTable();
    renderJobWorkSheetTable(sh);
    if (typeof renderSareeTable === "function") renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Karigar QTY update ho gayi aur Stock adjust ho gaya!");
}

// 🗑️ DELETE KARIGAR ITEM INSIDE PASSBOOK
function deleteJwBatchItem(itemIdx) {
    if (!confirm("Kya aap is Karigar ki entry ko batch se delete karna chahte hain?")) return;
    if (!activeBatchModalInfo) return;
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeBatchModalInfo.sheetId); });
    var r = sh ? safeArray(sh.rows).find(function(x) { return x && String(x.id) === String(activeBatchModalInfo.rowId); }) : null;
    if (!r) return;

    var isGayi = (activeBatchModalInfo.type === "gayi");
    var items = isGayi ? safeArray(r.gayiItems) : safeArray(r.aayiItems);
    var it = items[itemIdx];
    if (!it) return;

    var removedQty = it.qty;
    items.splice(itemIdx, 1);

    var newTot = 0;
    items.forEach(function(x) { newTot += (Number(x.qty) || 0); });

    var worker = getJobWorkers().find(function(x) { return String(x.id) === String(activeJobWorkerId); });
    var isCalender = (worker && worker.type === "calender");

    if (isGayi) {
        r.gayiQty = newTot;
        if (r.stockSource === "cutting") {
            var cStock = safeArray(getStore("finished_saree_stock"));
            var cutItem = cStock.find(function(x) { return x && x.name && x.name.toLowerCase().indexOf("cutting") !== -1; });
            if (cutItem) {
                cutItem.pcs = (Number(cutItem.pcs) || 0) + removedQty;
                setStore("finished_saree_stock", cStock);
            }
        } else {
            var sStock = safeArray(getStore("saree_stock"));
            if (sStock.length > 0) {
                sStock[0].pcs = (Number(sStock[0].pcs) || 0) + removedQty;
                setStore("saree_stock", sStock);
            }
        }
    } else {
        r.aayiQty = newTot;
        var finishedName = isCalender ? "Calender Finished Saree" : "Cutting Finished Saree";
        var fStock = safeArray(getStore("finished_saree_stock"));
        var fItem = fStock.find(function(x) { return x && x.name && x.name.toLowerCase() === finishedName.toLowerCase(); });
        if (fItem) {
            fItem.pcs = Math.max(0, (Number(fItem.pcs) || 0) - removedQty);
            setStore("finished_saree_stock", fStock);
        }
    }

    saveJobWorkerSheets(activeJobWorkerId, sheets);
    renderJwBatchModalTable();
    renderJobWorkSheetTable(sh);
    if (typeof renderSareeTable === "function") renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("🗑️ Karigar item delete ho gaya aur stock theek ho gaya!");
}

// ================= 7. 💳 JOB WORK BILLS & PAYMENT ENGINE (SEARCH & BILL NO.) =================

function getJwBills() {
    return safeArray(getStore("jw_bills_list"));
}

function saveJwBills(list) {
    setStore("jw_bills_list", safeArray(list));
}

function getJwPayments() {
    return safeArray(getStore("jw_payments_list"));
}

function saveJwPayments(list) {
    setStore("jw_payments_list", safeArray(list));
}

function initJobWorkBillingView() {
    populateWorkerSelectOptions();
    if (document.getElementById("jw-bill-input-date")) {
        document.getElementById("jw-bill-input-date").value = getTodayDate();
    }
    renderJwBillsTable();
}

function populateWorkerSelectOptions() {
    var sel = document.getElementById("jw-bill-input-worker");
    if (!sel) return;
    sel.innerHTML = "";

    var workers = getJobWorkers();
    if (!workers.length) {
        sel.innerHTML = "<option value=''>Pehle Naya Kariger Banayein</option>";
        return;
    }

    workers.forEach(function(w) {
        var opt = document.createElement("option");
        opt.value = w.id;
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

// SAVE NEW BILL WITH BILL NO.
function saveJobWorkNewBill() {
    var d = document.getElementById("jw-bill-input-date").value || getTodayDate();
    var billNo = (document.getElementById("jw-bill-input-no") && document.getElementById("jw-bill-input-no").value || "").trim().toUpperCase();
    var wId = document.getElementById("jw-bill-input-worker").value;
    var pcs = parseInt(document.getElementById("jw-bill-input-pcs").value) || 0;
    var amt = parseFloat(document.getElementById("jw-bill-input-amt").value) || 0;
    var note = (document.getElementById("jw-bill-input-note").value || "").trim();

    if (!wId) return alert("Worker chunein!");
    if (!billNo) billNo = "BILL-" + Date.now().toString().slice(-4);
    if (amt <= 0) return alert("Sahi Bill Amount (₹) bharein!");

    var worker = getJobWorkers().find(function(x) { return String(x.id) === String(wId); });
    var workerName = worker ? worker.name : "Worker";
    var workType = worker ? worker.type : "Job Work";

    var bills = getJwBills();
    bills.push({
        id: "bill_" + Date.now(),
        billNo: billNo,
        date: d,
        workerId: wId,
        workerName: workerName,
        workType: workType,
        pcs: pcs,
        billAmt: amt,
        paidAmt: 0,
        note: note || "Lump-sum Job Work Bill"
    });

    saveJwBills(bills);

    if (document.getElementById("jw-bill-input-no")) document.getElementById("jw-bill-input-no").value = "";
    document.getElementById("jw-bill-input-pcs").value = "";
    document.getElementById("jw-bill-input-amt").value = "";
    document.getElementById("jw-bill-input-note").value = "";
    toggleAddJwBillForm();

    renderJwBillsTable();
    updateJobWorkHubBadges();
    alert("✅ Bill No. #" + billNo + " Darj ho gaya! 'Dena Baki Hai' list me aa gaya.");
}

function getJwBillingStats() {
    var bills = getJwBills();
    var totBilled = 0, totPaid = 0;

    bills.forEach(function(b) {
        if (!b) return;
        totBilled += (Number(b.billAmt) || 0);
        totPaid += (Number(b.paidAmt) || 0);
    });

    return {
        total: totBilled,
        paid: totPaid,
        pending: Math.max(0, totBilled - totPaid)
    };
}

function switchJwBillTab(tab) {
    currentJwBillTab = tab;
    var btnP = document.getElementById("btn-jw-bill-pending");
    var btnPd = document.getElementById("btn-jw-bill-paid");

    if (btnP) btnP.className = (tab === "pending") ? "sheet-tab active" : "sheet-tab";
    if (btnPd) btnPd.className = (tab === "paid") ? "sheet-tab active" : "sheet-tab";

    renderJwBillsTable();
}

// 🔍 LIVE SEARCH FUNCTION FOR BILLS (POINT 2)
function filterJwBills() {
    var txt = (document.getElementById("jw-search-bill-input") && document.getElementById("jw-search-bill-input").value || "").toLowerCase().trim();
    var allBills = getJwBills();

    if (!txt) {
        renderJwBillsTable();
        return;
    }

    var filtered = allBills.filter(function(b) {
        if (!b) return false;
        var searchStr = (String(b.workerName || "") + " " + String(b.billNo || "") + " " + String(b.date || "") + " " + String(b.note || "") + " " + String(b.workType || "")).toLowerCase();
        return searchStr.indexOf(txt) !== -1;
    });

    renderJwBillsTable(filtered);
}

function renderJwBillsTable(customList) {
    var thead = document.getElementById("jw-bills-table-thead");
    var tbody = document.getElementById("jw-bills-table-tbody");
    if (!thead || !tbody) return;
    tbody.innerHTML = "";

    var stats = getJwBillingStats();
    var setEl = function(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setEl("jw-bill-stat-total", "₹ " + stats.total.toFixed(2));
    setEl("jw-bill-stat-paid", "₹ " + stats.paid.toFixed(2));
    setEl("jw-bill-stat-pending", "₹ " + stats.pending.toFixed(2));

    var isPending = (currentJwBillTab === "pending");

    thead.innerHTML = "<tr style='background:" + (isPending ? "#dc2626" : "#059669") + "; color:white;'>" +
        "<th>Date</th>" +
        "<th>Bill No.</th>" +
        "<th>Job Worker</th>" +
        "<th>Process</th>" +
        "<th>Saree Pcs</th>" +
        "<th>Total Bill (₹)</th>" +
        "<th>Paid Ho Chuka (₹)</th>" +
        "<th>Dena Baki (₹)</th>" +
        "<th>Status</th>" +
        "<th style='text-align:center;'>Action</th>" +
    "</tr>";

    var allBills = customList || getJwBills();
    var filtered = allBills.filter(function(b) {
        if (!b) return false;
        var baki = Math.max(0, (Number(b.billAmt) || 0) - (Number(b.paidAmt) || 0));
        return isPending ? (baki > 0) : (baki <= 0);
    });

    if (!filtered.length) {
        var msg = isPending ? "Sabhi bill chukta ho chuke hain! Koi dena baki nahi." : "Abhi koi Chukta bill nahi hai.";
        tbody.innerHTML = "<tr><td colspan='10' style='text-align:center; padding:20px; color:#888;'>" + msg + "</td></tr>";
        return;
    }

    filtered.forEach(function(b) {
        var baki = Math.max(0, (Number(b.billAmt) || 0) - (Number(b.paidAmt) || 0));
        var statusBadge = (baki > 0) ?
            ("<span class='badge-red'>Baki: ₹ " + baki.toFixed(2) + "</span>") :
            ("<span class='badge-green'>✅ Purana Clear</span>");

        var payBtn = (baki > 0) ?
            ("<button class='quick-btn btn-in' style='background:#059669; color:white; font-size:11px;' onclick='openJwPayModal(\"" + b.id + "\")'>💰 Pay Karein</button> ") : "";

        var raseedBtn = "<button class='whatsapp-btn' style='padding:4px 8px; font-size:11px;' onclick='sendJwPaymentWhatsAppReceipt(\"" + b.id + "\")'>📲 रसीद</button> ";
        var delBtn = "<button class='delete-btn' onclick='deleteJwBill(\"" + b.id + "\")'>🗑️</button>";

        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(b.date) + "</td>" +
            "<td><strong style='color:#7c3aed;'>#" + (b.billNo || "BILL") + "</strong></td>" +
            "<td><strong>" + b.workerName + "</strong></td>" +
            "<td>" + (b.workType === "calender" ? "🎛️ Calender" : "✂️ Cutting") + "</td>" +
            "<td>" + (b.pcs > 0 ? (b.pcs + " Pcs") : "-") + "</td>" +
            "<td><strong style='color:#dc2626;'>₹ " + Number(b.billAmt).toFixed(2) + "</strong></td>" +
            "<td><strong style='color:#059669;'>₹ " + Number(b.paidAmt).toFixed(2) + "</strong></td>" +
            "<td><strong style='color:#ea580c; font-size:14px;'>₹ " + baki.toFixed(2) + "</strong></td>" +
            "<td>" + statusBadge + "</td>" +
            "<td style='text-align:center;'>" + payBtn + raseedBtn + delBtn + "</td>" +
        "</tr>";
    });
}

// 💰 QUICK PAYMENT MODAL (WITH BILL NO. HIGHLIGHT)
function openJwPayModal(billId) {
    var b = getJwBills().find(function(x) { return String(x.id) === String(billId); });
    if (!b) return;

    var baki = Math.max(0, (Number(b.billAmt) || 0) - (Number(b.paidAmt) || 0));

    document.getElementById("jw-pay-bill-id").value = b.id;
    document.getElementById("jw-pay-modal-worker-text").textContent = "Bill #" + (b.billNo || "-") + " | " + b.workerName + " (" + b.workType + " Bill: ₹" + b.billAmt + ")";
    document.getElementById("jw-pay-modal-baki-text").textContent = "Abhi Dena Baki: ₹ " + baki.toFixed(2);
    document.getElementById("jw-pay-date").value = getTodayDate();
    document.getElementById("jw-pay-amount").value = baki;
    document.getElementById("jw-pay-note").value = "Payment for Bill #" + (b.billNo || "");

    setDisplay("jw-pay-modal", "flex");
}

function closeJwPayModal() {
    setDisplay("jw-pay-modal", "none");
    document.getElementById("jw-pay-bill-id").value = "";
}

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

    var baki = Math.max(0, (Number(b.billAmt) || 0) - (Number(b.paidAmt) || 0));
    if (payAmt > baki) {
        if (!confirm("Aap baki (" + baki + ") se zyada (" + payAmt + ") de rahe hain. Kya continue karein?")) return;
    }

    b.paidAmt = (Number(b.paidAmt) || 0) + payAmt;
    saveJwBills(bills);

    var payments = getJwPayments();
    payments.push({
        id: "pay_" + Date.now(),
        billId: billId,
        billNo: b.billNo || "BILL",
        date: d,
        workerName: b.workerName,
        amount: payAmt,
        mode: mode,
        note: note
    });
    saveJwPayments(payments);

    closeJwPayModal();
    renderJwBillsTable();
    updateJobWorkHubBadges();
    alert("✅ ₹" + payAmt + " Payment Bill #" + b.billNo + " par save ho gaya!");
}

function sendJwPaymentWhatsAppReceipt(billId) {
    var b = getJwBills().find(function(x) { return String(x.id) === String(billId); });
    if (!b) return;

    var worker = getJobWorkers().find(function(w) { return String(w.id) === String(b.workerId); });
    var baki = Math.max(0, (Number(b.billAmt) || 0) - (Number(b.paidAmt) || 0));

    var text = "🧾 *JOB WORK PAYMENT RASEED* 🧾\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "📄 *Bill No:* #" + (b.billNo || "BILL") + "\n";
    text += "👤 *Job Worker:* " + b.workerName + "\n";
    text += "📦 *Kaam:* " + (b.workType === "calender" ? "Calender Finishing" : "Booti Cutting") + "\n";
    text += "📅 *Tarikh:* " + formatDateDisplay(getTodayDate()) + "\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "💰 *Total Bill Banna Tha:* ₹ " + Number(b.billAmt).toFixed(2) + "\n";
    text += "🟢 *Total Payment Diya Gaya:* ₹ " + Number(b.paidAmt).toFixed(2) + "\n";
    text += "-------------------------------------\n";
    if (baki > 0) {
        text += "🔴 *ABHI DENA BAKI HAI:* *₹ " + baki.toFixed(2) + "*\n";
    } else {
        text += "🟢 *STATUS:* *POORA HISAB CHUKTA HO GAYA (CLEAR)*\n";
    }
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "_Simplicity ERP • Developed by Farhan Jawed_";

    var mobile = worker ? (worker.mobile || "").trim().replace(/[^0-9]/g, "") : "";
    if (!mobile) {
        mobile = prompt(b.workerName + " Ka WhatsApp Mobile Number (10-digit):");
        if (!mobile) return;
        mobile = mobile.trim().replace(/[^0-9]/g, "");
    }
    if (mobile.length === 10) mobile = "91" + mobile;

    window.open("https://wa.me/" + mobile + "?text=" + encodeURIComponent(text), "_blank");
}

function deleteJwBill(billId) {
    if (!confirm("Kya aap is Bill record ko delete karna chahte hain?")) return;
    var bills = getJwBills().filter(function(x) { return !x || String(x.id) !== String(billId); });
    saveJwBills(bills);
    renderJwBillsTable();
    updateJobWorkHubBadges();
}

// ================= 8. 🏪 DUKAN BHEJA =================

function getDukanTransfers() {
    return safeArray(getStore("dukan_transfer_history"));
}

function saveDukanTransfers(list) {
    setStore("dukan_transfer_history", safeArray(list));
}

function addDukanTransferEntry() {
    var d = document.getElementById("jw-dukan-date").value || getTodayDate();
    var pcs = parseInt(document.getElementById("jw-dukan-pcs").value) || 0;
    var note = (document.getElementById("jw-dukan-note").value || "").trim();

    if (pcs <= 0) return alert("Pcs bharein!");

    var list = getDukanTransfers();
    list.push({
        id: "duk_" + Date.now(),
        date: d,
        pcs: pcs,
        note: note || "Apni Dukan Transfer"
    });

    saveDukanTransfers(list);

    document.getElementById("jw-dukan-pcs").value = "";
    document.getElementById("jw-dukan-note").value = "";

    renderDukanTransferTable();
    updateJobWorkHubBadges();
    alert("✅ " + pcs + " Pcs Apni Dukan par bhej di gayi!");
}

function deleteDukanTransferEntry(idx) {
    if (!confirm("Kya aap is Dukan transfer entry ko delete karna chahte hain?")) return;
    var list = getDukanTransfers();
    list.splice(idx, 1);
    saveDukanTransfers(list);
    renderDukanTransferTable();
    updateJobWorkHubBadges();
}

function filterDukanTransfers() {
    renderDukanTransferTable();
}

function resetDukanFilter() {
    if (document.getElementById("jw-dukan-from-date")) document.getElementById("jw-dukan-from-date").value = "";
    if (document.getElementById("jw-dukan-to-date")) document.getElementById("jw-dukan-to-date").value = "";
    renderDukanTransferTable();
}

function renderDukanTransferTable() {
    var tbody = document.getElementById("jw-dukan-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var list = getDukanTransfers();

    var fDate = document.getElementById("jw-dukan-from-date") ? document.getElementById("jw-dukan-from-date").value : "";
    var tDate = document.getElementById("jw-dukan-to-date") ? document.getElementById("jw-dukan-to-date").value : "";

    var filteredList = list.filter(function(d) {
        return d && isDateInRange(d.date, fDate, tDate);
    });

    var totCalenderFinished = 0;
    var allWorkers = getJobWorkers().filter(function(w) { return w && w.type === "calender"; });
    allWorkers.forEach(function(w) {
        var sheets = getJobWorkerSheets(w.id);
        sheets.forEach(function(sh) {
            safeArray(sh.rows).forEach(function(r) {
                totCalenderFinished += (Number(r.aayiQty) || 0);
            });
        });
    });

    var totDukanSent = 0;
    list.forEach(function(d) { totDukanSent += (Number(d.pcs) || 0); });
    var bachaInKarkhana = Math.max(0, totCalenderFinished - totDukanSent);

    var filteredSentTotal = 0;
    filteredList.forEach(function(d) { filteredSentTotal += (Number(d.pcs) || 0); });

    var elCal = document.getElementById("jw-stat-calender-finished");
    var elSent = document.getElementById("jw-stat-dukan-sent");
    var elRem = document.getElementById("jw-stat-karkhana-bacha");
    var elFilterTotal = document.getElementById("jw-dukan-filter-total");

    if (elCal) elCal.textContent = totCalenderFinished + " Pcs";
    if (elSent) elSent.textContent = totDukanSent + " Pcs";
    if (elRem) elRem.textContent = bachaInKarkhana + " Pcs";
    if (elFilterTotal) elFilterTotal.textContent = "Chuni Hui Tareekh Me Gayi: " + filteredSentTotal + " Pcs";

    if (!filteredList.length) {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Is tareekh me koi saree Dukan par nahi bheji gayi.</td></tr>";
        return;
    }

    filteredList.forEach(function(d, idx) {
        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(d.date) + "</td>" +
            "<td><strong style='color:#059669; font-size:13px;'>+" + d.pcs + " Pcs</strong></td>" +
            "<td>" + (d.note || "Apni Dukan Transfer") + "</td>" +
            "<td style='text-align:center;'><button class='delete-btn' onclick='deleteDukanTransferEntry(" + idx + ")'>🗑️</button></td>" +
        "</tr>";
    });
}

// ================= 9. WHATSAPP PARCHI =================

function shareJobWorkOnWhatsApp() {
    if (!activeJobWorkerId || !activeJobSheetId) return alert("Pehle koi Khata Sheet kholein!");

    var w = getJobWorkers().find(function(x) { return String(x.id) === String(activeJobWorkerId); });
    var sheet = getJobWorkerSheets(activeJobWorkerId).find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!w || !sheet) return alert("Data nahi mila!");

    var c = calculateJobWorkSheetTotals(sheet);
    var typeTitle = (w.type === "calender") ? "CALENDER" : "BOOTI CUTTING";

    var text = "🧾 *" + typeTitle + " HISAB PARCHI* 🧾\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "👤 *Kariger:* " + w.name + "\n";
    text += "📅 *Mahina:* " + sheet.title + "\n";
    text += "📅 *Tarikh:* " + formatDateDisplay(getTodayDate()) + "\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";

    var rows = safeArray(sheet.rows);
    if (!rows.length) {
        text += "_Is Mahine me abhi koi entry nahi hai_\n";
    } else {
        rows.forEach(function(r, idx) {
            text += (idx + 1) + "️⃣ *" + formatDateDisplay(r.date) + "*\n";
            if (Number(r.gayiQty) > 0) text += "   • Diya: " + r.gayiQty + " Pcs (" + (r.gayiItems ? r.gayiItems.length : 1) + " Kariger)\n";
            if (Number(r.aayiQty) > 0) text += "   • Wapas Laya: " + r.aayiQty + " Pcs (" + (r.aayiItems ? r.aayiItems.length : 1) + " Kariger)\n";
            if (Number(r.damagePcs) > 0) text += "   • ⚠️ Damage Saree: " + r.damagePcs + " Pcs\n";
            text += "\n";
        });
    }

    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "📦 *SAREE PCS KA HISAB:*\n";
    if (c.closingPendingSaree > 0) text += "➕ Pichli Baki Saree: *" + c.closingPendingSaree + " Pcs*\n";
    text += "🔴 Kul Gayi: *" + c.totGayiQty + " Pcs*\n";
    text += "🟢 Kul Wapas Aayi: *" + c.totAayiQty + " Pcs*\n";
    if (c.totDamagePcs > 0) text += "⚠️ Damage Hui: *" + c.totDamagePcs + " Pcs*\n";
    text += "-------------------------------------\n";
    text += "🟠 *ABHI BAKI SAREE:* *" + c.pendingSaree + " Pcs*\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "_Simplicity ERP • Developed by Farhan Jawed_";

    var mobile = (w.mobile || "").trim().replace(/[^0-9]/g, "");
    if (!mobile && typeof getClientMobileNumber === "function") {
        mobile = getClientMobileNumber();
    }

    if (!mobile) {
        mobile = prompt("WhatsApp Mobile Number daalein (10-digit):");
        if (!mobile) return;
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
