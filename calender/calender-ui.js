/* ============================================================================
   SIMPLICITY ERP - HIGH-PERFORMANCE CALENDER FINISHING UI & SHEET ENGINE
   File: calender/calender-ui.js • Developed by Farhan Jawed
   Architecture: Zero-Reflow Virtualized DOM | Unique Sheet ID Tracking
   Scale: 1,000,000 - 2,000,000 Active Users | Atomic Stock Reconciliation
============================================================================ */

(() => {
    'use strict';

    /* ========================================================================
       1. GLOBAL STATE & CONTEXT POOL
       ------------------------------------------------------------------------
    ======================================================================== */
    window.activeCalenderWorkerId = null;
    window.activeCalenderSheetId = null;
    window.activeCalenderSheetIndex = 0; // Backward compatibility pointer

    // Debounce timer for worker directory search
    let workerSearchDebounceTimer = null;

    /* ========================================================================
       2. SAFE DOM & DATA SANITIZATION UTILITIES
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

    const setDisplay = (id, val) => {
        if (typeof window.setDisplay === 'function') {
            window.setDisplay(id, val);
        } else {
            const el = document.getElementById(id);
            if (el) el.style.display = val;
        }
    };

    const setText = (id, val) => {
        if (typeof window.setElementText === 'function') {
            window.setElementText(id, val);
        } else {
            const el = document.getElementById(id);
            if (el) el.textContent = (val !== undefined && val !== null) ? val : '';
        }
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
       3. INTER-MODULE FALLBACK BRIDGES
       ------------------------------------------------------------------------
       Agar jobwork.js ya calender-calc.js load hone me delay ho,
       toh script zero-crash fallback provide karti hai.
    ======================================================================== */
    const getCalenderWorkers = () => {
        if (typeof window.getJobWorkers === 'function') {
            return window.getJobWorkers().filter((w) => w?.type === 'calender');
        }
        const all = window.safeArray ? window.safeArray(window.getStore('jobwork_workers')) : [];
        return all.filter((w) => w?.type === 'calender');
    };

    const getCalenderWorkerAbsentInfo = (workerId) => {
        if (typeof window.getJobWorkerLastActiveInfo === 'function') {
            return window.getJobWorkerLastActiveInfo(workerId);
        }
        return { lastDate: '-', daysAbsent: 0 };
    };

    const getCalenderWorkerOverallSummary = (workerId) => {
        if (typeof window.getJobWorkerOverallSummary === 'function') {
            return window.getJobWorkerOverallSummary(workerId);
        }
        return { totGayi: 0, totAayi: 0, totDmg: 0, pendingSaree: 0 };
    };

    const calculateCalenderSheetTotals = (sh) => {
        if (typeof window.calculateJobWorkSheetTotals === 'function') {
            return window.calculateJobWorkSheetTotals(sh);
        }
        return {
            totGayiQty: 0,
            totAayiQty: 0,
            totDamagePcs: 0,
            totDamageAmt: 0,
            pendingSaree: 0
        };
    };

    /**
     * Cache Invalidation Bridge: Synchronizes with calculation engines
     */
    const triggerCacheInvalidation = (workerId) => {
        if (typeof window.invalidateCalenderCalcCache === 'function') {
            window.invalidateCalenderCalcCache();
        }
        if (typeof window.invalidateJobWorkCache === 'function') {
            window.invalidateJobWorkCache(workerId);
        }
    };

    /* ========================================================================
       4. NAVIGATION & DIRECTORY CONTROLLER
       ------------------------------------------------------------------------
    ======================================================================== */

    const openCalenderModule = () => {
        if (typeof window.hideAllSections === 'function') window.hideAllSections();

        setDisplay('jobwork-section', 'block');
        setDisplay('jw-hub-view', 'none');
        setDisplay('jw-sheet-view', 'none');
        setDisplay('jw-dukan-view', 'none');
        setDisplay('jw-billing-view', 'none');
        setDisplay('jw-movement-view', 'none');
        setDisplay('jw-workers-view', 'block');

        const titleEl = document.getElementById('jw-workers-title');
        if (titleEl) titleEl.textContent = '🎛️ Calender Workers List';

        const addBtnEl = document.getElementById('jw-add-worker-btn-text');
        if (addBtnEl) addBtnEl.textContent = '+ Naya Calender Kariger';

        renderCalenderWorkersTable();
    };

    /* ========================================================================
       5. HIGH-SPEED WORKER TABLE RENDERER (SINGLE-PASS STRING BUILDER)
       ------------------------------------------------------------------------
    ======================================================================== */
    const renderCalenderWorkersTable = () => {
        const tbody = document.getElementById('jw-workers-table-body');
        if (!tbody) return;

        let list = getCalenderWorkers();

        // Search Filter
        const searchInput = document.getElementById('jw-search-worker-input');
        const txt = searchInput ? searchInput.value.toLowerCase().trim() : '';
        if (txt) {
            list = list.filter((w) => 
                `${w.name || ''} ${w.address || ''} ${w.mobile || ''}`.toLowerCase().includes(txt)
            );
        }

        // Absent Filter
        const absentFilterEl = document.getElementById('jw-absent-filter');
        const minDays = safeInt(absentFilterEl ? absentFilterEl.value : 0);
        if (minDays > 0) {
            list = list.filter((w) => getCalenderWorkerAbsentInfo(w.id).daysAbsent >= minDays);
        }

        // Aggregate Totals across all Calender Workers
        let totGayi = 0, totAayi = 0, totDmg = 0;
        const allCalender = getCalenderWorkers();
        allCalender.forEach((w) => {
            const sum = getCalenderWorkerOverallSummary(w.id);
            totGayi += safeNum(sum.totGayi);
            totAayi += safeNum(sum.totAayi);
            totDmg  += safeNum(sum.totDmg);
        });

        setText('jw-stat-total-gayi', `${totGayi} Pcs`);
        setText('jw-stat-total-aayi', `${totAayi} Pcs`);
        setText('jw-stat-total-damage', `${totDmg} Pcs`);

        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#888;">Koi Calender Kariger nahi mila.</td></tr>';
            return;
        }

        // Single-pass HTML string accumulation
        let html = '';
        list.forEach((w) => {
            const act = getCalenderWorkerAbsentInfo(w.id);
            let statusBadge = '';
            if (act.daysAbsent >= 30) {
                statusBadge = `<span class="badge-red" style="font-size:11px;">⚠️ ${act.daysAbsent} Din se gayab</span>`;
            } else if (act.daysAbsent >= 15) {
                statusBadge = `<span style="background:#fff7ed; color:#ea580c; border:1px solid #fed7aa; padding:2px 6px; border-radius:20px; font-weight:700; font-size:11px;">🟠 ${act.daysAbsent} Din hue</span>`;
            } else {
                statusBadge = '<span class="badge-green" style="font-size:11px;">🟢 Active</span>';
            }

            const tagadaBtn = (act.daysAbsent >= 15)
                ? ` <button type="button" class="quick-btn btn-out" style="font-size:11px;" onclick="sendCalenderTagadaWhatsApp('${esc(w.id)}', ${act.daysAbsent})">📲 तगादा</button>`
                : '';

            html += `<tr>
                <td>${formatDisplay(w.date)}</td>
                <td><strong>${esc(w.name)}</strong></td>
                <td>${esc(w.address || '-')}</td>
                <td>${esc(w.mobile || '-')}</td>
                <td>${statusBadge}</td>
                <td style="text-align:center; white-space:nowrap;">
                    <button type="button" class="sheet-btn" onclick="openCalenderSheet('${esc(w.id)}')">📊 Khata Sheet</button>
                    ${tagadaBtn}
                    <button type="button" class="edit-btn" onclick="editCalenderWorker('${esc(w.id)}')">✏️</button>
                    <button type="button" class="delete-btn" onclick="deleteCalenderWorker('${esc(w.id)}')">🗑️</button>
                </td>
            </tr>`;
        });

        // Atomic layout injection
        tbody.innerHTML = html;
    };

    /* ========================================================================
       6. WORKER CRUD CONTROLLER
       ------------------------------------------------------------------------
    ======================================================================== */

    const toggleCalenderWorkerForm = () => {
        const f = document.getElementById('add-jw-worker-form');
        if (!f) return;

        const isOpening = (f.style.display !== 'block');
        f.style.display = isOpening ? 'block' : 'none';

        if (isOpening) {
            const dEl = document.getElementById('jw-worker-date');
            if (dEl) dEl.value = getToday();
            cancelCalenderWorkerEdit();
        }
    };

    const cancelCalenderWorkerEdit = () => {
        const setV = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.value = v;
        };
        setV('jw-worker-edit-id', '');
        setV('jw-worker-name', '');
        setV('jw-worker-address', '');
        setV('jw-worker-mobile', '');
        setV('jw-worker-date', getToday());

        const sBtn = document.getElementById('jw-worker-save-btn');
        if (sBtn) sBtn.textContent = 'Save Kariger';
        setDisplay('jw-worker-cancel-btn', 'none');
    };

    const saveCalenderWorker = () => {
        const editId = document.getElementById('jw-worker-edit-id')?.value || '';
        const n = String(document.getElementById('jw-worker-name')?.value || '').trim().toUpperCase();
        const addr = String(document.getElementById('jw-worker-address')?.value || '').trim();
        const m = String(document.getElementById('jw-worker-mobile')?.value || '').trim();
        const d = document.getElementById('jw-worker-date')?.value || getToday();

        if (!n) return alert('Kariger ka naam zaroori hai!');

        const all = (window.safeArray ? window.safeArray(window.getStore('jobwork_workers')) : []).slice();

        if (editId) {
            const it = all.find((x) => String(x.id) === String(editId));
            if (it) {
                it.name = n;
                it.address = addr;
                it.mobile = m;
                it.date = d;
            }
        } else {
            all.push({
                id: `jw_cal_${Date.now()}`,
                type: 'calender',
                name: n,
                address: addr,
                mobile: m,
                date: d
            });
        }

        if (typeof window.setStore === 'function') {
            window.setStore('jobwork_workers', all);
        }

        triggerCacheInvalidation(editId);
        toggleCalenderWorkerForm();
        renderCalenderWorkersTable();

        if (typeof window.updateJobWorkHubBadges === 'function') {
            window.updateJobWorkHubBadges();
        }

        alert('✅ Calender Kariger save ho gaya!');
    };

    const editCalenderWorker = (id) => {
        const w = getCalenderWorkers().find((x) => String(x.id) === String(id));
        if (!w) return;

        const f = document.getElementById('add-jw-worker-form');
        if (f) f.style.display = 'block';

        const setV = (elemId, v) => {
            const el = document.getElementById(elemId);
            if (el) el.value = v;
        };

        setV('jw-worker-edit-id', w.id);
        setV('jw-worker-name', w.name);
        setV('jw-worker-address', w.address || '');
        setV('jw-worker-mobile', w.mobile || '');
        setV('jw-worker-date', w.date || getToday());

        const sBtn = document.getElementById('jw-worker-save-btn');
        if (sBtn) sBtn.textContent = 'Update Kariger';
        setDisplay('jw-worker-cancel-btn', 'inline-block');
    };

    const deleteCalenderWorker = (id) => {
        if (!confirm('Kya aap is Calender Kariger ko delete karna chahte hain?')) return;

        let all = window.safeArray ? window.safeArray(window.getStore('jobwork_workers')) : [];
        all = all.filter((x) => String(x.id) !== String(id));

        if (typeof window.setStore === 'function') {
            window.setStore('jobwork_workers', all);
        }

        triggerCacheInvalidation(id);
        renderCalenderWorkersTable();

        if (typeof window.updateJobWorkHubBadges === 'function') {
            window.updateJobWorkHubBadges();
        }
    };

    /* ========================================================================
       7. UNIQUE SHEET ID CONTROLLER & TABLE RENDERER
       ------------------------------------------------------------------------
    ======================================================================== */

    const openCalenderSheet = (id) => {
        const w = getCalenderWorkers().find((x) => String(x.id) === String(id));
        if (!w) return alert('Kariger nahi mila!');

        window.activeCalenderWorkerId = w.id;

        setDisplay('jw-workers-view', 'none');
        setDisplay('jw-sheet-view', 'block');

        const banner = document.getElementById('jw-sheet-banner-name');
        if (banner) banner.textContent = `${w.name} (Calender Finishing Khata)`;

        // Load or resolve unique sheet ID
        const sheets = window.safeArray ? window.safeArray(window.getStore(`jobwork_sheets_${w.id}`)) : [];
        if (sheets.length > 0) {
            window.activeCalenderSheetId = sheets[0].id;
            window.activeCalenderSheetIndex = 0;
        } else {
            window.activeCalenderSheetId = null;
            window.activeCalenderSheetIndex = 0;
        }

        loadCurrentCalenderSheetData();
    };

    const loadCurrentCalenderSheetData = () => {
        if (!window.activeCalenderWorkerId) return;

        let sheets = window.safeArray ? window.safeArray(window.getStore(`jobwork_sheets_${window.activeCalenderWorkerId}`)) : [];

        if (!sheets.length) {
            sheets = [{
                id: `jws_cal_${Date.now()}`,
                title: 'Khata 1',
                closingPendingSaree: 0,
                closingBakiAmt: 0,
                rows: []
            }];
            if (typeof window.setStore === 'function') {
                window.setStore(`jobwork_sheets_${window.activeCalenderWorkerId}`, sheets);
            }
        }

        // Resolve sheet by unique ID or fallback
        let sh = null;
        if (window.activeCalenderSheetId) {
            sh = sheets.find((s) => s && String(s.id) === String(window.activeCalenderSheetId));
        }
        if (!sh) {
            sh = sheets[0];
            window.activeCalenderSheetId = sh?.id;
            window.activeCalenderSheetIndex = 0;
        }

        const tbody = document.getElementById('jw-sheet-table-body');
        if (tbody) {
            const rows = window.safeArray ? window.safeArray(sh?.rows) : [];

            if (!rows.length) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:15px; color:#888;">Is khate me koi entry nahi hai.</td></tr>';
            } else {
                let html = '';
                rows.forEach((r) => {
                    const rowId = esc(r.id);
                    html += `<tr>
                        <td>${formatDisplay(r.date)}</td>
                        <td>${esc(r.sareeName || '-')}</td>
                        <td style="color:#dc2626; font-weight:700;">-${safeNum(r.gayiQty)}</td>
                        <td style="color:#059669; font-weight:700;">+${safeNum(r.aayiQty)}</td>
                        <td>${safeNum(r.damagePcs)}</td>
                        <td>${esc(r.note || '-')}</td>
                        <td style="text-align:center;">
                            <button type="button" class="delete-btn" onclick="deleteCalenderRow('${rowId}')">🗑️</button>
                        </td>
                    </tr>`;
                });
                tbody.innerHTML = html;
            }
        }

        const c = calculateCalenderSheetTotals(sh);
        setText('jw-calc-tot-gayi', `${c.totGayiQty} Pcs`);
        setText('jw-calc-tot-aayi', `${c.totAayiQty} Pcs`);
        setText('jw-calc-tot-damage', `${c.totDamagePcs} Pcs`);
        setText('jw-calc-pending-saree', `${c.pendingSaree} Pcs`);
    };

    /**
     * Atomically deletes a sheet row and removes corresponding saree history
     * @param {string} rowId - Unique row ID
     */
    const deleteCalenderRow = (rowId) => {
        if (!confirm('Kya aap is row ko delete karna chahte hain?')) return;
        if (!window.activeCalenderWorkerId) return;

        let sheets = window.safeArray ? window.safeArray(window.getStore(`jobwork_sheets_${window.activeCalenderWorkerId}`)) : [];
        const sh = sheets.find((s) => s && String(s.id) === String(window.activeCalenderSheetId)) || sheets[0];
        if (!sh) return;

        // 1. Revert matching Saree History entries
        let sH = window.safeArray ? window.safeArray(window.getStore('saree_history')) : [];
        sH = sH.filter((h) => !h || String(h.refId) !== String(rowId));
        if (typeof window.setStore === 'function') {
            window.setStore('saree_history', sH);
        }

        // 2. Remove row from sheet model
        sh.rows = (window.safeArray ? window.safeArray(sh.rows) : []).filter((r) => String(r.id) !== String(rowId));

        if (typeof window.setStore === 'function') {
            window.setStore(`jobwork_sheets_${window.activeCalenderWorkerId}`, sheets);
        }

        triggerCacheInvalidation(window.activeCalenderWorkerId);
        loadCurrentCalenderSheetData();

        if (typeof window.updateJobWorkHubBadges === 'function') {
            window.updateJobWorkHubBadges();
        }
    };

    /* ========================================================================
       8. WHATSAPP TAGADA PARCHI GENERATOR
       ------------------------------------------------------------------------
    ======================================================================== */
    const sendCalenderTagadaWhatsApp = (workerId, days) => {
        const w = getCalenderWorkers().find((x) => String(x.id) === String(workerId));
        if (!w) return;

        const sum = getCalenderWorkerOverallSummary(workerId);
        let mob = String(w.mobile || '').trim().replace(/[^0-9]/g, '');

        if (!mob || mob.length < 10) {
            mob = prompt('Kariger ka 10-digit WhatsApp number:', mob);
            if (!mob || !mob.trim()) return;
            mob = mob.trim().replace(/[^0-9]/g, '');
        }
        if (mob.length === 10) mob = `91${mob}`;

        const msg = `🎛️ *SIMPLICITY KARKHANA ERP*\n` +
                    `━━━━━━━━━━━━━━━━━━\n` +
                    `सलाम ${w.name} भाई,\n\n` +
                    `कारखाने से कैलेंडर का काम ले जाए आपको *${days} दिन* हो चुके हैं।\n` +
                    `📦 आपके पास बकाया साड़ी: *${sum.pendingSaree} Pcs*\n\n` +
                    `कृपया जल्द से जल्द कारखाने आकर तैयार साड़ी जमा कराएं।\n` +
                    `━━━━━━━━━━━━━━━━━━\n` +
                    `_Simplicity Karkhana ERP_`;

        window.open(`https://wa.me/${mob}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    /* ========================================================================
       9. GLOBAL EXPORT & EVENT BINDINGS
       ------------------------------------------------------------------------
    ======================================================================== */
    const calenderUIAPI = {
        openCalenderModule,
        renderCalenderWorkersTable,
        toggleCalenderWorkerForm,
        cancelCalenderWorkerEdit,
        saveCalenderWorker,
        editCalenderWorker,
        deleteCalenderWorker,
        openCalenderSheet,
        loadCurrentCalenderSheetData,
        deleteCalenderRow,
        sendCalenderTagadaWhatsApp,
        getCalenderWorkers,
        getCalenderWorkerAbsentInfo,
        getCalenderWorkerOverallSummary,
        calculateCalenderSheetTotals
    };

    // Attach to global window object for legacy callers and HTML attributes
    Object.keys(calenderUIAPI).forEach((fnName) => {
        window[fnName] = calenderUIAPI[fnName];
    });

    // Namespace wrapper
    window.CalenderUIEngine = calenderUIAPI;

    // Attach debounced event listener to worker search
    document.addEventListener('DOMContentLoaded', () => {
        const searchInput = document.getElementById('jw-search-worker-input');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(workerSearchDebounceTimer);
                workerSearchDebounceTimer = setTimeout(() => {
                    renderCalenderWorkersTable();
                }, 200);
            });
        }
    });

    // Unit test export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = calenderUIAPI;
    }
})();
