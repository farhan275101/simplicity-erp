/* ========================================================
   SIMPLICITY ERP - MULTI-KARKHANA & GODOWN ENGINE
   File: core/karkhana.js • Developed by Farhan Jawed
   (Main Godown, Branch Management & Inter-Transfer Core)
======================================================== */

// Multi-Karkhana list nikalna (Default Main Godown hamesha rahega)
function getKarkhanasSafe() {
    var list = safeArray(getStore("karkhana_list"));
    if (!list.length) {
        list = [{ 
            id: "k_main", 
            name: "Main Godown", 
            location: "Head Office", 
            isDefault: true 
        }];
        setStore("karkhana_list", list);
    }
    return list;
}

// Naya Karkhana jodna ya update karna
function saveKarkhanas(list) {
    var cleanList = safeArray(list);
    // Ye pakka karein ki kam se kam 1 default karkhana zaroor rahe
    if (!cleanList.some(function(k) { return k.isDefault; })) {
        if (cleanList.length > 0) cleanList[0].isDefault = true;
    }
    setStore("karkhana_list", cleanList);
}

// Kisi ID se Karkhana ka Naam nikalna (Helper)
function getKarkhanaNameById(kId) {
    if (!kId || kId === "k_main") return "Main Godown";
    var list = getKarkhanasSafe();
    var found = list.find(function(k) { return String(k.id) === String(kId); });
    return found ? found.name : "Main Godown";
}

// Inter-Karkhana Material Transfers nikalna (Bana / Zari)
function getMaterialTransfers(type) {
    var all = safeArray(getStore("material_transfers"));
    if (!type) return all;
    return all.filter(function(t) { return t && t.type === type; });
}
