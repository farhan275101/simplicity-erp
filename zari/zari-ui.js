/* ========================================================
   SIMPLICITY ERP - ZARI STOCK & PAGINATED PASSBOOK ENGINE
   File: zari/zari-ui.js • Developed by Farhan Jawed
   (Multi-Godam Stock, Edit/Delete, Kariger Lock & Fast Mobile Pagination)
======================================================== */

(() => {
    'use strict';

    window.currentZariKarkhanaFilter = 'all';
    window.currentPassbookZariItem = '';

    // 📱 PAGINATION STATE (Prevents Mobile Lag/Hang)
    let zariPassbookCurrentPage = 1;
    const ZARI_PAGE_SIZE = 20;
    let filteredZariPassbookCache = [];

    const esc = (s) => {
        if (typeof window.sanitizeHTML === 'function') return window.sanitizeHTML(s);
        return String(s || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    };

    const safeNum = (val, fallback = 0) => {
        const n = parseFloat(val);
        return isNaN(n) || !isFinite(n) ? fallback : n;
    };

    const setDisplay = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.style.display = val;
    };

    /* ========================================================================
       1. NAVIGATION & TABS
       ------------------------------------------------------------------------
    ======================================================================== */
    const openZariModule = () => {
        setDisplay('dashboard-view', 'none');
        setDisplay('zari-section', 'block');

        renderZariKarkhanaTabs();
        populateZariExistingDropdown();
        renderZariTable();
    };

    const renderZariKarkhanaTabs = () => {
        const bar = document.getElementById('zari-karkhana-tabs-bar');
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

        const isAllActive = (window.currentZariKarkhanaFilter === 'all') ? ' active' : '';
        let html = `<button type="button" class="sheet-tab${isAllActive}" onclick="switchZariKarkhanaTab('all')">👥 Sabhi Karkhane</button>`;

        karkhanas.forEach((k) => {
            const isMain = (k.id === 'k_main' || k.isDefault);
            const icon = isMain ? '🏢 ' : '🏭 ';
            const isActive = (String(window.currentZariKarkhanaFilter) === String(k.id)) ? ' active' : '';
            html += `<button type="button" class="sheet-tab${isActive}" onclick="switchZariKarkhanaTab('${esc(k.id)}')">${icon}${esc(k.name)}</button>`;
        });

        bar.innerHTML = html;
    };

    const switchZariKarkhanaTab = (kId) => {
        window.currentZariKarkhanaFilter = kId || 'all';
        renderZariKarkhanaTabs();
        populateZariExistingDropdown();
        renderZariTable();
    };

    /* ========================================================================
       2. INWARD PURCHASE ENGINE
       ------------------------------------------------------------------------
    ======================================================================== */
    const toggleZariForm = () => {
        const f = document.getElementById('add-zari-form');
        if (!f) return;
        const isOpening = (f.style.display !== 'block');
        f.style.display = isOpening ? 'block' : 'none';

        if (isOpening) {
            const dInp = document.getElementById('zari-date');
            if (dInp) {
                dInp.value = (typeof window.getTodayDate === 'function') 
                    ? window.getTodayDate() 
                    : new Date().toISOString().split('T')[0];
            }
        }
    };

    const toggleZariItemType = () => {
        const isNew = document.getElementById('zari-type-new') 
            ? document.getElementById('zari-type-new').checked 
            : true;
        setDisplay('zari-existing-group', isNew ? 'none' : 'block');
        setDisplay('zari-new-group', isNew ? 'block' : 'none');
    };

    const populateZariExistingDropdown = () => {
        const sel = document.getElementById('zari-select-existing');
        if (!sel) return;
        sel.innerHTML = '';
        const list = window.safeArray ? window.safeArray(window.getStore('zari_stock')) : [];
        const unique = [];

        list.forEach((z) => {
            const n = z?.name ? z.name.trim() : '';
            if (n && unique.indexOf(n.toLowerCase()) === -1) {
                unique.push(n.toLowerCase());
                const opt = document.createElement('option');
                opt.value = n;
                opt.textContent = n;
                sel.appendChild(opt);
            }
        });
    };

    const saveNewZari = () => {
        const isNew = document.getElementById('zari-type-new') 
            ? document.getElementById('zari-type-new').checked 
            : true;

        const nameInp = isNew ? document.getElementById('zari-new-name') : document.getElementById('zari-select-existing');
        const name = String(nameInp?.value || '').trim();

        const date = document.getElementById('zari-date')?.value || 
                    ((typeof window.getTodayDate === 'function') ? window.getTodayDate() : new Date().toISOString().split('T')[0]);

        const qtyInp = document.getElementById('zari-aaya');
        const qty = safeNum(qtyInp?.value);

        if (!name) return alert('Zari Item ka naam zaroori hai!');
        if (qty <= 0) return alert('Wazan (Qty) daalein!');

        const targetKid = (window.currentZariKarkhanaFilter !== 'all') ? window.currentZariKarkhanaFilter : 'k_main';
        const list = window.safeArray ? window.safeArray(window.getStore('zari_stock')) : [];

        const item = list.find((x) => {
            const matchKid = (!x.karkhanaId && targetKid === 'k_main') || String(x.karkhanaId) === String(targetKid);
            return x?.name && x.name.toLowerCase() === name.toLowerCase() && matchKid;
        });

        if (item) {
            item.aaya = safeNum((safeNum(item.aaya) + qty).toFixed(2));
            item.bacha = safeNum((safeNum(item.aaya) - safeNum(item.gaya)).toFixed(2));
            item.date = date;
        } else {
            list.push({
                id: `zari_${Date.now()}`,
                date,
                name,
                aaya: qty,
                gaya: 0,
                bacha: qty,
                karkhanaId: targetKid,
                timestamp: Date.now()
            });
        }
        if (typeof window.setStore === 'function') window.setStore('zari_stock', list);

        const hist = window.safeArray ? window.safeArray(window.getStore('zari_history')) : [];
        hist.push({
            id: `zhist_${Date.now()}`,
            date,
            name,
            kariger: 'Godown Purchase',
            type: 'Khareed (Inward)',
            aaya: qty,
            gaya: 0,
            karkhanaId: targetKid,
            timestamp: Date.now()
        });
        if (typeof window.setStore === 'function') window.setStore('zari_history', hist);

        const newNameEl = document.getElementById('zari-new-name');
        if (newNameEl) newNameEl.value = '';
        if (qtyInp) qtyInp.value = '';

        toggleZariForm();
        populateZariExistingDropdown();
        renderZariTable();

        if (typeof window.updateDashboardBadgeTotals === 'function') window.updateDashboardBadgeTotals();
        alert(`✅ ${qty.toFixed(2)} Kg Zari Stock me jama ho gayi!`);
    };

    const filterZari = () => {
        renderZariTable();
    };

    /* ========================================================================
       3. MAIN ZARI TABLE RENDERER
       ------------------------------------------------------------------------
    ======================================================================== */
    const renderZariTable = () => {
        const tbody = document.getElementById('zari-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        const rawStock = window.safeArray ? window.safeArray(window.getStore('zari_stock')) : [];
        const uniqueNames = [];

        rawStock.forEach((z) => {
            if (!z || !z.name) return;
            const n = z.name.trim();
            if (uniqueNames.map(x => x.toLowerCase()).indexOf(n.toLowerCase()) === -1) {
                uniqueNames.push(n);
            }
        });

        const rows = [];
        uniqueNames.forEach((name) => {
            if (typeof window.getZariItemStats === 'function') {
                const stats = window.getZariItemStats(name, window.currentZariKarkhanaFilter);
                if (stats.aaya > 0 || stats.gaya > 0 || stats.bacha > 0) {
                    rows.push(stats);
                }
            }
        });

        const searchInp = document.getElementById('search-zari-input');
        const txt = searchInp ? searchInp.value.toLowerCase().trim() : '';

        const filteredRows = txt 
            ? rows.filter(r => `${r.name || ''} ${r.date || ''}`.toLowerCase().includes(txt)) 
            : rows;

        let totalBacha = 0;

        if (!filteredRows.length) {
            tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Koi Zari Stock nahi mila.</td></tr>";
        } else {
            let html = '';
            filteredRows.forEach((z) => {
                const bacha = safeNum(z.bacha);
                totalBacha += bacha;
                const safeName = encodeURIComponent(z.name);

                let transferBtn = '';
                if (bacha > 0) {
                    transferBtn = `<button type="button" class="sheet-btn" style="background:#f59e0b; color:#ffffff; padding:4px 9px; font-weight:bold; margin-left:6px; border-radius:4px; border:none; cursor:pointer;" onclick="openZariTransferModal('${safeName}', ${bacha})">🚚 Bhejo</button>`;
                }

                html += `<tr>
                    <td>${esc(z.date || '-')}</td>
                    <td><strong style="color:#1e3a8a;">${esc(z.name)}</strong></td>
                    <td style="color:#059669; font-weight:700;">+${safeNum(z.aaya).toFixed(2)}</td>
                    <td style="color:#ea580c; font-weight:700;">-${safeNum(z.gaya).toFixed(2)}</td>
                    <td style="font-weight:800; color:#1e3a8a; background:#eff6ff; font-size:14px;">${bacha.toFixed(2)} Kg</td>
                    <td style="text-align:center; white-space:nowrap;">
                        <button type="button" class="sheet-btn" style="background:#ea580c; padding:4px 10px; font-weight:bold; border-radius:4px; border:none; color:white; cursor:pointer;" onclick="openZariPassbook('${safeName}')">📖 Passbook</button>
                        ${transferBtn}
                    </td>
                </tr>`;
            });
            tbody.innerHTML = html;
        }

        const opVal = document.getElementById('zari-opening-val');
        if (opVal) opVal.textContent = `${totalBacha.toFixed(2)} Kg Kul Bachi`;
    };

    /* ========================================================================
       4. INTER-GODOWN TRANSFER POPUP
       ------------------------------------------------------------------------
    ======================================================================== */
    const openZariTransferModal = (safeName, availableBacha) => {
        const itemName = decodeURIComponent(safeName);
        const existingModal = document.getElementById('zari-transfer-popup-modal');
        if (existingModal) existingModal.remove();

        let karkhanas = (typeof window.getKarkhanasSafe === 'function') 
            ? window.getKarkhanasSafe() 
            : (window.safeArray ? window.safeArray(window.getStore('karkhana_list')) : []);

        const currentKid = (window.currentZariKarkhanaFilter !== 'all') ? window.currentZariKarkhanaFilter : 'k_main';
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

        const today = (typeof window.getTodayDate === 'function') ? window.getTodayDate() : new Date().toISOString().split('T')[0];

        const modalHtml = `
            <div id="zari-transfer-popup-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:99999; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box;">
                <div style="background:#ffffff; width:100%; max-width:460px; border-radius:12px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.2); overflow:hidden;">
                    <div style="background:#ea580c; color:#ffffff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="margin:0; font-size:16px;">🚚 Zari Stock Transfer</h3>
                        <button type="button" onclick="closeZariTransferModal()" style="background:transparent; border:none; color:#ffffff; font-size:22px; cursor:pointer;">&times;</button>
                    </div>
                    <div style="padding:16px;">
                        <div style="background:#fff7ed; border:1px solid #ffedd5; border-radius:8px; padding:10px; margin-bottom:12px; font-size:13px;">
                            <div><strong>Zari Item:</strong> ${esc(itemName)}</div>
                            <div><strong>Bhejne Wala Godam:</strong> ${esc(currentGodamName)}</div>
                            <div style="color:#ea580c; font-weight:bold; font-size:14px; margin-top:4px;">Maujooda Bacha Wazan: ${availableBacha.toFixed(2)} Kg</div>
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="font-size:12px; font-weight:700; color:#374151;">Kahan Bhejna Hai (Destination Godam):</label><br>
                            <select id="zari-dest-godam" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px;">
                                ${godownOptions}
                            </select>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
                            <div>
                                <label style="font-size:12px; font-weight:700; color:#374151;">Kitna Wazan (Kg):</label><br>
                                <input type="number" step="0.01" id="zari-transfer-qty" max="${availableBacha}" min="0.01" value="${availableBacha}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; font-weight:bold; box-sizing:border-box;">
                            </div>
                            <div>
                                <label style="font-size:12px; font-weight:700; color:#374151;">Tarikh:</label><br>
                                <input type="date" id="zari-transfer-date" value="${today}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;">
                            </div>
                        </div>
                        <div style="margin-bottom:14px;">
                            <label style="font-size:12px; font-weight:700; color:#374151;">Note / Parchi No. (Optional):</label><br>
                            <input type="text" id="zari-transfer-note" placeholder="e.g. Mubarakpur unit ke liye bheja" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;">
                        </div>
                        <button type="button" onclick="submitZariTransferForm('${safeName}', '${currentKid}', ${availableBacha})" style="background:#ea580c; color:#ffffff; border:none; width:100%; padding:10px; border-radius:6px; font-weight:bold; font-size:14px; cursor:pointer;">
                            🚀 Zari Transfer Confirm Karein
                        </button>
                    </div>
                </div>
            </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    const closeZariTransferModal = () => {
        const modal = document.getElementById('zari-transfer-popup-modal');
        if (modal) modal.remove();
    };

    const submitZariTransferForm = (safeName, fromKid, maxAvailable) => {
        const itemName = decodeURIComponent(safeName);
        const toKid = document.getElementById('zari-dest-godam')?.value;
        const qty = safeNum(document.getElementById('zari-transfer-qty')?.value);
        const d = document.getElementById('zari-transfer-date')?.value || 
                 ((typeof window.getTodayDate === 'function') ? window.getTodayDate() : '');
        const note = String(document.getElementById('zari-transfer-note')?.value || '').trim();

        if (!toKid) return alert('Kripya Paane wala Godam chunein!');
        if (qty <= 0) return alert('Kripya sahi wazan (Kg) bharein!');
        if (qty > maxAvailable) return alert(`Aapke paas sirf ${maxAvailable.toFixed(2)} Kg bachi hai!`);

        let success = false;
        if (typeof window.transferZariStock === 'function') {
            success = window.transferZariStock(d, itemName, fromKid, toKid, qty, note);
        }

        if (success) {
            closeZariTransferModal();
            renderZariTable();
            alert(`✅ ${qty.toFixed(2)} Kg Zari safalta-poorvak transfer ho gayi!`);
        }
    };

    /* ========================================================================
       5. 📱 PAGINATED ZARI PASSBOOK ENGINE (MOBILE NO-HANG)
       ------------------------------------------------------------------------
    ======================================================================== */
    const openZariPassbook = (safeName) => {
        window.currentPassbookZariItem = decodeURIComponent(safeName);
        zariPassbookCurrentPage = 1;

        const modal = document.getElementById('item-modal');
        if (!modal) return;

        const title = document.getElementById('modal-item-title');
        if (title) title.textContent = `📖 Zari Passbook: ${window.currentPassbookZariItem}`;

        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = `
                <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:12px; border-radius:10px; margin-bottom:12px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between;">
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                        <div><label style="font-size:12px; font-weight:700;">From Date:</label><br><input type="date" id="zari-pass-from-date" onchange="applyZariPassbookFilters()"></div>
                        <div><label style="font-size:12px; font-weight:700;">To Date:</label><br><input type="date" id="zari-pass-to-date" onchange="applyZariPassbookFilters()"></div>
                        <div style="align-self:flex-end;"><button type="button" class="quick-btn btn-out" onclick="resetZariPassbookFilters()">Reset</button></div>
                    </div>
                    <div style="flex:1; min-width:180px;">
                        <label style="font-size:12px; font-weight:700;">🔍 Search:</label><br>
                        <input type="text" id="zari-pass-search-input" class="search-box" placeholder="Search Date, Kariger..." oninput="applyZariPassbookFilters()">
                    </div>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr style="background:#ea580c; color:white; font-size:12px;">
                                <th>TARIKH</th><th>DETAIL (TYPE)</th><th>KARIGER / SOURCE</th><th>AAYI (Kg)</th><th>GAYI (Kg)</th><th style="text-align:center;">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody id="zari-passbook-table-body"></tbody>
                    </table>
                </div>
                <div id="zari-passbook-pagination-controls" style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding:8px 4px; border-top:1px solid #e2e8f0;"></div>`;
        }

        modal.style.display = 'flex';
        applyZariPassbookFilters();
    };

    const resetZariPassbookFilters = () => {
        const fDate = document.getElementById('zari-pass-from-date');
        const tDate = document.getElementById('zari-pass-to-date');
        const sInp = document.getElementById('zari-pass-search-input');
        if (fDate) fDate.value = '';
        if (tDate) tDate.value = '';
        if (sInp) sInp.value = '';
        zariPassbookCurrentPage = 1;
        applyZariPassbookFilters();
    };

    const applyZariPassbookFilters = () => {
        const targetItemLower = window.currentPassbookZariItem.toLowerCase();
        const allHist = window.safeArray ? window.safeArray(window.getStore('zari_history')) : [];

        let hist = allHist.filter((x) => {
            if (!x?.name) return false;
            if (x.name.toLowerCase() !== targetItemLower) return false;

            if (window.currentZariKarkhanaFilter !== 'all') {
                const rowKid = x.karkhanaId || 'k_main';
                return String(rowKid) === String(window.currentZariKarkhanaFilter);
            }
            return true;
        });

        const fDate = document.getElementById('zari-pass-from-date')?.value || '';
        const tDate = document.getElementById('zari-pass-to-date')?.value || '';
        const sTxt = (document.getElementById('zari-pass-search-input')?.value || '').toLowerCase().trim();

        if (fDate) hist = hist.filter(x => x.date >= fDate);
        if (tDate) hist = hist.filter(x => x.date <= tDate);

        if (sTxt) {
            hist = hist.filter((x) => {
                const rowString = `${x.date || ''} ${x.type || ''} ${x.kariger || ''} ${x.aaya || x.qty || ''} ${x.gaya || ''}`.toLowerCase();
                return rowString.includes(sTxt);
            });
        }

        // Newest entries on top
        hist.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        filteredZariPassbookCache = hist;
        renderPaginatedZariPassbook();
    };

    const renderPaginatedZariPassbook = () => {
        const tbody = document.getElementById('zari-passbook-table-body');
        const pager = document.getElementById('zari-passbook-pagination-controls');
        if (!tbody) return;
        tbody.innerHTML = '';

        const totalEntries = filteredZariPassbookCache.length;
        if (!totalEntries) {
            tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:15px; color:#888;'>Koi entry nahi mili.</td></tr>";
            if (pager) pager.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(totalEntries / ZARI_PAGE_SIZE);
        if (zariPassbookCurrentPage > totalPages) zariPassbookCurrentPage = totalPages;
        if (zariPassbookCurrentPage < 1) zariPassbookCurrentPage = 1;

        const startIndex = (zariPassbookCurrentPage - 1) * ZARI_PAGE_SIZE;
        const pageRows = filteredZariPassbookCache.slice(startIndex, startIndex + ZARI_PAGE_SIZE);

        let html = '';
        pageRows.forEach((r) => {
            const aayaQty = safeNum(r.aaya || r.qty);
            const gayaQty = safeNum(r.gaya);

            const isOpeningEntry = r.isOpening || (r.type && r.type.toLowerCase().includes('opening'));
            const isKarigerEntry = (r.type && r.type.toLowerCase().includes('kariger')) || 
                                  (r.kariger && r.kariger.toLowerCase().includes('kariger sheet'));

            const karigerDisplay = isOpeningEntry 
                ? '📦 31st March Closing (Opening)' 
                : ((r.kariger && r.kariger !== '-' && r.kariger !== 'undefined') ? `👤 ${esc(r.kariger)}` : '📦 Factory Inward');

            let actBtn = '';
            if (isOpeningEntry) {
                actBtn = "<span style='color:#64748b; font-size:11px; font-weight:700;'>🔒 Opening Lock</span>";
            } else if (isKarigerEntry) {
                actBtn = "<span style='color:#64748b; font-size:11px; font-weight:700;'>🔒 Kariger Sheet</span>";
            } else {
                actBtn = `
                    <div style="display:flex; gap:6px; justify-content:center; align-items:center;">
                        <button type="button" class="sheet-btn" style="background:#3b82f6; color:#ffffff; padding:4px 8px; font-size:11px; font-weight:bold; border-radius:4px; border:none; cursor:pointer;" onclick="openZariEditModal('${esc(r.id)}')">✏️ Edit</button>
                        <button type="button" class="sheet-btn" style="background:#ef4444; color:#ffffff; padding:4px 8px; font-size:11px; font-weight:bold; border-radius:4px; border:none; cursor:pointer;" onclick="deleteZariHistoryEntry('${esc(r.id)}')">🗑️ Del</button>
                    </div>`;
            }

            html += `<tr>
                <td>${esc(r.date || '-')}</td>
                <td><strong>${esc(r.type || 'Godam Inward')}</strong></td>
                <td style="color:#1e3a8a; font-weight:700;">${karigerDisplay}</td>
                <td style="color:#059669; font-weight:700;">${aayaQty > 0 ? `+${aayaQty.toFixed(2)}` : '-'}</td>
                <td style="color:#ea580c; font-weight:700;">${gayaQty > 0 ? `-${gayaQty.toFixed(2)}` : '-'}</td>
                <td style="text-align:center; white-space:nowrap;">${actBtn}</td>
            </tr>`;
        });

        tbody.innerHTML = html;

        // Render Pagination Controls
        if (pager) {
            pager.innerHTML = `
                <div style="font-size:12px; color:#475569; font-weight:600;">
                    Showing <strong>${startIndex + 1}</strong> - <strong>${Math.min(startIndex + ZARI_PAGE_SIZE, totalEntries)}</strong> of <strong>${totalEntries}</strong> entries
                </div>
                <div style="display:flex; gap:6px;">
                    <button type="button" class="sheet-btn" style="background:${zariPassbookCurrentPage <= 1 ? '#cbd5e1' : '#ea580c'}; color:white; padding:4px 10px; border-radius:4px; border:none; cursor:${zariPassbookCurrentPage <= 1 ? 'not-allowed' : 'pointer'};" ${zariPassbookCurrentPage <= 1 ? 'disabled' : ''} onclick="changeZariPassbookPage(-1)">◀ Prev</button>
                    <span style="font-size:12px; font-weight:bold; padding:4px 8px; background:#f1f5f9; border-radius:4px;">${zariPassbookCurrentPage} / ${totalPages}</span>
                    <button type="button" class="sheet-btn" style="background:${zariPassbookCurrentPage >= totalPages ? '#cbd5e1' : '#ea580c'}; color:white; padding:4px 10px; border-radius:4px; border:none; cursor:${zariPassbookCurrentPage >= totalPages ? 'not-allowed' : 'pointer'};" ${zariPassbookCurrentPage >= totalPages ? 'disabled' : ''} onclick="changeZariPassbookPage(1)">Next ▶</button>
                </div>`;
        }
    };

    const changeZariPassbookPage = (delta) => {
        zariPassbookCurrentPage += delta;
        renderPaginatedZariPassbook();
    };

    /* ========================================================================
       6. DELETE & EDIT ENGINES
       ------------------------------------------------------------------------
    ======================================================================== */
    const deleteZariHistoryEntry = (histId) => {
        if (!confirm('Kya aap sach me ye entry DELETE karna chahte hain?\nStock balance wapas sahi settle ho jayega.')) return;

        let hist = window.safeArray ? window.safeArray(window.getStore('zari_history')) : [];
        const entry = hist.find(x => x && String(x.id) === String(histId));
        if (!entry) return alert('Entry nahi mili!');

        const isTransfer = (entry.refId && String(entry.refId).includes('tr_zari')) || 
                           (entry.type && entry.type.toLowerCase().includes('transfer'));
        const isPurchase = !isTransfer && (entry.type && (entry.type.toLowerCase().includes('khareed') || entry.type.toLowerCase().includes('inward')));

        if (isTransfer && entry.refId) {
            hist = hist.filter(x => x.refId !== entry.refId);
            const transfers = (window.safeArray ? window.safeArray(window.getStore('material_transfers')) : []).filter(t => t.id !== entry.refId);
            if (typeof window.setStore === 'function') window.setStore('material_transfers', transfers);
        } else {
            hist = hist.filter(x => String(x.id) !== String(histId));
        }

        if (typeof window.setStore === 'function') window.setStore('zari_history', hist);

        if (isPurchase) {
            const qty = safeNum(entry.aaya || entry.qty);
            const list = window.safeArray ? window.safeArray(window.getStore('zari_stock')) : [];
            const targetKid = entry.karkhanaId || 'k_main';

            const item = list.find((x) => {
                const matchKid = (!x.karkhanaId && targetKid === 'k_main') || String(x.karkhanaId) === String(targetKid);
                return x?.name && x.name.toLowerCase() === entry.name.toLowerCase() && matchKid;
            });

            if (item) {
                item.aaya = Math.max(0, safeNum((safeNum(item.aaya) - qty).toFixed(2)));
                item.bacha = safeNum((safeNum(item.aaya) - safeNum(item.gaya)).toFixed(2));
                if (typeof window.setStore === 'function') window.setStore('zari_stock', list);
            }
        }

        applyZariPassbookFilters();
        renderZariTable();
        if (typeof window.updateDashboardBadgeTotals === 'function') window.updateDashboardBadgeTotals();
        alert('🗑️ Entry safalta-poorvak delete ho gayi!');
    };

    const openZariEditModal = (id) => {
        const hist = window.safeArray ? window.safeArray(window.getStore('zari_history')) : [];
        const entry = hist.find(x => x && String(x.id) === String(id));
        if (!entry) return alert('Entry nahi mili!');

        const existingModal = document.getElementById('zari-edit-popup-modal');
        if (existingModal) existingModal.remove();

        const currentQty = safeNum(entry.aaya || entry.gaya || entry.qty);
        const isAaya = safeNum(entry.aaya) > 0;
        const typeLabel = isAaya ? 'Aaya (Inward)' : 'Gaya (Outward)';

        const modalHtml = `
            <div id="zari-edit-popup-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:999999; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box;">
                <div style="background:#ffffff; width:100%; max-width:420px; border-radius:12px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.3); overflow:hidden;">
                    <div style="background:#ea580c; color:#ffffff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="margin:0; font-size:16px;">✏️ Edit Zari Entry</h3>
                        <button type="button" onclick="closeZariEditModal()" style="background:transparent; border:none; color:#ffffff; font-size:22px; cursor:pointer;">&times;</button>
                    </div>
                    <div style="padding:16px;">
                        <div style="background:#fff7ed; padding:8px 12px; border-radius:6px; margin-bottom:12px; font-size:13px;">
                            <div><strong>Item:</strong> ${esc(entry.name)}</div>
                            <div><strong>Type:</strong> ${esc(entry.type || '-')}</div>
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="font-size:12px; font-weight:700; color:#374151;">Tarikh (Date):</label><br>
                            <input type="date" id="zari-edit-date" value="${entry.date || ''}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px; box-sizing:border-box;">
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="font-size:12px; font-weight:700; color:#374151;">Party / Source / Note:</label><br>
                            <input type="text" id="zari-edit-kariger" value="${esc(entry.kariger || '')}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px; box-sizing:border-box;">
                        </div>
                        <div style="margin-bottom:16px;">
                            <label style="font-size:12px; font-weight:700; color:#374151;">Wazan (${typeLabel} Kg me):</label><br>
                            <input type="number" step="0.01" id="zari-edit-qty" value="${currentQty.toFixed(2)}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; font-weight:bold; margin-top:4px; box-sizing:border-box;">
                        </div>
                        <button type="button" onclick="saveZariHistoryEdit('${esc(id)}')" style="background:#ea580c; color:#ffffff; border:none; width:100%; padding:10px; border-radius:6px; font-weight:bold; font-size:14px; cursor:pointer;">
                            💾 Badlaav Safe Karein
                        </button>
                    </div>
                </div>
            </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    const closeZariEditModal = () => {
        const modal = document.getElementById('zari-edit-popup-modal');
        if (modal) modal.remove();
    };

    const saveZariHistoryEdit = (id) => {
        const hist = window.safeArray ? window.safeArray(window.getStore('zari_history')) : [];
        const entry = hist.find(x => x && String(x.id) === String(id));
        if (!entry) return alert('Entry nahi mili!');

        const newDate = document.getElementById('zari-edit-date')?.value;
        const newKariger = String(document.getElementById('zari-edit-kariger')?.value || '').trim();
        const newQty = safeNum(document.getElementById('zari-edit-qty')?.value);

        if (newQty <= 0) return alert('Kripya sahi wazan (Kg) darj karein!');

        const oldAaya = safeNum(entry.aaya);
        const isTransfer = (entry.refId && String(entry.refId).includes('tr_zari')) || 
                           (entry.type && entry.type.toLowerCase().includes('transfer'));
        const isPurchase = !isTransfer && (entry.type && (entry.type.toLowerCase().includes('khareed') || entry.type.toLowerCase().includes('inward')));

        entry.date = newDate;
        entry.kariger = newKariger || 'Godown Purchase';

        if (oldAaya > 0) {
            const aayaDiff = newQty - oldAaya;
            entry.aaya = newQty;

            if (isPurchase) {
                const list = window.safeArray ? window.safeArray(window.getStore('zari_stock')) : [];
                const targetKid = entry.karkhanaId || 'k_main';

                const item = list.find((x) => {
                    const matchKid = (!x.karkhanaId && targetKid === 'k_main') || String(x.karkhanaId) === String(targetKid);
                    return x?.name && x.name.toLowerCase() === entry.name.toLowerCase() && matchKid;
                });

                if (item) {
                    item.aaya = safeNum((safeNum(item.aaya) + aayaDiff).toFixed(2));
                    item.bacha = safeNum((safeNum(item.aaya) - safeNum(item.gaya)).toFixed(2));
                    if (typeof window.setStore === 'function') window.setStore('zari_stock', list);
                }
            }
        } else {
            entry.gaya = newQty;
            entry.qty = newQty;
        }

        if (isTransfer && entry.refId) {
            const pair = hist.find(x => x && x.refId === entry.refId && String(x.id) !== String(id));
            if (pair) {
                pair.date = newDate;
                if (pair.aaya > 0) pair.aaya = newQty;
                if (pair.gaya > 0) pair.gaya = newQty;
            }

            const transfers = window.safeArray ? window.safeArray(window.getStore('material_transfers')) : [];
            const tr = transfers.find(t => t && t.id === entry.refId);
            if (tr) {
                tr.date = newDate;
                tr.qty = newQty;
                tr.quantity = newQty;
                if (typeof window.setStore === 'function') window.setStore('material_transfers', transfers);
            }
        }

        if (typeof window.setStore === 'function') window.setStore('zari_history', hist);

        closeZariEditModal();
        applyZariPassbookFilters();
        renderZariTable();

        if (typeof window.updateDashboardBadgeTotals === 'function') window.updateDashboardBadgeTotals();
        alert('✅ Zari entry safalta-poorvak update ho gayi!');
    };

    /* ========================================================================
       7. GLOBAL EXPORTS
       ------------------------------------------------------------------------
    ======================================================================== */
    const zariUIAPI = {
        openZariModule,
        renderZariKarkhanaTabs,
        switchZariKarkhanaTab,
        toggleZariForm,
        toggleZariItemType,
        populateZariExistingDropdown,
        saveNewZari,
        filterZari,
        renderZariTable,
        openZariTransferModal,
        closeZariTransferModal,
        submitZariTransferForm,
        openZariPassbook,
        resetZariPassbookFilters,
        applyZariPassbookFilters,
        changeZariPassbookPage,
        deleteZariHistoryEntry,
        openZariEditModal,
        closeZariEditModal,
        saveZariHistoryEdit
    };

    Object.keys(zariUIAPI).forEach((fn) => { window[fn] = zariUIAPI[fn]; });
    window.ZariUIEngine = zariUIAPI;
})();
