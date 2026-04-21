'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';

// ── Phaser Sandbox Scene ──
class SandboxScene extends Phaser.Scene {
  public tileImages: any[] = [];
  public tileGrid: number[] = new Array(25).fill(0);

  constructor() {
    super({ key: 'SandboxScene' });
  }

  init(data: any) {
    if (data && data.initialGrid) {
      this.tileGrid = data.initialGrid;
    }
  }

  preload() {
    this.load.spritesheet('dungeon_sandbox', '/assets/mazechase/Set 1.png', {
      frameWidth: 16,
      frameHeight: 16,
      spacing: 0
    });
  }

  create() {
    this.tileImages = [];
    const TILE_SIZE = 128; // Tỉ lệ x8 so với bản gốc 16px
    const SCALE = 8;
    
    // Vẽ lưới ban đầu
    for (let i = 0; i < 25; i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);
      
      const cx = col * TILE_SIZE;
      const cy = row * TILE_SIZE;

      // Lưu ý: Set Origin(0) để hình ảnh vẽ từ góc trên bên trái ô
      const img = this.add.image(cx, cy, 'dungeon_sandbox', this.tileGrid[i])
        .setOrigin(0)
        .setScale(SCALE);
        
      this.tileImages.push(img);
      
      // Vẽ viền ô bằng Graphics nếu thích
      const g = this.add.graphics();
      g.lineStyle(2, 0xffffff, 0.1);
      g.strokeRect(cx, cy, TILE_SIZE, TILE_SIZE);
    }
    
    // Thu nhỏ camera một chút nếu muốn
    this.cameras.main.centerOn((5 * TILE_SIZE) / 2, (5 * TILE_SIZE) / 2);
  }

  updateSandboxMapping(newGrid: number[]) {
    this.tileGrid = newGrid;
    for (let i = 0; i < 25; i++) {
        if (this.tileImages[i]) {
           this.tileImages[i].setFrame(newGrid[i] || 0);
        }
    }
  }
}

// ── Biến Hằng Số Layout ──
const DEFAULT_GRID = new Array(25).fill(0);

export default function TileTesterMockup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  
  // State 5x5 Grid
  const [grid, setGrid] = useState<number[]>(() => {
      if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('tileTesterGrid');
          if (saved) {
              try { return JSON.parse(saved); } catch(e){}
          }
      }
      return DEFAULT_GRID;
  });

  // Tự động lưu 
  useEffect(() => {
      if (typeof window !== 'undefined') {
          localStorage.setItem('tileTesterGrid', JSON.stringify(grid));
      }
      // Bắn lệnh Live sang Phaser
      if (gameRef.current) {
          const scene = gameRef.current.scene.getScene('SandboxScene');
          if (scene && scene.updateSandboxMapping) {
              scene.updateSandboxMapping(grid);
          }
      }
  }, [grid]);

  // Khởi chạy Game
  useEffect(() => {
    if (!containerRef.current) return;

    const config = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: '#1a1f2b', // Chìm vào nền
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 640,  // 5 cột * 128px
        height: 640  // 5 dòng * 128px
      },
      // Vô hiệu hóa hiệu ứng nhoè khi phóng to ảnh Pixel Art
      render: { pixelArt: true, antialias: false },
      scene: [SandboxScene]
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Start with data passing
    game.scene.start('SandboxScene', { initialGrid: grid });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Các hàm tương tác
  const handleChange = (index: number, valStr: string) => {
      const val = parseInt(valStr);
      const newGrid = [...grid];
      newGrid[index] = isNaN(val) ? 0 : val;
      setGrid(newGrid);
  };
  
  const handleClear = () => {
      if (confirm("Xóa toàn bộ lưới ảnh 5x5 về số 0?")) {
         setGrid(new Array(25).fill(0));
      }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* ── CỘT BÊN TRÁI: KHU VỰC NHẬP LIỆU 5x5 ── */}
      <div style={{ width: '420px', display: 'flex', flexDirection: 'column', backgroundColor: '#1e293b', borderRight: '1px solid #334155', overflowY: 'auto', flexShrink: 0 }}>
         <div style={{ padding: '20px', backgroundColor: '#1e293b', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#818cf8', margin: '0 0 4px 0' }}>Phòng Lắp Ghép (5x5)</h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px 0' }}>Gõ ID gạch trên hình <b>Set 1_Indexed.png</b> để xem các viên đá nối với nhau như thế nào.</p>
            
            <button onClick={handleClear} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✖ Làm Sạch Lưới</button>
         </div>

         <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
             {/* Bảng Layout Lưới 5x5 Input */}
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 60px)', gap: '8px' }}>
                 {grid.map((val, i) => (
                    <div key={`cell_${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                       <span style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px', fontFamily: 'monospace' }}>Ô {i}</span>
                       <input 
                         type="number" 
                         value={val}
                         onChange={(e) => handleChange(i, e.target.value)}
                         onFocus={(e) => e.target.select()}
                         style={{ 
                             width: '100%', height: '40px', backgroundColor: '#020617', 
                             border: '2px solid #334155', borderRadius: '4px', 
                             textAlign: 'center', fontSize: '14px', fontWeight: 'bold', 
                             color: val !== 0 ? '#34d399' : '#475569', 
                             outline: 'none', transition: 'all 0.2s'
                         }} 
                       />
                    </div>
                 ))}
             </div>
         </div>
         
         <div style={{ padding: '24px', paddingTop: '0', fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
            <b>Gợi ý cho bạn:</b> <br/>
            - Gạch vân sàn mặc định thường là: 225, 226, 227 <br/>
            - Chuyển ID số để ngắm độ liền mạch của Tile <br/>
            - Dễ dàng thay đổi ID liên tục mà không lo mất dữ liệu.
         </div>
      </div>

      {/* ── CỘT BÊN PHẢI: KHU VỰC RENDER GAME CỦA PHASER ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', backgroundColor: '#020617' }}>
         <div style={{ height: '64px', backgroundColor: 'rgba(30, 41, 59, 0.8)', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', padding: '0 24px', flexShrink: 0, zIndex: 10 }}>
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', letterSpacing: '1px' }}>🖥 Bảng Phác Thảo Dựng Hình (Canvas View)</span>
         </div>
         
         {/* Center Canvas Wrapper */}
         <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <div 
               style={{ 
                   width: '640px', height: '640px', 
                   overflow: 'hidden', 
                   boxShadow: '0 0 50px rgba(0,0,0,0.5)', border: '2px solid #475569', 
                   position: 'relative', zIndex: 10,
                   backgroundImage: `radial-gradient(circle at center, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                   backgroundSize: '32px 32px'
               }}>
               <div id="phaser-sandbox-container" ref={containerRef} style={{ width: '100%', height: '100%' }}></div>
            </div>
         </div>
      </div>

    </div>
  );
}
