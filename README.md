# Cyclone Pulse：颱風數據節奏與氣象聲景網頁遊戲
**2026 NASA International Space Apps Challenge — Challenge: [The Earth Information Jukebox](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/?tab=resources)**

---

## 專案簡介 (Project Summary)
**《Cyclone Pulse》** 是一款結合 **NASA 地球觀測衛星資料**、**歷史侵台颱風實測氣象數據** 與 **Web Audio API 即時聲景合成 (Data Sonification)** 的互動式節奏音樂網頁遊戲。

玩家可從 **10 個真實登陸台灣的代表性颱風**（丹娜絲、楊柳、樺加沙、康芮、山陀兒、凱米、小犬、海葵、蘇迪勒、莫拉克）中選擇關卡，觀察颱風沿真實經緯度路徑推進時的 **最大風速 (`m/s`)**、**中心氣壓 (`hPa`)** 與 **紅外線雲頂溫度 (`°C`)**，並在 **4/4 拍（一小節四拍 `1 - 2 - 3 - 4`）** 的動態節奏中自由使用方向鍵（`↑` 水晶鐘琴、`←` 溫暖電鋼琴、`→` 空靈拇指琴、`↓` 合成弦樂）演奏出獨一無二的颱風氣象聲景，遊戲結束後系統將 **100% 自動合成並提供專屬 `.WAV` Demo 音樂下載**。

---

## 核心特色 (Key Features)
1. **10 個真實登陸台灣歷史颱風關卡**：
   - 完整收錄各颱風登陸台灣之 **年、月、日、時分**、登陸地點、最大風速 (`m/s`)、中心最低氣壓 (`hPa`) 與 10 張獨立 NASA 衛星雲圖。
2. **氣象數據驅動之 4/4 四拍動態節奏與移速同步 (Data-Driven Tempo & Motion)**：
   - **中心氣壓 (`hPa`)** 映射為重低音 Sub-Bass 共鳴深度；**最大風速 (`m/s`)** 同步驅動 **音樂節奏速度 (`68 ~ 172 RPM`)** 與 **颱風路徑移動倍率 (`0.4x 緩行 ~ 2.5x 疾衝`)**。
   - 採用主時鐘相位鎖定 (`musicalBeatPos`)，讓 4/4 拍的每一小節四拍（`1拍 強拍 -> 2拍 反拍 -> 3拍 次強拍 -> 4拍 過門拍`）視覺收縮圈與音樂節拍 100% 精準對齊。
3. **四向自由音色演奏 (`↑ ↓ ← →` 只要節拍對即得分)**：
   - `↑` **水晶鐘琴 (Celeste Bell)**：清亮高音泛音
   - `←` **溫暖電鋼琴 (Warm Rhodes)**：柔和爵士七和弦伴奏
   - `→` **空靈拇指琴 (Kalimba Pluck)**：清脆木質顆粒彈撥
   - `↓` **深海合成弦樂 (Analog Strings)**：渾厚溫暖中低音弦樂
4. **全自動個人化 `.WAV` 音樂生成與下載**：
   - 遊戲結算時，透過 `OfflineAudioContext` 自動將該場颱風的氣象數據曲線與玩家本局實際彈奏的四向音色序列渲染為高音質立體聲 `.WAV` 音檔，支援即時試聽與一鍵下載。

---

## 官方 NASA 資源使用清單 (NASA Official Resources Used)
本專案嚴格遵循 [The Earth Information Jukebox 官方資源頁面](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/?tab=resources) 規範：
- **NASA Earth Observatory / MODIS & VIIRS True-Color Imagery (Terra / Aqua / Suomi NPP)**：台灣真實地形衛星底圖與 10 個侵台颱風之真實衛星雲圖。
- **NASA Scientific Visualization Studio (SVS)**：
  - `SVS #5669`：GEOS-FP Global Aerosols & Typhoons (2025 丹娜絲、楊柳、樺加沙氣溶膠與氣旋視覺化)
  - `SVS #4960`：IMERG Atmospheric Rivers & Precipitation
  - `SVS #5313`：Black Marble HD Nighttime Lights (台灣夜間城市燈光分布)
  - `SVS #3912`：ECCO2 Kuroshio Sea Surface Temperature & Ocean Currents (台灣東部黑潮海溫)
  - `SVS #5011`：ISS LIS Global Lightning Flash Rate
  - `SVS #4950`：GEDI Forest Canopy Height (中央山脈地形與林冠高度)
- **NASA GIBS (Global Imagery Browse Services) & Worldview**：`WGS84 (EPSG:4326)` 台灣周邊海域 (`117.5°E–126.5°E, 19.3°N–26.7°N`) 地理座標投影。

---

## 如何執行 (How to Run)
本專案為純前端零依賴架構 (Zero-Build Vanilla HTML5 / CSS3 / Web Audio API)，支援離線直接開啟：
1. 直接雙擊開啟 `index.html`，或使用任意靜態伺服器：
   ```bash
   python3 -m http.server 8080
   ```
2. 瀏覽器開啟 `http://localhost:8080` 即可遊玩（若部署於 GitHub Pages，可直接透過線上網址遊玩）。
