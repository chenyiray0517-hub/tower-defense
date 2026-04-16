// ═══════════════════════════════════════════════════════════
//  audio.js  ─  Web Audio API 音效 & 配樂系統
// ═══════════════════════════════════════════════════════════

const SFX = (() => {
  let ac = null;
  let masterG, sfxG, bgmG;
  let _muted = false;
  let lastDieAt = 0;   // 敵人死亡音效節流

  // ── 初始化 / 喚醒 AudioContext ────────────────────────
  function ctx() {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      masterG = ac.createGain(); masterG.gain.value = 0.78; masterG.connect(ac.destination);
      sfxG    = ac.createGain(); sfxG.gain.value    = 0.68; sfxG.connect(masterG);
      bgmG    = ac.createGain(); bgmG.gain.value    = 0.22; bgmG.connect(masterG);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  // ── 基礎工具函數 ──────────────────────────────────────

  /** 建立一個簡單振盪音 */
  function tone(dest, freq, type, t, dur, vol, freqCb) {
    const c = ctx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqCb) freqCb(o.frequency, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }

  /** 建立雜訊爆破音 */
  function noise(dest, t, dur, vol, filterFreq, filterType) {
    const c = ctx();
    const n = Math.ceil(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const flt = c.createBiquadFilter();
    flt.type = filterType || 'bandpass';
    flt.frequency.value = filterFreq || 800;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(dest);
    src.start(t); src.stop(t + dur + 0.05);
  }

  // ── 音效 ──────────────────────────────────────────────

  /** 各塔種射擊音效 */
  function shoot(towerType) {
    if (_muted) return;
    const c = ctx(), t = c.currentTime;
    switch (towerType) {
      case 'archer':
        // 弓弦：高→低頻衰減 + 輕微氣流
        tone(sfxG, 680, 'triangle', t, 0.09, 0.16,
          (f) => f.exponentialRampToValueAtTime(160, t + 0.09));
        noise(sfxG, t, 0.04, 0.06, 2800);
        break;
      case 'mage':
        // 魔法光球：上升音調
        tone(sfxG, 260, 'sine', t, 0.28, 0.11,
          (f) => f.exponentialRampToValueAtTime(540, t + 0.22));
        tone(sfxG, 390, 'sine', t + 0.08, 0.2, 0.06);
        break;
      case 'cannon':
        // 砲擊：低頻爆炸
        noise(sfxG, t, 0.38, 0.55, 90, 'lowpass');
        tone(sfxG, 68, 'sine', t, 0.32, 0.48,
          (f) => f.exponentialRampToValueAtTime(26, t + 0.32));
        break;
      case 'ice':
        // 冰晶：高頻輕柔雙音
        tone(sfxG, 1350, 'sine', t, 0.22, 0.07,
          (f) => f.exponentialRampToValueAtTime(850, t + 0.22));
        tone(sfxG, 1800, 'sine', t, 0.14, 0.04);
        break;
      case 'lightning':
        // 閃電：電流雜訊 + 鋸齒
        noise(sfxG, t, 0.14, 0.42, 3000, 'highpass');
        tone(sfxG, 160, 'sawtooth', t, 0.11, 0.13,
          (f) => f.exponentialRampToValueAtTime(880, t + 0.11));
        break;
    }
  }

  /** 主角射擊（輕量版，高頻較多才不蓋掉塔音效） */
  function heroShoot() {
    if (_muted) return;
    const c = ctx(), t = c.currentTime;
    tone(sfxG, 500, 'triangle', t, 0.07, 0.09,
      (f) => f.exponentialRampToValueAtTime(200, t + 0.07));
  }

  /** 敵人死亡；isBoss=true 時播放重型爆炸 */
  function die(isBoss) {
    if (_muted) return;
    const now = performance.now();
    if (!isBoss && now - lastDieAt < 65) return; // 節流：避免群死音爆
    lastDieAt = now;
    const c = ctx(), t = c.currentTime;
    if (isBoss) {
      noise(sfxG, t, 0.65, 0.7, 140, 'lowpass');
      tone(sfxG, 95, 'sine', t, 0.55, 0.5,
        (f) => f.exponentialRampToValueAtTime(28, t + 0.55));
      [440, 330, 220].forEach((f, i) =>
        tone(sfxG, f, 'sine', t + i * 0.14, 0.24, 0.14));
    } else {
      noise(sfxG, t, 0.09, 0.2, 480);
      tone(sfxG, 210, 'square', t, 0.07, 0.07,
        (f) => f.exponentialRampToValueAtTime(55, t + 0.07));
    }
  }

  /** 建造建築 */
  function build() {
    if (_muted) return;
    const c = ctx(), t = c.currentTime;
    tone(sfxG, 440,  'sine', t,        0.09, 0.13);
    tone(sfxG, 660,  'sine', t + 0.07, 0.09, 0.11);
    tone(sfxG, 880,  'sine', t + 0.13, 0.08, 0.09);
  }

  /** 升級建築 */
  function upgrade() {
    if (_muted) return;
    const c = ctx(), t = c.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) =>
      tone(sfxG, freq, 'sine', t + i * 0.09, 0.2, 0.13));
  }

  /** 波次開始警報 */
  function waveStart() {
    if (_muted) return;
    const c = ctx(), t = c.currentTime;
    [330, 440, 554, 440].forEach((freq, i) =>
      tone(sfxG, freq, 'sine', t + i * 0.1, 0.16, 0.15));
  }

  /** 堡壘受到攻擊 */
  function fortressHit() {
    if (_muted) return;
    const c = ctx(), t = c.currentTime;
    noise(sfxG, t, 0.25, 0.52, 85, 'lowpass');
    tone(sfxG, 62, 'sine', t, 0.25, 0.58,
      (f) => f.exponentialRampToValueAtTime(38, t + 0.25));
  }

  /** 遊戲結束（堡壘陷落） */
  function gameOver() {
    if (_muted) return;
    const c = ctx(), t = c.currentTime;
    [440, 392, 349, 294, 220].forEach((freq, i) =>
      tone(sfxG, freq, 'sine', t + i * 0.3, 0.38, 0.18));
    noise(sfxG, t + 0.3, 0.5, 0.3, 100, 'lowpass');
  }

  /** 通關勝利 */
  function victory() {
    if (_muted) return;
    const c = ctx(), t = c.currentTime;
    const mel = [523, 659, 784, 659, 784, 1047, 784, 1047];
    mel.forEach((freq, i) => {
      tone(sfxG, freq,       'sine', t + i * 0.16, 0.22, 0.15);
      tone(sfxG, freq * 0.5, 'sine', t + i * 0.16, 0.22, 0.07); // 低八度和聲
    });
  }

  // ── 背景音樂 ──────────────────────────────────────────
  // C 小調五聲音階，4/4拍，約 148 BPM

  let bgmOn   = false;
  let bgmBeat = 0;
  let bgmIdx  = 0;
  const BEAT  = 0.405; // 秒/拍

  // 旋律（0 = 休止，16 拍一循環）
  const MEL  = [392.0, 0, 349.2, 311.1,  261.6, 0, 311.1, 349.2,
                392.0, 0, 466.2, 392.0,  349.2, 311.1, 0, 261.6];
  // 低音走句（Cm 和弦骨幹）
  const BASS = [130.8, 98.0, 155.6, 98.0,  87.3, 130.8, 98.0, 155.6,
                130.8, 98.0, 116.5, 138.6, 87.3,  130.8, 98.0, 116.5];
  // 和弦墊音（每4拍換一次）Cm / Fm / Cm / Bb
  const PADS = [
    [130.8, 155.6, 196.0],  // Cm
    [87.3,  104.0, 130.8],  // Fm
    [130.8, 155.6, 196.0],  // Cm
    [116.5, 138.6, 174.6],  // Bb
  ];
  // 節奏型（1=kick, 2=snare, 0=無）
  const DRUM = [1,0,0,0, 2,0,1,0, 1,0,0,0, 2,0,1,0];

  function _bgmKick(t) {
    noise(bgmG, t, 0.18, 0.28, 60,  'lowpass');
    tone(bgmG, 58, 'sine', t, 0.14, 0.22,
      (f) => f.exponentialRampToValueAtTime(26, t + 0.14));
  }
  function _bgmSnare(t) {
    noise(bgmG, t, 0.1, 0.16, 1200, 'bandpass');
    tone(bgmG, 180, 'triangle', t, 0.06, 0.08);
  }

  function _schedule() {
    if (!bgmOn) return;
    const c = ctx();
    const now = c.currentTime;
    while (bgmBeat < now + 0.55) {
      const t   = bgmBeat;
      const i   = bgmIdx % MEL.length;
      const pi  = Math.floor(bgmIdx / 4) % PADS.length;

      // 低音
      tone(bgmG, BASS[i], 'sine', t, BEAT * 0.82, 0.2);

      // 旋律
      if (MEL[i]) tone(bgmG, MEL[i], 'triangle', t, BEAT * 0.72, 0.1);

      // 和弦墊（每4拍更新）
      if (bgmIdx % 4 === 0) {
        for (const f of PADS[pi])
          tone(bgmG, f, 'sine', t, BEAT * 4 * 0.88, 0.045);
      }

      // 節奏
      if (DRUM[i] === 1) _bgmKick(t);
      if (DRUM[i] === 2) _bgmSnare(t);

      bgmBeat += BEAT;
      bgmIdx++;
    }
    setTimeout(_schedule, 200);
  }

  function startBGM() {
    if (bgmOn) return;
    bgmOn   = true;
    bgmBeat = ctx().currentTime + 0.1;
    bgmIdx  = 0;
    _schedule();
  }

  function stopBGM() {
    bgmOn = false;
  }

  // ── 音量控制 ──────────────────────────────────────────

  function setMute(m) {
    _muted = m;
    if (ac) masterG.gain.value = m ? 0 : 0.78;
  }

  function toggleMute() {
    setMute(!_muted);
    return _muted;
  }

  function isMuted() { return _muted; }

  return { shoot, heroShoot, die, build, upgrade, waveStart,
           fortressHit, gameOver, victory,
           startBGM, stopBGM, setMute, toggleMute, isMuted };
})();
