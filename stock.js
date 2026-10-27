/* ========================================================
   SIMPLICITY ERP - LIVE STOCK & MULTI-KARKHANA ENGINE
   File 3 of 5 • Developed by Farhan Jawed
   (Multi-Godam Sancha, Auto-Adjust Stock, Returning Add & Stock Passbook)
======================================================== */

var currentSareeStockTab = "fresh"; // "fresh", "finished", ya "lott"
var currentBanaKarkhanaFilter = "k_main";
var currentZariKarkhanaFilter = "k_main";
var currentSareeKarkhanaFilter = "k_main";
var currentSanchaKarkhanaFilter = "k_main"; // Point 6: Sancha Godam Filter

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
    renderSanchaKarkhanaTabs();
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

// POINT 6: SANCHA DYNAMIC GODAM TABS
function renderSanchaKarkhanaTabs() {
    var bar = document.getElementById("sancha-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";

    var kList = getKarkhanasSafe();
    kList.forEach(function(k) {
        var isActive = (String(currentSanchaKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button class='sheet-tab" + isActive + "' onclick='switchStockKarkhana(\"sancha\", \"" + k.id + "\")'>🏭 " + k.name + "</button>";
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
    } else if (section === "sancha") {
        currentSanchaKarkhanaFilter = kId;
        renderSanchaKarkhanaTabs();
        renderSanchaTable();
    }
}

// ================= 2. BANA MULTI-KARKHANA COMPUTATION (POINTS 3 & 4) =================

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
        bStock.forEach(function(b) {
            if (b && b.name && b.name.trim().toLowerCase() === nameLower) {
                totalAaya += (Number(b.aaya) || 0);
                if (b.date) lastDate = b.date;
            }
        });

        transfers.forEach(function(t) {
            if (t && t.itemName && t.itemName.trim().toLowerCase() === nameLower) {
                totalGaya += (Number(t.qty) || 0);
                if (t.date) lastDate = t.date;
            }
        });

        // POINT 3 & 4: Net Diya (-) aur Returning Wapas (+)
        allKarigers.filter(function(w) { return !w.karkhanaId || w.karkhanaId === "k_main"; }).forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (!r) return;
                    var rName = (r.banaItemName || "").trim().toLowerCase();
                    if (rName === nameLower) {
                        totalGaya += (Number(r.netBana) || 0);
                        totalAaya += (Number(r.retBana) || 0); // Point 4: Returning auto added
                        if (r.date) lastDate = r.date;
                    }
                });
            });
        });
    } else {
        transfers.filter(function(t) { return String(t.toKarkhanaId) === String(kId); }).forEach(function(t) {
            if (t && t.itemName && t.itemName.trim().toLowerCase() === nameLower) {
                totalAaya += (Number(t.qty) || 0);
                if (t.date) lastDate = t.date;
            }
        });

        // Branch Karigers Net Diya (-) aur Returning Wapas (+)
        allKarigers.filter(function(w) { return String(w.karkhanaId) === String(kId); }).forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (!r) return;
                    var rName = (r.banaItemName || "").trim().toLowerCase();
                    if (rName === nameLower) {
                        totalGaya += (Number(r.netBana) || 0);
                        totalAaya += (Number(r.retBana) || 0); // Point 4: Returning auto added
                        if (r.date) lastDate = r.date;
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

// ================= 3. ZARI MULTI-KARKHANA COMPUTATION (POINTS 3 & 4) =================

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
        zStock.forEach(function(z) {
            if (z && z.name && z.name.trim().toLowerCase() === nameLower) {
                totalAaya += (Number(z.aaya) || 0);
                if (z.date) lastDate = z.date;
            }
        });

        transfers.forEach(function(t) {
            if (t && t.itemName && t.itemName.trim().toLowerCase() === nameLower) {
                totalGaya += (Number(t.qty) || 0);
                if (t.date) lastDate = t.date;
            }
        });

        // POINT 3 & 4: Main Karigers Net Diya (-) aur Returning Wapas (+)
        allKarigers.filter(function(w) { return !w.karkhanaId || w.karkhanaId === "k_main"; }).forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (!r) return;
                    var rName = (r.zariItemName || "").trim().toLowerCase();
                    if (rName === nameLower) {
                        totalGaya += (Number(r.netZari) || 0);
                        totalAaya += (Number(r.retZari) || 0); // Point 4: Returning auto added
                        if (r.date) lastDate = r.date;
                    }
                });
            });
        });
    } else {
        transfers.filter(function(t) { return String(t.toKarkhanaId) === String(kId); }).forEach(function(t) {
            if (t && t.itemName && t.itemName.trim().toLowerCase() === nameLower) {
                totalAaya += (Number(t.qty) || 0);
                if (t.date) lastDate = t.date;
            }
        });

        // Branch Karigers Net Diya (-) aur Returning Wapas (+)
        allKarigers.filter(function(w) { return String(w.karkhanaId) === String(kId); }).forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (!r) return;
                    var rName = (r.zariItemName || "").trim().toLowerCase();
                    if (rName === nameLower) {
                        totalGaya += (Number(r.netZari) || 0);
                        totalAaya += (Number(r.retZari) || 0); // Point 4: Returning auto added
                        if (r.date) lastDate = r.date;
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
        
        var isOp = (b.isOpening || (b.note && b.note.indexOf("Opening") !== -1));
        var opBadge = isOp ? "<span class='badge-blue' style='font-size:10px; display:block; margin-top:2px;'>📦 Pichle Saal Se Uth Kar Aaya</span>" : "";

        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(st.date) + "</td>" +
            "<td><strong>" + b.name + " <span style='font-size:11px; color:#0284c7;'>(" + kName + ")</span></strong>" + opBadge + "</td>" +
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

// 🎯 POINT 5: BANA STOCK PASSBOOK WITH EXACT KARIGAR & GODAM DETAILS
function viewBanaPassbook(banaName) {
    var entries = [];
    var nameLower = (banaName || "").trim().toLowerCase();
    var kId = currentBanaKarkhanaFilter || "k_main";
    var isMain = (kId === "k_main");
    var kObj = getKarkhanasSafe().find(function(x) { return String(x.id) === String(kId); });
    var kName = kObj ? kObj.name : "Godown";

    if (isMain) {
        getStore("bana_stock").forEach(function(b) {
            if (b && b.name && b.name.trim().toLowerCase() === nameLower && Number(b.aaya) > 0) {
                var desc = (b.isOpening || (b.note && b.note.indexOf("Opening") !== -1)) ? "📦 Opening Stock" : "Godam Purchase";
                entries.push({ id: b.id, date: b.date || getTodayDate(), type: desc, qty: "+" + Number(b.aaya).toFixed(2), kariger: "Main Godam Inward" });
            }
        });

        safeArray(getStore("material_transfers")).filter(function(t) { return t && t.type === "bana" && t.itemName.toLowerCase() === nameLower; }).forEach(function(t) {
            entries.push({ id: t.id, date: t.date, type: "Branch Ko Bheja", qty: "-" + Number(t.qty).toFixed(2), kariger: "Sent to " + t.toKarkhanaName });
        });
    } else {
        safeArray(getStore("material_transfers")).filter(function(t) { return t && t.type === "bana" && String(t.toKarkhanaId) === String(kId) && t.itemName.toLowerCase() === nameLower; }).forEach(function(t) {
            entries.push({ id: t.id, date: t.date, type: "Main Godam Se Aaya", qty: "+" + Number(t.qty).toFixed(2), kariger: "Received from Head Office" });
        });
    }

    var kKarigers = (typeof sanitizeKarigerList === "function") ? sanitizeKarigerList().filter(function(w) { 
        return isMain ? (!w.karkhanaId || w.karkhanaId === "k_main") : (String(w.karkhanaId) === String(kId)); 
    }) : [];

    kKarigers.forEach(function(k) {
        var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
        sheets.forEach(function(sh) {
            safeArray(sh.rows).forEach(function(r) {
                if (r && r.banaItemName && r.banaItemName.trim().toLowerCase() === nameLower) {
                    if (Number(r.netBana) > 0) {
                        entries.push({ id: r.id, refId: r.id, date: r.date, type: "Karigar Ko Diya", qty: "-" + Number(r.netBana).toFixed(2), kariger: k.name + " (" + (r.taniName || sh.title) + ")" });
                    }
                    if (Number(r.retBana) > 0) {
                        entries.push({ id: r.id, refId: r.id, date: r.date, type: "Returning Wapas Aaya", qty: "+" + Number(r.retBana).toFixed(2), kariger: k.name + " (" + (r.taniName || sh.title) + ")" });
                    }
                }
            });
        });
    });

    viewCustomDatePassbook("Bana Passbook: " + banaName + " (" + kName + ")", entries, "bana_history");
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
        
        var isOp = (z.isOpening || (z.note && z.note.indexOf("Opening") !== -1));
        var opBadge = isOp ? "<span class='badge-blue' style='font-size:10px; display:block; margin-top:2px;'>📦 Pichle Saal Se Uth Kar Aayi</span>" : "";

        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(st.date) + "</td>" +
            "<td><strong>" + z.name + " <span style='font-size:11px; color:#ea580c;'>(" + kName + ")</span></strong>" + opBadge + "</td>" +
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

// 🎯 POINT 5: ZARI STOCK PASSBOOK WITH EXACT KARIGAR & GODAM DETAILS
function viewZariPassbook(zariName) {
    var entries = [];
    var nameLower = (zariName || "").trim().toLowerCase();
    var kId = currentZariKarkhanaFilter || "k_main";
    var isMain = (kId === "k_main");
    var kObj = getKarkhanasSafe().find(function(x) { return String(x.id) === String(kId); });
    var kName = kObj ? kObj.name : "Godown";

    if (isMain) {
        getStore("zari_stock").forEach(function(z) {
            if (z && z.name && z.name.trim().toLowerCase() === nameLower && Number(z.aaya) > 0) {
                var desc = (z.isOpening || (z.note && z.note.indexOf("Opening") !== -1)) ? "📦 Opening Stock" : "Godam Purchase";
                entries.push({ id: z.id, date: z.date || getTodayDate(), type: desc, qty: "+" + Number(z.aaya).toFixed(2), kariger: "Main Godam Inward" });
            }
        });

        safeArray(getStore("material_transfers")).filter(function(t) { return t && t.type === "zari" && t.itemName.toLowerCase() === nameLower; }).forEach(function(t) {
            entries.push({ id: t.id, date: t.date, type: "Branch Ko Bheji", qty: "-" + Number(t.qty).toFixed(2), kariger: "Sent to " + t.toKarkhanaName });
        });
    } else {
        safeArray(getStore("material_transfers")).filter(function(t) { return t && t.type === "zari" && String(t.toKarkhanaId) === String(kId) && t.itemName.toLowerCase() === nameLower; }).forEach(function(t) {
            entries.push({ id: t.id, date: t.date, type: "Main Godam Se Aayi", qty: "+" + Number(t.qty).toFixed(2), kariger: "Received from Head Office" });
        });
    }

    var kKarigers = (typeof sanitizeKarigerList === "function") ? sanitizeKarigerList().filter(function(w) { 
        return isMain ? (!w.karkhanaId || w.karkhanaId === "k_main") : (String(w.karkhanaId) === String(kId)); 
    }) : [];

    kKarigers.forEach(function(k) {
        var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
        sheets.forEach(function(sh) {
            safeArray(sh.rows).forEach(function(r) {
                if (r && r.zariItemName && r.zariItemName.trim().toLowerCase() === nameLower) {
                    if (Number(r.netZari) > 0) {
                        entries.push({ id: r.id, refId: r.id, date: r.date, type: "Karigar Ko Diya", qty: "-" + Number(r.netZari).toFixed(2), kariger: k.name + " (" + (r.taniName || sh.title) + ")" });
                    }
                    if (Number(r.retZari) > 0) {
                        entries.push({ id: r.id, refId: r.id, date: r.date, type: "Returning Wapas Aayi", qty: "+" + Number(r.retZari).toFixed(2), kariger: k.name + " (" + (r.taniName || sh.title) + ")" });
                    }
                }
            });
        });
    });

    viewCustomDatePassbook("Zari Passbook: " + zariName + " (" + kName + ")", entries, "zari_history");
}

// ================= 5. 🚚 MATERIAL & SANCHA TRANSFER (POINTS 5 & 6) =================

function openMaterialTransferModal(type) {
    var isZari = (type === "zari");
    var isSancha = (type === "sancha");

    document.getElementById("mat-transfer-type").value = type;

    var titleEl = document.getElementById("mat-transfer-modal-title");
    var labelEl = document.getElementById("mat-transfer-item-label");
    var qtyLabelEl = document.getElementById("mat-transfer-qty-label");

    if (isSancha) {
        if (titleEl) titleEl.textContent = "🚚 Karkhane Ko Sancha Bheja";
        if (labelEl) labelEl.textContent = "Sancha Item Ka Naam";
        if (qtyLabelEl) qtyLabelEl.textContent = "Kitna Sancha Bheja (Wazan/Qty)";
    } else if (isZari) {
        if (titleEl) titleEl.textContent = "🚚 Karkhane Ko Zari Bheji";
        if (labelEl) labelEl.textContent = "Zari Ka Naam";
        if (qtyLabelEl) qtyLabelEl.textContent = "Kitni Bheji (Qty in Kg)";
    } else {
        if (titleEl) titleEl.textContent = "🚚 Karkhane Ko Bana Bheja";
        if (labelEl) labelEl.textContent = "Bana Ka Naam";
        if (qtyLabelEl) qtyLabelEl.textContent = "Kitna Bheja (Qty in Kg)";
    }

    document.getElementById("mat-transfer-date").value = getTodayDate();
    document.getElementById("mat-transfer-qty").value = "";
    document.getElementById("mat-transfer-note").value = "";

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
    else if (type === "zari") renderZariTable();
    else if (type === "sancha") renderSanchaTable();

    alert("✅ " + qty + " " + item + " Main Godam se " + destName + " ko bhej diya gaya!");
}

// ================= 6. 🥻 SAREE STOCK MODULE =================

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

function getCleanFinishedSareeStock() {
    var list = safeArray(getStore("finished_saree_stock"));
    return list.filter(function(item) {
        if (!item || Number(item.pcs) <= 0) return false;
        var nameLower = String(item.name || "").toLowerCase();
        return nameLower.indexOf("calender") !== -1 || (item.source && item.source.indexOf("Opening") !== -1);
    });
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

    // 1. FRESH SAREE TAB
    if (currentSareeStockTab === "fresh") {
        thead.innerHTML = "<tr style='background:#2563eb; color:white;'>" +
            "<th>Date</th><th>S.No.</th><th>Saree Ka Naam</th><th>Kariger / Karkhana</th><th>Fresh Stock (Pcs)</th><th>Out / Transfer</th><th style='text-align:center;'>Action</th>" +
        "</tr>";

        var allSareeStock = safeArray(getStore("saree_stock"));
        var list = [];
        if (isMain) {
            list = allSareeStock.filter(function(s) { return !s.karkhanaId || s.karkhanaId === "k_main"; });
        } else {
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

            var isOp = (s.isOpening || (s.kariger && s.kariger.indexOf("Opening Stock") !== -1));
            var opBadge = isOp ? "<span class='badge-blue' style='font-size:10px; display:block; margin-top:2px;'>📦 Pichle Saal Se Uth Kar Aaya</span>" : "";

            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(s.date) + "</td>" +
                "<td>" + (idx + 1) + "</td>" +
                "<td><strong>" + s.name + "</strong>" + opBadge + "</td>" +
                "<td>" + (s.kariger || "-") + " <span style='font-size:11px; color:#0284c7;'>(" + (s.karkhanaName || kName) + ")</span></td>" +
                "<td><span class='badge-blue'>" + s.pcs + " pcs</span></td>" +
                "<td>" +
                    "<div style='display:flex; gap:4px; align-items:center;'>" +
                        "<input type='number' id='saree-out-input-" + s.id + "' placeholder='Qty' style='width:60px; padding:4px; font-size:12px; border:1px solid #cbd5e1; border-radius:6px;' min='1'>" +
                        "<button class='quick-btn btn-out' onclick='outSareeById(\"" + s.id + "\")'>📤 Out</button>" +
                    "</div>" +
                "</td>" +
                "<td style='text-align:center;'><button class='detail-btn' onclick='viewFreshSareePassbook(\"" + s.name + "\")'>📖 Passbook</button> <button class='delete-btn' onclick='deleteSareeById(\"" + s.id + "\")'>🗑️</button></td>" +
            "</tr>";
        });

        if (tfoot) {
            tfoot.innerHTML = "<tr style='background:#eff6ff; font-weight:800; border-top:2px solid #2563eb;'>" +
                "<td colspan='4'>📊 KUL FRESH STOCK (" + kName + "):</td>" +
                "<td style='color:#2563eb; font-size:15px;'>" + totFresh + " Pcs</td>" +
                "<td colspan='2'>-</td>" +
            "</tr>";
        }

    // 2. FINISHED SAREE TAB
    } else if (currentSareeStockTab === "finished") {
        thead.innerHTML = "<tr style='background:#0d9488; color:white;'>" +
            "<th>Date</th><th>S.No.</th><th>Tayaar Saree (Process)</th><th>Kahan Se Aayi (Source)</th><th>Finished Stock (Pcs)</th><th>Out (Bikri/Dukan)</th><th style='text-align:center;'>Action</th>" +
        "</tr>";

        var finList = getCleanFinishedSareeStock();
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

            var isOp = (f.isOpening || (f.source && f.source.indexOf("Opening Stock") !== -1));
            var opBadge = isOp ? "<span class='badge-blue' style='font-size:10px; display:block; margin-top:2px;'>📦 Pichle Saal Se Uth Kar Aaya</span>" : "";

            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(f.date) + "</td>" +
                "<td>" + (idx + 1) + "</td>" +
                "<td><strong style='color:#0d9488;'>🎛️ " + (f.name || "Calender Finished Saree") + "</strong>" + opBadge + "</td>" +
                "<td>" + (f.source || "Calender Finishing") + "</td>" +
                "<td><span class='badge-green' style='font-size:13px; font-weight:800;'>" + pcs + " pcs</span></td>" +
                "<td>" +
                    "<div style='display:flex; gap:4px; align-items:center;'>" +
                        "<input type='number' id='fin-out-input-" + f.id + "' placeholder='Qty' style='width:60px; padding:4px; font-size:12px; border:1px solid #cbd5e1; border-radius:6px;' min='1'>" +
                        "<button class='quick-btn btn-out' style='background:#0d9488; color:white;' onclick='outFinishedSareeById(\"" + f.id + "\")'>📤 Out</button>" +
                    "</div>" +
                "</td>" +
                "<td style='text-align:center;'><button class='detail-btn' onclick='viewFinishedSareePassbook(\"" + (f.name || "Calender Finished Saree") + "\")'>📖 Passbook</button> <button class='delete-btn' onclick='deleteFinishedSareeById(\"" + f.id + "\")'>🗑️</button></td>" +
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

            var isOp = (l.isOpening || (l.source && l.source.indexOf("Opening Stock") !== -1));
            var opBadge = isOp ? "<span class='badge-blue' style='font-size:10px; display:block; margin-top:2px;'>📦 Pichle Saal Se Uth Kar Aaya</span>" : "";

            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(l.date) + "</td>" +
                "<td><strong>" + l.name + "</strong>" + opBadge + "</td>" +
                "<td>" + (l.source || "Loom / Job Work") + "</td>" +
                "<td><span class='badge-red'>⚠️ " + (l.pcs || 0) + " pcs</span></td>" +
                "<td><button class='quick-btn btn-out' style='background:#fef2f2; border:1px solid #fca5a5; font-size:12px; font-weight:700;' onclick='outLottSareeById(\"" + l.id + "\")'>📤 Out</button></td>" +
                "<td style='text-align:center;'><button class='detail-btn' onclick='viewLottSareePassbook(\"" + l.name + "\")'>📖 Passbook</button> <button class='delete-btn' onclick='deleteLottSareeById(\"" + l.id + "\")'>🗑️</button></td>" +
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

// 🎯 ID-LOCKED OPERATIONS
function outSareeById(sId) {
    var inp = document.getElementById("saree-out-input-" + sId);
    var qty = parseInt(inp ? inp.value : 0, 10);

    if (!qty || qty <= 0) return alert("Sahi quantity likhein!");

    var stock = safeArray(getStore("saree_stock"));
    var item = stock.find(function(x) { return x && String(x.id) === String(sId); });
    if (!item) return alert("Saree item nahi mila!");

    if (qty > item.pcs) {
        return alert("Is item me sirf " + item.pcs + " saree bachi hai!");
    }

    item.pcs -= qty;
    setStore("saree_stock", stock);

    var h = safeArray(getStore("saree_history"));
    h.push({
        id: "sh_sale_" + Date.now(),
        refId: sId,
        date: getTodayDate(),
        name: item.name,
        kariger: item.kariger || "Godam",
        type: "Out (Sale)",
        pcs: qty,
        note: (item.karkhanaName || "Main Godown") + " se Out (Bikri)"
    });
    setStore("saree_history", h);

    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + qty + " Saree Out ho gayi!");
}

function deleteSareeById(sId) {
    if (!confirm("Kya aap is saree record ko delete karna chahte hain?")) return;
    var stock = safeArray(getStore("saree_stock")).filter(function(x) {
        return !x || String(x.id) !== String(sId);
    });
    setStore("saree_stock", stock);
    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function outFinishedSareeById(fId) {
    var inp = document.getElementById("fin-out-input-" + fId);
    var qty = parseInt(inp ? inp.value : 0, 10);

    if (!qty || qty <= 0) return alert("Sahi quantity likhein!");

    var stock = safeArray(getStore("finished_saree_stock"));
    var item = stock.find(function(x) { return x && String(x.id) === String(fId); });
    if (!item) return alert("Tayaar Saree item nahi mila!");

    if (qty > item.pcs) {
        return alert("Finished Stock me sirf " + item.pcs + " saree bachi hai!");
    }

    item.pcs -= qty;
    setStore("finished_saree_stock", stock);

    var h = safeArray(getStore("saree_history"));
    h.push({
        id: "sh_fin_out_" + Date.now(),
        refId: fId,
        date: getTodayDate(),
        name: item.name || "Calender Finished Saree",
        kariger: item.source || "Finished Stock",
        type: "Out (Finished Sale)",
        pcs: qty,
        note: "Tayaar Saree Bikri / Dukan Bheja"
    });
    setStore("saree_history", h);

    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + qty + " Tayaar Saree Out ho gayi!");
}

function deleteFinishedSareeById(fId) {
    if (!confirm("Kya aap is Finished Saree record ko delete karna chahte hain?")) return;
    var stock = safeArray(getStore("finished_saree_stock")).filter(function(x) {
        return !x || String(x.id) !== String(fId);
    });
    setStore("finished_saree_stock", stock);
    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function outLottSareeById(lId) {
    var stock = safeArray(getStore("lott_saree_stock"));
    var item = stock.find(function(x) { return x && String(x.id) === String(lId); });
    if (!item) return alert("Lott item nahi mila!");

    var qty = parseInt(prompt("Saree: " + item.name + "\nLott Pcs Available: " + item.pcs + "\n\nKitne Pcs Out karne hain:", item.pcs), 10);
    if (!qty || isNaN(qty) || qty <= 0) return;
    if (qty > item.pcs) return alert("Sirf " + item.pcs + " Pcs available hain!");

    var note = prompt("Out Note / Vivran:", "Lott Saree Out") || "Lott Saree Out";
    item.pcs -= qty;
    setStore("lott_saree_stock", stock);

    var h = safeArray(getStore("saree_history"));
    h.push({
        id: "sh_lott_" + Date.now(),
        refId: lId,
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

function deleteLottSareeById(lId) {
    if (!confirm("Kya aap is Lott Saree record ko delete karna chahte hain?")) return;
    var stock = safeArray(getStore("lott_saree_stock")).filter(function(x) {
        return !x || String(x.id) !== String(lId);
    });
    setStore("lott_saree_stock", stock);
    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function filterSaree() {
    var txt = (document.getElementById("search-saree-input").value || "").toLowerCase().trim();
    var fD = document.getElementById("saree-from-date").value;
    var tD = document.getElementById("saree-to-date").value;

    if (currentSareeStockTab === "fresh") {
        var kId = currentSareeKarkhanaFilter || "k_main";
        var isMain = (kId === "k_main");
        var allSareeStock = safeArray(getStore("saree_stock"));
        var baseList = isMain ? allSareeStock.filter(function(s) { return !s.karkhanaId || s.karkhanaId === "k_main"; })
                              : allSareeStock.filter(function(s) { return String(s.karkhanaId) === String(kId); });

        var filteredFresh = baseList.filter(function(s) {
            return s && (String(s.name || "") + " " + String(s.kariger || "") + " " + formatDateDisplay(s.date)).toLowerCase().indexOf(txt) !== -1 && isDateInRange(s.date, fD, tD);
        });
        renderSareeTable(filteredFresh);
    } else if (currentSareeStockTab === "finished") {
        var finList = getCleanFinishedSareeStock().filter(function(f) {
            return f && (String(f.name || "") + " " + String(f.source || "") + " " + formatDateDisplay(f.date)).toLowerCase().indexOf(txt) !== -1 && isDateInRange(f.date, fD, tD);
        });
        renderSareeTable(finList);
    } else if (currentSareeStockTab === "lott") {
        var lottList = safeArray(getStore("lott_saree_stock")).filter(function(l) {
            return l && (String(l.name || "") + " " + String(l.source || "") + " " + formatDateDisplay(l.date)).toLowerCase().indexOf(txt) !== -1 && isDateInRange(l.date, fD, tD);
        });
        renderSareeTable(lottList);
    }
}

function resetSareeFilter() {
    document.getElementById("saree-from-date").value = "";
    document.getElementById("saree-to-date").value = "";
    document.getElementById("search-saree-input").value = "";
    renderSareeTable();
}

// ================= 7. 📥 SAREE INWARD / TRANSFER =================

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
    var pcs = parseInt(document.getElementById("saree-transfer-pcs").value, 10) || 0;
    var note = (document.getElementById("saree-transfer-note").value || "").trim();

    if (!sourceId) return alert("Source Karkhana chunein!");
    if (pcs <= 0) return alert("Saree Pcs bharein!");

    var sourceKarkhana = getKarkhanasSafe().find(function(x) { return String(x.id) === String(sourceId); });
    var sourceName = sourceKarkhana ? sourceKarkhana.name : "Branch Karkhana";

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

// ================= 8. PASSBOOK WITH REVERSIBLE & GHOST-FREE DELETE =================

function viewFreshSareePassbook(sareeName) {
    var entries = [];
    var hist = getStore("saree_history");
    hist.forEach(function(it) {
        if (!it) return;
        var nMatch = (it.name && it.name.toLowerCase() === String(sareeName || "").toLowerCase());
        var isFresh = !String(it.type || "").toLowerCase().includes("lott") && !String(it.type || "").toLowerCase().includes("finished");
        if (nMatch && isFresh) {
            entries.push({ id: it.id, refId: it.refId, date: it.date, type: it.type || "-", qty: it.pcs || it.qty || 0, kariger: it.kariger || "-" });
        }
    });

    var openItems = safeArray(getStore("saree_stock")).filter(function(s) {
        return (s.isOpening || (s.kariger && s.kariger.indexOf("Opening Stock") !== -1)) &&
               s.name.toLowerCase() === String(sareeName || "").toLowerCase();
    });
    openItems.forEach(function(op) {
        entries.push({ id: op.id, date: op.date, type: "📦 Opening Stock", qty: op.pcs, kariger: "Pichle Saal Ki Closing Se Aaya" });
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
            entries.push({ id: it.id, refId: it.refId, date: it.date, type: it.type || "Finished", qty: it.pcs || it.qty || 0, kariger: it.kariger || "Job Work" });
        }
    });

    var finOpen = safeArray(getStore("finished_saree_stock")).filter(function(f) {
        return f.isOpening || (f.source && f.source.indexOf("Opening Stock") !== -1);
    });
    finOpen.forEach(function(op) {
        entries.push({ id: op.id, date: op.date, type: "📦 Opening Stock", qty: op.pcs, kariger: "Pichle Saal Ki Closing Se Aaya" });
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
            entries.push({ id: it.id, refId: it.refId, date: it.date, type: it.type || "Lott", qty: it.pcs || it.qty || 0, kariger: it.kariger || "Lott" });
        }
    });

    var lottOpen = safeArray(getStore("lott_saree_stock")).filter(function(l) {
        return l.isOpening || (l.source && l.source.indexOf("Opening Stock") !== -1);
    });
    lottOpen.forEach(function(op) {
        entries.push({ id: op.id, date: op.date, type: "📦 Opening Stock", qty: op.pcs, kariger: "Pichle Saal Ki Closing Se Aaya" });
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
    if (!confirm("Kya aap is passbook entry ko delete karna chahte hain? Iska stock bhi wapas adjust ho jayega.")) return;

    var historyKey = currentPassbookStoreKey || "saree_history";
    var histList = safeArray(getStore(historyKey));
    var entry = histList.find(function(x) { return x && String(x.id) === String(entryId); });

    if (entry) {
        var refId = entry.refId;
        var pcs = Number(entry.pcs || entry.qty) || 0;
        var typeStr = String(entry.type || "").toLowerCase();

        // REVERSE STOCK ACCORDING TO TYPE
        if (historyKey === "saree_history") {
            if (typeStr.indexOf("out") !== -1) {
                if (typeStr.indexOf("finished") !== -1) {
                    var fStock = safeArray(getStore("finished_saree_stock"));
                    if (fStock.length) { fStock[0].pcs = (Number(fStock[0].pcs) || 0) + pcs; setStore("finished_saree_stock", fStock); }
                } else if (typeStr.indexOf("lott") !== -1) {
                    var lStock = safeArray(getStore("lott_saree_stock"));
                    if (lStock.length) { lStock[0].pcs = (Number(lStock[0].pcs) || 0) + pcs; setStore("lott_saree_stock", lStock); }
                } else {
                    var sStock = safeArray(getStore("saree_stock"));
                    if (sStock.length) { sStock[0].pcs = (Number(sStock[0].pcs) || 0) + pcs; setStore("saree_stock", sStock); }
                }
            } else if (typeStr.indexOf("in") !== -1) {
                if (typeStr.indexOf("finished") !== -1) {
                    var fStock = safeArray(getStore("finished_saree_stock"));
                    if (fStock.length) { fStock[0].pcs = Math.max(0, (Number(fStock[0].pcs) || 0) - pcs); setStore("finished_saree_stock", fStock); }
                } else {
                    var sStock = safeArray(getStore("saree_stock"));
                    if (sStock.length) { sStock[0].pcs = Math.max(0, (Number(sStock[0].pcs) || 0) - pcs); setStore("saree_stock", sStock); }
                }
            }
        }

        // Delete linked row from Kariger Sheet
        if (refId && typeof deleteSheetRowByRefId === "function") {
            deleteSheetRowByRefId(refId);
        }
    }

    histList = histList.filter(function(x) { return !x || String(x.id) !== String(entryId); });
    setStore(historyKey, histList);

    rawModalPassbookEntries = rawModalPassbookEntries.filter(function(x) { return !x || String(x.id) !== String(entryId); });
    renderModalPassbookRows(rawModalPassbookEntries);
    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("🗑️ Passbook entry delete ho gayi aur Stock turant adjust ho gaya!");
}

function closeItemModal() {
    setDisplay("item-modal", "none");
    rawModalPassbookEntries = [];
    currentPassbookStoreKey = "";
}

// ================= 9. SANCHA STOCK MODULE (POINT 6: MULTI-GODAM SYSTEM) =================

function getSanchaItems() {
    var items = getStore("sancha_items");
    if (!Array.isArray(items)) return [];
    return items;
}

// POINT 6: SANCHA ITEM STATS BY GODAM / KARKHANA
function getSanchaItemStats(sanchaId, sanchaName, targetKarkhanaId) {
    var kId = targetKarkhanaId || currentSanchaKarkhanaFilter || "k_main";
    var isMain = (kId === "k_main");
    var idMatch = String(sanchaId || "").trim();
    var nameLower = String(sanchaName || "").trim().toLowerCase();

    var items = getSanchaItems();
    var currentItem = items.find(function(x) {
        return x && (String(x.id) === idMatch || (x.name && x.name.trim().toLowerCase() === nameLower));
    });

    var hist = getStore("sancha_history");
    var totalAaya = 0;
    var totalGaya = 0;
    var lastDate = "";

    if (isMain) {
        var itemRecordedAaya = currentItem ? (Number(currentItem.aaya) || Number(currentItem.totalQty) || 0) : 0;
        var histAaya = 0;
        hist.forEach(function(h) {
            if (!h) return;
            var hIdMatch = (h.itemId && String(h.itemId) === idMatch);
            var hNameMatch = (h.itemName && h.itemName.trim().toLowerCase() === nameLower);
            if (hIdMatch || hNameMatch) {
                if (String(h.type || "").indexOf("Aaya") !== -1) histAaya += (Number(h.qty) || 0);
                if (h.date) lastDate = h.date;
            }
        });
        totalAaya = Math.max(itemRecordedAaya, histAaya);

        // Main Godam se Branch ko gaya transfer
        safeArray(getStore("material_transfers")).filter(function(t) {
            return t && t.type === "sancha" && t.itemName.toLowerCase() === nameLower;
        }).forEach(function(t) {
            totalGaya += (Number(t.qty) || 0);
            if (t.date) lastDate = t.date;
        });

        // Main Godam Karigaron me Tani Gaya
        var allKarigers = (typeof sanitizeKarigerList === "function") ? sanitizeKarigerList() : [];
        allKarigers.filter(function(w) { return !w.karkhanaId || w.karkhanaId === "k_main"; }).forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                if (sh && sh.rows) {
                    safeArray(sh.rows).forEach(function(r) {
                        if (r && r.sancha && r.sancha.trim().toLowerCase() === nameLower && Number(r.taniWazan) > 0) {
                            totalGaya += (Number(r.taniWazan) || 0);
                            if (r.date) lastDate = r.date;
                        }
                    });
                }
            });
        });
    } else {
        // Branch Godam me Aaya (Transfer Received from Main)
        safeArray(getStore("material_transfers")).filter(function(t) {
            return t && t.type === "sancha" && String(t.toKarkhanaId) === String(kId) && t.itemName.toLowerCase() === nameLower;
        }).forEach(function(t) {
            totalAaya += (Number(t.qty) || 0);
            if (t.date) lastDate = t.date;
        });

        // Branch Godam Karigaron me Tani Gaya
        var bKarigers = (typeof sanitizeKarigerList === "function") ? sanitizeKarigerList().filter(function(w) { return String(w.karkhanaId) === String(kId); }) : [];
        bKarigers.forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                if (sh && sh.rows) {
                    safeArray(sh.rows).forEach(function(r) {
                        if (r && r.sancha && r.sancha.trim().toLowerCase() === nameLower && Number(r.taniWazan) > 0) {
                            totalGaya += (Number(r.taniWazan) || 0);
                            if (r.date) lastDate = r.date;
                        }
                    });
                }
            });
        });
    }

    return { 
        aaya: totalAaya, 
        gaya: totalGaya, 
        bacha: totalAaya - totalGaya,
        date: lastDate || getTodayDate()
    };
}

function openSanchaModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("sancha-section", "block");
    renderSanchaKarkhanaTabs();
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
    items.push({ id: newId, name: n, date: d, aaya: q, karkhanaId: "k_main" });
    setStore("sancha_items", items);

    if (q > 0) {
        var hist = getStore("sancha_history");
        hist.push({ id: Date.now(), itemId: newId, itemName: n, date: d, type: "Aaya (Starting)", qty: q, note: "Main Godam Starting Stock" });
        setStore("sancha_history", hist);
    }

    toggleAddSanchaItemForm();
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Naya Sancha Item '" + n + "' Main Godam me ban gaya!");
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

    var kObj = getKarkhanasSafe().find(function(x) { return String(x.id) === String(currentSanchaKarkhanaFilter); });
    var kName = kObj ? kObj.name : "Main Godown";

    items.forEach(function(item) {
        if (!item) return;
        var st = getSanchaItemStats(item.id, item.name, currentSanchaKarkhanaFilter);
        var opTag = (item.note && item.note.indexOf("Opening") !== -1) ? "<span class='badge-blue' style='font-size:10px; display:block; margin-top:2px;'>📦 Pichle Saal Se Aaya</span>" : "";

        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(st.date || item.date) + "</td>" +
            "<td><strong style='color:#0284c7;'>⚙️ " + item.name + " <span style='font-size:11px;'>(" + kName + ")</span></strong>" + opTag + "</td>" +
            "<td><span class='badge-green'>+" + st.aaya.toFixed(2) + "</span></td>" +
            "<td><span class='badge-red'>-" + st.gaya.toFixed(2) + "</span></td>" +
            "<td><span class='badge-blue' style='font-size:13px; font-weight:800;'>" + st.bacha.toFixed(2) + "</span></td>" +
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
    var st = getSanchaItemStats(it.id, it.name, currentSanchaKarkhanaFilter);
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

    var st = getSanchaItemStats(item.id, item.name, currentSanchaKarkhanaFilter);
    document.getElementById("sancha-modal-title").innerHTML = "📦 " + item.name + " (Bacha: " + st.bacha.toFixed(2) + ")";
    renderSanchaHistoryTable();
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + q + " stock jud gaya!");
}

// 🎯 POINT 6 & BUG FIX: SANCHA TABLE WITH ACTIONCOL
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
            entries.push({ histIndex: idx, date: h.date, type: h.type || "Aaya", qty: Number(h.qty) || 0, note: h.note || "-", isSheet: false });
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
        
        // BUG FIX: Agar Sheet Entry hai to text dikhega, direct purchase hai to delete button
        var actionCol = e.isSheet 
            ? "<span style='color:#64748b; font-size:11px; font-weight:bold;'>Sheet Entry</span>" 
            : ("<button class='delete-btn' onclick='deleteSanchaHistoryRow(" + e.histIndex + ")'>🗑️</button>");

        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(e.date) + "</td>" +
            "<td><span class='" + (isAaya ? "badge-green" : "badge-red") + "'>" + e.type + "</span></td>" +
            "<td><strong style='color:" + (isAaya ? "#059669" : "#dc2626") + ";'>" + (isAaya ? "+" : "-") + e.qty.toFixed(2) + "</strong></td>" +
            "<td>" + e.note + "</td>" +
            "<td style='text-align:center;'>" + actionCol + "</td>" +
        "</tr>";
    });
}

function deleteSanchaHistoryRow(idx) {
    if (idx === undefined || idx === null || idx < 0) return;
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
