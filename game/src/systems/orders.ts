import { CHAINS, ITEMS } from '../data/items';
import { GameState, Order, XP_PER_LEVEL } from '../state';
import { Rng, pick, randInt, rngFor, SALT } from '../engine/rng';

const NPCS = ['ป้ามาลี', 'ลุงคำ', 'ครูสมพงษ์', 'เจ๊หมวย', 'พี่ตูน', 'น้องแป้ง', 'เฮียหลง', 'ยายพิม'];

/** สายที่เอามาตั้งเควสได้ ไม่รวมตัวผลิตกับเหรียญ เพราะเหรียญมีไว้แตะเก็บ */
const ORDER_CHAINS = ['crop', 'wood', 'water'];

/**
 * ออกเควสตามกำลังของผู้เล่นจริง
 * ขอของที่ผู้เล่น "ทำได้แล้ว" หรือ "อีกขั้นเดียวก็ถึง" — ถ้าขอของที่ยังไปไม่ถึง
 * เควสจะกลายเป็นกำแพงแทนที่จะเป็นเป้าหมาย
 */
export function rollOrder(state: GameState, r: Rng, seq: number): Order {
  const want: { itemId: string; n: number }[] = [];
  const lines = state.level >= 6 ? randInt(r, 2, 3) : state.level >= 3 ? randInt(r, 1, 2) : 1;
  const used = new Set<string>();

  const available = availableChains(state);
  for (let k = 0; k < lines; k++) {
    const options = available.filter((c) => !used.has(c));
    if (options.length === 0) break;
    const chain = pick(r, options);
    used.add(chain);
    const list = CHAINS[chain];
    const reach = highestReached(state, chain);
    /*
     * ส่วนใหญ่ขอสูงกว่าที่ทำได้อยู่หนึ่งขั้น เพื่อให้เควสเป็น "เป้าหมาย" ไม่ใช่ "ของที่มีอยู่แล้ว"
     * ถ้าขอเท่าที่มีในมือ ผู้เล่นจะกดส่งรัวๆ โดยไม่ต้องรวมร่างเลย ซึ่งข้ามความสนุกทั้งหมดของเกม
     */
    const bump = r() < 0.65 ? 1 : 0;
    const tier = Math.max(0, Math.min(list.length - 1, reach + bump));
    const itemId = list[tier];
    const n = tier >= 3 ? 1 : tier === 2 ? randInt(r, 1, 2) : randInt(r, 2, 3);
    want.push({ itemId, n });
  }

  if (want.length === 0) want.push({ itemId: 'seed', n: 2 });

  const worth = want.reduce((sum, w) => sum + ITEMS[w.itemId].value * w.n, 0);
  return {
    id: `o${seq}`,
    npc: pick(r, NPCS),
    want,
    coins: Math.max(20, Math.round(worth * 1.7)),
    xp: Math.max(8, Math.round(worth * 0.32)),
  };
}

/**
 * สายที่ผู้เล่น "หาของได้จริง" แล้วเท่านั้น
 * ตอนเริ่มเกมยังไม่มีทางได้หยดน้ำเลย ถ้าออกเควสขอหยดน้ำ เควสจะกลายเป็นกำแพง
 * ไม่ใช่เป้าหมาย — ขัดกติกาคุณภาพเควสที่ว่าห้ามขอของจากระบบที่ยังไม่เปิด
 */
function availableChains(state: GameState): string[] {
  const out = ORDER_CHAINS.filter((chain) => {
    if (CHAINS[chain].some((id) => state.discovered.includes(id))) return true;
    return state.cells.some((c) => c.itemId !== null && ITEMS[c.itemId].chain === chain);
  });
  return out.length > 0 ? out : ['crop'];
}

/** ขั้นสูงสุดของสายนี้ที่ผู้เล่นเคยสร้างได้ */
function highestReached(state: GameState, chain: string): number {
  const list = CHAINS[chain];
  let best = 0;
  for (let t = 0; t < list.length; t++) {
    if (state.discovered.includes(list[t])) best = t;
  }
  // นับของที่อยู่บนกระดานด้วย เผื่อเพิ่งได้มาจากการถาง
  for (const cell of state.cells) {
    if (cell.itemId === null) continue;
    const item = ITEMS[cell.itemId];
    if (item.chain === chain) best = Math.max(best, item.tier);
  }
  return best;
}

export function refillOrders(state: GameState): void {
  while (state.orders.length < 3) {
    const r = rngFor(state.seed, state.orderSeq, SALT.CARDS);
    state.orders.push(rollOrder(state, r, state.orderSeq));
    state.orderSeq++;
  }
}

export function countOnBoard(state: GameState, itemId: string): number {
  return state.cells.reduce((n, c) => n + (c.itemId === itemId ? 1 : 0), 0);
}

export const canDeliver = (state: GameState, order: Order): boolean =>
  order.want.every((w) => countOnBoard(state, w.itemId) >= w.n);

export type DeliverResult = { coins: number; xp: number; levelUps: number; removed: number[] };

export function deliver(state: GameState, orderId: string): DeliverResult | null {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order || !canDeliver(state, order)) return null;

  const removed: number[] = [];
  for (const w of order.want) {
    let left = w.n;
    for (let i = 0; i < state.cells.length && left > 0; i++) {
      if (state.cells[i].itemId !== w.itemId) continue;
      state.cells[i] = { itemId: null };
      removed.push(i);
      left--;
    }
  }

  state.coins += order.coins;
  state.xp += order.xp;
  state.stats.delivered++;
  state.orders = state.orders.filter((o) => o.id !== orderId);

  let levelUps = 0;
  while (state.xp >= XP_PER_LEVEL(state.level)) {
    state.xp -= XP_PER_LEVEL(state.level);
    state.level++;
    state.energyMax += 5;
    state.energy = state.energyMax;
    levelUps++;
  }

  refillOrders(state);
  return { coins: order.coins, xp: order.xp, levelUps, removed };
}
