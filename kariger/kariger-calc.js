/* ============================================================================
   SIMPLICITY ERP - HIGH-PERFORMANCE WEAVER (KARIGER) CALCULATION ENGINE
   File: kariger/kariger-calc.js • Developed by Farhan Jawed
   (Purana Accurate Calculation + Epsilon Precision + Zero Stale Cache)
============================================================================ */

(() => {
    'use strict';

    // Default rate standards (Varanasi / Mau handloom & powerloom standard)
    const DEFAULT_RATES = Object.freeze({
        BANI: 240,       // Rs per saree wage
        BANA: 0.311,     // Kg per saree weft consumption
        ZARI: 0.110      // Kg per saree zari consumption
    });

    const roundCurrency = (val) => {
        const num = parseFloat(val);
        return isNaN(num) || !isFinite(num) ? 0 : Math.round((num + Number.EPSILON) * 100) / 100;
    };

    const roundWeight = (val) => {
        const num = parseFloat(val);
        return isNaN(num) || !isFinite(num) ? 0 : Math.round((num + Number.EPSILON) * 1000) / 1000;
    };

    const safeNum = (val, fallback = 0) => {
        const n = parseFloat(val);
        return isNaN(n) || !isFinite(n) ? fallback : n;
    };

    /**
     * 1. Kariger ki Tani Sheets safe get karna
     */
    const getKarigerSheets = (karigerId) => {
        if (!karigerId) return [];
        try {
            const storeKey = `kariger_sheets_${String(karigerId).trim()}`;
            const raw = (typeof window.getStore === 'function') 
                ? window.getStore(storeKey) 
                : localStorage.getItem(storeKey);

            const sheets = window.safeArray ? window.safeArray(raw) : (Array.isArray(raw) ? raw : []);
            sheets.forEach((sh) => {
                if (sh) sh.rows = window.safeArray ? window.safeArray(sh.rows) : (Array.isArray(sh.rows) ? sh.rows : []);
            });
            return sheets;
        } catch (err) {
            console.error(`[KarigerCalc] Error getting sheets:`, err);
            return [];
        }
    };

    /**
     * 2. Kariger ki Tani Sheets save karna
     */
    const saveKarigerSheets = (karigerId, sheets) => {
        if (!karigerId) return;
        try {
            const cleanId = String(karigerId).trim();
            const clean = window.safeArray ? window.safeArray(sheets) : (Array.isArray(sheets) ? sheets : []);
            clean.forEach((sh) => {
                if (sh) sh.rows = window.safeArray ? window.safeArray(sh.rows) : (Array.isArray(sh.rows) ? sh.rows : []);
            });

            const storeKey = `kariger_sheets_${cleanId}`;
            if (typeof window.setStore === 'function') {
                window.setStore(storeKey, clean);
            } else {
                localStorage.setItem(storeKey, JSON.stringify(clean));
            }
        } catch (err) {
            console.error(`[KarigerCalc] Error saving sheets:`, err);
        }
    };

    /**
     * 3. Tani Sheet ke Grand Totals (Mazdoori + Bana + Zari Hisab)
     * Real-time calculation bina stale cache ke taaki koi fark na aaye
     */
    const calculateSheetTotals = (sh) => {
        const def = {
            totSaree: 0, totLott: 0, netSaree: 0, grossBani: 0, totPaid: 0, remainingAmt: 0,
            totTaniWazan: 0, totBana: 0, retBana: 0, banaConsumption: 0, banaWaste: 0, remainingBana: 0,
            totZari: 0, retZari: 0, zariConsumption: 0, zariWaste: 0, remainingZari: 0
        };

        if (!sh || typeof sh !== 'object') return def;

        const rows = window.safeArray ? window.safeArray(sh.rows) : (Array.isArray(sh.rows) ? sh.rows : []);
        let saree = 0, lott = 0, paid = 0, netB = 0, retB = 0, netZ = 0, retZ = 0, taniW = 0;

        rows.forEach((r) => {
            if (!r) return;
            saree += safeNum(r.saree);
            lott  += safeNum(r.lott);
            paid  += safeNum(r.paid);
            netB  += safeNum(r.netBana);
            retB  += safeNum(r.retBana);
            netZ  += safeNum(r.netZari);
            retZ  += safeNum(r.retZari);
            taniW += safeNum(r.taniWazan);
        });

        // 1. Mazdoori (Bani Wage) Hisab
        const netSaree = Math.max(0, saree - lott);
        const rateBani = (sh.rateBani !== undefined && sh.rateBani !== null) ? safeNum(sh.rateBani, DEFAULT_RATES.BANI) : DEFAULT_RATES.BANI;
        const grossBani = netSaree * rateBani;
        const pichlaBani = safeNum(sh.pichlaBani);
        const remAmt = (grossBani + pichlaBani) - paid;

        // 2. Weft (Bana) Hisab
        const rateBana = (sh.rateBana !== undefined && sh.rateBana !== null) ? safeNum(sh.rateBana, DEFAULT_RATES.BANA) : DEFAULT_RATES.BANA;
        const banaCons = saree * rateBana;
        const pichlaBana = safeNum(sh.pichlaBana);
        const banaWaste = safeNum(sh.banaWaste);
        const remBana = (pichlaBana + netB) - (retB + banaCons + banaWaste);

        // 3. Metallic Thread (Zari) Hisab
        const rateZari = (sh.rateZari !== undefined && sh.rateZari !== null) ? safeNum(sh.rateZari, DEFAULT_RATES.ZARI) : DEFAULT_RATES.ZARI;
        const zariCons = saree * rateZari;
        const pichlaZari = safeNum(sh.pichlaZari);
        const zariWaste = safeNum(sh.zariWaste);
        const remZari = (pichlaZari + netZ) - (retZ + zariCons + zariWaste);

        return {
            totSaree: saree,
            totLott: lott,
            netSaree: netSaree,
            grossBani: roundCurrency(grossBani),
            totPaid: roundCurrency(paid),
            remainingAmt: roundCurrency(remAmt),
            totTaniWazan: roundWeight(taniW),
            totBana: roundWeight(netB),
            retBana: roundWeight(retB),
            banaConsumption: roundWeight(banaCons),
            banaWaste: roundWeight(banaWaste),
            remainingBana: roundWeight(remBana),
            totZari: roundWeight(netZ),
            retZari: roundWeight(retZ),
            zariConsumption: roundWeight(zariCons),
            zariWaste: roundWeight(zariWaste),
            remainingZari: roundWeight(remZari)
        };
    };

    /**
     * 4. Kisi Kariger ka Total Lifetime Summary (Sabhi Tani Sheets milakar)
     */
    const getKarigerLifetimeSummary = (karigerId) => {
        const summary = {
            totalSarees: 0,
            totalLott: 0,
            totalBaniEarned: 0,
            totalPaid: 0,
            currentBalanceAmt: 0,
            currentBanaBalance: 0,
            currentZariBalance: 0
        };

        if (!karigerId) return summary;

        const sheets = getKarigerSheets(karigerId);
        if (!sheets.length) return summary;

        sheets.forEach((sh) => {
            const c = calculateSheetTotals(sh);
            summary.totalSarees += c.totSaree;
            summary.totalLott += c.totLott;
            summary.totalBaniEarned += c.grossBani;
            summary.totalPaid += c.totPaid;
        });

        summary.totalBaniEarned = roundCurrency(summary.totalBaniEarned);
        summary.totalPaid = roundCurrency(summary.totalPaid);

        // Aakhri active sheet ka balance hi current balance hota hai
        const lastSheet = sheets[sheets.length - 1];
        const lastCalc = calculateSheetTotals(lastSheet);
        summary.currentBalanceAmt = lastCalc.remainingAmt;
        summary.currentBanaBalance = lastCalc.remainingBana;
        summary.currentZariBalance = lastCalc.remainingZari;

        return summary;
    };

    /**
     * 5. Karkhana-Wise Production Aggregator
     */
    const getKarkhanaProductionStats = (targetKarkhanaId = 'all') => {
        const allKarigers = window.safeArray 
            ? window.safeArray(window.getStore('kariger_list')) 
            : (window.getStore ? window.getStore('kariger_list') : []);

        const kId = String(targetKarkhanaId || 'all').trim();
        const filtered = allKarigers.filter((k) => {
            if (!k) return false;
            if (kId === 'all') return true;
            const kid = k.karkhanaId || 'k_main';
            return String(kid) === String(kId);
        });

        const stats = {
            totalKarigers: filtered.length,
            totalSarees: 0,
            totalLott: 0,
            totalPendingBani: 0
        };

        filtered.forEach((k) => {
            const s = getKarigerLifetimeSummary(k.id);
            stats.totalSarees += s.totalSarees;
            stats.totalLott += s.totalLott;
            stats.totalPendingBani += s.currentBalanceAmt;
        });

        stats.totalPendingBani = roundCurrency(stats.totalPendingBani);
        return stats;
    };

    const karigerCalcAPI = {
        DEFAULT_RATES,
        getKarigerSheets,
        saveKarigerSheets,
        calculateSheetTotals,
        getKarigerLifetimeSummary,
        getKarkhanaProductionStats,
        roundCurrency,
        roundWeight
    };

    Object.keys(karigerCalcAPI).forEach((fn) => { window[fn] = karigerCalcAPI[fn]; });
    window.KarigerCalcEngine = karigerCalcAPI;
})();
