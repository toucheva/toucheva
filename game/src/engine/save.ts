import { GameState, SAVE_VERSION, newGame, PLOT_COUNT, freshPlot } from '../state';
import { CROP_IDS } from '../data/crops';

const KEY = 'raidee.save.v1';

/**
 * เซฟมีเวอร์ชันตั้งแต่วันแรก (หลักสถาปัตยกรรมข้อ 4)
 * ผู้เล่นเกมแนวนี้เซฟยาวเป็นร้อยชั่วโมง ทำเซฟพังคือจบ
 */
export function save(state: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* โหมดส่วนตัวหรือพื้นที่เต็ม — ไม่ให้เกมล้ม */
  }
}

export function load(): GameState | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<GameState>;
    return migrate(data);
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ไม่เป็นไร */
  }
}

/** เติมช่องที่ขาดจากเซฟเก่าให้ครบ แทนที่จะโยนเซฟทิ้ง */
function migrate(data: Partial<GameState>): GameState {
  const base = newGame(data.seed ?? (Date.now() >>> 0));
  const s: GameState = { ...base, ...data, version: SAVE_VERSION };

  if (!Array.isArray(s.plots) || s.plots.length !== PLOT_COUNT) {
    s.plots = Array.from({ length: PLOT_COUNT }, freshPlot);
  } else {
    s.plots = s.plots.map((p) => ({ ...freshPlot(), ...p }));
  }
  s.seeds = { ...base.seeds, ...(data.seeds ?? {}) };
  for (const id of CROP_IDS) if (typeof s.seeds[id] !== 'number') s.seeds[id] = 0;
  s.storage = Array.isArray(s.storage) ? s.storage : [];
  s.soldToday = s.soldToday ?? {};
  s.stats = { ...base.stats, ...(data.stats ?? {}) };
  s.effect = s.effect ?? {};
  s.cardChoices = Array.isArray(s.cardChoices) ? s.cardChoices : [];
  return s;
}
