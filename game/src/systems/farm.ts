import { CROPS, STAR_MULTIPLIER } from '../data/crops';
import { GRID, GameState, PlantedCrop, Plot, Tool } from '../state';
import { rngFor, SALT, randInt } from '../engine/rng';

export const STAMINA_COST: Record<Tool, number> = {
  hoe: 5,
  seed: 1,
  water: 2,
  harvest: 1,
  stake: 2,
};

export type ActionOutcome =
  | { kind: 'none'; reason: string }
  | { kind: 'till' }
  | { kind: 'plant'; cropId: string }
  | { kind: 'water' }
  | { kind: 'stake' }
  | { kind: 'harvest'; cropId: string; stars: number; n: number; again: boolean };

/** โทษการปลูกซ้ำที่เดิม — บังคับให้ต้องหมุนเวียนพืชตั้งแต่ Phase 0 */
function repeatPenalty(plot: Plot, cropId: string): number {
  const repeats = plot.history.filter((h) => h === cropId).length;
  return Math.min(repeats, 2) * 10;
}

export function starsFromPoints(points: number): number {
  if (points < 30) return 1;
  if (points < 48) return 2;
  if (points < 66) return 3;
  if (points < 84) return 4;
  return 5;
}

/**
 * คุณภาพวัดจาก "ดูแลดีกี่เปอร์เซ็นต์ของอายุพืช" ไม่ใช่การสะสมตามจำนวนวัน
 * ไม่งั้นพืชโตช้าจะได้ดาวสูงกว่าเสมอโดยไม่ต้องเก่งขึ้นเลย
 * 5 ดาวต้องมาจาก ดินดี + ดูแลครบ + ไม่ปลูกซ้ำ พร้อมกันทั้งสามอย่าง
 */
export function qualityPoints(c: PlantedCrop, bonus: number, jitter: number): number {
  const care = c.totalDays > 0 ? c.wateredDays / c.totalDays : 0;
  return c.qualityBase + care * 32 + c.qualityMod + bonus + jitter;
}

export function act(state: GameState, index: number, discount: number): ActionOutcome {
  const plot = state.plots[index];
  const tool = state.tool;
  const cost = Math.max(1, Math.round(STAMINA_COST[tool] * (1 - discount)));

  if (state.stamina < cost) return { kind: 'none', reason: 'พลังงานไม่พอแล้ว กด "เข้านอน" เพื่อขึ้นวันใหม่' };

  const spend = () => {
    state.stamina -= cost;
    state.stats.actions++;
  };

  switch (tool) {
    case 'hoe': {
      if (plot.crop) return { kind: 'none', reason: 'มีพืชอยู่ในแปลงนี้แล้ว' };
      if (plot.tilled) return { kind: 'none', reason: 'แปลงนี้พรวนแล้ว' };
      spend();
      plot.tilled = true;
      return { kind: 'till' };
    }

    case 'seed': {
      if (!plot.tilled) return { kind: 'none', reason: 'ต้องพรวนดินก่อนปลูก' };
      if (plot.crop) return { kind: 'none', reason: 'แปลงนี้มีพืชอยู่แล้ว' };
      const cropId = state.selectedSeed;
      if ((state.seeds[cropId] ?? 0) <= 0) return { kind: 'none', reason: `ไม่มีเมล็ด${CROPS[cropId].name}แล้ว ซื้อเพิ่มที่ร้าน` };
      spend();
      state.seeds[cropId]--;
      const crop = CROPS[cropId];
      plot.crop = {
        cropId,
        stage: 0,
        growth: 0,
        dryDays: 0,
        staked: false,
        fallen: false,
        ratoonLeft: crop.verb === 'ratoon' ? 2 : 0,
        wateredDays: 0,
        totalDays: 0,
        qualityMod: -repeatPenalty(plot, cropId),
        qualityBase: 18 + plot.fertility * 0.32,
        ready: false,
      };
      return { kind: 'plant', cropId };
    }

    case 'water': {
      if (!plot.tilled) return { kind: 'none', reason: 'ยังไม่ได้พรวนแปลงนี้' };
      if (plot.moisture >= 90) return { kind: 'none', reason: 'แปลงนี้ชุ่มอยู่แล้ว' };
      spend();
      plot.moisture = 100;
      return { kind: 'water' };
    }

    case 'stake': {
      if (!plot.crop) return { kind: 'none', reason: 'ไม่มีพืชให้ปักค้าง' };
      if (CROPS[plot.crop.cropId].verb !== 'stake') return { kind: 'none', reason: `${CROPS[plot.crop.cropId].name}ไม่ต้องปักค้าง` };
      if (plot.crop.staked) return { kind: 'none', reason: 'ปักค้างไปแล้ว' };
      spend();
      plot.crop.staked = true;
      return { kind: 'stake' };
    }

    case 'harvest': {
      const c = plot.crop;
      if (!c) return { kind: 'none', reason: 'ไม่มีอะไรให้เก็บ' };
      if (!c.ready) return { kind: 'none', reason: 'ยังโตไม่เต็มที่' };
      spend();

      const crop = CROPS[c.cropId];
      const r = rngFor(state.seed, state.day * 97 + index, SALT.QUALITY);
      const points = qualityPoints(c, state.effect.qualityBonus ?? 0, r() * 16 - 8);
      const stars = starsFromPoints(points);

      // กริยา "ขุดถึงรู้" — จำนวนหัวเผยตอนขุดเท่านั้น จุดลุ้นสำคัญของเกม
      const ry = rngFor(state.seed, state.day * 131 + index, SALT.YIELD);
      const n = crop.verb === 'dig' ? randInt(ry, 1, 5) : 1;

      state.storage.push({ cropId: c.cropId, stars, n });
      state.stats.harvested += n;
      if (stars === 5) state.stats.fiveStars++;

      plot.history = [c.cropId, ...plot.history].slice(0, 3);
      plot.fertility = Math.max(0, Math.min(100, plot.fertility - crop.drain));

      // กริยา "เติมดินให้เพื่อนบ้าน" — ถั่วคืนความอุดมให้ช่องรอบข้าง
      if (crop.verb === 'fixNitrogen') {
        for (const nb of neighbours(index)) {
          state.plots[nb].fertility = Math.min(100, state.plots[nb].fertility + 12);
        }
      }

      // กริยา "เก็บหลายรอบ" — ต้นอยู่ต่อ ย้อนกลับไปขั้นก่อนสุดท้าย
      let again = false;
      if (crop.verb === 'ratoon' && c.ratoonLeft > 0) {
        again = true;
        c.ratoonLeft--;
        c.ready = false;
        c.stage = crop.stages - 1;
        c.growth = (crop.stages - 1) * crop.daysPerStage;
        // รอบหลังคุณภาพตกลงเรื่อยๆ ต้นเดิมไม่ได้ให้ของดีตลอดไป
        c.qualityMod -= 10;
      } else {
        plot.crop = null;
        plot.tilled = false;
      }
      return { kind: 'harvest', cropId: c.cropId, stars, n, again };
    }
  }
}

export function neighbours(index: number): number[] {
  const x = index % GRID;
  const y = Math.floor(index / GRID);
  const out: number[] = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID) out.push(ny * GRID + nx);
  }
  return out;
}

/** ราคาขายต่อชิ้น เมื่อชนิดนี้ถูกขายไปแล้ว sold ชิ้นในวันเดียวกัน */
export function unitPrice(state: GameState, cropId: string, stars: number, sold: number): number {
  const crop = CROPS[cropId];
  // ยิ่งขายชนิดเดียวเยอะในวันเดียว ราคายิ่งตก — ตัวอย่างย่อของระบบตลาดพลวัต
  const glut = Math.max(0.6, 1 - sold * 0.03);
  const card =
    (state.effect.priceBonus ?? 1) *
    (crop.family === 'leaf' ? (state.effect.leafPriceBonus ?? 1) : 1);
  return Math.round(crop.basePrice * STAR_MULTIPLIER[stars] * glut * card);
}

/**
 * คิดราคาทั้งคลังโดยจำลองการขายทีละชิ้น
 * ต้องใช้ฟังก์ชันเดียวกันทั้งตอนแสดงราคาและตอนขายจริง
 * ไม่งั้นปุ่มจะบอกตัวเลขหนึ่ง แต่ผู้เล่นได้อีกตัวเลขหนึ่ง ซึ่งรู้สึกเหมือนโดนโกง
 */
export function priceStorage(state: GameState): { lines: number[]; total: number } {
  const sold: Record<string, number> = { ...state.soldToday };
  const lines: number[] = [];
  let total = 0;
  for (const item of state.storage) {
    let sum = 0;
    for (let i = 0; i < item.n; i++) {
      sum += unitPrice(state, item.cropId, item.stars, sold[item.cropId] ?? 0);
      sold[item.cropId] = (sold[item.cropId] ?? 0) + 1;
    }
    lines.push(sum);
    total += sum;
  }
  return { lines, total };
}
