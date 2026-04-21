'use client';

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import styles from './FishingPlayerMockup.module.css';

// ── Phaser Scene ─────────────────────────────────────
class FishingScene extends Phaser.Scene {
  player: any;
  hookGroup: any;
  cursors: any;
  wasd: any;
  inputDirection = { x: 0, y: 0 };
  isFishing = false;
  items: any[] = [];
  score: number = 0;
  scoreText: any = null;
  answerListener: any = null;

  constructor() {
    super({ key: 'FishingScene' });
  }

  init(data: any) {
    this.items = data.items || [];
  }

  preload() {
    // Generate Textures
    const gfx = this.make.graphics({ x: 0, y: 0, add: false } as any);

    // Player (Cat / Bear)
    gfx.fillStyle(0xffa502);
    gfx.fillRoundedRect(0, 0, 32, 32, 8);
    gfx.generateTexture('player', 32, 32);
    gfx.clear();

    // Hook / Bobber
    gfx.fillStyle(0xff4757);
    gfx.fillCircle(8, 8, 8);
    gfx.lineStyle(2, 0xffffff);
    gfx.strokeCircle(8, 8, 8);
    gfx.generateTexture('hook', 16, 16);
    gfx.clear();

    // Fish (Dùng khi câu thành công)
    gfx.fillStyle(0x1e90ff);
    gfx.fillEllipse(30, 20, 60, 30);
    gfx.fillStyle(0x70a1ff);
    gfx.fillTriangle(0, 20, 15, 5, 15, 35); // Tail
    gfx.generateTexture('fish', 60, 40);
    gfx.clear();
  }

  create() {
    // Background rộng hơn (Width 1440, Height 1440) toàn bộ là Cỏ
    this.add.rectangle(360, 500, 1440, 1440, 0x2ed573).setOrigin(0.5); // Grass Full Map

    // Trang trí thêm vài bụi cỏ rải rác cực rộng
    for(let i=0; i<60; i++) {
        const dropX = Phaser.Math.Between(-360, 1080);
        const dropY = Phaser.Math.Between(-220, 1220);
        this.add.rectangle(dropX, dropY, 20, 10, 0x27ae60).setOrigin(0.5).setAlpha(0.5);
    }

    // Groups
    this.hookGroup = this.physics.add.group();

    // Player (Hạ thấp xuống Y=250 để không bị Bảng tin nhắn che mất)
    this.player = this.physics.add.sprite(360, 250, 'player');
    this.player.setCollideWorldBounds(true);
    this.add.text(this.player.x, this.player.y, '😸', { fontSize: '18px' }).setOrigin(0.5);

    // Controls
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys('W,S,A,D');
    
    // Action key (Space)
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.throwHook();
    });

    // Mobile inputs via DOM
    const handleDpad = (e: any) => {
      this.inputDirection = e.detail || { x: 0, y: 0 };
    };
    const handleAction = () => {
      this.throwHook();
    };

    window.addEventListener('fishing_dpad', handleDpad);
    window.addEventListener('fishing_action', handleAction);

    // Lắng nghe kết quả trả lời từ React
    this.answerListener = (e: any) => this.handleAnswer(e.detail.isCorrect);
    window.addEventListener('fishing_answered', this.answerListener);

    this.events.on('destroy', () => {
        window.removeEventListener('fishing_dpad', handleDpad);
        window.removeEventListener('fishing_action', handleAction);
        window.removeEventListener('fishing_answered', this.answerListener);
    });

    // Camera Setup: Follow player
    // Khóa giới hạn Camera (X: -360 => 1080, Y: -220 => 1220)
    // Map đã rộng thành hình vuông 1440x1440, tha hồ xê dịch lên xuống
    this.cameras.main.setBounds(-360, -220, 1440, 1440);
    this.physics.world.setBounds(-360, -220, 1440, 1440);
    
    // startFollow(target, roundPixels, lerpX, lerpY)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Score display (Nên dùng setScrollFactor(0) để nó dính chặt vào UI thay vì trôi theo Camera)
    this.scoreText = this.add.text(20, 20, 'Score: 0', { 
      fontSize: '28px', 
      color: '#fff',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 4
    }).setScrollFactor(0);
    
    this.scoreText.setDepth(100);
  }

  throwHook() {
    if (!this.sys || !this.sys.isActive() || !this.hookGroup) return;
    if (this.isFishing || this.hookGroup.countActive(true) > 0) return;

    // Khoá chuyển động của player khi đang câu
    this.isFishing = true;
    this.player.setVelocity(0, 0);

    // Create hook and drop it down
    const hook = this.hookGroup.create(this.player.x, this.player.y + 20, 'hook');
    hook.setVelocityY(400);

    hook.line = this.add.line(0, 0, this.player.x, this.player.y, hook.x, hook.y, 0xffffff).setOrigin(0,0);
    
    // Đợi móc câu chìm xuống rồi trigger câu hỏi MCQ
    this.time.delayedCall(1000, () => {
      if (hook.active) {
         hook.setVelocityY(0);
         // Gửi Event cho React mở Panel Đáp Án
         window.dispatchEvent(new CustomEvent('fishing_hooked'));
      }
    });
  }

  handleAnswer(isCorrect: boolean) {
    if (!this.scene.isActive()) return;
    const hook = this.hookGroup.getChildren()[0];
    if (!hook) return;

    let fishEffect: any = null;
    let labelEffect: any = null;

    if (isCorrect) {
        fishEffect = this.physics.add.sprite(hook.x, hook.y, 'fish');
        fishEffect.attachedTo = hook;
        labelEffect = this.add.text(hook.x, hook.y - 40, '+100', { fontSize: '40px', color: '#2ed573', fontStyle: 'bold', stroke: '#000', strokeThickness: 4}).setOrigin(0.5);
        this.score += 100;
    } else {
        labelEffect = this.add.text(hook.x, hook.y - 40, '❌ Miss', { fontSize: '40px', color: '#ff4757', fontStyle: 'bold', stroke: '#000', strokeThickness: 4}).setOrigin(0.5);
        this.score -= 50;
    }

    this.scoreText.setText('Score: ' + this.score);

    // Kéo lên
    hook.setVelocityY(-600);

    // Mở khoá chuyển động khi kéo xong
    this.time.delayedCall(800, () => {
        if (fishEffect) fishEffect.destroy();
        if (labelEffect) labelEffect.destroy();
        this.isFishing = false;
    });
  }

  update() {
    // Nếu đang câu cá (hiện câu hỏi) thì không cho di chuyển
    if (this.isFishing) {
        this.player.setVelocity(0, 0);
    } else {
        const speed = 400;
        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown || this.wasd.A.isDown || this.inputDirection.x < 0) vx = -1;
        else if (this.cursors.right.isDown || this.wasd.D.isDown || this.inputDirection.x > 0) vx = 1;
        
        if (this.cursors.up.isDown || this.wasd.W.isDown || this.inputDirection.y < 0) vy = -1;
        else if (this.cursors.down.isDown || this.wasd.S.isDown || this.inputDirection.y > 0) vy = 1;

        this.player.setVelocity(vx * speed, vy * speed);
        // Đã xóa bỏ giới hạn chặn đường, người chơi 😸 giờ đây có thể đi tẹt ga mọi nơi trên bãi cỏ
    }

    // Update dây câu & cá đính kèm
    this.hookGroup.getChildren().forEach((hook: any) => {
      hook.line.setTo(this.player.x, this.player.y, hook.x, hook.y);
      if (hook.y < this.player.y) {
        hook.line.destroy();
        hook.destroy();
      }
    });

    this.children.list.forEach((child: any) => {
      if (child.attachedTo) {
         child.setPosition(child.attachedTo.x, child.attachedTo.y + 10);
         if (!child.attachedTo.active) child.destroy();
      }
      if (child.text === '😸') {
          child.setPosition(this.player.x, this.player.y);
      }
    });
  }
}

// ── Mobile Controls Overlay ──
function MobileOverlay({ quizMode, quizData, onAnswer }: any) {
  if (quizMode && quizData) {
    return (
      <div className={styles.controlsArea} style={{ flexDirection: 'column', padding: '16px' }}>
         <div style={{ display: 'grid', gridTemplateColumns: '1fr', gridTemplateRows: 'repeat(4, 1fr)', gap: '8px', width: '100%', height: '100%' }}>
            {quizData.options.map((opt: any) => (
               <button key={opt.id} onClick={() => onAnswer(opt.isCorrect)} className={styles.quizBtn}>
                  {opt.text}
               </button>
            ))}
         </div>
      </div>
    );
  }

  // Chế độ bình thường (D-Pad + Lưỡi Câu)
  const emitDir = (x: number, y: number) => {
    window.dispatchEvent(new CustomEvent('fishing_dpad', { detail: { x, y } }));
  };
  const emitAction = () => {
    window.dispatchEvent(new CustomEvent('fishing_action'));
  };

  return (
    <div className={styles.controlsArea}>
      <div className={styles.dpad}>
        <button 
          className={`${styles.dpadBtn} ${styles.dpadUp}`} 
          onTouchStart={() => emitDir(0, -1)} 
          onTouchEnd={() => emitDir(0, 0)}
          onMouseDown={() => emitDir(0, -1)} 
          onMouseUp={() => emitDir(0, 0)}
        >▲</button>
        <button 
          className={`${styles.dpadBtn} ${styles.dpadLeft}`} 
          onTouchStart={() => emitDir(-1, 0)} 
          onTouchEnd={() => emitDir(0, 0)}
          onMouseDown={() => emitDir(-1, 0)} 
          onMouseUp={() => emitDir(0, 0)}
        >◀</button>
        <div className={styles.dpadCenter} />
        <button 
          className={`${styles.dpadBtn} ${styles.dpadRight}`} 
          onTouchStart={() => emitDir(1, 0)} 
          onTouchEnd={() => emitDir(0, 0)}
          onMouseDown={() => emitDir(1, 0)} 
          onMouseUp={() => emitDir(0, 0)}
        >▶</button>
        <button 
          className={`${styles.dpadBtn} ${styles.dpadDown}`} 
          onTouchStart={() => emitDir(0, 1)} 
          onTouchEnd={() => emitDir(0, 0)}
          onMouseDown={() => emitDir(0, 1)} 
          onMouseUp={() => emitDir(0, 0)}
        >▼</button>
      </div>
      <div>
        <button className={styles.actionBtn} onClick={emitAction} onTouchStart={emitAction}>🎣</button>
      </div>
    </div>
  );
}

// ── Default Export React Component ──
export default function FishingPlayerMockup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [msg, setMsg] = useState('Di chuyển khắp bãi cỏ và bấm "🎣" để dò tìm!');
  
  // Quiz State
  const [quizMode, setQuizMode] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const config = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: '#1a1a2e',
      audio: {
        noAudio: true // Tắt WebAudio của Phaser để tránh lỗi trùng lặp khi React (Next.js) Hot-Reload 
      },
      scale: {
        mode: Phaser.Scale.ENVELOP,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 720,
        height: 1000,
      },
      physics: {
        default: 'arcade',
        arcade: { debug: false }
      },
      scene: [FishingScene]
    };

    const game = new Phaser.Game(config);

    // Lắng nghe tín hiệu "Cá cắn câu" từ Phaser chuyển sang
    const handleHooked = () => {
       // Khởi tạo một câu hỏi ngẫu nhiên làm Mockup
       const mockQuestion = {
          q: 'What is the meaning of "Apple"?',
          options: [
            { id: 1, text: 'Quả Táo', isCorrect: true },
            { id: 2, text: 'Con Chó', isCorrect: false },
            { id: 3, text: 'Cái Cây', isCorrect: false },
            { id: 4, text: 'Quả Cam', isCorrect: false }
          ]
       };
       setQuizData(mockQuestion);
       setQuizMode(true);
       setMsg('🐟 Bạn đã móc trúng cá! Trả lời ngay: \n' + mockQuestion.q);
    };

    window.addEventListener('fishing_hooked', handleHooked);

    return () => {
      game.destroy(true);
      window.removeEventListener('fishing_hooked', handleHooked);
    };
  }, []);

  const handleAnswerSubmit = (isCorrect: boolean) => {
      setQuizMode(false);
      setMsg(isCorrect ? '🎉 Bạn kéo lên được một con Mập!' : '❌ Câu sai rồi! Cá chạy mất...');
      // Gửi ngầm tín hiệu lại cho Game để kéo dây câu
      window.dispatchEvent(new CustomEvent('fishing_answered', { detail: { isCorrect } }));
  };

  return (
    <div className={styles.gamePage}>
      <div className={styles.mobileFrame}>
        <div style={{ position: 'absolute', top: 30, left: 0, width: '100%', textAlign: 'center', zIndex: 50, pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(0,0,0,0.8)', padding: '15px 24px', borderRadius: 25, display: 'inline-block', fontSize: 18, fontWeight: 'bold' }}>
            {msg.split('\n').map((line, i) => <div key={i}>{line}</div>)}
          </div>
        </div>

        <div ref={containerRef} className={styles.canvasWrapper} />

        <MobileOverlay 
           quizMode={quizMode} 
           quizData={quizData} 
           onAnswer={handleAnswerSubmit} 
        />
      </div>
    </div>
  );
}
