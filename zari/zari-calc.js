/* ========================================================
   SIMPLICITY ERP - ZARI STOCK CALCULATION ENGINE (FIXED)
   File: zari/zari-calc.js • Developed by Farhan Jawed
======================================================== */

var currentZariKarkhanaFilter = "k_main";

function getZariItemStats(itemName, targetKarkhanaId) {
    var kId = targetKarkhanaId || currentZariKarkhanaFilter || "k_main";
    var isMain = (kId === "k_main");
    var nameLower = (itemName || "").trim().toLowerCase();

    var totalAaya = 0;
    var totalGaya = 0;
    var lastDate = "";

    var zStock = safeArray(getStore("zari_stock"));
    var transfers = safeArray(getStore("material_transfers")).filter(function(t) { 
        return t && t.type === "zari"; 
    });
    var allKarigers = (typeof sanitizeKarigerList === "function") ? sanitizeKarigerList() : [];

    var uniqueInGodown = [];
    zStock.forEach(function(z) {
        if (!z || !z.name) return;
        var matchK = isMain ? (!z.karkhanaId || z.karkhanaId === "k_main") : (String(z.karkhanaId) === String(kId));
        var nL = z.name.trim().toLowerCase();
        if (matchK && uniqueInGodown.indexOf(nL) === -1) uniqueInGodown.push(nL);
    });

    if (isMain) {
        // 1. Opening + Kharid
        zStock.forEach(function(z) {
            var matchK = (!z.karkhanaId || z.karkhanaId === "k_main");
            if (z && matchK && z.name && z.name.trim().toLowerCase() === nameLower) {
                totalAaya += (Number(z.aaya) || 0);
                if (z.date) lastDate = z.date;
            }
        });

        // 2. Branch Transfer Out
        transfers.forEach(function(t) {
            if (t && t.itemName && t.itemName.trim().toLowerCase() === nameLower) {
                totalGaya += (Number(t.qty) || 0);
                if (t.date) lastDate = t.date;
            }
        });

        // 3. Kariger Khapat (Net Zari Minus Engine)
        allKarigers.forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (!r) return;
                    var rowKarkhana = r.karkhanaId || k.karkhanaId || "k_main";
                    if (rowKarkhana === "k_main") {
                        var rName = (r.zariItemName || "").trim().toLowerCase();
                        var isMatch = (rName === nameLower) || (!rName && (uniqueInGodown.length <= 1 || uniqueInGodown[0] === nameLower));
                        if (isMatch) {
                            totalGaya += (Number(r.netZari) || 0);
                            totalAaya += (Number(r.retZari) || 0);
                            if (r.date) lastDate = r.date;
                        }
                    }
                });
            });
        });
    } else {
        // Branch Godown
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

        allKarigers.forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (!r) return;
                    var rowKarkhana = r.karkhanaId || k.karkhanaId || "k_main";
                    if (String(rowKarkhana) === String(kId)) {
                        var rName = (r.zariItemName || "").trim().toLowerCase();
                        var isMatch = (rName === nameLower) || (!rName && (uniqueInGodown.length <= 1 || uniqueInGodown[0] === nameLower));
                        if (isMatch) {
                            totalGaya += (Number(r.netZari) || 0);
                            totalAaya += (Number(r.retZari) || 0);
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
