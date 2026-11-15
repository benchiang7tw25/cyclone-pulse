/**
 * Cyclone Pulse — Apple Design Edition
 *
 * 核心特色：
 * 1. 純粹 Apple macOS / Apple Weather 視覺語言（動態模糊環境背景、磨砂玻璃材質、SF Pro 大字體排版）
 * 2. 遊戲中「上下左右 (↑ ↓ ← →) 分別代表四種不同樂器音色」，由玩家自由選擇按哪個方向演奏，只要節拍對就得分！
 * 3. 畫面左側即時顯示颱風風速 (m/s)、大氣壓力 (hPa) 與節奏速度 (RPM) 視覺閃燈提示
 * 4. 結算頁面全自動依據颱風數據與玩家選擇的四向音色產出專屬 Demo 音軌 (.WAV)
 */

if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const rad = Math.min(r || 0, w / 2, h / 2);
    this.moveTo(x + rad, y);
    this.arcTo(x + w, y, x + w, y + h, rad);
    this.arcTo(x + w, y + h, x, y + h, rad);
    this.arcTo(x, y + h, x, y, rad);
    this.arcTo(x, y, x + w, y, rad);
    this.closePath();
    return this;
  };
}

class CyclonePulseApp {
  constructor() {
    this.audio = new window.CycloneAudioEngine();
    this.typhoons = window.TYPHOON_DATASETS || [];
    this.selectedTyphoon = this.typhoons[0];

    // 多語言支援：預設為 'EN'（國際評審友善），可隨時點擊切換為 'ZH'（繁體中文）
    this.currentLang = 'EN';

    this.currentScreen = 'SELECT';

    // 遊戲時間與節拍狀態 (38 秒走完完整路徑)
    this.stageDurationSec = 38.0;
    this.elapsedSec = 0;
    this.progress = 0;
    this.isPlaying = false;
    this.stageFinishTimer = 0;

    // 穩定節拍計時器与 RPM 視覺脈衝
    this.beatTimer = 0;
    this.beatIndex = 0;
    this.beatPulseAlpha = 0; // 用於旁邊 RPM 提示燈閃爍

    // 四種方向音色定義（玩家自由選擇，只要節拍對就得分）
    this.instruments = [
      { dir: 'UP', keyLabel: '↑', nameZh: '水晶鐘琴', nameEn: 'Celeste Bell', subZh: '高音泛音', subEn: 'Chime Overtones' },
      { dir: 'LEFT', keyLabel: '←', nameZh: '溫暖電鋼琴', nameEn: 'Warm Rhodes', subZh: '柔和七和弦', subEn: 'Lush 7th Chords' },
      { dir: 'RIGHT', keyLabel: '→', nameZh: '空靈拇指琴', nameEn: 'Kalimba Pluck', subZh: '木質彈撥', subEn: 'Woody Percussion' },
      { dir: 'DOWN', keyLabel: '↓', nameZh: '合成弦樂', nameEn: 'Analog Strings', subZh: '溫暖弦樂', subEn: 'Warm Resonance' }
    ];
    this.activeInstrumentDir = 'UP';
    this.instrumentFlashTime = { UP: 0, LEFT: 0, RIGHT: 0, DOWN: 0 };

    this.beatRings = [];
    this.particles = [];
    this.floatingTexts = [];
    this.lastJudgment = { text: 'Ready', sub: 'Hit ↑ ↓ ← → on beat to play', time: 0 };

    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.stats = { PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0 };
    this.playerHitLog = [];

    // 多種極具特色的音樂編曲風格（供結算頁面「換一版編曲」循環切換）
    this.arrangementStyles = ['pentatonic', 'techno', 'dnb', 'synthwave', 'lofi', 'ambient'];
    this.currentArrangementIndex = 0;
    this.musicSeed = Math.floor(Math.random() * 9000) + 1000;
    this.generatedWav = null;

    this.images = {};
    this.vortexSpriteCanvas = null;
    this.vortexRotation = 0;

    this.gameCanvas = document.getElementById('gameMapCanvas');
    this.gameCtx = this.gameCanvas.getContext('2d');
    this.mapRect = { x: 0, y: 0, w: 800, h: 600, screenW: 800, screenH: 600 };
    this.uiButtons = {
      finishBtn: { x: 0, y: 0, w: 0, h: 0 },
      muteBtn: { x: 0, y: 0, w: 0, h: 0 },
      instPads: [] // 畫面下方四顆音色選擇按鈕熱區
    };

    this._initAssets();
    this._initSelectScreen();
    this._bindEvents();
    this._resizeGameCanvas();
    this._updateLanguageUI();

    this.lastFrameTime = performance.now();
    requestAnimationFrame((ts) => this._loop(ts));
  }

  toggleLanguage() {
    this.currentLang = this.currentLang === 'EN' ? 'ZH' : 'EN';
    this._updateLanguageUI();
    this._initSelectScreen();
    this._updateHeroBanner();
    if (this.currentScreen === 'RESULT') {
      const ty = this.selectedTyphoon;
      const totalNotes = this.stats.PERFECT + this.stats.GREAT + this.stats.GOOD + this.stats.MISS;
      const weightedHits = this.stats.PERFECT * 1.0 + this.stats.GREAT * 0.82 + this.stats.GOOD * 0.55;
      const accuracy = totalNotes > 0 ? Math.round((weightedHits / totalNotes) * 100) : 100;
      let rank = 'B';
      if (accuracy >= 85 && this.score >= 2800) rank = 'S';
      else if (accuracy >= 68 || this.score >= 1600) rank = 'A';
      else if (accuracy < 40 && totalNotes > 6) rank = 'C';
      document.getElementById('resCritiqueText').textContent = this._buildCritiqueText(ty, rank, accuracy, this.maxCombo);
    }
  }

  setLanguage(lang = 'EN') {
    this.currentLang = lang;
    this._updateLanguageUI();
    this._initSelectScreen();
    this._updateHeroBanner();
  }

  _updateLanguageUI() {
    const isEn = this.currentLang === 'EN';
    // 按鈕文字：清楚標示「點擊後要切換到的目標語言」
    const langBtnText = isEn ? '🌐 繁體中文' : '🌐 English';
    const toggleBtn1 = document.getElementById('btnLangToggle');
    const toggleBtn2 = document.getElementById('btnLangToggleResult');
    if (toggleBtn1) toggleBtn1.textContent = langBtnText;
    if (toggleBtn2) toggleBtn2.textContent = langBtnText;

    // 關卡畫面標籤
    const el = (id) => document.getElementById(id);
    if (el('btnOpenRules')) el('btnOpenRules').textContent = isEn ? 'Rules' : '規則';
    if (el('btnMuteSelect')) {
      el('btnMuteSelect').textContent = this.audio.isMuted
        ? (isEn ? 'Sound: Muted' : '聲音：靜音')
        : (isEn ? 'Sound: ON' : '聲音：開啟');
    }
    if (el('lblHeroWind')) el('lblHeroWind').textContent = isEn ? 'MAX WIND' : '最大風速';
    if (el('lblHeroPressure')) el('lblHeroPressure').textContent = isEn ? 'PRESSURE' : '中心氣壓';
    if (el('lblHeroLandfall')) el('lblHeroLandfall').textContent = isEn ? 'LANDFALL' : '登陸地點';
    if (el('btnStartStageText')) el('btnStartStageText').textContent = isEn ? 'Start Experience' : '開始體驗';
    if (el('lblSatMedia')) el('lblSatMedia').textContent = isEn ? 'Satellite Imagery' : '衛星雲圖';
    if (el('lblTrackMedia')) el('lblTrackMedia').textContent = isEn ? 'Landfall Track' : '侵台路徑';
    if (el('shelfHeaderTitle')) el('shelfHeaderTitle').textContent = isEn ? 'Historical Landfall Typhoons' : '歷史登陸颱風';

    // 規則視窗
    if (el('rulesModalTitle')) el('rulesModalTitle').textContent = isEn ? 'How to Play' : '遊玩方式';
    if (el('ruleRowTitle1')) el('ruleRowTitle1').textContent = isEn ? 'Follow the Beat, Choose 4 Instruments Freely' : '跟隨節拍圈，自由選擇四種音色';
    if (el('ruleRowDesc1')) {
      el('ruleRowDesc1').innerHTML = isEn
        ? 'When the white ring contracts to the typhoon eye, <strong>any hit on beat scores!</strong> Freely press <strong>↑ (Celeste Bell)</strong>, <strong>← (Warm Rhodes)</strong>, <strong>→ (Kalimba)</strong>, or <strong>↓ (Analog Strings)</strong>.'
        : '當白色節拍圈收縮至颱風眼中心時，<strong>只要拍點對就得分</strong>。你可以自由按下 <strong>↑（水晶鐘琴）</strong>、<strong>←（溫暖電鋼琴）</strong>、<strong>→（空靈拇指琴）</strong> 或 <strong>↓（合成弦樂）</strong> 演奏不同音色。';
    }
    if (el('ruleRowTitle2')) el('ruleRowTitle2').textContent = isEn ? 'Wind Speed (m/s) & RPM Tempo' : '風速 (m/s) 與 RPM 節奏速度';
    if (el('ruleRowDesc2')) {
      el('ruleRowDesc2').innerHTML = isEn
        ? 'The left HUD shows real-time Wind Speed (m/s), Pressure (hPa), and <strong>rhythmic tempo (RPM)</strong> with dynamic beat LEDs.'
        : '畫面左側會即時顯示颱風最大風速（m/s）、大氣壓力（hPa）以及當前的<strong>節奏速度（RPM）</strong>與節拍指示燈。';
    }
    if (el('ruleRowTitle3')) el('ruleRowTitle3').textContent = isEn ? 'Automated Personalized Demo Audio' : '自動產出個人化 Demo 音訊';
    if (el('ruleRowDesc3')) {
      el('ruleRowDesc3').innerHTML = isEn
        ? 'Upon finishing, the system automatically synthesizes a studio-grade .WAV demo embedding the typhoon telemetry and your instrument choices.'
        : '觀測結束後，系統會根據颱風路徑數據與你本局選擇的四種音色，自動合成專屬的 Demo 音樂供試聽與下載。';
    }
    if (el('btnCloseRules')) el('btnCloseRules').textContent = isEn ? 'Done' : '完成';

    // 結算畫面
    if (el('btnReplaySame')) el('btnReplaySame').textContent = isEn ? 'Play Again' : '再玩一次';
    if (el('btnBackToSelect')) el('btnBackToSelect').textContent = isEn ? 'All Typhoons' : '所有颱風';
    if (el('lblPerfHeading')) el('lblPerfHeading').textContent = isEn ? 'Performance Summary' : '表現摘要';
    if (el('lblSmsScore')) el('lblSmsScore').textContent = isEn ? 'Score' : '分數';
    if (el('lblMaxCombo')) el('lblMaxCombo').textContent = isEn ? 'Max Combo' : '最大連擊';
    if (el('lblAccuracy')) el('lblAccuracy').textContent = isEn ? 'Accuracy' : '節拍準確率';
    if (el('lblDemoHeading')) el('lblDemoHeading').textContent = isEn ? 'Atmospheric Soundscape Demo' : '專屬氣象聲景 Demo';
    if (el('resAutoMusicDesc')) {
      el('resAutoMusicDesc').textContent = isEn
        ? 'Automatically synthesized from storm pressure, wind speed, and your 4-way instrument inputs.'
        : '已根據本場颱風氣壓、風速與你演奏的四向音色自動合成。';
    }
    if (el('btnRegenerateMusic')) el('btnRegenerateMusic').textContent = isEn ? 'New Arrangement' : '換一版編曲';
    if (el('btnDownloadWav')) el('btnDownloadWav').textContent = isEn ? 'Download Audio (.WAV)' : '下載音訊 (.WAV)';
  }

  _initAssets() {
    const loadImg = (key, path, onLoadCallback) => {
      const img = new Image();
      if (onLoadCallback) {
        img.onload = () => onLoadCallback(img);
      }
      const embeddedDataUri = window.NASA_ASSET_DATA_URIS && window.NASA_ASSET_DATA_URIS[path];
      img.src = embeddedDataUri || path;
      this.images[key] = img;
    };

    const cfg = window.NASA_CONFIG.assets;
    loadImg('taiwanBase', cfg.taiwanBase, () => {
      this._drawHeroTrackPreview();
    });

    loadImg('vortexReal', cfg.vortexReal, (img) => {
      this._prepareVortexSprite(img);
    });

    this.typhoons.forEach((ty) => {
      loadImg(`ty_${ty.id}`, ty.satelliteSwath);
    });
  }

  _prepareVortexSprite(img) {
    try {
      const size = 380;
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const octx = off.getContext('2d');

      octx.drawImage(img, 0, 0, size, size);
      const imgData = octx.getImageData(0, 0, size, size);
      const d = imgData.data;
      const cx = size / 2;
      const cy = size / 2;
      const maxR = size / 2;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          const r = d[idx];
          const g = d[idx + 1];
          const b = d[idx + 2];

          const dx = x - cx;
          const dy = y - cy;
          const distNorm = Math.sqrt(dx * dx + dy * dy) / maxR;

          if (distNorm >= 1.0) {
            d[idx + 3] = 0;
            continue;
          }

          const radialMask = Math.pow(1.0 - distNorm, 1.45);
          const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const cloudness = Math.max(0, (luma - 0.16) / 0.84);
          const eyeHole = distNorm < 0.08 ? distNorm / 0.08 : 1.0;

          d[idx] = Math.min(255, Math.round(r * 1.05));
          d[idx + 1] = Math.min(255, Math.round(g * 1.08));
          d[idx + 2] = Math.min(255, Math.round(b * 1.12));
          d[idx + 3] = Math.min(255, Math.round(cloudness * radialMask * eyeHole * 255));
        }
      }

      octx.putImageData(imgData, 0, 0);
      this.vortexSpriteCanvas = off;
    } catch (err) {
      this.vortexSpriteCanvas = null;
    }
  }

  /**
   * 階段 1：初始化 10 個登陸台灣的歷史颱風陳列架
   */
  _initSelectScreen() {
    const grid = document.getElementById('typhoonGrid');
    grid.innerHTML = '';
    const isEn = this.currentLang === 'EN';

    this.typhoons.forEach((ty) => {
      const card = document.createElement('div');
      card.className = `ty-card ${ty.id === this.selectedTyphoon.id ? 'active' : ''}`;
      card.dataset.id = ty.id;

      const dateOnly = isEn
        ? ty.landfallDate.split(' ')[0]
        : (ty.landfallDateZh || ty.landfallDate).split(' ')[0];

      const locName = isEn ? ty.landfallLocationEn || ty.landfallLocation : ty.landfallLocation;
      const primaryName = isEn ? ty.nameEn : ty.nameZh;
      const subName = isEn ? `${ty.year} · ${ty.intensityLabelEn || 'Typhoon'}` : ty.nameEn;

      card.innerHTML = `
        <div class="ty-card-top">
          <span class="ty-card-name">${primaryName}</span>
          <span class="ty-card-year">${subName}</span>
        </div>
        <div class="ty-card-date">${dateOnly} · ${locName}</div>
        <div class="ty-card-metrics">
          <span>${ty.maxWindMs} m/s</span>
          <span>${ty.minPressureHpa} hPa</span>
        </div>
      `;

      card.addEventListener('click', () => {
        this._selectTyphoon(ty);
      });

      grid.appendChild(card);
    });

    this._updateHeroBanner();
  }

  _selectTyphoon(ty) {
    this.selectedTyphoon = ty;
    document.querySelectorAll('.ty-card').forEach((el) => {
      el.classList.toggle('active', el.dataset.id === ty.id);
    });
    this._updateHeroBanner();
  }

  _updateHeroBanner() {
    const ty = this.selectedTyphoon;
    if (!ty) return;
    const isEn = this.currentLang === 'EN';

    const embeddedUri = window.NASA_ASSET_DATA_URIS && window.NASA_ASSET_DATA_URIS[ty.satelliteSwath];
    const imgSrc = embeddedUri || ty.satelliteSwath;

    const heroImg = document.getElementById('heroSatImg');
    if (heroImg) heroImg.src = imgSrc;

    const wallpaper = document.getElementById('ambientWallpaper');
    if (wallpaper) {
      wallpaper.style.backgroundImage = `url("${imgSrc}")`;
    }

    const titleStr = isEn ? `${ty.nameEn} Typhoon` : `${ty.nameZh} ${ty.nameEn}`;
    const intensityStr = isEn ? ty.intensityLabelEn || 'Moderate Typhoon' : ty.intensityLabel;
    const dateStr = isEn
      ? `${ty.landfallDate} Landfall at ${ty.landfallLocationEn || ty.landfallLocation}`
      : `${ty.landfallDateZh || ty.landfallDate} 登陸${ty.landfallLocation}`;
    const introStr = isEn ? ty.introEn || ty.intro : ty.intro;
    const locStr = isEn ? ty.landfallLocationEn || ty.landfallLocation : ty.landfallLocation;

    document.getElementById('heroName').textContent = titleStr;
    document.getElementById('heroIntensity').textContent = intensityStr;
    document.getElementById('heroLandfallTime').textContent = dateStr;
    document.getElementById('heroWind').textContent = `${ty.maxWindMs}`;
    document.getElementById('heroPressure').textContent = `${ty.minPressureHpa}`;
    document.getElementById('heroLandfall').textContent = locStr;
    document.getElementById('heroIntro').textContent = introStr;

    this._drawHeroTrackPreview();
  }

  _drawHeroTrackPreview() {
    const canvas = document.getElementById('heroTrackPreview');
    if (!canvas || !this.selectedTyphoon) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#08090c';
    ctx.fillRect(0, 0, w, h);

    if (this.images.taiwanBase && this.images.taiwanBase.complete) {
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.drawImage(this.images.taiwanBase, 0, 0, w, h);
      ctx.restore();
    }

    const bbox = window.NASA_CONFIG.bbox;
    const project = (lon, lat) => ({
      x: ((lon - bbox.minLon) / (bbox.maxLon - bbox.minLon)) * w,
      y: ((bbox.maxLat - lat) / (bbox.maxLat - bbox.minLat)) * h
    });

    const nodes = this.selectedTyphoon.track;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    nodes.forEach((pt, idx) => {
      const p = project(pt.lon, pt.lat);
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    nodes.forEach((pt) => {
      const p = project(pt.lon, pt.lat);
      ctx.beginPath();
      ctx.arc(p.x, p.y, pt.isLandfall ? 4.5 : 2.2, 0, Math.PI * 2);
      ctx.fillStyle = pt.isLandfall ? '#ff453a' : '#ffffff';
      ctx.fill();
    });
    ctx.restore();
  }

  _switchScreen(screenName) {
    this.currentScreen = screenName;
    document.getElementById('screenSelect').classList.toggle('active', screenName === 'SELECT');
    document.getElementById('screenGame').classList.toggle('active', screenName === 'GAME');
    document.getElementById('screenResult').classList.toggle('active', screenName === 'RESULT');

    if (screenName === 'GAME') {
      this._resizeGameCanvas();
    }
  }

  /**
   * 階段 2：啟動全螢幕單一地圖遊戲
   */
  startStage() {
    this.elapsedSec = 0;
    this.progress = 0;
    this.isPlaying = true;
    this.stageFinishTimer = 0;

    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.stats = { PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0 };
    this.playerHitLog = [];
    this.beatRings = [];
    this.particles = [];
    this.floatingTexts = [];
    this.lastJudgment = {
      text: '開始',
      sub: '當白圈收縮至颱風眼時，任選 ↑ ↓ ← → 演奏音色',
      time: performance.now()
    };

    this._switchScreen('GAME');

    try {
      const styleKey = (this.selectedTyphoon && this.selectedTyphoon.defaultStyle) || 'pentatonic';
      this.audio.startAmbient(styleKey);
    } catch (err) {
      console.warn('Audio start warning:', err);
    }

    const state = this._updateRealtimeMeteoAudio();
    this.musicalBeatPos = 0;
    this.lastTriggeredBeatIndex = -1;
    this.currentBeatInBar = 1;
    this.currentMoveSpeedMult = (this.audio.params && this.audio.params.moveSpeedMult) || 1.0;

    // 預先建立前 2 拍 (targetBeat = 1, 2) 的收縮節拍圈，讓第 1 拍與第 2 拍從開場就 100% 鎖定在正拍點上
    this._spawnRingForTargetBeat(1);
    this._spawnRingForTargetBeat(2);
    this._onMusicalBeat(0);
  }

  _spawnRingForTargetBeat(targetBeat) {
    if (this.progress >= 0.97) return;
    const beatInBar = (targetBeat % 4) + 1; // 1, 2, 3, 4
    this.beatRings.push({
      id: targetBeat,
      spawnBeat: targetBeat - 2.0, // 提前整整 2 拍開始收縮，保證在 targetBeat 整數拍點時 t === 1.000
      targetBeat,
      beatInBar,
      isDownbeat: beatInBar === 1,
      hit: false,
      missed: false
    });
  }

  /**
   * 4/4 拍主時鐘節拍觸發器（一小節四拍：1 - 2 - 3 - 4）：
   * - 音訊節拍、HUD 拍號燈、與收縮圈抵達暴風眼中心的時間點 100% 鎖定在同一整數拍 (beatIndex)
   */
  _onMusicalBeat(beatIndex) {
    const beatInBar = (beatIndex % 4) + 1; // 1, 2, 3, 4
    this.currentBeatInBar = beatInBar;
    this.beatPulseAlpha = 1.0;
    this.audio.triggerDataBeat(beatIndex);

    // 觸發當前第 beatIndex 拍的同時，預先產生第 (beatIndex + 2) 拍的收縮圈
    this._spawnRingForTargetBeat(beatIndex + 2);
  }

  /**
   * 階段 3：結束遊戲並全自動生成專屬 Demo 音樂
   */
  async finishStage() {
    if (this.currentScreen === 'RESULT') return;
    this.isPlaying = false;
    this.audio.stop();

    this._switchScreen('RESULT');

    const ty = this.selectedTyphoon;
    document.getElementById('resTyphoonTitle').textContent = `${ty.nameZh} ${ty.nameEn}`;

    const totalNotes =
      this.stats.PERFECT + this.stats.GREAT + this.stats.GOOD + this.stats.MISS;
    const weightedHits =
      this.stats.PERFECT * 1.0 + this.stats.GREAT * 0.82 + this.stats.GOOD * 0.55;
    const accuracy = totalNotes > 0 ? Math.round((weightedHits / totalNotes) * 100) : 100;

    let rank = 'B';
    if (accuracy >= 85 && this.score >= 2800) rank = 'S';
    else if (accuracy >= 68 || this.score >= 1600) rank = 'A';
    else if (accuracy < 40 && totalNotes > 6) rank = 'C';

    document.getElementById('resRankBadge').textContent = rank;
    document.getElementById('resScoreVal').textContent = this.score.toLocaleString();
    document.getElementById('resMaxCombo').textContent = `${this.maxCombo}`;
    document.getElementById('resAccuracy').textContent = `${accuracy}%`;

    document.getElementById('resPerf').textContent = this.stats.PERFECT;
    document.getElementById('resGreat').textContent = this.stats.GREAT;
    document.getElementById('resGood').textContent = this.stats.GOOD;
    document.getElementById('resMiss').textContent = this.stats.MISS;

    document.getElementById('resCritiqueText').textContent = this._buildCritiqueText(
      ty,
      rank,
      accuracy,
      this.maxCombo
    );

    const defaultIdx = this.arrangementStyles.indexOf(ty.defaultStyle);
    this.currentArrangementIndex = defaultIdx >= 0 ? defaultIdx : 0;
    this.musicSeed = Math.floor(Math.random() * 9000) + 1000;
    await this._autoGenerateDemoMusic();
  }

  _buildCritiqueText(ty, rank, accuracy, maxCombo) {
    const isEn = this.currentLang === 'EN';
    const counts = { UP: 0, LEFT: 0, RIGHT: 0, DOWN: 0 };
    this.playerHitLog.forEach((h) => {
      if (counts[h.direction] !== undefined) counts[h.direction] += 1;
    });

    const favDir = Object.keys(counts).reduce((a, b) => (counts[a] >= counts[b] ? a : b), 'UP');
    const instNames = {
      UP: isEn ? 'Celeste Bell' : '水晶鐘琴',
      LEFT: isEn ? 'Warm Rhodes' : '溫暖電鋼琴',
      RIGHT: isEn ? 'Kalimba Pluck' : '空靈拇指琴',
      DOWN: isEn ? 'Analog Strings' : '合成弦樂'
    };

    const dateStr = isEn ? ty.landfallDate : (ty.landfallDateZh || ty.landfallDate);
    const locStr = isEn ? (ty.landfallLocationEn || ty.landfallLocation) : ty.landfallLocation;
    const tyName = isEn ? ty.nameEn : ty.nameZh;

    if (isEn) {
      if (rank === 'S' || rank === 'A') {
        return `During the meteorological tracking of Typhoon ${tyName} (landfall on ${dateStr} at ${locStr}, peak wind ${ty.maxWindMs} m/s), you achieved ${accuracy}% beat accuracy with a ${maxCombo} combo, composing an evocative atmospheric soundscape spotlighting the "${instNames[favDir]}".`;
      }
      return `Soundscape observation of Typhoon ${tyName} (landfall on ${dateStr} at ${locStr}, central pressure ${ty.minPressureHpa} hPa) is complete. The system has automatically synthesized your performance across "${instNames[favDir]}" and other instruments into the demo soundtrack.`;
    }

    if (rank === 'S' || rank === 'A') {
      return `你在 ${ty.nameZh}（${dateStr} 登陸${ty.landfallLocation}，最大風速 ${ty.maxWindMs} m/s）的路徑觀測中達成 ${accuracy}% 節拍準確率與 ${maxCombo} 連擊，並以「${instNames[favDir]}」為主軸譜出了極具個人風格的氣象聲景。`;
    }
    return `已完成 ${ty.nameZh}（${dateStr} 登陸${ty.landfallLocation}，氣壓 ${ty.minPressureHpa} hPa）的聲景採集。系統已將你演奏的「${instNames[favDir]}」等四向音色自動合成為右側的專屬 Demo 音軌。`;
  }

  async _autoGenerateDemoMusic() {
    const ty = this.selectedTyphoon;
    const isEn = this.currentLang === 'EN';
    const statusEl = document.getElementById('trackStatusLabel');
    const descEl = document.getElementById('resAutoMusicDesc');
    const playerEl = document.getElementById('resultAudioPlayer');
    const btnRegen = document.getElementById('btnRegenerateMusic');

    if (btnRegen) {
      btnRegen.disabled = true;
      btnRegen.style.opacity = '0.6';
    }
    if (statusEl) {
      statusEl.textContent = isEn ? 'Synthesizing new arrangement...' : '正在合成全新編曲...';
    }

    const chosenStyle =
      this.arrangementStyles[this.currentArrangementIndex % this.arrangementStyles.length] ||
      ty.defaultStyle ||
      'pentatonic';

    const effectiveHits =
      this.playerHitLog.length >= 4
        ? this.playerHitLog
        : this._createSeededFallbackHits(this.musicSeed);

    const res = await this.audio.renderPersonalizedSoundtrack(ty, {
      style: chosenStyle,
      playerHitLog: effectiveHits,
      seed: this.musicSeed
    });

    this.generatedWav = res;
    if (playerEl) {
      playerEl.src = res.url;
      playerEl.load();
      playerEl.play().catch(() => {});
    }

    const styleName = isEn ? (res.styleMeta?.en || chosenStyle) : (res.styleMeta?.zh || chosenStyle);
    if (statusEl) {
      statusEl.textContent = `[${styleName}] ${res.filename}`;
    }

    if (descEl) {
      descEl.textContent = isEn
        ? `Arrangement Style: ${styleName}. Synthesized from Typhoon ${ty.nameEn}'s wind speed (${ty.maxWindMs} m/s) and your notes.`
        : `當前編曲風格：${styleName}。已結合 ${ty.nameZh} 實測風速 (${ty.maxWindMs} m/s)、氣壓與你演奏的音色即時轉換和弦與節奏。`;
    }

    this._drawWaveform(res.waveformPeaks, effectiveHits);
    if (btnRegen) {
      btnRegen.disabled = false;
      btnRegen.style.opacity = '1';
    }
  }

  _createSeededFallbackHits(seed) {
    const dirs = ['UP', 'LEFT', 'RIGHT', 'DOWN'];
    const list = [];
    for (let i = 0; i < 14; i++) {
      const timeNorm = (i + 0.5) / 14;
      const dir = dirs[(seed + i) % dirs.length];
      list.push({ timeNorm, direction: dir, judgment: 'PERFECT' });
    }
    return list;
  }

  _drawWaveform(peaks = [], hits = []) {
    const canvas = document.getElementById('waveformCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const barW = w / Math.max(1, peaks.length);
    peaks.forEach((pk, idx) => {
      const barH = Math.max(4, pk * (h * 0.78));
      const x = idx * barW;
      const y = (h - barH) / 2;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
      ctx.beginPath();
      ctx.roundRect(x + 1, y, Math.max(2, barW - 2.2), barH, 2);
      ctx.fill();
    });

    hits.forEach((hit) => {
      const hx = Math.max(4, Math.min(w - 4, hit.timeNorm * w));
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(hx, 8, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  _getInterpolatedState() {
    const nodes = this.selectedTyphoon.track;
    const exactIdx = this.progress * (nodes.length - 1);
    const idx0 = Math.floor(exactIdx);
    const idx1 = Math.min(nodes.length - 1, idx0 + 1);
    const frac = exactIdx - idx0;

    const n0 = nodes[idx0];
    const n1 = nodes[idx1];
    const lerp = (a, b, t) => a + (b - a) * t;

    return {
      nodeIndex: idx0,
      timeLabel: n0.time,
      phase: n0.phase,
      isLandfall: Boolean(n0.isLandfall),
      isMountain: Boolean(n0.isMountain),
      lon: lerp(n0.lon, n1.lon, frac),
      lat: lerp(n0.lat, n1.lat, frac),
      pressureHpa: Math.round(lerp(n0.pressureHpa, n1.pressureHpa, frac)),
      windSpeedMs: Number(lerp(n0.windSpeedMs, n1.windSpeedMs, frac).toFixed(1)),
      cloudTopTempC: Math.round(lerp(n0.cloudTopTempC, n1.cloudTopTempC, frac)),
      terrainM: Math.round(lerp(n0.terrainM, n1.terrainM, frac))
    };
  }

  _updateRealtimeMeteoAudio() {
    const state = this._getInterpolatedState();
    this.audio.updateMeteorology(state);
    return state;
  }

  _bindEvents() {
    window.addEventListener('resize', () => this._resizeGameCanvas());

    const toggleLangHandler = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      this.toggleLanguage();
    };
    const btnL1 = document.getElementById('btnLangToggle');
    const btnL2 = document.getElementById('btnLangToggleResult');
    if (btnL1) {
      btnL1.onclick = toggleLangHandler;
    }
    if (btnL2) {
      btnL2.onclick = toggleLangHandler;
    }

    const rulesModal = document.getElementById('rulesModal');
    const openRules = () => rulesModal.classList.add('open');
    const closeRules = () => rulesModal.classList.remove('open');

    document.getElementById('btnOpenRules').addEventListener('click', openRules);
    document.getElementById('btnCloseRules').addEventListener('click', closeRules);
    document.getElementById('btnCloseRulesTop').addEventListener('click', closeRules);
    rulesModal.addEventListener('click', (e) => {
      if (e.target === rulesModal) closeRules();
    });

    document.getElementById('btnStartStage').addEventListener('click', () => {
      this.startStage();
    });

    const muteBtnSelect = document.getElementById('btnMuteSelect');
    muteBtnSelect.addEventListener('click', () => {
      this.audio.init();
      const muted = this.audio.toggleMute();
      muteBtnSelect.textContent = muted ? '聲音：靜音' : '聲音：開啟';
    });

    // 階段 2：點擊全螢幕地圖（可點擊右上角結算/靜音、下方四顆音色鍵、或直接點擊畫面打節拍）
    this.gameCanvas.addEventListener('pointerdown', (e) => {
      if (this.currentScreen !== 'GAME') return;
      const rect = this.gameCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const fb = this.uiButtons.finishBtn;
      if (x >= fb.x && x <= fb.x + fb.w && y >= fb.y && y <= fb.y + fb.h) {
        this.finishStage();
        return;
      }

      const mb = this.uiButtons.muteBtn;
      if (x >= mb.x && x <= mb.x + mb.w && y >= mb.y && y <= mb.y + mb.h) {
        this.audio.toggleMute();
        return;
      }

      // 檢查是否點擊下方四顆音色選擇鍵
      for (const pad of this.uiButtons.instPads) {
        if (x >= pad.x && x <= pad.x + pad.w && y >= pad.y && y <= pad.y + pad.h) {
          this._handlePlayerBeatInput(pad.dir);
          return;
        }
      }

      // 點擊畫面其他區域：使用當前選中的音色打節拍
      this._handlePlayerBeatInput(this.activeInstrumentDir);
    });

    // 階段 2：鍵盤輸入（↑ ↓ ← → 分別代表四種不同音色，只要節拍對就得分！）
    window.addEventListener('keydown', (e) => {
      if (this.currentScreen !== 'GAME') return;

      if (e.code === 'Escape') {
        e.preventDefault();
        this.finishStage();
        return;
      }

      const keyMap = {
        ArrowUp: 'UP',
        KeyW: 'UP',
        ArrowLeft: 'LEFT',
        KeyA: 'LEFT',
        ArrowRight: 'RIGHT',
        KeyD: 'RIGHT',
        ArrowDown: 'DOWN',
        KeyS: 'DOWN',
        Space: this.activeInstrumentDir,
        Enter: this.activeInstrumentDir
      };

      const chosenDir = keyMap[e.code];
      if (!chosenDir) return;
      e.preventDefault();
      this._handlePlayerBeatInput(chosenDir);
    });

    // 階段 3：結算按鈕
    document.getElementById('btnReplaySame').addEventListener('click', () => {
      this.startStage();
    });

    document.getElementById('btnBackToSelect').addEventListener('click', () => {
      this._switchScreen('SELECT');
    });

    document.getElementById('btnRegenerateMusic').addEventListener('click', async () => {
      this.currentArrangementIndex++;
      this.musicSeed = Math.floor(Math.random() * 90000) + 1000;
      await this._autoGenerateDemoMusic();
    });

    document.getElementById('btnDownloadWav').addEventListener('click', () => {
      if (!this.generatedWav) return;
      const a = document.createElement('a');
      a.href = this.generatedWav.url;
      a.download = this.generatedWav.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  /**
   * 玩家按下 ↑ ↓ ← → 任一音色鍵時的判定：
   * 只要節拍對就得分（不限制按哪個方向），並立即演奏對應方向的專屬音色！
   */
  _handlePlayerBeatInput(chosenDir = 'UP') {
    if (!this.isPlaying) return;
    const now = performance.now();
    this.activeInstrumentDir = chosenDir;
    this.instrumentFlashTime[chosenDir] = now;

    const state = this._getInterpolatedState();
    const eyePos = this._lonLatToScreen(state.lon, state.lat);

    const instObj = this.instruments.find((i) => i.dir === chosenDir) || this.instruments[0];

    const bpm = (this.audio.params && this.audio.params.bpm) || 116;
    const msPerBeat = 60000 / bpm;

    let bestRing = null;
    let minAbsDiffMs = Infinity;

    for (const ring of this.beatRings) {
      if (ring.hit || ring.missed) continue;
      // 使用主時鐘拍數差 (targetBeat - musicalBeatPos) 換算毫秒誤差，與音樂拍點 100% 同步
      const beatDiff = Math.abs(ring.targetBeat - this.musicalBeatPos);
      const diffMs = beatDiff * msPerBeat;
      if (diffMs < minAbsDiffMs) {
        minAbsDiffMs = diffMs;
        bestRing = ring;
      }
    }

    // 若在非拍點時間自由彈奏，仍發聲並加分
    if (!bestRing || minAbsDiffMs > 460) {
      this.score += 60;
      this.stats.GOOD += 1;
      this.audio.triggerPlayerHit('GOOD', chosenDir);
      this.playerHitLog.push({
        timeNorm: this.progress,
        direction: chosenDir,
        judgment: 'GOOD'
      });
      this.lastJudgment = {
        text: 'GOOD',
        sub: `${instObj.keyLabel} ${instObj.name} +60`,
        time: now
      };
      this._spawnHitParticles(eyePos.x, eyePos.y, '#ffffff', 8);
      return;
    }

    bestRing.hit = true;

    let judgment = 'GOOD';
    let basePoints = 160;

    if (minAbsDiffMs <= 145) {
      judgment = 'PERFECT';
      basePoints = 360;
    } else if (minAbsDiffMs <= 285) {
      judgment = 'GREAT';
      basePoints = 250;
    }

    this.combo += 1;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.stats[judgment] += 1;

    const gained = Math.round(basePoints * (1 + Math.min(1.5, this.combo * 0.04)));
    this.score += gained;

    this.playerHitLog.push({
      timeNorm: this.progress,
      direction: chosenDir,
      judgment
    });

    this.audio.triggerPlayerHit(judgment, chosenDir);
    this.lastJudgment = {
      text: judgment,
      sub: `${instObj.keyLabel} ${instObj.name} +${gained}`,
      time: now
    };

    this._spawnHitParticles(eyePos.x, eyePos.y, '#ffffff', judgment === 'PERFECT' ? 20 : 12);
    this.floatingTexts.push({
      x: eyePos.x,
      y: eyePos.y - 54,
      text: `${judgment} · ${instObj.name}`,
      alpha: 1.0,
      vy: -1.4
    });
  }

  _spawnHitParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.25;
      const spd = 1.6 + Math.random() * 3.4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        radius: 2 + Math.random() * 2,
        color,
        alpha: 0.9
      });
    }
  }

  _resizeGameCanvas() {
    if (!this.gameCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.gameCanvas.width = Math.floor(w * dpr);
    this.gameCanvas.height = Math.floor(h * dpr);
    this.gameCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const targetAspect = 9.0 / 7.4;
    const screenAspect = w / h;

    let drawW = w;
    let drawH = h;
    if (screenAspect > targetAspect) {
      drawH = h;
      drawW = h * targetAspect;
    } else {
      drawW = w;
      drawH = w / targetAspect;
    }

    const leftHudShift = w > 900 ? 110 : 0;
    this.mapRect = {
      x: (w - drawW) / 2 + leftHudShift,
      y: (h - drawH) / 2,
      w: drawW,
      h: drawH,
      screenW: w,
      screenH: h
    };
  }

  _lonLatToScreen(lon, lat) {
    const bbox = window.NASA_CONFIG.bbox;
    const nx = (lon - bbox.minLon) / (bbox.maxLon - bbox.minLon);
    const ny = (bbox.maxLat - lat) / (bbox.maxLat - bbox.minLat);
    return {
      x: this.mapRect.x + nx * this.mapRect.w,
      y: this.mapRect.y + ny * this.mapRect.h
    };
  }

  _loop(timestamp) {
    requestAnimationFrame((ts) => this._loop(ts));

    const dt = Math.min(0.1, (timestamp - this.lastFrameTime) / 1000);
    this.lastFrameTime = timestamp;

    if (this.currentScreen !== 'GAME') return;

    const state = this._updateRealtimeMeteoAudio();

    if (this.isPlaying) {
      const bpm = (this.audio.params && this.audio.params.bpm) || 116;
      const moveSpeedMult = (this.audio.params && this.audio.params.moveSpeedMult) || 1.0;
      this.currentMoveSpeedMult = moveSpeedMult;

      // 主時鐘：以音樂 BPM 為唯一基準推進拍數相位 (musicalBeatPos)，保證音樂拍點與遊戲收縮圈 100% 鎖定同步
      const beatsDelta = dt * (bpm / 60);
      this.musicalBeatPos += beatsDelta;

      const currentIntBeat = Math.floor(this.musicalBeatPos);
      while (this.lastTriggeredBeatIndex < currentIntBeat) {
        this.lastTriggeredBeatIndex += 1;
        this._onMusicalBeat(this.lastTriggeredBeatIndex);
      }

      this.elapsedSec += dt;
      // 颱風沿路徑移動的速度與音樂節拍推進完全綁定（共約 76 拍走完全程，隨 BPM 與風速倍率同步快慢）
      this.progress = Math.min(1.0, this.progress + (beatsDelta / 76.0) * (0.65 + moveSpeedMult * 0.45));
      this.beatPulseAlpha = Math.max(0, this.beatPulseAlpha - dt * 3.4);

      if (this.progress >= 1.0) {
        this.stageFinishTimer += dt;
        if (this.stageFinishTimer >= 0.7) {
          this.finishStage();
          return;
        }
      }
    }

    this._renderFullScreenGameMap(timestamp, dt, state);
  }

  _renderFullScreenGameMap(now, dt, state) {
    const ctx = this.gameCtx;
    const { screenW: w, screenH: h } = this.mapRect;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    if (this.images.taiwanBase && this.images.taiwanBase.complete) {
      ctx.save();
      ctx.drawImage(
        this.images.taiwanBase,
        this.mapRect.x,
        this.mapRect.y,
        this.mapRect.w,
        this.mapRect.h
      );
      const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.75);
      vig.addColorStop(0, 'rgba(0, 0, 0, 0.05)');
      vig.addColorStop(1, 'rgba(0, 0, 0, 0.72)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    this._drawTyphoonTrackOnMap(ctx);

    const eyePos = this._lonLatToScreen(state.lon, state.lat);
    this._drawSpinningTyphoonVortex(ctx, eyePos.x, eyePos.y, state, dt);
    this._drawBeatRingsAndEffects(ctx, eyePos.x, eyePos.y);
    this._drawAppleGameHUD(ctx, w, h, state);
  }

  _drawTyphoonTrackOnMap(ctx) {
    const nodes = this.selectedTyphoon.track;
    if (!nodes || nodes.length < 2) return;

    ctx.save();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    nodes.forEach((n, idx) => {
      const p = this._lonLatToScreen(n.lon, n.lat);
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    const exactIdx = this.progress * (nodes.length - 1);
    const currentFloorIdx = Math.floor(exactIdx);
    const currentState = this._getInterpolatedState();
    const curPos = this._lonLatToScreen(currentState.lon, currentState.lat);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let i = 0; i <= currentFloorIdx; i++) {
      const p = this._lonLatToScreen(nodes[i].lon, nodes[i].lat);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(curPos.x, curPos.y);
    ctx.stroke();

    nodes.forEach((n, idx) => {
      const p = this._lonLatToScreen(n.lon, n.lat);
      const passed = idx <= currentFloorIdx;

      ctx.beginPath();
      ctx.arc(p.x, p.y, n.isLandfall ? 6.5 : 3.8, 0, Math.PI * 2);
      ctx.fillStyle = n.isLandfall ? '#ff453a' : passed ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
      ctx.fill();

      if (n.isLandfall) {
        ctx.font = '600 12px -apple-system, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`登陸 · ${n.windSpeedMs} m/s`, p.x + 10, p.y + 4);
      }
    });

    ctx.restore();
  }

  _drawSpinningTyphoonVortex(ctx, x, y, state, dt) {
    const metrics = this.audio.getAudioMetrics();
    const windNorm = Math.max(0, Math.min(1.2, (state.windSpeedMs - 15) / 40));
    // 大幅拉開渦旋旋轉角速度差異（弱風 0.35 rad/s 緩轉 ~ 強風 4.6 rad/s 疾轉，超過 13 倍視覺速差）
    const rotSpeed = 0.35 + Math.pow(windNorm, 1.4) * 4.25;
    this.vortexRotation -= dt * rotSpeed;

    // 強風高速移動時產生暴風尾流粒子，強化移動速度體感
    if (this.isPlaying && this.currentMoveSpeedMult > 1.15 && Math.random() < 0.45 * this.currentMoveSpeedMult) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 48;
      this.particles.push({
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        vx: -Math.sin(ang) * (1.2 + windNorm * 2.4),
        vy: Math.cos(ang) * (1.2 + windNorm * 2.4),
        radius: 1.5 + Math.random() * 1.6,
        color: windNorm > 0.75 ? '#64d2ff' : 'rgba(255, 255, 255, 0.75)',
        alpha: 0.65
      });
    }

    const baseRadius = 92 + ((1005 - state.pressureHpa) / 90) * 62;
    const pulseRadius = baseRadius * (1 + metrics.bassEnergy * 0.22);

    ctx.save();
    ctx.translate(x, y);

    if (this.vortexSpriteCanvas) {
      ctx.save();
      ctx.rotate(this.vortexRotation);
      ctx.globalAlpha = 0.88;
      ctx.drawImage(
        this.vortexSpriteCanvas,
        -pulseRadius,
        -pulseRadius,
        pulseRadius * 2,
        pulseRadius * 2
      );
      ctx.restore();
    }

    // 暴風眼中心節拍判定圈 (Target Hit Ring = 44px)
    const targetHitRadius = 44;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, targetHitRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 繪製 4/4 拍收縮節拍圈（一小節四拍：1 - 2 - 3 - 4，與主時鐘 musicalBeatPos 100% 鎖定同步）
   */
  _drawBeatRingsAndEffects(ctx, eyeX, eyeY) {
    const targetHitRadius = 44;
    const startRadius = 178;
    const nowMs = performance.now();

    ctx.save();
    for (const ring of this.beatRings) {
      if (ring.hit || ring.missed) continue;

      // 以音樂拍數相位 (musicalBeatPos) 計算收縮進度 t：
      // 當 musicalBeatPos === ring.targetBeat (正拍點響起瞬間)，t 嚴格等於 1.000
      const leadBeats = Math.max(0.5, ring.targetBeat - ring.spawnBeat);
      const t = (this.musicalBeatPos - ring.spawnBeat) / leadBeats;
      if (t < 0) continue;

      if (t > 1.28) {
        ring.missed = true;
        this.combo = 0;
        this.stats.MISS += 1;
        this.lastJudgment = { text: 'MISS', sub: '稍慢了一點', time: nowMs };
        continue;
      }

      const currentRadius =
        t <= 1.0
          ? startRadius - (startRadius - targetHitRadius) * t
          : targetHitRadius * (1 - (t - 1.0) * 1.4);

      const isHitZone = Math.abs(1.0 - t) <= 0.18;
      const isDownbeat = Boolean(ring.isDownbeat);

      if (isHitZone) {
        ctx.strokeStyle = isDownbeat ? '#64d2ff' : '#ffffff';
        ctx.lineWidth = isDownbeat ? 6.5 : 5;
        ctx.shadowColor = isDownbeat ? 'rgba(100, 210, 255, 0.9)' : 'rgba(255, 255, 255, 0.85)';
        ctx.shadowBlur = 18;
      } else {
        ctx.strokeStyle = isDownbeat ? 'rgba(100, 210, 255, 0.78)' : 'rgba(255, 255, 255, 0.56)';
        ctx.lineWidth = isDownbeat ? 3.4 : 2.2;
      }

      const r = Math.max(6, currentRadius);
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 在收縮圈上方標示小節內拍號 (1 / 2 / 3 / 4)
      if (ring.beatInBar && r > 32) {
        ctx.font = '700 12px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = isDownbeat ? '#64d2ff' : 'rgba(255, 255, 255, 0.85)';
        ctx.fillText(`${ring.beatInBar}`, eyeX, eyeY - r - 5);
      }
    }

    this.beatRings = this.beatRings.filter((r) => !r.hit && !r.missed);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.032;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.026;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  /**
   * 階段 2：繪製 Apple 原生風格 HUD
   * - 左上：風速 (m/s)、大氣壓力 (hPa)、節奏速度 (RPM)、颱風移速倍率 與 4/4 四拍指示燈
   * - 左下：大型「上下左右 (↑ ↓ ← →) 四種音色選擇器」與節拍提示（完全不遮擋颱風路徑）
   * - 右上：分數、連擊與「完成」膠囊按鈕
   */
  _drawAppleGameHUD(ctx, w, h, state) {
    const ty = this.selectedTyphoon;
    const isEn = this.currentLang === 'EN';
    const rpm = (this.audio.params && this.audio.params.rpm) || 116;
    const moveMult = this.currentMoveSpeedMult || 1.0;
    const activeBeat = this.currentBeatInBar || 1;
    const nowMs = performance.now();
    ctx.save();

    // =========================================================================
    // 1. 左上：Apple Weather 風格「氣象數據 + RPM 節奏速度 + 颱風移速 + 四拍指示面板」
    // =========================================================================
    const lx = 28;
    const ly = 22;
    const lw = 264;
    const lh = 252;

    ctx.fillStyle = 'rgba(28, 28, 30, 0.76)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(lx, ly, lw, lh, 24);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 20px -apple-system, sans-serif';
    ctx.fillText(isEn ? `${ty.nameEn}` : `${ty.nameZh}`, lx + 22, ly + 34);

    ctx.fillStyle = 'rgba(235, 235, 245, 0.6)';
    ctx.font = '400 12.5px -apple-system, sans-serif';
    ctx.fillText(isEn ? 'Tracking Vector' : `${state.phase}`, lx + 22, ly + 54);

    // 風速 m/s 與 氣壓 hPa
    ctx.fillStyle = 'rgba(235, 235, 245, 0.45)';
    ctx.font = '500 11.5px -apple-system, sans-serif';
    ctx.fillText(isEn ? 'MAX WIND' : '最大風速', lx + 22, ly + 80);
    ctx.fillText(isEn ? 'PRESSURE' : '中心氣壓', lx + 140, ly + 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    ctx.fillText(`${state.windSpeedMs}`, lx + 22, ly + 108);
    ctx.font = '400 13px -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(235, 235, 245, 0.6)';
    ctx.fillText('m/s', lx + 78, ly + 108);

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    ctx.fillText(`${state.pressureHpa}`, lx + 140, ly + 108);
    ctx.font = '400 13px -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(235, 235, 245, 0.6)';
    ctx.fillText('hPa', lx + 192, ly + 108);

    // 分隔細線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(lx + 22, ly + 124);
    ctx.lineTo(lx + lw - 22, ly + 124);
    ctx.stroke();

    // 遊戲速度 RPM 與 颱風移速倍率 雙欄對比顯示
    ctx.fillStyle = 'rgba(235, 235, 245, 0.5)';
    ctx.font = '500 11.5px -apple-system, sans-serif';
    ctx.fillText(isEn ? 'TEMPO (RPM)' : '音樂節奏 (RPM)', lx + 22, ly + 146);
    ctx.fillText(isEn ? 'SPEED MULT' : '颱風移速倍率', lx + 140, ly + 146);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 28px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    ctx.fillText(`${rpm}`, lx + 22, ly + 178);

    ctx.fillStyle = 'rgba(235, 235, 245, 0.6)';
    ctx.font = '500 12px -apple-system, sans-serif';
    ctx.fillText('RPM', lx + 82, ly + 178);

    const speedStateLabel = isEn
      ? (moveMult >= 1.65 ? 'Sprint' : moveMult >= 0.95 ? 'Cruise' : 'Slow')
      : (moveMult >= 1.65 ? '疾衝' : moveMult >= 0.95 ? '推進' : '緩行');
    ctx.fillStyle = moveMult >= 1.65 ? '#64d2ff' : '#ffffff';
    ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    ctx.fillText(`${moveMult.toFixed(1)}x`, lx + 140, ly + 178);

    ctx.fillStyle = 'rgba(235, 235, 245, 0.65)';
    ctx.font = '500 12px -apple-system, sans-serif';
    ctx.fillText(speedStateLabel, lx + 204, ly + 178);

    // 4/4 拍（一小節四拍：1 - 2 - 3 - 4）動態拍點指示器
    const beatBoxW = (lw - 44 - 18) / 4;
    const beatBoxH = 24;
    const beatBoxY = ly + 192;
    for (let b = 1; b <= 4; b++) {
      const bx = lx + 22 + (b - 1) * (beatBoxW + 6);
      const isCurrent = b === activeBeat;
      ctx.fillStyle = isCurrent
        ? b === 1
          ? '#64d2ff'
          : '#ffffff'
        : 'rgba(255, 255, 255, 0.09)';
      ctx.beginPath();
      ctx.roundRect(bx, beatBoxY, beatBoxW, beatBoxH, 7);
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.fillStyle = isCurrent ? '#000000' : 'rgba(235, 235, 245, 0.55)';
      ctx.font = '700 12px -apple-system, sans-serif';
      ctx.fillText(isEn ? `B${b}` : `${b}拍`, bx + beatBoxW / 2, beatBoxY + 16);
    }

    // 路徑進度細條
    const progW = lw - 44;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.roundRect(lx + 22, ly + 230, progW, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(lx + 22, ly + 230, Math.max(5, progW * this.progress), 5, 2.5);
    ctx.fill();

    // =========================================================================
    // 2. 右上：分數、連擊與操作膠囊
    // =========================================================================
    const rw = 284;
    const rx = w - rw - 28;
    const ry = 22;
    const rh = 128;

    ctx.fillStyle = 'rgba(28, 28, 30, 0.76)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 24);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(235, 235, 245, 0.45)';
    ctx.font = '500 11.5px -apple-system, sans-serif';
    ctx.fillText(isEn ? 'SCORE' : '分數', rx + 22, ry + 28);
    ctx.fillText(isEn ? 'COMBO' : '連擊', rx + 188, ry + 28);

    const scoreStr = this.score.toLocaleString();
    ctx.fillStyle = '#ffffff';
    ctx.font =
      scoreStr.length >= 7
        ? '700 22px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
        : '700 26px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    ctx.fillText(scoreStr, rx + 22, ry + 58, 154);

    ctx.font = '700 26px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    ctx.fillText(`${this.combo}`, rx + 188, ry + 58, 72);

    const btnFinish = { x: rx + 20, y: ry + 78, w: 152, h: 34 };
    const btnMute = { x: rx + 180, y: ry + 78, w: 84, h: 34 };
    this.uiButtons.finishBtn = btnFinish;
    this.uiButtons.muteBtn = btnMute;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(btnFinish.x, btnFinish.y, btnFinish.w, btnFinish.h, 17);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = '600 13px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isEn ? 'Finish & Export' : '完成並產出音樂', btnFinish.x + btnFinish.w / 2, btnFinish.y + 22);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.roundRect(btnMute.x, btnMute.y, btnMute.w, btnMute.h, 17);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '500 12.5px -apple-system, sans-serif';
    ctx.fillText(
      this.audio.isMuted ? (isEn ? 'Muted' : '靜音') : (isEn ? 'Sound' : '聲音開'),
      btnMute.x + btnMute.w / 2,
      btnMute.y + 22
    );

    // =========================================================================
    // 3. 左下側邊欄：Apple 風格「上下左右 四向音色選擇面板 + 節拍提示」
    // =========================================================================
    const dockX = lx;
    const dockY = ly + lh + 14;
    const dockW = lw;
    const dockH = 316;

    ctx.fillStyle = 'rgba(28, 28, 30, 0.78)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(dockX, dockY, dockW, dockH, 24);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 14px -apple-system, sans-serif';
    ctx.fillText(isEn ? '4 Instruments · Any on Beat' : '四向音色選擇 · 節拍對即得分', dockX + 20, dockY + 28);

    ctx.fillStyle = 'rgba(235, 235, 245, 0.58)';
    ctx.font = '400 12px -apple-system, sans-serif';
    ctx.fillText(isEn ? 'Hit ↑ ↓ ← → on shrinking ring' : '白圈收縮至暴風眼時，按 ↑ ↓ ← → 或空白鍵', dockX + 20, dockY + 47);

    const padX = dockX + 14;
    const padW = dockW - 28;
    const padH = 54;
    const padGap = 8;
    const firstPadY = dockY + 62;

    this.uiButtons.instPads = [];

    this.instruments.forEach((inst, idx) => {
      const padY = firstPadY + idx * (padH + padGap);
      this.uiButtons.instPads.push({ x: padX, y: padY, w: padW, h: padH, dir: inst.dir });

      const isFlashing = nowMs - (this.instrumentFlashTime[inst.dir] || 0) < 220;
      const isSelected = this.activeInstrumentDir === inst.dir;

      ctx.fillStyle = isFlashing
        ? '#ffffff'
        : isSelected
        ? 'rgba(255, 255, 255, 0.2)'
        : 'rgba(255, 255, 255, 0.07)';
      ctx.beginPath();
      ctx.roundRect(padX, padY, padW, padH, 14);
      ctx.fill();

      // 左側大號方向鍵徽章 (↑ ↓ ← →)
      ctx.textAlign = 'center';
      ctx.fillStyle = isFlashing ? '#000000' : '#ffffff';
      ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
      ctx.fillText(inst.keyLabel, padX + 28, padY + 35);

      // 右側音色名稱與副標題
      ctx.textAlign = 'left';
      ctx.fillStyle = isFlashing ? '#000000' : '#ffffff';
      ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
      ctx.fillText(isEn ? inst.nameEn : inst.nameZh, padX + 54, padY + 25);

      ctx.fillStyle = isFlashing ? 'rgba(0, 0, 0, 0.65)' : 'rgba(235, 235, 245, 0.52)';
      ctx.font = '400 11px -apple-system, sans-serif';
      ctx.fillText(isEn ? inst.subEn : inst.subZh, padX + 54, padY + 43);
    });

    ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.cycloneApp = new CyclonePulseApp();
});
