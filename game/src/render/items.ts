import { groundShadow, leafShape, roundRect, shade } from './art';

/**
 * ไอคอนไอเทม — ในเกมแนวรวมร่าง ความสวยทั้งหมดอยู่ที่ตรงนี้
 * ทุกชิ้นวาดในกรอบ -22..22 แล้วให้ผู้เรียกย่อขยายเอง
 * ทุกชิ้นมีเงาใต้ฐาน ไล่สีสองโทน และไฮไลต์ เพื่อให้ดูวางอยู่จริง ไม่ใช่สติกเกอร์แปะ
 */
type Ctx = CanvasRenderingContext2D;

const WOOD = '#a3743f';
const WOOD_D = '#6f4c27';
const LEAF = '#5aa03a';
const LEAF_L = '#8cc95c';
const LEAF_D = '#33702a';
const GOLD = '#f2c141';
const GOLD_D = '#b0821e';
const WATER = '#5cb4e8';
const WATER_D = '#2a7ab0';
const STONE = '#9aa0a4';
const STONE_D = '#5f676c';

/** ทรงกลมมีปริมาตร ใช้ซ้ำเยอะมาก */
function orb(ctx: Ctx, x: number, y: number, r: number, color: string): void {
  const g = ctx.createRadialGradient(x - r * 0.36, y - r * 0.42, r * 0.12, x, y, r);
  g.addColorStop(0, shade(color, 56));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -44));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.34, y - r * 0.4, r * 0.26, r * 0.17, -0.6, 0, Math.PI * 2);
  ctx.fill();
}

/** กล่อง/ลังไม้ มองจากมุมเฉียงเล็กน้อย */
function box(ctx: Ctx, w: number, h: number, color: string, slats = true): void {
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, shade(color, 26));
  g.addColorStop(1, shade(color, -26));
  ctx.fillStyle = g;
  roundRect(ctx, -w / 2, -h / 2, w, h, 2.5);
  ctx.fill();
  if (slats) {
    ctx.strokeStyle = 'rgba(60,36,14,.4)';
    ctx.lineWidth = 1.2;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 1.5, -h / 2 + (h / 3) * i);
      ctx.lineTo(w / 2 - 1.5, -h / 2 + (h / 3) * i);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = 'rgba(255,236,200,.28)';
  ctx.lineWidth = 1;
  roundRect(ctx, -w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1, 2.5);
  ctx.stroke();
}

function stick(ctx: Ctx, len: number, thick: number, angle: number): void {
  ctx.save();
  ctx.rotate(angle);
  const g = ctx.createLinearGradient(0, -thick / 2, 0, thick / 2);
  g.addColorStop(0, shade(WOOD, 22));
  g.addColorStop(1, WOOD_D);
  ctx.fillStyle = g;
  roundRect(ctx, -len / 2, -thick / 2, len, thick, thick / 2);
  ctx.fill();
  ctx.restore();
}

function rosette(ctx: Ctx, r: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = i % 2 === 0 ? LEAF : LEAF_D;
    leafShape(ctx, r, r * 0.5);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = LEAF_L;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.36, 0, Math.PI * 2);
  ctx.fill();
}

const DRAW: Record<string, (ctx: Ctx, t: number) => void> = {
  // ---------- สายผัก ----------
  seed(ctx) {
    groundShadow(ctx, 12, 8, 0.3);
    for (const [x, y, a] of [[-4, 4, 0.4], [4, 5, -0.3], [0, -1, 0.9]] as const) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      const g = ctx.createLinearGradient(-4, -3, 4, 3);
      g.addColorStop(0, '#b98a52');
      g.addColorStop(1, '#7a5326');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,210,.45)';
      ctx.beginPath();
      ctx.ellipse(-1.4, -1, 1.8, 1, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },
  sprout(ctx) {
    groundShadow(ctx, 13, 9, 0.3);
    ctx.strokeStyle = LEAF_D;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 13);
    ctx.quadraticCurveTo(0, 2, 0, -3);
    ctx.stroke();
    for (const side of [-1, 1] as const) {
      ctx.save();
      ctx.translate(0, side < 0 ? -1 : 4);
      ctx.rotate(side * 0.5);
      ctx.fillStyle = side < 0 ? LEAF_L : LEAF;
      leafShape(ctx, side * 12, 5.5);
      ctx.fill();
      ctx.restore();
    }
  },
  lettuce(ctx) {
    groundShadow(ctx, 14, 12, 0.32);
    ctx.save();
    ctx.translate(0, 2);
    rosette(ctx, 15, 7);
    ctx.restore();
  },
  basket(ctx) {
    groundShadow(ctx, 15, 14, 0.32);
    ctx.save();
    ctx.translate(0, -4);
    rosette(ctx, 9, 6);
    ctx.restore();
    ctx.save();
    ctx.translate(0, 7);
    const g = ctx.createLinearGradient(0, -7, 0, 8);
    g.addColorStop(0, '#c69a5c');
    g.addColorStop(1, '#8a6027');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-15, -7);
    ctx.lineTo(15, -7);
    ctx.lineTo(11, 8);
    ctx.lineTo(-11, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,44,16,.45)';
    ctx.lineWidth = 1.1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 5.4, -7);
      ctx.lineTo(i * 4.2, 8);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-13.5, -1);
    ctx.lineTo(13.5, -1);
    ctx.stroke();
    ctx.restore();
  },
  crate(ctx) {
    groundShadow(ctx, 16, 15, 0.34);
    ctx.save();
    ctx.translate(-6, -8);
    ctx.scale(0.62, 0.62);
    rosette(ctx, 11, 6);
    ctx.restore();
    ctx.save();
    ctx.translate(7, -6);
    ctx.scale(0.5, 0.5);
    rosette(ctx, 11, 6);
    ctx.restore();
    ctx.save();
    ctx.translate(0, 8);
    box(ctx, 34, 17, WOOD);
    ctx.restore();
  },
  cart(ctx) {
    groundShadow(ctx, 17, 17, 0.36);
    ctx.save();
    ctx.translate(0, -9);
    ctx.scale(0.55, 0.55);
    rosette(ctx, 12, 6);
    ctx.restore();
    ctx.save();
    ctx.translate(-9, -5);
    ctx.scale(0.4, 0.4);
    rosette(ctx, 12, 6);
    ctx.restore();
    ctx.save();
    ctx.translate(9, -4);
    ctx.scale(0.4, 0.4);
    rosette(ctx, 12, 6);
    ctx.restore();
    ctx.save();
    ctx.translate(0, 6);
    box(ctx, 36, 15, WOOD);
    ctx.restore();
    for (const wx of [-11, 11] as const) {
      orb(ctx, wx, 16, 5.4, '#6d4c2c');
      ctx.fillStyle = '#c8a06a';
      ctx.beginPath();
      ctx.arc(wx, 16, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  // ---------- สายไม้ ----------
  twig(ctx) {
    groundShadow(ctx, 12, 9, 0.28);
    stick(ctx, 22, 4, 0.3);
    stick(ctx, 16, 3.4, -0.6);
  },
  branch(ctx) {
    groundShadow(ctx, 13, 11, 0.3);
    stick(ctx, 30, 7, 0.18);
    ctx.save();
    ctx.translate(8, -5);
    stick(ctx, 12, 4.5, -0.9);
    ctx.restore();
  },
  log(ctx) {
    groundShadow(ctx, 14, 14, 0.32);
    ctx.save();
    ctx.rotate(0.12);
    const g = ctx.createLinearGradient(0, -11, 0, 11);
    g.addColorStop(0, shade(WOOD, 26));
    g.addColorStop(1, WOOD_D);
    ctx.fillStyle = g;
    roundRect(ctx, -18, -11, 36, 22, 5);
    ctx.fill();
    // หน้าตัดซุงพร้อมวงปี
    ctx.fillStyle = '#d9b381';
    ctx.beginPath();
    ctx.ellipse(-15, 0, 5, 10.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,40,.5)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(-15, 0, 5 * (i / 3), 10.5 * (i / 3), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
  plank(ctx) {
    groundShadow(ctx, 14, 15, 0.3);
    for (const [dy, w] of [[6, 38], [-2, 36], [-9, 32]] as const) {
      ctx.save();
      ctx.translate(0, dy);
      ctx.rotate(dy === -2 ? -0.05 : 0.04);
      box(ctx, w, 8, WOOD, false);
      ctx.restore();
    }
  },
  fence(ctx) {
    groundShadow(ctx, 15, 16, 0.32);
    for (const px of [-11, 0, 11] as const) {
      ctx.save();
      ctx.translate(px, 0);
      const g = ctx.createLinearGradient(-4, 0, 4, 0);
      g.addColorStop(0, shade(WOOD, 20));
      g.addColorStop(1, WOOD_D);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-4, 15);
      ctx.lineTo(-4, -10);
      ctx.lineTo(0, -16);
      ctx.lineTo(4, -10);
      ctx.lineTo(4, 15);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    for (const dy of [-4, 7] as const) {
      ctx.save();
      ctx.translate(0, dy);
      box(ctx, 36, 6, shade(WOOD, -8), false);
      ctx.restore();
    }
  },

  // ---------- สายน้ำ ----------
  droplet(ctx, t) {
    groundShadow(ctx, 14, 8, 0.26);
    const bob = Math.sin(t * 2.4) * 1.2;
    ctx.save();
    ctx.translate(0, bob);
    const g = ctx.createRadialGradient(-3, -3, 1, 0, 2, 13);
    g.addColorStop(0, '#c8ecff');
    g.addColorStop(0.5, WATER);
    g.addColorStop(1, WATER_D);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.bezierCurveTo(9, -2, 11, 4, 0, 12);
    ctx.bezierCurveTo(-11, 4, -9, -2, 0, -13);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.beginPath();
    ctx.ellipse(-3.4, 2, 2.2, 3.6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  bucket(ctx) {
    groundShadow(ctx, 15, 12, 0.3);
    ctx.strokeStyle = '#8d949a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -3, 11, Math.PI, 0);
    ctx.stroke();
    const g = ctx.createLinearGradient(0, -6, 0, 14);
    g.addColorStop(0, '#b9c1c7');
    g.addColorStop(1, '#6d757b');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-13, -5);
    ctx.lineTo(13, -5);
    ctx.lineTo(10, 14);
    ctx.lineTo(-10, 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = WATER;
    ctx.beginPath();
    ctx.ellipse(0, -4.5, 12.4, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.beginPath();
    ctx.ellipse(-4, -5, 4, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  barrel(ctx) {
    groundShadow(ctx, 15, 14, 0.32);
    const g = ctx.createLinearGradient(-14, 0, 14, 0);
    g.addColorStop(0, '#7c5a34');
    g.addColorStop(0.4, '#b58448');
    g.addColorStop(1, '#6b4a28');
    ctx.fillStyle = g;
    roundRect(ctx, -14, -13, 28, 27, 7);
    ctx.fill();
    ctx.fillStyle = '#8e9499';
    for (const by of [-7, 5] as const) roundRect(ctx, -14.5, by, 29, 4, 2), ctx.fill();
    ctx.fillStyle = WATER;
    ctx.beginPath();
    ctx.ellipse(0, -12, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.ellipse(-4, -12.5, 4.4, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  well(ctx) {
    groundShadow(ctx, 16, 16, 0.34);
    ctx.fillStyle = '#6f767c';
    roundRect(ctx, -15, -2, 30, 17, 4);
    ctx.fill();
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = (r + c) % 2 ? '#8b9298' : '#787f85';
        roundRect(ctx, -14 + c * 9.6, -1 + r * 5.4, 8.6, 4.4, 1.5);
        ctx.fill();
      }
    }
    ctx.fillStyle = WATER_D;
    ctx.beginPath();
    ctx.ellipse(0, -2, 14, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8c5f30';
    roundRect(ctx, -2, -18, 4, 17, 2);
    ctx.fill();
    ctx.fillStyle = '#b34b3a';
    ctx.beginPath();
    ctx.moveTo(-17, -15);
    ctx.lineTo(0, -23);
    ctx.lineTo(17, -15);
    ctx.lineTo(13, -13);
    ctx.lineTo(0, -19.5);
    ctx.lineTo(-13, -13);
    ctx.closePath();
    ctx.fill();
  },

  // ---------- สายเหรียญ ----------
  coin(ctx, t) {
    groundShadow(ctx, 13, 9, 0.28);
    const spin = Math.abs(Math.cos(t * 1.1));
    ctx.save();
    ctx.scale(0.35 + spin * 0.65, 1);
    orb(ctx, 0, 0, 11, GOLD);
    ctx.strokeStyle = GOLD_D;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 7.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  coins(ctx) {
    groundShadow(ctx, 14, 12, 0.3);
    for (const [x, y] of [[-5, 6], [5, 4], [0, -3]] as const) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 0.42);
      orb(ctx, 0, 0, 10, GOLD);
      ctx.restore();
      ctx.strokeStyle = GOLD_D;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x, y, 10, 4.2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  },
  pouch(ctx) {
    groundShadow(ctx, 15, 13, 0.32);
    const g = ctx.createRadialGradient(-4, -2, 2, 0, 3, 17);
    g.addColorStop(0, '#c99a5f');
    g.addColorStop(1, '#7d5324');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.bezierCurveTo(-18, 2, -14, 15, 0, 15);
    ctx.bezierCurveTo(14, 15, 18, 2, 8, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#5c3c18';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-8, -7);
    ctx.quadraticCurveTo(0, -3, 8, -7);
    ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(0, 5, 4.6, 0, Math.PI * 2);
    ctx.fill();
    for (const [x, y] of [[-2, -12], [4, -13]] as const) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 0.45);
      orb(ctx, 0, 0, 5, GOLD);
      ctx.restore();
    }
  },
  chest(ctx) {
    groundShadow(ctx, 16, 16, 0.34);
    ctx.save();
    ctx.translate(0, 6);
    box(ctx, 36, 16, WOOD);
    ctx.restore();
    const g = ctx.createLinearGradient(0, -14, 0, -2);
    g.addColorStop(0, shade(WOOD, 34));
    g.addColorStop(1, WOOD_D);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-18, -2);
    ctx.quadraticCurveTo(0, -20, 18, -2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = GOLD_D;
    roundRect(ctx, -19, -3, 38, 4, 1.5);
    ctx.fill();
    ctx.fillStyle = GOLD;
    roundRect(ctx, -4, -1, 8, 9, 2);
    ctx.fill();
    ctx.fillStyle = '#6b4a10';
    ctx.beginPath();
    ctx.arc(0, 3, 1.8, 0, Math.PI * 2);
    ctx.fill();
  },

  // ---------- ตัวผลิต ----------
  bed1(ctx) { gardenBed(ctx, 1); },
  bed2(ctx) { gardenBed(ctx, 2); },
  bed3(ctx) { gardenBed(ctx, 3); },
  pile1(ctx) { woodPile(ctx, 1); },
  pile2(ctx) { woodPile(ctx, 2); },
  pile3(ctx) { woodPile(ctx, 3); },

  // ---------- สิ่งกีดขวาง ----------
  weed(ctx, t) {
    groundShadow(ctx, 15, 13, 0.3);
    const sway = Math.sin(t * 1.4) * 1.6;
    for (let i = 0; i < 9; i++) {
      const bx = -13 + i * 3.2;
      const h = 12 + ((i * 7) % 5) * 2.6;
      ctx.strokeStyle = i % 2 ? '#5c7a35' : '#43602a';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, 14);
      ctx.quadraticCurveTo(bx + sway * 0.4, 14 - h * 0.6, bx + sway * (i % 2 ? 1 : -1), 14 - h);
      ctx.stroke();
    }
  },
  rock(ctx) {
    groundShadow(ctx, 15, 14, 0.34);
    const g = ctx.createLinearGradient(-10, -12, 8, 12);
    g.addColorStop(0, shade(STONE, 22));
    g.addColorStop(1, STONE_D);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-15, 12);
    ctx.lineTo(-11, -6);
    ctx.lineTo(-2, -13);
    ctx.lineTo(10, -8);
    ctx.lineTo(15, 5);
    ctx.lineTo(9, 13);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.beginPath();
    ctx.moveTo(-11, -6);
    ctx.lineTo(-2, -13);
    ctx.lineTo(4, -7);
    ctx.lineTo(-6, -2);
    ctx.closePath();
    ctx.fill();
  },
  stump(ctx) {
    groundShadow(ctx, 15, 15, 0.34);
    const g = ctx.createLinearGradient(0, -8, 0, 14);
    g.addColorStop(0, '#8b6234');
    g.addColorStop(1, '#4f3518');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-13, 14);
    ctx.lineTo(-11, -6);
    ctx.lineTo(11, -6);
    ctx.lineTo(13, 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c49a63';
    ctx.beginPath();
    ctx.ellipse(0, -7, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(110,72,32,.6)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -7, 12 * (i / 4), 5 * (i / 4), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // รากโผล่ ทำให้อ่านออกว่าเป็นตอที่ถอนยาก
    ctx.strokeStyle = '#5b3d1c';
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    for (const [x, y] of [[-14, 12], [14, 11]] as const) {
      ctx.beginPath();
      ctx.moveTo(x * 0.65, 10);
      ctx.lineTo(x, y + 3);
      ctx.stroke();
    }
  },
};

function gardenBed(ctx: Ctx, tier: number): void {
  groundShadow(ctx, 16, 17, 0.34);
  const g = ctx.createLinearGradient(0, -12, 0, 14);
  g.addColorStop(0, '#7d5c3f');
  g.addColorStop(1, '#4a3423');
  ctx.fillStyle = g;
  roundRect(ctx, -18, -12, 36, 26, 4);
  ctx.fill();
  ctx.strokeStyle = tier >= 2 ? '#c9a05c' : '#6b4a28';
  ctx.lineWidth = tier >= 2 ? 2.4 : 1.8;
  roundRect(ctx, -18, -12, 36, 26, 4);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.2)';
  ctx.lineWidth = 3;
  for (let r = 0; r < 2; r++) {
    ctx.beginPath();
    ctx.moveTo(-15, -4 + r * 9);
    ctx.lineTo(15, -4 + r * 9);
    ctx.stroke();
  }
  for (let i = 0; i < 2 + tier; i++) {
    ctx.save();
    ctx.translate(-11 + i * (22 / (1 + tier)), -1);
    ctx.scale(0.42, 0.42);
    DRAW.sprout(ctx, 0);
    ctx.restore();
  }
}

function woodPile(ctx: Ctx, tier: number): void {
  groundShadow(ctx, 16, 17, 0.34);
  const rows = 1 + tier;
  for (let r = 0; r < rows; r++) {
    const n = rows - r;
    for (let c = 0; c < n; c++) {
      const x = -((n - 1) * 11) / 2 + c * 11;
      const y = 12 - r * 10;
      ctx.save();
      ctx.translate(x, y);
      const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, 6);
      g.addColorStop(0, '#d9b381');
      g.addColorStop(1, '#8a6027');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 5.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,58,22,.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
  if (tier >= 3) {
    ctx.fillStyle = '#a8412f';
    roundRect(ctx, -19, -20, 38, 7, 2);
    ctx.fill();
  }
}

export function drawItem(ctx: Ctx, itemId: string, t: number): void {
  const fn = DRAW[itemId];
  if (fn) fn(ctx, t);
}

export const hasArt = (itemId: string): boolean => itemId in DRAW;
