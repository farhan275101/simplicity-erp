/* ========================================================
   SIMPLICITY ERP - BACKUP, VIEWER & RESTORE ENGINE
   File: backup/backup.js • Developed by Farhan Jawed
   (1-Click JSON Export, Zero-Overwrite Viewer & Live Restore)
======================================================== */

// 1. EXPORT FULL DATA
function exportUserFullData() {
    var sess = (typeof getActiveFinancialSession === "function") ? getActiveFinancialSession() : "2026-2027";
    var keys = [
        "kariger_list", "info_ledger", "karkhana_list", "app_sessions_list", "app_active_session",
        "bana_stock", "bana_history", "zari_stock", "zari_history",
        "saree_stock", "finished_saree_stock", "lott_saree_stock", "saree_history",
        "material_transfers", "saree_transfers",
        "sancha_items", "sancha_history",
        "jobwork_workers", "jw_bills_list", "jw_payments_list", "dukan_transfer_history"
    ];

    var obj = { 
        userId: currentUserId, 
        session: sess, 
        exportDate: new Date().toISOString(), 
        data: {}, 
        sheets: {}, 
        jobwork_sheets: {} 
    };

    keys.forEach(function(k) { obj.data[k] = getStore(k); });

    sanitizeKarigerList().forEach(function(k) {
        if (k && k.id) {
            var sh = getKarigerSheets(k.id);
            if (sh && sh.length) obj.sheets[k.id] = sh;
        }
    });

    safeArray(getStore("jobwork_workers")).forEach(function(w) {
        if (w && w.id) {
            var jwSh = safeArray(getStore("jobwork_sheets_" + w.id));
            if (jwSh && jwSh.length) obj.jobwork_sheets[w.id] = jwSh;
        }
    });

    return obj;
}

// 2. DOWNLOAD BACKUP FILE
function syncToGoogleDrive() { downloadBackupFile(); }

function downloadBackupFile() {
    if (!currentUserId) return alert("Pehle login karein!");
    var btn = document.querySelector(".welcome-banner button[onclick*='syncToGoogleDrive']");
    var origHtml = btn ? btn.innerHTML : "";
    if (btn) btn.innerHTML = "⏳ File Ban Rahi Hai...";

    setTimeout(function() {
        try {
            var data = exportUserFullData();
            var sess = (typeof getActiveFinancialSession === "function") ? getActiveFinancialSession() : "2026-2027";
            var fileName = currentUserId + "_" + sess + "_Backup_" + formatDateDisplay(getTodayDate()) + ".json";
            var blob = new Blob([JSON.stringify(data)], { type: "application/json;charset=utf-8" });
            var downloadUrl = window.URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.style.display = "none";
            a.href = downloadUrl; 
            a.download = fileName;
            document.body.appendChild(a); 
            a.click();

            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(downloadUrl);
                if (btn) btn.innerHTML = origHtml;
            }, 300);
        } catch (err) {
            if (btn) btn.innerHTML = origHtml;
            alert("Download Error: " + err.message);
        }
    }, 50);
}

// 3. READ-ONLY BACKUP VIEWER (LIVE DATA SAFE)
function openBackupViewer(e) {
    var file = e.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(evt) {
        try {
            var parsed = JSON.parse(evt.target.result);
            if (parsed && (parsed.data || parsed.sheets)) {
                isBackupPreviewMode = true;
                PREVIEW_BACKUP_DATA = parsed;

                var banner = document.getElementById("backup-preview-banner");
                var dateText = document.getElementById("preview-banner-date");
                if (banner) banner.style.display = "flex";
                if (dateText) {
                    var sLabel = parsed.session ? (parsed.session + " • ") : "";
                    var dLabel = parsed.exportDate ? formatDateDisplay(String(parsed.exportDate).substring(0, 10)) : "Purana Backup";
                    dateText.textContent = sLabel + dLabel;
                }

                if (typeof backToDashboard === "function") backToDashboard();
                showSyncStatus("preview");
                alert("👁️ BACKUP PREVIEW MODE CHALU!\nYeh data sirf dekhne ke liye hai. Aaj ka live data 100% surakshit hai.");
            } else {
                alert("Galat backup file format!");
            }
        } catch(err) { alert("File Error: " + err.message); }
    };
    reader.readAsText(file);
    e.target.value = "";
}

function exitBackupPreviewMode() {
    isBackupPreviewMode = false;
    PREVIEW_BACKUP_DATA = null;
    var banner = document.getElementById("backup-preview-banner");
    if (banner) banner.style.display = "none";

    clearMemoryCache();
    initIndexedDBPreload(function() {
        if (typeof backToDashboard === "function") backToDashboard();
        showSyncStatus("online");
        alert("✅ Preview Mode band ho gaya!");
    });
}

// 4. FULL RESTORE
function restoreBackupFile(e) {
    var file = e.target.files[0];
    if (!file) return;

    if (!confirm("⚠️ KYA AAP IS BACKUP KO LIVE RESTORE KARNA CHAHTE HAIN?\nPura purana data replace ho jayega!")) {
        e.target.value = "";
        return;
    }

    var reader = new FileReader();
    reader.onload = function(evt) {
        try {
            var parsed = JSON.parse(evt.target.result);
            if (parsed && parsed.data) {
                clearMemoryCache();
                for (var key in parsed.data) {
                    setStore(key, parsed.data[key]);
                }
                if (parsed.sheets) {
                    for (var sheetKarId in parsed.sheets) {
                        setStore("kariger_sheets_" + sheetKarId, parsed.sheets[sheetKarId]);
                    }
                }
                if (parsed.jobwork_sheets) {
                    for (var jwWorkerId in parsed.jobwork_sheets) {
                        setStore("jobwork_sheets_" + jwWorkerId, parsed.jobwork_sheets[jwWorkerId]);
                    }
                }
                alert("✅ Data successfully restore ho gaya!");
                if (typeof populateSessionDropdown === "function") populateSessionDropdown();
                if (typeof backToDashboard === "function") backToDashboard();
            }
        } catch (err) { alert("Restore Error: " + err.message); }
    };
    reader.readAsText(file);
    e.target.value = "";
}
