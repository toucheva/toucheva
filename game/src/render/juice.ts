/**
 * Game Feel — สเปกหมวด 8.2 ของเอกสารออกแบบ
 * ทุกการกระทำตอบสนอง 4 ชั้นภายใน 100 ms: ภาพ + เสียง + การเด้ง + ตัวเลขลอยขึ้น
 */

export type ParticleShape = 'clod' | 'drop' | 'spark' | 'leaf';

export type Particle = {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; color: string; gravity: number;
  shape: ParticleShape; rot: number; spin: number;
};

export type Floater = {
  x: number; y: number; text: string; color: string;
  life: number; maxLife: number; size: number;
};

export class Juice {
  particles: Particle[] = [];
  rings: { x: number; y: number; r: number; life: number; maxLife: number; color: string }[] = [];
  floaters: Floater[] = [];
  shake = 0;
  /** หยุดเวลาสั้นๆ ตอนได้ของดี — ใช้เฉพาะผัก 5 ดาว */
  hitStop = 0;
  /** ตารางเด้งของแต่ละช่อง: index -> เวลาที่เหลือ */
  pops = new Map<number, number>();

  burst(
    x: number, y: number, color: string, n: number,
    opts?: { spread?: number; gravity?: number; size?: number; shape?: ParticleShape; life?: number },
  ) {
    const spread = opts?.spread ?? 90;
    const shape = opts?.shape ?? 'clod';
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = Math.random() * spread;
      const life = (opts?.life ?? 0.6) * (0.72 + Math.random() * 0.5);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life,
        maxLife: life,
        size: (opts?.size ?? 2.4) * (0.7 + Math.random() * 0.7),
        color,
        gravity: opts?.gravity ?? 320,
        shape,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 9,
      });
    }
  }

  /** วงคลื่นตอนน้ำกระทบดิน */
  ring(x: number, y: number, color: string) {
    this.rings.push({ x, y, r: 2, life: 0.42, maxLife: 0.42, color });
  }

  float(x: number, y: number, text: string, color: string, size = 15) {
    this.floaters.push({ x, y, text, color, life: 0.95, maxLife: 0.95, size });
  }

  pop(index: number, strength = 1) {
    this.pops.set(index, 0.22 * strength);
  }

  addShake(amount: number) {
    this.shake = Math.min(6, this.shake + amount);
  }

  stop(seconds: number) {
    this.hitStop = Math.max(this.hitStop, seconds);
  }

  update(dt: number) {
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      // หยุดเวลาแล้วอนุภาคหยุดด้วย ทำให้จังหวะกระแทกชัดขึ้น
      return;
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) { this.rings.splice(i, 1); continue; }
      r.r += 42 * dt;
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
    for (const [k, v] of this.pops) {
      const next = v - dt;
      if (next <= 0) this.pops.delete(k);
      else this.pops.set(k, next);
    }
    this.shake = Math.max(0, this.shake - dt * 26);
  }

  /** ค่าขยาย-ยุบของช่อง สำหรับ squash & stretch */
  popScale(index: number): number {
    const t = this.pops.get(index);
    if (t === undefined) return 1;
    const p = t / 0.22;
    return 1 + Math.sin(p * Math.PI) * 0.18;
  }

  drawParticles(ctx: CanvasRenderingContext2D) {
    for (const r of this.rings) {
      const a = r.life / r.maxLife;
      ctx.globalAlpha = a * 0.55;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 1.6 * a;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.r, r.r * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const p of this.particles) {
      const a = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      switch (p.shape) {
        case 'clod':
          // ก้อนดินมีด้านมืดด้านสว่าง ไม่ใช่จุดสีเดียว
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.78, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,.28)';
          ctx.beginPath();
          ctx.ellipse(p.size * 0.22, p.size * 0.22, p.size * 0.6, p.size * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'drop':
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.5);
          ctx.quadraticCurveTo(p.size, 0, 0, p.size);
          ctx.quadraticCurveTo(-p.size, 0, 0, -p.size * 1.5);
          ctx.fill();
          break;
        case 'leaf':
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'spark': {
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2.6);
          g.addColorStop(0, p.color);
          g.addColorStop(1, 'rgba(255,215,110,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 2.6, 0, Math.PI * 2);
          ctx.fill();
          // ประกายสี่แฉก
          ctx.fillStyle = '#fff6d8';
          const L = p.size * (1.4 + Math.sin(p.rot * 3) * 0.4);
          ctx.beginPath();
          ctx.moveTo(0, -L); ctx.lineTo(L * 0.3, 0); ctx.lineTo(0, L); ctx.lineTo(-L * 0.3, 0);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(-L, 0); ctx.lineTo(0, L * 0.3); ctx.lineTo(L, 0); ctx.lineTo(0, -L * 0.3);
          ctx.closePath();
          ctx.fill();
          break;
        }
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  drawFloaters(ctx: CanvasRenderingContext2D) {
    for (const f of this.floaters) {
      const t = 1 - f.life / f.maxLife;
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life / 0.45));
      ctx.font = `700 ${f.size}px "IBM Plex Sans Thai", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      // ลอยขึ้นเป็นโค้ง ไม่ใช่เส้นตรง
      const fx = f.x + Math.sin(t * 3) * 3;
      const fy = f.y - t * 34;
      // ขอบเข้มรอบตัวอักษร ให้อ่านออกบนพื้นสีอะไรก็ได้
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(12,18,8,.72)';
      ctx.lineJoin = 'round';
      ctx.strokeText(f.text, fx, fy);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, fx, fy);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}
