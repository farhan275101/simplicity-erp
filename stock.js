/* ========================================================
   SIMPLICITY ERP - LIVE STOCK & MULTI-KARKHANA ENGINE
   File 3 of 5 • Developed by Farhan Jawed
   (Multi-Godown Opening Engine, Frozen Opening Stock & 2-Col Passbook)
======================================================== */

var currentSareeStockTab = "fresh"; // "fresh", "finished", ya "lott"
var currentBanaKarkhanaFilter = "k_main";
var currentZariKarkhanaFilter = "k_main";
var currentSareeKarkhanaFilter = "k_main";
var currentSanchaKarkhanaFilter = "k_main";

var rawModalPassbookEntries = [];
var currentPassbookStoreKey = "";
var isModalSareePassbookMode = false;

// Helper to get previous session name for Opening Stock Reference
function getPreviousSessionLabel() {
    var cur = (typeof getActiveFinancialSession === "function") ? getActiveFinancialSession() : "2026-2027";
    var parts = String(cur).split("-");
    if (parts.length === 2 && !isNaN(parseInt(parts[0], 10)) && !isNaN(parseInt(parts[1], 10))) {
        return (parseInt(parts[0], 10) - 1) + "-" + (parseInt(parts[1], 10) - 1);
    }
    return "Pichle Saal";
}

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

// ================= 2. BANA MULTI-KARKHANA COMPUTATION =================

function getBanaItemStats(itemName, targetKarkhanaId) {
    var kId = targetKarkhanaId || currentBanaKarkhanaFilter || "k_main";
    var isMain = (kId === "k_main");
    var nameLower = (itemName || "").trim().toLowerCase();

    var totalAaya = 0;
    var totalGaya = 0;
    var lastDate = "";

    var bStock = safeArray(getStore("bana_stock"));
    var transfers = safeArray(getStore("material_transfers")).filter(function(t) { return t && t.type === "bana"; });
    var allKarigers = (typeof sanitizeKarigerList === "function") ? sanitizeKarigerList() : [];

    if (isMain) {
        bStock.forEach(function(b) {
            var matchK = (!b.karkhanaId || b.karkhanaId === "k_main");
            if (b && matchK && b.name && b.name.trim().toLowerCase() === nameLower) {
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

        allKarigers.filter(function(w) { return !w.karkhanaId || w.karkhanaId === "k_main"; }).forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (!r) return;
                    var rName = (r.banaItemName || "").trim().toLowerCase();
                    if (rName === nameLower) {
                        totalGaya += (Number(r.netBana) || 0);
                        totalAaya += (Number(r.retBana) || 0);
                        if (r.date) lastDate = r.date;
                    }
                });
            });
        });
    } else {
        bStock.forEach(function(b) {
            if (b && String(b.karkhanaId) === String(kId) && b.name && b.name.trim().toLowerCase() === nameLower) {
                totalAaya += (Number(b.aaya) || 0);
                if (b.date) lastDate = b.date;
            }
        });

        transfers.filter(function(t) { return String(t.toKarkhanaId) === String(kId); }).forEach(function(t) {
            if (t && t.itemName && t.itemName.trim().toLowerCase() === nameLower) {
                totalAaya += (Number(t.qty) || 0);
                if (t.date) lastDate = t.date;
            }
        });

        allKarigers.filter(function(w) { return String(w.karkhanaId) === String(kId); }).forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (!r) return;
                    var rName = (r.banaItemName || "").trim().toLowerCase();
                    if (rName === nameLower) {
                        totalGaya += (Number(r.netBana) || 0);
                        totalAaya += (Number(r.retBana) || 0);
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

// ================= 3. ZARI MULTI-KARKHANA COMPUTATION =================

function getZariItemStats(itemName, targetKarkhanaId) {
    var kId = targetKarkhanaId || currentZariKarkhanaFilter || "k_main";
    var isMain = (kId === "k_main");
    var nameLower = (itemName || "").trim().toLowerCase();

    var totalAaya = 0;
    var totalGaya = 0;
    var lastDate = "";

    var zStock = safeArray(getStore("zari_stock"));
    var transfers = safeArray(getStore("material_transfers")).filter(function(t) { return t && t.type === "zari"; });
    var allKarigers = (typeof sanitizeKarigerList === "function") ? sanitizeKarigerList() : [];

    if (isMain) {
        zStock.forEach(function(z) {
            var matchK = (!z.karkhanaId || z.karkhanaId === "k_main");
            if (z && matchK && z.name && z.name.trim().toLowerCase() === nameLower) {
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

        allKarigers.filter(function(w) { return !w.karkhanaId || w.karkhanaId === "k_main"; }).forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (!r) return;
                    var rName = (r.zariItemName || "").trim().toLowerCase();
                    if (rName === nameLower) {
                        totalGaya += (Number(r.netZari) || 0);
                        totalAaya += (Number(r.retZari) || 0);
                        if (r.date) lastDate = r.date;
                    }
                });
            });
        });
    } else {
        zStock.forEach(function(z) {
            if (z && String(z.karkhanaId) === String(kId) && z.name && z.name.trim().toLowerCase() === nameLower) {
                totalAaya += (Number(z.aaya) || 0);
                if (z.date) lastDate = z.date;
            }
        });

        transfers.filter(function(t) { return String(t.toKarkhanaId) === String(kId); }).forEach(function(t) {
            if (t && t.itemName && t.itemName.trim().toLowerCase() === nameLower) {
                totalAaya += (Number(t.qty) || 0);
                if (t.date) lastDate = t.date;
            }
        });

        allKarigers.filter(function(w) { return String(w.karkhanaId) === String(kId); }).forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (!r) return;
                    var rName = (r.zariItemName || "").trim().toLowerCase();
                    if (rName === nameLower) {
                        totalGaya += (Number(r.netZari) || 0);
                        totalAaya += (Number(r.retZari) || 0);
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

function populateBanaExistingDropdown() {
    var sel = document.getElementById("bana-select-existing");
    if (!sel) return;
    sel.innerHTML = "";

    var stock = safeArray(getStore("bana_stock"));
    var uniqueNames = [];

    stock.forEach(function(b) {
        if (b && b.name && uniqueNames.indexOf(b.name.trim().toLowerCase()) === -1) {
            uniqueNames.push(b.name.trim().toLowerCase());
            var st = getBanaItemStats(b.name, currentBanaKarkhanaFilter);
            var opt = document.createElement("option");
            opt.value = b.name.trim();
            opt.textContent = b.name.trim() + " (Abhi Bacha: " + st.bacha.toFixed(2) + " Kg)";
            sel.appendChild(opt);
        }
    });

    if (!uniqueNames.length) {
        sel.innerHTML = "<option value=''>Koi purana Bana nahi mila (Naya naam likhein)</option>";
    }
}

function toggleBanaItemType() {
    var isNew = document.getElementById("bana-type-new") && document.getElementById("bana-type-new").checked;
    setDisplay("bana-existing-group", isNew ? "none" : "block");
    setDisplay("bana-new-group", isNew ? "block" : "none");
}

function toggleBanaForm() {
    var f = document.getElementById("add-bana-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    document.getElementById("bana-date").value = getTodayDate();
    
    var rOld = document.getElementById("bana-type-existing");
    if (rOld) rOld.checked = true;
    populateBanaExistingDropdown();
    toggleBanaItemType();
}

function saveNewBana() {
    var d = document.getElementById("bana-date").value || getTodayDate();
    var isNew = document.getElementById("bana-type-new") && document.getElementById("bana-type-new").checked;
    var n = "";

    if (isNew) {
        n = (document.getElementById("bana-new-name").value || "").trim();
        if (!n) return alert("Naye Bana ka naam likhein!");
    } else {
        n = (document.getElementById("bana-select-existing").value || "").trim();
        if (!n) return alert("Pehle se maujood Bana chunein ya Naya Item chunein!");
    }

    var q = parseFloat(document.getElementById("bana-aaya").value) || 0;
    if (q <= 0) return alert("Sahi quantity (Qty) bharein!");

    var isMain = (currentBanaKarkhanaFilter === "k_main");
    var stock = safeArray(getStore("bana_stock"));
    
    var item = stock.find(function(b) { 
        var matchK = isMain ? (!b.karkhanaId || b.karkhanaId === "k_main") : (String(b.karkhanaId) === String(currentBanaKarkhanaFilter));
        return b && matchK && b.name && b.name.toLowerCase() === n.toLowerCase(); 
    });

    var histId = "bh_" + Date.now();
    if (item) {
        if (item.isOpening && item.openingAaya === undefined) {
            item.openingAaya = Number(item.aaya) || 0;
        }
        item.aaya = (Number(item.aaya) || 0) + q;
        item.date = d;
    } else {
        stock.push({ 
            id: Date.now(), 
            name: n, 
            date: d, 
            aaya: q, 
            gaya: 0, 
            bacha: q,
            karkhanaId: currentBanaKarkhanaFilter || "k_main",
            isOpening: false 
        });
    }
    setStore("bana_stock", stock);

    var h = safeArray(getStore("bana_history"));
    var kObj = getKarkhanasSafe().find(function(x) { return String(x.id) === String(currentBanaKarkhanaFilter); });
    var kName = kObj ? kObj.name : "Main Godown";
    
    h.push({ 
        id: histId, 
        date: d, 
        type: "Godam Kharid (Naya Maal)", 
        name: n, 
        qty: q, 
        karkhanaId: currentBanaKarkhanaFilter,
        note: kName + " Purchase" 
    });
    setStore("bana_history", h);

    if (document.getElementById("bana-new-name")) document.getElementById("bana-new-name").value = "";
    if (document.getElementById("bana-aaya")) document.getElementById("bana-aaya").value = "";

    toggleBanaForm();
    renderBanaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + q + " Kg " + n + " (" + kName + ") me jud gaya!");
}

function renderBanaTable(flist) {
    var tbody = document.getElementById("bana-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var kObj = getKarkhanasSafe().find(function(x) { return String(x.id) === String(currentBanaKarkhanaFilter); });
    var kName = kObj ? kObj.name : "Main Godown";
    var isMain = (currentBanaKarkhanaFilter === "k_main");

    var totOpenBana = 0;
    var allBana = safeArray(getStore("bana_stock"));
    allBana.forEach(function(b) {
        if (!b) return;
        var matchK = isMain ? (!b.karkhanaId || b.karkhanaId === "k_main") : (String(b.karkhanaId) === String(currentBanaKarkhanaFilter));
        if (matchK && (b.isOpening || (b.note && b.note.indexOf("Opening") !== -1))) {
            var openVal = Number(b.openingAaya !== undefined ? b.openingAaya : b.aaya) || 0;
            totOpenBana += openVal;
        }
    });

    var elVal = document.getElementById("bana-opening-val");
    var elNote = document.getElementById("bana-opening-note");
    if (elVal) elVal.textContent = totOpenBana.toFixed(2) + " Kg (" + kName + ")";
    if (elNote) elNote.textContent = totOpenBana > 0 ? ("Pichle Session (" + getPreviousSessionLabel() + ") ki 31 March Closing se Aaya") : (kName + " me koi Opening Stock nahi tha");

    var uniqueBanaNames = [];
    allBana.forEach(function(b) {
        if (!b || !b.name) return;
        var matchK = isMain ? (!b.karkhanaId || b.karkhanaId === "k_main") : (String(b.karkhanaId) === String(currentBanaKarkhanaFilter));
        if (matchK && uniqueBanaNames.indexOf(b.name.trim().toLowerCase()) === -1) {
            uniqueBanaNames.push(b.name.trim().toLowerCase());
        }
    });

    if (!isMain) {
        safeArray(getStore("material_transfers")).filter(function(t) {
            return t && t.type === "bana" && String(t.toKarkhanaId) === String(currentBanaKarkhanaFilter);
        }).forEach(function(t) {
            if (t && t.itemName && uniqueBanaNames.indexOf(t.itemName.trim().toLowerCase()) === -1) {
                uniqueBanaNames.push(t.itemName.trim().toLowerCase());
            }
        });
    }

    if (flist && Array.isArray(flist)) {
        uniqueBanaNames = flist.map(function(x) { return x.name.trim().toLowerCase(); });
    }

    if (!uniqueBanaNames.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Is Godam (" + kName + ") me koi Bana Item nahi mila.</td></tr>";
        return;
    }

    var htmlBuffer = "";
    uniqueBanaNames.forEach(function(nameLower) {
        var origItem = allBana.find(function(x) { return x && x.name && x.name.trim().toLowerCase() === nameLower; });
        var displayName = origItem ? origItem.name : nameLower.toUpperCase();
        var st = getBanaItemStats(displayName, currentBanaKarkhanaFilter);
        
        var isOp = origItem && (origItem.isOpening || (origItem.note && origItem.note.indexOf("Opening") !== -1));
        var opBadge = isOp ? "<span class='badge-blue' style='font-size:10px; display:block; margin-top:2px;'>📦 Pichle Saal Se Uth Kar Aaya</span>" : "";

        htmlBuffer += "<tr>" +
            "<td>" + formatDateDisplay(st.date) + "</td>" +
            "<td><strong>" + displayName + " <span style='font-size:11px; color:#0284c7;'>(" + kName + ")</span></strong>" + opBadge + "</td>" +
            "<td><span class='badge-green'>+" + Number(st.aaya).toFixed(2) + "</span></td>" +
            "<td><span class='badge-red'>-" + Number(st.gaya).toFixed(2) + "</span></td>" +
            "<td><span class='badge-blue' style='font-size:13px; font-weight:800;'>" + Number(st.bacha).toFixed(2) + " Kg</span></td>" +
            "<td style='text-align:center;'><button class='detail-btn' onclick='viewBanaPassbook(\"" + displayName + "\")'>📖 Passbook</button> <button class='delete-btn' onclick='deleteBanaStockByName(\"" + displayName + "\")'>🗑️</button></td>" +
        "</tr>";
    });

    tbody.innerHTML = htmlBuffer;
}

function deleteBanaStockByName(itemName) {
    if (!confirm("Kya aap '" + itemName + "' ko is godam se delete karna chahte hain?")) return;
    var isMain = (currentBanaKarkhanaFilter === "k_main");
    var s = safeArray(getStore("bana_stock")).filter(function(b) {
        if (!b) return false;
        var matchK = isMain ? (!b.karkhanaId || b.karkhanaId === "k_main") : (String(b.karkhanaId) === String(currentBanaKarkhanaFilter));
        return !(matchK && b.name && b.name.toLowerCase() === itemN
