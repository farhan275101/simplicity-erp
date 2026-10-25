/* ========================================================
   SIMPLICITY ERP - JOB WORK (CUTTING, CALENDER & DUKAN BHEJA)
   File 7 • Developed by Farhan Jawed
======================================================== */

var currentJobWorkMode = "hub"; // "hub", "cutting", "calender", "dukan"
var activeJobWorkerId = null;
var activeJobSheetId = null;

// ================= 1. NAVIGATION & HUB CONTROLLER =================

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

    updateJobWorkHubBadges();
}

function openJobWorkSubSection(mode) {
    currentJobWorkMode = mode;
    setDisplay("jw-hub-view", "none");

    if (mode === "cutting" || mode === "calender") {
        setDisplay("jw-sheet-view", "none");
        setDisplay("jw-dukan-view", "none");
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
        setDisplay("jw-dukan-view", "block");

        populateDukanSareeDatalist();
        renderDukanTransferTable();
    }
}

function updateJobWorkHubBadges() {
    var workers = getJobWorkers();
    var cutCount = workers.filter(function(w) { return w && w.type === "cutting"; }).length;
    var calCount = workers.filter(function(w) { return w && w.type === "calender"; }).length;

    var elCut = document.getElementById("jw-hub-badge-cutting");
    var elCal = document.getElementById("jw-hub-badge-calender");
    var elDuk = document.getElementById("jw-hub-badge-dukan");

    if (elCut) elCut.textContent = cutCount + " Kariger";
    if (elCal) elCal.textContent = calCount + " Kariger";

    var dukanList = getDukanTransfers();
    var totSent = 0;
    dukanList.forEach(function(d) { totSent += (Number(d.pcs) || 0); });
    if (elDuk) elDuk.textContent = totSent + " Pcs Bheje";
}

// ================= 2. WORKERS MASTER DATA =================

function getJobWorkers() {
    return safeArray(getStore("jobwork_workers"));
}

function saveJobWorkers(list) {
    setStore("jobwork_workers", safeArray(list));
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
            type: currentJobWorkMode, // "cutting" ya "calender"
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

function renderJobWorkWorkersTable() {
    var tbody = document.getElementById("jw-workers-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var allWorkers = getJobWorkers();
    var filtered = allWorkers.filter(function(w) {
        return w && w.type === currentJobWorkMode;
    });

    var totGayi = 0, totAayi = 0, totDmg = 0;

    filtered.forEach(function(w) {
        var sum = getJobWorkerOverallSummary(w.id);
        totGayi += sum.totGayi;
        totAayi += sum.totAayi;
        totDmg += sum.totDmg;
    });

    // 3 Colorful Summary Boxes at bottom of worker list
    var elGayi = document.getElementById("jw-stat-total-gayi");
    var elAayi = document.getElementById("jw-stat-total-aayi");
    var elDmg = document.getElementById("jw-stat-total-damage");

    if (elGayi) elGayi.textContent = totGayi + " Pcs";
    if (elAayi) elAayi.textContent = totAayi + " Pcs";
    if (elDmg) elDmg.textContent = totDmg + " Pcs";

    if (!filtered.length) {
        tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:20px; color:#888;'>Koi Kariger nahi mila. Upar '+ Naya Kariger' se jodein.</td></tr>";
        return;
    }

    filtered.forEach(function(w) {
        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(w.date) + "</td>" +
            "<td><strong>" + w.name + "</strong></td>" +
            "<td>" + (w.address || "-") + "</td>" +
            "<td>" + (w.mobile || "-") + "</td>" +
            "<td style='text-align:center;'>" +
                "<button class='sheet-btn' onclick='openJobWorkerSheet(\"" + w.id + "\")'>📊 Sheet Khata</button> " +
                "<button class='edit-btn' onclick='editJobWorker(\"" + w.id + "\")'>✏️</button> " +
                "<button class='delete-btn' onclick='deleteJobWorker(\"" + w.id + "\")'>🗑️</button>" +
            "</td>" +
        "</tr>";
    });
}

function editJobWorker(id) {
    var w = getJobWorkers().find(function(x) { return String(x.id) === String(id); });
    if (!w) return;
    document.getElementById("jw-worker-edit-id").value = w.id;
    document.getElementById("jw-worker-date").value = w.date || getTodayDate();
    document.getElementById("jw-worker-name").value = w.name;
    document.getElementById("jw-worker-address").value = w.address || "";
    document.getElementById("jw-worker-mobile").value = w.mobile || "";

    document.getElementById("jw-worker-save-btn").textContent = "Update Kariger";
    setDisplay("jw-worker-cancel-btn", "inline-block");
    setDisplay("add-jw-worker-form", "block");
}

function deleteJobWorker(id) {
    if (!confirm("Kya aap is Kariger ko delete karna chahte hain?")) return;
    var filtered = getJobWorkers().filter(function(x) { return String(x.id) !== String(id); });
    saveJobWorkers(filtered);

    try {
        localStorage.removeItem(currentUserId + "_jobwork_sheets_" + id);
        if (db) db.ref("users/" + currentUserId + "/jobwork_sheets_" + id).remove();
    } catch (e) {}

    renderJobWorkWorkersTable();
    updateJobWorkHubBadges();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

// ================= 3. WORKER MONTHLY KHATA SHEET CONTROLLER =================

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
        totPayment: 0,
        totDamageAmt: 0,
        totDamagePcs: 0,
        totMazdoori: 0,
        pendingSaree: 0,
        finalBakiAmt: 0
    };

    if (!sh || typeof sh !== "object") return def;

    var gayiQ = 0, aayiQ = 0, pay = 0, dmgAmt = 0, dmgPcs = 0, maz = 0;

    safeArray(sh.rows).forEach(function(r) {
        if (!r) return;
        var gQ = Number(r.gayiQty) || 0;
        var aQ = Number(r.aayiQty) || 0;
        var aR = Number(r.aayiRate) || 0;
        var p = Number(r.payment) || 0;
        var dA = Number(r.damageAmt) || 0;
        var dP = Number(r.damagePcs) || 0;

        gayiQ += gQ;
        aayiQ += aQ;
        maz += (aQ * aR);
        pay += p;
        dmgAmt += dA;
        dmgPcs += dP;
    });

    var pichliSaree = Number(sh.closingPendingSaree) || 0;
    var pichlaBakiPaisa = Number(sh.closingBakiAmt) || 0;

    // Baki Saree = (Pichli Baki + Total Gayi) - (Total Aayi + Lott/Damage)
    var pendingSaree = Math.max(0, (pichliSaree + gayiQ) - (aayiQ + dmgPcs));

    // Final Baki Rupaye = (Kul Mazdoori + Pichla Baki Paisa) - (Damage Katauti + Payment Diya)
    var finalBakiAmt = (maz + pichlaBakiPaisa) - (dmgAmt + pay);

    return {
        closingPendingSaree: pichliSaree,
        closingBakiAmt: pichlaBakiPaisa,
        totGayiQty: gayiQ,
        totAayiQty: aayiQ,
        totPayment: pay,
        totDamageAmt: dmgAmt,
        totDamagePcs: dmgPcs,
        totMazdoori: maz,
        pendingSaree: pendingSaree,
        finalBakiAmt: finalBakiAmt
    };
}

function getJobWorkerOverallSummary(workerId) {
    var sheets = getJobWorkerSheets(workerId);
    if (!sheets || !sheets.length) {
        return { totGayi: 0, totAayi: 0, totDmg: 0, pendingSaree: 0, finalBakiAmt: 0 };
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
        pendingSaree: latestCalc.pendingSaree,
        finalBakiAmt: latestCalc.finalBakiAmt
    };
}

function openJobWorkerSheet(workerId) {
    var w = getJobWorkers().find(function(x) { return String(x.id) === String(workerId); });
    if (!w) return alert("Kariger nahi mila!");

    activeJobWorkerId = w.id;
    var typeTitle = (w.type === "calender") ? "Calender" : "Booti Cutting";
    document.getElementById("jw-sheet-banner-name").textContent = w.name + " (" + typeTitle + " Khata)";

    // Set today date in entry fields
    var dToday = getTodayDate();
    if (document.getElementById("jw-form-diya-date")) document.getElementById("jw-form-diya-date").value = dToday;
    if (document.getElementById("jw-form-aayi-date")) document.getElementById("jw-form-aayi-date").value = dToday;

    // Show/Hide Stock Selection Radio in Line 1 (Only for Calender)
    var stockSelectRow = document.getElementById("jw-calender-stock-source-wrap");
    var stockColTh = document.getElementById("jw-th-stock-source");
    if (w.type === "calender") {
        if (stockSelectRow) stockSelectRow.style.display = "flex";
        if (stockColTh) stockColTh.style.display = "";
    } else {
        if (stockSelectRow) stockSelectRow.style.display = "none";
        if (stockColTh) stockColTh.style.display = "none";
    }

    populateJobWorkSareeDatalists();

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
    setDisplay("jw-sheet-view", "none");
    setDisplay("jw-workers-view", "block");
    renderJobWorkWorkersTable();
}

function populateJobWorkSareeDatalists() {
    var dlDiya = document.getElementById("jw-saree-diya-dl");
    var dlAayi = document.getElementById("jw-saree-aayi-dl");

    var mainOptions = "";
    var sStock = getStore("saree_stock");
    sStock.forEach(function(s) {
        if (s && s.name) {
            mainOptions += "<option value='" + s.name + " (Stock: " + (s.pcs || 0) + ")'>";
        }
    });

    if (dlDiya) dlDiya.innerHTML = mainOptions;
    if (dlAayi) dlAayi.innerHTML = mainOptions;
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
        closingBakiAmt: Number(calc.finalBakiAmt.toFixed(2)),
        rows: []
    };

    sheets.push(newS);
    saveJobWorkerSheets(activeJobWorkerId, sheets);
    activeJobSheetId = newS.id;

    renderJobWorkSheetTabs();
    loadCurrentJobWorkSheet();
    alert("✅ Naya Mahina jud gaya! Pichla bacha hisab carry-forward ho gaya.");
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
    var elPichlaPaisa = document.getElementById("jw-top-pichla-paisa");

    if (elPichliSaree) elPichliSaree.value = sh.closingPendingSaree || 0;
    if (elPichlaPaisa) elPichlaPaisa.value = sh.closingBakiAmt || 0;

    renderJobWorkSheetTable(sh);
}

function saveJobWorkSheetConfig() {
    if (!activeJobWorkerId) return;
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;

    sh.closingPendingSaree = parseInt(document.getElementById("jw-top-pichli-saree").value) || 0;
    sh.closingBakiAmt = parseFloat(document.getElementById("jw-top-pichla-paisa").value) || 0;

    saveJobWorkerSheets(activeJobWorkerId, sheets);
    renderJobWorkSheetTable(sh);
}

// ================= 4. ADD & EDIT ROW (3 CLEAN STACKED LINES) =================

function addJobWorkUnifiedRow() {
    if (!activeJobWorkerId) return;
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;

    var worker = getJobWorkers().find(function(x) { return String(x.id) === String(activeJobWorkerId); });
    var workerName = worker ? worker.name : "Worker";
    var isCalender = (worker && worker.type === "calender");

    // Line 1: Saree Diya
    var dDate = document.getElementById("jw-form-diya-date").value || getTodayDate();
    var rawDiyaSaree = (document.getElementById("jw-form-diya-saree").value || "").trim();
    var diyaSaree = rawDiyaSaree.split(" (Stock:")[0].trim();
    var diyaQty = parseInt(document.getElementById("jw-form-diya-qty").value) || 0;
    var diyaRate = parseFloat(document.getElementById("jw-form-diya-rate").value) || 0;

    // Stock Source Selection (Cutting vs Main)
    var stockSource = "Main";
    var rCut = document.getElementById("jw-source-cutting");
    if (isCalender && rCut && rCut.checked) {
        stockSource = "Cutting";
    }

    // Line 2: Saree Wapas Aayi
    var aDate = document.getElementById("jw-form-aayi-date").value || getTodayDate();
    var rawAayiSaree = (document.getElementById("jw-form-aayi-saree").value || "").trim();
    var aayiSaree = rawAayiSaree.split(" (Stock:")[0].trim();
    var aayiQty = parseInt(document.getElementById("jw-form-aayi-qty").value) || 0;
    var aayiRate = parseFloat(document.getElementById("jw-form-aayi-rate").value) || 0;

    // Line 3: Payment & Damage
    var payment = parseFloat(document.getElementById("jw-form-payment").value) || 0;
    var damageAmt = parseFloat(document.getElementById("jw-form-damage-amt").value) || 0;
    var damagePcs = parseInt(document.getElementById("jw-form-damage-pcs").value) || 0;

    if (diyaQty === 0 && aayiQty === 0 && payment === 0 && damageAmt === 0 && damagePcs === 0) {
        return alert("Kripya Saree Diya, Aayi, Payment ya Damage me se koi detail bharein!");
    }

    var sareeDisplayName = diyaSaree || aayiSaree || "-";
    var rowDate = (diyaQty > 0) ? dDate : aDate;

    var newRow = {
        id: "jwr_" + Date.now(),
        date: rowDate,
        sareeName: sareeDisplayName,
        gayiQty: diyaQty,
        gayiRate: diyaRate,
        stockSource: stockSource,
        aayiQty: aayiQty,
        aayiRate: aayiRate,
        payment: payment,
        damageAmt: damageAmt,
        damagePcs: damagePcs
    };

    sh.rows = safeArray(sh.rows);
    sh.rows.push(newRow);
    saveJobWorkerSheets(activeJobWorkerId, sheets);

    // Auto Stock Deduct when Saree Diya > 0
    if (diyaQty > 0 && sareeDisplayName !== "-") {
        if (stockSource === "Main") {
            var sStock = getStore("saree_stock");
            var sItem = sStock.find(function(s) { return s && s.name && s.name.toLowerCase() === sareeDisplayName.toLowerCase(); });
            if (sItem) {
                sItem.pcs = Math.max(0, (Number(sItem.pcs) || 0) - diyaQty);
                setStore("saree_stock", sStock);

                var sH = getStore("saree_history");
                sH.push({
                    id: Date.now(),
                    date: dDate,
                    name: sareeDisplayName,
                    kariger: workerName,
                    type: "Out (" + (isCalender ? "Calender" : "Cutting") + ")",
                    pcs: diyaQty,
                    note: workerName + " (" + (isCalender ? "Calender" : "Cutting") + " me diya)"
                });
                setStore("saree_history", sH);
            }
        }
    }

    // Auto Push Damage to Lott Saree Stock
    if (damagePcs > 0 && sareeDisplayName !== "-") {
        var lottStock = safeArray(getStore("lott_saree_stock"));
        var lItem = lottStock.find(function(x) { return x && x.name && x.name.toLowerCase() === sareeDisplayName.toLowerCase(); });
        if (lItem) {
            lItem.pcs = (Number(lItem.pcs) || 0) + damagePcs;
            lItem.date = rowDate;
        } else {
            lottStock.push({
                id: "lott_" + Date.now(),
                date: rowDate,
                name: sareeDisplayName,
                source: workerName + " (" + (isCalender ? "Calender" : "Cutting") + " Damage)",
                pcs: damagePcs
            });
        }
        setStore("lott_saree_stock", lottStock);
    }

    // Clear form inputs
    document.getElementById("jw-form-diya-saree").value = "";
    document.getElementById("jw-form-diya-qty").value = "";
    document.getElementById("jw-form-diya-rate").value = "";
    document.getElementById("jw-form-aayi-saree").value = "";
    document.getElementById("jw-form-aayi-qty").value = "";
    document.getElementById("jw-form-aayi-rate").value = "";
    document.getElementById("jw-form-payment").value = "";
    document.getElementById("jw-form-damage-amt").value = "";
    document.getElementById("jw-form-damage-pcs").value = "";

    renderJobWorkSheetTable(sh);
    populateJobWorkSareeDatalists();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Line entry jud gayi aur hisab live update ho gaya!");
}

function deleteJobWorkUnifiedRow(idx) {
    if (!confirm("Kya aap is line entry ko delete karna chahte hain?")) return;

    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;

    sh.rows = safeArray(sh.rows);
    var r = sh.rows[idx];

    // Reverse Main Stock if it was deducted
    if (r && r.gayiQty > 0 && r.stockSource === "Main" && r.sareeName && r.sareeName !== "-") {
        var sStock = getStore("saree_stock");
        var sItem = sStock.find(function(s) { return s && s.name && s.name.toLowerCase() === r.sareeName.toLowerCase(); });
        if (sItem) {
            sItem.pcs = (Number(sItem.pcs) || 0) + Number(r.gayiQty);
            setStore("saree_stock", sStock);
        }
    }

    // Reverse Lott Stock if damage was pushed
    if (r && r.damagePcs > 0 && r.sareeName && r.sareeName !== "-") {
        var lottStock = safeArray(getStore("lott_saree_stock"));
        var lItem = lottStock.find(function(x) { return x && x.name && x.name.toLowerCase() === r.sareeName.toLowerCase(); });
        if (lItem) {
            lItem.pcs = Math.max(0, (Number(lItem.pcs) || 0) - Number(r.damagePcs));
            setStore("lott_saree_stock", lottStock);
        }
    }

    sh.rows.splice(idx, 1);
    saveJobWorkerSheets(activeJobWorkerId, sheets);

    renderJobWorkSheetTable(sh);
    populateJobWorkSareeDatalists();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function editJobWorkUnifiedRow(idx) {
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;

    sh.rows = safeArray(sh.rows);
    var r = sh.rows[idx];
    if (!r) return;

    var nS = prompt("Saree Ka Naam:", r.sareeName);
    if (nS === null) return;
    var nGQ = prompt("Gayi Qty:", r.gayiQty);
    if (nGQ === null) return;
    var nAQ = prompt("Aayi Qty:", r.aayiQty);
    if (nAQ === null) return;
    var nAR = prompt("Aayi Ka Rate (₹):", r.aayiRate);
    if (nAR === null) return;
    var nPay = prompt("Payment (₹):", r.payment);
    if (nPay === null) return;
    var nDmgA = prompt("Damage Katauti (₹):", r.damageAmt);
    if (nDmgA === null) return;

    r.sareeName = nS.trim() || "-";
    r.gayiQty = parseInt(nGQ) || 0;
    r.aayiQty = parseInt(nAQ) || 0;
    r.aayiRate = parseFloat(nAR) || 0;
    r.payment = parseFloat(nPay) || 0;
    r.damageAmt = parseFloat(nDmgA) || 0;

    saveJobWorkerSheets(activeJobWorkerId, sheets);
    renderJobWorkSheetTable(sh);
}

// ================= 5. RENDER DRAWING SHEET TABLE & 4 CARDS =================

function renderJobWorkSheetTable(sh) {
    var tbody = document.getElementById("jw-sheet-rows-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var worker = getJobWorkers().find(function(x) { return String(x.id) === String(activeJobWorkerId); });
    var isCalender = (worker && worker.type === "calender");

    var rows = safeArray(sh.rows);

    if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan='10' style='text-align:center; padding:15px; color:#888;'>Is Mahine me abhi koi entry nahi hui hai. Upar se line jodein.</td></tr>";
    } else {
        rows.forEach(function(r, idx) {
            if (!r) return;
            var stockBadge = isCalender ? ("<td><span class='badge-blue'>" + (r.stockSource || "Main") + "</span></td>") : "";

            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(r.date) + "</td>" +
                "<td><strong>" + (r.sareeName || "-") + "</strong></td>" +
                "<td>" + (r.gayiQty > 0 ? ("<strong style='color:#dc2626;'>-" + r.gayiQty + "</strong>") : "-") + "</td>" +
                "<td>" + (r.gayiRate > 0 ? ("₹ " + r.gayiRate) : "-") + "</td>" +
                stockBadge +
                "<td>" + (r.aayiQty > 0 ? ("<strong style='color:#059669;'>+" + r.aayiQty + "</strong>") : "-") + "</td>" +
                "<td>" + (r.aayiRate > 0 ? ("₹ " + r.aayiRate) : "-") + "</td>" +
                "<td>" + (r.payment > 0 ? ("<strong style='color:#059669;'>₹ " + r.payment + "</strong>") : "-") + "</td>" +
                "<td>" + (r.damageAmt > 0 ? ("<strong style='color:#dc2626;'>-₹ " + r.damageAmt + (r.damagePcs > 0 ? " (" + r.damagePcs + " Pcs)" : "") + "</strong>") : "-") + "</td>" +
                "<td style='text-align:center;'><button class='edit-btn' onclick='editJobWorkUnifiedRow(" + idx + ")'>✏️</button> <button class='delete-btn' onclick='deleteJobWorkUnifiedRow(" + idx + ")'>🗑️</button></td>" +
            "</tr>";
        });
    }

    // 4 Dynamic Summary Cards (From User's Hand-Drawn Paper Photo)
    var c = calculateJobWorkSheetTotals(sh);

    var setT = function(id, v) {
        var el = document.getElementById(id);
        if (el) el.textContent = v;
    };

    setT("jw-card-total-gayi", c.totGayiQty + " Pcs");
    setT("jw-card-total-aayi", c.totAayiQty + " Pcs");
    setT("jw-card-total-diya-pay", "₹ " + c.totPayment.toFixed(2));
    setT("jw-card-total-lott", c.totDamagePcs + " Pcs (-₹ " + c.totDamageAmt.toFixed(0) + ")");

    setT("jw-calc-baki-saree-display", c.pendingSaree + " Pcs Baki");
    setT("jw-calc-final-baki-amt-display", "₹ " + c.finalBakiAmt.toFixed(2));
}

// ================= 6. 🏪 DUKAN BHEJA (FINAL STOCK OUT MODULE) =================

function getDukanTransfers() {
    return safeArray(getStore("dukan_transfer_history"));
}

function saveDukanTransfers(list) {
    setStore("dukan_transfer_history", safeArray(list));
}

function populateDukanSareeDatalist() {
    var dl = document.getElementById("jw-dukan-saree-dl");
    if (!dl) return;
    dl.innerHTML = "";

    // Calender se jo saree aayi hain unka hisab
    var calenderFinishedMap = {};
    var allWorkers = getJobWorkers().filter(function(w) { return w && w.type === "calender"; });

    allWorkers.forEach(function(w) {
        var sheets = getJobWorkerSheets(w.id);
        sheets.forEach(function(sh) {
            safeArray(sh.rows).forEach(function(r) {
                if (r && r.aayiQty > 0 && r.sareeName && r.sareeName !== "-") {
                    var sName = r.sareeName.trim();
                    calenderFinishedMap[sName] = (calenderFinishedMap[sName] || 0) + Number(r.aayiQty);
                }
            });
        });
    });

    for (var sName in calenderFinishedMap) {
        dl.innerHTML += "<option value='" + sName + " (Tayaar: " + calenderFinishedMap[sName] + " Pcs)'>";
    }
}

function addDukanTransferEntry() {
    var d = document.getElementById("jw-dukan-date").value || getTodayDate();
    var rawS = (document.getElementById("jw-dukan-saree").value || "").trim();
    var sName = rawS.split(" (Tayaar:")[0].trim();
    var pcs = parseInt(document.getElementById("jw-dukan-pcs").value) || 0;
    var note = (document.getElementById("jw-dukan-note").value || "").trim();

    if (!sName || pcs <= 0) return alert("Saree ka naam aur Pcs bharein!");

    var list = getDukanTransfers();
    list.push({
        id: "duk_" + Date.now(),
        date: d,
        sareeName: sName,
        pcs: pcs,
        note: note || "Apni Dukan Transfer"
    });

    saveDukanTransfers(list);

    document.getElementById("jw-dukan-saree").value = "";
    document.getElementById("jw-dukan-pcs").value = "";
    document.getElementById("jw-dukan-note").value = "";

    renderDukanTransferTable();
    updateJobWorkHubBadges();
    alert("✅ " + pcs + " Pcs " + sName + " Apni Dukan par bhej di gayi!");
}

function deleteDukanTransferEntry(idx) {
    if (!confirm("Kya aap is Dukan transfer entry ko delete karna chahte hain?")) return;
    var list = getDukanTransfers();
    list.splice(idx, 1);
    saveDukanTransfers(list);
    renderDukanTransferTable();
    updateJobWorkHubBadges();
}

function renderDukanTransferTable() {
    var tbody = document.getElementById("jw-dukan-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var list = getDukanTransfers();

    // Calculate Calender Finished Total
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

    var elCal = document.getElementById("jw-stat-calender-finished");
    var elSent = document.getElementById("jw-stat-dukan-sent");
    var elRem = document.getElementById("jw-stat-karkhana-bacha");

    if (elCal) elCal.textContent = totCalenderFinished + " Pcs";
    if (elSent) elSent.textContent = totDukanSent + " Pcs";
    if (elRem) elRem.textContent = bachaInKarkhana + " Pcs";

    if (!list.length) {
        tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:15px; color:#888;'>Abhi tak koi saree Dukan par nahi bheji gayi hai.</td></tr>";
        return;
    }

    list.forEach(function(d, idx) {
        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(d.date) + "</td>" +
            "<td><strong>" + d.sareeName + "</strong></td>" +
            "<td><strong style='color:#059669;'>" + d.pcs + " Pcs</strong></td>" +
            "<td>" + (d.note || "Apni Dukan Transfer") + "</td>" +
            "<td style='text-align:center;'><button class='delete-btn' onclick='deleteDukanTransferEntry(" + idx + ")'>🗑️ Delete</button></td>" +
        "</tr>";
    });
}

// ================= 7. WHATSAPP PARCHI =================

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
            text += (idx + 1) + "️⃣ *" + formatDateDisplay(r.date) + " - " + r.sareeName + "*\n";
            if (Number(r.gayiQty) > 0) text += "   • Diya: " + r.gayiQty + " Pcs\n";
            if (Number(r.aayiQty) > 0) text += "   • Wapas Laya: " + r.aayiQty + " Pcs (@ ₹" + r.aayiRate + " = ₹" + (r.aayiQty * r.aayiRate) + ")\n";
            if (Number(r.damageAmt) > 0) text += "   • ⚠️ Damage Katauti: -₹" + r.damageAmt + "\n";
            if (Number(r.payment) > 0) text += "   • Payment Diya: ₹" + r.payment + "\n";
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
    text += "💰 *MAZDOORI & RUPAYE HISAB:*\n";
    text += "🟢 Kul Mazdoori: *₹ " + c.totMazdoori.toFixed(2) + "*\n";
    if (c.closingBakiAmt !== 0) text += "➕ Pichla Baki Paisa: *+₹ " + c.closingBakiAmt.toFixed(2) + "*\n";
    if (c.totDamageAmt > 0) text += "⚠️ Damage Katauti: *-₹ " + c.totDamageAmt.toFixed(2) + "*\n";
    text += "➖ Payment Diya: *-₹ " + c.totPayment.toFixed(2) + "*\n";
    text += "-------------------------------------\n";
    text += "🔴 *FINAL BAKI RUPAYE:* *₹ " + c.finalBakiAmt.toFixed(2) + "*\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "_Simplicity ERP • Developed by Farhan Jawed_";

    // Direct WhatsApp: Worker number ya Client account mobile
    var mobile = (w.mobile || "").trim().replace(/[^0-9]/g, "");
    if (!mobile && typeof getClientMobileNumber === "function") {
        mobile = getClientMobileNumber();
    }

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
