'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import styles from './MazeChaseHost.module.css';

// We import `AvatarDisplay` roughly to show images if needed, but in Phaser we'll use emojis or textures.
// import AvatarDisplay from '@/components/Multiplayer/AvatarDisplay';

// ── Braided Maze Generator (Loops) ──────────────
function generateBraidedMaze(cols: number, rows: number) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(1)); // 1 = wall
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

  function carve(x: number, y: number) {
    visited[y][x] = true;
    grid[y][x] = 0; // 0 = path
    const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]].sort(() => Math.random() - 0.5);
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1 && !visited[ny][nx]) {
        grid[y + dy / 2][x + dx / 2] = 0;
        carve(nx, ny);
      }
    }
  }

  carve(1, 1);
  grid[1][1] = 0;

  function makes2x2(grid: number[][], x: number, y: number) {
    const isPath = (r: number, c: number) => grid[r][c] === 0;
    // Check Top-Left quadrant
    if (isPath(y - 1, x - 1) && isPath(y - 1, x) && isPath(y, x - 1)) return true;
    // Check Top-Right quadrant
    if (isPath(y - 1, x + 1) && isPath(y - 1, x) && isPath(y, x + 1)) return true;
    // Check Bottom-Left quadrant
    if (isPath(y + 1, x - 1) && isPath(y + 1, x) && isPath(y, x - 1)) return true;
    // Check Bottom-Right quadrant
    if (isPath(y + 1, x + 1) && isPath(y + 1, x) && isPath(y, x + 1)) return true;
    return false;
  }

  // Remove dead ends (Braid) carefully to create SOME loops without ruining the maze structure.
  for (let y = 1; y < rows - 1; y += 2) {
    for (let x = 1; x < cols - 1; x += 2) {
      if (grid[y][x] === 0) {
        let walls = 0;
        if (grid[y - 1][x] === 1) walls++;
        if (grid[y + 1][x] === 1) walls++;
        if (grid[y][x - 1] === 1) walls++;
        if (grid[y][x + 1] === 1) walls++;

        // Remove ALL dead ends (3 walls surrounding) to create a fully braided maze.
        if (walls >= 3) {
          const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]].sort(() => Math.random() - 0.5);
          for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1 && grid[ny][nx] === 1) {
              if (!makes2x2(grid, nx, ny)) {
                grid[ny][nx] = 0;
                break;
              }
            }
          }
        }
      }
    }
  }

  return grid;
}

// ── Mock Players Data ──
const MOCK_PLAYERS = [
  { id: 'p1', name: 'Khoa', color: 0x3498db, emoji: '👦' },
  { id: 'p2', name: 'Linh', color: 0xe74c3c, emoji: '👧' },
  { id: 'p3', name: 'Huy', color: 0x2ecc71, emoji: '👦' },
  { id: 'p4', name: 'Trang', color: 0xf1c40f, emoji: '👱‍♀️' },
  { id: 'p5', name: 'Minh', color: 0x9b59b6, emoji: '👦' },
  { id: 'p6', name: 'Nam', color: 0xe67e22, emoji: '🧑' },
  { id: 'p7', name: 'Mai', color: 0x1abc9c, emoji: '👩' },
  { id: 'p8', name: 'Tuan', color: 0x34495e, emoji: '👨' },
];

/**
 * Phaser 4 Omniscient Host Scene
 */
class HostMazeScene extends Phaser.Scene {
  public topWallImages: any[] = [];
  public frontWallImages: any[] = [];
  public floorImages: any[] = [];
  public tileConfig: any = null;
  public tileSize: number = 64;
  public cols: number = 43;
  public rows: number = 27;
  public maze: number[][] = [];
  public freeTiles: any[] = [];
  public collectibles: any;
  public enemiesGroup: any;
  public bots: any[] = [];
  public updateLeaderboard: any;

  constructor() {
    super({ key: 'HostMazeScene' });
  }

  init(data: any) {
    // @ts-ignore
    this.updateLeaderboard = data.updateLeaderboard;
    this.tileConfig = data.initialTileConfig;
  }

  preload() {
    // ── TẢI CHÍNH THỨC CÁC ASSET 2D PIXEL DUNGEON ──
    this.load.spritesheet('dungeon', '/assets/mazechase/Set 1.png', { frameWidth: 16, frameHeight: 16 });

    // Collectible textures
    // @ts-ignore
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });

    // Correct
    gfx.fillStyle(0xffd93d);
    gfx.fillCircle(12, 12, 10);
    gfx.generateTexture('coin_correct', 24, 24);
    gfx.clear();

    // Wrong
    gfx.fillStyle(0xee5a24);
    gfx.fillCircle(12, 12, 10);
    gfx.generateTexture('coin_wrong', 24, 24);
    gfx.clear();

    // Ghost
    gfx.fillStyle(0xff6b6b);
    gfx.fillCircle(16, 16, 14);
    gfx.generateTexture('host_enemy', 32, 32);
    gfx.clear();
  }

  isWalkable(currX: number, currY: number, nextX: number, nextY: number) {
    // @ts-ignore
    if (nextX < 0 || nextX >= this.cols || nextY < 0 || nextY >= this.rows) return false;
    // @ts-ignore
    const val = this.maze[nextY][nextX];
    // @ts-ignore
    const currVal = this.maze[currY][currX];
    
    if (val === 0) {
        // Prevent escaping the trap
        if (currVal === 319 || currVal === 230) return false;
        return true;
    }
    
    // One way door from bottom (entering 319 from below)
    if (val === 319 && currY === nextY + 1 && currX === nextX && currVal === 0) return true;
    
    // Entering trap interior (230) from the door (319)
    if (val === 230 && currVal === 319 && currY === nextY + 1 && currX === nextX) return true;

    // Moving freely between internal 230s
    if (val === 230 && currVal === 230) return true;
    
    return false;
  }

  bfsNextStep(fromX: number, fromY: number, toX: number, toY: number) {
    if (fromX === toX && fromY === toY) return null;

    // @ts-ignore
    const visited = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
    // @ts-ignore
    const parent = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    const queue = [{ x: fromX, y: fromY }];
    visited[fromY][fromX] = true;

    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    while (queue.length > 0) {
      const cur = queue.shift();
      // @ts-ignore
      if (cur.x === toX && cur.y === toY) {
        let step = cur;
        // @ts-ignore
        while (parent[step.y][step.x] &&
          // @ts-ignore
          (parent[step.y][step.x].x !== fromX || parent[step.y][step.x].y !== fromY)) {
          // @ts-ignore
          step = parent[step.y][step.x];
        }
        return step;
      }
      for (const [dx, dy] of dirs) {
        // @ts-ignore
        const nx = cur.x + dx;
        // @ts-ignore
        const ny = cur.y + dy;
        
        // @ts-ignore
        if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
          // @ts-ignore
          if (!visited[ny][nx] && this.isWalkable(cur.x, cur.y, nx, ny)) {
            visited[ny][nx] = true;
            parent[ny][nx] = cur;
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }
    return null;
  }


  create() {
    // ── Mega Maze For Host View ──
    // @ts-ignore
    this.tileSize = 64; // TĂNG KÍCH THƯỚC LÊN 64x64
    // @ts-ignore
    this.cols = 43; 
    // @ts-ignore
    this.rows = 27;
    // @ts-ignore
    this.maze = generateBraidedMaze(this.cols, this.rows);

    const injectRoom = (startX: number, startY: number) => {
        // Dọn sạch rác tự động của maze xung quanh phòng bằng 1 vòng Path (đường đi)
        for (let y = startY - 1; y <= startY + 5; y++) {
            for (let x = startX - 1; x <= startX + 5; x++) {
                // @ts-ignore
                if (y >= 0 && y < this.rows && x >= 0 && x < this.cols) {
                    // @ts-ignore
                    this.maze[y][x] = 0; // path ring
                }
            }
        }
        
        // Cấu trúc phòng 5x5
        // Row 0
        // @ts-ignore
        this.maze[startY][startX] = 201; this.maze[startY][startX+1] = 202; this.maze[startY][startX+2] = 202; this.maze[startY][startX+3] = 202; this.maze[startY][startX+4] = 203;
        
        // Row 1, 2, 3
        for (let dy = 1; dy <= 3; dy++) {
           // @ts-ignore
           this.maze[startY+dy][startX] = 229; this.maze[startY+dy][startX+1] = 230; this.maze[startY+dy][startX+2] = 230; this.maze[startY+dy][startX+3] = 230; this.maze[startY+dy][startX+4] = 231;
        }

        // Row 4
        // @ts-ignore
        this.maze[startY+4][startX] = 257; this.maze[startY+4][startX+1] = 258; this.maze[startY+4][startX+2] = 319; this.maze[startY+4][startX+3] = 258; this.maze[startY+4][startX+4] = 259;
    };

    // Inject 4 trap rooms in coordinates (adjust padding to 8 for 5x5)
    // @ts-ignore
    injectRoom(3, 3);
    // @ts-ignore
    injectRoom(this.cols - 8, 3);
    // @ts-ignore
    injectRoom(3, this.rows - 8);
    // @ts-ignore
    injectRoom(this.cols - 8, this.rows - 8);

    // @ts-ignore
    const mapWidth = this.cols * this.tileSize;
    // @ts-ignore
    const mapHeight = this.rows * this.tileSize;

    // Khởi tạo List ảnh gạch để có thể Live-reload Frame
    this.topWallImages = [];
    this.frontWallImages = [];
    this.floorImages = [];

    // ── THUẬT TOÁN AUTOTILE TỰ ĐỘNG CHỌN FRAME GẠCH CHUẨN (Set 1.png - 28 Cột) ──
    const getFloorFrame = (): number => {
        const arr = this.tileConfig.floors.split(',').map((x: string) => parseInt(x.trim())).filter((x: number) => !isNaN(x));
        return arr.length > 0 ? (Phaser.Math.RND.pick(arr) as number) : 0;
    };


    
    // Tính toán màng nhện (Bitmask 16 hướng: N=1, E=2, S=4, W=8)
    const getWallBitmask = (x: number, y: number) => {
        // @ts-ignore
        const n = (y > 0 && this.maze[y - 1][x] === 1) ? 1 : 0;
        // @ts-ignore
        const e = (x < this.cols - 1 && this.maze[y][x + 1] === 1) ? 2 : 0;
        // @ts-ignore
        const s = (y < this.rows - 1 && this.maze[y + 1][x] === 1) ? 4 : 0;
        // @ts-ignore
        const w = (x > 0 && this.maze[y][x - 1] === 1) ? 8 : 0;
        return n + e + s + w;
    };

    const getTopWallFrame = (mask: number) => {
        return parseInt(this.tileConfig[`top_${mask}`]) || 0;
    };

    const getFrontWallFrame = (mask: number) => {
        return parseInt(this.tileConfig[`front_${mask}`]) || 0;
    };

    const SCALE = 4; // Phóng từ 16x16 lên 64x64

    // Khởi tạo List gạch trống cho Bot
    // @ts-ignore
    this.freeTiles = [];

    // Lớp đồ họa dành riêng cho chỉ đường
    const pathGraphics = this.add.graphics();
    pathGraphics.lineStyle(10, 0xfade4b, 0.65); // Line vàng 10px, opacity 65% để trong veo nhẹ
    pathGraphics.setDepth(1); // Đặt lên trên sàn (0) nhưng nằm dưới tường đổ bóng (2)

    // Vẽ toàn bộ nền Sàn (Vẽ trước mảng dưới cùng)
    // @ts-ignore
    for (let y = 0; y < this.rows; y++) {
      // @ts-ignore
      for (let x = 0; x < this.cols; x++) {
        // @ts-ignore
        const cx = x * this.tileSize;
        const cy = y * this.tileSize;
        const img = this.add.image(cx, cy, 'dungeon', getFloorFrame()).setOrigin(0).setScale(SCALE);
        this.floorImages.push(img);
      }
    }

    // Vẽ Lớp Tường lên trên
    // @ts-ignore
    for (let y = 0; y < this.rows; y++) {
      // @ts-ignore
      for (let x = 0; x < this.cols; x++) {
        // @ts-ignore
        const cx = x * this.tileSize;
        // @ts-ignore
        const cy = y * this.tileSize;

        // @ts-ignore
        const val = this.maze[y][x];

        if (val === 230) {
            // @ts-ignore
            this.freeTiles.push({ x, y });
        }

        if (val === 0) {
           // @ts-ignore
           this.freeTiles.push({ x, y });

           // Vẽ vạch chỉ đường (Thanh dài màu vàng) - ONLY FOR PATHS
           // @ts-ignore
           if (x < this.cols - 1 && this.maze[y][x+1] === 0) {
               pathGraphics.moveTo(cx + 32, cy + 32);
               pathGraphics.lineTo(cx + 64 + 32, cy + 32);
           }
           // @ts-ignore
           if (y < this.rows - 1 && this.maze[y+1][x] === 0) {
               pathGraphics.moveTo(cx + 32, cy + 32);
               pathGraphics.lineTo(cx + 32, cy + 64 + 32);
           }
        } else if (val === 1) {
           const bitmask = getWallBitmask(x, y);

           // Vẽ đá nắp (Wall Top)
           const tImg = this.add.image(cx, cy, 'dungeon', getTopWallFrame(bitmask)).setOrigin(0).setScale(SCALE);
           this.topWallImages.push({ img: tImg, mask: bitmask });

           // Vẽ mặt cắt đá đổ bóng (Wall Front)
           // @ts-ignore
           const isSouthEmpty = (y === this.rows - 1 || this.maze[y+1][x] === 0);
           if (isSouthEmpty) {
               // Mặt cắt Front Wall nằm thẳng ngay bên dưới ô Wall Top
               const fImg = this.add.image(cx, cy + 64, 'dungeon', getFrontWallFrame(bitmask)).setOrigin(0).setScale(SCALE).setDepth(2);
               this.frontWallImages.push({ img: fImg, mask: bitmask });
           }
        } else if (val > 1) {
           // Vẽ Custom Room Frame
           const customImg = this.add.image(cx, cy, 'dungeon', val).setOrigin(0).setScale(SCALE);
           // Depth cho các ô front tường (row 2 và 3 của frame)
           if (val >= 229) {
               customImg.setDepth(2);
           }
        }
      }
    }

    // Centered Canvas
    this.cameras.main.centerOn(mapWidth / 2, mapHeight / 2);
    // Remove dark vignette, maybe use a very light vignette if available, or omit for a bright look
    // @ts-ignore
    if (this.cameras.main.postFX) this.cameras.main.postFX.addVignette(0.5, 0.5, 0.95, 0.1);

    // Collectibles
    // @ts-ignore
    this.collectibles = this.physics.add.group();
    this.spawnCollectibles(30);

    // Enemies
    // @ts-ignore
    this.enemiesGroup = this.physics.add.group();
    this.spawnEnemies(8);

    // Players (Bots)
    // @ts-ignore
    this.bots = [];
    // @ts-ignore
    Phaser.Utils.Array.Shuffle(this.freeTiles);

    MOCK_PLAYERS.forEach((mp, i) => {
      // @ts-ignore
      const pos = this.freeTiles.pop();
      // @ts-ignore
      const px = pos.x * this.tileSize + 32;
      // @ts-ignore
      const py = pos.y * this.tileSize + 32;

      const botGfx = this.make.graphics({ x: 0, y: 0, add: false });
      botGfx.fillStyle(mp.color);
      botGfx.fillCircle(12, 12, 10);
      botGfx.generateTexture(`bot_${mp.id}`, 24, 24);
      botGfx.clear();

      const bot = this.physics.add.sprite(px, py, `bot_${mp.id}`).setDepth(3);
      // Only light bloom for bots
      if (bot.postFX) bot.postFX.addBloom(mp.color, 1, 1, 1, 1);

      const emojiTxt = this.add.text(px, py, mp.emoji, { fontSize: '14px' }).setOrigin(0.5).setDepth(3);
      const nameTxt = this.add.text(px, py - 20, mp.name, { fontSize: '12px', color: '#2d3436', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 3 }).setOrigin(0.5).setDepth(3);

      // @ts-ignore
      bot.stateObj = {
        id: mp.id,
        name: mp.name,
        color: mp.color,
        score: Math.floor(Math.random() * 500),
        emojiTxt,
        nameTxt,
        gridX: pos.x,
        gridY: pos.y,
        targetX: px,
        targetY: py,
        moveSpeed: 100 + Math.random() * 50,
        moveCooldown: 0,
        itemsToFind: 5,   // Bot seeks collectibles
        currentPath: []
      };

      // @ts-ignore
      this.physics.add.overlap(bot, this.collectibles, this.handleBotCollect, null, this);
      // @ts-ignore
      this.physics.add.overlap(bot, this.enemiesGroup, this.handleBotCaught, null, this);

      // @ts-ignore
      this.bots.push(bot);
    });

    // Notify React component of initial leaderboard
    this.updateReactLeaderboard();

    // Refill timer
    this.time.addEvent({
      delay: 5000,
      loop: true,
      callback: () => {
        // @ts-ignore
        if (this.collectibles.getChildren().length < 10) {
          this.spawnCollectibles(5);
        }
      }
    });
  }

  spawnCollectibles(count: number) {
    for (let i = 0; i < count; i++) {
      // @ts-ignore
      const pos = Phaser.Utils.Array.GetRandom(this.freeTiles);
      // @ts-ignore
      const cx = pos.x * this.tileSize + 32;
      // @ts-ignore
      const cy = pos.y * this.tileSize + 32;
      const isCorrect = Math.random() > 0.3;

      // @ts-ignore
      const item = this.collectibles.create(cx, cy, isCorrect ? 'coin_correct' : 'coin_wrong').setDepth(3);
      item.isCorrect = isCorrect;
      // Soft glow instead of neon
      if (item.postFX) item.postFX.addBloom(isCorrect ? 0xffea00 : 0xff3838, 1, 1, 1.5, 1);
    }
  }

  spawnEnemies(count: number) {
    for (let i = 0; i < count; i++) {
      // @ts-ignore
      const pos = Phaser.Utils.Array.GetRandom(this.freeTiles);
      // @ts-ignore
      const px = pos.x * this.tileSize + 32;
      // @ts-ignore
      const py = pos.y * this.tileSize + 32;
      // @ts-ignore
      const enemy = this.enemiesGroup.create(px, py, 'host_enemy').setDepth(3);

      enemy.gridX = pos.x;
      enemy.gridY = pos.y;
      enemy.targetX = px;
      enemy.targetY = py;
      enemy.moveSpeed = 40 + Math.random() * 30; // Very slow
      enemy.moveCooldown = 0;
      enemy.setVelocity(0, 0);

      const face = this.add.text(px, py, '👻', { fontSize: '14px' }).setOrigin(0.5).setDepth(3);
      enemy.faceTxt = face;
      if (enemy.postFX) enemy.postFX.addBloom(0xff6b6b, 1, 1, 2, 1.2);
    }
  }

  handleBotCollect(bot: any, collectible: any) {
    collectible.destroy();

    // Ghost effect on collect (Cute floating text)
    const txt = this.add.text(bot.x, bot.y - 10, collectible.isCorrect ? '💖 +100' : '💔 -50', {
      fontSize: '14px', color: collectible.isCorrect ? '#ff4757' : '#576574', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 2
    }).setOrigin(0.5).setDepth(4);

    this.tweens.add({
      targets: txt,
      y: bot.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => txt.destroy()
    });

    if (collectible.isCorrect) {
      bot.stateObj.score += 100;
    } else {
      bot.stateObj.score = Math.max(0, bot.stateObj.score - 50);
    }

    // Force path recalculation
    bot.stateObj.currentPath = [];
    this.updateReactLeaderboard();
  }

  handleBotCaught(bot: any, enemy: any) {
    // Bounce bot away or reset
    // @ts-ignore
    const pos = Phaser.Utils.Array.GetRandom(this.freeTiles);
    // @ts-ignore
    bot.setPosition(pos.x * this.tileSize + 16, pos.y * this.tileSize + 16);
    bot.stateObj.targetX = bot.x;
    bot.stateObj.targetY = bot.y;
    bot.stateObj.gridX = pos.x;
    bot.stateObj.gridY = pos.y;
    bot.stateObj.score = Math.max(0, bot.stateObj.score - 200);
    bot.stateObj.currentPath = [];
    this.updateReactLeaderboard();

    const txt = this.add.text(bot.x, bot.y, 'Busted!', { fontSize: '14px', color: '#ff6b6b', fontStyle: 'bold' }).setOrigin(0.5).setDepth(4);
    this.tweens.add({
      targets: txt, y: bot.y - 30, alpha: 0, duration: 1000, onComplete: () => txt.destroy()
    });
    this.cameras.main.shake(100, 0.01);
  }

  updateReactLeaderboard() {
    // @ts-ignore
    const arr = this.bots.map((b: any) => ({
      id: b.stateObj.id,
      name: b.stateObj.name,
      score: b.stateObj.score,
      color: b.stateObj.color
    }));
    // @ts-ignore
    if (this.updateLeaderboard) this.updateLeaderboard(arr);
  }

  // Hàm Live Update (Công cụ thiết kế)
  updateTileMapping(newConfig: any) {
    this.tileConfig = newConfig;
    if (!this.floorImages || this.floorImages.length === 0) return;

    // Cập nhật ngẫu nhiên lại toàn bộ Sàn
    const arr = this.tileConfig.floors.split(',').map((x: string) => parseInt(x.trim())).filter((x: number) => !isNaN(x));
    if (arr.length > 0) {
       this.floorImages.forEach(img => img.setFrame(Phaser.Math.RND.pick(arr)));
    }

    // Cập nhật Frame cho Tường
    this.topWallImages.forEach(obj => {
       obj.img.setFrame(parseInt(this.tileConfig[`top_${obj.mask}`]) || 0);
    });

    this.frontWallImages.forEach(obj => {
       obj.img.setFrame(parseInt(this.tileConfig[`front_${obj.mask}`]) || 0);
    });
  }

  update(time: number, delta: number) {
    // AI ENEMY LOGIC (Wander)
    // @ts-ignore
    this.enemiesGroup.getChildren().forEach((enemy: any) => {
      enemy.faceTxt.setPosition(enemy.x, enemy.y);
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, enemy.targetX, enemy.targetY);

      if (dist < 4) {
        enemy.setPosition(enemy.targetX, enemy.targetY);
        enemy.setVelocity(0, 0);

        enemy.moveCooldown -= delta;
        if (enemy.moveCooldown > 0) return;

        // Pick random valid direction
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]].sort(() => Math.random() - 0.5);
        for (const [dx, dy] of dirs) {
          const nx = enemy.gridX + dx;
          const ny = enemy.gridY + dy;
          // @ts-ignore
          if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
            // @ts-ignore
            if (this.isWalkable(enemy.gridX, enemy.gridY, nx, ny)) {
              enemy.gridX = nx;
              enemy.gridY = ny;
              // @ts-ignore
              enemy.targetX = nx * this.tileSize + 16;
              // @ts-ignore
              enemy.targetY = ny * this.tileSize + 16;
              enemy.moveCooldown = 200;
              this.physics.moveToObject(enemy, { x: enemy.targetX, y: enemy.targetY }, enemy.moveSpeed);
              break;
            }
          }
        }
      }
    });

    // AI BOT LOGIC (Seek nearest coin with BFS)
    // @ts-ignore
    this.bots.forEach((bot: any) => {
      bot.stateObj.emojiTxt.setPosition(bot.x, bot.y);
      bot.stateObj.nameTxt.setPosition(bot.x, bot.y - 18);

      const dist = Phaser.Math.Distance.Between(bot.x, bot.y, bot.stateObj.targetX, bot.stateObj.targetY);

      if (dist < 4) {
        bot.setPosition(bot.stateObj.targetX, bot.stateObj.targetY);
        bot.setVelocity(0, 0);

        bot.stateObj.moveCooldown -= delta;
        if (bot.stateObj.moveCooldown > 0) return;

        // Pathfinding required?
        if (bot.stateObj.currentPath.length === 0) {
          // Find nearest collectible
          // @ts-ignore
          const coins = this.collectibles.getChildren();
          if (coins.length > 0) {
            let nearest = coins[0];
            let minDist = 999999;
            for (const c of coins) {
              const d = Phaser.Math.Distance.Between(bot.x, bot.y, c.x, c.y);
              if (d < minDist) { minDist = d; nearest = c; }
            }

            // @ts-ignore
            const tgX = Math.floor(nearest.x / this.tileSize);
            // @ts-ignore
            const tgY = Math.floor(nearest.y / this.tileSize);

            // To avoid heavy BFS every frame, simply step towards it using BFS once
            const nextStep = this.bfsNextStep(bot.stateObj.gridX, bot.stateObj.gridY, tgX, tgY);
            if (nextStep) {
              bot.stateObj.currentPath.push(nextStep);
            } else {
              // Random wander if stuck
              bot.stateObj.currentPath.push({
                x: bot.stateObj.gridX,
                y: bot.stateObj.gridY + (Math.random() > 0.5 ? 1 : -1)
              });
            }
          }
        }

        if (bot.stateObj.currentPath.length > 0) {
          const nextStep = bot.stateObj.currentPath.shift();
          // @ts-ignore
          if (this.isWalkable(bot.stateObj.gridX, bot.stateObj.gridY, nextStep.x, nextStep.y)) {
            bot.stateObj.gridX = nextStep.x;
            bot.stateObj.gridY = nextStep.y;
            // @ts-ignore
            bot.stateObj.targetX = nextStep.x * this.tileSize + 16;
            // @ts-ignore
            bot.stateObj.targetY = nextStep.y * this.tileSize + 16;
            bot.stateObj.moveCooldown = 20; // Fast!
            this.physics.moveToObject(bot, { x: bot.stateObj.targetX, y: bot.stateObj.targetY }, bot.stateObj.moveSpeed);
          }
        }
      }
    });

  }
}

// ── Next.js Component ──
export default function MazeChaseHostMockup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  
  // Trạng thái config mapping Tường của Set 1.png (28 cột)
  const toS1 = (idx: number) => Math.floor(idx / 12) * 28 + 28 + (idx % 12);
  const DEFAULT_TILE_CONFIG = {
      floors: "226,345,374,372,370,373,344",
      top_0: "284", top_1: "256", top_2: "285", top_3: "257",
      top_4: "200", top_5: "228", top_6: "260", top_7: "228",
      top_8: "287", top_9: "291", top_10: "286", top_11: "289",
      top_12: "228", top_13: "228", top_14: "294", top_15: "228",
      front_0: "198", front_1: "125", front_2: "125", front_3: "226",
      front_4: "226", front_5: "226", front_6: "226", front_7: "226",
      front_8: "226", front_9: "226", front_10: "226", front_11: "226",
      front_12: "226", front_13: "226", front_14: "226", front_15: "226"
  };

  const [tileConfig, setTileConfig] = useState<any>(() => {
      if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('mazeChaseTileConfig');
          if (saved) {
              try { return JSON.parse(saved); } catch (e) {}
          }
      }
      return DEFAULT_TILE_CONFIG;
  });

  // Tự động lưu mỗi khi config đổi
  useEffect(() => {
      if (typeof window !== 'undefined') {
          localStorage.setItem('mazeChaseTileConfig', JSON.stringify(tileConfig));
      }
  }, [tileConfig]);

  const handleResetConfig = () => {
      if (confirm('Khôi phục toàn bộ ID vân đá về mặc định?')) {
          setTileConfig(DEFAULT_TILE_CONFIG);
      }
  };

  const handleCopyConfig = () => {
      navigator.clipboard.writeText(JSON.stringify(tileConfig, null, 2));
      alert('Đã Copy chuỗi JSON Config vào Clipboard!');
  };

  const handleConfigChange = (key: string, val: string) => {
      setTileConfig((prev: any) => ({ ...prev, [key]: val }));
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: '#f6dbf8', // Very light pastel pink/blue edge
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 43 * 64, // ULTRA MEGA MAZE width (Khớp kích thước Tile 64px)
        height: 27 * 64, // ULTRA MEGA MAZE height
      },
      physics: {
        default: 'arcade',
        arcade: { debug: false }
      },
      banner: false,
      scene: [HostMazeScene]
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Start with data passing
    game.scene.start('HostMazeScene', {
      initialTileConfig: tileConfig,
      updateLeaderboard: (data: any[]) => {
        // Sort descending
        data.sort((a, b: any) => b.score - a.score);
        setLeaderboard(data);
      }
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // Bắn dữ liệu sửa trực tiếp vào Phaser mỗi khi React State thay đổi
  useEffect(() => {
     if (gameRef.current) {
         // @ts-ignore
         const scene = gameRef.current.scene.getScene('HostMazeScene') as any;
         if (scene && scene.updateTileMapping) {
             scene.updateTileMapping(tileConfig);
         }
     }
  }, [tileConfig]);

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* ── CỘT BÊN TRÁI: KHU VỰC THIẾT KẾ AUTOTILE (CONFIG EDITOR) ── */}
      <div style={{ width: '380px', display: 'flex', flexDirection: 'column', backgroundColor: '#1e293b', borderRight: '1px solid #334155', overflowY: 'auto', flexShrink: 0 }}>
         <div style={{ padding: '16px', backgroundColor: '#1e293b', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#60a5fa', margin: '0 0 4px 0' }}>Autotiler AI Editor</h2>
            <div style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 12px 0', display: 'flex', alignItems: 'center' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', marginRight: '6px' }}></span>Đã bật Tự Động Lưu (LocalStorage)
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleCopyConfig} style={{ flex: 1, padding: '6px', fontSize: '13px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}> Copy JSON</button>
                <button onClick={handleResetConfig} style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: '#475569', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}> Reset</button>
            </div>
         </div>

         <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Tùy chỉnh sàn */}
            <div style={{ backgroundColor: 'rgba(51, 65, 85, 0.5)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
               <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#93c5fd', marginBottom: '8px' }}>Vân Sàn Đá (Phân cách bằng dấu phẩy)</label>
               <input 
                  type="text" 
                  value={tileConfig.floors} onChange={e => handleConfigChange('floors', e.target.value)}
                  style={{ width: 'calc(100% - 16px)', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '8px', fontSize: '14px', color: 'white', outline: 'none' }} 
               />
            </div>

            {/* Các ngã bề mặt Tường */}
            <div>
               <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#e2e8f0', position: 'sticky', top: '75px', backgroundColor: '#1e293b', padding: '8px 0', margin: '0 0 12px 0', borderBottom: '1px solid #334155', zIndex: 9 }}>Gạch Viền Bề Mặt (Top Walls)</h3>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                 {[
                   { i: 0, n: "Đơn lẻ (0)" }, { i: 1, n: "Cụt Nam (1)" }, { i: 2, n: "Cụt Trái (2)" }, { i: 3, n: "Góc Dưới-Trái (3)" },
                   { i: 4, n: "Cụt Bắc (4)" }, { i: 5, n: "Dọc Đứng (5)" }, { i: 6, n: "Góc Trên-Trái (6)" }, { i: 7, n: "Ngã 3 Trái (7)" },
                   { i: 8, n: "Cụt Phải (8)" }, { i: 9, n: "Góc Dưới-Phải (9)" }, { i: 10, n: "Ngang Mịn (10)" }, { i: 11, n: "Ngã 3 Dưới (11)" },
                   { i: 12, n: "Góc Trên-Phải (12)" }, { i: 13, n: "Ngã 3 Phải (13)" }, { i: 14, n: "Ngã 3 Trên (14)" }, { i: 15, n: "Ngã 4 Thập Tự (15)" }
                 ].map(item => (
                   <div key={`top_${item.i}`} style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(51, 65, 85, 0.3)', padding: '8px', borderRadius: '4px' }}>
                     <span style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{item.n}</span>
                     <input type="number" value={tileConfig[`top_${item.i}`]} onChange={e => handleConfigChange(`top_${item.i}`, e.target.value)} style={{ width: 'calc(100% - 10px)', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '4px 6px', fontSize: '14px', color: '#fde047', outline: 'none' }} />
                   </div>
                 ))}
               </div>
            </div>

            {/* Các ngã đổ bóng */}
            <div>
               <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#e2e8f0', position: 'sticky', top: '75px', backgroundColor: '#1e293b', padding: '8px 0', margin: '0 0 12px 0', borderBottom: '1px solid #334155', zIndex: 9 }}>Đá Ghép Dốc (Front Walls)</h3>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                 {Array.from({length: 16}).map((_, i) => (
                   <div key={`front_${i}`} style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(51, 65, 85, 0.3)', padding: '8px', borderRadius: '4px' }}>
                     <span style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Mặt cắt - Mask {i}</span>
                     <input type="number" value={tileConfig[`front_${i}`]} onChange={e => handleConfigChange(`front_${i}`, e.target.value)} style={{ width: 'calc(100% - 10px)', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '4px 6px', fontSize: '14px', color: '#86efac', outline: 'none' }} />
                   </div>
                 ))}
               </div>
            </div>
         </div>
      </div>

      {/* ── CỘT BÊN PHẢI: KHU VỰC CHẠY GAME PHASER ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        <div style={{ height: '64px', backgroundColor: 'rgba(30, 41, 59, 0.8)', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, zIndex: 10, boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.5)' }}>
          <div style={{ fontSize: '24px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '2px', color: '#f1f5f9', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>MAZE CHASE HOST</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', marginRight: '8px' }}></span>Live
            </div>
            <div style={{ fontSize: '14px', fontWeight: 500, padding: '6px 16px', backgroundColor: '#334155', borderRadius: '9999px', border: '1px solid #475569', color: '#bfdbfe' }}>{MOCK_PLAYERS.length} Players</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', padding: '6px 16px', backgroundColor: '#0f172a', borderRadius: '9999px', border: '1px solid #334155', color: '#eab308', fontFamily: 'monospace' }}>04:59</div>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', backgroundColor: '#020617' }}>
          {/* Game Canvas Container */}
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div id="phaser-host-container" ref={containerRef} style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative', zIndex: 10, border: '4px solid rgba(30, 41, 59, 0.5)', aspectRatio: '43/27', maxHeight: '100%', maxWidth: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}></div>
          </div>

          {/* Leaderboard Sidebar */}
          <div style={{ width: '300px', backgroundColor: 'rgba(30, 41, 59, 0.7)', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column', padding: '16px', zIndex: 20, boxShadow: '-10px 0 30px rgba(0,0,0,0.3)', flexShrink: 0 }}>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#f1f5f9', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <span style={{ marginRight: '8px', opacity: 0.8 }}>👑</span> LEADERBOARD
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '8px' }}>
              {leaderboard.map((p, index) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', padding: '12px', borderRadius: '8px', border: '1px solid rgba(51, 65, 85, 0.5)', backgroundColor: 'rgba(30, 41, 59, 0.5)', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', marginRight: '16px', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)', 
                    background: index === 0 ? 'linear-gradient(to bottom right, #fde047, #ca8a04)' : 
                                index === 1 ? 'linear-gradient(to bottom right, #e2e8f0, #94a3b8)' : 
                                index === 2 ? 'linear-gradient(to bottom right, #fdba74, #ea580c)' : '#334155',
                    color: index <= 2 ? '#0f172a' : '#cbd5e1'
                  }}>
                    #{index + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: `#${p.color.toString(16).padStart(6, '0')}` }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 500, color: '#94a3b8', marginTop: '2px' }}>{p.score.toLocaleString()} pts</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
