/* ========================================================
   SIMPLICITY ERP - SAREE STOCK & 4-TAB PIPELINE UI
   File: saree/saree-ui.js • Developed by Farhan Jawed
   (Fresh -> Cutting -> Finished -> Lott + Live Passbook)
======================================================== */

var currentSareeTab = "fresh"; // "fresh", "cutting", "finished", "lott"
var currentSareeKarkhanaFilter = "all";
var currentPassbookSareeKey = "";
var currentPassbookSareeTitle = "";

/**
 * 1. Saree Module kholne ka main function
 */
function openSareeModule() {
    var dView = document.getElementById("dashboard-view");
    if (dView) dView.style.display = "none";

    var sSec = document.getElementById("saree-section");
    if (sSec) sSec.style.display = "block";

    renderSareeKarkhanaTabs();
    switchSareeStockTab(currentSareeTab || "fresh");
}

/**
 * 2. Chaar Buttons / Tabs switch karna (Fresh, Cutting, Finished, Lott)
 */
function switchSareeStockTab(tabName) {
    currentSareeTab = tabName;

    var tabs = ["fresh", "cutting", "finished", "lott"];
    tabs.forEach(function(t) {
        var el = document.getElementById("tab-saree-" + t);
        if (el) {
            if (t === tabName) el.classList.add("active");
            else el.classList.remove("active");
        }
    });

    renderSareeTable();
}

/**
 * 3. Karkhana / Godam Filter Tabs render karna
 */
function renderSareeKarkhanaTabs() {
    var bar = document.getElementById("saree-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";

    var karkhanas = safeArray(getStore("karkhana_list"));
    if (!karkhanas.length) karkhanas = [{ id: "k_main", name: "Main Godown", isDefault: true }];

    var allActive = (currentSareeKarkhanaFilter === "all") ? " active" : "";
    bar.innerHTML += "<button class='sheet-tab" + allActive + "' onclick='switchSareeKarkhanaTab(\"all\")'>👥 Sabhi Godam</button>";

    karkhanas.forEach(function(k) {
        var isActive = (String(currentSareeKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button class='sheet-tab" + isActive + "' onclick='switchSareeKarkhanaTab(\"" + k.id + "\")'>🏭 " + k.name + "</button>";
    });
}

function switchSareeKarkhanaTab(kId) {
    currentSareeKarkhanaFilter = kId;
    renderSareeTable();
}

function filterSaree() {
    renderSareeTable();
}

/**
 * 4. Manual Direct Inward Form Toggle & Save (Agar kabhi seedha godam me saree dalni ho)
 */
function toggleSareeForm() {
    var f = document.getElementById("add-saree-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    var dInp = document.getElementById("saree-date");
    if (dInp) dInp.value = getTodayDate();
}

function saveNewSareeStock() {
    var d = (document.getElementById("saree-date") && document.getElementById("saree-date").value) || getTodayDate();
    var name = (document.getElementById("saree-name") && document.getElementById("saree-name").value || "").trim().toUpperCase();
    var source = (document.getElementById("saree-kariger") && document.getElementById("saree-kariger").value || "").trim().toUpperCase();
    var pcs = parseInt(document.getElementById("saree-pcs") && document.getElementById("saree-pcs").value, 10) || 0;

    if (!name || pcs <= 0) return alert("Saree ka naam aur Sahi Pcs bharein!");

    var history = safeArray(getStore("saree_history"));
    history.push({
        id: "saree_man_" + Date.now(),
        date: d,
        sareeName: name,
        karigerName: source || "Direct Inward",
        kariger: source || "Direct Inward",
        karkhanaId: (currentSareeKarkhanaFilter !== "all") ? currentSareeKarkhanaFilter : "k_main",
        type: currentSareeTab,
        typeLabel: "Direct Godown Inward (" + currentSareeTab.toUpperCase() + ")",
        aai: pcs,
        gai: 0,
        isOut: false,
        note: "Direct Entry"
    });
    setStore("saree_history", history);

    toggleSareeForm();
    document.getElementById("saree-name").value = "";
    document.getElementById("saree-kariger").value = "";
    document.getElementById("saree-pcs").value = "";

    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + pcs + " Pcs Saree Stock me jama ho gayi!");
}

/**
 * 5. Main Table Render Karna (Aapke paper ke exact 8 columns)
 */
function renderSareeTable() {
    var thead = document.getElementById("saree-table-head");
    var tbody = document.getElementById("saree-table-body");
    if (!thead || !tbody) return;

    var headerBg = "#2563eb";
    var tabTitle = "Fresh Saree";
    if (currentSareeTab === "cutting") { headerBg = "#0d9488"; tabTitle = "Cutting Saree"; }
    else if (currentSareeTab === "finished") { headerBg = "#7c3aed"; tabTitle = "Finished Saree"; }
    else if (currentSareeTab === "lott") { headerBg = "#dc2626"; tabTitle = "Lott Saree"; }

    thead.innerHTML = 
        "<tr style='background:" + headerBg + "; color:white; font-size:13px; text-align:left;'>" +
            "<th>Tarikh</th>" +
            "<th>Saree Name</th>" +
            "<th>Karigar (Maker)</th>" +
            "<th>Godam</th>" +
            "<th>Aai Saree</th>" +
            "<th>Gai Saree</th>" +
            "<th>Bachi Saree</th>" +
            "<th style='text-align:center;'>Passbook</th>" +
        "</tr>";

    tbody.innerHTML = "";

    var history = safeArray(getStore("saree_history"));

    // Pipeline grouping from saree-calc.js
    var rows = [];
    if (typeof groupSareeStockByTab === "function") {
        rows = groupSareeStockByTab(history, currentSareeTab, currentSareeKarkhanaFilter);
    }

    // Universal Search Filter
    var searchInput = document.getElementById("search-saree-input");
    var searchText = searchInput ? searchInput.value : "";
    if (typeof searchSareeData === "function") {
        rows = searchSareeData(rows, searchText);
    }

    if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan='8' style='text-align:center; padding:25px; color:#888;'>Koi " + tabTitle + " Stock nahi mila.</td></tr>";
        return;
    }

    rows.forEach(function(row) {
        var safeSaree = encodeURIComponent(row.sareeName);
        var safeKariger = encodeURIComponent(row.karigerName);
        var safeKid = encodeURIComponent(row.karkhanaId);

        tbody.innerHTML += "<tr>" +
            "<td>" + row.date + "</td>" +
            "<td><strong style='color:#1e3a8a;'>" + row.sareeName + "</strong></td>" +
            "<td>👤 " + row.karigerName + "</td>" +
            "<td>🏭 " + row.godamName + "</td>" +
            "<td style='color:#059669; font-weight:800; font-size:14px;'>+" + row.aai + "</td>" +
            "<td style='color:#dc2626; font-weight:800; font-size:14px;'>" + (row.gai > 0 ? ("-" + row.gai) : "0") + "</td>" +
            "<td style='color:#2563eb; font-weight:800; font-size:15px; background:#eff6ff;'>" + row.bachi + "</td>" +
            "<td style='text-align:center;'>" +
                "<button class='sheet-btn' style='background:" + headerBg + "; padding:5px 12px; font-weight:bold;' onclick='openSareePassbook(\"" + safeSaree + "\", \"" + safeKariger + "\", \"" + safeKid + "\")'>📖 Passbook</button>" +
            "</td>" +
        "</tr>";
    });
}

/**
 * 6. Saree Passbook Modal Kholna (All 4 Tabs Supported)
 */
function openSareePassbook(safeSaree, safeKariger, safeKid) {
    var sName = decodeURIComponent(safeSaree);
    var kName = decodeURIComponent(safeKariger);
    var kId = decodeURIComponent(safeKid);

    currentPassbookSareeKey = (sName + "___" + kName + "___" + kId).toLowerCase();
    currentPassbookSareeTitle = sName + " (" + kName + ")";

    var modal = document.getElementById("item-modal");
    if (!modal) return;

    var tabLabels = {
        fresh: "Fresh Saree Khata",
        cutting: "Cutting Saree Khata",
        finished: "Finished Saree Khata",
        lott: "Lott Saree Khata"
    };

    var title = document.getElementById("modal-item-title");
    if (title) title.textContent = "📖 Passbook: " + currentPassbookSareeTitle + " • " + (tabLabels[currentSareeTab] || "Stock");

    var modalBody = modal.querySelector(".modal-body");
    if (modalBody) {
        modalBody.innerHTML = 
            "<div style='background:#f8fafc; border:1px solid #cbd5e1; padding:12px; border-radius:10px; margin-bottom:12px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between;'>" +
                "<div style='display:flex; gap:8px; align-items:center; flex-wrap:wrap;'>" +
                    "<div><label style='font-size:12px; font-weight:700;'>From Date:</label><br><input type='date' id='saree-pass-from-date' onchange='renderSareePassbookRows()'></div>" +
                    "<div><label style='font-size:12px; font-weight:700;'>To Date:</label><br><input type='date' id='saree-pass-to-date' onchange='renderSareePassbookRows()'></div>" +
                    "<div style='align-self:flex-end;'><button class='quick-btn btn-out' onclick='resetSareePassbookFilters()'>Reset</button></div>" +
                "</div>" +
                "<div style='flex:1; min-width:200px;'>" +
                    "<label style='font-size:12px; font-weight:700;'>🔍 Search in Passbook:</label><br>" +
                    "<input type='text' id='saree-pass-search-input' class='search-box' placeholder='Search Date, Worker, Detail, Qty...' oninput='renderSareePassbookRows()'>" +
                "</div>" +
            "</div>" +
            "<div class='table-responsive'>" +
                "<table>" +
                    "<thead>" +
                        "<tr style='background:#1e3a8a; color:white; font-size:12px;'>" +
                            "<th>TARIKH</th><th>DETAIL (VIVRAN)</th><th>BUNNE WALA (MAKER)</th><th>AAI (+)</th><th>GAYI (-)</th><th>ACTION</th>" +
                        "</tr>" +
                    "</thead>" +
                    "<tbody id='saree-passbook-table-body'></tbody>" +
                "</table>" +
            "</div>";
    }

    modal.style.display = "flex";
    renderSareePassbookRows();
}

function resetSareePassbookFilters() {
    var fDate = document.getElementById("saree-pass-from-date");
    var tDate = document.getElementById("saree-pass-to-date");
    var sInp = document.getElementById("saree-pass-search-input");
    if (fDate) fDate.value = "";
    if (tDate) tDate.value = "";
    if (sInp) sInp.value = "";
    renderSareePassbookRows();
}

/**
 * 7. Passbook ki entries render karna
 */
function renderSareePassbookRows() {
    var tbody = document.getElementById("saree-passbook-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var history = safeArray(getStore("saree_history"));

    // Item key and tab filter
    var list = history.filter(function(r) {
        if (!r) return false;
        var sName = (r.sareeName || r.name || "General Saree").trim();
        var kName = (r.karigerName || r.kariger || "Karkhana").trim();
        var kid = r.karkhanaId || "k_main";
        var key = (sName + "___" + kName + "___" + kid).toLowerCase();
        var t = (r.type || "fresh").toLowerCase();

        return key === currentPassbookSareeKey && t === currentSareeTab.toLowerCase();
    });

    var fDate = document.getElementById("saree-pass-from-date")?.value;
    var tDate = document.getElementById("saree-pass-to-date")?.value;
    var sTxt = document.getElementById("saree-pass-search-input")?.value;

    if (typeof filterPassbookHistory === "function") {
        list = filterPassbookHistory(list, fDate, tDate, sTxt);
    }

    if (!list.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:15px; color:#888;'>Is Saree par koi transaction record nahi hai.</td></tr>";
        return;
    }

    list.forEach(function(r) {
        var isGai = (r.isOut === true) || (Number(r.gai) > 0) || (String(r.type || "").indexOf("Out") !== -1);
        var inQty = isGai ? 0 : Number(r.aai !== undefined ? r.aai : (r.pcs || 0));
        var outQty = isGai ? Number(r.gai !== undefined ? r.gai : (r.pcs || 0)) : 0;

        var isAutoLinked = r.refId ? true : false;
        var actBtn = isAutoLinked 
            ? "<span style='color:#64748b; font-size:11px; font-weight:700;'>🔒 Auto Logged</span>"
            : "<button class='delete-btn' onclick='deleteManualSareeEntry(\"" + r.id + "\")'>🗑️ Delete</button>";

        tbody.innerHTML += "<tr>" +
            "<td>" + (r.date || "-") + "</td>" +
            "<td><strong style='color:#1e3a8a;'>" + (r.typeLabel || r.note || "Saree Movement") + "</strong></td>" +
            "<td>👤 " + (r.karigerName || r.kariger || "-") + "</td>" +
            "<td style='color:#059669; font-weight:800;'>" + (inQty > 0 ? ("+" + inQty + " Pcs") : "-") + "</td>" +
            "<td style='color:#dc2626; font-weight:800;'>" + (outQty > 0 ? ("-" + outQty + " Pcs") : "-") + "</td>" +
            "<td style='text-align:center;'>" + actBtn + "</td>" +
        "</tr>";
    });
}

function deleteManualSareeEntry(id) {
    if (!confirm("Kya aap sach me ye manual entry delete karna chahte hain?")) return;
    var history = safeArray(getStore("saree_history"));
    history = history.filter(function(x) { return x && x.id !== id; });
    setStore("saree_history", history);

    renderSareePassbookRows();
    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Entry delete ho gayi!");
}
