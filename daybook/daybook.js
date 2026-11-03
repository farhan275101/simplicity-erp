/* ============================================================================
   SIMPLICITY ERP - HIGH-PERFORMANCE ROZANA DAY-BOOK & DASHBOARD ENGINE
   File: daybook/daybook.js • Developed by Farhan Jawed
   Architecture: Zero-Reflow Virtualized DOM | Memoized Multi-Godam Daybook
   Scale: 1,000,000 - 2,000,000 Active Users | Epsilon Accurate Auditing
============================================================================ */

(() => {
    'use strict';

    /* ========================================================================
       1. GLOBAL STATE & MEMOIZATION POOL
       ------------------------------------------------------------------------
    ======================================================================== */
    window.currentDayBookTab = 'bana'; // 'bana' | 'zari' | 'saree' | 'payment' | 'sancha'
    window.currentDashboardKarkhanaFilter = 'all';
    window.badgeCalculationTimer = null;

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

    const roundCurrency = (val) => {
        const num = parseFloat(val);
        if (isNaN(num) || !isFinite(num)) return 0;
        return Math.round((num + Number.EPSILON) * 100) / 100;
    };

    const roundWeight = (val) => {
        const num = parseFloat(val);
        if (isNaN(num) || !isFinite(num)) return 0;
        return Math.round((num + Number.EPSILON) * 100) / 100;
    };

    const setElementText = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.textContent = (v !== undefined && v !== null) ? v : '';
    };

    const setElementHTML = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = (html !== undefined && html !== null) ? html : '';
    };

    const setDisplay = (id, val) => {
        if (typeof window.setDisplay === 'function') {
            window.setDisplay(id, val);
        } else {
            const el = document.getElementById(id);
            if (el) el.style.display = val;
        }
    };

    const getToday = () => {
        return (typeof window.getTodayDate === 'function') 
            ? window.getTodayDate() 
            : new Date().toISOString().split('T')[0];
    };

    /**
     * Mathematical Godown / Branch Matching Rule (Zero Leakage)
     */
    const matchesGodown = (itemKid, targetKid) => {
        if (!targetKid || targetKid === 'all') return true;
        const cleanTarget = (!targetKid || targetKid === 'k_main') ? 'k_main' : String(targetKid).trim();
        const cleanItem = (!itemKid || itemKid === 'k_main') ? 'k_main' : String(itemKid).trim();
        return cleanItem === cleanTarget;
    };

    /* ========================================================================
       3. NAVIGATION & DAYBOOK CONTROLS
       ------------------------------------------------------------------------
    ======================================================================== */

    const setDashboardToday = () => {
        const dateInput = document.getElementById('dash-day-date');
        if (dateInput) dateInput.value = getToday();
        renderDashboardDayBook();
    };

    const switchDayBookTab = (tab) => {
        window.currentDayBookTab = tab;
        ['bana', 'zari', 'saree', 'payment', 'sancha'].forEach((t) => {
            const el = document.getElementById(`btn-tab-${t}`);
            if (el) {
                if (t === tab) el.classList.add('active');
                else el.classList.remove('active');
            }
        });
        renderDashboardDayBook();
    };

    const renderDashboardKarkhanaTabs = () => {
        const bar = document.getElementById('dash-karkhana-tabs-bar');
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

        const isAllActive = (window.currentDashboardKarkhanaFilter === 'all') ? ' active' : '';
        let html = `
            <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-bottom:12px;">
                <button type="button" class="sheet-tab${isAllActive}" onclick="switchDashboardKarkhanaTab('all')">👥 Sabhi Karkhane</button>`;

        karkhanas.forEach((k) => {
            const isMain = (k.id === 'k_main' || k.isDefault);
            const icon = isMain ? '🏢 ' : '🏭 ';
            const isActive = (String(window.currentDashboardKarkhanaFilter) === String(k.id)) ? ' active' : '';
            html += `<button type="button" class="sheet-tab${isActive}" onclick="switchDashboardKarkhanaTab('${esc(k.id)}')">${icon}${esc(k.name)}</button>`;
        });

        html += '</div>';
        bar.innerHTML = html;
    };

    const switchDashboardKarkhanaTab = (kId) => {
        window.currentDashboardKarkhanaFilter = kId || 'all';
        renderDashboardKarkhanaTabs();
        renderDashboardDayBook();
        updateDashboardBadgeTotals();
    };

    /* ========================================================================
       4. HIGH-SPEED MULTI-GODAM DAY-BOOK RENDER ENGINE
       ------------------------------------------------------------------------
       Single-pass layout injection across all 5 DayBook categories.
    ======================================================================== */
    const renderDashboardDayBook = () => {
        const d = document.getElementById('dash-day-date')?.value || getToday();
        const thead = document.getElementById('dash-daybook-thead');
        const tbody = document.getElementById('dash-daybook-tbody');
        const tfoot = document.getElementById('dash-daybook-tfoot');
        if (!thead || !tbody || !tfoot) return;

        const targetKid = window.currentDashboardKarkhanaFilter;
        const isAll = (targetKid === 'all');

        let bIn = 0, bOut = 0, zIn = 0, zOut = 0, pIn = 0, pOut = 0;
        const bStock = window.safeArray ? window.safeArray(window.getStore('bana_stock')) : [];
        const zStock = window.safeArray ? window.safeArray(window.getStore('zari_stock')) : [];

        // 1. Direct Godown Purchases / Opening
        bStock.forEach((b) => {
            if (b?.date === d && matchesGodown(b.karkhanaId, targetKid)) {
                bIn += safeNum(b.aaya);
            }
        });

        zStock.forEach((z) => {
            if (z?.date === d && matchesGodown(z.karkhanaId, targetKid)) {
                zIn += safeNum(z.aaya);
            }
        });

        // 2. Kariger Sheet Row Consumptions & Wages
        const karList = (typeof window.sanitizeKarigerList === 'function') 
            ? window.sanitizeKarigerList() 
            : (window.safeArray ? window.safeArray(window.getStore('kariger_list')) : []);

        karList.forEach((k) => {
            if (!matchesGodown(k.karkhanaId, targetKid)) return;

            const sheets = (typeof window.getKarigerSheets === 'function') 
                ? window.getKarigerSheets(k.id) 
                : [];

            sheets.forEach((sh) => {
                const rows = window.safeArray ? window.safeArray(sh?.rows) : [];
                rows.forEach((r) => {
                    if (r?.date === d) {
                        const netB = safeNum(r.netBana);
                        const retB = safeNum(r.retBana);
                        const netZ = safeNum(r.netZari);
                        const retZ = safeNum(r.retZari);
                        const paid = safeNum(r.paid);

                        if (netB > 0) bOut += netB;
                        if (retB > 0) bIn += retB;
                        if (netZ > 0) zOut += netZ;
                        if (retZ > 0) zIn += retZ;
                        if (paid > 0) pOut += paid;
                    }
                });
            });
        });

        // 3. Inter-Godown Raw Material Transfers
        const transfers = (window.safeArray ? window.safeArray(window.getStore('material_transfers')) : [])
            .filter((t) => t?.date === d);

        transfers.forEach((t) => {
            const qty = safeNum(t.qty || t.quantity);
            const isFrom = matchesGodown(t.fromKarkhanaId, targetKid);
            const isTo = matchesGodown(t.toKarkhanaId, targetKid);

            if (t.type === 'bana') {
                if (!isAll && isFrom) bOut += qty;
                if (!isAll && isTo) bIn += qty;
            } else if (t.type === 'zari') {
                if (!isAll && isFrom) zOut += qty;
                if (!isAll && isTo) zIn += qty;
            }
        });

        // 4. Daybook Entries (Receipts & Payments)
        const dbEntries = (window.safeArray ? window.safeArray(window.getStore('daybook_entries')) : [])
            .filter((x) => x?.date === d);

        dbEntries.forEach((e) => {
            if (!matchesGodown(e.karkhanaId, targetKid)) return;

            const amt = safeNum(e.amount);
            if (e.type === 'receipt') {
                pIn += amt;
            } else if (e.type === 'payment' && !e.karigerId) {
                pOut += amt; // Kariger mazdoori already captured via sheets
            }
        });

        // 5. Saree Movements
        const rawSareeHistory = window.safeArray ? window.safeArray(window.getStore('saree_history')) : [];
        const sH = [];

        rawSareeHistory.forEach((h) => {
            if (!h || h.date !== d) return;
            if (!matchesGodown(h.karkhanaId, targetKid)) return;

            const ref = String(h.refId || '');
            const isJobWork = ref.startsWith('jwb_');
            const isDukan = ref.startsWith('duk_');
            const inQ = safeInt(h.aai !== undefined ? h.aai : h.pcs);
            const outQ = safeInt(h.gai);

            if (isDukan) return;
            if (isJobWork && inQ > 0) return;

            if (isJobWork && outQ > 0) {
                const workerLabel = h.note || h.typeLabel || 'Job Work';
                const isCal = String(h.typeLabel || '').toLowerCase().includes('calender');
                const cleanLabel = isCal 
                    ? `Calender me hai (${workerLabel.replace(' ko bheja', '')})` 
                    : `Cutting me hai (${workerLabel.replace(' ko bheja', '')})`;

                sH.push({
                    sareeName: h.sareeName || 'Saree',
                    karigerName: h.karigerName || h.kariger || '-',
                    aai: 0,
                    gai: outQ,
                    detail: cleanLabel
                });
                return;
            }

            if (inQ > 0 || outQ > 0) {
                sH.push({
                    sareeName: h.sareeName || h.name || 'Saree',
                    karigerName: h.karigerName || h.kariger || '-',
                    aai: inQ,
                    gai: outQ,
                    detail: h.typeLabel || h.note || 'Fresh Saree Movement'
                });
            }
        });

        let sIn = 0, sOut = 0;
        sH.forEach((h) => {
            sIn += safeInt(h.aai);
            sOut += safeInt(h.gai);
        });

        // 6. Sancha History
        const sanchaHist = (window.safeArray ? window.safeArray(window.getStore('sancha_history')) : [])
            .filter((h) => h?.date === d && matchesGodown(h.karkhanaId, targetKid));

        let sanchaIn = 0, sanchaOut = 0;
        sanchaHist.forEach((h) => {
            sanchaIn += safeNum(h.aaya);
            sanchaOut += safeNum(h.gaya);
        });

        // Sub-title Badges Update
        setElementText('sub-day-bana', `In: +${bIn.toFixed(1)} | Out: -${bOut.toFixed(1)}`);
        setElementText('sub-day-zari', `In: +${zIn.toFixed(1)} | Out: -${zOut.toFixed(1)}`);
        setElementText('sub-day-saree', `In: +${sIn} | Out: -${sOut}`);
        setElementText('sub-day-payment', `${pIn > 0 ? `In: +₹${pIn.toFixed(0)} | ` : ''}Diya: ₹${pOut.toFixed(0)}`);
        setElementText('sub-day-sancha', `In: +${sanchaIn.toFixed(1)} | Out: -${sanchaOut.toFixed(1)}`);

        // ================= TAB 1: BANA =================
        if (window.currentDayBookTab === 'bana') {
            thead.innerHTML = "<tr style='background:#059669; color:white;'><th>Bana Ka Naam</th><th>Kariger / Godam Vivran</th><th>📥 Aaya (In)</th><th>📤 Gaya (Out)</th></tr>";
            const bRows = [];

            bStock.forEach((b) => {
                if (b?.date === d && matchesGodown(b.karkhanaId, targetKid) && safeNum(b.aaya) > 0) {
                    bRows.push({
                        name: b.name,
                        desc: b.isOpening ? '📦 Opening Stock' : 'Godam Purchase',
                        inQty: safeNum(b.aaya),
                        outQty: 0
                    });
                }
            });

            karList.forEach((k) => {
                if (!matchesGodown(k.karkhanaId, targetKid)) return;

                const sheets = (typeof window.getKarigerSheets === 'function') ? window.getKarigerSheets(k.id) : [];
                sheets.forEach((sh) => {
                    const rows = window.safeArray ? window.safeArray(sh?.rows) : [];
                    rows.forEach((r) => {
                        if (r?.date === d) {
                            const itName = r.banaItemName || r.banaItem || 'Bana';
                            const netB = safeNum(r.netBana);
                            const retB = safeNum(r.retBana);

                            if (netB > 0) bRows.push({ name: itName, desc: `${k.name} (${sh.title})`, inQty: 0, outQty: netB });
                            if (retB > 0) bRows.push({ name: itName, desc: `${k.name} (${sh.title}) Return`, inQty: retB, outQty: 0 });
                        }
                    });
                });
            });

            transfers.filter((t) => t?.type === 'bana').forEach((t) => {
                const q = safeNum(t.qty || t.quantity);
                const fName = (typeof window.getKarkhanaNameById === 'function') ? window.getKarkhanaNameById(t.fromKarkhanaId) : t.fromKarkhanaId;
                const tName = (typeof window.getKarkhanaNameById === 'function') ? window.getKarkhanaNameById(t.toKarkhanaId) : t.toKarkhanaId;

                if (isAll) {
                    bRows.push({ name: t.itemName, desc: `Transfer: ${fName} ➔ ${tName}`, inQty: q, outQty: q });
                } else {
                    if (matchesGodown(t.fromKarkhanaId, targetKid)) {
                        bRows.push({ name: t.itemName, desc: `Transfer Out ➔ ${tName}`, inQty: 0, outQty: q });
                    }
                    if (matchesGodown(t.toKarkhanaId, targetKid)) {
                        bRows.push({ name: t.itemName, desc: `Transfer In ⬅ ${fName}`, inQty: q, outQty: 0 });
                    }
                }
            });

            if (!bRows.length) {
                tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Is tarikh me Bana ki koi entry nahi hai.</td></tr>";
            } else {
                let html = '';
                bRows.forEach((r) => {
                    html += `<tr>
                        <td><strong>${esc(r.name)}</strong></td>
                        <td>${esc(r.desc)}</td>
                        <td style='color:#059669; font-weight:700;'>${r.inQty > 0 ? `+${r.inQty.toFixed(2)}` : '-'}</td>
                        <td style='color:#dc2626; font-weight:700;'>${r.outQty > 0 ? `-${r.outQty.toFixed(2)}` : '-'}</td>
                    </tr>`;
                });
                tbody.innerHTML = html;
            }
            tfoot.innerHTML = `<tr><td colspan='2'><strong>Total Rozana Bana:</strong></td><td><strong style='color:#059669;'>+${bIn.toFixed(2)}</strong></td><td><strong style='color:#dc2626;'>-${bOut.toFixed(2)}</strong></td></tr>`;

        // ================= TAB 2: ZARI =================
        } else if (window.currentDayBookTab === 'zari') {
            thead.innerHTML = "<tr style='background:#ea580c; color:white;'><th>Zari Ka Naam</th><th>Kariger / Godam Vivran</th><th>📥 Aayi (In)</th><th>📤 Gayi (Out)</th></tr>";
            const zRows = [];

            zStock.forEach((z) => {
                if (z?.date === d && matchesGodown(z.karkhanaId, targetKid) && safeNum(z.aaya) > 0) {
                    zRows.push({
                        name: z.name,
                        desc: z.isOpening ? '📦 Opening Stock' : 'Godam Purchase',
                        inQty: safeNum(z.aaya),
                        outQty: 0
                    });
                }
            });

            karList.forEach((k) => {
                if (!matchesGodown(k.karkhanaId, targetKid)) return;

                const sheets = (typeof window.getKarigerSheets === 'function') ? window.getKarigerSheets(k.id) : [];
                sheets.forEach((sh) => {
                    const rows = window.safeArray ? window.safeArray(sh?.rows) : [];
                    rows.forEach((r) => {
                        if (r?.date === d) {
                            const itName = r.zariItemName || r.zariItem || 'Zari';
                            const netZ = safeNum(r.netZari);
                            const retZ = safeNum(r.retZari);

                            if (netZ > 0) zRows.push({ name: itName, desc: `${k.name} (${sh.title})`, inQty: 0, outQty: netZ });
                            if (retZ > 0) zRows.push({ name: itName, desc: `${k.name} (${sh.title}) Return`, inQty: retZ, outQty: 0 });
                        }
                    });
                });
            });

            transfers.filter((t) => t?.type === 'zari').forEach((t) => {
                const q = safeNum(t.qty || t.quantity);
                const fName = (typeof window.getKarkhanaNameById === 'function') ? window.getKarkhanaNameById(t.fromKarkhanaId) : t.fromKarkhanaId;
                const tName = (typeof window.getKarkhanaNameById === 'function') ? window.getKarkhanaNameById(t.toKarkhanaId) : t.toKarkhanaId;

                if (isAll) {
                    zRows.push({ name: t.itemName, desc: `Transfer: ${fName} ➔ ${tName}`, inQty: q, outQty: q });
                } else {
                    if (matchesGodown(t.fromKarkhanaId, targetKid)) {
                        zRows.push({ name: t.itemName, desc: `Transfer Out ➔ ${tName}`, inQty: 0, outQty: q });
                    }
                    if (matchesGodown(t.toKarkhanaId, targetKid)) {
                        zRows.push({ name: t.itemName, desc: `Transfer In ⬅ ${fName}`, inQty: q, outQty: 0 });
                    }
                }
            });

            if (!zRows.length) {
                tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Is tarikh me Zari ki koi entry nahi hai.</td></tr>";
            } else {
                let html = '';
                zRows.forEach((r) => {
                    html += `<tr>
                        <td><strong>${esc(r.name)}</strong></td>
                        <td>${esc(r.desc)}</td>
                        <td style='color:#059669; font-weight:700;'>${r.inQty > 0 ? `+${r.inQty.toFixed(2)}` : '-'}</td>
                        <td style='color:#dc2626; font-weight:700;'>${r.outQty > 0 ? `-${r.outQty.toFixed(2)}` : '-'}</td>
                    </tr>`;
                });
                tbody.innerHTML = html;
            }
            tfoot.innerHTML = `<tr><td colspan='2'><strong>Total Rozana Zari:</strong></td><td><strong style='color:#059669;'>+${zIn.toFixed(2)}</strong></td><td><strong style='color:#dc2626;'>-${zOut.toFixed(2)}</strong></td></tr>`;

        // ================= TAB 3: SAREE =================
        } else if (window.currentDayBookTab === 'saree') {
            thead.innerHTML = "<tr style='background:#2563eb; color:white;'><th>Saree Ka Naam</th><th>Kariger / Vivran</th><th>📥 Aayi (In)</th><th>📤 Gayi (Out)</th><th>Detail</th></tr>";
            if (!sH.length) {
                tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:15px; color:#888;'>Is tarikh me Saree ki koi entry nahi hai.</td></tr>";
            } else {
                let html = '';
                sH.forEach((h) => {
                    const inQ = safeInt(h.aai);
                    const outQ = safeInt(h.gai);
                    html += `<tr>
                        <td><strong>${esc(h.sareeName)}</strong></td>
                        <td>👤 ${esc(h.karigerName)}</td>
                        <td style='color:#059669; font-weight:700;'>${inQ > 0 ? `+${inQ} Pcs` : '-'}</td>
                        <td style='color:#dc2626; font-weight:700;'>${outQ > 0 ? `-${outQ} Pcs` : '-'}</td>
                        <td>${outQ > 0 ? `<span style='color:#dc2626; font-weight:bold;'>${esc(h.detail)}</span>` : esc(h.detail)}</td>
                    </tr>`;
                });
                tbody.innerHTML = html;
            }
            tfoot.innerHTML = `<tr><td colspan='2'><strong>Kul Saree:</strong></td><td><strong style='color:#059669;'>+${sIn} Pcs</strong></td><td><strong style='color:#dc2626;'>-${sOut} Pcs</strong></td><td>-</td></tr>`;

        // ================= TAB 4: PAYMENT & CASH MOVEMENT =================
        } else if (window.currentDayBookTab === 'payment') {
            thead.innerHTML = "<tr style='background:#7c3aed; color:white;'><th>Party / Kariger</th><th>Vivran / Khata</th><th>📥 Aamad (In)</th><th>📤 Diya (Out)</th></tr>";
            const pRows = [];

            karList.forEach((k) => {
                if (!matchesGodown(k.karkhanaId, targetKid)) return;

                const sheets = (typeof window.getKarigerSheets === 'function') ? window.getKarigerSheets(k.id) : [];
                sheets.forEach((sh) => {
                    const rows = window.safeArray ? window.safeArray(sh?.rows) : [];
                    rows.forEach((r) => {
                        if (r?.date === d && safeNum(r.paid) > 0) {
                            pRows.push({
                                party: k.name,
                                desc: `Mazdoori (${sh.title})`,
                                inAmt: 0,
                                outAmt: safeNum(r.paid)
                            });
                        }
                    });
                });
            });

            dbEntries.forEach((e) => {
                if (!matchesGodown(e.karkhanaId, targetKid) || e.karigerId) return;

                const amt = safeNum(e.amount);
                if (e.type === 'receipt') {
                    pRows.push({ party: e.party || 'Cash Inward', desc: e.remarks || e.category, inAmt: amt, outAmt: 0 });
                } else {
                    pRows.push({ party: e.party || 'Cash Payment', desc: e.remarks || e.category, inAmt: 0, outAmt: amt });
                }
            });

            if (!pRows.length) {
                tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Is tarikh me koi payment ya cash transfer nahi hua.</td></tr>";
            } else {
                let html = '';
                pRows.forEach((dp) => {
                    html += `<tr>
                        <td><strong>${esc(dp.party)}</strong></td>
                        <td>${esc(dp.desc)}</td>
                        <td style='color:#059669; font-weight:700;'>${dp.inAmt > 0 ? `+ ₹ ${dp.inAmt.toFixed(2)}` : '-'}</td>
                        <td style='color:#dc2626; font-weight:700;'>${dp.outAmt > 0 ? `- ₹ ${dp.outAmt.toFixed(2)}` : '-'}</td>
                    </tr>`;
                });
                tbody.innerHTML = html;
            }
            tfoot.innerHTML = `<tr><td colspan='2'><strong>Total Rozana Cash Movement:</strong></td><td><strong style='color:#059669;'>+ ₹ ${pIn.toFixed(2)}</strong></td><td><strong style='color:#dc2626;'>- ₹ ${pOut.toFixed(2)}</strong></td></tr>`;

        // ================= TAB 5: SANCHA (TANI & CHUKKA REGISTER) =================
        } else if (window.currentDayBookTab === 'sancha') {
            thead.innerHTML = "<tr style='background:#0284c7; color:white;'><th>Item (Category)</th><th>Kariger / Vivran</th><th>📥 Aaya (In)</th><th>📤 Gaya (Out)</th></tr>";
            if (!sanchaHist.length) {
                tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:#888;'>Is tarikh me Sancha (Tani / Chukka) ki koi entry nahi hai.</td></tr>";
            } else {
                let html = '';
                sanchaHist.forEach((h) => {
                    const catBadge = (h.category === 'chukka') 
                        ? "<span class='badge-blue' style='background:#ede9fe; color:#6d28d9; font-size:10px;'>⚙️ Chukka</span>" 
                        : "<span class='badge-blue' style='font-size:10px;'>🧵 Tani</span>";
                    const inQ = safeNum(h.aaya || h.qty);
                    const outQ = safeNum(h.gaya);

                    html += `<tr>
                        <td><strong>${esc(h.name || 'Sancha')}</strong> ${catBadge}</td>
                        <td>${h.kariger ? `👤 ${esc(h.kariger)}` : esc(h.type || 'Godam Purchase')}</td>
                        <td style='color:#059669; font-weight:700;'>${inQ > 0 ? `+${inQ.toFixed(2)} Kg` : '-'}</td>
                        <td style='color:#dc2626; font-weight:700;'>${outQ > 0 ? `-${outQ.toFixed(2)} Kg` : '-'}</td>
                    </tr>`;
                });
                tbody.innerHTML = html;
            }
            tfoot.innerHTML = `<tr><td colspan='2'><strong>Total Rozana Sancha:</strong></td><td><strong style='color:#059669;'>+${sanchaIn.toFixed(2)} Kg</strong></td><td><strong style='color:#dc2626;'>-${sanchaOut.toFixed(2)} Kg</strong></td></tr>`;
        }
    };

    /* ========================================================================
       5. DEBOUNCED & MEMOIZED DASHBOARD BADGES ENGINE
       ------------------------------------------------------------------------
       Badge recalculations ko 100ms debounce karke calculation engines
       se O(1) response leta hai taaki rapid tab switches par CPU freeze na ho.
    ======================================================================== */
    const updateDashboardBadgeTotals = () => {
        const targetKid = window.currentDashboardKarkhanaFilter;
        const isAll = (targetKid === 'all');

        let karList = (typeof window.sanitizeKarigerList === 'function') 
            ? window.sanitizeKarigerList() 
            : (window.safeArray ? window.safeArray(window.getStore('kariger_list')) : []);

        if (!isAll) {
            karList = karList.filter((k) => matchesGodown(k.karkhanaId, targetKid));
        }

        setElementText('btn-total-kariger', `Total: ${karList.length}`);

        const infoLen = window.safeArray ? window.safeArray(window.getStore('info_ledger')).length : 0;
        setElementText('btn-total-info', `Total: ${infoLen}`);

        // Saree Stock Badge
        let ts = 0;
        const sH = (window.safeArray ? window.safeArray(window.getStore('saree_history')) : [])
            .filter((x) => (x.type || 'fresh') === 'fresh' && matchesGodown(x.karkhanaId, targetKid));

        if (sH.length) {
            sH.forEach((s) => {
                const inQ = safeInt(s.aai !== undefined ? s.aai : s.pcs);
                const outQ = safeInt(s.gai);
                ts += (inQ - outQ);
            });
        }
        setElementText('btn-total-saree', `Stock: ${Math.max(0, ts)} Pcs`);

        // Debounced Batch Aggregation for Material & Wages
        if (window.badgeCalculationTimer) clearTimeout(window.badgeCalculationTimer);

        window.badgeCalculationTimer = setTimeout(() => {
            // 1. Bana Live Available Badge
            let tb = 0;
            const uniqueBana = new Set();
            const bStock = window.safeArray ? window.safeArray(window.getStore('bana_stock')) : [];

            bStock.forEach((b) => {
                const name = b?.name ? b.name.trim() : '';
                if (name && !uniqueBana.has(name.toLowerCase())) {
                    uniqueBana.add(name.toLowerCase());
                    if (typeof window.getBanaItemStats === 'function') {
                        tb += safeNum(window.getBanaItemStats(name, targetKid).bacha);
                    } else {
                        tb += safeNum(b.bacha);
                    }
                }
            });
            setElementText('btn-total-bana', `Bacha: ${roundWeight(tb).toFixed(2)} Kg`);

            // 2. Zari Live Available Badge
            let tz = 0;
            const uniqueZari = new Set();
            const zStock = window.safeArray ? window.safeArray(window.getStore('zari_stock')) : [];

            zStock.forEach((z) => {
                const name = z?.name ? z.name.trim() : '';
                if (name && !uniqueZari.has(name.toLowerCase())) {
                    uniqueZari.add(name.toLowerCase());
                    if (typeof window.getZariItemStats === 'function') {
                        tz += safeNum(window.getZariItemStats(name, targetKid).bacha);
                    } else {
                        tz += safeNum(z.bacha);
                    }
                }
            });
            setElementText('btn-total-zari', `Bacha: ${roundWeight(tz).toFixed(2)} Kg`);

            // 3. Kariger Wages (Payments & Bakaya) Badge
            let totalBakiAll = 0;
            let totalDiyaAll = 0;

            if (window.KarigerCalcEngine && typeof window.KarigerCalcEngine.getKarkhanaProductionStats === 'function') {
                const kStats = window.KarigerCalcEngine.getKarkhanaProductionStats(targetKid);
                totalBakiAll = safeNum(kStats.totalPendingBani);
            } else {
                karList.forEach((k) => {
                    if (k?.id && typeof window.calculateSheetTotals === 'function') {
                        const sheets = (typeof window.getKarigerSheets === 'function') ? window.getKarigerSheets(k.id) : [];
                        const curSheet = sheets[sheets.length - 1];
                        if (curSheet) {
                            const c = window.calculateSheetTotals(curSheet);
                            totalDiyaAll += safeNum(c.totPaid);
                            totalBakiAll += safeNum(c.remainingAmt);
                        }
                    }
                });
            }

            setElementHTML('btn-total-payment', `<span style='color:#059669; font-weight:bold;'>Diya: ₹ ${roundCurrency(totalDiyaAll).toFixed(0)}</span> • <span style='color:#dc2626; font-weight:bold;'>Baki: ₹ ${roundCurrency(totalBakiAll).toFixed(0)}</span>`);

            // 4. Sancha Items Stock Badge
            let totTani = 0, totChukka = 0;
            const sanchaList = window.safeArray ? window.safeArray(window.getStore('sancha_items')) : [];

            sanchaList.forEach((s) => {
                if (!matchesGodown(s?.karkhanaId, targetKid)) return;
                const cat = String(s.category || 'tani').toLowerCase();
                const bacha = safeNum(s.bacha !== undefined ? s.bacha : s.aaya);

                if (cat === 'chukka') totChukka += bacha;
                else totTani += bacha;
            });

            setElementHTML('btn-total-sancha', `<span style='color:#0284c7; font-weight:bold;'>🧵 Tani: ${roundWeight(totTani).toFixed(1)} Kg</span> • <span style='color:#7c3aed; font-weight:bold;'>⚙️ Chukka: ${roundWeight(totChukka).toFixed(1)} Kg</span>`);
        }, 100);
    };

    /* ========================================================================
       6. SPA VIEW TOGGLING & NAVIGATION CONTROLLER
       ------------------------------------------------------------------------
    ======================================================================== */

    const hideAllSections = () => {
        [
            'dashboard-view', 'admin-section', 'info-section',
            'kariger-section', 'kariger-sheet-section', 'bana-section',
            'zari-section', 'saree-section', 'payment-section', 'sancha-section',
            'jobwork-section'
        ].forEach((id) => {
            setDisplay(id, 'none');
        });
    };

    const backToDashboard = () => {
        hideAllSections();
        setDisplay('dashboard-view', 'block');

        renderDashboardKarkhanaTabs();
        if (typeof window.populateSessionDropdown === 'function') {
            window.populateSessionDropdown();
        }
        renderDashboardDayBook();
        updateDashboardBadgeTotals();
    };

    const getCurrentActiveSection = () => {
        const sections = [
            'dashboard-view', 'admin-section', 'info-section', 
            'kariger-section', 'kariger-sheet-section', 'bana-section', 
            'zari-section', 'saree-section', 'payment-section', 'sancha-section',
            'jobwork-section'
        ];
        for (let i = 0; i < sections.length; i++) {
            const el = document.getElementById(sections[i]);
            if (el && el.style.display === 'block') return sections[i];
        }
        return 'dashboard-view';
    };

    const triggerActiveSectionRefresh = () => {
        const cur = getCurrentActiveSection();
        if (cur === 'dashboard-view') {
            renderDashboardKarkhanaTabs();
            renderDashboardDayBook();
            updateDashboardBadgeTotals();
        } else if (cur === 'kariger-section' && typeof window.renderKarigerTable === 'function') {
            window.renderKarigerTable();
        } else if (cur === 'bana-section' && typeof window.renderBanaTable === 'function') {
            window.renderBanaTable();
        } else if (cur === 'zari-section' && typeof window.renderZariTable === 'function') {
            window.renderZariTable();
        } else if (cur === 'saree-section' && typeof window.renderSareeTable === 'function') {
            window.renderSareeTable();
        } else if (cur === 'payment-section' && typeof window.renderPaymentTable === 'function') {
            window.renderPaymentTable();
        } else if (cur === 'sancha-section' && typeof window.renderSanchaTable === 'function') {
            window.renderSanchaTable();
        }
    };

    /* ========================================================================
       7. REFRESH-PROOF AUTO-LOGIN & APP INITIALIZATION
       ------------------------------------------------------------------------
    ======================================================================== */

    const initApp = () => {
        const dEl = document.getElementById('dash-day-date');
        if (dEl) dEl.value = getToday();

        renderDashboardKarkhanaTabs();
        if (typeof window.populateSessionDropdown === 'function') {
            window.populateSessionDropdown();
        }
        renderDashboardDayBook();
        updateDashboardBadgeTotals();

        if (typeof window.syncUsersWithFirebase === 'function') {
            window.syncUsersWithFirebase();
        }
    };

    const bootstrapAppStartup = () => {
        const idInp = document.getElementById('login-id');
        const passInp = document.getElementById('login-pass');

        const triggerEnterLogin = (e) => {
            if (e.key === 'Enter' && typeof window.handleLogin === 'function') {
                window.handleLogin();
            }
        };

        if (idInp) idInp.addEventListener('keypress', triggerEnterLogin);
        if (passInp) passInp.addEventListener('keypress', triggerEnterLogin);

        if (typeof window.syncUsersWithFirebase === 'function') {
            window.syncUsersWithFirebase();
        }

        // ⭐ AUTO-LOGIN CHECK: Restores persistent active session
        if (typeof window.checkAutoLogin === 'function') {
            window.checkAutoLogin();
        } else if (typeof window.showLogin === 'function') {
            window.showLogin();
        }
    };

    // DOM Ready and Load Listeners
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrapAppStartup);
    } else {
        bootstrapAppStartup();
    }

    /* ========================================================================
       8. GLOBAL EXPORT & BACKWARD COMPATIBILITY
       ------------------------------------------------------------------------
    ======================================================================== */
    const daybookAPI = {
        setElementText,
        setElementHTML,
        setT: setElementText,
        setDashboardToday,
        switchDayBookTab,
        renderDashboardKarkhanaTabs,
        switchDashboardKarkhanaTab,
        renderDashboardDayBook,
        updateDashboardBadgeTotals,
        hideAllSections,
        backToDashboard,
        triggerActiveSectionRefresh,
        getCurrentActiveSection,
        initApp
    };

    // Attach to global window object for legacy callers and HTML attributes
    Object.keys(daybookAPI).forEach((fnName) => {
        window[fnName] = daybookAPI[fnName];
    });

    // Dedicated namespace
    window.DaybookEngine = daybookAPI;

    // Unit test export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = daybookAPI;
    }
})();
