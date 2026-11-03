/* ============================================================================
   SIMPLICITY ERP - BANA STOCK & PAGINATED PASSBOOK ENGINE
   File: bana/bana-ui.js • Developed by Farhan Jawed
   (Multi-Godam Stock, Edit/Delete, Kariger Lock & Fast Mobile Pagination)
============================================================================ */

(() => {
    'use strict';

    window.currentBanaKarkhanaFilter = 'all';
    window.currentPassbookBanaItem = '';

    // 📱 PAGINATION STATE (Prevents Mobile Hang)
    let passbookCurrentPage = 1;
    const PASSBOOK_PAGE_SIZE = 20;
    let filteredPassbookCache = [];

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
    const openBanaModule = () => {
        setDisplay('dashboard-view', 'none');
        setDisplay('bana-section', 'block');

        renderBanaKarkhanaTabs();
        populateBanaExistingDropdown();
        renderBanaTable();
    };

    const renderBanaKarkhanaTabs = () => {
        const bar = document.getElementById('bana-karkhana-tabs-bar');
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

        const isAllActive = (window.currentBanaKarkhanaFilter === 'all') ? ' active' : '';
        let html = `<button type="button" class="sheet-tab${isAllActive}" onclick="switchBanaKarkhanaTab('all')">👥 Sabhi Karkhane</button>`;

        karkhanas.forEach((k) => {
            const isMain = (k.id === 'k_main' || k.isDefault);
            const icon = isMain ? '🏢 ' : '🏭 ';
            const isActive = (String(window.currentBanaKarkhanaFilter) === String(k.id)) ? ' active' : '';
            html += `<button type="button" class="sheet-tab${isActive}" onclick="switchBanaKarkhanaTab('${esc(k.id)}')">${icon}${esc(k.name)}</button>`;
        });

        bar.innerHTML = html;
    };

    const switchBanaKarkhanaTab = (kId) => {
        window.currentBanaKarkhanaFilter = kId || 'all';
        renderBanaKarkhanaTabs();
        populateBanaExistingDropdown();
        renderBanaTable();
    };

    /* ========================================================================
       2. INWARD PURCHASE ENGINE
       ------------------------------------------------------------------------
    ======================================================================== */
    const toggleBanaForm = () => {
        const f = document.getElementById('add-bana-form');
        if (!f) return;
        const isOpening = (f.style.display !== 'block');
        f.style.display = isOpening ? 'block' : 'none';

        if (isOpening) {
            const dInp = document.getElementById('bana-date');
            if (dInp) {
                dInp.value = (typeof window.getTodayDate === 'function') 
                    ? window.getTodayDate() 
                    : new Date().toISOString().split('T')[0];
            }
        }
    };

    const toggleBanaItemType = () => {
        const typeNewRadio = document.getElementById('bana-type-new');
        const isNew = typeNewRadio ? typeNewRadio.checked : false;
        setDisplay('bana-existing-group', isNew ? 'none' : 'block');
        setDisplay('bana-new-group', isNew ? 'block' : 'none');
    };

    const populateBanaExistingDropdown = () => {
        const sel = document.getElementById('bana-select-existing');
        if (!sel) return;
        sel.innerHTML = '';
        const list = window.safeArray ? window.safeArray(window.getStore('bana_stock')) : [];
        const unique = [];

        list.forEach((b) => {
            const n = b?.name ? b.name.trim() : '';
            if (n && unique.indexOf(n.toLowerCase()) === -1) {
                unique.push(n.toLowerCase());
                const opt = document.createElement('option');
                opt.value = n;
                opt.textContent = n;
                sel.appendChild(opt);
            }
        });
    };

    const saveNewBana = () => {
        const typeNewRadio = document.getElementById('bana-type-new');
        const isNew = typeNewRadio ? typeNewRadio.checked : false;

        const nameInp = isNew ? document.getElementById('bana-new-name') : document.getElementById('bana-select-existing');
        const name = String(nameInp?.value || '').trim();

        const date = document.getElementById('bana-date')?.value || 
                    ((typeof window.getTodayDate === 'function') ? window.getTodayDate() : new Date().toISOString().split('T')[0]);

        const qtyInp = document.getElementById('bana-aaya');
        const qty = safeNum(qtyInp?.value);

        if (!name) return alert('Bana Item ka naam zaroori hai!');
        if (qty <= 0) return alert('Wazan (Qty) daalein!');

        const targetKid = (window.currentBanaKarkhanaFilter !== 'all') ? window.currentBanaKarkhanaFilter : 'k_main';
        const list = window.safeArray ? window.safeArray(window.getStore('bana_stock')) : [];

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
                id: `bana_${Date.now()}`,
                date,
                name,
                aaya: qty,
                gaya: 0,
                bacha: qty,
                karkhanaId: targetKid,
                timestamp: Date.now()
            });
        }
        if (typeof window.setStore === 'function') window.setStore('bana_stock', list);

        const hist = window.safeArray ? window.safeArray(window.getStore('bana_history')) : [];
        hist.push({
            id: `bhist_${Date.now()}`,
            date,
            name,
            kariger: 'Godown Purchase',
            type: 'Khareed (Inward)',
            aaya: qty,
            gaya: 0,
            karkhanaId: targetKid,
            timestamp: Date.now()
        });
        if (typeof window.setStore === 'function') window.setStore('bana_history', hist);

        const newNameEl = document.getElementById('bana-new-name');
        if (newNameEl) newNameEl.value = '';
        if (qtyInp) qtyInp.value = '';

        toggleBanaForm();
        populateBanaExistingDropdown();
        renderBanaTable();

        if (typeof window.updateDashboardBadgeTotals === 'function') window.updateDashboardBadgeTotals();
        alert(`✅ ${qty.toFixed(2)} Kg Bana Stock me jama ho gaya!`);
    };

    const filterBana = () => {
        renderBanaTable();
    };

    /* ========================================================================
       3. MAIN BANA TABLE RENDERER
       ------------------------------------------------------------------------
    ======================================================================== */
    const renderBanaTable = () => {
        const tbody = document.getElementById('bana-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        const rawStock = window.safeArray ? window.safeArray(window.getStore('bana_stock')) : [];
        const uniqueNames = [];

        rawStock.forEach((b) => {
            if (!b || !b.name) return;
            const n = b.name.trim();
            if (uniqueNames.map(x => x.toLowerCase()).indexOf(n.toLowerCase()) === -1) {
                uniqueNames.push(n);
            }
        });

        const rows = [];
        uniqueNames.forEach((name) => {
            if (typeof window.getBanaItemStats === 'function') {
                const stats = window.getBanaItemStats(name, window.currentBanaKarkhanaFilter);
                if (stats.aaya > 0 || stats.gaya > 0 || stats.bacha > 0) {
                    rows.push(stats);
                }
            }
        });

        const searchInp = document.getElementById('search-bana-input');
        const txt = searchInp ? searchInp.value.toLowerCase().trim() : '';

        const filteredRows = txt 
            ? rows.filter(r => `${r.name || ''} ${r.date || ''}`.toLowerCase().includes(txt)) 
            : rows;

        let totalBacha = 0;

        if (!filteredRows.length) {
            tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Koi Bana Stock nahi mila.</td></tr>";
        } else {
            let html = '';
            filteredRows.forEach((b) => {
                const bacha = safeNum(b.bacha);
                totalBacha += bacha;
                const safeName = encodeURIComponent(b.name);

                let transferBtn = '';
                if (bacha > 0) {
                    transferBtn = `<button type="button" class="sheet-btn" style="background:#f59e0b; color:#ffffff; padding:4px 9px; font-weight:bold; margin-left:6px; border-radius:4px; border:none; cursor:pointer;" onclick="openBanaTransferModal('${safeName}', ${bacha})">🚚 Bhejo</button>`;
                }

                html += `<tr>
                    <td>${esc(b.date || '-')}</td>
                    <td><strong style="color:#1e3a8a;">${esc(b.name)}</strong></td>
                    <td style="color:#059669; font-weight:700;">+${safeNum(b.aaya).toFixed(2)}</td>
                    <td style="color:#ea580c; font-weight:700;">-${safeNum(b.gaya).toFixed(2)}</td>
                    <td style="font-weight:800; color:#1e3a8a; background:#eff6ff; font-size:14px;">${bacha.toFixed(2)} Kg</td>
                    <td style="text-align:center; white-space:nowrap;">
                        <button type="button" class="sheet-btn" style="background:#059669; padding:4px 10px; font-weight:bold; border-radius:4px; border:none; color:white; cursor:pointer;" onclick="openBanaPassbook('${safeName}')">📖 Passbook</button>
                        ${transferBtn}
                    </td>
                </tr>`;
            });
            tbody.innerHTML = html;
        }

        const opVal = document.getElementById('bana-opening-val');
        if (opVal) opVal.textContent = `${totalBacha.toFixed(2)} Kg Kul Bacha`;
    };

    /* ========================================================================
       4. INTER-GODOWN TRANSFER POPUP
       ------------------------------------------------------------------------
    ======================================================================== */
    const openBanaTransferModal = (safeName, availableBacha) => {
        const itemName = decodeURIComponent(safeName);
        const existingModal = document.getElementById('bana-transfer-popup-modal');
        if (existingModal) existingModal.remove();

        let karkhanas = (typeof window.getKarkhanasSafe === 'function') 
            ? window.getKarkhanasSafe() 
            : (window.safeArray ? window.safeArray(window.getStore('karkhana_list')) : []);

        const currentKid = (window.currentBanaKarkhanaFilter !== 'all') ? window.currentBanaKarkhanaFilter : 'k_main';
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
            <div id="bana-transfer-popup-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:99999; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box;">
                <div style="background:#ffffff; width:100%; max-width:460px; border-radius:12px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.2); overflow:hidden;">
                    <div style="background:#059669; color:#ffffff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="margin:0; font-size:16px;">🚚 Bana Stock Transfer</h3>
                        <button type="button" onclick="closeBanaTransferModal()" style="background:transparent; border:none; color:#ffffff; font-size:22px; cursor:pointer;">&times;</button>
                    </div>
                    <div style="padding:16px;">
                        <div style="background:#ecfdf5; border:1px solid #d1fae5; border-radius:8px; padding:10px; margin-bottom:12px; font-size:13px;">
                            <div><strong>Bana Item:</strong> ${esc(itemName)}</div>
                            <div><strong>Bhejne Wala Godam:</strong> ${esc(currentGodamName)}</div>
                            <div style="color:#059669; font-weight:bold; font-size:14px; margin-top:4px;">Maujooda Bacha Wazan: ${availableBacha.toFixed(2)} Kg</div>
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="font-size:12px; font-weight:700; color:#374151;">Kahan Bhejna Hai (Destination Godam):</label><br>
                            <select id="bana-dest-godam" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px;">
                                ${godownOptions}
                            </select>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
                            <div>
                                <label style="font-size:12px; font-weight:700; color:#374151;">Kitna Wazan (Kg):</label><br>
                                <input type="number" step="0.01" id="bana-transfer-qty" max="${availableBacha}" min="0.01" value="${availableBacha}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; font-weight:bold; box-sizing:border-box;">
                            </div>
                            <div>
                                <label style="font-size:12px; font-weight:700; color:#374151;">Tarikh:</label><br>
                                <input type="date" id="bana-transfer-date" value="${today}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;">
                            </div>
                        </div>
                        <div style="margin-bottom:14px;">
                            <label style="font-size:12px; font-weight:700; color:#374151;">Note / Parchi No. (Optional):</label><br>
                            <input type="text" id="bana-transfer-note" placeholder="e.g. Mau unit ke liye raw material bheja" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;">
                        </div>
                        <button type="button" onclick="submitBanaTransferForm('${safeName}', '${currentKid}', ${availableBacha})" style="background:#059669; color:#ffffff; border:none; width:100%; padding:10px; border-radius:6px; font-weight:bold; font-size:14px; cursor:pointer;">
                            🚀 Bana Transfer Confirm Karein
                        </button>
                    </div>
                </div>
            </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    const closeBanaTransferModal = () => {
        const modal = document.getElementById('bana-transfer-popup-modal');
        if (modal) modal.remove();
    };

    const submitBanaTransferForm = (safeName, fromKid, maxAvailable) => {
        const itemName = decodeURIComponent(safeName);
        const toKid = document.getElementById('bana-dest-godam')?.value;
        const qty = safeNum(document.getElementById('bana-transfer-qty')?.value);
        const d = document.getElementById('bana-transfer-date')?.value || 
                 ((typeof window.getTodayDate === 'function') ? window.getTodayDate() : '');
        const note = String(document.getElementById('bana-transfer-note')?.value || '').trim();

        if (!toKid) return alert('Kripya Paane wala Godam chunein!');
        if (qty <= 0) return alert('Kripya sahi wazan (Kg) bharein!');
        if (qty > maxAvailable) return alert(`Aapke paas sirf ${maxAvailable.toFixed(2)} Kg bachi hai!`);

        let success = false;
        if (typeof window.transferBanaStock === 'function') {
            success = window.transferBanaStock(d, itemName, fromKid, toKid, qty, note);
        }

        if (success) {
            closeBanaTransferModal();
            renderBanaTable();
            alert(`✅ ${qty.toFixed(2)} Kg Bana safalta-poorvak transfer ho gaya!`);
        }
    };

    /* ========================================================================
       5. 📱 PAGINATED BANA PASSBOOK ENGINE (MOBILE NO-HANG)
       ------------------------------------------------------------------------
    ======================================================================== */
    const openBanaPassbook = (safeName) => {
        window.currentPassbookBanaItem = decodeURIComponent(safeName);
        passbookCurrentPage = 1;

        const modal = document.getElementById('item-modal');
        if (!modal) return;

        const title = document.getElementById('modal-item-title');
        if (title) title.textContent = `📖 Bana Passbook: ${window.currentPassbookBanaItem}`;

        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = `
                <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:12px; border-radius:10px; margin-bottom:12px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between;">
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                        <div><label style="font-size:12px; font-weight:700;">From Date:</label><br><input type="date" id="pass-from-date" onchange="applyPassbookFilters()"></div>
                        <div><label style="font-size:12px; font-weight:700;">To Date:</label><br><input type="date" id="pass-to-date" onchange="applyPassbookFilters()"></div>
                        <div style="align-self:flex-end;"><button type="button" class="quick-btn btn-out" onclick="resetPassbookFilters()">Reset</button></div>
                    </div>
                    <div style="flex:1; min-width:180px;">
                        <label style="font-size:12px; font-weight:700;">🔍 Search:</label><br>
                        <input type="text" id="pass-search-input" class="search-box" placeholder="Search Date, Kariger..." oninput="applyPassbookFilters()">
                    </div>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr style="background:#059669; color:white; font-size:12px;">
                                <th>TARIKH</th><th>DETAIL (TYPE)</th><th>KARIGER / SOURCE</th><th>AAYA (Kg)</th><th>GAYA (Kg)</th><th style="text-align:center;">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody id="passbook-table-body"></tbody>
                    </table>
                </div>
                <div id="passbook-pagination-controls" style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding:8px 4px; border-top:1px solid #e2e8f0;"></div>`;
        }

        modal.style.display = 'flex';
        applyPassbookFilters();
    };

    const resetPassbookFilters = () => {
        const fDate = document.getElementById('pass-from-date');
        const tDate = document.getElementById('pass-to-date');
        const sInp = document.getElementById('pass-search-input');
        if (fDate) fDate.value = '';
        if (tDate) tDate.value = '';
        if (sInp) sInp.value = '';
        passbookCurrentPage = 1;
        applyPassbookFilters();
    };

    const applyPassbookFilters = () => {
        const targetItemLower = window.currentPassbookBanaItem.toLowerCase();
        const allHist = window.safeArray ? window.safeArray(window.getStore('bana_history')) : [];

        let hist = allHist.filter((x) => {
            if (!x?.name) return false;
            if (x.name.toLowerCase() !== targetItemLower) return false;

            if (window.currentBanaKarkhanaFilter !== 'all') {
                const rowKid = x.karkhanaId || 'k_main';
                return String(rowKid) === String(window.currentBanaKarkhanaFilter);
            }
            return true;
        });

        const fDate = document.getElementById('pass-from-date')?.value || '';
        const tDate = document.getElementById('pass-to-date')?.value || '';
        const sTxt = (document.getElementById('pass-search-input')?.value || '').toLowerCase().trim();

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

        filteredPassbookCache = hist;
        renderPaginatedPassbook();
    };

    const renderPaginatedPassbook = () => {
        const tbody = document.getElementById('passbook-table-body');
        const pager = document.getElementById('passbook-pagination-controls');
        if (!tbody) return;
        tbody.innerHTML = '';

        const totalEntries = filteredPassbookCache.length;
        if (!totalEntries) {
            tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:15px; color:#888;'>Koi entry nahi mili.</td></tr>";
            if (pager) pager.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(totalEntries / PASSBOOK_PAGE_SIZE);
        if (passbookCurrentPage > totalPages) passbookCurrentPage = totalPages;
        if (passbookCurrentPage < 1) passbookCurrentPage = 1;

        const startIndex = (passbookCurrentPage - 1) * PASSBOOK_PAGE_SIZE;
        const pageRows = filteredPassbookCache.slice(startIndex, startIndex + PASSBOOK_PAGE_SIZE);

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
                        <button type="button" class="sheet-btn" style="background:#3b82f6; color:#ffffff; padding:4px 8px; font-size:11px; font-weight:bold; border-radius:4px; border:none; cursor:pointer;" onclick="openBanaEditModal('${esc(r.id)}')">✏️ Edit</button>
                        <button type="button" class="sheet-btn" style="background:#ef4444; color:#ffffff; padding:4px 8px; font-size:11px; font-weight:bold; border-radius:4px; border:none; cursor:pointer;" onclick="deleteBanaHistoryEntry('${esc(r.id)}')">🗑️ Del</button>
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
                    Showing <strong>${startIndex + 1}</strong> - <strong>${Math.min(startIndex + PASSBOOK_PAGE_SIZE, totalEntries)}</strong> of <strong>${totalEntries}</strong> entries
                </div>
                <div style="display:flex; gap:6px;">
                    <button type="button" class="sheet-btn" style="background:${passbookCurrentPage <= 1 ? '#cbd5e1' : '#059669'}; color:white; padding:4px 10px; border-radius:4px; border:none; cursor:${passbookCurrentPage <= 1 ? 'not-allowed' : 'pointer'};" ${passbookCurrentPage <= 1 ? 'disabled' : ''} onclick="changePassbookPage(-1)">◀ Prev</button>
                    <span style="font-size:12px; font-weight:bold; padding:4px 8px; background:#f1f5f9; border-radius:4px;">${passbookCurrentPage} / ${totalPages}</span>
                    <button type="button" class="sheet-btn" style="background:${passbookCurrentPage >= totalPages ? '#cbd5e1' : '#059669'}; color:white; padding:4px 10px; border-radius:4px; border:none; cursor:${passbookCurrentPage >= totalPages ? 'not-allowed' : 'pointer'};" ${passbookCurrentPage >= totalPages ? 'disabled' : ''} onclick="changePassbookPage(1)">Next ▶</button>
                </div>`;
        }
    };

    const changePassbookPage = (delta) => {
        passbookCurrentPage += delta;
        renderPaginatedPassbook();
    };

    /* ========================================================================
       6. DELETE & EDIT ENGINES
       ------------------------------------------------------------------------
    ======================================================================== */
    const deleteBanaHistoryEntry = (histId) => {
        if (!confirm('Kya aap sach me ye entry DELETE karna chahte hain?\nStock balance wapas sahi settle ho jayega.')) return;

        let hist = window.safeArray ? window.safeArray(window.getStore('bana_history')) : [];
        const entry = hist.find(x => x && String(x.id) === String(histId));
        if (!entry) return alert('Entry nahi mili!');

        const isTransfer = (entry.refId && String(entry.refId).includes('tr_bana')) || 
                           (entry.type && entry.type.toLowerCase().includes('transfer'));
        const isPurchase = !isTransfer && (entry.type && (entry.type.toLowerCase().includes('khareed') || entry.type.toLowerCase().includes('inward')));

        if (isTransfer && entry.refId) {
            hist = hist.filter(x => x.refId !== entry.refId);
            const transfers = (window.safeArray ? window.safeArray(window.getStore('material_transfers')) : []).filter(t => t.id !== entry.refId);
            if (typeof window.setStore === 'function') window.setStore('material_transfers', transfers);
        } else {
            hist = hist.filter(x => String(x.id) !== String(histId));
        }

        if (typeof window.setStore === 'function') window.setStore('bana_history', hist);

        if (isPurchase) {
            const qty = safeNum(entry.aaya || entry.qty);
            const list = window.safeArray ? window.safeArray(window.getStore('bana_stock')) : [];
            const targetKid = entry.karkhanaId || 'k_main';

            const item = list.find((x) => {
                const matchKid = (!x.karkhanaId && targetKid === 'k_main') || String(x.karkhanaId) === String(targetKid);
                return x?.name && x.name.toLowerCase() === entry.name.toLowerCase() && matchKid;
            });

            if (item) {
                item.aaya = Math.max(0, safeNum((safeNum(item.aaya) - qty).toFixed(2)));
                item.bacha = safeNum((safeNum(item.aaya) - safeNum(item.gaya)).toFixed(2));
                if (typeof window.setStore === 'function') window.setStore('bana_stock', list);
            }
        }

        applyPassbookFilters();
        renderBanaTable();
        if (typeof window.updateDashboardBadgeTotals === 'function') window.updateDashboardBadgeTotals();
        alert('🗑️ Entry safalta-poorvak delete ho gayi!');
    };

    const openBanaEditModal = (id) => {
        const hist = window.safeArray ? window.safeArray(window.getStore('bana_history')) : [];
        const entry = hist.find(x => x && String(x.id) === String(id));
        if (!entry) return alert('Entry nahi mili!');

        const existingModal = document.getElementById('bana-edit-popup-modal');
        if (existingModal) existingModal.remove();

        const currentQty = safeNum(entry.aaya || entry.gaya || entry.qty);
        const isAaya = safeNum(entry.aaya) > 0;
        const typeLabel = isAaya ? 'Aaya (Inward)' : 'Gaya (Outward)';

        const modalHtml = `
            <div id="bana-edit-popup-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:999999; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box;">
                <div style="background:#ffffff; width:100%; max-width:420px; border-radius:12px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.3); overflow:hidden;">
                    <div style="background:#059669; color:#ffffff; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="margin:0; font-size:16px;">✏️ Edit Bana Entry</h3>
                        <button type="button" onclick="closeBanaEditModal()" style="background:transparent; border:none; color:#ffffff; font-size:22px; cursor:pointer;">&times;</button>
                    </div>
                    <div style="padding:16px;">
                        <div style="background:#f1f5f9; padding:8px 12px; border-radius:6px; margin-bottom:12px; font-size:13px;">
                            <div><strong>Item:</strong> ${esc(entry.name)}</div>
                            <div><strong>Type:</strong> ${esc(entry.type || '-')}</div>
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="font-size:12px; font-weight:700; color:#374151;">Tarikh (Date):</label><br>
                            <input type="date" id="bana-edit-date" value="${entry.date || ''}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px; box-sizing:border-box;">
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="font-size:12px; font-weight:700; color:#374151;">Party / Source / Note:</label><br>
                            <input type="text" id="bana-edit-kariger" value="${esc(entry.kariger || '')}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; margin-top:4px; box-sizing:border-box;">
                        </div>
                        <div style="margin-bottom:16px;">
                            <label style="font-size:12px; font-weight:700; color:#374151;">Wazan (${typeLabel} Kg me):</label><br>
                            <input type="number" step="0.01" id="bana-edit-qty" value="${currentQty.toFixed(2)}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; font-weight:bold; margin-top:4px; box-sizing:border-box;">
                        </div>
                        <button type="button" onclick="saveBanaHistoryEdit('${esc(id)}')" style="background:#059669; color:#ffffff; border:none; width:100%; padding:10px; border-radius:6px; font-weight:bold; font-size:14px; cursor:pointer;">
                            💾 Badlaav Safe Karein
                        </button>
                    </div>
                </div>
            </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    const closeBanaEditModal = () => {
        const modal = document.getElementById('bana-edit-popup-modal');
        if (modal) modal.remove();
    };

    const saveBanaHistoryEdit = (id) => {
        const hist = window.safeArray ? window.safeArray(window.getStore('bana_history')) : [];
        const entry = hist.find(x => x && String(x.id) === String(id));
        if (!entry) return alert('Entry nahi mili!');

        const newDate = document.getElementById('bana-edit-date')?.value;
        const newKariger = String(document.getElementById('bana-edit-kariger')?.value || '').trim();
        const newQty = safeNum(document.getElementById('bana-edit-qty')?.value);

        if (newQty <= 0) return alert('Kripya sahi wazan (Kg) darj karein!');

        const oldAaya = safeNum(entry.aaya);
        const isTransfer = (entry.refId && String(entry.refId).includes('tr_bana')) || 
                           (entry.type && entry.type.toLowerCase().includes('transfer'));
        const isPurchase = !isTransfer && (entry.type && (entry.type.toLowerCase().includes('khareed') || entry.type.toLowerCase().includes('inward')));

        entry.date = newDate;
        entry.kariger = newKariger || 'Godown Purchase';

        if (oldAaya > 0) {
            const aayaDiff = newQty - oldAaya;
            entry.aaya = newQty;

            if (isPurchase) {
                const list = window.safeArray ? window.safeArray(window.getStore('bana_stock')) : [];
                const targetKid = entry.karkhanaId || 'k_main';

                const item = list.find((x) => {
                    const matchKid = (!x.karkhanaId && targetKid === 'k_main') || String(x.karkhanaId) === String(targetKid);
                    return x?.name && x.name.toLowerCase() === entry.name.toLowerCase() && matchKid;
                });

                if (item) {
                    item.aaya = safeNum((safeNum(item.aaya) + aayaDiff).toFixed(2));
                    item.bacha = safeNum((safeNum(item.aaya) - safeNum(item.gaya)).toFixed(2));
                    if (typeof window.setStore === 'function') window.setStore('bana_stock', list);
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

        if (typeof window.setStore === 'function') window.setStore('bana_history', hist);

        closeBanaEditModal();
        applyPassbookFilters();
        renderBanaTable();

        if (typeof window.updateDashboardBadgeTotals === 'function') window.updateDashboardBadgeTotals();
        alert('✅ Bana entry safalta-poorvak update ho gayi!');
    };

    /* ========================================================================
       7. GLOBAL EXPORTS
       ------------------------------------------------------------------------
    ======================================================================== */
    const banaUIAPI = {
        openBanaModule,
        renderBanaKarkhanaTabs,
        switchBanaKarkhanaTab,
        toggleBanaForm,
        toggleBanaItemType,
        populateBanaExistingDropdown,
        saveNewBana,
        filterBana,
        renderBanaTable,
        openBanaTransferModal,
        closeBanaTransferModal,
        submitBanaTransferForm,
        openBanaPassbook,
        resetPassbookFilters,
        applyPassbookFilters,
        changePassbookPage,
        deleteBanaHistoryEntry,
        openBanaEditModal,
        closeBanaEditModal,
        saveBanaHistoryEdit
    };

    Object.keys(banaUIAPI).forEach((fn) => { window[fn] = banaUIAPI[fn]; });
    window.BanaUIEngine = banaUIAPI;
})();
