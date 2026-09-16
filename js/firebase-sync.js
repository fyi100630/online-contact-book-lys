/**
 * Firebase Realtime Database 毫秒級即時同步模組
 */
const FirebaseSync = {
  LOCAL_STORAGE_KEY: 'contact_book_firebase_records',
  db: null,
  isListening: false,
  isConnected: false,

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
   * 立即同步取得本機快取資料（0 毫秒秒開）
   */
  getCachedData() {
    try {
      let cached = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (!cached) {
        cached = localStorage.getItem('contact_book_sheets_records');
      }
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
   * 初始化 Firebase 並監聽即時變動
   * @param {Object} options - { onUpdate: Function, onStatusChange: Function }
   */
  init(options = {}) {
    const config = window.APP_CONFIG || {};
    const dbUrl = (config.firebaseDatabaseUrl || '').trim();

    if (!dbUrl || typeof firebase === 'undefined') {
      console.log('Firebase 尚未配置或 SDK 未載入，以本機模式運作');
      if (options.onStatusChange) options.onStatusChange(false);
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp({
          databaseURL: dbUrl
        });
      }

      this.db = firebase.database();

      // 監聽連線狀態
      const connectedRef = this.db.ref('.info/connected');
      connectedRef.on('value', (snap) => {
        this.isConnected = snap.val() === true;
        if (options.onStatusChange) {
          options.onStatusChange(this.isConnected);
        }
      });

      // 註冊資料即時監聽器 (全體裝置同步)
      if (!this.isListening) {
        this.isListening = true;
        const recordsRef = this.db.ref('records');
        recordsRef.on('value', (snapshot) => {
          const val = snapshot.val();
          let records = [];
          if (Array.isArray(val)) {
            records = val.filter(Boolean);
          } else if (val && typeof val === 'object') {
            records = Object.values(val);
          }

          // 雲端若為空，但本機已有既有資料或種子資料，自動上傳初始化
          if (records.length === 0 && val === null) {
            const localCached = this.getCachedData();
            if (localCached.length > 0) {
              this.saveData(localCached);
              return;
            }
            fetch('data/records.json')
              .then((res) => res.json())
              .then((data) => {
                const list = Array.isArray(data.records) ? data.records : (Array.isArray(data) ? data : []);
                if (list.length > 0) {
                  this.saveData(this.normalizeRecords(list));
                }
              })
              .catch(() => {});
            return;
          }

          const cleanRecords = this.normalizeRecords(records);

          // 快取至本機
          try {
            localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(cleanRecords));
          } catch (e) {}

          if (options.onUpdate) {
            options.onUpdate(cleanRecords);
          }
        }, (err) => {
          console.warn('Firebase 讀取資料失敗：', err);
        });
      }
    } catch (err) {
      console.error('Firebase 初始化失敗：', err);
      if (options.onStatusChange) options.onStatusChange(false);
    }
  },

  /**
   * 寫入資料至 Firebase 與本機
   */
  async saveData(records) {
    const cleanRecords = this.normalizeRecords(records);

    // 1. 先存本機，確保斷網依然可用
    try {
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(cleanRecords));
    } catch (e) {
      console.warn('本機儲存失敗：', e);
    }

    // 2. 若有連線 Firebase，寫入雲端（~50ms）
    if (this.db) {
      try {
        await this.db.ref('records').set(cleanRecords);
        return { success: true, source: 'firebase' };
      } catch (err) {
        console.error('Firebase 雲端寫入失敗：', err);
        return { success: false, error: err.message, source: 'local-only' };
      }
    }

    return { success: true, source: 'local' };
  }
};
