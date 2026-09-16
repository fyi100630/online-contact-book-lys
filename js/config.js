/**
 * 班級聯絡簿 - 網站設定檔
 * 
 * 若要啟用 Firebase 毫秒級即時同步：
 * 請依照 README.md 的快速教學建立 Firebase Realtime Database，
 * 並將資料庫網址填入下方 firebaseDatabaseUrl。
 * 若尚未設定（留空），系統會自動使用本機瀏覽器（localStorage）運作。
 */
window.APP_CONFIG = {
  // 班級名稱
  classTitle: '班級聯絡簿',

  // Firebase Realtime Database 網址
  firebaseDatabaseUrl: 'https://contact-book-lys-default-rtdb.asia-southeast1.firebasedatabase.app'
};
