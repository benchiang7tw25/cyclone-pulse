/**
 * Cyclone Pulse — Apple Studio 級四向音色與氣象和聲引擎
 *
 * 1. 上下左右四種獨立音色（由玩家自由選擇演奏，只要節拍對就得分）：
 *    - ↑ (UP)    ：水晶鐘琴 (Celeste Bell) — 清亮高音泛音
 *    - ← (LEFT)  ：溫暖電鋼琴 (Warm Rhodes) — 柔和七和弦伴奏
 *    - → (RIGHT) ：空靈拇指琴 (Kalimba Pluck) — 清脆木質顆粒感
 *    - ↓ (DOWN)  ：深海合成弦樂 (Analog Strings) — 渾厚溫暖中低音
 * 2. 100% 調性與和弦量化：所有背景律動與玩家按鍵皆嚴格鎖定在四小節和弦進行內，任何組合皆和諧動聽。
 */

class CycloneAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.analyser = null;
    this.freqData = null;

    this.reverbNode = null;
    this.reverbGain = null;
    this.delayL = null;
    this.delayR = null;
    this.delayWet = null;

    this.isRunning = false;
    this.isMuted = false;

    this.params = {
      pressureHpa: 950,
      windSpeedMs: 40,
      cloudTopTempC: -78,
      terrainM: 0,
      bpm: 116,
      rpm: 116,
      bassWeight: 0.65,
      coldNorm: 0.65
    };

    // 四組和諧四小節和弦進行
    this.progressions = {
      pentatonic: [
        { rootBass: 73.42, subBass: 36.71, pad: [293.66, 349.23, 440.00, 523.25], arp: [587.33, 698.46, 880.00, 1046.50, 1174.66] },
        { rootBass: 58.27, subBass: 58.27, pad: [233.08, 349.23, 440.00, 523.25], arp: [523.25, 587.33, 698.46, 880.00, 1046.50] },
        { rootBass: 87.31, subBass: 43.65, pad: [261.63, 349.23, 440.00, 523.25], arp: [523.25, 698.46, 880.00, 1046.50, 1396.91] },
        { rootBass: 65.41, subBass: 65.41, pad: [261.63, 329.63, 392.00, 587.33], arp: [523.25, 587.33, 783.99, 880.00, 1174.66] }
      ],
      techno: [
        { rootBass: 98.00, subBass: 49.00, pad: [196.00, 293.66, 349.23, 440.00], arp: [392.00, 587.33, 698.46, 880.00, 1174.66] },
        { rootBass: 77.78, subBass: 38.89, pad: [233.08, 293.66, 392.00, 466.16], arp: [466.16, 587.33, 698.46, 783.99, 1046.50] },
        { rootBass: 58.27, subBass: 58.27, pad: [233.08, 349.23, 440.00, 523.25], arp: [466.16, 587.33, 698.46, 880.00, 1174.66] },
        { rootBass: 87.31, subBass: 43.65, pad: [261.63, 349.23, 440.00, 587.33], arp: [523.25, 698.46, 880.00, 1046.50, 1174.66] }
      ],
      dnb: [
        { rootBass: 110.00, subBass: 55.00, pad: [220.00, 329.63, 392.00, 493.88], arp: [440.00, 523.25, 659.25, 783.99, 987.77] },
        { rootBass: 87.31, subBass: 43.65, pad: [261.63, 329.63, 349.23, 440.00], arp: [523.25, 659.25, 698.46, 880.00, 1046.50] },
        { rootBass: 65.41, subBass: 65.41, pad: [261.63, 329.63, 392.00, 493.88], arp: [523.25, 659.25, 783.99, 987.77, 1318.51] },
        { rootBass: 98.00, subBass: 49.00, pad: [246.94, 293.66, 392.00, 440.00], arp: [493.88, 587.33, 783.99, 880.00, 1174.66] }
      ],
      ambient: [
        { rootBass: 87.31, subBass: 43.65, pad: [261.63, 349.23, 440.00, 523.25], arp: [523.25, 698.46, 880.00, 1046.50, 1396.91] },
        { rootBass: 65.41, subBass: 65.41, pad: [261.63, 329.63, 392.00, 523.25], arp: [523.25, 659.25, 783.99, 1046.50, 1318.51] },
        { rootBass: 73.42, subBass: 36.71, pad: [293.66, 349.23, 440.00, 523.25], arp: [587.33, 698.46, 880.00, 1046.50, 1174.66] },
        { rootBass: 58.27, subBass: 58.27, pad: [233.08, 349.23, 440.00, 587.33], arp: [466.16, 587.33, 698.46, 880.00, 1174.66] }
      ],
      synthwave: [
        { rootBass: 110.00, subBass: 55.00, pad: [220.00, 261.63, 329.63, 440.00], arp: [440.00, 523.25, 659.25, 880.00, 1046.50] },
        { rootBass: 87.31, subBass: 43.65, pad: [174.61, 261.63, 349.23, 440.00], arp: [349.23, 523.25, 698.46, 880.00, 1046.50] },
        { rootBass: 65.41, subBass: 65.41, pad: [261.63, 329.63, 392.00, 523.25], arp: [523.25, 659.25, 783.99, 1046.50, 1318.51] },
        { rootBass: 98.00, subBass: 49.00, pad: [196.00, 293.66, 392.00, 493.88], arp: [392.00, 587.33, 783.99, 987.77, 1174.66] }
      ],
      lofi: [
        { rootBass: 73.42, subBass: 36.71, pad: [293.66, 349.23, 440.00, 659.25], arp: [349.23, 440.00, 587.33, 659.25, 880.00] },
        { rootBass: 98.00, subBass: 49.00, pad: [246.94, 329.63, 392.00, 698.46], arp: [392.00, 493.88, 587.33, 698.46, 987.77] },
        { rootBass: 65.41, subBass: 65.41, pad: [261.63, 329.63, 392.00, 493.88], arp: [493.88, 523.25, 659.25, 783.99, 987.77] },
        { rootBass: 110.00, subBass: 55.00, pad: [220.00, 261.63, 329.63, 523.25], arp: [440.00, 523.25, 659.25, 880.00, 1046.50] }
      ]
    };

    this.currentStyle = 'pentatonic';
    this.chordIndex = 0;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(18, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.22, this.ctx.currentTime);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

    this._setupStudioReverbAndDelay();

    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  _setupStudioReverbAndDelay() {
    const now = this.ctx.currentTime;

    const revLen = Math.floor(this.ctx.sampleRate * 2.1);
    const impulse = this.ctx.createBuffer(2, revLen, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < revLen; i++) {
        const decay = Math.pow(1 - i / revLen, 2.5);
        data[i] = (Math.random() * 2 - 1) * decay * 0.45;
      }
    }

    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = impulse;
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.setValueAtTime(0.34, now);

    this.reverbNode.connect(this.reverbGain);
    this.reverbGain.connect(this.masterGain);

    this.delayL = this.ctx.createDelay(1.0);
    this.delayR = this.ctx.createDelay(1.0);
    this.delayL.delayTime.setValueAtTime(0.25, now);
    this.delayR.delayTime.setValueAtTime(0.375, now);

    const delayFilter = this.ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.setValueAtTime(2400, now);

    this.delayWet = this.ctx.createGain();
    this.delayWet.gain.setValueAtTime(0.22, now);

    this.delayL.connect(delayFilter);
    delayFilter.connect(this.delayR);
    this.delayL.connect(this.delayWet);
    this.delayR.connect(this.delayWet);
    this.delayWet.connect(this.masterGain);
  }

  start(styleKey = 'pentatonic') {
    return this.startAmbient(styleKey);
  }

  startAmbient(styleKey = 'pentatonic') {
    this.init();
    this.currentStyle = this.progressions[styleKey] ? styleKey : 'pentatonic';
    this.chordIndex = 0;
    this.isRunning = true;
    this.updateSonificationParams(this.params);
  }

  stop() {
    return this.stopAmbient();
  }

  stopAmbient() {
    this.isRunning = false;
  }

  toggleMute() {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  setMute(muted) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0.0001 : 0.85, this.ctx.currentTime, 0.05);
    }
  }

  updateMeteorology(telemetry) {
    return this.updateSonificationParams(telemetry);
  }

  updateSonificationParams(telemetry) {
    const p = telemetry.pressureHpa ?? this.params.pressureHpa;
    const wMs = telemetry.windSpeedMs ?? this.params.windSpeedMs;
    const cTemp = telemetry.cloudTopTempC ?? this.params.cloudTopTempC;
    const terrain = telemetry.terrainM ?? 0;

    const bassWeight = Math.max(0.15, Math.min(1.0, (1005 - p) / 85));

    // 拉大風速 (15~58 m/s) 與氣壓對「音樂節奏 RPM」與「颱風移動速度倍率」的動態對比：
    // - 外圍/減弱期 (15~24 m/s)：68 ~ 88 RPM（慢板舒緩，移動速度 0.38x ~ 0.65x）
    // - 暴風圈增強期 (25~38 m/s)：92 ~ 128 RPM（中快板推進，移動速度 0.75x ~ 1.35x）
    // - 強烈暴風/登陸巔峰 (39~58 m/s)：132 ~ 172 RPM（疾速高張力，移動速度 1.50x ~ 2.65x）
    const windNorm = Math.max(0, Math.min(1.15, (wMs - 15) / 40));
    const intensityCurve = Math.pow(windNorm, 1.15) * 0.78 + bassWeight * 0.22;
    const rawBpm = 68 + intensityCurve * 100;
    const bpm = Math.max(66, Math.min(176, Math.round(rawBpm / 2) * 2));

    // 颱風路徑移動速度倍率 (0.38x 慢行 ~ 2.65x 疾速衝刺，超過 6.5 倍動態速差)
    const moveSpeedMult = Number((0.38 + Math.pow(Math.max(0, windNorm), 1.35) * 2.05).toFixed(2));

    const coldNorm = Math.max(0.1, Math.min(1.0, (-cTemp - 45) / 41));

    this.params = {
      pressureHpa: p,
      windSpeedMs: wMs,
      cloudTopTempC: cTemp,
      terrainM: terrain,
      bpm,
      rpm: bpm,
      moveSpeedMult,
      windNorm,
      bassWeight,
      coldNorm
    };

    return this.params;
  }

  /**
   * 4/4 拍完整四拍律動引擎 (一小節四拍：1 強拍 - 2 次弱反拍 - 3 次強拍 - 4 過門反拍)
   * 並隨風速 (windNorm) 動態拉大編曲密度與推進感
   */
  triggerDataBeat(beatIndex = 0) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const { bassWeight, coldNorm, windNorm = 0.5, bpm } = this.params;
    const beatSec = 60 / (bpm || 116);
    const beatInBar = beatIndex % 4; // 0: 第1拍, 1: 第2拍, 2: 第3拍, 3: 第4拍

    const prog = this.progressions[this.currentStyle] || this.progressions.pentatonic;
    this.chordIndex = Math.floor(beatIndex / 4) % prog.length;
    const chord = prog[this.chordIndex];
    const arpList = chord.arp;

    // -------------------------------------------------------------------------
    // 第 1 拍 (Downbeat 強拍)：和弦轉換 + 重低音大鼓 + 主根音 Sub-Bass + 高音亮點
    // -------------------------------------------------------------------------
    if (beatInBar === 0) {
      this._playWarmPadChord(this.ctx, this.masterGain, this.reverbNode, {
        time: now,
        duration: beatSec * 3.85,
        freqs: chord.pad,
        bassWeight,
        gain: 0.055 + bassWeight * 0.03
      });

      this._playStudioKick(this.ctx, this.masterGain, {
        time: now,
        bassWeight,
        gain: 0.44
      });

      this._playQuantizedBassNote(this.ctx, this.masterGain, {
        time: now,
        duration: beatSec * 0.92,
        freq: bassWeight > 0.55 ? chord.subBass * 2 : chord.rootBass,
        bassWeight,
        gain: 0.25 + bassWeight * 0.12
      });

      // 第一拍清亮鐘琴強拍提示音
      this._playCelesteBell(this.ctx, this.masterGain, this.delayL, this.reverbNode, {
        time: now,
        duration: beatSec * 0.85,
        freq: arpList[0],
        gain: 0.075
      });
    }

    // -------------------------------------------------------------------------
    // 第 2 拍 (Backbeat 反拍)：清脆小鼓/擊掌 (Snare/Rim) + 八度跳動低音
    // -------------------------------------------------------------------------
    else if (beatInBar === 1) {
      this._playCrispSnareClap(this.ctx, this.masterGain, this.reverbNode, {
        time: now,
        gain: 0.16 + windNorm * 0.08
      });

      this._playQuantizedBassNote(this.ctx, this.masterGain, {
        time: now,
        duration: beatSec * 0.75,
        freq: chord.rootBass * 2,
        bassWeight,
        gain: 0.16 + bassWeight * 0.08
      });
    }

    // -------------------------------------------------------------------------
    // 第 3 拍 (Secondary Strong Beat 次強拍)：推進大鼓 + 五度/主音低音律動
    // -------------------------------------------------------------------------
    else if (beatInBar === 2) {
      this._playStudioKick(this.ctx, this.masterGain, {
        time: now,
        bassWeight,
        gain: 0.36
      });

      // 強風時第 3 拍後半拍加上雙大鼓推進
      if (windNorm > 0.55) {
        this._playStudioKick(this.ctx, this.masterGain, {
          time: now + beatSec * 0.5,
          bassWeight,
          gain: 0.24
        });
      }

      this._playQuantizedBassNote(this.ctx, this.masterGain, {
        time: now,
        duration: beatSec * 0.88,
        freq: chord.rootBass * 1.5,
        bassWeight,
        gain: 0.21 + bassWeight * 0.09
      });
    }

    // -------------------------------------------------------------------------
    // 第 4 拍 (Turnaround 過門拍)：清脆小鼓 + 過門碎拍推進至下一小節第 1 拍
    // -------------------------------------------------------------------------
    else if (beatInBar === 3) {
      this._playCrispSnareClap(this.ctx, this.masterGain, this.reverbNode, {
        time: now,
        gain: 0.18 + windNorm * 0.09
      });

      this._playQuantizedBassNote(this.ctx, this.masterGain, {
        time: now,
        duration: beatSec * 0.45,
        freq: chord.rootBass * 2,
        bassWeight,
        gain: 0.17 + bassWeight * 0.08
      });

      // 第 4 拍後半拍過門低音與雙擊シェイカー (Turnaround Fill)
      this._playQuantizedBassNote(this.ctx, this.masterGain, {
        time: now + beatSec * 0.5,
        duration: beatSec * 0.42,
        freq: chord.rootBass * 1.5,
        bassWeight,
        gain: 0.15 + bassWeight * 0.07
      });

      this._playSoftShaker(this.ctx, this.masterGain, {
        time: now + beatSec * 0.5,
        gain: 0.08
      });
      this._playSoftShaker(this.ctx, this.masterGain, {
        time: now + beatSec * 0.75,
        gain: 0.10
      });
    }

    // -------------------------------------------------------------------------
    // 每一拍皆具備的 High-Hat / 琶音細分律動（隨風速增強由 8 分音符進化為 16 分音符疾行）
    // -------------------------------------------------------------------------
    this._playSoftShaker(this.ctx, this.masterGain, {
      time: now,
      gain: beatInBar === 0 ? 0.08 : 0.055
    });

    if (windNorm > 0.35) {
      this._playSoftShaker(this.ctx, this.masterGain, {
        time: now + beatSec * 0.5,
        gain: 0.05 + windNorm * 0.04
      });
    }
    if (windNorm > 0.7) {
      this._playSoftShaker(this.ctx, this.masterGain, {
        time: now + beatSec * 0.25,
        gain: 0.038
      });
      this._playSoftShaker(this.ctx, this.masterGain, {
        time: now + beatSec * 0.75,
        gain: 0.045
      });
    }

    // 四拍背景五聲琶音（每拍正拍與後半拍交織）
    const noteOnBeat = arpList[beatInBar % arpList.length];
    const noteOffBeat = arpList[(beatInBar + 2) % arpList.length];

    this._playKalimbaPluck(this.ctx, this.masterGain, this.delayL, this.reverbNode, {
      time: now,
      freq: noteOnBeat,
      coldNorm,
      gain: beatInBar === 0 ? 0.075 : 0.052
    });

    this._playKalimbaPluck(this.ctx, this.masterGain, this.delayL, this.reverbNode, {
      time: now + beatSec * 0.5,
      freq: noteOffBeat,
      coldNorm,
      gain: 0.058 + windNorm * 0.03
    });
  }

  /**
   * 玩家自由選擇 4 種方向音色 (↑ 水晶鐘琴 / ← 溫暖電鋼琴 / → 空靈拇指琴 / ↓ 合成弦樂)
   */
  triggerPlayerHit(judgment = 'PERFECT', direction = 'UP') {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const prog = this.progressions[this.currentStyle] || this.progressions.pentatonic;
    const chord = prog[this.chordIndex % prog.length];

    if (judgment === 'MISS') {
      this._playSoftShaker(this.ctx, this.masterGain, { time: now, gain: 0.04 });
      return;
    }

    const vel = judgment === 'PERFECT' ? 1.0 : judgment === 'GREAT' ? 0.82 : 0.68;
    this._triggerDirectionalInstrument(
      this.ctx,
      this.masterGain,
      this.delayL,
      this.reverbNode,
      direction,
      chord,
      now,
      vel
    );
  }

  /**
   * 核心四向音色合成器 (即時遊玩與結算 Demo WAV 共用)：
   * - UP (↑)    ：水晶鐘琴 (Celeste Glass Bell) — 清脆高八度泛音鈴聲
   * - LEFT (←)  ：溫暖電鋼琴 (Warm Rhodes Chord) — 經典爵士/Lo-Fi 電鋼琴琶音和弦
   * - RIGHT (→) ：空靈拇指琴 (Kalimba / Marimba) — 雙音木質彈撥律動
   * - DOWN (↓)  ：深海合成弦樂 (Warm Analog Strings) — 厚實溫暖八度弦樂共鳴
   */
  _triggerDirectionalInstrument(ctx, dest, delayDest, reverbDest, direction, chord, time, vel = 1.0) {
    const a = chord.arp;
    const p = chord.pad;

    if (direction === 'UP') {
      // ↑ 水晶鐘琴：清亮高音雙音泛音
      [a[2], a[4], a[3] * 2].forEach((freq, idx) => {
        this._playCelesteBell(ctx, dest, delayDest, reverbDest, {
          time: time + idx * 0.035,
          duration: 0.75,
          freq,
          gain: 0.13 * vel
        });
      });
    } else if (direction === 'LEFT') {
      // ← 溫暖電鋼琴：柔和 Rhodes 四音和弦刷奏
      [p[0], p[1], p[2], a[1]].forEach((freq, idx) => {
        this._playBellPianoNote(ctx, dest, delayDest, reverbDest, {
          time: time + idx * 0.025,
          duration: 0.85,
          freq,
          gain: 0.11 * vel
        });
      });
    } else if (direction === 'RIGHT') {
      // → 空靈拇指琴：清脆八分音符三連彈撥
      [a[0], a[2], a[3]].forEach((freq, idx) => {
        this._playKalimbaPluck(ctx, dest, delayDest, reverbDest, {
          time: time + idx * 0.065,
          freq,
          coldNorm: 0.85,
          gain: 0.16 * vel
        });
      });
    } else if (direction === 'DOWN') {
      // ↓ 深海合成弦樂：溫暖渾厚中低音和弦
      [chord.rootBass * 2, p[0], p[2]].forEach((freq) => {
        this._playAnalogStringVoice(ctx, dest, reverbDest, {
          time,
          duration: 0.9,
          freq,
          gain: 0.12 * vel
        });
      });
    } else {
      // SPACE (預設綜合和弦)
      [a[0], a[2], a[4]].forEach((freq, idx) => {
        this._playBellPianoNote(ctx, dest, delayDest, reverbDest, {
          time: time + idx * 0.022,
          duration: 0.7,
          freq,
          gain: 0.12 * vel
        });
      });
    }
  }

  _playCelesteBell(ctx, dest, delayDest, reverbDest, { time, duration = 0.75, freq, gain = 0.12 }) {
    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const overGain = ctx.createGain();
    const amp = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(freq * 4.0, time);
    overGain.gain.setValueAtTime(gain * 0.35, time);
    overGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);

    amp.gain.setValueAtTime(0.001, time);
    amp.gain.linearRampToValueAtTime(gain, time + 0.004);
    amp.gain.exponentialRampToValueAtTime(0.0008, time + duration);

    osc.connect(amp);
    overtone.connect(overGain);
    overGain.connect(amp);

    amp.connect(dest);
    if (delayDest) amp.connect(delayDest);
    if (reverbDest) amp.connect(reverbDest);

    osc.start(time);
    overtone.start(time);
    osc.stop(time + duration + 0.02);
    overtone.stop(time + 0.11);
  }

  _playAnalogStringVoice(ctx, dest, reverbDest, { time, duration = 0.9, freq, gain = 0.12 }) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq * 0.997, time);
    osc2.frequency.setValueAtTime(freq * 1.003, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, time);
    filter.frequency.linearRampToValueAtTime(1450, time + duration * 0.35);
    filter.frequency.exponentialRampToValueAtTime(520, time + duration);
    filter.Q.setValueAtTime(1.8, time);

    amp.gain.setValueAtTime(0.001, time);
    amp.gain.linearRampToValueAtTime(gain, time + 0.045);
    amp.gain.exponentialRampToValueAtTime(0.0008, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(amp);
    amp.connect(dest);
    if (reverbDest) amp.connect(reverbDest);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.03);
    osc2.stop(time + duration + 0.03);
  }

  _playStudioKick(ctx, dest, { time, bassWeight = 0.6, gain = 0.38 }) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = 'sine';

    osc.frequency.setValueAtTime(135, time);
    osc.frequency.exponentialRampToValueAtTime(48, time + 0.065);
    osc.frequency.exponentialRampToValueAtTime(36, time + 0.28);

    amp.gain.setValueAtTime(0.001, time);
    amp.gain.linearRampToValueAtTime(gain * (0.75 + bassWeight * 0.25), time + 0.005);
    amp.gain.exponentialRampToValueAtTime(0.0008, time + 0.30);

    osc.connect(amp);
    amp.connect(dest);
    osc.start(time);
    osc.stop(time + 0.32);
  }

  _playQuantizedBassNote(ctx, dest, { time, duration, freq, bassWeight = 0.6, gain = 0.24 }) {
    const subOsc = ctx.createOscillator();
    const warmOsc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq, time);

    warmOsc.type = 'triangle';
    warmOsc.frequency.setValueAtTime(freq * 2, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160 + bassWeight * 220, time);
    filter.Q.setValueAtTime(1.4, time);

    amp.gain.setValueAtTime(0.001, time);
    amp.gain.linearRampToValueAtTime(gain, time + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.001, time + duration);

    subOsc.connect(amp);
    warmOsc.connect(filter);
    filter.connect(amp);
    amp.connect(dest);

    subOsc.start(time);
    warmOsc.start(time);
    subOsc.stop(time + duration + 0.02);
    warmOsc.stop(time + duration + 0.02);
  }

  _playWarmPadChord(ctx, dest, reverbDest, { time, duration, freqs, bassWeight = 0.6, gain = 0.06 }) {
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const amp = ctx.createGain();

      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f * (1 + (i - 1.5) * 0.0012), time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800 + bassWeight * 900, time);

      amp.gain.setValueAtTime(0.0005, time);
      amp.gain.linearRampToValueAtTime(gain, time + duration * 0.25);
      amp.gain.exponentialRampToValueAtTime(0.0008, time + duration);

      osc.connect(filter);
      filter.connect(amp);
      amp.connect(dest);
      if (reverbDest) amp.connect(reverbDest);

      osc.start(time);
      osc.stop(time + duration + 0.05);
    });
  }

  _playKalimbaPluck(ctx, dest, delayDest, reverbDest, { time, freq, coldNorm = 0.6, gain = 0.1 }) {
    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 3, time);
    overtoneGain.gain.setValueAtTime(gain * 0.25, time);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800 + coldNorm * 2800, time);

    amp.gain.setValueAtTime(0.001, time);
    amp.gain.linearRampToValueAtTime(gain, time + 0.004);
    amp.gain.exponentialRampToValueAtTime(0.0008, time + 0.36);

    osc.connect(filter);
    overtone.connect(overtoneGain);
    overtoneGain.connect(filter);
    filter.connect(amp);

    amp.connect(dest);
    if (delayDest) amp.connect(delayDest);
    if (reverbDest) amp.connect(reverbDest);

    osc.start(time);
    overtone.start(time);
    osc.stop(time + 0.38);
    overtone.stop(time + 0.06);
  }

  _playBellPianoNote(ctx, dest, delayDest, reverbDest, { time, duration = 0.6, freq, gain = 0.12 }) {
    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const amp = ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, time);

    mod.type = 'sine';
    mod.frequency.setValueAtTime(freq * 2.0, time);
    modGain.gain.setValueAtTime(freq * 0.45, time);
    modGain.gain.exponentialRampToValueAtTime(0.5, time + 0.14);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);

    amp.gain.setValueAtTime(0.001, time);
    amp.gain.linearRampToValueAtTime(gain, time + 0.005);
    amp.gain.exponentialRampToValueAtTime(0.0008, time + duration);

    carrier.connect(amp);
    amp.connect(dest);
    if (delayDest) amp.connect(delayDest);
    if (reverbDest) amp.connect(reverbDest);

    carrier.start(time);
    mod.start(time);
    carrier.stop(time + duration + 0.02);
    mod.stop(time + duration + 0.02);
  }

  _playSoftShaker(ctx, dest, { time, gain = 0.05 }) {
    const len = Math.floor(ctx.sampleRate * 0.055);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.3));
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(5200, time);
    filter.Q.setValueAtTime(2.5, time);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, time);

    src.connect(filter);
    filter.connect(amp);
    amp.connect(dest);
    src.start(time);
  }

  /**
   * 清脆 Studio Snare / Rim-Clap（用於 4/4 拍的第 2 拍與第 4 拍，強化四拍律動感）
   */
  _playCrispSnareClap(ctx, dest, reverbDest, { time, gain = 0.16 }) {
    // 1. 瞬態木質鼓邊體共鳴 (Body Rim Tone)
    const bodyOsc = ctx.createOscillator();
    const bodyAmp = ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(210, time);
    bodyOsc.frequency.exponentialRampToValueAtTime(115, time + 0.055);

    bodyAmp.gain.setValueAtTime(0.001, time);
    bodyAmp.gain.linearRampToValueAtTime(gain * 0.75, time + 0.003);
    bodyAmp.gain.exponentialRampToValueAtTime(0.0008, time + 0.09);

    bodyOsc.connect(bodyAmp);
    bodyAmp.connect(dest);
    bodyOsc.start(time);
    bodyOsc.stop(time + 0.10);

    // 2. 清脆響弦噪音 (Crisp Snare Snap)
    const len = Math.floor(ctx.sampleRate * 0.14);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.28));
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buf;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(1100, time);

    const bp = ctx.createBiquadFilter();
    bp.type = 'peaking';
    bp.frequency.setValueAtTime(2800, time);
    bp.gain.setValueAtTime(4.5, time);

    const noiseAmp = ctx.createGain();
    noiseAmp.gain.setValueAtTime(gain, time);
    noiseAmp.gain.exponentialRampToValueAtTime(0.001, time + 0.13);

    noiseSrc.connect(hp);
    hp.connect(bp);
    bp.connect(noiseAmp);
    noiseAmp.connect(dest);
    if (reverbDest) noiseAmp.connect(reverbDest);

    noiseSrc.start(time);
  }

  getAudioMetrics() {
    if (!this.analyser || !this.isRunning) {
      return { bassEnergy: 0, midEnergy: 0, highEnergy: 0 };
    }
    this.analyser.getByteFrequencyData(this.freqData);
    let bassSum = 0;
    for (let i = 0; i < 10; i++) bassSum += this.freqData[i];
    let highSum = 0;
    for (let i = 40; i < 90; i++) highSum += this.freqData[i];

    return {
      bassEnergy: bassSum / (10 * 255),
      highEnergy: highSum / (50 * 255)
    };
  }

  /**
   * 結算畫面：全自動渲染個人化 Demo 音軌 (重現玩家本局自由選擇的四種音色配置與動態四拍速度變化)
   */
  async renderPersonalizedSoundtrack(typhoonData, options = {}) {
    const sampleRate = 44100;
    const durationSec = 16.0;
    const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
      2,
      sampleRate * durationSec,
      sampleRate
    );

    const styleKey = options.style || typhoonData.defaultStyle || 'pentatonic';
    const playerHits = Array.isArray(options.playerHitLog) ? options.playerHitLog : [];
    const seed = options.seed ?? Math.floor(Math.random() * 10000);

    const prog = this.progressions[styleKey] || this.progressions.pentatonic;

    const master = offlineCtx.createGain();
    master.gain.setValueAtTime(0.86, 0);

    const comp = offlineCtx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-12, 0);
    comp.ratio.setValueAtTime(4, 0);

    const revLen = Math.floor(sampleRate * 1.8);
    const impulse = offlineCtx.createBuffer(2, revLen, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < revLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLen, 2.5) * 0.4;
      }
    }
    const reverb = offlineCtx.createConvolver();
    reverb.buffer = impulse;
    const revGain = offlineCtx.createGain();
    revGain.gain.setValueAtTime(0.32, 0);
    reverb.connect(revGain);
    revGain.connect(comp);

    const delay = offlineCtx.createDelay(1.0);
    delay.delayTime.setValueAtTime(0.25, 0);
    const delayGain = offlineCtx.createGain();
    delayGain.gain.setValueAtTime(0.20, 0);
    delay.connect(delayGain);
    delayGain.connect(comp);

    master.connect(comp);
    comp.connect(offlineCtx.destination);

    const nodes = typhoonData.track;
    let cursorTime = 0.2;
    let beatIdx = 0;
    const beatTimes = [];

    while (cursorTime < durationSec - 0.8) {
      beatTimes.push(cursorTime);
      const progress = cursorTime / (durationSec - 1.0);
      const exactIdx = progress * (nodes.length - 1);
      const n0 = nodes[Math.floor(exactIdx)];
      const n1 = nodes[Math.min(nodes.length - 1, Math.floor(exactIdx) + 1)];
      const frac = exactIdx - Math.floor(exactIdx);

      const pressure = n0.pressureHpa + (n1.pressureHpa - n0.pressureHpa) * frac;
      const windMs = n0.windSpeedMs + (n1.windSpeedMs - n0.windSpeedMs) * frac;
      const cloudTemp = n0.cloudTopTempC + (n1.cloudTopTempC - n0.cloudTopTempC) * frac;

      const bassWeight = Math.max(0.2, Math.min(1.0, (1005 - pressure) / 85));
      const windNorm = Math.max(0, Math.min(1.15, (windMs - 15) / 40));
      const coldNorm = Math.max(0.2, Math.min(1.0, (-cloudTemp - 45) / 41));

      // 各編曲風格專屬之基礎速度與風速動態範圍
      let styleBaseBpm = 92;
      let styleBpmRange = 28;
      if (styleKey === 'dnb') { styleBaseBpm = 160; styleBpmRange = 16; }
      else if (styleKey === 'techno') { styleBaseBpm = 126; styleBpmRange = 12; }
      else if (styleKey === 'synthwave') { styleBaseBpm = 112; styleBpmRange = 16; }
      else if (styleKey === 'lofi') { styleBaseBpm = 74; styleBpmRange = 10; }
      else if (styleKey === 'ambient') { styleBaseBpm = 68; styleBpmRange = 10; }
      else { styleBaseBpm = 88; styleBpmRange = 26; }

      const localBpm = Math.round(styleBaseBpm + Math.pow(windNorm, 1.15) * styleBpmRange);
      const beatSec = 60 / localBpm;
      const beatInBar = beatIdx % 4;

      const chord = prog[Math.floor(beatIdx / 4) % prog.length];

      if (styleKey === 'techno') {
        // --- 1. 深層脈衝 TECHNO (4-on-the-floor 重低音大鼓、反拍 Open Hi-hat、推進 16 分音符 Bass) ---
        this._playStudioKick(offlineCtx, master, {
          time: cursorTime,
          bassWeight: Math.max(0.65, bassWeight),
          gain: 0.46
        });

        if (beatInBar === 1 || beatInBar === 3) {
          this._playCrispSnareClap(offlineCtx, master, reverb, {
            time: cursorTime,
            gain: 0.22
          });
        }

        // 反拍 Open Hi-hat
        this._playSoftShaker(offlineCtx, master, {
          time: cursorTime + beatSec * 0.5,
          gain: 0.12 + windNorm * 0.05
        });

        // 奔馳 16 分音符低音
        this._playQuantizedBassNote(offlineCtx, master, {
          time: cursorTime,
          duration: beatSec * 0.44,
          freq: chord.rootBass,
          bassWeight,
          gain: 0.28
        });
        this._playQuantizedBassNote(offlineCtx, master, {
          time: cursorTime + beatSec * 0.5,
          duration: beatSec * 0.4,
          freq: (seed % 2 === 0) ? chord.rootBass * 1.5 : chord.rootBass * 2,
          bassWeight,
          gain: 0.22
        });

        const arp = chord.arp;
        const noteFreq = arp[(beatIdx * 2 + (seed % arp.length)) % arp.length];
        this._playBellPianoNote(offlineCtx, master, delay, reverb, {
          time: cursorTime + beatSec * 0.25,
          duration: 0.25,
          freq: noteFreq,
          gain: 0.08
        });
        if (beatInBar === 0) {
          this._playWarmPadChord(offlineCtx, master, reverb, {
            time: cursorTime,
            duration: beatSec * 3.8,
            freqs: chord.pad,
            bassWeight,
            gain: 0.05
          });
        }
      } else if (styleKey === 'dnb') {
        // --- 2. 疾速破風 DRUM & BASS (160+ BPM 碎拍節奏、切分大鼓、極速 Shaker、厚重 Reese Bass) ---
        if (beatInBar === 0) {
          this._playStudioKick(offlineCtx, master, {
            time: cursorTime,
            bassWeight,
            gain: 0.48
          });
        } else if (beatInBar === 2) {
          this._playStudioKick(offlineCtx, master, {
            time: cursorTime + beatSec * 0.5,
            bassWeight,
            gain: 0.42
          });
        }

        if (beatInBar === 1 || beatInBar === 3) {
          this._playCrispSnareClap(offlineCtx, master, reverb, {
            time: cursorTime,
            gain: 0.28
          });
        }

        for (let s = 0; s < 4; s++) {
          this._playSoftShaker(offlineCtx, master, {
            time: cursorTime + beatSec * (s * 0.25),
            gain: s === 2 ? 0.09 : 0.04
          });
        }

        if (beatInBar === 0 || beatInBar === 2) {
          this._playQuantizedBassNote(offlineCtx, master, {
            time: cursorTime,
            duration: beatSec * 1.8,
            freq: chord.rootBass,
            bassWeight: Math.max(0.7, bassWeight),
            gain: 0.30
          });
        }

        if (beatInBar === 0) {
          this._playAnalogStringVoice(offlineCtx, master, reverb, {
            time: cursorTime,
            duration: beatSec * 3.9,
            freq: chord.pad[0],
            gain: 0.09
          });
        }
        const arp = chord.arp;
        const noteFreq = arp[(beatIdx * 3 + seed) % arp.length];
        this._playKalimbaPluck(offlineCtx, master, delay, reverb, {
          time: cursorTime + beatSec * 0.75,
          freq: noteFreq,
          coldNorm,
          gain: 0.08
        });
      } else if (styleKey === 'synthwave') {
        // --- 3. 復古霓虹 SYNTHWAVE (80s 八度跳躍 Bass、大氣 Gated 混響小鼓、類比合成和弦) ---
        if (beatInBar === 0) {
          this._playStudioKick(offlineCtx, master, { time: cursorTime, bassWeight, gain: 0.44 });
          this._playWarmPadChord(offlineCtx, master, reverb, {
            time: cursorTime,
            duration: beatSec * 3.8,
            freqs: chord.pad,
            bassWeight,
            gain: 0.08
          });
        } else if (beatInBar === 2) {
          this._playStudioKick(offlineCtx, master, { time: cursorTime, bassWeight, gain: 0.40 });
        }

        if (beatInBar === 1 || beatInBar === 3) {
          this._playCrispSnareClap(offlineCtx, master, reverb, {
            time: cursorTime,
            gain: 0.32
          });
        }

        // 80年代經典八度抽蓄低音 (Octave Pumping Bass)
        this._playQuantizedBassNote(offlineCtx, master, {
          time: cursorTime,
          duration: beatSec * 0.42,
          freq: chord.rootBass,
          bassWeight,
          gain: 0.28
        });
        this._playQuantizedBassNote(offlineCtx, master, {
          time: cursorTime + beatSec * 0.5,
          duration: beatSec * 0.42,
          freq: chord.rootBass * 2,
          bassWeight,
          gain: 0.24
        });

        const arp = chord.arp;
        const noteFreq = arp[(beatIdx + (seed % arp.length)) % arp.length];
        this._playCelesteBell(offlineCtx, master, delay, reverb, {
          time: cursorTime + beatSec * 0.25,
          duration: 0.6,
          freq: noteFreq,
          gain: 0.09
        });
      } else if (styleKey === 'lofi') {
        // --- 4. 低傳真夜雨 LOFI CHILLHOP (微搖擺 Swing 節奏、溫暖爵士電鋼琴、鬆弛雨夜氛圍) ---
        const swing = (beatInBar % 2 === 1) ? 0.025 : 0;
        if (beatInBar === 0) {
          this._playStudioKick(offlineCtx, master, { time: cursorTime, bassWeight, gain: 0.34 });
          this._playBellPianoNote(offlineCtx, master, delay, reverb, {
            time: cursorTime,
            duration: beatSec * 3.5,
            freq: chord.pad[0],
            gain: 0.12
          });
          this._playBellPianoNote(offlineCtx, master, delay, reverb, {
            time: cursorTime + 0.03,
            duration: beatSec * 3.5,
            freq: chord.pad[2],
            gain: 0.10
          });
          this._playQuantizedBassNote(offlineCtx, master, {
            time: cursorTime,
            duration: beatSec * 1.6,
            freq: chord.rootBass,
            bassWeight,
            gain: 0.22
          });
        } else if (beatInBar === 2) {
          this._playCrispSnareClap(offlineCtx, master, reverb, {
            time: cursorTime + swing,
            gain: 0.14
          });
          this._playQuantizedBassNote(offlineCtx, master, {
            time: cursorTime,
            duration: beatSec * 1.5,
            freq: chord.rootBass * 1.5,
            bassWeight,
            gain: 0.18
          });
        } else {
          this._playSoftShaker(offlineCtx, master, {
            time: cursorTime + swing,
            gain: 0.05
          });
        }

        const arp = chord.arp;
        const noteFreq = arp[(seed + beatIdx) % arp.length];
        this._playKalimbaPluck(offlineCtx, master, delay, reverb, {
          time: cursorTime + beatSec * 0.5 + swing,
          freq: noteFreq,
          coldNorm: 0.5,
          gain: 0.08
        });
      } else if (styleKey === 'ambient') {
        // --- 5. 失重漂浮 AMBIENT (極簡超低音脈衝、微風聲景、水晶長混響) ---
        if (beatInBar === 0) {
          this._playStudioKick(offlineCtx, master, {
            time: cursorTime,
            bassWeight: 0.9,
            gain: 0.28
          });
          this._playWarmPadChord(offlineCtx, master, reverb, {
            time: cursorTime,
            duration: beatSec * 3.9,
            freqs: chord.pad,
            bassWeight,
            gain: 0.12
          });
          this._playQuantizedBassNote(offlineCtx, master, {
            time: cursorTime,
            duration: beatSec * 3.5,
            freq: chord.subBass || chord.rootBass,
            bassWeight,
            gain: 0.25
          });
        }

        this._playSoftShaker(offlineCtx, master, {
          time: cursorTime,
          gain: 0.02
        });

        const arp = chord.arp;
        const noteFreq = arp[(beatIdx * 2 + seed) % arp.length];
        this._playCelesteBell(offlineCtx, master, delay, reverb, {
          time: cursorTime + beatSec * 0.5,
          duration: 1.2,
          freq: noteFreq,
          gain: 0.07
        });
      } else {
        // --- 6. 空靈大氣五聲 PENTATONIC (太鼓式重拍、自然風音、溫暖和聲) ---
        if (beatInBar === 0) {
          this._playWarmPadChord(offlineCtx, master, reverb, {
            time: cursorTime,
            duration: beatSec * 3.85,
            freqs: chord.pad,
            bassWeight,
            gain: 0.07 + bassWeight * 0.03
          });
          this._playStudioKick(offlineCtx, master, {
            time: cursorTime,
            bassWeight,
            gain: 0.42
          });
          this._playQuantizedBassNote(offlineCtx, master, {
            time: cursorTime,
            duration: beatSec * 0.9,
            freq: chord.rootBass,
            bassWeight,
            gain: 0.24 + bassWeight * 0.1
          });
        } else if (beatInBar === 1) {
          this._playCrispSnareClap(offlineCtx, master, reverb, {
            time: cursorTime,
            gain: 0.16 + windNorm * 0.07
          });
          this._playQuantizedBassNote(offlineCtx, master, {
            time: cursorTime,
            duration: beatSec * 0.75,
            freq: chord.rootBass * 2,
            bassWeight,
            gain: 0.16 + bassWeight * 0.07
          });
        } else if (beatInBar === 2) {
          this._playStudioKick(offlineCtx, master, {
            time: cursorTime,
            bassWeight,
            gain: 0.36
          });
          this._playQuantizedBassNote(offlineCtx, master, {
            time: cursorTime,
            duration: beatSec * 0.85,
            freq: chord.rootBass * 1.5,
            bassWeight,
            gain: 0.20 + bassWeight * 0.08
          });
        } else {
          this._playCrispSnareClap(offlineCtx, master, reverb, {
            time: cursorTime,
            gain: 0.18 + windNorm * 0.08
          });
          this._playQuantizedBassNote(offlineCtx, master, {
            time: cursorTime,
            duration: beatSec * 0.45,
            freq: chord.rootBass * 2,
            bassWeight,
            gain: 0.16 + bassWeight * 0.07
          });
        }

        this._playSoftShaker(offlineCtx, master, {
          time: cursorTime,
          gain: 0.06
        });

        const arp = chord.arp;
        const idxA = (beatIdx * 2 + seed) % arp.length;
        this._playKalimbaPluck(offlineCtx, master, delay, reverb, {
          time: cursorTime + beatSec * 0.5,
          freq: arp[idxA],
          coldNorm,
          gain: 0.075
        });
      }

      cursorTime += beatSec;
      beatIdx++;
    }

    // 將玩家實際選擇的四種方向音色 (UP / LEFT / RIGHT / DOWN) 對齊至最近的四拍網格
    playerHits.forEach((hit) => {
      const targetTime = 0.2 + Math.max(0, Math.min(0.92, hit.timeNorm)) * (durationSec - 1.4);
      let bestBeatIdx = 0;
      let minDist = Infinity;
      beatTimes.forEach((bt, idx) => {
        const d = Math.abs(bt - targetTime);
        if (d < minDist) {
          minDist = d;
          bestBeatIdx = idx;
        }
      });

      const quantizedTime = beatTimes[bestBeatIdx] || targetTime;
      const chord = prog[Math.floor(bestBeatIdx / 4) % prog.length];

      this._triggerDirectionalInstrument(
        offlineCtx,
        master,
        delay,
        reverb,
        hit.direction,
        chord,
        quantizedTime,
        0.85
      );
    });

    const renderedBuffer = await offlineCtx.startRendering();
    const waveformPeaks = this._extractWaveformPeaks(renderedBuffer, 120);
    const wavBlob = this._audioBufferToWavBlob(renderedBuffer);
    const audioUrl = URL.createObjectURL(wavBlob);

    const STYLE_META = {
      pentatonic: { zh: '空靈大氣 (Ambient Cinematic)', en: 'Ambient Cinematic' },
      techno: { zh: '深層脈衝 (Deep Pulse Techno)', en: 'Deep Pulse Techno' },
      dnb: { zh: '疾速破風 (Drum & Bass Breakbeat)', en: 'Drum & Bass Breakbeat' },
      synthwave: { zh: '復古霓虹 (80s Retrowave)', en: '80s Retrowave' },
      lofi: { zh: '低傳真夜雨 (Lofi Chillhop)', en: 'Lofi Chillhop' },
      ambient: { zh: '失重漂浮 (Ethereal Ambient)', en: 'Ethereal Ambient' }
    };

    return {
      blob: wavBlob,
      url: audioUrl,
      durationSec,
      waveformPeaks,
      styleKey,
      styleMeta: STYLE_META[styleKey] || { zh: styleKey, en: styleKey },
      filename: `CyclonePulse_${typhoonData.nameEn}_${styleKey}_${seed % 1000}.wav`
    };
  }

  _extractWaveformPeaks(buffer, bucketCount = 120) {
    const ch0 = buffer.getChannelData(0);
    const step = Math.floor(ch0.length / bucketCount);
    const peaks = [];
    for (let i = 0; i < bucketCount; i++) {
      let max = 0;
      const start = i * step;
      for (let j = 0; j < step; j += 16) {
        const v = Math.abs(ch0[start + j] || 0);
        if (v > max) max = v;
      }
      peaks.push(Math.min(1, max));
    }
    return peaks;
  }

  _audioBufferToWavBlob(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new ArrayBuffer(length);
    const view = new DataView(out);
    const channels = [];
    let sample = 0;
    let offset = 0;
    let pos = 0;

    const setUint16 = (data) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);
    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);
    setUint32(0x61746164);
    setUint32(length - pos - 4);

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([out], { type: 'audio/wav' });
  }
}

window.CycloneAudioEngine = CycloneAudioEngine;
