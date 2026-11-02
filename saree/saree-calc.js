/* ========================================================
   SIMPLICITY ERP - SAREE CALCULATION & PIPELINE ENGINE
   File: saree/saree-calc.js • Developed by Farhan Jawed
   (Fresh -> Cutting -> Finished -> Lott + Multi-Godam Transfer)
======================================================== */

/**
 * 1. Kariger Sheet se Saree / Lott auto jama karne ka function
 */
function recordSareeFromKariger(date, sareeName, karigerName, karkhanaId, sareeQty, lottQty, refId) {
    var history = safeArray(getStore("saree_history"));
    var cleanDate = date || (typeof getTodayDate === "function" ? getTodayDate() : new Date().toISOString().split("T")[0]);
    var cleanSaree = (sareeName || "General Saree").trim().toUpperCase();
    var cleanKariger = (karigerName || "Kariger").trim().toUpperCase();
    var kid = karkhanaId || "k_main";

    // Fresh Saree entry
    if (Number(sareeQty) > 0) {
        history.push({
            id: "saree_in_" + Date.now() + "_f",
            date: cleanDate,
            sareeName: cleanSaree,
            karigerName: cleanKariger,
            kariger: cleanKariger,
            karkhanaId: kid,
            type: "fresh",
            typeLabel: "Fresh Saree (Kariger Sheet)",
            aai: Number(sareeQty),
            gai: 0,
            isOut: false,
            refId: refId || "",
            timestamp: Date.now()
        });
    }

    // Lott Saree entry
    if (Number(lottQty) > 0) {
        history.push({
            id: "saree_in_" + Date.now() + "_l",
            date: cleanDate,
            sareeName: cleanSaree,
            karigerName: cleanKariger,
            kariger: cleanKariger,
            karkhanaId: kid,
            type: "lott",
            typeLabel: "Lott Saree (Kariger Sheet)",
            aai: Number(lottQty),
            gai: 0,
            isOut: false,
            refId: refId || "",
            timestamp: Date.now()
        });
    }

    setStore("saree_history", history);
}

/**
 * 2. Kariger Sheet ki line delete hone par Saree Stock se entry hatana
 */
function removeSareeByRefId(refId) {
    if (!refId) return;
    var history = safeArray(getStore("saree_history"));
    history = history.filter(function(item) {
        return String(item.refId) !== String(refId);
    });
    setStore("saree_history", history);
}

/**
 * 🌟 3. INTER-KARKHANA SAREE TRANSFER ENGINE
 * Jab kisi branch (Mau, Mubarakpur, etc.) se Main Godam saree aayegi
 * to wo Main Godam ke FRESH SAREE stock me judegi!
 */
function transferSareeBetweenKarkhana(date, sareeName, karigerName, fromKarkhanaId, toKarkhanaId, pcs, currentTab, note) {
    var qty = parseInt(pcs, 10) || 0;
    if (qty <= 0) {
        alert("Valid Saree sankhya (Pcs) darj karein!");
        return false;
    }

    if (String(fromKarkhanaId) === String(toKarkhanaId)) {
        alert("Bhejne wala aur Paane wala Godam alag-alag hona chahiye!");
        return false;
    }

    var cleanSaree = (sareeName || "").trim().toUpperCase();
    var cleanKariger = (karigerName || "").trim().toUpperCase();
    var sourceTab = (currentTab || "fresh").toLowerCase();

    // Available balance check
    var available = getSareeAvailableBalance(cleanSaree, cleanKariger, fromKarkhanaId, sourceTab);
    if (qty > available) {
        alert("Stock me sirf " + available + " Pcs maujood hain! Aap " + qty + " Pcs transfer nahi kar sakte.");
        return false;
    }

    var cleanDate = date || (typeof getTodayDate === "function" ? getTodayDate() : new Date().toISOString().split("T")[0]);
    var fromName = (typeof getKarkhanaNameById === "function") ? getKarkhanaNameById(fromKarkhanaId) : fromKarkhanaId;
    var toName = (typeof getKarkhanaNameById === "function") ? getKarkhanaNameById(toKarkhanaId) : toKarkhanaId;
    var transferRef = "tr_saree_" + Date.now();

    // ⭐ KEY RULE: Agar Main Godam me saree aa rahi hai, to hamesha 'fresh' stock me jayegi
    var destinationTab = (toKarkhanaId === "k_main") ? "fresh" : sourceTab;

    var history = safeArray(getStore("saree_history"));

    // 1. Source Karkhana se OUT (-)
    history.push({
        id: "saree_out_" + Date.now() + "_tr",
        date: cleanDate,
        sareeName: cleanSaree,
        karigerName: cleanKariger,
        kariger: cleanKariger,
        karkhanaId: fromKarkhanaId,
        type: sourceTab,
        typeLabel: "Transfer Out ➔ " + toName + (note ? " (" + note + ")" : ""),
        aai: 0,
        gai: qty,
        isOut: true,
        refId: transferRef,
        timestamp: Date.now()
    });

    // 2. Destination Karkhana me IN (+) (Main Godam me direct FRESH me)
    history.push({
        id: "saree_in_" + Date.now() + "_tr",
        date: cleanDate,
        sareeName: cleanSaree,
        karigerName: cleanKariger,
        kariger: cleanKariger,
        karkhanaId: toKarkhanaId,
        type: destinationTab, // ⭐ Always FRESH for Main Godown
        typeLabel: "Transfer In ⬅ " + fromName + (destinationTab === "fresh" ? " (Fresh Stock)" : "") + (note ? " (" + note + ")" : ""),
        aai: qty,
        gai: 0,
        isOut: false,
        refId: transferRef,
        timestamp: Date.now() + 1
    });

    setStore("saree_history", history);

    // Karkhana Transfer Log me bhi entry record karein
    if (typeof recordTransferEntry === "function") {
        recordTransferEntry({
            id: transferRef,
            date: cleanDate,
            fromKarkhanaId: fromKarkhanaId,
            toKarkhanaId: toKarkhanaId,
            type: "saree",
            targetStock: destinationTab,
            sareeName: cleanSaree,
            karigerName: cleanKariger,
            quantity: qty,
            remarks: note || ("Saree Transfer: " + fromName + " ➔ " + toName)
        });
    }

    return true;
}

/**
 * 🌟 4. PIPELINE STAGE MOVE (Fresh -> Cutting -> Finished -> Lott)
 * Ek hi godam ke andar stage aage badhana
 */
function moveSareePipelineStage(date, sareeName, karigerName, karkhanaId, pcs, fromTab, toTab, note) {
    var qty = parseInt(pcs, 10) || 0;
    if (qty <= 0) {
        alert("Valid Pcs sankhya darj karein!");
        return false;
    }

    var cleanSaree = (sareeName || "").trim().toUpperCase();
    var cleanKariger = (karigerName || "").trim().toUpperCase();
    var kid = karkhanaId || "k_main";

    var available = getSareeAvailableBalance(cleanSaree, cleanKariger, kid, fromTab);
    if (qty > available) {
        alert("Is stage me sirf " + available + " Pcs hain! Aap " + qty + " move nahi kar sakte.");
        return false;
    }

    var cleanDate = date || (typeof getTodayDate === "function" ? getTodayDate() : new Date().toISOString().split("T")[0]);
    var stageRef = "stage_move_" + Date.now();

    var stageNames = {
        fresh: "Fresh",
        cutting: "Cutting",
        finished: "Finished",
        lott: "Lott"
    };

    var history = safeArray(getStore("saree_history"));

    // Previous stage se OUT (-)
    history.push({
        id: "saree_stage_out_" + Date.now(),
        date: cleanDate,
        sareeName: cleanSaree,
        karigerName: cleanKariger,
        kariger: cleanKariger,
        karkhanaId: kid,
        type: fromTab.toLowerCase(),
        typeLabel: "Moved ➔ " + (stageNames[toTab] || toTab) + (note ? " (" + note + ")" : ""),
        aai: 0,
        gai: qty,
        isOut: true,
        refId: stageRef,
        timestamp: Date.now()
    });

    // Next stage me IN (+)
    history.push({
        id: "saree_stage_in_" + Date.now(),
        date: cleanDate,
        sareeName: cleanSaree,
        karigerName: cleanKariger,
        kariger: cleanKariger,
        karkhanaId: kid,
        type: toTab.toLowerCase(),
        typeLabel: "Received ⬅ " + (stageNames[fromTab] || fromTab) + (note ? " (" + note + ")" : ""),
        aai: qty,
        gai: 0,
        isOut: false,
        refId: stageRef,
        timestamp: Date.now() + 1
    });

    setStore("saree_history", history);
    return true;
}

/**
 * 5. Available Stock Balance nikalna (Specific Saree + Kariger + Godam + Tab)
 */
function getSareeAvailableBalance(sareeName, karigerName, karkhanaId, tabName) {
    var history = safeArray(getStore("saree_history"));
    var targetSaree = (sareeName || "").trim().toUpperCase();
    var targetKariger = (karigerName || "").trim().toUpperCase();
    var targetKid = karkhanaId || "k_main";
    var targetTab = (tabName || "fresh").toLowerCase();

    var totalAai = 0;
    var totalGai = 0;

    history.forEach(function(h) {
        if (!h) return;
        var hType = (h.type || "fresh").toLowerCase();
        if (hType !== targetTab) return;

        var hKid = h.karkhanaId || "k_main";
        if (String(hKid) !== String(targetKid)) return;

        var sName = (h.sareeName || h.name || "").trim().toUpperCase();
        var kName = (h.karigerName || h.kariger || "").trim().toUpperCase();

        if (sName === targetSaree && kName === targetKariger) {
            var isGai = (h.isOut === true) || (Number(h.gai) > 0);
            var inQ = isGai ? 0 : Number(h.aai !== undefined ? h.aai : (h.pcs || 0));
            var outQ = isGai ? Number(h.gai !== undefined ? h.gai : (h.pcs || 0)) : 0;
            totalAai += inQ;
            totalGai += outQ;
        }
    });

    return Math.max(0, totalAai - totalGai);
}

/**
 * 6. Saree Table Pipeline Grouping (Fresh, Cutting, Finished, Lott)
 */
function groupSareeStockByTab(historyList, currentTab, karkhanaFilter) {
    var targetTab = (currentTab || "fresh").toLowerCase();
    var kId = karkhanaFilter || "all";
    var map = {};

    var getGodamName = function(kid) {
        if (typeof getKarkhanaNameById === "function") {
            return getKarkhanaNameById(kid);
        }
        if (!kid || kid === "k_main") return "Main Godown";
        return "Godown";
    };

    safeArray(historyList).forEach(function(h) {
        if (!h) return;
        var hType = (h.type || "fresh").toLowerCase();
        if (hType !== targetTab) return;

        var hKid = h.karkhanaId || "k_main";
        if (kId !== "all" && String(hKid) !== String(kId)) return;

        var sName = (h.sareeName || h.name || "General Saree").trim().toUpperCase();
        var kName = (h.karigerName || h.kariger || "Karkhana").trim().toUpperCase();
        var key = sName + "___" + kName + "___" + hKid;

        if (!map[key]) {
            map[key] = {
                date: h.date || (typeof getTodayDate === "function" ? getTodayDate() : "-"),
                sareeName: sName,
                karigerName: kName,
                karkhanaId: hKid,
                godamName: getGodamName(hKid),
                aai: 0,
                gai: 0,
                bachi: 0
            };
        }

        var isGai = (h.isOut === true) || (Number(h.gai) > 0);
        var inQ = isGai ? 0 : Number(h.aai !== undefined ? h.aai : (h.pcs || 0));
        var outQ = isGai ? Number(h.gai !== undefined ? h.gai : (h.pcs || 0)) : 0;

        map[key].aai += inQ;
        map[key].gai += outQ;
        if (h.date) map[key].date = h.date;
    });

    var rows = [];
    for (var k in map) {
        map[k].bachi = Math.max(0, map[k].aai - map[k].gai);
        // Sirf wahi rows dikhayen jahan stock ya transaction hua ho
        rows.push(map[k]);
    }
    return rows;
}

/**
 * 7. All-Column Universal Search Filter
 */
function searchSareeData(list, searchText) {
    if (!searchText || !searchText.trim()) return list;
    var query = searchText.toLowerCase().trim();

    return list.filter(function(row) {
        var rowText = (
            String(row.date || "") + " " +
            String(row.sareeName || "") + " " +
            String(row.karigerName || "") + " " +
            String(row.godamName || "") + " " +
            String(row.aai || "") + " " +
            String(row.gai || "") + " " +
            String(row.bachi || "")
        ).toLowerCase();

        return rowText.indexOf(query) !== -1;
    });
}

/**
 * 8. Passbook Filter (Date Range + Search)
 */
function filterPassbookHistory(historyList, fromDate, toDate, searchTxt) {
    var filtered = safeArray(historyList);

    if (fromDate) filtered = filtered.filter(function(item) { return item.date >= fromDate; });
    if (toDate) filtered = filtered.filter(function(item) { return item.date <= toDate; });

    if (searchTxt && searchTxt.trim()) {
        var query = searchTxt.toLowerCase().trim();
        filtered = filtered.filter(function(item) {
            var fullText = (
                String(item.date || "") + " " +
                String(item.sareeName || "") + " " +
                String(item.karigerName || "") + " " +
                String(item.typeLabel || "") + " " +
                String(item.aai || "") + " " +
                String(item.gai || "")
            ).toLowerCase();
            return fullText.indexOf(query) !== -1;
        });
    }

    return filtered;
}
