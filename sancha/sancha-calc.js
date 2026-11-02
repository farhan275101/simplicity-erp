/* ========================================================
   SIMPLICITY ERP - SANCHA (LOOM TANI & CHUKKA) CALCULATION ENGINE
   File: sancha/sancha-calc.js • Developed by Farhan Jawed
   (Multi-Godam Sancha Stock, Inter-Transfer & Live Reconcile)
   [FIXED: Zero Double-Counting Bug on Inward / Khareed]
======================================================== */

var currentSanchaKarkhanaFilter = "all";

/**
 * 1. Sancha Items list safe get karna
 */
function getSanchaItems() {
    return safeArray(getStore("sancha_items"));
}

/**
 * 2. Sancha Items list safe save karna
 */
function saveSanchaItems(list) {
    setStore("sancha_items", safeArray(list));
}

/**
 * 3. Live Sancha Stats (Tani / Chukka wazan hisab)
 * (Kitna Aaya - Kitna Kariger Le Gaya = Kitna Bacha)
 */
function getSanchaItemStats(itemId, itemName, category, targetKarkhanaId) {
    var kId = targetKarkhanaId || currentSanchaKarkhanaFilter || "all";
    var cat = (category || "tani").toLowerCase();
    var nameLower = (itemName || "").trim().toLowerCase();

    var items = getSanchaItems();
    var hist = safeArray(getStore("sancha_history"));

    var totalAaya = 0;
    var totalGaya = 0;
    var lastDate = "";

    // 1. Direct Purchase / Opening Stock (sancha_items se)
    items.forEach(function(s) {
        if (!s) return;
        var sCat = (s.category || "tani").toLowerCase();
        if (sCat !== cat) return;

        var nameMatch = (itemId && String(s.id) === String(itemId)) || 
                        (!itemId && s.name && s.name.trim().toLowerCase() === nameLower);

        if (!nameMatch) return;

        var kMatch = (kId === "all") || 
                     (kId === "k_main" && (!s.karkhanaId || s.karkhanaId === "k_main")) || 
                     (String(s.karkhanaId) === String(kId));

        if (kMatch) {
            totalAaya += (Number(s.aaya !== undefined ? s.aaya : s.totalQty) || 0);
            if (s.date) lastDate = s.date;
        }
    });

    // 2. Kariger Issues, Returns & Transfers from History
    hist.forEach(function(h) {
        if (!h) return;
        var hCat = (h.category || "tani").toLowerCase();
        if (hCat !== cat) return;

        var nameMatch = (itemId && String(h.itemId) === String(itemId)) || 
                        (nameLower && h.name && h.name.trim().toLowerCase() === nameLower);

        if (!nameMatch) return;

        var kMatch = (kId === "all") || 
                     (kId === "k_main" && (!h.karkhanaId || h.karkhanaId === "k_main")) || 
                     (String(h.karkhanaId) === String(kId));

        if (kMatch) {
            var inQ = Number(h.aaya || 0);
            var outQ = Number(h.gaya || h.qty || 0);
            var t = String(h.type || "");

            // ⚠️ FIX: Agar history entry "Khareed / Inward" ki hai, toh use dobara nahi jodna
            // kyunki wo upar `sancha_items` me pehle se jud chuki hai!
            var isPurchase = (t.indexOf("Khareed") !== -1 || t.indexOf("Inward") !== -1 || t.indexOf("Opening") !== -1);

            if (inQ > 0 || outQ > 0) {
                if (!isPurchase) {
                    totalAaya += inQ; // Sirf Transfer In ya Kariger Wapas yahan judega
                }
                totalGaya += outQ;
            } else {
                // Legacy label check
                var q = Number(h.qty || h.wazan || 0);
                if (t.indexOf("Le Gaya") !== -1 || t.indexOf("Out") !== -1 || t.indexOf("Diya") !== -1 || t.indexOf("Issue") !== -1) {
                    totalGaya += q;
                } else if (!isPurchase && (t.indexOf("Wapas") !== -1 || t.indexOf("Jama") !== -1 || t.indexOf("Bani") !== -1 || t.indexOf("In") !== -1)) {
                    totalAaya += q;
                }
            }
            if (h.date) lastDate = h.date;
        }
    });

    var bacha = Math.max(0, totalAaya - totalGaya);

    return {
        id: itemId || ("sancha_" + nameLower),
        name: itemName || "-",
        category: cat,
        karkhanaId: kId,
        date: lastDate || (typeof getTodayDate === "function" ? getTodayDate() : ""),
        aaya: Number(totalAaya.toFixed(2)),
        gaya: Number(totalGaya.toFixed(2)),
        bacha: Number(bacha.toFixed(2))
    };
}

/**
 * 4. Available Balance Checker
 */
function getSanchaAvailableBalance(itemName, category, karkhanaId) {
    var stats = getSanchaItemStats(null, itemName, category, karkhanaId);
    return stats.bacha;
}

/**
 * 🌟 5. INTER-KARKHANA SANCHA (TANI / CHUKKA) TRANSFER ENGINE
 */
function transferSanchaStock(date, itemName, category, fromKarkhanaId, toKarkhanaId, qty, note) {
    var weight = parseFloat(qty) || 0;
    if (weight <= 0) {
        alert("Kripya sahi wazan (Qty Kg me) darj karein!");
        return false;
    }

    if (String(fromKarkhanaId) === String(toKarkhanaId)) {
        alert("Bhejne wala aur Paane wala Godam alag-alag hona chahiye!");
        return false;
    }

    var cleanName = (itemName || "").trim();
    if (!cleanName) {
        alert("Sancha Item ka naam chunein!");
        return false;
    }

    var cat = (category || "tani").toLowerCase();

    // Balance check
    var available = getSanchaAvailableBalance(cleanName, cat, fromKarkhanaId);
    if (weight > available) {
        alert("Bhejne wale godam me sirf " + available.toFixed(2) + " Kg " + (cat === "chukka" ? "Chukka" : "Tani") + " bacha hai! Aap " + weight.toFixed(2) + " Kg transfer nahi kar sakte.");
        return false;
    }

    var cleanDate = date || (typeof getTodayDate === "function" ? getTodayDate() : new Date().toISOString().split("T")[0]);
    var fromName = (typeof getKarkhanaNameById === "function") ? getKarkhanaNameById(fromKarkhanaId) : fromKarkhanaId;
    var toName = (typeof getKarkhanaNameById === "function") ? getKarkhanaNameById(toKarkhanaId) : toKarkhanaId;
    var transferRef = "tr_sancha_" + Date.now();

    var hist = safeArray(getStore("sancha_history"));

    // Source Godown Entry (OUT)
    hist.push({
        id: "shist_out_" + Date.now(),
        date: cleanDate,
        name: cleanName,
        category: cat,
        kariger: "Godown Transfer",
        type: "Transfer Out ➔ " + toName + (note ? " (" + note + ")" : ""),
        aaya: 0,
        gaya: weight,
        karkhanaId: fromKarkhanaId,
        refId: transferRef,
        timestamp: Date.now()
    });

    // Destination Godown Entry (IN)
    hist.push({
        id: "shist_in_" + Date.now(),
        date: cleanDate,
        name: cleanName,
        category: cat,
        kariger: "Godown Transfer",
        type: "Transfer In ⬅ " + fromName + (note ? " (" + note + ")" : ""),
        aaya: weight,
        gaya: 0,
        karkhanaId: toKarkhanaId,
        refId: transferRef,
        timestamp: Date.now() + 1
    });

    setStore("sancha_history", hist);

    if (typeof recordTransferEntry === "function") {
        recordTransferEntry({
            id: transferRef,
            date: cleanDate,
            fromKarkhanaId: fromKarkhanaId,
            toKarkhanaId: toKarkhanaId,
            type: "sancha_" + cat,
            itemName: cleanName,
            quantity: weight,
            remarks: note || ((cat === "chukka" ? "Chukka" : "Tani") + " Transfer: " + fromName + " ➔ " + toName)
        });
    }

    return true;
}
