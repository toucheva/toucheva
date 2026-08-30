/**
 * Game Feel — สเปกหมวด 8.2 ของเอกสารออกแบบ
 * ทุกการกระทำตอบสนอง 4 ชั้นภายใน 100 ms: ภาพ + เสียง + การเด้ง + ตัวเลขลอยขึ้น
 */

export type Particle = {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; color: string; gravity: number;
};

export type Floater = {
  x: number; y: number; text: string; color: string;
  life: number; maxLife: number; size: number;
};

export class Juice {
  particles: Particle[] = [];
  floaters: Floater[] = [];
  shake = 0;
  /** หยุดเวลาสั้นๆ ตอนได้ของดี — ใช้เฉพาะผัก 5 ดาว */
  hitStop = 0;
  /** ตารางเด้งของแต่ละช่อง: index -> เวลาที่เหลือ */
  pops = new Map<number, number>();

  burst(x: number, y: number, color: string, n: number, opts?: { spread?: number; gravity?: number; size?: number }) {
    const spread = opts?.spread ?? 90;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = Math.random() * spread;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: 0.45 + Math.random() * 0.3,
        maxLife: 0.75,
        size: opts?.size ?? 2 + Math.random() * 2,
        color,
        gravity: opts?.gravity ?? 320,
      });
    }
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
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  drawFloaters(ctx: CanvasRenderingContext2D) {
    for (const f of this.floaters) {
      const t = 1 - f.life / f.maxLife;
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life / 0.45));
      ctx.fillStyle = f.color;
      ctx.font = `600 ${f.size}px "IBM Plex Sans Thai", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      // ลอยขึ้นเป็นโค้ง ไม่ใช่เส้นตรง
      ctx.fillText(f.text, f.x + Math.sin(t * 3) * 3, f.y - t * 34);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}
