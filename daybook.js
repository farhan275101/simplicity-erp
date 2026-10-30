/* ========================================================
   SIMPLICITY ERP - PAYMENT MODULE, DAYBOOK & APP STARTUP
   File 5 of 5 • Developed by Farhan Jawed
   (Enterprise Fast Badge Engine, Paginated Payments & Zero-Freeze Startup)
======================================================== */

var currentPaymentKarkhanaFilter = "all"; // "all" ya specific karkhanaId
var currentPaymentPage = 1;
var paymentPageSize = 50;

// ================= 1. KARIGER FINANCE COMPUTATION ENGINE =================

function getKarigerFinanceSummary(karId) {
    var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(karId) : [];
    var totalMazdoori = 0;
    var totalPaidEver = 0;
    var currentBakaya = 0;

    if (!sheets || !sheets.length) {
        return { totalMazdoori: 0, totalPaid: 0, currentBakaya: 0 };
    }

    sheets.forEach(function(sh, sIdx) {
        if (!sh) return;
        var c = (typeof calculateSheetTotals === "function") ? calculateSheetTotals(sh) : { grossBani: 0, totPaid: 0, remainingAmt: 0 };
        totalMazdoori += (Number(c.grossBani) || 0);
        if (sIdx === 0) {
            totalMazdoori += (Number(sh.pichlaBani) || Number(sh.closingBani) || 0);
        }
        totalPaidEver += (Number(c.totPaid) || 0);
    });

    var latestSheet = sheets[sheets.length - 1];
    if (latestSheet) {
        var latestCalc = (typeof calculateSheetTotals === "function") ? calculateSheetTotals(latestSheet) : { remainingAmt: 0 };
        currentBakaya = (Number(latestCalc.remainingAmt) || Number(latestCalc.remBani) || 0);
    }

    return {
        totalMazdoori: totalMazdoori,
        totalPaid: totalPaidEver,
        currentBakaya: currentBakaya
    };
}

// ================= 2. PAYMENT MODULE (PAGINATED & SUPERFAST) =================

function openPaymentModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("payment-section", "block");
    currentPaymentPage = 1;
    renderPaymentKarkhanaTabs();
    renderPaymentTable();
}

function renderPaymentKarkhanaTabs() {
    var bar = document.getElementById("payment-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";

    var kList = (typeof getKarkhanasSafe === "function") ? getKarkhanasSafe() : (typeof getKarkhanas === "function" ? getKarkhanas() : []);
    var allKarigers = (typeof sanitizeKarigerList === "function") ? sanitizeKarigerList() : [];

    var allActive = (currentPaymentKarkhanaFilter === "all") ? " active" : "";
    bar.innerHTML += "<button class='sheet-tab" + allActive + "' onclick='switchPaymentKarkhanaTab(\"all\")'>👥 Sabhi Karkhane (" + allKarigers.length + ")</button>";

    kList.forEach(function(k) {
        var count = allKarigers.filter(function(w) { 
            return String(w.karkhanaId) === String(k.id) || (!w.karkhanaId && k.isDefault); 
        }).length;

        var isActive = (String(currentPaymentKarkhanaFilter) === String(k.id)) ? " active" : "";
        bar.innerHTML += "<button class='sheet-tab" + isActive + "' onclick='switchPaymentKarkhanaTab(\"" + k.id + "\")'>🏭 " + k.name + " (" + count + ")</button>";
    });
}

function switchPaymentKarkhanaTab(kId) {
    currentPaymentKarkhanaFilter = kId;
    currentPaymentPage = 1;
    renderPaymentKarkhanaTabs();
    renderPaymentTable();
}

function renderPaymentTable(flist) {
    var allKarigers = flist || ((typeof sanitizeKarigerList === "function") ? sanitizeKarigerList() : []);
    var tbody = document.getElementById("payment-table-body");
    if (!tbody) return;

    var list = allKarigers;
    if (currentPaymentKarkhanaFilter !== "all") {
        list = list.filter(function(k) {
            return String(k.karkhanaId) === String(currentPaymentKarkhanaFilter) || (!k.karkhanaId && currentPaymentKarkhanaFilter === "k_main");
        });
    }

    var txt = (document.getElementById("search-payment-input") && document.getElementById("search-payment-input").value || "").toLowerCase().trim();
    if (txt) {
        list = list.filter(function(k) {
            return (String(k.name || "") + " " + String(k.saree || "") + " " + String(k.karkhanaName || "")).toLowerCase().indexOf(txt) !== -1;
        });
    }

    // 🔴 FIX: Calculate overall totals for ALL karigers in this view (not just page slice)
    var overallPaid = 0;
    var overallBaki = 0;
    list.forEach(function(k) {
        if (!k) return;
        var fin = getKarigerFinanceSummary(k.id);
        overallPaid += fin.totalPaid;
        overallBaki += fin.currentBakaya;
    });

    var dispP = document.getElementById("total-paid-display");
    var dispB = document.getElementById("total-baki-display");
    if (dispP) dispP.textContent = "₹ " + overallPaid.toFixed(2);
    if (dispB) dispB.textContent = "₹ " + overallBaki.toFixed(2);

    var totalItems = list.length;
    var totalPages = Math.ceil(totalItems / paymentPageSize) || 1;
    if (currentPaymentPage > totalPages) currentPaymentPage = totalPages;
    if (currentPaymentPage < 1) currentPaymentPage = 1;

    var pagContainer = document.getElementById("payment-pagination-bar");
    if (!pagContainer) {
        var tableWrap = tbody.closest(".table-responsive");
        if (tableWrap) {
            pagContainer = document.createElement("div");
            pagContainer.id = "payment-pagination-bar";
            pagContainer.style.cssText = "display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-top:10px; padding:10px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; font-size:13px; font-weight:700;";
            tableWrap.parentNode.insertBefore(pagContainer, tableWrap.nextSibling);
        }
    }

    if (!totalItems) {
        tbody.innerHTML = "<tr><td colspan='9' style='text-align:center; padding:25px; color:#888;'>Is Godam/Karkhane me koi Kariger hisab nahi mila.</td></tr>";
        if (pagContainer) pagContainer.style.display = "none";
        return;
    }

    if (pagContainer) {
        pagContainer.style.display = "flex";
        var startIdx = (currentPaymentPage - 1) * paymentPageSize + 1;
        var endIdx = Math.min(currentPaymentPage * paymentPageSize, totalItems);

        var prevDisabled = (currentPaymentPage <= 1) ? "disabled style='opacity:0.5; cursor:not-allowed; padding:6px 14px;'" : "style='padding:6px 14px; cursor:pointer;'";
        var nextDisabled = (currentPaymentPage >= totalPages) ? "disabled style='opacity:0.5; cursor:not-allowed; padding:6px 14px;'" : "style='padding:6px 14px; cursor:pointer;'";

        pagContainer.innerHTML = 
            "<div style='color:#7c3aed;'>📊 Dikh rahe hain: " + startIdx + " - " + endIdx + " (Kul: " + totalItems + " Kariger)</div>" +
            "<div style='display:flex; align-items:center; gap:8px;'>" +
                "<button class='quick-btn btn-out' " + prevDisabled + " onclick='prevPaymentPage()'>◀️ Pichla Page</button>" +
                "<span style='background:#ffffff; border:1px solid #cbd5e1; padding:5px 12px; border-radius:6px; color:#1e3a8a;'>Page " + currentPaymentPage + " / " + totalPages + "</span>" +
                "<button class='quick-btn btn-in' " + nextDisabled + " onclick='nextPaymentPage()'>Agla Page ▶️</button>" +
            "</div>";
    }

    var pageList = list.slice((currentPaymentPage - 1) * paymentPageSize, currentPaymentPage * paymentPageSize);
    var htmlBuffer = "";

    pageList.forEach(function(k, idx) {
        if (!k) return;
        var fin = getKarigerFinanceSummary(k.id);

        var bakiBadgeClass = fin.currentBakaya > 0 ? "badge-red" : "badge-green";
        var kNameBadge = "<span class='badge-blue' style='font-size:11px; font-weight:700;'>🏭 " + (k.karkhanaName || "Main Godown") + "</span>";
        var actualIdx = (currentPaymentPage - 1) * paymentPageSize + (idx + 1);

        htmlBuffer += "<tr>" +
            "<td>" + actualIdx + "</td>" +
            "<td>" + kNameBadge + "</td>" +
            "<td><strong>" + k.name + "</strong></td>" +
            "<td>" + (k.saree || "-") + "</td>" +
            "<td style='font-weight:700;'>₹ " + fin.totalMazdoori.toFixed(2) + "</td>" +
            "<td style='color:#059669; font-weight:700;'>₹ " + fin.totalPaid.toFixed(2) + "</td>" +
            "<td><span class='" + bakiBadgeClass + "' style='font-size:12px; font-weight:800;'>₹ " + fin.currentBakaya.toFixed(2) + "</span></td>" +
            "<td style='text-align:center;'><button class='quick-btn btn-in' onclick='quickPayToKariger(\"" + k.id + "\")'>💵 Pay Karein</button></td>" +
            "<td style='text-align:center;'><button class='detail-btn' onclick='viewKarigerPaymentPassbook(\"" + k.id + "\")'>📖 Passbook</button></td>" +
        "</tr>";
    });

    tbody.innerHTML = htmlBuffer;
}

function nextPaymentPage() {
    currentPaymentPage++;
    renderPaymentTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevPaymentPage() {
    if (currentPaymentPage > 1) {
        currentPaymentPage--;
        renderPaymentTable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function filterPayment() {
    currentPaymentPage = 1;
    renderPaymentTable();
}

function quickPayToKariger(karId) {
    var karList = (typeof sanitizeKarigerList === "function") ? sanitizeKarigerList() : [];
    var kar = karList.find(function(x) { return x && String(x.id) === String(karId); });
    if (!kar) return;

    var amt = parseFloat(prompt("Kariger " + kar.name + " (" + (kar.karkhanaName || "Main Godown") + ") ko kitna paisa diya (₹):"));
    if (!amt || isNaN(amt) || amt <= 0) return;

    var payDate = prompt("Tarikh (YYYY-MM-DD):", getTodayDate()) || getTodayDate();
    var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(karId) : [];

    if (!sheets || !sheets.length) {
        sheets = [{ id: "tani_1", title: "Tani 1", pichlaBana: 0, pichlaZari: 0, pichlaBani: 0, rateBana: 0.311, rateZari: 0.110, rateBani: 240, note: "", rows: [] }];
    }

    var targetSheet = sheets[sheets.length - 1];
    targetSheet.rows = safeArray(targetSheet.rows);

    var newRow = {
        id: "row_" + Date.now(),
        date: payDate,
        saree: 0,
        sareeName: kar.saree || "-",
        sancha: "",
        taniName: targetSheet.title,
        taniWazan: 0,
        netBana: 0,
        netZari: 0,
        paid: amt,
        lott: 0,
        retBana: 0,
        retZari: 0,
        banaItemName: "",
        zariItemName: "",
        karkhanaId: kar.karkhanaId || "k_main",
        karkhanaName: kar.karkhanaName || "Main Godown"
    };

    targetSheet.rows.push(newRow);
    if (typeof saveKarigerSheets === "function") saveKarigerSheets(karId, sheets);

    renderPaymentTable();
    renderDashboardDayBook();
    updateDashboardBadgeTotals();
    alert("✅ ₹ " + amt + " ka bhugtan jud gaya aur " + kar.name + " ka bakaya live update ho gaya!");
}

function viewKarigerPaymentPassbook(karId) {
    var karList = (typeof sanitizeKarigerList === "function") ? sanitizeKarigerList() : [];
    var kar = karList.find(function(x) { return x && String(x.id) === String(karId); });
    if (!kar) return;

    document.getElementById("modal-item-title").textContent = "📖 Payment Passbook: " + kar.name + " (" + (kar.karkhanaName || "Main Godown") + ")";
    var tbody = document.getElementById("modal-history-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(karId) : [];
    var paymentsFound = 0;

    sheets.forEach(function(sh) {
        if (sh && sh.rows) {
            var rows = safeArray(sh.rows);
            rows.forEach(function(r) {
                if (r && Number(r.paid) > 0) {
                    paymentsFound++;
                    tbody.innerHTML += "<tr>" +
                        "<td>" + formatDateDisplay(r.date) + "</td>" +
                        "<td>" + sh.title + (r.saree > 0 ? " (" + r.saree + " Saree ke sath)" : " (Direct Pay)") + "</td>" +
                        "<td style='color:#059669; font-weight:700;'>₹ " + Number(r.paid).toFixed(2) + "</td>" +
                        "<td style='text-align:center;'><button class='delete-btn' onclick='deletePaymentFromSheet(\"" + karId + "\", \"" + sh.id + "\", \"" + r.id + "\")'>🗑️ Delete</button></td>" +
                    "</tr>";
                }
            });
        }
    });

    if (!paymentsFound) {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Is Kariger ko abhi koi payment nahi di gayi hai.</td></tr>";
    }
    setDisplay("item-modal", "flex");
}

function deletePaymentFromSheet(karId, sheetId, rowId) {
    if (!confirm("Kya aap is payment entry ko delete karna chahte hain?\nIs se kariger ka bakaya wapas badh jayega.")) return;

    var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(karId) : [];
    var targetSheet = sheets.find(function(s) { return s && String(s.id) === String(sheetId); });
    if (!targetSheet || !targetSheet.rows) return;

    targetSheet.rows = safeArray(targetSheet.rows);
    var rIdx = targetSheet.rows.findIndex(function(r) { return r && String(r.id) === String(rowId); });

    if (rIdx !== -1) {
        var r = targetSheet.rows[rIdx];
        if ((Number(r.saree) || 0) === 0 && (Number(r.netBana) || 0) === 0 && (Number(r.netZari) || 0) === 0) {
            targetSheet.rows.splice(rIdx, 1);
        } else {
            r.paid = 0;
        }
        if (typeof saveKarigerSheets === "function") saveKarigerSheets(karId, sheets);

        viewKarigerPaymentPassbook(karId);
        renderPaymentTable();
        renderDashboardDayBook();
        updateDashboardBadgeTotals();
        if (activeKarigerId === karId && typeof loadCurrentSheetData === "function") {
            loadCurrentSheetData();
        }
        alert("✅ Payment entry delete ho gayi aur hisab turant theek ho gaya!");
    }
}

// ================= 3. ROZANA DAY-BOOK MODULE =================

function setDashboardToday() {
    var dateInput = document.getElementById("dash-day-date");
    if (dateInput) dateInput.value = getTodayDate();
    renderDashboardDayBook();
}

function switchDayBookTab(tab) {
    currentDayBookTab = tab;
    ["bana", "zari", "saree", "payment"].forEach(function(t) {
        var el = document.getElementById("btn-tab-" + t);
        if (el) {
            if (t === tab) el.classList.add("active");
            else el.classList.remove("active");
        }
    });
    renderDashboardDayBook();
}

function renderDashboardDayBook() {
    var d = (document.getElementById("dash-day-date") && document.getElementById("dash-day-date").value) || getTodayDate();
    var thead = document.getElementById("dash-daybook-thead");
    var tbody = document.getElementById("dash-daybook-tbody");
    var tfoot = document.getElementById("dash-daybook-tfoot");

    if (!thead || !tbody || !tfoot) return;
    tbody.innerHTML = "";

    var setT = function(id, v) {
        var el = document.getElementById(id);
        if (el) el.textContent = v;
    };

    var bIn = 0, bOut = 0, zIn = 0, zOut = 0, pOut = 0;
    var bStock = safeArray(getStore("bana_stock"));
    var zStock = safeArray(getStore("zari_stock"));

    bStock.forEach(function(b) { if (b && b.date === d) bIn += (Number(b.aaya) || 0); });
    zStock.forEach(function(z) { if (z && z.date === d) zIn += (Number(z.aaya) || 0); });

    var karList = (typeof sanitizeKarigerList === "function") ? sanitizeKarigerList() : [];
    karList.forEach(function(k) {
        var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
        if (!sheets.length) return;
        sheets.forEach(function(sh) {
            if (sh && sh.rows && sh.rows.length) {
                var rows = safeArray(sh.rows);
                rows.forEach(function(r) {
                    if (r && r.date === d) {
                        if (Number(r.netBana) > 0) bOut += Number(r.netBana);
                        if (Number(r.retBana) > 0) bIn += Number(r.retBana);
                        if (Number(r.netZari) > 0) zOut += Number(r.netZari);
                        if (Number(r.retZari) > 0) zIn += Number(r.retZari);
                        if (Number(r.paid) > 0) pOut += Number(r.paid);
                    }
                });
            }
        });
    });

    var sH = safeArray(getStore("saree_history")).filter(function(h) { return h && h.date === d; });
    var sIn = 0, sOut = 0;
    sH.forEach(function(h) {
        var typeStr = String(h.type || "");
        var isTransfer = (typeStr.indexOf("Transfer") !== -1) || (typeStr.indexOf("Branch Transfer") !== -1);
        var isJobWork = (typeStr.indexOf("Cutting") !== -1) || (typeStr.indexOf("Calender") !== -1) || (typeStr.indexOf("Finished Sale") !== -1);
        
        if (isTransfer || isJobWork) return;

        if (typeStr.indexOf("In") !== -1) {
            sIn += (Number(h.pcs) || 0);
        } else {
            sOut += (Number(h.pcs) || 0);
        }
    });

    setT("sub-day-bana", "In: +" + bIn.toFixed(1) + " | Out: -" + bOut.toFixed(1));
    setT("sub-day-zari", "In: +" + zIn.toFixed(1) + " | Out: -" + zOut.toFixed(1));
    setT("sub-day-saree", "In: +" + sIn + " | Out: -" + sOut);
    setT("sub-day-payment", "Diya: ₹ " + pOut.toFixed(0));

    if (currentDayBookTab === "bana") {
        thead.innerHTML = "<tr style='background:#059669;'><th style='width:30%;'>Bana Ka Naam</th><th style='width:30%;'>Kariger / Vivran</th><th style='background:#047857; color:#a7f3d0; width:20%;'>📥 Aaya (In)</th><th style='background:#b91c1c; color:#fecaca; width:20%;'>📤 Gaya (Out)</th></tr>";
        var bDayRows = [];

        bStock.forEach(function(b) {
            if (b && b.date === d && Number(b.aaya) > 0) {
                var desc = (b.isOpening || (b.note && b.note.indexOf("Opening") !== -1)) ? "📦 Opening Stock" : "Godam Stock Purchase";
                bDayRows.push({ name: b.name, desc: desc, inQty: Number(b.aaya), outQty: 0 });
            }
        });

        karList.forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            if (!sheets.length) return;
            sheets.forEach(function(sh) {
                if (sh && sh.rows) {
                    var rows = safeArray(sh.rows);
                    rows.forEach(function(r) {
                        if (r && r.date === d) {
                            var itName = r.banaItemName || (bStock.length > 0 ? bStock[0].name : "Bana");
                            if (Number(r.netBana) > 0) bDayRows.push({ name: itName, desc: k.name + " (" + sh.title + ")", inQty: 0, outQty: Number(r.netBana) });
                            if (Number(r.retBana) > 0) bDayRows.push({ name: itName, desc: k.name + " (" + sh.title + ") Return", inQty: Number(r.retBana), outQty: 0 });
                        }
                    });
                }
            });
        });

        if (!bDayRows.length) {
            tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Is tarikh me Bana ki koi entry nahi hai.</td></tr>";
        } else {
            var bBuf = "";
            bDayRows.forEach(function(r) {
                bBuf += "<tr>" +
                    "<td><strong>" + r.name + "</strong></td>" +
                    "<td>" + r.desc + "</td>" +
                    "<td>" + (r.inQty > 0 ? ("<span style='color:#059669; font-weight:700;'>+" + r.inQty.toFixed(2) + "</span>") : "-") + "</td>" +
                    "<td>" + (r.outQty > 0 ? ("<span style='color:#dc2626; font-weight:700;'>-" + r.outQty.toFixed(2) + "</span>") : "-") + "</td>" +
                "</tr>";
            });
            tbody.innerHTML = bBuf;
        }
        tfoot.innerHTML = "<tr><td colspan='2'><strong>Total Rozana Bana:</strong></td><td><strong style='color:#059669;'>+" + bIn.toFixed(2) + "</strong></td><td><strong style='color:#dc2626;'>-" + bOut.toFixed(2) + "</strong></td></tr>";

    } else if (currentDayBookTab === "zari") {
        thead.innerHTML = "<tr style='background:#ea580c;'><th style='width:30%;'>Zari Ka Naam</th><th style='width:30%;'>Kariger / Vivran</th><th style='background:#047857; color:#a7f3d0; width:20%;'>📥 Aayi (In)</th><th style='background:#b91c1c; color:#fecaca; width:20%;'>📤 Gayi (Out)</th></tr>";
        var zDayRows = [];

        zStock.forEach(function(z) {
            if (z && z.date === d && Number(z.aaya) > 0) {
                var desc = (z.isOpening || (z.note && z.note.indexOf("Opening") !== -1)) ? "📦 Opening Stock" : "Godam Stock Purchase";
                zDayRows.push({ name: z.name, desc: desc, inQty: Number(z.aaya), outQty: 0 });
            }
        });

        karList.forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            if (!sheets.length) return;
            sheets.forEach(function(sh) {
                if (sh && sh.rows) {
                    var rows = safeArray(sh.rows);
                    rows.forEach(function(r) {
                        if (r && r.date === d) {
                            var itName = r.zariItemName || (zStock.length > 0 ? zStock[0].name : "Zari");
                            if (Number(r.netZari) > 0) zDayRows.push({ name: itName, desc: k.name + " (" + sh.title + ")", inQty: 0, outQty: Number(r.netZari) });
                            if (Number(r.retZari) > 0) zDayRows.push({ name: itName, desc: k.name + " (" + sh.title + ") Return", inQty: Number(r.retZari), outQty: 0 });
                        }
                    });
                }
            });
        });

        if (!zDayRows.length) {
            tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Is tarikh me Zari ki koi entry nahi hai.</td></tr>";
        } else {
            var zBuf = "";
            zDayRows.forEach(function(r) {
                zBuf += "<tr>" +
                    "<td><strong>" + r.name + "</strong></td>" +
                    "<td>" + r.desc + "</td>" +
                    "<td>" + (r.inQty > 0 ? ("<span style='color:#059669; font-weight:700;'>+" + r.inQty.toFixed(2) + "</span>") : "-") + "</td>" +
                    "<td>" + (r.outQty > 0 ? ("<span style='color:#dc2626; font-weight:700;'>-" + r.outQty.toFixed(2) + "</span>") : "-") + "</td>" +
                "</tr>";
            });
            tbody.innerHTML = zBuf;
        }
        tfoot.innerHTML = "<tr><td colspan='2'><strong>Total Rozana Zari:</strong></td><td><strong style='color:#059669;'>+" + zIn.toFixed(2) + "</strong></td><td><strong style='color:#dc2626;'>-" + zOut.toFixed(2) + "</strong></td></tr>";

    } else if (currentDayBookTab === "saree") {
        thead.innerHTML = "<tr style='background:#2563eb;'><th style='width:25%;'>Saree Ka Naam</th><th style='width:20%;'>Kariger / Godam</th><th style='background:#047857; color:#a7f3d0; width:20%;'>📥 Aayi (In)</th><th style='background:#b91c1c; color:#fecaca; width:20%;'>📤 Gayi (Out)</th><th>Vivran</th></tr>";

        var filteredSH = sH.filter(function(h) {
            var typeStr = String(h.type || "");
            var isTransfer = (typeStr.indexOf("Transfer") !== -1) || (typeStr.indexOf("Branch Transfer") !== -1);
            var isJobWork = (typeStr.indexOf("Cutting") !== -1) || (typeStr.indexOf("Calender") !== -1) || (typeStr.indexOf("Finished Sale") !== -1);
            return !isTransfer && !isJobWork;
        });

        if (!filteredSH.length) {
            tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:15px; color:#888;'>Is tarikh me Factory Saree ki koi entry nahi hai.</td></tr>";
        } else {
            var sBuf = "";
            filteredSH.forEach(function(h) {
                var typeStr = String(h.type || "");
                var isA = typeStr.indexOf("In") !== -1;
                var inCol = isA ? ("<strong style='color:#059669;'>+" + h.pcs + " Pcs</strong>") : "-";
                var outCol = !isA ? ("<strong style='color:#dc2626;'>-" + h.pcs + " Pcs</strong>") : "-";

                sBuf += "<tr>" +
                    "<td><strong>" + h.name + "</strong></td>" +
                    "<td>" + (h.kariger || "-") + "</td>" +
                    "<td>" + inCol + "</td>" +
                    "<td>" + outCol + "</td>" +
                    "<td>" + (h.note || "-") + "</td>" +
                "</tr>";
            });
            tbody.innerHTML = sBuf;
        }
        tfoot.innerHTML = "<tr><td colspan='2'><strong>Kul Fresh Saree:</strong></td><td><strong style='color:#059669;'>+" + sIn + " Pcs</strong></td><td><strong style='color:#dc2626;'>-" + sOut + " Pcs</strong></td><td>-</td></tr>";

    } else if (currentDayBookTab === "payment") {
        thead.innerHTML = "<tr style='background:#7c3aed;'><th style='width:35%;'>Kariger</th><th style='width:35%;'>Tani / Vivran</th><th style='background:#b91c1c; color:#fecaca; width:30%;'>📤 Payment Diya (Out)</th></tr>";
        var dayPayments = [];

        karList.forEach(function(k) {
            var sheets = (typeof getKarigerSheets === "function") ? getKarigerSheets(k.id) : [];
            if (!sheets.length) return;
            sheets.forEach(function(sh) {
                if (sh && sh.rows) {
                    var rows = safeArray(sh.rows);
                    rows.forEach(function(r) {
                        if (r && r.date === d && Number(r.paid) > 0) {
                            dayPayments.push({ kariger: k.name, tani: sh.title, amount: Number(r.paid) });
                        }
                    });
                }
            });
        });

        if (!dayPayments.length) {
            tbody.innerHTML = "<tr><td colspan='3' style='text-align:center; padding:15px; color:#888;'>Is tarikh me koi payment nahi di gayi.</td></tr>";
        } else {
            var pBuf = "";
            dayPayments.forEach(function(dp) {
                pBuf += "<tr>" +
                    "<td><strong>" + dp.kariger + "</strong></td>" +
                    "<td>" + dp.tani + "</td>" +
                    "<td><strong style='color:#dc2626;'>- ₹ " + dp.amount.toFixed(2) + "</strong></td>" +
                "</tr>";
            });
            tbody.innerHTML = pBuf;
        }
        tfoot.innerHTML = "<tr><td colspan='2'><strong>Total Rozana Bhugtan:</strong></td><td><strong style='color:#dc2626;'>- ₹ " + pOut.toFixed(2) + "</strong></td></tr>";
    }
}

// ================= 4. DASHBOARD BADGES (ACCURATE ZERO-MULTIPLY ENGINE) =================

var badgeCalculationTimer = null;

function updateDashboardBadgeTotals() {
    var setT = function(id, v) {
        var el = document.getElementById(id);
        if (el) el.textContent = v;
    };

    var karList = (typeof sanitizeKarigerList === "function") ? sanitizeKarigerList() : [];
    setT("btn-total-kariger", "Total: " + karList.length);
    setT("btn-total-info", "Total: " + safeArray(getStore("info_ledger")).length);

    var ts = 0;
    safeArray(getStore("saree_stock")).forEach(function(s) { if (s) ts += (Number(s.pcs) || 0); });
    setT("btn-total-saree", "Stock: " + ts + " Pcs");

    if (typeof getJobWorkers === "function") {
        setT("btn-total-jobwork", "Workers: " + getJobWorkers().length);
    }
    if (typeof updateJobWorkHubBadges === "function") {
        updateJobWorkHubBadges();
    }

    if (badgeCalculationTimer) clearTimeout(badgeCalculationTimer);

    badgeCalculationTimer = setTimeout(function() {
        // 🔴 FIX: Unique item names only (Deduplication prevents multiplying stock)
        var tb = 0;
        var seenBana = [];
        safeArray(getStore("bana_stock")).forEach(function(b) {
            if (b && b.name) {
                var nLow = b.name.trim().toLowerCase();
                if (seenBana.indexOf(nLow) === -1) {
                    seenBana.push(nLow);
                    if (typeof getBanaItemStats === "function") {
                        try {
                            var st = getBanaItemStats(b.name, "k_main");
                            tb += Number(st.bacha || 0);
                        } catch(e) {}
                    }
                }
            }
        });
        setT("btn-total-bana", "Bacha: " + tb.toFixed(2) + " Kg");

        // 🔴 FIX: Unique Zari deduplication
        var tz = 0;
        var seenZari = [];
        safeArray(getStore("zari_stock")).forEach(function(z) {
            if (z && z.name) {
                var nLow = z.name.trim().toLowerCase();
                if (seenZari.indexOf(nLow) === -1) {
                    seenZari.push(nLow);
                    if (typeof getZariItemStats === "function") {
                        try {
                            var st = getZariItemStats(z.name, "k_main");
                            tz += Number(st.bacha || 0);
                        } catch(e) {}
                    }
                }
            }
        });
        setT("btn-total-zari", "Bacha: " + tz.toFixed(2) + " Kg");

        // 🔴 FIX: Unique Sancha deduplication
        var tsc = 0;
        var seenSancha = [];
        if (typeof getSanchaItems === "function") {
            getSanchaItems().forEach(function(s) {
                if (s && s.name) {
                    var nLow = s.name.trim().toLowerCase();
                    if (seenSancha.indexOf(nLow) === -1) {
                        seenSancha.push(nLow);
                        if (typeof getSanchaItemStats === "function") {
                            try {
                                var st = getSanchaItemStats(s.id, s.name, "k_main");
                                tsc += Number(st.bacha || 0);
                            } catch(e) {}
                        } else {
                            tsc += (Number(s.totalQty) || 0);
                        }
                    }
                }
            });
        }
        setT("btn-total-sancha", "Bacha: " + tsc.toFixed(2));

        // Total Bakaya
        var totalBakiAll = 0;
        karList.forEach(function(k) {
            if (k && k.id) {
                var fin = getKarigerFinanceSummary(k.id);
                totalBakiAll += fin.currentBakaya;
            }
        });
        setT("btn-total-payment", "Baki: ₹ " + totalBakiAll.toFixed(0));

    }, 60);
}

function hideAllSections() {
    [
        "dashboard-view", "admin-section", "info-section",
        "kariger-section", "kariger-sheet-section", "bana-section",
        "zari-section", "saree-section", "payment-section", "sancha-section",
        "jobwork-section"
    ].forEach(function(id) {
        setDisplay(id, "none");
    });
}

function backToDashboard() {
    hideAllSections();
    setDisplay("dashboard-view", "block");
    if (typeof populateSessionDropdown === "function") populateSessionDropdown();
    renderDashboardDayBook();
    updateDashboardBadgeTotals();
}

// ================= 5. APP INITIALIZATION & STARTUP =================

function initApp() {
    var dEl = document.getElementById("dash-day-date");
    if (dEl) dEl.value = getTodayDate();
    if (typeof populateSessionDropdown === "function") populateSessionDropdown();
    renderDashboardDayBook();
    updateDashboardBadgeTotals();
    syncUsersWithFirebase();
}

// STRICT CLEAN STARTUP
window.onload = function() {
    if (typeof clearMemoryCache === "function") clearMemoryCache();
    currentUserId = null;
    currentUserRole = null;
    activeKarigerId = null;
    activeSheetId = null;

    setDisplay("login-wrapper", "flex");
    setDisplay("desktop-screen", "none");
    showLogin();

    var idInp = document.getElementById("login-id");
    var passInp = document.getElementById("login-pass");
    if (idInp) idInp.value = "";
    if (passInp) passInp.value = "";

    var errMsg = document.getElementById("login-error");
    if (errMsg) errMsg.style.display = "none";

    if (idInp) {
        idInp.addEventListener("keypress", function(e) {
            if (e.key === "Enter") handleLogin();
        });
    }
    if (passInp) {
        passInp.addEventListener("keypress", function(e) {
            if (e.key === "Enter") handleLogin();
        });
    }

    syncUsersWithFirebase();
};
