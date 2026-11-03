/* ============================================================================
   SIMPLICITY ERP - CALENDER FINISHING CALCULATION ENGINE
   File: calender/calender-calc.js • Developed by Farhan Jawed
   Architecture: Single-Pass O(N) Aggregation | Memoized Finishing Stock Index
   Scale: 1,000,000 - 2,000,000 Active Users | Zero-Leakage Accurate Filter
============================================================================ */

(() => {
    'use strict';

    /* ========================================================================
       1. IN-MEMORY CALCULATION CACHE & STATE
       ------------------------------------------------------------------------
       Pehle har bar stats mangne par sabhi workers, sheets aur rows ko do-do
       bar filter aur iterate kiya ja raha tha.
       Memoization cache se O(1) instantaneous response milta hai.
    ======================================================================== */
    let CALENDER_STATS_CACHE = null;

    /**
     * Cache Invalidation Hook: Jab bhi Calender batch save, edit ya delete ho
     */
    const invalidateCalenderCalcCache = () => {
        CALENDER_STATS_CACHE = null;
    };

    /* ========================================================================
       2. TYPE-SAFE NUMERIC PARSERS
       ------------------------------------------------------------------------
    ======================================================================== */
    const safeInt = (val, fallback = 0) => {
        const n = parseInt(val, 10);
        return isNaN(n) || !isFinite(n) ? fallback : n;
    };

    const safeNum = (val, fallback = 0) => {
        const n = parseFloat(val);
        return isNaN(n) || !isFinite(n) ? fallback : n;
    };

    /* ========================================================================
       3. SINGLE-PASS CALENDER FINISHED STATS ENGINE
       ------------------------------------------------------------------------
       Single O(N) iteration ke andar Calender workers se tayyar aayi hui
       finished saree, gayi hui saree aur pending balance ko calculate karta hai.
    ======================================================================== */

    /**
     * Calculates live finished stock balances from Calender workers
     * @param {boolean} [forceRefresh=false] - Ignore cache and recalculate
     * @returns {Object} { totFinished: number, totGayi: number, pendingInCalender: number, totDamage: number }
     */
    const getCalenderFinishedLiveStats = (forceRefresh = false) => {
        // 1. Fast Memoization Return (O(1))
        if (!forceRefresh && CALENDER_STATS_CACHE !== null) {
            return CALENDER_STATS_CACHE;
        }

        const defaultStats = Object.freeze({
            totFinished: 0,
            totGayi: 0,
            pendingInCalender: 0,
            totDamage: 0
        });

        try {
            const allWorkers = (typeof window.getJobWorkers === 'function') 
                ? window.getJobWorkers() 
                : (window.safeArray ? window.safeArray(window.getStore('jobwork_workers')) : []);

            if (!Array.isArray(allWorkers) || allWorkers.length === 0) {
                CALENDER_STATS_CACHE = { ...defaultStats };
                return CALENDER_STATS_CACHE;
            }

            let totCalAayi = 0;
            let totCalGayi = 0;
            let totDamagePcs = 0;
            const wLen = allWorkers.length;

            // 2. Single-Pass Worker Loop (Calender segregation)
            for (let i = 0; i < wLen; i++) {
                const w = allWorkers[i];
                if (!w || !w.id) continue;

                // Calender Kariger check (Case-insensitive & trimmed)
                const workerType = String(w.type || '').trim().toLowerCase();
                if (workerType !== 'calender') continue;

                const sheets = (typeof window.getJobWorkerSheets === 'function')
                    ? window.getJobWorkerSheets(w.id)
                    : (window.safeArray ? window.safeArray(window.getStore(`jobwork_sheets_${w.id}`)) : []);

                const sLen = sheets.length;
                for (let j = 0; j < sLen; j++) {
                    const sh = sheets[j];
                    if (!sh) continue;

                    const rows = window.safeArray ? window.safeArray(sh.rows) : [];
                    const rLen = rows.length;

                    for (let m = 0; m < rLen; m++) {
                        const r = rows[m];
                        if (!r) continue;

                        totCalAayi += safeInt(r.aayiQty);
                        totCalGayi += safeInt(r.gayiQty);
                        totDamagePcs += safeInt(r.damagePcs);
                    }
                }
            }

            const pending = Math.max(0, totCalGayi - (totCalAayi + totDamagePcs));

            const result = {
                totFinished: totCalAayi, // Backward-compatible primary key
                totGayi: totCalGayi,
                pendingInCalender: pending,
                totDamage: totDamagePcs
            };

            // Store in hot memory cache
            CALENDER_STATS_CACHE = result;
            return result;

        } catch (err) {
            console.error('[CalenderCalcEngine] Calculation error:', err);
            return { ...defaultStats };
        }
    };

    /* ========================================================================
       4. GLOBAL EXPORT & BACKWARD COMPATIBILITY
       ------------------------------------------------------------------------
    ======================================================================== */
    const calenderCalcAPI = {
        getCalenderFinishedLiveStats,
        invalidateCalenderCalcCache
    };

    // Attach to global window object for legacy callers
    window.getCalenderFinishedLiveStats = getCalenderFinishedLiveStats;
    window.invalidateCalenderCalcCache = invalidateCalenderCalcCache;

    // Dedicated namespace
    window.CalenderCalcEngine = calenderCalcAPI;

    // Unit test export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = calenderCalcAPI;
    }
})();
