/* ========================================================
   SIMPLICITY ERP - BANA STOCK CALCULATION ENGINE (FIXED)
   File: bana/bana-calc.js • Developed by Farhan Jawed
======================================================== */

var currentBanaKarkhanaFilter = "k_main";

function getBanaItemStats(itemName, targetKarkhanaId) {
    var kId = targetKarkhanaId || currentBanaKarkhanaFilter || "k_main";
    var isMain = (kId === "k_main");
    var nameLower = (itemName || "").trim().toLowerCase();

    var totalAaya = 0;
    var totalGaya = 0;
    var lastDate = "";

    var bStock = safeArray(getStore("bana_stock"));
    var transfers = safeArray(getStore("material_transfers")).filter(function(t) { 
        return t && t.type === "bana"; 
    });
    var allKarigers = (typeof sanitizeKarigerList === "function") ? sanitizeKarigerList() : [];

    // Unique names in this godown
    var uniqueInGodown = [];
    bStock.forEach(function(b) {
        if (!b || !b.name) return;
        var matchK = isMain ? (!b.karkhanaId || b.karkhanaId === "k_main") : (String(b.karkhanaId) === String(kId));
        var nL = b.name.trim().toLowerCase();
        if (matchK && uniqueInGodown.indexOf(nL) === -1) uniqueInGodown.push(nL);
    });

    if (isMain) {
        // 1. Opening + Kharid
        bStock.forEach(function(b) {
            var matchK = (!b.karkhanaId || b.karkhanaId === "k_main");
            if (b && matchK && b.name && b.name.trim().toLowerCase() === nameLower) {
                totalAaya += (Number(b.aaya) || 0);
                if (b.date) lastDate = b.date;
            }
        });

        // 2. Branch Transfer Out
        transfers.forEach(function(t) {
            if (t && t.itemName && t.itemName.trim().toLowerCase() === nameLower) {
                totalGaya += (Number(t.qty) || 0);
                if (t.date) lastDate = t.date;
            }
        });

        // 3. Kariger Khapat (Net Bana Minus Engine)
        allKarigers.forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (!r) return;
                    var rowKarkhana = r.karkhanaId || k.karkhanaId || "k_main";
                    if (rowKarkhana === "k_main") {
                        var rName = (r.banaItemName || "").trim().toLowerCase();
                        // Agar Tani row me naam nahi bhi bhara hai, to active item se minus karo
                        var isMatch = (rName === nameLower) || (!rName && (uniqueInGodown.length <= 1 || uniqueInGodown[0] === nameLower));
                        if (isMatch) {
                            totalGaya += (Number(r.netBana) || 0);
                            totalAaya += (Number(r.retBana) || 0);
                            if (r.date) lastDate = r.date;
                        }
                    }
                });
            });
        });
    } else {
        // Branch Godown
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

        allKarigers.forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (!r) return;
                    var rowKarkhana = r.karkhanaId || k.karkhanaId || "k_main";
                    if (String(rowKarkhana) === String(kId)) {
                        var rName = (r.banaItemName || "").trim().toLowerCase();
                        var isMatch = (rName === nameLower) || (!rName && (uniqueInGodown.length <= 1 || uniqueInGodown[0] === nameLower));
                        if (isMatch) {
                            totalGaya += (Number(r.netBana) || 0);
                            totalAaya += (Number(r.retBana) || 0);
                            if (r.date) lastDate = r.date;
                        }
                    }
                });
            });
        });
    }

    var bacha = totalAaya - totalGaya;

    return {
        name: itemName,
        date: lastDate || getTodayDate(),
        aaya: Number(totalAaya.toFixed(2)),
        gaya: Number(totalGaya.toFixed(2)),
        bacha: Number(bacha.toFixed(2))
    };
}
