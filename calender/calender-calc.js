/* ========================================================
   SIMPLICITY ERP - CALENDER CALCULATION ENGINE
   File: calender/calender-calc.js • Developed by Farhan Jawed
======================================================== */

function getCalenderFinishedLiveStats() {
    var totCalAayi = 0;
    var allWorkers = typeof getJobWorkers === "function" ? getJobWorkers() : [];

    allWorkers.filter(function(w) { return w && w.type === "calender"; }).forEach(function(w) {
        getJobWorkerSheets(w.id).forEach(function(sh) {
            safeArray(sh.rows).forEach(function(r) { totCalAayi += (Number(r.aayiQty) || 0); });
        });
    });

    return {
        totFinished: totCalAayi
    };
}
