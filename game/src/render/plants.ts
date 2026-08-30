import { CROPS } from '../data/crops';
import { PlantedCrop } from '../state';
import { groundShadow, hash, leafShape, shade } from './art';

/**
 * วาดพืชแยกตามตระกูล ใบ / หัว / ผล / ฝัก
 * แต่ละต้นมีค่าสุ่มคงที่ของตัวเอง ทำให้แปลงเดียวกันไม่มีต้นไหนเหมือนกันเป๊ะ
 */
export function drawPlant(
  ctx: CanvasRenderingContext2D,
  crop: PlantedCrop,
  index: number,
  wind: number,
  t: number,
): void {
  const def = CROPS[crop.cropId];
  const grow = Math.min(1, crop.stage / def.stages);
  if (grow <= 0 && !crop.ready) return;

  const v = hash(index, 3);           // ค่าประจำต้น: ขนาดและทิศทาง
  const size = (0.9 + v * 0.24) * 1.42;
  const flip = hash(index, 4) > 0.5 ? 1 : -1;
  const phase = v * Math.PI * 2;

  // ลมพัด: ต้นสูงโยกมากกว่าต้นเตี้ย
  const sway = Math.sin(t * 1.3 + phase) * (1.6 + wind * 3.4) * (0.35 + grow);

  ctx.save();
  ctx.scale(flip * size, size);

  groundShadow(ctx, 14.5, 5.5 + grow * 8.5, 0.3);

  if (crop.fallen) ctx.rotate(0.62);

  const lit = shade(def.leaf, 26);
  const dark = shade(def.leaf, -30);

  switch (def.family) {
    case 'leaf': drawLeafy(ctx, def.leaf, lit, dark, grow, sway, index, crop.ready, def.fruit); break;
    case 'root': drawRoot(ctx, def.leaf, lit, dark, grow, sway, index, crop.ready); break;
    case 'pod':  drawPod(ctx, def.leaf, lit, dark, grow, sway, index, crop.ready, def.fruit); break;
    default:     drawFruiting(ctx, def.leaf, lit, dark, grow, sway, index, crop.ready, def.fruit, t, def.id === 'chili'); break;
  }

  ctx.restore();
}

/** ผักใบ: กุหลาบใบซ้อนกันจากหลังมาหน้า */
function drawLeafy(
  ctx: CanvasRenderingContext2D, base: string, lit: string, dark: string,
  grow: number, sway: number, index: number, ready: boolean, heart: string,
): void {
  const n = 5 + Math.round(grow * 4);
  const R = 4 + grow * 13;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash(index, 20 + i) * 0.5;
    const back = Math.sin(a) < 0;
    const len = R * (0.75 + hash(index, 40 + i) * 0.5);
    ctx.save();
    ctx.translate(sway * 0.4, 10 - grow * 3);
    ctx.rotate(a + sway * 0.02);
    ctx.fillStyle = back ? dark : base;
    leafShape(ctx, len, len * 0.46);
    ctx.fill();
    if (!back) {
      ctx.fillStyle = lit;
      leafShape(ctx, len * 0.62, len * 0.2);
      ctx.fill();
    }
    ctx.restore();
  }
  if (ready) {
    ctx.save();
    ctx.translate(sway * 0.4, 8 - grow * 3);
    const r = R * 0.4;
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, shade(heart, 22));
    g.addColorStop(1, shade(heart, -26));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    // เส้นกลีบ ให้ดูเป็นหัวผักที่ห่อตัว ไม่ใช่วงกลมทึบ
    ctx.strokeStyle = 'rgba(40,64,26,.35)';
    ctx.lineWidth = 0.8;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** พืชหัว: พุ่มใบกับพูนดิน ผลอยู่ใต้ดิน ต้องขุดถึงรู้ */
function drawRoot(
  ctx: CanvasRenderingContext2D, base: string, lit: string, dark: string,
  grow: number, sway: number, index: number, ready: boolean,
): void {
  if (ready) {
    ctx.fillStyle = '#6b4d33';
    ctx.beginPath();
    ctx.ellipse(0, 13, 14, 5.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath();
    ctx.ellipse(0, 14.6, 13, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,235,205,.14)';
    ctx.beginPath();
    ctx.ellipse(-2, 11.4, 8, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const stems = 4 + Math.round(grow * 3);
  for (let i = 0; i < stems; i++) {
    const spread = (i - (stems - 1) / 2) * 4.4;
    const h = (7 + grow * 15) * (0.7 + hash(index, 60 + i) * 0.55);
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(spread * 0.35, 12);
    ctx.quadraticCurveTo(spread * 0.8 + sway * 0.4, 12 - h * 0.6, spread + sway, 12 - h);
    ctx.stroke();
    for (let k = 0; k < 4; k++) {
      for (const side of [-1, 1] as const) {
        ctx.save();
        ctx.translate(spread * (0.45 + k * 0.18) + sway * 0.7, 12 - h * (0.34 + k * 0.21));
        ctx.rotate(side * (0.55 + k * 0.12) + sway * 0.03);
        ctx.fillStyle = k === 3 ? lit : side < 0 ? dark : base;
        leafShape(ctx, side * (5.4 + grow * 4), 2.8 + grow * 1.9);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}

/** ถั่ว: เถาเลื้อยขึ้นค้างกับฝักห้อย */
function drawPod(
  ctx: CanvasRenderingContext2D, base: string, lit: string, dark: string,
  grow: number, sway: number, index: number, ready: boolean, fruit: string,
): void {
  const h = 8 + grow * 22;
  ctx.strokeStyle = '#8d6e52';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(2, 14);
  ctx.lineTo(2 + sway * 0.5, 14 - h);
  ctx.stroke();

  ctx.strokeStyle = base;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 14);
  for (let s = 0; s <= 10; s++) {
    const p = s / 10;
    ctx.lineTo(Math.sin(p * 7 + hash(index, 5) * 3) * 3.8 + sway * p, 14 - h * p);
  }
  ctx.stroke();

  const leaves = 4 + Math.round(grow * 4);
  for (let i = 0; i < leaves; i++) {
    const p = (i + 1) / (leaves + 1);
    ctx.save();
    ctx.translate(Math.sin(p * 7) * 3.4 + sway * p, 14 - h * p);
    ctx.rotate((i % 2 === 0 ? -0.85 : 0.85) + sway * 0.03);
    ctx.fillStyle = i === leaves - 1 ? lit : i % 2 === 0 ? base : dark;
    leafShape(ctx, 7 + grow * 4.5, 3.6 + grow * 2.2);
    ctx.fill();
    ctx.restore();
  }

  if (ready) {
    for (let i = 0; i < 4; i++) {
      const p = 0.3 + i * 0.17;
      const px = Math.sin(p * 7) * 3.8 + sway * p + (i - 1.5) * 3.4;
      const py = 14 - h * p;
      const len = 12 + grow * 5;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate((hash(index, 70 + i) - 0.5) * 0.5);
      ctx.fillStyle = shade(fruit, -18);
      ctx.beginPath();
      ctx.roundRect(-1.7, 0, 3.4, len, 1.7);
      ctx.fill();
      ctx.fillStyle = fruit;
      ctx.beginPath();
      ctx.roundRect(-1.3, 0.6, 2.2, len - 1.4, 1.1);
      ctx.fill();
      ctx.fillStyle = shade(fruit, 46);
      ctx.beginPath();
      ctx.roundRect(-1, 1.4, 0.9, len - 3, 0.5);
      ctx.fill();
      ctx.fillStyle = 'rgba(40,60,24,.28)';
      for (let k = 1; k < 4; k++) ctx.fillRect(-1.4, 2 + (len - 4) * (k / 4), 2.8, 0.7);
      ctx.restore();
    }
  }
}

/** มะเขือเทศ พริก: ลำต้นแตกกิ่งกับผลกลมมีไฮไลต์ */
function drawFruiting(
  ctx: CanvasRenderingContext2D, base: string, lit: string, dark: string,
  grow: number, sway: number, index: number, ready: boolean, fruit: string, t: number,
  pepper: boolean,
): void {
  const h = 8 + grow * 21;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.quadraticCurveTo(sway * 0.4, 14 - h * 0.55, sway, 14 - h);
  ctx.stroke();

  const branches = 2 + Math.round(grow * 3);
  for (let i = 0; i < branches; i++) {
    const p = (i + 1) / (branches + 1);
    const dir = i % 2 === 0 ? -1 : 1;
    const bx = sway * p;
    const by = 14 - h * p;
    ctx.strokeStyle = base;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + dir * (4 + grow * 4), by - 2.6);
    ctx.stroke();

    ctx.save();
    ctx.translate(bx + dir * (4 + grow * 4), by - 2.6);
    ctx.rotate(dir * 0.45 + sway * 0.03);
    ctx.fillStyle = i % 2 === 0 ? base : lit;
    leafShape(ctx, dir * (5 + grow * 4), 2.8 + grow * 1.8);
    ctx.fill();
    ctx.restore();
  }

  if (!ready) return;

  for (let i = 0; i < (pepper ? 4 : 3); i++) {
    const a = (i / (pepper ? 4 : 3)) * Math.PI * 2 + t * 0.12 + hash(index, 6) * 6;
    const fx = Math.cos(a) * (5 + grow * 3) + sway * 0.7;
    const fy = Math.sin(a) * (3.4 + grow * 2) - 1;

    if (pepper) {
      // พริกเป็นฝักเรียวห้อยลง ไม่ใช่ผลกลมแบบมะเขือเทศ
      const len = 9 + grow * 4;
      const wdt = 2 + grow * 0.7;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(0.25 + (hash(index, 90 + i) - 0.5) * 0.7 + sway * 0.02);
      const g = ctx.createLinearGradient(-wdt, 0, wdt, 0);
      g.addColorStop(0, shade(fruit, 40));
      g.addColorStop(0.5, fruit);
      g.addColorStop(1, shade(fruit, -42));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(wdt, len * 0.42, wdt * 0.42, len * 0.86);
      ctx.quadraticCurveTo(0, len * 1.06, -wdt * 0.42, len * 0.86);
      ctx.quadraticCurveTo(-wdt, len * 0.42, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.42)';
      ctx.beginPath();
      ctx.ellipse(-wdt * 0.3, len * 0.3, wdt * 0.2, len * 0.24, 0.1, 0, Math.PI * 2);
      ctx.fill();
      // ขั้วพริก
      ctx.strokeStyle = shade(base, -14);
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0.6);
      ctx.lineTo(-0.6, -2.4);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    const r = 3.4 + grow * 1.3;
    const g = ctx.createRadialGradient(fx - r * 0.35, fy - r * 0.4, r * 0.14, fx, fy, r);
    g.addColorStop(0, shade(fruit, 52));
    g.addColorStop(0.62, fruit);
    g.addColorStop(1, shade(fruit, -34));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
    // ขั้วมะเขือเทศ ทำให้อ่านออกว่าเป็นผลไม้ ไม่ใช่ลูกบอล
    ctx.strokeStyle = shade(base, -10);
    ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      const ka = (k / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(fx, fy - r * 0.72);
      ctx.lineTo(fx + Math.cos(ka) * r * 0.5, fy - r * 0.72 + Math.sin(ka) * r * 0.3);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath();
    ctx.ellipse(fx - r * 0.36, fy - r * 0.42, r * 0.24, r * 0.16, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** ไม้ค้ำ วาดแยกเพราะต้องอยู่หลังต้น */
export function drawStake(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#8a6a4c';
  ctx.fillRect(6, -20, 2.4, 36);
  ctx.fillStyle = 'rgba(255,235,205,.28)';
  ctx.fillRect(6, -20, 0.9, 36);
  ctx.strokeStyle = '#6d543c';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(1, -6);
  ctx.lineTo(9, -8);
  ctx.stroke();
}
