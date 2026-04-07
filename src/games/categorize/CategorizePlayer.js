'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CountdownScreen, ResultScreen } from '@/components/GameShell';
import { getSoundManager } from '@/lib/sounds';
import { ParticleSystem } from './particles';
import {
  GRAVITY, MAX_PULL, LAUNCH_POWER, FRICTION,
  GROUND_Y_OFFSET, TRAIL_LENGTH, SLOWMO_DISTANCE,
  SLOWMO_FACTOR, NEST_HIT_RADIUS, BIRD_IMAGES, NEST_IMG,
} from './constants';
import styles from './CategorizePlayer.module.css';

// ── Helper: Build game data from activity GROUP items ──
function buildGameData(items) {
  const columns = [];
  const pieces = [];
  const colMap = {};

  items.forEach(item => {
    const groupName = item.extra_data?.group_name || item.extra_data?.column || 'Nhóm';
    if (!colMap[groupName]) {
      const colId = `col_${columns.length}`;
      colMap[groupName] = colId;
      columns.push({ id: colId, title: groupName });
    }
    const colId = colMap[groupName];
    const keywords = item.extra_data?.keywords || item.extra_data?.items || [];
    keywords.forEach((kw, ki) => {
      pieces.push({
        id: `${colId}_p${ki}_${kw}`,
        text: kw,
        correctColId: colId,
        isWrongItem: false,
      });
    });
  });

  return { columns, pieces };
}

export default function CategorizePlayer({ items, activity, playerName, gameMode = 'batch' }) {
  // ── Phase management ──
  const [phase, setPhase] = useState('countdown');
  const [countdownNum, setCountdownNum] = useState(3);
  const [score, setScore] = useState(0);

  // ── Game data ──
  const { columns, pieces: allPieces } = useMemo(() => buildGameData(items), [items]);

  // ── Queue & results ──
  const [queue, setQueue] = useState([]);
  const [results, setResults] = useState([]); // { pieceId, nestId, correct }
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  // ── Physics state (refs for perf) ──
  const birdRef = useRef(null);       // DOM ref for the flying bird
  const canvasRef = useRef(null);     // Particle canvas
  const containerRef = useRef(null);  // Game container
  const nestRefs = useRef({});        // { colId: DOM element }
  const particleSystemRef = useRef(null);

  // Slingshot interaction
  const [isDragging, setIsDragging] = useState(false);
  const [pullVec, setPullVec] = useState({ x: 0, y: 0 });  // Pull vector from origin
  const [birdState, setBirdState] = useState('idle');        // idle, pulling, flying, landed, missed
  const [showSlowmo, setShowSlowmo] = useState(false);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [currentBirdImg, setCurrentBirdImg] = useState(0);
  const [feedbackText, setFeedbackText] = useState(null); // { text, type: 'correct'|'wrong', nestId }

  // Physics internals (mutable refs for RAF loop)
  const physicsRef = useRef({
    x: 0, y: 0, vx: 0, vy: 0,
    rotation: 0, trail: [], flying: false,
    slowmo: false,
  });

  const slingshotOrigin = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);

  // ── Countdown ──
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownNum <= 0) {
      setPhase('playing');
      return;
    }
    const t = setTimeout(() => setCountdownNum(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdownNum]);

  // ── Initialize queue when playing starts ──
  useEffect(() => {
    if (phase !== 'playing') return;

    // Shuffle pieces
    const shuffled = [...allPieces].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    setResults([]);
    setCombo(0);
    setScore(0);

    // Init particle system
    if (canvasRef.current) {
      const ps = new ParticleSystem(canvasRef.current);
      ps.resize();
      ps.start();
      particleSystemRef.current = ps;
    }

    // Calculate slingshot origin (bottom center)
    const updateOrigin = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        slingshotOrigin.current = {
          x: rect.width / 2,
          y: rect.height - GROUND_Y_OFFSET,
        };
      }
    };
    updateOrigin();
    window.addEventListener('resize', updateOrigin);

    getSoundManager().gameStart();

    return () => {
      window.removeEventListener('resize', updateOrigin);
      if (particleSystemRef.current) particleSystemRef.current.stop();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, allPieces]);

  // Resize canvas on window resize
  useEffect(() => {
    const handleResize = () => {
      if (particleSystemRef.current) particleSystemRef.current.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Current piece
  const currentPiece = queue[0] || null;

  // ── Slingshot Drag Handlers ──
  const getPointerPos = (e) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handlePointerDown = useCallback((e) => {
    if (birdState !== 'idle' || !currentPiece) return;
    e.preventDefault();
    setIsDragging(true);
    setBirdState('pulling');
    getSoundManager().click();
  }, [birdState, currentPiece]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging || birdState !== 'pulling') return;
    e.preventDefault();
    const pos = getPointerPos(e);
    const origin = slingshotOrigin.current;
    let dx = origin.x - pos.x;
    let dy = origin.y - pos.y;

    // Clamp pull distance
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > MAX_PULL) {
      dx = (dx / dist) * MAX_PULL;
      dy = (dy / dist) * MAX_PULL;
    }

    // Only allow pulling downward/backward (dy should be positive = pulling down)
    setPullVec({ x: -dx, y: -dy });
  }, [isDragging, birdState]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging || birdState !== 'pulling') return;
    setIsDragging(false);

    const pull = pullVec;
    const dist = Math.sqrt(pull.x * pull.x + pull.y * pull.y);

    if (dist < 15) {
      // Too small a pull, reset
      setBirdState('idle');
      setPullVec({ x: 0, y: 0 });
      return;
    }

    // Launch!
    const origin = slingshotOrigin.current;
    physicsRef.current = {
      x: origin.x,
      y: origin.y,
      vx: -pull.x * LAUNCH_POWER,
      vy: -pull.y * LAUNCH_POWER,
      rotation: 0,
      trail: [],
      flying: true,
      slowmo: false,
    };

    setBirdState('flying');
    setPullVec({ x: 0, y: 0 });

    // Sound
    getSoundManager()._playNoise(0.15, 0.3);
    getSoundManager()._playTone(300, 0.1, 'sine', 0.15);

    // Pick random bird image for next
    setCurrentBirdImg(Math.floor(Math.random() * BIRD_IMAGES.length));

    // Start physics loop
    startPhysicsLoop();
  }, [isDragging, birdState, pullVec]);

  // ── Physics Loop ──
  const startPhysicsLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const loop = () => {
      const p = physicsRef.current;
      if (!p.flying) return;

      const container = containerRef.current;
      if (!container) return;
      const bounds = { w: container.clientWidth, h: container.clientHeight };

      // Speed factor (slow-mo or normal)
      const speedFactor = p.slowmo ? SLOWMO_FACTOR : 1;

      // Update position
      p.vy += GRAVITY * speedFactor;
      p.vx *= FRICTION;
      p.vy *= FRICTION;
      p.x += p.vx * speedFactor;
      p.y += p.vy * speedFactor;

      // Rotation follows velocity
      p.rotation += (Math.abs(p.vx) + Math.abs(p.vy)) * 0.02 * speedFactor;

      // Trail
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > TRAIL_LENGTH) p.trail.shift();

      // Emit trail particles
      if (particleSystemRef.current) {
        particleSystemRef.current.emitTrail(p.x, p.y);
      }

      // Check collision with nests
      let hitNest = null;
      for (const colId of Object.keys(nestRefs.current)) {
        const nestEl = nestRefs.current[colId];
        if (!nestEl) continue;
        const nestRect = nestEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const nestCx = nestRect.left - containerRect.left + nestRect.width / 2;
        const nestCy = nestRect.top - containerRect.top + nestRect.height / 2;
        const dist = Math.sqrt((p.x - nestCx) ** 2 + (p.y - nestCy) ** 2);

        // Trigger slow-mo when approaching
        if (dist < SLOWMO_DISTANCE && !p.slowmo) {
          p.slowmo = true;
          setShowSlowmo(true);
        }

        if (dist < NEST_HIT_RADIUS) {
          hitNest = colId;
          break;
        }
      }

      // Update bird DOM directly (perf: no setState in RAF)
      if (birdRef.current) {
        birdRef.current.style.transform = `translate(${p.x - 40}px, ${p.y - 40}px) rotate(${p.rotation}rad)`;
        birdRef.current.style.display = 'flex';
      }

      if (hitNest) {
        p.flying = false;
        setShowSlowmo(false);
        handleNestHit(hitNest);
        return;
      }

      // Out of bounds check
      if (p.y > bounds.h + 50 || p.x < -100 || p.x > bounds.w + 100 || p.y < -200) {
        p.flying = false;
        setShowSlowmo(false);
        handleMiss();
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  // ── Collision Handlers ──
  const handleNestHit = useCallback((colId) => {
    const piece = queue[0];
    if (!piece) return;
    const isCorrect = piece.correctColId === colId;
    const p = physicsRef.current;

    if (isCorrect) {
      // Correct!
      getSoundManager().correct();
      const newCombo = combo + 1;
      setCombo(newCombo);
      if (newCombo > maxCombo) setMaxCombo(newCombo);

      const comboBonus = Math.min(newCombo, 5);
      const pointsEarned = 100 * comboBonus;
      setScore(s => s + pointsEarned);

      // Particles
      if (particleSystemRef.current) {
        particleSystemRef.current.emitConfetti(p.x, p.y);
        particleSystemRef.current.emitScorePopup(p.x, p.y - 30, `+${pointsEarned}`, '#FFD700');
        if (newCombo >= 3) {
          particleSystemRef.current.emitScorePopup(p.x, p.y - 70, `COMBO x${newCombo}! 🔥`, '#FF6348');
        }
      }

      setFeedbackText({ text: '✓ ĐÚNG!', type: 'correct', nestId: colId });
      setResults(prev => [...prev, { pieceId: piece.id, pieceText: piece.text, nestId: colId, correct: true }]);
    } else {
      // Wrong!
      getSoundManager().explode();
      setCombo(0);

      // Screen shake
      setShakeScreen(true);
      setTimeout(() => setShakeScreen(false), 400);

      // Particles
      if (particleSystemRef.current) {
        particleSystemRef.current.emitDebris(p.x, p.y);
        particleSystemRef.current.emitScorePopup(p.x, p.y - 30,
          `Sai! → ${columns.find(c => c.id === piece.correctColId)?.title}`, '#FF6348');
      }

      setFeedbackText({ text: `✗ SAI! Đáp án: ${columns.find(c => c.id === piece.correctColId)?.title}`, type: 'wrong', nestId: colId });
      setResults(prev => [...prev, { pieceId: piece.id, pieceText: piece.text, nestId: colId, correct: false }]);
    }

    // Hide bird, advance queue
    if (birdRef.current) birdRef.current.style.display = 'none';
    setBirdState('landed');

    setTimeout(() => {
      setFeedbackText(null);
      setQueue(prev => prev.slice(1));
      setBirdState('idle');
    }, 1800);
  }, [queue, combo, maxCombo, columns]);

  const handleMiss = useCallback(() => {
    const piece = queue[0];
    if (!piece) return;
    const p = physicsRef.current;

    getSoundManager()._playNoise(0.2, 0.15);
    setCombo(0);

    if (particleSystemRef.current) {
      particleSystemRef.current.emitDebris(p.x, Math.min(p.y, containerRef.current?.clientHeight - 30 || p.y));
      particleSystemRef.current.emitScorePopup(p.x, p.y - 40, 'Bắn hụt!', '#B2BEC3');
    }

    if (birdRef.current) birdRef.current.style.display = 'none';
    setBirdState('landed');

    // Re-queue the missed piece at end
    setTimeout(() => {
      setFeedbackText(null);
      setQueue(prev => {
        if (prev.length <= 1) return prev;
        const [missed, ...rest] = prev;
        return [...rest, missed]; // Send to back of queue
      });
      setBirdState('idle');
    }, 1200);
  }, [queue]);

  // ── Win check ──
  useEffect(() => {
    if (phase !== 'playing') return;
    if (queue.length === 0 && results.length > 0) {
      setTimeout(() => {
        getSoundManager().gameComplete();
        setPhase('result');
      }, 1000);
    }
  }, [queue.length, phase, results.length]);

  // ── Trajectory preview dots ──
  const trajectoryDots = useMemo(() => {
    if (birdState !== 'pulling' || !isDragging) return [];

    const origin = slingshotOrigin.current;
    const vx = -pullVec.x * LAUNCH_POWER;
    const vy = -pullVec.y * LAUNCH_POWER;

    const dots = [];
    let px = origin.x, py = origin.y;
    let tvx = vx, tvy = vy;

    for (let i = 0; i < 25; i++) {
      tvy += GRAVITY;
      tvx *= FRICTION;
      tvy *= FRICTION;
      px += tvx;
      py += tvy;
      if (i % 2 === 0) dots.push({ x: px, y: py, opacity: 1 - i / 25 });
    }
    return dots;
  }, [pullVec, birdState, isDragging]);

  // ── Calculate slingshot band positions ──
  const bandPath = useMemo(() => {
    if (birdState !== 'pulling') return null;
    const origin = slingshotOrigin.current;
    const birdX = origin.x + pullVec.x;
    const birdY = origin.y + pullVec.y;
    return {
      left: { x1: origin.x - 18, y1: origin.y - 35, x2: birdX, y2: birdY },
      right: { x1: origin.x + 18, y1: origin.y - 35, x2: birdX, y2: birdY },
    };
  }, [pullVec, birdState]);

  // ── Star rating ──
  const starRating = useMemo(() => {
    if (results.length === 0) return 0;
    const correctCount = results.filter(r => r.correct).length;
    const pct = correctCount / allPieces.length;
    if (pct >= 0.8) return 3;
    if (pct >= 0.5) return 2;
    return 1;
  }, [results, allPieces.length]);

  // ── Render ──
  if (phase === 'countdown') {
    return <CountdownScreen num={countdownNum} label="Angry Sort" emoji="🐦" />;
  }

  if (phase === 'result') {
    const correctCount = results.filter(r => r.correct).length;
    return (
      <div className={styles.resultWrapper}>
        <ResultScreen playerName={playerName} score={score} answers={[]} items={items} title="Kết Quả Angry Sort" />
        <div className={styles.starContainer}>
          {[1, 2, 3].map(s => (
            <span key={s} className={`${styles.star} ${s <= starRating ? styles.starActive : ''}`}>⭐</span>
          ))}
        </div>
        <div className={styles.resultStats}>
          <span>🎯 Chính xác: {correctCount}/{allPieces.length}</span>
          <span>🔥 Combo cao nhất: {maxCombo}</span>
        </div>
        <div className={styles.reviewSection}>
          <h3>📝 Bảng ôn tập</h3>
          <div className={styles.reviewGrid}>
            {columns.map(col => (
              <div key={col.id} className={styles.reviewCol}>
                <div className={styles.reviewColTitle}>{col.title}</div>
                {results.filter(r => {
                  const piece = allPieces.find(p => p.id === r.pieceId);
                  return piece?.correctColId === col.id;
                }).map(r => (
                  <div key={r.pieceId} className={`${styles.reviewItem} ${r.correct ? styles.reviewCorrect : styles.reviewWrong}`}>
                    {r.pieceText} {r.correct ? '✓' : '✗'}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.gameContainer} ${shakeScreen ? styles.screenShake : ''} ${showSlowmo ? styles.slowmoOverlay : ''}`}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >
      {/* Parallax Background */}
      <div className={styles.bgLayer1} />
      <div className={styles.bgLayer2} />
      <div className={styles.bgLayer3} />

      {/* Particle Canvas */}
      <canvas ref={canvasRef} className={styles.particleCanvas} />

      {/* HUD */}
      <div className={styles.hud}>
        <div className={styles.hudScore}>⭐ {score}</div>
        <div className={styles.hudProgress}>
          🐦 {results.length}/{allPieces.length}
        </div>
        {combo >= 2 && (
          <div className={`${styles.hudCombo} ${combo >= 5 ? styles.comboFire : ''}`}>
            🔥 x{combo}
          </div>
        )}
      </div>

      {/* Current word display */}
      {currentPiece && birdState === 'idle' && (
        <div className={styles.wordDisplay}>
          <span className={styles.wordText}>{currentPiece.text}</span>
          <span className={styles.wordHint}>Kéo chim về phía sau rồi nhả để bắn!</span>
        </div>
      )}

      {/* Nests (Targets) — arranged in arc */}
      <div className={styles.nestsContainer}>
        {columns.map((col, idx) => {
          const total = columns.length;
          const spreadAngle = Math.min(140, total * 35);
          const startAngle = (180 - spreadAngle) / 2;
          const angleDeg = startAngle + (spreadAngle / (total - 1 || 1)) * idx;
          const angleRad = (angleDeg * Math.PI) / 180;
          const radiusX = 38; // % from center
          const radiusY = 30; // % from center vertical
          const cx = 50 + radiusX * Math.cos(angleRad);
          const cy = 15 + radiusY * Math.sin(angleRad);

          return (
            <div
              key={col.id}
              ref={(el) => { nestRefs.current[col.id] = el; }}
              className={`${styles.nest} ${feedbackText?.nestId === col.id ? (feedbackText.type === 'correct' ? styles.nestCorrect : styles.nestWrong) : ''}`}
              style={{ left: `${cx}%`, top: `${cy}%` }}
            >
              <img src={NEST_IMG} alt="nest" className={styles.nestImg} draggable={false} />
              <div className={styles.nestLabel}>{col.title}</div>
              <div className={styles.nestCount}>
                {results.filter(r => r.correct && r.nestId === col.id).length}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trajectory dots */}
      {trajectoryDots.map((dot, i) => (
        <div
          key={i}
          className={styles.trajectoryDot}
          style={{
            left: dot.x,
            top: dot.y,
            opacity: dot.opacity * 0.6,
          }}
        />
      ))}

      {/* Slingshot rubber bands */}
      {bandPath && (
        <svg className={styles.bandSvg}>
          <line x1={bandPath.left.x1} y1={bandPath.left.y1} x2={bandPath.left.x2} y2={bandPath.left.y2} className={styles.band} />
          <line x1={bandPath.right.x1} y1={bandPath.right.y1} x2={bandPath.right.x2} y2={bandPath.right.y2} className={styles.band} />
        </svg>
      )}

      {/* Slingshot */}
      <div
        className={styles.slingshot}
        style={{
          left: slingshotOrigin.current.x - 35,
          top: slingshotOrigin.current.y - 70,
        }}
      >
        <img src="/games/categorize/slingshot.png" alt="slingshot" className={styles.slingshotImg} draggable={false} />
      </div>

      {/* Bird on slingshot (idle/pulling) */}
      {currentPiece && (birdState === 'idle' || birdState === 'pulling') && (
        <div
          className={styles.birdOnSling}
          style={{
            left: slingshotOrigin.current.x + pullVec.x - 40,
            top: slingshotOrigin.current.y + pullVec.y - 55,
          }}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
        >
          <img
            src={BIRD_IMAGES[currentBirdImg]}
            alt="bird"
            className={styles.birdImg}
            draggable={false}
          />
          <div className={styles.birdWord}>{currentPiece.text}</div>
        </div>
      )}

      {/* Flying bird (positioned by RAF) */}
      <div ref={birdRef} className={styles.flyingBird} style={{ display: 'none' }}>
        <img
          src={BIRD_IMAGES[currentBirdImg]}
          alt="bird"
          className={styles.birdImg}
          draggable={false}
        />
        {currentPiece && <div className={styles.birdWord}>{currentPiece.text}</div>}
      </div>

      {/* Feedback text */}
      {feedbackText && (
        <div className={`${styles.feedbackBanner} ${feedbackText.type === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong}`}>
          {feedbackText.text}
        </div>
      )}

      {/* Ground */}
      <div className={styles.ground} />

      {/* Slow-mo vignette */}
      {showSlowmo && <div className={styles.slowmoVignette} />}
    </div>
  );
}
