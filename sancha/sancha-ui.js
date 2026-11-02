/* ========================================================
   SIMPLICITY ERP - SANCHA (TANI & CHUKKA) STOCK & PASSBOOK
   File: sancha/sancha-ui.js • Developed by Farhan Jawed
   (Multi-Godam Stock, Edit, Delete & Live Passbook UI)
======================================================== */

var currentSanchaCategory = "tani"; // "tani" ya "chukka"
var currentSanchaKarkhanaFilter = "all";
var currentPassbookSanchaItem = "";

/**
 * 1. Sancha Module kholne ka main function
 */
function openSanchaModule() {
    var dView = document.getElementById("dashboard-view");
    if (dView) dView.style.display = "none";
    var sSec = document.getElementById("sancha-section");
    if (sSec) sSec.style.display = "block";

    renderSanchaKarkhanaTabs();
    populateSanchaExistingDropdown();
    renderSanchaTable();
}

/**
 * 2. Tani aur Chukka Category switch karna
 */
function switchSanchaCategory(cat) {
    currentSanchaCategory = (cat || "tani").toLowerCase();
    var tabT = document.getElementById("tab-sancha-tani");
    var tabC = document.getElementById("tab-sancha-chukka");

    if (tabT) tabT.className = (currentSanchaCategory === "tani") ? "sheet-tab active" : "sheet-tab";
    if (tabC) tabC.className = (currentSanchaCategory === "chukka") ? "sheet-tab active" : "sheet-tab";

    var rTani = document.getElementById("sancha-cat-tani");
    var rChuk = document.getElementById("sancha-cat-chukka");
    if (rTani && currentSanchaCategory === "tani") rTani.checked = true;
    if (rChuk && currentSanchaCategory === "chukka") rChuk.checked = true;

    populateSanchaExistingDropdown();
    renderSanchaTable();
}

/**
 * 3. Karkhana / Godam Filter Tabs render karna
 */
function renderSanchaKarkhanaTabs() {
    var bar = document.getElementById("sancha-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";

    var karkhanas = [];
    if (typeof getKarkhanasSafe === "function") {
        karkhanas = getKarkhanasSafe();
    } else {
        karkhanas = safeArray(getStore("karkhana_list"));
        if (!karkhanas.length) karkhanas = [{ id: "k_main", name: "Main Godown", isDefault: true }];
    }

    var allActive = (currentSanchaKarkhanaFilter === "all") ? " active" : "";
    bar.innerHTML += "<button type='button' class='sheet-tab" + allActive + "' onclick='switchSanchaKarkhanaTab(\"all\")'>👥 Sabhi Karkhane</button>";

    karkhanas.forEach(function(k) {
        var isMain = (k.id === "k_main" || k.isDefault);
        var icon = isMain ? "🏢 " : "🏭 ";
        var isActive = (String(currentSanchaKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button type='button' class='sheet-tab" + isActive + "' onclick='switchSanchaKarkhanaTab(\"" + k.id + "\")'>" + icon + k.name + "</button>";
    });
}

function switchSanchaKarkhanaTab(kId) {
    currentSanchaKarkhanaFilter = kId || "all";
    renderSanchaKarkhanaTabs();
    populateSanchaExistingDropdown();
    renderSanchaTable();
}

/**
 * 4. Add Sancha Form Toggle & Options
 */
function toggleAddSanchaForm() {
    var f = document.getElementById("add-sancha-item-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    var dInp = document.getElementById("sancha-date");
    if (dInp) dInp.value = (typeof getTodayDate === "function") ? getTodayDate() : new Date().toISOString().split("T")[0];
    toggleSanchaFormOptions();
}

function toggleSanchaFormOptions() {
    var isNew = document.getElementById("sancha-type-new") ? document.getElementById("sancha-type-new").checked : true;
    var exGroup = document.getElementById("sancha-existing-group");
    var newGroup = document.getElementById("sancha-new-group");

    if (exGroup) exGroup.style.display = isNew ? "none" : "block";
    if (newGroup) newGroup.style.display = isNew ? "block" : "none";

    var isChuk = document.getElementById("sancha-cat-chukka") ? document.getElementById("sancha-cat-chukka").checked : false;
    currentSanchaCategory = isChuk ? "chukka" : "tani";
    populateSanchaExistingDropdown();
}

function populateSanchaExistingDropdown() {
    var sel = document.getElementById("sancha-select-existing");
    if (!sel) return;
    sel.innerHTML = "";

    var list = safeArray(getStore("sancha_items")).filter(function(s) {
        var cat = s.category || "tani";
        return cat.toLowerCase() === currentSanchaCategory.toLowerCase();
    });

    var unique = [];
    list.forEach(function(s) {
        if (s && s.name && unique.indexOf(s.name.trim().toLowerCase()) === -1) {
            unique.push(s.name.trim().toLowerCase());
            var opt = document.createElement("option");
            opt.value = s.name.trim();
            opt.textContent = s.name.trim();
            sel.appendChild(opt);
        }
    });
}

/**
 * 5. Naya Sancha (Tani / Chukka) Stock me Jama Karna
 */
function saveNewSanchaStock() {
    var isNew = document.getElementById("sancha-type-new") ? document.getElementById("sancha-type-new").checked : true;
    var name = isNew 
        ? (document.getElementById("sancha-new-name") ? document.getElementById("sancha-new-name").value : "").trim() 
        : (document.getElementById("sancha-select-existing") ? document.getElementById("sancha-select-existing").value : "").trim();

    var date = (document.getElementById("sancha-date") && document.getElementById("sancha-date").value) || 
               (typeof getTodayDate === "function" ? getTodayDate() : new Date().toISOString().split("T")[0]);
    var qty = parseFloat(document.getElementById("sancha-qty") ? document.getElementById("sancha-qty").value : 0) || 0;
    var person = (document.getElementById("sancha-person") ? document.getElementById("sancha-person").value : "").trim();
    var isChuk = document.getElementById("sancha-cat-chukka") ? document.getElementById("sancha-cat-chukka").checked : false;
    var category = isChuk ? "chukka" : "tani";

    if (!name) return alert("Sancha Item ka naam zaroori hai!");
    if (qty <= 0) return alert("Wazan (Qty Kg me) daalein!");

    var targetKid = (currentSanchaKarkhanaFilter !== "all") ? currentSanchaKarkhanaFilter : "k_main";
    var list = safeArray(getStore("sancha_items"));
    
    var item = list.find(function(x) { 
        var cat = x.category || "tani";
        var matchK = (!x.karkhanaId && targetKid === "k_main") || String(x.karkhanaId) === String(targetKid);
        return x && x.name && x.name.toLowerCase() === name.toLowerCase() && cat.toLowerCase() === category.toLowerCase() && matchK; 
    });

    if (item) {
        item.aaya = Number(((Number(item.aaya) || 0) + qty).toFixed(2));
        item.bacha = Number(((Number(item.aaya) || 0) - (Number(item.gaya) || 0)).toFixed(2));
        if (person) item.person = person;
        item.date = date;
    } else {
        list.push({
            id: "sancha_" + Date.now(),
            date: date,
            name: name,
            category: category,
            aaya: qty,
            gaya: 0,
            bacha: qty,
            person: person || "-",
            karkhanaId: targetKid,
            timestamp: Date.now()
        });
    }
    setStore("sancha_items", list);

    var hist = safeArray(getStore("sancha_history"));
    hist.push({
        id: "shist_" + Date.now(),
        date: date,
        name: name,
        category: category,
        kariger: person || "Factory Inward",
        type: "Khareed / Inward (" + (category === "tani" ? "Tani" : "Chukka") + ")",
        aaya: qty,
        gaya: 0,
        karkhanaId: targetKid,
        timestamp: Date.now()
    });
    setStore("sancha_history", hist);

    if (document.getElementById("sancha-new-name")) document.getElementById("sancha-new-name").value = "";
    if (document.getElementById("sancha-qty")) document.getElementById("sancha-qty").value = "";
    if (document.getElementById("sancha-person")) document.getElementById("sancha-person").value = "";
    toggleAddSanchaForm();
    populateSanchaExistingDropdown();
    renderSanchaTable();
    alert("✅ Sancha (" + (category === "tani" ? "Tani" : "Chukka") + ") Stock me jama ho gaya!");
}

function filterSancha() {
    renderSanchaTable();
}

/**
 * 6. Sancha Table Render Karna
 */
function renderSanchaTable() {
    var tbody = document.getElementById("sancha-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var rawStock = safeArray(getStore("sancha_items")).filter(function(s) {
        var cat = s.category || "tani";
        return cat.toLowerCase() === currentSanchaCategory.toLowerCase();
    });

    var uniqueNames = [];
    rawStock.forEach(function(s) {
        if (!s || !s.name) return;
        var n = s.name.trim();
        if (uniqueNames.map(function(x) { return x.toLowerCase(); }).indexOf(n.toLowerCase()) === -1) {
            uniqueNames.push(n);
        }
    });

    var rows = [];
    uniqueNames.forEach(function(name) {
        if (typeof getSanchaItemStats === "function") {
            var stats = getSanchaItemStats(null, name, currentSanchaCategory, currentSanchaKarkhanaFilter);
            if (stats.aaya > 0 || stats.gaya > 0 || stats.bacha > 0) {
                var foundOriginal = rawStock.find(function(x) { return x.name && x.name.toLowerCase() === name.toLowerCase(); });
                stats.person = foundOriginal ? (foundOriginal.person || "-") : "-";
                rows.push(stats);
            }
        }
    });

    var txt = (document.getElementById("search-sancha-input") && document.getElementById("search-sancha-input").value || "").toLowerCase().trim();
    if (txt) {
        rows = rows.filter(function(s) {
            return (String(s.name || "") + " " + String(s.person || "") + " " + String(s.date || "")).toLowerCase().indexOf(txt) !== -1;
        });
    }

    var totalBacha = 0;
    if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan='8' style='text-align:center; padding:20px; color:#888;'>Koi " + (currentSanchaCategory === "tani" ? "Tani" : "Chukka") + " Stock nahi mila.</td></tr>";
    } else {
        rows.forEach(function(s) {
            var bacha = Number(s.bacha || 0);
            totalBacha += bacha;

            var safeName = encodeURIComponent(s.name);
            var safeCat = encodeURIComponent(s.category);

            var transferBtn = "";
            if (bacha > 0) {
                transferBtn = "<button type='button' class='sheet-btn' style='background:#f59e0b; color:#ffffff; padding:4px 9px; font-weight:bold; margin-left:6px; border-radius:4px; border:none; cursor:pointer;' " +
                              "onclick='openSanchaTransferModal(\"" + safeName + "\", \"" + safeCat + "\", " + bacha + ")'>🚚 Bhejo</button>";
            }

            tbody.innerHTML += "<tr>" +
                "<td>" + (s.date || "-") + "</td>" +
                "<td><span class='badge-blue'>" + (s.category === "chukka" ? "⚙️ Chukka" : "🧵 Tani") + "</span></td>" +
                "<td><strong>" + s.name + "</strong></td>" +
                "<td style='color:#059669; font-weight:700;'>+" + Number(s.aaya || 0).toFixed(2) + "</td>" +
                "<td style='color:#ea580c; font-weight:700;'>-" + Number(s.gaya || 0).toFixed(2) + "</td>" +
                "<td style='font-weight:800; color:#0284c7; background:#eff6ff; font-size:14px;'>" + bacha.toFixed(2) + " Kg</td>" +
                "<td>" + (s.person || "-") + "</td>" +
                "<td style='text-align:center; white-space:nowrap;'>" +
                    "<button type='button' class='sheet-btn' style='background:#0284c7; padding:4px 10px; font-weight:bold; border-radius:4px; border:none; color:white; cursor:pointer;' onclick='openSanchaPassbook(\"" + safeName + "\")'>📖 Passbook</button>" +
                    transferBtn +
                "</td>" +
            "</tr>";
        });
    }

    var opVal = document.getElementById("sancha-opening-val");
    if (opVal) opVal.textContent = totalBacha.toFixed(2) + " Kg Kul " + (currentSanchaCategory === "tani" ? "Tani" : "Chukka") + " Bacha";
}

/**
 * 7. Sancha Transfer Modal
 */
function openSanchaTransferModal(safeName, safeCat, availableBacha) {
    var itemName = decodeURIComponent(safeName);
    var category = decodeURIComponent(safeCat);

    var existingModal = document.getElementById("sancha-transfer-popup-modal");
    if (existingModal) existingModal.remove();

    var karkhanas = (typeof getKarkhanasSafe === "function") ? getKarkhanasSafe() : safeArray(getStore("karkhana_list"));
    var currentKid = (currentSanchaKarkhanaFilter !== "all") ? currentSanchaKarkhanaFilter : "k_main";
    var currentGodamName = (typeof getKarkhanaNameById === "function") ? getKarkhanaNameById(currentKid) : currentKid;

    var godownOptions = "";
    karkhanas.forEach(function(k) {
        if (String(k.id) !== String(currentKid)) {
            var isMain = (k.id === "k_main" || k.isDefault);
            godownOptions += "<option value='" + k.id + "'>" + (isMain ? "🏢 " : "🏭 ") + k.name + "</option>";
        }
    });

    var today = (typeof getTodayDate === "function") ? getTodayDate() : new Date().toISOString().split("T")[0];

    var modalHtml = 
        "<div id='sancha-transfer-popup-modal' style='position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:99999; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box;'>" +
            "<div style='background:#ffffff; width:100%; max-width:460px; border-radius:12px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.2); overflow:hidden;'>" +
                "<div style='background:#0284c7; color:#ffffff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;'>" +
                    "<h3 style='margin:0; font-size:16px;'>🚚 Sancha (" + (category === "chukka" ? "Chukka" : "Tani") + ") Stock Transfer</h3>" +
                    "<button type='button' onclick='closeSanchaTransferModal()' style='background:transparent; border:none; color:#ffffff; font-size:22px; cursor:pointer;'>&times;</button>" +
                "</div>" +
                "<div style='padding:16px;'>" +
                    "<div style='background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:10px; margin-bottom:12px; font-size:13px;'>" +
                        "<div><strong>Item:</strong> " + itemName + " (" + (category === "chukka" ? "Chukka" : "Tani") + ")</div>" +
                        "<div><strong>Bhejne Wala Godam:</strong> " + currentGodamName + "</div>" +
                        "<div style='color:#0284c7; font-weight:bold; font-size:14px; margin-top:4px;'>Maujooda Bacha Wazan: " + availableBacha.toFixed(2) + " Kg</div>" +
                    "</div>" +
                    "<div style='margin-bottom:12px;'>" +
                        "<label style='font-size:12px; font-weight:700; color:#374151;'>Kahan Bhejna Hai (Destination Godam):</label><br>" +
                        "<select id='sancha-dest-godam' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px;'>" +
                            godownOptions +
                        "</select>" +
                    "</div>" +
                    "<div style='display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;'>" +
                        "<div>" +
                            "<label style='font-size:12px; font-weight:700; color:#374151;'>Kitna Wazan (Kg):</label><br>" +
                            "<input type='number' step='0.01' id='sancha-transfer-qty' max='" + availableBacha + "' min='0.01' value='" + availableBacha + "' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; font-weight:bold; box-sizing:border-box;'>" +
                        "</div>" +
                        "<div>" +
                            "<label style='font-size:12px; font-weight:700; color:#374151;'>Tarikh:</label><br>" +
                            "<input type='date' id='sancha-transfer-date' value='" + today + "' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;'>" +
                        "</div>" +
                    "</div>" +
                    "<div style='margin-bottom:14px;'>" +
                        "<label style='font-size:12px; font-weight:700; color:#374151;'>Note / Parchi No. (Optional):</label><br>" +
                        "<input type='text' id='sancha-transfer-note' placeholder='e.g. Khairabad loom ke liye Tani bheji' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;'>" +
                    "</div>" +
                    "<button type='button' onclick='submitSanchaTransferForm(\"" + safeName + "\", \"" + safeCat + "\", \"" + currentKid + "\", " + availableBacha + ")' style='background:#0284c7; color:#ffffff; border:none; width:100%; padding:10px; border-radius:6px; font-weight:bold; font-size:14px; cursor:pointer;'>" +
                        "🚀 Sancha Transfer Confirm Karein" +
                    "</button>" +
                "</div>" +
            "</div>" +
        "</div>";

    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function closeSanchaTransferModal() {
    var modal = document.getElementById("sancha-transfer-popup-modal");
    if (modal) modal.remove();
}

function submitSanchaTransferForm(safeName, safeCat, fromKid, maxAvailable) {
    var itemName = decodeURIComponent(safeName);
    var category = decodeURIComponent(safeCat);
    var toKid = document.getElementById("sancha-dest-godam").value;
    var qty = parseFloat(document.getElementById("sancha-transfer-qty").value) || 0;
    var d = document.getElementById("sancha-transfer-date").value || (typeof getTodayDate === "function" ? getTodayDate() : "");
    var note = (document.getElementById("sancha-transfer-note").value || "").trim();

    if (!toKid) return alert("Kripya Paane wala Godam chunein!");
    if (qty <= 0) return alert("Kripya sahi wazan (Kg) bharein!");
    if (qty > maxAvailable) return alert("Aapke paas sirf " + maxAvailable.toFixed(2) + " Kg bachi hai!");

    var success = false;
    if (typeof transferSanchaStock === "function") {
        success = transferSanchaStock(d, itemName, category, fromKid, toKid, qty, note);
    }

    if (success) {
        closeSanchaTransferModal();
        renderSanchaTable();
        alert("✅ " + qty.toFixed(2) + " Kg Sancha (" + (category === "chukka" ? "Chukka" : "Tani") + ") safalta-poorvak transfer ho gayi!");
    }
}

/**
 * 🌟 8. Sancha Passbook Engine (With Live EDIT & DELETE Options)
 */
function openSanchaPassbook(itemName) {
    currentPassbookSanchaItem = decodeURIComponent(itemName);
    var modal = document.getElementById("item-modal");
    if (!modal) return;

    var title = document.getElementById("modal-item-title");
    if (title) title.textContent = "📖 Sancha Passbook: " + currentPassbookSanchaItem + " (" + (currentSanchaCategory === "tani" ? "Tani" : "Chukka") + ")";

    var modalBody = modal.querySelector(".modal-body");
    if (modalBody) {
        modalBody.innerHTML = 
            "<div style='background:#f8fafc; border:1px solid #cbd5e1; padding:12px; border-radius:10px; margin-bottom:12px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between;'>" +
                "<div style='display:flex; gap:8px; align-items:center; flex-wrap:wrap;'>" +
                    "<div><label style='font-size:12px; font-weight:700;'>From Date:</label><br><input type='date' id='sancha-pass-from-date' onchange='renderSanchaPassbookRows()'></div>" +
                    "<div><label style='font-size:12px; font-weight:700;'>To Date:</label><br><input type='date' id='sancha-pass-to-date' onchange='renderSanchaPassbookRows()'></div>" +
                    "<div style='align-self:flex-end;'><button type='button' class='quick-btn btn-out' onclick='resetSanchaPassbookFilters()'>Reset</button></div>" +
                "</div>" +
                "<div style='flex:1; min-width:200px;'>" +
                    "<label style='font-size:12px; font-weight:700;'>🔍 Search Any Column:</label><br>" +
                    "<input type='text' id='sancha-pass-search-input' class='search-box' placeholder='Search Date, Kariger, Qty...' oninput='renderSanchaPassbookRows()'>" +
                "</div>" +
            "</div>" +
            "<div class='table-responsive'>" +
                "<table>" +
                    "<thead>" +
                        "<tr style='background:#0284c7; color:white; font-size:12px;'>" +
                            "<th>TARIKH</th><th>DETAIL (TYPE)</th><th>KARIGER / PERSON</th><th>AAYA (Kg)</th><th>GAYA (Kg)</th><th style='text-align:center;'>ACTIONS</th>" +
                        "</tr>" +
                    "</thead>" +
                    "<tbody id='sancha-passbook-table-body'></tbody>" +
                "</table>" +
            "</div>";
    }

    modal.style.display = "flex";
    renderSanchaPassbookRows();
}

function resetSanchaPassbookFilters() {
    var fDate = document.getElementById("sancha-pass-from-date");
    var tDate = document.getElementById("sancha-pass-to-date");
    var sInp = document.getElementById("sancha-pass-search-input");
    if (fDate) fDate.value = "";
    if (tDate) tDate.value = "";
    if (sInp) sInp.value = "";
    renderSanchaPassbookRows();
}

function renderSanchaPassbookRows() {
    var tbody = document.getElementById("sancha-passbook-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var hist = safeArray(getStore("sancha_history")).filter(function(x) {
        if (!x || !x.name) return false;
        var nameMatch = x.name.toLowerCase() === currentPassbookSanchaItem.toLowerCase();
        var catMatch = (x.category || "tani").toLowerCase() === currentSanchaCategory.toLowerCase();
        if (!nameMatch || !catMatch) return false;

        if (currentSanchaKarkhanaFilter !== "all") {
            var rowKid = x.karkhanaId || "k_main";
            return String(rowKid) === String(currentSanchaKarkhanaFilter);
        }
        return true;
    });

    var fDate = document.getElementById("sancha-pass-from-date") ? document.getElementById("sancha-pass-from-date").value : "";
    var tDate = document.getElementById("sancha-pass-to-date") ? document.getElementById("sancha-pass-to-date").value : "";
    var sTxt = (document.getElementById("sancha-pass-search-input") ? document.getElementById("sancha-pass-search-input").value : "").toLowerCase().trim();

    if (fDate) hist = hist.filter(function(x) { return x.date >= fDate; });
    if (tDate) hist = hist.filter(function(x) { return x.date <= tDate; });

    if (sTxt) {
        hist = hist.filter(function(x) {
            var fullRow = (String(x.date || "") + " " + String(x.type || "") + " " + String(x.kariger || "") + " " + String(x.aaya || x.qty || "") + " " + String(x.gaya || "")).toLowerCase();
            return fullRow.indexOf(sTxt) !== -1;
        });
    }

    if (!hist.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:15px; color:#888;'>Koi entry nahi mili.</td></tr>";
        return;
    }

    hist.forEach(function(r) {
        var aayaQty = Number(r.aaya || 0);
        var gayaQty = Number(r.gaya || r.qty || 0);
        var karigerDisplay = (r.kariger && r.kariger !== "-" && r.kariger !== "undefined") ? ("👤 " + r.kariger) : "📦 Factory Inward";

        // ✏️ Edit aur 🗑️ Delete Buttons (Sabhi entries ke liye)
        var actionBtns = 
            "<div style='display:flex; gap:6px; justify-content:center; align-items:center;'>" +
                "<button type='button' class='sheet-btn' style='background:#3b82f6; color:#ffffff; padding:4px 8px; font-size:11px; font-weight:bold; border-radius:4px; border:none; cursor:pointer;' onclick='openSanchaEditModal(\"" + r.id + "\")'>✏️ Edit</button>" +
                "<button type='button' class='sheet-btn' style='background:#ef4444; color:#ffffff; padding:4px 8px; font-size:11px; font-weight:bold; border-radius:4px; border:none; cursor:pointer;' onclick='deleteSanchaHistoryEntry(\"" + r.id + "\")'>🗑️ Del</button>" +
            "</div>";

        tbody.innerHTML += "<tr>" +
            "<td>" + (r.date || "-") + "</td>" +
            "<td><strong>" + (r.type || "Godam Entry") + "</strong></td>" +
            "<td style='color:#1e3a8a; font-weight:700;'>" + karigerDisplay + "</td>" +
            "<td style='color:#059669; font-weight:700;'>" + (aayaQty ? (aayaQty.toFixed(2) + " Kg") : "-") + "</td>" +
            "<td style='color:#ea580c; font-weight:700;'>-" + (gayaQty ? (gayaQty.toFixed(2) + " Kg") : "-") + "</td>" +
            "<td style='text-align:center; white-space:nowrap;'>" + actionBtns + "</td>" +
        "</tr>";
    });
}

/**
 * 🌟 9. SANCHA PASSBOOK DELETE ENGINE (Safe & Multi-Godam Reconciled)
 */
function deleteSanchaHistoryEntry(id) {
    if (!confirm("Kya aap sach me ye Passbook entry DELETE karna chahte hain?\nIsse stock balance wapas sahi settle ho jayega.")) return;

    var hist = safeArray(getStore("sancha_history"));
    var entry = hist.find(function(x) { return x && x.id === id; });
    if (!entry) return alert("Entry nahi mili!");

    var isPurchase = (String(entry.type || "").indexOf("Khareed") !== -1 || String(entry.type || "").indexOf("Inward") !== -1);
    var isTransfer = (entry.refId || String(entry.type || "").indexOf("Transfer") !== -1);

    // 1. Agar Transfer entry hai toh dono godamo ke pair records delete honge
    if (isTransfer && entry.refId) {
        hist = hist.filter(function(x) { return x.refId !== entry.refId; });
    } else {
        hist = hist.filter(function(x) { return x.id !== id; });
    }
    setStore("sancha_history", hist);

    // 2. Agar Khareed/Inward delete hui hai, toh Main Stock (sancha_items) se wazan minus karo
    if (isPurchase) {
        var qtyToDeduct = Number(entry.aaya || 0);
        var list = safeArray(getStore("sancha_items"));
        var targetKid = entry.karkhanaId || "k_main";
        var cat = (entry.category || currentSanchaCategory || "tani").toLowerCase();

        var item = list.find(function(x) {
            var matchK = (!x.karkhanaId && targetKid === "k_main") || String(x.karkhanaId) === String(targetKid);
            return x && x.name && x.name.toLowerCase() === entry.name.toLowerCase() && (x.category || "tani").toLowerCase() === cat && matchK;
        });

        if (item) {
            item.aaya = Math.max(0, Number(((Number(item.aaya) || 0) - qtyToDeduct).toFixed(2)));
            item.bacha = Math.max(0, Number(((Number(item.aaya) || 0) - (Number(item.gaya) || 0)).toFixed(2)));
            setStore("sancha_items", list);
        }
    }

    renderSanchaPassbookRows();
    renderSanchaTable();
    alert("✅ Entry safalta-poorvak delete ho gayi!");
}

/**
 * 🌟 10. SANCHA PASSBOOK EDIT MODAL & SAVE ENGINE
 */
function openSanchaEditModal(id) {
    var hist = safeArray(getStore("sancha_history"));
    var entry = hist.find(function(x) { return x && x.id === id; });
    if (!entry) return alert("Entry nahi mili!");

    var existingModal = document.getElementById("sancha-edit-popup-modal");
    if (existingModal) existingModal.remove();

    var currentQty = Number(entry.aaya || entry.gaya || entry.qty || 0);
    var isAaya = Number(entry.aaya || 0) > 0;
    var typeLabel = isAaya ? "Aaya (Inward)" : "Gaya (Outward)";

    var modalHtml = 
        "<div id='sancha-edit-popup-modal' style='position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:999999; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box;'>" +
            "<div style='background:#ffffff; width:100%; max-width:420px; border-radius:12px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.3); overflow:hidden;'>" +
                "<div style='background:#1e3a8a; color:#ffffff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;'>" +
                    "<h3 style='margin:0; font-size:16px;'>✏️ Edit Sancha Entry</h3>" +
                    "<button type='button' onclick='closeSanchaEditModal()' style='background:transparent; border:none; color:#ffffff; font-size:22px; cursor:pointer;'>&times;</button>" +
                "</div>" +
                "<div style='padding:16px;'>" +
                    "<div style='background:#f1f5f9; padding:8px 12px; border-radius:6px; margin-bottom:12px; font-size:13px;'>" +
                        "<div><strong>Item:</strong> " + entry.name + " (" + (entry.category === "chukka" ? "Chukka" : "Tani") + ")</div>" +
                        "<div><strong>Type:</strong> " + (entry.type || "-") + "</div>" +
                    "</div>" +
                    "<div style='margin-bottom:12px;'>" +
                        "<label style='font-size:12px; font-weight:700; color:#374151;'>Tarikh (Date):</label><br>" +
                        "<input type='date' id='sancha-edit-date' value='" + (entry.date || "") + "' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px; box-sizing:border-box;'>" +
                    "</div>" +
                    "<div style='margin-bottom:12px;'>" +
                        "<label style='font-size:12px; font-weight:700; color:#374151;'>Kariger / Person Name:</label><br>" +
                        "<input type='text' id='sancha-edit-person' value='" + (entry.kariger || "") + "' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px; box-sizing:border-box;'>" +
                    "</div>" +
                    "<div style='margin-bottom:16px;'>" +
                        "<label style='font-size:12px; font-weight:700; color:#374151;'>Wazan (" + typeLabel + " Kg me):</label><br>" +
                        "<input type='number' step='0.01' id='sancha-edit-qty' value='" + currentQty.toFixed(2) + "' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; font-weight:bold; margin-top:4px; box-sizing:border-box;'>" +
                    "</div>" +
                    "<button type='button' onclick='saveSanchaHistoryEdit(\"" + id + "\")' style='background:#2563eb; color:#ffffff; border:none; width:100%; padding:10px; border-radius:6px; font-weight:bold; font-size:14px; cursor:pointer;'>" +
                        "💾 Badlaav Safe Karein" +
                    "</button>" +
                "</div>" +
            "</div>" +
        "</div>";

    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function closeSanchaEditModal() {
    var modal = document.getElementById("sancha-edit-popup-modal");
    if (modal) modal.remove();
}

function saveSanchaHistoryEdit(id) {
    var hist = safeArray(getStore("sancha_history"));
    var entry = hist.find(function(x) { return x && x.id === id; });
    if (!entry) return alert("Entry nahi mili!");

    var newDate = document.getElementById("sancha-edit-date").value;
    var newPerson = (document.getElementById("sancha-edit-person").value || "").trim();
    var newQty = parseFloat(document.getElementById("sancha-edit-qty").value) || 0;

    if (newQty <= 0) return alert("Kripya sahi wazan (Kg) darj karein!");

    var oldAaya = Number(entry.aaya || 0);
    var oldGaya = Number(entry.gaya || entry.qty || 0);
    var isPurchase = (String(entry.type || "").indexOf("Khareed") !== -1 || String(entry.type || "").indexOf("Inward") !== -1);
    var isTransfer = (entry.refId || String(entry.type || "").indexOf("Transfer") !== -1);

    // 1. History Record Update
    entry.date = newDate;
    entry.kariger = newPerson || "-";

    if (oldAaya > 0) {
        var aayaDiff = newQty - oldAaya;
        entry.aaya = newQty;

        // Agar Khareed edit hui hai toh sancha_items me wazan adjust karo
        if (isPurchase) {
            var list = safeArray(getStore("sancha_items"));
            var targetKid = entry.karkhanaId || "k_main";
            var cat = (entry.category || currentSanchaCategory || "tani").toLowerCase();

            var item = list.find(function(x) {
                var matchK = (!x.karkhanaId && targetKid === "k_main") || String(x.karkhanaId) === String(targetKid);
                return x && x.name && x.name.toLowerCase() === entry.name.toLowerCase() && (x.category || "tani").toLowerCase() === cat && matchK;
            });

            if (item) {
                item.aaya = Number(((Number(item.aaya) || 0) + aayaDiff).toFixed(2));
                item.bacha = Number(((Number(item.aaya) || 0) - (Number(item.gaya) || 0)).toFixed(2));
                setStore("sancha_items", list);
            }
        }
    } else {
        entry.gaya = newQty;
        entry.qty = newQty;
    }

    // 2. Agar Transfer entry edit hui hai toh pair destination record me bhi wahi wazan dalo
    if (isTransfer && entry.refId) {
        var pair = hist.find(function(x) { return x && x.refId === entry.refId && x.id !== id; });
        if (pair) {
            pair.date = newDate;
            if (pair.aaya > 0) pair.aaya = newQty;
            if (pair.gaya > 0) pair.gaya = newQty;
        }
    }

    setStore("sancha_history", hist);

    closeSanchaEditModal();
    renderSanchaPassbookRows();
    renderSanchaTable();
    alert("✅ Sancha entry safalta-poorvak update ho gayi!");
}
