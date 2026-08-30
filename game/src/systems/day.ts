import { CROPS } from '../data/crops';
import { CARDS, Card } from '../data/cards';
import { GameState } from '../state';
import { rngFor, SALT, sample } from '../engine/rng';

export type DayReport = {
  grown: number;
  withered: number;
  fallen: number;
  stressed: number;
};

/**
 * ระบบเป็นฟังก์ชันที่เรียงลำดับได้ (หลักสถาปัตยกรรมข้อ 3)
 * ลำดับนี้สำคัญ: พืชโต → ดินแห้ง → ออกการ์ดวันใหม่
 */
export function endDay(state: GameState): DayReport {
  const report: DayReport = { grown: 0, withered: 0, fallen: 0, stressed: 0 };

  for (const plot of state.plots) {
    const c = plot.crop;
    if (!c) {
      plot.moisture = Math.max(0, plot.moisture - 35);
      continue;
    }
    const crop = CROPS[c.cropId];
    const watered = plot.moisture >= 30;

    c.totalDays++;

    if (watered) {
      c.dryDays = 0;
      c.growth++;
      c.wateredDays++;
      report.grown++;
    } else {
      c.dryDays++;
      if (crop.verb === 'stress' && c.dryDays === 1) {
        // กริยา "เครียดแล้วดี" — ขาดน้ำหนึ่งวันทำให้พริกเผ็ดขึ้น
        c.growth++;
        c.wateredDays++;
        c.qualityMod += 14;
        report.stressed++;
      } else if (c.dryDays >= (crop.verb === 'stress' ? 2 : 3)) {
        plot.crop = null;
        plot.tilled = false;
        report.withered++;
        continue;
      }
    }

    const newStage = Math.min(crop.stages, Math.floor(c.growth / crop.daysPerStage));

    // กริยา "ค้ำยัน" — ถึงขั้นสุดท้ายโดยไม่ได้ปักค้าง ต้นล้ม คุณภาพร่วง
    if (crop.verb === 'stake' && newStage >= crop.stages && !c.staked && !c.fallen) {
      c.fallen = true;
      c.qualityMod -= 30;
      report.fallen++;
    }

    c.stage = newStage;
    c.ready = newStage >= crop.stages;
    plot.moisture = Math.max(0, plot.moisture - 45);
  }

  state.day++;
  state.soldToday = {};
  state.cardPicked = null;
  state.effect = {};
  state.cardChoices = rollCards(state).map((c) => c.id);
  state.stamina = state.staminaMax;
  return report;
}

/** สุ่มการ์ดแบบกำหนดผลได้ — เซฟเดิม วันเดิม ได้การ์ดชุดเดิมเสมอ */
export function rollCards(state: GameState): Card[] {
  const r = rngFor(state.seed, state.day, SALT.CARDS);
  return sample(r, CARDS, 3);
}

export function applyCard(state: GameState, cardId: string): Card | null {
  const card = CARDS.find((c) => c.id === cardId);
  if (!card || state.cardPicked) return null;

  state.cardPicked = cardId;
  state.effect = card.effect;

  if (card.effect.staminaBonus) {
    state.stamina = Math.max(10, state.stamina + card.effect.staminaBonus);
  }
  if (card.effect.freeWater) {
    for (const p of state.plots) if (p.tilled) p.moisture = 100;
  }
  if (card.effect.fertilityBonus) {
    for (const p of state.plots) p.fertility = Math.min(100, p.fertility + card.effect.fertilityBonus);
  }
  if (card.effect.seedGift) {
    state.seeds[card.effect.seedGift] = (state.seeds[card.effect.seedGift] ?? 0) + 3;
  }
  return card;
}
