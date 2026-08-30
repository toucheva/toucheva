import { GRID, GameState } from '../state';
import { hash, mix, roundRect, shade } from './art';

export const TILE = 64;
export const PAD = 10;
export const BOARD = GRID * TILE + PAD * 2;

const GRASS_BASE = '#4f7d3f';
const SOIL_DRY = '#6f5540';
const SOIL_WET = '#3f2c1e';

let cache: HTMLCanvasElement | null = null;
let cacheDpr = 1;
let dirty = true;

/** เรียกเมื่อสถานะแปลงเปลี่ยน — พื้นดินเป็นชั้นที่แทบไม่เปลี่ยน จึงวาดเก็บไว้ใช้ซ้ำ */
export function invalidateGround(): void {
  dirty = true;
}

export function drawGround(ctx: CanvasRenderingContext2D, state: GameState, dpr: number): void {
  if (!cache || dirty || cacheDpr !== dpr) {
    cache = renderGround(state, dpr);
    cacheDpr = dpr;
    dirty = false;
  }
  ctx.drawImage(cache, 0, 0, BOARD, BOARD);
}

function renderGround(state: GameState, dpr: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.ceil(BOARD * dpr);
  c.height = Math.ceil(BOARD * dpr);
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);

  // พื้นหลังนอกแปลง: ดินอัดแน่นสีเข้ม ทำให้แปลงลอยเด่นขึ้นมา
  const bg = g.createLinearGradient(0, 0, 0, BOARD);
  bg.addColorStop(0, '#33482a');
  bg.addColorStop(1, '#25351e');
  g.fillStyle = bg;
  g.fillRect(0, 0, BOARD, BOARD);

  // ทุ่งหญ้าวาดเป็นผืนเดียวก่อน ไม่แบ่งตามช่อง
  // ถ้าให้แต่ละช่องมีสีของตัวเอง จะเห็นเป็นตารางสี่เหลี่ยมชัดมากและดูเหมือนงานยังไม่เสร็จ
  drawField(g);
  for (let i = 0; i < GRID * GRID; i++) {
    drawBlades(g, PAD + (i % GRID) * TILE, PAD + Math.floor(i / GRID) * TILE, i);
  }
  for (let i = 0; i < GRID * GRID; i++) {
    const plot = state.plots[i];
    if (!plot.tilled) continue;
    drawSoil(g, PAD + (i % GRID) * TILE, PAD + Math.floor(i / GRID) * TILE, i,
      plot.moisture / 100, plot.fertility / 100);
  }

  // แสงจากมุมบนซ้าย + ขอบมืดรอบนอก ทำให้ภาพรวมมีมิติ
  const light = g.createRadialGradient(BOARD * 0.32, BOARD * 0.2, 30, BOARD * 0.5, BOARD * 0.5, BOARD * 0.88);
  light.addColorStop(0, 'rgba(255,246,218,.11)');
  light.addColorStop(0.6, 'rgba(255,240,210,.015)');
  light.addColorStop(1, 'rgba(10,16,7,.26)');
  g.fillStyle = light;
  g.fillRect(0, 0, BOARD, BOARD);

  return c;
}

/** ผืนหญ้าต่อเนื่องทั้งกระดาน ปื้นสีไม่อิงขอบช่อง จึงไม่เห็นรอยต่อเป็นตาราง */
function drawField(g: CanvasRenderingContext2D): void {
  g.fillStyle = GRASS_BASE;
  g.fillRect(0, 0, BOARD, BOARD);

  for (let k = 0; k < 90; k++) {
    const cx = hash(k, 11) * BOARD;
    const cy = hash(k, 12) * BOARD;
    const rx = 16 + hash(k, 13) * 62;
    const ry = 12 + hash(k, 14) * 44;
    const t = hash(k, 15);
    g.fillStyle = t > 0.52
      ? `rgba(190,225,150,${0.035 + t * 0.045})`
      : `rgba(24,54,20,${0.04 + (1 - t) * 0.05})`;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, hash(k, 16) * 3, 0, Math.PI * 2);
    g.fill();
  }
}

/** ใบหญ้าและดอกไม้ แยกตามช่องเพื่อให้กระจายทั่ว แต่ไม่มีสีพื้นประจำช่อง */
function drawBlades(g: CanvasRenderingContext2D, x: number, y: number, i: number): void {
  g.lineCap = 'round';
  for (let k = 0; k < 15; k++) {
    const bx = x + 2 + hash(i, 100 + k) * (TILE - 4);
    const by = y + 4 + hash(i, 200 + k) * (TILE - 6);
    const len = 4 + hash(i, 300 + k) * 6;
    const lean = (hash(i, 400 + k) - 0.5) * 4.5;
    const t = hash(i, 500 + k);
    g.strokeStyle = t > 0.5 ? 'rgba(126,173,88,.85)' : 'rgba(52,86,42,.75)';
    g.lineWidth = 1.15;
    g.beginPath();
    g.moveTo(bx, by);
    g.quadraticCurveTo(bx + lean * 0.5, by - len * 0.6, bx + lean, by - len);
    g.stroke();
  }

  if (hash(i, 77) > 0.9) {
    const fx = x + 14 + hash(i, 78) * (TILE - 28);
    const fy = y + 14 + hash(i, 79) * (TILE - 28);
    g.fillStyle = hash(i, 80) > 0.5 ? '#f4ecb4' : '#eccfdf';
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      g.beginPath();
      g.arc(fx + Math.cos(a) * 1.8, fy + Math.sin(a) * 1.8, 1.35, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#d9a72c';
    g.beginPath();
    g.arc(fx, fy, 1, 0, Math.PI * 2);
    g.fill();
  }
  g.lineCap = 'butt';
}

function drawSoil(
  g: CanvasRenderingContext2D, x: number, y: number, i: number, wet: number, fert: number,
): void {
  const inset = 3;
  const w = TILE - inset * 2;
  const base = mix(SOIL_DRY, SOIL_WET, wet * 0.8);

  g.save();
  roundRect(g, x + inset, y + inset, w, w, 5);
  g.clip();

  // เนื้อดิน ไล่สีจากบนลงล่าง
  const grad = g.createLinearGradient(x, y + inset, x, y + inset + w);
  grad.addColorStop(0, shade(base, 16));
  grad.addColorStop(1, shade(base, -14));
  g.fillStyle = grad;
  g.fillRect(x + inset, y + inset, w, w);

  // รอยคราด: ขีดสั้นจำนวนมากเอียงไปทางเดียวกันคร่าวๆ
  // เส้นยาวพาดขวางเป็นแถบสม่ำเสมอจะอ่านเป็นพื้นไม้ระแนงทันที ขีดสั้นอ่านเป็นดินที่เพิ่งคราด
  const dir = (hash(i, 1250) - 0.5) * 0.5;
  g.lineCap = 'round';
  for (let k = 0; k < 26; k++) {
    const sx = x + inset + 2 + hash(i, 1300 + k) * (w - 4);
    const sy = y + inset + 2 + hash(i, 1400 + k) * (w - 4);
    const len = 3 + hash(i, 1500 + k) * 7;
    const ang = dir + (hash(i, 1600 + k) - 0.5) * 0.55;
    g.strokeStyle = hash(i, 1700 + k) > 0.5
      ? `rgba(30,18,8,${0.10 + hash(i, 1750 + k) * 0.1})`
      : `rgba(255,228,190,${0.05 + hash(i, 1760 + k) * 0.05})`;
    g.lineWidth = 1 + hash(i, 1770 + k) * 1.4;
    g.beginPath();
    g.moveTo(sx, sy);
    g.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    g.stroke();
  }
  g.lineCap = 'butt';

  // ก้อนดิน ให้ผิวไม่เรียบ
  for (let k = 0; k < 30; k++) {
    const cx = x + inset + 3 + hash(i, 600 + k) * (w - 6);
    const cy = y + inset + 3 + hash(i, 700 + k) * (w - 6);
    const rr = 0.8 + hash(i, 800 + k) * 2.6;
    g.fillStyle = hash(i, 900 + k) > 0.5 ? 'rgba(255,232,198,.10)' : 'rgba(0,0,0,.16)';
    g.beginPath();
    g.ellipse(cx, cy, rr, rr * 0.72, hash(i, 950 + k) * 3, 0, Math.PI * 2);
    g.fill();
  }

  // ดินชื้นสะท้อนแสง
  if (wet > 0.25) {
    for (let k = 0; k < 6; k++) {
      g.fillStyle = `rgba(170,212,240,${0.05 + wet * 0.1})`;
      g.beginPath();
      g.ellipse(
        x + inset + 5 + hash(i, 1000 + k) * (w - 10),
        y + inset + 5 + hash(i, 1100 + k) * (w - 10),
        2 + hash(i, 1200 + k) * 3.5, 1.4, 0.5, 0, Math.PI * 2,
      );
      g.fill();
    }
  }

  // เงาขอบด้านใน ทำให้ดูเป็นหลุมที่ขุดลงไป แทนการถมสีดำทับทั้งช่อง
  g.strokeStyle = 'rgba(28,16,8,.5)';
  g.lineWidth = 5;
  roundRect(g, x + inset, y + inset, w, w, 5);
  g.stroke();
  g.strokeStyle = 'rgba(28,16,8,.28)';
  g.lineWidth = 2;
  roundRect(g, x + inset + 3, y + inset + 3, w - 6, w - 6, 4);
  g.stroke();
  g.restore();

  // ขอบดินร่วน: จุดดินกระจายรอบขอบแทนเส้นขอบคม
  // เส้นขอบคมรอบสี่เหลี่ยมทำให้แปลงดูเหมือนลังไม้ ไม่ใช่ดินที่ขุดไว้
  for (let k = 0; k < 22; k++) {

    const side = Math.floor(hash(i, 1800 + k) * 4);
    const along = hash(i, 1900 + k) * w;
    const jitter = 1 + hash(i, 2000 + k) * 2.6;
    let px = x + inset;
    let py = y + inset;
    if (side === 0) { px += along; py -= jitter * 0.5; }
    else if (side === 1) { px += w + jitter * 0.5; py += along; }
    else if (side === 2) { px += along; py += w + jitter * 0.5; }
    else { px -= jitter * 0.5; py += along; }
    g.fillStyle = `rgba(74,54,36,${0.4 + hash(i, 2100 + k) * 0.35})`;
    g.beginPath();
    g.ellipse(px, py, jitter, jitter * 0.72, hash(i, 2200 + k) * 3, 0, Math.PI * 2);
    g.fill();
  }


  // แถบความอุดม อ่านง่ายจากมุมตา
  const bw = w - 18;
  const by = y + TILE - 8.5;
  g.globalAlpha = 0.62;
  g.fillStyle = 'rgba(0,0,0,.55)';
  roundRect(g, x + 9, by, bw, 2.6, 1.3);
  g.fill();
  g.fillStyle = fert > 0.6 ? '#8fc25c' : fert > 0.3 ? '#c9954a' : '#c25b52';
  roundRect(g, x + 9, by, Math.max(2, bw * fert), 2.6, 1.3);
  g.fill();
  g.globalAlpha = 1;
}
