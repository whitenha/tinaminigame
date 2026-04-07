/**
 * ============================================================
 * TINA MINIGAME — Confetti & Screen Effects
 * ============================================================
 * TV Gameshow-level visual effects using canvas-confetti.
 * All effects are fire-and-forget — no cleanup needed.
 */

let confetti = null;

async function getConfetti() {
  if (confetti) return confetti;
  if (typeof window === 'undefined') return null;
  const mod = await import('canvas-confetti');
  confetti = mod.default;
  return confetti;
}

// ── EFFECT PRESETS ──────────────────────────────────────────

/** 🎉 Correct answer — short burst from bottom center */
export async function fireCorrect() {
  const c = await getConfetti();
  if (!c) return;
  c({
    particleCount: 80,
    spread: 70,
    origin: { x: 0.5, y: 0.85 },
    colors: ['#2ecc71', '#6BCB77', '#43e97b', '#38f9d7', '#FFD93D'],
    gravity: 1.2,
    scalar: 1.1,
    ticks: 120,
  });
}

/** ❌ Wrong answer — red particles droop down sadly */
export async function fireWrong() {
  const c = await getConfetti();
  if (!c) return;
  c({
    particleCount: 25,
    spread: 40,
    origin: { x: 0.5, y: 0.3 },
    colors: ['#e74c3c', '#FF6B6B', '#c0392b'],
    gravity: 2.5,
    scalar: 0.8,
    ticks: 60,
    shapes: ['circle'],
  });
}

/** 🔥 Streak bonus — dual cannons from corners */
export async function fireStreak(streakCount = 3) {
  const c = await getConfetti();
  if (!c) return;
  const intensity = Math.min(streakCount * 20, 150);
  // Left cannon
  c({
    particleCount: intensity,
    angle: 60,
    spread: 55,
    origin: { x: 0, y: 0.7 },
    colors: ['#FF6B6B', '#ff9f43', '#FDCB6E', '#FFD93D'],
    gravity: 0.8,
    scalar: 1.3,
  });
  // Right cannon
  c({
    particleCount: intensity,
    angle: 120,
    spread: 55,
    origin: { x: 1, y: 0.7 },
    colors: ['#FF6B6B', '#ff9f43', '#FDCB6E', '#FFD93D'],
    gravity: 0.8,
    scalar: 1.3,
  });
}

/** 🏆 Game complete — massive celebration (3 waves) */
export async function fireGameComplete() {
  const c = await getConfetti();
  if (!c) return;

  const colors = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCB77', '#4D96FF', '#A855F7', '#FB7185', '#38BDF8'];
  const defaults = { startVelocity: 35, spread: 360, ticks: 200, zIndex: 9999 };

  // Wave 1
  c({ ...defaults, particleCount: 100, origin: { x: 0.5, y: 0.4 }, colors });
  // Wave 2
  setTimeout(() => {
    c({ ...defaults, particleCount: 80, origin: { x: 0.3, y: 0.5 }, colors });
    c({ ...defaults, particleCount: 80, origin: { x: 0.7, y: 0.5 }, colors });
  }, 300);
  // Wave 3 — stars
  setTimeout(() => {
    c({ ...defaults, particleCount: 60, origin: { x: 0.5, y: 0.3 }, colors, shapes: ['star'], scalar: 1.5 });
  }, 700);
}

/** 🎰 Jackpot — continuous fireworks for 3 seconds */
export async function fireJackpot() {
  const c = await getConfetti();
  if (!c) return;

  const colors = ['#FFD93D', '#FDCB6E', '#ff9f43', '#ffeaa7', '#F8EFBA'];
  const end = Date.now() + 3000;

  (function frame() {
    c({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    c({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

// ── SCREEN EFFECTS (CSS-based) ──────────────────────────────

/** Flash the screen green briefly */
export function flashGreen() {
  if (typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;inset:0;z-index:99998;pointer-events:none;
    background:radial-gradient(circle,rgba(46,204,113,0.3),transparent 70%);
    animation:screenFlash 0.6s ease-out forwards;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

/** Flash the screen red + shake */
export function flashRedShake() {
  if (typeof document === 'undefined') return;
  // Red vignette
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;inset:0;z-index:99998;pointer-events:none;
    background:radial-gradient(circle,transparent 40%,rgba(231,76,60,0.25) 100%);
    animation:screenFlash 0.5s ease-out forwards;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 600);

  // Screen shake
  document.body.style.animation = 'screenShake 0.4s ease';
  setTimeout(() => { document.body.style.animation = ''; }, 500);
}

/** Timer danger pulse — red vignette that persists */
export function showTimerDanger() {
  if (typeof document === 'undefined') return;
  let el = document.getElementById('tina-timer-danger');
  if (el) return; // already showing
  el = document.createElement('div');
  el.id = 'tina-timer-danger';
  el.style.cssText = `
    position:fixed;inset:0;z-index:99997;pointer-events:none;
    background:radial-gradient(circle,transparent 50%,rgba(231,76,60,0.12) 100%);
    animation:dangerPulse 1s ease-in-out infinite;
  `;
  document.body.appendChild(el);
}

export function hideTimerDanger() {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('tina-timer-danger');
  if (el) el.remove();
}

// ── Inject Global Keyframes (once) ──────────────────────────
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes screenFlash {
      0% { opacity: 1; }
      100% { opacity: 0; }
    }
    @keyframes screenShake {
      0%, 100% { transform: translate(0); }
      10% { transform: translate(-6px, -3px); }
      20% { transform: translate(6px, 3px); }
      30% { transform: translate(-4px, 2px); }
      40% { transform: translate(4px, -2px); }
      50% { transform: translate(-2px, 1px); }
      60% { transform: translate(2px, -1px); }
    }
    @keyframes dangerPulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}
