/* ========================================================
   SIMPLICITY ERP - PAYMENTS & BAKAYA MODULE
   File: payment/payment.js • Developed by Farhan Jawed
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
 * 2. Karkhana Tabs Render
 */
function renderPaymentKarkhanaTabs() {
    var bar = document.getElementById("payment-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";

    var karkhanas = safeArray(getStore("karkhana_list"));
    if (!karkhanas.length) karkhanas = [{ id: "k_main", name: "Main Godown", isDefault: true }];

    var allActive = (currentPaymentKarkhanaFilter === "all") ? " active" : "";
    bar.innerHTML += "<button class='sheet-tab" + allActive + "' onclick='switchPaymentKarkhanaTab(\"all\")'>👥 Sabhi Godam</button>";

    karkhanas.forEach(function(k) {
        var isActive = (String(currentPaymentKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button class='sheet-tab" + isActive + "' onclick='switchPaymentKarkhanaTab(\"" + k.id + "\")'>🏭 " + k.name + "</button>";
    });
}

function switchPaymentKarkhanaTab(kId) {
    currentPaymentKarkhanaFilter = kId;
    renderPaymentTable();
}

function filterPayment() {
    renderPaymentTable();
}

/**
 * 3. Main Payment Table Render Karna
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

    var searchTxt = (document.getElementById("search-payment-input")?.value || "").toLowerCase().trim();

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
        var gName = k.karkhanaName || "Main Godown";

        var rowObj = {
            id: k.id,
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
        tbody.innerHTML += "<tr>" +
            "<td>" + (idx + 1) + "</td>" +
            "<td><span class='badge-blue'>🏭 " + r.karkhana + "</span></td>" +
            "<td><strong>" + r.kariger + "</strong></td>" +
            "<td>" + r.saree + "</td>" +
            "<td style='font-weight:700;'>₹ " + r.mazdoori.toFixed(2) + "</td>" +
            "<td style='color:#059669; font-weight:800;'>₹ " + r.diya.toFixed(2) + "</td>" +
            "<td style='color:#dc2626; font-weight:800; font-size:15px; background:#fef2f2;'>₹ " + r.baki.toFixed(2) + "</td>" +
            "<td style='text-align:center;'><button class='sheet-btn' style='background:#10b981; font-weight:bold; padding:4px 10px;' onclick='quickPayKariger(\"" + r.id + "\", \"" + r.kariger + "\")'>⚡ Pay</button></td>" +
            "<td style='text-align:center;'><button class='sheet-btn' style='background:#7c3aed; font-weight:bold; padding:4px 10px;' onclick='openPaymentPassbook(\"" + r.id + "\", \"" + r.kariger + "\")'>📖 Passbook</button></td>" +
        "</tr>";
    });
}

/**
 * 4. QUICK PAY FEATURE (Direct Tani Sheet me jama hoga)
 */
function quickPayKariger(karigerId, karigerName) {
    var amtStr = prompt("⚡ Quick Pay: " + karigerName + "\n\nKitna Rupya Pay karna chahte hain (₹):");
    if (!amtStr) return;
    var amt = parseFloat(amtStr);
    if (isNaN(amt) || amt <= 0) return alert("Sahi amount daalein!");

    var payDate = prompt("Tarikh (YYYY-MM-DD):", getTodayDate()) || getTodayDate();

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

    var activeSheet = sheets[sheets.length - 1]; // LATEST SHEET
    activeSheet.rows = safeArray(activeSheet.rows);

    var newRow = {
        id: "row_pay_" + Date.now(),
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
        note: "Quick Pay Entry"
    };

    activeSheet.rows.push(newRow);

    if (typeof saveKarigerSheets === "function") {
        saveKarigerSheets(karigerId, sheets);
    }

    renderPaymentTable();
    alert("✅ ₹ " + amt + " safalta-purvak " + karigerName + " ki sheet me jud gaya!");
}

/**
 * 5. PAYMENT PASSBOOK SYSTEM (Date Range Filter + Search)
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
                    "<div style='align-self:flex-end;'><button class='quick-btn btn-out' onclick='resetPaymentPassbookFilters()'>Reset</button></div>" +
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

    var fDate = document.getElementById("pay-pass-from-date")?.value;
    var tDate = document.getElementById("pay-pass-to-date")?.value;
    var sTxt = (document.getElementById("pay-pass-search-input")?.value || "").toLowerCase().trim();

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
