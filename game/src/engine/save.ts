import { CELLS, GameState, SAVE_VERSION, emptyCell } from '../state';
import { ITEMS } from '../data/items';

const KEY = 'raidee.merge.v2';

/** เซฟมีเวอร์ชันตั้งแต่วันแรก ผู้เล่นเกมแนวนี้เล่นสะสมยาว ทำเซฟพังคือจบ */
export function save(state: GameState): void {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* พื้นที่เต็มหรือโหมดส่วนตัว */ }
}

export function clearSave(): void {
  try { localStorage.removeItem(KEY); } catch { /* ไม่เป็นไร */ }
}

export function load(): GameState | null {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { return null; }
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<GameState>;
    if (!Array.isArray(data.cells) || data.cells.length !== CELLS) return null;
    return migrate(data);
  } catch {
    return null;
  }
}

function migrate(data: Partial<GameState>): GameState {
  const s: GameState = {
    version: SAVE_VERSION,
    seed: data.seed ?? (Date.now() >>> 0),
    cells: (data.cells ?? []).map((c) => {
      // ทิ้งไอเทมที่ไม่รู้จักแทนที่จะให้เกมพังตอนวาด
      if (!c || typeof c !== 'object') return emptyCell();
      if (c.itemId && !ITEMS[c.itemId]) return emptyCell();
      return { ...c, bornAt: undefined };
    }),
    coins: data.coins ?? 0,
    xp: data.xp ?? 0,
    level: data.level ?? 1,
    energy: data.energy ?? 30,
    energyMax: data.energyMax ?? 30,
    energyAt: data.energyAt ?? Date.now(),
    orders: Array.isArray(data.orders) ? data.orders : [],
    orderSeq: data.orderSeq ?? 0,
    discovered: Array.isArray(data.discovered) ? data.discovered : [],
    stats: { merges: 0, cleared: 0, delivered: 0, bestTier: 0, ...(data.stats ?? {}) },
  };
  // เวลาที่หายไปตอนปิดเกมไม่ควรทำให้ได้พลังงานย้อนหลังเกินเพดาน
  if (s.energyAt > Date.now()) s.energyAt = Date.now();
  return s;
}
