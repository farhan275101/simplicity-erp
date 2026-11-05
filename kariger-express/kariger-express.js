/* ============================================================================
   SIMPLICITY ERP - ⚡ MASTER KARIGER EXPRESS ENGINE (100% ZERO-MOUSE + A6 PRINT)
   Folder: kariger-express / File: kariger-express.js
   Developed for: Farhan Jawed
   Features:
   - 100% Zero-Mouse: Sequential Enter-Key Chaining & Auto-Focus
   - Live Godown Stock Badges for Bana & Zari (Bacha: 0.00 Kg)
   - Tani Warp Tracking (Total Saree Pcs, Delivered so far, Remaining on Loom)
   - 8 Colors Live Matching Tags Display
   - Complete A6 Thermal Slip Print Engine (with Shortcuts: Alt+P)
============================================================================ */

(() => {
    'use strict';

    let selectedKariger = null;
    let currentActiveSheet = null;
    let prevDeliveredSarees = 0;
    let lastSavedTransaction = null;

    const esc = (s) => {
        if (typeof window.sanitizeHTML === 'function') return window.sanitizeHTML(s);
        return String(s || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    };

    const safeNum = (val, fallback = 0) => {
        const n = parseFloat(val);
        return isNaN(n) || !isFinite(n) ? fallback : n;
    };

    const getToday = () => {
        return (typeof window.getTodayDate === 'function') 
            ? window.getTodayDate() 
            : new Date().toISOString().split('T')[0];
    };

    // Live Godown Stock Checkers
    const getBanaStockBacha = (itemName, kGodown) => {
        if (!itemName) return 0;
        if (typeof window.getBanaItemStats === 'function') {
            return safeNum(window.getBanaItemStats(itemName, kGodown).bacha);
        }
        const raw = window.safeArray ? window.safeArray(window.getStore('bana_stock')) : [];
        const item = raw.find(x => x && x.name && x.name.toLowerCase() === itemName.toLowerCase() && 
            ((!x.karkhanaId && kGodown === 'k_main') || String(x.karkhanaId) === String(kGodown)));
        return item ? safeNum(item.bacha) : 0;
    };

    const getZariStockBacha = (itemName, kGodown) => {
        if (!itemName) return 0;
        if (typeof window.getZariItemStats === 'function') {
            return safeNum(window.getZariItemStats(itemName, kGodown).bacha);
        }
        const raw = window.safeArray ? window.safeArray(window.getStore('zari_stock')) : [];
        const item = raw.find(x => x && x.name && x.name.toLowerCase() === itemName.toLowerCase() && 
            ((!x.karkhanaId && kGodown === 'k_main') || String(x.karkhanaId) === String(kGodown)));
        return item ? safeNum(item.bacha) : 0;
    };

    // Datalists Builder
    const getKarigerExpressDatalists = () => {
        const rawKarigers = window.safeArray ? window.safeArray(window.getStore('kariger_list')) : [];
        let kOpts = '';
        rawKarigers.forEach((k) => {
            if (k && k.name) {
                const sDesign = k.saree ? ` [${k.saree}]` : '';
                kOpts += `<option value="${esc(k.name)}">${esc(k.name)}${esc(sDesign)}</option>`;
            }
        });

        const rawBana = window.safeArray ? window.safeArray(window.getStore('bana_stock')) : [];
        const uB = [];
        let bOpts = '';
        rawBana.forEach((b) => {
            if (b && b.name && uB.indexOf(b.name.trim().toLowerCase()) === -1) {
                uB.push(b.name.trim().toLowerCase());
                bOpts += `<option value="${esc(b.name.trim())}">`;
            }
        });

        const rawZari = window.safeArray ? window.safeArray(window.getStore('zari_stock')) : [];
        const uZ = [];
        let zOpts = '';
        rawZari.forEach((z) => {
            if (z && z.name && uZ.indexOf(z.name.trim().toLowerCase()) === -1) {
                uZ.push(z.name.trim().toLowerCase());
                zOpts += `<option value="${esc(z.name.trim())}">`;
            }
        });

        return { kOpts, bOpts, zOpts };
    };

    // 1. OPEN KARIGER EXPRESS MODAL
    window.openKarigerExpressModal = () => {
        const existing = document.getElementById('kariger-express-modal');
        if (existing) existing.remove();

        selectedKariger = null;
        currentActiveSheet = null;
        prevDeliveredSarees = 0;
        lastSavedTransaction = null;

        const { kOpts, bOpts, zOpts } = getKarigerExpressDatalists();
        const today = getToday();

        const modalHtml = `
        <div id="kariger-express-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.85); z-index:999999; display:flex; align-items:center; justify-content:center; padding:12px; box-sizing:border-box;">
            <div style="background:#ffffff; width:100%; max-width:880px; border-radius:12px; box-shadow:0 25px 40px -5px rgba(0,0,0,0.5); overflow:hidden; font-family:sans-serif; max-height:96vh; display:flex; flex-direction:column;">
                
                <!-- Modal Top Header -->
                <div style="background:#0f172a; color:#fff; padding:12px 18px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:20px;">⚡</span>
                        <h3 style="margin:0; font-size:16px;">KARIGER EXPRESS • कारीगर बैठक काउन्टर</h3>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:11px; background:#1e293b; color:#38bdf8; padding:3px 8px; border-radius:4px; font-weight:bold;">[Enter] Next Box | [F2] Search | [Alt+P] Print</span>
                        <button type="button" onclick="closeKarigerExpressModal()" style="background:transparent; border:none; color:#fff; font-size:24px; cursor:pointer; line-height:1;">&times;</button>
                    </div>
                </div>

                <!-- Form Body -->
                <div style="padding:16px; overflow-y:auto; flex:1;">
                    
                    <!-- Row 1: Date & Kariger Selector -->
                    <div style="display:grid; grid-template-columns:150px 1fr; gap:12px; margin-bottom:12px;">
                        <div>
                            <label style="font-size:11px; font-weight:bold; color:#475569;">तारीख (Date):</label>
                            <input type="date" id="kexp-date" value="${today}" data-next="kexp-kariger-input" style="width:100%; padding:8px; border:1.5px solid #cbd5e1; border-radius:6px; font-size:13px; font-weight:bold; box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="font-size:11px; font-weight:bold; color:#1e3a8a;">कारीगर का नाम लिखें (F2 Search):</label>
                            <input type="text" id="kexp-kariger-input" list="kexp-kariger-dl" data-next="kexp-saree-qty" placeholder="1-2 akshar likhein..." autocomplete="off" style="width:100%; padding:9px 12px; border:2px solid #2563eb; border-radius:6px; font-size:15px; font-weight:bold; box-sizing:border-box; background:#eff6ff;">
                            <datalist id="kexp-kariger-dl">${kOpts}</datalist>
                        </div>
                    </div>

                    <!-- Live Weaver & Tani Progress Snapshot Banner -->
                    <div id="kexp-weaver-banner" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; margin-bottom:14px;">
                        <span style="font-size:12px; color:#64748b;">कारीगर चुनिए, तानी का पूरा हिसाब और कलर यहाँ दिखेंगे...</span>
                    </div>

                    <!-- 3-Column Express Grid -->
                    <div style="display:grid; grid-template-columns:1fr 1fr 1.1fr; gap:12px;">
                        
                        <!-- COLUMN 1: SAREE & RETURN -->
                        <div style="background:#ecfdf5; border:1.5px solid #a7f3d0; border-radius:8px; padding:12px;">
                            <h4 style="margin:0 0 10px 0; color:#065f46; font-size:13px; border-bottom:1px solid #a7f3d0; padding-bottom:5px;">📦 माल आया (Inward)</h4>
                            
                            <div style="margin-bottom:8px;">
                                <label style="font-size:11px; font-weight:bold; color:#374151;">साड़ी संख्या (Pcs):</label>
                                <input type="number" id="kexp-saree-qty" data-next="kexp-saree-lott" min="0" placeholder="0" oninput="calculateKarigerExpressLive()" style="width:100%; padding:8px; border:1.5px solid #10b981; border-radius:6px; font-size:16px; font-weight:900; color:#065f46; box-sizing:border-box;">
                            </div>
                            <div style="margin-bottom:8px;">
                                <label style="font-size:11px; font-weight:bold; color:#b91c1c;">लॉट / कट साड़ी (Pcs):</label>
                                <input type="number" id="kexp-saree-lott" data-next="kexp-ret-bana" min="0" placeholder="0" oninput="calculateKarigerExpressLive()" style="width:100%; padding:7px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; font-weight:bold; color:#dc2626; box-sizing:border-box;">
                            </div>
                            <div style="margin-bottom:8px;">
                                <label style="font-size:11px; font-weight:bold; color:#374151;">बचा बाना वापसी (Kg):</label>
                                <input type="number" step="0.01" id="kexp-ret-bana" data-next="kexp-ret-zari" placeholder="0.00" style="width:100%; padding:7px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;">
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:bold; color:#374151;">बची जरी वापसी (Kg):</label>
                                <input type="number" step="0.01" id="kexp-ret-zari" data-next="kexp-bana-name" placeholder="0.00" style="width:100%; padding:7px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;">
                            </div>
                        </div>

                        <!-- COLUMN 2: BANA & ZARI ISSUE WITH LIVE STOCK BADGES -->
                        <div style="background:#eff6ff; border:1.5px solid #bfdbfe; border-radius:8px; padding:12px;">
                            <h4 style="margin:0 0 10px 0; color:#1e40af; font-size:13px; border-bottom:1px solid #bfdbfe; padding-bottom:5px;">🧶 कच्चा माल दिया (Outward)</h4>
                            
                            <div style="margin-bottom:8px;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <label style="font-size:11px; font-weight:bold; color:#374151;">बाना आइटम चुनें:</label>
                                    <small id="kexp-live-bana-badge" style="color:#059669; font-weight:bold; font-size:11px;">Bacha: 0.00 Kg</small>
                                </div>
                                <input type="text" id="kexp-bana-name" list="kexp-bana-dl" data-next="kexp-bana-cone" placeholder="Bana..." oninput="updateExpressStockBadges()" style="width:100%; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; font-weight:bold; box-sizing:border-box; margin-top:2px;">
                                <datalist id="kexp-bana-dl">${bOpts}</datalist>
                            </div>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:8px;">
                                <div>
                                    <label style="font-size:10px; font-weight:bold; color:#475569;">Bana (Gross):</label>
                                    <input type="number" step="0.01" id="kexp-bana-cone" data-next="kexp-bana-lesstp" placeholder="0.00" oninput="calculateKarigerExpressLive()" style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; font-weight:bold; box-sizing:border-box;">
                                </div>
                                <div>
                                    <label style="font-size:10px; font-weight:bold; color:#dc2626;">Less TP:</label>
                                    <input type="number" step="0.01" id="kexp-bana-lesstp" data-next="kexp-zari-name" placeholder="0.00" oninput="calculateKarigerExpressLive()" style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;">
                                </div>
                            </div>

                            <div style="margin-bottom:8px;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <label style="font-size:11px; font-weight:bold; color:#374151;">जरी आइटम चुनें:</label>
                                    <small id="kexp-live-zari-badge" style="color:#ea580c; font-weight:bold; font-size:11px;">Bacha: 0.00 Kg</small>
                                </div>
                                <input type="text" id="kexp-zari-name" list="kexp-zari-dl" data-next="kexp-zari-qty" placeholder="Zari..." oninput="updateExpressStockBadges()" style="width:100%; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; font-weight:bold; box-sizing:border-box; margin-top:2px;">
                                <datalist id="kexp-zari-dl">${zOpts}</datalist>
                            </div>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                                <div>
                                    <label style="font-size:10px; font-weight:bold; color:#475569;">Zari (Gross):</label>
                                    <input type="number" step="0.01" id="kexp-zari-qty" data-next="kexp-zari-topi" placeholder="0.00" oninput="calculateKarigerExpressLive()" style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; font-weight:bold; box-sizing:border-box;">
                                </div>
                                <div>
                                    <label style="font-size:10px; font-weight:bold; color:#dc2626;">Topi (Less):</label>
                                    <input type="number" step="0.01" id="kexp-zari-topi" data-next="kexp-paid-amount" placeholder="0.00" oninput="calculateKarigerExpressLive()" style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;">
                                </div>
                            </div>
                        </div>

                        <!-- COLUMN 3: MAZDOORI & ROKAD -->
                        <div style="background:#fff7ed; border:1.5px solid #fed7aa; border-radius:8px; padding:12px; display:flex; flex-direction:column; justify-content:space-between;">
                            <div>
                                <h4 style="margin:0 0 10px 0; color:#9a3412; font-size:13px; border-bottom:1px solid #fed7aa; padding-bottom:5px;">💰 मजदूरी व रोकड़ हिसाब</h4>
                                
                                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:5px;">
                                    <span>बानी रेट (प्रति साड़ी):</span>
                                    <strong id="kexp-disp-bani-rate">₹ 0.00</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:8px;">
                                    <span>आज की मजदूरी (Gross):</span>
                                    <strong id="kexp-disp-gross-bani" style="color:#059669;">₹ 0.00</strong>
                                </div>

                                <div style="margin-bottom:8px;">
                                    <label style="font-size:11px; font-weight:bold; color:#374151;">आज रोकड़ / खर्चे दिया (₹):</label>
                                    <input type="number" id="kexp-paid-amount" placeholder="₹0" oninput="calculateKarigerExpressLive()" style="width:100%; padding:9px; border:2px solid #ea580c; border-radius:6px; font-size:17px; font-weight:900; color:#c2410c; box-sizing:border-box;">
                                </div>

                                <div style="background:#ffffff; border:1px dashed #fdba74; border-radius:6px; padding:8px; text-align:center;">
                                    <div style="font-size:11px; color:#64748b;">कारीगर का अंतिम बाकी रुपया:</div>
                                    <div id="kexp-disp-net-balance" style="font-size:18px; font-weight:900; color:#1e3a8a;">₹ 0.00</div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- Footer Action Bar -->
                <div style="background:#f1f5f9; padding:12px 18px; border-top:1px solid #cbd5e1; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div id="kexp-status-msg" style="font-size:12px; font-weight:bold; color:#059669;"></div>
                    <div style="display:flex; gap:8px;">
                        <button type="button" id="kexp-print-btn" onclick="printLastSavedExpressSlip()" style="background:#1e3a8a; color:#ffffff; border:none; padding:10px 16px; border-radius:8px; font-size:13px; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                            🖨️ A6 Parchi [Alt+P]
                        </button>
                        <button type="button" id="kexp-submit-btn" onclick="submitKarigerExpress()" style="background:#059669; color:#ffffff; border:none; padding:11px 24px; border-radius:8px; font-size:15px; font-weight:900; cursor:pointer; box-shadow:0 4px 6px rgba(5,150,105,0.3); display:inline-flex; align-items:center; gap:8px;">
                            💾 पक्का करें & पर्ची [ ENTER ]
                        </button>
                    </div>
                </div>

            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        bindKarigerExpressEvents();
    };

    // 2. LIVE GODOWN STOCK BADGE UPDATER
    window.updateExpressStockBadges = () => {
        const kGodown = selectedKariger ? (selectedKariger.karkhanaId || 'k_main') : 'k_main';
        const bName = String(document.getElementById('kexp-bana-name')?.value || '').trim();
        const zName = String(document.getElementById('kexp-zari-name')?.value || '').trim();

        const bBacha = getBanaStockBacha(bName, kGodown);
        const zBacha = getZariStockBacha(zName, kGodown);

        const bBadge = document.getElementById('kexp-live-bana-badge');
        const zBadge = document.getElementById('kexp-live-zari-badge');

        if (bBadge) bBadge.textContent = `Bacha: ${bBacha.toFixed(2)} Kg`;
        if (zBadge) zBadge.textContent = `Bacha: ${zBacha.toFixed(2)} Kg`;
    };

    // 3. ZERO-MOUSE KEYBOARD CHAINING & SHORTCUTS
    const bindKarigerExpressEvents = () => {
        const modal = document.getElementById('kariger-express-modal');
        if (!modal) return;

        const karigerInp = document.getElementById('kexp-kariger-input');
        const paidInp = document.getElementById('kexp-paid-amount');

        setTimeout(() => { if (karigerInp) karigerInp.focus(); }, 120);

        // Enter Chaining between Inputs
        const allInputs = modal.querySelectorAll('input[data-next]');
        allInputs.forEach((inp) => {
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const nextId = inp.getAttribute('data-next');
                    const nextEl = document.getElementById(nextId);
                    if (nextEl) {
                        nextEl.focus();
                        if (typeof nextEl.select === 'function') nextEl.select();
                    }
                }
            });
        });

        // Kariger Selection & Snapshot Loader
        karigerInp.addEventListener('input', () => {
            const val = karigerInp.value.trim().toLowerCase();
            const raw = window.safeArray ? window.safeArray(window.getStore('kariger_list')) : [];
            const k = raw.find(x => x && x.name && x.name.toLowerCase() === val);

            const banner = document.getElementById('kexp-weaver-banner');
            if (k) {
                selectedKariger = k;
                const sheets = (typeof window.getKarigerSheets === 'function') ? window.getKarigerSheets(k.id) : [];
                currentActiveSheet = sheets.length ? sheets[sheets.length - 1] : null;

                const calc = (currentActiveSheet && typeof window.calculateSheetTotals === 'function') 
                    ? window.calculateSheetTotals(currentActiveSheet) 
                    : { remainingAmt: 0, remainingBana: 0, remainingZari: 0, totSaree: 0 };

                prevDeliveredSarees = safeNum(calc.totSaree);

                const rateBani = currentActiveSheet ? safeNum(currentActiveSheet.rateBani, 240) : 240;
                const totalTaniTarget = currentActiveSheet ? safeNum(currentActiveSheet.taniPcs, 72) : 72;
                const sanchaMaker = currentActiveSheet?.taniSancha || currentActiveSheet?.sanchaName || 'N/A';

                // 8 Colors Badges
                const colorsArr = (currentActiveSheet && Array.isArray(currentActiveSheet.colors)) ? currentActiveSheet.colors : [];
                let colorsHtml = '';
                if (colorsArr.length) {
                    colorsArr.forEach((c, idx) => {
                        colorsHtml += `<span style="background:#fef3c7; color:#92400e; border:1px solid #fde68a; font-size:10.5px; font-weight:bold; padding:2px 6px; border-radius:4px;">${idx + 1}. ${esc(c)}</span> `;
                    });
                } else {
                    colorsHtml = `<span style="color:#94a3b8; font-size:11px;">Color matching set nahi hai</span>`;
                }

                // Auto populate default item names if set in sheet
                if (currentActiveSheet) {
                    if (currentActiveSheet.banaItem && !document.getElementById('kexp-bana-name').value) {
                        document.getElementById('kexp-bana-name').value = currentActiveSheet.banaItem;
                    }
                    if (currentActiveSheet.zariItem && !document.getElementById('kexp-zari-name').value) {
                        document.getElementById('kexp-zari-name').value = currentActiveSheet.zariItem;
                    }
                }

                updateExpressStockBadges();

                banner.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
                        <span style="font-size:13px; font-weight:bold; color:#1e3a8a;">👤 ${esc(k.name)} (${esc(k.saree || 'Satan')})</span>
                        <span style="font-size:12px; color:#475569;">खाता: <strong>${esc(currentActiveSheet ? currentActiveSheet.title : 'Tani 1')}</strong> | साँचा: <strong>${esc(sanchaMaker)}</strong></span>
                        <span style="font-size:12px; color:#b45309;">पिछला बकाया: <strong>₹ ${safeNum(calc.remainingAmt).toFixed(2)}</strong></span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                        <div id="kexp-live-tani-progress" style="font-size:12.5px;">
                            🎯 कुल तानी: <strong>${totalTaniTarget} Pcs</strong> | 📥 अब तक आई: <strong style="color:#059669;">${prevDeliveredSarees} Pcs</strong> | ⏳ बाकी: <strong style="color:#dc2626;">${Math.max(0, totalTaniTarget - prevDeliveredSarees)} Pcs</strong>
                        </div>
                        <div>
                            बचा बाना: <strong style="color:#059669;">${safeNum(calc.remainingBana).toFixed(2)} Kg</strong> | 
                            बची जरी: <strong style="color:#ea580c;">${safeNum(calc.remainingZari).toFixed(2)} Kg</strong>
                        </div>
                    </div>
                    <div style="margin-top:6px; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                        <span style="font-size:11px; font-weight:bold; color:#475569;">🎨 8 Colors:</span>
                        ${colorsHtml}
                    </div>
                `;
                document.getElementById('kexp-disp-bani-rate').textContent = `₹ ${rateBani.toFixed(2)}`;
                calculateKarigerExpressLive();
            } else {
                selectedKariger = null;
                currentActiveSheet = null;
                banner.innerHTML = `<span style="font-size:12px; color:#94a3b8;">कारीगर चुनिए, तानी का पूरा हिसाब और कलर यहाँ दिखेंगे...</span>`;
                document.getElementById('kexp-disp-bani-rate').textContent = `₹ 0.00`;
                calculateKarigerExpressLive();
            }
        });

        // Enter on Paid Input triggers Submit
        paidInp.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitKarigerExpress();
            }
        });

        window.removeEventListener('keydown', handleKarigerExpressKeydown);
        window.addEventListener('keydown', handleKarigerExpressKeydown);
    };

    const handleKarigerExpressKeydown = (e) => {
        const modal = document.getElementById('kariger-express-modal');
        if (!modal) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            closeKarigerExpressModal();
            return;
        }

        if (e.key === 'F2') {
            e.preventDefault();
            const inp = document.getElementById('kexp-kariger-input');
            if (inp) { inp.focus(); inp.select(); }
            return;
        }

        if (e.altKey && (e.key === 'p' || e.key === 'P')) {
            e.preventDefault();
            printLastSavedExpressSlip();
            return;
        }
    };

    window.closeKarigerExpressModal = () => {
        window.removeEventListener('keydown', handleKarigerExpressKeydown);
        const modal = document.getElementById('kariger-express-modal');
        if (modal) modal.remove();
        selectedKariger = null;
        currentActiveSheet = null;
    };

    // 4. LIVE CALCULATION & TANI PROGRESS UPDATE
    window.calculateKarigerExpressLive = () => {
        const saree = safeNum(document.getElementById('kexp-saree-qty')?.value);
        const lott = safeNum(document.getElementById('kexp-saree-lott')?.value);
        const paid = safeNum(document.getElementById('kexp-paid-amount')?.value);

        const rateBani = currentActiveSheet ? safeNum(currentActiveSheet.rateBani, 240) : 240;
        
        let pichlaAmt = 0;
        if (currentActiveSheet && typeof window.calculateSheetTotals === 'function') {
            pichlaAmt = safeNum(window.calculateSheetTotals(currentActiveSheet).remainingAmt);
        }

        const netSaree = Math.max(0, saree - lott);
        const grossBani = netSaree * rateBani;
        const netRemaining = (pichlaAmt + grossBani) - paid;

        const dispGross = document.getElementById('kexp-disp-gross-bani');
        const dispNet = document.getElementById('kexp-disp-net-balance');

        if (dispGross) dispGross.textContent = `₹ ${grossBani.toFixed(2)}`;
        if (dispNet) {
            dispNet.textContent = `₹ ${netRemaining.toFixed(2)}`;
            dispNet.style.color = netRemaining > 0 ? '#dc2626' : '#059669';
        }

        // Live Tani Progress Meter Update
        const progEl = document.getElementById('kexp-live-tani-progress');
        if (progEl && currentActiveSheet) {
            const totalTaniTarget = safeNum(currentActiveSheet.taniPcs, 72);
            const liveTotalDelivered = prevDeliveredSarees + saree;
            const liveRemainingOnLoom = Math.max(0, totalTaniTarget - liveTotalDelivered);
            progEl.innerHTML = `🎯 कुल तानी: <strong>${totalTaniTarget} Pcs</strong> | 📥 अब तक आई: <strong style="color:#059669;">${liveTotalDelivered} Pcs</strong> | ⏳ बाकी: <strong style="color:#dc2626;">${liveRemainingOnLoom} Pcs</strong>`;
        }
    };

    // 5. ATOMIC SUBMIT (Saves to Tani Khata Sheet + Saree + Bana + Zari + Payment)
    window.submitKarigerExpress = () => {
        if (!selectedKariger) {
            alert('कृपया कारीगर का सही नाम चुनिए!');
            document.getElementById('kexp-kariger-input')?.focus();
            return;
        }

        const kId = selectedKariger.id;
        const kName = selectedKariger.name;
        const sDesign = selectedKariger.saree || 'General Saree';
        const kGodown = selectedKariger.karkhanaId || 'k_main';
        const date = document.getElementById('kexp-date')?.value || getToday();

        const bCone = safeNum(document.getElementById('kexp-bana-cone')?.value);
        const bLess = safeNum(document.getElementById('kexp-bana-lesstp')?.value);
        const zQty = safeNum(document.getElementById('kexp-zari-qty')?.value);
        const topi = safeNum(document.getElementById('kexp-zari-topi')?.value);

        const saree = safeNum(document.getElementById('kexp-saree-qty')?.value);
        const lott = safeNum(document.getElementById('kexp-saree-lott')?.value);
        const paid = safeNum(document.getElementById('kexp-paid-amount')?.value);
        const retB = safeNum(document.getElementById('kexp-ret-bana')?.value);
        const retZ = safeNum(document.getElementById('kexp-ret-zari')?.value);

        const banaItemName = String(document.getElementById('kexp-bana-name')?.value || '').trim();
        const zariItemName = String(document.getElementById('kexp-zari-name')?.value || '').trim();

        if (saree === 0 && bCone === 0 && zQty === 0 && paid === 0 && retB === 0 && retZ === 0) {
            alert('कम से कम एक एंट्री (साड़ी, बाना, जरी या पेमेंट) भरिए!');
            return;
        }

        const nBana = Math.max(0, bCone - bLess);
        const nZari = Math.max(0, zQty - topi);
        const rowId = `row_${Date.now()}`;

        // Get sheets & ensure active sheet
        let sheets = (typeof window.getKarigerSheets === 'function') ? window.getKarigerSheets(kId) : [];
        if (!sheets || !sheets.length) {
            sheets = [{
                id: 'tani_1', title: 'Tani 1',
                pichlaBana: 0, pichlaZari: 0, pichlaBani: 0,
                banaWaste: 0, zariWaste: 0,
                rateBana: 0.311, rateZari: 0.110, rateBani: 240,
                taniPcs: 72, chukkaPcs: 72, colors: [],
                note: '', rows: []
            }];
        }

        const activeSheet = sheets[sheets.length - 1];
        if (banaItemName) activeSheet.banaItem = banaItemName;
        if (zariItemName) activeSheet.zariItem = zariItemName;

        const rowObj = {
            id: rowId,
            date: date,
            cone: bCone,
            lessTp: bLess,
            netBana: safeNum(nBana.toFixed(2)),
            zariQty: zQty,
            topi: topi,
            netZari: safeNum(nZari.toFixed(2)),
            saree: saree,
            lott: lott,
            paid: paid,
            retBana: retB,
            retZari: retZ,
            banaItem: banaItemName,
            zariItem: zariItemName
        };

        if (!activeSheet.rows) activeSheet.rows = [];
        activeSheet.rows.push(rowObj);

        // A. Save Sheets
        if (typeof window.saveKarigerSheets === 'function') {
            window.saveKarigerSheets(kId, sheets);
        }

        // B. Update Saree History
        let sHist = window.safeArray ? window.safeArray(window.getStore('saree_history')) : [];
        if (saree > 0) {
            sHist.push({
                id: `saree_${Date.now()}_f`,
                refId: rowId,
                date: date,
                sareeName: sDesign,
                karigerName: kName,
                karkhanaId: kGodown,
                type: 'fresh',
                typeLabel: 'Fresh Saree (Kariger Sheet)',
                aai: saree,
                gai: 0,
                timestamp: Date.now()
            });
        }
        if (lott > 0) {
            sHist.push({
                id: `saree_${Date.now()}_l`,
                refId: rowId,
                date: date,
                sareeName: sDesign,
                karigerName: kName,
                karkhanaId: kGodown,
                type: 'lott',
                typeLabel: 'Lott Saree (Kariger Sheet)',
                aai: lott,
                gai: 0,
                timestamp: Date.now() + 1
            });
        }
        if (typeof window.setStore === 'function') window.setStore('saree_history', sHist);

        // C. Update Bana History
        if (banaItemName && (nBana > 0 || retB > 0)) {
            const bHist = window.safeArray ? window.safeArray(window.getStore('bana_history')) : [];
            bHist.push({
                id: `bhist_${Date.now()}`,
                refId: rowId,
                date: date,
                name: banaItemName,
                kariger: kName,
                type: 'Kariger Issue',
                aaya: retB > 0 ? retB : 0,
                gaya: nBana > 0 ? nBana : 0,
                karkhanaId: kGodown,
                timestamp: Date.now()
            });
            if (typeof window.setStore === 'function') window.setStore('bana_history', bHist);
        }

        // D. Update Zari History
        if (zariItemName && (nZari > 0 || retZ > 0)) {
            const zHist = window.safeArray ? window.safeArray(window.getStore('zari_history')) : [];
            zHist.push({
                id: `zhist_${Date.now()}`,
                refId: rowId,
                date: date,
                name: zariItemName,
                kariger: kName,
                type: 'Kariger Issue',
                aaya: retZ > 0 ? retZ : 0,
                gaya: nZari > 0 ? nZari : 0,
                karkhanaId: kGodown,
                timestamp: Date.now()
            });
            if (typeof window.setStore === 'function') window.setStore('zari_history', zHist);
        }

        // E. Update Daybook / Payment Register
        if (paid > 0) {
            const payList = window.safeArray ? window.safeArray(window.getStore('payment_history')) : [];
            payList.push({
                id: `pay_${Date.now()}`,
                date: date,
                party: kName,
                type: 'कारीगर मजदूरी',
                amount: paid,
                mode: 'Cash',
                timestamp: Date.now()
            });
            if (typeof window.setStore === 'function') window.setStore('payment_history', payList);
        }

        // Cache Transaction for Instant A6 Print
        const totalsAfter = (typeof window.calculateSheetTotals === 'function') 
            ? window.calculateSheetTotals(activeSheet) 
            : { remainingAmt: 0, totSaree: 0 };

        lastSavedTransaction = {
            karigerName: kName,
            sDesign: sDesign,
            kGodown: kGodown,
            date: date,
            taniTitle: activeSheet.title,
            sanchaMaker: activeSheet.taniSancha || activeSheet.sanchaName || 'N/A',
            taniPcs: safeNum(activeSheet.taniPcs, 72),
            deliveredSarees: safeNum(totalsAfter.totSaree),
            colors: activeSheet.colors || [],
            saree: saree,
            lott: lott,
            netBana: nBana,
            banaItem: banaItemName,
            netZari: nZari,
            zariItem: zariItemName,
            retBana: retB,
            retZari: retZ,
            paid: paid,
            netRemaining: safeNum(totalsAfter.remainingAmt)
        };

        // Dashboard totals refresh
        if (typeof window.updateDashboardBadgeTotals === 'function') window.updateDashboardBadgeTotals();

        // Clear Inputs for Next Weaver
        document.getElementById('kexp-saree-qty').value = '';
        document.getElementById('kexp-saree-lott').value = '';
        document.getElementById('kexp-ret-bana').value = '';
        document.getElementById('kexp-ret-zari').value = '';
        document.getElementById('kexp-bana-cone').value = '';
        document.getElementById('kexp-bana-lesstp').value = '';
        document.getElementById('kexp-zari-qty').value = '';
        document.getElementById('kexp-zari-topi').value = '';
        document.getElementById('kexp-paid-amount').value = '';

        const statusMsg = document.getElementById('kexp-status-msg');
        if (statusMsg) {
            statusMsg.innerHTML = `✅ <strong>${esc(kName)}</strong> का हिसाब Tani Khata me jud gaya!`;
        }

        // Trigger Instant A6 Print Slip
        printLastSavedExpressSlip();

        // Focus back to Kariger input for the next person
        const kInp = document.getElementById('kexp-kariger-input');
        if (kInp) {
            kInp.value = '';
            kInp.focus();
        }
        selectedKariger = null;
        currentActiveSheet = null;
        document.getElementById('kexp-weaver-banner').innerHTML = `<span style="font-size:12px; color:#94a3b8;">कारीगर चुनिए, तानी का पूरा हिसाब और कलर यहाँ दिखेंगे...</span>`;
    };

    // 6. COMPLETE A6 THERMAL SLIP PRINT ENGINE
    window.printLastSavedExpressSlip = () => {
        if (!lastSavedTransaction) {
            return alert('प्रिंट करने के लिए कोई रीसेंट हिसाब नहीं मिला!');
        }

        const t = lastSavedTransaction;
        const kGodamName = (typeof window.getKarkhanaNameById === 'function') 
            ? window.getKarkhanaNameById(t.kGodown) 
            : 'Main Godown';

        const remainingOnLoom = Math.max(0, t.taniPcs - t.deliveredSarees);
        const colorsTxt = (t.colors && t.colors.length) ? t.colors.join(', ') : 'N/A';

        const printWindow = window.open('', '', 'width=420,height=600');
        if (!printWindow) return alert('Popup blocked hai! Kripya browser me popups allow karein.');

        printWindow.document.write(`
            <html>
            <head>
                <title>Baithak Parchi - ${esc(t.karigerName)}</title>
                <style>
                    @page { size: A6 portrait; margin: 4mm; }
                    body { font-family: monospace, sans-serif; font-size: 11px; margin: 0; padding: 4mm; color: #000; }
                    .ticket { width: 100%; max-width: 90mm; margin: 0 auto; border: 1.5px dashed #000; padding: 8px; box-sizing: border-box; }
                    .header { text-align: center; border-bottom: 1.5px dashed #000; padding-bottom: 5px; margin-bottom: 6px; }
                    .header h2 { margin: 0; font-size: 15px; text-transform: uppercase; }
                    .header p { margin: 2px 0 0; font-size: 10px; font-weight: bold; }
                    .meta { margin-bottom: 6px; font-size: 10.5px; border-bottom: 1px dashed #666; padding-bottom: 4px; }
                    .meta-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                    table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin: 6px 0; }
                    th, td { padding: 3px 2px; text-align: left; border-bottom: 1px dashed #ccc; }
                    th { border-top: 1px solid #000; border-bottom: 1px solid #000; font-size: 10px; }
                    .highlight-box { background: #f4f4f4; border: 1px solid #000; padding: 4px 6px; margin: 6px 0; font-size: 11px; font-weight: bold; }
                    .signs { display: flex; justify-content: space-between; margin-top: 22px; font-size: 10px; }
                </style>
            </head>
            <body>
                <div class="ticket">
                    <div class="header">
                        <h2>SIMPLICITY ERP</h2>
                        <p>⚡ बैठक ले-देन पर्ची (EXPRESS RECEIPT)</p>
                    </div>
                    <div class="meta">
                        <div class="meta-row"><span><strong>कारीगर:</strong> ${esc(t.karigerName)}</span><span><strong>तारीख:</strong> ${esc(t.date)}</span></div>
                        <div class="meta-row"><span><strong>साड़ी (Design):</strong> ${esc(t.sDesign)}</span><span><strong>खाता:</strong> ${esc(t.taniTitle)}</span></div>
                        <div class="meta-row"><span><strong>साँचा:</strong> ${esc(t.sanchaMaker)}</span><span><strong>गोदाम:</strong> ${esc(kGodamName)}</span></div>
                    </div>

                    <!-- Tani Warp Status on Slip -->
                    <div class="highlight-box">
                        <div style="display:flex; justify-content:space-between;">
                            <span>कुल तानी: ${t.taniPcs} Pcs</span>
                            <span>अब तक आई: ${t.deliveredSarees} Pcs</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-top:2px;">
                            <span>लूम पर बाकी: ${remainingOnLoom} Pcs</span>
                        </div>
                        <div style="font-size:9.5px; font-weight:normal; margin-top:3px; color:#333;">
                            रंग: ${esc(colorsTxt)}
                        </div>
                    </div>

                    <!-- Today's Transaction Table -->
                    <table>
                        <thead>
                            <tr><th>विवरण (ITEM / DETAIL)</th><th style="text-align:right;">मात्रा / वज़न</th></tr>
                        </thead>
                        <tbody>
                            ${t.saree > 0 ? `<tr><td>साड़ी जमा</td><td style="text-align:right; font-weight:bold;">+${t.saree} Pcs</td></tr>` : ''}
                            ${t.lott > 0 ? `<tr><td>लोट साड़ी</td><td style="text-align:right; font-weight:bold;">-${t.lott} Pcs</td></tr>` : ''}
                            ${t.netBana > 0 ? `<tr><td>बाना दिया (${esc(t.banaItem || 'बाना')})</td><td style="text-align:right; font-weight:bold;">${t.netBana.toFixed(2)} Kg</td></tr>` : ''}
                            ${t.netZari > 0 ? `<tr><td>जरी दी (${esc(t.zariItem || 'जरी')})</td><td style="text-align:right; font-weight:bold;">${t.netZari.toFixed(2)} Kg</td></tr>` : ''}
                            ${t.retBana > 0 ? `<tr><td>वापस बाना</td><td style="text-align:right;">${t.retBana.toFixed(2)} Kg</td></tr>` : ''}
                            ${t.retZari > 0 ? `<tr><td>वापस जरी</td><td style="text-align:right;">${t.retZari.toFixed(2)} Kg</td></tr>` : ''}
                            ${t.paid > 0 ? `<tr><td>मजदूरी दिया (Paid)</td><td style="text-align:right; font-weight:bold;">₹ ${t.paid.toFixed(2)}</td></tr>` : ''}
                        </tbody>
                    </table>

                    <div style="border-top:1.5px dashed #000; padding-top:4px; font-size:11.5px; font-weight:bold; display:flex; justify-content:space-between;">
                        <span>अंतिम बाकी रुपया:</span>
                        <span>₹ ${t.netRemaining.toFixed(2)}</span>
                    </div>

                    <div class="signs">
                        <div>हस्ताक्षर मुंशी<br><br>___________</div>
                        <div>हस्ताक्षर कारीगर<br><br>___________</div>
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

    // Auto Bind Global F1 / Shortcut to launch Kariger Express anytime
    window.addEventListener('keydown', (e) => {
        if (e.key === 'F1') {
            e.preventDefault();
            window.openKarigerExpressModal();
        }
    });

})();
