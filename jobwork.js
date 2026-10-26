/* ========================================================
   SIMPLICITY ERP - JOB WORK (CUTTING, CALENDER & DUKAN BHEJA)
   File 7 of 7 • Developed by Farhan Jawed (Cutting & Calender Separated)
======================================================== */

var currentJobWorkMode = "hub"; // "hub", "cutting", "calender", "dukan"
var activeJobWorkerId = null;
var activeJobSheetId = null;

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
    var catTitle = (boxCategory === "gayi") ? "Saree Gayi (Diya)" : (boxCategory === "aayi" ? "Saree Wapas Aayi" : "Damage Saree");

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
                        type: "Gayi (Diya)",
                        qty: Number(r.gayiQty) + " Pcs (@ ₹" + (r.gayiRate || 0) + ")",
                        kariger: w.name + " (" + sh.title + ")"
                    });
                } else if (boxCategory === "aayi" && Number(r.aayiQty) > 0) {
                    entries.push({
                        date: r.date,
                        type: "Wapas Aayi (" + typeTitle + ")",
                        qty: Number(r.aayiQty) + " Pcs (@ ₹" + (r.aayiRate || 0) + ")",
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

    var pendingSaree = Math.max(0, (pichliSaree + gayiQ) - (aayiQ + dmgPcs));
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

    var dToday = getTodayDate();
    if (document.getElementById("jw-form-diya-date")) document.getElementById("jw-form-diya-date").value = dToday;
    if (document.getElementById("jw-form-aayi-date")) document.getElementById("jw-form-aayi-date").value = dToday;

    var stockSelectRow = document.getElementById("jw-calender-stock-source-wrap");
    var stockColTh = document.getElementById("jw-th-stock-source");
    if (stockSelectRow) stockSelectRow.style.display = "none";
    if (stockColTh) stockColTh.style.display = "none";

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
    alert("✅ Naya Mahina jud gaya! Pichla hisab carry-forward ho gaya.");
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

// ================= 5. ADD, EDIT & DELETE ROW (CUTTING & CALENDER SEPARATED) =================

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
    var diyaQty = parseInt(document.getElementById("jw-form-diya-qty").value) || 0;
    var diyaRate = parseFloat(document.getElementById("jw-form-diya-rate").value) || 0;

    // Line 2: Saree Wapas Aayi
    var aDate = document.getElementById("jw-form-aayi-date").value || getTodayDate();
    var aayiQty = parseInt(document.getElementById("jw-form-aayi-qty").value) || 0;
    var aayiRate = parseFloat(document.getElementById("jw-form-aayi-rate").value) || 0;

    // Line 3: Payment & Damage
    var payment = parseFloat(document.getElementById("jw-form-payment").value) || 0;
    var damagePcs = parseInt(document.getElementById("jw-form-damage-pcs").value) || 0;
    var damageAmt = parseFloat(document.getElementById("jw-form-damage-amt").value) || 0;

    if (diyaQty === 0 && aayiQty === 0 && payment === 0 && damageAmt === 0 && damagePcs === 0) {
        return alert("Kripya Saree Diya, Aayi, Payment ya Damage me se koi detail bharein!");
    }

    var rowId = "jwr_" + Date.now();
    var rowDate = (diyaQty > 0) ? dDate : aDate;

    var newRow = {
        id: rowId,
        date: rowDate,
        gayiQty: diyaQty,
        gayiRate: diyaRate,
        aayiQty: aayiQty,
        aayiRate: aayiRate,
        payment: payment,
        damageAmt: damageAmt,
        damagePcs: damagePcs
    };

    sh.rows = safeArray(sh.rows);
    sh.rows.push(newRow);
    saveJobWorkerSheets(activeJobWorkerId, sheets);

    // 1. SAREE DIYA -> MAIN (FRESH) STOCK SE MINUS HOGA
    if (diyaQty > 0) {
        var sStock = safeArray(getStore("saree_stock"));
        if (sStock.length > 0) {
            var rem = diyaQty;
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

        var sH = safeArray(getStore("saree_history"));
        sH.push({
            id: "sh_diya_" + Date.now(),
            refId: rowId,
            date: dDate,
            name: "Fresh Saree (Kachhi)",
            kariger: workerName,
            type: "Out (" + (isCalender ? "Calender" : "Cutting") + ")",
            pcs: diyaQty,
            note: workerName + " (" + (isCalender ? "Calender" : "Cutting") + " me diya)"
        });
        setStore("saree_history", sH);
    }

    // 2. SAREE WAPAS AAYI -> CUTTING YA CALENDER KE ALAG ALAG STOCK ME JUDAGEI
    if (aayiQty > 0) {
        var finishedName = isCalender ? "Calender Finished Saree" : "Cutting Finished Saree";
        var finishedSource = isCalender ? "🎛️ Calender Process" : "✂️ Booti Cutting Process";

        var fStock = safeArray(getStore("finished_saree_stock"));
        var fItem = fStock.find(function(x) { return x && x.name && x.name.toLowerCase() === finishedName.toLowerCase(); });

        if (fItem) {
            fItem.pcs = (Number(fItem.pcs) || 0) + aayiQty;
            fItem.date = aDate;
            fItem.source = finishedSource + " (" + workerName + ")";
        } else {
            fStock.push({
                id: "fin_" + (isCalender ? "cal" : "cut"),
                date: aDate,
                name: finishedName,
                processType: isCalender ? "calender" : "cutting",
                source: finishedSource + " (" + workerName + ")",
                pcs: aayiQty
            });
        }
        setStore("finished_saree_stock", fStock);

        var sH = safeArray(getStore("saree_history"));
        sH.push({
            id: "sh_aayi_" + Date.now(),
            refId: rowId,
            date: aDate,
            name: finishedName,
            kariger: workerName,
            type: "In (Finished - " + (isCalender ? "Calender" : "Cutting") + ")",
            pcs: aayiQty,
            note: workerName + " se tayaar aayi"
        });
        setStore("saree_history", sH);
    }

    // 3. DAMAGE -> LOTT SAREE STOCK ME PLUS HOGA
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

    document.getElementById("jw-form-diya-qty").value = "";
    document.getElementById("jw-form-diya-rate").value = "";
    document.getElementById("jw-form-aayi-qty").value = "";
    document.getElementById("jw-form-aayi-rate").value = "";
    document.getElementById("jw-form-payment").value = "";
    document.getElementById("jw-form-damage-amt").value = "";
    document.getElementById("jw-form-damage-pcs").value = "";

    renderJobWorkSheetTable(sh);
    if (typeof renderSareeTable === "function") renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Line jud gayi! Saree " + (isCalender ? "Calender" : "Cutting") + " Finished Stock me alag se jud gayi!");
}

function deleteJobWorkUnifiedRow(idx) {
    if (!confirm("Kya aap is line entry ko delete karna chahte hain?")) return;

    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;

    sh.rows = safeArray(sh.rows);
    var r = sh.rows[idx];
    if (!r) return;

    var worker = getJobWorkers().find(function(x) { return String(x.id) === String(activeJobWorkerId); });
    var workerName = worker ? worker.name : "";
    var isCalender = (worker && worker.type === "calender");

    // 1. REVERSE MAIN FRESH STOCK
    if (Number(r.gayiQty) > 0) {
        var sStock = safeArray(getStore("saree_stock"));
        if (sStock.length > 0) {
            sStock[0].pcs = (Number(sStock[0].pcs) || 0) + Number(r.gayiQty);
            setStore("saree_stock", sStock);
        }
    }

    // 2. REVERSE FINISHED STOCK (CUTTING YA CALENDER SE ALAG GHATAO)
    if (Number(r.aayiQty) > 0) {
        var finishedName = isCalender ? "Calender Finished Saree" : "Cutting Finished Saree";
        var fStock = safeArray(getStore("finished_saree_stock"));
        var fItem = fStock.find(function(x) { return x && x.name && x.name.toLowerCase() === finishedName.toLowerCase(); });
        if (fItem) {
            fItem.pcs = Math.max(0, (Number(fItem.pcs) || 0) - Number(r.aayiQty));
            setStore("finished_saree_stock", fStock);
        }
    }

    // 3. REVERSE LOTT STOCK
    if (Number(r.damagePcs) > 0) {
        var lottStock = safeArray(getStore("lott_saree_stock"));
        if (lottStock.length > 0) {
            lottStock[0].pcs = Math.max(0, (Number(lottStock[0].pcs) || 0) - Number(r.damagePcs));
            setStore("lott_saree_stock", lottStock);
        }
    }

    // 4. PASSBOOK SE RECORD SAAP
    var sH = safeArray(getStore("saree_history"));
    sH = sH.filter(function(h) {
        if (!h) return false;
        if (r.id && h.refId && String(h.refId) === String(r.id)) return false;
        if (h.kariger === workerName && h.date === r.date && (Number(h.pcs) === Number(r.gayiQty) || Number(h.pcs) === Number(r.aayiQty))) {
            return false;
        }
        return true;
    });
    setStore("saree_history", sH);

    sh.rows.splice(idx, 1);
    saveJobWorkerSheets(activeJobWorkerId, sheets);

    renderJobWorkSheetTable(sh);
    if (typeof renderSareeTable === "function") renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("🗑️ Line delete ho gayi aur hisab theek ho gaya!");
}

function editJobWorkUnifiedRow(idx) {
    var sheets = getJobWorkerSheets(activeJobWorkerId);
    var sh = sheets.find(function(s) { return s && String(s.id) === String(activeJobSheetId); });
    if (!sh) return;

    sh.rows = safeArray(sh.rows);
    var r = sh.rows[idx];
    if (!r) return;

    var worker = getJobWorkers().find(function(x) { return String(x.id) === String(activeJobWorkerId); });
    var isCalender = (worker && worker.type === "calender");

    var oldGQ = Number(r.gayiQty) || 0;
    var oldAQ = Number(r.aayiQty) || 0;
    var oldDmgP = Number(r.damagePcs) || 0;

    var nGQ = prompt("Gayi QTY (Fresh se minus hui):", r.gayiQty);
    if (nGQ === null) return;
    var nGR = prompt("Gayi Ka Rate (₹):", r.gayiRate);
    if (nGR === null) return;
    var nAQ = prompt("Wapas Aayi QTY (" + (isCalender ? "Calender" : "Cutting") + " Finished me jayegi):", r.aayiQty);
    if (nAQ === null) return;
    var nAR = prompt("Aayi Ka Rate (₹):", r.aayiRate);
    if (nAR === null) return;
    var nPay = prompt("Payment Diya (₹):", r.payment);
    if (nPay === null) return;
    var nDmgP = prompt("Damage Saree Pcs:", r.damagePcs);
    if (nDmgP === null) return;
    var nDmgA = prompt("Damage Katuti (₹):", r.damageAmt);
    if (nDmgA === null) return;

    var newGQ = parseInt(nGQ) || 0;
    var newGR = parseFloat(nGR) || 0;
    var newAQ = parseInt(nAQ) || 0;
    var newAR = parseFloat(nAR) || 0;
    var newPay = parseFloat(nPay) || 0;
    var newDmgP = parseInt(nDmgP) || 0;
    var newDmgA = parseFloat(nDmgA) || 0;

    // Fresh Stock Adjust
    var diffGayi = newGQ - oldGQ;
    var sStock = safeArray(getStore("saree_stock"));
    if (sStock.length > 0) {
        sStock[0].pcs = (Number(sStock[0].pcs) || 0) - diffGayi;
        setStore("saree_stock", sStock);
    }

    // Specific Finished Stock Adjust (Cutting ya Calender)
    var diffAayi = newAQ - oldAQ;
    var finishedName = isCalender ? "Calender Finished Saree" : "Cutting Finished Saree";
    var fStock = safeArray(getStore("finished_saree_stock"));
    var fItem = fStock.find(function(x) { return x && x.name && x.name.toLowerCase() === finishedName.toLowerCase(); });
    if (fItem) {
        fItem.pcs = Math.max(0, (Number(fItem.pcs) || 0) + diffAayi);
        setStore("finished_saree_stock", fStock);
    }

    // Damage Adjust
    var diffDmg = newDmgP - oldDmgP;
    if (diffDmg !== 0) {
        var lottStock = safeArray(getStore("lott_saree_stock"));
        if (lottStock.length > 0) {
            lottStock[0].pcs = Math.max(0, (Number(lottStock[0].pcs) || 0) + diffDmg);
            setStore("lott_saree_stock", lottStock);
        }
    }

    // Passbook update
    var sH = safeArray(getStore("saree_history"));
    sH.forEach(function(h) {
        if (h && r.id && String(h.refId) === String(r.id)) {
            if (h.type && h.type.indexOf("Out") !== -1) h.pcs = newGQ;
            if (h.type && h.type.indexOf("In") !== -1) h.pcs = newAQ;
        }
    });
    setStore("saree_history", sH);

    r.gayiQty = newGQ;
    r.gayiRate = newGR;
    r.aayiQty = newAQ;
    r.aayiRate = newAR;
    r.payment = newPay;
    r.damagePcs = newDmgP;
    r.damageAmt = newDmgA;

    saveJobWorkerSheets(activeJobWorkerId, sheets);
    renderJobWorkSheetTable(sh);
    if (typeof renderSareeTable === "function") renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Data live update ho gaya!");
}

// ================= 6. RENDER DRAWING SINGLE TABLE & 4 CARDS =================

function renderJobWorkSheetTable(sh) {
    var tbody = document.getElementById("jw-sheet-rows-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var rows = safeArray(sh.rows);

    if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan='8' style='text-align:center; padding:15px; color:#888;'>Is Mahine me abhi koi entry nahi hui hai. Upar se line jodein.</td></tr>";
    } else {
        rows.forEach(function(r, idx) {
            if (!r) return;
            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(r.date) + "</td>" +
                "<td>" + (r.gayiQty > 0 ? ("<strong style='color:#dc2626;'>-" + r.gayiQty + "</strong>") : "-") + "</td>" +
                "<td>" + (r.gayiRate > 0 ? ("₹ " + r.gayiRate) : "-") + "</td>" +
                "<td>" + (r.aayiQty > 0 ? ("<strong style='color:#059669;'>+" + r.aayiQty + "</strong>") : "-") + "</td>" +
                "<td>" + (r.aayiRate > 0 ? ("₹ " + r.aayiRate) : "-") + "</td>" +
                "<td>" + (r.payment > 0 ? ("<strong style='color:#059669;'>₹ " + r.payment + "</strong>") : "-") + "</td>" +
                "<td>" + (r.damageAmt > 0 ? ("<strong style='color:#dc2626;'>-₹ " + r.damageAmt + (r.damagePcs > 0 ? " (" + r.damagePcs + " Pcs)" : "") + "</strong>") : "-") + "</td>" +
                "<td style='text-align:center;'><button class='edit-btn' onclick='editJobWorkUnifiedRow(" + idx + ")'>✏️</button> <button class='delete-btn' onclick='deleteJobWorkUnifiedRow(" + idx + ")'>🗑️</button></td>" +
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
    setT("jw-card-total-diya-pay", "₹ " + c.totPayment.toFixed(2));
    setT("jw-card-total-lott", c.totDamagePcs + " Pcs (-₹ " + c.totDamageAmt.toFixed(0) + ")");

    setT("jw-calc-baki-saree-display", c.pendingSaree + " Pcs Baki");
    setT("jw-calc-final-baki-amt-display", "₹ " + c.finalBakiAmt.toFixed(2));
}

// ================= 7. 🏪 DUKAN BHEJA (WITH DATE RANGE FILTER) =================

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

// ================= 8. WHATSAPP PARCHI =================

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
            if (Number(r.gayiQty) > 0) text += "   • Diya: " + r.gayiQty + " Pcs\n";
            if (Number(r.aayiQty) > 0) text += "   • Wapas Laya: " + r.aayiQty + " Pcs (@ ₹" + r.aayiRate + " = ₹" + (r.aayiQty * r.aayiRate) + ")\n";
            if (Number(r.damageAmt) > 0) text += "   • ⚠️ Damage Katuti: -₹" + r.damageAmt + "\n";
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
