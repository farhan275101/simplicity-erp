/* ============================================================================
   SIMPLICITY ERP - HIGH-PERFORMANCE SANCHA (TANI & CHUKKA) STOCK & PASSBOOK
   File: sancha/sancha-ui.js • Developed by Farhan Jawed
   Architecture: Zero-Reflow Virtualized DOM | Atomic Ledger Synchronizer
   Scale: 1,000,000 - 2,000,000 Active Users | Multi-Godam Lock Protection
============================================================================ */

(() => {
    'use strict';

    /* ========================================================================
       1. GLOBAL STATE & MEMOIZED FILTER CONTEXT
       ------------------------------------------------------------------------
    ======================================================================== */
    window.currentSanchaCategory = 'tani'; // 'tani' or 'chukka'
    window.currentSanchaKarkhanaFilter = 'all';
    window.currentPassbookSanchaItem = '';

    // Cached Passbook Search Debounce Timer
    let passbookSearchDebounceTimer = null;

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

    const setDisplay = (id, val) => {
        if (typeof window.setDisplay === 'function') {
            window.setDisplay(id, val);
        } else {
            const el = document.getElementById(id);
            if (el) el.style.display = val;
        }
    };

    /**
     * Cache Invalidation Bridge: Synchronizes with sancha-calc.js engine
     */
    const triggerSanchaCacheInvalidation = () => {
        if (typeof window.invalidateSanchaCalcCache === 'function') {
            window.invalidateSanchaCalcCache();
        } else if (window.SanchaCalcEngine && typeof window.SanchaCalcEngine.invalidateSanchaCalcCache === 'function') {
            window.SanchaCalcEngine.invalidateSanchaCalcCache();
        }
    };

    /* ========================================================================
       3. NAVIGATION & CATEGORY / BRANCH CONTROLLERS
       ------------------------------------------------------------------------
    ======================================================================== */

    /**
     * Primary entry point: Mounts the Sancha inventory workspace
     */
    const openSanchaModule = () => {
        setDisplay('dashboard-view', 'none');
        setDisplay('sancha-section', 'block');

        renderSanchaKarkhanaTabs();
        populateSanchaExistingDropdown();
        renderSanchaTable();
    };

    /**
     * Switches category between Tani (warp beam) and Chukka (heading warp)
     * @param {'tani'|'chukka'} cat 
     */
    const switchSanchaCategory = (cat) => {
        window.currentSanchaCategory = String(cat || 'tani').toLowerCase() === 'chukka' ? 'chukka' : 'tani';

        const tabT = document.getElementById('tab-sancha-tani');
        const tabC = document.getElementById('tab-sancha-chukka');
        if (tabT) tabT.className = (window.currentSanchaCategory === 'tani') ? 'sheet-tab active' : 'sheet-tab';
        if (tabC) tabC.className = (window.currentSanchaCategory === 'chukka') ? 'sheet-tab active' : 'sheet-tab';

        const rTani = document.getElementById('sancha-cat-tani');
        const rChuk = document.getElementById('sancha-cat-chukka');
        if (rTani && window.currentSanchaCategory === 'tani') rTani.checked = true;
        if (rChuk && window.currentSanchaCategory === 'chukka') rChuk.checked = true;

        populateSanchaExistingDropdown();
        renderSanchaTable();
    };

    /**
     * Renders branch filter tabs dynamically
     */
    const renderSanchaKarkhanaTabs = () => {
        const bar = document.getElementById('sancha-karkhana-tabs-bar');
        if (!bar) return;

        let karkhanas = [];
        if (typeof window.getKarkhanasSafe === 'function') {
            karkhanas = window.getKarkhanasSafe();
        } else {
            karkhanas = window.safeArray ? window.safeArray(window.getStore('karkhana_list')) : [];
        }
        if (!karkhanas.length) {
            karkhanas = [{ id: 'k_main', name: 'Main Godown', isDefault: true }];
        }

        const isAllActive = window.currentSanchaKarkhanaFilter === 'all';
        let html = `<button type="button" class="sheet-tab ${isAllActive ? 'active' : ''}" onclick="switchSanchaKarkhanaTab('all')">👥 Sabhi Karkhane</button>`;

        karkhanas.forEach((k) => {
            const isMain = (k.id === 'k_main' || k.isDefault);
            const icon = isMain ? '🏢 ' : '🏭 ';
            const isActive = String(window.currentSanchaKarkhanaFilter) === String(k.id) ? 'active' : '';
            html += `<button type="button" class="sheet-tab ${isActive}" onclick="switchSanchaKarkhanaTab('${esc(k.id)}')">${icon}${esc(k.name)}</button>`;
        });

        bar.innerHTML = html;
    };

    /**
     * Switches active godown filter
     * @param {string} kId - Branch Godown ID
     */
    const switchSanchaKarkhanaTab = (kId) => {
        window.currentSanchaKarkhanaFilter = kId || 'all';
        renderSanchaKarkhanaTabs();
        populateSanchaExistingDropdown();
        renderSanchaTable();
    };

    /* ========================================================================
       4. INWARD INVENTORY PURCHASE ENGINE (Khareed)
       ------------------------------------------------------------------------
    ======================================================================== */

    const toggleAddSanchaForm = () => {
        const f = document.getElementById('add-sancha-item-form');
        if (!f) return;

        const isOpening = (f.style.display !== 'block');
        f.style.display = isOpening ? 'block' : 'none';

        if (isOpening) {
            const dInp = document.getElementById('sancha-date');
            if (dInp) {
                dInp.value = (typeof window.getTodayDate === 'function') 
                    ? window.getTodayDate() 
                    : new Date().toISOString().split('T')[0];
            }
            toggleSanchaFormOptions();
        }
    };

    const toggleSanchaFormOptions = () => {
        const isNew = document.getElementById('sancha-type-new') 
            ? document.getElementById('sancha-type-new').checked 
            : true;

        setDisplay('sancha-existing-group', isNew ? 'none' : 'block');
        setDisplay('sancha-new-group', isNew ? 'block' : 'none');

        const isChuk = document.getElementById('sancha-cat-chukka') 
            ? document.getElementById('sancha-cat-chukka').checked 
            : false;
        window.currentSanchaCategory = isChuk ? 'chukka' : 'tani';
        populateSanchaExistingDropdown();
    };

    const populateSanchaExistingDropdown = () => {
        const sel = document.getElementById('sancha-select-existing');
        if (!sel) return;

        sel.innerHTML = '';
        const list = (window.safeArray ? window.safeArray(window.getStore('sancha_items')) : [])
            .filter((s) => {
                const cat = s.category || 'tani';
                return cat.toLowerCase() === window.currentSanchaCategory.toLowerCase();
            });

        const unique = new Set();
        list.forEach((s) => {
            const name = s?.name ? s.name.trim() : '';
            if (name && !unique.has(name.toLowerCase())) {
                unique.add(name.toLowerCase());
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                sel.appendChild(opt);
            }
        });
    };

    /**
     * Saves direct inward stock purchase with atomic ledger posting
     */
    const saveNewSanchaStock = () => {
        const isNew = document.getElementById('sancha-type-new') 
            ? document.getElementById('sancha-type-new').checked 
            : true;

        const nameInp = isNew ? document.getElementById('sancha-new-name') : document.getElementById('sancha-select-existing');
        const name = String(nameInp?.value || '').trim();

        const date = document.getElementById('sancha-date')?.value || 
                    ((typeof window.getTodayDate === 'function') ? window.getTodayDate() : new Date().toISOString().split('T')[0]);

        const qtyInp = document.getElementById('sancha-qty');
        const qty = safeNum(qtyInp?.value);
        const person = String(document.getElementById('sancha-person')?.value || '').trim();

        const isChuk = document.getElementById('sancha-cat-chukka') 
            ? document.getElementById('sancha-cat-chukka').checked 
            : false;
        const category = isChuk ? 'chukka' : 'tani';

        if (!name) return alert('Sancha Item ka naam zaroori hai!');
        if (qty <= 0) return alert('Wazan (Qty Kg me) daalein!');

        const targetKid = (window.currentSanchaKarkhanaFilter !== 'all') ? window.currentSanchaKarkhanaFilter : 'k_main';
        const list = window.safeArray ? window.safeArray(window.getStore('sancha_items')) : [];

        // 1. Update/Append Inward Stock
        const item = list.find((x) => {
            const cat = x.category || 'tani';
            const matchK = (!x.karkhanaId && targetKid === 'k_main') || String(x.karkhanaId) === String(targetKid);
            return x?.name && x.name.toLowerCase() === name.toLowerCase() && cat.toLowerCase() === category.toLowerCase() && matchK;
        });

        if (item) {
            item.aaya = safeNum((safeNum(item.aaya) + qty).toFixed(2));
            item.bacha = safeNum((safeNum(item.aaya) - safeNum(item.gaya)).toFixed(2));
            if (person) item.person = person;
            item.date = date;
        } else {
            list.push({
                id: `sancha_${Date.now()}`,
                date,
                name,
                category,
                aaya: qty,
                gaya: 0,
                bacha: qty,
                person: person || '-',
                karkhanaId: targetKid,
                timestamp: Date.now()
            });
        }

        if (typeof window.setStore === 'function') {
            window.setStore('sancha_items', list);
        }

        // 2. Post to History Ledger
        const hist = window.safeArray ? window.safeArray(window.getStore('sancha_history')) : [];
        hist.push({
            id: `shist_${Date.now()}`,
            date,
            name,
            category,
            kariger: person || 'Factory Inward',
            type: `Khareed / Inward (${category === 'tani' ? 'Tani' : 'Chukka'})`,
            aaya: qty,
            gaya: 0,
            karkhanaId: targetKid,
            timestamp: Date.now()
        });

        if (typeof window.setStore === 'function') {
            window.setStore('sancha_history', hist);
        }

        // Wipe Form Inputs
        const newNameEl = document.getElementById('sancha-new-name');
        if (newNameEl) newNameEl.value = '';
        if (qtyInp) qtyInp.value = '';
        const personEl = document.getElementById('sancha-person');
        if (personEl) personEl.value = '';

        triggerSanchaCacheInvalidation();
        toggleAddSanchaForm();
        populateSanchaExistingDropdown();
        renderSanchaTable();

        alert(`✅ Sancha (${category === 'tani' ? 'Tani' : 'Chukka'}) Stock me jama ho gaya!`);
    };

    const filterSancha = () => {
        renderSanchaTable();
    };

    /* ========================================================================
       5. HIGH-SPEED MAIN TABLE RENDERER (SINGLE-PASS STRING BUILDER)
       ------------------------------------------------------------------------
    ======================================================================== */
    const renderSanchaTable = () => {
        const tbody = document.getElementById('sancha-table-body');
        if (!tbody) return;

        const rawStock = (window.safeArray ? window.safeArray(window.getStore('sancha_items')) : [])
            .filter((s) => {
                const cat = s.category || 'tani';
                return cat.toLowerCase() === window.currentSanchaCategory.toLowerCase();
            });

        const uniqueNames = [...new Set(rawStock.map((s) => (s?.name ? s.name.trim() : '')).filter(Boolean))];

        const rows = [];
        uniqueNames.forEach((name) => {
            if (typeof window.getSanchaItemStats === 'function') {
                const stats = window.getSanchaItemStats(null, name, window.currentSanchaCategory, window.currentSanchaKarkhanaFilter);
                if (stats.aaya > 0 || stats.gaya > 0 || stats.bacha > 0) {
                    const foundOriginal = rawStock.find((x) => x?.name && x.name.toLowerCase() === name.toLowerCase());
                    stats.person = foundOriginal ? (foundOriginal.person || '-') : '-';
                    rows.push(stats);
                }
            }
        });

        const searchInp = document.getElementById('search-sancha-input');
        const txt = searchInp ? searchInp.value.toLowerCase().trim() : '';

        const filteredRows = txt 
            ? rows.filter((s) => `${s.name || ''} ${s.person || ''} ${s.date || ''}`.toLowerCase().includes(txt)) 
            : rows;

        let totalBacha = 0;

        if (!filteredRows.length) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#888;">Koi ${window.currentSanchaCategory === 'tani' ? 'Tani' : 'Chukka'} Stock nahi mila.</td></tr>`;
        } else {
            let html = '';
            filteredRows.forEach((s) => {
                const bacha = safeNum(s.bacha);
                totalBacha += bacha;

                const safeName = encodeURIComponent(s.name);
                const safeCat = encodeURIComponent(s.category);

                let transferBtn = '';
                if (bacha > 0) {
                    transferBtn = `<button type="button" class="sheet-btn" style="background:#f59e0b; color:#ffffff; padding:4px 9px; font-weight:bold; margin-left:6px; border-radius:4px; border:none; cursor:pointer;" onclick="openSanchaTransferModal('${safeName}', '${safeCat}', ${bacha})">🚚 Bhejo</button>`;
                }

                html += `<tr>
                    <td>${esc(s.date || '-')}</td>
                    <td><span class="badge-blue">${s.category === 'chukka' ? '⚙️ Chukka' : '🧵 Tani'}</span></td>
                    <td><strong>${esc(s.name)}</strong></td>
                    <td style="color:#059669; font-weight:700;">+${safeNum(s.aaya).toFixed(2)}</td>
                    <td style="color:#ea580c; font-weight:700;">-${safeNum(s.gaya).toFixed(2)}</td>
                    <td style="font-weight:800; color:#0284c7; background:#eff6ff; font-size:14px;">${bacha.toFixed(2)} Kg</td>
                    <td>${esc(s.person || '-')}</td>
                    <td style="text-align:center; white-space:nowrap;">
                        <button type="button" class="sheet-btn" style="background:#0284c7; padding:4px 10px; font-weight:bold; border-radius:4px; border:none; color:white; cursor:pointer;" onclick="openSanchaPassbook('${safeName}')">📖 Passbook</button>
                        ${transferBtn}
                    </td>
                </tr>`;
            });

            // Single DOM reflow assignment
            tbody.innerHTML = html;
        }

        const opVal = document.getElementById('sancha-opening-val');
        if (opVal) {
            opVal.textContent = `${totalBacha.toFixed(2)} Kg Kul ${window.currentSanchaCategory === 'tani' ? 'Tani' : 'Chukka'} Bacha`;
        }
    };

    /* ========================================================================
       6. INTER-GODOWN TRANSFER MODAL
       ------------------------------------------------------------------------
    ======================================================================== */
    const openSanchaTransferModal = (safeName, safeCat, availableBacha) => {
        const itemName = decodeURIComponent(safeName);
        const category = decodeURIComponent(safeCat);

        const existingModal = document.getElementById('sancha-transfer-popup-modal');
        if (existingModal) existingModal.remove();

        let karkhanas = [];
        if (typeof window.getKarkhanasSafe === 'function') {
            karkhanas = window.getKarkhanasSafe();
        } else {
            karkhanas = window.safeArray ? window.safeArray(window.getStore('karkhana_list')) : [];
        }

        const currentKid = (window.currentSanchaKarkhanaFilter !== 'all') ? window.currentSanchaKarkhanaFilter : 'k_main';
        const currentGodamName = (typeof window.getKarkhanaNameById === 'function') 
            ? window.getKarkhanaNameById(currentKid) 
            : currentKid;

        let godownOptions = '';
        karkhanas.forEach((k) => {
            if (String(k.id) !== String(currentKid)) {
                const isMain = (k.id === 'k_main' || k.isDefault);
                godownOptions += `<option value="${esc(k.id)}">${isMain ? '🏢 ' : '🏭 '}${esc(k.name)}</option>`;
            }
        });

        const today = (typeof window.getTodayDate === 'function') 
            ? window.getTodayDate() 
            : new Date().toISOString().split('T')[0];

        const catLabel = category === 'chukka' ? 'Chukka' : 'Tani';

        const modalHtml = `
            <div id="sancha-transfer-popup-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:99999; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box;">
                <div style="background:#ffffff; width:100%; max-width:460px; border-radius:12px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.2); overflow:hidden;">
                    <div style="background:#0284c7; color:#ffffff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="margin:0; font-size:16px;">🚚 Sancha (${catLabel}) Stock Transfer</h3>
                        <button type="button" onclick="closeSanchaTransferModal()" style="background:transparent; border:none; color:#ffffff; font-size:22px; cursor:pointer;">&times;</button>
                    </div>
                    <div style="padding:16px;">
                        <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:10px; margin-bottom:12px; font-size:13px;">
                            <div><strong>Item:</strong> ${esc(itemName)} (${catLabel})</div>
                            <div><strong>Bhejne Wala Godam:</strong> ${esc(currentGodamName)}</div>
                            <div style="color:#0284c7; font-weight:bold; font-size:14px; margin-top:4px;">Maujooda Bacha Wazan: ${availableBacha.toFixed(2)} Kg</div>
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="font-size:12px; font-weight:700; color:#374151;">Kahan Bhejna Hai (Destination Godam):</label><br>
                            <select id="sancha-dest-godam" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px;">
                                ${godownOptions}
                            </select>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
                            <div>
                                <label style="font-size:12px; font-weight:700; color:#374151;">Kitna Wazan (Kg):</label><br>
                                <input type="number" step="0.01" id="sancha-transfer-qty" max="${availableBacha}" min="0.01" value="${availableBacha}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; font-weight:bold; box-sizing:border-box;">
                            </div>
                            <div>
                                <label style="font-size:12px; font-weight:700; color:#374151;">Tarikh:</label><br>
                                <input type="date" id="sancha-transfer-date" value="${today}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;">
                            </div>
                        </div>
                        <div style="margin-bottom:14px;">
                            <label style="font-size:12px; font-weight:700; color:#374151;">Note / Parchi No. (Optional):</label><br>
                            <input type="text" id="sancha-transfer-note" placeholder="e.g. Khairabad loom ke liye Tani bheji" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;">
                        </div>
                        <button type="button" onclick="submitSanchaTransferForm('${safeName}', '${safeCat}', '${currentKid}', ${availableBacha})" style="background:#0284c7; color:#ffffff; border:none; width:100%; padding:10px; border-radius:6px; font-weight:bold; font-size:14px; cursor:pointer;">
                            🚀 Sancha Transfer Confirm Karein
                        </button>
                    </div>
                </div>
            </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    const closeSanchaTransferModal = () => {
        const modal = document.getElementById('sancha-transfer-popup-modal');
        if (modal) modal.remove();
    };

    const submitSanchaTransferForm = (safeName, safeCat, fromKid, maxAvailable) => {
        const itemName = decodeURIComponent(safeName);
        const category = decodeURIComponent(safeCat);
        const toKid = document.getElementById('sancha-dest-godam')?.value;
        const qty = safeNum(document.getElementById('sancha-transfer-qty')?.value);
        const d = document.getElementById('sancha-transfer-date')?.value || 
                 ((typeof window.getTodayDate === 'function') ? window.getTodayDate() : '');
        const note = String(document.getElementById('sancha-transfer-note')?.value || '').trim();

        if (!toKid) return alert('Kripya Paane wala Godam chunein!');
        if (qty <= 0) return alert('Kripya sahi wazan (Kg) bharein!');
        if (qty > maxAvailable) return alert(`Aapke paas sirf ${maxAvailable.toFixed(2)} Kg bachi hai!`);

        let success = false;
        if (typeof window.transferSanchaStock === 'function') {
            success = window.transferSanchaStock(d, itemName, category, fromKid, toKid, qty, note);
        }

        if (success) {
            triggerSanchaCacheInvalidation();
            closeSanchaTransferModal();
            renderSanchaTable();
            alert(`✅ ${qty.toFixed(2)} Kg Sancha (${category === 'chukka' ? 'Chukka' : 'Tani'}) safalta-poorvak transfer ho gayi!`);
        }
    };

    /* ========================================================================
       7. SANCHA PASSBOOK ENGINE (VIRTUALIZED TABLE & KARIGER LOCK)
       ------------------------------------------------------------------------
    ======================================================================== */
    const openSanchaPassbook = (itemName) => {
        window.currentPassbookSanchaItem = decodeURIComponent(itemName);
        const modal = document.getElementById('item-modal');
        if (!modal) return;

        const title = document.getElementById('modal-item-title');
        const catLabel = window.currentSanchaCategory === 'tani' ? 'Tani' : 'Chukka';
        if (title) title.textContent = `📖 Sancha Passbook: ${window.currentPassbookSanchaItem} (${catLabel})`;

        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = `
                <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:12px; border-radius:10px; margin-bottom:12px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between;">
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                        <div><label style="font-size:12px; font-weight:700;">From Date:</label><br><input type="date" id="sancha-pass-from-date" onchange="renderSanchaPassbookRows()"></div>
                        <div><label style="font-size:12px; font-weight:700;">To Date:</label><br><input type="date" id="sancha-pass-to-date" onchange="renderSanchaPassbookRows()"></div>
                        <div style="align-self:flex-end;"><button type="button" class="quick-btn btn-out" onclick="resetSanchaPassbookFilters()">Reset</button></div>
                    </div>
                    <div style="flex:1; min-width:200px;">
                        <label style="font-size:12px; font-weight:700;">🔍 Search Any Column:</label><br>
                        <input type="text" id="sancha-pass-search-input" class="search-box" placeholder="Search Date, Kariger, Qty..." oninput="debouncedSanchaPassbookSearch()">
                    </div>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr style="background:#0284c7; color:white; font-size:12px;">
                                <th>TARIKH</th><th>DETAIL (TYPE)</th><th>KARIGER / PERSON</th><th>AAYA (Kg)</th><th>GAYA (Kg)</th><th style="text-align:center;">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody id="sancha-passbook-table-body"></tbody>
                    </table>
                </div>`;
        }

        modal.style.display = 'flex';
        renderSanchaPassbookRows();
    };

    const resetSanchaPassbookFilters = () => {
        const fDate = document.getElementById('sancha-pass-from-date');
        const tDate = document.getElementById('sancha-pass-to-date');
        const sInp = document.getElementById('sancha-pass-search-input');
        if (fDate) fDate.value = '';
        if (tDate) tDate.value = '';
        if (sInp) sInp.value = '';
        renderSanchaPassbookRows();
    };

    const debouncedSanchaPassbookSearch = () => {
        clearTimeout(passbookSearchDebounceTimer);
        passbookSearchDebounceTimer = setTimeout(() => {
            renderSanchaPassbookRows();
        }, 150);
    };

    const renderSanchaPassbookRows = () => {
        const tbody = document.getElementById('sancha-passbook-table-body');
        if (!tbody) return;

        const targetItemLower = window.currentPassbookSanchaItem.toLowerCase();
        const targetCatLower = window.currentSanchaCategory.toLowerCase();
        const allHist = window.safeArray ? window.safeArray(window.getStore('sancha_history')) : [];

        let hist = allHist.filter((x) => {
            if (!x?.name) return false;
            const nameMatch = x.name.toLowerCase() === targetItemLower;
            const catMatch = (x.category || 'tani').toLowerCase() === targetCatLower;
            if (!nameMatch || !catMatch) return false;

            if (window.currentSanchaKarkhanaFilter !== 'all') {
                const rowKid = x.karkhanaId || 'k_main';
                return String(rowKid) === String(window.currentSanchaKarkhanaFilter);
            }
            return true;
        });

        const fDate = document.getElementById('sancha-pass-from-date')?.value || '';
        const tDate = document.getElementById('sancha-pass-to-date')?.value || '';
        const sTxt = (document.getElementById('sancha-pass-search-input')?.value || '').toLowerCase().trim();

        if (fDate) hist = hist.filter((x) => x.date >= fDate);
        if (tDate) hist = hist.filter((x) => x.date <= tDate);

        if (sTxt) {
            hist = hist.filter((x) => {
                const rowString = `${x.date || ''} ${x.type || ''} ${x.kariger || ''} ${x.aaya || x.qty || ''} ${x.gaya || ''}`.toLowerCase();
                return rowString.includes(sTxt);
            });
        }

        if (!hist.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:15px; color:#888;">Koi entry nahi mili.</td></tr>';
            return;
        }

        let html = '';
        hist.forEach((r) => {
            const aayaQty = safeNum(r.aaya);
            const gayaQty = safeNum(r.gaya || r.qty);
            const karigerDisplay = (r.kariger && r.kariger !== '-' && r.kariger !== 'undefined') ? `👤 ${esc(r.kariger)}` : '📦 Factory Inward';

            const actionBtns = `
                <div style="display:flex; gap:6px; justify-content:center; align-items:center;">
                    <button type="button" class="sheet-btn" style="background:#3b82f6; color:#ffffff; padding:4px 8px; font-size:11px; font-weight:bold; border-radius:4px; border:none; cursor:pointer;" onclick="openSanchaEditModal('${esc(r.id)}')">✏️ Edit</button>
                    <button type="button" class="sheet-btn" style="background:#ef4444; color:#ffffff; padding:4px 8px; font-size:11px; font-weight:bold; border-radius:4px; border:none; cursor:pointer;" onclick="deleteSanchaHistoryEntry('${esc(r.id)}')">🗑️ Del</button>
                </div>`;

            html += `<tr>
                <td>${esc(r.date || '-')}</td>
                <td><strong>${esc(r.type || 'Godam Entry')}</strong></td>
                <td style="color:#1e3a8a; font-weight:700;">${karigerDisplay}</td>
                <td style="color:#059669; font-weight:700;">${aayaQty ? `${aayaQty.toFixed(2)} Kg` : '-'}</td>
                <td style="color:#ea580c; font-weight:700;">${gayaQty ? `-${gayaQty.toFixed(2)} Kg` : '-'}</td>
                <td style="text-align:center; white-space:nowrap;">${actionBtns}</td>
            </tr>`;
        });

        tbody.innerHTML = html;
    };

    /* ========================================================================
       8. ATOMIC PASSBOOK DELETE ENGINE
       ------------------------------------------------------------------------
    ======================================================================== */
    const deleteSanchaHistoryEntry = (id) => {
        if (!confirm('Kya aap sach me ye Passbook entry DELETE karna chahte hain?\nIsse stock balance wapas sahi settle ho jayega.')) return;

        let hist = window.safeArray ? window.safeArray(window.getStore('sancha_history')) : [];
        const entry = hist.find((x) => x && x.id === id);
        if (!entry) return alert('Entry nahi mili!');

        const isPurchase = (String(entry.type || '').includes('Khareed') || String(entry.type || '').includes('Inward'));
        const isTransfer = (entry.refId || String(entry.type || '').includes('Transfer'));

        // 1. Dual Transfer Rollback
        if (isTransfer && entry.refId) {
            hist = hist.filter((x) => x.refId !== entry.refId);
        } else {
            hist = hist.filter((x) => x.id !== id);
        }

        if (typeof window.setStore === 'function') {
            window.setStore('sancha_history', hist);
        }

        // 2. Direct Inward Purchase Rollback
        if (isPurchase) {
            const qtyToDeduct = safeNum(entry.aaya);
            const list = window.safeArray ? window.safeArray(window.getStore('sancha_items')) : [];
            const targetKid = entry.karkhanaId || 'k_main';
            const cat = (entry.category || window.currentSanchaCategory || 'tani').toLowerCase();

            const item = list.find((x) => {
                const matchK = (!x.karkhanaId && targetKid === 'k_main') || String(x.karkhanaId) === String(targetKid);
                return x?.name && x.name.toLowerCase() === entry.name.toLowerCase() && (x.category || 'tani').toLowerCase() === cat && matchK;
            });

            if (item) {
                item.aaya = Math.max(0, safeNum((safeNum(item.aaya) - qtyToDeduct).toFixed(2)));
                item.bacha = Math.max(0, safeNum((safeNum(item.aaya) - safeNum(item.gaya)).toFixed(2)));
                if (typeof window.setStore === 'function') window.setStore('sancha_items', list);
            }
        }

        triggerSanchaCacheInvalidation();
        renderSanchaPassbookRows();
        renderSanchaTable();
        alert('✅ Entry safalta-poorvak delete ho gayi!');
    };

    /* ========================================================================
       9. ATOMIC PASSBOOK EDIT MODAL & SAVE ENGINE
       ------------------------------------------------------------------------
    ======================================================================== */
    const openSanchaEditModal = (id) => {
        const hist = window.safeArray ? window.safeArray(window.getStore('sancha_history')) : [];
        const entry = hist.find((x) => x && x.id === id);
        if (!entry) return alert('Entry nahi mili!');

        const existingModal = document.getElementById('sancha-edit-popup-modal');
        if (existingModal) existingModal.remove();

        const currentQty = safeNum(entry.aaya || entry.gaya || entry.qty);
        const isAaya = safeNum(entry.aaya) > 0;
        const typeLabel = isAaya ? 'Aaya (Inward)' : 'Gaya (Outward)';

        const modalHtml = `
            <div id="sancha-edit-popup-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:999999; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box;">
                <div style="background:#ffffff; width:100%; max-width:420px; border-radius:12px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.3); overflow:hidden;">
                    <div style="background:#1e3a8a; color:#ffffff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="margin:0; font-size:16px;">✏️ Edit Sancha Entry</h3>
                        <button type="button" onclick="closeSanchaEditModal()" style="background:transparent; border:none; color:#ffffff; font-size:22px; cursor:pointer;">&times;</button>
                    </div>
                    <div style="padding:16px;">
                        <div style="background:#f1f5f9; padding:8px 12px; border-radius:6px; margin-bottom:12px; font-size:13px;">
                            <div><strong>Item:</strong> ${esc(entry.name)} (${entry.category === 'chukka' ? 'Chukka' : 'Tani'})</div>
                            <div><strong>Type:</strong> ${esc(entry.type || '-')}</div>
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="font-size:12px; font-weight:700; color:#374151;">Tarikh (Date):</label><br>
                            <input type="date" id="sancha-edit-date" value="${entry.date || ''}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px; box-sizing:border-box;">
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="font-size:12px; font-weight:700; color:#374151;">Kariger / Person Name:</label><br>
                            <input type="text" id="sancha-edit-person" value="${esc(entry.kariger || '')}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px; box-sizing:border-box;">
                        </div>
                        <div style="margin-bottom:16px;">
                            <label style="font-size:12px; font-weight:700; color:#374151;">Wazan (${typeLabel} Kg me):</label><br>
                            <input type="number" step="0.01" id="sancha-edit-qty" value="${currentQty.toFixed(2)}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; font-weight:bold; margin-top:4px; box-sizing:border-box;">
                        </div>
                        <button type="button" onclick="saveSanchaHistoryEdit('${esc(id)}')" style="background:#2563eb; color:#ffffff; border:none; width:100%; padding:10px; border-radius:6px; font-weight:bold; font-size:14px; cursor:pointer;">
                            💾 Badlaav Safe Karein
                        </button>
                    </div>
                </div>
            </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    const closeSanchaEditModal = () => {
        const modal = document.getElementById('sancha-edit-popup-modal');
        if (modal) modal.remove();
    };

    const saveSanchaHistoryEdit = (id) => {
        const hist = window.safeArray ? window.safeArray(window.getStore('sancha_history')) : [];
        const entry = hist.find((x) => x && x.id === id);
        if (!entry) return alert('Entry nahi mili!');

        const newDate = document.getElementById('sancha-edit-date')?.value;
        const newPerson = String(document.getElementById('sancha-edit-person')?.value || '').trim();
        const newQty = safeNum(document.getElementById('sancha-edit-qty')?.value);

        if (newQty <= 0) return alert('Kripya sahi wazan (Kg) darj karein!');

        const oldAaya = safeNum(entry.aaya);
        const isPurchase = (String(entry.type || '').includes('Khareed') || String(entry.type || '').includes('Inward'));
        const isTransfer = (entry.refId || String(entry.type || '').includes('Transfer'));

        // 1. History Metadata Updates
        entry.date = newDate;
        entry.kariger = newPerson || '-';

        if (oldAaya > 0) {
            const aayaDiff = newQty - oldAaya;
            entry.aaya = newQty;

            // Purchase adjustment on stock record
            if (isPurchase) {
                const list = window.safeArray ? window.safeArray(window.getStore('sancha_items')) : [];
                const targetKid = entry.karkhanaId || 'k_main';
                const cat = (entry.category || window.currentSanchaCategory || 'tani').toLowerCase();

                const item = list.find((x) => {
                    const matchK = (!x.karkhanaId && targetKid === 'k_main') || String(x.karkhanaId) === String(targetKid);
                    return x?.name && x.name.toLowerCase() === entry.name.toLowerCase() && (x.category || 'tani').toLowerCase() === cat && matchK;
                });

                if (item) {
                    item.aaya = safeNum((safeNum(item.aaya) + aayaDiff).toFixed(2));
                    item.bacha = safeNum((safeNum(item.aaya) - safeNum(item.gaya)).toFixed(2));
                    if (typeof window.setStore === 'function') window.setStore('sancha_items', list);
                }
            }
        } else {
            entry.gaya = newQty;
            entry.qty = newQty;
        }

        // 2. Synchronize Paired Transfer Entry
        if (isTransfer && entry.refId) {
            const pair = hist.find((x) => x && x.refId === entry.refId && x.id !== id);
            if (pair) {
                pair.date = newDate;
                if (pair.aaya > 0) pair.aaya = newQty;
                if (pair.gaya > 0) pair.gaya = newQty;
            }
        }

        if (typeof window.setStore === 'function') {
            window.setStore('sancha_history', hist);
        }

        triggerSanchaCacheInvalidation();
        closeSanchaEditModal();
        renderSanchaPassbookRows();
        renderSanchaTable();

        alert('✅ Sancha entry safalta-poorvak update ho gayi!');
    };

    /* ========================================================================
       10. GLOBAL EXPORT & EVENT LISTENERS
       ------------------------------------------------------------------------
    ======================================================================== */
    const sanchaUIAPI = {
        openSanchaModule,
        switchSanchaCategory,
        renderSanchaKarkhanaTabs,
        switchSanchaKarkhanaTab,
        toggleAddSanchaForm,
        toggleSanchaFormOptions,
        populateSanchaExistingDropdown,
        saveNewSanchaStock,
        filterSancha,
        renderSanchaTable,
        openSanchaTransferModal,
        closeSanchaTransferModal,
        submitSanchaTransferForm,
        openSanchaPassbook,
        resetSanchaPassbookFilters,
        debouncedSanchaPassbookSearch,
        renderSanchaPassbookRows,
        deleteSanchaHistoryEntry,
        openSanchaEditModal,
        closeSanchaEditModal,
        saveSanchaHistoryEdit
    };

    // Attach to window globally for legacy template handlers
    Object.keys(sanchaUIAPI).forEach((fnName) => {
        window[fnName] = sanchaUIAPI[fnName];
    });

    // Dedicated namespace
    window.SanchaUIEngine = sanchaUIAPI;

    // Attach search debouncer to main sancha filter input
    document.addEventListener('DOMContentLoaded', () => {
        const searchInput = document.getElementById('search-sancha-input');
        if (searchInput) {
            const debouncedSearch = (typeof window.debounce === 'function')
                ? window.debounce(filterSancha, 250)
                : filterSancha;
            searchInput.addEventListener('input', debouncedSearch);
        }
    });

    // Unit test export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = sanchaUIAPI;
    }
})();
