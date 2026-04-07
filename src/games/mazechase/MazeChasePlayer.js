/**
 * ============================================================
 * TINA MINIGAME — MazeChasePlayer (Phaser.js Powered)
 * ============================================================
 * Maze Chase: Player navigates a maze to collect correct answers
 * while avoiding enemy chasers.
 *
 * Uses Phaser 3 for 2D rendering, collision, and pathfinding.
 * Wraps in React component for Next.js integration.
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameEvents } from '@/lib/engines/useGameEvents';
import { GameEvent } from '@/lib/gameEvents';
import { CountdownScreen, GameTopBar, TimerBar, ResultScreen } from '@/components/GameShell';
import styles from './MazeChasePlayer.module.css';

// ── Maze Generator (Simple recursive backtracker) ──────
function generateMaze(cols, rows) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(1));
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

  function carve(x, y) {
    visited[y][x] = true;
    grid[y][x] = 0;
    const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]].sort(() => Math.random() - 0.5);
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !visited[ny][nx]) {
        grid[y + dy / 2][x + dx / 2] = 0;
        carve(nx, ny);
      }
    }
  }

  carve(1, 1);
  return grid;
}

// ── Phaser Scene ───────────────────────────────────────
class MazeScene {
  constructor(config) {
    this.items = config.items;
    this.emit = config.emit;
    this.GameEvent = config.GameEvent;
    this.onCollect = config.onCollect;
    this.onCaught = config.onCaught;
    this.onComplete = config.onComplete;
  }

  create(game) {
    this.game = game;
    const ctx = game.canvas.getContext('2d');
    this.ctx = ctx;
    this.width = game.canvas.width;
    this.height = game.canvas.height;

    // Generate maze
    this.cols = 15;
    this.rows = 11;
    this.tileSize = Math.min(
      Math.floor(this.width / this.cols),
      Math.floor(this.height / this.rows)
    );
    this.maze = generateMaze(this.cols, this.rows);

    // Player
    this.player = { x: 1, y: 1, targetX: 1, targetY: 1 };

    // Place collectibles (items)
    this.collectibles = [];
    const freeTiles = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.maze[y][x] === 0 && !(x === 1 && y === 1)) {
          freeTiles.push({ x, y });
        }
      }
    }
    // Shuffle and place items
    for (let i = freeTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [freeTiles[i], freeTiles[j]] = [freeTiles[j], freeTiles[i]];
    }
    const maxCollectibles = Math.min(this.items.length, freeTiles.length, 8);
    for (let i = 0; i < maxCollectibles; i++) {
      this.collectibles.push({
        ...freeTiles[i],
        item: this.items[i],
        collected: false,
        isCorrect: i < Math.ceil(maxCollectibles * 0.6),
      });
    }

    // Enemies
    this.enemies = [];
    for (let i = 0; i < 2; i++) {
      const pos = freeTiles[maxCollectibles + i] || freeTiles[freeTiles.length - 1 - i];
      if (pos) {
        this.enemies.push({
          x: pos.x, y: pos.y,
          targetX: pos.x, targetY: pos.y,
          moveTimer: 0,
          speed: 400 + i * 200,
        });
      }
    }

    // Input
    this.keys = { up: false, down: false, left: false, right: false };
    this.moveTimer = 0;
    this.moveSpeed = 150; // ms per tile

    // Keyboard
    document.addEventListener('keydown', this._onKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w') this.keys.up = true;
      if (e.key === 'ArrowDown' || e.key === 's') this.keys.down = true;
      if (e.key === 'ArrowLeft' || e.key === 'a') this.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') this.keys.right = true;
    });
    document.addEventListener('keyup', this._onKeyUp = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w') this.keys.up = false;
      if (e.key === 'ArrowDown' || e.key === 's') this.keys.down = false;
      if (e.key === 'ArrowLeft' || e.key === 'a') this.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') this.keys.right = false;
    });

    // Touch controls
    this.touchStart = null;
    game.canvas.addEventListener('touchstart', this._onTouchStart = (e) => {
      const t = e.touches[0];
      this.touchStart = { x: t.clientX, y: t.clientY };
    });
    game.canvas.addEventListener('touchmove', this._onTouchMove = (e) => {
      if (!this.touchStart) return;
      e.preventDefault();
      const t = e.touches[0];
      const dx = t.clientX - this.touchStart.x;
      const dy = t.clientY - this.touchStart.y;
      const threshold = 30;
      if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
        if (Math.abs(dx) > Math.abs(dy)) {
          this.keys = { up: false, down: false, left: dx < 0, right: dx > 0 };
        } else {
          this.keys = { up: dy < 0, down: dy > 0, left: false, right: false };
        }
        this.touchStart = { x: t.clientX, y: t.clientY };
      }
    }, { passive: false });
    game.canvas.addEventListener('touchend', this._onTouchEnd = () => {
      this.keys = { up: false, down: false, left: false, right: false };
      this.touchStart = null;
    });

    this.lastTime = Date.now();
    this.running = true;
    this.animFrame = requestAnimationFrame(() => this.update());

    // Load images
    this.heroImg = new Image();
    this.heroImg.src = '/sprites/maze-chase.png';
    this.enemyImg = new Image();
    this.enemyImg.src = '/sprites/maze-chase.png';
  }

  update() {
    if (!this.running) return;
    const now = Date.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    // Move player
    this.moveTimer += dt;
    if (this.moveTimer >= this.moveSpeed) {
      this.moveTimer = 0;
      let dx = 0, dy = 0;
      if (this.keys.up) dy = -1;
      else if (this.keys.down) dy = 1;
      else if (this.keys.left) dx = -1;
      else if (this.keys.right) dx = 1;

      const nx = this.player.x + dx;
      const ny = this.player.y + dy;
      if (dx !== 0 || dy !== 0) {
        if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows && this.maze[ny][nx] === 0) {
          this.player.x = nx;
          this.player.y = ny;
        }
      }

      // Check collectible collision
      for (const c of this.collectibles) {
        if (!c.collected && c.x === this.player.x && c.y === this.player.y) {
          c.collected = true;
          this.onCollect(c);
        }
      }

      // Check if all correct collected
      const allCorrect = this.collectibles.filter(c => c.isCorrect).every(c => c.collected);
      if (allCorrect) {
        this.onComplete();
        this.running = false;
        return;
      }
    }

    // Move enemies
    for (const enemy of this.enemies) {
      enemy.moveTimer += dt;
      if (enemy.moveTimer >= enemy.speed) {
        enemy.moveTimer = 0;
        // Simple chase: move towards player
        const dx = Math.sign(this.player.x - enemy.x);
        const dy = Math.sign(this.player.y - enemy.y);
        // Try horizontal first, then vertical
        let moved = false;
        if (dx !== 0) {
          const nx = enemy.x + dx;
          if (nx >= 0 && nx < this.cols && this.maze[enemy.y][nx] === 0) {
            enemy.x = nx;
            moved = true;
          }
        }
        if (!moved && dy !== 0) {
          const ny = enemy.y + dy;
          if (ny >= 0 && ny < this.rows && this.maze[ny][enemy.x] === 0) {
            enemy.y = ny;
          }
        }

        // Check if caught player
        if (enemy.x === this.player.x && enemy.y === this.player.y) {
          this.onCaught();
        }
      }
    }

    this.render();
    this.animFrame = requestAnimationFrame(() => this.update());
  }

  render() {
    const ctx = this.ctx;
    const ts = this.tileSize;
    const offsetX = Math.floor((this.width - this.cols * ts) / 2);
    const offsetY = Math.floor((this.height - this.rows * ts) / 2);

    ctx.clearRect(0, 0, this.width, this.height);

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw maze
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const px = offsetX + x * ts;
        const py = offsetY + y * ts;
        if (this.maze[y][x] === 1) {
          // Wall
          const gradient = ctx.createLinearGradient(px, py, px + ts, py + ts);
          gradient.addColorStop(0, '#4834d4');
          gradient.addColorStop(1, '#6C5CE7');
          ctx.fillStyle = gradient;
          ctx.fillRect(px, py, ts, ts);
          // Wall highlight
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.strokeRect(px + 1, py + 1, ts - 2, ts - 2);
        } else {
          // Floor
          ctx.fillStyle = '#2d2d44';
          ctx.fillRect(px, py, ts, ts);
          // Floor pattern
          ctx.fillStyle = 'rgba(255,255,255,0.02)';
          ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
        }
      }
    }

    // Draw collectibles
    for (const c of this.collectibles) {
      if (c.collected) continue;
      const px = offsetX + c.x * ts + ts / 2;
      const py = offsetY + c.y * ts + ts / 2;
      const r = ts * 0.35;

      // Glow
      ctx.beginPath();
      ctx.arc(px, py, r + 4, 0, Math.PI * 2);
      ctx.fillStyle = c.isCorrect ? 'rgba(107,203,119,0.3)' : 'rgba(255,107,107,0.3)';
      ctx.fill();

      // Circle
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(px - 2, py - 2, 0, px, py, r);
      if (c.isCorrect) {
        g.addColorStop(0, '#FFD93D');
        g.addColorStop(1, '#F0932B');
      } else {
        g.addColorStop(0, '#FF6B6B');
        g.addColorStop(1, '#c0392b');
      }
      ctx.fillStyle = g;
      ctx.fill();

      // Label
      ctx.fillStyle = 'white';
      ctx.font = `bold ${Math.max(9, ts * 0.22)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = (c.item?.term || '?').slice(0, 6);
      ctx.fillText(label, px, py);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      const px = offsetX + enemy.x * ts + ts / 2;
      const py = offsetY + enemy.y * ts + ts / 2;
      const r = ts * 0.38;

      // Enemy glow
      ctx.beginPath();
      ctx.arc(px, py, r + 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,71,87,0.4)';
      ctx.fill();

      // Enemy body
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      const eg = ctx.createRadialGradient(px - 2, py - 2, 0, px, py, r);
      eg.addColorStop(0, '#ff6b6b');
      eg.addColorStop(1, '#ee5a24');
      ctx.fillStyle = eg;
      ctx.fill();

      // Enemy face
      ctx.fillStyle = 'white';
      ctx.font = `bold ${Math.max(12, ts * 0.4)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👻', px, py);
    }

    // Draw player
    const ppx = offsetX + this.player.x * ts + ts / 2;
    const ppy = offsetY + this.player.y * ts + ts / 2;
    const pr = ts * 0.4;

    // Player glow
    ctx.beginPath();
    ctx.arc(ppx, ppy, pr + 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(77,150,255,0.4)';
    ctx.fill();

    // Player body
    ctx.beginPath();
    ctx.arc(ppx, ppy, pr, 0, Math.PI * 2);
    const pg = ctx.createRadialGradient(ppx - 3, ppy - 3, 0, ppx, ppy, pr);
    pg.addColorStop(0, '#74b9ff');
    pg.addColorStop(1, '#0984e3');
    ctx.fillStyle = pg;
    ctx.fill();

    // Player face
    ctx.fillStyle = 'white';
    ctx.font = `bold ${Math.max(14, ts * 0.45)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐱', ppx, ppy);
  }

  destroy() {
    this.running = false;
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    if (this.game?.canvas) {
      this.game.canvas.removeEventListener('touchstart', this._onTouchStart);
      this.game.canvas.removeEventListener('touchmove', this._onTouchMove);
      this.game.canvas.removeEventListener('touchend', this._onTouchEnd);
    }
  }
}

// ── React Component ────────────────────────────────────
export default function MazeChasePlayer({ items, activity, playerName }) {
  const { emit, GameEvent: GE } = useGameEvents('fun');
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);

  const [phase, setPhase] = useState('countdown');
  const [countdownNum, setCountdownNum] = useState(3);
  const [score, setScore] = useState(0);
  const [collected, setCollected] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [lives, setLives] = useState(3);
  const timerRef = useRef(null);

  // Countdown
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownNum <= 0) {
      setPhase('playing');
      emit(GE.GAME_START);
      return;
    }
    const t = setTimeout(() => {
      if (countdownNum === 1) emit(GE.COUNTDOWN_GO);
      else emit(GE.COUNTDOWN_TICK);
      setCountdownNum(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, countdownNum, emit, GE]);

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 5 && prev > 1) emit(GE.TIMER_WARNING);
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setPhase('result');
          emit(GE.GAME_COMPLETE);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, emit, GE]);

  // Initialize canvas game
  useEffect(() => {
    if (phase !== 'playing' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);

    const correctCount = Math.min(Math.ceil(items.length * 0.6), 8);
    setTotalCorrect(correctCount);

    const scene = new MazeScene({
      items,
      emit,
      GameEvent: GE,
      onCollect: (c) => {
        if (c.isCorrect) {
          emit(GE.CORRECT);
          setScore(prev => prev + 500);
          setCollected(prev => prev + 1);
        } else {
          emit(GE.WRONG);
          setScore(prev => Math.max(0, prev - 200));
        }
      },
      onCaught: () => {
        emit(GE.WRONG);
        setLives(prev => {
          const next = prev - 1;
          if (next <= 0) {
            setTimeout(() => {
              setPhase('result');
              emit(GE.GAME_COMPLETE);
            }, 500);
          }
          return next;
        });
      },
      onComplete: () => {
        clearInterval(timerRef.current);
        setTimeout(() => {
          setPhase('result');
          emit(GE.GAME_COMPLETE);
        }, 800);
      },
    });

    scene.create({ canvas });
    sceneRef.current = scene;

    return () => {
      scene.destroy();
    };
  }, [phase, items, emit, GE]);

  if (phase === 'countdown') {
    return <CountdownScreen num={countdownNum} label="Mê Cung Đuổi Bắt" emoji="🏃" />;
  }

  if (phase === 'result') {
    const answers = Array.from({ length: collected }, (_, i) => ({ questionIndex: i, correct: true }));
    return <ResultScreen playerName={playerName} score={score} answers={answers} items={items.slice(0, collected)} title="Kết Quả Mê Cung" />;
  }

  return (
    <div className={styles.gamePage}>
      <GameTopBar
        counter={`⭐ ${collected}/${totalCorrect}`}
        playerName={playerName}
        score={score}
        extra={
          <div className={styles.livesBar}>
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className={`${styles.heart} ${i >= lives ? styles.heartLost : ''}`}>❤️</span>
            ))}
          </div>
        }
      />
      <TimerBar timeLeft={timeLeft} maxTime={90} />

      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} className={styles.gameCanvas} />
      </div>

      <div className={styles.controls}>
        <span className={styles.controlHint}>🎮 Arrow keys / WASD / Vuốt để di chuyển</span>
      </div>
    </div>
  );
}
