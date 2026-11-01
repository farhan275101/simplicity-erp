/* ========================================================
   SIMPLICITY ERP - SANCHA (TANI & CHUKKA) STOCK & PASSBOOK
   File: sancha/sancha-ui.js • Developed by Farhan Jawed
======================================================== */

var currentSanchaCategory = "tani"; // "tani" ya "chukka"
var currentSanchaKarkhanaFilter = "all";
var currentPassbookSanchaItem = "";

function openSanchaModule() {
    var dView = document.getElementById("dashboard-view");
    if (dView) dView.style.display = "none";
    var sSec = document.getElementById("sancha-section");
    if (sSec) sSec.style.display = "block";

    renderSanchaKarkhanaTabs();
    populateSanchaExistingDropdown();
    renderSanchaTable();
}

function switchSanchaCategory(cat) {
    currentSanchaCategory = cat;
    var tabT = document.getElementById("tab-sancha-tani");
    var tabC = document.getElementById("tab-sancha-chukka");

    if (tabT) tabT.className = (cat === "tani") ? "sheet-tab active" : "sheet-tab";
    if (tabC) tabC.className = (cat === "chukka") ? "sheet-tab active" : "sheet-tab";

    var rTani = document.getElementById("sancha-cat-tani");
    var rChuk = document.getElementById("sancha-cat-chukka");
    if (rTani && cat === "tani") rTani.checked = true;
    if (rChuk && cat === "chukka") rChuk.checked = true;

    populateSanchaExistingDropdown();
    renderSanchaTable();
}

function renderSanchaKarkhanaTabs() {
    var bar = document.getElementById("sancha-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";
    var karkhanas = safeArray(getStore("karkhana_list"));
    if (!karkhanas.length) karkhanas = [{ id: "k_main", name: "Main Godown", isDefault: true }];

    var allActive = (currentSanchaKarkhanaFilter === "all") ? " active" : "";
    bar.innerHTML += "<button class='sheet-tab" + allActive + "' onclick='switchSanchaKarkhanaTab(\"all\")'>👥 Sabhi Karkhane</button>";

    karkhanas.forEach(function(k) {
        var isActive = (String(currentSanchaKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button class='sheet-tab" + isActive + "' onclick='switchSanchaKarkhanaTab(\"" + k.id + "\")'>🏭 " + k.name + "</button>";
    });
}

function switchSanchaKarkhanaTab(kId) {
    currentSanchaKarkhanaFilter = kId;
    populateSanchaExistingDropdown();
    renderSanchaTable();
}

function toggleAddSanchaForm() {
    var f = document.getElementById("add-sancha-item-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    var dInp = document.getElementById("sancha-date");
    if (dInp) dInp.value = getTodayDate();
    toggleSanchaFormOptions();
}

function toggleSanchaFormOptions() {
    var isNew = document.getElementById("sancha-type-new")?.checked;
    var exGroup = document.getElementById("sancha-existing-group");
    var newGroup = document.getElementById("sancha-new-group");

    if (exGroup) exGroup.style.display = isNew ? "none" : "block";
    if (newGroup) newGroup.style.display = isNew ? "block" : "none";

    var isChuk = document.getElementById("sancha-cat-chukka")?.checked;
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

function saveNewSanchaStock() {
    var isNew = document.getElementById("sancha-type-new")?.checked;
    var name = isNew 
        ? (document.getElementById("sancha-new-name")?.value || "").trim() 
        : (document.getElementById("sancha-select-existing")?.value || "").trim();

    var date = (document.getElementById("sancha-date") && document.getElementById("sancha-date").value) || getTodayDate();
    var qty = parseFloat(document.getElementById("sancha-qty")?.value) || 0;
    var person = (document.getElementById("sancha-person")?.value || "").trim();
    var isChuk = document.getElementById("sancha-cat-chukka")?.checked;
    var category = isChuk ? "chukka" : "tani";

    if (!name) return alert("Sancha Item ka naam zaroori hai!");
    if (qty <= 0) return alert("Wazan (Qty Kg me) daalein!");

    var kId = (currentSanchaKarkhanaFilter !== "all") ? currentSanchaKarkhanaFilter : "k_main";
    var list = safeArray(getStore("sancha_items"));
    var item = list.find(function(x) { 
        var cat = x.category || "tani";
        return x && x.name && x.name.toLowerCase() === name.toLowerCase() && cat.toLowerCase() === category.toLowerCase() && (String(x.karkhanaId) === String(kId) || !x.karkhanaId); 
    });

    if (item) {
        item.aaya = Number(((Number(item.aaya) || 0) + qty).toFixed(2));
        item.bacha = Number(((Number(item.aaya) || 0) - (Number(item.gaya) || 0)).toFixed(2));
        if (person) item.person = person;
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
            karkhanaId: kId
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
        karkhanaId: kId
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

function renderSanchaTable() {
    var tbody = document.getElementById("sancha-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var list = safeArray(getStore("sancha_items")).filter(function(s) {
        var cat = s.category || "tani";
        return cat.toLowerCase() === currentSanchaCategory.toLowerCase();
    });

    if (currentSanchaKarkhanaFilter !== "all") {
        list = list.filter(function(s) {
            return String(s.karkhanaId) === String(currentSanchaKarkhanaFilter) || (!s.karkhanaId && currentSanchaKarkhanaFilter === "k_main");
        });
    }

    var txt = (document.getElementById("search-sancha-input") && document.getElementById("search-sancha-input").value || "").toLowerCase().trim();
    if (txt) {
        list = list.filter(function(s) {
            return (String(s.name || "") + " " + String(s.person || "") + " " + String(s.date || "")).toLowerCase().indexOf(txt) !== -1;
        });
    }

    var totalBacha = 0;
    if (!list.length) {
        tbody.innerHTML = "<tr><td colspan='8' style='text-align:center; padding:15px; color:#888;'>Koi " + (currentSanchaCategory === "tani" ? "Tani" : "Chukka") + " Stock nahi mila.</td></tr>";
    } else {
        list.forEach(function(s) {
            if (!s) return;
            var bacha = Number(s.bacha !== undefined ? s.bacha : (s.aaya || 0));
            totalBacha += bacha;

            tbody.innerHTML += "<tr>" +
                "<td>" + (s.date || "-") + "</td>" +
                "<td><span class='badge-blue'>" + (s.category === "chukka" ? "⚙️ Chukka" : "🧵 Tani") + "</span></td>" +
                "<td><strong>" + s.name + "</strong></td>" +
                "<td style='color:#059669; font-weight:700;'>" + Number(s.aaya || 0).toFixed(2) + "</td>" +
                "<td style='color:#ea580c; font-weight:700;'>" + Number(s.gaya || 0).toFixed(2) + "</td>" +
                "<td style='font-weight:800; color:#0284c7;'>" + bacha.toFixed(2) + " Kg</td>" +
                "<td>" + (s.person || "-") + "</td>" +
                "<td style='text-align:center;'><button class='sheet-btn' style='background:#0284c7;' onclick='openSanchaPassbook(\"" + s.name + "\")'>📖 Passbook</button></td>" +
            "</tr>";
        });
    }

    var opVal = document.getElementById("sancha-opening-val");
    if (opVal) opVal.textContent = totalBacha.toFixed(2) + " Kg Kul " + (currentSanchaCategory === "tani" ? "Tani" : "Chukka") + " Bacha";
}

// ================= SANCHA PASSBOOK ENGINE =================

function openSanchaPassbook(itemName) {
    currentPassbookSanchaItem = itemName;
    var modal = document.getElementById("item-modal");
    if (!modal) return;

    var title = document.getElementById("modal-item-title");
    if (title) title.textContent = "📖 Sancha Passbook: " + itemName + " (" + (currentSanchaCategory === "tani" ? "Tani" : "Chukka") + ")";

    var modalBody = modal.querySelector(".modal-body");
    if (modalBody) {
        modalBody.innerHTML = 
            "<div style='background:#f8fafc; border:1px solid #cbd5e1; padding:12px; border-radius:10px; margin-bottom:12px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between;'>" +
                "<div style='display:flex; gap:8px; align-items:center; flex-wrap:wrap;'>" +
                    "<div><label style='font-size:12px; font-weight:700;'>From Date:</label><br><input type='date' id='sancha-pass-from-date' onchange='renderSanchaPassbookRows()'></div>" +
                    "<div><label style='font-size:12px; font-weight:700;'>To Date:</label><br><input type='date' id='sancha-pass-to-date' onchange='renderSanchaPassbookRows()'></div>" +
                    "<div style='align-self:flex-end;'><button class='quick-btn btn-out' onclick='resetSanchaPassbookFilters()'>Reset</button></div>" +
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
                            "<th>TARIKH</th><th>DETAIL (TYPE)</th><th>KARIGER / PERSON</th><th>AAYA (Kg)</th><th>GAYA (Kg)</th><th>ACTION</th>" +
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
        return x && x.name && x.name.toLowerCase() === currentPassbookSanchaItem.toLowerCase();
    });

    var fDate = document.getElementById("sancha-pass-from-date")?.value;
    var tDate = document.getElementById("sancha-pass-to-date")?.value;
    var sTxt = (document.getElementById("sancha-pass-search-input")?.value || "").toLowerCase().trim();

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
        var aayaQty = Number(r.aaya || r.qty || r.wazan || 0);
        var gayaQty = Number(r.gaya || 0);

        var isKarigerEntry = r.refId || (r.type && r.type.toLowerCase().indexOf("kariger") !== -1);
        var karigerDisplay = (r.kariger && r.kariger !== "-" && r.kariger !== "undefined") ? ("👤 " + r.kariger) : "📦 Factory Inward";

        var actBtn = isKarigerEntry 
            ? "<span style='color:#64748b; font-size:11px; font-weight:700;'>🔒 Kariger Khata</span>"
            : ("<button class='delete-btn' onclick='deleteSanchaPurchase(\"" + r.id + "\", " + aayaQty + ")'>🗑️ Delete</button>");

        tbody.innerHTML += "<tr>" +
            "<td>" + (r.date || "-") + "</td>" +
            "<td><strong>" + (r.type || "Godam Inward") + "</strong></td>" +
            "<td style='color:#1e3a8a; font-weight:700;'>" + karigerDisplay + "</td>" +
            "<td style='color:#059669; font-weight:700;'>" + (aayaQty ? (aayaQty.toFixed(2) + " Kg") : "-") + "</td>" +
            "<td style='color:#ea580c; font-weight:700;'>" + (gayaQty ? (gayaQty.toFixed(2) + " Kg") : "-") + "</td>" +
            "<td style='text-align:center;'>" + actBtn + "</td>" +
        "</tr>";
    });
}

function deleteSanchaPurchase(id, qty) {
    if (!confirm("Kya aap sach me ye Sancha entry delete karna chahte hain?")) return;
    var hist = safeArray(getStore("sancha_history")).filter(function(x) { return x.id !== id; });
    setStore("sancha_history", hist);

    var list = safeArray(getStore("sancha_items"));
    var item = list.find(function(x) {
        return x && x.name && x.name.toLowerCase() === currentPassbookSanchaItem.toLowerCase() && (x.category || "tani").toLowerCase() === currentSanchaCategory.toLowerCase();
    });
    if (item) {
        item.aaya = Number(((Number(item.aaya) || 0) - Number(qty || 0)).toFixed(2));
        if (item.aaya < 0) item.aaya = 0;
        item.bacha = Number(((Number(item.aaya) || 0) - (Number(item.gaya) || 0)).toFixed(2));
        setStore("sancha_items", list);
    }
    renderSanchaPassbookRows();
    renderSanchaTable();
    alert("✅ Entry delete ho gayi!");
}
