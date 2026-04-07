/**
 * Angry Sort — Lightweight Particle System (Canvas 2D)
 */

export class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.running = false;
  }

  resize() {
    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = this.canvas.parentElement.clientHeight;
  }

  // Smoke trail behind bird
  emitTrail(x, y) {
    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        life: 20 + Math.random() * 10,
        maxLife: 30,
        radius: 3 + Math.random() * 4,
        color: `hsla(0, 0%, ${80 + Math.random() * 20}%, `,
        type: 'trail',
      });
    }
  }

  // Confetti burst (correct answer)
  emitConfetti(x, y) {
    const colors = ['#FFD700', '#00B894', '#55EFC4', '#FFEAA7', '#74B9FF', '#A29BFE'];
    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 * i) / 40 + Math.random() * 0.3;
      const speed = 3 + Math.random() * 6;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 40 + Math.random() * 20,
        maxLife: 60,
        radius: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: 'confetti',
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
      });
    }
  }

  // Debris burst (wrong answer / explosion)
  emitDebris(x, y) {
    const colors = ['#8B4513', '#A0522D', '#D2691E', '#CD853F', '#F4A460'];
    for (let i = 0; i < 25; i++) {
      const angle = (Math.PI * 2 * i) / 25 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        radius: 2 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: 'debris',
        gravity: 0.15,
      });
    }
  }

  // Score popup particle (+100)
  emitScorePopup(x, y, text, color = '#FFD700') {
    this.particles.push({
      x, y,
      vx: 0,
      vy: -2,
      life: 60,
      maxLife: 60,
      text,
      color,
      type: 'text',
      fontSize: 28,
    });
  }

  update() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      if (p.gravity) p.vy += p.gravity;
      if (p.type === 'trail') p.vx *= 0.95;

      const alpha = Math.max(0, p.life / p.maxLife);

      if (p.type === 'text') {
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.font = `bold ${p.fontSize}px 'Inter', sans-serif`;
        this.ctx.fillStyle = p.color;
        this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        this.ctx.lineWidth = 3;
        this.ctx.textAlign = 'center';
        this.ctx.strokeText(p.text, p.x, p.y);
        this.ctx.fillText(p.text, p.x, p.y);
        this.ctx.restore();
        p.fontSize += 0.3;
      } else if (p.type === 'confetti') {
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        p.rotation += p.rotSpeed;
        this.ctx.rotate(p.rotation);
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.radius, -p.radius / 2, p.radius * 2, p.radius);
        this.ctx.restore();
        p.vy += 0.08;
      } else {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
        if (typeof p.color === 'string' && p.color.endsWith(', ')) {
          this.ctx.fillStyle = p.color + alpha + ')';
        } else {
          this.ctx.globalAlpha = alpha;
          this.ctx.fillStyle = p.color;
        }
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
      }

      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.update();
      requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    this.running = false;
  }

  clear() {
    this.particles = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
