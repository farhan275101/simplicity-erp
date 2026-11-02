/* ========================================================
   SIMPLICITY ERP - BOOTI CUTTING CALCULATION ENGINE
   File: cutting/cutting-calc.js • Developed by Farhan Jawed
   (Accurate Calender Outward Filter • Zero-Leakage Safe)
======================================================== */

function getCuttingSareeLiveStats() {
    var totCuttingAayi = 0;
    var totSentToCalender = 0;
    var allWorkers = typeof getJobWorkers === "function" ? getJobWorkers() : [];

    // 1. Cutting Karigers se kul kitni saree tayyar aayi
    allWorkers.filter(function(w) { return w && w.type === "cutting"; }).forEach(function(w) {
        getJobWorkerSheets(w.id).forEach(function(sh) {
            safeArray(sh.rows).forEach(function(r) { 
                totCuttingAayi += (Number(r.aayiQty) || 0); 
            });
        });
    });

    // 2. Calender me SIRF wahi saree count hogi jo sach me Cutting se bheji gayi ho (Fresh wali nahi)
    allWorkers.filter(function(w) { return w && w.type === "calender"; }).forEach(function(w) {
        getJobWorkerSheets(w.id).forEach(function(sh) {
            safeArray(sh.rows).forEach(function(r) {
                var src = String(r && r.stockSource ? r.stockSource : "").toLowerCase().trim();
                if (src === "cutting") {
                    totSentToCalender += (Number(r.gayiQty) || 0);
                }
            });
        });
    });

    return {
        totAayi: totCuttingAayi,
        sentToCal: totSentToCalender,
        bacha: Math.max(0, totCuttingAayi - totSentToCalender)
    };
}
