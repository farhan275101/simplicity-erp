/* ========================================================
   SIMPLICITY ERP - MULTI-KARKHANA & GODOWN ENGINE
   File: core/karkhana.js • Developed by Farhan Jawed
   (Main Godown, Branch Management, UI Tabs & Inter-Transfer Core)
======================================================== */

// Default Main Godown ID
var DEFAULT_MAIN_KARKHANA_ID = "k_main";

/**
 * 1. Saare Karkhanas safe list nikalna
 * (Cloud Safe: Khali hone par cloud ko overwrite nahi karega)
 */
function getKarkhanasSafe() {
    var list = [];
    try {
        if (typeof getStore === "function") {
            list = safeArray(getStore("karkhana_list"));
        } else {
            var raw = localStorage.getItem("karkhana_list");
            list = raw ? safeArray(JSON.parse(raw)) : [];
        }
    } catch (e) {
        list = [];
    }

    // 🔒 SAFE FIX: Khali hone par sirf memory me default return karein
    // setStore() call mat karein taaki doosre device ka data delete na ho
    if (!list.length) {
        return [
            { 
                id: DEFAULT_MAIN_KARKHANA_ID, 
                name: "Main Godown", 
                location: "Head Office", 
                incharge: "Admin / Maalik",
                phone: "",
                isDefault: true,
                createdAt: new Date().toISOString()
            }
        ];
    }
    return list;
}

/**
 * Karkhanas list save karna (Local + Cloud Sync)
 */
function saveKarkhanas(list) {
    var cleanList = safeArray(list);
    var hasDefault = cleanList.some(function(k) { return k.isDefault || k.id === DEFAULT_MAIN_KARKHANA_ID; });
    if (!hasDefault && cleanList.length > 0) {
        cleanList[0].isDefault = true;
    }
    if (typeof setStore === "function") {
        setStore("karkhana_list", cleanList);
    } else {
        localStorage.setItem("karkhana_list", JSON.stringify(cleanList));
    }

    // Navbar Dropdown ko bhi sath ke sath update karein
    if (typeof populateNavbarKarkhanaDropdown === "function") {
        populateNavbarKarkhanaDropdown();
    }
}

/**
 * Naya Karkhana jodna (Mau, Mubarakpur, Khairabad etc.)
 */
function addNewKarkhana(name, location, incharge, phone) {
    var cleanName = String(name || "").trim();
    if (!cleanName) {
        alert("Kripya Karkhana ka naam darj karein!");
        return null;
    }

    var list = getKarkhanasSafe();
    var newId = "k_" + Date.now();
    var newKarkhana = {
        id: newId,
        name: cleanName,
        location: String(location || "").trim() || "Local Branch",
        incharge: String(incharge || "").trim(),
        phone: String(phone || "").trim(),
        isDefault: false,
        createdAt: new Date().toISOString()
    };

    list.push(newKarkhana);
    saveKarkhanas(list);
    return newKarkhana;
}

/**
 * Karkhana Edit karna
 */
function updateKarkhana(kId, updateData) {
    var list = getKarkhanasSafe();
    var index = list.findIndex(function(k) { return String(k.id) === String(kId); });
    if (index === -1) return false;

    if (list[index].id === DEFAULT_MAIN_KARKHANA_ID) {
        list[index].name = updateData.name || list[index].name;
        list[index].location = updateData.location || list[index].location;
        list[index].incharge = updateData.incharge || list[index].incharge;
        list[index].phone = updateData.phone || list[index].phone;
    } else {
        list[index] = Object.assign({}, list[index], updateData);
    }
    saveKarkhanas(list);
    return true;
}

/**
 * Karkhana Delete karna (Main Godown delete nahi ho sakta)
 */
function deleteKarkhana(kId) {
    if (kId === DEFAULT_MAIN_KARKHANA_ID) {
        alert("Main Godown ko delete nahi kiya ja sakta!");
        return false;
    }
    if (!confirm("Kya aap waqai is karkhana ko hatana chahte hain?")) return false;

    var list = getKarkhanasSafe().filter(function(k) { return String(k.id) !== String(kId); });
    saveKarkhanas(list);

    if (getActiveKarkhanaId() === kId) {
        setActiveKarkhanaId("all");
    }
    return true;
}

/**
 * ID se Karkhana ka Naam nikalna
 */
function getKarkhanaNameById(kId) {
    if (!kId || kId === "all") return "Sabhi Karkhana (Total)";
    if (kId === DEFAULT_MAIN_KARKHANA_ID) return "Main Godown";
    var list = getKarkhanasSafe();
    var found = list.find(function(k) { return String(k.id) === String(kId); });
    return found ? found.name : "Karkhana";
}

/* ========================================================
   ACTIVE KARKHANA STATE MANAGEMENT & FILTER BUTTONS
======================================================== */

/**
 * Abhi konsa karkhana active/selected hai
 */
function getActiveKarkhanaId() {
    var activeId = "all";
    if (typeof getStore === "function") {
        activeId = getStore("active_karkhana_id");
    } else {
        activeId = localStorage.getItem("active_karkhana_id");
    }
    return activeId ? String(activeId).trim() : "all";
}

/**
 * Active Karkhana set karna aur screen refresh callback run karna
 */
function setActiveKarkhanaId(kId, callback) {
    var targetId = kId ? String(kId).trim() : "all";
    if (typeof setStore === "function") {
        setStore("active_karkhana_id", targetId);
    } else {
        localStorage.setItem("active_karkhana_id", targetId);
    }

    updateTabButtonActiveUI(targetId);

    if (typeof callback === "function") {
        callback(targetId);
    } else if (typeof triggerActiveSectionRefresh === "function") {
        triggerActiveSectionRefresh();
    }
}

/**
 * Tab button UI active state update helper
 */
function updateTabButtonActiveUI(targetId) {
    var buttons = document.querySelectorAll(".karkhana-tab-btn");
    buttons.forEach(function(btn) {
        if (btn.getAttribute("data-karkhana-id") === targetId) {
            btn.classList.add("active-karkhana-tab");
            btn.style.backgroundColor = "#2563eb";
            btn.style.color = "#ffffff";
            btn.style.borderColor = "#1d4ed8";
        } else {
            btn.classList.remove("active-karkhana-tab");
            btn.style.backgroundColor = "#ffffff";
            btn.style.color = "#374151";
            btn.style.borderColor = "#d1d5db";
        }
    });
}

/**
 * 🌟 TOP TABS GENERATOR
 */
function renderKarkhanaTabs(containerId, onSelectCallback, options) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var opts = options || {};
    var showAll = opts.showAllBtn !== false;
    var list = getKarkhanasSafe();
    var currentActive = getActiveKarkhanaId();

    var html = '<div class="karkhana-tabs-scroller" style="display:flex; gap:8px; align-items:center; overflow-x:auto; padding:6px 2px; margin-bottom:12px;">';

    if (showAll) {
        var isAllActive = currentActive === "all";
        html += '<button type="button" class="karkhana-tab-btn ' + (isAllActive ? 'active-karkhana-tab' : '') + '" '
              + 'data-karkhana-id="all" '
              + 'onclick="handleKarkhanaTabClick(\'all\', ' + (onSelectCallback ? onSelectCallback.name : 'null') + ')" '
              + 'style="padding:6px 14px; font-size:13px; font-weight:600; border-radius:20px; border:1px solid ' + (isAllActive ? '#1d4ed8' : '#d1d5db') + '; '
              + 'background:' + (isAllActive ? '#2563eb' : '#ffffff') + '; color:' + (isAllActive ? '#ffffff' : '#374151') + '; cursor:pointer; white-space:nowrap; transition:all 0.2s;">'
              + '🌐 Sabhi Karkhana'
              + '</button>';
    }

    list.forEach(function(k) {
        var isActive = currentActive === String(k.id);
        var icon = k.id === DEFAULT_MAIN_KARKHANA_ID ? '🏢' : '🏭';
        html += '<button type="button" class="karkhana-tab-btn ' + (isActive ? 'active-karkhana-tab' : '') + '" '
              + 'data-karkhana-id="' + k.id + '" '
              + 'onclick="handleKarkhanaTabClick(\'' + k.id + '\', ' + (onSelectCallback ? onSelectCallback.name : 'null') + ')" '
              + 'style="padding:6px 14px; font-size:13px; font-weight:600; border-radius:20px; border:1px solid ' + (isActive ? '#1d4ed8' : '#d1d5db') + '; '
              + 'background:' + (isActive ? '#2563eb' : '#ffffff') + '; color:' + (isActive ? '#ffffff' : '#374151') + '; cursor:pointer; white-space:nowrap; transition:all 0.2s;">'
              + icon + ' ' + k.name
              + '</button>';
    });

    html += '<button type="button" onclick="openKarkhanaManageModal()" '
          + 'style="padding:6px 12px; font-size:12px; font-weight:600; border-radius:20px; border:1px dashed #2563eb; '
          + 'background:#eff6ff; color:#2563eb; cursor:pointer; white-space:nowrap;">'
          + '➕ Karkhana Jodein'
          + '</button>';

    html += '</div>';
    container.innerHTML = html;
}

function handleKarkhanaTabClick(kId, callbackFunc) {
    setActiveKarkhanaId(kId, callbackFunc);
}

function filterByCurrentKarkhana(arrayData, karkhanaIdKey) {
    var list = safeArray(arrayData);
    var activeId = getActiveKarkhanaId();
    if (activeId === "all") return list;

    var keyName = karkhanaIdKey || "karkhanaId";
    return list.filter(function(item) {
        if (!item) return false;
        var itemKarkhana = item[keyName] || DEFAULT_MAIN_KARKHANA_ID;
        return String(itemKarkhana) === String(activeId);
    });
}

/* ========================================================
   TRANSFER ENGINE (RAW MATERIAL, SAREE & CASH)
======================================================== */

function getAllTransfersSafe() {
    if (typeof getStore === "function") {
        return safeArray(getStore("karkhana_transfers"));
    }
    var raw = localStorage.getItem("karkhana_transfers");
    return raw ? safeArray(JSON.parse(raw)) : [];
}

function recordTransferEntry(transferData) {
    var transfers = getAllTransfersSafe();
    var record = Object.assign({
        id: "tr_" + Date.now(),
        date: (typeof getTodayDate === "function") ? getTodayDate() : new Date().toISOString().split("T")[0],
        timestamp: Date.now(),
        fromKarkhanaId: DEFAULT_MAIN_KARKHANA_ID,
        toKarkhanaId: DEFAULT_MAIN_KARKHANA_ID,
        type: "general",
        targetStock: "fresh",
        quantity: 0,
        amount: 0,
        remarks: ""
    }, transferData);

    transfers.unshift(record);
    if (typeof setStore === "function") {
        setStore("karkhana_transfers", transfers);
    } else {
        localStorage.setItem("karkhana_transfers", JSON.stringify(transfers));
    }
    return record;
}

function transferSareesToMainGodown(fromKarkhanaId, sareeQty, sareeType, remarks) {
    var qty = parseInt(sareeQty, 10) || 0;
    if (qty <= 0) {
        alert("Valid Saree sankhya darj karein!");
        return false;
    }

    var record = recordTransferEntry({
        type: "saree",
        fromKarkhanaId: fromKarkhanaId,
        toKarkhanaId: DEFAULT_MAIN_KARKHANA_ID,
        targetStock: "fresh", // ⭐ Main Godam ke Fresh Stock me judegi
        sareeType: sareeType || "Standard",
        quantity: qty,
        remarks: remarks || "Karkhana se Main Godown Fresh Saree aamad"
    });

    return record;
}

function transferRawMaterial(type, fromKarkhanaId, toKarkhanaId, qty, itemName, remarks) {
    var q = parseFloat(qty) || 0;
    if (q <= 0) {
        alert("Kripya valid wazan / quantity darj karein!");
        return false;
    }

    var record = recordTransferEntry({
        type: type,
        fromKarkhanaId: fromKarkhanaId,
        toKarkhanaId: toKarkhanaId,
        itemName: itemName || (type === "zari" ? "Zari" : "Bana"),
        quantity: q,
        remarks: remarks || (type.toUpperCase() + " Stock Transfer")
    });

    return record;
}

function transferCashBetweenKarkhana(fromKarkhanaId, toKarkhanaId, amount, remarks) {
    var amt = parseFloat(amount) || 0;
    if (amt <= 0) {
        alert("Kripya valid raqam (amount) darj karein!");
        return false;
    }

    var record = recordTransferEntry({
        type: "cash",
        fromKarkhanaId: fromKarkhanaId,
        toKarkhanaId: toKarkhanaId,
        amount: amt,
        remarks: remarks || "Inter-Karkhana Cash / Fund Transfer"
    });

    return record;
}

/* ========================================================
   MODAL POPUP UI: NAYA KARKHANA JODNA AUR MANAGE KARNA
======================================================== */

function openKarkhanaManageModal() {
    var existingModal = document.getElementById("karkhana-manager-modal");
    if (existingModal) existingModal.remove();

    var list = getKarkhanasSafe();
    var listRows = list.map(function(k) {
        var isMain = k.id === DEFAULT_MAIN_KARKHANA_ID;
        return '<tr style="border-bottom:1px solid #e5e7eb;">'
             + '<td style="padding:8px; font-weight:600;">' + (isMain ? '🏢 ' : '🏭 ') + k.name + (isMain ? ' <span style="font-size:10px; color:#2563eb; background:#eff6ff; padding:2px 6px; border-radius:10px;">Default</span>' : '') + '</td>'
             + '<td style="padding:8px; color:#4b5563;">' + (k.location || '-') + '</td>'
             + '<td style="padding:8px; color:#4b5563;">' + (k.incharge || '-') + '</td>'
             + '<td style="padding:8px; text-align:center;">'
             + (isMain ? '<span style="color:#9ca3af; font-size:12px;">Fixed</span>' : '<button type="button" onclick="deleteKarkhanaPrompt(\'' + k.id + '\')" style="background:#fee2e2; color:#dc2626; border:none; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer;">Delete</button>')
             + '</td>'
             + '</tr>';
    }).join("");

    var modalHtml = '<div id="karkhana-manager-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:99999; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box;">'
                  + '<div style="background:#ffffff; width:100%; max-width:520px; border-radius:12px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.2); overflow:hidden; display:flex; flex-direction:column; max-height:90vh;">'
                  
                  + '<div style="background:#1e293b; color:#ffffff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">'
                  + '<h3 style="margin:0; font-size:16px;">🏭 Karkhana & Godown Management</h3>'
                  + '<button type="button" onclick="closeKarkhanaManageModal()" style="background:transparent; border:none; color:#ffffff; font-size:20px; cursor:pointer;">&times;</button>'
                  + '</div>'

                  + '<div style="padding:16px; overflow-y:auto;">'
                  
                  // Form
                  + '<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:16px;">'
                  + '<div style="font-weight:600; font-size:13px; margin-bottom:8px; color:#1e293b;">+ Naya Karkhana Jodein:</div>'
                  + '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">'
                  + '<input type="text" id="new_k_name" placeholder="Karkhana Naam (e.g. Mau Unit)" style="padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; width:100%; box-sizing:border-box;">'
                  + '<input type="text" id="new_k_location" placeholder="Location (e.g. Mubarakpur)" style="padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; width:100%; box-sizing:border-box;">'
                  + '</div>'
                  + '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">'
                  + '<input type="text" id="new_k_incharge" placeholder="Munshi / Manager" style="padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; width:100%; box-sizing:border-box;">'
                  + '<input type="text" id="new_k_phone" placeholder="Mobile No." style="padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; width:100%; box-sizing:border-box;">'
                  + '</div>'
                  + '<button type="button" onclick="submitNewKarkhanaForm()" style="background:#2563eb; color:#ffffff; border:none; width:100%; padding:9px; border-radius:6px; font-weight:600; font-size:13px; cursor:pointer;">Karkhana Save Karein</button>'
                  + '</div>'

                  // Table
                  + '<div style="font-weight:600; font-size:13px; margin-bottom:6px; color:#1e293b;">Mawjooda Karkhane:</div>'
                  + '<div style="max-height:200px; overflow-y:auto; border:1px solid #e5e7eb; border-radius:6px;">'
                  + '<table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">'
                  + '<thead style="background:#f3f4f6; position:sticky; top:0;">'
                  + '<tr>'
                  + '<th style="padding:8px;">Naam</th>'
                  + '<th style="padding:8px;">Location</th>'
                  + '<th style="padding:8px;">Munshi</th>'
                  + '<th style="padding:8px; text-align:center;">Action</th>'
                  + '</tr>'
                  + '</thead>'
                  + '<tbody>' + listRows + '</tbody>'
                  + '</table>'
                  + '</div>'

                  + '</div>'
                  + '</div>'
                  + '</div>';

    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function closeKarkhanaManageModal() {
    var modal = document.getElementById("karkhana-manager-modal");
    if (modal) modal.remove();
}

function submitNewKarkhanaForm() {
    var name = document.getElementById("new_k_name").value;
    var location = document.getElementById("new_k_location").value;
    var incharge = document.getElementById("new_k_incharge").value;
    var phone = document.getElementById("new_k_phone").value;

    if (!name || !name.trim()) {
        alert("Karkhana ka naam likhna zaroori hai!");
        return;
    }

    addNewKarkhana(name, location, incharge, phone);
    closeKarkhanaManageModal();
    
    // UI tabs aur dropdown dono refresh karein
    if (typeof populateNavbarKarkhanaDropdown === "function") {
        populateNavbarKarkhanaDropdown();
    }
    if (typeof triggerActiveSectionRefresh === "function") {
        triggerActiveSectionRefresh();
    }
}

function deleteKarkhanaPrompt(kId) {
    if (deleteKarkhana(kId)) {
        closeKarkhanaManageModal();
        if (typeof populateNavbarKarkhanaDropdown === "function") {
            populateNavbarKarkhanaDropdown();
        }
        if (typeof triggerActiveSectionRefresh === "function") {
            triggerActiveSectionRefresh();
        }
    }
}
