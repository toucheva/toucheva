import { GRID, GameState } from '../state';
import { Juice } from './juice';
import { roundRect } from './art';
import { BOARD, PAD, TILE, drawGround, invalidateGround } from './ground';
import { drawPlant, drawStake } from './plants';

export { BOARD, PAD, TILE, invalidateGround };

export function tileAt(px: number, py: number): number | null {
  const x = Math.floor((px - PAD) / TILE);
  const y = Math.floor((py - PAD) / TILE);
  if (x < 0 || x >= GRID || y < 0 || y >= GRID) return null;
  return y * GRID + x;
}

export function tileCenter(index: number): { x: number; y: number } {
  return {
    x: PAD + (index % GRID) * TILE + TILE / 2,
    y: PAD + Math.floor(index / GRID) * TILE + TILE / 2,
  };
}

export function draw(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  juice: Juice,
  hover: number | null,
  time: number,
  dpr: number,
): void {
  ctx.save();
  if (juice.shake > 0) {
    ctx.translate((Math.random() - 0.5) * juice.shake, (Math.random() - 0.5) * juice.shake);
  }

  drawGround(ctx, state, dpr);

  // ลมเป็นคลื่นช้าๆ ซ้อนกับลมกระโชกเป็นระยะ พืชทั้งแปลงจึงโยกไม่พร้อมกัน
  const wind = 0.35 + Math.sin(time * 0.42) * 0.3 + Math.max(0, Math.sin(time * 0.13)) * 0.45;

  for (let i = 0; i < state.plots.length; i++) {
    const crop = state.plots[i].crop;
    if (!crop) continue;
    const { x, y } = tileCenter(i);
    const scale = juice.popScale(i);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, 1 / Math.sqrt(scale));  // ยุบแนวตั้งเมื่อขยายแนวนอน ให้รู้สึกยืดหยุ่น
    if (crop.staked) drawStake(ctx);
    drawPlant(ctx, crop, i, wind, time);
    ctx.restore();

    if (crop.ready) drawReadyMark(ctx, x, y, time, i);
    if (crop.dryDays > 0 && !crop.ready) drawThirstMark(ctx, x, y, time);
  }

  if (hover !== null) drawHover(ctx, hover);

  juice.drawParticles(ctx);
  juice.drawFloaters(ctx);
  ctx.restore();
}

/** เก็บได้แล้ว: แสงเรืองนุ่มกับลูกศรลอย เห็นได้จากมุมตาโดยไม่ต้องเพ่ง */
function drawReadyMark(
  ctx: CanvasRenderingContext2D, x: number, y: number, t: number, i: number,
): void {
  const pulse = 0.5 + Math.sin(t * 2.6 + i) * 0.5;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 2, x, y, TILE * 0.46);
  g.addColorStop(0, `rgba(255,224,130,${0.13 + pulse * 0.1})`);
  g.addColorStop(1, 'rgba(255,224,130,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, TILE * 0.46, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const ay = y - TILE * 0.38 - pulse * 2.5;
  ctx.fillStyle = `rgba(255,231,150,${0.7 + pulse * 0.3})`;
  ctx.beginPath();
  ctx.moveTo(x, ay + 5);
  ctx.lineTo(x - 4, ay);
  ctx.lineTo(x + 4, ay);
  ctx.closePath();
  ctx.fill();
}

/** ขาดน้ำ: หยดน้ำจางๆ มีกากบาท อ่านออกโดยไม่ต้องใช้ข้อความ */
function drawThirstMark(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const bob = Math.sin(t * 3) * 1.2;
  const dx = x + TILE * 0.31;
  const dy = y - TILE * 0.31 + bob;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#7fb8e8';
  ctx.beginPath();
  ctx.moveTo(dx, dy - 4.5);
  ctx.quadraticCurveTo(dx + 3.4, dy + 1, dx, dy + 3.4);
  ctx.quadraticCurveTo(dx - 3.4, dy + 1, dx, dy - 4.5);
  ctx.fill();
  ctx.strokeStyle = '#ef6b5e';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(dx - 4, dy + 4);
  ctx.lineTo(dx + 4, dy - 4);
  ctx.stroke();
  ctx.restore();
}

function drawHover(ctx: CanvasRenderingContext2D, index: number): void {
  const x = PAD + (index % GRID) * TILE;
  const y = PAD + Math.floor(index / GRID) * TILE;
  ctx.save();
  roundRect(ctx, x + 2.5, y + 2.5, TILE - 5, TILE - 5, 5);
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,252,238,.62)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // มุมทั้งสี่ ทำให้ตัวชี้อ่านง่ายบนพื้นลายเยอะ
  ctx.strokeStyle = 'rgba(255,252,238,.95)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  const c = 7;
  for (const [cx, cy, sx, sy] of [
    [x + 4, y + 4, 1, 1], [x + TILE - 4, y + 4, -1, 1],
    [x + 4, y + TILE - 4, 1, -1], [x + TILE - 4, y + TILE - 4, -1, -1],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * c, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + sy * c);
    ctx.stroke();
  }
  ctx.restore();
}
