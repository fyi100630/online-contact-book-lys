/**
 * Google 試算表 (Google Apps Script) 同步模組
 */
const SheetsSync = {
  LOCAL_STORAGE_KEY: 'contact_book_sheets_records',

  normalizeDateStr(val) {
    if (!val) return '';
    val = String(val).trim();
    const isoMatch = val.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (isoMatch) {
      return isoMatch[1] + '-' + isoMatch[2].padStart(2, '0') + '-' + isoMatch[3].padStart(2, '0');
    }
    const engMatch = val.match(/([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/);
    if (engMatch) {
      const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
      const mm = months[engMatch[1]] || '01';
      const dd = engMatch[2].padStart(2, '0');
      const yyyy = engMatch[3];
      return yyyy + '-' + mm + '-' + dd;
    }
    return val;
  },

  normalizeRecords(list) {
    if (!Array.isArray(list)) return [];
    return list.map(item => ({
      ...item,
      date: this.normalizeDateStr(item.date),
      dueDate: this.normalizeDateStr(item.dueDate)
    }));
  },

  /**
   * 立即同步取得本機快取資料（0 毫秒極速渲染，解決打開等待數秒問題）
   */
  getCachedData() {
    try {
      const cached = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return this.normalizeRecords(parsed);
        }
      }
    } catch (e) {
      console.warn('讀取本機快取失敗：', e);
    }
    return [];
  },

  /**
   * 載入聯絡簿資料 (雲端非同步同步)
   */
  async loadData() {
    const config = window.APP_CONFIG || {};
    const gasUrl = (config.gasApiUrl || '').trim();

    // 1. 若有設定 Google Apps Script 網址，優先從 Google 試算表抓取
    if (gasUrl) {
      try {
        const response = await fetch(gasUrl, {
          method: 'GET',
          redirect: 'follow'
        });
        if (!response.ok) {
          throw new Error(`HTTP 錯誤碼: ${response.status}`);
        }
        const res = await response.json();
        if (res.success && Array.isArray(res.data)) {
          const cleanRecords = this.normalizeRecords(res.data);
          localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(cleanRecords));
          return { success: true, records: cleanRecords, source: 'sheets' };
        }
      } catch (err) {
        console.warn('無法連線至 Google 試算表，嘗試載入本機備份：', err);
      }
    }

    // 2. 本機快取備援 (localStorage)
    try {
      const cached = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { success: true, records: parsed, source: 'local' };
        }
      }
    } catch (e) {
      console.warn('讀取本機快取失敗：', e);
    }

    // 3. 初始預設種子資料 (data/records.json)
    try {
      const res = await fetch('data/records.json');
      if (res.ok) {
        const data = await res.json();
        const records = Array.isArray(data.records) ? data.records : (Array.isArray(data) ? data : []);
        return { success: true, records: records, source: 'default' };
      }
    } catch (e) {
      // 忽略靜態檔載入錯誤
    }

    return { success: true, records: [], source: 'empty' };
  },

  /**
   * 儲存聯絡簿資料
   */
  async saveData(records) {
    const config = window.APP_CONFIG || {};
    const gasUrl = (config.gasApiUrl || '').trim();

    // 先儲存至本機
    try {
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.warn('本機儲存失敗：', e);
    }

    // 若未設定 Google 試算表網址，僅儲存於本機
    if (!gasUrl) {
      return { success: true, source: 'local' };
    }

    // 發送至 Google Apps Script
    try {
      // 注意：使用 text/plain 避免觸發 GAS 不支援的 CORS preflight OPTIONS 請求
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'saveAll',
          records: records
        }),
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`HTTP 錯誤碼: ${response.status}`);
      }

      const res = await response.json();
      if (res.success) {
        return { success: true, source: 'sheets' };
      } else {
        throw new Error(res.error || 'Google 試算表儲存失敗');
      }
    } catch (err) {
      console.error('儲存至 Google 試算表時發生錯誤：', err);
      return { success: false, error: err.message, source: 'local-only' };
    }
  }
};
