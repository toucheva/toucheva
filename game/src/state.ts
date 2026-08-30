import { CROP_IDS } from './data/crops';
import type { CardEffect } from './data/cards';

export const GRID = 8;
export const PLOT_COUNT = GRID * GRID;
export const SAVE_VERSION = 1;

export type Tool = 'hoe' | 'seed' | 'water' | 'harvest' | 'stake';

export type PlantedCrop = {
  cropId: string;
  stage: number;
  /** วันที่เติบโตดีสะสม ใช้คำนวณการขึ้นขั้น */
  growth: number;
  /** วันที่ขาดน้ำติดกัน */
  dryDays: number;
  staked: boolean;
  /** ล้มเพราะไม่ได้ปักค้างทัน */
  fallen: boolean;
  /** รอบเก็บที่เหลือ สำหรับพืชกริยา ratoon */
  ratoonLeft: number;
  /** จำนวนวันที่ได้น้ำพอ และอายุรวม — ใช้คำนวณสัดส่วนการดูแล */
  wateredDays: number;
  totalDays: number;
  /** โบนัส/โทษสะสม เช่น พริกได้เครียด หรือมะเขือเทศล้ม */
  qualityMod: number;
  /** คะแนนพื้นฐานจากดินตอนปลูก เผยผลตอนเก็บเท่านั้น — กลไกเปิดกล่อง */
  qualityBase: number;
  ready: boolean;
};

export type Plot = {
  tilled: boolean;
  fertility: number;
  moisture: number;
  /** ประวัติพืช 3 รอบล่าสุด ใช้คำนวณโทษการปลูกซ้ำ */
  history: string[];
  crop: PlantedCrop | null;
};

export type Harvested = { cropId: string; stars: number; n: number };

export type GameState = {
  version: number;
  seed: number;
  day: number;
  money: number;
  stamina: number;
  staminaMax: number;
  plots: Plot[];
  seeds: Record<string, number>;
  storage: Harvested[];
  /** จำนวนที่ขายไปแล้ววันนี้ต่อชนิด — ใช้กดราคาเมื่อขายชนิดเดียวเยอะ */
  soldToday: Record<string, number>;
  cardChoices: string[];
  cardPicked: string | null;
  effect: CardEffect;
  tool: Tool;
  selectedSeed: string;
  stats: {
    harvested: number;
    fiveStars: number;
    earned: number;
    actions: number;
    bestDay: number;
  };
};

export function freshPlot(): Plot {
  return { tilled: false, fertility: 55, moisture: 0, history: [], crop: null };
}

export function newGame(seed = Date.now() >>> 0): GameState {
  const seeds: Record<string, number> = {};
  for (const id of CROP_IDS) seeds[id] = 0;
  seeds.napa = 8;
  seeds.lettuce = 4;
  seeds.bean = 3;
  return {
    version: SAVE_VERSION,
    seed,
    day: 1,
    money: 500,
    stamina: 120,
    staminaMax: 120,
    plots: Array.from({ length: PLOT_COUNT }, freshPlot),
    seeds,
    storage: [],
    soldToday: {},
    cardChoices: [],
    cardPicked: null,
    effect: {},
    tool: 'hoe',
    selectedSeed: 'napa',
    stats: { harvested: 0, fiveStars: 0, earned: 0, actions: 0, bestDay: 0 },
  };
}
