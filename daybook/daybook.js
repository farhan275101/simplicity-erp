/* ========================================================
   SIMPLICITY ERP - ROZANA DAY-BOOK & DASHBOARD ENGINE
   File: daybook/daybook.js • Developed by Farhan Jawed
   (Multi-Godam Daybook, Cash Transfer, Auto-Login & Badges)
======================================================== */

var currentDayBookTab = "bana";
var currentDashboardKarkhanaFilter = "all";
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
    if (dateInput) dateInput.value = (typeof getTodayDate === "function") ? getTodayDate() : new Date().toISOString().split("T")[0];
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

/**
 * 0. Dashboard Karkhana Filter Tabs Generator
 */
function renderDashboardKarkhanaTabs() {
    var bar = document.getElementById("dash-karkhana-tabs-bar");
    if (!bar) return;
    bar.innerHTML = "";

    var karkhanas = [];
    if (typeof getKarkhanasSafe === "function") {
        karkhanas = getKarkhanasSafe();
    } else {
        karkhanas = safeArray(getStore("karkhana_list"));
        if (!karkhanas.length) karkhanas = [{ id: "k_main", name: "Main Godown", isDefault: true }];
    }

    var allActive = (currentDashboardKarkhanaFilter === "all") ? " active" : "";
    var html = "<div style='display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-bottom:12px;'>" +
               "<button type='button' class='sheet-tab" + allActive + "' onclick='switchDashboardKarkhanaTab(\"all\")'>👥 Sabhi Karkhane</button>";

    karkhanas.forEach(function(k) {
        var isMain = (k.id === "k_main" || k.isDefault);
        var icon = isMain ? "🏢 " : "🏭 ";
        var isActive = (String(currentDashboardKarkhanaFilter) === String(k.id)) ? " active" : "";
        html += "<button type='button' class='sheet-tab" + isActive + "' onclick='switchDashboardKarkhanaTab(\"" + k.id + "\")'>" + icon + k.name + "</button>";
    });

    html += "</div>";
    bar.innerHTML = html;
}

function switchDashboardKarkhanaTab(kId) {
    currentDashboardKarkhanaFilter = kId || "all";
    renderDashboardKarkhanaTabs();
    renderDashboardDayBook();
    updateDashboardBadgeTotals();
}

/**
 * 1. ROZANA DAY-BOOK RENDER ENGINE (Multi-Godam Aware)
 */
function renderDashboardDayBook() {
    var d = (document.getElementById("dash-day-date") && document.getElementById("dash-day-date").value) || 
            (typeof getTodayDate === "function" ? getTodayDate() : new Date().toISOString().split("T")[0]);
    var thead = document.getElementById("dash-daybook-thead");
    var tbody = document.getElementById("dash-daybook-tbody");
    var tfoot = document.getElementById("dash-daybook-tfoot");
    if (!thead || !tbody || !tfoot) return;
    tbody.innerHTML = "";

    var targetKid = currentDashboardKarkhanaFilter;
    var isAll = (targetKid === "all");

    var bIn = 0, bOut = 0, zIn = 0, zOut = 0, pIn = 0, pOut = 0;
    var bStock = safeArray(getStore("bana_stock"));
    var zStock = safeArray(getStore("zari_stock"));

    bStock.forEach(function(b) { 
        if (b && b.date === d) {
            var matchK = isAll || (!b.karkhanaId && targetKid === "k_main") || (String(b.karkhanaId) === String(targetKid));
            if (matchK) bIn += (Number(b.aaya) || 0);
        }
    });

    zStock.forEach(function(z) { 
        if (z && z.date === d) {
            var matchK = isAll || (!z.karkhanaId && targetKid === "k_main") || (String(z.karkhanaId) === String(targetKid));
            if (matchK) zIn += (Number(z.aaya) || 0);
        }
    });

    var karList = typeof sanitizeKarigerList === "function" ? sanitizeKarigerList() : safeArray(getStore("kariger_list"));
    karList.forEach(function(k) {
        var matchK = isAll || (!k.karkhanaId && targetKid === "k_main") || (String(k.karkhanaId) === String(targetKid));
        if (!matchK) return;

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

    var transfers = safeArray(getStore("material_transfers")).filter(function(t) { return t && t.date === d; });
    transfers.forEach(function(t) {
        var qty = Number(t.qty || t.quantity || 0);
        var isFrom = (!t.fromKarkhanaId && targetKid === "k_main") || (String(t.fromKarkhanaId) === String(targetKid));
        var isTo = (!t.toKarkhanaId && targetKid === "k_main") || (String(t.toKarkhanaId) === String(targetKid));

        if (t.type === "bana") {
            if (!isAll && isFrom) bOut += qty;
            if (!isAll && isTo) bIn += qty;
        } else if (t.type === "zari") {
            if (!isAll && isFrom) zOut += qty;
            if (!isAll && isTo) zIn += qty;
        }
    });

    var dbEntries = safeArray(getStore("daybook_entries")).filter(function(x) { return x && x.date === d; });
    dbEntries.forEach(function(e) {
        var matchK = isAll || (!e.karkhanaId && targetKid === "k_main") || (String(e.karkhanaId) === String(targetKid));
        if (!matchK) return;

        var amt = Number(e.amount || 0);
        if (e.type === "receipt") {
            pIn += amt;
        } else if (e.type === "payment" && !e.karigerId) {
            pOut += amt;
        }
    });

    var rawSareeHistory = safeArray(getStore("saree_history"));
    var sH = [];

    rawSareeHistory.forEach(function(h) {
        if (!h || h.date !== d) return;

        var matchK = isAll || (!h.karkhanaId && targetKid === "k_main") || (String(h.karkhanaId) === String(targetKid));
        if (!matchK) return;

        var ref = String(h.refId || "");
        var isJobWork = (ref.indexOf("jwb_") === 0);
        var isDukan = (ref.indexOf("duk_") === 0);
        var inQ = Number(h.aai !== undefined ? h.aai : (h.pcs || 0));
        var outQ = Number(h.gai || 0);

        if (isDukan) return;
        if (isJobWork && inQ > 0) return;

        if (isJobWork && outQ > 0) {
            var workerLabel = h.note || h.typeLabel || "Job Work";
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

        if (inQ > 0 || outQ > 0) {
            sH.push({
                sareeName: h.sareeName || h.name || "Saree",
                karigerName: h.karigerName || h.kariger || "-",
                aai: inQ,
                gai: outQ,
                detail: h.typeLabel || h.note || "Fresh Saree Movement"
            });
        }
    });

    var sIn = 0, sOut = 0;
    sH.forEach(function(h) {
        sIn += Number(h.aai || 0);
        sOut += Number(h.gai || 0);
    });

    var sanchaHist = safeArray(getStore("sancha_history")).filter(function(h) {
        if (!h || h.date !== d) return false;
        return isAll || (!h.karkhanaId && targetKid === "k_main") || (String(h.karkhanaId) === String(targetKid));
    });

    var sanchaIn = 0, sanchaOut = 0;
    sanchaHist.forEach(function(h) {
        sanchaIn += (Number(h.aaya || 0));
        sanchaOut += (Number(h.gaya || 0));
    });

    setElementText("sub-day-bana", "In: +" + bIn.toFixed(1) + " | Out: -" + bOut.toFixed(1));
    setElementText("sub-day-zari", "In: +" + zIn.toFixed(1) + " | Out: -" + zOut.toFixed(1));
    setElementText("sub-day-saree", "In: +" + sIn + " | Out: -" + sOut);
    setElementText("sub-day-payment", (pIn > 0 ? ("In: +₹" + pIn.toFixed(0) + " | ") : "") + "Diya: ₹" + pOut.toFixed(0));
    setElementText("sub-day-sancha", "In: +" + sanchaIn.toFixed(1) + " | Out: -" + sanchaOut.toFixed(1));

    // TAB 1: BANA
    if (currentDayBookTab === "bana") {
        thead.innerHTML = "<tr style='background:#059669; color:white;'><th>Bana Ka Naam</th><th>Kariger / Godam Vivran</th><th>📥 Aaya (In)</th><th>📤 Gaya (Out)</th></tr>";
        var bRows = [];
        bStock.forEach(function(b) {
            var matchK = isAll || (!b.karkhanaId && targetKid === "k_main") || (String(b.karkhanaId) === String(targetKid));
            if (b && b.date === d && matchK && Number(b.aaya) > 0) {
                bRows.push({ name: b.name, desc: b.isOpening ? "📦 Opening Stock" : "Godam Purchase", inQty: Number(b.aaya), outQty: 0 });
            }
        });

        karList.forEach(function(k) {
            var matchK = isAll || (!k.karkhanaId && targetKid === "k_main") || (String(k.karkhanaId) === String(targetKid));
            if (!matchK) return;

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

        transfers.filter(function(t) { return t.type === "bana"; }).forEach(function(t) {
            var q = Number(t.qty || t.quantity || 0);
            var fName = (typeof getKarkhanaNameById === "function") ? getKarkhanaNameById(t.fromKarkhanaId) : t.fromKarkhanaId;
            var tName = (typeof getKarkhanaNameById === "function") ? getKarkhanaNameById(t.toKarkhanaId) : t.toKarkhanaId;

            if (isAll) {
                bRows.push({ name: t.itemName, desc: "Transfer: " + fName + " ➔ " + tName, inQty: q, outQty: q });
            } else {
                if (String(t.fromKarkhanaId) === String(targetKid) || (!t.fromKarkhanaId && targetKid === "k_main")) {
                    bRows.push({ name: t.itemName, desc: "Transfer Out ➔ " + tName, inQty: 0, outQty: q });
                }
                if (String(t.toKarkhanaId) === String(targetKid) || (!t.toKarkhanaId && targetKid === "k_main")) {
                    bRows.push({ name: t.itemName, desc: "Transfer In ⬅ " + fName, inQty: q, outQty: 0 });
                }
            }
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
        thead.innerHTML = "<tr style='background:#ea580c; color:white;'><th>Zari Ka Naam</th><th>Kariger / Godam Vivran</th><th>📥 Aayi (In)</th><th>📤 Gayi (Out)</th></tr>";
        var zRows = [];
        zStock.forEach(function(z) {
            var matchK = isAll || (!z.karkhanaId && targetKid === "k_main") || (String(z.karkhanaId) === String(targetKid));
            if (z && z.date === d && matchK && Number(z.aaya) > 0) {
                zRows.push({ name: z.name, desc: z.isOpening ? "📦 Opening Stock" : "Godam Purchase", inQty: Number(z.aaya), outQty: 0 });
            }
        });

        karList.forEach(function(k) {
            var matchK = isAll || (!k.karkhanaId && targetKid === "k_main") || (String(k.karkhanaId) === String(targetKid));
            if (!matchK) return;

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

        transfers.filter(function(t) { return t.type === "zari"; }).forEach(function(t) {
            var q = Number(t.qty || t.quantity || 0);
            var fName = (typeof getKarkhanaNameById === "function") ? getKarkhanaNameById(t.fromKarkhanaId) : t.fromKarkhanaId;
            var tName = (typeof getKarkhanaNameById === "function") ? getKarkhanaNameById(t.toKarkhanaId) : t.toKarkhanaId;

            if (isAll) {
                zRows.push({ name: t.itemName, desc: "Transfer: " + fName + " ➔ " + tName, inQty: q, outQty: q });
            } else {
                if (String(t.fromKarkhanaId) === String(targetKid) || (!t.fromKarkhanaId && targetKid === "k_main")) {
                    zRows.push({ name: t.itemName, desc: "Transfer Out ➔ " + tName, inQty: 0, outQty: q });
                }
                if (String(t.toKarkhanaId) === String(targetKid) || (!t.toKarkhanaId && targetKid === "k_main")) {
                    zRows.push({ name: t.itemName, desc: "Transfer In ⬅ " + fName, inQty: q, outQty: 0 });
                }
            }
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

    // TAB 3: SAREE
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

    // TAB 4: PAYMENT & CASH TRANSFER
    } else if (currentDayBookTab === "payment") {
        thead.innerHTML = "<tr style='background:#7c3aed; color:white;'><th>Party / Kariger</th><th>Vivran / Khata</th><th>📥 Aamad (In)</th><th>📤 Diya (Out)</th></tr>";
        var pRows = [];

        karList.forEach(function(k) {
            var matchK = isAll || (!k.karkhanaId && targetKid === "k_main") || (String(k.karkhanaId) === String(targetKid));
            if (!matchK) return;

            (typeof getKarigerSheets === "function" ? getKarigerSheets(k.id) : []).forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) {
                    if (r && r.date === d && Number(r.paid) > 0) {
                        pRows.push({ party: k.name, desc: "Mazdoori (" + sh.title + ")", inAmt: 0, outAmt: Number(r.paid) });
                    }
                });
            });
        });

        dbEntries.forEach(function(e) {
            var matchK = isAll || (!e.karkhanaId && targetKid === "k_main") || (String(e.karkhanaId) === String(targetKid));
            if (!matchK || e.karigerId) return;

            var amt = Number(e.amount || 0);
            if (e.type === "receipt") {
                pRows.push({ party: e.party || "Cash Inward", desc: e.remarks || e.category, inAmt: amt, outAmt: 0 });
            } else {
                pRows.push({ party: e.party || "Cash Payment", desc: e.remarks || e.category, inAmt: 0, outAmt: amt });
            }
        });

        if (!pRows.length) {
            tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Is tarikh me koi payment ya cash transfer nahi hua.</td></tr>";
        } else {
            var pBuf = "";
            pRows.forEach(function(dp) {
                pBuf += "<tr>" +
                    "<td><strong>" + dp.party + "</strong></td>" +
                    "<td>" + dp.desc + "</td>" +
                    "<td style='color:#059669; font-weight:700;'>" + (dp.inAmt > 0 ? ("+ ₹ " + dp.inAmt.toFixed(2)) : "-") + "</td>" +
                    "<td style='color:#dc2626; font-weight:700;'>" + (dp.outAmt > 0 ? ("- ₹ " + dp.outAmt.toFixed(2)) : "-") + "</td>" +
                "</tr>";
            });
            tbody.innerHTML = pBuf;
        }
        tfoot.innerHTML = "<tr><td colspan='2'><strong>Total Rozana Cash Movement:</strong></td><td><strong style='color:#059669;'>+ ₹ " + pIn.toFixed(2) + "</strong></td><td><strong style='color:#dc2626;'>- ₹ " + pOut.toFixed(2) + "</strong></td></tr>";

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

/**
 * 2. DASHBOARD TOTAL BADGES ENGINE
 */
function updateDashboardBadgeTotals() {
    var targetKid = currentDashboardKarkhanaFilter;
    var isAll = (targetKid === "all");

    var karList = typeof sanitizeKarigerList === "function" ? sanitizeKarigerList() : safeArray(getStore("kariger_list"));
    if (!isAll) {
        karList = karList.filter(function(k) {
            return String(k.karkhanaId) === String(targetKid) || (!k.karkhanaId && targetKid === "k_main");
        });
    }

    setElementText("btn-total-kariger", "Total: " + karList.length);
    setElementText("btn-total-info", "Total: " + safeArray(getStore("info_ledger")).length);

    var ts = 0;
    var sH = safeArray(getStore("saree_history")).filter(function(x) { 
        var isFresh = (x.type || "fresh") === "fresh";
        var matchK = isAll || (!x.karkhanaId && targetKid === "k_main") || (String(x.karkhanaId) === String(targetKid));
        return isFresh && matchK;
    });

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
        var tb = 0, seenBana = [];
        safeArray(getStore("bana_stock")).forEach(function(b) {
            if (b && b.name) {
                var nLow = b.name.trim().toLowerCase();
                if (seenBana.indexOf(nLow) === -1) {
                    seenBana.push(nLow);
                    try { 
                        tb += Number(getBanaItemStats(b.name, targetKid).bacha || 0); 
                    } catch(e) { 
                        tb += Number(b.bacha || 0); 
                    }
                }
            }
        });
        setElementText("btn-total-bana", "Bacha: " + tb.toFixed(2) + " Kg");

        var tz = 0, seenZari = [];
        safeArray(getStore("zari_stock")).forEach(function(z) {
            if (z && z.name) {
                var nLow = z.name.trim().toLowerCase();
                if (seenZari.indexOf(nLow) === -1) {
                    seenZari.push(nLow);
                    try { 
                        tz += Number(getZariItemStats(z.name, targetKid).bacha || 0); 
                    } catch(e) { 
                        tz += Number(z.bacha || 0); 
                    }
                }
            }
        });
        setElementText("btn-total-zari", "Bacha: " + tz.toFixed(2) + " Kg");

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

        var totTani = 0, totChukka = 0;
        safeArray(getStore("sancha_items")).forEach(function(s) {
            if (!s) return;
            var matchK = isAll || (!s.karkhanaId && targetKid === "k_main") || (String(s.karkhanaId) === String(targetKid));
            if (!matchK) return;

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
        if (typeof setDisplay === "function") setDisplay(id, "none");
        else {
            var el = document.getElementById(id);
            if (el) el.style.display = "none";
        }
    });
}

function backToDashboard() {
    hideAllSections();
    if (typeof setDisplay === "function") setDisplay("dashboard-view", "block");
    else {
        var el = document.getElementById("dashboard-view");
        if (el) el.style.display = "block";
    }
    renderDashboardKarkhanaTabs();
    if (typeof populateSessionDropdown === "function") populateSessionDropdown();
    renderDashboardDayBook();
    updateDashboardBadgeTotals();
}

function triggerActiveSectionRefresh() {
    var cur = getCurrentActiveSection();
    if (cur === "dashboard-view") {
        renderDashboardKarkhanaTabs();
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
    } else if (cur === "sancha-section" && typeof renderSanchaTable === "function") {
        renderSanchaTable();
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
    if (dEl) dEl.value = (typeof getTodayDate === "function") ? getTodayDate() : new Date().toISOString().split("T")[0];
    renderDashboardKarkhanaTabs();
    if (typeof populateSessionDropdown === "function") populateSessionDropdown();
    renderDashboardDayBook();
    updateDashboardBadgeTotals();
    if (typeof syncUsersWithFirebase === "function") syncUsersWithFirebase();
}

/**
 * 🌟 5. REFRESH-PROOF STARTUP LISTENER (Auto-Login Activated)
 */
window.onload = function() {
    var idInp = document.getElementById("login-id");
    var passInp = document.getElementById("login-pass");
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

    // ⭐ AUTO-LOGIN CHECK: Agar pehle se login hain to dashboard par rakho, logout mat karo!
    if (typeof checkAutoLogin === "function") {
        checkAutoLogin();
    } else {
        if (typeof showLogin === "function") showLogin();
    }
};
