# Cyclone Pulse: Real-Time Typhoon Data Rhythm & Earth Sonification Game

> **2026 NASA International Space Apps Challenge**  
> **Challenge:** [The Earth Information Jukebox](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/?tab=resources)  
> **Target Award:** *Art & Technology Award* / *Best Use of Data Award*

---

## 🌐 Quick Links (重要連結)
- **Live Interactive Demo (線上即時試玩):**  
  👉 [https://benchiang7tw25.github.io/cyclone-pulse/](https://benchiang7tw25.github.io/cyclone-pulse/)
- **Official 7-Slide Presentation Deck (官方 7 頁展示簡報):**  
  👉 [https://benchiang7tw25.github.io/cyclone-pulse/slides.html](https://benchiang7tw25.github.io/cyclone-pulse/slides.html)
- **Open Source Repository (GitHub 原始碼):**  
  👉 [https://github.com/benchiang7tw25/cyclone-pulse](https://github.com/benchiang7tw25/cyclone-pulse)

---

## 📖 Project Overview (專案簡介)
**Cyclone Pulse** is an interactive, browser-based rhythm and atmospheric sonification game that translates NASA Earth observations and historical Western Pacific typhoon telemetry into music.

Responding to NASA's **"The Earth Information Jukebox"** challenge, the project models **10 historic typhoons that made landfall in Taiwan**. Players navigate real-world storm tracks, where physical parameters—**wind speed (`m/s`)**, **central atmospheric pressure (`hPa`)**, and **infrared cloud-top temperatures (`°C`)**—directly drive dynamic musical tempos, sub-bass resonances, and storm velocity.

### Key Highlights
1. **Full Bilingual Support (🌐 English / 繁體中文):**  
   Designed for both NASA Global Judges and local communities. Features a one-click language toggle on both the stage selection and result screens.
2. **Phase-Locked 4/4 Rhythm Master Clock:**  
   Structured into strict 4/4 measures (Beat 1: Downbeat Kick, Beat 2: Snare Clap, Beat 3: Driving Kick, Beat 4: Turnaround Fill). Contracting visual rings hit the eye in mathematical lockstep ($t = 1.000$) with the audio downbeats.
3. **Four Spatial Performance Instruments:**  
   Players can press any arrow key on beat to expressively perform across four distinct instruments:
   - `↑` (UP): **Celeste Bell** (Crystal high-pitch overtones & chiming harmonics)
   - `←` (LEFT): **Warm Rhodes** (Lush jazz 7th chord arpeggiations)
   - `→` (RIGHT): **Kalimba Pluck** (Tactile woody pentatonic percussion)
   - `↓` (DOWN): **Analog Strings** (Warm mid-range sustain & octave resonance)
4. **Automated Personalized `.WAV` Export:**  
   Upon stage completion, an in-browser `OfflineAudioContext` synthesis pipeline automatically renders a studio-grade, 16-second stereo `.WAV` soundtrack blending the typhoon's telemetry curve with the player’s unique instrument choices for instant playback and lossless download.
5. **Apple-Grade Frosted Glass UI:**  
   Pure macOS / Apple Weather aesthetic with dynamic satellite backdrop blur, SF Pro typography, and an unobstructed track layout.

---

## 🌪️ 10 Historic Taiwan Landfall Typhoons (收錄歷史侵台颱風)
All 10 stages incorporate exact landfall timestamps, locations, peak wind speeds, central pressures, and true NASA satellite images:
1. **Fung-wong (鳳凰 · 2025):** Nov 12, 2025 at Hengchun, Pingtung (48 m/s, 930 hPa) — Breaks a 58-year late-season record.
2. **Podul (楊柳 · 2025):** Aug 13, 2025 at Taimali, Taitung (43 m/s, 945 hPa) — 3-hour lightning mountain traversal.
3. **Danas (丹娜絲 · 2025):** July 6, 2025 at Budai, Chiayi (40 m/s, 950 hPa) — First Chiayi landfall since 1958.
4. **Kong-rey (康芮 · 2024):** Oct 31, 2024 at Chenggong, Taitung (51 m/s, 925 hPa) — 320km super-typhoon storm radius.
5. **Krathon (山陀兒 · 2024):** Oct 3, 2024 at Xiaogang, Kaohsiung (55 m/s, 915 hPa) — Southwest offshore stalling & direct harbor strike.
6. **Gaemi (凱米 · 2024):** July 25, 2024 at Nan’ao, Yilan (53 m/s, 920 hPa) — Counter-clockwise terrain deflection loop.
7. **Koinu (小犬 · 2023):** Oct 5, 2023 at Eluanbi, Pingtung (51 m/s, 925 hPa) — All-time record 95.2 m/s wind gust at Orchid Island.
8. **Haikui (海葵 · 2023):** Sept 3, 2023 at Donghe, Taitung (43 m/s, 945 hPa) — Double landfall ending a 1,471-day streak.
9. **Soudelor (蘇迪勒 · 2015):** Aug 8, 2015 at Xiulin, Hualien (48 m/s, 930 hPa) — Island-wide severe wind gale.
10. **Morakot (莫拉克 · 2009):** Aug 7, 2009 at Hualien City (40 m/s, 955 hPa) — Extreme catastrophic monsoon rainfall (>3,000 mm).

---

## 🛰️ Official NASA Data & Resources Used (大會指定 NASA 資源清單)
In strict compliance with [NASA Space Apps Challenge: The Earth Information Jukebox Resources](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/?tab=resources):
- **NASA Earth Observatory / MODIS & VIIRS True-Color Imagery (Terra / Aqua / Suomi NPP):**  
  [https://earthobservatory.nasa.gov](https://earthobservatory.nasa.gov) — High-resolution base terrain and 10 individual storm vortex satellite covers.
- **NASA SVS #5669:**  
  [https://svs.gsfc.nasa.gov/5669](https://svs.gsfc.nasa.gov/5669) — GEOS-FP Global Aerosols & Western Pacific typhoons.
- **NASA SVS #4960:**  
  [https://svs.gsfc.nasa.gov/4960](https://svs.gsfc.nasa.gov/4960) — IMERG Global Precipitation & Atmospheric River moisture transport.
- **NASA SVS #5313:**  
  [https://svs.gsfc.nasa.gov/5313](https://svs.gsfc.nasa.gov/5313) — Black Marble HD Nighttime Lights for Taiwan urban night illumination.
- **NASA SVS #3912:**  
  [https://svs.gsfc.nasa.gov/3912](https://svs.gsfc.nasa.gov/3912) — ECCO2 Kuroshio Sea Surface Temperatures & Ocean Currents.
- **NASA SVS #5011 & SVS #4950:**  
  ISS LIS lightning flash densities and GEDI forest canopy / elevation models for mountain interactions.
- **NASA GIBS & Worldview:**  
  [https://worldview.earthdata.nasa.gov](https://worldview.earthdata.nasa.gov) — EPSG:4326 GIS coordinate projection for exact landfall tracking.

---

## 🛠️ Technology Stack & Architecture (技術架構)
- **Zero-Dependency Architecture:** Pure Vanilla HTML5, CSS3, and JavaScript (ES6+). Zero build tools, zero external runtime libraries.
- **Web Audio API (`AudioContext` & `OfflineAudioContext`):** Real-time synthesis featuring custom polyphonic oscillators, 4-pole biquad low-pass filters, dynamic waveshaping, algorithmic reverb convolution, and stereo ping-pong delay.
- **Canvas 2D Rendering Engine:** High-DPR Retina support, particle vortex simulation, and phase-synchronized contraction rings.

---

## 🚀 How to Run Locally (本機執行)
Simply double click `index.html` to open in any modern browser, or run a local static server:
```bash
# Python 3
python3 -m http.server 8080

# Open in browser
open http://localhost:8080
```
