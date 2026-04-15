'use client';

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { useGameEvents } from '@/lib/engines/useGameEvents';
import { CountdownScreen, GameTopBar, TimerBar, ResultScreen } from '@/components/GameShell';
import styles from './MazeChasePlayer.module.css';

// ── Maze Generator (Recursive Backtracker) ──────────────
function generateMaze(cols, rows) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(1)); // 1 = wall
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

  function carve(x, y) {
    visited[y][x] = true;
    grid[y][x] = 0; // 0 = path
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
  grid[1][1] = 0; // ensure start is open
  return grid;
}

// ── Phaser 4 Game Scene ─────────────────────────────────
class MazeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MazeScene' });
  }

  init(data) {
    this.items = data.items;
    this.onCollect = data.onCollect;
    this.onCaught = data.onCaught;
    this.onComplete = data.onComplete;
    this.inputDirection = { x: 0, y: 0 }; // For touch D-pad
  }

  preload() {
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });

    // Player — blue circle
    gfx.fillStyle(0x0984e3);
    gfx.fillCircle(16, 16, 14);
    gfx.generateTexture('player', 32, 32);
    gfx.clear();

    // Enemy — red circle
    gfx.fillStyle(0xff6b6b);
    gfx.fillCircle(16, 16, 14);
    gfx.generateTexture('enemy', 32, 32);
    gfx.clear();

    // Correct Item — gold
    gfx.fillStyle(0xffd93d);
    gfx.fillCircle(16, 16, 12);
    gfx.generateTexture('item_correct', 32, 32);
    gfx.clear();

    // Wrong Item — orange
    gfx.fillStyle(0xee5a24);
    gfx.fillCircle(16, 16, 12);
    gfx.generateTexture('item_wrong', 32, 32);
    gfx.clear();
  }

  /**
   * BFS pathfinding — returns the next tile {x,y} toward target.
   * Ghosts ONLY walk through open paths (maze[y][x] === 0).
   */
  bfsNextStep(fromX, fromY, toX, toY) {
    if (fromX === toX && fromY === toY) return null;

    const visited = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
    const parent = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    const queue = [{ x: fromX, y: fromY }];
    visited[fromY][fromX] = true;

    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    while (queue.length > 0) {
      const cur = queue.shift();
      if (cur.x === toX && cur.y === toY) {
        let step = cur;
        while (parent[step.y][step.x] &&
               (parent[step.y][step.x].x !== fromX || parent[step.y][step.x].y !== fromY)) {
          step = parent[step.y][step.x];
        }
        return step;
      }
      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows &&
            !visited[ny][nx] && this.maze[ny][nx] === 0) {
          visited[ny][nx] = true;
          parent[ny][nx] = cur;
          queue.push({ x: nx, y: ny });
        }
      }
    }
    return null;
  }

  create() {
    this.tileSize = 32;
    this.cols = 15;
    this.rows = 11;
    this.maze = generateMaze(this.cols, this.rows);

    const mapWidth = this.cols * this.tileSize;
    const mapHeight = this.rows * this.tileSize;

    // ── Render the maze ──
    const mapGfx = this.add.graphics();
    const freeTiles = [];

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.maze[y][x] === 1) {
          mapGfx.fillStyle(0x4834d4);
          mapGfx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
          mapGfx.lineStyle(1, 0x6C5CE7, 0.5);
          mapGfx.strokeRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
        } else {
          mapGfx.fillStyle(0x2d2d44);
          mapGfx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
          if (x !== 1 || y !== 1) freeTiles.push({ x, y });
        }
      }
    }

    // ── Physics Groups ──
    this.collectibles = this.physics.add.group();
    this.enemiesGroup = this.physics.add.group();

    // ── Collectibles ──
    Phaser.Utils.Array.Shuffle(freeTiles);
    const maxItems = Math.min(this.items.length, freeTiles.length, 8);
    const correctCount = Math.min(Math.ceil(this.items.length * 0.6), 8);

    for (let i = 0; i < maxItems; i++) {
      const isCorrect = i < correctCount;
      const pos = freeTiles.pop();
      const cx = pos.x * this.tileSize + 16;
      const cy = pos.y * this.tileSize + 16;
      const item = this.collectibles.create(cx, cy, isCorrect ? 'item_correct' : 'item_wrong');
      item.itemData = this.items[i];
      item.isCorrect = isCorrect;

      const txt = this.add.text(cx, cy, (this.items[i]?.term || '?').substring(0, 5), {
        fontSize: '9px', fontFamily: 'Inter, sans-serif', color: '#000', fontStyle: 'bold'
      }).setOrigin(0.5);
      item.labelTxt = txt;

      if (item.postFX) item.postFX.addBloom(isCorrect ? 0xffd93d : 0xee5a24, 1, 1, 2, 1.2);
    }

    // ── Ghosts (grid-based, slow, BFS pathfinding) ──
    for (let i = 0; i < 2; i++) {
      if (freeTiles.length === 0) break;
      const pos = freeTiles.pop();
      const px = pos.x * this.tileSize + 16;
      const py = pos.y * this.tileSize + 16;
      const enemy = this.enemiesGroup.create(px, py, 'enemy');

      enemy.gridX = pos.x;
      enemy.gridY = pos.y;
      enemy.targetX = px;
      enemy.targetY = py;
      enemy.moveSpeed = 50 + (i * 10); // Slow: 50-60
      enemy.moveCooldown = 0;
      enemy.setVelocity(0, 0);

      const face = this.add.text(px, py, '👻', { fontSize: '14px' }).setOrigin(0.5);
      enemy.faceTxt = face;

      if (enemy.postFX) enemy.postFX.addBloom(0xff6b6b, 1, 1, 2, 1.2);
    }

    // ── Player ──
    this.player = this.physics.add.sprite(1 * this.tileSize + 16, 1 * this.tileSize + 16, 'player');
    this.playerFace = this.add.text(this.player.x, this.player.y, '🐱', { fontSize: '16px' }).setOrigin(0.5);
    if (this.player.postFX) this.player.postFX.addBloom(0x4834d4, 1, 1, 2, 1.5);

    // ── Collisions ──
    this.physics.add.overlap(this.player, this.collectibles, this.handleCollect, null, this);
    this.physics.add.overlap(this.player, this.enemiesGroup, this.handleCaught, null, this);

    // ── Camera (Phaser 4 Scale.FIT handles canvas scaling — center on maze) ──
    this.cameras.main.centerOn(mapWidth / 2, mapHeight / 2);
    // Zoom to fit maze in the game canvas
    const zoomX = this.scale.width / mapWidth;
    const zoomY = this.scale.height / mapHeight;
    this.cameras.main.setZoom(Math.min(zoomX, zoomY) * 0.92);

    if (this.cameras.main.postFX) this.cameras.main.postFX.addVignette(0.5, 0.5, 0.7);

    // ── Keyboard ──
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');

    // ── Touch swipe support ──
    this.input.on('pointerdown', (pointer) => {
      this._swipeStart = { x: pointer.x, y: pointer.y };
    });
    this.input.on('pointerup', (pointer) => {
      if (!this._swipeStart) return;
      const dx = pointer.x - this._swipeStart.x;
      const dy = pointer.y - this._swipeStart.y;
      const minSwipe = 20;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minSwipe) {
        this.inputDirection = { x: dx > 0 ? 1 : -1, y: 0 };
      } else if (Math.abs(dy) > minSwipe) {
        this.inputDirection = { x: 0, y: dy > 0 ? 1 : -1 };
      }
      this._swipeStart = null;
    });

    // ── Player grid movement state ──
    this.currentTarget = new Phaser.Math.Vector2(this.player.x, this.player.y);

    // ── Listen for external D-pad events (from React) ──
    this._onDpad = (e) => {
      this.inputDirection = e.detail || { x: 0, y: 0 };
    };
    window.addEventListener('maze_dpad', this._onDpad);
  }

  handleCollect(player, collectible) {
    collectible.labelTxt.destroy();
    collectible.destroy();
    this.onCollect(collectible);

    const remainingCorrect = this.collectibles.getChildren().filter(c => c.isCorrect).length;
    if (remainingCorrect === 0) {
      this.physics.pause();
      this.onComplete();
    }
  }

  handleCaught(player, enemy) {
    this.player.setPosition(1 * this.tileSize + 16, 1 * this.tileSize + 16);
    this.currentTarget.set(this.player.x, this.player.y);
    this.onCaught();
    this.cameras.main.shake(200, 0.02);
  }

  update(time, delta) {
    this.playerFace.setPosition(this.player.x, this.player.y);

    // ── Ghost AI: grid-based BFS (respects walls) ──
    const playerTileX = Math.round((this.player.x - 16) / this.tileSize);
    const playerTileY = Math.round((this.player.y - 16) / this.tileSize);

    this.enemiesGroup.getChildren().forEach(enemy => {
      enemy.faceTxt.setPosition(enemy.x, enemy.y);

      const distToTarget = Phaser.Math.Distance.Between(enemy.x, enemy.y, enemy.targetX, enemy.targetY);

      if (distToTarget < 3) {
        enemy.setPosition(enemy.targetX, enemy.targetY);
        enemy.setVelocity(0, 0);

        enemy.moveCooldown -= delta;
        if (enemy.moveCooldown > 0) return;

        const distToPlayer = Phaser.Math.Distance.Between(enemy.gridX, enemy.gridY, playerTileX, playerTileY);
        if (distToPlayer > 8) return;

        const nextStep = this.bfsNextStep(enemy.gridX, enemy.gridY, playerTileX, playerTileY);
        if (nextStep) {
          enemy.gridX = nextStep.x;
          enemy.gridY = nextStep.y;
          enemy.targetX = nextStep.x * this.tileSize + 16;
          enemy.targetY = nextStep.y * this.tileSize + 16;
          enemy.moveCooldown = 100; // 100ms pause per tile
          this.physics.moveToObject(enemy, { x: enemy.targetX, y: enemy.targetY }, enemy.moveSpeed);
        }
      }
    });

    // ── Player Grid Movement ──
    const speed = 160;

    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.currentTarget.x, this.currentTarget.y) < 4) {
      this.player.setPosition(this.currentTarget.x, this.currentTarget.y);
      this.player.setVelocity(0, 0);

      const px = Math.floor(this.player.x / this.tileSize);
      const py = Math.floor(this.player.y / this.tileSize);
      let nextX = px;
      let nextY = py;

      // Keyboard
      if (this.cursors.left.isDown || this.wasd.A.isDown) nextX -= 1;
      else if (this.cursors.right.isDown || this.wasd.D.isDown) nextX += 1;
      else if (this.cursors.up.isDown || this.wasd.W.isDown) nextY -= 1;
      else if (this.cursors.down.isDown || this.wasd.S.isDown) nextY += 1;
      // Touch D-pad / Swipe
      else if (this.inputDirection.x !== 0 || this.inputDirection.y !== 0) {
        nextX += this.inputDirection.x;
        nextY += this.inputDirection.y;
      }

      if ((nextX !== px || nextY !== py) && nextX >= 0 && nextX < this.cols && nextY >= 0 && nextY < this.rows) {
        if (this.maze[nextY][nextX] === 0) {
          this.currentTarget.set(nextX * this.tileSize + 16, nextY * this.tileSize + 16);
          this.physics.moveToObject(this.player, this.currentTarget, speed);
          // Reset touch direction after consuming
          this.inputDirection = { x: 0, y: 0 };
        }
      }
    }
  }

  shutdown() {
    window.removeEventListener('maze_dpad', this._onDpad);
  }
}

// ── D-Pad Component for Mobile ──────────────────────────
function DPad() {
  const emit = (x, y) => {
    window.dispatchEvent(new CustomEvent('maze_dpad', { detail: { x, y } }));
  };

  return (
    <div className={styles.dpad}>
      <button className={`${styles.dpadBtn} ${styles.dpadUp}`} onTouchStart={() => emit(0, -1)} onClick={() => emit(0, -1)}>▲</button>
      <div className={styles.dpadMiddle}>
        <button className={`${styles.dpadBtn} ${styles.dpadLeft}`} onTouchStart={() => emit(-1, 0)} onClick={() => emit(-1, 0)}>◀</button>
        <div className={styles.dpadCenter} />
        <button className={`${styles.dpadBtn} ${styles.dpadRight}`} onTouchStart={() => emit(1, 0)} onClick={() => emit(1, 0)}>▶</button>
      </div>
      <button className={`${styles.dpadBtn} ${styles.dpadDown}`} onTouchStart={() => emit(0, 1)} onClick={() => emit(0, 1)}>▼</button>
    </div>
  );
}

// ── React Bridge ────────────────────────────────────────
export default function MazeChasePlayer({ items, activity, playerName }) {
  const { emit, GameEvent: GE } = useGameEvents('fun');
  const gameRef = useRef(null);
  const containerRef = useRef(null);

  const [phase, setPhase] = useState('countdown');
  const [countdownNum, setCountdownNum] = useState(3);
  const [score, setScore] = useState(0);
  const [collected, setCollected] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(1);
  const [timeLeft, setTimeLeft] = useState(90);
  const [lives, setLives] = useState(3);
  const [isMobile, setIsMobile] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  // Countdown Phase
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

  // ── Phaser 4 Instance with proper Scale.FIT ──
  useEffect(() => {
    if (phase !== 'playing' || !containerRef.current || items.length === 0) return;

    const correctCount = Math.min(Math.ceil(items.length * 0.6), 8);
    setTotalCorrect(correctCount);

    // Phaser 4 config following game-setup-and-config SKILL.md
    const config = {
      type: Phaser.AUTO, // AUTO with Canvas fallback (safe for all devices)
      parent: containerRef.current,
      backgroundColor: '#1a1a2e',
      scale: {
        mode: Phaser.Scale.FIT,          // Fit inside container keeping aspect ratio
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 15 * 32,                  // 480 = maze width
        height: 11 * 32,                 // 352 = maze height
      },
      physics: {
        default: 'arcade',
        arcade: { debug: false }
      },
      input: {
        keyboard: true,
        touch: true,
        activePointers: 1,
      },
      banner: false,
      scene: [MazeScene]
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    game.scene.start('MazeScene', {
      items,
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
      }
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [phase, items, emit, GE]);

  if (phase === 'countdown') {
    return <CountdownScreen num={countdownNum} label="Maze Chase" emoji="👻" />;
  }

  if (phase === 'result') {
    const answers = Array.from({ length: collected }, (_, i) => ({ questionIndex: i, correct: true }));
    return <ResultScreen playerName={playerName} score={score} answers={answers} items={items.slice(0, collected)} title="Kết Quả Mê Cung" />;
  }

  return (
    <div className={styles.gamePage}>
      <GameTopBar
        counter={`🏆 ${collected}/${totalCorrect}`}
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

      <div
        className={styles.canvasWrapper}
        ref={containerRef}
      />

      {isMobile && <DPad />}

      {!isMobile && (
        <div className={styles.controls}>
          <span className={styles.controlHint}>🎮 Arrow keys / WASD để điều khiển</span>
        </div>
      )}
    </div>
  );
}
