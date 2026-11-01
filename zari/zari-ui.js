/* ========================================================
   SIMPLICITY ERP - ZARI STOCK & PASSBOOK ENGINE
   File: zari/zari-ui.js • Developed by Farhan Jawed
======================================================== */

var currentZariKarkhanaFilter = "all";
var currentPassbookZariItem = "";

function openZariModule() {
    var dView = document.getElementById("dashboard-view");
    if (dView) dView.style.display = "none";
    var zSec = document.getElementById("zari-section");
    if (zSec) zSec.style.display = "block";

    renderZariKarkhanaTabs();
    populateZariExistingDropdown();
    renderZariTable();
}

function renderZariKarkhanaTabs() {
    var bar = document.getElementById("zari-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";
    var karkhanas = safeArray(getStore("karkhana_list"));
    if (!karkhanas.length) karkhanas = [{ id: "k_main", name: "Main Godown", isDefault: true }];

    var allActive = (currentZariKarkhanaFilter === "all") ? " active" : "";
    bar.innerHTML += "<button class='sheet-tab" + allActive + "' onclick='switchZariKarkhanaTab(\"all\")'>👥 Sabhi Karkhane</button>";

    karkhanas.forEach(function(k) {
        var isActive = (String(currentZariKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button class='sheet-tab" + isActive + "' onclick='switchZariKarkhanaTab(\"" + k.id + "\")'>🏭 " + k.name + "</button>";
    });
}

function switchZariKarkhanaTab(kId) {
    currentZariKarkhanaFilter = kId;
    populateZariExistingDropdown();
    renderZariTable();
}

function toggleZariForm() {
    var f = document.getElementById("add-zari-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    var dInp = document.getElementById("zari-date");
    if (dInp) dInp.value = getTodayDate();
}

function toggleZariItemType() {
    var isNew = document.getElementById("zari-type-new")?.checked;
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

function saveNewZari() {
    var isNew = document.getElementById("zari-type-new")?.checked;
    var name = isNew 
        ? (document.getElementById("zari-new-name")?.value || "").trim() 
        : (document.getElementById("zari-select-existing")?.value || "").trim();

    var date = (document.getElementById("zari-date") && document.getElementById("zari-date").value) || getTodayDate();
    var qty = parseFloat(document.getElementById("zari-aaya")?.value) || 0;

    if (!name) return alert("Zari Item ka naam zaroori hai!");
    if (qty <= 0) return alert("Wazan (Qty) daalein!");

    var kId = (currentZariKarkhanaFilter !== "all") ? currentZariKarkhanaFilter : "k_main";
    var list = safeArray(getStore("zari_stock"));
    var item = list.find(function(x) { 
        return x && x.name && x.name.toLowerCase() === name.toLowerCase() && (String(x.karkhanaId) === String(kId) || !x.karkhanaId); 
    });

    if (item) {
        item.aaya = Number(((Number(item.aaya) || 0) + qty).toFixed(2));
        item.bacha = Number(((Number(item.aaya) || 0) - (Number(item.gaya) || 0)).toFixed(2));
    } else {
        list.push({
            id: "zari_" + Date.now(),
            date: date,
            name: name,
            aaya: qty,
            gaya: 0,
            bacha: qty,
            karkhanaId: kId
        });
    }
    setStore("zari_stock", list);

    var hist = safeArray(getStore("zari_history"));
    hist.push({
        id: "zhist_" + Date.now(),
        date: date,
        name: name,
        kariger: "-",
        type: "Khareed (Inward)",
        aaya: qty,
        gaya: 0,
        karkhanaId: kId
    });
    setStore("zari_history", hist);

    if (document.getElementById("zari-new-name")) document.getElementById("zari-new-name").value = "";
    if (document.getElementById("zari-aaya")) document.getElementById("zari-aaya").value = "";
    toggleZariForm();
    populateZariExistingDropdown();
    renderZariTable();
    alert("✅ Zari Stock me jama ho gayi!");
}

function filterZari() {
    renderZariTable();
}

function renderZariTable() {
    var tbody = document.getElementById("zari-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var list = safeArray(getStore("zari_stock"));
    if (currentZariKarkhanaFilter !== "all") {
        list = list.filter(function(z) {
            return String(z.karkhanaId) === String(currentZariKarkhanaFilter) || (!z.karkhanaId && currentZariKarkhanaFilter === "k_main");
        });
    }

    var txt = (document.getElementById("search-zari-input") && document.getElementById("search-zari-input").value || "").toLowerCase().trim();
    if (txt) {
        list = list.filter(function(z) {
            return (String(z.name || "") + " " + String(z.date || "")).toLowerCase().indexOf(txt) !== -1;
        });
    }

    var totalBacha = 0;
    if (!list.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:15px; color:#888;'>Koi Zari Stock nahi mila.</td></tr>";
    } else {
        list.forEach(function(z) {
            if (!z) return;
            var bacha = Number(z.bacha || 0);
            totalBacha += bacha;

            tbody.innerHTML += "<tr>" +
                "<td>" + (z.date || "-") + "</td>" +
                "<td><strong>" + z.name + "</strong></td>" +
                "<td style='color:#059669; font-weight:700;'>" + Number(z.aaya || 0).toFixed(2) + "</td>" +
                "<td style='color:#ea580c; font-weight:700;'>" + Number(z.gaya || 0).toFixed(2) + "</td>" +
                "<td style='font-weight:800; color:#1e3a8a;'>" + bacha.toFixed(2) + " Kg</td>" +
                "<td style='text-align:center;'><button class='sheet-btn' style='background:#ea580c;' onclick='openZariPassbook(\"" + z.name + "\")'>📖 Passbook</button></td>" +
            "</tr>";
        });
    }

    var opVal = document.getElementById("zari-opening-val");
    if (opVal) opVal.textContent = totalBacha.toFixed(2) + " Kg Kul Bachi";
}

// ================= ZARI PASSBOOK ENGINE =================

function openZariPassbook(itemName) {
    currentPassbookZariItem = itemName;
    var modal = document.getElementById("item-modal");
    if (!modal) return;

    var title = document.getElementById("modal-item-title");
    if (title) title.textContent = "📖 Zari Passbook: " + itemName;

    var modalBody = modal.querySelector(".modal-body");
    if (modalBody) {
        modalBody.innerHTML = 
            "<div style='background:#f8fafc; border:1px solid #cbd5e1; padding:12px; border-radius:10px; margin-bottom:12px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between;'>" +
                "<div style='display:flex; gap:8px; align-items:center; flex-wrap:wrap;'>" +
                    "<div><label style='font-size:12px; font-weight:700;'>From Date:</label><br><input type='date' id='zari-pass-from-date' onchange='renderZariPassbookRows()'></div>" +
                    "<div><label style='font-size:12px; font-weight:700;'>To Date:</label><br><input type='date' id='zari-pass-to-date' onchange='renderZariPassbookRows()'></div>" +
                    "<div style='align-self:flex-end;'><button class='quick-btn btn-out' onclick='resetZariPassbookFilters()'>Reset</button></div>" +
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
                            "<th>TARIKH</th><th>DETAIL (TYPE)</th><th>KARIGER / SOURCE</th><th>AAYI (Kg)</th><th>GAYI (Kg)</th><th>ACTION</th>" +
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
        return x && x.name && x.name.toLowerCase() === currentPassbookZariItem.toLowerCase();
    });

    var fDate = document.getElementById("zari-pass-from-date")?.value;
    var tDate = document.getElementById("zari-pass-to-date")?.value;
    var sTxt = (document.getElementById("zari-pass-search-input")?.value || "").toLowerCase().trim();

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
        var karigerDisplay = (r.kariger && r.kariger !== "-" && r.kariger !== "undefined") ? ("👤 " + r.kariger) : "📦 Factory Inward";

        var actBtn = isKarigerEntry 
            ? "<span style='color:#64748b; font-size:11px; font-weight:700;'>🔒 Kariger Khata</span>"
            : ("<button class='delete-btn' onclick='deleteZariPurchase(\"" + r.id + "\", " + aayaQty + ")'>🗑️ Delete</button>");

        tbody.innerHTML += "<tr>" +
            "<td>" + (r.date || "-") + "</td>" +
            "<td><strong>" + (r.type || "Godam Inward") + "</strong></td>" +
            "<td style='color:#1e3a8a; font-weight:700;'>" + karigerDisplay + "</td>" +
            "<td style='color:#059669; font-weight:700;'>" + (aayaQty > 0 ? aayaQty.toFixed(2) : "-") + "</td>" +
            "<td style='color:#ea580c; font-weight:700;'>" + (gayaQty > 0 ? gayaQty.toFixed(2) : "-") + "</td>" +
            "<td style='text-align:center;'>" + actBtn + "</td>" +
        "</tr>";
    });
}

function deleteZariPurchase(histId, qty) {
    if (!confirm("Kya aap is Khareed entry ko delete karna chahte hain?\nStock se " + qty + " Kg wazan minus ho jayega.")) return;

    var hist = safeArray(getStore("zari_history")).filter(function(x) { return String(x.id) !== String(histId); });
    setStore("zari_history", hist);

    var list = safeArray(getStore("zari_stock"));
    var item = list.find(function(x) { return x && x.name && x.name.toLowerCase() === currentPassbookZariItem.toLowerCase(); });
    if (item) {
        item.aaya = Math.max(0, Number(((Number(item.aaya) || 0) - qty).toFixed(2)));
        item.bacha = Number(((Number(item.aaya) || 0) - (Number(item.gaya) || 0)).toFixed(2));
        setStore("zari_stock", list);
    }

    renderZariPassbookRows();
    renderZariTable();
    alert("🗑️ Khareed entry delete ho gayi aur Stock adjust ho gaya!");
}
