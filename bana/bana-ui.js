/* ========================================================
   SIMPLICITY ERP - BANA STOCK & PASSBOOK ENGINE
   File: bana/bana-ui.js • Developed by Farhan Jawed
   (Multi-Godam Stock, Bana Transfer & Live Passbook UI)
======================================================== */

var currentBanaKarkhanaFilter = "all";
var currentPassbookBanaItem = "";

/**
 * 1. Bana Module kholne ka main function
 */
function openBanaModule() {
    var dView = document.getElementById("dashboard-view");
    if (dView) dView.style.display = "none";
    var bSec = document.getElementById("bana-section");
    if (bSec) bSec.style.display = "block";

    renderBanaKarkhanaTabs();
    populateBanaExistingDropdown();
    renderBanaTable();
}

/**
 * 2. Karkhana / Godam Filter Tabs render karna
 */
function renderBanaKarkhanaTabs() {
    var bar = document.getElementById("bana-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";

    var karkhanas = [];
    if (typeof getKarkhanasSafe === "function") {
        karkhanas = getKarkhanasSafe();
    } else {
        karkhanas = safeArray(getStore("karkhana_list"));
        if (!karkhanas.length) karkhanas = [{ id: "k_main", name: "Main Godown", isDefault: true }];
    }

    var allActive = (currentBanaKarkhanaFilter === "all") ? " active" : "";
    bar.innerHTML += "<button type='button' class='sheet-tab" + allActive + "' onclick='switchBanaKarkhanaTab(\"all\")'>👥 Sabhi Karkhane</button>";

    karkhanas.forEach(function(k) {
        var isMain = (k.id === "k_main" || k.isDefault);
        var icon = isMain ? "🏢 " : "🏭 ";
        var isActive = (String(currentBanaKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button type='button' class='sheet-tab" + isActive + "' onclick='switchBanaKarkhanaTab(\"" + k.id + "\")'>" + icon + k.name + "</button>";
    });
}

function switchBanaKarkhanaTab(kId) {
    currentBanaKarkhanaFilter = kId || "all";
    renderBanaKarkhanaTabs();
    populateBanaExistingDropdown();
    renderBanaTable();
}

/**
 * 3. Form Toggle aur Add New / Existing Switch
 */
function toggleBanaForm() {
    var f = document.getElementById("add-bana-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    var dInp = document.getElementById("bana-date");
    if (dInp) dInp.value = (typeof getTodayDate === "function") ? getTodayDate() : new Date().toISOString().split("T")[0];
}

function toggleBanaItemType() {
    var typeNewRadio = document.getElementById("bana-type-new");
    var isNew = typeNewRadio ? typeNewRadio.checked : false;
    var exGroup = document.getElementById("bana-existing-group");
    var newGroup = document.getElementById("bana-new-group");
    if (exGroup) exGroup.style.display = isNew ? "none" : "block";
    if (newGroup) newGroup.style.display = isNew ? "block" : "none";
}

function populateBanaExistingDropdown() {
    var sel = document.getElementById("bana-select-existing");
    if (!sel) return;
    sel.innerHTML = "";
    var list = safeArray(getStore("bana_stock"));
    var unique = [];
    list.forEach(function(b) {
        if (b && b.name && unique.indexOf(b.name.trim().toLowerCase()) === -1) {
            unique.push(b.name.trim().toLowerCase());
            var opt = document.createElement("option");
            opt.value = b.name.trim();
            opt.textContent = b.name.trim();
            sel.appendChild(opt);
        }
    });
}

/**
 * 4. Naya Bana Khareed / Inward Jama Karna
 */
function saveNewBana() {
    var typeNewRadio = document.getElementById("bana-type-new");
    var isNew = typeNewRadio ? typeNewRadio.checked : false;

    var nameInp = isNew ? document.getElementById("bana-new-name") : document.getElementById("bana-select-existing");
    var name = (nameInp && nameInp.value || "").trim();

    var date = (document.getElementById("bana-date") && document.getElementById("bana-date").value) || 
               (typeof getTodayDate === "function" ? getTodayDate() : new Date().toISOString().split("T")[0]);
    var qtyInp = document.getElementById("bana-aaya");
    var qty = (qtyInp && parseFloat(qtyInp.value)) || 0;

    if (!name) return alert("Bana Item ka naam zaroori hai!");
    if (qty <= 0) return alert("Wazan (Qty) daalein!");

    // Target Godam: Agar 'all' chuna hai to default Main Godown me jayega
    var targetKid = (currentBanaKarkhanaFilter !== "all") ? currentBanaKarkhanaFilter : "k_main";
    var list = safeArray(getStore("bana_stock"));
    
    var item = list.find(function(x) { 
        var matchKid = (!x.karkhanaId && targetKid === "k_main") || String(x.karkhanaId) === String(targetKid);
        return x && x.name && x.name.toLowerCase() === name.toLowerCase() && matchKid; 
    });

    if (item) {
        item.aaya = Number(((Number(item.aaya) || 0) + qty).toFixed(2));
        item.bacha = Number(((Number(item.aaya) || 0) - (Number(item.gaya) || 0)).toFixed(2));
        item.date = date;
    } else {
        list.push({
            id: "bana_" + Date.now(),
            date: date,
            name: name,
            aaya: qty,
            gaya: 0,
            bacha: qty,
            karkhanaId: targetKid,
            timestamp: Date.now()
        });
    }
    setStore("bana_stock", list);

    var hist = safeArray(getStore("bana_history"));
    hist.push({
        id: "bhist_" + Date.now(),
        date: date,
        name: name,
        kariger: "Godown Purchase",
        type: "Khareed (Inward)",
        aaya: qty,
        gaya: 0,
        karkhanaId: targetKid,
        timestamp: Date.now()
    });
    setStore("bana_history", hist);

    if (document.getElementById("bana-new-name")) document.getElementById("bana-new-name").value = "";
    if (document.getElementById("bana-aaya")) document.getElementById("bana-aaya").value = "";
    toggleBanaForm();
    populateBanaExistingDropdown();
    renderBanaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + qty + " Kg Bana Stock me jama ho gaya!");
}

function filterBana() {
    renderBanaTable();
}

/**
 * 5. Bana Table Render Karna (With Transfer Button & Live Calculation)
 */
function renderBanaTable() {
    var tbody = document.getElementById("bana-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var rawStock = safeArray(getStore("bana_stock"));
    var uniqueNames = [];

    // Distinct Item Names collect karna
    rawStock.forEach(function(b) {
        if (!b || !b.name) return;
        var n = b.name.trim();
        if (uniqueNames.map(function(x) { return x.toLowerCase(); }).indexOf(n.toLowerCase()) === -1) {
            uniqueNames.push(n);
        }
    });

    var rows = [];
    uniqueNames.forEach(function(name) {
        if (typeof getBanaItemStats === "function") {
            var stats = getBanaItemStats(name, currentBanaKarkhanaFilter);
            if (stats.aaya > 0 || stats.gaya > 0 || stats.bacha > 0) {
                rows.push(stats);
            }
        }
    });

    // Search filter
    var txt = (document.getElementById("search-bana-input") && document.getElementById("search-bana-input").value || "").toLowerCase().trim();
    if (txt) {
        rows = rows.filter(function(r) {
            return (String(r.name || "") + " " + String(r.date || "")).toLowerCase().indexOf(txt) !== -1;
        });
    }

    var totalBacha = 0;
    if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Koi Bana Stock nahi mila.</td></tr>";
    } else {
        rows.forEach(function(b) {
            var bacha = Number(b.bacha || 0);
            totalBacha += bacha;

            var safeName = encodeURIComponent(b.name);

            // Transfer button (agar stock bacha ho)
            var transferBtn = "";
            if (bacha > 0) {
                transferBtn = "<button type='button' class='sheet-btn' style='background:#f59e0b; color:#ffffff; padding:4px 9px; font-weight:bold; margin-left:6px; border-radius:4px; border:none; cursor:pointer;' " +
                              "onclick='openBanaTransferModal(\"" + safeName + "\", " + bacha + ")'>🚚 Bhejo</button>";
            }

            tbody.innerHTML += "<tr>" +
                "<td>" + (b.date || "-") + "</td>" +
                "<td><strong style='color:#1e3a8a;'>" + b.name + "</strong></td>" +
                "<td style='color:#059669; font-weight:700;'>+" + Number(b.aaya || 0).toFixed(2) + "</td>" +
                "<td style='color:#ea580c; font-weight:700;'>-" + Number(b.gaya || 0).toFixed(2) + "</td>" +
                "<td style='font-weight:800; color:#1e3a8a; background:#eff6ff; font-size:14px;'>" + bacha.toFixed(2) + " Kg</td>" +
                "<td style='text-align:center; white-space:nowrap;'>" +
                    "<button type='button' class='sheet-btn' style='background:#059669; padding:4px 10px; font-weight:bold; border-radius:4px; border:none; color:white; cursor:pointer;' onclick='openBanaPassbook(\"" + safeName + "\")'>📖 Passbook</button>" +
                    transferBtn +
                "</td>" +
            "</tr>";
        });
    }

    var opVal = document.getElementById("bana-opening-val");
    if (opVal) opVal.textContent = totalBacha.toFixed(2) + " Kg Kul Bacha";
}

/**
 * 🌟 6. BANA TRANSFER MODAL POPUP
 * Main Godam se Branch karkhana Bana bhejne ke liye
 */
function openBanaTransferModal(safeName, availableBacha) {
    var itemName = decodeURIComponent(safeName);

    var existingModal = document.getElementById("bana-transfer-popup-modal");
    if (existingModal) existingModal.remove();

    var karkhanas = (typeof getKarkhanasSafe === "function") ? getKarkhanasSafe() : safeArray(getStore("karkhana_list"));
    var currentKid = (currentBanaKarkhanaFilter !== "all") ? currentBanaKarkhanaFilter : "k_main";
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
        "<div id='bana-transfer-popup-modal' style='position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:99999; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box;'>" +
            "<div style='background:#ffffff; width:100%; max-width:460px; border-radius:12px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.2); overflow:hidden;'>" +
                
                "<div style='background:#059669; color:#ffffff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;'>" +
                    "<h3 style='margin:0; font-size:16px;'>🚚 Bana Stock Transfer</h3>" +
                    "<button type='button' onclick='closeBanaTransferModal()' style='background:transparent; border:none; color:#ffffff; font-size:22px; cursor:pointer;'>&times;</button>" +
                "</div>" +

                "<div style='padding:16px;'>" +
                    "<div style='background:#ecfdf5; border:1px solid #d1fae5; border-radius:8px; padding:10px; margin-bottom:12px; font-size:13px;'>" +
                        "<div><strong>Bana Item:</strong> " + itemName + "</div>" +
                        "<div><strong>Bhejne Wala Godam:</strong> " + currentGodamName + "</div>" +
                        "<div style='color:#059669; font-weight:bold; font-size:14px; margin-top:4px;'>Maujooda Bacha Wazan: " + availableBacha.toFixed(2) + " Kg</div>" +
                    "</div>" +

                    "<div style='margin-bottom:12px;'>" +
                        "<label style='font-size:12px; font-weight:700; color:#374151;'>Kahan Bhejna Hai (Destination Godam):</label><br>" +
                        "<select id='bana-dest-godam' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px;'>" +
                            godownOptions +
                        "</select>" +
                    "</div>" +

                    "<div style='display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;'>" +
                        "<div>" +
                            "<label style='font-size:12px; font-weight:700; color:#374151;'>Kitna Wazan (Kg):</label><br>" +
                            "<input type='number' step='0.01' id='bana-transfer-qty' max='" + availableBacha + "' min='0.01' value='" + availableBacha + "' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; font-weight:bold; box-sizing:border-box;'>" +
                        "</div>" +
                        "<div>" +
                            "<label style='font-size:12px; font-weight:700; color:#374151;'>Tarikh:</label><br>" +
                            "<input type='date' id='bana-transfer-date' value='" + today + "' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;'>" +
                        "</div>" +
                    "</div>" +

                    "<div style='margin-bottom:14px;'>" +
                        "<label style='font-size:12px; font-weight:700; color:#374151;'>Note / Parchi No. (Optional):</label><br>" +
                        "<input type='text' id='bana-transfer-note' placeholder='e.g. Mau unit ke liye raw material bheja' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;'>" +
                    "</div>" +

                    "<button type='button' onclick='submitBanaTransferForm(\"" + safeName + "\", \"" + currentKid + "\", " + availableBacha + ")' style='background:#059669; color:#ffffff; border:none; width:100%; padding:10px; border-radius:6px; font-weight:bold; font-size:14px; cursor:pointer;'>" +
                        "🚀 Bana Transfer Confirm Karein" +
                    "</button>" +

                "</div>" +
            "</div>" +
        "</div>";

    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function closeBanaTransferModal() {
    var modal = document.getElementById("bana-transfer-popup-modal");
    if (modal) modal.remove();
}

function submitBanaTransferForm(safeName, fromKid, maxAvailable) {
    var itemName = decodeURIComponent(safeName);
    var toKid = document.getElementById("bana-dest-godam").value;
    var qty = parseFloat(document.getElementById("bana-transfer-qty").value) || 0;
    var d = document.getElementById("bana-transfer-date").value || (typeof getTodayDate === "function" ? getTodayDate() : "");
    var note = (document.getElementById("bana-transfer-note").value || "").trim();

    if (!toKid) return alert("Kripya Paane wala Godam chunein!");
    if (qty <= 0) return alert("Kripya sahi wazan (Kg) bharein!");
    if (qty > maxAvailable) return alert("Aapke paas sirf " + maxAvailable.toFixed(2) + " Kg bachi hai!");

    var success = false;
    if (typeof transferBanaStock === "function") {
        success = transferBanaStock(d, itemName, fromKid, toKid, qty, note);
    }

    if (success) {
        closeBanaTransferModal();
        renderBanaTable();
        alert("✅ " + qty.toFixed(2) + " Kg Bana safalta-poorvak transfer ho gaya!");
    }
}

/**
 * 7. Bana Passbook Engine
 */
function openBanaPassbook(safeName) {
    currentPassbookBanaItem = decodeURIComponent(safeName);
    var modal = document.getElementById("item-modal");
    if (!modal) return;

    var title = document.getElementById("modal-item-title");
    if (title) title.textContent = "📖 Bana Passbook: " + currentPassbookBanaItem;

    var modalBody = modal.querySelector(".modal-body");
    if (modalBody) {
        modalBody.innerHTML = 
            "<div style='background:#f8fafc; border:1px solid #cbd5e1; padding:12px; border-radius:10px; margin-bottom:12px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between;'>" +
                "<div style='display:flex; gap:8px; align-items:center; flex-wrap:wrap;'>" +
                    "<div><label style='font-size:12px; font-weight:700;'>From Date:</label><br><input type='date' id='pass-from-date' onchange='renderBanaPassbookRows()'></div>" +
                    "<div><label style='font-size:12px; font-weight:700;'>To Date:</label><br><input type='date' id='pass-to-date' onchange='renderBanaPassbookRows()'></div>" +
                    "<div style='align-self:flex-end;'><button type='button' class='quick-btn btn-out' onclick='resetPassbookFilters()'>Reset</button></div>" +
                "</div>" +
                "<div style='flex:1; min-width:200px;'>" +
                    "<label style='font-size:12px; font-weight:700;'>🔍 Search Any Column:</label><br>" +
                    "<input type='text' id='pass-search-input' class='search-box' placeholder='Search Date, Kariger, Qty...' oninput='renderBanaPassbookRows()'>" +
                "</div>" +
            "</div>" +
            "<div class='table-responsive'>" +
                "<table>" +
                    "<thead>" +
                        "<tr style='background:#059669; color:white; font-size:12px;'>" +
                            "<th>TARIKH</th><th>DETAIL (TYPE)</th><th>KARIGER / SOURCE</th><th>AAYA (Kg)</th><th>GAYA (Kg)</th><th>ACTION</th>" +
                        "</tr>" +
                    "</thead>" +
                    "<tbody id='passbook-table-body'></tbody>" +
                "</table>" +
            "</div>";
    }

    modal.style.display = "flex";
    renderBanaPassbookRows();
}

function resetPassbookFilters() {
    var fDate = document.getElementById("pass-from-date");
    var tDate = document.getElementById("pass-to-date");
    var sInp = document.getElementById("pass-search-input");
    if (fDate) fDate.value = "";
    if (tDate) tDate.value = "";
    if (sInp) sInp.value = "";
    renderBanaPassbookRows();
}

function renderBanaPassbookRows() {
    var tbody = document.getElementById("passbook-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var hist = safeArray(getStore("bana_history")).filter(function(x) {
        if (!x || !x.name) return false;
        var nameMatch = x.name.toLowerCase() === currentPassbookBanaItem.toLowerCase();
        if (!nameMatch) return false;

        if (currentBanaKarkhanaFilter !== "all") {
            var rowKid = x.karkhanaId || "k_main";
            return String(rowKid) === String(currentBanaKarkhanaFilter);
        }
        return true;
    });

    var fDateInp = document.getElementById("pass-from-date");
    var tDateInp = document.getElementById("pass-to-date");
    var sTxtInp = document.getElementById("pass-search-input");

    var fDate = fDateInp ? fDateInp.value : "";
    var tDate = tDateInp ? tDateInp.value : "";
    var sTxt = (sTxtInp && sTxtInp.value || "").toLowerCase().trim();

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
        var aayaQty = Number(r.aaya || r.qty || 0);
        var gayaQty = Number(r.gaya || 0);

        var isAutoLogged = r.refId || (r.type && r.type.toLowerCase().indexOf("kariger") !== -1) || (r.type && r.type.toLowerCase().indexOf("transfer") !== -1);
        var isOpeningEntry = r.isOpening || (r.type && r.type.toLowerCase().indexOf("opening") !== -1);

        var karigerDisplay = isOpeningEntry 
            ? "📦 31st March Closing (Opening)" 
            : ((r.kariger && r.kariger !== "-" && r.kariger !== "undefined") ? ("👤 " + r.kariger) : "📦 Factory Inward");

        var actBtn = (isAutoLogged || isOpeningEntry) 
            ? "<span style='color:#64748b; font-size:11px; font-weight:700;'>🔒 Auto Logged</span>"
            : ("<button type='button' class='delete-btn' onclick='deleteBanaPurchase(\"" + r.id + "\", " + aayaQty + ")'>🗑️ Delete</button>");

        tbody.innerHTML += "<tr>" +
            "<td>" + (r.date || "-") + "</td>" +
            "<td><strong>" + (r.type || "Godam Inward") + "</strong></td>" +
            "<td style='color:#1e3a8a; font-weight:700;'>" + karigerDisplay + "</td>" +
            "<td style='color:#059669; font-weight:700;'>" + (aayaQty > 0 ? ("+" + aayaQty.toFixed(2)) : "-") + "</td>" +
            "<td style='color:#ea580c; font-weight:700;'>" + (gayaQty > 0 ? ("-" + gayaQty.toFixed(2)) : "-") + "</td>" +
            "<td style='text-align:center;'>" + actBtn + "</td>" +
        "</tr>";
    });
}

function deleteBanaPurchase(histId, qty) {
    if (!confirm("Kya aap is Khareed entry ko delete karna chahte hain?\nStock se " + qty + " Kg wazan minus ho jayega.")) return;

    var hist = safeArray(getStore("bana_history")).filter(function(x) { return String(x.id) !== String(histId); });
    setStore("bana_history", hist);

    var list = safeArray(getStore("bana_stock"));
    var item = list.find(function(x) { return x && x.name && x.name.toLowerCase() === currentPassbookBanaItem.toLowerCase(); });
    if (item) {
        item.aaya = Math.max(0, Number(((Number(item.aaya) || 0) - qty).toFixed(2)));
        item.bacha = Number(((Number(item.aaya) || 0) - (Number(item.gaya) || 0)).toFixed(2));
        setStore("bana_stock", list);
    }

    renderBanaPassbookRows();
    renderBanaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("🗑️ Khareed entry delete ho gayi aur Stock adjust ho gaya!");
}
