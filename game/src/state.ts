export const COLS = 8;
export const ROWS = 7;
export const CELLS = COLS * ROWS;
export const SAVE_VERSION = 2;

export type Cell = {
  itemId: string | null;
  /** ตัวผลิต: ครั้งที่ใช้ได้เหลืออยู่ และเวลาที่ชาร์จเต็มครั้งถัดไป */
  charges?: number;
  rechargeAt?: number;
  /** เพิ่งวางลงมา ใช้เล่นแอนิเมชันเด้ง */
  bornAt?: number;
};

export type Order = {
  id: string;
  npc: string;
  want: { itemId: string; n: number }[];
  coins: number;
  xp: number;
};

export type GameState = {
  version: number;
  seed: number;
  cells: Cell[];
  coins: number;
  xp: number;
  level: number;
  energy: number;
  energyMax: number;
  /** เวลาจริงที่คิดพลังงานล่าสุด ทำให้พลังงานเดินต่อแม้ปิดเกม */
  energyAt: number;
  orders: Order[];
  orderSeq: number;
  /** ไอเทมที่เคยสร้างได้แล้ว ใช้ทำสารานุกรมและฉากค้นพบครั้งแรก */
  discovered: string[];
  stats: { merges: number; cleared: number; delivered: number; bestTier: number };
};

export const emptyCell = (): Cell => ({ itemId: null });

export const XP_PER_LEVEL = (level: number): number => Math.round(60 * Math.pow(1.45, level - 1));
