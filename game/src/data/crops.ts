/**
 * ข้อมูลพืช — แยกจากโค้ดโดยเด็ดขาด (หลักสถาปัตยกรรมข้อ 2)
 * การเพิ่มพืชหนึ่งชนิดต้องแก้เฉพาะไฟล์นี้
 *
 * "กริยา" (verb) คือหัวใจกันเบื่อตามหมวด 8.4 ของเอกสารออกแบบ —
 * พืชที่ต่างกันแค่เวลาโตกับราคา คือพืชชนิดเดียวที่ทาสีคนละสี
 */
export type CropVerb = 'none' | 'stake' | 'dig' | 'stress' | 'ratoon' | 'fixNitrogen';

export type Crop = {
  id: string;
  name: string;
  verb: CropVerb;
  verbHint: string;
  stages: number;
  daysPerStage: number;
  basePrice: number;
  seedCost: number;
  /** ความอุดมที่ดูดจากดินต่อการปลูกหนึ่งรอบ */
  drain: number;
  leaf: string;
  fruit: string;
  /** ตระกูลเสียงตอนเก็บเกี่ยว: ใบ / หัว / ผล / ฝัก */
  family: 'leaf' | 'root' | 'fruit' | 'pod';
};

export const CROPS: Record<string, Crop> = {
  napa: {
    id: 'napa', name: 'ผักกาดขาว', verb: 'none',
    verbHint: 'ปลูกง่าย ไม่มีเงื่อนไขพิเศษ เหมาะกับการเริ่มต้น',
    stages: 3, daysPerStage: 1, basePrice: 55, seedCost: 20, drain: 10,
    leaf: '#7cb342', fruit: '#dce775', family: 'leaf',
  },
  tomato: {
    id: 'tomato', name: 'มะเขือเทศ', verb: 'stake',
    verbHint: 'ต้องปักค้างก่อนขึ้นขั้นสุดท้าย ไม่งั้นต้นล้ม คุณภาพร่วง 2 ดาว',
    stages: 4, daysPerStage: 1, basePrice: 110, seedCost: 45, drain: 16,
    leaf: '#558b2f', fruit: '#e53935', family: 'fruit',
  },
  potato: {
    id: 'potato', name: 'มันฝรั่ง', verb: 'dig',
    verbHint: 'ไม่รู้ว่าได้กี่หัวจนกว่าจะขุด — ได้ 1 ถึง 5 หัว',
    stages: 3, daysPerStage: 2, basePrice: 70, seedCost: 35, drain: 14,
    leaf: '#689f38', fruit: '#a1887f', family: 'root',
  },
  chili: {
    id: 'chili', name: 'พริก', verb: 'stress',
    verbHint: 'ปล่อยให้ขาดน้ำ 1 วันจะเผ็ดขึ้น คุณภาพ +1 ดาว แต่ 2 วันติดตาย',
    stages: 4, daysPerStage: 1, basePrice: 130, seedCost: 55, drain: 12,
    leaf: '#33691e', fruit: '#d84315', family: 'fruit',
  },
  lettuce: {
    id: 'lettuce', name: 'ผักสลัด', verb: 'ratoon',
    verbHint: 'เก็บได้ 3 รอบจากต้นเดิม ยิ่งรอบหลังยิ่งได้น้อยลง',
    stages: 3, daysPerStage: 1, basePrice: 60, seedCost: 30, drain: 8,
    leaf: '#9ccc65', fruit: '#c5e1a5', family: 'leaf',
  },
  bean: {
    id: 'bean', name: 'ถั่วฝักยาว', verb: 'fixNitrogen',
    verbHint: 'เก็บเกี่ยวแล้วคืนความอุดมให้ช่องรอบข้าง +12 — พืชฟื้นดิน',
    stages: 3, daysPerStage: 2, basePrice: 85, seedCost: 40, drain: -6,
    leaf: '#3d8b41', fruit: '#c3dc72', family: 'pod',
  },
};

export const CROP_IDS = Object.keys(CROPS);

/** ตัวคูณราคาตามดาว — ตรงกับตาราง A4 ในเอกสารออกแบบ */
export const STAR_MULTIPLIER = [1.0, 1.0, 1.25, 1.6, 2.1, 3.0] as const;
export const STAR_LABEL = ['', '1 ดาว', '2 ดาว', '3 ดาว', '4 ดาว', '5 ดาว'] as const;
