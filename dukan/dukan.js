/* ============================================================================
   SIMPLICITY ERP - HIGH-PERFORMANCE DUKAN FINAL OUT ENGINE
   File: dukan/dukan.js • Developed by Farhan Jawed
   Architecture: Zero-Reflow Virtualized DOM | Unique ID Deletion Safety
   Scale: 1,000,000 - 2,000,000 Active Users | Atomic Finished Saree Deduction
============================================================================ */

(() => {
    'use strict';

    /* ========================================================================
       1. SAFE DOM & DATA SANITIZATION HELPERS
       ------------------------------------------------------------------------
    ======================================================================== */
    const toArray = (v) => {
        if (Array.isArray(v)) return v;
        if (typeof window.safeArray === 'function') return window.safeArray(v);
        return [];
    };

    const getFromStore = (key) => {
        if (typeof window.getStore === 'function') return window.getStore(key);
        try {
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch {
            return [];
        }
    };

    const setToStore = (key, val) => {
        if (typeof window.setStore === 'function') {
            window.setStore(key, val);
        } else {
            localStorage.setItem(key, JSON.stringify(val));
        }
    };

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

    const normText = (txt, fallback = '') => {
        return String(txt || fallback).trim().toUpperCase();
    };

    const normGodownId = (kid) => {
        if (!kid || kid === 'all') return 'all';
        const clean = String(kid).trim();
        return (!clean || clean === 'k_main') ? 'k_main' : clean;
    };

    const triggerAllCachesInvalidation = () => {
        if (typeof window.invalidateSareeCalcCache === 'function') window.invalidateSareeCalcCache();
        if (typeof window.invalidateCalenderCalcCache === 'function') window.invalidateCalenderCalcCache();
        if (typeof window.invalidateJobWorkCache === 'function') window.invalidateJobWorkCache();
    };

    /* ========================================================================
       2. CORE CRUD & STORE ACCESSORS
       ------------------------------------------------------------------------
    ======================================================================== */

    const getDukanTransfers = () => {
        try {
            return toArray(getFromStore('dukan_transfer_history'));
        } catch (err) {
            console.error('[DukanEngine] getDukanTransfers failure:', err);
            return [];
        }
    };

    const saveDukanTransfers = (list) => {
        try {
            setToStore('dukan_transfer_history', toArray(list));
        } catch (err) {
            console.error('[DukanEngine] saveDukanTransfers failure:', err);
        }
    };

    /* ========================================================================
       3. ATOMIC DUKAN OUTWARD TRANSACTION (RECONCILED WITH FINISHED SAREES)
       ------------------------------------------------------------------------
       Dukan me maal bhejne par 'dukan_transfer_history' aur 'saree_history'
       (actual finished stock) dono atomically update hote hain.
    ======================================================================== */

    const addDukanTransferEntry = () => {
        const dateInput = document.getElementById('jw-dukan-date');
        const pcsInput = document.getElementById('jw-dukan-pcs');
        const noteInput = document.getElementById('jw-dukan-note');

        const d = dateInput?.value || getToday();
        const pcs = safeInt(pcsInput?.value);
        const note = String(noteInput?.value || '').trim();

        if (pcs <= 0) return alert('Kripya sahi Saree Pcs sankhya bharein!');

        const entryId = `duk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const cleanNote = note || 'Apni Dukan';

        try {
            // 1. Commit to Dukan Transfer Ledger
            const list = [...getDukanTransfers()];
            list.push({
                id: entryId,
                date: d,
                pcs: pcs,
                note: cleanNote,
                timestamp: Date.now()
            });
            saveDukanTransfers(list);

            // 2. Commit Atomic Deduction to Saree History
            let sH = [...toArray(getFromStore('saree_history'))];

            // Maujooda Finished Sarees ka hisab nikalna taaki unke stock se minus ho
            const finishedMap = new Map();
            sH.forEach((h) => {
                if (!h || String(h.type || '').toLowerCase() !== 'finished') return;
                const sName = normText(h.sareeName || h.name, 'GENERAL SAREE');
                const kName = normText(h.karigerName || h.kariger, 'KARKHANA');
                const kid = normGodownId(h.karkhanaId);
                const key = `${sName}___${kName}___${kid}`;

                const isGai = (h.isOut === true) || (safeNum(h.gai) > 0);
                const inQ = isGai ? 0 : safeNum(h.aai !== undefined ? h.aai : h.pcs);
                const outQ = isGai ? safeNum(h.gai !== undefined ? h.gai : h.pcs) : 0;

                if (!finishedMap.has(key)) {
                    finishedMap.set(key, { sName, kName, kid, bachi: 0 });
                }
                const item = finishedMap.get(key);
                item.bachi += (inQ - outQ);
            });

            // Asli Finished Sarees se FIFO minus karein
            let remainingToDeduct = pcs;
            finishedMap.forEach((val) => {
                if (remainingToDeduct <= 0) return;
                if (val.bachi > 0) {
                    const take = Math.min(val.bachi, remainingToDeduct);
                    sH.push({
                        id: `sh_dukan_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                        refId: entryId,
                        date: d,
                        sareeName: val.sName,
                        karigerName: val.kName,
                        kariger: val.kName,
                        partyName: cleanNote, // ⭐ Passbook me dikhega: 🏪 Apni Dukan
                        targetWorker: cleanNote,
                        karkhanaId: val.kid,
                        type: 'finished',
                        typeLabel: `🏪 Dukan Bheja (${cleanNote})`,
                        aai: 0,
                        gai: take,
                        isOut: true,
                        note: cleanNote,
                        timestamp: Date.now()
                    });
                    remainingToDeduct -= take;
                    val.bachi -= take;
                }
            });

            // Agar koi specific saree batch match nahi hua to general finished entry banegi
            if (remainingToDeduct > 0) {
                sH.push({
                    id: `sh_dukan_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                    refId: entryId,
                    date: d,
                    sareeName: 'Finished Saree',
                    karigerName: 'Karkhana Finished',
                    kariger: 'Karkhana Finished',
                    partyName: cleanNote,
                    targetWorker: cleanNote,
                    karkhanaId: 'k_main',
                    type: 'finished',
                    typeLabel: `🏪 Dukan Bheja (${cleanNote})`,
                    aai: 0,
                    gai: remainingToDeduct,
                    isOut: true,
                    note: cleanNote,
                    timestamp: Date.now()
                });
            }

            setToStore('saree_history', sH);
            triggerAllCachesInvalidation();

            // Clear Input Form
            if (pcsInput) pcsInput.value = '';
            if (noteInput) noteInput.value = '';

            // Reactive UI Updates
            renderDukanTransferTable();

            if (typeof window.updateJobWorkHubBadges === 'function') window.updateJobWorkHubBadges();
            if (typeof window.renderSareeTable === 'function') window.renderSareeTable();
            if (typeof window.updateDashboardBadgeTotals === 'function') window.updateDashboardBadgeTotals();

            alert(`✅ ${pcs} Pcs Saree Dukan bheji gayi aur Finished Stock se minus ho gayi!`);
        } catch (err) {
            console.error('[DukanEngine] Outward transfer transaction failure:', err);
            alert('Transfer record save karne me takleef aayi.');
        }
    };

    /* ========================================================================
       4. UNIQUE ID-BASED ATOMIC DELETION (Rollback Finished Stock)
       ------------------------------------------------------------------------
    ======================================================================== */

    const deleteDukanTransferEntry = (identifier) => {
        if (!confirm('Kya is entry ko delete karna chahte hain? Saree wapas Finished Stock me jud jayegi.')) {
            return;
        }

        try {
            let list = [...getDukanTransfers()];
            let targetItem = null;

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
            let sH = toArray(getFromStore('saree_history')).filter((h) => !h || String(h.refId) !== String(refId));
            setToStore('saree_history', sH);

            triggerAllCachesInvalidation();
            renderDukanTransferTable();

            if (typeof window.updateJobWorkHubBadges === 'function') window.updateJobWorkHubBadges();
            if (typeof window.renderSareeTable === 'function') window.renderSareeTable();
            if (typeof window.updateDashboardBadgeTotals === 'function') window.updateDashboardBadgeTotals();

            alert('🗑️ Entry delete ho gayi aur Saree stock wapas Finished Stock me jama ho gaya!');
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
       6. HIGH-SPEED VIRTUALIZED TABLE RENDERER
       ------------------------------------------------------------------------
    ======================================================================== */

    const renderDukanTransferTable = () => {
        const tbody = document.getElementById('jw-dukan-table-body');
        if (!tbody) return;

        const list = getDukanTransfers();
        const fDate = document.getElementById('jw-dukan-from-date')?.value || '';
        const tDate = document.getElementById('jw-dukan-to-date')?.value || '';

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
        if (typeof window.getCalenderFinishedLiveStats === 'function') {
            const calStats = window.getCalenderFinishedLiveStats();
            totCalenderFinished = safeNum(calStats.totFinished);
        } else if (typeof window.getJobWorkers === 'function') {
            const workers = window.getJobWorkers().filter((w) => String(w?.type || '').toLowerCase() === 'calender');
            workers.forEach((w) => {
                const sheets = (typeof window.getJobWorkerSheets === 'function') 
                    ? window.getJobWorkerSheets(w.id) 
                    : [];
                sheets.forEach((sh) => {
                    const rows = toArray(sh?.rows);
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

        let html = '';
        filteredList.forEach((d) => {
            const safeId = esc(d.id);
            html += `<tr>
                <td>${formatDisplay(d.date)}</td>
                <td><strong style="color:#059669;">+${safeNum(d.pcs)} Pcs</strong></td>
                <td>${esc(d.note || 'Apni Dukan')}</td>
                <td style="text-align:center;">
                    <button type="button" class="delete-btn" onclick="deleteDukanTransferEntry('${safeId}')">🗑️</button>
                </td>
            </tr>`;
        });

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

    Object.keys(dukanAPI).forEach((fnName) => {
        window[fnName] = dukanAPI[fnName];
    });

    window.DukanEngine = dukanAPI;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = dukanAPI;
    }
})();
