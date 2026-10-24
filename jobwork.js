/* ========================================================
   SIMPLICITY ERP - JOB WORK MODULE (CUTTING & CALENDER)
   File 7 • Developed by Farhan Jawed
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
    switchJobWorkTab(currentJobWorkTab);
}

function switchJobWorkTab(tab) {
    currentJobWorkTab = tab;
    var btnC = document.getElementById("jw-tab-btn-cutting");
    var btnCal = document.getElementById("jw-tab-btn-calender");

    if (btnC && btnCal) {
        if (tab === "cutting") {
            btnC.classList.add("active");
            btnCal.classList.remove("active");
        } else {
            btnCal.classList.add("active");
            btnC.classList.remove("active");
        }
    }

    var titleEl = document.getElementById("jw-module-title");
    if (titleEl) {
        titleEl.textContent = (tab === "cutting") ? "✂️ Booti Cutting Khata Master" : "🎛️ Calender & Jhalar Khata Master";
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
    document.getElementById("jw-worker-mobile").value = "";
    document.getElementById("jw-worker-date").value = getTodayDate();
    document.getElementById("jw-worker-save-btn").textContent = "Save Worker";
    setDisplay("jw-worker-cancel-btn", "none");
}

function saveNewJobWorker() {
    var editId = document.getElementById("jw-worker-edit-id").value;
    var n = (document.getElementById("jw-worker-name").value || "").trim().toUpperCase();
    var type = document.getElementById("jw-worker-type").value || currentJobWorkTab;
    var m = (document.getElementById("jw-worker-mobile").value || "").trim();
    var d = document.getElementById("jw-worker-date").value || getTodayDate();

    if (!n) return alert("Worker ka naam zaroori hai!");

    var list = getJobWorkers();

    if (editId) {
        var it = list.find(function(x) { return String(x.id) === String(editId); });
        if (it) {
            it.name = n;
            it.type = type;
            it.mobile = m;
            it.date = d;
        }
    } else {
        list.push({
            id: "jw_" + Date.now(),
            name: n,
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

// ================= 2. WORKER HISAB & PENDING SUMMARY =================

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

function calculateJobWorkSheetTotals(sheet) {
    var def = {
        totDiya: 0,
        totAaya: 0,
        totDamage: 0,
        pendingSaree: 0,
        closingPendingSaree: 0,
        totMazdoori: 0,
        totDamageAmt: 0,
        totPaid: 0,
        closingBakiAmt: 0,
        remBakiAmt: 0
    };

    if (!sheet || typeof sheet !== "object") return def;
    var rows = safeArray(sheet.rows);

    var diya = 0, aaya = 0, dmgPcs = 0, dmgAmt = 0, paid = 0, mazdoori = 0;

    rows.forEach(function(r) {
        if (!r) return;
        var rDiya = Number(r.pcsDiya) || 0;
        var rAaya = Number(r.pcsAaya) || 0;
        var rDmg = Number(r.damagePcs) || 0;
        var rRate = Number(r.rate) || 0;
        var rDmgAmt = Number(r.damageAmt) || 0;
        var rPaid = Number(r.paid) || 0;

        diya += rDiya;
        aaya += rAaya;
        dmgPcs += rDmg;
        dmgAmt += rDmgAmt;
        paid += rPaid;
        mazdoori += (rAaya * rRate);
    });

    var pichliSaree = Number(sheet.closingPendingSaree) || 0;
    var pichlaBakiAmt = Number(sheet.closingBakiAmt) || 0;

    // Baki Saree = (Pichli Saree + Diya) - (Aaya + Damage)
    var pendingSaree = Math.max(0, (pichliSaree + diya) - (aaya + dmgPcs));

    // Final Baki = (Mazdoori + Pichla Baki) - (Damage Katauti + Paid)
    var remBakiAmt = (mazdoori + pichlaBakiAmt) - (dmgAmt + paid);

    return {
        totDiya: diya,
        totAaya: aaya,
        totDamage: dmgPcs,
        pendingSaree: pendingSaree,
        closingPendingSaree: pichliSaree,
        totMazdoori: mazdoori,
        totDamageAmt: dmgAmt,
        totPaid: paid,
        closingBakiAmt: pichlaBakiAmt,
        remBakiAmt: remBakiAmt
    };
}

function getJobWorkerOverallSummary(workerId) {
    var sheets = getJobWorkerSheets(workerId);
    if (!sheets || !sheets.length) {
        return { totDiya: 0, totAaya: 0, totDamage: 0, pendingSaree: 0, remBakiAmt: 0 };
    }

    var totalDiya = 0, totalAaya = 0, totalDamage = 0;

    sheets.forEach(function(sh) {
        if (!sh) return;
        var c = calculateJobWorkSheetTotals(sh);
        totalDiya += c.totDiya;
        totalAaya += c.totAaya;
        totalDamage += c.totDamage;
    });

    var latestSheet = sheets[sheets.length - 1];
    var latestCalc = calculateJobWorkSheetTotals(latestSheet);

    return {
        totDiya: totalDiya,
        totAaya: totalAaya,
        totDamage: totalDamage,
        pendingSaree: latestCalc.pendingSaree,
        remBakiAmt: latestCalc.remBakiAmt
    };
}

// ================= 3. RENDER WORKERS TABLE =================

function renderJobWorkTable() {
    var tbody = document.getElementById("jw-workers-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var allWorkers = getJobWorkers();
    var filtered = allWorkers.filter(function(w) {
        return w && (w.type || "cutting") === currentJobWorkTab;
    });

    var overallDiya = 0, overallAaya = 0, overallPending = 0, overallBakiAmt = 0;

    if (!filtered.length) {
        tbody.innerHTML = "<tr><td colspan='8' style='text-align:center; padding:20px; color:#888;'>Koi Worker nahi mila. Naya Worker jodein.</td></tr>";
        updateJobWorkSummaryCards(0, 0, 0, 0);
        return;
    }

    filtered.forEach(function(w, idx) {
        var sum = getJobWorkerOverallSummary(w.id);
        overallDiya += sum.totDiya;
        overallAaya += sum.totAaya;
        overallPending += sum.pendingSaree;
        overallBakiAmt += sum.remBakiAmt;

        var pendingBadge = (sum.pendingSaree > 0)
            ? "<span class='badge-red' style='font-size:11px; font-weight:800;'>⏳ " + sum.pendingSaree + " Pcs Baki</span>"
            : "<span class='badge-green' style='font-size:11px;'>🟢 Clear (0 Baki)</span>";

        tbody.innerHTML += "<tr>" +
            "<td>" + (idx + 1) + "</td>" +
            "<td><strong>" + w.name + "</strong></td>" +
            "<td>" + (w.mobile || "-") + "</td>" +
            "<td><span class='badge-blue'>+" + sum.totDiya + " Pcs</span></td>" +
            "<td><span class='badge-green'>+" + sum.totAaya + " Pcs</span></td>" +
            "<td>" + pendingBadge + "</td>" +
            "<td><strong style='color:#dc2626;'>₹ " + sum.remBakiAmt.toFixed(2) + "</strong></td>" +
            "<td style='text-align:center;'>" +
                "<button class='sheet-btn' onclick='openJobWorkerSheet(\"" + w.id + "\")'>📊 Sheet Khata</button> " +
                "<button class='edit-btn' onclick='editJobWorker(\"" + w.id + "\")'>✏️</button> " +
                "<button class='delete-btn' onclick='deleteJobWorker(\"" + w.id + "\")'>🗑️</button>" +
            "</td>" +
        "</tr>";
    });

    updateJobWorkSummaryCards(overallDiya, overallAaya, overallPending, overallBakiAmt);
}

function updateJobWorkSummaryCards(diya, aaya, pending, bakiAmt) {
    var setEl = function(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    setEl("jw-sum-diya", diya + " Pcs");
    setEl("jw-sum-aaya", aaya + " Pcs");
    setEl("jw-sum-pending", pending + " Pcs");
    setEl("jw-sum-baki-amt", "₹ " + bakiAmt.toFixed(2));
}

function editJobWorker(id) {
    var w = getJobWorkers().find(function(x) { return String(x.id) === String(id); });
    if (!w) return;
    document.getElementById("jw-worker-edit-id").value = w.id;
    document.getElementById("jw-worker-name").value = w.name;
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

// ================= 4. MONTHLY KHATA SHEET CONTROLLER =================

function openJobWorkerSheet(workerId) {
    var w = getJobWorkers().find(function(x) { return String(x.id) === String(workerId); });
    if (!w) return alert("Worker nahi mila!");

    activeJobWorkerId = w.id;
    var typeTitle = (w.type === "calender") ? "Calender / Jhalar" : "Booti Cutting";
    document.getElementById("jw-sheet-banner-name").textContent = w.name + " (" + typeTitle + " Khata)";
    document.getElementById("jw-line-date").value = getTodayDate();

    populateJobWorkSareeDatalist();

    setDisplay("jobwork-list-view", "none");
    setDisplay("jobwork-sheet-view", "block");

    var sheets = getJobWorkerSheets(activeJobWorkerId);
    if (!sheets || !sheets.length) {
        sheets = [{
            id: "jw_sh_" + Date.now(),
            title: "Month 1 (" + getTodayDate().substring(0, 7) + ")",
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
    setDisplay("jobwork-sheet-view", "none");
    setDisplay("jobwork-list-view", "block");
    renderJobWorkTable();
}

function populateJobWorkSareeDatalist() {
    var dl = document.getElementById("jw-sheet-saree-dl");
    if (!dl) return;
    dl.innerHTML = "";
    var sStock = getStore("saree_stock");
    sStock.forEach(function(s) {
        if (s && s.name) {
            dl.innerHTML += "<option value='" + s.name + " (Stock: " + (s.pcs || 0) + ")'>";
        }
    });
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
    var d = new Date();
    d.setMonth(d.getMonth() + (sheets.length));
    var monthName = "Month " + nextMonthNum + " (" + getTodayDate().substring(0, 7) + ")";

    var newS = {
        id: "jw_sh_" + Date.now(),
        title: monthName,
        closingPendingSaree: calc.pendingSaree,
        closingBakiAmt: Number(calc.remBakiAmt.toFixed(2)),
        rows: []
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

    sh.rows = safeArray(sh.rows);
    document.getElementById("jw-sheet-active-badge").textContent = sh.title;

    var elPichliSaree = document.getElementById("jw-pichli-saree-input");
    var elPichlaBaki = document.getElementById("jw-pichla-baki-input");

    if (elPichliSaree) elPichliSaree.value = sh.closingPendingSaree || 0;
    if (elPichlaBaki) elPichlaBaki.value = sh.closingBakiAmt || 0;

    renderJobWorkSheetRows(sh);
}

function saveJobWorkSheetConfig() {
    if (!activeJobWorkerId) return;
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;

    sh.closingPendingSaree = parseInt(document.getElementById("jw-pichli-saree-input").value) || 0;
    sh.closingBakiAmt = parseFloat(document.getElementById("jw-pichla-baki-input").value) || 0;

    saveJobWorkerSheets(activeJobWorkerId, sheets);
    renderJobWorkSheetRows(sh);
}

// ================= 5. LINE ENTRY & STOCK SYNC =================

function addJobWorkLineRow() {
    if (!activeJobWorkerId) return;

    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;

    var worker = getJobWorkers().find(function(x) { return String(x.id) === String(activeJobWorkerId); });
    var workerName = worker ? worker.name : "Worker";
    var workerType = worker ? worker.type : "cutting";
    var typeTitle = (workerType === "calender") ? "Calender" : "Cutting";

    var date = document.getElementById("jw-line-date").value || getTodayDate();
    var rawSaree = (document.getElementById("jw-line-saree-name").value || "").trim();
    var sareeName = rawSaree.split(" (Stock:")[0].trim();

    var pcsDiya = parseInt(document.getElementById("jw-line-diya").value) || 0;
    var pcsAaya = parseInt(document.getElementById("jw-line-aaya").value) || 0;
    var rate = parseFloat(document.getElementById("jw-line-rate").value) || 0;
    var dmgPcs = parseInt(document.getElementById("jw-line-dmg-pcs").value) || 0;
    var dmgAmt = parseFloat(document.getElementById("jw-line-dmg-amt").value) || 0;
    var paid = parseFloat(document.getElementById("jw-line-paid").value) || 0;
    var note = (document.getElementById("jw-line-note").value || "").trim();

    if (!sareeName && pcsDiya === 0 && pcsAaya === 0 && paid === 0) {
        return alert("Kripya Saree ka naam, Diya, Aaya ya Paid bharein!");
    }

    var row = {
        id: "jw_row_" + Date.now(),
        date: date,
        sareeName: sareeName || "-",
        pcsDiya: pcsDiya,
        pcsAaya: pcsAaya,
        rate: rate,
        damagePcs: dmgPcs,
        damageAmt: dmgAmt,
        paid: paid,
        note: note
    };

    sh.rows = safeArray(sh.rows);
    sh.rows.push(row);
    saveJobWorkerSheets(activeJobWorkerId, sheets);

    // Saree Stock Auto Deduct (Agar Diya gaya hai)
    if (pcsDiya > 0 && sareeName && sareeName !== "-") {
        var sStock = getStore("saree_stock");
        var sItem = sStock.find(function(s) {
            return s && s.name && s.name.toLowerCase() === sareeName.toLowerCase();
        });
        if (sItem) {
            sItem.pcs = Math.max(0, (Number(sItem.pcs) || 0) - pcsDiya);
            setStore("saree_stock", sStock);

            var sH = getStore("saree_history");
            sH.push({
                id: Date.now(),
                date: date,
                name: sareeName,
                kariger: workerName,
                type: "Out (" + typeTitle + ")",
                pcs: pcsDiya,
                note: workerName + " (" + typeTitle + " ke liye diya)"
            });
            setStore("saree_history", sH);
        }
    }

    // Form Reset
    document.getElementById("jw-line-saree-name").value = "";
    document.getElementById("jw-line-diya").value = "";
    document.getElementById("jw-line-aaya").value = "";
    document.getElementById("jw-line-rate").value = "";
    document.getElementById("jw-line-dmg-pcs").value = "";
    document.getElementById("jw-line-dmg-amt").value = "";
    document.getElementById("jw-line-paid").value = "";
    document.getElementById("jw-line-note").value = "";

    renderJobWorkSheetRows(sh);
    populateJobWorkSareeDatalist();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Entry jud gayi aur hisab live update ho gaya!");
}

function deleteJobWorkLineRow(idx) {
    if (!confirm("Kya aap is entry ko delete karna chahte hain?")) return;

    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;

    sh.rows = safeArray(sh.rows);
    var r = sh.rows[idx];

    // Stock reverse agar Diya tha
    if (r && r.pcsDiya > 0 && r.sareeName && r.sareeName !== "-") {
        var sStock = getStore("saree_stock");
        var sItem = sStock.find(function(s) {
            return s && s.name && s.name.toLowerCase() === r.sareeName.toLowerCase();
        });
        if (sItem) {
            sItem.pcs = (Number(sItem.pcs) || 0) + Number(r.pcsDiya);
            setStore("saree_stock", sStock);
        }
    }

    sh.rows.splice(idx, 1);
    saveJobWorkerSheets(activeJobWorkerId, sheets);

    renderJobWorkSheetRows(sh);
    populateJobWorkSareeDatalist();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function renderJobWorkSheetRows(sheet) {
    var tbody = document.getElementById("jw-sheet-rows-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var rows = safeArray(sheet.rows);

    if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan='10' style='text-align:center; padding:15px; color:#888;'>Is Mahine me abhi koi entry nahi hui hai.</td></tr>";
    } else {
        rows.forEach(function(r, idx) {
            if (!r) return;
            var rDiya = Number(r.pcsDiya) || 0;
            var rAaya = Number(r.pcsAaya) || 0;
            var rRate = Number(r.rate) || 0;
            var rMaz = rAaya * rRate;

            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(r.date) + "</td>" +
                "<td><strong>" + (r.sareeName || "-") + "</strong></td>" +
                "<td>" + (rDiya > 0 ? ("<span style='color:#2563eb; font-weight:bold;'>+" + rDiya + "</span>") : "-") + "</td>" +
                "<td>" + (rAaya > 0 ? ("<span style='color:#059669; font-weight:bold;'>+" + rAaya + "</span>") : "-") + "</td>" +
                "<td>₹ " + rRate + "</td>" +
                "<td><strong style='color:#059669;'>₹ " + rMaz.toFixed(2) + "</strong></td>" +
                "<td>" + (r.damagePcs > 0 ? ("<span style='color:#dc2626; font-weight:bold;'>" + r.damagePcs + " (-₹" + r.damageAmt + ")</span>") : "-") + "</td>" +
                "<td>" + (r.paid > 0 ? ("<span style='color:#059669; font-weight:bold;'>₹ " + r.paid + "</span>") : "-") + "</td>" +
                "<td>" + (r.note || "-") + "</td>" +
                "<td><button class='delete-btn' onclick='deleteJobWorkLineRow(" + idx + ")'>🗑️</button></td>" +
            "</tr>";
        });
    }

    var c = calculateJobWorkSheetTotals(sheet);

    var setT = function(id, v) {
        var el = document.getElementById(id);
        if (el) el.textContent = v;
    };

    setT("jw-tot-diya", c.totDiya);
    setT("jw-tot-aaya", c.totAaya);
    setT("jw-tot-mazdoori", "₹ " + c.totMazdoori.toFixed(2));
    setT("jw-tot-damage", c.totDamage + " (-₹ " + c.totDamageAmt + ")");
    setT("jw-tot-paid", "₹ " + c.totPaid);

    setT("jw-calc-pichli-saree", c.closingPendingSaree + " Pcs");
    setT("jw-calc-tot-diya", "+ " + c.totDiya + " Pcs");
    setT("jw-calc-tot-aaya", "- " + c.totAaya + " Pcs");
    setT("jw-calc-tot-damage", "- " + c.totDamage + " Pcs");
    setT("jw-calc-pending-saree", c.pendingSaree + " Pcs Baki");

    setT("jw-calc-tot-mazdoori", "₹ " + c.totMazdoori.toFixed(2));
    setT("jw-calc-pichla-baki", "+ ₹ " + c.closingBakiAmt.toFixed(2));
    setT("jw-calc-damage-katauti", "- ₹ " + c.totDamageAmt.toFixed(2));
    setT("jw-calc-paid", "- ₹ " + c.totPaid.toFixed(2));
    setT("jw-calc-final-baki", "₹ " + c.remBakiAmt.toFixed(2));
}

// ================= 6. WHATSAPP PARCHI =================

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
    text += "📋 *ROZANA ENTRY VIVRAN:*\n\n";

    var rows = safeArray(sheet.rows);

    if (!rows.length) {
        text += "_Is Mahine me abhi koi line entry nahi hai_\n";
    } else {
        rows.forEach(function(r, idx) {
            if (!r) return;
            text += (idx + 1) + "️⃣ *" + formatDateDisplay(r.date) + " - " + r.sareeName + "*\n";
            if (Number(r.pcsDiya) > 0) text += "   • Diya: " + r.pcsDiya + " Pcs\n";
            if (Number(r.pcsAaya) > 0) text += "   • Wapas Laya: " + r.pcsAaya + " Pcs (@ ₹" + r.rate + " = ₹" + (r.pcsAaya * r.rate) + ")\n";
            if (Number(r.damagePcs) > 0) text += "   • ⚠️ Damage Kati: " + r.damagePcs + " Pcs (-₹" + r.damageAmt + ")\n";
            if (Number(r.paid) > 0) text += "   • Paid Diya: ₹ " + r.paid + "\n";
            text += "\n";
        });
    }

    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "📦 *SAREE STOCK HISAB:*\n";
    if (c.closingPendingSaree > 0) text += "➕ Pichli Baki Saree: *" + c.closingPendingSaree + " Pcs*\n";
    text += "📤 Kul Diya: *" + c.totDiya + " Pcs*\n";
    text += "📥 Kul Wapas Aaya: *" + c.totAaya + " Pcs*\n";
    if (c.totDamage > 0) text += "⚠️ Damage Hui: *" + c.totDamage + " Pcs*\n";
    text += "-------------------------------------\n";
    text += "🟠 *ABHI BAKI SAREE:* *" + c.pendingSaree + " Pcs*\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "💰 *MAZDOORI & RUPAYE HISAB:*\n";
    text += "💵 Kul Mazdoori: *₹ " + c.totMazdoori.toFixed(2) + "*\n";
    if (c.closingBakiAmt !== 0) text += "➕ Pichla Baki: *+₹ " + c.closingBakiAmt.toFixed(2) + "*\n";
    if (c.totDamageAmt > 0) text += "⚠️ Damage Katauti: *-₹ " + c.totDamageAmt.toFixed(2) + "*\n";
    text += "➖ Paid (Diya): *-₹ " + c.totPaid.toFixed(2) + "*\n";
    text += "-------------------------------------\n";
    text += "🔴 *FINAL BAKI RUPAYE:* *₹ " + c.remBakiAmt.toFixed(2) + "*\n";
    text += "━━━━━━━━━━━━━━━━━━━━━\n";
    text += "_Simplicity ERP • Developed by Farhan Jawed_";

    // Direct WhatsApp: Agar worker ka mobile hai toh uspe, warna account mobile pe
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
