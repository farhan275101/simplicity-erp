/* ========================================================
   SIMPLICITY ERP - SAREE STOCK & 4-TAB PIPELINE UI
   File: saree/saree-ui.js • Developed by Farhan Jawed
   (Fresh -> Cutting -> Finished -> Lott + Godown Transfer)
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
    currentSareeTab = (tabName || "fresh").toLowerCase();

    var tabs = ["fresh", "cutting", "finished", "lott"];
    tabs.forEach(function(t) {
        var el = document.getElementById("tab-saree-" + t);
        if (el) {
            if (t === currentSareeTab) el.classList.add("active");
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

    var karkhanas = [];
    if (typeof getKarkhanasSafe === "function") {
        karkhanas = getKarkhanasSafe();
    } else {
        karkhanas = safeArray(getStore("karkhana_list"));
        if (!karkhanas.length) karkhanas = [{ id: "k_main", name: "Main Godown", isDefault: true }];
    }

    var allActive = (currentSareeKarkhanaFilter === "all") ? " active" : "";
    bar.innerHTML += "<button type='button' class='sheet-tab" + allActive + "' onclick='switchSareeKarkhanaTab(\"all\")'>👥 Sabhi Godam</button>";

    karkhanas.forEach(function(k) {
        var isMain = (k.id === "k_main" || k.isDefault);
        var icon = isMain ? "🏢 " : "🏭 ";
        var isActive = (String(currentSareeKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button type='button' class='sheet-tab" + isActive + "' onclick='switchSareeKarkhanaTab(\"" + k.id + "\")'>" + icon + k.name + "</button>";
    });
}

function switchSareeKarkhanaTab(kId) {
    currentSareeKarkhanaFilter = kId || "all";
    renderSareeKarkhanaTabs();
    renderSareeTable();
}

function filterSaree() {
    renderSareeTable();
}

/**
 * 4. Manual Direct Inward Form Toggle & Save
 */
function toggleSareeForm() {
    var f = document.getElementById("add-saree-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    var dInp = document.getElementById("saree-date");
    if (dInp) {
        dInp.value = (typeof getTodayDate === "function") ? getTodayDate() : new Date().toISOString().split("T")[0];
    }
}

function saveNewSareeStock() {
    var d = (document.getElementById("saree-date") && document.getElementById("saree-date").value) || 
            (typeof getTodayDate === "function" ? getTodayDate() : new Date().toISOString().split("T")[0]);
    var name = (document.getElementById("saree-name") && document.getElementById("saree-name").value || "").trim().toUpperCase();
    var source = (document.getElementById("saree-kariger") && document.getElementById("saree-kariger").value || "").trim().toUpperCase();
    var pcs = parseInt(document.getElementById("saree-pcs") && document.getElementById("saree-pcs").value, 10) || 0;

    if (!name || pcs <= 0) return alert("Saree ka naam aur Sahi Pcs bharein!");

    var targetKid = (currentSareeKarkhanaFilter !== "all") ? currentSareeKarkhanaFilter : "k_main";

    var history = safeArray(getStore("saree_history"));
    history.push({
        id: "saree_man_" + Date.now(),
        date: d,
        sareeName: name,
        karigerName: source || "Direct Inward",
        kariger: source || "Direct Inward",
        karkhanaId: targetKid,
        type: currentSareeTab,
        typeLabel: "Direct Godown Inward (" + currentSareeTab.toUpperCase() + ")",
        aai: pcs,
        gai: 0,
        isOut: false,
        note: "Direct Entry",
        timestamp: Date.now()
    });
    setStore("saree_history", history);

    toggleSareeForm();
    if (document.getElementById("saree-name")) document.getElementById("saree-name").value = "";
    if (document.getElementById("saree-kariger")) document.getElementById("saree-kariger").value = "";
    if (document.getElementById("saree-pcs")) document.getElementById("saree-pcs").value = "";

    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + pcs + " Pcs Saree Stock me jama ho gayi!");
}

/**
 * 5. Main Table Render Karna (With Transfer Button & Stage Indicator)
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
            "<th style='text-align:center;'>Action</th>" +
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

        // Agar bachi saree > 0 hai tabhi transfer/move ho sakta hai
        var transferBtn = "";
        if (row.bachi > 0) {
            transferBtn = "<button type='button' class='sheet-btn' style='background:#f59e0b; color:#ffffff; padding:4px 9px; font-weight:bold; margin-left:5px; border-radius:4px; border:none; cursor:pointer;' " +
                          "onclick='openSareeTransferModal(\"" + safeSaree + "\", \"" + safeKariger + "\", \"" + safeKid + "\", " + row.bachi + ")'>🚚 Bhejo</button>";
        }

        tbody.innerHTML += "<tr>" +
            "<td>" + (row.date || "-") + "</td>" +
            "<td><strong style='color:#1e3a8a;'>" + row.sareeName + "</strong></td>" +
            "<td>👤 " + row.karigerName + "</td>" +
            "<td>🏭 " + row.godamName + "</td>" +
            "<td style='color:#059669; font-weight:800; font-size:14px;'>+" + row.aai + "</td>" +
            "<td style='color:#dc2626; font-weight:800; font-size:14px;'>" + (row.gai > 0 ? ("-" + row.gai) : "0") + "</td>" +
            "<td style='color:#2563eb; font-weight:800; font-size:15px; background:#eff6ff;'>" + row.bachi + "</td>" +
            "<td style='text-align:center; white-space:nowrap;'>" +
                "<button type='button' class='sheet-btn' style='background:" + headerBg + "; padding:4px 10px; font-weight:bold; border-radius:4px; border:none; color:white; cursor:pointer;' onclick='openSareePassbook(\"" + safeSaree + "\", \"" + safeKariger + "\", \"" + safeKid + "\")'>📖 Passbook</button>" +
                transferBtn +
            "</td>" +
        "</tr>";
    });
}

/**
 * 🌟 6. SAREE TRANSFER & STAGE MOVE MODAL
 * Karkhana se Main Godam (Fresh Stock) ya agle process me bhejne ke liye
 */
function openSareeTransferModal(safeSaree, safeKariger, safeKid, availableBachi) {
    var sName = decodeURIComponent(safeSaree);
    var kName = decodeURIComponent(safeKariger);
    var currentKid = decodeURIComponent(safeKid);

    var existingModal = document.getElementById("saree-transfer-popup-modal");
    if (existingModal) existingModal.remove();

    var karkhanas = (typeof getKarkhanasSafe === "function") ? getKarkhanasSafe() : safeArray(getStore("karkhana_list"));
    var currentGodamName = (typeof getKarkhanaNameById === "function") ? getKarkhanaNameById(currentKid) : currentKid;

    // Destination options: Agar current branch hai to default Main Godown select rahega
    var godownOptions = "";
    karkhanas.forEach(function(k) {
        if (String(k.id) !== String(currentKid)) {
            var isMain = (k.id === "k_main" || k.isDefault);
            var selected = (isMain || currentKid !== "k_main") ? "selected" : "";
            godownOptions += "<option value='" + k.id + "' " + selected + ">" + (isMain ? "🏢 " : "🏭 ") + k.name + "</option>";
        }
    });

    var today = (typeof getTodayDate === "function") ? getTodayDate() : new Date().toISOString().split("T")[0];

    var modalHtml = 
        "<div id='saree-transfer-popup-modal' style='position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:99999; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box;'>" +
            "<div style='background:#ffffff; width:100%; max-width:480px; border-radius:12px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.2); overflow:hidden;'>" +
                
                // Header
                "<div style='background:#1e3a8a; color:#ffffff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;'>" +
                    "<h3 style='margin:0; font-size:16px;'>🚚 Saree Transfer / Stage Bhejein</h3>" +
                    "<button type='button' onclick='closeSareeTransferModal()' style='background:transparent; border:none; color:#ffffff; font-size:22px; cursor:pointer;'>&times;</button>" +
                "</div>" +

                // Body
                "<div style='padding:16px;'>" +
                    "<div style='background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px; margin-bottom:12px; font-size:13px;'>" +
                        "<div><strong>Saree:</strong> " + sName + "</div>" +
                        "<div><strong>Bunne Wala (Maker):</strong> " + kName + "</div>" +
                        "<div><strong>Current Godam:</strong> " + currentGodamName + " (" + currentSareeTab.toUpperCase() + ")</div>" +
                        "<div style='color:#1d4ed8; font-weight:bold; font-size:14px; margin-top:4px;'>Maujooda Bachi Saree: " + availableBachi + " Pcs</div>" +
                    "</div>" +

                    // Type Choice: Godam Transfer ya Process Move
                    "<div style='margin-bottom:12px;'>" +
                        "<label style='font-size:12px; font-weight:700; color:#374151;'>Aap kya karna chahte hain?</label><br>" +
                        "<select id='saree-transfer-action-type' onchange='toggleSareeTransferFields()' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px;'>" +
                            "<option value='godown_transfer'>🏢 Doosre Godam / Main Godown Bhejein (Fresh Stock me)</option>" +
                            "<option value='stage_move'>🔄 Agli Process me Bhejein (Cutting / Finished / Lott)</option>" +
                        "</select>" +
                    "</div>" +

                    // Fields for Godown Transfer
                    "<div id='box-godown-transfer' style='display:block;'>" +
                        "<label style='font-size:12px; font-weight:700; color:#374151;'>Kahan Bhejna Hai (Destination Godam):</label><br>" +
                        "<select id='saree-dest-godam' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px; margin-bottom:10px;'>" +
                            godownOptions +
                        "</select>" +
                        "<div style='font-size:11px; color:#059669; margin-bottom:8px;'>ℹ️ Note: Main Godown jane par ye saree automatic <strong>Fresh Saree</strong> stock me jama hogi.</div>" +
                    "</div>" +

                    // Fields for Stage Move
                    "<div id='box-stage-move' style='display:none;'>" +
                        "<label style='font-size:12px; font-weight:700; color:#374151;'>Konsi Stage me Bhejna Hai:</label><br>" +
                        "<select id='saree-dest-stage' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px; margin-bottom:10px;'>" +
                            (currentSareeTab !== "cutting" ? "<option value='cutting'>✂️ Cutting Saree</option>" : "") +
                            (currentSareeTab !== "finished" ? "<option value='finished'>✨ Finished Saree</option>" : "") +
                            (currentSareeTab !== "lott" ? "<option value='lott'>📦 Lott Saree</option>" : "") +
                            (currentSareeTab !== "fresh" ? "<option value='fresh'>🌱 Fresh Saree</option>" : "") +
                        "</select>" +
                    "</div>" +

                    // Common Inputs (Qty, Date, Note)
                    "<div style='display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;'>" +
                        "<div>" +
                            "<label style='font-size:12px; font-weight:700; color:#374151;'>Kitni Saree (Pcs):</label><br>" +
                            "<input type='number' id='saree-transfer-qty' max='" + availableBachi + "' min='1' value='" + availableBachi + "' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; font-weight:bold; box-sizing:border-box;'>" +
                        "</div>" +
                        "<div>" +
                            "<label style='font-size:12px; font-weight:700; color:#374151;'>Tarikh:</label><br>" +
                            "<input type='date' id='saree-transfer-date' value='" + today + "' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;'>" +
                        "</div>" +
                    "</div>" +

                    "<div style='margin-bottom:14px;'>" +
                        "<label style='font-size:12px; font-weight:700; color:#374151;'>Note / Gaadi / Parchi No. (Optional):</label><br>" +
                        "<input type='text' id='saree-transfer-note' placeholder='e.g. Tempo se bheja gaya' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;'>" +
                    "</div>" +

                    // Submit Button
                    "<button type='button' onclick='submitSareeTransferForm(\"" + safeSaree + "\", \"" + safeKariger + "\", \"" + safeKid + "\", " + availableBachi + ")' style='background:#2563eb; color:#ffffff; border:none; width:100%; padding:10px; border-radius:6px; font-weight:bold; font-size:14px; cursor:pointer;'>" +
                        "🚀 Saree Transfer Confirm Karein" +
                    "</button>" +

                "</div>" +
            "</div>" +
        "</div>";

    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function closeSareeTransferModal() {
    var modal = document.getElementById("saree-transfer-popup-modal");
    if (modal) modal.remove();
}

function toggleSareeTransferFields() {
    var actionType = document.getElementById("saree-transfer-action-type").value;
    var godownBox = document.getElementById("box-godown-transfer");
    var stageBox = document.getElementById("box-stage-move");

    if (actionType === "godown_transfer") {
        if (godownBox) godownBox.style.display = "block";
        if (stageBox) stageBox.style.display = "none";
    } else {
        if (godownBox) godownBox.style.display = "none";
        if (stageBox) stageBox.style.display = "block";
    }
}

function submitSareeTransferForm(safeSaree, safeKariger, safeKid, maxAvailable) {
    var sName = decodeURIComponent(safeSaree);
    var kName = decodeURIComponent(safeKariger);
    var fromKid = decodeURIComponent(safeKid);

    var actionType = document.getElementById("saree-transfer-action-type").value;
    var qty = parseInt(document.getElementById("saree-transfer-qty").value, 10) || 0;
    var d = document.getElementById("saree-transfer-date").value || (typeof getTodayDate === "function" ? getTodayDate() : "");
    var note = (document.getElementById("saree-transfer-note").value || "").trim();

    if (qty <= 0) return alert("Kripya sahi Saree sankhya (Pcs) bharein!");
    if (qty > maxAvailable) return alert("Aapke paas sirf " + maxAvailable + " Pcs hain!");

    var success = false;

    if (actionType === "godown_transfer") {
        var toKid = document.getElementById("saree-dest-godam").value;
        if (!toKid) return alert("Kripya Destination Godam chunein!");

        if (typeof transferSareeBetweenKarkhana === "function") {
            success = transferSareeBetweenKarkhana(d, sName, kName, fromKid, toKid, qty, currentSareeTab, note);
        }
    } else {
        var toStage = document.getElementById("saree-dest-stage").value;
        if (!toStage) return alert("Kripya Agli Stage chunein!");

        if (typeof moveSareePipelineStage === "function") {
            success = moveSareePipelineStage(d, sName, kName, fromKid, qty, currentSareeTab, toStage, note);
        }
    }

    if (success) {
        closeSareeTransferModal();
        renderSareeTable();
        if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
        alert("✅ Saree safalta-poorvak transfer ho gayi!");
    }
}

/**
 * 7. Saree Passbook Modal Kholna (All 4 Tabs Supported)
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
                    "<div style='align-self:flex-end;'><button type='button' class='quick-btn btn-out' onclick='resetSareePassbookFilters()'>Reset</button></div>" +
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
 * 8. Passbook ki entries render karna
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

    var fDate = document.getElementById("saree-pass-from-date") ? document.getElementById("saree-pass-from-date").value : "";
    var tDate = document.getElementById("saree-pass-to-date") ? document.getElementById("saree-pass-to-date").value : "";
    var sTxt = document.getElementById("saree-pass-search-input") ? document.getElementById("saree-pass-search-input").value : "";

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
            : "<button type='button' class='delete-btn' onclick='deleteManualSareeEntry(\"" + r.id + "\")'>🗑️ Delete</button>";

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
