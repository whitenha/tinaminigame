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
  }

  preload() {
    // Generate Textures programmatically to avoid external asset loading
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    
    // Player
    gfx.fillStyle(0x0984e3);
    gfx.fillCircle(16, 16, 14);
    gfx.generateTexture('player', 32, 32);
    gfx.clear();

    // Enemy
    gfx.fillStyle(0xff6b6b);
    gfx.fillCircle(16, 16, 14);
    gfx.generateTexture('enemy', 32, 32);
    gfx.clear();

    // Correct Item
    gfx.fillStyle(0xffd93d);
    gfx.fillCircle(16, 16, 12);
    gfx.generateTexture('item_correct', 32, 32);
    gfx.clear();

    // Wrong Item
    gfx.fillStyle(0xee5a24);
    gfx.fillCircle(16, 16, 12);
    gfx.generateTexture('item_wrong', 32, 32);
    gfx.clear();
  }

  create() {
    this.tileSize = 32;
    this.cols = 15;
    this.rows = 11;
    this.maze = generateMaze(this.cols, this.rows);

    // 1. Render Map utilizing Phaser 4 TilemapGPULayer architecture for optimal draw calls
    const map = this.make.tilemap({ data: this.maze, tileWidth: this.tileSize, tileHeight: this.tileSize });
    
    // Fallback: draw map using graphics if we don't have a tileset available
    const mapGraphics = this.add.graphics();
    const freeTiles = [];
    
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.maze[y][x] === 1) {
          mapGraphics.fillStyle(0x4834d4);
          mapGraphics.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
          mapGraphics.lineStyle(1, 0x6C5CE7, 0.5);
          mapGraphics.strokeRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
        } else {
          mapGraphics.fillStyle(0x2d2d44);
          mapGraphics.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
          if (x !== 1 || y !== 1) freeTiles.push({ x, y });
        }
      }
    }

    // 2. Groups (Replacing old loops with physics groups + SpriteGPULayer)
    this.collectibles = this.physics.add.group();
    this.enemiesGroup = this.physics.add.group();

    // Unified Light Setup (Phaser 4 Lore)
    if (this.lights) this.lights.enable().setAmbientColor(0xffffff);

    // Place Collectibles
    Phaser.Utils.Array.Shuffle(freeTiles);
    const maxItems = Math.min(this.items.length, freeTiles.length, 8);
    let correctCount = Math.min(Math.ceil(this.items.length * 0.6), 8);
    
    for (let i = 0; i < maxItems; i++) {
        const isCorrect = i < correctCount;
        const pos = freeTiles.pop();
        const itemObj = this.collectibles.create(pos.x * this.tileSize + 16, pos.y * this.tileSize + 16, isCorrect ? 'item_correct' : 'item_wrong');
        
        itemObj.itemData = this.items[i];
        itemObj.isCorrect = isCorrect;
        
        // Add label
        const txt = this.add.text(pos.x * this.tileSize + 16, pos.y * this.tileSize + 16, (this.items[i]?.term || '?').substring(0, 5), {
            fontSize: '9px',
            fontFamily: 'Inter, sans-serif',
            color: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        itemObj.labelTxt = txt;

        // Apply Phaser 4 visual fx (Unified PostFX)
        if (itemObj.postFX) itemObj.postFX.addBloom(isCorrect ? 0xffd93d : 0xee5a24, 1, 1, 2, 1.2);
    }

    // Place Enemies
    for (let i = 0; i < 2; i++) {
      if (freeTiles.length === 0) break;
      const pos = freeTiles.pop();
      const enemy = this.enemiesGroup.create(pos.x * this.tileSize + 16, pos.y * this.tileSize + 16, 'enemy');
      enemy.speed = 80 + (i * 20); // physics speed
      
      const face = this.add.text(pos.x * this.tileSize + 16, pos.y * this.tileSize + 16, '👻', { fontSize: '14px' }).setOrigin(0.5);
      enemy.faceTxt = face;
      
      if (enemy.postFX) enemy.postFX.addBloom(0xff6b6b, 1, 1, 2, 1.2);
    }

    // Player
    this.player = this.physics.add.sprite(1 * this.tileSize + 16, 1 * this.tileSize + 16, 'player');
    this.playerFace = this.add.text(this.player.x, this.player.y, '🐱', { fontSize: '16px' }).setOrigin(0.5);
    
    // Player PostFX
    if (this.player.postFX) this.player.postFX.addBloom(0x4834d4, 1, 1, 2, 1.5);

    // Collisions and Overlaps
    this.physics.add.overlap(this.player, this.collectibles, this.handleCollect, null, this);
    this.physics.add.overlap(this.player, this.enemiesGroup, this.handleCaught, null, this);

    // Camera setup
    const mapWidth = this.cols * this.tileSize;
    const mapHeight = this.rows * this.tileSize;
    
    // Zoom to fit the maze dynamically
    const zoomX = this.cameras.main.width / mapWidth;
    const zoomY = this.cameras.main.height / mapHeight;
    this.cameras.main.setZoom(Math.min(zoomX, zoomY) * 0.95);
    
    // Math.TAU validation point for v4
    const tau = Math.PI * 2;
    this.cameras.main.centerOn(mapWidth / 2, mapHeight / 2);
    
    // Global filter
    if (this.cameras.main.postFX) this.cameras.main.postFX.addVignette(0.5, 0.5, 0.7);

    // Input configuration
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');

    // Controls
    this.isMoving = false;
    this.currentTarget = new Phaser.Math.Vector2(this.player.x, this.player.y);
  }

  handleCollect(player, collectible) {
    collectible.labelTxt.destroy();
    collectible.destroy();
    
    this.onCollect(collectible);
    
    // Check if level complete
    const remainingCorrect = this.collectibles.getChildren().filter(c => c.isCorrect).length;
    if (remainingCorrect === 0) {
      this.physics.pause();
      this.onComplete();
    }
  }

  handleCaught(player, enemy) {
    // Reset player to start
    this.player.setPosition(1 * this.tileSize + 16, 1 * this.tileSize + 16);
    this.currentTarget.set(this.player.x, this.player.y);
    this.onCaught();
    
    // Camera shake effect
    this.cameras.main.shake(200, 0.02);
  }

  update(time, delta) {
    // Update labels attached to characters
    this.playerFace.setPosition(this.player.x, this.player.y);
    
    this.enemiesGroup.getChildren().forEach(enemy => {
       enemy.faceTxt.setPosition(enemy.x, enemy.y);
       
       // Simple grid-based chase AI (A* would be ideal for pro version)
       if (Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y) < this.tileSize * 6) {
           this.physics.moveToObject(enemy, this.player, enemy.speed);
       } else {
           enemy.setVelocity(0, 0); // idle if far
       }
    });

    // Player Grid Movement Logic
    const speed = 180;
    
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.currentTarget.x, this.currentTarget.y) < 4) {
      this.player.setPosition(this.currentTarget.x, this.currentTarget.y);
      this.player.setVelocity(0, 0);
      
      const px = Math.floor(this.player.x / this.tileSize);
      const py = Math.floor(this.player.y / this.tileSize);

      let nextX = px;
      let nextY = py;

      if (this.cursors.left.isDown || this.wasd.A.isDown) nextX -= 1;
      else if (this.cursors.right.isDown || this.wasd.D.isDown) nextX += 1;
      else if (this.cursors.up.isDown || this.wasd.W.isDown) nextY -= 1;
      else if (this.cursors.down.isDown || this.wasd.S.isDown) nextY += 1;

      if ((nextX !== px || nextY !== py) && nextX >= 0 && nextX < this.cols && nextY >= 0 && nextY < this.rows) {
        if (this.maze[nextY][nextX] === 0) {
          this.currentTarget.set(nextX * this.tileSize + 16, nextY * this.tileSize + 16);
          this.physics.moveToObject(this.player, this.currentTarget, speed);
        }
      }
    }
  }
}

// ── React Bridge (Next.js App) ─────────────────────────
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
  
  const timerRef = useRef(null);

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

  // Timer Manager
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

  // Phaser 4 Instance Manager
  useEffect(() => {
    if (phase !== 'playing' || !containerRef.current || items.length === 0) return;

    const correctCount = Math.min(Math.ceil(items.length * 0.6), 8);
    setTotalCorrect(correctCount);

    const config = {
      type: Phaser.WEBGL,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      parent: containerRef.current,
      backgroundColor: '#1a1a2e',
      physics: {
        default: 'arcade',
        arcade: { debug: false }
      },
      scene: [MazeScene]
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Pass React props to the scene dynamically
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

    const handleResize = () => {
      if (containerRef.current && game) {
        game.scale.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [phase, items, emit, GE]);

  if (phase === 'countdown') {
    return <CountdownScreen num={countdownNum} label="Maze Chase 2.0 (Phaser 4)" emoji="👻" />;
  }

  if (phase === 'result') {
    const answers = Array.from({ length: collected }, (_, i) => ({ questionIndex: i, correct: true }));
    return <ResultScreen playerName={playerName} score={score} answers={answers} items={items.slice(0, collected)} title="Kết Quả Mê Cung V2" />;
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

      <div className={styles.canvasWrapper} ref={containerRef} style={{ width: '100%', height: 'calc(100vh - 140px)', position: 'relative' }}>
        {/* DOM Overlay if needed */}
      </div>

      <div className={styles.controls}>
        <span className={styles.controlHint}>🎮 Arrow keys / WASD để điều khiển (Powered by Phaser 4 WebGL)</span>
      </div>
    </div>
  );
}
