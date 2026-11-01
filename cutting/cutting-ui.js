/* ========================================================
   SIMPLICITY ERP - BOOTI CUTTING UI & SHEET ENGINE
   File: cutting/cutting-ui.js • Developed by Farhan Jawed
   (Worker Directory, Khata Sheet, WhatsApp Tagada & Modals)
======================================================== */

var activeCuttingWorkerId = null;
var activeCuttingSheetIndex = 0;

function openCuttingModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("jobwork-section", "block");
    setDisplay("jw-hub-view", "none");
    setDisplay("jw-workers-view", "block");

    var titleEl = document.getElementById("jw-workers-title");
    if (titleEl) titleEl.textContent = "✂️ Booti Cutting Workers List";
    renderCuttingWorkersTable();
}

// 1. WORKERS DIRECTORY TABLE
function renderCuttingWorkersTable() {
    var tbody = document.getElementById("jw-workers-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var list = getCuttingWorkers();

    var txt = (document.getElementById("jw-search-worker-input") && document.getElementById("jw-search-worker-input").value || "").toLowerCase().trim();
    if (txt) {
        list = list.filter(function(w) {
            return (String(w.name || "") + " " + String(w.address || "") + " " + String(w.mobile || "")).toLowerCase().indexOf(txt) !== -1;
        });
    }

    var minDays = parseInt(document.getElementById("jw-absent-filter") && document.getElementById("jw-absent-filter").value || 0, 10) || 0;
    if (minDays > 0) {
        list = list.filter(function(w) {
            return getCuttingWorkerAbsentInfo(w.id).daysAbsent >= minDays;
        });
    }

    var totGayi = 0, totAayi = 0, totDmg = 0;
    getCuttingWorkers().forEach(function(w) {
        var sum = getCuttingWorkerOverallSummary(w.id);
        totGayi += sum.totGayi;
        totAayi += sum.totAayi;
        totDmg += sum.totDmg;
    });

    setElementText("jw-stat-total-gayi", totGayi + " Pcs");
    setElementText("jw-stat-total-aayi", totAayi + " Pcs");
    setElementText("jw-stat-total-damage", totDmg + " Pcs");

    if (!list.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Koi Cutting Kariger nahi mila.</td></tr>";
        return;
    }

    list.forEach(function(w) {
        var act = getCuttingWorkerAbsentInfo(w.id);
        var statusBadge = "";
        if (act.daysAbsent >= 30) {
            statusBadge = "<span class='badge-red' style='font-size:11px;'>⚠️ " + act.daysAbsent + " Din se gayab</span>";
        } else if (act.daysAbsent >= 15) {
            statusBadge = "<span style='background:#fff7ed; color:#ea580c; border:1px solid #fed7aa; padding:2px 6px; border-radius:20px; font-weight:700; font-size:11px;'>🟠 " + act.daysAbsent + " Din hue</span>";
        } else {
            statusBadge = "<span class='badge-green' style='font-size:11px;'>🟢 Active</span>";
        }

        var tagadaBtn = "";
        if (act.daysAbsent >= 15) {
            tagadaBtn = " <button class='quick-btn btn-out' style='font-size:11px;' onclick='sendCuttingTagadaWhatsApp(\"" + w.id + "\", " + act.daysAbsent + ")'>📲 तगादा</button>";
        }

        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(w.date) + "</td>" +
            "<td><strong>" + w.name + "</strong></td>" +
            "<td>" + (w.address || "-") + "</td>" +
            "<td>" + (w.mobile || "-") + "</td>" +
            "<td>" + statusBadge + "</td>" +
            "<td style='text-align:center;'>" +
                "<button class='sheet-btn' onclick='openCuttingSheet(\"" + w.id + "\")'>📊 Khata Sheet</button>" +
                tagadaBtn +
                " <button class='edit-btn' onclick='editCuttingWorker(\"" + w.id + "\")'>✏️</button>" +
                " <button class='delete-btn' onclick='deleteCuttingWorker(\"" + w.id + "\")'>🗑️</button>" +
            "</td>" +
        "</tr>";
    });
}

// 2. ADD / EDIT / DELETE CUTTING WORKER
function toggleCuttingWorkerForm() {
    var f = document.getElementById("add-jw-worker-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    document.getElementById("jw-worker-date").value = getTodayDate();
    cancelCuttingWorkerEdit();
}

function cancelCuttingWorkerEdit() {
    var eId = document.getElementById("jw-worker-edit-id");
    if (eId) eId.value = "";
    document.getElementById("jw-worker-name").value = "";
    document.getElementById("jw-worker-address").value = "";
    document.getElementById("jw-worker-mobile").value = "";
    document.getElementById("jw-worker-date").value = getTodayDate();
    var sBtn = document.getElementById("jw-worker-save-btn");
    if (sBtn) sBtn.textContent = "Save Kariger";
}

function saveCuttingWorker() {
    var editId = (document.getElementById("jw-worker-edit-id") && document.getElementById("jw-worker-edit-id").value) || "";
    var n = (document.getElementById("jw-worker-name").value || "").trim().toUpperCase();
    var addr = (document.getElementById("jw-worker-address").value || "").trim();
    var m = (document.getElementById("jw-worker-mobile").value || "").trim();
    var d = document.getElementById("jw-worker-date").value || getTodayDate();

    if (!n) return alert("Kariger ka naam zaroori hai!");

    var all = safeArray(getStore("jobwork_workers"));
    if (editId) {
        var it = all.find(function(x) { return String(x.id) === String(editId); });
        if (it) {
            it.name = n; it.address = addr; it.mobile = m; it.date = d;
        }
    } else {
        all.push({
            id: "jw_cut_" + Date.now(),
            type: "cutting",
            name: n, address: addr, mobile: m, date: d
        });
    }

    setStore("jobwork_workers", all);
    toggleCuttingWorkerForm();
    renderCuttingWorkersTable();
    if (typeof updateJobWorkHubBadges === "function") updateJobWorkHubBadges();
    alert("✅ Cutting Kariger save ho gaya!");
}

function editCuttingWorker(id) {
    var w = getCuttingWorkers().find(function(x) { return String(x.id) === String(id); });
    if (!w) return;
    var f = document.getElementById("add-jw-worker-form");
    if (f) f.style.display = "block";

    document.getElementById("jw-worker-edit-id").value = w.id;
    document.getElementById("jw-worker-name").value = w.name;
    document.getElementById("jw-worker-address").value = w.address || "";
    document.getElementById("jw-worker-mobile").value = w.mobile || "";
    document.getElementById("jw-worker-date").value = w.date || getTodayDate();
    var sBtn = document.getElementById("jw-worker-save-btn");
    if (sBtn) sBtn.textContent = "Update Kariger";
}

function deleteCuttingWorker(id) {
    if (!confirm("Kya aap is Cutting Kariger ko delete karna chahte hain?")) return;
    var all = safeArray(getStore("jobwork_workers")).filter(function(x) { return String(x.id) !== String(id); });
    setStore("jobwork_workers", all);
    renderCuttingWorkersTable();
    if (typeof updateJobWorkHubBadges === "function") updateJobWorkHubBadges();
}

// 3. KHATA SHEET CONTROLLER
function openCuttingSheet(id) {
    var w = getCuttingWorkers().find(function(x) { return String(x.id) === String(id); });
    if (!w) return alert("Kariger nahi mila!");

    activeCuttingWorkerId = w.id;
    activeCuttingSheetIndex = 0;

    setDisplay("jw-workers-view", "none");
    setDisplay("jw-sheet-view", "block");

    var banner = document.getElementById("jw-sheet-banner-name");
    if (banner) banner.textContent = w.name + " (Booti Cutting Khata)";

    loadCurrentCuttingSheetData();
}

function loadCurrentCuttingSheetData() {
    if (!activeCuttingWorkerId) return;
    var sheets = safeArray(getStore("jobwork_sheets_" + activeCuttingWorkerId));
    if (!sheets.length) {
        sheets = [{
            id: "jws_1",
            title: "Khata 1",
            closingPendingSaree: 0,
            closingBakiAmt: 0,
            rows: []
        }];
        setStore("jobwork_sheets_" + activeCuttingWorkerId, sheets);
    }

    if (activeCuttingSheetIndex >= sheets.length) activeCuttingSheetIndex = sheets.length - 1;
    var sh = sheets[activeCuttingSheetIndex];

    var tbody = document.getElementById("jw-sheet-table-body");
    if (tbody) {
        tbody.innerHTML = "";
        safeArray(sh.rows).forEach(function(r) {
            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(r.date) + "</td>" +
                "<td>" + (r.sareeName || "-") + "</td>" +
                "<td style='color:#dc2626; font-weight:700;'>-" + (r.gayiQty || 0) + "</td>" +
                "<td style='color:#059669; font-weight:700;'>+" + (r.aayiQty || 0) + "</td>" +
                "<td>" + (r.damagePcs || 0) + "</td>" +
                "<td>" + (r.note || "-") + "</td>" +
                "<td style='text-align:center;'><button class='delete-btn' onclick='deleteCuttingRow(\"" + r.id + "\")'>🗑️</button></td>" +
            "</tr>";
        });
    }

    var c = calculateCuttingSheetTotals(sh);
    setElementText("jw-calc-tot-gayi", c.totGayiQty + " Pcs");
    setElementText("jw-calc-tot-aayi", c.totAayiQty + " Pcs");
    setElementText("jw-calc-tot-damage", c.totDamagePcs + " Pcs");
    setElementText("jw-calc-pending-saree", c.pendingSaree + " Pcs");
}

function deleteCuttingRow(rowId) {
    if (!confirm("Kya aap is row ko delete karna chahte hain?")) return;
    var sheets = safeArray(getStore("jobwork_sheets_" + activeCuttingWorkerId));
    var sh = sheets[activeCuttingSheetIndex];
    sh.rows = safeArray(sh.rows).filter(function(r) { return String(r.id) !== String(rowId); });
    setStore("jobwork_sheets_" + activeCuttingWorkerId, sheets);
    loadCurrentCuttingSheetData();
}

// 4. WHATSAPP TAGADA
function sendCuttingTagadaWhatsApp(workerId, days) {
    var w = getCuttingWorkers().find(function(x) { return String(x.id) === String(workerId); });
    if (!w) return;

    var sum = getCuttingWorkerOverallSummary(workerId);
    var mob = (w.mobile || "").trim().replace(/[^0-9]/g, "");
    if (!mob || mob.length < 10) {
        mob = prompt("Kariger ka 10-digit WhatsApp number:", mob);
        if (!mob || !mob.trim()) return;
        mob = mob.trim().replace(/[^0-9]/g, "");
    }
    if (mob.length === 10) mob = "91" + mob;

    var msg = "✂️ *SIMPLICITY KARKHANA ERP*\n" +
              "━━━━━━━━━━━━━━━━━━\n" +
              "सलाम " + w.name + " भाई,\n\n" +
              "कारखाने से बूटी कटिंग की साड़ी ले जाए आपको *" + days + " दिन* हो चुके हैं।\n" +
              "📦 आपके पास बकाया साड़ी: *" + sum.pendingSaree + " Pcs*\n\n" +
              "कृपया जल्द से जल्द कारखाने आकर तैयार साड़ी जमा कराएं।\n" +
              "━━━━━━━━━━━━━━━━━━\n" +
              "_Simplicity Karkhana ERP_";

    window.open("https://wa.me/" + mob + "?text=" + encodeURIComponent(msg), "_blank");
}
