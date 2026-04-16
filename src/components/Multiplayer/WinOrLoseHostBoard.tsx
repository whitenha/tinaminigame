import React, { useEffect, useRef, useState } from 'react';
import { Game, Scene, Scale, Math as PhaserMath, GameObjects } from 'phaser';

class HostScene extends Scene {
  private timeText!: GameObjects.Text;
  private phaseText!: GameObjects.Text;
  private optionsContainer!: GameObjects.Container;
  private particleManager!: GameObjects.Particles.ParticleEmitterManager;

  constructor() {
    super({ key: 'HostScene' });
  }

  preload() {
    // Load particle texture (we can generate one programmatically)
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(8, 8, 8);
    graphics.generateTexture('coin-particle', 16, 16);
  }

  create() {
    const { width, height } = this.scale;
    
    this.phaseText = this.add.text(width / 2, 50, 'BETTING PHASE', {
      fontSize: '32px',
      color: '#f1c40f',
      fontFamily: 'Montserrat, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.timeText = this.add.text(width / 2, 100, '', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'Montserrat, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.optionsContainer = this.add.container(width / 2, height / 2 + 50);
  }

  updateState(timeLeft: number, phase: string, options: any[], showFeedback: boolean) {
    if (this.timeText) {
       this.timeText.setText(timeLeft > 0 ? timeLeft.toString() : 'TIME UP');
    }
    
    if (this.phaseText) {
      if (phase === 'betting') {
        this.phaseText.setText('BETTING PHASE - Cược điểm!');
        this.phaseText.setColor('#f1c40f');
      } else if (phase === 'answering') {
        this.phaseText.setText('ANSWERING - Cùng trả lời!');
        this.phaseText.setColor('#3498db');
      } else {
        this.phaseText.setText('REVEAL - Kết quả!');
        this.phaseText.setColor('#2ecc71');
      }
    }

    if (this.optionsContainer && this.optionsContainer.getAll().length === 0 && options && phase !== 'betting') {
       // Draw options
       options.forEach((opt, idx) => {
         const x = (idx % 2 === 0 ? -1 : 1) * 200;
         const y = (idx < 2 ? -1 : 1) * 80;
         
         const bg = this.add.rectangle(x, y, 350, 100, 0x2c3e50).setStrokeStyle(2, 0x34495e);
         const txt = this.add.text(x, y, opt.text, {
            fontSize: '24px', color: '#ffffff', fontFamily: 'Montserrat, sans-serif'
         }).setOrigin(0.5);
         
         this.optionsContainer.add([bg, txt]);
       });
    }

    if (showFeedback && this.timeText && !this.timeText.getData('exploded')) {
       this.timeText.setData('exploded', true);
       // Explode particles!
       this.add.particles(this.scale.width / 2, this.scale.height / 2, 'coin-particle', {
          speed: { min: 200, max: 600 },
          angle: { min: 0, max: 360 },
          scale: { start: 1, end: 0 },
          lifespan: 2000,
          gravityY: 800,
          quantity: 100,
          tint: [ 0xf1c40f, 0xf39c12, 0xe67e22 ]
       });
    }
  }
}

export default function WinOrLoseHostBoard({ item, mp, timeLeft, showFeedback }: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const timeLimit = item?.extra_data?.time_limit || 20;
  const isBetting = timeLeft > timeLimit;

  const [shuffledOpts, setShuffledOpts] = useState<any[]>([]);

  useEffect(() => {
    if (item?.options) {
       const opts = item.options.map((opt: any, i: number) => ({ text: typeof opt === 'string' ? opt : opt.text, idx: i }));
       setShuffledOpts(opts);
    }
  }, [item]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (gameRef.current) return;

    gameRef.current = new Game({
      type: Phaser.WEBGL,
      width: 1024,
      height: 600,
      parent: containerRef.current,
      transparent: true,
      scene: HostScene,
      scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
      }
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene('HostScene') as HostScene;
      if (scene && scene.updateState) {
         let phase = isBetting ? 'betting' : 'answering';
         scene.updateState(timeLeft, phase, shuffledOpts, showFeedback); 
      }
    }
  }, [timeLeft, isBetting, shuffledOpts, showFeedback]);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 400, position: 'relative' }}>
       <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
