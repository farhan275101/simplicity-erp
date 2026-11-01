/* ========================================================
   SIMPLICITY ERP - DUKAN FINAL OUT ENGINE
   File: dukan/dukan.js • Developed by Farhan Jawed
======================================================== */

function getDukanTransfers() { 
    return safeArray(getStore("dukan_transfer_history")); 
}

function saveDukanTransfers(list) { 
    setStore("dukan_transfer_history", safeArray(list)); 
}

function addDukanTransferEntry() {
    var d = (document.getElementById("jw-dukan-date") && document.getElementById("jw-dukan-date").value) || getTodayDate();
    var pcs = parseInt(document.getElementById("jw-dukan-pcs") && document.getElementById("jw-dukan-pcs").value, 10) || 0;
    var note = (document.getElementById("jw-dukan-note") && document.getElementById("jw-dukan-note").value || "").trim();
    if (pcs <= 0) return alert("Pcs bharein!");

    var list = getDukanTransfers();
    var entryId = "duk_" + Date.now();
    list.push({ id: entryId, date: d, pcs: pcs, note: note || "Apni Dukan Transfer" });
    saveDukanTransfers(list);

    // Saree History me Dukan Outward Record (Finished Stock se Minus)
    var sH = safeArray(getStore("saree_history"));
    sH.push({
        id: "sh_dukan_" + Date.now(),
        refId: entryId,
        date: d,
        sareeName: "Finished Saree",
        karigerName: "Dukan Receiver",
        kariger: "Apni Dukan",
        karkhanaId: "k_main",
        type: "finished",
        typeLabel: "🏪 Dukan Bheja (" + (note || "Final Out") + ")",
        aai: 0,
        gai: pcs,
        isOut: true,
        note: note || "Dukan Bheja"
    });
    setStore("saree_history", sH);

    var pcsEl = document.getElementById("jw-dukan-pcs");
    var noteEl = document.getElementById("jw-dukan-note");
    if (pcsEl) pcsEl.value = "";
    if (noteEl) noteEl.value = "";

    renderDukanTransferTable();
    if (typeof updateJobWorkHubBadges === "function") updateJobWorkHubBadges();
    if (typeof renderSareeTable === "function") renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("✅ " + pcs + " Pcs Dukan bheje gaye aur Finished stock se minus ho gaye!");
}

function deleteDukanTransferEntry(idx) {
    if (!confirm("Kya delete karna chahte hain? Saree wapas stock me jud jayegi.")) return;
    var list = getDukanTransfers();
    var item = list[idx];
    if (!item) return;

    var refId = item.id;
    list.splice(idx, 1);
    saveDukanTransfers(list);

    setStore("saree_history", safeArray(getStore("saree_history")).filter(function(h) { 
        return !h || String(h.refId) !== String(refId); 
    }));

    renderDukanTransferTable();
    if (typeof updateJobWorkHubBadges === "function") updateJobWorkHubBadges();
    if (typeof renderSareeTable === "function") renderSareeTable();
    if (typeof updateDashboardBadgeTotals === "function") updateDashboardBadgeTotals();
    alert("🗑️ Entry delete ho gayi!");
}

function filterDukanTransfers() { 
    renderDukanTransferTable(); 
}

function resetDukanFilter() {
    var f = document.getElementById("jw-dukan-from-date");
    var t = document.getElementById("jw-dukan-to-date");
    if (f) f.value = "";
    if (t) t.value = "";
    renderDukanTransferTable();
}

function renderDukanTransferTable() {
    var tbody = document.getElementById("jw-dukan-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    var list = getDukanTransfers();
    var fDate = document.getElementById("jw-dukan-from-date") ? document.getElementById("jw-dukan-from-date").value : "";
    var tDate = document.getElementById("jw-dukan-to-date") ? document.getElementById("jw-dukan-to-date").value : "";

    var filteredList = list.filter(function(d) { return d && isDateInRange(d.date, fDate, tDate); });
    var totCalenderFinished = 0;
    
    if (typeof getJobWorkers === "function") {
        getJobWorkers().filter(function(w) { return w && w.type === "calender"; }).forEach(function(w) {
            getJobWorkerSheets(w.id).forEach(function(sh) {
                safeArray(sh.rows).forEach(function(r) { totCalenderFinished += (Number(r.aayiQty) || 0); });
            });
        });
    }

    var totDukanSent = 0;
    list.forEach(function(d) { totDukanSent += (Number(d.pcs) || 0); });
    var bachaInKarkhana = Math.max(0, totCalenderFinished - totDukanSent);

    var elCal = document.getElementById("jw-stat-calender-finished");
    var elSent = document.getElementById("jw-stat-dukan-sent");
    var elRem = document.getElementById("jw-stat-karkhana-bacha");
    if (elCal) elCal.textContent = totCalenderFinished + " Pcs";
    if (elSent) elSent.textContent = totDukanSent + " Pcs";
    if (elRem) elRem.textContent = bachaInKarkhana + " Pcs";

    if (!filteredList.length) {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Koi saree Dukan par nahi bheji gayi.</td></tr>";
        return;
    }

    filteredList.forEach(function(d, idx) {
        tbody.innerHTML += "<tr>" +
            "<td>" + formatDateDisplay(d.date) + "</td>" +
            "<td><strong style='color:#059669;'>+" + d.pcs + " Pcs</strong></td>" +
            "<td>" + (d.note || "Apni Dukan Transfer") + "</td>" +
            "<td style='text-align:center;'><button class='delete-btn' onclick='deleteDukanTransferEntry(" + idx + ")'>🗑️</button></td>" +
        "</tr>";
    });
}
