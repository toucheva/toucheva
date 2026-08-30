/**
 * การ์ดวางแผนวัน — กลไกกันเบื่อข้อ 1 (หมวด 8.5)
 * ทุกเช้าเลือก 1 จาก 3 ใบ เพื่อให้วันเริ่มด้วยการตัดสินใจ ไม่ใช่เริ่มด้วยงานบ้าน
 */
export type CardEffect = {
  staminaBonus?: number;
  priceBonus?: number;      // ตัวคูณราคาขายทั้งวัน
  leafPriceBonus?: number;  // ตัวคูณเฉพาะผักใบ
  freeWater?: boolean;      // ฝนตก ทุกแปลงได้น้ำเต็ม
  fertilityBonus?: number;  // เพิ่มความอุดมทุกแปลง
  qualityBonus?: number;    // เพิ่มคะแนนคุณภาพตอนเก็บ
  seedGift?: string;        // แถมเมล็ด 3 เมล็ด
};

export type Card = {
  id: string;
  title: string;
  desc: string;
  icon: string;
  effect: CardEffect;
};

export const CARDS: Card[] = [
  { id: 'rain',    title: 'ฝนโปรยเช้านี้',   desc: 'ทุกแปลงได้น้ำเต็ม ไม่ต้องรดวันนี้',      icon: '🌧', effect: { freeWater: true } },
  { id: 'earlyup', title: 'ตื่นก่อนไก่',      desc: 'พลังงานเริ่มต้น +30',                    icon: '🌅', effect: { staminaBonus: 30 } },
  { id: 'leafday', title: 'ตลาดขาดผักใบ',     desc: 'ผักใบขายได้ราคา +35% ทั้งวัน',           icon: '🥬', effect: { leafPriceBonus: 1.35 } },
  { id: 'peddler', title: 'พ่อค้าเร่แวะ',     desc: 'ทุกอย่างขายได้ราคา +18% ทั้งวัน',         icon: '🛒', effect: { priceBonus: 1.18 } },
  { id: 'compost', title: 'ปุ๋ยหมักได้ที่',   desc: 'ทุกแปลงได้ความอุดม +12',                 icon: '🪱', effect: { fertilityBonus: 12 } },
  { id: 'sunny',   title: 'แดดกำลังดี',       desc: 'ผลผลิตวันนี้มีลุ้นดาวสูงขึ้น',            icon: '☀️', effect: { qualityBonus: 12 } },
  { id: 'gift',    title: 'เพื่อนบ้านแบ่งเมล็ด', desc: 'ได้เมล็ดผักกาดขาว 3 เมล็ด',            icon: '🎁', effect: { seedGift: 'napa' } },
  { id: 'market',  title: 'วันตลาดนัด',       desc: 'ขายได้ราคา +25% แต่พลังงาน −10 เพราะต้องเดินไปตลาด', icon: '🏪', effect: { priceBonus: 1.25, staminaBonus: -10 } },
];
