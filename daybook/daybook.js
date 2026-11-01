/* ========================================================
   SIMPLICITY ERP - ROZANA DAY-BOOK & DASHBOARD ENGINE
   File: daybook/daybook.js • Developed by Farhan Jawed
   (Bana, Zari, Saree, Cash & Sancha Register + Double Badges + App Startup)
======================================================== */

var currentDayBookTab = "bana";
var badgeCalculationTimer = null;

function setElementText(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = (v !== undefined && v !== null) ? v : "";
}

function setElementHTML(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = (html !== undefined && html !== null) ? html : "";
}

function setT(id, v) {
    setElementText(id, v);
}

function setDashboardToday() {
    var dateInput = document.getElementById("dash-day-date");
    if (dateInput) dateInput.value = getTodayDate();
    renderDashboardDayBook();
}

function switchDayBookTab(tab) {
    currentDayBookTab = tab;
    ["bana", "zari", "saree", "payment", "sancha"].forEach(function(t) {
        var el = document.getElementById("btn-tab-" + t);
        if (el) {
            if (t === tab) el.classList.add("active");
            else el.classList.remove("active");
        }
    });
    renderDashboardDayBook();
}

// 1. ROZANA DAY-BOOK RENDER ENGINE
function renderDashboardDayBook() {
    var d = (document.getElementById("dash-day-date") && document.getElementById("dash-day-date").value) || getTodayDate();
    var thead = document.getElementById("dash-daybook-thead");
    var tbody = document.getElementById("dash-daybook-tbody");
    var tfoot = document.getElementById("dash-daybook-tfoot");
    if (!thead || !tbody || !tfoot) return;
    tbody.innerHTML = "";

    var bIn = 0, bOut = 0, zIn = 0, zOut = 0, pOut = 0;
    var bStock = safeArray(getStore("bana_stock"));
    var zStock = safeArray(getStore("zari_stock"));

    bStock.forEach(function(b) { if (b && b.date === d) bIn += (Number(b.aaya) || 0); });
    zStock.forEach(function(z) { if (z && z.date === d) zIn += (Number(z.aaya) || 0); });

    var karList = typeof sanitizeKarigerList === "function" ? sanitizeKarigerList() : safeArray(getStore("kariger_list"));
    karList.forEach(function(k) {
        var sheets = typeof getKarigerSheets === "function" ? getKarigerSheets(k.id) : [];
        sheets.forEach(function(sh) {
            safeArray(sh.rows).forEach(function(r) {
                if (r && r.date === d) {
                    if (Number(r.netBana) > 0) bOut += Number(r.netBana);
                    if (Number(r.retBana) > 0) bIn += Number(r.retBana);
                    if (Number(r.netZari) > 0) zOut += Number(r.netZari);
                    if (Number(r.retZari) > 0) zIn += Number(r.retZari);
                    if (Number(r.paid) > 0) pOut += Number(r.paid);
                }
            });
        });
    });

    // 🔒 SAREE FILTER:
    // 1. Inward (Aayi): Sirf factory kariger bunai saree aayegi (job work se tayyar aayi hui nahi).
    // 2. Outward (Gayi): Factory se Calender ya Cutting par bheji gayi saree out mein dikhegi.
    var rawSareeHistory = safeArray(getStore("saree_history"));
    var sH = [];

    rawSareeHistory.forEach(function(h) {
        if (!h || h.date !== d) return;

        var ref = String(h.refId || "");
        var isJobWork = (ref.indexOf("jwb_") === 0);
        var isDukan = (ref.indexOf("duk_") === 0);
        var inQ = Number(h.aai !== undefined ? h.aai : (h.pcs || 0));
        var outQ = Number(h.gai || 0);

        // Agar Job Work se WAPAS AAYI hui saree hai ya Dukan transfer hai toh Daybook me nahi aayegi
        if (isDukan) return;
        if (isJobWork && inQ > 0) return; // Wapas aayi hui entry Daybook me block

        // Agar Job Work ke liye GAYI (OUT) hui hai:
        if (isJobWork && outQ > 0) {
            var workerLabel = h.note || h.typeLabel || "Job Work";
            // Check Calender ya Cutting
            var isCal = (String(h.typeLabel || "").toLowerCase().indexOf("calender") !== -1);
            var cleanLabel = isCal ? "Calender me hai (" + workerLabel.replace(" ko bheja", "") + ")" 
                                   : "Cutting me hai (" + workerLabel.replace(" ko bheja", "") + ")";

            sH.push({
                sareeName: h.sareeName || "Saree",
                karigerName: h.karigerName || h.kariger || "-",
                aai: 0,
                gai: outQ,
                detail: cleanLabel
            });
            return;
        }

        // Factory Normal Fresh Bunai Saree (IN)
        if (!isJobWork && (h.type === "fresh" || !h.type)) {
            if (inQ > 0 || outQ > 0) {
                sH.push({
                    sareeName: h.sareeName || h.name || "Saree",
                    karigerName: h.karigerName || h.kariger || "-",
                    aai: inQ,
                    gai: outQ,
                    detail: h.typeLabel || h.note || "Fresh Saree Bunai"
                });
            }
        }
    });

    var sIn = 0, sOut = 0;
    sH.forEach(function(h) {
        sIn += Number(h.aai || 0);
        sOut += Number(h.gai || 0);
    });

    // Sancha (Tani & Chukka) Daybook Calculation
    var sanchaHist = safeArray(getStore("sancha_history")).filter(function(h) {
        return h && h.date === d;
    });
    var sanchaIn = 0, sanchaOut = 0;
    sanchaHist.forEach(function(h) {
        sanchaIn += (Number(h.aaya || 0));
        sanchaOut += (Number(h.gaya || 0));
    });

    setElementText("sub-day-bana", "In: +" + bIn.toFixed(1) + " | Out: -" + bOut.toFixed(1));
    setElementText("sub-day-zari", "In: +" + zIn.toFixed(1) + " | Out: -" + zOut.toFixed(1));
    setElementText("sub-day-saree", "In: +" + sIn + " | Out: -" + sOut);
    setElementText("sub-day-payment", "Diya: ₹ " + pOut.toFixed(0));
    setElementText("sub-day-sancha", "In: +" + sanchaIn.toFixed(1) + " | Out: -" + sanchaOut.toFixed(1));

    // TAB 1: BANA
    if (currentDayBookTab === "bana") {
        thead.innerHTML = "<tr style='background:#059669; color:white;'><th>Bana Ka Naam</th><th>Kariger / Vivran</th><th>📥 Aaya (In)</th><th>📤 Gaya (Out)</th></tr>";
        var bRows = [];
        bStock.forEach(function(b) {
            if (b && b.date === d && Number(b.aaya) > 0) {
                bRows.push({ name: b.name, desc: b.isOpening ? "📦 Opening Stock" : "Godam Purchase", inQty: Number(b.aaya), outQty: 0 });
            }
        });
        karList.forEach(function(k) {
            (typeof getKarigerSheets === "function" ? getKarigerSheets(k.id) : []).forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (r && r.date === d) {
                        var itName = r.banaItemName || r.banaItem || "Bana";
                        if (Number(r.netBana) > 0) bRows.push({ name: itName, desc: k.name + " (" + sh.title + ")", inQty: 0, outQty: Number(r.netBana) });
                        if (Number(r.retBana) > 0) bRows.push({ name: itName, desc: k.name + " (" + sh.title + ") Return", inQty: Number(r.retBana), outQty: 0 });
                    }
                });
            });
        });

        if (!bRows.length) {
            tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Is tarikh me Bana ki koi entry nahi hai.</td></tr>";
        } else {
            var bBuf = "";
            bRows.forEach(function(r) {
                bBuf += "<tr><td><strong>" + r.name + "</strong></td><td>" + r.desc + "</td><td style='color:#059669; font-weight:700;'>" + (r.inQty > 0 ? ("+" + r.inQty.toFixed(2)) : "-") + "</td><td style='color:#dc2626; font-weight:700;'>" + (r.outQty > 0 ? ("-" + r.outQty.toFixed(2)) : "-") + "</td></tr>";
            });
            tbody.innerHTML = bBuf;
        }
        tfoot.innerHTML = "<tr><td colspan='2'><strong>Total Rozana Bana:</strong></td><td><strong style='color:#059669;'>+" + bIn.toFixed(2) + "</strong></td><td><strong style='color:#dc2626;'>-" + bOut.toFixed(2) + "</strong></td></tr>";

    // TAB 2: ZARI
    } else if (currentDayBookTab === "zari") {
        thead.innerHTML = "<tr style='background:#ea580c; color:white;'><th>Zari Ka Naam</th><th>Kariger / Vivran</th><th>📥 Aayi (In)</th><th>📤 Gayi (Out)</th></tr>";
        var zRows = [];
        zStock.forEach(function(z) {
            if (z && z.date === d && Number(z.aaya) > 0) {
                zRows.push({ name: z.name, desc: z.isOpening ? "📦 Opening Stock" : "Godam Purchase", inQty: Number(z.aaya), outQty: 0 });
            }
        });
        karList.forEach(function(k) {
            (typeof getKarigerSheets === "function" ? getKarigerSheets(k.id) : []).forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (r && r.date === d) {
                        var itName = r.zariItemName || r.zariItem || "Zari";
                        if (Number(r.netZari) > 0) zRows.push({ name: itName, desc: k.name + " (" + sh.title + ")", inQty: 0, outQty: Number(r.netZari) });
                        if (Number(r.retZari) > 0) zRows.push({ name: itName, desc: k.name + " (" + sh.title + ") Return", inQty: Number(r.retZari), outQty: 0 });
                    }
                });
            });
        });

        if (!zRows.length) {
            tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Is tarikh me Zari ki koi entry nahi hai.</td></tr>";
        } else {
            var zBuf = "";
            zRows.forEach(function(r) {
                zBuf += "<tr><td><strong>" + r.name + "</strong></td><td>" + r.desc + "</td><td style='color:#059669; font-weight:700;'>" + (r.inQty > 0 ? ("+" + r.inQty.toFixed(2)) : "-") + "</td><td style='color:#dc2626; font-weight:700;'>" + (r.outQty > 0 ? ("-" + r.outQty.toFixed(2)) : "-") + "</td></tr>";
            });
            tbody.innerHTML = zBuf;
        }
        tfoot.innerHTML = "<tr><td colspan='2'><strong>Total Rozana Zari:</strong></td><td><strong style='color:#059669;'>+" + zIn.toFixed(2) + "</strong></td><td><strong style='color:#dc2626;'>-" + zOut.toFixed(2) + "</strong></td></tr>";

    // TAB 3: SAREE (FACTORY BUNAI + JOB WORK OUT)
    } else if (currentDayBookTab === "saree") {
        thead.innerHTML = "<tr style='background:#2563eb; color:white;'><th>Saree Ka Naam</th><th>Kariger / Vivran</th><th>📥 Aayi (In)</th><th>📤 Gayi (Out)</th><th>Detail</th></tr>";
        if (!sH.length) {
            tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:15px; color:#888;'>Is tarikh me Saree ki koi entry nahi hai.</td></tr>";
        } else {
            var sBuf = "";
            sH.forEach(function(h) {
                var inQ = Number(h.aai || 0);
                var outQ = Number(h.gai || 0);
                sBuf += "<tr>" +
                    "<td><strong>" + h.sareeName + "</strong></td>" +
                    "<td>👤 " + h.karigerName + "</td>" +
                    "<td style='color:#059669; font-weight:700;'>" + (inQ > 0 ? ("+" + inQ + " Pcs") : "-") + "</td>" +
                    "<td style='color:#dc2626; font-weight:700;'>" + (outQ > 0 ? ("-" + outQ + " Pcs") : "-") + "</td>" +
                    "<td>" + (outQ > 0 ? ("<span style='color:#dc2626; font-weight:bold;'>" + h.detail + "</span>") : h.detail) + "</td>" +
                "</tr>";
            });
            tbody.innerHTML = sBuf;
        }
        tfoot.innerHTML = "<tr><td colspan='2'><strong>Kul Saree:</strong></td><td><strong style='color:#059669;'>+" + sIn + " Pcs</strong></td><td><strong style='color:#dc2626;'>-" + sOut + " Pcs</strong></td><td>-</td></tr>";

    // TAB 4: PAYMENT
    } else if (currentDayBookTab === "payment") {
        thead.innerHTML = "<tr style='background:#7c3aed; color:white;'><th>Kariger</th><th>Tani / Vivran</th><th>📤 Bhugtan Diya</th></tr>";
        var pRows = [];
        karList.forEach(function(k) {
            (typeof getKarigerSheets === "function" ? getKarigerSheets(k.id) : []).forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (r && r.date === d && Number(r.paid) > 0) {
                        pRows.push({ kariger: k.name, tani: sh.title, amount: Number(r.paid) });
                    }
                });
            });
        });

        if (!pRows.length) {
            tbody.innerHTML = "<tr><td colspan='3' style='text-align:center; padding:15px; color:#888;'>Is tarikh me koi payment nahi di gayi.</td></tr>";
        } else {
            var pBuf = "";
            pRows.forEach(function(dp) {
                pBuf += "<tr><td><strong>" + dp.kariger + "</strong></td><td>" + dp.tani + "</td><td style='color:#dc2626; font-weight:700;'>- ₹ " + dp.amount.toFixed(2) + "</td></tr>";
            });
            tbody.innerHTML = pBuf;
        }
        tfoot.innerHTML = "<tr><td colspan='2'><strong>Total Rozana Bhugtan:</strong></td><td><strong style='color:#dc2626;'>- ₹ " + pOut.toFixed(2) + "</strong></td></tr>";

    // TAB 5: SANCHA (TANI & CHUKKA REGISTER)
    } else if (currentDayBookTab === "sancha") {
        thead.innerHTML = "<tr style='background:#0284c7; color:white;'><th>Item (Category)</th><th>Kariger / Vivran</th><th>📥 Aaya (In)</th><th>📤 Gaya (Out)</th></tr>";
        if (!sanchaHist.length) {
            tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Is tarikh me Sancha (Tani / Chukka) ki koi entry nahi hai.</td></tr>";
        } else {
            var scBuf = "";
            sanchaHist.forEach(function(h) {
                var catBadge = (h.category === "chukka") ? "<span class='badge-blue' style='background:#ede9fe; color:#6d28d9; font-size:10px;'>⚙️ Chukka</span>" : "<span class='badge-blue' style='font-size:10px;'>🧵 Tani</span>";
                var inQ = Number(h.aaya || h.qty || 0);
                var outQ = Number(h.gaya || 0);
                scBuf += "<tr>" +
                    "<td><strong>" + (h.name || "Sancha") + "</strong> " + catBadge + "</td>" +
                    "<td>" + (h.kariger ? ("👤 " + h.kariger) : (h.type || "Godam Purchase")) + "</td>" +
                    "<td style='color:#059669; font-weight:700;'>" + (inQ > 0 ? ("+" + inQ.toFixed(2) + " Kg") : "-") + "</td>" +
                    "<td style='color:#dc2626; font-weight:700;'>" + (outQ > 0 ? ("-" + outQ.toFixed(2) + " Kg") : "-") + "</td>" +
                "</tr>";
            });
            tbody.innerHTML = scBuf;
        }
        tfoot.innerHTML = "<tr><td colspan='2'><strong>Total Rozana Sancha:</strong></td><td><strong style='color:#059669;'>+" + sanchaIn.toFixed(2) + " Kg</strong></td><td><strong style='color:#dc2626;'>-" + sanchaOut.toFixed(2) + " Kg</strong></td></tr>";
    }
}

// 2. DASHBOARD TOTAL BADGES ENGINE
function updateDashboardBadgeTotals() {
    var karList = typeof sanitizeKarigerList === "function" ? sanitizeKarigerList() : safeArray(getStore("kariger_list"));
    setElementText("btn-total-kariger", "Total: " + karList.length);
    setElementText("btn-total-info", "Total: " + safeArray(getStore("info_ledger")).length);

    var ts = 0;
    var sH = safeArray(getStore("saree_history")).filter(function(x) { return (x.type || "fresh") === "fresh"; });
    if (sH.length) {
        sH.forEach(function(s) { 
            var inQ = Number(s.aai !== undefined ? s.aai : (s.pcs || 0));
            var outQ = Number(s.gai || 0);
            ts += (inQ - outQ); 
        });
    }
    setElementText("btn-total-saree", "Stock: " + Math.max(0, ts) + " Pcs");

    if (badgeCalculationTimer) clearTimeout(badgeCalculationTimer);

    badgeCalculationTimer = setTimeout(function() {
        // 1. Bana Bacha
        var tb = 0, seenBana = [];
        safeArray(getStore("bana_stock")).forEach(function(b) {
            if (b && b.name) {
                var nLow = b.name.trim().toLowerCase();
                if (seenBana.indexOf(nLow) === -1) {
                    seenBana.push(nLow);
                    try { tb += Number(getBanaItemStats(b.name, "k_main").bacha || 0); } catch(e) { tb += Number(b.bacha || 0); }
                }
            }
        });
        setElementText("btn-total-bana", "Bacha: " + tb.toFixed(2) + " Kg");

        // 2. Zari Bacha
        var tz = 0, seenZari = [];
        safeArray(getStore("zari_stock")).forEach(function(z) {
            if (z && z.name) {
                var nLow = z.name.trim().toLowerCase();
                if (seenZari.indexOf(nLow) === -1) {
                    seenZari.push(nLow);
                    try { tz += Number(getZariItemStats(z.name, "k_main").bacha || 0); } catch(e) { tz += Number(z.bacha || 0); }
                }
            }
        });
        setElementText("btn-total-zari", "Bacha: " + tz.toFixed(2) + " Kg");

        // 3. Payment Badge
        var totalBakiAll = 0;
        var totalDiyaAll = 0;
        karList.forEach(function(k) {
            if (k && k.id) {
                var sheets = typeof getKarigerSheets === "function" ? getKarigerSheets(k.id) : [];
                var curSheet = (sheets && sheets.length) ? sheets[sheets.length - 1] : null;
                if (curSheet && typeof calculateSheetTotals === "function") {
                    var c = calculateSheetTotals(curSheet);
                    totalDiyaAll += Number(c.totPaid || 0);
                    totalBakiAll += Number(c.remainingAmt || 0);
                } else if (typeof getKarigerFinanceSummary === "function") {
                    var fin = getKarigerFinanceSummary(k.id);
                    totalBakiAll += Number(fin.currentBakaya || 0);
                }
            }
        });
        setElementHTML("btn-total-payment", "<span style='color:#059669; font-weight:bold;'>Diya: ₹ " + totalDiyaAll.toFixed(0) + "</span> • <span style='color:#dc2626; font-weight:bold;'>Baki: ₹ " + totalBakiAll.toFixed(0) + "</span>");

        // 4. Sancha Badge
        var totTani = 0, totChukka = 0;
        safeArray(getStore("sancha_items")).forEach(function(s) {
            if (!s) return;
            var cat = (s.category || "tani").toLowerCase();
            var bacha = Number(s.bacha !== undefined ? s.bacha : (s.aaya || 0));
            if (cat === "chukka") {
                totChukka += bacha;
            } else {
                totTani += bacha;
            }
        });
        setElementHTML("btn-total-sancha", "<span style='color:#0284c7; font-weight:bold;'>🧵 Tani: " + totTani.toFixed(1) + " Kg</span> • <span style='color:#7c3aed; font-weight:bold;'>⚙️ Chukka: " + totChukka.toFixed(1) + " Kg</span>");
    }, 60);
}

// 3. NAVIGATION HELPERS
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

function triggerActiveSectionRefresh() {
    var cur = getCurrentActiveSection();
    if (cur === "dashboard-view") {
        renderDashboardDayBook();
        updateDashboardBadgeTotals();
    } else if (cur === "kariger-section" && typeof renderKarigerTable === "function") {
        renderKarigerTable();
    } else if (cur === "bana-section" && typeof renderBanaTable === "function") {
        renderBanaTable();
    } else if (cur === "zari-section" && typeof renderZariTable === "function") {
        renderZariTable();
    } else if (cur === "saree-section" && typeof renderSareeTable === "function") {
        renderSareeTable();
    } else if (cur === "payment-section" && typeof renderPaymentTable === "function") {
        renderPaymentTable();
    }
}

function getCurrentActiveSection() {
    var sections = [
        "dashboard-view", "admin-section", "info-section", 
        "kariger-section", "kariger-sheet-section", "bana-section", 
        "zari-section", "saree-section", "payment-section", "sancha-section",
        "jobwork-section"
    ];
    for (var i = 0; i < sections.length; i++) {
        var el = document.getElementById(sections[i]);
        if (el && el.style.display === "block") return sections[i];
    }
    return "dashboard-view";
}

// 4. APP INIT & STARTUP ENGINE
function initApp() {
    var dEl = document.getElementById("dash-day-date");
    if (dEl) dEl.value = getTodayDate();
    if (typeof populateSessionDropdown === "function") populateSessionDropdown();
    renderDashboardDayBook();
    updateDashboardBadgeTotals();
    if (typeof syncUsersWithFirebase === "function") syncUsersWithFirebase();
}

// 5. LOGIN & STARTUP LISTENERS
window.onload = function() {
    if (typeof clearMemoryCache === "function") clearMemoryCache();
    currentUserId = null;
    currentUserRole = null;
    activeKarigerId = null;
    activeSheetId = null;

    if (typeof setDisplay === "function") {
        setDisplay("login-wrapper", "flex");
        setDisplay("desktop-screen", "none");
    }
    if (typeof showLogin === "function") showLogin();

    var idInp = document.getElementById("login-id");
    var passInp = document.getElementById("login-pass");
    if (idInp) idInp.value = "";
    if (passInp) passInp.value = "";

    var errMsg = document.getElementById("login-error");
    if (errMsg) errMsg.style.display = "none";

    if (idInp) {
        idInp.addEventListener("keypress", function(e) {
            if (e.key === "Enter" && typeof handleLogin === "function") handleLogin();
        });
    }
    if (passInp) {
        passInp.addEventListener("keypress", function(e) {
            if (e.key === "Enter" && typeof handleLogin === "function") handleLogin();
        });
    }

    if (typeof syncUsersWithFirebase === "function") syncUsersWithFirebase();
};
