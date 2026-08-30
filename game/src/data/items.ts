/**
 * สายไอเทม (merge chains) — หัวใจของเกมแนวรวมร่าง
 * ข้อมูลแยกจากโค้ดโดยเด็ดขาด เพิ่มสายใหม่ได้โดยไม่ต้องแตะตรรกะเกม
 */

export type ItemKind = 'item' | 'generator' | 'obstacle';

export type Item = {
  id: string;
  name: string;
  kind: ItemKind;
  /** สายที่ไอเทมนี้สังกัด ใช้หาว่ารวมแล้วได้อะไร */
  chain: string;
  tier: number;
  /** ราคาขาย ใช้ทั้งตอนขายและตอนคิดรางวัลเควส */
  value: number;
  /** ตัวผลิต: สายที่ปล่อยออกมา และจำนวนครั้งที่ใช้ได้ก่อนต้องรอชาร์จ */
  produces?: string;
  produceTier?: number;
  charges?: number;
  rechargeSec?: number;
  /** สิ่งกีดขวาง: พลังงานที่ใช้ถาง และของที่ได้ */
  clearCost?: number;
  drops?: string[];
};

/** ลำดับขั้นของแต่ละสาย ดัชนีคือ tier */
export const CHAINS: Record<string, string[]> = {
  crop:  ['seed', 'sprout', 'lettuce', 'basket', 'crate', 'cart'],
  wood:  ['twig', 'branch', 'log', 'plank', 'fence'],
  water: ['droplet', 'bucket', 'barrel', 'well'],
  coin:  ['coin', 'coins', 'pouch', 'chest'],
  bed:   ['bed1', 'bed2', 'bed3'],
  pile:  ['pile1', 'pile2', 'pile3'],
};

const def = (
  id: string, name: string, chain: string, tier: number, value: number,
): Item => ({ id, name, kind: 'item', chain, tier, value });

function obj(list: Item[]): Record<string, Item> {
  return Object.fromEntries(list.map((i) => [i.id, i]));
}

export const ITEMS: Record<string, Item> = {
  // สายผัก — สายหลักที่ใช้ส่งเควสมากที่สุด
  ...obj([
    def('seed', 'เมล็ดพันธุ์', 'crop', 0, 3),
    def('sprout', 'ต้นกล้า', 'crop', 1, 10),
    def('lettuce', 'ผักกาด', 'crop', 2, 32),
    def('basket', 'ตะกร้าผัก', 'crop', 3, 105),
    def('crate', 'ลังผัก', 'crop', 4, 340),
    def('cart', 'รถเข็นผัก', 'crop', 5, 1100),
  ]),
  // สายไม้ — ได้จากการถางวัชพืช
  ...obj([
    def('twig', 'กิ่งไม้', 'wood', 0, 2),
    def('branch', 'ท่อนไม้', 'wood', 1, 7),
    def('log', 'ซุง', 'wood', 2, 24),
    def('plank', 'ไม้แปรรูป', 'wood', 3, 80),
    def('fence', 'รั้วไม้', 'wood', 4, 260),
  ]),
  // สายน้ำ — หายากกว่า ราคาดีกว่า
  ...obj([
    def('droplet', 'หยดน้ำ', 'water', 0, 4),
    def('bucket', 'ถังน้ำ', 'water', 1, 14),
    def('barrel', 'โอ่งน้ำ', 'water', 2, 46),
    def('well', 'บ่อน้ำ', 'water', 3, 150),
  ]),
  // สายเหรียญ — แตะเพื่อเก็บเป็นเงิน ยิ่งรวมยิ่งคุ้ม
  ...obj([
    def('coin', 'เหรียญ', 'coin', 0, 12),
    def('coins', 'กองเหรียญ', 'coin', 1, 45),
    def('pouch', 'ถุงเงิน', 'coin', 2, 160),
    def('chest', 'หีบสมบัติ', 'coin', 3, 620),
  ]),

  // ตัวผลิต — รวมร่างได้เหมือนไอเทมทั่วไป ยิ่งขั้นสูงยิ่งปล่อยของดีและชาร์จเร็ว
  bed1: { id: 'bed1', name: 'แปลงผัก', kind: 'generator', chain: 'bed', tier: 0, value: 0,
    produces: 'crop', produceTier: 0, charges: 8, rechargeSec: 22 },
  bed2: { id: 'bed2', name: 'แปลงผักงาม', kind: 'generator', chain: 'bed', tier: 1, value: 0,
    produces: 'crop', produceTier: 1, charges: 12, rechargeSec: 18 },
  bed3: { id: 'bed3', name: 'แปลงผักชั้นดี', kind: 'generator', chain: 'bed', tier: 2, value: 0,
    produces: 'crop', produceTier: 2, charges: 16, rechargeSec: 14 },
  pile1: { id: 'pile1', name: 'กองไม้', kind: 'generator', chain: 'pile', tier: 0, value: 0,
    produces: 'wood', produceTier: 0, charges: 8, rechargeSec: 22 },
  pile2: { id: 'pile2', name: 'กองไม้ใหญ่', kind: 'generator', chain: 'pile', tier: 1, value: 0,
    produces: 'wood', produceTier: 1, charges: 12, rechargeSec: 18 },
  pile3: { id: 'pile3', name: 'โรงไม้', kind: 'generator', chain: 'pile', tier: 2, value: 0,
    produces: 'wood', produceTier: 2, charges: 16, rechargeSec: 14 },

  // สิ่งกีดขวาง — ถางแล้วได้พื้นที่คืนพร้อมของ นี่คือวงจรฟื้นฟูเกาะ
  weed: { id: 'weed', name: 'วัชพืช', kind: 'obstacle', chain: 'obstacle', tier: 0, value: 0,
    clearCost: 2, drops: ['twig', 'twig', 'seed'] },
  rock: { id: 'rock', name: 'ก้อนหิน', kind: 'obstacle', chain: 'obstacle', tier: 0, value: 0,
    clearCost: 5, drops: ['coin', 'droplet'] },
  stump: { id: 'stump', name: 'ตอไม้', kind: 'obstacle', chain: 'obstacle', tier: 0, value: 0,
    clearCost: 8, drops: ['branch', 'branch', 'coin'] },
};

/** ไอเทมถัดไปในสาย คืน null ถ้าถึงขั้นสูงสุดแล้ว */
export function nextInChain(id: string): string | null {
  const item = ITEMS[id];
  if (!item) return null;
  return CHAINS[item.chain]?.[item.tier + 1] ?? null;
}

export const isObstacle = (id: string): boolean => ITEMS[id]?.kind === 'obstacle';
export const isGenerator = (id: string): boolean => ITEMS[id]?.kind === 'generator';
