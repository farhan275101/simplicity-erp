/* ============================================================================
   SIMPLICITY ERP - ⚡ KARIGER EXPRESS ENGINE (BAITHAK COUNTER)
   Folder: kariger-express / File: kariger-express.js
   Developed for: Farhan Jawed
   (1-Screen Baithak Counter • Zero-Mouse • Auto Tani Sync & Stock Minus)
============================================================================ */

(() => {
    'use strict';

    let selectedKariger = null;
    let currentActiveSheet = null;

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

    // 1. DATA PREPARATION FOR AUTOCOMPLETE
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

    // 2. OPEN KARIGER EXPRESS MODAL
    window.openKarigerExpressModal = () => {
        const existing = document.getElementById('kariger-express-modal');
        if (existing) existing.remove();

        selectedKariger = null;
        currentActiveSheet = null;

        const { kOpts, bOpts, zOpts } = getKarigerExpressDatalists();
        const today = getToday();

        const modalHtml = `
        <div id="kariger-express-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.85); z-index:999999; display:flex; align-items:center; justify-content:center; padding:12px; box-sizing:border-box;">
            <div style="background:#ffffff; width:100%; max-width:860px; border-radius:12px; box-shadow:0 25px 40px -5px rgba(0,0,0,0.5); overflow:hidden; font-family:sans-serif; max-height:96vh; display:flex; flex-direction:column;">
                
                <!-- Modal Top Header -->
                <div style="background:#0f172a; color:#fff; padding:12px 18px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:20px;">⚡</span>
                        <h3 style="margin:0; font-size:16px;">KARIGER EXPRESS • कारीगर बैठक काउन्टर</h3>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:11px; background:#1e293b; color:#38bdf8; padding:3px 8px; border-radius:4px; font-weight:bold;">[F2] Search | [Enter] Save | [Esc] Close</span>
                        <button type="button" onclick="closeKarigerExpressModal()" style="background:transparent; border:none; color:#fff; font-size:24px; cursor:pointer; line-height:1;">&times;</button>
                    </div>
                </div>

                <!-- Form Body -->
                <div style="padding:16px; overflow-y:auto; flex:1;">
                    
                    <!-- Row 1: Date & Kariger Selector -->
                    <div style="display:grid; grid-template-columns:160px 1fr; gap:12px; margin-bottom:12px;">
                        <div>
                            <label style="font-size:11px; font-weight:bold; color:#475569;">तारीख (Date):</label>
                            <input type="date" id="kexp-date" value="${today}" style="width:100%; padding:8px; border:1.5px solid #cbd5e1; border-radius:6px; font-size:13px; font-weight:bold; box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="font-size:11px; font-weight:bold; color:#1e3a8a;">कारीगर का नाम लिखें (F2 Search):</label>
                            <input type="text" id="kexp-kariger-input" list="kexp-kariger-dl" placeholder="1-2 akshar likhein..." autocomplete="off" style="width:100%; padding:9px 12px; border:2px solid #2563eb; border-radius:6px; font-size:15px; font-weight:bold; box-sizing:border-box; background:#eff6ff;">
                            <datalist id="kexp-kariger-dl">${kOpts}</datalist>
                        </div>
                    </div>

                    <!-- Live Weaver Snapshot Banner -->
                    <div id="kexp-weaver-banner" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 14px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                        <span style="font-size:12px; color:#64748b;">कारीगर चुनिए, खाता और पुराना बकाया यहाँ दिखेगा...</span>
                    </div>

                    <!-- 3-Column Express Grid -->
                    <div style="display:grid; grid-template-columns:1fr 1fr 1.1fr; gap:12px;">
                        
                        <!-- COLUMN 1: SAREE & RETURN -->
                        <div style="background:#ecfdf5; border:1.5px solid #a7f3d0; border-radius:8px; padding:12px;">
                            <h4 style="margin:0 0 10px 0; color:#065f46; font-size:13px; border-bottom:1px solid #a7f3d0; padding-bottom:5px;">📦 माल आया (Inward)</h4>
                            
                            <div style="margin-bottom:8px;">
                                <label style="font-size:11px; font-weight:bold; color:#374151;">साड़ी संख्या (Pcs):</label>
                                <input type="number" id="kexp-saree-qty" min="0" placeholder="0" oninput="calculateKarigerExpressLive()" style="width:100%; padding:8px; border:1.5px solid #10b981; border-radius:6px; font-size:16px; font-weight:900; color:#065f46; box-sizing:border-box;">
                            </div>
                            <div style="margin-bottom:8px;">
                                <label style="font-size:11px; font-weight:bold; color:#b91c1c;">लॉट / कट साड़ी (Pcs):</label>
                                <input type="number" id="kexp-saree-lott" min="0" placeholder="0" oninput="calculateKarigerExpressLive()" style="width:100%; padding:7px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; font-weight:bold; color:#dc2626; box-sizing:border-box;">
                            </div>
                            <div style="margin-bottom:8px;">
                                <label style="font-size:11px; font-weight:bold; color:#374151;">बचा बाना वापसी (Kg):</label>
                                <input type="number" step="0.01" id="kexp-ret-bana" placeholder="0.00" style="width:100%; padding:7px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;">
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:bold; color:#374151;">बची जरी वापसी (Kg):</label>
                                <input type="number" step="0.01" id="kexp-ret-zari" placeholder="0.00" style="width:100%; padding:7px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;">
                            </div>
                        </div>

                        <!-- COLUMN 2: BANA & ZARI ISSUE -->
                        <div style="background:#eff6ff; border:1.5px solid #bfdbfe; border-radius:8px; padding:12px;">
                            <h4 style="margin:0 0 10px 0; color:#1e40af; font-size:13px; border-bottom:1px solid #bfdbfe; padding-bottom:5px;">🧶 कच्चा माल दिया (Outward)</h4>
                            
                            <div style="margin-bottom:8px;">
                                <label style="font-size:11px; font-weight:bold; color:#374151;">बाना आइटम चुनें:</label>
                                <input type="text" id="kexp-bana-name" list="kexp-bana-dl" placeholder="Bana..." style="width:100%; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; font-weight:bold; box-sizing:border-box;">
                                <datalist id="kexp-bana-dl">${bOpts}</datalist>
                            </div>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:8px;">
                                <div>
                                    <label style="font-size:10px; font-weight:bold; color:#475569;">Bana (Gross):</label>
                                    <input type="number" step="0.01" id="kexp-bana-cone" placeholder="0.00" oninput="calculateKarigerExpressLive()" style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; font-weight:bold; box-sizing:border-box;">
                                </div>
                                <div>
                                    <label style="font-size:10px; font-weight:bold; color:#dc2626;">Less TP:</label>
                                    <input type="number" step="0.01" id="kexp-bana-lesstp" placeholder="0.00" oninput="calculateKarigerExpressLive()" style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;">
                                </div>
                            </div>

                            <div style="margin-bottom:8px;">
                                <label style="font-size:11px; font-weight:bold; color:#374151;">जरी आइटम चुनें:</label>
                                <input type="text" id="kexp-zari-name" list="kexp-zari-dl" placeholder="Zari..." style="width:100%; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; font-weight:bold; box-sizing:border-box;">
                                <datalist id="kexp-zari-dl">${zOpts}</datalist>
                            </div>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                                <div>
                                    <label style="font-size:10px; font-weight:bold; color:#475569;">Zari (Gross):</label>
                                    <input type="number" step="0.01" id="kexp-zari-qty" placeholder="0.00" oninput="calculateKarigerExpressLive()" style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; font-weight:bold; box-sizing:border-box;">
                                </div>
                                <div>
                                    <label style="font-size:10px; font-weight:bold; color:#dc2626;">Topi (Less):</label>
                                    <input type="number" step="0.01" id="kexp-zari-topi" placeholder="0.00" oninput="calculateKarigerExpressLive()" style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;">
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
                <div style="background:#f1f5f9; padding:12px 18px; border-top:1px solid #cbd5e1; display:flex; justify-content:space-between; align-items:center;">
                    <div id="kexp-status-msg" style="font-size:12px; font-weight:bold; color:#059669;"></div>
                    <button type="button" id="kexp-submit-btn" onclick="submitKarigerExpress()" style="background:#059669; color:#ffffff; border:none; padding:11px 24px; border-radius:8px; font-size:15px; font-weight:900; cursor:pointer; box-shadow:0 4px 6px rgba(5,150,105,0.3); display:flex; align-items:center; gap:8px;">
                        💾 पक्का करें & अगला कारीगर [ ENTER ]
                    </button>
                </div>

            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        bindKarigerExpressEvents();
    };

    // 3. EVENTS & SHORTCUTS
    const bindKarigerExpressEvents = () => {
        const karigerInp = document.getElementById('kexp-kariger-input');
        const paidInp = document.getElementById('kexp-paid-amount');

        setTimeout(() => { if (karigerInp) karigerInp.focus(); }, 120);

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
                    : { remainingAmt: 0, remainingBana: 0, remainingZari: 0 };

                const rateBani = currentActiveSheet ? safeNum(currentActiveSheet.rateBani, 240) : 240;

                // Auto populate default item names if set in sheet
                if (currentActiveSheet) {
                    if (currentActiveSheet.banaItem && !document.getElementById('kexp-bana-name').value) {
                        document.getElementById('kexp-bana-name').value = currentActiveSheet.banaItem;
                    }
                    if (currentActiveSheet.zariItem && !document.getElementById('kexp-zari-name').value) {
                        document.getElementById('kexp-zari-name').value = currentActiveSheet.zariItem;
                    }
                }

                banner.innerHTML = `
                    <span style="font-size:13px; font-weight:bold; color:#1e3a8a;">👤 ${esc(k.name)}</span>
                    <span style="font-size:12px;">खाता: <strong>${esc(currentActiveSheet ? currentActiveSheet.title : 'Tani 1')}</strong></span>
                    <span style="font-size:12px;">बचा बाना: <strong style="color:#059669;">${safeNum(calc.remainingBana).toFixed(2)} Kg</strong></span>
                    <span style="font-size:12px;">बची जरी: <strong style="color:#ea580c;">${safeNum(calc.remainingZari).toFixed(2)} Kg</strong></span>
                    <span style="font-size:12px;">पिछला बकाया: <strong style="color:${calc.remainingAmt > 0 ? '#dc2626' : '#059669'}; font-weight:bold;">₹ ${safeNum(calc.remainingAmt).toFixed(2)}</strong></span>
                `;
                document.getElementById('kexp-disp-bani-rate').textContent = `₹ ${rateBani.toFixed(2)}`;
                calculateKarigerExpressLive();
            } else {
                selectedKariger = null;
                currentActiveSheet = null;
                banner.innerHTML = `<span style="font-size:12px; color:#94a3b8;">कारीगर चुनिए, खाता और पुराना बकाया यहाँ दिखेगा...</span>`;
                document.getElementById('kexp-disp-bani-rate').textContent = `₹ 0.00`;
                calculateKarigerExpressLive();
            }
        });

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
        }
    };

    window.closeKarigerExpressModal = () => {
        window.removeEventListener('keydown', handleKarigerExpressKeydown);
        const modal = document.getElementById('kariger-express-modal');
        if (modal) modal.remove();
        selectedKariger = null;
        currentActiveSheet = null;
    };

    // 4. LIVE CALCULATION
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
            statusMsg.innerHTML = `✅ <strong>${esc(kName)}</strong> का हिसाब Tani Khata me jud gaya! Agla kariagar chunein:`;
        }

        const kInp = document.getElementById('kexp-kariger-input');
        if (kInp) {
            kInp.value = '';
            kInp.focus();
        }
        selectedKariger = null;
        currentActiveSheet = null;
        document.getElementById('kexp-weaver-banner').innerHTML = `<span style="font-size:12px; color:#94a3b8;">कारीगर चुनिए, खाता और पुराना बकाया यहाँ दिखेगा...</span>`;
    };

})();
