/* ========================================================
   SIMPLICITY ERP - ZARI STOCK & PASSBOOK ENGINE
   File: zari/zari-ui.js • Developed by Farhan Jawed
   (Multi-Godam Stock, Edit/Delete Transfer & Purchases, Safe Kariger Lock)
======================================================== */

var currentZariKarkhanaFilter = "all";
var currentPassbookZariItem = "";

/**
 * 1. Zari Module kholne ka main function
 */
function openZariModule() {
    var dView = document.getElementById("dashboard-view");
    if (dView) dView.style.display = "none";
    var zSec = document.getElementById("zari-section");
    if (zSec) zSec.style.display = "block";

    renderZariKarkhanaTabs();
    populateZariExistingDropdown();
    renderZariTable();
}

/**
 * 2. Karkhana / Godam Filter Tabs render karna
 */
function renderZariKarkhanaTabs() {
    var bar = document.getElementById("zari-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";

    var karkhanas = [];
    if (typeof getKarkhanasSafe === "function") {
        karkhanas = getKarkhanasSafe();
    } else {
        karkhanas = safeArray(getStore("karkhana_list"));
        if (!karkhanas.length) karkhanas = [{ id: "k_main", name: "Main Godown", isDefault: true }];
    }

    var allActive = (currentZariKarkhanaFilter === "all") ? " active" : "";
    bar.innerHTML += "<button type='button' class='sheet-tab" + allActive + "' onclick='switchZariKarkhanaTab(\"all\")'>👥 Sabhi Karkhane</button>";

    karkhanas.forEach(function(k) {
        var isMain = (k.id === "k_main" || k.isDefault);
        var icon = isMain ? "🏢 " : "🏭 ";
        var isActive = (String(currentZariKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button type='button' class='sheet-tab" + isActive + "' onclick='switchZariKarkhanaTab(\"" + k.id + "\")'>" + icon + k.name + "</button>";
    });
}

function switchZariKarkhanaTab(kId) {
    currentZariKarkhanaFilter = kId || "all";
    renderZariKarkhanaTabs();
    populateZariExistingDropdown();
    renderZariTable();
}

/**
 * 3. Form Toggle aur Add New / Existing Switch
 */
function toggleZariForm() {
    var f = document.getElementById("add-zari-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    var dInp = document.getElementById("zari-date");
    if (dInp) dInp.value = (typeof getTodayDate === "function") ? getTodayDate() : new Date().toISOString().split("T")[0];
}

function toggleZariItemType() {
    var isNew = document.getElementById("zari-type-new") ? document.getElementById("zari-type-new").checked : true;
    var exGroup = document.getElementById("zari-existing-group");
    var newGroup = document.getElementById("zari-new-group");
    if (exGroup) exGroup.style.display = isNew ? "none" : "block";
    if (newGroup) newGroup.style.display = isNew ? "block" : "none";
}

function populateZariExistingDropdown() {
    var sel = document.getElementById("zari-select-existing");
    if (!sel) return;
    sel.innerHTML = "";
    var list = safeArray(getStore("zari_stock"));
    var unique = [];
    list.forEach(function(z) {
        if (z && z.name && unique.indexOf(z.name.trim().toLowerCase()) === -1) {
            unique.push(z.name.trim().toLowerCase());
            var opt = document.createElement("option");
            opt.value = z.name.trim();
            opt.textContent = z.name.trim();
            sel.appendChild(opt);
        }
    });
}

/**
 * 4. Nayi Zari Khareed / Inward Jama Karna
 */
function saveNewZari() {
    var isNew = document.getElementById("zari-type-new") ? document.getElementById("zari-type-new").checked : true;
    var name = isNew 
        ? (document.getElementById("zari-new-name") ? document.getElementById("zari-new-name").value : "").trim() 
        : (document.getElementById("zari-select-existing") ? document.getElementById("zari-select-existing").value : "").trim();

    var date = (document.getElementById("zari-date") && document.getElementById("zari-date").value) || 
               (typeof getTodayDate === "function" ? getTodayDate() : new Date().toISOString().split("T")[0]);
    var qty = parseFloat(document.getElementById("zari-aaya") ? document.getElementById("zari-aaya").value : 0) || 0;

    if (!name) return alert("Zari Item ka naam zaroori hai!");
    if (qty <= 0) return alert("Wazan (Qty) daalein!");

    var targetKid = (currentZariKarkhanaFilter !== "all") ? currentZariKarkhanaFilter : "k_main";
    var list = safeArray(getStore("zari_stock"));
    
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
            id: "zari_" + Date.now(),
            date: date,
            name: name,
            aaya: qty,
            gaya: 0,
            bacha: qty,
            karkhanaId: targetKid,
            timestamp: Date.now()
        });
    }
    setStore("zari_stock", list);

    var hist = safeArray(getStore("zari_history"));
    hist.push({
        id: "zhist_" + Date.now(),
        date: date,
        name: name,
        kariger: "Godown Purchase",
        type: "Khareed (Inward)",
        aaya: qty,
        gaya: 0,
        karkhanaId: targetKid,
        timestamp: Date.now()
    });
    setStore("zari_history", hist);

    if (document.getElementById("zari-new-name")) document.getElementById("zari-new-name").value = "";
    if (document.getElementById("zari-aaya")) document.getElementById("zari-aaya").value = "";
    toggleZariForm();
    populateZariExistingDropdown();
    renderZariTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + qty + " Kg Zari Stock me jama ho gayi!");
}

function filterZari() {
    renderZariTable();
}

/**
 * 5. Zari Table Render Karna
 */
function renderZariTable() {
    var tbody = document.getElementById("zari-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var rawStock = safeArray(getStore("zari_stock"));
    var uniqueNames = [];

    rawStock.forEach(function(z) {
        if (!z || !z.name) return;
        var n = z.name.trim();
        if (uniqueNames.map(function(x) { return x.toLowerCase(); }).indexOf(n.toLowerCase()) === -1) {
            uniqueNames.push(n);
        }
    });

    var rows = [];
    uniqueNames.forEach(function(name) {
        if (typeof getZariItemStats === "function") {
            var stats = getZariItemStats(name, currentZariKarkhanaFilter);
            if (stats.aaya > 0 || stats.gaya > 0 || stats.bacha > 0) {
                rows.push(stats);
            }
        }
    });

    var txt = (document.getElementById("search-zari-input") && document.getElementById("search-zari-input").value || "").toLowerCase().trim();
    if (txt) {
        rows = rows.filter(function(r) {
            return (String(r.name || "") + " " + String(r.date || "")).toLowerCase().indexOf(txt) !== -1;
        });
    }

    var totalBacha = 0;
    if (!rows.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Koi Zari Stock nahi mila.</td></tr>";
    } else {
        rows.forEach(function(z) {
            var bacha = Number(z.bacha || 0);
            totalBacha += bacha;

            var safeName = encodeURIComponent(z.name);

            var transferBtn = "";
            if (bacha > 0) {
                transferBtn = "<button type='button' class='sheet-btn' style='background:#f59e0b; color:#ffffff; padding:4px 9px; font-weight:bold; margin-left:6px; border-radius:4px; border:none; cursor:pointer;' " +
                              "onclick='openZariTransferModal(\"" + safeName + "\", " + bacha + ")'>🚚 Bhejo</button>";
            }

            tbody.innerHTML += "<tr>" +
                "<td>" + (z.date || "-") + "</td>" +
                "<td><strong style='color:#1e3a8a;'>" + z.name + "</strong></td>" +
                "<td style='color:#059669; font-weight:700;'>+" + Number(z.aaya || 0).toFixed(2) + "</td>" +
                "<td style='color:#ea580c; font-weight:700;'>-" + Number(z.gaya || 0).toFixed(2) + "</td>" +
                "<td style='font-weight:800; color:#1e3a8a; background:#eff6ff; font-size:14px;'>" + bacha.toFixed(2) + " Kg</td>" +
                "<td style='text-align:center; white-space:nowrap;'>" +
                    "<button type='button' class='sheet-btn' style='background:#ea580c; padding:4px 10px; font-weight:bold; border-radius:4px; border:none; color:white; cursor:pointer;' onclick='openZariPassbook(\"" + safeName + "\")'>📖 Passbook</button>" +
                    transferBtn +
                "</td>" +
            "</tr>";
        });
    }

    var opVal = document.getElementById("zari-opening-val");
    if (opVal) opVal.textContent = totalBacha.toFixed(2) + " Kg Kul Bachi";
}

/**
 * 6. Zari Transfer Modal Popup
 */
function openZariTransferModal(safeName, availableBacha) {
    var itemName = decodeURIComponent(safeName);

    var existingModal = document.getElementById("zari-transfer-popup-modal");
    if (existingModal) existingModal.remove();

    var karkhanas = (typeof getKarkhanasSafe === "function") ? getKarkhanasSafe() : safeArray(getStore("karkhana_list"));
    var currentKid = (currentZariKarkhanaFilter !== "all") ? currentZariKarkhanaFilter : "k_main";
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
        "<div id='zari-transfer-popup-modal' style='position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:99999; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box;'>" +
            "<div style='background:#ffffff; width:100%; max-width:460px; border-radius:12px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.2); overflow:hidden;'>" +
                "<div style='background:#ea580c; color:#ffffff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;'>" +
                    "<h3 style='margin:0; font-size:16px;'>🚚 Zari Stock Transfer</h3>" +
                    "<button type='button' onclick='closeZariTransferModal()' style='background:transparent; border:none; color:#ffffff; font-size:22px; cursor:pointer;'>&times;</button>" +
                "</div>" +
                "<div style='padding:16px;'>" +
                    "<div style='background:#fff7ed; border:1px solid #ffedd5; border-radius:8px; padding:10px; margin-bottom:12px; font-size:13px;'>" +
                        "<div><strong>Zari Item:</strong> " + itemName + "</div>" +
                        "<div><strong>Bhejne Wala Godam:</strong> " + currentGodamName + "</div>" +
                        "<div style='color:#ea580c; font-weight:bold; font-size:14px; margin-top:4px;'>Maujooda Bacha Wazan: " + availableBacha.toFixed(2) + " Kg</div>" +
                    "</div>" +
                    "<div style='margin-bottom:12px;'>" +
                        "<label style='font-size:12px; font-weight:700; color:#374151;'>Kahan Bhejna Hai (Destination Godam):</label><br>" +
                        "<select id='zari-dest-godam' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px;'>" +
                            godownOptions +
                        "</select>" +
                    "</div>" +
                    "<div style='display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;'>" +
                        "<div>" +
                            "<label style='font-size:12px; font-weight:700; color:#374151;'>Kitna Wazan (Kg):</label><br>" +
                            "<input type='number' step='0.01' id='zari-transfer-qty' max='" + availableBacha + "' min='0.01' value='" + availableBacha + "' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; font-weight:bold; box-sizing:border-box;'>" +
                        "</div>" +
                        "<div>" +
                            "<label style='font-size:12px; font-weight:700; color:#374151;'>Tarikh:</label><br>" +
                            "<input type='date' id='zari-transfer-date' value='" + today + "' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;'>" +
                        "</div>" +
                    "</div>" +
                    "<div style='margin-bottom:14px;'>" +
                        "<label style='font-size:12px; font-weight:700; color:#374151;'>Note / Parchi No. (Optional):</label><br>" +
                        "<input type='text' id='zari-transfer-note' placeholder='e.g. Mubarakpur unit ke liye bheja' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;'>" +
                    "</div>" +
                    "<button type='button' onclick='submitZariTransferForm(\"" + safeName + "\", \"" + currentKid + "\", " + availableBacha + ")' style='background:#ea580c; color:#ffffff; border:none; width:100%; padding:10px; border-radius:6px; font-weight:bold; font-size:14px; cursor:pointer;'>" +
                        "🚀 Zari Transfer Confirm Karein" +
                    "</button>" +
                "</div>" +
            "</div>" +
        "</div>";

    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function closeZariTransferModal() {
    var modal = document.getElementById("zari-transfer-popup-modal");
    if (modal) modal.remove();
}

function submitZariTransferForm(safeName, fromKid, maxAvailable) {
    var itemName = decodeURIComponent(safeName);
    var toKid = document.getElementById("zari-dest-godam").value;
    var qty = parseFloat(document.getElementById("zari-transfer-qty").value) || 0;
    var d = document.getElementById("zari-transfer-date").value || (typeof getTodayDate === "function" ? getTodayDate() : "");
    var note = (document.getElementById("zari-transfer-note").value || "").trim();

    if (!toKid) return alert("Kripya Paane wala Godam chunein!");
    if (qty <= 0) return alert("Kripya sahi wazan (Kg) bharein!");
    if (qty > maxAvailable) return alert("Aapke paas sirf " + maxAvailable.toFixed(2) + " Kg bachi hai!");

    var success = false;
    if (typeof transferZariStock === "function") {
        success = transferZariStock(d, itemName, fromKid, toKid, qty, note);
    }

    if (success) {
        closeZariTransferModal();
        renderZariTable();
        alert("✅ " + qty.toFixed(2) + " Kg Zari safalta-poorvak transfer ho gayi!");
    }
}

/**
 * 🌟 7. ZARI PASSBOOK ENGINE (With Live Edit & Delete + Kariger Lock Protection)
 */
function openZariPassbook(safeName) {
    currentPassbookZariItem = decodeURIComponent(safeName);
    var modal = document.getElementById("item-modal");
    if (!modal) return;

    var title = document.getElementById("modal-item-title");
    if (title) title.textContent = "📖 Zari Passbook: " + currentPassbookZariItem;

    var modalBody = modal.querySelector(".modal-body");
    if (modalBody) {
        modalBody.innerHTML = 
            "<div style='background:#f8fafc; border:1px solid #cbd5e1; padding:12px; border-radius:10px; margin-bottom:12px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between;'>" +
                "<div style='display:flex; gap:8px; align-items:center; flex-wrap:wrap;'>" +
                    "<div><label style='font-size:12px; font-weight:700;'>From Date:</label><br><input type='date' id='zari-pass-from-date' onchange='renderZariPassbookRows()'></div>" +
                    "<div><label style='font-size:12px; font-weight:700;'>To Date:</label><br><input type='date' id='zari-pass-to-date' onchange='renderZariPassbookRows()'></div>" +
                    "<div style='align-self:flex-end;'><button type='button' class='quick-btn btn-out' onclick='resetZariPassbookFilters()'>Reset</button></div>" +
                "</div>" +
                "<div style='flex:1; min-width:200px;'>" +
                    "<label style='font-size:12px; font-weight:700;'>🔍 Search Any Column:</label><br>" +
                    "<input type='text' id='zari-pass-search-input' class='search-box' placeholder='Search Date, Kariger, Qty...' oninput='renderZariPassbookRows()'>" +
                "</div>" +
            "</div>" +
            "<div class='table-responsive'>" +
                "<table>" +
                    "<thead>" +
                        "<tr style='background:#ea580c; color:white; font-size:12px;'>" +
                            "<th>TARIKH</th><th>DETAIL (TYPE)</th><th>KARIGER / SOURCE</th><th>AAYI (Kg)</th><th>GAYI (Kg)</th><th style='text-align:center;'>ACTIONS</th>" +
                        "</tr>" +
                    "</thead>" +
                    "<tbody id='zari-passbook-table-body'></tbody>" +
                "</table>" +
            "</div>";
    }

    modal.style.display = "flex";
    renderZariPassbookRows();
}

function resetZariPassbookFilters() {
    var fDate = document.getElementById("zari-pass-from-date");
    var tDate = document.getElementById("zari-pass-to-date");
    var sInp = document.getElementById("zari-pass-search-input");
    if (fDate) fDate.value = "";
    if (tDate) tDate.value = "";
    if (sInp) sInp.value = "";
    renderZariPassbookRows();
}

function renderZariPassbookRows() {
    var tbody = document.getElementById("zari-passbook-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var hist = safeArray(getStore("zari_history")).filter(function(x) {
        if (!x || !x.name) return false;
        var nameMatch = x.name.toLowerCase() === currentPassbookZariItem.toLowerCase();
        if (!nameMatch) return false;

        if (currentZariKarkhanaFilter !== "all") {
            var rowKid = x.karkhanaId || "k_main";
            return String(rowKid) === String(currentZariKarkhanaFilter);
        }
        return true;
    });

    var fDate = document.getElementById("zari-pass-from-date") ? document.getElementById("zari-pass-from-date").value : "";
    var tDate = document.getElementById("zari-pass-to-date") ? document.getElementById("zari-pass-to-date").value : "";
    var sTxt = (document.getElementById("zari-pass-search-input") ? document.getElementById("zari-pass-search-input").value : "").toLowerCase().trim();

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

        var isOpeningEntry = r.isOpening || (r.type && r.type.toLowerCase().indexOf("opening") !== -1);
        var isKarigerEntry = (r.type && r.type.toLowerCase().indexOf("kariger") !== -1) || (r.kariger && r.kariger.toLowerCase().indexOf("kariger sheet") !== -1);
        var isTransfer = (r.refId && String(r.refId).indexOf("tr_zari") !== -1) || (r.type && r.type.toLowerCase().indexOf("transfer") !== -1);

        var karigerDisplay = isOpeningEntry 
            ? "📦 31st March Closing (Opening)" 
            : ((r.kariger && r.kariger !== "-" && r.kariger !== "undefined") ? ("👤 " + r.kariger) : "📦 Factory Inward");

        var actBtn = "";

        // 🔒 Kariger Sheet aur Opening Stock ko Chhedne se Rokna
        if (isOpeningEntry) {
            actBtn = "<span style='color:#64748b; font-size:11px; font-weight:700;'>🔒 Opening Lock</span>";
        } else if (isKarigerEntry) {
            actBtn = "<span style='color:#64748b; font-size:11px; font-weight:700;'>🔒 Kariger Sheet</span>";
        } else {
            // ✏️ Edit aur 🗑️ Delete Option: Khareed (Purchase) aur Godam Transfer ke liye
            actBtn = 
                "<div style='display:flex; gap:6px; justify-content:center; align-items:center;'>" +
                    "<button type='button' class='sheet-btn' style='background:#3b82f6; color:#ffffff; padding:4px 8px; font-size:11px; font-weight:bold; border-radius:4px; border:none; cursor:pointer;' onclick='openZariEditModal(\"" + r.id + "\")'>✏️ Edit</button>" +
                    "<button type='button' class='sheet-btn' style='background:#ef4444; color:#ffffff; padding:4px 8px; font-size:11px; font-weight:bold; border-radius:4px; border:none; cursor:pointer;' onclick='deleteZariHistoryEntry(\"" + r.id + "\")'>🗑️ Del</button>" +
                "</div>";
        }

        tbody.innerHTML += "<tr>" +
            "<td>" + (r.date || "-") + "</td>" +
            "<td><strong>" + (r.type || "Godam Inward") + "</strong></td>" +
            "<td style='color:#1e3a8a; font-weight:700;'>" + karigerDisplay + "</td>" +
            "<td style='color:#059669; font-weight:700;'>" + (aayaQty > 0 ? ("+" + aayaQty.toFixed(2)) : "-") + "</td>" +
            "<td style='color:#ea580c; font-weight:700;'>-" + (gayaQty > 0 ? ("-" + gayaQty.toFixed(2)) : "-") + "</td>" +
            "<td style='text-align:center; white-space:nowrap;'>" + actBtn + "</td>" +
        "</tr>";
    });
}

/**
 * 🌟 8. ZARI PASSBOOK DELETE ENGINE (Transfers & Purchases Safe Delete)
 */
function deleteZariHistoryEntry(histId) {
    if (!confirm("Kya aap sach me ye entry DELETE karna chahte hain?\nStock balance wapas sahi settle ho jayega.")) return;

    var hist = safeArray(getStore("zari_history"));
    var entry = hist.find(function(x) { return x && String(x.id) === String(histId); });
    if (!entry) return alert("Entry nahi mili!");

    var isTransfer = (entry.refId && String(entry.refId).indexOf("tr_zari") !== -1) || (entry.type && entry.type.toLowerCase().indexOf("transfer") !== -1);
    var isPurchase = !isTransfer && (entry.type && (entry.type.toLowerCase().indexOf("khareed") !== -1 || entry.type.toLowerCase().indexOf("inward") !== -1));

    // 1. Agar Transfer Entry hai toh dono godamo ke paired records delete honge aur material_transfers bhi update hoga
    if (isTransfer && entry.refId) {
        hist = hist.filter(function(x) { return x.refId !== entry.refId; });
        var transfers = safeArray(getStore("material_transfers")).filter(function(t) { return t.id !== entry.refId; });
        setStore("material_transfers", transfers);
    } else {
        hist = hist.filter(function(x) { return String(x.id) !== String(histId); });
    }
    setStore("zari_history", hist);

    // 2. Agar Khareed entry hai toh Main Stock (zari_stock) se wazan minus karo
    if (isPurchase) {
        var qty = Number(entry.aaya || entry.qty || 0);
        var list = safeArray(getStore("zari_stock"));
        var targetKid = entry.karkhanaId || "k_main";

        var item = list.find(function(x) {
            var matchKid = (!x.karkhanaId && targetKid === "k_main") || String(x.karkhanaId) === String(targetKid);
            return x && x.name && x.name.toLowerCase() === entry.name.toLowerCase() && matchKid;
        });

        if (item) {
            item.aaya = Math.max(0, Number(((Number(item.aaya) || 0) - qty).toFixed(2)));
            item.bacha = Number(((Number(item.aaya) || 0) - (Number(item.gaya) || 0)).toFixed(2));
            setStore("zari_stock", list);
        }
    }

    renderZariPassbookRows();
    renderZariTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("🗑️ Entry safalta-poorvak delete ho gayi aur Stock settle ho gaya!");
}

/**
 * 🌟 9. ZARI PASSBOOK EDIT MODAL & SAVE ENGINE
 */
function openZariEditModal(id) {
    var hist = safeArray(getStore("zari_history"));
    var entry = hist.find(function(x) { return x && String(x.id) === String(id); });
    if (!entry) return alert("Entry nahi mili!");

    var existingModal = document.getElementById("zari-edit-popup-modal");
    if (existingModal) existingModal.remove();

    var currentQty = Number(entry.aaya || entry.gaya || entry.qty || 0);
    var isAaya = Number(entry.aaya || 0) > 0;
    var typeLabel = isAaya ? "Aaya (Inward)" : "Gaya (Outward)";

    var modalHtml = 
        "<div id='zari-edit-popup-modal' style='position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:999999; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box;'>" +
            "<div style='background:#ffffff; width:100%; max-width:420px; border-radius:12px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.3); overflow:hidden;'>" +
                "<div style='background:#ea580c; color:#ffffff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;'>" +
                    "<h3 style='margin:0; font-size:16px;'>✏️ Edit Zari Entry</h3>" +
                    "<button type='button' onclick='closeZariEditModal()' style='background:transparent; border:none; color:#ffffff; font-size:22px; cursor:pointer;'>&times;</button>" +
                "</div>" +
                "<div style='padding:16px;'>" +
                    "<div style='background:#fff7ed; padding:8px 12px; border-radius:6px; margin-bottom:12px; font-size:13px;'>" +
                        "<div><strong>Item:</strong> " + entry.name + "</div>" +
                        "<div><strong>Type:</strong> " + (entry.type || "-") + "</div>" +
                    "</div>" +
                    "<div style='margin-bottom:12px;'>" +
                        "<label style='font-size:12px; font-weight:700; color:#374151;'>Tarikh (Date):</label><br>" +
                        "<input type='date' id='zari-edit-date' value='" + (entry.date || "") + "' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px; box-sizing:border-box;'>" +
                    "</div>" +
                    "<div style='margin-bottom:12px;'>" +
                        "<label style='font-size:12px; font-weight:700; color:#374151;'>Party / Source / Note:</label><br>" +
                        "<input type='text' id='zari-edit-kariger' value='" + (entry.kariger || "") + "' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px; box-sizing:border-box;'>" +
                    "</div>" +
                    "<div style='margin-bottom:16px;'>" +
                        "<label style='font-size:12px; font-weight:700; color:#374151;'>Wazan (" + typeLabel + " Kg me):</label><br>" +
                        "<input type='number' step='0.01' id='zari-edit-qty' value='" + currentQty.toFixed(2) + "' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; font-weight:bold; margin-top:4px; box-sizing:border-box;'>" +
                    "</div>" +
                    "<button type='button' onclick='saveZariHistoryEdit(\"" + id + "\")' style='background:#ea580c; color:#ffffff; border:none; width:100%; padding:10px; border-radius:6px; font-weight:bold; font-size:14px; cursor:pointer;'>" +
                        "💾 Badlaav Safe Karein" +
                    "</button>" +
                "</div>" +
            "</div>" +
        "</div>";

    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function closeZariEditModal() {
    var modal = document.getElementById("zari-edit-popup-modal");
    if (modal) modal.remove();
}

function saveZariHistoryEdit(id) {
    var hist = safeArray(getStore("zari_history"));
    var entry = hist.find(function(x) { return x && String(x.id) === String(id); });
    if (!entry) return alert("Entry nahi mili!");

    var newDate = document.getElementById("zari-edit-date").value;
    var newKariger = (document.getElementById("zari-edit-kariger").value || "").trim();
    var newQty = parseFloat(document.getElementById("zari-edit-qty").value) || 0;

    if (newQty <= 0) return alert("Kripya sahi wazan (Kg) darj karein!");

    var oldAaya = Number(entry.aaya || 0);
    var oldGaya = Number(entry.gaya || entry.qty || 0);
    var isTransfer = (entry.refId && String(entry.refId).indexOf("tr_zari") !== -1) || (entry.type && entry.type.toLowerCase().indexOf("transfer") !== -1);
    var isPurchase = !isTransfer && (entry.type && (entry.type.toLowerCase().indexOf("khareed") !== -1 || entry.type.toLowerCase().indexOf("inward") !== -1));

    // 1. History Record Update
    entry.date = newDate;
    entry.kariger = newKariger || "Godown Purchase";

    if (oldAaya > 0) {
        var aayaDiff = newQty - oldAaya;
        entry.aaya = newQty;

        // Agar Khareed edit hui hai toh zari_stock me wazan adjust karo
        if (isPurchase) {
            var list = safeArray(getStore("zari_stock"));
            var targetKid = entry.karkhanaId || "k_main";

            var item = list.find(function(x) {
                var matchKid = (!x.karkhanaId && targetKid === "k_main") || String(x.karkhanaId) === String(targetKid);
                return x && x.name && x.name.toLowerCase() === entry.name.toLowerCase() && matchKid;
            });

            if (item) {
                item.aaya = Number(((Number(item.aaya) || 0) + aayaDiff).toFixed(2));
                item.bacha = Number(((Number(item.aaya) || 0) - (Number(item.gaya) || 0)).toFixed(2));
                setStore("zari_stock", list);
            }
        }
    } else {
        entry.gaya = newQty;
        entry.qty = newQty;
    }

    // 2. Agar Transfer entry edit hui hai toh paired destination entry aur material_transfers me bhi wahi update karo
    if (isTransfer && entry.refId) {
        var pair = hist.find(function(x) { return x && x.refId === entry.refId && String(x.id) !== String(id); });
        if (pair) {
            pair.date = newDate;
            if (pair.aaya > 0) pair.aaya = newQty;
            if (pair.gaya > 0) pair.gaya = newQty;
        }

        var transfers = safeArray(getStore("material_transfers"));
        var tr = transfers.find(function(t) { return t && t.id === entry.refId; });
        if (tr) {
            tr.date = newDate;
            tr.qty = newQty;
            tr.quantity = newQty;
            setStore("material_transfers", transfers);
        }
    }

    setStore("zari_history", hist);

    closeZariEditModal();
    renderZariPassbookRows();
    renderZariTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Zari entry safalta-poorvak update ho gayi!");
}
