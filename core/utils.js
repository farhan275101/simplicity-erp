
/* ========================================================
   SIMPLICITY ERP - CORE UTILITIES & HELPERS
   File: core/utils.js • Developed by Farhan Jawed
   (Cross-Platform Safe Array, Date Formatting & UI Toggles)
======================================================== */

// 1. BULLETPROOF SAFE ARRAY CONVERTER (CRASH SHIELD)
// Firebase dictionary ya LocalStorage object ko safe array me convert karta hai
function safeArray(data) {
    if (!data) return [];
    
    // Agar pehle se Array hai
    if (Array.isArray(data)) {
        return data.filter(function(item) { 
            return item !== null && item !== undefined; 
        });
    }
    
    // Agar Firebase ne object { "key1": {...}, "key2": {...} } bheja hai
    if (typeof data === "object") {
        var keys = Object.keys(data);
        if (!keys.length) return [];
        
        var isNumeric = keys.every(function(k) { return !isNaN(parseInt(k, 10)); });
        
        if (isNumeric) {
            var arr = [];
            keys.sort(function(a, b) { return parseInt(a, 10) - parseInt(b, 10); }).forEach(function(k) {
                if (data[k] !== null && data[k] !== undefined) arr.push(data[k]);
            });
            return arr;
        } else {
            // Non-numeric keys (Push IDs) ko safe array of objects me badalna
            var objArr = [];
            keys.forEach(function(k) {
                if (data[k] !== null && data[k] !== undefined) {
                    // Agar item ke andar ID nahi hai to key ko ID bana do
                    if (typeof data[k] === "object" && !data[k].id) {
                        data[k].id = k;
                    }
                    objArr.push(data[k]);
                }
            });
            return objArr;
        }
    }
    
    return [];
}

// 2. TAREEEHK (DATE) HELPERS (Device Local Time)
function getTodayDate() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

// YYYY-MM-DD ko Indian Display Format (DD-MM-YYYY) me badalna
function formatDateDisplay(d) {
    if (!d) return "-";
    var p = String(d).split("-");
    return (p.length === 3 && p[0].length === 4) ? (p[2] + "-" + p[1] + "-" + p[0]) : d;
}

// Filter ke liye: Kya entry di gayi date range ke andar hai?
function isDateInRange(itemDate, fromDate, toDate) {
    if (!itemDate) return true;
    if (fromDate && itemDate < fromDate) return false;
    if (toDate && itemDate > toDate) return false;
    return true;
}

// 3. UI SCREEN & MODAL HELPERS (Mobile + Desktop Safe)
function setDisplay(id, val) {
    var el = document.getElementById(id);
    if (el) {
        el.style.display = val;
    }
}

// Safe Text Setter (HTML element gayab hone par code break nahi hoga)
function setElementText(id, text) {
    var el = document.getElementById(id);
    if (el) {
        el.textContent = text;
    }
}

// Number ko saaf 2 decimal me dikhana (Currency / Weight)
function formatNumber(num, decimals) {
    var n = parseFloat(num);
    if (isNaN(n)) return "0.00";
    return n.toFixed(decimals !== undefined ? decimals : 2);
}
