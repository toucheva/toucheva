import { GameState } from '../state';

/** พลังงานหนึ่งหน่วยต่อกี่มิลลิวินาที — เดินตามเวลาจริงแม้ปิดเกมไป */
export const ENERGY_MS = 9000;

export function tickEnergy(state: GameState, now: number): boolean {
  if (state.energy >= state.energyMax) {
    state.energyAt = now;
    return false;
  }
  const gained = Math.floor((now - state.energyAt) / ENERGY_MS);
  if (gained <= 0) return false;
  state.energy = Math.min(state.energyMax, state.energy + gained);
  state.energyAt += gained * ENERGY_MS;
  return true;
}

export const secondsToNext = (state: GameState, now: number): number =>
  state.energy >= state.energyMax ? 0 : Math.ceil((ENERGY_MS - (now - state.energyAt)) / 1000);

/** ราคาซื้อพลังงาน แพงขึ้นเรื่อยๆ เพื่อไม่ให้เงินซื้อความคืบหน้าได้ไม่จำกัด */
export const energyPrice = (state: GameState): number => 40 + state.stats.cleared * 6;
