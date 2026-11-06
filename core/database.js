/* ============================================================================
   SIMPLICITY ERP - ENTERPRISE SUPABASE CLOUD & REALTIME SYNC ENGINE
   File: core/database.js • Developed by Farhan Jawed
   Architecture: Supabase PostgreSQL Realtime Engine | Universal Dedicated Router
============================================================================ */

(() => {
    'use strict';

    // 1. SUPABASE CREDENTIALS (100% VERIFIED REAL CREDENTIALS)
    const SUPABASE_CONFIG = Object.freeze({
        url: "https://wzmnfofhhhaxrrymnekd.supabase.co",
        anonKey: "sb_publishable_D5KwPAwT3xumFJCVGSDj0A_loySGNhg"
    });

    let supabaseClient = null;
    let isConnectedToCloud = false;
    let renderDebounceTimer = null;
    let realtimeChannel = null;

    try {
        if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
            supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            window.supabaseClient = supabaseClient;
            console.log('✅ [CloudEngine] Supabase Realtime Engine Initialized.');
        } else {
            console.warn('⚠️ [CloudEngine] Supabase JS SDK not detected.');
        }
    } catch (initErr) {
        console.error('❌ [CloudEngine] Supabase Initialization failure:', initErr);
    }

    const getSafeUserId = () => {
        try {
            if (typeof window.getEffectiveUserId === 'function') {
                const id = window.getEffectiveUserId();
                if (id && id !== 'app') return id;
            }
            const stored = localStorage.getItem('app_current_user_id') || 
                           localStorage.getItem('currentUserId') || 
                           sessionStorage.getItem('currentUserId');
            if (stored) {
                const clean = String(stored).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
                if (clean && clean !== 'app') return clean;
            }
        } catch (_) {}
        return 'farhan';
    };

    const getActiveSessionVal = () => {
        try {
            if (typeof window.getActiveFinancialSession === 'function') {
                return window.getActiveFinancialSession();
            }
            const uId = getSafeUserId();
            const stored = localStorage.getItem(`${uId}_app_active_session`);
            if (stored) return String(stored).replace(/['"]+/g, '').trim();
        } catch (_) {}
        return '2026-2027';
    };

    /**
     * 🎯 SMART TABLE ROUTER:
     * FullKey (jaise: farhan_2026-2027_zari_stock) ko uski asli Supabase table me bhejta hai
     */
    const resolveTargetTable = (fullKey) => {
        const k = String(fullKey).toLowerCase();

        if (k.includes('saree_stock') || k.includes('saree_history') || k.includes('saree')) return 'saree_stock';
        if (k.includes('zari_history')) return 'zari_history';
        if (k.includes('zari_stock') || k.includes('zari')) return 'zari_stock';
        if (k.includes('bana_history')) return 'bana_history';
        if (k.includes('bana_stock') || k.includes('bana')) return 'bana_stock';
        if (k.includes('sancha_history')) return 'sancha_history';
        if (k.includes('sancha')) return 'sancha_list';
        if (k.includes('kariger_sheet') || k.includes('tani_sheet')) return 'tani_sheets';
        if (k.includes('kariger') || k.includes('karigers')) return 'karigers';
        if (k.includes('karkhana') || k.includes('godown')) return 'karkhanas';
        if (k.includes('material_transfers') || k.includes('transfer')) return 'material_transfers';
        if (k.includes('dukan')) return 'dukan_challans';
        if (k.includes('jobwork') || k.includes('job_work')) return 'job_workers';

        // Fallback default store table
        return 'material_stock';
    };

    /**
     * UI Status Badge Handler
     */
    const showSyncStatus = (status) => {
        const badge = document.getElementById('cloud-status-badge');
        if (!badge) return;

        if (typeof window.isBackupPreviewMode !== 'undefined' && window.isBackupPreviewMode) {
            badge.className = 'sync-badge';
            badge.style.background = '#fef08a';
            badge.style.color = '#854d0e';
            badge.innerHTML = '👁️ Preview Mode';
            return;
        }

        switch (status) {
            case 'syncing':
                badge.className = 'sync-badge sync-syncing';
                badge.style.background = '#dbeafe';
                badge.style.color = '#1d4ed8';
                badge.innerHTML = '🔄 Syncing...';
                break;
            case 'offline':
                badge.className = 'sync-badge';
                badge.style.background = '#fff7ed';
                badge.style.color = '#ea580c';
                badge.innerHTML = '🟠 Offline Mode';
                break;
            case 'error':
                badge.className = 'sync-badge';
                badge.style.background = '#fee2e2';
                badge.style.color = '#dc2626';
                badge.innerHTML = '⚠️ Sync Error';
                break;
            case 'online':
            default:
                badge.className = 'sync-badge';
                badge.style.background = '#ecfdf5';
                badge.style.color = '#059669';
                badge.innerHTML = '🟢 Cloud Synced';
                break;
        }
    };

    /**
     * ⚡ SCREEN REPAINTER
     */
    const triggerSmartUIRepaint = () => {
        if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
        renderDebounceTimer = setTimeout(() => {
            const shSec = document.getElementById('kariger-sheet-section');
            if (shSec && shSec.style.display !== 'none') {
                if (typeof window.renderSheetTabs === 'function') window.renderSheetTabs();
                if (typeof window.loadCurrentSheetData === 'function') window.loadCurrentSheetData();
            }

            const kSec = document.getElementById('kariger-section');
            if (kSec && kSec.style.display !== 'none') {
                if (typeof window.renderKarigerTable === 'function') window.renderKarigerTable();
            }

            const bSec = document.getElementById('bana-section');
            if (bSec && bSec.style.display !== 'none') {
                if (typeof window.renderBanaTable === 'function') window.renderBanaTable();
                if (typeof window.applyPassbookFilters === 'function') window.applyPassbookFilters();
                else if (typeof window.renderBanaPassbookRows === 'function') window.renderBanaPassbookRows();
            }

            const zSec = document.getElementById('zari-section');
            if (zSec && zSec.style.display !== 'none') {
                if (typeof window.renderZariTable === 'function') window.renderZariTable();
                if (typeof window.applyZariPassbookFilters === 'function') window.applyZariPassbookFilters();
                else if (typeof window.renderZariPassbookRows === 'function') window.renderZariPassbookRows();
            }

            const sSec = document.getElementById('saree-section');
            if (sSec && sSec.style.display !== 'none') {
                if (typeof window.renderSareeTable === 'function') window.renderSareeTable();
                if (typeof window.applySareePassbookFilters === 'function') window.applySareePassbookFilters();
            }

            if (typeof window.renderDashboardDayBook === 'function') {
                window.renderDashboardDayBook();
            }
            if (typeof window.updateDashboardBadgeTotals === 'function') {
                window.updateDashboardBadgeTotals();
            }
            if (typeof window.triggerActiveSectionRefresh === 'function') {
                window.triggerActiveSectionRefresh();
            }
        }, 50);
    };

    /**
     * 🚀 CLOUD WRITE: Har ek data ko uski sahi table me bhejta hai
     */
    const cloudWrite = async (fullKey, data) => {
        if (!supabaseClient) return false;
        showSyncStatus('syncing');

        const targetTable = resolveTargetTable(fullKey);
        const uid = getSafeUserId();
        const sess = getActiveSessionVal();

        try {
            const payload = {
                id: String(fullKey),
                user_id: uid,
                session: sess,
                data: data,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabaseClient
                .from(targetTable)
                .upsert(payload, { onConflict: 'id' });

            if (error) {
                // Agar table me session ya data column alag ho, toh bina extra columns ke try karo
                const { error: retryError } = await supabaseClient
                    .from(targetTable)
                    .upsert({ id: String(fullKey), data: data }, { onConflict: 'id' });

                if (retryError) throw retryError;
            }

            isConnectedToCloud = true;
            showSyncStatus('online');
            console.log(`✅ [Supabase] Saved in ${targetTable}: ${fullKey}`);
            return true;
        } catch (err) {
            console.error(`❌ [Supabase] cloudWrite failed on ${targetTable}:`, err);
            showSyncStatus('error');
            return false;
        }
    };

    /**
     * 📥 CLOUD PULL: Supabase se naya data app me load karna
     */
    const pullAllCloudData = async () => {
        if (!supabaseClient || !navigator.onLine) return;
        const uid = getSafeUserId();

        const tables = [
            'saree_stock', 'zari_stock', 'zari_history', 'bana_stock', 'bana_history',
            'sancha_list', 'sancha_history', 'karigers', 'tani_sheets', 
            'material_transfers', 'karkhanas', 'dukan_challans', 'material_stock'
        ];

        for (const tbl of tables) {
            try {
                const { data } = await supabaseClient
                    .from(tbl)
                    .select('*')
                    .or(`user_id.eq.${uid},id.ilike.${uid}_%`);

                if (data && data.length > 0) {
                    data.forEach((row) => {
                        const targetKey = row.id;
                        const rowData = row.data !== undefined ? row.data : row;
                        if (targetKey && typeof window.setRemoteStore === 'function') {
                            window.setRemoteStore(targetKey, rowData);
                        }
                    });
                }
            } catch (_) {}
        }

        triggerSmartUIRepaint();
    };

    /**
     * ⚡ SUPABASE REALTIME LISTENER (Doosre device me entry ho toh live sync)
     */
    const initSupabaseRealtime = () => {
        if (!supabaseClient) return;
        detachSupabaseRealtime();

        try {
            realtimeChannel = supabaseClient.channel('public_db_realtime')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public' },
                    (payload) => {
                        if (typeof window.isBackupPreviewMode !== 'undefined' && window.isBackupPreviewMode) return;
                        const row = payload.new;
                        if (row && row.id && typeof window.setRemoteStore === 'function') {
                            const rowData = row.data !== undefined ? row.data : row;
                            window.setRemoteStore(row.id, rowData);
                        }
                        triggerSmartUIRepaint();
                        showSyncStatus('online');
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        isConnectedToCloud = true;
                        showSyncStatus('online');
                    }
                });

            pullAllCloudData();
        } catch (err) {
            console.warn('[CloudEngine] Realtime setup:', err);
        }
    };

    const detachSupabaseRealtime = () => {
        try {
            if (realtimeChannel && supabaseClient) {
                supabaseClient.removeChannel(realtimeChannel);
                realtimeChannel = null;
            }
        } catch (_) {}
    };

    const switchSessionListeners = () => {
        pullAllCloudData();
    };

    const publicCloudAPI = {
        get db() { return supabaseClient; },
        get supabase() { return supabaseClient; },
        get isConnectedToCloud() { return isConnectedToCloud; },
        showSyncStatus,
        initSupabaseRealtime,
        detachSupabaseRealtime,
        // Purani files ke saath compatibility
        initFirebaseLiveListeners: initSupabaseRealtime,
        detachFirebaseLiveListeners: detachSupabaseRealtime,
        switchSessionListeners,
        cloudWrite,
        pullAllCloudData,
        triggerSmartUIRepaint
    };

    window.db = supabaseClient;
    window.supabaseClient = supabaseClient;
    window.showSyncStatus = showSyncStatus;
    window.initSupabaseRealtime = initSupabaseRealtime;
    window.detachSupabaseRealtime = detachSupabaseRealtime;
    // Backward compatibility aliases
    window.initFirebaseLiveListeners = initSupabaseRealtime;
    window.detachFirebaseLiveListeners = detachSupabaseRealtime;
    window.switchSessionListeners = switchSessionListeners;
    window.triggerSmartUIRepaint = triggerSmartUIRepaint;
    window.CloudEngine = publicCloudAPI;

    window.addEventListener('online', () => {
        isConnectedToCloud = true;
        showSyncStatus('online');
        initSupabaseRealtime();
    });

    window.addEventListener('offline', () => {
        isConnectedToCloud = false;
        showSyncStatus('offline');
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(initSupabaseRealtime, 300));
    } else {
        setTimeout(initSupabaseRealtime, 300);
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = publicCloudAPI;
    }
})();
