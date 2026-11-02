/* ========================================================
   SIMPLICITY ERP - ZARI STOCK CALCULATION ENGINE
   File: zari/zari-calc.js • Developed by Farhan Jawed
   (Multi-Godam Stock, Inter-Transfer & Passbook Reconcile)
   [FIXED: Zero Over-Deduction & Accurate Item-Specific Math]
======================================================== */

var currentZariKarkhanaFilter = "all";

/**
 * 1. Kisi specific Zari Item ka wazan calculate karna (Aaya, Gaya, Bacha)
 * @param {string} itemName - Zari ka naam
 * @param {string} targetKarkhanaId - 'all', 'k_main', ya branch karkhana id
 */
function getZariItemStats(itemName, targetKarkhanaId) {
    var kId = targetKarkhanaId || currentZariKarkhanaFilter || "all";
    var nameLower = (itemName || "").trim().toLowerCase();

    var totalAaya = 0;
    var totalGaya = 0;
    var lastDate = "";

    var zStock = safeArray(getStore("zari_stock"));
    var transfers = safeArray(getStore("material_transfers")).filter(function(t) { 
        return t && t.type === "zari"; 
    });
    var allKarigers = (typeof sanitizeKarigerList === "function") 
        ? sanitizeKarigerList() 
        : safeArray(getStore("kariger_list"));

    // Check karein ki godam me kul kitne alag-alag zari items hain
    var uniqueItemCount = 0;
    var seenNames = [];
    zStock.forEach(function(z) {
        if (z && z.name) {
            var n = z.name.trim().toLowerCase();
            if (seenNames.indexOf(n) === -1) {
                seenNames.push(n);
                uniqueItemCount++;
            }
        }
    });

    // Helper match rule: Item name strictly match hona chahiye (Khali naam se doosre item ka wazan na kate)
    var isItemMatch = function(rowItemName) {
        var rN = (rowItemName || "").trim().toLowerCase();
        if (rN === nameLower) return true;
        if (!rN && uniqueItemCount <= 1) return true; // Agar business me sirf 1 hi item hai tabhi bina naam wala count hoga
        return false;
    };

    // --- CASE 1: SABHI KARKHANE (TOTAL CONSOLIDATED VIEW) ---
    if (kId === "all") {
        // 1. All Direct Purchases / Openings across all branches
        zStock.forEach(function(z) {
            if (z && z.name && z.name.trim().toLowerCase() === nameLower) {
                totalAaya += (Number(z.aaya !== undefined ? z.aaya : (z.qty || z.totalQty || 0)) || 0);
                if (z.date) lastDate = z.date;
            }
        });

        // 2. All Kariger Consumption across all branches
        allKarigers.forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (!r) return;
                    if (isItemMatch(r.zariItemName)) {
                        totalGaya += (Number(r.netZari) || 0);
                        totalAaya += (Number(r.retZari) || 0);
                        if (r.date) lastDate = r.date;
                    }
                });
            });
        });
    }

    // --- CASE 2: MAIN GODOWN ONLY ---
    else if (kId === "k_main") {
        // 1. Main Godown Purchase / Opening
        zStock.forEach(function(z) {
            var matchK = (!z.karkhanaId || z.karkhanaId === "k_main");
            if (z && matchK && z.name && z.name.trim().toLowerCase() === nameLower) {
                totalAaya += (Number(z.aaya !== undefined ? z.aaya : (z.qty || z.totalQty || 0)) || 0);
                if (z.date) lastDate = z.date;
            }
        });

        // 2. Transfers Sent OUT to branches (-)
        transfers.forEach(function(t) {
            var isFromMain = (!t.fromKarkhanaId || t.fromKarkhanaId === "k_main");
            if (isFromMain && t.itemName && t.itemName.trim().toLowerCase() === nameLower) {
                totalGaya += (Number(t.qty || t.quantity) || 0);
                if (t.date) lastDate = t.date;
            }
        });

        // 3. Transfers Received IN from branches (+)
        transfers.forEach(function(t) {
            if (t.toKarkhanaId === "k_main" && t.itemName && t.itemName.trim().toLowerCase() === nameLower) {
                totalAaya += (Number(t.qty || t.quantity) || 0);
                if (t.date) lastDate = t.date;
            }
        });

        // 4. Main Godown Kariger Consumption
        allKarigers.forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (!r) return;
                    var rowKarkhana = r.karkhanaId || k.karkhanaId || "k_main";
                    if (rowKarkhana === "k_main") {
                        if (isItemMatch(r.zariItemName)) {
                            totalGaya += (Number(r.netZari) || 0);
                            totalAaya += (Number(r.retZari) || 0);
                            if (r.date) lastDate = r.date;
                        }
                    }
                });
            });
        });
    }

    // --- CASE 3: BRANCH GODOWN (Mau, Mubarakpur, Khairabad etc.) ---
    else {
        // 1. Direct Purchase at Branch
        zStock.forEach(function(z) {
            if (z && String(z.karkhanaId) === String(kId) && z.name && z.name.trim().toLowerCase() === nameLower) {
                totalAaya += (Number(z.aaya !== undefined ? z.aaya : (z.qty || z.totalQty || 0)) || 0);
                if (z.date) lastDate = z.date;
            }
        });

        // 2. Transfers Received IN from Main/other Godam (+)
        transfers.forEach(function(t) {
            if (String(t.toKarkhanaId) === String(kId) && t.itemName && t.itemName.trim().toLowerCase() === nameLower) {
                totalAaya += (Number(t.qty || t.quantity) || 0);
                if (t.date) lastDate = t.date;
            }
        });

        // 3. Transfers Sent OUT from this branch (-)
        transfers.forEach(function(t) {
            if (String(t.fromKarkhanaId) === String(kId) && t.itemName && t.itemName.trim().toLowerCase() === nameLower) {
                totalGaya += (Number(t.qty || t.quantity) || 0);
                if (t.date) lastDate = t.date;
            }
        });

        // 4. Branch Kariger Consumption
        allKarigers.forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            sheets.forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (!r) return;
                    var rowKarkhana = r.karkhanaId || k.karkhanaId || "k_main";
                    if (String(rowKarkhana) === String(kId)) {
                        if (isItemMatch(r.zariItemName)) {
                            totalGaya += (Number(r.netZari) || 0);
                            totalAaya += (Number(r.retZari) || 0);
                            if (r.date) lastDate = r.date;
                        }
                    }
                });
            });
        });
    }

    var bacha = Math.max(0, totalAaya - totalGaya);

    return {
        name: itemName,
        date: lastDate || (typeof getTodayDate === "function" ? getTodayDate() : ""),
        aaya: Number(totalAaya.toFixed(2)),
        gaya: Number(totalGaya.toFixed(2)),
        bacha: Number(bacha.toFixed(2))
    };
}

/**
 * 2. Zari Available Balance Checker
 */
function getZariAvailableBalance(itemName, karkhanaId) {
    var stats = getZariItemStats(itemName, karkhanaId);
    return stats.bacha;
}

/**
 * 🌟 3. INTER-KARKHANA ZARI TRANSFER ENGINE
 */
function transferZariStock(date, itemName, fromKarkhanaId, toKarkhanaId, qty, note) {
    var weight = parseFloat(qty) || 0;
    if (weight <= 0) {
        alert("Kripya sahi wazan (Qty) darj karein!");
        return false;
    }

    if (String(fromKarkhanaId) === String(toKarkhanaId)) {
        alert("Bhejne wala aur Paane wala Godam alag-alag hona chahiye!");
        return false;
    }

    var cleanName = (itemName || "").trim();
    if (!cleanName) {
        alert("Zari Item ka naam chunein!");
        return false;
    }

    var available = getZariAvailableBalance(cleanName, fromKarkhanaId);
    if (weight > available) {
        alert("Bhejne wale godam me sirf " + available.toFixed(2) + " Kg Zari bachi hai! Aap " + weight.toFixed(2) + " Kg transfer nahi kar sakte.");
        return false;
    }

    var cleanDate = date || (typeof getTodayDate === "function" ? getTodayDate() : new Date().toISOString().split("T")[0]);
    var fromName = (typeof getKarkhanaNameById === "function") ? getKarkhanaNameById(fromKarkhanaId) : fromKarkhanaId;
    var toName = (typeof getKarkhanaNameById === "function") ? getKarkhanaNameById(toKarkhanaId) : toKarkhanaId;
    var transferRef = "tr_zari_" + Date.now();

    var transfers = safeArray(getStore("material_transfers"));
    transfers.push({
        id: transferRef,
        date: cleanDate,
        type: "zari",
        itemName: cleanName,
        fromKarkhanaId: fromKarkhanaId,
        toKarkhanaId: toKarkhanaId,
        qty: weight,
        quantity: weight,
        note: note || ("Transfer: " + fromName + " ➔ " + toName),
        timestamp: Date.now()
    });
    setStore("material_transfers", transfers);

    var hist = safeArray(getStore("zari_history"));
    hist.push({
        id: "zhist_out_" + Date.now(),
        date: cleanDate,
        name: cleanName,
        kariger: "Godown Transfer",
        type: "Transfer Out ➔ " + toName + (note ? " (" + note + ")" : ""),
        aaya: 0,
        gaya: weight,
        karkhanaId: fromKarkhanaId,
        refId: transferRef,
        timestamp: Date.now()
    });

    hist.push({
        id: "zhist_in_" + Date.now(),
        date: cleanDate,
        name: cleanName,
        kariger: "Godown Transfer",
        type: "Transfer In ⬅ " + fromName + (note ? " (" + note + ")" : ""),
        aaya: weight,
        gaya: 0,
        karkhanaId: toKarkhanaId,
        refId: transferRef,
        timestamp: Date.now() + 1
    });

    setStore("zari_history", hist);

    if (typeof recordTransferEntry === "function") {
        recordTransferEntry({
            id: transferRef,
            date: cleanDate,
            fromKarkhanaId: fromKarkhanaId,
            toKarkhanaId: toKarkhanaId,
            type: "zari",
            itemName: cleanName,
            quantity: weight,
            remarks: note || ("Zari Transfer: " + fromName + " ➔ " + toName)
        });
    }

    return true;
}
