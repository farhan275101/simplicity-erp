/* ========================================================
   SIMPLICITY ERP - LIVE STOCK & MULTI-KARKHANA ENGINE
   File 5 of 7 • Developed by Farhan Jawed (Multi-Karkhana Transfers Ready)
======================================================== */

var currentSareeStockTab = "fresh"; // "fresh", "finished", ya "lott"
var currentBanaKarkhanaFilter = "k_main";
var currentZariKarkhanaFilter = "k_main";
var currentSareeKarkhanaFilter = "k_main";

var rawModalPassbookEntries = [];
var currentPassbookStoreKey = "";

// ================= 1. DYNAMIC STOCK KARKHANA TABS =================

function getKarkhanasSafe() {
    if (typeof getKarkhanas === "function") return getKarkhanas();
    var list = safeArray(getStore("karkhana_list"));
    if (!list.length) {
        list = [{ id: "k_main", name: "Main Godown", location: "Head Office", isDefault: true }];
        setStore("karkhana_list", list);
    }
    return list;
}

function renderStockKarkhanaTabs() {
    renderBanaKarkhanaTabs();
    renderZariKarkhanaTabs();
    renderSareeKarkhanaTabs();
}

function renderBanaKarkhanaTabs() {
    var bar = document.getElementById("bana-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";

    var kList = getKarkhanasSafe();
    kList.forEach(function(k) {
        var isActive = (String(currentBanaKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button class='sheet-tab" + isActive + "' onclick='switchStockKarkhana(\"bana\", \"" + k.id + "\")'>🏭 " + k.name + "</button>";
    });
}

function renderZariKarkhanaTabs() {
    var bar = document.getElementById("zari-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";

    var kList = getKarkhanasSafe();
    kList.forEach(function(k) {
        var isActive = (String(currentZariKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button class='sheet-tab" + isActive + "' onclick='switchStockKarkhana(\"zari\", \"" + k.id + "\")'>🏭 " + k.name + "</button>";
    });
}

function renderSareeKarkhanaTabs() {
    var bar = document.getElementById("saree-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";

    var kList = getKarkhanasSafe();
    kList.forEach(function(k) {
        var isActive = (String(currentSareeKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button class='sheet-tab" + isActive + "' onclick='switchStockKarkhana(\"saree\", \"" + k.id + "\")'>🏭 " + k.name + "</button>";
    });
}

function switchStockKarkhana(section, kId) {
    if (section === "bana") {
        currentBanaKarkhanaFilter = kId;
        renderBanaKarkhanaTabs();
        renderBanaTable();
    } else if (section === "zari") {
        currentZariKarkhanaFilter = kId;
        renderZariKarkhanaTabs();
        renderZariTable();
    } else if (section === "saree") {
        currentSareeKarkhanaFilter = kId;
        renderSareeKarkhanaTabs();
        renderSareeTable();
    }
}

// ================= 2. BANA MULTI-KARKHANA COMPUTATION =================

function getBanaItemStats(itemName, targetKarkhanaId) {
    var kId = targetKarkhanaId || currentBanaKarkhanaFilter || "k_main";
    var isMain = (kId === "k_main");
    var nameLower = (itemName || "").trim().toLowerCase();

    var totalAaya = 0;
    var totalGaya = 0;
    var lastDate = "";

    var bStock = getStore("bana_stock");
    var transfers = safeArray(getStore("material_transfers")).filter(function(t) { return t && t.type === "bana"; });
    var allKarigers = (typeof sanitizeKarigerList === "function") ? sanitizeKarigerList() : [];

    if (isMain) {
        // MAIN GODOWN: Godam Purchase (+)
        bStock.forEach(function(b) {
            if (b && b.name && b.name.trim().toLowerCase() === nameLower) {
                totalAaya += (Number(b.aaya) || 0);
                if (b.date) lastDate = b.date;
            }
        });

        // Transferred out to other Karkhanas (-)
        transfers.forEach(function(t) {
            if (t && t.itemName && t.itemName.trim().toLowerCase() === nameLower) {
                totalGaya += (Number(t.qty) || 0);
                if (t.date) lastDate = t.date;
            }
        });

        // Weavers working in Main Godown (-)
        allKarigers.filter(function(w) { return !w.karkhanaId || w.karkhanaId === "k_main"; }).forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (!r) return;
                    var rName = (r.banaItemName || "").trim().toLowerCase();
                    if (rName === nameLower || (!rName && bStock.length > 0 && bStock[0].name.trim().toLowerCase() === nameLower)) {
                        totalGaya += ((Number(r.netBana) || 0) - (Number(r.retBana) || 0));
                    }
                });
            });
        });
    } else {
        // BRANCH KARKHANA: Transferred in from Main Godown (+)
        transfers.filter(function(t) { return String(t.toKarkhanaId) === String(kId); }).forEach(function(t) {
            if (t && t.itemName && t.itemName.trim().toLowerCase() === nameLower) {
                totalAaya += (Number(t.qty) || 0);
                if (t.date) lastDate = t.date;
            }
        });

        // Consumed by weavers belonging to this specific Karkhana (-)
        allKarigers.filter(function(w) { return String(w.karkhanaId) === String(kId); }).forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (!r) return;
                    var rName = (r.banaItemName || "").trim().toLowerCase();
                    if (rName === nameLower || (!rName && bStock.length > 0 && bStock[0].name.trim().toLowerCase() === nameLower)) {
                        totalGaya += ((Number(r.netBana) || 0) - (Number(r.retBana) || 0));
                    }
                });
            });
        });
    }

    var bacha = totalAaya - totalGaya;

    return {
        name: itemName,
        date: lastDate || getTodayDate(),
        aaya: totalAaya,
        gaya: totalGaya,
        bacha: bacha
    };
}

// ================= 3. ZARI MULTI-KARKHANA COMPUTATION =================

function getZariItemStats(itemName, targetKarkhanaId) {
    var kId = targetKarkhanaId || currentZariKarkhanaFilter || "k_main";
    var isMain = (kId === "k_main");
    var nameLower = (itemName || "").trim().toLowerCase();

    var totalAaya = 0;
    var totalGaya = 0;
    var lastDate = "";

    var zStock = getStore("zari_stock");
    var transfers = safeArray(getStore("material_transfers")).filter(function(t) { return t && t.type === "zari"; });
    var allKarigers = (typeof sanitizeKarigerList === "function") ? sanitizeKarigerList() : [];

    if (isMain) {
        // MAIN GODOWN: Godam Purchase (+)
        zStock.forEach(function(z) {
            if (z && z.name && z.name.trim().toLowerCase() === nameLower) {
                totalAaya += (Number(z.aaya) || 0);
                if (z.date) lastDate = z.date;
            }
        });

        // Transferred out to other Karkhanas (-)
        transfers.forEach(function(t) {
            if (t && t.itemName && t.itemName.trim().toLowerCase() === nameLower) {
                totalGaya += (Number(t.qty) || 0);
                if (t.date) lastDate = t.date;
            }
        });

        // Weavers in Main Godown (-)
        allKarigers.filter(function(w) { return !w.karkhanaId || w.karkhanaId === "k_main"; }).forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (!r) return;
                    var rName = (r.zariItemName || "").trim().toLowerCase();
                    if (rName === nameLower || (!rName && zStock.length > 0 && zStock[0].name.trim().toLowerCase() === nameLower)) {
                        totalGaya += ((Number(r.netZari) || 0) - (Number(r.retZari) || 0));
                    }
                });
            });
        });
    } else {
        // BRANCH KARKHANA: Transferred in from Main Godown (+)
        transfers.filter(function(t) { return String(t.toKarkhanaId) === String(kId); }).forEach(function(t) {
            if (t && t.itemName && t.itemName.trim().toLowerCase() === nameLower) {
                totalAaya += (Number(t.qty) || 0);
                if (t.date) lastDate = t.date;
            }
        });

        // Consumed by weavers belonging to this Karkhana (-)
        allKarigers.filter(function(w) { return String(w.karkhanaId) === String(kId); }).forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (!r) return;
                    var rName = (r.zariItemName || "").trim().toLowerCase();
                    if (rName === nameLower || (!rName && zStock.length > 0 && zStock[0].name.trim().toLowerCase() === nameLower)) {
                        totalGaya += ((Number(r.netZari) || 0) - (Number(r.retZari) || 0));
                    }
                });
            });
        });
    }

    var bacha = totalAaya - totalGaya;

    return {
        name: itemName,
        date: lastDate || getTodayDate(),
        aaya: totalAaya,
        gaya: totalGaya,
        bacha: bacha
    };
}

// ================= 4. BANA & ZARI STOCK MODULES =================

function openBanaModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("bana-section", "block");
    renderBanaKarkhanaTabs();
    renderBanaTable();
}

function renderBanaTable(flist) {
    var list = flist || getStore("bana_stock");
    var tbody = document.getElementById("bana-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!list.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Koi Bana Item nahi mila.</td></tr>";
        return;
    }

    var kObj = getKarkhanasSafe().find(function(x) { return String(x.id) === String(currentBanaKarkhanaFilter); });
    var kName = kObj ? kObj.name : "Main Godown";

    list.forEach(function(b, idx) {
        if (!b) return;
        var st = getBanaItemStats(b.name, currentBanaKarkhanaFilter);
        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(st.date) + "</td>" +
            "<td><strong>" + b.name + " <span style='font-size:11px; color:#0284c7;'>(" + kName + ")</span></strong></td>" +
            "<td><span class='badge-green'>+" + Number(st.aaya).toFixed(2) + "</span></td>" +
            "<td><span class='badge-red'>-" + Number(st.gaya).toFixed(2) + "</span></td>" +
            "<td><span class='badge-blue' style='font-size:13px; font-weight:800;'>" + Number(st.bacha).toFixed(2) + " Kg</span></td>" +
            "<td style='text-align:center;'><button class='detail-btn' onclick='viewBanaPassbook(\"" + b.name + "\")'>📖 Passbook</button> <button class='delete-btn' onclick='deleteBanaStock(" + idx + ")'>🗑️</button></td>" +
        "</tr>";
    });
}

function toggleBanaForm() {
    var f = document.getElementById("add-bana-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    document.getElementById("bana-date").value = getTodayDate();
}

function saveNewBana() {
    var d = document.getElementById("bana-date").value || getTodayDate();
    var n = (document.getElementById("bana-name").value || "").trim();
    var q = parseFloat(document.getElementById("bana-aaya").value) || 0;

    if (!n || q <= 0) return alert("Sahi name aur quantity bharein!");

    var stock = getStore("bana_stock");
    var item = stock.find(function(b) { return b && b.name && b.name.toLowerCase() === n.toLowerCase(); });

    var histId = "bh_" + Date.now();
    if (item) {
        item.aaya = (Number(item.aaya) || 0) + q;
        item.date = d;
    } else {
        stock.push({ id: Date.now(), name: n, date: d, aaya: q, gaya: 0, bacha: q });
    }
    setStore("bana_stock", stock);

    var h = getStore("bana_history");
    h.push({ id: histId, date: d, type: "Aaya (Godam Stock In)", name: n, qty: q, note: "Main Godam Purchase" });
    setStore("bana_history", h);

    toggleBanaForm();
    renderBanaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + q + " Kg " + n + " Main Godam me jud gaya!");
}

function deleteBanaStock(idx) {
    if (!confirm("Kya aap is Bana item ko delete karna chahte hain?")) return;
    var s = getStore("bana_stock");
    s.splice(idx, 1);
    setStore("bana_stock", s);
    renderBanaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function filterBana() {
    var txt = (document.getElementById("search-bana-input").value || "").toLowerCase().trim();
    var fD = document.getElementById("bana-from-date").value;
    var tD = document.getElementById("bana-to-date").value;

    renderBanaTable(getStore("bana_stock").filter(function(b) {
        return b && (String(b.name || "") + " " + formatDateDisplay(b.date)).toLowerCase().indexOf(txt) !== -1 && isDateInRange(b.date, fD, tD);
    }));
}

function resetBanaFilter() {
    document.getElementById("bana-from-date").value = "";
    document.getElementById("bana-to-date").value = "";
    document.getElementById("search-bana-input").value = "";
    renderBanaTable();
}

function viewBanaPassbook(banaName) {
    var entries = [];
    var nameLower = (banaName || "").trim().toLowerCase();
    var isMain = (currentBanaKarkhanaFilter === "k_main");

    if (isMain) {
        getStore("bana_stock").forEach(function(b) {
            if (b && b.name && b.name.trim().toLowerCase() === nameLower && Number(b.aaya) > 0) {
                entries.push({ id: b.id, date: b.date || getTodayDate(), type: "Godam Purchase", qty: "+" + Number(b.aaya).toFixed(2), kariger: "Supplier Stock In" });
            }
        });

        safeArray(getStore("material_transfers")).filter(function(t) { return t && t.type === "bana" && t.itemName.toLowerCase() === nameLower; }).forEach(function(t) {
            entries.push({ id: t.id, date: t.date, type: "Karkhane Ko Bheja", qty: "-" + Number(t.qty).toFixed(2), kariger: "Sent to " + t.toKarkhanaName });
        });
    } else {
        safeArray(getStore("material_transfers")).filter(function(t) { return t && t.type === "bana" && String(t.toKarkhanaId) === String(currentBanaKarkhanaFilter) && t.itemName.toLowerCase() === nameLower; }).forEach(function(t) {
            entries.push({ id: t.id, date: t.date, type: "Main Godam Se Aaya", qty: "+" + Number(t.qty).toFixed(2), kariger: "Challan: " + (t.note || "-") });
        });

        var kKarigers = (typeof sanitizeKarigerList === "function") ? sanitizeKarigerList().filter(function(w) { return String(w.karkhanaId) === String(currentBanaKarkhanaFilter); }) : [];
        kKarigers.forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (r && Number(r.netBana) > 0) entries.push({ id: r.id, date: r.date, type: "Net Diya", qty: "-" + Number(r.netBana).toFixed(2), kariger: k.name });
                    if (r && Number(r.retBana) > 0) entries.push({ id: r.id, date: r.date, type: "Wapas Aaya", qty: "+" + Number(r.retBana).toFixed(2), kariger: k.name });
                });
            });
        });
    }

    viewCustomDatePassbook("Bana Passbook: " + banaName, entries, "bana_history");
}

function openZariModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("zari-section", "block");
    renderZariKarkhanaTabs();
    renderZariTable();
}

function renderZariTable(flist) {
    var list = flist || getStore("zari_stock");
    var tbody = document.getElementById("zari-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!list.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Koi Zari Item nahi mila.</td></tr>";
        return;
    }

    var kObj = getKarkhanasSafe().find(function(x) { return String(x.id) === String(currentZariKarkhanaFilter); });
    var kName = kObj ? kObj.name : "Main Godown";

    list.forEach(function(z, idx) {
        if (!z) return;
        var st = getZariItemStats(z.name, currentZariKarkhanaFilter);
        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(st.date) + "</td>" +
            "<td><strong>" + z.name + " <span style='font-size:11px; color:#ea580c;'>(" + kName + ")</span></strong></td>" +
            "<td><span class='badge-green'>+" + Number(st.aaya).toFixed(2) + "</span></td>" +
            "<td><span class='badge-red'>-" + Number(st.gaya).toFixed(2) + "</span></td>" +
            "<td><span class='badge-blue' style='font-size:13px; font-weight:800;'>" + Number(st.bacha).toFixed(2) + " Kg</span></td>" +
            "<td style='text-align:center;'><button class='detail-btn' onclick='viewZariPassbook(\"" + z.name + "\")'>📖 Passbook</button> <button class='delete-btn' onclick='deleteZariStock(" + idx + ")'>🗑️</button></td>" +
        "</tr>";
    });
}

function toggleZariForm() {
    var f = document.getElementById("add-zari-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    document.getElementById("zari-date").value = getTodayDate();
}

function saveNewZari() {
    var d = document.getElementById("zari-date").value || getTodayDate();
    var n = (document.getElementById("zari-name").value || "").trim();
    var q = parseFloat(document.getElementById("zari-aaya").value) || 0;

    if (!n || q <= 0) return alert("Sahi name aur quantity bharein!");

    var stock = getStore("zari_stock");
    var item = stock.find(function(z) { return z && z.name && z.name.toLowerCase() === n.toLowerCase(); });

    var histId = "zh_" + Date.now();
    if (item) {
        item.aaya = (Number(item.aaya) || 0) + q;
        item.date = d;
    } else {
        stock.push({ id: Date.now(), name: n, date: d, aaya: q, gaya: 0, bacha: q });
    }
    setStore("zari_stock", stock);

    var h = getStore("zari_history");
    h.push({ id: histId, date: d, type: "Aaya (Godam Stock In)", name: n, qty: q, note: "Main Godam Purchase" });
    setStore("zari_history", h);

    toggleZariForm();
    renderZariTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + q + " Kg " + n + " Main Godam me jud gayi!");
}

function deleteZariStock(idx) {
    if (!confirm("Kya aap is Zari item ko delete karna chahte hain?")) return;
    var s = getStore("zari_stock");
    s.splice(idx, 1);
    setStore("zari_stock", s);
    renderZariTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function filterZari() {
    var txt = (document.getElementById("search-zari-input").value || "").toLowerCase().trim();
    var fD = document.getElementById("zari-from-date").value;
    var tD = document.getElementById("zari-to-date").value;

    renderZariTable(getStore("zari_stock").filter(function(z) {
        return z && (String(z.name || "") + " " + formatDateDisplay(z.date)).toLowerCase().indexOf(txt) !== -1 && isDateInRange(z.date, fD, tD);
    }));
}

function resetZariFilter() {
    document.getElementById("zari-from-date").value = "";
    document.getElementById("zari-to-date").value = "";
    document.getElementById("search-zari-input").value = "";
    renderZariTable();
}

function viewZariPassbook(zariName) {
    var entries = [];
    var nameLower = (zariName || "").trim().toLowerCase();
    var isMain = (currentZariKarkhanaFilter === "k_main");

    if (isMain) {
        getStore("zari_stock").forEach(function(z) {
            if (z && z.name && z.name.trim().toLowerCase() === nameLower && Number(z.aaya) > 0) {
                entries.push({ id: z.id, date: z.date || getTodayDate(), type: "Godam Purchase", qty: "+" + Number(z.aaya).toFixed(2), kariger: "Supplier Stock In" });
            }
        });

        safeArray(getStore("material_transfers")).filter(function(t) { return t && t.type === "zari" && t.itemName.toLowerCase() === nameLower; }).forEach(function(t) {
            entries.push({ id: t.id, date: t.date, type: "Karkhane Ko Bheji", qty: "-" + Number(t.qty).toFixed(2), kariger: "Sent to " + t.toKarkhanaName });
        });
    } else {
        safeArray(getStore("material_transfers")).filter(function(t) { return t && t.type === "zari" && String(t.toKarkhanaId) === String(currentZariKarkhanaFilter) && t.itemName.toLowerCase() === nameLower; }).forEach(function(t) {
            entries.push({ id: t.id, date: t.date, type: "Main Godam Se Aayi", qty: "+" + Number(t.qty).toFixed(2), kariger: "Challan: " + (t.note || "-") });
        });

        var kKarigers = (typeof sanitizeKarigerList === "function") ? sanitizeKarigerList().filter(function(w) { return String(w.karkhanaId) === String(currentZariKarkhanaFilter); }) : [];
        kKarigers.forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (r && Number(r.netZari) > 0) entries.push({ id: r.id, date: r.date, type: "Net Diya", qty: "-" + Number(r.netZari).toFixed(2), kariger: k.name });
                    if (r && Number(r.retZari) > 0) entries.push({ id: r.id, date: r.date, type: "Wapas Aayi", qty: "+" + Number(r.retZari).toFixed(2), kariger: k.name });
                });
            });
        });
    }

    viewCustomDatePassbook("Zari Passbook: " + zariName, entries, "zari_history");
}

// ================= 5. 🚚 MATERIAL TRANSFER (GODAM SE BRANCH BHEJA) =================

function openMaterialTransferModal(type) {
    var isZari = (type === "zari");
    document.getElementById("mat-transfer-type").value = isZari ? "zari" : "bana";
    document.getElementById("mat-transfer-modal-title").textContent = isZari ? "🚚 Karkhane Ko Zari Bheji" : "🚚 Karkhane Ko Bana Bheja";
    document.getElementById("mat-transfer-item-label").textContent = isZari ? "Zari Ka Naam" : "Bana Ka Naam";
    document.getElementById("mat-transfer-date").value = getTodayDate();
    document.getElementById("mat-transfer-qty").value = "";
    document.getElementById("mat-transfer-note").value = "";

    // Destination karkhana select
    var sel = document.getElementById("mat-transfer-dest-karkhana");
    if (sel) {
        sel.innerHTML = "";
        var kList = getKarkhanasSafe().filter(function(k) { return !k.isDefault; });
        if (!kList.length) {
            alert("Pehle Kariger Master me jakar koi naya Karkhana jodein!");
            return;
        }
        kList.forEach(function(k) {
            var opt = document.createElement("option");
            opt.value = k.id;
            opt.textContent = "🏭 " + k.name + (k.location ? " (" + k.location + ")" : "");
            sel.appendChild(opt);
        });
    }

    setDisplay("material-transfer-modal", "flex");
}

function closeMaterialTransferModal() {
    setDisplay("material-transfer-modal", "none");
}

function saveMaterialTransferEntry() {
    var type = document.getElementById("mat-transfer-type").value;
    var d = document.getElementById("mat-transfer-date").value || getTodayDate();
    var destId = document.getElementById("mat-transfer-dest-karkhana").value;
    var item = (document.getElementById("mat-transfer-item-name").value || "").trim();
    var qty = parseFloat(document.getElementById("mat-transfer-qty").value) || 0;
    var note = (document.getElementById("mat-transfer-note").value || "").trim();

    if (!destId) return alert("Karkhana chunein!");
    if (!item) return alert("Item ka naam bharein!");
    if (qty <= 0) return alert("Sahi quantity bharein!");

    var destKarkhana = getKarkhanasSafe().find(function(x) { return String(x.id) === String(destId); });
    var destName = destKarkhana ? destKarkhana.name : "Branch Karkhana";

    var transfers = safeArray(getStore("material_transfers"));
    transfers.push({
        id: "mt_" + Date.now(),
        type: type,
        date: d,
        fromKarkhanaId: "k_main",
        fromKarkhanaName: "Main Godown",
        toKarkhanaId: destId,
        toKarkhanaName: destName,
        itemName: item,
        qty: qty,
        note: note || "Tempo Challan"
    });
    setStore("material_transfers", transfers);

    closeMaterialTransferModal();
    if (type === "bana") renderBanaTable();
    else renderZariTable();

    alert("✅ " + qty + " Kg " + item + " Main Godam se " + destName + " ko bhej diya gaya!");
}

// ================= 6. 🥻 SAREE STOCK & 🚚 TRANSFER ENGINE =================

function openSareeModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("saree-section", "block");
    renderSareeKarkhanaTabs();
    switchSareeStockTab(currentSareeStockTab || "fresh");
}

function switchSareeStockTab(tab) {
    if (tab !== "fresh" && tab !== "finished" && tab !== "lott") tab = "fresh";
    currentSareeStockTab = tab;

    var btnF = document.getElementById("btn-saree-tab-fresh");
    var btnFin = document.getElementById("btn-saree-tab-finished");
    var btnL = document.getElementById("btn-saree-tab-lott");

    if (btnF) btnF.className = (tab === "fresh") ? "sheet-tab active" : "sheet-tab";
    if (btnFin) btnFin.className = (tab === "finished") ? "sheet-tab active" : "sheet-tab";
    if (btnL) btnL.className = (tab === "lott") ? "sheet-tab active" : "sheet-tab";

    renderSareeTable();
}

function renderSareeTable(flist) {
    var thead = document.querySelector("#saree-section table thead");
    var tbody = document.getElementById("saree-table-body");
    var tfoot = document.querySelector("#saree-section table tfoot");

    if (!tfoot) {
        var table = document.querySelector("#saree-section table");
        if (table) {
            tfoot = document.createElement("tfoot");
            table.appendChild(tfoot);
        }
    }

    if (!tbody || !thead) return;
    tbody.innerHTML = "";
    if (tfoot) tfoot.innerHTML = "";

    var kId = currentSareeKarkhanaFilter || "k_main";
    var isMain = (kId === "k_main");
    var kObj = getKarkhanasSafe().find(function(x) { return String(x.id) === String(kId); });
    var kName = kObj ? kObj.name : "Main Godown";

    // 1. FRESH SAREE TAB (KACCHI SAREE STOCK)
    if (currentSareeStockTab === "fresh") {
        thead.innerHTML = "<tr style='background:#2563eb; color:white;'>" +
            "<th>Date</th><th>S.No.</th><th>Saree Ka Naam</th><th>Kariger / Karkhana</th><th>Fresh Stock (Pcs)</th><th>Out / Transfer</th><th style='text-align:center;'>Action</th>" +
        "</tr>";

        var allSareeStock = safeArray(getStore("saree_stock"));
        var transfers = safeArray(getStore("saree_transfers"));

        var list = [];
        if (isMain) {
            // Main Godown: Main Weavers + Received from Branches
            list = allSareeStock.filter(function(s) { return !s.karkhanaId || s.karkhanaId === "k_main"; });
        } else {
            // Branch: Produced at this branch
            list = allSareeStock.filter(function(s) { return String(s.karkhanaId) === String(kId); });
        }

        if (flist) list = flist;

        if (!list.length) {
            tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding:20px; color:#888;'>Is Karkhane (" + kName + ") me abhi koi Fresh Saree nahi hai.</td></tr>";
            return;
        }

        var totFresh = 0;
        list.forEach(function(s, idx) {
            if (!s) return;
            totFresh += (Number(s.pcs) || 0);
            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(s.date) + "</td>" +
                "<td>" + (idx + 1) + "</td>" +
                "<td><strong>" + s.name + "</strong></td>" +
                "<td>" + (s.kariger || "-") + " <span style='font-size:11px; color:#0284c7;'>(" + (s.karkhanaName || kName) + ")</span></td>" +
                "<td><span class='badge-blue'>" + s.pcs + " pcs</span></td>" +
                "<td>" +
                    "<div style='display:flex; gap:4px; align-items:center;'>" +
                        "<input type='number' id='saree-out-input-" + idx + "' placeholder='Qty' style='width:60px; padding:4px; font-size:12px; border:1px solid #cbd5e1; border-radius:6px;' min='1'>" +
                        "<button class='quick-btn btn-out' onclick='outSareeCustomQty(" + idx + ")'>📤 Out</button>" +
                    "</div>" +
                "</td>" +
                "<td style='text-align:center;'><button class='detail-btn' onclick='viewFreshSareePassbook(\"" + s.name + "\")'>📖 Passbook</button> <button class='delete-btn' onclick='deleteSareeStock(" + idx + ")'>🗑️</button></td>" +
            "</tr>";
        });

        if (tfoot) {
            tfoot.innerHTML = "<tr style='background:#eff6ff; font-weight:800; border-top:2px solid #2563eb;'>" +
                "<td colspan='4'>📊 KUL FRESH STOCK (" + kName + "):</td>" +
                "<td style='color:#2563eb; font-size:15px;'>" + totFresh + " Pcs</td>" +
                "<td colspan='2'>-</td>" +
            "</tr>";
        }

    // 2. FINISHED SAREE TAB (CALENDER FINISHED)
    } else if (currentSareeStockTab === "finished") {
        thead.innerHTML = "<tr style='background:#0d9488; color:white;'>" +
            "<th>Date</th><th>S.No.</th><th>Tayaar Saree (Process)</th><th>Kahan Se Aayi (Source)</th><th>Finished Stock (Pcs)</th><th>Out (Bikri/Dukan)</th><th style='text-align:center;'>Action</th>" +
        "</tr>";

        var finList = safeArray(getStore("finished_saree_stock")).filter(function(item) {
            return item && Number(item.pcs) > 0 && String(item.name || "").toLowerCase().indexOf("calender") !== -1;
        });

        if (flist) finList = flist;

        if (!finList.length) {
            tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding:20px; color:#0d9488; font-weight:700;'>✨ Abhi koi Calender Finished Saree nahi aayi hai.</td></tr>";
            return;
        }

        var totFinished = 0;
        finList.forEach(function(f, idx) {
            if (!f) return;
            var pcs = Number(f.pcs) || 0;
            totFinished += pcs;

            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(f.date) + "</td>" +
                "<td>" + (idx + 1) + "</td>" +
                "<td><strong style='color:#0d9488;'>🎛️ " + (f.name || "Calender Finished Saree") + "</strong></td>" +
                "<td>" + (f.source || "Calender Finishing") + "</td>" +
                "<td><span class='badge-green' style='font-size:13px; font-weight:800;'>" + pcs + " pcs</span></td>" +
                "<td>" +
                    "<div style='display:flex; gap:4px; align-items:center;'>" +
                        "<input type='number' id='fin-out-input-" + idx + "' placeholder='Qty' style='width:60px; padding:4px; font-size:12px; border:1px solid #cbd5e1; border-radius:6px;' min='1'>" +
                        "<button class='quick-btn btn-out' style='background:#0d9488; color:white;' onclick='outFinishedSareeCustomQty(" + idx + ")'>📤 Out</button>" +
                    "</div>" +
                "</td>" +
                "<td style='text-align:center;'><button class='detail-btn' onclick='viewFinishedSareePassbook(\"" + (f.name || "Calender Finished Saree") + "\")'>📖 Passbook</button> <button class='delete-btn' onclick='deleteFinishedSareeStock(" + idx + ")'>🗑️</button></td>" +
            "</tr>";
        });

        if (tfoot) {
            tfoot.innerHTML = "<tr style='background:#f0fdf4; font-weight:800; border-top:2px solid #0d9488;'>" +
                "<td colspan='4'>📊 KUL FINISHED STOCK (CALENDER TAYAAR):</td>" +
                "<td style='color:#0d9488; font-size:15px; font-weight:900;'>+" + totFinished + " Pcs</td>" +
                "<td colspan='2'>-</td>" +
            "</tr>";
        }

    // 3. LOTT / DAMAGE SAREE TAB
    } else if (currentSareeStockTab === "lott") {
        thead.innerHTML = "<tr style='background:#dc2626; color:white;'>" +
            "<th>Date</th><th>Saree Ka Naam</th><th>Kahan Se Aayi</th><th>Lott Stock (Pcs)</th><th>Out</th><th style='text-align:center;'>Action</th>" +
        "</tr>";

        var lottList = safeArray(getStore("lott_saree_stock"));
        if (!isMain) {
            lottList = lottList.filter(function(l) { return String(l.karkhanaId) === String(kId); });
        }
        if (flist) lottList = flist;

        if (!lottList.length) {
            tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Abhi koi Lott Saree nahi hai.</td></tr>";
            return;
        }

        var totLott = 0;
        lottList.forEach(function(l, idx) {
            if (!l) return;
            totLott += (Number(l.pcs) || 0);
            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(l.date) + "</td>" +
                "<td><strong>" + l.name + "</strong></td>" +
                "<td>" + (l.source || "Loom / Job Work") + "</td>" +
                "<td><span class='badge-red'>⚠️ " + (l.pcs || 0) + " pcs</span></td>" +
                "<td><button class='quick-btn btn-out' style='background:#fef2f2; border:1px solid #fca5a5; font-size:12px; font-weight:700;' onclick='outLottSareeCustomQty(" + idx + ")'>📤 Out</button></td>" +
                "<td style='text-align:center;'><button class='detail-btn' onclick='viewLottSareePassbook(\"" + l.name + "\")'>📖 Passbook</button> <button class='delete-btn' onclick='deleteLottSareeStock(" + idx + ")'>🗑️</button></td>" +
            "</tr>";
        });

        if (tfoot) {
            tfoot.innerHTML = "<tr style='background:#fef2f2; font-weight:800; border-top:2px solid #dc2626;'>" +
                "<td colspan='3'>📊 KUL DAMAGE / LOTT STOCK:</td>" +
                "<td style='color:#dc2626; font-size:15px;'>" + totLott + " Pcs</td>" +
                "<td colspan='2'>-</td>" +
            "</tr>";
        }
    }
}

function filterSaree() {
    var txt = (document.getElementById("search-saree-input").value || "").toLowerCase().trim();
    var fD = document.getElementById("saree-from-date").value;
    var tD = document.getElementById("saree-to-date").value;

    if (currentSareeStockTab === "fresh") {
        var filteredFresh = safeArray(getStore("saree_stock")).filter(function(s) {
            return s && (String(s.name || "") + " " + String(s.kariger || "") + " " + formatDateDisplay(s.date)).toLowerCase().indexOf(txt) !== -1 && isDateInRange(s.date, fD, tD);
        });
        renderSareeTable(filteredFresh);
    } else if (currentSareeStockTab === "finished") {
        var finList = safeArray(getStore("finished_saree_stock")).filter(function(f) {
            return f && (String(f.name || "") + " " + String(f.source || "") + " " + formatDateDisplay(f.date)).toLowerCase().indexOf(txt) !== -1 && isDateInRange(f.date, fD, tD);
        });
        renderSareeTable(filteredFin);
    } else if (currentSareeStockTab === "lott") {
        var lottList = safeArray(getStore("lott_saree_stock")).filter(function(l) {
            return l && (String(l.name || "") + " " + String(l.source || "") + " " + formatDateDisplay(l.date)).toLowerCase().indexOf(txt) !== -1 && isDateInRange(l.date, fD, tD);
        });
        renderSareeTable(filteredLott);
    }
}

function resetSareeFilter() {
    document.getElementById("saree-from-date").value = "";
    document.getElementById("saree-to-date").value = "";
    document.getElementById("search-saree-input").value = "";
    renderSareeTable();
}

// ================= 7. 📥 SAREE INWARD / TRANSFER (BRANCH SE MAIN GODOWN AAYI) =================

function openSareeTransferModal() {
    document.getElementById("saree-transfer-date").value = getTodayDate();
    document.getElementById("saree-transfer-name").value = "";
    document.getElementById("saree-transfer-pcs").value = "";
    document.getElementById("saree-transfer-note").value = "";

    var sel = document.getElementById("saree-transfer-source-karkhana");
    if (sel) {
        sel.innerHTML = "";
        var kList = getKarkhanasSafe().filter(function(k) { return !k.isDefault; });
        if (!kList.length) {
            alert("Pehle Kariger Master me jakar koi naya Karkhana jodein!");
            return;
        }
        kList.forEach(function(k) {
            var opt = document.createElement("option");
            opt.value = k.id;
            opt.textContent = "🏭 " + k.name + (k.location ? " (" + k.location + ")" : "");
            sel.appendChild(opt);
        });
    }

    setDisplay("saree-transfer-modal", "flex");
}

function closeSareeTransferModal() {
    setDisplay("saree-transfer-modal", "none");
}

function saveSareeTransferEntry() {
    var d = document.getElementById("saree-transfer-date").value || getTodayDate();
    var sourceId = document.getElementById("saree-transfer-source-karkhana").value;
    var name = (document.getElementById("saree-transfer-name").value || "Fresh Saree").trim();
    var pcs = parseInt(document.getElementById("saree-transfer-pcs").value) || 0;
    var note = (document.getElementById("saree-transfer-note").value || "").trim();

    if (!sourceId) return alert("Source Karkhana chunein!");
    if (pcs <= 0) return alert("Saree Pcs bharein!");

    var sourceKarkhana = getKarkhanasSafe().find(function(x) { return String(x.id) === String(sourceId); });
    var sourceName = sourceKarkhana ? sourceKarkhana.name : "Branch Karkhana";

    // 1. DEDUCT FROM BRANCH SAREE STOCK
    var allSareeStock = safeArray(getStore("saree_stock"));
    var branchItems = allSareeStock.filter(function(s) { return String(s.karkhanaId) === String(sourceId); });
    var remToDeduct = pcs;
    for (var i = 0; i < branchItems.length; i++) {
        if (remToDeduct <= 0) break;
        var cur = Number(branchItems[i].pcs) || 0;
        if (cur > 0) {
            var take = Math.min(cur, remToDeduct);
            branchItems[i].pcs -= take;
            remToDeduct -= take;
        }
    }

    // 2. ADD TO MAIN GODOWN FRESH SAREE STOCK
    allSareeStock.push({
        id: "saree_tr_" + Date.now(),
        date: d,
        name: name,
        kariger: "Transfer: " + sourceName,
        karkhanaId: "k_main",
        karkhanaName: "Main Godown",
        pcs: pcs,
        outPcs: 0
    });
    setStore("saree_stock", allSareeStock);

    // 3. LOG TRANSFER RECORD
    var transfers = safeArray(getStore("saree_transfers"));
    transfers.push({
        id: "st_" + Date.now(),
        date: d,
        fromKarkhanaId: sourceId,
        fromKarkhanaName: sourceName,
        toKarkhanaId: "k_main",
        toKarkhanaName: "Main Godown",
        sareeName: name,
        pcs: pcs,
        note: note || "Driver Delivery"
    });
    setStore("saree_transfers", transfers);

    // Passbook Logging
    var sH = safeArray(getStore("saree_history"));
    sH.push({
        id: "sh_tr_" + Date.now(),
        date: d,
        name: name,
        kariger: sourceName + " (Inward)",
        type: "In (Branch Transfer)",
        pcs: pcs,
        note: sourceName + " se Main Godam me aayi"
    });
    setStore("saree_history", sH);

    closeSareeTransferModal();
    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + pcs + " Saree " + sourceName + " se Main Godam me safalta-purvak receive ho gayi!");
}

// --- ACTIONS: OUT & DELETE ---
function outSareeCustomQty(idx) {
    var inp = document.getElementById("saree-out-input-" + idx);
    var qty = parseInt(inp ? inp.value : 0);

    if (!qty || qty <= 0) return alert("Sahi quantity likhein!");

    var stock = getStore("saree_stock");
    var item = stock[idx];
    if (!item) return;

    if (qty > item.pcs) {
        return alert("Stock me sirf " + item.pcs + " saree bachi hai!");
    }

    item.pcs -= qty;
    setStore("saree_stock", stock);

    var h = getStore("saree_history");
    h.push({
        id: "sh_sale_" + Date.now(),
        date: getTodayDate(),
        name: item.name,
        kariger: item.kariger || "Godam",
        type: "Out (Sale / Job Work)",
        pcs: qty,
        note: "Stock se out"
    });
    setStore("saree_history", h);

    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + qty + " Saree stock se minus ho gayi!");
}

function deleteSareeStock(idx) {
    if (!confirm("Kya aap is saree record ko delete karna chahte hain?")) return;
    var s = getStore("saree_stock");
    s.splice(idx, 1);
    setStore("saree_stock", s);
    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function outFinishedSareeCustomQty(idx) {
    var inp = document.getElementById("fin-out-input-" + idx);
    var qty = parseInt(inp ? inp.value : 0);

    if (!qty || qty <= 0) return alert("Sahi quantity likhein!");

    var stock = safeArray(getStore("finished_saree_stock"));
    var item = stock[idx];
    if (!item) return;

    if (qty > item.pcs) {
        return alert("Finished Stock me sirf " + item.pcs + " saree bachi hai!");
    }

    item.pcs -= qty;
    setStore("finished_saree_stock", stock);

    var h = getStore("saree_history");
    h.push({
        id: "sh_fin_out_" + Date.now(),
        date: getTodayDate(),
        name: item.name || "Calender Finished Saree",
        kariger: item.source || "Finished Stock",
        type: "Out (Finished Sale)",
        pcs: qty,
        note: (item.name || "Calender Finished Saree") + " Bikri / Dukan Bheja"
    });
    setStore("saree_history", h);

    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + qty + " Tayaar Saree Out ho gayi!");
}

function deleteFinishedSareeStock(idx) {
    if (!confirm("Kya aap is Finished Saree record ko delete karna chahte hain?")) return;
    var stock = safeArray(getStore("finished_saree_stock"));
    stock.splice(idx, 1);
    setStore("finished_saree_stock", stock);
    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function outLottSareeCustomQty(idx) {
    var stock = safeArray(getStore("lott_saree_stock"));
    var item = stock[idx];
    if (!item) return;

    var qty = parseInt(prompt("Saree: " + item.name + "\nLott Pcs Available: " + item.pcs + "\n\nKitne Pcs Out karne hain:", item.pcs));
    if (!qty || isNaN(qty) || qty <= 0) return;
    if (qty > item.pcs) return alert("Sirf " + item.pcs + " Pcs available hain!");

    var note = prompt("Out Note / Vivran:", "Lott Saree Out") || "Lott Saree Out";
    item.pcs -= qty;
    setStore("lott_saree_stock", stock);

    var h = getStore("saree_history");
    h.push({
        id: "sh_lott_" + Date.now(),
        date: getTodayDate(),
        name: item.name,
        kariger: item.source || "Lott Saree",
        type: "Out (Lott Sale)",
        pcs: qty,
        note: note
    });
    setStore("saree_history", h);

    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + qty + " Lott Saree Out ho gayi!");
}

function deleteLottSareeStock(idx) {
    if (!confirm("Kya aap is Lott Saree record ko delete karna chahte hain?")) return;
    var stock = safeArray(getStore("lott_saree_stock"));
    stock.splice(idx, 1);
    setStore("lott_saree_stock", stock);
    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

// ================= 8. PASSBOOK WITH DATE RANGE FILTER =================

function viewFreshSareePassbook(sareeName) {
    var entries = [];
    var hist = getStore("saree_history");
    hist.forEach(function(it) {
        if (!it) return;
        var nMatch = (it.name && it.name.toLowerCase() === String(sareeName || "").toLowerCase());
        var isFresh = !String(it.type || "").toLowerCase().includes("lott") && !String(it.type || "").toLowerCase().includes("finished");
        if (nMatch && isFresh) {
            entries.push({ id: it.id, date: it.date, type: it.type || "-", qty: it.pcs || it.qty || 0, kariger: it.kariger || "-" });
        }
    });
    viewCustomDatePassbook("Fresh Saree Passbook: " + sareeName, entries, "saree_history");
}

function viewFinishedSareePassbook(sareeName) {
    var entries = [];
    var hist = getStore("saree_history");
    hist.forEach(function(it) {
        if (!it) return;
        var isFin = String(it.type || "").toLowerCase().includes("finished");
        if (isFin) {
            entries.push({ id: it.id, date: it.date, type: it.type || "Finished", qty: it.pcs || it.qty || 0, kariger: it.kariger || "Job Work" });
        }
    });
    viewCustomDatePassbook("Finished Saree Passbook (Calender)", entries, "saree_history");
}

function viewLottSareePassbook(sareeName) {
    var entries = [];
    var hist = getStore("saree_history");
    hist.forEach(function(it) {
        if (!it) return;
        var nMatch = (it.name && it.name.toLowerCase() === String(sareeName || "").toLowerCase());
        var isLott = String(it.type || "").toLowerCase().includes("lott");
        if (nMatch && isLott) {
            entries.push({ id: it.id, date: it.date, type: it.type || "Lott", qty: it.pcs || it.qty || 0, kariger: it.kariger || "Lott" });
        }
    });
    viewCustomDatePassbook("Lott Saree Passbook: " + sareeName, entries, "saree_history");
}

function viewCustomDatePassbook(title, entriesArray, storeKey) {
    rawModalPassbookEntries = safeArray(entriesArray);
    currentPassbookStoreKey = storeKey || "saree_history";
    document.getElementById("modal-item-title").textContent = "📖 " + title;
    if (document.getElementById("modal-from-date")) document.getElementById("modal-from-date").value = "";
    if (document.getElementById("modal-to-date")) document.getElementById("modal-to-date").value = "";
    renderModalPassbookRows(rawModalPassbookEntries);
    setDisplay("item-modal", "flex");
}

function filterModalPassbook() {
    var fD = document.getElementById("modal-from-date") ? document.getElementById("modal-from-date").value : "";
    var tD = document.getElementById("modal-to-date") ? document.getElementById("modal-to-date").value : "";
    var filtered = rawModalPassbookEntries.filter(function(e) {
        return e && isDateInRange(e.date, fD, tD);
    });
    renderModalPassbookRows(filtered);
}

function resetModalPassbook() {
    if (document.getElementById("modal-from-date")) document.getElementById("modal-from-date").value = "";
    if (document.getElementById("modal-to-date")) document.getElementById("modal-to-date").value = "";
    renderModalPassbookRows(rawModalPassbookEntries);
}

function renderModalPassbookRows(list) {
    var tbody = document.getElementById("modal-history-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!list || !list.length) {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Is tareekh me koi record nahi mila.</td></tr>";
        return;
    }

    list.sort(function(a, b) { return (b.date > a.date) ? 1 : -1; });
    list.forEach(function(it) {
        var delBtn = it.id ? ("<button class='delete-btn' style='padding:2px 6px; font-size:11px;' onclick='deletePassbookRowDirectly(\"" + it.id + "\")'>🗑️</button>") : "-";

        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(it.date) + "</td>" +
            "<td>" + (it.kariger || it.desc || "-") + " (" + (it.type || "-") + ")</td>" +
            "<td><strong>" + (it.qty || it.amount || 0) + "</strong></td>" +
            "<td style='text-align:center;'>" + delBtn + "</td>" +
        "</tr>";
    });
}

function deletePassbookRowDirectly(entryId) {
    if (!confirm("Kya aap is passbook entry ko delete karna chahte hain?")) return;
    if (currentPassbookStoreKey) {
        var list = getStore(currentPassbookStoreKey);
        list = list.filter(function(x) { return !x || String(x.id) !== String(entryId); });
        setStore(currentPassbookStoreKey, list);
    }
    rawModalPassbookEntries = rawModalPassbookEntries.filter(function(x) { return !x || String(x.id) !== String(entryId); });
    renderModalPassbookRows(rawModalPassbookEntries);
    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("🗑️ Passbook entry delete ho gayi!");
}

function closeItemModal() {
    setDisplay("item-modal", "none");
    rawModalPassbookEntries = [];
    currentPassbookStoreKey = "";
}

// ================= 9. SANCHA STOCK MODULE =================

function getSanchaItems() {
    var items = getStore("sancha_items");
    if (!Array.isArray(items)) return [];
    return items;
}

function getSanchaItemStats(sanchaId, sanchaName) {
    var idMatch = String(sanchaId || "").trim();
    var nameLower = String(sanchaName || "").trim().toLowerCase();

    var items = getSanchaItems();
    var currentItem = items.find(function(x) {
        return x && (String(x.id) === idMatch || (x.name && x.name.trim().toLowerCase() === nameLower));
    });

    var hist = getStore("sancha_history");
    var histAaya = 0, manualGaya = 0;

    hist.forEach(function(h) {
        if (!h) return;
        var hIdMatch = (h.itemId && String(h.itemId) === idMatch);
        var hNameMatch = (h.itemName && h.itemName.trim().toLowerCase() === nameLower);

        if (hIdMatch || hNameMatch) {
            var q = Number(h.qty) || 0;
            if (String(h.type || "").indexOf("Aaya") !== -1) histAaya += q;
            else if (String(h.type || "").indexOf("Manual") !== -1) manualGaya += q;
        }
    });

    var itemRecordedAaya = currentItem ? (Number(currentItem.aaya) || Number(currentItem.totalQty) || 0) : 0;
    var totalAaya = Math.max(itemRecordedAaya, histAaya);

    var sheetGaya = 0;
    var allKarigers = (typeof sanitizeKarigerList === "function") ? sanitizeKarigerList() : [];
    allKarigers.forEach(function(k) {
        var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
        sheets.forEach(function(sh) {
            if (sh && sh.rows) {
                safeArray(sh.rows).forEach(function(r) {
                    if (r && r.sancha && r.sancha.trim().toLowerCase() === nameLower) {
                        sheetGaya += (Number(r.taniWazan) || 0);
                    }
                });
            }
        });
    });

    var totalGaya = sheetGaya + manualGaya;
    return { aaya: totalAaya, gaya: totalGaya, bacha: totalAaya - totalGaya };
}

function openSanchaModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("sancha-section", "block");
    renderSanchaTable();
}

function toggleAddSanchaItemForm() {
    var f = document.getElementById("add-sancha-item-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    document.getElementById("sancha-new-item-date").value = getTodayDate();
}

function saveNewSanchaItem() {
    var d = document.getElementById("sancha-new-item-date").value || getTodayDate();
    var n = (document.getElementById("sancha-new-item-name").value || "").trim();
    var q = parseFloat(document.getElementById("sancha-new-item-qty").value) || 0;

    if (!n) return alert("Sancha item ka naam daalein!");

    var items = getSanchaItems();
    var newId = "sancha_" + Date.now();
    items.push({ id: newId, name: n, date: d, aaya: q });
    setStore("sancha_items", items);

    if (q > 0) {
        var hist = getStore("sancha_history");
        hist.push({ id: Date.now(), itemId: newId, itemName: n, date: d, type: "Aaya (Starting)", qty: q, note: "Starting Stock Purchase" });
        setStore("sancha_history", hist);
    }

    toggleAddSanchaItemForm();
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Naya Sancha Item '" + n + "' ban gaya!");
}

function renderSanchaTable() {
    var items = getSanchaItems();
    var tbody = document.getElementById("sancha-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!items.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Koi Sancha Item nahi mila. Naya item jodein.</td></tr>";
        return;
    }

    items.forEach(function(item) {
        if (!item) return;
        var st = getSanchaItemStats(item.id, item.name);
        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(item.date) + "</td>" +
            "<td><strong style='color:#0284c7;'>⚙️ " + item.name + "</strong></td>" +
            "<td><span class='badge-green'>+" + st.aaya.toFixed(2) + "</span></td>" +
            "<td><span class='badge-red'>-" + st.gaya.toFixed(2) + "</span></td>" +
            "<td><span class='badge-blue'>" + st.bacha.toFixed(2) + "</span></td>" +
            "<td style='text-align:center;'><button class='detail-btn' style='background:#0284c7;' onclick='openSanchaDetailModal(\"" + item.id + "\")'>Detail</button> <button class='delete-btn' onclick='deleteSanchaItem(\"" + item.id + "\")'>🗑️</button></td>" +
        "</tr>";
    });
}

function deleteSanchaItem(id) {
    if (!confirm("Kya aap is Sancha item ko delete karna chahte hain?")) return;
    setStore("sancha_items", getSanchaItems().filter(function(i) { return i && String(i.id) !== String(id); }));
    setStore("sancha_history", getStore("sancha_history").filter(function(h) { return h && String(h.itemId) !== String(id); }));
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function openSanchaDetailModal(id) {
    var it = getSanchaItems().find(function(x) { return x && String(x.id) === String(id); });
    if (!it) return;

    activeSanchaItemId = it.id;
    var st = getSanchaItemStats(it.id, it.name);
    document.getElementById("sancha-modal-title").innerHTML = "📦 " + it.name + " (Bacha: " + st.bacha.toFixed(2) + ")";
    document.getElementById("sancha-entry-date").value = getTodayDate();
    document.getElementById("sancha-entry-qty").value = "";
    document.getElementById("sancha-entry-note").value = "";

    renderSanchaHistoryTable();
    setDisplay("sancha-detail-modal", "flex");
}

function closeSanchaDetailModal() {
    setDisplay("sancha-detail-modal", "none");
    activeSanchaItemId = null;
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function addSanchaStockEntry() {
    if (!activeSanchaItemId) return;
    var d = document.getElementById("sancha-entry-date").value || getTodayDate();
    var q = parseFloat(document.getElementById("sancha-entry-qty").value) || 0;
    var note = (document.getElementById("sancha-entry-note").value || "").trim();

    if (q <= 0) return alert("Sahi quantity bharein!");

    var items = getSanchaItems();
    var item = items.find(function(i) { return i && String(i.id) === String(activeSanchaItemId); });
    if (!item) return;

    var hist = getStore("sancha_history");
    hist.push({ id: Date.now(), itemId: item.id, itemName: item.name, date: d, type: "Aaya (Stock In)", qty: q, note: note || "Naya Maal Aaya" });
    setStore("sancha_history", hist);

    document.getElementById("sancha-entry-qty").value = "";
    document.getElementById("sancha-entry-note").value = "";

    var st = getSanchaItemStats(item.id, item.name);
    document.getElementById("sancha-modal-title").innerHTML = "📦 " + item.name + " (Bacha: " + st.bacha.toFixed(2) + ")";
    renderSanchaHistoryTable();
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + q + " stock jud gaya!");
}

function renderSanchaHistoryTable() {
    var hist = getStore("sancha_history");
    var tbody = document.getElementById("sancha-detail-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var currentItem = getSanchaItems().find(function(i) { return i && String(i.id) === String(activeSanchaItemId); });
    var currentItemName = currentItem ? currentItem.name.trim().toLowerCase() : "";
    var entries = [];

    hist.forEach(function(h, idx) {
        if (!h) return;
        var idMatch = (h.itemId && String(h.itemId) === String(activeSanchaItemId));
        var nameMatch = (h.itemName && h.itemName.trim().toLowerCase() === currentItemName);
        if (idMatch || nameMatch) {
            entries.push({ idx: idx, date: h.date, type: h.type || "Aaya", qty: Number(h.qty) || 0, note: h.note || "-", isSheet: false });
        }
    });

    var allKarigers = (typeof sanitizeKarigerList === "function") ? sanitizeKarigerList() : [];
    allKarigers.forEach(function(k) {
        var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
        sheets.forEach(function(sh) {
            if (sh && sh.rows) {
                safeArray(sh.rows).forEach(function(r) {
                    if (r && r.sancha && r.sancha.trim().toLowerCase() === currentItemName && Number(r.taniWazan) > 0) {
                        entries.push({ date: r.date, type: "Gaya (Tani)", qty: Number(r.taniWazan), note: k.name + " (" + (r.taniName || sh.title) + ")", isSheet: true });
                    }
                });
            }
        });
    });

    if (!entries.length) {
        tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:15px; color:#888;'>Koi entry nahi mili.</td></tr>";
        return;
    }

    entries.sort(function(a, b) { return (b.date > a.date) ? 1 : -1; });
    entries.forEach(function(e) {
        var isAaya = (String(e.type).indexOf("Aaya") !== -1);
        var actBtn = e.isSheet ? "<span style='color:#64748b; font-size:11px;'>Sheet Entry</span>" : ("<button class='delete-btn' onclick='deleteSanchaHistoryRow(" + e.idx + ")'>🗑️</button>");

        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(e.date) + "</td>" +
            "<td><span class='" + (isAaya ? "badge-green" : "badge-red") + "'>" + e.type + "</span></td>" +
            "<td><strong style='color:" + (isAaya ? "#059669" : "#dc2626") + ";'>" + (isAaya ? "+" : "-") + e.qty.toFixed(2) + "</strong></td>" +
            "<td>" + e.note + "</td>" +
            "<td style='text-align:center;'><button class='delete-btn' onclick='deleteSanchaHistoryRow(" + e.idx + ")'>🗑️</button></td>" +
        "</tr>";
    });
}

function deleteSanchaHistoryRow(idx) {
    if (!confirm("Kya aap is entry ko delete karna chahte hain?")) return;
    var hist = getStore("sancha_history");
    hist.splice(idx, 1);
    setStore("sancha_history", hist);
    renderSanchaHistoryTable();
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function autoDeductSanchaStock(wazan, date, karName, sanchaName, taniName) {
    return true;
}
