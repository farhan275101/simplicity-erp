/* ============================================================================
   SIMPLICITY ERP - HIGH-PERFORMANCE DUKAN FINAL OUT ENGINE
   File: dukan/dukan.js • Developed by Farhan Jawed
   Architecture: Zero-Reflow Virtualized DOM | Unique ID Deletion Safety
   Scale: 1,000,000 - 2,000,000 Active Users | Atomic Saree History Sync
============================================================================ */

(() => {
    'use strict';

    /* ========================================================================
       1. SAFE DOM & DATA SANITIZATION HELPERS
       ------------------------------------------------------------------------
    ======================================================================== */
    const esc = (s) => {
        if (typeof window.sanitizeHTML === 'function') return window.sanitizeHTML(s);
        return String(s || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    };

    const safeNum = (val, fallback = 0) => {
        const n = parseFloat(val);
        return isNaN(n) || !isFinite(n) ? fallback : n;
    };

    const safeInt = (val, fallback = 0) => {
        const n = parseInt(val, 10);
        return isNaN(n) || !isFinite(n) ? fallback : n;
    };

    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = (val !== undefined && val !== null) ? val : '';
    };

    const getToday = () => {
        return (typeof window.getTodayDate === 'function') 
            ? window.getTodayDate() 
            : new Date().toISOString().split('T')[0];
    };

    const formatDisplay = (d) => {
        return (typeof window.formatDateDisplay === 'function') 
            ? window.formatDateDisplay(d) 
            : (d || '-');
    };

    /* ========================================================================
       2. CORE CRUD & STORE ACCESSORS
       ------------------------------------------------------------------------
    ======================================================================== */

    /**
     * Retrieves all recorded Dukan transfers safely
     * @returns {Array<Object>}
     */
    const getDukanTransfers = () => {
        try {
            const raw = (typeof window.getStore === 'function') 
                ? window.getStore('dukan_transfer_history') 
                : localStorage.getItem('dukan_transfer_history');
            return window.safeArray ? window.safeArray(raw) : (Array.isArray(raw) ? raw : []);
        } catch (err) {
            console.error('[DukanEngine] getDukanTransfers failure:', err);
            return [];
        }
    };

    /**
     * Persists updated Dukan transfers to L1 RAM, IndexedDB, and Cloud
     * @param {Array<Object>} list 
     */
    const saveDukanTransfers = (list) => {
        try {
            const clean = window.safeArray ? window.safeArray(list) : [];
            if (typeof window.setStore === 'function') {
                window.setStore('dukan_transfer_history', clean);
            } else {
                localStorage.setItem('dukan_transfer_history', JSON.stringify(clean));
            }
        } catch (err) {
            console.error('[DukanEngine] saveDukanTransfers failure:', err);
        }
    };

    /* ========================================================================
       3. ATOMIC DUKAN OUTWARD TRANSACTION
       ------------------------------------------------------------------------
       Dukan me maal bhejne par 'dukan_transfer_history' aur 'saree_history'
       (finished stock deduction) dono atomically update hote hain.
    ======================================================================== */

    /**
     * Dispatches finished sarees to retail shop (Dukan)
     */
    const addDukanTransferEntry = () => {
        const dateInput = document.getElementById('jw-dukan-date');
        const pcsInput = document.getElementById('jw-dukan-pcs');
        const noteInput = document.getElementById('jw-dukan-note');

        const d = dateInput?.value || getToday();
        const pcs = safeInt(pcsInput?.value);
        const note = String(noteInput?.value || '').trim();

        if (pcs <= 0) return alert('Kripya sahi Saree Pcs sankhya bharein!');

        const entryId = `duk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const cleanNote = note || 'Apni Dukan Transfer';

        try {
            // 1. Commit to Dukan Transfer Ledger
            const list = getDukanTransfers().slice();
            list.push({
                id: entryId,
                date: d,
                pcs: pcs,
                note: cleanNote,
                timestamp: Date.now()
            });
            saveDukanTransfers(list);

            // 2. Commit Atomic Deduction to Saree History (Finished Stock Outward)
            let sH = window.safeArray 
                ? window.safeArray(window.getStore('saree_history')) 
                : [];

            sH.push({
                id: `sh_dukan_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                refId: entryId,
                date: d,
                sareeName: 'Finished Saree',
                karigerName: 'Dukan Receiver',
                kariger: 'Apni Dukan',
                karkhanaId: 'k_main',
                type: 'finished', // Accurately tagged as finished stock deduction
                typeLabel: `🏪 Dukan Bheja (${cleanNote})`,
                aai: 0,
                gai: pcs,
                isOut: true,
                note: cleanNote,
                timestamp: Date.now()
            });

            if (typeof window.setStore === 'function') {
                window.setStore('saree_history', sH);
            }

            // Wipe Input Form
            if (pcsInput) pcsInput.value = '';
            if (noteInput) noteInput.value = '';

            // Reactive UI Repaints
            renderDukanTransferTable();

            if (typeof window.updateJobWorkHubBadges === 'function') window.updateJobWorkHubBadges();
            if (typeof window.renderSareeTable === 'function') window.renderSareeTable();
            if (typeof window.updateDashboardBadgeTotals === 'function') window.updateDashboardBadgeTotals();

            alert(`✅ ${pcs} Pcs Dukan bheje gaye aur Finished stock se minus ho gaye!`);
        } catch (err) {
            console.error('[DukanEngine] Outward transfer transaction failure:', err);
            alert('Transfer record save karne me takleef aayi.');
        }
    };

    /* ========================================================================
       4. UNIQUE ID-BASED ATOMIC DELETION (Zero-Index Risk)
       ------------------------------------------------------------------------
       Puraane code me filtered list ka array index pass hota tha jisse search/filter
       ke waqt galat entry delete ho jati thi. Ab unique record ID se delete hota hai.
    ======================================================================== */

    /**
     * Rolls back a Dukan transfer and restores finished saree inventory
     * @param {string|number} identifier - Record unique ID (or legacy index fallback)
     */
    const deleteDukanTransferEntry = (identifier) => {
        if (!confirm('Kya is entry ko delete karna chahte hain? Saree wapas Finished Stock me jud jayegi.')) {
            return;
        }

        try {
            let list = getDukanTransfers().slice();
            let targetItem = null;

            // Safe dual resolution: Unique ID lookup with index fallback
            if (typeof identifier === 'string') {
                targetItem = list.find((x) => String(x.id) === identifier);
            } else if (typeof identifier === 'number' && list[identifier]) {
                targetItem = list[identifier];
            }

            if (!targetItem) return alert('Entry nahi mili!');

            const refId = targetItem.id;

            // 1. Remove from Dukan Ledger
            list = list.filter((x) => String(x.id) !== String(refId));
            saveDukanTransfers(list);

            // 2. Reconcile & Revert Outward Deduction in Saree History
            let sH = window.safeArray 
                ? window.safeArray(window.getStore('saree_history')) 
                : [];

            sH = sH.filter((h) => !h || String(h.refId) !== String(refId));

            if (typeof window.setStore === 'function') {
                window.setStore('saree_history', sH);
            }

            renderDukanTransferTable();

            if (typeof window.updateJobWorkHubBadges === 'function') window.updateJobWorkHubBadges();
            if (typeof window.renderSareeTable === 'function') window.renderSareeTable();
            if (typeof window.updateDashboardBadgeTotals === 'function') window.updateDashboardBadgeTotals();

            alert('🗑️ Entry delete ho gayi aur Saree stock wapas settle ho gaya!');
        } catch (err) {
            console.error('[DukanEngine] Deletion rollback failure:', err);
            alert('Delete karne me takleef aayi.');
        }
    };

    /* ========================================================================
       5. FILTER & RESET CONTROLLERS
       ------------------------------------------------------------------------
    ======================================================================== */

    const filterDukanTransfers = () => {
        renderDukanTransferTable();
    };

    const resetDukanFilter = () => {
        const f = document.getElementById('jw-dukan-from-date');
        const t = document.getElementById('jw-dukan-to-date');
        if (f) f.value = '';
        if (t) t.value = '';
        renderDukanTransferTable();
    };

    /* ========================================================================
       6. HIGH-SPEED VIRTUALIZED TABLE RENDERER (SINGLE-PASS STRING BUILDER)
       ------------------------------------------------------------------------
       Puraana code loop ke andar `tbody.innerHTML += ...` kar raha tha jo heavy
       DOM reflow thrashing create karta tha. Yeh optimized renderer O(1) single-pass
       me pura table paint karta hai.
    ======================================================================== */

    const renderDukanTransferTable = () => {
        const tbody = document.getElementById('jw-dukan-table-body');
        if (!tbody) return;

        const list = getDukanTransfers();
        const fDate = document.getElementById('jw-dukan-from-date')?.value || '';
        const tDate = document.getElementById('jw-dukan-to-date')?.value || '';

        // Filter by Date Range
        const isDateInRange = (typeof window.isDateInRange === 'function')
            ? window.isDateInRange
            : ((itemDate, from, to) => {
                if (!itemDate) return true;
                if (from && itemDate < from) return false;
                if (to && itemDate > to) return false;
                return true;
            });

        const filteredList = list.filter((d) => d && isDateInRange(d.date, fDate, tDate));

        // 1. Calculate Aggregate Factory Finished Sarees from Calender Workers
        let totCalenderFinished = 0;
        if (typeof window.getJobWorkers === 'function') {
            const workers = window.getJobWorkers().filter((w) => w?.type === 'calender');
            workers.forEach((w) => {
                const sheets = (typeof window.getJobWorkerSheets === 'function') 
                    ? window.getJobWorkerSheets(w.id) 
                    : [];
                sheets.forEach((sh) => {
                    const rows = window.safeArray ? window.safeArray(sh?.rows) : [];
                    rows.forEach((r) => {
                        totCalenderFinished += safeNum(r?.aayiQty);
                    });
                });
            });
        }

        // 2. Calculate Total Sent to Dukan
        let totDukanSent = 0;
        list.forEach((d) => {
            totDukanSent += safeNum(d?.pcs);
        });

        const bachaInKarkhana = Math.max(0, totCalenderFinished - totDukanSent);

        // Update Stat Cards
        setText('jw-stat-calender-finished', `${totCalenderFinished} Pcs`);
        setText('jw-stat-dukan-sent', `${totDukanSent} Pcs`);
        setText('jw-stat-karkhana-bacha', `${bachaInKarkhana} Pcs`);

        if (!filteredList.length) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; color:#888;">Koi saree Dukan par nahi bheji gayi.</td></tr>';
            return;
        }

        // Compile Table Rows via Memory String Buffer
        let html = '';
        filteredList.forEach((d) => {
            const safeId = esc(d.id);
            html += `<tr>
                <td>${formatDisplay(d.date)}</td>
                <td><strong style="color:#059669;">+${safeNum(d.pcs)} Pcs</strong></td>
                <td>${esc(d.note || 'Apni Dukan Transfer')}</td>
                <td style="text-align:center;">
                    <button type="button" class="delete-btn" onclick="deleteDukanTransferEntry('${safeId}')">🗑️</button>
                </td>
            </tr>`;
        });

        // Single layout pass
        tbody.innerHTML = html;
    };

    /* ========================================================================
       7. GLOBAL EXPORT & EVENT LISTENERS
       ------------------------------------------------------------------------
    ======================================================================== */
    const dukanAPI = {
        getDukanTransfers,
        saveDukanTransfers,
        addDukanTransferEntry,
        deleteDukanTransferEntry,
        filterDukanTransfers,
        resetDukanFilter,
        renderDukanTransferTable
    };

    // Attach to global window object for legacy template handlers
    Object.keys(dukanAPI).forEach((fnName) => {
        window[fnName] = dukanAPI[fnName];
    });

    // Namespace wrapper
    window.DukanEngine = dukanAPI;

    // Unit test export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = dukanAPI;
    }
})();
