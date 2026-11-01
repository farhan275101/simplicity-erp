/* ========================================================
   SIMPLICITY ERP - BOOTI CUTTING CALCULATION ENGINE
   File: cutting/cutting-calc.js • Developed by Farhan Jawed
======================================================== */

function getCuttingSareeLiveStats() {
    var totCuttingAayi = 0;
    var totSentToCalender = 0;
    var allWorkers = typeof getJobWorkers === "function" ? getJobWorkers() : [];

    allWorkers.filter(function(w) { return w && w.type === "cutting"; }).forEach(function(w) {
        getJobWorkerSheets(w.id).forEach(function(sh) {
            safeArray(sh.rows).forEach(function(r) { totCuttingAayi += (Number(r.aayiQty) || 0); });
        });
    });

    allWorkers.filter(function(w) { return w && w.type === "calender"; }).forEach(function(w) {
        getJobWorkerSheets(w.id).forEach(function(sh) {
            safeArray(sh.rows).forEach(function(r) {
                if (r && r.stockSource === "cutting") totSentToCalender += (Number(r.gayiQty) || 0);
            });
        });
    });

    return {
        totAayi: totCuttingAayi,
        sentToCal: totSentToCalender,
        bacha: Math.max(0, totCuttingAayi - totSentToCalender)
    };
}
