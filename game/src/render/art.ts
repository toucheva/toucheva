/**
 * ตัวช่วยวาดภาพ — ค่าคงที่ของศิลป์และฟังก์ชันพื้นฐาน
 * ทุกอย่างวาดด้วยโค้ด ไม่มีไฟล์ภาพ แต่ต้องดูเหมือนงานที่ตั้งใจวาด ไม่ใช่รูปทรงเรขาคณิต
 */

/** สุ่มแบบคงที่ต่อช่อง เพื่อให้แต่ละแปลงหน้าตาไม่ซ้ำกัน แต่ไม่กระพริบทุกเฟรม */
export function hash(i: number, salt = 0): number {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt + 1, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 13), 0x27d4eb2f);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export const PALETTE = {
  grass: ['#4e7d3e', '#548339', '#4a7742', '#568844'],
  grassBlade: '#6a9c4e',
  grassDark: '#3b6231',
  soilDry: '#7a5a3e',
  soilWet: '#4a3222',
  soilClod: '#8c6a49',
  soilFurrow: '#5e442e',

} as const;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * รับได้ทั้ง #rrggbb และ rgb(r,g,b)
 * ต้องรับสองแบบ เพราะ mix() คืนค่าออกมาแล้วมักถูกส่งต่อเข้า shade() อีกที
 * ถ้าอ่านได้แบบเดียวจะได้ NaN เงียบๆ แล้วแคนวาสจะไม่เปลี่ยนสีเลย หาบั๊กยากมาก
 */
export function rgb(color: string): [number, number, number] {
  if (color.startsWith('#')) {
    const n = parseInt(color.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = color.match(/-?\d+(\.\d+)?/g);
  if (!m || m.length < 3) throw new Error(`อ่านค่าสีไม่ได้: ${color}`);
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}

const clamp255 = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return `rgb(${clamp255(lerp(r1, r2, t))},${clamp255(lerp(g1, g2, t))},${clamp255(lerp(b1, b2, t))})`;
}

export function shade(color: string, amount: number): string {
  const [r, g, b] = rgb(color);
  return `rgb(${clamp255(r + amount)},${clamp255(g + amount)},${clamp255(b + amount)})`;
}

/** สี่เหลี่ยมมุมมน — ใช้บ่อยมาก */
export function roundRect(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** ใบไม้ทรงหยดน้ำ วาดด้วยเส้นโค้งสองเส้น ดูเป็นใบจริงมากกว่าวงรี */
export function leafShape(
  ctx: CanvasRenderingContext2D, len: number, width: number,
): void {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.4, -width, len, 0);
  ctx.quadraticCurveTo(len * 0.4, width, 0, 0);
  ctx.closePath();
}

/** เงาใต้ต้นไม้ — ทำให้พืชดูวางอยู่บนดิน ไม่ใช่ลอยอยู่ */
export function groundShadow(
  ctx: CanvasRenderingContext2D, y: number, rx: number, alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#1d2415';
  ctx.beginPath();
  ctx.ellipse(1.5, y, rx, rx * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
