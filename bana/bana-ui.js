/* ============================================================================
   SIMPLICITY ERP - ACCURATE BANA STOCK CALCULATION ENGINE
   File: bana/bana-calc.js • Developed by Farhan Jawed
   (Purana Accurate Calculation + Zero Drift Precision + Instant Sync)
============================================================================ */

(() => {
    'use strict';

    window.currentBanaKarkhanaFilter = "all";

    const roundWeight = (val) => {
        const num = parseFloat(val);
        return isNaN(num) || !isFinite(num) ? 0 : Math.round((num + Number.EPSILON) * 100) / 100;
    };

    const safeNum = (val, fallback = 0) => {
        const n = parseFloat(val);
        return isNaN(n) || !isFinite(n) ? fallback : n;
    };

    const normalizeGodownId = (id) => {
        if (!id || id === 'all') return 'all';
        const clean = String(id).trim();
        return (!clean || clean === 'k_main') ? 'k_main' : clean;
    };

    /**
     * 1. Kisi specific Bana Item ka wazan calculate karna (Aaya, Gaya, Bacha)
     * Purane bana-calc (1).js ka authentic logic with full fallback compatibility
     */
    const getBanaItemStats = (itemName, targetKarkhanaId) => {
        const kId = normalizeGodownId(targetKarkhanaId || window.currentBanaKarkhanaFilter || "all");
        const cleanName = String(itemName || '').trim();
        const nameLower = cleanName.toLowerCase();

        if (!cleanName) {
            return { name: '', date: '', aaya: 0, gaya: 0, bacha: 0 };
        }

        let totalAaya = 0;
        let totalGaya = 0;
        let lastDate = "";

        const bStock = window.safeArray ? window.safeArray(window.getStore("bana_stock")) : [];
        const transfers = (window.safeArray ? window.safeArray(window.getStore("material_transfers")) : []).filter(function(t) { 
            return t && t.type === "bana"; 
        });
        const allKarigers = (typeof window.sanitizeKarigerList === "function") 
            ? window.sanitizeKarigerList() 
            : (window.safeArray ? window.safeArray(window.getStore("kariger_list")) : []);

        // Unique item count detection (Purane code ki tarah fallback support)
        let uniqueItemCount = 0;
        const seenNames = [];
        bStock.forEach(function(b) {
            if (b && b.name) {
                const n = b.name.trim().toLowerCase();
                if (seenNames.indexOf(n) === -1) {
                    seenNames.push(n);
                    uniqueItemCount++;
                }
            }
        });

        const isItemMatch = function(rowItemName) {
            const rN = (rowItemName || "").trim().toLowerCase();
            if (rN === nameLower) return true;
            if (!rN && uniqueItemCount <= 1) return true;
            return false;
        };

        // --- CASE 1: SABHI KARKHANE (TOTAL CONSOLIDATED) ---
        if (kId === "all") {
            // 1. Direct Purchases / Openings across all branches
            bStock.forEach(function(b) {
                if (b && b.name && b.name.trim().toLowerCase() === nameLower) {
                    totalAaya += safeNum(b.aaya !== undefined ? b.aaya : (b.qty || b.totalQty));
                    if (b.date && (!lastDate || b.date > lastDate)) lastDate = b.date;
                }
            });

            // 2. Kariger Consumption (Gaya aur Return Aaya)
            allKarigers.forEach(function(k) {
                const sheets = (typeof window.getKarigerSheets === "function") ? window.getKarigerSheets(k.id) : [];
                sheets.forEach(function(sh) {
                    const defaultSheetItem = (sh.banaItem || '').trim();
                    const rows = window.safeArray ? window.safeArray(sh.rows) : [];
                    rows.forEach(function(r) {
                        if (!r) return;
                        const item = r.banaItemName || r.banaItem || defaultSheetItem;
                        if (isItemMatch(item)) {
                            totalGaya += safeNum(r.netBana);
                            totalAaya += safeNum(r.retBana);
                            if (r.date && (!lastDate || r.date > lastDate)) lastDate = r.date;
                        }
                    });
                });
            });
        }

        // --- CASE 2: MAIN GODOWN ONLY ---
        else if (kId === "k_main") {
            // 1. Main Godown Purchase / Opening
            bStock.forEach(function(b) {
                const matchK = (!b.karkhanaId || b.karkhanaId === "k_main");
                if (b && matchK && b.name && b.name.trim().toLowerCase() === nameLower) {
                    totalAaya += safeNum(b.aaya !== undefined ? b.aaya : (b.qty || b.totalQty));
                    if (b.date && (!lastDate || b.date > lastDate)) lastDate = b.date;
                }
            });

            // 2. Transfers Sent OUT to branches (-)
            transfers.forEach(function(t) {
                const fromK = normalizeGodownId(t.fromKarkhanaId);
                if (fromK === "k_main" && t.itemName && t.itemName.trim().toLowerCase() === nameLower) {
                    totalGaya += safeNum(t.qty || t.quantity);
                    if (t.date && (!lastDate || t.date > lastDate)) lastDate = t.date;
                }
            });

            // 3. Transfers Received IN from branches (+)
            transfers.forEach(function(t) {
                const toK = normalizeGodownId(t.toKarkhanaId);
                if (toK === "k_main" && t.itemName && t.itemName.trim().toLowerCase() === nameLower) {
                    totalAaya += safeNum(t.qty || t.quantity);
                    if (t.date && (!lastDate || t.date > lastDate)) lastDate = t.date;
                }
            });

            // 4. Main Godown Kariger Consumption
            allKarigers.forEach(function(k) {
                const sheets = (typeof window.getKarigerSheets === "function") ? window.getKarigerSheets(k.id) : [];
                sheets.forEach(function(sh) {
                    const defaultSheetItem = (sh.banaItem || '').trim();
                    const rows = window.safeArray ? window.safeArray(sh.rows) : [];
                    rows.forEach(function(r) {
                        if (!r) return;
                        const rowKarkhana = normalizeGodownId(r.karkhanaId || k.karkhanaId || "k_main");
                        if (rowKarkhana === "k_main") {
                            const item = r.banaItemName || r.banaItem || defaultSheetItem;
                            if (isItemMatch(item)) {
                                totalGaya += safeNum(r.netBana);
                                totalAaya += safeNum(r.retBana);
                                if (r.date && (!lastDate || r.date > lastDate)) lastDate = r.date;
                            }
                        }
                    });
                });
            });
        }

        // --- CASE 3: BRANCH GODOWN ---
        else {
            // 1. Direct Purchase at Branch
            bStock.forEach(function(b) {
                if (b && String(b.karkhanaId) === String(kId) && b.name && b.name.trim().toLowerCase() === nameLower) {
                    totalAaya += safeNum(b.aaya !== undefined ? b.aaya : (b.qty || b.totalQty));
                    if (b.date && (!lastDate || b.date > lastDate)) lastDate = b.date;
                }
            });

            // 2. Transfers Received IN from other Godam (+)
            transfers.forEach(function(t) {
                const toK = normalizeGodownId(t.toKarkhanaId);
                if (String(toK) === String(kId) && t.itemName && t.itemName.trim().toLowerCase() === nameLower) {
                    totalAaya += safeNum(t.qty || t.quantity);
                    if (t.date && (!lastDate || t.date > lastDate)) lastDate = t.date;
                }
            });

            // 3. Transfers Sent OUT from this branch (-)
            transfers.forEach(function(t) {
                const fromK = normalizeGodownId(t.fromKarkhanaId);
                if (String(fromK) === String(kId) && t.itemName && t.itemName.trim().toLowerCase() === nameLower) {
                    totalGaya += safeNum(t.qty || t.quantity);
                    if (t.date && (!lastDate || t.date > lastDate)) lastDate = t.date;
                }
            });

            // 4. Branch Kariger Consumption
            allKarigers.forEach(function(k) {
                const sheets = (typeof window.getKarigerSheets === "function") ? window.getKarigerSheets(k.id) : [];
                sheets.forEach(function(sh) {
                    const defaultSheetItem = (sh.banaItem || '').trim();
                    const rows = window.safeArray ? window.safeArray(sh.rows) : [];
                    rows.forEach(function(r) {
                        if (!r) return;
                        const rowKarkhana = normalizeGodownId(r.karkhanaId || k.karkhanaId || "k_main");
                        if (String(rowKarkhana) === String(kId)) {
                            const item = r.banaItemName || r.banaItem || defaultSheetItem;
                            if (isItemMatch(item)) {
                                totalGaya += safeNum(r.netBana);
                                totalAaya += safeNum(r.retBana);
                                if (r.date && (!lastDate || r.date > lastDate)) lastDate = r.date;
                            }
                        }
                    });
                });
            });
        }

        const bacha = Math.max(0, totalAaya - totalGaya);

        return {
            name: cleanName,
            date: lastDate || (typeof window.getTodayDate === "function" ? window.getTodayDate() : ""),
            aaya: roundWeight(totalAaya),
            gaya: roundWeight(totalGaya),
            bacha: roundWeight(bacha)
        };
    };

    const getBanaAvailableBalance = (itemName, karkhanaId) => {
        const stats = getBanaItemStats(itemName, karkhanaId);
        return stats.bacha;
    };

    /**
     * Inter-Karkhana Transfer Engine
     */
    const transferBanaStock = (date, itemName, fromKarkhanaId, toKarkhanaId, qty, note) => {
        const weight = safeNum(qty);
        if (weight <= 0) {
            alert("Kripya sahi wazan (Qty) darj karein!");
            return false;
        }

        const sourceKid = normalizeGodownId(fromKarkhanaId);
        const targetKid = normalizeGodownId(toKarkhanaId);

        if (sourceKid === targetKid) {
            alert("Bhejne wala aur Paane wala Godam alag-alag hona chahiye!");
            return false;
        }

        const cleanName = (itemName || "").trim();
        if (!cleanName) {
            alert("Bana Item ka naam chunein!");
            return false;
        }

        const available = getBanaAvailableBalance(cleanName, sourceKid);
        if (weight > available) {
            alert("Bhejne wale godam me sirf " + available.toFixed(2) + " Kg Bana bacha hai! Aap " + weight.toFixed(2) + " Kg transfer nahi kar sakte.");
            return false;
        }

        const cleanDate = date || (typeof window.getTodayDate === "function" ? window.getTodayDate() : new Date().toISOString().split("T")[0]);
        const fromName = (typeof window.getKarkhanaNameById === "function") ? window.getKarkhanaNameById(sourceKid) : sourceKid;
        const toName = (typeof window.getKarkhanaNameById === "function") ? window.getKarkhanaNameById(targetKid) : targetKid;
        const transferRef = "tr_bana_" + Date.now();

        const transfers = window.safeArray ? window.safeArray(window.getStore("material_transfers")) : [];
        transfers.push({
            id: transferRef,
            date: cleanDate,
            type: "bana",
            itemName: cleanName,
            fromKarkhanaId: sourceKid,
            toKarkhanaId: targetKid,
            qty: weight,
            quantity: weight,
            note: note || ("Transfer: " + fromName + " ➔ " + toName),
            timestamp: Date.now()
        });
        if (typeof window.setStore === "function") window.setStore("material_transfers", transfers);

        const hist = window.safeArray ? window.safeArray(window.getStore("bana_history")) : [];
        hist.push({
            id: "bhist_out_" + Date.now(),
            date: cleanDate,
            name: cleanName,
            kariger: "Godown Transfer",
            type: "Transfer Out ➔ " + toName + (note ? " (" + note + ")" : ""),
            aaya: 0,
            gaya: weight,
            karkhanaId: sourceKid,
            refId: transferRef,
            timestamp: Date.now()
        });

        hist.push({
            id: "bhist_in_" + (Date.now() + 1),
            date: cleanDate,
            name: cleanName,
            kariger: "Godown Transfer",
            type: "Transfer In ⬅ " + fromName + (note ? " (" + note + ")" : ""),
            aaya: weight,
            gaya: 0,
            karkhanaId: targetKid,
            refId: transferRef,
            timestamp: Date.now() + 1
        });
        if (typeof window.setStore === "function") window.setStore("bana_history", hist);

        if (typeof window.recordTransferEntry === "function") {
            window.recordTransferEntry({
                id: transferRef,
                date: cleanDate,
                fromKarkhanaId: sourceKid,
                toKarkhanaId: targetKid,
                type: "bana",
                itemName: cleanName,
                quantity: weight,
                remarks: note || ("Bana Transfer: " + fromName + " ➔ " + toName)
            });
        }

        return true;
    };

    const banaCalcAPI = {
        getBanaItemStats,
        getBanaAvailableBalance,
        transferBanaStock,
        roundWeight
    };

    Object.keys(banaCalcAPI).forEach((fn) => { window[fn] = banaCalcAPI[fn]; });
    window.BanaCalcEngine = banaCalcAPI;
})();
