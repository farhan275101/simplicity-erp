/* ========================================================
   SIMPLICITY ERP - KARIGER CALCULATION ENGINE
   File: karigar/kariger-calc.js • Developed by Farhan Jawed
   (Tani Khata, Mazdoori Bani, Bana & Zari Reconcile)
======================================================== */

/**
 * 1. Kariger ki Tani Sheets safe get karna
 */
function getKarigerSheets(karigerId) {
    if (!karigerId) return [];
    var sheets = safeArray(getStore("kariger_sheets_" + karigerId));
    sheets.forEach(function(sh) { 
        if (sh) sh.rows = safeArray(sh.rows); 
    });
    return sheets;
}

/**
 * 2. Kariger ki Tani Sheets save karna
 */
function saveKarigerSheets(karigerId, sheets) {
    if (!karigerId) return;
    var clean = safeArray(sheets);
    clean.forEach(function(sh) { 
        if (sh) sh.rows = safeArray(sh.rows); 
    });
    setStore("kariger_sheets_" + karigerId, clean);
}

/**
 * 3. Tani Sheet ke Grand Totals (Mazdoori + Bana + Zari Hisab)
 */
function calculateSheetTotals(sh) {
    var def = { 
        totSaree: 0, totLott: 0, netSaree: 0, grossBani: 0, totPaid: 0, remainingAmt: 0, 
        totTaniWazan: 0, totBana: 0, retBana: 0, banaConsumption: 0, banaWaste: 0, remainingBana: 0, 
        totZari: 0, retZari: 0, zariConsumption: 0, zariWaste: 0, remainingZari: 0 
    };
    if (!sh || typeof sh !== "object") return def;

    var saree = 0, lott = 0, paid = 0, netB = 0, retB = 0, netZ = 0, retZ = 0, taniW = 0;
    
    safeArray(sh.rows).forEach(function(r) {
        if (!r) return;
        saree += (Number(r.saree) || 0);
        lott += (Number(r.lott) || 0);
        paid += (Number(r.paid) || 0);
        netB += (Number(r.netBana) || 0);
        retB += (Number(r.retBana) || 0);
        netZ += (Number(r.netZari) || 0);
        retZ += (Number(r.retZari) || 0);
        taniW += (Number(r.taniWazan) || 0);
    });

    // 1. Mazdoori (Bani) Hisab
    var netSaree = Math.max(0, saree - lott);
    var rateBani = (sh.rateBani !== undefined) ? Number(sh.rateBani) : 240;
    var grossBani = netSaree * rateBani;
    var pichlaBani = Number(sh.pichlaBani) || 0;
    var remAmt = (grossBani + pichlaBani) - paid;

    // 2. Bana Hisab
    var rateB = (sh.rateBana !== undefined) ? Number(sh.rateBana) : 0.311;
    var banaCons = saree * rateB;
    var pichlaB = Number(sh.pichlaBana) || 0;
    var bWaste = Number(sh.banaWaste) || 0;
    var remBana = (pichlaB + netB) - (retB + banaCons + bWaste);

    // 3. Zari Hisab
    var rateZ = (sh.rateZari !== undefined) ? Number(sh.rateZari) : 0.110;
    var zariCons = saree * rateZ;
    var pichlaZ = Number(sh.pichlaZari) || 0;
    var zWaste = Number(sh.zariWaste) || 0;
    var remZari = (pichlaZ + netZ) - (retZ + zariCons + zWaste);

    return {
        totSaree: saree,
        totLott: lott,
        netSaree: netSaree,
        grossBani: Number(grossBani.toFixed(2)),
        totPaid: Number(paid.toFixed(2)),
        remainingAmt: Number(remAmt.toFixed(2)),
        totTaniWazan: Number(taniW.toFixed(2)),
        totBana: Number(netB.toFixed(2)),
        retBana: Number(retB.toFixed(2)),
        banaConsumption: Number(banaCons.toFixed(2)),
        banaWaste: bWaste,
        remainingBana: Number(remBana.toFixed(2)),
        totZari: Number(netZ.toFixed(2)),
        retZari: Number(retZ.toFixed(2)),
        zariConsumption: Number(zariCons.toFixed(2)),
        zariWaste: zWaste,
        remainingZari: Number(remZari.toFixed(2))
    };
}

/**
 * 4. Kisi Kariger ka Total Lifetime Summary (Sabhi Tani Sheets milakar)
 */
function getKarigerLifetimeSummary(karigerId) {
    var sheets = getKarigerSheets(karigerId);
    var summary = {
        totalSarees: 0,
        totalLott: 0,
        totalBaniEarned: 0,
        totalPaid: 0,
        currentBalanceAmt: 0,
        currentBanaBalance: 0,
        currentZariBalance: 0
    };

    if (!sheets.length) return summary;

    sheets.forEach(function(sh) {
        var c = calculateSheetTotals(sh);
        summary.totalSarees += c.totSaree;
        summary.totalLott += c.totLott;
        summary.totalBaniEarned += c.grossBani;
        summary.totalPaid += c.totPaid;
    });

    // Aakhri active sheet ka remaining balance hi current balance hota hai
    var lastSheet = sheets[sheets.length - 1];
    var lastCalc = calculateSheetTotals(lastSheet);
    summary.currentBalanceAmt = lastCalc.remainingAmt;
    summary.currentBanaBalance = lastCalc.remainingBana;
    summary.currentZariBalance = lastCalc.remainingZari;

    return summary;
}

/**
 * 5. Karkhana-Wise Production Aggregator (Dashboard ya Summary ke liye)
 */
function getKarkhanaProductionStats(targetKarkhanaId) {
    var allKarigers = safeArray(getStore("kariger_list"));
    var kId = targetKarkhanaId || "all";

    var filtered = allKarigers.filter(function(k) {
        if (!k) return false;
        if (kId === "all") return true;
        var kid = k.karkhanaId || "k_main";
        return String(kid) === String(kId);
    });

    var stats = {
        totalKarigers: filtered.length,
        totalSarees: 0,
        totalLott: 0,
        totalPendingBani: 0
    };

    filtered.forEach(function(k) {
        var s = getKarigerLifetimeSummary(k.id);
        stats.totalSarees += s.totalSarees;
        stats.totalLott += s.totalLott;
        stats.totalPendingBani += s.currentBalanceAmt;
    });

    return stats;
}
