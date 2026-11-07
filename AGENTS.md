# 強壯城堡

先讀 README.md 與 docs/TEST-RESULTS.md。純靜態 HTML／CSS／JavaScript，不需打包，GitHub Pages 用 main 根目錄。美術全用 Canvas 程式繪畫，不加外部圖片、字型或執行期套件。

- 這是獨立新專案。不可改動 `porscheyeung/Courage-Castle`；同源舊存檔 `courage-castle-save-v1/v2` 只可讀取，不可寫入或刪除。
- 存檔 key 為 `strong-castle-save-v1`。history 是唯一進度來源，小力士由 seed 及次序重算，改動抽取或品種次序會令舊存檔的小力士變樣。
- 規則放 engine.js，保持可在 Node 測試。`window.strongCastle.snapshot()` 只供讀取，不要加入可改進度的測試後門。
- 小力士資料卡要在 click 事件才開，改回 pointerup 會令手機補發的點擊誤按卡上按鈕。
- 舉重不設失敗；咪高峰只由使用者主動開啟、只量音量，連按必須保留為替代方法。
- 文案用繁體中文、鼓勵語氣，不用僥倖或抽獎框架。

修改後執行 `npm test`，檢查手機及桌面截圖，更新 docs/TEST-RESULTS.md。不要提交 node_modules 或 test-results。
