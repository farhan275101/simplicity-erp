/* ========================================================
   SIMPLICITY ERP - BANA STOCK & PASSBOOK ENGINE (FIXED)
   File: bana/bana-ui.js • Developed by Farhan Jawed
======================================================== */

var currentBanaKarkhanaFilter = "all";
var currentPassbookBanaItem = "";

function openBanaModule() {
    var dView = document.getElementById("dashboard-view");
    if (dView) dView.style.display = "none";
    var bSec = document.getElementById("bana-section");
    if (bSec) bSec.style.display = "block";

    renderBanaKarkhanaTabs();
    populateBanaExistingDropdown();
    renderBanaTable();
}

function renderBanaKarkhanaTabs() {
    var bar = document.getElementById("bana-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";
    var karkhanas = safeArray(getStore("karkhana_list"));
    if (!karkhanas.length) karkhanas = [{ id: "k_main", name: "Main Godown", isDefault: true }];

    var allActive = (currentBanaKarkhanaFilter === "all") ? " active" : "";
    bar.innerHTML += "<button class='sheet-tab" + allActive + "' onclick='switchBanaKarkhanaTab(\"all\")'>👥 Sabhi Karkhane</button>";

    karkhanas.forEach(function(k) {
        var isActive = (String(currentBanaKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button class='sheet-tab" + isActive + "' onclick='switchBanaKarkhanaTab(\"" + k.id + "\")'>🏭 " + k.name + "</button>";
    });
}

function switchBanaKarkhanaTab(kId) {
    currentBanaKarkhanaFilter = kId;
    populateBanaExistingDropdown();
    renderBanaTable();
}

function toggleBanaForm() {
    var f = document.getElementById("add-bana-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    var dInp = document.getElementById("bana-date");
    if (dInp) dInp.value = getTodayDate();
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

function saveNewBana() {
    var typeNewRadio = document.getElementById("bana-type-new");
    var isNew = typeNewRadio ? typeNewRadio.checked : false;

    var nameInp = isNew ? document.getElementById("bana-new-name") : document.getElementById("bana-select-existing");
    var name = (nameInp && nameInp.value || "").trim();

    var date = (document.getElementById("bana-date") && document.getElementById("bana-date").value) || getTodayDate();
    var qtyInp = document.getElementById("bana-aaya");
    var qty = (qtyInp && parseFloat(qtyInp.value)) || 0;

    if (!name) return alert("Bana Item ka naam zaroori hai!");
    if (qty <= 0) return alert("Wazan (Qty) daalein!");

    var kId = (currentBanaKarkhanaFilter !== "all") ? currentBanaKarkhanaFilter : "k_main";
    var list = safeArray(getStore("bana_stock"));
    var item = list.find(function(x) { 
        return x && x.name && x.name.toLowerCase() === name.toLowerCase() && (String(x.karkhanaId) === String(kId) || !x.karkhanaId); 
    });

    if (item) {
        item.aaya = Number(((Number(item.aaya) || 0) + qty).toFixed(2));
        item.bacha = Number(((Number(item.aaya) || 0) - (Number(item.gaya) || 0)).toFixed(2));
    } else {
        list.push({
            id: "bana_" + Date.now(),
            date: date,
            name: name,
            aaya: qty,
            gaya: 0,
            bacha: qty,
            karkhanaId: kId
        });
    }
    setStore("bana_stock", list);

    var hist = safeArray(getStore("bana_history"));
    hist.push({
        id: "bhist_" + Date.now(),
        date: date,
        name: name,
        kariger: "-",
        type: "Khareed (Inward)",
        aaya: qty,
        gaya: 0,
        karkhanaId: kId
    });
    setStore("bana_history", hist);

    if (document.getElementById("bana-new-name")) document.getElementById("bana-new-name").value = "";
    if (document.getElementById("bana-aaya")) document.getElementById("bana-aaya").value = "";
    toggleBanaForm();
    populateBanaExistingDropdown();
    renderBanaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Bana Stock me jama ho gaya!");
}

function filterBana() {
    renderBanaTable();
}

function renderBanaTable() {
    var tbody = document.getElementById("bana-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var list = safeArray(getStore("bana_stock"));
    if (currentBanaKarkhanaFilter !== "all") {
        list = list.filter(function(b) {
            return String(b.karkhanaId) === String(currentBanaKarkhanaFilter) || (!b.karkhanaId && currentBanaKarkhanaFilter === "k_main");
        });
    }

    var txt = (document.getElementById("search-bana-input") && document.getElementById("search-bana-input").value || "").toLowerCase().trim();
    if (txt) {
        list = list.filter(function(b) {
            return (String(b.name || "") + " " + String(b.date || "")).toLowerCase().indexOf(txt) !== -1;
        });
    }

    var totalBacha = 0;
    if (!list.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:15px; color:#888;'>Koi Bana Stock nahi mila.</td></tr>";
    } else {
        list.forEach(function(b) {
            if (!b) return;
            var kid = b.karkhanaId || "k_main";

            // 🔒 SYNC WITH BANA-CALC: Always read live accurate calculation
            var stats = (typeof getBanaItemStats === "function") 
                ? getBanaItemStats(b.name, kid) 
                : { aaya: Number(b.aaya || 0), gaya: Number(b.gaya || 0), bacha: Number(b.bacha || 0) };

            var bacha = Number(stats.bacha || 0);
            totalBacha += bacha;

            tbody.innerHTML += "<tr>" +
                "<td>" + (b.date || "-") + "</td>" +
                "<td><strong>" + b.name + "</strong></td>" +
                "<td style='color:#059669; font-weight:700;'>" + Number(stats.aaya || 0).toFixed(2) + "</td>" +
                "<td style='color:#ea580c; font-weight:700;'>" + Number(stats.gaya || 0).toFixed(2) + "</td>" +
                "<td style='font-weight:800; color:#1e3a8a;'>" + bacha.toFixed(2) + " Kg</td>" +
                "<td style='text-align:center;'><button class='sheet-btn' onclick='openBanaPassbook(\"" + b.name + "\")'>📖 Passbook</button></td>" +
            "</tr>";
        });
    }

    var opVal = document.getElementById("bana-opening-val");
    if (opVal) opVal.textContent = totalBacha.toFixed(2) + " Kg Kul Bacha";
}

// ================= PASSBOOK (SEARCH, DATE FILTER, DELETE RULE) =================

function openBanaPassbook(itemName) {
    currentPassbookBanaItem = itemName;
    var modal = document.getElementById("item-modal");
    if (!modal) return;

    var title = document.getElementById("modal-item-title");
    if (title) title.textContent = "📖 Bana Passbook: " + itemName;

    var modalBody = modal.querySelector(".modal-body");
    if (modalBody) {
        modalBody.innerHTML = 
            "<div style='background:#f8fafc; border:1px solid #cbd5e1; padding:12px; border-radius:10px; margin-bottom:12px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between;'>" +
                "<div style='display:flex; gap:8px; align-items:center; flex-wrap:wrap;'>" +
                    "<div><label style='font-size:12px; font-weight:700;'>From Date:</label><br><input type='date' id='pass-from-date' onchange='renderBanaPassbookRows()'></div>" +
                    "<div><label style='font-size:12px; font-weight:700;'>To Date:</label><br><input type='date' id='pass-to-date' onchange='renderBanaPassbookRows()'></div>" +
                    "<div style='align-self:flex-end;'><button class='quick-btn btn-out' onclick='resetPassbookFilters()'>Reset</button></div>" +
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
        return x && x.name && x.name.toLowerCase() === currentPassbookBanaItem.toLowerCase();
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
            var fullRow = (String(x.date || "") + " " + String(x.type || "") + " " + String(x.kariger || "") + " " + String(x.aaya || x.qty || x.wazan || "") + " " + String(x.gaya || "")).toLowerCase();
            return fullRow.indexOf(sTxt) !== -1;
        });
    }

    if (!hist.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:15px; color:#888;'>Koi entry nahi mili.</td></tr>";
        return;
    }

    hist.forEach(function(r) {
        var aayaQty = Number(r.aaya || r.qty || r.wazan || r.weight || 0);
        var gayaQty = Number(r.gaya || 0);

        var isKarigerEntry = r.refId || (r.type && r.type.toLowerCase().indexOf("kariger") !== -1);
        var isOpeningEntry = r.isOpening || (r.type && r.type.toLowerCase().indexOf("opening") !== -1);

        var karigerDisplay = isOpeningEntry 
            ? "📦 31st March Closing (Opening)" 
            : ((r.kariger && r.kariger !== "-" && r.kariger !== "undefined") ? ("👤 " + r.kariger) : "📦 Factory Inward");

        var actBtn = (isKarigerEntry || isOpeningEntry) 
            ? "<span style='color:#64748b; font-size:11px; font-weight:700;'>🔒 Locked</span>"
            : ("<button class='delete-btn' onclick='deleteBanaPurchase(\"" + r.id + "\", " + aayaQty + ")'>🗑️ Delete</button>");

        tbody.innerHTML += "<tr>" +
            "<td>" + (r.date || "-") + "</td>" +
            "<td><strong>" + (r.type || "Godam Inward") + "</strong></td>" +
            "<td style='color:#1e3a8a; font-weight:700;'>" + karigerDisplay + "</td>" +
            "<td style='color:#059669; font-weight:700;'>" + (aayaQty > 0 ? aayaQty.toFixed(2) : "-") + "</td>" +
            "<td style='color:#ea580c; font-weight:700;'>" + (gayaQty > 0 ? gayaQty.toFixed(2) : "-") + "</td>" +
            "<td style='text-align:center;'><button class='sheet-btn' style='padding:3px 8px; font-size:11px;' onclick='alert(\"Entry ID: \" + \"" + r.id + "\")'>👁️</button> " + actBtn + "</td>" +
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
