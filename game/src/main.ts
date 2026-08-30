import { ITEMS, isGenerator, isObstacle, nextInChain } from './data/items';
import { CELLS, GameState, SAVE_VERSION, emptyCell } from './state';
import { load, save, clearSave } from './engine/save';
import { mulberry32 } from './engine/rng';
import {
  cellAt, cellCenter, draw, DragState, BOARD_W, BOARD_H,
} from './render/board';
import { Juice } from './render/juice';
import { clearObstacle, produce, rechargeGenerators, setupBoard, freeCount, tryMerge } from './systems/board';
import { deliver, refillOrders } from './systems/orders';
import { energyPrice, tickEnergy } from './systems/energy';
import { audio } from './audio/audio';
import * as hud from './ui/hud';

const canvas = document.getElementById('board') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let dpr = 1;
function resizeCanvas(): void {
  dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = Math.round(BOARD_W * dpr);
  canvas.height = Math.round(BOARD_H * dpr);
  canvas.style.width = `${BOARD_W}px`;
  canvas.style.height = `${BOARD_H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function newGame(seed = Date.now() >>> 0): GameState {
  const state: GameState = {
    version: SAVE_VERSION,
    seed,
    cells: Array.from({ length: CELLS }, emptyCell),
    coins: 0,
    xp: 0,
    level: 1,
    energy: 30,
    energyMax: 30,
    energyAt: Date.now(),
    orders: [],
    orderSeq: 0,
    discovered: ['seed', 'twig'],
    stats: { merges: 0, cleared: 0, delivered: 0, bestTier: 0 },
  };
  setupBoard(state, mulberry32(seed));
  refillOrders(state);
  return state;
}

let state: GameState = load() ?? newGame();
if (state.orders.length === 0) refillOrders(state);

const juice = new Juice();
let hover: number | null = null;
let drag: DragState = null;

// แยกแตะออกจากลาก: ขยับเกิน 7 px ถือว่าเริ่มลาก
const DRAG_THRESHOLD = 7;
let pointerStart: { cell: number; x: number; y: number } | null = null;

// ---------- การกระทำ ----------

function onMerge(at: number, consumed: number[], newItemId: string, bonusAt: number | null, firstTime: boolean): void {
  const target = cellCenter(at);
  const item = ITEMS[newItemId];

  // ชิ้นที่ถูกกลืนพุ่งเข้าหาจุดรวม ทำให้เห็นว่าของหายไปไหน
  for (const c of consumed) {
    const p = cellCenter(c);
    juice.burst(p.x, p.y, '#ffe9a8', 5, { spread: 40, gravity: -30, shape: 'spark', size: 1.5, life: 0.35 });
  }

  juice.pop(at, 1.5);
  juice.addShake(1.6 + item.tier * 0.4);
  juice.ring(target.x, target.y, '#ffe08a');
  audio.play(`merge${Math.min(4, item.tier)}`);

  if (firstTime) {
    // ค้นพบขั้นใหม่ครั้งแรกคือจังหวะที่ต้องรู้สึกดีที่สุดในเกม
    juice.stop(0.05);
    juice.addShake(4);
    juice.burst(target.x, target.y, '#ffd970', 22, { spread: 130, gravity: 90, shape: 'spark', size: 2.6, life: 1 });
    juice.float(target.x, target.y - 22, `พบ ${item.name}!`, '#ffe082', 17);
    audio.play('discover');
    hud.toast(`ค้นพบใหม่ · ${item.name}`);
  } else {
    juice.burst(target.x, target.y, '#fff1c2', 10, { spread: 80, shape: 'spark', size: 1.8, life: 0.6 });
    juice.float(target.x, target.y - 18, item.name, '#fff3cd', 13);
  }

  if (bonusAt !== null) {
    const b = cellCenter(bonusAt);
    juice.pop(bonusAt, 1.2);
    juice.float(b.x, b.y - 16, 'ของแถม', '#a5d6a7', 12);
    audio.play('coin');
  }
}

function tapCell(i: number): void {
  const cell = state.cells[i];
  const id = cell.itemId;
  const p = cellCenter(i);
  if (id === null) return;

  if (isGenerator(id)) {
    const out = produce(state, i, Date.now());
    if (!out.ok) { audio.play('error'); hud.setHint(out.reason); return; }
    const spot = cellCenter(out.spot);
    juice.pop(i, 1.25);
    juice.pop(out.spot, 1.1);
    juice.burst(spot.x, spot.y, '#c5e1a5', 7, { spread: 55, gravity: 200, shape: 'leaf', size: 1.9 });
    audio.play('produce');
    hud.setHint(`${ITEMS[id].name} ปล่อย${ITEMS[out.itemId].name} — ลากไปต่อกันให้ครบ 3 ชิ้นเพื่อรวมร่าง`);
    refresh();
    return;
  }

  if (isObstacle(id)) {
    const out = clearObstacle(state, i);
    if (!out.ok) { audio.play('error'); hud.setHint(out.reason); return; }
    juice.addShake(3);
    juice.burst(p.x, p.y, id === 'rock' ? '#9aa0a4' : '#5c7a35', 14, { spread: 95, size: 2.6 });
    juice.ring(p.x, p.y, '#d7ffb0');
    audio.play('clear');
    for (const d of out.dropped) juice.pop(d.spot, 1.1);
    hud.setHint(`ถาง${ITEMS[id].name}แล้ว ได้พื้นที่คืนพร้อมของ ${out.dropped.length} ชิ้น`);
    refresh();
    return;
  }

  // สายเหรียญแตะเพื่อเก็บเป็นเงิน ยิ่งรวมขั้นสูงยิ่งคุ้ม
  if (ITEMS[id].chain === 'coin') {
    const gain = ITEMS[id].value;
    state.coins += gain;
    state.cells[i] = emptyCell();
    juice.burst(p.x, p.y, '#ffd54f', 12, { spread: 90, shape: 'spark', size: 2 });
    juice.float(p.x, p.y - 14, `+${gain}`, '#ffd54f', 15);
    audio.play('coin');
    refresh();
    return;
  }

  hud.setHint(`${ITEMS[id].name} · ลากไปวางบนชิ้นเดียวกันให้ต่อกันครบ 3 เพื่อรวมร่าง`);
}

function dropOn(from: number, to: number): void {
  if (from === to) { tapCell(from); return; }

  const moving = state.cells[from].itemId;
  const target = state.cells[to].itemId;
  if (moving === null) return;

  // ปล่อยลงช่องว่าง = ย้ายของ ใช้จัดกระดานให้ของกองเดียวกันมาต่อกัน
  if (target === null) {
    state.cells[to] = state.cells[from];
    state.cells[from] = emptyCell();
    audio.play('place');
    refresh();
    return;
  }

  if (target !== moving || nextInChain(moving) === null) {
    audio.play('error');
    hud.setHint(nextInChain(moving) === null
      ? `${ITEMS[moving].name} เป็นขั้นสูงสุดของสายนี้แล้ว`
      : 'ต้องวางบนของชนิดเดียวกันเท่านั้น');
    return;
  }

  // ย้ายชิ้นที่ลากไปทับก่อน แล้วค่อยตรวจว่ากลุ่มครบ 3 ไหม
  const saved = state.cells[to];
  state.cells[from] = emptyCell();
  state.cells[to] = { itemId: moving };
  const result = tryMerge(state, to);

  if (!result.merged) {
    // ยังไม่ครบ 3 คืนกระดานให้เหมือนเดิม จะได้ไม่เสียของ
    state.cells[to] = saved;
    state.cells[from] = { itemId: moving };
    audio.play('error');
    const p = cellCenter(to);
    juice.float(p.x, p.y - 16, 'ต้องครบ 3', '#ffcc80', 13);
    hud.setHint('ยังไม่พอ — ต้องมีชนิดเดียวกันต่อกันอย่างน้อย 3 ชิ้น');
    return;
  }

  onMerge(result.at, result.consumed, result.newItemId!, result.bonusAt, result.firstTime);
  refresh();
}

function onDeliver(orderId: string): void {
  const out = deliver(state, orderId);
  if (!out) { audio.play('error'); return; }
  for (const i of out.removed) {
    const p = cellCenter(i);
    juice.burst(p.x, p.y, '#a5d6a7', 8, { spread: 70, shape: 'leaf', size: 1.8 });
  }
  audio.play('deliver');
  hud.toast(`ส่งของสำเร็จ +${out.coins} เหรียญ`);
  if (out.levelUps > 0) {
    audio.play('levelup');
    hud.toast(`เลื่อนเป็นระดับ ${state.level} · พลังงานสูงสุดเพิ่มขึ้น`);
  }
  refresh();
}

function buyEnergy(): void {
  const price = energyPrice(state);
  if (state.coins < price || state.energy >= state.energyMax) { audio.play('error'); return; }
  state.coins -= price;
  state.energy = state.energyMax;
  audio.play('levelup');
  hud.setHint('เติมพลังงานเต็มแล้ว เอาไปถางที่เปิดพื้นที่ต่อได้');
  refresh();
}

// ---------- อินพุต ----------

function pos(e: PointerEvent): { x: number; y: number } {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * BOARD_W,
    y: ((e.clientY - r.top) / r.height) * BOARD_H,
  };
}

canvas.addEventListener('pointerdown', (e) => {
  audio.unlock();
  canvas.setPointerCapture(e.pointerId);
  const p = pos(e);
  const cell = cellAt(p.x, p.y);
  if (cell === null) return;
  pointerStart = { cell, x: p.x, y: p.y };
});

canvas.addEventListener('pointermove', (e) => {
  const p = pos(e);
  hover = cellAt(p.x, p.y);

  if (!pointerStart) return;
  if (!drag) {
    const moved = Math.hypot(p.x - pointerStart.x, p.y - pointerStart.y);
    const id = state.cells[pointerStart.cell].itemId;
    // สิ่งกีดขวางลากไม่ได้ ต้องถางด้วยพลังงานเท่านั้น
    if (moved < DRAG_THRESHOLD || id === null || isObstacle(id)) return;
    drag = { from: pointerStart.cell, itemId: id, x: p.x, y: p.y };
    audio.play('pick');
  }
  drag.x = p.x;
  drag.y = p.y;
});

function endPointer(e: PointerEvent): void {
  if (!pointerStart) return;
  const p = pos(e);
  const cell = cellAt(p.x, p.y);

  if (drag) {
    if (cell !== null) dropOn(drag.from, cell);
    drag = null;
  } else {
    tapCell(pointerStart.cell);
  }
  pointerStart = null;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', () => { drag = null; pointerStart = null; });
canvas.addEventListener('pointerleave', () => { hover = null; });

document.getElementById('btn-energy')!.addEventListener('click', () => { audio.unlock(); buyEnergy(); });
document.getElementById('btn-mute')!.addEventListener('click', (e) => {
  audio.unlock();
  audio.setMuted(!audio.muted);
  (e.currentTarget as HTMLElement).textContent = audio.muted ? '🔇' : '🔊';
});
document.getElementById('btn-reset')!.addEventListener('click', () => {
  if (!confirm('เริ่มใหม่ทั้งหมด? ความคืบหน้าปัจจุบันจะหายไป')) return;
  clearSave();
  state = newGame();
  refresh();
});

// ---------- ลูปหลัก ----------

function refresh(): void {
  const now = Date.now();
  hud.renderTop(state, now);
  hud.renderOrders(state, onDeliver);
  hud.renderCodex(state);
  const free = freeCount(state);
  if (free <= 3) hud.setHint('กระดานเกือบเต็มแล้ว — รวมของหรือแตะเหรียญเก็บเงินเพื่อเปิดพื้นที่');
}

let last = performance.now();
let lastUi = 0;
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const wall = Date.now();

  // พลังงานกับตัวผลิตเดินตามเวลาจริง อัปเดตยูไอวินาทีละครั้งพอ
  if (wall - lastUi > 500) {
    lastUi = wall;
    const a = tickEnergy(state, wall);
    const b = rechargeGenerators(state, wall);
    hud.renderTop(state, wall);
    if (a || b) hud.renderOrders(state, onDeliver);
  }

  juice.update(dt);
  ctx.clearRect(0, 0, BOARD_W, BOARD_H);
  draw(ctx, state, juice, { hover, drag, time: now / 1000, dpr, now: wall });
  requestAnimationFrame(frame);
}

// ---------- เริ่มเกม ----------

hud.setHint('แตะแปลงผักเพื่อปล่อยเมล็ด · ลากของชนิดเดียวกันมาต่อกันให้ครบ 3 ชิ้นแล้วรวมร่าง');
refresh();
window.addEventListener('beforeunload', () => save(state));
window.setInterval(() => save(state), 8000);
requestAnimationFrame(frame);

