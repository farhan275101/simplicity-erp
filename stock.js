/* ========================================================
   SIMPLICITY ERP - LIVE STOCK ENGINE (BANA, ZARI, SAREE, LOTT, SANCHA)
   File 5 of 7 • Developed by Farhan Jawed
======================================================== */

var currentSareeStockTab = "fresh"; // "fresh" ya "lott"

// ================= 1. LIVE BANA COMPUTATION ENGINE =================

function getBanaItemStats(itemName) {
    var nameLower = (itemName || "").trim().toLowerCase();
    var bStock = getStore("bana_stock");
    var totalAaya = 0, manualGaya = 0, lastDate = "";

    // Godam me kul kitna aaya
    bStock.forEach(function(b) {
        if (b && b.name && b.name.trim().toLowerCase() === nameLower) {
            totalAaya += (Number(b.aaya) || 0);
            if (b.date) lastDate = b.date;
        }
    });

    // Sabhi Karigers ki active sheets me kitna gaya aur wapas aaya
    var sheetGaya = 0;
    var allKarigers = sanitizeKarigerList();

    allKarigers.forEach(function(k) {
        var sheets = getKarigerSheets(k.id);
        sheets.forEach(function(sh) {
            if (sh && sh.rows) {
                var rows = safeArray(sh.rows);
                rows.forEach(function(r) {
                    if (!r) return;
                    var rowBanaName = (r.banaItemName || "").trim().toLowerCase();
                    var isMatch = (rowBanaName === nameLower) || (!rowBanaName && bStock.length > 0 && bStock[0].name.trim().toLowerCase() === nameLower);

                    if (isMatch) {
                        var netGiven = Number(r.netBana) || 0;
                        var returned = Number(r.retBana) || 0;
                        sheetGaya += (netGiven - returned);
                    }
                });
            }
        });
    });

    // Manual Diya gaya
    var bHist = getStore("bana_history");
    bHist.forEach(function(h) {
        if (h && h.type === "Gaya (Manual)" && h.name && h.name.trim().toLowerCase() === nameLower) {
            manualGaya += (Number(h.qty) || 0);
        }
    });

    var totalGaya = sheetGaya + manualGaya;
    var bacha = totalAaya - totalGaya;

    return {
        name: itemName,
        date: lastDate || getTodayDate(),
        aaya: totalAaya,
        gaya: totalGaya,
        bacha: bacha
    };
}

// ================= 2. LIVE ZARI COMPUTATION ENGINE =================

function getZariItemStats(itemName) {
    var nameLower = (itemName || "").trim().toLowerCase();
    var zStock = getStore("zari_stock");
    var totalAaya = 0, manualGaya = 0, lastDate = "";

    // Godam me kul kitni aayi
    zStock.forEach(function(z) {
        if (z && z.name && z.name.trim().toLowerCase() === nameLower) {
            totalAaya += (Number(z.aaya) || 0);
            if (z.date) lastDate = z.date;
        }
    });

    // Sabhi Karigers ki sheets me kitni gayi aur wapas aayi
    var sheetGaya = 0;
    var allKarigers = sanitizeKarigerList();

    allKarigers.forEach(function(k) {
        var sheets = getKarigerSheets(k.id);
        sheets.forEach(function(sh) {
            if (sh && sh.rows) {
                var rows = safeArray(sh.rows);
                rows.forEach(function(r) {
                    if (!r) return;
                    var rowZariName = (r.zariItemName || "").trim().toLowerCase();
                    var isMatch = (rowZariName === nameLower) || (!rowZariName && zStock.length > 0 && zStock[0].name.trim().toLowerCase() === nameLower);

                    if (isMatch) {
                        var netGiven = Number(r.netZari) || 0;
                        var returned = Number(r.retZari) || 0;
                        sheetGaya += (netGiven - returned);
                    }
                });
            }
        });
    });

    // Manual Diya gaya
    var zHist = getStore("zari_history");
    zHist.forEach(function(h) {
        if (h && h.type === "Gaya (Manual)" && h.name && h.name.trim().toLowerCase() === nameLower) {
            manualGaya += (Number(h.qty) || 0);
        }
    });

    var totalGaya = sheetGaya + manualGaya;
    var bacha = totalAaya - totalGaya;

    return {
        name: itemName,
        date: lastDate || getTodayDate(),
        aaya: totalAaya,
        gaya: totalGaya,
        bacha: bacha
    };
}

// ================= 3. BANA STOCK MODULE =================

function openBanaModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("bana-section", "block");
    renderBanaTable();
}

function renderBanaTable(flist) {
    var list = flist || getStore("bana_stock");
    var tbody = document.getElementById("bana-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!list.length) {
        tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding:20px; color:#888;'>Koi Bana Stock nahi mila.</td></tr>";
        return;
    }

    list.forEach(function(b, idx) {
        if (!b) return;
        var st = getBanaItemStats(b.name);
        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(b.date || st.date) + "</td>" +
            "<td><strong>" + b.name + "</strong></td>" +
            "<td><span class='badge-green'>+" + Number(st.aaya).toFixed(2) + "</span></td>" +
            "<td><span class='badge-red'>-" + Number(st.gaya).toFixed(2) + "</span></td>" +
            "<td><span class='badge-blue' style='font-size:12px; font-weight:800;'>" + Number(st.bacha).toFixed(2) + "</span></td>" +
            "<td><button class='quick-btn btn-out' onclick='giveBanaToKariger(" + idx + ")'>📤 Diya</button></td>" +
            "<td style='text-align:center;'><button class='detail-btn' onclick='viewBanaPassbook(\"" + b.name + "\")'>📖 Passbook</button> " +
                "<button class='delete-btn' onclick='deleteBanaStock(" + idx + ")'>🗑️</button>" +
            "</td>" +
        "</tr>";
    });
}

function toggleBanaForm() {
    var f = document.getElementById("add-bana-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    document.getElementById("bana-date").value = getTodayDate();
}

function saveNewBana() {
    var d = document.getElementById("bana-date").value || getTodayDate();
    var n = (document.getElementById("bana-name").value || "").trim();
    var q = parseFloat(document.getElementById("bana-aaya").value) || 0;

    if (!n || q <= 0) return alert("Sahi name aur quantity bharein!");

    var stock = getStore("bana_stock");
    var item = stock.find(function(b) { return b && b.name && b.name.toLowerCase() === n.toLowerCase(); });

    if (item) {
        item.aaya = (Number(item.aaya) || 0) + q;
        item.date = d;
    } else {
        stock.push({ id: Date.now(), name: n, date: d, aaya: q, gaya: 0, bacha: q });
    }
    setStore("bana_stock", stock);

    var h = getStore("bana_history");
    h.push({ id: Date.now(), date: d, type: "Aaya (Stock In)", name: n, qty: q, note: "Godam Stock Purchase" });
    setStore("bana_history", h);

    toggleBanaForm();
    renderBanaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();
    alert("✅ " + q + " " + n + " Bana stock me jud gaya!");
}

function giveBanaToKariger(idx) {
    var stock = getStore("bana_stock");
    var it = stock[idx];
    if (!it) return;

    var st = getBanaItemStats(it.name);
    var q = parseFloat(prompt("Kitna " + it.name + " Bana diya (Qty)?\n(Bacha Stock: " + st.bacha.toFixed(2) + "):"));
    if (!q || isNaN(q) || q <= 0) return;

    var karList = sanitizeKarigerList();
    var karNames = karList.map(function(k, i) { return (i + 1) + ". " + k.name; }).join("\n");
    var promptMsg = "Kis Kariger ko diya? Kariger ka number ya naam daalein:\n" + (karNames || "Koi Kariger maujood nahi hai");
    var karChoice = prompt(promptMsg);
    if (!karChoice || !karChoice.trim()) return;

    karChoice = karChoice.trim();
    var selectedKar = null;
    var choiceNum = parseInt(karChoice);

    if (!isNaN(choiceNum) && choiceNum >= 1 && choiceNum <= karList.length) {
        selectedKar = karList[choiceNum - 1];
    } else {
        selectedKar = karList.find(function(k) { return k.name.toLowerCase() === karChoice.toLowerCase(); });
    }

    var payDate = prompt("Tarikh (YYYY-MM-DD):", getTodayDate()) || getTodayDate();

    if (selectedKar) {
        var sheets = getKarigerSheets(selectedKar.id);
        if (!sheets || !sheets.length) {
            sheets = [{ id: "tani_1", title: "Tani 1", banaRate: 0.311, zariRate: 0.110, baniRate: 240, closingBana: 0, closingZari: 0, closingBani: 0, note: "", rows: [] }];
        }
        var targetSheet = sheets[sheets.length - 1];
        targetSheet.rows = safeArray(targetSheet.rows);

        var newRow = {
            id: "row_" + Date.now(),
            date: payDate,
            saree: 0,
            sareeName: selectedKar.saree || "-",
            sancha: "",
            taniName: targetSheet.title,
            taniWazan: 0,
            banaCone: q,
            banaTp: 0,
            banaLess: 0,
            netBana: q,
            zariQty: 0, zariTp: 0, zariTopi: 0, netZari: 0,
            paid: 0, lott: 0, retBana: 0, retZari: 0,
            banaItemName: it.name,
            zariItemName: ""
        };

        targetSheet.rows.push(newRow);
        saveKarigerSheets(selectedKar.id, sheets);
        alert("✅ " + q + " " + it.name + " Bana kariger " + selectedKar.name + " ki sheet me jud gaya aur live stock se minus ho gaya!");
    } else {
        var bH = getStore("bana_history");
        bH.push({ id: Date.now(), date: payDate, type: "Gaya (Manual)", name: it.name, qty: q, note: karChoice });
        setStore("bana_history", bH);
        alert("✅ " + q + " " + it.name + " Bana stock se minus ho gaya!");
    }

    renderBanaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();
}

function deleteBanaStock(idx) {
    if (!confirm("Kya aap is Bana item ko delete karna chahte hain?")) return;
    var s = getStore("bana_stock");
    s.splice(idx, 1);
    setStore("bana_stock", s);
    renderBanaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function filterBana() {
    var txt = (document.getElementById("search-bana-input").value || "").toLowerCase().trim();
    var fD = document.getElementById("bana-from-date").value;
    var tD = document.getElementById("bana-to-date").value;

    renderBanaTable(getStore("bana_stock").filter(function(b) {
        return b && (String(b.name || "") + " " + formatDateDisplay(b.date)).toLowerCase().indexOf(txt) !== -1 && isDateInRange(b.date, fD, tD);
    }));
}

function resetBanaFilter() {
    document.getElementById("bana-from-date").value = "";
    document.getElementById("bana-to-date").value = "";
    document.getElementById("search-bana-input").value = "";
    renderBanaTable();
}

function viewBanaPassbook(banaName) {
    document.getElementById("modal-item-title").textContent = "📖 Bana Passbook: " + banaName;
    var tbody = document.getElementById("modal-history-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var entries = [];
    var nameLower = (banaName || "").trim().toLowerCase();

    // Godam In
    getStore("bana_stock").forEach(function(b) {
        if (b && b.name && b.name.trim().toLowerCase() === nameLower && Number(b.aaya) > 0) {
            entries.push({ date: b.date || getTodayDate(), desc: "Godam Me Aaya (Stock In)", inQty: Number(b.aaya), outQty: 0 });
        }
    });

    // Kariger Sheets Out & Return
    var bStock = getStore("bana_stock");
    sanitizeKarigerList().forEach(function(k) {
        var sheets = getKarigerSheets(k.id);
        sheets.forEach(function(sh) {
            if (sh && sh.rows) {
                var rows = safeArray(sh.rows);
                rows.forEach(function(r) {
                    if (!r) return;
                    var rowBanaName = (r.banaItemName || "").trim().toLowerCase();
                    var isMatch = (rowBanaName === nameLower) || (!rowBanaName && bStock.length > 0 && bStock[0].name.trim().toLowerCase() === nameLower);

                    if (isMatch) {
                        if (Number(r.netBana) > 0) {
                            entries.push({ date: r.date, desc: k.name + " (" + sh.title + ") - Net Diya", inQty: 0, outQty: Number(r.netBana) });
                        }
                        if (Number(r.retBana) > 0) {
                            entries.push({ date: r.date, desc: k.name + " (" + sh.title + ") - Wapas Aaya (Return)", inQty: Number(r.retBana), outQty: 0 });
                        }
                    }
                });
            }
        });
    });

    // Manual History
    getStore("bana_history").forEach(function(h) {
        if (h && h.type === "Gaya (Manual)" && h.name && h.name.trim().toLowerCase() === nameLower) {
            entries.push({ date: h.date, desc: "Manual Diya (" + (h.note || "General") + ")", inQty: 0, outQty: Number(h.qty) });
        }
    });

    if (!entries.length) {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Koi record nahi mila.</td></tr>";
    } else {
        entries.sort(function(a, b) { return (b.date > a.date) ? 1 : -1; });
        entries.forEach(function(e) {
            var qtyDisplay = (e.inQty > 0) ? ("<span style='color:#059669; font-weight:700;'>+" + e.inQty.toFixed(2) + " (Aaya)</span>") : ("<span style='color:#dc2626; font-weight:700;'>-" + e.outQty.toFixed(2) + " (Gaya)</span>");
            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(e.date) + "</td>" +
                "<td>" + e.desc + "</td>" +
                "<td>" + qtyDisplay + "</td>" +
                "<td style='text-align:center;'>-</td>" +
            "</tr>";
        });
    }
    setDisplay("item-modal", "flex");
}

// ================= 4. ZARI STOCK MODULE =================

function openZariModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("zari-section", "block");
    renderZariTable();
}

function renderZariTable(flist) {
    var list = flist || getStore("zari_stock");
    var tbody = document.getElementById("zari-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!list.length) {
        tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding:20px; color:#888;'>Koi Zari Stock nahi mila.</td></tr>";
        return;
    }

    list.forEach(function(z, idx) {
        if (!z) return;
        var st = getZariItemStats(z.name);
        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(z.date || st.date) + "</td>" +
            "<td><strong>" + z.name + "</strong></td>" +
            "<td><span class='badge-green'>+" + Number(st.aaya).toFixed(2) + "</span></td>" +
            "<td><span class='badge-red'>-" + Number(st.gaya).toFixed(2) + "</span></td>" +
            "<td><span class='badge-blue' style='font-size:12px; font-weight:800;'>" + Number(st.bacha).toFixed(2) + "</span></td>" +
            "<td><button class='quick-btn btn-out' onclick='giveZariToKariger(" + idx + ")'>📤 Diya</button></td>" +
            "<td style='text-align:center;'><button class='detail-btn' onclick='viewZariPassbook(\"" + z.name + "\")'>📖 Passbook</button> " +
                "<button class='delete-btn' onclick='deleteZariStock(" + idx + ")'>🗑️</button>" +
            "</td>" +
        "</tr>";
    });
}

function toggleZariForm() {
    var f = document.getElementById("add-zari-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    document.getElementById("zari-date").value = getTodayDate();
}

function saveNewZari() {
    var d = document.getElementById("zari-date").value || getTodayDate();
    var n = (document.getElementById("zari-name").value || "").trim();
    var q = parseFloat(document.getElementById("zari-aaya").value) || 0;

    if (!n || q <= 0) return alert("Sahi name aur quantity bharein!");

    var stock = getStore("zari_stock");
    var item = stock.find(function(z) { return z && z.name && z.name.toLowerCase() === n.toLowerCase(); });

    if (item) {
        item.aaya = (Number(item.aaya) || 0) + q;
        item.date = d;
    } else {
        stock.push({ id: Date.now(), name: n, date: d, aaya: q, gaya: 0, bacha: q });
    }
    setStore("zari_stock", stock);

    var h = getStore("zari_history");
    h.push({ id: Date.now(), date: d, type: "Aaya (Stock In)", name: n, qty: q, note: "Godam Stock Purchase" });
    setStore("zari_history", h);

    toggleZariForm();
    renderZariTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();
    alert("✅ " + q + " " + n + " Zari stock me jud gayi!");
}

function giveZariToKariger(idx) {
    var stock = getStore("zari_stock");
    var it = stock[idx];
    if (!it) return;

    var st = getZariItemStats(it.name);
    var q = parseFloat(prompt("Kitni " + it.name + " Zari di (Qty)?\n(Bachi Stock: " + st.bacha.toFixed(2) + "):"));
    if (!q || isNaN(q) || q <= 0) return;

    var karList = sanitizeKarigerList();
    var karNames = karList.map(function(k, i) { return (i + 1) + ". " + k.name; }).join("\n");
    var promptMsg = "Kis Kariger ko di? Kariger ka number ya naam daalein:\n" + (karNames || "Koi Kariger maujood nahi hai");
    var karChoice = prompt(promptMsg);
    if (!karChoice || !karChoice.trim()) return;

    karChoice = karChoice.trim();
    var selectedKar = null;
    var choiceNum = parseInt(karChoice);

    if (!isNaN(choiceNum) && choiceNum >= 1 && choiceNum <= karList.length) {
        selectedKar = karList[choiceNum - 1];
    } else {
        selectedKar = karList.find(function(k) { return k.name.toLowerCase() === karChoice.toLowerCase(); });
    }

    var payDate = prompt("Tarikh (YYYY-MM-DD):", getTodayDate()) || getTodayDate();

    if (selectedKar) {
        var sheets = getKarigerSheets(selectedKar.id);
        if (!sheets || !sheets.length) {
            sheets = [{ id: "tani_1", title: "Tani 1", banaRate: 0.311, zariRate: 0.110, baniRate: 240, closingBana: 0, closingZari: 0, closingBani: 0, note: "", rows: [] }];
        }
        var targetSheet = sheets[sheets.length - 1];
        targetSheet.rows = safeArray(targetSheet.rows);

        var newRow = {
            id: "row_" + Date.now(),
            date: payDate,
            saree: 0,
            sareeName: selectedKar.saree || "-",
            sancha: "",
            taniName: targetSheet.title,
            taniWazan: 0,
            banaCone: 0, banaTp: 0, banaLess: 0, netBana: 0,
            zariQty: q, zariTp: 0, zariTopi: 0, netZari: q,
            paid: 0, lott: 0, retBana: 0, retZari: 0,
            banaItemName: "",
            zariItemName: it.name
        };

        targetSheet.rows.push(newRow);
        saveKarigerSheets(selectedKar.id, sheets);
        alert("✅ " + q + " " + it.name + " Zari kariger " + selectedKar.name + " ki sheet me jud gayi aur live stock se minus ho gayi!");
    } else {
        var zH = getStore("zari_history");
        zH.push({ id: Date.now(), date: payDate, type: "Gaya (Manual)", name: it.name, qty: q, note: karChoice });
        setStore("zari_history", zH);
        alert("✅ " + q + " " + it.name + " Zari stock se minus ho gayi!");
    }

    renderZariTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();
}

function deleteZariStock(idx) {
    if (!confirm("Kya aap is Zari item ko delete karna chahte hain?")) return;
    var s = getStore("zari_stock");
    s.splice(idx, 1);
    setStore("zari_stock", s);
    renderZariTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function filterZari() {
    var txt = (document.getElementById("search-zari-input").value || "").toLowerCase().trim();
    var fD = document.getElementById("zari-from-date").value;
    var tD = document.getElementById("zari-to-date").value;

    renderZariTable(getStore("zari_stock").filter(function(z) {
        return z && (String(z.name || "") + " " + formatDateDisplay(z.date)).toLowerCase().indexOf(txt) !== -1 && isDateInRange(z.date, fD, tD);
    }));
}

function resetZariFilter() {
    document.getElementById("zari-from-date").value = "";
    document.getElementById("zari-to-date").value = "";
    document.getElementById("search-zari-input").value = "";
    renderZariTable();
}

function viewZariPassbook(zariName) {
    document.getElementById("modal-item-title").textContent = "📖 Zari Passbook: " + zariName;
    var tbody = document.getElementById("modal-history-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var entries = [];
    var nameLower = (zariName || "").trim().toLowerCase();

    // Godam In
    getStore("zari_stock").forEach(function(z) {
        if (z && z.name && z.name.trim().toLowerCase() === nameLower && Number(z.aaya) > 0) {
            entries.push({ date: z.date || getTodayDate(), desc: "Godam Me Aayi (Stock In)", inQty: Number(z.aaya), outQty: 0 });
        }
    });

    // Kariger Sheets Out & Return
    var zStock = getStore("zari_stock");
    sanitizeKarigerList().forEach(function(k) {
        var sheets = getKarigerSheets(k.id);
        sheets.forEach(function(sh) {
            if (sh && sh.rows) {
                var rows = safeArray(sh.rows);
                rows.forEach(function(r) {
                    if (!r) return;
                    var rowZariName = (r.zariItemName || "").trim().toLowerCase();
                    var isMatch = (rowZariName === nameLower) || (!rowZariName && zStock.length > 0 && zStock[0].name.trim().toLowerCase() === nameLower);

                    if (isMatch) {
                        if (Number(r.netZari) > 0) {
                            entries.push({ date: r.date, desc: k.name + " (" + sh.title + ") - Net Diya", inQty: 0, outQty: Number(r.netZari) });
                        }
                        if (Number(r.retZari) > 0) {
                            entries.push({ date: r.date, desc: k.name + " (" + sh.title + ") - Wapas Aayi (Return)", inQty: Number(r.retZari), outQty: 0 });
                        }
                    }
                });
            }
        });
    });

    // Manual History
    getStore("zari_history").forEach(function(h) {
        if (h && h.type === "Gaya (Manual)" && h.name && h.name.trim().toLowerCase() === nameLower) {
            entries.push({ date: h.date, desc: "Manual Diya (" + (h.note || "General") + ")", inQty: 0, outQty: Number(h.qty) });
        }
    });

    if (!entries.length) {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Koi record nahi mila.</td></tr>";
    } else {
        entries.sort(function(a, b) { return (b.date > a.date) ? 1 : -1; });
        entries.forEach(function(e) {
            var qtyDisplay = (e.inQty > 0) ? ("<span style='color:#059669; font-weight:700;'>+" + e.inQty.toFixed(2) + " (Aaya)</span>") : ("<span style='color:#dc2626; font-weight:700;'>-" + e.outQty.toFixed(2) + " (Gaya)</span>");
            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(e.date) + "</td>" +
                "<td>" + e.desc + "</td>" +
                "<td>" + qtyDisplay + "</td>" +
                "<td style='text-align:center;'>-</td>" +
            "</tr>";
        });
    }
    setDisplay("item-modal", "flex");
}

// ================= 5. SANCHA STOCK ENGINE =================

function getSanchaItems() {
    var items = getStore("sancha_items");
    if (!Array.isArray(items)) return [];
    return items;
}

function getSanchaItemStats(sanchaId, sanchaName) {
    var idMatch = String(sanchaId || "").trim();
    var nameLower = String(sanchaName || "").trim().toLowerCase();

    var items = getSanchaItems();
    var currentItem = items.find(function(x) {
        return x && (String(x.id) === idMatch || (x.name && x.name.trim().toLowerCase() === nameLower));
    });

    var hist = getStore("sancha_history");
    var histAaya = 0;
    var manualGaya = 0;

    hist.forEach(function(h) {
        if (!h) return;
        var hIdMatch = (h.itemId && String(h.itemId) === idMatch);
        var hNameMatch = (h.itemName && h.itemName.trim().toLowerCase() === nameLower);

        if (hIdMatch || hNameMatch) {
            var q = Number(h.qty) || 0;
            if (String(h.type || "").indexOf("Aaya") !== -1) {
                histAaya += q;
            } else if (String(h.type || "").indexOf("Manual") !== -1) {
                manualGaya += q;
            }
        }
    });

    var itemRecordedAaya = currentItem ? (Number(currentItem.aaya) || Number(currentItem.totalQty) || 0) : 0;
    var totalAaya = Math.max(itemRecordedAaya, histAaya);

    var sheetGaya = 0;
    var allKarigers = sanitizeKarigerList();

    allKarigers.forEach(function(k) {
        var sheets = getKarigerSheets(k.id);
        sheets.forEach(function(sh) {
            if (sh && sh.rows) {
                var rows = safeArray(sh.rows);
                rows.forEach(function(r) {
                    if (!r) return;
                    var rSancha = String(r.sancha || "").trim().toLowerCase();
                    if (rSancha && rSancha === nameLower) {
                        sheetGaya += (Number(r.taniWazan) || 0);
                    }
                });
            }
        });
    });

    var totalGaya = sheetGaya + manualGaya;
    var bacha = totalAaya - totalGaya;

    return {
        aaya: totalAaya,
        gaya: totalGaya,
        bacha: bacha
    };
}

function openSanchaModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("sancha-section", "block");
    renderSanchaTable();
}

function toggleAddSanchaItemForm() {
    var f = document.getElementById("add-sancha-item-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    document.getElementById("sancha-new-item-date").value = getTodayDate();
}

function saveNewSanchaItem() {
    var d = document.getElementById("sancha-new-item-date").value || getTodayDate();
    var n = (document.getElementById("sancha-new-item-name").value || "").trim();
    var q = parseFloat(document.getElementById("sancha-new-item-qty").value) || 0;

    if (!n) return alert("Sancha item ka naam daalein!");

    var items = getSanchaItems();
    var newId = "sancha_" + Date.now();

    var newItem = {
        id: newId,
        name: n,
        date: d,
        aaya: q
    };

    items.push(newItem);
    setStore("sancha_items", items);

    if (q > 0) {
        var hist = getStore("sancha_history");
        hist.push({
            id: Date.now(),
            itemId: newId,
            itemName: n,
            date: d,
            type: "Aaya (Starting)",
            qty: q,
            note: "Starting Stock Purchase"
        });
        setStore("sancha_history", hist);
    }

    toggleAddSanchaItemForm();
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ Naya Sancha Item '" + n + "' ban gaya!");
}

function renderSanchaTable() {
    var items = getSanchaItems();
    var tbody = document.getElementById("sancha-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!items.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Koi Sancha Item nahi mila. Naya item jodein.</td></tr>";
        return;
    }

    items.forEach(function(item) {
        if (!item) return;
        var st = getSanchaItemStats(item.id, item.name);

        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(item.date) + "</td>" +
            "<td><strong style='color:#0284c7;'>⚙️ " + item.name + "</strong></td>" +
            "<td><span class='badge-green'>+" + st.aaya.toFixed(2) + "</span></td>" +
            "<td><span class='badge-red'>-" + st.gaya.toFixed(2) + "</span></td>" +
            "<td><span class='badge-blue'>" + st.bacha.toFixed(2) + "</span></td>" +
            "<td style='text-align:center;'><button class='detail-btn' style='background:#0284c7;' onclick='openSanchaDetailModal(\"" + item.id + "\")'>Detail</button> <button class='delete-btn' onclick='deleteSanchaItem(\"" + item.id + "\")'>🗑️</button></td>" +
        "</tr>";
    });
}

function deleteSanchaItem(id) {
    if (!confirm("Kya aap is Sancha item ko delete karna chahte hain?")) return;
    var filtered = getSanchaItems().filter(function(i) {
        return i && String(i.id) !== String(id);
    });
    setStore("sancha_items", filtered);
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function openSanchaDetailModal(id) {
    var it = getSanchaItems().find(function(x) { return x && String(x.id) === String(id); });
    if (!it) return;

    activeSanchaItemId = it.id;
    var st = getSanchaItemStats(it.id, it.name);
    document.getElementById("sancha-modal-title").innerHTML = "📦 " + it.name + " (Bacha: " + st.bacha.toFixed(2) + ")";
    document.getElementById("sancha-entry-date").value = getTodayDate();
    document.getElementById("sancha-entry-qty").value = "";
    document.getElementById("sancha-entry-note").value = "";

    renderSanchaHistoryTable();
    setDisplay("sancha-detail-modal", "flex");
}

function closeSanchaDetailModal() {
    setDisplay("sancha-detail-modal", "none");
    activeSanchaItemId = null;
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function addSanchaStockEntry() {
    if (!activeSanchaItemId) return;

    var d = document.getElementById("sancha-entry-date").value || getTodayDate();
    var q = parseFloat(document.getElementById("sancha-entry-qty").value) || 0;
    var note = (document.getElementById("sancha-entry-note").value || "").trim();

    if (q <= 0) return alert("Sahi quantity bharein!");

    var items = getSanchaItems();
    var item = items.find(function(i) { return i && String(i.id) === String(activeSanchaItemId); });
    if (!item) return;

    var hist = getStore("sancha_history");
    hist.push({
        id: Date.now(),
        itemId: item.id,
        itemName: item.name,
        date: d,
        type: "Aaya (Stock In)",
        qty: q,
        note: note || "Naya Maal Aaya"
    });
    setStore("sancha_history", hist);

    document.getElementById("sancha-entry-qty").value = "";
    document.getElementById("sancha-entry-note").value = "";

    var st = getSanchaItemStats(item.id, item.name);
    document.getElementById("sancha-modal-title").innerHTML = "📦 " + item.name + " (Bacha: " + st.bacha.toFixed(2) + ")";

    renderSanchaHistoryTable();
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + q + " stock jud gaya!");
}

function renderSanchaHistoryTable() {
    var hist = getStore("sancha_history");
    var tbody = document.getElementById("sancha-detail-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var currentItem = getSanchaItems().find(function(i) { return i && String(i.id) === String(activeSanchaItemId); });
    var currentItemName = currentItem ? currentItem.name.trim().toLowerCase() : "";

    var entries = [];

    hist.forEach(function(h, idx) {
        if (!h) return;
        var idMatch = (h.itemId && String(h.itemId) === String(activeSanchaItemId));
        var nameMatch = (h.itemName && h.itemName.trim().toLowerCase() === currentItemName);
        if (idMatch || nameMatch) {
            entries.push({
                idx: idx,
                date: h.date,
                type: h.type || "Aaya",
                qty: Number(h.qty) || 0,
                note: h.note || "-",
                isSheet: false
            });
        }
    });

    sanitizeKarigerList().forEach(function(k) {
        var sheets = getKarigerSheets(k.id);
        sheets.forEach(function(sh) {
            if (sh && sh.rows) {
                var rows = safeArray(sh.rows);
                rows.forEach(function(r) {
                    if (r && r.sancha && r.sancha.trim().toLowerCase() === currentItemName && Number(r.taniWazan) > 0) {
                        entries.push({
                            date: r.date,
                            type: "Gaya (Tani)",
                            qty: Number(r.taniWazan),
                            note: k.name + " (" + (r.taniName || sh.title) + ")",
                            isSheet: true
                        });
                    }
                });
            }
        });
    });

    if (!entries.length) {
        tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:15px; color:#888;'>Koi entry nahi mili.</td></tr>";
        return;
    }

    entries.sort(function(a, b) { return (b.date > a.date) ? 1 : -1; });

    entries.forEach(function(e) {
        var isAaya = (String(e.type).indexOf("Aaya") !== -1);
        var actBtn = e.isSheet ? "<span style='color:#64748b; font-size:11px;'>Sheet Entry</span>" : ("<button class='delete-btn' onclick='deleteSanchaHistoryRow(" + e.idx + ")'>🗑️</button>");

        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(e.date) + "</td>" +
            "<td><span class='" + (isAaya ? "badge-green" : "badge-red") + "'>" + e.type + "</span></td>" +
            "<td><strong style='color:" + (isAaya ? "#059669" : "#dc2626") + ";'>" + (isAaya ? "+" : "-") + e.qty.toFixed(2) + "</strong></td>" +
            "<td>" + e.note + "</td>" +
            "<td style='text-align:center;'><button class='delete-btn' onclick='deleteSanchaHistoryRow(" + e.idx + ")'>🗑️</button></td>" +
        "</tr>";
    });
}

function deleteSanchaHistoryRow(idx) {
    if (!confirm("Kya aap is entry ko delete karna chahte hain?")) return;
    var hist = getStore("sancha_history");
    hist.splice(idx, 1);
    setStore("sancha_history", hist);

    renderSanchaHistoryTable();
    renderSanchaTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function autoDeductSanchaStock(wazan, date, karName, sanchaName, taniName) {
    return true;
}

// ================= 6. SAREE STOCK (FRESH SAREE vs LOTT SAREE TABS) =================

function openSareeModule() {
    if (typeof hideAllSections === "function") hideAllSections();
    setDisplay("saree-section", "block");
    ensureSareeStockSubTabs();
    renderSareeTable();
}

function ensureSareeStockSubTabs() {
    var existingBar = document.getElementById("saree-stock-subtabs-bar");
    if (!existingBar) {
        var filterPnl = document.querySelector("#saree-section .filter-panel");
        if (filterPnl) {
            var div = document.createElement("div");
            div.id = "saree-stock-subtabs-bar";
            div.className = "sheet-tabs-bar";
            div.style.marginBottom = "15px";
            div.innerHTML = "<div class='sheet-tabs-list'>" +
                "<button class='sheet-tab active' id='btn-saree-tab-fresh' onclick='switchSareeStockTab(\"fresh\")'>🥻 Fresh Saree Stock</button>" +
                "<button class='sheet-tab' id='btn-saree-tab-lott' onclick='switchSareeStockTab(\"lott\")'>⚠️ Lott / Damage Saree Stock</button>" +
            "</div>";
            filterPnl.parentNode.insertBefore(div, filterPnl);
        }
    }
}

function switchSareeStockTab(tab) {
    currentSareeStockTab = tab;
    var btnF = document.getElementById("btn-saree-tab-fresh");
    var btnL = document.getElementById("btn-saree-tab-lott");

    if (btnF && btnL) {
        if (tab === "fresh") {
            btnF.className = "sheet-tab active";
            btnL.className = "sheet-tab";
        } else {
            btnL.className = "sheet-tab active";
            btnF.className = "sheet-tab";
        }
    }

    renderSareeTable();
}

function renderSareeTable(flist) {
    var thead = document.querySelector("#saree-section table thead tr");
    var tbody = document.getElementById("saree-table-body");
    if (!tbody || !thead) return;
    tbody.innerHTML = "";

    // 1. FRESH SAREE TAB
    if (currentSareeStockTab === "fresh") {
        thead.innerHTML = "<tr style='background:#2563eb; color:white;'>" +
            "<th>Date</th><th>S.No.</th><th>Saree Ka Naam</th><th>Kariger</th><th>Fresh Stock (Pcs)</th><th>Out (Bikri)</th><th style='text-align:center;'>Action</th>" +
        "</tr>";

        var list = flist || getStore("saree_stock");
        if (!list.length) {
            tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding:20px; color:#888;'>Koi Fresh Saree Record nahi mila.</td></tr>";
            return;
        }

        list.forEach(function(s, idx) {
            if (!s) return;
            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(s.date) + "</td>" +
                "<td>" + (idx + 1) + "</td>" +
                "<td><strong>" + s.name + "</strong></td>" +
                "<td>" + (s.kariger || "-") + "</td>" +
                "<td><span class='badge-blue'>" + s.pcs + " pcs</span></td>" +
                "<td>" +
                    "<div style='display:flex; gap:4px; align-items:center;'>" +
                        "<input type='number' id='saree-out-input-" + idx + "' placeholder='Qty' style='width:60px; padding:4px; font-size:12px; border:1px solid #cbd5e1; border-radius:6px;' min='1'>" +
                        "<button class='quick-btn btn-out' onclick='outSareeCustomQty(" + idx + ")'>📤 Out</button>" +
                    "</div>" +
                "</td>" +
                "<td style='text-align:center;'><button class='detail-btn' onclick='viewPassbook(\"Saree: " + s.name + "\", \"saree_history\", \"" + s.name + "\")'>📖 Passbook</button> <button class='delete-btn' onclick='deleteSareeStock(" + idx + ")'>🗑️</button></td>" +
            "</tr>";
        });

    // 2. LOTT SAREE TAB
    } else {
        thead.innerHTML = "<tr style='background:#dc2626; color:white;'>" +
            "<th>Date</th><th>S.No.</th><th>Saree Ka Naam</th><th>Kahan Se Aayi (Source)</th><th>Lott Stock (Pcs)</th><th>Saste Me Becha (Out)</th><th style='text-align:center;'>Action</th>" +
        "</tr>";

        var lottList = safeArray(getStore("lott_saree_stock"));
        if (!lottList.length) {
            tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding:20px; color:#888;'>Karkhane me abhi koi Lott Saree nahi hai.</td></tr>";
            return;
        }

        lottList.forEach(function(l, idx) {
            if (!l) return;
            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(l.date) + "</td>" +
                "<td>" + (idx + 1) + "</td>" +
                "<td><strong>" + l.name + "</strong></td>" +
                "<td>" + (l.source || "Loom / Job Work") + "</td>" +
                "<td><span class='badge-red'>⚠️ " + (l.pcs || 0) + " pcs</span></td>" +
                "<td>" +
                    "<button class='quick-btn btn-out' style='background:#fef2f2; border:1px solid #fca5a5; font-size:11px;' onclick='outLottSareeCustomQty(" + idx + ")'>📤 Saste Me Becha</button>" +
                "</td>" +
                "<td style='text-align:center;'><button class='detail-btn' onclick='viewPassbook(\"Lott Saree: " + l.name + "\", \"saree_history\", \"" + l.name + "\")'>📖 Passbook</button> <button class='delete-btn' onclick='deleteLottSareeStock(" + idx + ")'>🗑️</button></td>" +
            "</tr>";
        });
    }
}

function outLottSareeCustomQty(idx) {
    var stock = safeArray(getStore("lott_saree_stock"));
    var item = stock[idx];
    if (!item) return;

    var qty = parseInt(prompt("Saree: " + item.name + "\nLott Pcs Available: " + item.pcs + "\n\nKitne Pcs saste me beche (Out):", item.pcs));
    if (!qty || isNaN(qty) || qty <= 0) return;

    if (qty > item.pcs) return alert("Sirf " + item.pcs + " Pcs available hain!");

    var note = prompt("Dukan Vivran / Saste Rate Ka Note:", "Lott Discount Sale") || "Lott Discount Sale";
    item.pcs -= qty;
    setStore("lott_saree_stock", stock);

    var h = getStore("saree_history");
    h.push({
        id: Date.now(),
        date: getTodayDate(),
        name: item.name,
        kariger: item.source || "Lott Saree",
        type: "Out (Lott Sale)",
        pcs: qty,
        note: note
    });
    setStore("saree_history", h);

    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + qty + " Lott Saree saste me bech di gayi aur stock se out ho gayi!");
}

function deleteLottSareeStock(idx) {
    if (!confirm("Kya aap is Lott Saree record ko delete karna chahte hain?")) return;
    var stock = safeArray(getStore("lott_saree_stock"));
    stock.splice(idx, 1);
    setStore("lott_saree_stock", stock);
    renderSareeTable();
}

function outSareeCustomQty(idx) {
    var inp = document.getElementById("saree-out-input-" + idx);
    var qty = parseInt(inp ? inp.value : 0);

    if (!qty || qty <= 0) return alert("Sahi quantity likhein!");

    var stock = getStore("saree_stock");
    var item = stock[idx];
    if (!item) return;

    if (qty > item.pcs) {
        return alert("Stock me sirf " + item.pcs + " saree bachi hai!");
    }

    item.pcs -= qty;
    setStore("saree_stock", stock);

    var h = getStore("saree_history");
    h.push({
        id: Date.now(),
        date: getTodayDate(),
        name: item.name,
        kariger: item.kariger,
        type: "Out (Sale)",
        pcs: qty,
        note: "Godam se out (Bikri)"
    });
    setStore("saree_history", h);

    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();
    alert("✅ " + qty + " Saree stock se minus ho gayi!");
}

function toggleAddForm() {
    var f = document.getElementById("add-saree-form");
    if (!f) return;
    f.style.display = (f.style.display === "block") ? "none" : "block";
    document.getElementById("saree-date").value = getTodayDate();
}

function saveNewSaree() {
    var d = document.getElementById("saree-date").value || getTodayDate();
    var n = (document.getElementById("saree-name").value || "").trim();
    var k = (document.getElementById("saree-kariger").value || "").trim();
    var pcs = parseInt(document.getElementById("saree-pcs").value) || 0;

    if (!n || pcs <= 0) return alert("Saree ka naam aur Pcs zaroori hai!");

    var stock = getStore("saree_stock");
    stock.push({ id: Date.now(), date: d, name: n, kariger: k || "-", pcs: pcs });
    setStore("saree_stock", stock);

    var h = getStore("saree_history");
    h.push({ id: Date.now(), date: d, name: n, kariger: k || "-", type: "In (Received)", pcs: pcs, note: "Direct add" });
    setStore("saree_history", h);

    toggleAddForm();
    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();
    alert("✅ " + pcs + " Saree jud gayi!");
}

function deleteSareeStock(idx) {
    if (!confirm("Kya aap is saree stock ko delete karna chahte hain?")) return;
    var s = getStore("saree_stock");
    s.splice(idx, 1);
    setStore("saree_stock", s);
    renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
}

function filterSaree() {
    var txt = (document.getElementById("search-saree-input").value || "").toLowerCase().trim();
    var fD = document.getElementById("saree-from-date").value;
    var tD = document.getElementById("saree-to-date").value;

    renderSareeTable(getStore("saree_stock").filter(function(s) {
        return s && (String(s.name || "") + " " + String(s.kariger || "") + " " + formatDateDisplay(s.date)).toLowerCase().indexOf(txt) !== -1 && isDateInRange(s.date, fD, tD);
    }));
}

function resetSareeFilter() {
    document.getElementById("saree-from-date").value = "";
    document.getElementById("saree-to-date").value = "";
    document.getElementById("search-saree-input").value = "";
    renderSareeTable();
}

// ================= 7. PASSBOOK MODAL CONTROLLER =================

function viewPassbook(title, storageKey, matchName) {
    currentPassbookContext = { title: title, storageKey: storageKey, matchName: matchName };
    document.getElementById("modal-item-title").textContent = "📖 " + title;
    var hist = getStore(storageKey);
    var tbody = document.getElementById("modal-history-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var count = 0;
    hist.forEach(function(it, idx) {
        if (!it) return;
        var nMatch = (it.name && it.name.toLowerCase() === String(matchName || "").toLowerCase());
        var kMatch = (it.kariger && it.kariger.toLowerCase() === String(matchName || "").toLowerCase());

        if (nMatch || kMatch) {
            count++;
            tbody.innerHTML += "<tr>" +
                "<td>" + formatDateDisplay(it.date) + "</td>" +
                "<td>" + (it.type || "-") + "</td>" +
                "<td><strong>" + (it.qty || it.amount || it.pcs || 0) + "</strong></td>" +
                "<td style='text-align:center;'><button class='delete-btn' onclick='deletePassbookRow(" + idx + ")'>🗑️</button></td>" +
            "</tr>";
        }
    });

    if (!count) {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Koi record nahi mila.</td></tr>";
    }
    setDisplay("item-modal", "flex");
}

function deletePassbookRow(idx) {
    if (!currentPassbookContext || !confirm("Entry delete karna chahte hain?")) return;
    var hist = getStore(currentPassbookContext.storageKey);
    hist.splice(idx, 1);
    setStore(currentPassbookContext.storageKey, hist);

    viewPassbook(currentPassbookContext.title, currentPassbookContext.storageKey, currentPassbookContext.matchName);
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    if (typeof renderDashboardDayBook === "function") renderDashboardDayBook();
}

function closeItemModal() {
    setDisplay("item-modal", "none");
    currentPassbookContext = null;
}
