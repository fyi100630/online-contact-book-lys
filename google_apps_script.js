/**
 * 班級聯絡簿 - Google 試算表同步後端 (Google Apps Script)
 * 
 * 【部署方式】：
 * 1. 在 Google 雲端硬碟建立一份新的「Google 試算表」，命名為「班級聯絡簿資料庫」。
 * 2. 點擊頂端選單的「擴充功能」 -> 「Apps Script」。
 * 3. 把此檔案內的所有程式碼完整複製並貼上到 Code.gs 編輯器中（替換掉原本的內容）。
 * 4. 點擊右上角的「部署」 -> 「新增部署作業」。
 * 5. 點選左側齒輪選取類型為「網頁應用程式 (Web App)」：
 *    - 說明：聯絡簿 API
 *    - 執行身分：我 (你的 Google 帳號)
 *    - 誰可以存取：任何人 (Anyone)  <-- 非常重要！
 * 6. 點擊「部署」，並授予應用程式讀寫 Google 試算表的權限。
 * 7. 複製產生的「網頁應用程式網址 (Web App URL)」，貼到前端的 js/config.js 裡面即可！
 */

const SHEET_NAME = 'records';

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['id', 'date', 'category', 'title', 'subject', 'details', 'dueDate', 'created_at']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// 讀取資料 (GET)
function doGet(e) {
  try {
    const sheet = getSheet();
    // 使用 getDisplayValues() 直接讀取儲存格文字，確保日期格式永遠為標準 YYYY-MM-DD
    const data = sheet.getDataRange().getDisplayValues();
    
    // 如果只有標題列或無資料
    if (data.length <= 1) {
      return responseJson({ success: true, data: [] });
    }

    const headers = data[0];
    const records = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0] && !row[3]) continue; // 略過空白列
      
      const item = {};
      for (let j = 0; j < headers.length; j++) {
        item[headers[j]] = row[j] !== undefined ? String(row[j]).trim() : '';
      }
      records.push(item);
    }

    return responseJson({ success: true, data: records });
  } catch (err) {
    return responseJson({ success: false, error: err.toString() });
  }
}

// 寫入資料 (POST)
function doPost(e) {
  try {
    const contents = e.postData ? e.postData.contents : '';
    const payload = JSON.parse(contents);

    if (payload.action === 'saveAll' && Array.isArray(payload.records)) {
      const sheet = getSheet();
      sheet.clearContents();
      
      const headers = ['id', 'date', 'category', 'title', 'subject', 'details', 'dueDate', 'created_at'];
      const rows = [headers];

      for (let item of payload.records) {
        rows.push([
          item.id || Utilities.getUuid(),
          item.date || '',
          item.category || 'homework',
          item.title || '',
          item.subject || '',
          item.details || '',
          item.dueDate || '',
          item.created_at || new Date().toISOString()
        ]);
      }

      sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
      return responseJson({ success: true, count: payload.records.length });
    }

    return responseJson({ success: false, error: 'Unknown action' });
  } catch (err) {
    return responseJson({ success: false, error: err.toString() });
  }
}

function responseJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
