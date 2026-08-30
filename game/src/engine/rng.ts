/**
 * สุ่มแบบกำหนดผลได้ (deterministic) — หลักสถาปัตยกรรมข้อ 1
 * ห้ามใช้ Math.random() ในตรรกะเกมเด็ดขาด มิฉะนั้นเทสต์และการหาบั๊กจากไฟล์เซฟจะพัง
 */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** เกลือประจำระบบ เพื่อให้แต่ละระบบสุ่มไม่พ้องกันแม้ใช้ seed และวันเดียวกัน */
export const SALT = {
  CARDS: 0x9e3779b9,
  QUALITY: 0x85ebca6b,
  YIELD: 0xc2b2ae35,
  MARKET: 0x27d4eb2f,
} as const;

export function rngFor(seed: number, day: number, salt: number): Rng {
  return mulberry32((seed ^ Math.imul(day + 1, 0x01000193) ^ salt) >>> 0);
}

export const randInt = (r: Rng, min: number, max: number): number =>
  min + Math.floor(r() * (max - min + 1));

export function pick<T>(r: Rng, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

/** สุ่มหยิบ n ชิ้นโดยไม่ซ้ำ */
export function sample<T>(r: Rng, arr: readonly T[], n: number): T[] {
  const pool = arr.slice();
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  }
  return out;
}
