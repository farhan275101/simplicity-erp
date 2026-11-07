/* ============================================================================
   SIMPLICITY ERP - ⚡ MASTER JOBWORK EXPRESS ENGINE (BADA COUNTER & ZERO-MOUSE)
   Folder: jobwork-express / File: jobwork-express.js
   Developed for: Farhan Jawed
   Features:
   - Bada Wide Screen (880px Counter Layout like Stock Express)
   - Fixed Shortcuts: F1 (Cutting), F2 (Calender), F3 (Dukan)
   - F4 Toggle: Fresh Stock se ⟷ Cutting Stock se
   - F5 Toggle: Saree Gayi (Jane Wali) ⟷ Wapas Aayi (Aane Wali)
   - Live Batch Table (Farhan 10, Asif 20, Imran 15)
   - Live Godown Stock Display & Instant A6 Challan Print
============================================================================ */

(() => {
    'use strict';

    let activeCategory = 'calender'; // 'cutting' | 'calender' | 'dukan'
    let movementType = 'gayi';        // 'gayi' | 'aayi'
    let stockSource = 'cutting';     // 'cutting' | 'fresh'
    let expressBatchItems = [];
    let lastSavedExpressBatch = null;

    /* ========================================================================
       1. SAFE HELPERS & STORES
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
       2. OPEN BADA JOBWORK EXPRESS MODAL (880px COUNTER LAYOUT)
       ------------------------------------------------------------------------
    ======================================================================== */
    window.openJobWorkExpressModal = () => {
        const existing = document.getElementById('master-jobwork-express-modal');
        if (existing) existing.remove();

        activeCategory = 'calender';
        movementType = 'gayi';
        stockSource = 'cutting';
        expressBatchItems = [];
        lastSavedExpressBatch = null;

        const today = getToday();
        const activeKid = (typeof window.getActiveKarkhanaId === 'function') 
            ? window.getActiveKarkhanaId() 
            : (window.currentDashboardKarkhanaFilter || 'k_main');
        const godamName = (typeof window.getKarkhanaNameById === 'function') 
            ? window.getKarkhanaNameById(activeKid) 
            : 'Main Godown';

        const modalHtml = `
        <div id="master-jobwork-express-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.85); z-index:999999; display:flex; align-items:center; justify-content:center; padding:12px; box-sizing:border-box;">
            <div style="background:#ffffff; width:100%; max-width:880px; border-radius:12px; box-shadow:0 25px 40px -5px rgba(0,0,0,0.5); overflow:hidden; font-family:sans-serif; max-height:96vh; display:flex; flex-direction:column;">
                
                <!-- Header -->
                <div style="background:#0f172a; color:#fff; padding:12px 18px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:22px;">⚡</span>
                        <h3 style="margin:0; font-size:16px; letter-spacing:0.5px;">JOBWORK EXPRESS • जॉबवर्क बैच वाउचर काउन्टर</h3>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:11px; background:#1e293b; color:#38bdf8; padding:3px 8px; border-radius:4px; font-weight:bold;">[F1/F2/F3] Process | [F4] Stock Source | [F5] Gayi/Aayi | [Esc] Close</span>
                        <button type="button" onclick="closeJobWorkExpressModal()" style="background:transparent; border:none; color:#fff; font-size:24px; cursor:pointer; line-height:1;">&times;</button>
                    </div>
                </div>

                <!-- Body -->
                <div style="padding:16px; overflow-y:auto; flex:1;">
                    
                    <!-- 3 BADE PROCESS TABS (F1, F2, F3) -->
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:12px;">
                        <button type="button" id="jw-exp-cat-cutting" onclick="switchJobWorkCategory('cutting')" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:12px 8px; border-radius:8px; font-weight:900; font-size:14px; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:6px;">
                            ✂️ 1. CUTTING [F1 / Alt+1]
                        </button>
                        <button type="button" id="jw-exp-cat-calender" onclick="switchJobWorkCategory('calender')" style="background:#0284c7; color:#fff; border:none; padding:12px 8px; border-radius:8px; font-weight:900; font-size:14px; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:6px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                            🎛️ 2. CALENDER [F2 / Alt+2]
                        </button>
                        <button type="button" id="jw-exp-cat-dukan" onclick="switchJobWorkCategory('dukan')" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:12px 8px; border-radius:8px; font-weight:900; font-size:14px; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:6px;">
                            🏪 3. DUKAN [F3 / Alt+3]
                        </button>
                    </div>

                    <!-- SUB-BAR: F4 (Stock Source) & F5 (Gayi vs Aayi) -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                        <div style="display:flex; gap:8px; align-items:center;">
                            <span style="font-size:12px; font-weight:bold; color:#334155;">लेन-देन:</span>
                            <button type="button" id="jw-exp-btn-movement" onclick="toggleMovementType()" style="background:#dc2626; color:#fff; border:none; padding:6px 14px; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">
                                📤 Saree Gayi (Bheja) [F5]
                            </button>
                        </div>
                        <div id="jw-exp-source-container" style="display:flex; gap:8px; align-items:center;">
                            <span style="font-size:12px; font-weight:bold; color:#334155;">स्टॉक सोर्स:</span>
                            <button type="button" id="jw-exp-btn-source" onclick="toggleStockSource()" style="background:#0284c7; color:#fff; border:none; padding:6px 14px; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">
                                ✂️ Cutting Stock se [F4]
                            </button>
                        </div>
                        <div style="font-size:12px; color:#1e293b;">
                            🏢 <strong>गोदाम:</strong> <span style="color:#0284c7; font-weight:bold;">${esc(godamName)}</span>
                        </div>
                    </div>

                    <!-- 2-COLUMN BADA LAYOUT -->
                    <div style="display:grid; grid-template-columns:1.2fr 1fr; gap:14px;">
                        
                        <!-- COLUMN 1: WORKER, DATE & FAST BATCH ENTRY LOOP -->
                        <div style="background:#f8fafc; border:1.5px solid #cbd5e1; border-radius:10px; padding:14px;">
                            
                            <div style="display:grid; grid-template-columns:1.4fr 1fr; gap:8px; margin-bottom:10px;">
                                <div id="jw-exp-worker-box">
                                    <label id="jw-exp-lbl-worker" style="font-size:11px; font-weight:bold; color:#1e3a8a;">जॉब वर्कर (Kariger):</label>
                                    <select id="jw-exp-worker" style="width:100%; padding:8px; border:1.5px solid #cbd5e1; border-radius:6px; font-weight:bold; font-size:13px; margin-top:2px;"></select>
                                </div>
                                <div>
                                    <label style="font-size:11px; font-weight:bold; color:#475569;">तारीख (Date):</label>
                                    <input type="date" id="jw-exp-date" value="${today}" style="width:100%; padding:7px; border:1.5px solid #cbd5e1; border-radius:6px; font-size:12px; font-weight:bold; margin-top:2px; box-sizing:border-box;">
                                </div>
                            </div>

                            <!-- Fast Batch Loop Input Box -->
                            <div style="background:#eff6ff; border:2px solid #93c5fd; padding:12px; border-radius:8px; margin-bottom:10px;">
                                <div style="font-weight:800; color:#1e40af; font-size:12px; margin-bottom:6px; display:flex; justify-content:space-between;">
                                    <span>📦 Saree Batch Entry (Type & Press Enter):</span>
                                    <span id="jw-exp-live-stock-hint" style="color:#0284c7; font-weight:bold;"></span>
                                </div>

                                <div style="margin-bottom:8px;">
                                    <label style="font-size:11px; font-weight:bold; color:#1e3a8a;">बुन्ने वाला (Maker Kariger):</label>
                                    <input type="text" id="jw-exp-maker-input" list="dl-karigers-list" placeholder="Farhan / Asif / Imran..." autocomplete="off" style="width:100%; padding:9px 12px; border:2px solid #0284c7; border-radius:6px; font-size:15px; font-weight:bold; box-sizing:border-box; background:#ffffff;">
                                </div>

                                <div style="display:grid; grid-template-columns:1.2fr 1fr; gap:8px;">
                                    <div>
                                        <label style="font-size:11px; font-weight:bold; color:#1e3a8a;">Saree Qty (Pcs):</label>
                                        <input type="number" id="jw-exp-qty-input" placeholder="10 / 20" min="1" style="width:100%; padding:9px 12px; border:2px solid #0284c7; border-radius:6px; font-size:16px; font-weight:900; color:#1e3a8a; box-sizing:border-box;">
                                    </div>
                                    <div style="display:flex; align-items:flex-end;">
                                        <button type="button" id="jw-exp-add-row-btn" onclick="addExpressBatchRow()" style="background:#0284c7; color:#fff; border:none; width:100%; padding:11px; border-radius:6px; font-weight:bold; font-size:13px; cursor:pointer;">
                                            + Jodein [↵]
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Damage & Note Inputs -->
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                                <div>
                                    <label style="font-size:11px; font-weight:bold; color:#ea580c;">⚠️ Damage Saree (Pcs):</label>
                                    <input type="number" id="jw-exp-damage-pcs" placeholder="0" style="width:100%; padding:6px; border:1px solid #fed7aa; border-radius:4px; font-size:12px; box-sizing:border-box;">
                                </div>
                                <div>
                                    <label style="font-size:11px; font-weight:bold; color:#dc2626;">Damage Fine / Kaat (₹):</label>
                                    <input type="number" id="jw-exp-damage-amt" placeholder="0.00" style="width:100%; padding:6px; border:1px solid #fecaca; border-radius:4px; font-size:12px; box-sizing:border-box;">
                                </div>
                            </div>

                        </div>

                        <!-- COLUMN 2: LIVE BATCH TABLE (FARHAN 10, ASIF 20, IMRAN 15) -->
                        <div style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:10px; padding:14px; display:flex; flex-direction:column; justify-content:space-between;">
                            <div>
                                <h4 style="margin:0 0 10px 0; color:#1e3a8a; font-size:13px; border-bottom:1.5px solid #cbd5e1; padding-bottom:5px; display:flex; justify-content:space-between;">
                                    <span>📋 Gatthi / Batch List</span>
                                    <span id="jw-exp-batch-count-badge" style="color:#0284c7;">0 Items</span>
                                </h4>

                                <div class="table-responsive" style="max-height:230px; overflow-y:auto; border:1px solid #cbd5e1; border-radius:6px;">
                                    <table style="margin:0; width:100%;">
                                        <thead>
                                            <tr style="background:#1e3a8a; color:white; font-size:11px;">
                                                <th style="padding:6px 4px;">#</th>
                                                <th style="padding:6px 4px;">Maker</th>
                                                <th style="padding:6px 4px;">Saree</th>
                                                <th style="padding:6px 4px; text-align:right;">Qty</th>
                                                <th style="padding:6px 4px; text-align:center;">Del</th>
                                            </tr>
                                        </thead>
                                        <tbody id="jw-exp-table-body"></tbody>
                                    </table>
                                </div>
                            </div>

                            <!-- Total Batch Summary Card -->
                            <div style="background:#f0fdf4; border:1.5px dashed #86efac; border-radius:8px; padding:12px; text-align:center; margin-top:12px;">
                                <div style="font-size:11px; color:#64748b; font-weight:bold;">KUL BATCH SAREE:</div>
                                <div id="jw-exp-live-batch-total" style="font-size:24px; font-weight:900; color:#15803d; margin-top:2px;">
                                    0 Pcs
                                </div>
                                <div id="jw-exp-live-batch-summary" style="font-size:11px; color:#475569; margin-top:3px;">
                                    Batch khali hai
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- Footer Action Bar -->
                <div style="background:#f1f5f9; padding:12px 18px; border-top:1px solid #cbd5e1; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div id="jw-exp-status-msg" style="font-size:12px; font-weight:bold; color:#059669;"></div>
                    <div style="display:flex; gap:8px;">
                        <button type="button" id="jw-exp-print-btn" onclick="printLastSavedJobWorkChallan()" style="background:#1e3a8a; color:#ffffff; border:none; padding:10px 16px; border-radius:8px; font-size:13px; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                            🖨️ A6 Challan [Alt+P]
                        </button>
                        <button type="button" id="jw-exp-submit-btn" onclick="submitMasterJobWorkExpress(true)" style="background:#15803d; color:#ffffff; border:none; padding:11px 26px; border-radius:8px; font-size:15px; font-weight:900; cursor:pointer; box-shadow:0 4px 6px rgba(21,128,61,0.3); display:inline-flex; align-items:center; gap:8px;">
                            🚀 बैच सेव व चालान [ CTRL + ENTER ]
                        </button>
                    </div>
                </div>

            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        bindJobWorkExpressEvents();
        updateCategoryStyles();
        populateExpressWorkers();
        updateSubBarState();
    };

    /* ========================================================================
       3. KEYBOARD EVENT LISTENERS (F1, F2, F3, F4, F5 & ENTER LOOP)
       ------------------------------------------------------------------------
    ======================================================================== */
    const bindJobWorkExpressEvents = () => {
        const modal = document.getElementById('master-jobwork-express-modal');
        if (!modal) return;

        const makerInp = document.getElementById('jw-exp-maker-input');
        const qtyInp = document.getElementById('jw-exp-qty-input');

        setTimeout(() => { if (makerInp) makerInp.focus(); }, 120);

        if (makerInp) {
            makerInp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (makerInp.value.trim() && qtyInp) {
                        qtyInp.focus();
                        qtyInp.select();
                    }
                }
            });
            makerInp.addEventListener('input', updateMakerLiveStockDisplay);
        }

        if (qtyInp) {
            qtyInp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addExpressBatchRow();
                }
            });
        }

        window.removeEventListener('keydown', handleJobWorkExpressGlobalKeydown);
        window.addEventListener('keydown', handleJobWorkExpressGlobalKeydown);
    };

    const handleJobWorkExpressGlobalKeydown = (e) => {
        const modal = document.getElementById('master-jobwork-express-modal');
        if (!modal || modal.style.display === 'none') return;

        // Escape -> Close
        if (e.key === 'Escape') {
            e.preventDefault();
            closeJobWorkExpressModal();
            return;
        }

        // F1 or Alt+1 -> Cutting
        if (e.key === 'F1' || (e.altKey && (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1'))) {
            e.preventDefault();
            switchJobWorkCategory('cutting');
            return;
        }

        // F2 or Alt+2 -> Calender
        if (e.key === 'F2' || (e.altKey && (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2'))) {
            e.preventDefault();
            switchJobWorkCategory('calender');
            return;
        }

        // F3 or Alt+3 -> Dukan
        if (e.key === 'F3' || (e.altKey && (e.key === '3' || e.code === 'Digit3' || e.code === 'Numpad3'))) {
            e.preventDefault();
            switchJobWorkCategory('dukan');
            return;
        }

        // ⭐ F4 -> Toggle Stock Source (Fresh se ⟷ Cutting se)
        if (e.key === 'F4' || (e.altKey && (e.key === '4' || e.code === 'Digit4' || e.code === 'Numpad4'))) {
            e.preventDefault();
            toggleStockSource();
            return;
        }

        // ⭐ F5 -> Toggle Movement Type (Saree Gayi ⟷ Wapas Aayi)
        if (e.key === 'F5' || (e.altKey && (e.key === '5' || e.code === 'Digit5' || e.code === 'Numpad5'))) {
            e.preventDefault(); // Browser refresh block
            toggleMovementType();
            return;
        }

        // Ctrl + Enter -> Save & Print
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            submitMasterJobWorkExpress(true);
            return;
        }

        // Alt + P -> Print Last Challan
        if (e.altKey && (e.key === 'p' || e.key === 'P')) {
            e.preventDefault();
            printLastSavedJobWorkChallan();
            return;
        }
    };

    window.closeJobWorkExpressModal = () => {
        window.removeEventListener('keydown', handleJobWorkExpressGlobalKeydown);
        const modal = document.getElementById('master-jobwork-express-modal');
        if (modal) modal.remove();
        expressBatchItems = [];
    };

    /* ========================================================================
       4. CATEGORY & TOGGLE CONTROLLERS (F1, F2, F3, F4, F5)
       ------------------------------------------------------------------------
    ======================================================================== */
    window.switchJobWorkCategory = (cat) => {
        activeCategory = cat;
        updateCategoryStyles();
        populateExpressWorkers();
        updateSubBarState();
        updateMakerLiveStockDisplay();
    };

    window.toggleStockSource = () => {
        stockSource = (stockSource === 'cutting') ? 'fresh' : 'cutting';
        updateSubBarState();
        updateMakerLiveStockDisplay();
    };

    window.toggleMovementType = () => {
        movementType = (movementType === 'gayi') ? 'aayi' : 'gayi';
        updateSubBarState();
        updateMakerLiveStockDisplay();
    };

    const updateCategoryStyles = () => {
        const btnCut = document.getElementById('jw-exp-cat-cutting');
        const btnCal = document.getElementById('jw-exp-cat-calender');
        const btnDuk = document.getElementById('jw-exp-cat-dukan');

        [btnCut, btnCal, btnDuk].forEach(b => {
            if (b) { b.style.background = '#f1f5f9'; b.style.color = '#475569'; b.style.border = '1px solid #cbd5e1'; }
        });

        if (activeCategory === 'cutting' && btnCut) {
            btnCut.style.background = '#e11d48'; btnCut.style.color = '#fff'; btnCut.style.border = 'none';
        } else if (activeCategory === 'calender' && btnCal) {
            btnCal.style.background = '#0284c7'; btnCal.style.color = '#fff'; btnCal.style.border = 'none';
        } else if (activeCategory === 'dukan' && btnDuk) {
            btnDuk.style.background = '#15803d'; btnDuk.style.color = '#fff'; btnDuk.style.border = 'none';
        }
    };

    const updateSubBarState = () => {
        const btnMov = document.getElementById('jw-exp-btn-movement');
        const btnSrc = document.getElementById('jw-exp-btn-source');
        const srcContainer = document.getElementById('jw-exp-source-container');
        const workerBox = document.getElementById('jw-exp-worker-box');

        // Movement button styling (F5)
        if (btnMov) {
            if (activeCategory === 'dukan') {
                movementType = 'gayi'; // Dukan is always Outward
                btnMov.style.background = '#15803d';
                btnMov.innerHTML = '🏪 Dukan Bheja (Final Out)';
                btnMov.disabled = true;
            } else {
                btnMov.disabled = false;
                if (movementType === 'gayi') {
                    btnMov.style.background = '#dc2626';
                    btnMov.innerHTML = '📤 Saree Gayi (Bheja) [F5]';
                } else {
                    btnMov.style.background = '#059669';
                    btnMov.innerHTML = '📥 Wapas Aayi (Tayyar) [F5]';
                }
            }
        }

        // Stock Source button styling (F4)
        if (srcContainer) {
            if (activeCategory === 'calender' && movementType === 'gayi') {
                srcContainer.style.display = 'flex';
                if (btnSrc) {
                    if (stockSource === 'cutting') {
                        btnSrc.style.background = '#0284c7';
                        btnSrc.innerHTML = '✂️ Cutting Stock se [F4]';
                    } else {
                        btnSrc.style.background = '#2563eb';
                        btnSrc.innerHTML = '🥻 Fresh Godown se [F4]';
                    }
                }
            } else {
                srcContainer.style.display = 'none';
            }
        }

        // Worker Box Label
        const lblWorker = document.getElementById('jw-exp-lbl-worker');
        if (lblWorker) {
            if (activeCategory === 'dukan') {
                lblWorker.textContent = 'Dukan / Receiver:';
            } else {
                lblWorker.textContent = `${activeCategory === 'calender' ? 'Calender' : 'Cutting'} Kariger:`;
            }
        }
    };

    const populateExpressWorkers = () => {
        const wSel = document.getElementById('jw-exp-worker');
        if (!wSel) return;

        wSel.innerHTML = '';
        if (activeCategory === 'dukan') {
            wSel.innerHTML = '<option value="dukan_main">🏪 Apni Main Dukan</option><option value="dukan_party">🏪 Party / Retailer</option>';
            return;
        }

        const allWorkers = toArray(getFromStore('jobwork_workers'));
        const filtered = allWorkers.filter((w) => String(w?.type || '').toLowerCase() === activeCategory);

        if (!filtered.length) {
            wSel.innerHTML = '<option value="">Koi Kariger nahi mila</option>';
            return;
        }

        filtered.forEach((w) => {
            const opt = document.createElement('option');
            opt.value = w.id;
            opt.textContent = w.name;
            wSel.appendChild(opt);
        });
    };

    const updateMakerLiveStockDisplay = () => {
        const mInp = document.getElementById('jw-exp-maker-input');
        const hint = document.getElementById('jw-exp-live-stock-hint');
        if (!hint) return;

        const val = String(mInp?.value || '').trim().toUpperCase();
        if (!val) {
            hint.textContent = '';
            return;
        }

        if (typeof window.getKarigerAvailableSareeStock === 'function') {
            const stock = window.getKarigerAvailableSareeStock(val);
            if (activeCategory === 'calender' && movementType === 'gayi') {
                const avail = (stockSource === 'cutting') ? stock.cutting : stock.fresh;
                hint.textContent = `(Stock me: ${avail} Pcs ${stockSource.toUpperCase()})`;
            } else if (activeCategory === 'cutting' && movementType === 'gayi') {
                hint.textContent = `(Fresh Stock me: ${stock.fresh} Pcs)`;
            } else {
                hint.textContent = `(Total: ${stock.total} Pcs)`;
            }
        }
    };

    /* ========================================================================
       5. BATCH BUILDER LOOP (FARHAN 10, ASIF 20, IMRAN 15)
       ------------------------------------------------------------------------
    ======================================================================== */
    window.addExpressBatchRow = () => {
        const mInp = document.getElementById('jw-exp-maker-input');
        const qInp = document.getElementById('jw-exp-qty-input');

        const makerName = String(mInp?.value || '').trim().toUpperCase();
        const qty = safeInt(qInp?.value);

        if (!makerName) {
            alert('कृपया बुन्ने वाले कारीगर का नाम लिखिए!');
            mInp?.focus();
            return;
        }

        if (qty <= 0) {
            alert('कृपया सही साड़ी संख्या (Qty Pcs) भरिए!');
            qInp?.focus();
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

    window.removeExpressBatchItem = (idx) => {
        expressBatchItems.splice(idx, 1);
        renderExpressBatchGrid();
    };

    const renderExpressBatchGrid = () => {
        const tbody = document.getElementById('jw-exp-table-body');
        const totalDisp = document.getElementById('jw-exp-live-batch-total');
        const summaryDisp = document.getElementById('jw-exp-live-batch-summary');
        const badge = document.getElementById('jw-exp-batch-count-badge');
        if (!tbody) return;

        let total = 0;
        let html = '';

        if (!expressBatchItems.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px; color:#888;">Gatthi khali hai. Upar Kariger likhkar [Enter] dabayein.</td></tr>';
            if (totalDisp) totalDisp.textContent = '0 Pcs';
            if (summaryDisp) summaryDisp.textContent = 'Batch khali hai';
            if (badge) badge.textContent = '0 Items';
            return;
        }

        expressBatchItems.forEach((it, idx) => {
            total += it.qty;
            html += `<tr>
                <td style="padding:5px 4px;">${idx + 1}</td>
                <td style="padding:5px 4px; font-weight:bold;">${esc(it.maker)}</td>
                <td style="padding:5px 4px;">${esc(it.saree)}</td>
                <td style="padding:5px 4px; text-align:right; font-weight:800; color:#1e3a8a;">${it.qty} Pcs</td>
                <td style="padding:5px 4px; text-align:center;">
                    <button type="button" onclick="removeExpressBatchItem(${idx})" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:4px; padding:2px 6px; cursor:pointer; font-weight:bold;">✕</button>
                </td>
            </tr>`;
        });

        tbody.innerHTML = html;
        if (totalDisp) totalDisp.textContent = `${total} Pcs`;
        if (summaryDisp) summaryDisp.textContent = `Kul ${expressBatchItems.length} Karigaron ki gatthi`;
        if (badge) badge.textContent = `${expressBatchItems.length} Kariger`;
    };

    /* ========================================================================
       6. ATOMIC COMMIT (JOBWORK SHEETS + SAREE HISTORY + DUKAN)
       ------------------------------------------------------------------------
    ======================================================================== */
    window.submitMasterJobWorkExpress = (doPrint = false) => {
        const wSel = document.getElementById('jw-exp-worker');
        const dInp = document.getElementById('jw-exp-date');

        const workerId = wSel?.value;
        if (!workerId) return alert('कृपया जॉब वर्कर का चुनाव करें!');

        const isDukan = (activeCategory === 'dukan');
        const allWorkers = toArray(getFromStore('jobwork_workers'));
        const worker = isDukan ? { name: wSel.options[wSel.selectedIndex]?.text || 'Apni Dukan' } : allWorkers.find((x) => String(x.id) === String(workerId));
        const workerName = worker ? worker.name : 'Worker';

        const isGayi = (movementType === 'gayi');
        const isCalender = (activeCategory === 'calender');
        const d = dInp?.value || getToday();

        const damagePcs = safeInt(document.getElementById('jw-exp-damage-pcs')?.value);
        const damageAmt = safeNum(document.getElementById('jw-exp-damage-amt')?.value);

        if (!expressBatchItems.length && damagePcs <= 0) {
            return alert('बैच में कम से कम 1 कारीगर की साड़ी जोड़िए!');
        }

        const batchRowId = `jwb_${Date.now()}`;
        let totQty = 0;
        expressBatchItems.forEach((x) => { totQty += x.qty; });

        // --- 1. COMMIT TO SAREE HISTORY ---
        let sH = [...toArray(getFromStore('saree_history'))];
        const allKars = toArray(getFromStore('kariger_list'));
        const targetLabel = isDukan ? '🏪 Apni Dukan' : (isCalender ? `${workerName} (Calender)` : `${workerName} (Cutting)`);

        expressBatchItems.forEach((it) => {
            const foundKar = allKars.find((k) => k?.name && k.name.trim().toUpperCase() === it.maker);
            const kGodown = foundKar?.karkhanaId || 'k_main';

            if (isDukan) {
                // Dukan Outward
                sH.push({
                    id: `sh_dukan_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                    refId: batchRowId,
                    date: d,
                    sareeName: it.saree,
                    karigerName: it.maker,
                    kariger: it.maker,
                    partyName: '🏪 Apni Dukan',
                    targetWorker: '🏪 Apni Dukan',
                    karkhanaId: kGodown,
                    type: 'finished',
                    typeLabel: `🏪 Dukan Bheja (Challan)`,
                    aai: 0,
                    gai: it.qty,
                    isOut: true,
                    note: `${it.saree} (Apni Dukan)`,
                    timestamp: Date.now()
                });
            } else if (isGayi) {
                // JobWork Outward
                const effStockSource = isCalender ? stockSource : 'fresh';
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
                    type: effStockSource,
                    typeLabel: `📤 ${targetLabel} ko bheja [${effStockSource === 'cutting' ? 'Cutting Stock' : 'Fresh Stock'}]`,
                    aai: 0,
                    gai: it.qty,
                    isOut: true,
                    note: `${targetLabel} ko bheja (${effStockSource})`,
                    timestamp: Date.now()
                });
            } else {
                // JobWork Inward
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

        // Damage entry
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

        // --- 2. COMMIT TO DUKAN OR JOBWORK SHEETS ---
        if (isDukan) {
            const dukList = [...toArray(getFromStore('dukan_transfer_history'))];
            expressBatchItems.forEach((it) => {
                dukList.push({
                    id: `duk_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                    date: d,
                    sareeName: it.saree,
                    karigerName: it.maker,
                    pcs: it.qty,
                    note: 'Apni Dukan (Express)',
                    timestamp: Date.now()
                });
            });
            setToStore('dukan_transfer_history', dukList);
        } else {
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
                stockSource: (isCalender && isGayi) ? stockSource : 'fresh',
                aayiQty: isGayi ? 0 : totQty,
                aayiItems: isGayi ? [] : batchItemsFormatted,
                damagePcs,
                damageAmt
            });

            setToStore(`jobwork_sheets_${workerId}`, sheets);
        }

        // Cache for A6 Print Slip
        lastSavedExpressBatch = {
            category: activeCategory.toUpperCase(),
            worker: workerName,
            date: d,
            isGayi: isGayi,
            source: stockSource,
            items: [...expressBatchItems],
            damagePcs: damagePcs
        };

        // Cache Invalidation
        if (typeof window.invalidateJobWorkCache === 'function') window.invalidateJobWorkCache(workerId);
        if (typeof window.invalidateSareeCalcCache === 'function') window.invalidateSareeCalcCache();
        if (typeof window.invalidateCalenderCalcCache === 'function') window.invalidateCalenderCalcCache();
        if (typeof window.invalidateCuttingCalcCache === 'function') window.invalidateCuttingCalcCache();

        if (typeof window.updateJobWorkHubBadges === 'function') window.updateJobWorkHubBadges();
        if (typeof window.renderSareeTable === 'function') window.renderSareeTable();
        if (typeof window.updateDashboardBadgeTotals === 'function') window.updateDashboardBadgeTotals();
        if (typeof window.renderDukanTransferTable === 'function') window.renderDukanTransferTable();

        if (doPrint) {
            printLastSavedJobWorkChallan();
        }

        // Reset Batch List for next entry
        expressBatchItems = [];
        renderExpressBatchGrid();

        const statusMsg = document.getElementById('jw-exp-status-msg');
        if (statusMsg) {
            statusMsg.innerHTML = `✅ ${totQty} Pcs साड़ी बैच [${esc(workerName)}] के खाते में दर्ज हो गया!`;
        }

        const mInp = document.getElementById('jw-exp-maker-input');
        if (mInp) mInp.focus();
    };

    /* ========================================================================
       7. A6 THERMAL PRINT CHALLAN (BATCH BREAKDOWN)
       ------------------------------------------------------------------------
    ======================================================================== */
    window.printLastSavedJobWorkChallan = () => {
        if (!lastSavedExpressBatch || !lastSavedExpressBatch.items.length) {
            return alert('प्रिंट करने के लिए कोई रीसेंट बैच एंट्री नहीं मिली!');
        }

        const b = lastSavedExpressBatch;
        let tot = 0;
        let rowsHtml = '';

        b.items.forEach((it, idx) => {
            tot += it.qty;
            rowsHtml += `
                <tr style="border-bottom:1px dashed #ccc;">
                    <td style="padding:4px 2px;">${idx + 1}</td>
                    <td style="padding:4px 2px; font-weight:bold;">${esc(it.maker)}</td>
                    <td style="padding:4px 2px;">${esc(it.saree)}</td>
                    <td style="padding:4px 2px; text-align:right; font-weight:bold;">${it.qty}</td>
                </tr>`;
        });

        const titleText = (b.category === 'DUKAN') ? 'DUKAN DISPATCH CHALLAN' : (b.isGayi ? 'JOB WORK DISPATCH (GAYI)' : 'JOB WORK RECEIPT (AAYI)');
        const processLabel = (b.category === 'CALENDER') ? 'CALENDER FINISHING' : (b.category === 'CUTTING' ? 'BOOTI CUTTING' : 'DUKAN TRANSFER');

        const printWindow = window.open('', '', 'width=420,height=580');
        if (!printWindow) return alert('Popup block hai! Kripya allow karein.');

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
                        <p>⚡ ${titleText}</p>
                    </div>
                    <div class="meta">
                        <div><strong>Party / Worker:</strong> ${esc(b.worker)} (${processLabel})</div>
                        <div><strong>Tarikh:</strong> ${formatDisplay(b.date)}</div>
                        ${b.isGayi && b.category === 'CALENDER' ? `<div><strong>Stock Source:</strong> ${b.source.toUpperCase()} STOCK</div>` : ''}
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
                        KUL SAREE: ${tot} Pcs ${b.damagePcs > 0 ? `(Dmg: ${b.damagePcs})` : ''}
                    </div>
                    <div class="signs">
                        <div>हस्ताक्षर मुंशी<br><br>________</div>
                        <div>हस्ताक्षर पाने वाला<br><br>________</div>
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
    window.JobWorkExpressEngine = {
        openJobWorkExpressModal,
        closeJobWorkExpressModal,
        switchJobWorkCategory,
        toggleStockSource,
        toggleMovementType,
        addExpressBatchRow,
        removeExpressBatchItem,
        submitMasterJobWorkExpress,
        printLastSavedJobWorkChallan
    };

})();
