/* ============================================================================
   SIMPLICITY ERP - JOBWORK EXPRESS (KEYBOARD-DRIVEN TALLY BATCH ENGINE)
   File: jobwork-express/jobwork-express.js • Developed by Farhan Jawed
   Architecture: Zero-Mouse Voucher Entry | Live Saree Batch Loop | A6 Slip
   Scale: 1,000,000 - 2,000,000 Active Users | Atomic Stock Reconciliation
============================================================================ */

(() => {
    'use strict';

    let expressBatchItems = [];

    /* ========================================================================
       1. SAFE DATA & STORE UTILITIES
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

    const safeNum = (val, fallback = 0) => {
        const n = parseFloat(val);
        return isNaN(n) || !isFinite(n) ? fallback : n;
    };

    const safeInt = (val, fallback = 0) => {
        const n = parseInt(val, 10);
        return isNaN(n) || !isFinite(n) ? fallback : n;
    };

    const esc = (s) => {
        if (typeof window.sanitizeHTML === 'function') return window.sanitizeHTML(s);
        return String(s || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
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
       2. MODAL AUTO-INJECTION (FAIL-SAFE ARCHITECTURE)
       ------------------------------------------------------------------------
    ======================================================================== */
    const ensureExpressModalInDOM = () => {
        if (document.getElementById('jw-express-modal')) return;

        const modalHtml = `
        <div id="jw-express-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.75); z-index:999999; align-items:center; justify-content:center; padding:12px; box-sizing:border-box;">
            <div style="background:#ffffff; width:100%; max-width:680px; border-radius:12px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.35); overflow:hidden; display:flex; flex-direction:column; max-height:95vh;">
                
                <!-- HEADER & SHORTCUTS -->
                <div style="background:linear-gradient(135deg, #0284c7, #1e3a8a); color:#ffffff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 style="margin:0; font-size:16px; display:flex; align-items:center; gap:6px;">⚡ JobWork Express <span style="background:#38bdf8; color:#0f172a; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:800;">Tally Batch Mode</span></h3>
                        <small style="color:#bae6fd; font-size:11px;">[Enter] Next / Add Row | [Ctrl+Enter] Save & Print | [Esc] Close</small>
                    </div>
                    <button type="button" onclick="closeJobWorkExpressModal()" style="background:transparent; border:none; color:white; font-size:22px; cursor:pointer;">✕</button>
                </div>

                <div style="padding:14px; overflow-y:auto; flex:1;">
                    <!-- VOUCHER TOP HEADER CONTROLS -->
                    <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:10px; border-radius:8px; margin-bottom:12px;">
                        <div style="display:grid; grid-template-columns: 1fr 1.5fr 1fr; gap:8px; margin-bottom:8px;">
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#334155;">1. Process:</label>
                                <select id="jw-exp-process" onchange="handleProcessChange()" style="width:100%; padding:6px; font-weight:bold; border:1.5px solid #cbd5e1; border-radius:4px; font-size:12px; margin-top:2px;">
                                    <option value="calender">🎛️ Calender</option>
                                    <option value="cutting">✂️ Cutting</option>
                                </select>
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#334155;">2. Job Worker (Kariger):</label>
                                <select id="jw-exp-worker" style="width:100%; padding:6px; font-weight:bold; border:1.5px solid #cbd5e1; border-radius:4px; font-size:12px; margin-top:2px;"></select>
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#334155;">3. Len-Den Type:</label>
                                <select id="jw-exp-type" onchange="handleTypeChange()" style="width:100%; padding:6px; font-weight:bold; border:1.5px solid #cbd5e1; border-radius:4px; font-size:12px; margin-top:2px;">
                                    <option value="gayi">📤 Saree Gayi (Bheja)</option>
                                    <option value="aayi">📥 Wapas Aayi (Tayyar)</option>
                                </select>
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                            <div id="jw-exp-source-box">
                                <label style="font-size:11px; font-weight:700; color:#334155;">4. Stock Source (Kahan se):</label>
                                <select id="jw-exp-source" style="width:100%; padding:6px; font-weight:bold; border:1.5px solid #cbd5e1; border-radius:4px; font-size:12px; margin-top:2px;">
                                    <option value="cutting">✂️ Cutting Stock se</option>
                                    <option value="fresh">🥻 Fresh Godown se</option>
                                </select>
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#334155;">Tarikh (Date):</label>
                                <input type="date" id="jw-exp-date" style="width:100%; padding:5px 8px; font-size:12px; font-weight:bold; border:1px solid #cbd5e1; border-radius:4px; margin-top:2px; box-sizing:border-box;">
                            </div>
                        </div>
                    </div>

                    <!-- TALLY STYLE FAST BATCH ENTRY LOOP BOX -->
                    <div style="background:#eff6ff; border:2px solid #93c5fd; padding:12px; border-radius:8px; margin-bottom:12px;">
                        <div style="font-weight:800; color:#1e40af; font-size:13px; margin-bottom:6px; display:flex; justify-content:space-between;">
                            <span>📦 Batch Entry Loop (Type & Press Enter):</span>
                            <span id="jw-exp-stock-indicator" style="font-size:11px; font-weight:700; color:#0369a1;"></span>
                        </div>
                        <div style="display:flex; gap:8px; align-items:flex-end;">
                            <div style="flex:2;">
                                <label style="font-size:11px; font-weight:700; color:#1e3a8a;">Bunne Wala (Kariger):</label>
                                <input type="text" id="jw-exp-maker-input" list="dl-karigers-list" placeholder="Farhan / Asif..." autocomplete="off" style="width:100%; padding:8px 10px; font-weight:bold; font-size:14px; border:2px solid #3b82f6; border-radius:6px; box-sizing:border-box;">
                            </div>
                            <div style="flex:1;">
                                <label style="font-size:11px; font-weight:700; color:#1e3a8a;">Qty (Pcs):</label>
                                <input type="number" id="jw-exp-qty-input" placeholder="10 / 20" min="1" style="width:100%; padding:8px 10px; font-weight:bold; font-size:14px; border:2px solid #3b82f6; border-radius:6px; box-sizing:border-box;">
                            </div>
                            <div>
                                <button type="button" id="jw-exp-add-btn" onclick="addExpressBatchRow()" style="background:#2563eb; color:white; border:none; padding:9px 16px; border-radius:6px; font-weight:bold; font-size:13px; cursor:pointer;">+ Jodein [↵]</button>
                            </div>
                        </div>
                    </div>

                    <!-- BATCH TABLE GRID -->
                    <div class="table-responsive" style="max-height:180px; overflow-y:auto; border:1px solid #cbd5e1; border-radius:6px;">
                        <table style="margin:0;">
                            <thead>
                                <tr style="background:#1e3a8a; color:white; font-size:11px;">
                                    <th>#</th><th>Bunne Wala (Maker)</th><th>Saree Design</th><th style="text-align:right;">Saree Pcs</th><th style="text-align:center;">Action</th>
                                </tr>
                            </thead>
                            <tbody id="jw-exp-table-body"></tbody>
                            <tfoot>
                                <tr style="background:#f1f5f9; font-weight:900; font-size:13px; border-top:2px solid #cbd5e1;">
                                    <td colspan="3">KUL BATCH TOTAL:</td>
                                    <td id="jw-exp-batch-total-pcs" style="text-align:right; color:#2563eb;">0 Pcs</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <!-- OPTIONAL DAMAGE FINE ROW -->
                    <div style="display:flex; gap:10px; margin-top:10px; align-items:center;">
                        <div style="flex:1;">
                            <label style="font-size:11px; font-weight:700; color:#ea580c;">⚠️ Damage Saree (Pcs):</label>
                            <input type="number" id="jw-exp-damage-pcs" placeholder="0" style="width:100%; padding:5px 8px; border:1px solid #fed7aa; border-radius:4px; font-size:12px; box-sizing:border-box;">
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:11px; font-weight:700; color:#dc2626;">Kaat / Fine (₹):</label>
                            <input type="number" id="jw-exp-damage-amt" placeholder="0.00" style="width:100%; padding:5px 8px; border:1px solid #fecaca; border-radius:4px; font-size:12px; box-sizing:border-box;">
                        </div>
                    </div>
                </div>

                <!-- FOOTER ACTIONS -->
                <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:10px 16px; display:flex; justify-content:space-between; align-items:center;">
                    <button type="button" class="back-btn" onclick="closeJobWorkExpressModal()" style="padding:8px 16px; font-size:13px;">✕ Radd [Esc]</button>
                    <div style="display:flex; gap:8px;">
                        <button type="button" class="add-btn" style="background:#0284c7; padding:9px 16px; font-size:13px;" onclick="saveExpressBatch(false)">💾 Sirf Save</button>
                        <button type="button" class="add-btn" style="background:#15803d; padding:9px 20px; font-size:13px;" onclick="saveExpressBatch(true)">🚀 Save & Challan Print [Ctrl+↵]</button>
                    </div>
                </div>

            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        attachExpressKeyboardEvents();
    };

    /* ========================================================================
       3. MODAL CONTROLLERS & WORKER POPULATION
       ------------------------------------------------------------------------
    ======================================================================== */
    const openJobWorkExpressModal = () => {
        ensureExpressModalInDOM();

        expressBatchItems = [];
        renderExpressBatchGrid();

        const dInp = document.getElementById('jw-exp-date');
        if (dInp) dInp.value = getToday();

        const dmgPcs = document.getElementById('jw-exp-damage-pcs');
        const dmgAmt = document.getElementById('jw-exp-damage-amt');
        if (dmgPcs) dmgPcs.value = '';
        if (dmgAmt) dmgAmt.value = '';

        populateExpressWorkers();
        handleTypeChange();

        const modal = document.getElementById('jw-express-modal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => {
                const mInp = document.getElementById('jw-exp-maker-input');
                if (mInp) mInp.focus();
            }, 100);
        }
    };

    const closeJobWorkExpressModal = () => {
        const modal = document.getElementById('jw-express-modal');
        if (modal) modal.style.display = 'none';
        expressBatchItems = [];
    };

    const populateExpressWorkers = () => {
        const pSel = document.getElementById('jw-exp-process');
        const wSel = document.getElementById('jw-exp-worker');
        if (!pSel || !wSel) return;

        const processType = pSel.value;
        const allWorkers = toArray(getFromStore('jobwork_workers'));
        const filtered = allWorkers.filter((w) => String(w?.type || '').toLowerCase() === processType);

        wSel.innerHTML = '';
        if (!filtered.length) {
            wSel.innerHTML = '<option value="">Koi Kariger nahi hai</option>';
            return;
        }

        filtered.forEach((w) => {
            const opt = document.createElement('option');
            opt.value = w.id;
            opt.textContent = w.name;
            wSel.appendChild(opt);
        });
    };

    const handleProcessChange = () => {
        populateExpressWorkers();
        handleTypeChange();
    };

    const handleTypeChange = () => {
        const pSel = document.getElementById('jw-exp-process');
        const tSel = document.getElementById('jw-exp-type');
        const srcBox = document.getElementById('jw-exp-source-box');

        const isCal = (pSel && pSel.value === 'calender');
        const isGayi = (tSel && tSel.value === 'gayi');

        if (srcBox) {
            srcBox.style.display = (isCal && isGayi) ? 'block' : 'none';
        }
    };

    /* ========================================================================
       4. KEYBOARD EVENT LOOP (TALLY STYLE RAPID ENTRY)
       ------------------------------------------------------------------------
    ======================================================================== */
    const attachExpressKeyboardEvents = () => {
        const mInp = document.getElementById('jw-exp-maker-input');
        const qInp = document.getElementById('jw-exp-qty-input');

        if (mInp) {
            mInp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (mInp.value.trim() && qInp) {
                        qInp.focus();
                        qInp.select();
                    }
                }
            });
        }

        if (qInp) {
            qInp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addExpressBatchRow();
                }
            });
        }

        window.addEventListener('keydown', (e) => {
            const modal = document.getElementById('jw-express-modal');
            if (!modal || modal.style.display !== 'flex') return;

            if (e.key === 'Escape') {
                e.preventDefault();
                closeJobWorkExpressModal();
            } else if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                saveExpressBatch(true);
            }
        });
    };

    /* ========================================================================
       5. BATCH ROW BUILDER (FARHAN 10, ASIF 20, IMRAN 15)
       ------------------------------------------------------------------------
    ======================================================================== */
    const addExpressBatchRow = () => {
        const mInp = document.getElementById('jw-exp-maker-input');
        const qInp = document.getElementById('jw-exp-qty-input');

        const makerName = String(mInp?.value || '').trim().toUpperCase();
        const qty = safeInt(qInp?.value);

        if (!makerName) {
            alert('Bunne wale Kariger ka naam likhein!');
            if (mInp) mInp.focus();
            return;
        }

        if (qty <= 0) {
            alert('Sahi Saree Sankhya (Qty) likhein!');
            if (qInp) qInp.focus();
            return;
        }

        const allKars = toArray(getFromStore('kariger_list'));
        const found = allKars.find((k) => k?.name && k.name.trim().toUpperCase() === makerName);
        const sareeName = found?.saree || 'General Saree';

        expressBatchItems.push({
            maker: makerName,
            saree: sareeName,
            qty: qty
        });

        renderExpressBatchGrid();

        // Clear and jump back immediately to Maker Input for next line
        if (mInp) mInp.value = '';
        if (qInp) qInp.value = '';
        if (mInp) mInp.focus();
    };

    const removeExpressBatchItem = (idx) => {
        expressBatchItems.splice(idx, 1);
        renderExpressBatchGrid();
    };

    const renderExpressBatchGrid = () => {
        const tbody = document.getElementById('jw-exp-table-body');
        const totalEl = document.getElementById('jw-exp-batch-total-pcs');
        if (!tbody) return;

        let total = 0;
        let html = '';

        if (!expressBatchItems.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:12px; color:#888;">Batch khali hai. Upar Kariger likhkar [Enter] dabayein.</td></tr>';
            if (totalEl) totalEl.textContent = '0 Pcs';
            return;
        }

        expressBatchItems.forEach((it, idx) => {
            total += it.qty;
            html += `<tr>
                <td>${idx + 1}</td>
                <td><strong>${esc(it.maker)}</strong></td>
                <td>${esc(it.saree)}</td>
                <td style="text-align:right; font-weight:800; color:#1e3a8a;">${it.qty} Pcs</td>
                <td style="text-align:center;">
                    <button type="button" onclick="removeExpressBatchItem(${idx})" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:4px; padding:2px 6px; cursor:pointer; font-weight:bold;">✕</button>
                </td>
            </tr>`;
        });

        tbody.innerHTML = html;
        if (totalEl) totalEl.textContent = `${total} Pcs (${expressBatchItems.length} Kariger)`;
    };

    /* ========================================================================
       6. ATOMIC BATCH COMMIT & AUTO PRINT
       ------------------------------------------------------------------------
    ======================================================================== */
    const saveExpressBatch = (doPrint = false) => {
        const wSel = document.getElementById('jw-exp-worker');
        const pSel = document.getElementById('jw-exp-process');
        const tSel = document.getElementById('jw-exp-type');
        const srcSel = document.getElementById('jw-exp-source');
        const dInp = document.getElementById('jw-exp-date');

        const workerId = wSel?.value;
        if (!workerId) return alert('Pehle Job Worker chunein!');

        const allWorkers = toArray(getFromStore('jobwork_workers'));
        const worker = allWorkers.find((x) => String(x.id) === String(workerId));
        const workerName = worker ? worker.name : 'Worker';

        const processType = pSel ? pSel.value : 'calender';
        const isCalender = (processType === 'calender');
        const entryType = tSel ? tSel.value : 'gayi';
        const isGayi = (entryType === 'gayi');

        const stockSource = (isCalender && isGayi && srcSel) ? srcSel.value : 'fresh';
        const d = dInp?.value || getToday();

        const damagePcs = safeInt(document.getElementById('jw-exp-damage-pcs')?.value);
        const damageAmt = safeNum(document.getElementById('jw-exp-damage-amt')?.value);

        if (!expressBatchItems.length && damagePcs <= 0) {
            return alert('Batch me kam se kam 1 Kariger ki saree jodein!');
        }

        const batchRowId = `jwb_${Date.now()}`;
        let totQty = 0;
        expressBatchItems.forEach((x) => { totQty += x.qty; });

        // 1. Commit to Saree History
        let sH = [...toArray(getFromStore('saree_history'))];
        const allKars = toArray(getFromStore('kariger_list'));
        const targetLabel = isCalender ? `${workerName} (Calender)` : `${workerName} (Cutting)`;

        expressBatchItems.forEach((it) => {
            const foundKar = allKars.find((k) => k?.name && k.name.trim().toUpperCase() === it.maker);
            const kGodown = foundKar?.karkhanaId || 'k_main';

            if (isGayi) {
                sH.push({
                    id: `sh_diya_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                    refId: batchRowId,
                    date: d,
                    sareeName: it.saree,
                    karigerName: it.maker,
                    kariger: it.maker,
                    partyName: targetLabel,
                    targetWorker: targetLabel,
                    karkhanaId: kGodown,
                    type: stockSource,
                    typeLabel: `📤 ${targetLabel} ko bheja [${stockSource === 'cutting' ? 'Cutting Stock' : 'Fresh Stock'}]`,
                    aai: 0,
                    gai: it.qty,
                    isOut: true,
                    note: `${targetLabel} ko bheja (${stockSource})`,
                    timestamp: Date.now()
                });
            } else {
                const targetTab = isCalender ? 'finished' : 'cutting';
                sH.push({
                    id: `sh_aayi_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                    refId: batchRowId,
                    date: d,
                    sareeName: it.saree,
                    karigerName: it.maker,
                    kariger: it.maker,
                    partyName: targetLabel,
                    targetWorker: targetLabel,
                    karkhanaId: kGodown,
                    type: targetTab,
                    typeLabel: isCalender ? `✨ ${targetLabel} se Finished Aayi` : `✂️ ${targetLabel} se Tayyar Aayi`,
                    aai: it.qty,
                    gai: 0,
                    isOut: false,
                    note: `${targetLabel} se tayyar aayi`,
                    timestamp: Date.now()
                });
            }
        });

        if (damagePcs > 0) {
            sH.push({
                id: `sh_dmg_${Date.now()}`,
                refId: batchRowId,
                date: d,
                sareeName: 'Damage Saree',
                karigerName: workerName,
                kariger: workerName,
                partyName: targetLabel,
                targetWorker: targetLabel,
                karkhanaId: 'k_main',
                type: 'lott',
                typeLabel: `⚠️ ${targetLabel} se Damage Aayi (Fine: ₹${damageAmt})`,
                aai: damagePcs,
                gai: 0,
                isOut: false,
                note: `Damage Fine: ₹${damageAmt}`,
                timestamp: Date.now()
            });
        }

        setToStore('saree_history', sH);

        // 2. Commit to Job Worker Monthly Sheet
        let sheets = toArray(getFromStore(`jobwork_sheets_${workerId}`));
        if (!sheets.length) {
            sheets = [{
                id: `jw_sh_${Date.now()}`,
                title: `Month 1 (${d.substring(0, 7)})`,
                closingPendingSaree: 0,
                closingBakiAmt: 0,
                rows: []
            }];
        }

        const activeSheet = sheets[sheets.length - 1];
        activeSheet.rows = toArray(activeSheet.rows);

        const batchItemsFormatted = expressBatchItems.map((x) => ({ karigar: x.maker, qty: x.qty }));

        activeSheet.rows.push({
            id: batchRowId,
            date: d,
            gayiQty: isGayi ? totQty : 0,
            gayiItems: isGayi ? batchItemsFormatted : [],
            stockSource: stockSource,
            aayiQty: isGayi ? 0 : totQty,
            aayiItems: isGayi ? [] : batchItemsFormatted,
            damagePcs,
            damageAmt
        });

        setToStore(`jobwork_sheets_${workerId}`, sheets);

        // Invalidate All Calculation Caches
        if (typeof window.invalidateJobWorkCache === 'function') window.invalidateJobWorkCache(workerId);
        if (typeof window.invalidateSareeCalcCache === 'function') window.invalidateSareeCalcCache();
        if (typeof window.invalidateCalenderCalcCache === 'function') window.invalidateCalenderCalcCache();
        if (typeof window.invalidateCuttingCalcCache === 'function') window.invalidateCuttingCalcCache();

        const savedBatch = [...expressBatchItems];

        if (doPrint) {
            printExpressBatchChallan(d, workerName, processType, isGayi, stockSource, savedBatch, damagePcs);
        }

        closeJobWorkExpressModal();

        if (typeof window.updateJobWorkHubBadges === 'function') window.updateJobWorkHubBadges();
        if (typeof window.renderSareeTable === 'function') window.renderSareeTable();
        if (typeof window.updateDashboardBadgeTotals === 'function') window.updateDashboardBadgeTotals();

        alert(`✅ ${totQty} Pcs Saree ka Batch [${workerName}] ke khate me chadh gaya!`);
    };

    /* ========================================================================
       7. A6 THERMAL CHALLAN PRINT ENGINE (BATCH BREAKDOWN)
       ------------------------------------------------------------------------
    ======================================================================== */
    const printExpressBatchChallan = (date, workerName, processType, isGayi, source, items, dmg) => {
        let rowsHtml = '';
        let tot = 0;

        items.forEach((it, idx) => {
            tot += it.qty;
            rowsHtml += `
                <tr style="border-bottom:1px dashed #ccc;">
                    <td style="padding:4px 2px;">${idx + 1}</td>
                    <td style="padding:4px 2px; font-weight:bold;">${esc(it.maker)}</td>
                    <td style="padding:4px 2px;">${esc(it.saree)}</td>
                    <td style="padding:4px 2px; text-align:right; font-weight:bold;">${it.qty}</td>
                </tr>`;
        });

        const titleText = isGayi ? 'JOB WORK DISPATCH CHALLAN (GAYI)' : 'JOB WORK RECEIPT (AAYI)';
        const processLabel = (processType === 'calender') ? 'CALENDER FINISHING' : 'BOOTI CUTTING';

        const printWindow = window.open('', '', 'width=420,height=580');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
            <head>
                <title>JobWork Challan - A6</title>
                <style>
                    @page { size: A6 portrait; margin: 4mm; }
                    body { font-family: monospace, sans-serif; font-size: 11px; margin: 0; padding: 4mm; color: #000; }
                    .ticket { width: 100%; max-width: 90mm; margin: 0 auto; border: 1.5px dashed #000; padding: 8px; box-sizing: border-box; }
                    .header { text-align: center; border-bottom: 1.5px dashed #000; padding-bottom: 6px; margin-bottom: 8px; }
                    .header h2 { margin: 0; font-size: 14px; text-transform: uppercase; }
                    .header p { margin: 2px 0 0; font-size: 10px; font-weight: bold; }
                    .meta { font-size: 10px; margin-bottom: 6px; }
                    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px; }
                    th { border-top: 1px solid #000; border-bottom: 1px solid #000; text-align: left; padding: 3px 2px; }
                    .total-box { background: #eee; padding: 6px 4px; border: 1px solid #000; font-size: 13px; font-weight: 900; text-align: center; margin: 8px 0; }
                    .signs { display: flex; justify-content: space-between; margin-top: 25px; font-size: 10px; }
                </style>
            </head>
            <body>
                <div class="ticket">
                    <div class="header">
                        <h2>SIMPLICITY ERP</h2>
                        <p>${titleText}</p>
                    </div>
                    <div class="meta">
                        <div><strong>Job Worker:</strong> ${esc(workerName)} (${processLabel})</div>
                        <div><strong>Tarikh:</strong> ${formatDisplay(date)}</div>
                        ${isGayi ? `<div><strong>Stock Source:</strong> ${source.toUpperCase()} STOCK</div>` : ''}
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th><th>BUNNE WALA</th><th>SAREE</th><th style="text-align:right;">PCS</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                    <div class="total-box">
                        KUL SAREE: ${tot} Pcs ${dmg > 0 ? `(Dmg: ${dmg})` : ''}
                    </div>
                    <div class="signs">
                        <div>हस्ताक्षर मुंशी<br><br>________</div>
                        <div>हस्ताक्षर कारीगर<br><br>________</div>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        window.focus();
                        window.print();
                        setTimeout(() => window.close(), 600);
                    };
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    /* ========================================================================
       8. GLOBAL EXPORT
       ------------------------------------------------------------------------
    ======================================================================== */
    const jwExpressAPI = {
        openJobWorkExpressModal,
        closeJobWorkExpressModal,
        handleProcessChange,
        handleTypeChange,
        addExpressBatchRow,
        removeExpressBatchItem,
        saveExpressBatch
    };

    Object.keys(jwExpressAPI).forEach((fnName) => {
        window[fnName] = jwExpressAPI[fnName];
    });

    window.JobWorkExpressEngine = jwExpressAPI;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = jwExpressAPI;
    }
})();
