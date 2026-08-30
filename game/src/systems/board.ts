import { CHAINS, ITEMS, isGenerator, isObstacle, nextInChain } from '../data/items';
import { COLS, ROWS, CELLS, GameState, emptyCell } from '../state';
import { Rng } from '../engine/rng';

export const idx = (x: number, y: number): number => y * COLS + x;
export const xy = (i: number): { x: number; y: number } => ({ x: i % COLS, y: Math.floor(i / COLS) });

export function neighbours(i: number): number[] {
  const { x, y } = xy(i);
  const out: number[] = [];
  if (x > 0) out.push(i - 1);
  if (x < COLS - 1) out.push(i + 1);
  if (y > 0) out.push(i - COLS);
  if (y < ROWS - 1) out.push(i + COLS);
  return out;
}

/** ช่องว่างที่ใกล้จุดหนึ่งที่สุด ใช้วางของที่เพิ่งผลิตหรือของที่ร่วงจากสิ่งกีดขวาง */
export function nearestFree(state: GameState, from: number): number | null {
  const seen = new Set<number>([from]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    if (state.cells[cur].itemId === null) return cur;
    for (const n of neighbours(cur)) {
      if (!seen.has(n)) { seen.add(n); queue.push(n); }
    }
  }
  return null;
}

export const freeCount = (state: GameState): number =>
  state.cells.reduce((n, c) => n + (c.itemId === null ? 1 : 0), 0);

/**
 * กลุ่มไอเทมชนิดเดียวกันที่ติดกัน นับจากช่องเริ่มต้น
 * เกมแนวนี้ใช้กติกา "ต่อกันครบ 3 ถึงรวมได้" การต่อกันจึงเป็นตัวปริศนา
 * ไม่ใช่แค่ลากชนกันสองชิ้นแล้วจบ
 */
export function sameGroup(state: GameState, start: number): number[] {
  const id = state.cells[start].itemId;
  if (id === null) return [];
  const seen = new Set<number>([start]);
  const queue = [start];
  const out: number[] = [];
  while (queue.length) {
    const cur = queue.shift()!;
    out.push(cur);
    for (const n of neighbours(cur)) {
      if (seen.has(n) || state.cells[n].itemId !== id) continue;
      seen.add(n);
      queue.push(n);
    }
  }
  return out;
}

export type MergeResult = {
  merged: boolean;
  /** ช่องที่ถูกกลืนหายไป ใช้เล่นแอนิเมชันวิ่งเข้าหาจุดรวม */
  consumed: number[];
  /** ผลลัพธ์: ช่องปลายทางกับไอเทมใหม่ */
  at: number;
  newItemId: string | null;
  /** รวมครบ 5 ได้ของแถมอีกชิ้น เป็นรางวัลของการวางแผนให้ต่อกันยาว */
  bonusAt: number | null;
  firstTime: boolean;
};

export function tryMerge(state: GameState, at: number): MergeResult {
  const id = state.cells[at].itemId;
  const none: MergeResult = { merged: false, consumed: [], at, newItemId: null, bonusAt: null, firstTime: false };
  if (id === null || isObstacle(id)) return none;

  const next = nextInChain(id);
  if (next === null) return none;

  const group = sameGroup(state, at);
  if (group.length < 3) return none;

  // ใช้ 5 ชิ้นถ้ามี เพื่อให้ได้ของแถม มิฉะนั้นใช้ 3
  const use = group.length >= 5 ? 5 : 3;
  // เอาช่องปลายทางไว้ก่อน ที่เหลือเลือกจากช่องที่ใกล้ปลายทางที่สุด
  const rest = group.filter((c) => c !== at)
    .sort((a, b) => dist(a, at) - dist(b, at))
    .slice(0, use - 1);
  const consumed = [at, ...rest];

  for (const c of consumed) state.cells[c] = emptyCell();

  state.cells[at] = { itemId: next, bornAt: performance.now() };
  if (isGenerator(next)) {
    state.cells[at].charges = ITEMS[next].charges;
    state.cells[at].rechargeAt = 0;
  }

  let bonusAt: number | null = null;
  if (use === 5) {
    const spot = nearestFree(state, at);
    if (spot !== null) {
      state.cells[spot] = { itemId: id, bornAt: performance.now() };
      bonusAt = spot;
    }
  }

  const firstTime = !state.discovered.includes(next);
  if (firstTime) state.discovered.push(next);

  state.stats.merges++;
  state.stats.bestTier = Math.max(state.stats.bestTier, ITEMS[next].tier + 1);

  return { merged: true, consumed: rest, at, newItemId: next, bonusAt, firstTime };
}

function dist(a: number, b: number): number {
  const pa = xy(a);
  const pb = xy(b);
  return Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y);
}

/** ตัวผลิตปล่อยของหนึ่งชิ้น คืน null ถ้าใช้ไม่ได้พร้อมเหตุผล */
export function produce(state: GameState, at: number, now: number):
  { ok: false; reason: string } | { ok: true; spot: number; itemId: string } {
  const cell = state.cells[at];
  const id = cell.itemId;
  if (id === null || !isGenerator(id)) return { ok: false, reason: 'ช่องนี้ไม่ใช่ตัวผลิต' };
  const item = ITEMS[id];
  if ((cell.charges ?? 0) <= 0) {
    const wait = Math.max(0, Math.ceil(((cell.rechargeAt ?? 0) - now) / 1000));
    return { ok: false, reason: `${item.name}หมดพลัง รออีก ${wait} วินาที` };
  }
  const spot = nearestFree(state, at);
  if (spot === null) return { ok: false, reason: 'กระดานเต็ม ต้องรวมของหรือขายออกก่อน' };

  cell.charges = (cell.charges ?? 0) - 1;
  if (cell.charges === 0) cell.rechargeAt = now + (item.rechargeSec ?? 20) * 1000;

  const itemId = CHAINS[item.produces!][item.produceTier ?? 0];
  state.cells[spot] = { itemId, bornAt: performance.now() };
  return { ok: true, spot, itemId };
}

/** ชาร์จตัวผลิตที่หมดพลังเมื่อถึงเวลา เรียกทุกเฟรม */
export function rechargeGenerators(state: GameState, now: number): boolean {
  let changed = false;
  for (const cell of state.cells) {
    if (cell.itemId === null || !isGenerator(cell.itemId)) continue;
    if ((cell.charges ?? 0) > 0 || !cell.rechargeAt || now < cell.rechargeAt) continue;
    cell.charges = ITEMS[cell.itemId].charges;
    cell.rechargeAt = 0;
    changed = true;
  }
  return changed;
}

/** ถางสิ่งกีดขวาง — วงจรฟื้นฟูพื้นที่ ใช้พลังงานแลกกับพื้นที่และของ */
export function clearObstacle(state: GameState, at: number):
  { ok: false; reason: string } | { ok: true; dropped: { spot: number; itemId: string }[] } {
  const id = state.cells[at].itemId;
  if (id === null || !isObstacle(id)) return { ok: false, reason: 'ช่องนี้ไม่มีอะไรให้ถาง' };
  const cost = ITEMS[id].clearCost ?? 1;
  if (state.energy < cost) return { ok: false, reason: `พลังงานไม่พอ ต้องใช้ ${cost} หน่วย` };

  state.energy -= cost;
  state.cells[at] = emptyCell();
  state.stats.cleared++;

  const dropped: { spot: number; itemId: string }[] = [];
  for (const drop of ITEMS[id].drops ?? []) {
    const spot = nearestFree(state, at);
    if (spot === null) break;
    state.cells[spot] = { itemId: drop, bornAt: performance.now() };
    dropped.push({ spot, itemId: drop });
  }
  return { ok: true, dropped };
}

/** จัดกระดานเริ่มต้น: ตัวผลิตอย่างละหนึ่ง ของตั้งต้นเล็กน้อย และสิ่งกีดขวางเต็มพื้นที่ที่เหลือ */
export function setupBoard(state: GameState, r: Rng): void {
  state.cells = Array.from({ length: CELLS }, emptyCell);

  const put = (i: number, itemId: string) => {
    state.cells[i] = { itemId };
    if (isGenerator(itemId)) {
      state.cells[i].charges = ITEMS[itemId].charges;
      state.cells[i].rechargeAt = 0;
    }
  };

  put(idx(1, 2), 'bed1');
  put(idx(2, 4), 'pile1');
  for (const [x, y] of [[2, 2], [3, 2], [1, 3], [2, 3], [1, 4]] as const) put(idx(x, y), 'seed');
  for (const [x, y] of [[3, 3], [3, 4]] as const) put(idx(x, y), 'twig');

  // ครึ่งขวาของกระดานรกไปด้วยสิ่งกีดขวาง ค่อยๆ ถางเปิดพื้นที่
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = idx(x, y);
      if (state.cells[i].itemId !== null) continue;
      const openArea = x <= 4 && y >= 1 && y <= 5;
      if (openArea) continue;
      const roll = r();
      // ยิ่งไกลจากมุมเริ่มต้น ยิ่งเจอของที่ถางยาก
      const far = (x + y) / (COLS + ROWS);
      if (roll < 0.14) continue;
      if (roll < 0.5 + far * 0.1) put(i, 'weed');
      else if (roll < 0.82) put(i, 'rock');
      else put(i, 'stump');
    }
  }
}
