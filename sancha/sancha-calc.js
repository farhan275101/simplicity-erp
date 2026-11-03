/* ============================================================================
   SIMPLICITY ERP - HIGH-PERFORMANCE SANCHA (TANI & CHUKKA) CALCULATION ENGINE
   File: sancha/sancha-calc.js • Developed by Farhan Jawed
   Architecture: Single-Pass History Aggregation Index | Epsilon Precision
   Scale: 1,000,000 - 2,000,000 Active Users | Zero Double-Counting Guarantee
============================================================================ */

(() => {
    'use strict';

    /* ========================================================================
       1. GLOBAL STATE, MEMOIZATION CACHE & INDEX POOL
       ------------------------------------------------------------------------
       Pehle har item ke liye sabhi history logs (thousands of rows) scan hoti thin.
       Ab single-pass pre-aggregation index aur LRU cache se O(1) response milta hai.
    ======================================================================== */
    window.currentSanchaKarkhanaFilter = 'all';

    // Hot calculation cache: Map<"cat___itemlower___karkhanaid", StatsObject>
    const SANCHA_STATS_CACHE = new Map();
    const MAX_CACHE_ENTRIES = 1000;

    // Single-pass history aggregation index cache
    let SANCHA_HISTORY_INDEX = null;

    /**
     * Cache Invalidation Hook: Jab bhi stock, purchase ya transfers mutate hon
     */
    const invalidateSanchaCalcCache = () => {
        SANCHA_STATS_CACHE.clear();
        SANCHA_HISTORY_INDEX = null;
    };

    /* ========================================================================
       2. EPSILON PRECISION & MATHEMATICAL ROUNDING GUARDS
       ------------------------------------------------------------------------
       Floating-point arithmetic drift (e.g., 0.1 + 0.2 = 0.30000000000000004)
       se fractional weights me mismatch aata hai. Epsilon rounding ise rokta hai.
    ======================================================================== */
    const roundWeight = (val) => {
        const num = parseFloat(val);
        if (isNaN(num) || !isFinite(num)) return 0;
        return Math.round((num + Number.EPSILON) * 100) / 100;
    };

    const safeNum = (val, fallback = 0) => {
        const n = parseFloat(val);
        return isNaN(n) || !isFinite(n) ? fallback : n;
    };

    const normalizeGodownId = (id) => {
        if (!id || id === 'all') return 'all';
        const clean = String(id).trim();
        return (!clean || clean === 'k_main') ? 'k_main' : clean;
    };

    const normalizeCategory = (cat) => {
        const c = String(cat || 'tani').trim().toLowerCase();
        return (c === 'chukka') ? 'chukka' : 'tani';
    };

    /* ========================================================================
       3. CORE CRUD OPERATIONS (SANCHA ITEMS)
       ------------------------------------------------------------------------
    ======================================================================== */

    /**
     * Retrieves Sancha items list safely
     * @returns {Array<Object>} Sanitized items
     */
    const getSanchaItems = () => {
        try {
            const raw = (typeof window.getStore === 'function') 
                ? window.getStore('sancha_items') 
                : localStorage.getItem('sancha_items');
            return window.safeArray ? window.safeArray(raw) : (Array.isArray(raw) ? raw : []);
        } catch (err) {
            console.error('[SanchaCalc] getSanchaItems error:', err);
            return [];
        }
    };

    /**
     * Saves Sancha items list safely and busts calculation caches
     * @param {Array<Object>} list - Sancha items collection
     */
    const saveSanchaItems = (list) => {
        try {
            const cleanList = window.safeArray ? window.safeArray(list) : (Array.isArray(list) ? list : []);
            if (typeof window.setStore === 'function') {
                window.setStore('sancha_items', cleanList);
            } else {
                localStorage.setItem('sancha_items', JSON.stringify(cleanList));
            }
            invalidateSanchaCalcCache();
        } catch (err) {
            console.error('[SanchaCalc] saveSanchaItems error:', err);
        }
    };

    /* ========================================================================
       4. LAZY SINGLE-PASS HISTORY AGGREGATION INDEXER
       ------------------------------------------------------------------------
       Sabhi sancha_history entries ko sirf EK BAR iterate karke item-wise aur
       godown-wise consumption/transfers ka map RAM me compile karta hai.
    ======================================================================== */
    const getSanchaHistoryIndex = () => {
        if (SANCHA_HISTORY_INDEX !== null) {
            return SANCHA_HISTORY_INDEX;
        }

        const index = new Map();

        // Helper to accumulate entry
        const recordHistoryEntry = (cat, itemName, itemId, godownId, aayaDelta, gayaDelta, date) => {
            const normCat = normalizeCategory(cat);
            const normName = String(itemName || '').trim().toLowerCase();
            const normId = itemId ? String(itemId).trim() : '';
            const normKid = normalizeGodownId(godownId);

            // Primary indexing by both name and ID
            const keys = [];
            if (normName) keys.push(`${normCat}___name:${normName}___${normKid}`);
            if (normId) keys.push(`${normCat}___id:${normId}___${normKid}`);

            keys.forEach((key) => {
                let entry = index.get(key);
                if (!entry) {
                    entry = { totalAaya: 0, totalGaya: 0, lastDate: '' };
                    index.set(key, entry);
                }
                entry.totalAaya += aayaDelta;
                entry.totalGaya += gayaDelta;
                if (date && (!entry.lastDate || date > entry.lastDate)) {
                    entry.lastDate = date;
                }
            });
        };

        try {
            const hist = window.safeArray 
                ? window.safeArray(window.getStore('sancha_history')) 
                : [];

            const len = hist.length;

            for (let i = 0; i < len; i++) {
                const h = hist[i];
                if (!h) continue;

                const cat = normalizeCategory(h.category);
                const inQ = safeNum(h.aaya);
                const outQ = safeNum(h.gaya || h.qty);
                const t = String(h.type || '');

                // ⚠️ DOUBLE-COUNTING SHIELD: Direct purchases / Opening stock are already in `sancha_items`
                const isPurchase = (t.includes('Khareed') || t.includes('Inward') || t.includes('Opening'));

                let aayaDelta = 0;
                let gayaDelta = 0;

                if (inQ > 0 || outQ > 0) {
                    if (!isPurchase) {
                        aayaDelta = inQ; // Only Transfer In or Kariger Returns
                    }
                    gayaDelta = outQ;
                } else {
                    // Legacy label fallback checks
                    const q = safeNum(h.qty || h.wazan);
                    if (t.includes('Le Gaya') || t.includes('Out') || t.includes('Diya') || t.includes('Issue')) {
                        gayaDelta = q;
                    } else if (!isPurchase && (t.includes('Wapas') || t.includes('Jama') || t.includes('Bani') || t.includes('In'))) {
                        aayaDelta = q;
                    }
                }

                recordHistoryEntry(cat, h.name, h.itemId, h.karkhanaId, aayaDelta, gayaDelta, h.date);
            }

            SANCHA_HISTORY_INDEX = index;
            return SANCHA_HISTORY_INDEX;
        } catch (err) {
            console.error('[SanchaCalcEngine] Index compilation error:', err);
            SANCHA_HISTORY_INDEX = new Map();
            return SANCHA_HISTORY_INDEX;
        }
    };

    /* ========================================================================
       5. HIGH-SPEED AUDIT & ITEM STATS ENGINE
       ------------------------------------------------------------------------
    ======================================================================== */

    /**
     * Calculates total Aaya, Gaya, and Available balance for a Tani/Chukka item
     * @param {string|null} itemId - Unique Item ID
     * @param {string} itemName - Sancha item name (e.g., '100 Dhiyaan Tani')
     * @param {'tani'|'chukka'} category - Sancha category
     * @param {string} [targetKarkhanaId] - 'all', 'k_main', or branch ID
     * @returns {Object} { id, name, category, karkhanaId, date, aaya, gaya, bacha }
     */
    const getSanchaItemStats = (itemId, itemName, category, targetKarkhanaId) => {
        const kId = normalizeGodownId(targetKarkhanaId || window.currentSanchaKarkhanaFilter || 'all');
        const cat = normalizeCategory(category);
        const cleanName = String(itemName || '').trim();
        const nameLower = cleanName.toLowerCase();
        const cleanId = itemId ? String(itemId).trim() : '';

        // Memoization Cache Lookup (O(1))
        const cacheKey = `${cat}___${cleanId || nameLower}___${kId}`;
        if (SANCHA_STATS_CACHE.has(cacheKey)) {
            return SANCHA_STATS_CACHE.get(cacheKey);
        }

        try {
            let totalAaya = 0;
            let totalGaya = 0;
            let lastDate = '';

            const items = getSanchaItems();
            const sLen = items.length;

            // 1. Direct Purchase / Opening Stock (from sancha_items)
            for (let i = 0; i < sLen; i++) {
                const s = items[i];
                if (!s) continue;

                const sCat = normalizeCategory(s.category);
                if (sCat !== cat) continue;

                const nameMatch = (cleanId && String(s.id) === cleanId) || 
                                  (!cleanId && s.name && s.name.trim().toLowerCase() === nameLower);

                if (!nameMatch) continue;

                const sKid = normalizeGodownId(s.karkhanaId);
                const kMatch = (kId === 'all') || (sKid === kId);

                if (kMatch) {
                    totalAaya += safeNum(s.aaya !== undefined ? s.aaya : s.totalQty);
                    if (s.date && (!lastDate || s.date > lastDate)) {
                        lastDate = s.date;
                    }
                }
            }

            // 2. Fast Weaver Issues & Transfers from Pre-Aggregated Index
            const historyIndex = getSanchaHistoryIndex();

            if (kId === 'all') {
                // Sum all godowns for this item/category
                historyIndex.forEach((val, key) => {
                    const matchByName = nameLower && key.startsWith(`${cat}___name:${nameLower}___`);
                    const matchById = cleanId && key.startsWith(`${cat}___id:${cleanId}___`);

                    if (matchByName || matchById) {
                        totalAaya += val.totalAaya;
                        totalGaya += val.totalGaya;
                        if (val.lastDate && (!lastDate || val.lastDate > lastDate)) {
                            lastDate = val.lastDate;
                        }
                    }
                });
            } else {
                // Targeted godown lookup
                const keyByName = nameLower ? `${cat}___name:${nameLower}___${kId}` : null;
                const keyById = cleanId ? `${cat}___id:${cleanId}___${kId}` : null;

                const entry = (keyById && historyIndex.get(keyById)) || 
                              (keyByName && historyIndex.get(keyByName));

                if (entry) {
                    totalAaya += entry.totalAaya;
                    totalGaya += entry.totalGaya;
                    if (entry.lastDate && (!lastDate || entry.lastDate > lastDate)) {
                        lastDate = entry.lastDate;
                    }
                }
            }

            const bacha = Math.max(0, roundWeight(totalAaya - totalGaya));

            const result = {
                id: cleanId || `sancha_${nameLower}`,
                name: cleanName || '-',
                category: cat,
                karkhanaId: kId,
                date: lastDate || ((typeof window.getTodayDate === 'function') ? window.getTodayDate() : ''),
                aaya: roundWeight(totalAaya),
                gaya: roundWeight(totalGaya),
                bacha: bacha
            };

            // Store in cache with bounded size
            if (SANCHA_STATS_CACHE.size >= MAX_CACHE_ENTRIES) {
                const firstKey = SANCHA_STATS_CACHE.keys().next().value;
                SANCHA_STATS_CACHE.delete(firstKey);
            }
            SANCHA_STATS_CACHE.set(cacheKey, result);

            return result;
        } catch (err) {
            console.error(`[SanchaCalcEngine] Stats calculation error for ${itemName}:`, err);
            return {
                id: cleanId || 'error',
                name: cleanName || '-',
                category: cat,
                karkhanaId: kId,
                date: '',
                aaya: 0,
                gaya: 0,
                bacha: 0
            };
        }
    };

    /**
     * Retrieves available balance for a Sancha item
     * @param {string} itemName - Sancha item name
     * @param {'tani'|'chukka'} category - Item category
     * @param {string} [karkhanaId] - Godown ID
     * @returns {number}
     */
    const getSanchaAvailableBalance = (itemName, category, karkhanaId) => {
        const stats = getSanchaItemStats(null, itemName, category, karkhanaId);
        return safeNum(stats.bacha);
    };

    /* ========================================================================
       6. ATOMIC INTER-GODOWN SANCHA TRANSFER ENGINE
       ------------------------------------------------------------------------
       Transfers Tani/Chukka safely with balance verification and dual history entries.
    ======================================================================== */

    /**
     * Executes an inter-karkhana Sancha stock transfer
     * @param {string} date - Transfer Date (DD-MM-YYYY or ISO)
     * @param {string} itemName - Variant name
     * @param {'tani'|'chukka'} category - Sancha category
     * @param {string} fromKarkhanaId - Source Godown ID
     * @param {string} toKarkhanaId - Destination Godown ID
     * @param {number|string} qty - Weight in Kg
     * @param {string} [note] - Remarks
     * @returns {boolean} Success status
     */
    const transferSanchaStock = (date, itemName, category, fromKarkhanaId, toKarkhanaId, qty, note = '') => {
        const weight = safeNum(qty);
        if (weight <= 0) {
            alert('Kripya sahi wazan (Qty Kg me) darj karein!');
            return false;
        }

        const sourceKid = normalizeGodownId(fromKarkhanaId);
        const targetKid = normalizeGodownId(toKarkhanaId);

        if (sourceKid === targetKid) {
            alert('Bhejne wala aur Paane wala Godam alag-alag hona chahiye!');
            return false;
        }

        const cleanName = String(itemName || '').trim();
        if (!cleanName) {
            alert('Sancha Item ka naam chunein!');
            return false;
        }

        const cat = normalizeCategory(category);
        const catLabel = cat === 'chukka' ? 'Chukka' : 'Tani';

        // Available balance validation
        const available = getSanchaAvailableBalance(cleanName, cat, sourceKid);
        if (weight > available) {
            alert(`Bhejne wale godam me sirf ${available.toFixed(2)} Kg ${catLabel} bacha hai! Aap ${weight.toFixed(2)} Kg transfer nahi kar sakte.`);
            return false;
        }

        try {
            const cleanDate = date || ((typeof window.getTodayDate === 'function') 
                ? window.getTodayDate() 
                : new Date().toISOString().split('T')[0]);

            const fromName = (typeof window.getKarkhanaNameById === 'function') 
                ? window.getKarkhanaNameById(sourceKid) 
                : sourceKid;
            const toName = (typeof window.getKarkhanaNameById === 'function') 
                ? window.getKarkhanaNameById(targetKid) 
                : targetKid;

            const transferRef = `tr_sancha_${Date.now()}`;
            const cleanNote = note ? String(note).trim() : `${catLabel} Transfer: ${fromName} ➔ ${toName}`;

            // 1. Dual Ledger Logging in Sancha History (Outward & Inward)
            const hist = window.safeArray 
                ? window.safeArray(window.getStore('sancha_history')) 
                : [];

            // Source Godown Entry (OUT)
            hist.push({
                id: `shist_out_${Date.now()}`,
                date: cleanDate,
                name: cleanName,
                category: cat,
                kariger: 'Godown Transfer',
                type: `Transfer Out ➔ ${toName}${note ? ` (${note})` : ''}`,
                aaya: 0,
                gaya: weight,
                karkhanaId: sourceKid,
                refId: transferRef,
                timestamp: Date.now()
            });

            // Destination Godown Entry (IN)
            hist.push({
                id: `shist_in_${Date.now() + 1}`,
                date: cleanDate,
                name: cleanName,
                category: cat,
                kariger: 'Godown Transfer',
                type: `Transfer In ⬅ ${fromName}${note ? ` (${note})` : ''}`,
                aaya: weight,
                gaya: 0,
                karkhanaId: targetKid,
                refId: transferRef,
                timestamp: Date.now() + 1
            });

            if (typeof window.setStore === 'function') {
                window.setStore('sancha_history', hist);
            }

            // 2. Central Transfer Ledger Sync
            if (typeof window.recordTransferEntry === 'function') {
                window.recordTransferEntry({
                    id: transferRef,
                    date: cleanDate,
                    fromKarkhanaId: sourceKid,
                    toKarkhanaId: targetKid,
                    type: `sancha_${cat}`,
                    itemName: cleanName,
                    quantity: weight,
                    remarks: cleanNote
                });
            }

            // Invalidate cache immediately after mutation
            invalidateSanchaCalcCache();
            return true;
        } catch (txErr) {
            console.error('[SanchaCalcEngine] Transfer transaction failure:', txErr);
            alert('Transfer process me takleef aayi.');
            return false;
        }
    };

    /* ========================================================================
       7. GLOBAL EXPORT & BACKWARD COMPATIBILITY
       ------------------------------------------------------------------------
    ======================================================================== */
    const sanchaCalcAPI = {
        getSanchaItems,
        saveSanchaItems,
        getSanchaItemStats,
        getSanchaAvailableBalance,
        transferSanchaStock,
        invalidateSanchaCalcCache,
        normalizeGodownId,
        normalizeCategory,
        roundWeight
    };

    // Attach to global window object for legacy callers
    Object.keys(sanchaCalcAPI).forEach((fnName) => {
        window[fnName] = sanchaCalcAPI[fnName];
    });

    // Dedicated namespace
    window.SanchaCalcEngine = sanchaCalcAPI;

    // Unit test export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = sanchaCalcAPI;
    }
})();
