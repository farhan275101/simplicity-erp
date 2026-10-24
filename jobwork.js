/* ========================================================
   SIMPLICITY ERP - JOB WORK (CUTTING & CALENDER) & DUKAN TRANSFER
   File 7 of 7 • Developed by Farhan Jawed
======================================================== */

var currentJobWorkTab = "cutting"; // "cutting" ya "calender"
var activeJobWorkerId = null;
var activeJobSheetId = null;

// ================= 1. WORKERS MASTER DATA =================

function getJobWorkers() {
    return safeArray(getStore("jobwork_workers"));
}

function saveJobWorkers(list) {
    setStore("jobwork_workers", safeArray(list));
}

function openJobWorkModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("jobwork-section", "block");
    setDisplay("jobwork-sheet-view", "none");
    setDisplay("jobwork-list-view", "block");
    switchJobWorkTab(currentJobWorkTab);
}

function switchJobWorkTab(tab) {
    currentJobWorkTab = tab;
    var btnC = document.getElementById("jw-tab-btn-cutting");
    var btnCal = document.getElementById("jw-tab-btn-calender");

    if (btnC && btnCal) {
        if (tab === "cutting") {
            btnC.className = "sheet-tab active";
            btnCal.className = "sheet-tab";
        } else {
            btnCal.className = "sheet-tab active";
            btnC.className = "sheet-tab";
        }
    }

    var titleEl = document.getElementById("jw-module-title");
    if (titleEl) {
        titleEl.textContent = (tab === "cutting") ? "✂️ Booti Cutting Workers Master" : "🎛️ Calender & Jhalar Workers Master";
    }

    renderJobWorkTable();
}

function toggleJobWorkerForm() {
    var f = document.getElementById("add-jw-worker-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    document.getElementById("jw-worker-date").value = getTodayDate();
    document.getElementById("jw-worker-type").value = currentJobWorkTab;
    cancelJobWorkerEdit();
}

function cancelJobWorkerEdit() {
    document.getElementById("jw-worker-edit-id").value = "";
    document.getElementById("jw-worker-name").value = "";
    document.getElementById("jw-worker-address").value = "";
    document.getElementById("jw-worker-mobile").value = "";
    document.getElementById("jw-worker-date").value = getTodayDate();
    document.getElementById("jw-worker-save-btn").textContent = "Save Worker";
    setDisplay("jw-worker-cancel-btn", "none");
}

function saveNewJobWorker() {
    var editId = document.getElementById("jw-worker-edit-id").value;
    var n = (document.getElementById("jw-worker-name").value || "").trim().toUpperCase();
    var addr = (document.getElementById("jw-worker-address").value || "").trim();
    var type = document.getElementById("jw-worker-type").value || currentJobWorkTab;
    var m = (document.getElementById("jw-worker-mobile").value || "").trim();
    var d = document.getElementById("jw-worker-date").value || getTodayDate();

    if (!n) return alert("Worker ka naam zaroori hai!");

    var list = getJobWorkers();

    if (editId) {
        var it = list.find(function(x) { return String(x.id) === String(editId); });
        if (it) {
            it.name = n;
            it.address = addr;
            it.type = type;
            it.mobile = m;
            it.date = d;
        }
    } else {
        list.push({
            id: "jw_" + Date.now(),
            name: n,
            address: addr,
            type: type,
            mobile: m,
            date: d
        });
    }

    saveJobWorkers(list);
    cancelJobWorkerEdit();
    setDisplay("add-jw-worker-form", "none");
    renderJobWorkTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

// ================= 2. WORKER MONTHLY SHEETS & CARRY FORWARD =================

function getJobWorkerSheets(workerId) {
    if (!workerId) return [];
    var sheets = safeArray(getStore("jobwork_sheets_" + workerId));
    sheets.forEach(function(sh) {
        if (sh) {
            sh.redRows = safeArray(sh.redRows);
            sh.greenRows = safeArray(sh.greenRows);
            sh.damageRows = safeArray(sh.damageRows);
            sh.paymentRows = safeArray(sh.paymentRows);
        }
    });
    return sheets;
}

function saveJobWorkerSheets(workerId, sheets) {
    if (!workerId) return;
    var cleanSheets = safeArray(sheets);
    cleanSheets.forEach(function(sh) {
        if (sh) {
            sh.redRows = safeArray(sh.redRows);
            sh.greenRows = safeArray(sh.greenRows);
            sh.damageRows = safeArray(sh.damageRows);
            sh.paymentRows = safeArray(sh.paymentRows);
        }
    });
    setStore("jobwork_sheets_" + workerId, cleanSheets);
}

function calculateJobWorkSheetTotals(sh) {
    var def = {
        closingPendingSaree: 0,
        closingBakiAmt: 0,
        totRedQty: 0,
        totRedAmt: 0,
        totGreenQty: 0,
        totGreenAmt: 0,
        totDmgQty: 0,
        totDmgAmt: 0,
        totPaid: 0,
        totDukanSent: 0,
        pendingSaree: 0,
        remBakiAmt: 0
    };

    if (!sh || typeof sh !== "object") return def;

    var redQ = 0, redA = 0;
    safeArray(sh.redRows).forEach(function(r) {
        var q = Number(r.qty) || 0;
        var amt = Number(r.amount) || (q * (Number(r.rate) || 0));
        redQ += q;
        redA += amt;
    });

    var greenQ = 0, greenA = 0, dukanS = 0;
    safeArray(sh.greenRows).forEach(function(r) {
        var q = Number(r.qty) || 0;
        var amt = Number(r.amount) || (q * (Number(r.rate) || 0));
        greenQ += q;
        greenA += amt;
        dukanS += (Number(r.dukanSentQty) || 0);
    });

    var dmgQ = 0, dmgA = 0;
    safeArray(sh.damageRows).forEach(function(r) {
        dmgQ += (Number(r.qty) || 0);
        dmgA += (Number(r.damageAmt) || 0);
    });

    var paid = 0;
    safeArray(sh.paymentRows).forEach(function(r) {
        paid += (Number(r.paid) || 0);
    });

    var pichliSaree = Number(sh.closingPendingSaree) || 0;
    var pichlaBakiAmt = Number(sh.closingBakiAmt) || 0;

    // Baki Saree = (Pichli Baki + Red Gayi) - (Green Aayi + Damage Hui)
    var pendingSaree = Math.max(0, (pichliSaree + redQ) - (greenQ + dmgQ));

    // Final Baki Rupaye = (Green Mazdoori + Pichla Baki) - (Damage Katauti + Payment Diya)
    var remBakiAmt = (greenA + pichlaBakiAmt) - (dmgA + paid);

    return {
        closingPendingSaree: pichliSaree,
        closingBakiAmt: pichlaBakiAmt,
        totRedQty: redQ,
        totRedAmt: redA,
        totGreenQty: greenQ,
        totGreenAmt: greenA,
        totDmgQty: dmgQ,
        totDmgAmt: dmgA,
        totPaid: paid,
        totDukanSent: dukanS,
        pendingSaree: pendingSaree,
        remBakiAmt: remBakiAmt
    };
}

function getJobWorkerOverallSummary(workerId) {
    var sheets = getJobWorkerSheets(workerId);
    if (!sheets || !sheets.length) {
        return { pendingSaree: 0, remBakiAmt: 0 };
    }
    var latestSheet = sheets[sheets.length - 1];
    var c = calculateJobWorkSheetTotals(latestSheet);
    return {
        pendingSaree: c.pendingSaree,
        remBakiAmt: c.remBakiAmt
    };
}

// ================= 3. RENDER WORKERS MASTER TABLE =================

function renderJobWorkTable() {
    var tbody = document.getElementById("jw-workers-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var allWorkers = getJobWorkers();
    var filtered = allWorkers.filter(function(w) {
        return w && (w.type || "cutting") === currentJobWorkTab;
    });

    var totalJobWorkAtki = 0;

    // Total atki saree in current category
    allWorkers.forEach(function(w) {
        if (w && (w.type || "cutting") === currentJobWorkTab) {
            var s = getJobWorkerOverallSummary(w.id);
            totalJobWorkAtki += s.pendingSaree;
        }
    });

    // Total Saree Manufactured from Karigers (Godam stock total)
    var totalKarigerSaree = 0;
    var sStock = getStore("saree_stock");
    sStock.forEach(function(s) {
        totalKarigerSaree += (Number(s.pcs) || 0);
    });

    var elGreen = document.getElementById("jw-total-kariger-saree");
    var elRed = document.getElementById("jw-total-jobwork-atki");
    if (elGreen) elGreen.textContent = totalKarigerSaree + " Pcs";
    if (elRed) elRed.textContent = totalJobWorkAtki + " Pcs";

    if (!filtered.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Koi Worker nahi mila. Upar '+ Naya Worker' se jodein.</td></tr>";
        return;
    }

    filtered.forEach(function(w) {
        var s = getJobWorkerOverallSummary(w.id);

        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(w.date) + "</td>" +
            "<td><strong>" + w.name + "</strong></td>" +
            "<td>" + (w.address || "-") + "</td>" +
            "<td>" + (w.mobile || "-") + "</td>" +
            "<td style='text-align:center;'>" +
                "<button class='sheet-btn' onclick='openJobWorkerSheet(\"" + w.id + "\")'>📊 Sheet Khata</button> " +
                "<button class='edit-btn' onclick='editJobWorker(\"" + w.id + "\")'>✏️ Edit</button> " +
                "<button class='delete-btn' onclick='deleteJobWorker(\"" + w.id + "\")'>🗑️</button>" +
            "</td>" +
        "</tr>";
    });
}

function editJobWorker(id) {
    var w = getJobWorkers().find(function(x) { return String(x.id) === String(id); });
    if (!w) return;
    document.getElementById("jw-worker-edit-id").value = w.id;
    document.getElementById("jw-worker-name").value = w.name;
    document.getElementById("jw-worker-address").value = w.address || "";
    document.getElementById("jw-worker-type").value = w.type || currentJobWorkTab;
    document.getElementById("jw-worker-mobile").value = w.mobile || "";
    document.getElementById("jw-worker-date").value = w.date || getTodayDate();

    document.getElementById("jw-worker-save-btn").textContent = "Update Worker";
    setDisplay("jw-worker-cancel-btn", "inline-block");
    setDisplay("add-jw-worker-form", "block");
}

function deleteJobWorker(id) {
    if (!confirm("Kya aap is Worker ko delete karna chahte hain?")) return;
    var filtered = getJobWorkers().filter(function(x) { return String(x.id) !== String(id); });
    saveJobWorkers(filtered);

    try {
        localStorage.removeItem(currentUserId + "_jobwork_sheets_" + id);
        if (db) db.ref("users/" + currentUserId + "/jobwork_sheets_" + id).remove();
    } catch (e) {}

    renderJobWorkTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

// ================= 4. MONTHLY SHEET & CARRY FORWARD CONTROLLER =================

function openJobWorkerSheet(workerId) {
    var w = getJobWorkers().find(function(x) { return String(x.id) === String(workerId); });
    if (!w) return alert("Worker nahi mila!");

    activeJobWorkerId = w.id;
    var typeTitle = (w.type === "calender") ? "Calender / Jhalar" : "Booti Cutting";
    document.getElementById("jw-sheet-banner-name").textContent = w.name + " (" + typeTitle + " Khata)";
    
    // Set today dates for entry forms
    ["jw-red-date", "jw-green-date", "jw-dmg-date", "jw-pay-date"].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = getTodayDate();
    });

    populateJobWorkSareeDatalists();

    setDisplay("jobwork-list-view", "none");
    setDisplay("jobwork-sheet-view", "block");

    var sheets = getJobWorkerSheets(activeJobWorkerId);
    if (!sheets || !sheets.length) {
        sheets = [{
            id: "jw_sh_" + Date.now(),
            title: "Month 1 (" + getTodayDate().substring(0, 7) + ")",
            closingPendingSaree: 0,
            closingBakiAmt: 0,
            redRows: [],
            greenRows: [],
            damageRows: [],
            paymentRows: []
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
    setDisplay("jobwork-sheet-view", "none");
    setDisplay("jobwork-list-view", "block");
    renderJobWorkTable();
}

function populateJobWorkSareeDatalists() {
    var dlRed = document.getElementById("jw-red-saree-dl");
    var dlGreen = document.getElementById("jw-green-saree-dl");
    var dlDmg = document.getElementById("jw-dmg-saree-dl");

    var optionsHtml = "";
    var sStock = getStore("saree_stock");
    sStock.forEach(function(s) {
        if (s && s.name) {
            optionsHtml += "<option value='" + s.name + " (Stock: " + (s.pcs || 0) + ")'>";
        }
    });

    if (dlRed) dlRed.innerHTML = optionsHtml;
    if (dlGreen) dlGreen.innerHTML = optionsHtml;
    if (dlDmg) dlDmg.innerHTML = optionsHtml;
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
    var calc = cur ? calculateJobWorkSheetTotals(cur) : { pendingSaree: 0, remBakiAmt: 0 };

    var nextMonthNum = sheets.length + 1;
    var monthName = "Month " + nextMonthNum + " (" + getTodayDate().substring(0, 7) + ")";

    var newS = {
        id: "jw_sh_" + Date.now(),
        title: monthName,
        closingPendingSaree: calc.pendingSaree,
        closingBakiAmt: Number(calc.remBakiAmt.toFixed(2)),
        redRows: [],
        greenRows: [],
        damageRows: [],
        paymentRows: []
    };

    sheets.push(newS);
    saveJobWorkerSheets(activeJobWorkerId, sheets);
    activeJobSheetId = newS.id;

    renderJobWorkSheetTabs();
    loadCurrentJobWorkSheet();
    alert("✅ Naya Mahina jud gaya! Pichli bachi " + calc.pendingSaree + " Saree aur ₹ " + calc.remBakiAmt.toFixed(2) + " baki aage carry-forward ho gaye.");
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

    var elPichliSaree = document.getElementById("jw-pichli-saree-input");
    var elPichlaBaki = document.getElementById("jw-pichla-baki-input");

    if (elPichliSaree) elPichliSaree.value = sh.closingPendingSaree || 0;
    if (elPichlaBaki) elPichlaBaki.value = sh.closingBakiAmt || 0;

    renderJobWorkSheetAllBoxes(sh);
}

function saveJobWorkSheetConfig() {
    if (!activeJobWorkerId) return;
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;

    sh.closingPendingSaree = parseInt(document.getElementById("jw-pichli-saree-input").value) || 0;
    sh.closingBakiAmt = parseFloat(document.getElementById("jw-pichla-baki-input").value) || 0;

    saveJobWorkerSheets(activeJobWorkerId, sheets);
    renderJobWorkSheetAllBoxes(sh);
}

// ================= 5. RED, GREEN, DAMAGE, PAYMENT ENTRIES & EDITING =================

// A. RED BOX: MAAL GAYA (STOCK MINUS)
function addJobWorkRedRow() {
    if (!activeJobWorkerId) return;
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;

    var worker = getJobWorkers().find(function(x) { return String(x.id) === String(activeJobWorkerId); });
    var workerName = worker ? worker.name : "Worker";
    var workerTypeTitle = (worker && worker.type === "calender") ? "Calender" : "Cutting";

    var d = document.getElementById("jw-red-date").value || getTodayDate();
    var rawS = (document.getElementById("jw-red-saree").value || "").trim();
    var sName = rawS.split(" (Stock:")[0].trim();
    var qty = parseInt(document.getElementById("jw-red-qty").value) || 0;
    var rate = parseFloat(document.getElementById("jw-red-rate").value) || 0;

    if (!sName || qty <= 0) return alert("Saree ka naam aur Quantity bharein!");

    sh.redRows = safeArray(sh.redRows);
    sh.redRows.push({
        id: "red_" + Date.now(),
        date: d,
        sareeName: sName,
        qty: qty,
        rate: rate,
        amount: qty * rate
    });

    saveJobWorkerSheets(activeJobWorkerId, sheets);

    // Auto Saree Stock Minus
    var sStock = getStore("saree_stock");
    var sItem = sStock.find(function(s) { return s && s.name && s.name.toLowerCase() === sName.toLowerCase(); });
    if (sItem) {
        sItem.pcs = Math.max(0, (Number(sItem.pcs) || 0) - qty);
        setStore("saree_stock", sStock);

        var sH = getStore("saree_history");
        sH.push({
            id: Date.now(),
            date: d,
            name: sName,
            kariger: workerName,
            type: "Out (" + workerTypeTitle + ")",
            pcs: qty,
            note: workerName + " (" + workerTypeTitle + " ke liye diya)"
        });
        setStore("saree_history", sH);
    }

    document.getElementById("jw-red-saree").value = "";
    document.getElementById("jw-red-qty").value = "";
    document.getElementById("jw-red-rate").value = "";

    renderJobWorkSheetAllBoxes(sh);
    populateJobWorkSareeDatalists();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Saree Gayi entry jud gayi aur Saree Stock se " + qty + " pcs minus ho gaye!");
}

// B. GREEN BOX: MAAL AAYA (MAZDOORI)
function addJobWorkGreenRow() {
    if (!activeJobWorkerId) return;
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;

    var d = document.getElementById("jw-green-date").value || getTodayDate();
    var rawS = (document.getElementById("jw-green-saree").value || "").trim();
    var sName = rawS.split(" (Stock:")[0].trim();
    var qty = parseInt(document.getElementById("jw-green-qty").value) || 0;
    var rate = parseFloat(document.getElementById("jw-green-rate").value) || 0;

    if (!sName || qty <= 0) return alert("Saree ka naam aur Quantity bharein!");

    sh.greenRows = safeArray(sh.greenRows);
    sh.greenRows.push({
        id: "green_" + Date.now(),
        date: d,
        sareeName: sName,
        qty: qty,
        rate: rate,
        amount: qty * rate,
        dukanSentQty: 0
    });

    saveJobWorkerSheets(activeJobWorkerId, sheets);

    document.getElementById("jw-green-saree").value = "";
    document.getElementById("jw-green-qty").value = "";
    document.getElementById("jw-green-rate").value = "";

    renderJobWorkSheetAllBoxes(sh);
    alert("✅ Wapas Aayi entry jud gayi aur mazdoori hisab update ho gaya!");
}

// C. DAMAGE BOX: KATI SAREE (MINUS & LOTT STOCK ENTRY)
function addJobWorkDamageRow() {
    if (!activeJobWorkerId) return;
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;

    var worker = getJobWorkers().find(function(x) { return String(x.id) === String(activeJobWorkerId); });
    var workerName = worker ? worker.name : "Worker";
    var workerTypeTitle = (worker && worker.type === "calender") ? "Calender" : "Cutting";

    var d = document.getElementById("jw-dmg-date").value || getTodayDate();
    var rawS = (document.getElementById("jw-dmg-saree").value || "").trim();
    var sName = rawS.split(" (Stock:")[0].trim();
    var qty = parseInt(document.getElementById("jw-dmg-qty").value) || 0;
    var dmgAmt = parseFloat(document.getElementById("jw-dmg-amt").value) || 0;

    if (!sName || qty <= 0) return alert("Saree aur Damage Quantity bharein!");

    sh.damageRows = safeArray(sh.damageRows);
    sh.damageRows.push({
        id: "dmg_" + Date.now(),
        date: d,
        sareeName: sName,
        qty: qty,
        damageAmt: dmgAmt
    });

    saveJobWorkerSheets(activeJobWorkerId, sheets);

    // Auto Push to Lott Saree Stock
    var lottStock = safeArray(getStore("lott_saree_stock"));
    var lItem = lottStock.find(function(x) { return x && x.name && x.name.toLowerCase() === sName.toLowerCase(); });
    if (lItem) {
        lItem.pcs = (Number(lItem.pcs) || 0) + qty;
        lItem.date = d;
    } else {
        lottStock.push({
            id: "lott_" + Date.now(),
            date: d,
            name: sName,
            source: workerName + " (" + workerTypeTitle + " Damage)",
            pcs: qty
        });
    }
    setStore("lott_saree_stock", lottStock);

    document.getElementById("jw-dmg-saree").value = "";
    document.getElementById("jw-dmg-qty").value = "";
    document.getElementById("jw-dmg-amt").value = "";

    renderJobWorkSheetAllBoxes(sh);
    alert("✅ Damage entry jud gayi, mazdoori se ₹" + dmgAmt + " minus hua aur " + qty + " saree Lott Stock me darj ho gayi!");
}

// D. PAYMENT BOX: PAISA DIYA
function addJobWorkPaymentRow() {
    if (!activeJobWorkerId) return;
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;

    var d = document.getElementById("jw-pay-date").value || getTodayDate();
    var paid = parseFloat(document.getElementById("jw-pay-amt").value) || 0;
    var note = (document.getElementById("jw-pay-note").value || "").trim();

    if (paid <= 0) return alert("Sahi payment amount bharein!");

    sh.paymentRows = safeArray(sh.paymentRows);
    sh.paymentRows.push({
        id: "pay_" + Date.now(),
        date: d,
        paid: paid,
        note: note || "Cash Diya"
    });

    saveJobWorkerSheets(activeJobWorkerId, sheets);

    document.getElementById("jw-pay-amt").value = "";
    document.getElementById("jw-pay-note").value = "";

    renderJobWorkSheetAllBoxes(sh);
    alert("✅ ₹" + paid + " ka payment jud gaya!");
}

// E. 🏪 DUKAN BHEJA (FROM CALENDER STAGE)
function sendToDukanFromCalender(greenRowIdx) {
    if (!activeJobWorkerId) return;
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh || !sh.greenRows) return;

    var r = sh.greenRows[greenRowIdx];
    if (!r) return;

    var bachaPcs = (Number(r.qty) || 0) - (Number(r.dukanSentQty) || 0);
    if (bachaPcs <= 0) return alert("Yeh saree pehle hi poori Dukan par bhej di gayi hai!");

    var sendQty = parseInt(prompt("Saree: " + r.sareeName + "\nAvailable Finished Pcs: " + bachaPcs + "\n\nKitne Pcs Apni Dukan par bheje:", bachaPcs));
    if (!sendQty || isNaN(sendQty) || sendQty <= 0) return;

    if (sendQty > bachaPcs) return alert("Sirf " + bachaPcs + " Pcs available hain!");

    var dukanDate = prompt("Tareekh (YYYY-MM-DD):", getTodayDate()) || getTodayDate();
    var note = prompt("Dukan Vivran / Note:", "Apni Dukan Transfer") || "Apni Dukan Transfer";

    r.dukanSentQty = (Number(r.dukanSentQty) || 0) + sendQty;
    saveJobWorkerSheets(activeJobWorkerId, sheets);

    // Log to Dukan History
    var dHist = safeArray(getStore("dukan_transfer_history"));
    dHist.push({
        id: Date.now(),
        date: dukanDate,
        sareeName: r.sareeName,
        pcs: sendQty,
        note: note
    });
    setStore("dukan_transfer_history", dHist);

    renderJobWorkSheetAllBoxes(sh);
    alert("✅ " + sendQty + " Pcs " + r.sareeName + " Apni Dukan par bhej di gayi!");
}

// F. ROW EDIT & DELETE HANDLERS
function deleteJobWorkSubRow(boxType, idx) {
    if (!confirm("Kya aap is entry ko delete karna chahte hain?")) return;
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;

    if (boxType === "red") {
        var r = sh.redRows[idx];
        // Reverse Saree stock
        if (r && r.qty > 0 && r.sareeName) {
            var sStock = getStore("saree_stock");
            var sItem = sStock.find(function(s) { return s && s.name && s.name.toLowerCase() === r.sareeName.toLowerCase(); });
            if (sItem) {
                sItem.pcs = (Number(sItem.pcs) || 0) + Number(r.qty);
                setStore("saree_stock", sStock);
            }
        }
        sh.redRows.splice(idx, 1);
    } else if (boxType === "green") {
        sh.greenRows.splice(idx, 1);
    } else if (boxType === "damage") {
        sh.damageRows.splice(idx, 1);
    } else if (boxType === "payment") {
        sh.paymentRows.splice(idx, 1);
    }

    saveJobWorkerSheets(activeJobWorkerId, sheets);
    renderJobWorkSheetAllBoxes(sh);
    populateJobWorkSareeDatalists();
}

function editJobWorkSubRow(boxType, idx) {
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;

    if (boxType === "red") {
        var r = sh.redRows[idx];
        var nQ = prompt("Kitni Saree Gayi (Qty):", r.qty);
        if (nQ === null) return;
        var nR = prompt("Rate (₹):", r.rate);
        if (nR === null) return;

        var diff = parseInt(nQ) - Number(r.qty);
        r.qty = parseInt(nQ) || 0;
        r.rate = parseFloat(nR) || 0;
        r.amount = r.qty * r.rate;

        // Adjust stock difference
        if (diff !== 0 && r.sareeName) {
            var sStock = getStore("saree_stock");
            var sItem = sStock.find(function(s) { return s && s.name && s.name.toLowerCase() === r.sareeName.toLowerCase(); });
            if (sItem) {
                sItem.pcs = Math.max(0, (Number(sItem.pcs) || 0) - diff);
                setStore("saree_stock", sStock);
            }
        }
    } else if (boxType === "green") {
        var g = sh.greenRows[idx];
        var gQ = prompt("Kitni Saree Wapas Aayi (Qty):", g.qty);
        if (gQ === null) return;
        var gR = prompt("Rate (₹):", g.rate);
        if (gR === null) return;

        g.qty = parseInt(gQ) || 0;
        g.rate = parseFloat(gR) || 0;
        g.amount = g.qty * g.rate;
    } else if (boxType === "damage") {
        var d = sh.damageRows[idx];
        var dQ = prompt("Damage Saree Quantity:", d.qty);
        if (dQ === null) return;
        var dA = prompt("Damage Katauti Amount (₹):", d.damageAmt);
        if (dA === null) return;

        d.qty = parseInt(dQ) || 0;
        d.damageAmt = parseFloat(dA) || 0;
    } else if (boxType === "payment") {
        var p = sh.paymentRows[idx];
        var pA = prompt("Paid Amount (₹):", p.paid);
        if (pA === null) return;
        p.paid = parseFloat(pA) || 0;
    }

    saveJobWorkerSheets(activeJobWorkerId, sheets);
    renderJobWorkSheetAllBoxes(sh);
    populateJobWorkSareeDatalists();
}

// ================= 6. RENDER ALL SHEET BOXES =================

function renderJobWorkSheetAllBoxes(sh) {
    var worker = getJobWorkers().find(function(x) { return String(x.id) === String(activeJobWorkerId); });
    var isCalender = (worker && worker.type === "calender");

    // 1. Red Table (Maal Gaya)
    var tbodyRed = document.getElementById("jw-red-table-body");
    if (tbodyRed) {
        tbodyRed.innerHTML = "";
        safeArray(sh.redRows).forEach(function(r, idx) {
            tbodyRed.innerHTML += "<tr style='background:#fef2f2;'>" +
                "<td>" + formatDateDisplay(r.date) + "</td>" +
                "<td><strong>" + r.sareeName + "</strong></td>" +
                "<td><span style='color:#dc2626; font-weight:bold;'>-" + r.qty + " Pcs</span></td>" +
                "<td>₹ " + r.rate + "</td>" +
                "<td><strong>₹ " + Number(r.amount).toFixed(2) + "</strong></td>" +
                "<td style='text-align:center;'><button class='edit-btn' onclick='editJobWorkSubRow(\"red\", " + idx + ")'>✏️</button> <button class='delete-btn' onclick='deleteJobWorkSubRow(\"red\", " + idx + ")'>🗑️</button></td>" +
            "</tr>";
        });
    }

    // 2. Green Table (Maal Aaya)
    var tbodyGreen = document.getElementById("jw-green-table-body");
    if (tbodyGreen) {
        tbodyGreen.innerHTML = "";
        safeArray(sh.greenRows).forEach(function(r, idx) {
            var dukanBtn = isCalender ? (" <button class='quick-btn' style='background:#fef3c7; color:#92400e; border:1px solid #fde68a;' onclick='sendToDukanFromCalender(" + idx + ")'>🏪 Dukan Bheja (" + (r.dukanSentQty || 0) + "/" + r.qty + ")</button>") : "";
            tbodyGreen.innerHTML += "<tr style='background:#ecfdf5;'>" +
                "<td>" + formatDateDisplay(r.date) + "</td>" +
                "<td><strong>" + r.sareeName + "</strong></td>" +
                "<td><span style='color:#059669; font-weight:bold;'>+" + r.qty + " Pcs</span></td>" +
                "<td>₹ " + r.rate + "</td>" +
                "<td><strong style='color:#059669;'>₹ " + Number(r.amount).toFixed(2) + "</strong></td>" +
                "<td style='text-align:center;'><button class='edit-btn' onclick='editJobWorkSubRow(\"green\", " + idx + ")'>✏️</button> <button class='delete-btn' onclick='deleteJobWorkSubRow(\"green\", " + idx + ")'>🗑️</button>" + dukanBtn + "</td>" +
            "</tr>";
        });
    }

    // 3. Damage Table
    var tbodyDmg = document.getElementById("jw-dmg-table-body");
    if (tbodyDmg) {
        tbodyDmg.innerHTML = "";
        safeArray(sh.damageRows).forEach(function(r, idx) {
            tbodyDmg.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(r.date) + "</td>" +
                "<td><strong>" + r.sareeName + "</strong></td>" +
                "<td><span class='badge-red'>⚠️ " + r.qty + " Pcs</span></td>" +
                "<td><strong style='color:#dc2626;'>- ₹ " + Number(r.damageAmt).toFixed(2) + "</strong></td>" +
                "<td style='text-align:center;'><button class='edit-btn' onclick='editJobWorkSubRow(\"damage\", " + idx + ")'>✏️</button> <button class='delete-btn' onclick='deleteJobWorkSubRow(\"damage\", " + idx + ")'>🗑️</button></td>" +
            "</tr>";
        });
    }

    // 4. Payment Table
    var tbodyPay = document.getElementById("jw-pay-table-body");
    if (tbodyPay) {
        tbodyPay.innerHTML = "";
        safeArray(sh.paymentRows).forEach(function(r, idx) {
            tbodyPay.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(r.date) + "</td>" +
                "<td><strong style='color:#059669;'>₹ " + Number(r.paid).toFixed(2) + "</strong></td>" +
                "<td>" + (r.note || "Cash") + "</td>" +
                "<td style='text-align:center;'><button class='edit-btn' onclick='editJobWorkSubRow(\"payment\", " + idx + ")'>✏️</button> <button class='delete-btn' onclick='deleteJobWorkSubRow(\"payment\", " + idx + ")'>🗑️</button></td>" +
            "</tr>";
        });
    }

    // Calculations
    var c = calculateJobWorkSheetTotals(sh);
    var setT = function(id, v) {
        var el = document.getElementById(id);
        if (el) el.textContent = v;
    };

    setT("jw-sum-red-qty", c.totRedQty + " Pcs");
    setT("jw-sum-red-amt", "₹ " + c.totRedAmt.toFixed(2));
    setT("jw-sum-green-qty", c.totGreenQty + " Pcs");
    setT("jw-sum-green-amt", "₹ " + c.totGreenAmt.toFixed(2));

    // Bottom Final Cards
    setT("jw-calc-pichli-saree", c.closingPendingSaree + " Pcs");
    setT("jw-calc-tot-red", "+ " + c.totRedQty + " Pcs");
    setT("jw-calc-tot-green", "- " + c.totGreenQty + " Pcs");
    setT("jw-calc-tot-dmg", "- " + c.totDmgQty + " Pcs");
    setT("jw-calc-baki-saree", c.pendingSaree + " Pcs Baki");

    setT("jw-calc-tot-mazdoori", "₹ " + c.totGreenAmt.toFixed(2));
    setT("jw-calc-pichla-baki-amt", "+ ₹ " + c.closingBakiAmt.toFixed(2));
    setT("jw-calc-dmg-katauti", "- ₹ " + c.totDmgAmt.toFixed(2));
    setT("jw-calc-paid-amt", "- ₹ " + c.totPaid.toFixed(2));
    setT("jw-calc-final-baki-amt", "₹ " + c.remBakiAmt.toFixed(2));
}

// ================= 7. WHATSAPP PARCHI =================

function shareJobWorkOnWhatsApp() {
    if (!activeJobWorkerId || !activeJobSheetId) return alert("Pehle koi Khata Sheet kholein!");

    var w = getJobWorkers().find(function(x) { return String(x.id) === String(activeJobWorkerId); });
    var sheet = getJobWorkerSheets(activeJobWorkerId).find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!w || !sheet) return alert("Data nahi mila!");

    var c = calculateJobWorkSheetTotals(sheet);
    var typeTitle = (w.type === "calender") ? "CALENDER & JHALAR" : "BOOTI CUTTING";

    var text = "🧾 *" + typeTitle + " HISAB PARCHI* 🧾\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "👤 *Worker:* " + w.name + "\n";
    text += "📅 *Mahina:* " + sheet.title + "\n";
    text += "📅 *Tarikh:* " + formatDateDisplay(getTodayDate()) + "\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";

    text += "🔴 *SAREE GAYI (OUT):*\n";
    if (!sheet.redRows || !sheet.redRows.length) text += "_Koi entry nahi_\n";
    else {
        sheet.redRows.forEach(function(r) {
            text += " • " + formatDateDisplay(r.date) + ": " + r.sareeName + " - *" + r.qty + " Pcs* (@ ₹" + r.rate + ")\n";
        });
    }

    text += "\n🟢 *SAREE AAYI (IN & MAZDOORI):*\n";
    if (!sheet.greenRows || !sheet.greenRows.length) text += "_Koi entry nahi_\n";
    else {
        sheet.greenRows.forEach(function(r) {
            text += " • " + formatDateDisplay(r.date) + ": " + r.sareeName + " - *" + r.qty + " Pcs* = ₹" + Number(r.amount).toFixed(2) + "\n";
        });
    }

    if (sheet.damageRows && sheet.damageRows.length) {
        text += "\n⚠️ *DAMAGE KATAUTI:*\n";
        sheet.damageRows.forEach(function(r) {
            text += " • " + formatDateDisplay(r.date) + ": " + r.sareeName + " - *" + r.qty + " Pcs* (-₹" + r.damageAmt + ")\n";
        });
    }

    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "📦 *SAREE PCS KA HISAB:*\n";
    if (c.closingPendingSaree > 0) text += "➕ Pichli Baki Saree: *" + c.closingPendingSaree + " Pcs*\n";
    text += "🔴 Kul Gayi: *" + c.totRedQty + " Pcs*\n";
    text += "🟢 Kul Wapas Aayi: *" + c.totGreenQty + " Pcs*\n";
    if (c.totDmgQty > 0) text += "⚠️ Damage Hui: *" + c.totDmgQty + " Pcs*\n";
    text += "-------------------------------------\n";
    text += "🟠 *ABHI BAKI SAREE:* *" + c.pendingSaree + " Pcs*\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "💰 *MAZDOORI & RUPAYE HISAB:*\n";
    text += "🟢 Kul Mazdoori: *₹ " + c.totGreenAmt.toFixed(2) + "*\n";
    if (c.closingBakiAmt !== 0) text += "➕ Pichla Baki: *+₹ " + c.closingBakiAmt.toFixed(2) + "*\n";
    if (c.totDmgAmt > 0) text += "⚠️ Damage Katauti: *-₹ " + c.totDmgAmt.toFixed(2) + "*\n";
    text += "➖ Paid (Diya): *-₹ " + c.totPaid.toFixed(2) + "*\n";
    text += "-------------------------------------\n";
    text += "🔴 *FINAL BAKI RUPAYE:* *₹ " + c.remBakiAmt.toFixed(2) + "*\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "_Simplicity ERP • Developed by Farhan Jawed_";

    // Direct WhatsApp: Worker number or Client account mobile
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
