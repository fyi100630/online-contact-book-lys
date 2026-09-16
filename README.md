# 📖 班級聯絡簿（Firebase 極速即時版）

這是一個**完全免費、零主機費用、開箱即用、毫秒級即時同步**的線上班級聯絡簿。  
無須租用伺服器，利用 Google 免費提供的 **Firebase Realtime Database**，實現手機與電腦之間 **0 秒開啟（本機秒開快取）** 與 **即時連線推送（老師改完，全班所有打開的網頁 0.1 秒內自動更新，完全不用手動重整重新載入）**！

---

## ✨ 特色優點
- ⚡ **0 毫秒極速秒開**：本機快取優先載入，打開網頁瞬間看見聯絡簿，無任何等待白畫面。
- 🔄 **毫秒級即時廣播**：透過 Firebase WebSocket，任何一台裝置新增或修改，所有打開的裝置立即同步。
- 📱 **手機體驗極佳**：採用現代液態玻璃質感設計，字體清晰大方、自動適應各尺寸手機與平板。
- ⏰ **自動截止倒數**：根據到期日自動計算「今日到期」、「明日截止」等醒目彩色提示徽章。
- 🔒 **免密碼防呆設計**：右上角一鍵切換「✏️ 編輯模式 / 👁️ 唯讀模式」，平時提供學生與家長觀看防誤觸，老師編輯隨時切換。
- 💰 **終身免費**：使用 Firebase 免費 Spark 方案（每月 10GB 傳輸量，班級聯絡簿只需幾 MB，完全免費且無需綁定信用卡）。

---

## 🚀 3 步驟快速架設指南

### 第一步：在本機試用（開箱即用）
直接雙擊開啟 `index.html`，你就可以直接在瀏覽器裡看到聯絡簿畫面！  
此時點擊右上角「👁️ 唯讀模式」切換成「✏️ 編輯模式中」，就能新增與修改項目（尚未設定雲端時，資料會自動儲存在你電腦的瀏覽器中）。

---

### 第二步：建立免費的 Firebase 即時資料庫（只需 1 分鐘）

要讓所有學生與家長能看到你編輯的內容，請建立一個免費的 Firebase 資料庫：

1. 打開 [Firebase Console 控制台](https://console.firebase.google.com/)，登入你的 Google 帳號。
2. 點擊 **「新增專案」**（或建立專案），輸入專案名稱（例如 `my-class-47`），點擊繼續（Google Analytics 分析可自由選擇關閉或開啟），完成建立。
3. 進入專案首頁後，在左側選單點選 **「建置 (Build)」 ➔ 「Realtime Database」**。
4. 點擊 **「建立資料庫 (Create Database)」**：
   - 地區位置：直接使用預設（例如 `美國 us-central1` 或 `新加坡 asia-southeast1`）即可，點擊下一步。
   - 安全性格則：選擇 **「以測試模式啟動 (Start in test mode)」**（讓所有人都可以讀寫聯絡簿），點擊「啟用」。
5. 建立完成後，畫面上方會顯示你的專屬資料庫網址（格式如下）：  
   `https://你的專案名稱-default-rtdb.firebaseio.com/`
6. 打開本資料夾的 [`js/config.js`](./js/config.js)，將資料庫網址複製貼到 `firebaseDatabaseUrl`：
   ```javascript
   window.APP_CONFIG = {
     // 班級名稱
     classTitle: '三年二班聯絡簿',

     // Firebase Realtime Database 網址
     firebaseDatabaseUrl: 'https://你的專案名稱-default-rtdb.firebaseio.com/'
   };
   ```

🎉 **完成！**  
現在你可以同時用兩個不同的瀏覽器分頁打開 `index.html`，在其中一邊新增或修改一筆作業，另一邊在 **0.1 秒內** 就會自動跳出更新！

---

### 第三步：發布到線上讓全班查看（GitHub Pages 或靜態託管）

若要給學生和家長一個永久網址：

1. 到 [GitHub](https://github.com/) 建立一個新的公開倉庫（Public Repository），例如 `contact-book`。
2. 將此資料夾內的所有檔案上傳至該倉庫。
3. 到該倉庫的 **Settings ➔ Pages**：
   - **Branch** 選擇 `main`（或 `master`），目錄選 `/ (root)`。
   - 點擊 **Save**。
4. 約 1 分鐘後，GitHub 就會給你一個專屬網址（例如 `https://你的帳號.github.io/contact-book/`），把這個網址傳給家長和學生即可！

---

## 📂 檔案目錄說明
```text
├── index.html            # 前端液態玻璃介面 (Vue 3 + Tailwind CSS + Firebase SDK)
├── js/
│   ├── config.js         # 班級名稱與 Firebase 資料庫網址設定
│   ├── firebase-sync.js  # Firebase Realtime 即時同步模組 (WebSocket 毫秒推送)
│   ├── sheets-sync.js    # (備用) Google 試算表通訊模組
│   └── app.js            # 聯絡簿核心互動邏輯
├── google_apps_script.js # (備用) Google 試算表部署腳本
└── data/
    └── records.json      # 預設範例資料
```
