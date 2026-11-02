/* ========================================================
   SIMPLICITY ERP - PAYMENTS, BAKAYA & CASH TRANSFER ENGINE
   File: payment/payment.js • Developed by Farhan Jawed
   (Multi-Godam Bakaya, Quick Pay Sync & Inter-Godam Fund Transfer)
======================================================== */

var currentPaymentKarkhanaFilter = "all";
var activePaymentKarigerId = null;

/**
 * 1. Payment Module Kholna
 */
function openPaymentModule() {
    var dView = document.getElementById("dashboard-view");
    if (dView) dView.style.display = "none";

    var pSec = document.getElementById("payment-section");
    if (pSec) pSec.style.display = "block";

    renderPaymentKarkhanaTabs();
    renderPaymentTable();
}

/**
 * 2. Karkhana Tabs & Cash Transfer Button Render
 */
function renderPaymentKarkhanaTabs() {
    var bar = document.getElementById("payment-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";

    var karkhanas = [];
    if (typeof getKarkhanasSafe === "function") {
        karkhanas = getKarkhanasSafe();
    } else {
        karkhanas = safeArray(getStore("karkhana_list"));
        if (!karkhanas.length) karkhanas = [{ id: "k_main", name: "Main Godown", isDefault: true }];
    }

    var allActive = (currentPaymentKarkhanaFilter === "all") ? " active" : "";
    var html = "<div style='display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; width:100%; margin-bottom:10px;'>" +
               "<div style='display:flex; gap:6px; flex-wrap:wrap; align-items:center;'>" +
               "<button type='button' class='sheet-tab" + allActive + "' onclick='switchPaymentKarkhanaTab(\"all\")'>👥 Sabhi Godam</button>";

    karkhanas.forEach(function(k) {
        var isMain = (k.id === "k_main" || k.isDefault);
        var icon = isMain ? "🏢 " : "🏭 ";
        var isActive = (String(currentPaymentKarkhanaFilter) === String(k.id)) ? " active" : "";
        html += "<button type='button' class='sheet-tab" + isActive + "' onclick='switchPaymentKarkhanaTab(\"" + k.id + "\")'>" + icon + k.name + "</button>";
    });

    html += "</div>" +
            "<div>" +
            "<button type='button' onclick='openCashTransferModal()' style='background:#059669; color:#ffffff; border:none; padding:7px 14px; border-radius:6px; font-weight:bold; font-size:13px; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.1);'>" +
            "💸 Paisa Bhejo (Cash Transfer)" +
            "</button>" +
            "</div>" +
            "</div>";

    bar.innerHTML = html;
}

function switchPaymentKarkhanaTab(kId) {
    currentPaymentKarkhanaFilter = kId || "all";
    renderPaymentKarkhanaTabs();
    renderPaymentTable();
}

function filterPayment() {
    renderPaymentTable();
}

/**
 * 3. Main Payment Table Render Karna (Live Bakaya Hisab)
 */
function renderPaymentTable() {
    var tbody = document.getElementById("payment-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var karigers = safeArray(getStore("kariger_list")).filter(function(k) { 
        return k && k.name && String(k.name).trim() !== ""; 
    });

    if (currentPaymentKarkhanaFilter !== "all") {
        karigers = karigers.filter(function(k) {
            return String(k.karkhanaId) === String(currentPaymentKarkhanaFilter) || (!k.karkhanaId && currentPaymentKarkhanaFilter === "k_main");
        });
    }

    var searchTxt = (document.getElementById("search-payment-input") ? document.getElementById("search-payment-input").value : "").toLowerCase().trim();

    var grandTotalPaid = 0;
    var grandTotalBaki = 0;
    var rowsData = [];

    karigers.forEach(function(k) {
        var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
        var curSheet = (sheets && sheets.length) ? sheets[sheets.length - 1] : null;

        var mazdoori = 0;
        var diya = 0;
        var baki = 0;

        if (curSheet && typeof calculateSheetTotals === "function") {
            var calc = calculateSheetTotals(curSheet);
            mazdoori = Number(calc.grossBani || 0);
            diya = Number(calc.totPaid || 0);
            baki = Number(calc.remainingAmt || 0);
        }

        grandTotalPaid += diya;
        grandTotalBaki += baki;

        var kName = k.name || "Kariger";
        var sName = k.saree || "-";
        var gName = k.karkhanaName || ((typeof getKarkhanaNameById === "function") ? getKarkhanaNameById(k.karkhanaId) : "Main Godown");

        var rowObj = {
            id: k.id,
            karkhanaId: k.karkhanaId || "k_main",
            karkhana: gName,
            kariger: kName,
            saree: sName,
            mazdoori: mazdoori,
            diya: diya,
            baki: baki
        };

        if (searchTxt) {
            var fullText = (rowObj.karkhana + " " + rowObj.kariger + " " + rowObj.saree + " " + rowObj.mazdoori + " " + rowObj.diya + " " + rowObj.baki).toLowerCase();
            if (fullText.indexOf(searchTxt) !== -1) {
                rowsData.push(rowObj);
            }
        } else {
            rowsData.push(rowObj);
        }
    });

    // Upar Summary Box Update
    var paidDisplay = document.getElementById("total-paid-display");
    var bakiDisplay = document.getElementById("total-baki-display");
    if (paidDisplay) paidDisplay.textContent = "₹ " + grandTotalPaid.toFixed(2);
    if (bakiDisplay) bakiDisplay.textContent = "₹ " + grandTotalBaki.toFixed(2);

    if (!rowsData.length) {
        tbody.innerHTML = "<tr><td colspan='9' style='text-align:center; padding:20px; color:#888;'>Koi Kariger Record nahi mila.</td></tr>";
        return;
    }

    rowsData.forEach(function(r, idx) {
        var safeKid = encodeURIComponent(r.karkhanaId);
        var safeKName = encodeURIComponent(r.kariger);

        tbody.innerHTML += "<tr>" +
            "<td>" + (idx + 1) + "</td>" +
            "<td><span class='badge-blue'>🏭 " + r.karkhana + "</span></td>" +
            "<td><strong>" + r.kariger + "</strong></td>" +
            "<td>" + r.saree + "</td>" +
            "<td style='font-weight:700;'>₹ " + r.mazdoori.toFixed(2) + "</td>" +
            "<td style='color:#059669; font-weight:800;'>₹ " + r.diya.toFixed(2) + "</td>" +
            "<td style='color:#dc2626; font-weight:800; font-size:15px; background:#fef2f2;'>₹ " + r.baki.toFixed(2) + "</td>" +
            "<td style='text-align:center;'><button type='button' class='sheet-btn' style='background:#10b981; font-weight:bold; padding:4px 10px; border-radius:4px; border:none; color:white; cursor:pointer;' onclick='openQuickPayModal(\"" + r.id + "\", \"" + safeKName + "\", \"" + safeKid + "\", " + r.baki + ")'>⚡ Pay</button></td>" +
            "<td style='text-align:center;'><button type='button' class='sheet-btn' style='background:#7c3aed; font-weight:bold; padding:4px 10px; border-radius:4px; border:none; color:white; cursor:pointer;' onclick='openPaymentPassbook(\"" + r.id + "\", \"" + r.kariger + "\")'>📖 Passbook</button></td>" +
        "</tr>";
    });
}

/**
 * 🌟 4. QUICK PAY MODAL (Kariger Sheet + Daybook Auto Record)
 */
function openQuickPayModal(karigerId, safeKName, safeKid, bakiAmt) {
    var karigerName = decodeURIComponent(safeKName);
    var karkhanaId = decodeURIComponent(safeKid);

    var existingModal = document.getElementById("quick-pay-modal");
    if (existingModal) existingModal.remove();

    var today = (typeof getTodayDate === "function") ? getTodayDate() : new Date().toISOString().split("T")[0];
    var godamName = (typeof getKarkhanaNameById === "function") ? getKarkhanaNameById(karkhanaId) : "Godown";

    var modalHtml = 
        "<div id='quick-pay-modal' style='position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:99999; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box;'>" +
            "<div style='background:#ffffff; width:100%; max-width:440px; border-radius:12px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.2); overflow:hidden;'>" +
                
                "<div style='background:#10b981; color:#ffffff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;'>" +
                    "<h3 style='margin:0; font-size:16px;'>⚡ Mazdoori Payment (Kariger Pay)</h3>" +
                    "<button type='button' onclick='closeQuickPayModal()' style='background:transparent; border:none; color:#ffffff; font-size:22px; cursor:pointer;'>&times;</button>" +
                "</div>" +

                "<div style='padding:16px;'>" +
                    "<div style='background:#ecfdf5; border:1px solid #d1fae5; border-radius:8px; padding:10px; margin-bottom:12px; font-size:13px;'>" +
                        "<div><strong>Kariger:</strong> " + karigerName + "</div>" +
                        "<div><strong>Karkhana:</strong> " + godamName + "</div>" +
                        "<div style='color:#dc2626; font-weight:bold; font-size:14px; margin-top:4px;'>Kul Baki Mazdoori: ₹ " + Number(bakiAmt || 0).toFixed(2) + "</div>" +
                    "</div>" +

                    "<div style='display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;'>" +
                        "<div>" +
                            "<label style='font-size:12px; font-weight:700; color:#374151;'>Dene Wala Rupya (₹):</label><br>" +
                            "<input type='number' id='quick-pay-amount' placeholder='₹ 0.00' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:15px; font-weight:bold; box-sizing:border-box;'>" +
                        "</div>" +
                        "<div>" +
                            "<label style='font-size:12px; font-weight:700; color:#374151;'>Tarikh:</label><br>" +
                            "<input type='date' id='quick-pay-date' value='" + today + "' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;'>" +
                        "</div>" +
                    "</div>" +

                    "<div style='margin-bottom:12px;'>" +
                        "<label style='font-size:12px; font-weight:700; color:#374151;'>Note / Vivran (Optional):</label><br>" +
                        "<input type='text' id='quick-pay-note' placeholder='e.g. Weekly Hafta payment' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;'>" +
                    "</div>" +

                    "<div style='margin-bottom:14px; background:#f8fafc; border:1px solid #e2e8f0; padding:8px; border-radius:6px; font-size:12px; color:#475569;'>" +
                        "<label style='display:flex; align-items:center; gap:6px; cursor:pointer;'>" +
                            "<input type='checkbox' id='quick-pay-sync-daybook' checked style='cursor:pointer;'> " +
                            "<strong>Karkhana Daybook me bhi kharch darj karein</strong>" +
                        "</label>" +
                    "</div>" +

                    "<button type='button' onclick='submitQuickPayForm(\"" + karigerId + "\", \"" + safeKName + "\", \"" + safeKid + "\")' style='background:#10b981; color:#ffffff; border:none; width:100%; padding:10px; border-radius:6px; font-weight:bold; font-size:14px; cursor:pointer;'>" +
                        "✅ Payment Jama Karein" +
                    "</button>" +

                "</div>" +
            "</div>" +
        "</div>";

    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function closeQuickPayModal() {
    var modal = document.getElementById("quick-pay-modal");
    if (modal) modal.remove();
}

function submitQuickPayForm(karigerId, safeKName, safeKid) {
    var karigerName = decodeURIComponent(safeKName);
    var karkhanaId = decodeURIComponent(safeKid);

    var amt = parseFloat(document.getElementById("quick-pay-amount").value) || 0;
    var payDate = document.getElementById("quick-pay-date").value || (typeof getTodayDate === "function" ? getTodayDate() : "");
    var note = (document.getElementById("quick-pay-note").value || "").trim();
    var syncDaybook = document.getElementById("quick-pay-sync-daybook") ? document.getElementById("quick-pay-sync-daybook").checked : true;

    if (amt <= 0) return alert("Kripya sahi raqam (Amount ₹) daalein!");

    // 1. Kariger Tani Sheet Update
    var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(karigerId) : [];
    if (!sheets || !sheets.length) {
        sheets = [{
            id: "tani_1", title: "Tani 1",
            pichlaBana: 0, pichlaZari: 0, pichlaBani: 0,
            banaWaste: 0, zariWaste: 0,
            rateBana: 0.311, rateZari: 0.110, rateBani: 240,
            note: "", rows: []
        }];
    }

    var activeSheet = sheets[sheets.length - 1];
    activeSheet.rows = safeArray(activeSheet.rows);

    var payRef = "pay_" + Date.now();
    var newRow = {
        id: payRef,
        date: payDate,
        cone: 0,
        lessTp: 0,
        netBana: 0,
        zariQty: 0,
        topi: 0,
        netZari: 0,
        saree: 0,
        lott: 0,
        paid: amt,
        retBana: 0,
        retZari: 0,
        banaItem: activeSheet.banaItem || "",
        zariItem: activeSheet.zariItem || "",
        note: note || "Mazdoori Payment"
    };

    activeSheet.rows.push(newRow);

    if (typeof saveKarigerSheets === "function") {
        saveKarigerSheets(karigerId, sheets);
    }

    // 2. ⭐ AUTO DAYBOOK EXPENSE RECORD
    if (syncDaybook) {
        var daybook = safeArray(getStore("daybook_entries"));
        daybook.push({
            id: "db_pay_" + Date.now(),
            date: payDate,
            type: "payment", // Kharch (Payment Out)
            category: "Kariger Mazdoori",
            party: karigerName,
            karigerId: karigerId,
            karkhanaId: karkhanaId,
            amount: amt,
            paymentMode: "Cash",
            remarks: "Kariger Mazdoori: " + karigerName + (note ? " (" + note + ")" : ""),
            refId: payRef,
            timestamp: Date.now()
        });
        setStore("daybook_entries", daybook);
    }

    closeQuickPayModal();
    renderPaymentTable();
    alert("✅ ₹ " + amt.toFixed(2) + " safalta-poorvak " + karigerName + " ki sheet aur Daybook me darj ho gaya!");
}

/**
 * 🌟 5. INTER-KARKHANA CASH / FUND TRANSFER MODAL
 * Main Office/Godam se Karkhane ki mazdoori ke liye cash bhejna
 */
function openCashTransferModal() {
    var existingModal = document.getElementById("cash-transfer-modal");
    if (existingModal) existingModal.remove();

    var karkhanas = (typeof getKarkhanasSafe === "function") ? getKarkhanasSafe() : safeArray(getStore("karkhana_list"));
    var today = (typeof getTodayDate === "function") ? getTodayDate() : new Date().toISOString().split("T")[0];

    var fromOptions = "";
    var toOptions = "";

    karkhanas.forEach(function(k) {
        var isMain = (k.id === "k_main" || k.isDefault);
        fromOptions += "<option value='" + k.id + "' " + (isMain ? "selected" : "") + ">" + (isMain ? "🏢 " : "🏭 ") + k.name + "</option>";
        toOptions += "<option value='" + k.id + "' " + (!isMain ? "selected" : "") + ">" + (isMain ? "🏢 " : "🏭 ") + k.name + "</option>";
    });

    var modalHtml = 
        "<div id='cash-transfer-modal' style='position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:99999; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box;'>" +
            "<div style='background:#ffffff; width:100%; max-width:460px; border-radius:12px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.2); overflow:hidden;'>" +
                
                "<div style='background:#059669; color:#ffffff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;'>" +
                    "<h3 style='margin:0; font-size:16px;'>💸 Inter-Karkhana Cash / Fund Transfer</h3>" +
                    "<button type='button' onclick='closeCashTransferModal()' style='background:transparent; border:none; color:#ffffff; font-size:22px; cursor:pointer;'>&times;</button>" +
                "</div>" +

                "<div style='padding:16px;'>" +
                    "<div style='display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;'>" +
                        "<div>" +
                            "<label style='font-size:12px; font-weight:700; color:#374151;'>Kahan Se (Source):</label><br>" +
                            "<select id='cash-from-godam' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px;'>" +
                                fromOptions +
                            "</select>" +
                        "</div>" +
                        "<div>" +
                            "<label style='font-size:12px; font-weight:700; color:#374151;'>Kisko (Destination):</label><br>" +
                            "<select id='cash-to-godam' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px;'>" +
                                toOptions +
                            "</select>" +
                        "</div>" +
                    "</div>" +

                    "<div style='display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;'>" +
                        "<div>" +
                            "<label style='font-size:12px; font-weight:700; color:#374151;'>Kitna Rupya (₹):</label><br>" +
                            "<input type='number' id='cash-transfer-amt' placeholder='₹ 0.00' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:15px; font-weight:bold; box-sizing:border-box;'>" +
                        "</div>" +
                        "<div>" +
                            "<label style='font-size:12px; font-weight:700; color:#374151;'>Tarikh:</label><br>" +
                            "<input type='date' id='cash-transfer-date' value='" + today + "' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;'>" +
                        "</div>" +
                    "</div>" +

                    "<div style='margin-bottom:14px;'>" +
                        "<label style='font-size:12px; font-weight:700; color:#374151;'>Note / Vivran:</label><br>" +
                        "<input type='text' id='cash-transfer-note' placeholder='e.g. Weekly Mazdoori ke liye bheja' style='width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;'>" +
                    "</div>" +

                    "<div style='font-size:11px; color:#4b5563; background:#ecfdf5; padding:8px; border-radius:6px; margin-bottom:12px; border:1px solid #a7f3d0;'>" +
                        "ℹ️ Bhejne wale godam ki Daybook se minus hoga aur Paane wale karkhane ki Daybook me aamad jama hogi." +
                    "</div>" +

                    "<button type='button' onclick='submitCashTransferForm()' style='background:#059669; color:#ffffff; border:none; width:100%; padding:10px; border-radius:6px; font-weight:bold; font-size:14px; cursor:pointer;'>" +
                        "🚀 Cash Transfer Confirm Karein" +
                    "</button>" +

                "</div>" +
            "</div>" +
        "</div>";

    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function closeCashTransferModal() {
    var modal = document.getElementById("cash-transfer-modal");
    if (modal) modal.remove();
}

function submitCashTransferForm() {
    var fromKid = document.getElementById("cash-from-godam").value;
    var toKid = document.getElementById("cash-to-godam").value;
    var amt = parseFloat(document.getElementById("cash-transfer-amt").value) || 0;
    var date = document.getElementById("cash-transfer-date").value || (typeof getTodayDate === "function" ? getTodayDate() : "");
    var note = (document.getElementById("cash-transfer-note").value || "").trim();

    if (String(fromKid) === String(toKid)) {
        return alert("Bhejne wala aur Paane wala godam alag-alag hona chahiye!");
    }
    if (amt <= 0) return alert("Kripya sahi amount (₹) bharein!");

    var fromName = (typeof getKarkhanaNameById === "function") ? getKarkhanaNameById(fromKid) : fromKid;
    var toName = (typeof getKarkhanaNameById === "function") ? getKarkhanaNameById(toKid) : toKid;
    var trRef = "tr_cash_" + Date.now();

    // 1. Daybook Double Entry (Source se Out, Destination me In)
    var daybook = safeArray(getStore("daybook_entries"));

    // Source Outward
    daybook.push({
        id: "db_out_" + Date.now(),
        date: date,
        type: "payment", // Outward
        category: "Karkhana Fund Transfer",
        party: toName,
        karkhanaId: fromKid,
        amount: amt,
        paymentMode: "Cash",
        remarks: "Cash Bheja ➔ " + toName + (note ? " (" + note + ")" : ""),
        refId: trRef,
        timestamp: Date.now()
    });

    // Destination Inward
    daybook.push({
        id: "db_in_" + Date.now(),
        date: date,
        type: "receipt", // Inward
        category: "Karkhana Fund Transfer",
        party: fromName,
        karkhanaId: toKid,
        amount: amt,
        paymentMode: "Cash",
        remarks: "Cash Aamad ⬅ " + fromName + (note ? " (" + note + ")" : ""),
        refId: trRef,
        timestamp: Date.now() + 1
    });

    setStore("daybook_entries", daybook);

    // 2. Global Transfer Log
    if (typeof recordTransferEntry === "function") {
        recordTransferEntry({
            id: trRef,
            date: date,
            fromKarkhanaId: fromKid,
            toKarkhanaId: toKid,
            type: "cash",
            amount: amt,
            remarks: note || ("Fund Transfer: " + fromName + " ➔ " + toName)
        });
    }

    closeCashTransferModal();
    alert("✅ ₹ " + amt.toFixed(2) + " safalta-poorvak transfer ho gaya aur Daybook sync ho gayi!");
}

/**
 * 6. PAYMENT PASSBOOK SYSTEM (Date Range Filter + Search)
 */
function openPaymentPassbook(karigerId, karigerName) {
    activePaymentKarigerId = karigerId;

    var modal = document.getElementById("item-modal");
    if (!modal) return;

    var title = document.getElementById("modal-item-title");
    if (title) title.textContent = "📖 Payment Passbook: " + karigerName;

    var modalBody = modal.querySelector(".modal-body");
    if (modalBody) {
        modalBody.innerHTML = 
            "<div style='background:#f8fafc; border:1px solid #cbd5e1; padding:12px; border-radius:10px; margin-bottom:12px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between;'>" +
                "<div style='display:flex; gap:8px; align-items:center; flex-wrap:wrap;'>" +
                    "<div><label style='font-size:12px; font-weight:700;'>From Date:</label><br><input type='date' id='pay-pass-from-date' onchange='renderPaymentPassbookRows()'></div>" +
                    "<div><label style='font-size:12px; font-weight:700;'>To Date:</label><br><input type='date' id='pay-pass-to-date' onchange='renderPaymentPassbookRows()'></div>" +
                    "<div style='align-self:flex-end;'><button type='button' class='quick-btn btn-out' onclick='resetPaymentPassbookFilters()'>Reset</button></div>" +
                "</div>" +
                "<div style='flex:1; min-width:200px;'>" +
                    "<label style='font-size:12px; font-weight:700;'>🔍 Search Passbook:</label><br>" +
                    "<input type='text' id='pay-pass-search-input' class='search-box' placeholder='Search Date, Sheet, Amount...' oninput='renderPaymentPassbookRows()'>" +
                "</div>" +
            "</div>" +
            "<div class='table-responsive'>" +
                "<table>" +
                    "<thead>" +
                        "<tr style='background:#7c3aed; color:white; font-size:12px;'>" +
                            "<th>TARIKH</th><th>KHATA / TANI</th><th>SAREE (PCS)</th><th>PAID (DIYEN ₹)</th><th>NOTE</th>" +
                        "</tr>" +
                    "</thead>" +
                    "<tbody id='payment-passbook-table-body'></tbody>" +
                "</table>" +
            "</div>";
    }

    modal.style.display = "flex";
    renderPaymentPassbookRows();
}

function resetPaymentPassbookFilters() {
    var fDate = document.getElementById("pay-pass-from-date");
    var tDate = document.getElementById("pay-pass-to-date");
    var sInp = document.getElementById("pay-pass-search-input");
    if (fDate) fDate.value = "";
    if (tDate) tDate.value = "";
    if (sInp) sInp.value = "";
    renderPaymentPassbookRows();
}

function renderPaymentPassbookRows() {
    var tbody = document.getElementById("payment-passbook-table-body");
    if (!tbody || !activePaymentKarigerId) return;
    tbody.innerHTML = "";

    var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(activePaymentKarigerId) : [];
    var allRows = [];

    sheets.forEach(function(sh) {
        safeArray(sh.rows).forEach(function(r) {
            if (Number(r.paid || 0) > 0 || Number(r.saree || 0) > 0) {
                allRows.push({
                    date: r.date || "-",
                    sheetTitle: sh.title || "Tani Khata",
                    saree: Number(r.saree || 0),
                    paid: Number(r.paid || 0),
                    note: r.note || (r.paid > 0 ? "Payment Diya" : "Saree Jama")
                });
            }
        });
    });

    var fDate = document.getElementById("pay-pass-from-date") ? document.getElementById("pay-pass-from-date").value : "";
    var tDate = document.getElementById("pay-pass-to-date") ? document.getElementById("pay-pass-to-date").value : "";
    var sTxt = (document.getElementById("pay-pass-search-input") ? document.getElementById("pay-pass-search-input").value : "").toLowerCase().trim();

    if (fDate) allRows = allRows.filter(function(x) { return x.date >= fDate; });
    if (tDate) allRows = allRows.filter(function(x) { return x.date <= tDate; });

    if (sTxt) {
        allRows = allRows.filter(function(x) {
            var full = (x.date + " " + x.sheetTitle + " " + x.saree + " " + x.paid + " " + x.note).toLowerCase();
            return full.indexOf(sTxt) !== -1;
        });
    }

    if (!allRows.length) {
        tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:15px; color:#888;'>Koi payment entry nahi mili.</td></tr>";
        return;
    }

    allRows.forEach(function(row) {
        tbody.innerHTML += "<tr>" +
            "<td>" + row.date + "</td>" +
            "<td><strong>" + row.sheetTitle + "</strong></td>" +
            "<td>" + (row.saree ? (row.saree + " Pcs") : "-") + "</td>" +
            "<td style='color:#059669; font-weight:800; font-size:14px;'>" + (row.paid ? ("₹ " + row.paid) : "-") + "</td>" +
            "<td style='color:#64748b; font-size:12px;'>" + row.note + "</td>" +
        "</tr>";
    });
}
