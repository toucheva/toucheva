import { ITEMS, isGenerator, isObstacle, nextInChain } from '../data/items';
import { COLS, ROWS, GameState } from '../state';
import { hash, roundRect } from './art';
import { drawItem } from './items';
import { Juice } from './juice';

export const TILE = 66;
/** ไอเทมวาดในกรอบ -22..22 ขยายให้เต็มช่องมากขึ้น ไม่งั้นเหลือที่ว่างรอบตัวเยอะจนดูโหวง */
const ITEM_SCALE = 1.26;
export const PAD = 9;
export const BOARD_W = COLS * TILE + PAD * 2;
export const BOARD_H = ROWS * TILE + PAD * 2;

let ground: HTMLCanvasElement | null = null;
let groundDpr = 1;

export function cellAt(px: number, py: number): number | null {
  const x = Math.floor((px - PAD) / TILE);
  const y = Math.floor((py - PAD) / TILE);
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return null;
  return y * COLS + x;
}

export const cellCenter = (i: number): { x: number; y: number } => ({
  x: PAD + (i % COLS) * TILE + TILE / 2,
  y: PAD + Math.floor(i / COLS) * TILE + TILE / 2,
});

export type DragState = { from: number; itemId: string; x: number; y: number } | null;

export function draw(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  juice: Juice,
  opts: { hover: number | null; drag: DragState; time: number; dpr: number; now: number },
): void {
  const { hover, drag, time, dpr, now } = opts;

  ctx.save();
  if (juice.shake > 0) {
    ctx.translate((Math.random() - 0.5) * juice.shake, (Math.random() - 0.5) * juice.shake);
  }

  drawGround(ctx, dpr);

  // ช่องที่จะรวมได้ถ้าปล่อยตรงนี้ ต้องเห็นชัดก่อนปล่อย
  const highlight = drag ? mergeTargets(state, drag) : new Set<number>();

  for (let i = 0; i < state.cells.length; i++) {
    const cell = state.cells[i];
    const { x, y } = cellCenter(i);

    if (highlight.has(i)) drawMergeHint(ctx, x, y, time);
    else if (hover === i && !drag) drawHover(ctx, x, y);

    if (cell.itemId === null || (drag && drag.from === i)) continue;

    const pop = juice.popScale(i);
    const born = cell.bornAt ? Math.min(1, (performance.now() - cell.bornAt) / 260) : 1;
    const spawn = born < 1 ? 0.5 + easeBack(born) * 0.5 : 1;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(ITEM_SCALE * pop * spawn, ITEM_SCALE * (1 / Math.sqrt(pop)) * spawn);
    drawItem(ctx, cell.itemId, time + i * 0.7);
    ctx.restore();

    if (isGenerator(cell.itemId)) {
      drawCharges(ctx, x, y, cell.charges ?? 0, ITEMS[cell.itemId].charges ?? 1, cell.rechargeAt ?? 0, now);
    }
    // ป้ายราคาถางขึ้นเฉพาะช่องที่ชี้อยู่
    // ถ้าขึ้นพร้อมกันทั้งกระดาน 40 ป้าย จะกลบไอเทมจนอ่านกระดานไม่ออก
    if (isObstacle(cell.itemId) && hover === i && !drag) {
      drawClearCost(ctx, x, y, ITEMS[cell.itemId].clearCost ?? 0, state.energy);
    }
  }

  juice.drawParticles(ctx);

  // ชิ้นที่กำลังลากวาดท้ายสุด จะได้อยู่เหนือทุกอย่าง
  if (drag) {
    ctx.save();
    ctx.translate(drag.x, drag.y);
    ctx.scale(ITEM_SCALE * 1.16, ITEM_SCALE * 1.16);
    ctx.globalAlpha = 0.96;
    drawItem(ctx, drag.itemId, time);
    ctx.restore();
  }

  juice.drawFloaters(ctx);
  ctx.restore();
}

/** ช่องที่ปล่อยแล้วจะรวมได้จริง — คำนวณจากกติกา "ต่อกันครบ 3" */
function mergeTargets(state: GameState, drag: NonNullable<DragState>): Set<number> {
  const out = new Set<number>();
  if (nextInChain(drag.itemId) === null) return out;
  for (let i = 0; i < state.cells.length; i++) {
    if (i === drag.from || state.cells[i].itemId !== drag.itemId) continue;
    // นับกลุ่มเดียวกันที่ติดกับช่องนี้ โดยถือว่าชิ้นที่ลากมาวางแล้ว
    const group = groupSizeWithDrop(state, i, drag.from, drag.itemId);
    if (group >= 3) out.add(i);
  }
  return out;
}

function groupSizeWithDrop(state: GameState, at: number, from: number, itemId: string): number {
  const seen = new Set<number>([at]);
  const queue = [at];
  let n = 1;
  while (queue.length) {
    const cur = queue.shift()!;
    const x = cur % COLS;
    const y = Math.floor(cur / COLS);
    const around: number[] = [];
    if (x > 0) around.push(cur - 1);
    if (x < COLS - 1) around.push(cur + 1);
    if (y > 0) around.push(cur - COLS);
    if (y < ROWS - 1) around.push(cur + COLS);
    for (const nb of around) {
      if (seen.has(nb) || nb === from) continue;
      if (state.cells[nb].itemId !== itemId) continue;
      seen.add(nb);
      queue.push(nb);
      n++;
    }
  }
  return n + 1; // บวกชิ้นที่กำลังลากอยู่
}

const easeBack = (t: number): number => {
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

function drawGround(ctx: CanvasRenderingContext2D, dpr: number): void {
  if (!ground || groundDpr !== dpr) {
    ground = renderGround(dpr);
    groundDpr = dpr;
  }
  ctx.drawImage(ground, 0, 0, BOARD_W, BOARD_H);
}

function renderGround(dpr: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.ceil(BOARD_W * dpr);
  c.height = Math.ceil(BOARD_H * dpr);
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);

  const bg = g.createLinearGradient(0, 0, BOARD_W * 0.4, BOARD_H);
  bg.addColorStop(0, '#4b7638');
  bg.addColorStop(1, '#375829');
  g.fillStyle = bg;
  g.fillRect(0, 0, BOARD_W, BOARD_H);

  // ปื้นหญ้าไม่อิงขอบช่อง กันไม่ให้เห็นเป็นตาราง
  for (let k = 0; k < 80; k++) {
    const t = hash(k, 21);
    // ปื้นต้องจางมาก ถ้าเห็นชัดจะกลายเป็นลายด่างที่แย่งสายตาไปจากไอเทม
    g.fillStyle = t > 0.5 ? `rgba(198,230,152,${0.012 + t * 0.016})` : `rgba(26,54,20,${0.014 + t * 0.02})`;
    g.beginPath();
    g.ellipse(hash(k, 22) * BOARD_W, hash(k, 23) * BOARD_H,
      26 + hash(k, 24) * 84, 18 + hash(k, 25) * 58, hash(k, 26) * 3, 0, Math.PI * 2);
    g.fill();
  }

  // กรอบช่องจางๆ พอให้รู้ว่าของวางเป็นตาราง แต่ไม่แย่งสายตาไปจากไอเทม
  for (let i = 0; i < COLS * ROWS; i++) {
    const x = PAD + (i % COLS) * TILE;
    const y = PAD + Math.floor(i / COLS) * TILE;
    g.fillStyle = (i % COLS + Math.floor(i / COLS)) % 2 === 0
      ? 'rgba(255,255,255,.038)' : 'rgba(0,0,0,.045)';
    roundRect(g, x + 2, y + 2, TILE - 4, TILE - 4, 9);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.05)';
    g.lineWidth = 1;
    roundRect(g, x + 2.5, y + 2.5, TILE - 5, TILE - 5, 9);
    g.stroke();
  }

  const light = g.createRadialGradient(BOARD_W * 0.34, BOARD_H * 0.16, 30,
    BOARD_W * 0.5, BOARD_H * 0.5, BOARD_W * 0.78);
  light.addColorStop(0, 'rgba(255,248,220,.10)');
  light.addColorStop(1, 'rgba(10,18,8,.36)');
  g.fillStyle = light;
  g.fillRect(0, 0, BOARD_W, BOARD_H);

  return c;
}

function drawHover(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  roundRect(ctx, x - TILE / 2 + 3, y - TILE / 2 + 3, TILE - 6, TILE - 6, 9);
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  ctx.fill();
  ctx.restore();
}

function drawMergeHint(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const pulse = 0.55 + Math.sin(t * 6) * 0.45;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 4, x, y, TILE * 0.52);
  g.addColorStop(0, `rgba(255,232,120,${0.16 + pulse * 0.14})`);
  g.addColorStop(1, 'rgba(255,232,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - TILE / 2, y - TILE / 2, TILE, TILE);
  ctx.restore();
  ctx.strokeStyle = `rgba(255,235,140,${0.5 + pulse * 0.5})`;
  ctx.lineWidth = 2.4;
  roundRect(ctx, x - TILE / 2 + 3, y - TILE / 2 + 3, TILE - 6, TILE - 6, 9);
  ctx.stroke();
}

/** แถบพลังของตัวผลิต บอกว่าเหลือกี่ครั้งหรือกำลังชาร์จ */
function drawCharges(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  charges: number, max: number, rechargeAt: number, now: number,
): void {
  const w = TILE - 20;
  const bx = x - w / 2;
  const by = y + TILE / 2 - 11;
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  roundRect(ctx, bx, by, w, 5, 2.5);
  ctx.fill();

  if (charges > 0) {
    ctx.fillStyle = '#8fd14f';
    roundRect(ctx, bx, by, (w * charges) / max, 5, 2.5);
    ctx.fill();
  } else {
    // กำลังชาร์จ: แถบไล่จนเต็มแล้วกลับมาใช้ได้
    const total = Math.max(1, rechargeAt - (rechargeAt - 20000));
    const left = Math.max(0, rechargeAt - now);
    const p = 1 - Math.min(1, left / total);
    ctx.fillStyle = '#e0a63c';
    roundRect(ctx, bx, by, Math.max(2, w * p), 5, 2.5);
    ctx.fill();
    ctx.fillStyle = '#ffd98a';
    ctx.font = '600 10px "IBM Plex Sans Thai", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(left / 1000)}s`, x, by - 4);
    ctx.textAlign = 'left';
  }
}

/** ป้ายพลังงานบนสิ่งกีดขวาง สีบอกว่าถางไหวหรือยัง */
function drawClearCost(
  ctx: CanvasRenderingContext2D, x: number, y: number, cost: number, energy: number,
): void {
  const affordable = energy >= cost;
  const w = 46;
  const bx = x - w / 2;
  const by = y + TILE / 2 - 21;
  ctx.fillStyle = affordable ? 'rgba(20,30,14,.92)' : 'rgba(74,20,20,.92)';
  roundRect(ctx, bx, by, w, 17, 5);
  ctx.fill();
  ctx.strokeStyle = affordable ? 'rgba(255,213,79,.5)' : 'rgba(255,138,128,.5)';
  ctx.lineWidth = 1;
  roundRect(ctx, bx + 0.5, by + 0.5, w - 1, 16, 5);
  ctx.stroke();
  ctx.fillStyle = affordable ? '#ffd54f' : '#ff9c94';
  ctx.font = '600 11px "IBM Plex Sans Thai", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`⚡ ${cost}`, x, by + 12.5);
  ctx.textAlign = 'left';
}
