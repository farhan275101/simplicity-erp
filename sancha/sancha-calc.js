/* ========================================================
   SIMPLICITY ERP - SANCHA (LOOM TANI) CALCULATION ENGINE
   File: sancha/sancha-calc.js • Developed by Farhan Jawed
   (Sancha Par Tani Bani, Kariger Loom Par Le Gaya & Bachi Tani)
======================================================== */

var currentSanchaKarkhanaFilter = "k_main";

function getSanchaItems() {
    return safeArray(getStore("sancha_items"));
}

function saveSanchaItems(list) {
    setStore("sancha_items", safeArray(list));
}

// LIVE TANI STOCK STATS (KITNI TANI BANI - KITNI KARIGER LE GAYA = KITNI TANI BACHI)
function getSanchaItemStats(itemId, itemName, targetKarkhanaId) {
    var kId = targetKarkhanaId || currentSanchaKarkhanaFilter || "k_main";
    var items = getSanchaItems();
    var hist = safeArray(getStore("sancha_history"));

    var targetItem = items.find(function(s) {
        return (itemId && String(s.id) === String(itemId)) || 
               (!itemId && s.name && s.name.trim().toLowerCase() === (itemName || "").trim().toLowerCase());
    });

    var totalTaniBani = targetItem ? (Number(targetItem.totalQty) || 0) : 0;
    var karigerLeGaya = 0;
    var wapasAayi = 0;

    hist.forEach(function(h) {
        if (!h) return;
        var matchItem = (targetItem && String(h.itemId) === String(targetItem.id)) || 
                        (itemName && h.name && h.name.toLowerCase() === itemName.toLowerCase());
        var matchK = (!h.karkhanaId && kId === "k_main") || (String(h.karkhanaId) === String(kId));

        if (matchItem && matchK) {
            var q = Number(h.qty) || 0;
            var t = String(h.type || "");

            if (t.indexOf("Le Gaya") !== -1 || t.indexOf("Out") !== -1 || t.indexOf("Diya") !== -1) {
                karigerLeGaya += q;
            } else if (t.indexOf("Wapas") !== -1 || t.indexOf("Jama") !== -1 || t.indexOf("Bani") !== -1 || t.indexOf("In") !== -1) {
                wapasAayi += q;
            }
        }
    });

    // Bachi Tani = (Kul Bani Hui Tani) - (Kariger Loom Par Le Gaya)
    var bachiTani = Math.max(0, (totalTaniBani + wapasAayi) - karigerLeGaya);

    return {
        id: targetItem ? targetItem.id : itemId,
        name: itemName || (targetItem ? targetItem.name : "-"),
        totalBani: totalTaniBani,
        karigerLeGaya: karigerLeGaya,
        wapasAayi: wapasAayi,
        bachiTani: bachiTani
    };
}
