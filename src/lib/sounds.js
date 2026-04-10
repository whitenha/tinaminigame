/**
 * ============================================================
 * TINA MINIGAME — Sound Manager v2 (TV Gameshow Edition)
 * ============================================================
 * Synthesized game sounds using Web Audio API.
 * No external files needed — all sounds generated in real-time.
 *
 * v2: Added dramatic crowd effects, suspense drumroll,
 *     whoosh fire, and enhanced ticking for smartboard.
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicEnabled = true;

    // Default reference volumes (max scale)
    this.baseVolume = 0.6;
    this.baseMusicVolume = 0.3;
    
    this.volume = this.baseVolume;
    this.musicVolume = this.baseMusicVolume;
    this.currentMusic = null;
    
    // Attempt to load saved volumes
    this._loadSavedVolumes();
  }

  _loadSavedVolumes() {
    try {
      if (typeof window !== 'undefined') {
        const savedMusic = localStorage.getItem('tina_musicVol');
        if (savedMusic !== null) this.setMusicVolume(parseInt(savedMusic, 10));

        const savedEffects = localStorage.getItem('tina_effectsVol');
        if (savedEffects !== null) this.setEffectsVolume(parseInt(savedEffects, 10));
      }
    } catch(e) {}
  }

  setEffectsVolume(percent) {
    this.volume = (Math.max(0, Math.min(100, percent)) / 100) * this.baseVolume;
  }

  setMusicVolume(percent) {
    this.musicVolume = (Math.max(0, Math.min(100, percent)) / 100) * this.baseMusicVolume;
    // Note: Since music loops are scheduled into the future with dynamic createGain nodes, 
    // the next beat scheduled will automatically adopt the new this.musicVolume.
  }

  _getCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.ctx;
  }

  _resumeCtx() {
    const ctx = this._getCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // ── CORE SOUND PRIMITIVES ──────────────────────────────

  _playTone(freq, duration, type = 'sine', vol = 0.3, delay = 0) {
    if (!this.enabled || this.volume <= 0) return;
    const ctx = this._resumeCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    const startGain = Math.max(0.002, vol * this.volume);
    gain.gain.setValueAtTime(startGain, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  }

  _playNoise(duration, vol = 0.1, delay = 0) {
    if (!this.enabled || this.volume <= 0) return;
    const ctx = this._resumeCtx();
    if (!ctx) return;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.002, vol * this.volume), ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime + delay);
  }

  // ── GAME SOUND EFFECTS ─────────────────────────────────

  /** Correct answer — triumphant fanfare burst */
  correct() {
    const ctx = this._resumeCtx();
    if (!ctx || !this.enabled) return;
    // Bright ascending arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      this._playTone(freq, 0.25, 'sine', 0.3, i * 0.07);
    });
    // Shimmer overtone
    this._playTone(1568, 0.3, 'sine', 0.08, 0.2);
    this._playTone(2093, 0.2, 'sine', 0.05, 0.25);
  }

  /** Wrong answer — dramatic fail buzz */
  wrong() {
    this._playTone(300, 0.15, 'square', 0.18);
    this._playTone(200, 0.35, 'square', 0.14, 0.1);
    this._playTone(150, 0.25, 'sawtooth', 0.08, 0.2);
  }

  /** Grandiose explosion shatter */
  explode() {
    if (!this.enabled) return;
    const ctx = this._resumeCtx();
    if (!ctx) return;
    
    // Deep sub-bass drop (Thud)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.8 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);

    // White noise blast (Shatter/Crack)
    this._playNoise(0.8, 0.6);
    // Overlapping sharp metallic ping (Glass breaking)
    this._playTone(1800, 0.1, 'square', 0.3);
    this._playTone(2200, 0.15, 'triangle', 0.2, 0.05);
    this._playTone(1500, 0.2, 'sawtooth', 0.15, 0.1);
  }

  /** Button click — tactile pop */
  click() {
    this._playTone(800, 0.04, 'sine', 0.15);
    this._playTone(1200, 0.03, 'sine', 0.1, 0.025);
  }

  /** Timer tick — clock sound */
  tick() {
    this._playTone(1000, 0.03, 'square', 0.08);
  }

  /** Timer warning (last 5 seconds) — urgent dramatic ticking */
  timerWarning() {
    // Heavy tock sound
    this._playTone(150, 0.08, 'square', 0.25);
    this._playTone(880, 0.06, 'square', 0.18, 0.01);
  }

  /** Timer expired — dramatic alarm */
  timeUp() {
    this._playTone(440, 0.15, 'sawtooth', 0.25);
    this._playTone(330, 0.15, 'sawtooth', 0.22, 0.15);
    this._playTone(220, 0.5, 'sawtooth', 0.18, 0.3);
    this._playNoise(0.3, 0.08, 0.1);
  }

  /** Game start — epic TV fanfare */
  gameStart() {
    const notes = [392, 523.25, 659.25, 783.99, 1046.50]; // G4 C5 E5 G5 C6
    notes.forEach((freq, i) => {
      this._playTone(freq, 0.35, 'sine', 0.22, i * 0.1);
    });
    // Bass foundation
    this._playTone(130.81, 0.8, 'sine', 0.12);
    this._playTone(196, 0.6, 'triangle', 0.08, 0.3);
  }

  /** Game over / results — triumphant victory melody */
  gameComplete() {
    const melody = [523.25, 587.33, 659.25, 783.99, 659.25, 783.99, 1046.50, 1318.51];
    melody.forEach((freq, i) => {
      this._playTone(freq, 0.3, 'sine', 0.2, i * 0.12);
    });
    // Bass accompaniment
    this._playTone(261.63, 1.0, 'sine', 0.1);
    this._playTone(196, 0.8, 'triangle', 0.06, 0.5);
  }

  /** Card flip — whoosh */
  cardFlip() {
    this._playNoise(0.08, 0.15);
    this._playTone(600, 0.08, 'sine', 0.1);
  }

  /** Wheel spin — escalating ticks */
  wheelTick() {
    this._playTone(1200 + Math.random() * 400, 0.02, 'sine', 0.12);
  }

  /** Wheel stop — dramatic reveal */
  wheelStop() {
    this._playTone(880, 0.35, 'triangle', 0.35);
    this._playTone(1108.73, 0.45, 'triangle', 0.28, 0.2);
    this._playTone(1318.51, 0.35, 'sine', 0.2, 0.4);
  }

  /** Box open — explosive pop + sparkle */
  boxOpen() {
    this._playNoise(0.06, 0.15);
    this._playTone(1318.51, 0.15, 'sine', 0.22, 0.04);
    this._playTone(1567.98, 0.2, 'sine', 0.18, 0.1);
    this._playTone(2093, 0.15, 'sine', 0.1, 0.18);
  }

  /** Lifeline used (gameshow) */
  lifeline() {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      this._playTone(freq, 0.18, 'triangle', 0.22, i * 0.08);
    });
  }

  /** Score bonus — shimmer cascade */
  bonus() {
    for (let i = 0; i < 6; i++) {
      this._playTone(1000 + i * 200, 0.12, 'sine', 0.12, i * 0.04);
    }
  }

  /** Countdown beep (3, 2, 1, GO!) */
  countdownBeep(isGo = false) {
    if (isGo) {
      this._playTone(880, 0.5, 'sine', 0.35);
      this._playTone(1108.73, 0.4, 'sine', 0.2, 0.15);
    } else {
      this._playTone(440, 0.25, 'sine', 0.25);
    }
  }

  /** Swipe sound for cards */
  swipe() {
    this._playNoise(0.06, 0.08);
    this._playTone(400, 0.06, 'sine', 0.08);
  }

  /** Bet placed (win or lose) */
  betPlaced() {
    this._playTone(523.25, 0.08, 'triangle', 0.15);
    this._playTone(659.25, 0.08, 'triangle', 0.15, 0.07);
  }

  /** Image reveal step */
  reveal() {
    this._playTone(800 + Math.random() * 400, 0.1, 'sine', 0.1);
  }

  /** Buzzer (image quiz) */
  buzzer() {
    this._playTone(880, 0.15, 'sine', 0.28);
    this._playTone(1108.73, 0.15, 'sine', 0.25, 0.09);
    this._playTone(1318.51, 0.2, 'sine', 0.22, 0.18);
  }

  // ══════════════════════════════════════════════════════════
  // NEW v2: TV GAMESHOW DRAMATIC EFFECTS
  // ══════════════════════════════════════════════════════════

  /** 📢 Crowd Applause — synthesized cheering (white noise + tones) */
  crowdApplause() {
    if (!this.enabled) return;
    const ctx = this._resumeCtx();
    if (!ctx) return;

    // Layered noise bursts to simulate clapping crowd
    for (let w = 0; w < 6; w++) {
      this._playNoise(0.15 + Math.random() * 0.1, 0.06 + Math.random() * 0.04, w * 0.12);
    }
    // Happy overtones
    this._playTone(523, 0.6, 'sine', 0.04);
    this._playTone(659, 0.5, 'sine', 0.03, 0.1);
    this._playTone(784, 0.4, 'sine', 0.02, 0.2);
  }

  /** 😔 Crowd "Awww" — descending slide with noise */
  crowdAww() {
    if (!this.enabled) return;
    const ctx = this._resumeCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.08 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.0);
    // Sympathetic noise
    this._playNoise(0.5, 0.03, 0.1);
  }

  /** 🥁 Suspense Drumroll — escalating tension before reveal */
  drumroll(durationMs = 2000) {
    if (!this.enabled) return;
    const ticks = Math.floor(durationMs / 60);
    for (let i = 0; i < ticks; i++) {
      const vol = 0.03 + (i / ticks) * 0.12; // crescendo
      const freq = 100 + Math.random() * 40;
      this._playTone(freq, 0.04, 'square', vol, i * 0.06);
      this._playNoise(0.03, vol * 0.5, i * 0.06 + 0.02);
    }
  }

  /** 🔥 Streak Whoosh — fire sweep */
  streakFire() {
    if (!this.enabled) return;
    for (let i = 0; i < 8; i++) {
      this._playNoise(0.06, 0.08 + i * 0.01, i * 0.03);
      this._playTone(200 + i * 100, 0.08, 'sawtooth', 0.06, i * 0.03);
    }
    // Top sparkle
    this._playTone(2000, 0.15, 'sine', 0.08, 0.25);
    this._playTone(2400, 0.12, 'sine', 0.06, 0.3);
  }

  /** 🎰 Jackpot Bling — slot machine payout sound */
  jackpot() {
    const notes = [1046, 1318, 1568, 2093, 1568, 2093, 2637];
    notes.forEach((freq, i) => {
      this._playTone(freq, 0.2, 'sine', 0.15, i * 0.08);
      this._playTone(freq * 0.5, 0.15, 'triangle', 0.06, i * 0.08);
    });
    // Coin rain noise
    for (let i = 0; i < 10; i++) {
      this._playTone(3000 + Math.random() * 2000, 0.04, 'sine', 0.04, 0.5 + i * 0.06);
    }
  }

  /** ⏱️ Final Countdown — dramatic 5-second ticking */
  finalCountdown() {
    if (!this.enabled) return;
    // 5 heavy ticks, each louder
    for (let i = 0; i < 5; i++) {
      const vol = 0.15 + i * 0.04;
      this._playTone(80, 0.08, 'square', vol, i * 1.0);
      this._playTone(600, 0.04, 'sine', vol * 0.6, i * 1.0 + 0.01);
    }
  }

  // ── BACKGROUND MUSIC (Procedural) ──────────────────────

  /** Start ambient background loop */
  startMusic(type = 'quiz') {
    if (!this.musicEnabled) return;
    this.stopMusic();

    const ctx = this._resumeCtx();
    if (!ctx) return;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(this.musicVolume * 0.15, ctx.currentTime);
    gainNode.connect(ctx.destination);

    const musicLoop = () => {
      if (!this.musicEnabled || !this.currentMusic) return;

      const chords = {
        quiz: [[261.63, 329.63, 392], [293.66, 369.99, 440], [329.63, 415.30, 493.88], [293.66, 369.99, 440]],
        gameshow: [[349.23, 440, 523.25], [392, 493.88, 587.33], [440, 554.37, 659.25], [392, 493.88, 587.33]],
        calm: [[261.63, 329.63, 392], [246.94, 311.13, 369.99], [261.63, 329.63, 392], [293.66, 369.99, 440]],
        fun: [[329.63, 415.30, 493.88], [349.23, 440, 523.25], [392, 493.88, 587.33], [349.23, 440, 523.25]],
      };

      const progression = chords[type] || chords.quiz;
      let beatIndex = 0;

      const playBeat = () => {
        if (!this.currentMusic) return;
        
        if (this.musicEnabled && this.musicVolume > 0) {
          const chord = progression[beatIndex % progression.length];
          chord.forEach(freq => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            const g = ctx.createGain();
            const startGain = Math.max(0.002, this.musicVolume * 0.06);
            g.gain.setValueAtTime(startGain, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 2);
          });
        }
        beatIndex++;
        this.currentMusic = setTimeout(playBeat, 2000);
      };

      playBeat();
    };

    this.currentMusic = true;
    musicLoop();
  }

  /** Stop background music */
  stopMusic() {
    if (this.currentMusic && typeof this.currentMusic === 'number') {
      clearTimeout(this.currentMusic);
    }
    this.currentMusic = null;
  }

  /** Toggle sound effects on/off */
  toggleSound() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  /** Toggle music on/off */
  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) this.stopMusic();
    return this.musicEnabled;
  }

  /** Cleanup */
  destroy() {
    this.stopMusic();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

// Singleton instance
let soundManagerInstance = null;

export function getSoundManager() {
  if (!soundManagerInstance) {
    soundManagerInstance = new SoundManager();
  }
  return soundManagerInstance;
}

export default SoundManager;
