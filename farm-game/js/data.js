// ============ ฟาร์มมินิ — ตารางข้อมูลเกม ============
// ค่าคงที่:
// DAY_REAL_SEC  = วินาทีจริงต่อ 1 วันเกม (default 240 = 4 นาที)
// CLOCK_PER_SEC = นาทีเกมที่เดินต่อ 1 วินาทีจริง (1440 ÷ DAY_REAL_SEC)
// SEASON_DAYS   = จำนวนวันต่อ 1 ฤดู (ปีเกม = 21 วัน / 3 ฤดู)
// ทุกอย่างผูกที่ window.Farm.DATA เพื่อให้ทำงานบน file:// และเทสต์ด้วย Node ได้

(() => {
  const DAY_REAL_SEC = 240;
  const CLOCK_PER_SEC = 1440 / DAY_REAL_SEC; // 6
  const SEASON_DAYS = 7;

  const SEASONS = [
    { id: 0, key: 'hot',  name: 'ฤดูร้อน', emoji: '☀️' },
    { id: 1, key: 'rain', name: 'ฤดูฝน',  emoji: '🌧️' },
    { id: 2, key: 'cold', name: 'ฤดูหนาว', emoji: '❄️' },
  ];

  // growMin หน่วย = นาทีเกม (growMin/60 = ชม.เกมที่ใช้โต)
  // regrowH = ชม.เกมต่อรอบเก็บถัดไป (พืช regrow), regrowCount = จำนวนรอบหลังครั้งแรก
  const CROPS = {
    carrot:     { id: 'carrot',     name: 'แครอท',      emoji: '🥕', seedCost: 12,  sellBase: 28,  growMin: 480,  regrowH: null, regrowCount: 0, likeSeason: null,  hateSeason: 'rain', unlockLv: 1,  stageEmojis: ['·', '🌱', '🌿', '🥕'] },
    potato:     { id: 'potato',     name: 'มันฝรั่ง',    emoji: '🥔', seedCost: 20,  sellBase: 48,  growMin: 720,  regrowH: null, regrowCount: 0, likeSeason: 'cold', hateSeason: 'hot',  unlockLv: 1,  stageEmojis: ['·', '🌱', '🌿', '🥔'] },
    cabbage:    { id: 'cabbage',    name: 'กะหล่ำปลี',   emoji: '🥬', seedCost: 30,  sellBase: 75,  growMin: 960,  regrowH: null, regrowCount: 0, likeSeason: 'cold', hateSeason: 'hot',  unlockLv: 2,  stageEmojis: ['·', '🌱', '🌿', '🥬'] },
    tomato:     { id: 'tomato',     name: 'มะเขือเทศ',   emoji: '🍅', seedCost: 45,  sellBase: 110, growMin: 1440, regrowH: null, regrowCount: 0, likeSeason: 'hot',  hateSeason: 'cold', unlockLv: 3,  stageEmojis: ['·', '🌱', '🌿', '🍅'] },
    corn:       { id: 'corn',       name: 'ข้าวโพด',     emoji: '🌽', seedCost: 60,  sellBase: 140, growMin: 1800, regrowH: null, regrowCount: 0, likeSeason: 'hot',  hateSeason: 'cold', unlockLv: 4,  stageEmojis: ['·', '🌱', '🌿', '🌽'] },
    strawberry: { id: 'strawberry', name: 'สตรอเบอร์รี', emoji: '🍓', seedCost: 90,  sellBase: 70,  growMin: 960,  regrowH: 16,   regrowCount: 3, likeSeason: 'rain', hateSeason: 'hot',  unlockLv: 5,  stageEmojis: ['·', '🌱', '🌿', '🍓'] },
    pumpkin:    { id: 'pumpkin',    name: 'ฟักทอง',      emoji: '🎃', seedCost: 110, sellBase: 300, growMin: 2880, regrowH: null, regrowCount: 0, likeSeason: 'rain', hateSeason: 'hot',  unlockLv: 6,  stageEmojis: ['·', '🌱', '🌿', '🎃'] },
    chili:      { id: 'chili',      name: 'พริก',        emoji: '🌶️', seedCost: 130, sellBase: 90,  growMin: 1200, regrowH: 20,   regrowCount: 4, likeSeason: 'hot',  hateSeason: 'cold', unlockLv: 8,  stageEmojis: ['·', '🌱', '🌿', '🌶️'] },
    grape:      { id: 'grape',      name: 'องุ่น',       emoji: '🍇', seedCost: 200, sellBase: 130, growMin: 1800, regrowH: 30,   regrowCount: 4, likeSeason: 'hot',  hateSeason: 'rain', unlockLv: 10, stageEmojis: ['·', '🌱', '🌿', '🍇'] },
    melon:      { id: 'melon',      name: 'เมลอน',       emoji: '🍈', seedCost: 260, sellBase: 700, growMin: 4320, regrowH: null, regrowCount: 0, likeSeason: 'hot',  hateSeason: 'cold', unlockLv: 12, stageEmojis: ['·', '🌱', '🌿', '🍈'] },
  };

  const UPGRADES = [
    { id: 'landA',     name: 'ขยายที่ดิน A (8×8)',                    cost: 1200, minLv: 4, icon: '🗺️' },
    { id: 'landB',     name: 'ขยายที่ดิน B (10×10)',                  cost: 4000, minLv: 8, icon: '🗺️', requires: 'landA' },
    { id: 'can2',      name: 'กระป๋องน้ำ Tier2 (จุ 16)',             cost: 300,  minLv: 2, icon: '🪣' },
    { id: 'can3',      name: 'กระป๋องน้ำ Tier3 (จุ 32)',             cost: 900,  minLv: 5, icon: '🪣', requires: 'can2' },
    { id: 'can4',      name: 'กระป๋องน้ำ Tier4 (จุ 64)',             cost: 2500, minLv: 9, icon: '🪣', requires: 'can3' },
    { id: 'sprinkler', name: 'สปริงเกลอร์ (รดน้ำอัตโนมัติทุกเช้า)', cost: 3500, minLv: 9, icon: '🚿' },
  ];

  const CAN_CAPACITY = { can0: 8, can2: 16, can3: 32, can4: 64 };
  const APP_SEED = 0xF00D; // แก้เลขนี้ = สุ่มอากาศ/ราคาชุดใหม่ทั้งเกม

  // เควสเรียงตามลำดับ เปิดทีละข้อ (ทำข้อก่อนเสร็จก่อนถึงเห็นข้อถัดไป)
  const QUESTS = [
    { id: 1,  desc: 'ไถดิน 3 แปลง',                 reward: 50,   xp: 0,  test: s => s.totals.tilled >= 3 },
    { id: 2,  desc: 'หว่านเมล็ดแครอท 5 แปลง',        reward: 80,   xp: 20, test: s => (s.events.plantedCarrot || 0) >= 5 },
    { id: 3,  desc: 'เก็บเกี่ยว 5 ชิ้น',             reward: 100,  xp: 0,  test: s => s.totals.harvested >= 5 },
    { id: 4,  desc: 'ขายของรวม 300 เหรียญ',          reward: 150,  xp: 0,  test: s => s.totals.earned >= 300 },
    { id: 5,  desc: 'ซื้ออัปเกรด 1 ชิ้น',            reward: 200,  xp: 0,  test: s => s.totals.upgrades >= 1 },
    { id: 6,  desc: 'เก็บมะเขือเทศ 10 ลูก',          reward: 300,  xp: 30, test: s => (s.events.harvestTomato || 0) >= 10 },
    { id: 7,  desc: 'ถึงเลเวล 5',                    reward: 400,  xp: 0,  test: s => s.level >= 5 },
    { id: 8,  desc: 'มีเงินสะสม 2,000 เหรียญ',       reward: 500,  xp: 0,  test: s => s.money >= 2000 },
    { id: 9,  desc: 'เก็บเกี่ยวพืชในฤดูที่ชอบ 10 ครั้ง', reward: 600, xp: 0, test: s => (s.events.inSeasonHarvest || 0) >= 10 },
    { id: 10, desc: 'ยอดขายรวม 10,000 เหรียญ 👑',   reward: 1000, xp: 0,  test: s => s.totals.earned >= 10000 },
  ];

  const WEATHERS = {
    sunny:   { id: 'sunny',   name: 'แดดออก',  emoji: '☀️', drainMult: 1,  rainPerHr: 0 },
    rain:    { id: 'rain',    name: 'ฝนตก',    emoji: '🌧️', drainMult: 0,  rainPerHr: 20 },
    storm:   { id: 'storm',   name: 'พายุ',    emoji: '⛈️', drainMult: 0,  rainPerHr: 20, damageChance: 0.10 },
    drought: { id: 'drought', name: 'ภัยแล้ง', emoji: '🔥', drainMult: 2,  rainPerHr: 0 },
  };
  // โอกาส: sunny 55% / rain 25% / storm 12% / drought 8%
  const WEATHER_ODDS = [
    ['sunny', 0.55],
    ['rain', 0.25],
    ['storm', 0.12],
    ['drought', 0.08],
  ];

  // คุณภาพผลผลิต: น้ำไม่ขาดเลยตลอดการโต → grade 1 (⭐ ขายแพงขึ้น 50%)
  const GRADES = [
    { id: 0, name: 'ปกติ',        mult: 1.0 },
    { id: 1, name: 'ดีเยี่ยม ⭐', mult: 1.5 },
  ];

  // ---------- v2: คอกไก่ (ค่าเดิม — เซฟเก่าและเทสต์เดิมอ้างอิงตัวเลขชุดนี้) ----------
  const CHICKEN_EMOJI = '🐔';
  const COOP_MAX = 12;                       // ไก่สูงสุดในคอกขั้นแรก
  const CHICKEN_COST = 250;                  // ราคาซื้อไก่ 1 ตัว
  const EGG_INTERVAL_MIN = 480;              // ไก่ 1 ตัวให้ไข่ทุก 8 ชม.เกม
  const EGG_SELL = 45;                       // ราคาขายไข่ (คุณภาพปกติ)
  const GOLDEN_EGG_CHANCE = 0.15;            // โอกาสไข่ทอง (ขาย 3 เท่า)

  // ============ v4: ระบบปศุสัตว์ ============
  // ผลผลิตของสัตว์ — คุณภาพ 3 ระดับใช้ตัวคูณร่วมกับ PRODUCT_GRADES
  const PRODUCTS = {
    egg:      { id: 'egg',      name: 'ไข่ไก่',    emoji: '🥚', base: EGG_SELL },
    duckEgg:  { id: 'duckEgg',  name: 'ไข่เป็ด',   emoji: '🍳', base: 78 },
    honey:    { id: 'honey',    name: 'น้ำผึ้ง',   emoji: '🍯', base: 150 },
    goatMilk: { id: 'goatMilk', name: 'นมแพะ',     emoji: '🥛', base: 165 },
    wool:     { id: 'wool',     name: 'ขนแกะ',     emoji: '🧶', base: 330 },
    milk:     { id: 'milk',     name: 'นมวัว',     emoji: '🍼', base: 280 },
    truffle:  { id: 'truffle',  name: 'ทรัฟเฟิล',  emoji: '🍄', base: 700 },
  };

  // คุณภาพผลผลิตสัตว์: ธรรมดา / ดี / ทอง — ไข่ทองคงตัวคูณ 3 เท่าเดิมไว้
  const PRODUCT_GRADES = [
    { id: 0, key: 'n',      name: 'ธรรมดา',    mark: '',   mult: 1 },
    { id: 1, key: 'star',   name: 'คุณภาพดี',  mark: '⭐', mult: 1.6 },
    { id: 2, key: 'golden', name: 'ทอง',       mark: '🥇', mult: 3 },
  ];

  // บ้านของสัตว์ — แต่ละขั้นเพิ่มความจุ และให้โบนัสความเร็วผลผลิตกับสัตว์ในบ้านนั้น
  // ขั้นแรกของเล้าไก่ต้องจุ 12 ตัว เพื่อให้เซฟเก่าที่มีไก่เต็มคอกไม่ล้น
  const HOUSES = {
    coop: {
      id: 'coop', name: 'เล้าไก่', emoji: '🏚️',
      tiers: [
        { cap: 12, cost: 0,     minLv: 1,  speed: 1.00, name: 'เล้าไม้' },
        { cap: 20, cost: 2200,  minLv: 5,  speed: 1.10, name: 'เล้ายกพื้น' },
        { cap: 30, cost: 7800,  minLv: 9,  speed: 1.22, name: 'เล้าอัตโนมัติ' },
      ],
    },
    apiary: {
      id: 'apiary', name: 'ลานผึ้ง', emoji: '🍯',
      tiers: [
        { cap: 0,  cost: 0,     minLv: 1,  speed: 1.00, name: 'ยังไม่ได้สร้าง' },
        { cap: 4,  cost: 1400,  minLv: 5,  speed: 1.00, name: 'ลานผึ้งเล็ก' },
        { cap: 9,  cost: 5200,  minLv: 8,  speed: 1.15, name: 'ลานผึ้งใหญ่' },
      ],
    },
    barn: {
      id: 'barn', name: 'โรงนา', emoji: '🛖',
      tiers: [
        { cap: 0,  cost: 0,     minLv: 1,  speed: 1.00, name: 'ยังไม่ได้สร้าง' },
        { cap: 6,  cost: 3200,  minLv: 6,  speed: 1.00, name: 'โรงนาไม้' },
        { cap: 12, cost: 11000, minLv: 9,  speed: 1.12, name: 'โรงนาใหญ่' },
        { cap: 20, cost: 26000, minLv: 12, speed: 1.25, name: 'ฟาร์มปศุสัตว์' },
      ],
    },
  };

  // สัตว์เลี้ยง 7 ชนิด — cycleMin = นาทีเกมต่อผลผลิต 1 ชิ้น ที่ระดับ 1 และความสุขปกติ
  const ANIMALS = {
    chicken: { id: 'chicken', name: 'ไก่',   emoji: '🐔', house: 'coop',   cost: CHICKEN_COST, unlockLv: 1,
               product: 'egg',      cycleMin: EGG_INTERVAL_MIN, feedPerDay: 1, likeSeason: null,   hateSeason: 'cold',
               desc: 'ออกไข่ไว เลี้ยงง่าย กินอาหารน้อย' },
    duck:    { id: 'duck',    name: 'เป็ด',  emoji: '🦆', house: 'coop',   cost: 520,  unlockLv: 3,
               product: 'duckEgg',  cycleMin: 600,  feedPerDay: 1, likeSeason: 'rain', hateSeason: null,
               desc: 'ไข่แพงกว่าไก่ และรีดผลผลิตเร็วขึ้นในฤดูฝน' },
    bee:     { id: 'bee',     name: 'ผึ้ง',  emoji: '🐝', house: 'apiary', cost: 1400, unlockLv: 5,
               product: 'honey',    cycleMin: 960,  feedPerDay: 0, likeSeason: 'hot',  hateSeason: 'cold',
               aura: 0.05,
               desc: 'ไม่กินอาหาร และช่วยเร่งการโตของพืชทุกแปลง +5% ต่อรัง' },
    goat:    { id: 'goat',    name: 'แพะ',   emoji: '🐐', house: 'barn',   cost: 1900, unlockLv: 6,
               product: 'goatMilk', cycleMin: 720,  feedPerDay: 2, likeSeason: 'hot',  hateSeason: 'rain',
               desc: 'ทนแล้ง ให้นมสม่ำเสมอ' },
    sheep:   { id: 'sheep',   name: 'แกะ',   emoji: '🐑', house: 'barn',   cost: 2800, unlockLv: 7,
               product: 'wool',     cycleMin: 1440, feedPerDay: 2, likeSeason: 'cold', hateSeason: 'hot',
               desc: 'รอบผลิตนาน แต่ขนแกะราคาสูง โดดเด่นในฤดูหนาว' },
    cow:     { id: 'cow',     name: 'วัว',   emoji: '🐄', house: 'barn',   cost: 4200, unlockLv: 9,
               product: 'milk',     cycleMin: 960,  feedPerDay: 3, likeSeason: null,   hateSeason: 'cold',
               desc: 'กินจุ แต่ให้นมมูลค่าสูงตลอดทั้งปี' },
    pig:     { id: 'pig',     name: 'หมู',   emoji: '🐖', house: 'barn',   cost: 5600, unlockLv: 11,
               product: 'truffle',  cycleMin: 1800, feedPerDay: 4, likeSeason: 'rain', hateSeason: 'hot',
               desc: 'กินจุที่สุด รอบนานที่สุด แต่ทรัฟเฟิลคือผลผลิตที่แพงที่สุดในฟาร์ม' },
  };

  // ระดับสัตว์ — สะสม care จากการให้อาหารและเก็บผลผลิต
  // ระดับ 1 ต้องให้ผลลัพธ์เท่าเกมเดิมเป๊ะ (speed 1.0, ไม่มีของคุณภาพดี, ไข่ทอง 15%)
  const ANIMAL_TIERS = [
    { tier: 1, care: 0,   name: 'ธรรมดา',     mark: '',      speed: 1.00, star: 0,    golden: GOLDEN_EGG_CHANCE },
    { tier: 2, care: 24,  name: 'เลี้ยงดี',   mark: '⭐',    speed: 1.15, star: 0.18, golden: 0.18 },
    { tier: 3, care: 70,  name: 'ยอดเยี่ยม',  mark: '⭐⭐',  speed: 1.32, star: 0.32, golden: 0.22 },
    { tier: 4, care: 160, name: 'ตำนานฟาร์ม', mark: '👑',    speed: 1.55, star: 0.45, golden: 0.28 },
  ];

  // ความสุข → ตัวคูณความเร็วผลผลิต (สัตว์เกิดใหม่เริ่มที่ 70 = ช่วง 'ปกติ' ×1.0)
  const HAPPY_BANDS = [
    { min: 80, mult: 1.25, name: 'มีความสุขมาก', face: '😊' },
    { min: 40, mult: 1.00, name: 'ปกติ',          face: '🙂' },
    { min: 15, mult: 0.60, name: 'หิว',           face: '😟' },
    { min: 0,  mult: 0,    name: 'อดอยาก',        face: '😫' },
  ];
  const HAPPY_START = 70;      // ความสุขของสัตว์ที่เพิ่งซื้อ
  const HAPPY_FED = 15;        // ให้อาหารครบ → ความสุขเพิ่ม
  const HAPPY_HUNGRY = 22;     // อาหารไม่พอ → ความสุขลด
  const HAPPY_HAND_FEED = 26;  // กดให้อาหารเองจากหน้าโรงนา
  const CARE_PER_FEED = 1;     // care ที่ได้ต่อการให้อาหาร 1 วัน
  const CARE_PER_COLLECT = 2;  // care ที่ได้ต่อการเก็บผลผลิต 1 ชิ้น

  // อาหารสัตว์ — ซื้อได้ แต่แปรรูปจากพืชถูกกว่ามาก (ทำให้ปศุสัตว์ต้องพึ่งการปลูกพืช)
  const FEED_BUY_COST = 26;
  const FEED_RECIPES = [
    { crop: 'carrot', n: 2, feed: 5 },
    { crop: 'potato', n: 2, feed: 6 },
    { crop: 'corn',   n: 1, feed: 8 },
  ];

  // ---------- v2: ตราสะสม (18 ชิ้น) ----------
  const ACHIEVEMENTS = [
    { id: 'firstHarvest',  icon: '🧺', name: 'เก็บเกี่ยวครั้งแรก',      desc: 'เก็บผัก 1 ครั้ง',                    test: s => s.totals.harvested >= 1 },
    { id: 'harvest100',    icon: '🌾', name: 'ชาวนาขยัน',              desc: 'เก็บเกี่ยวรวม 100 ครั้ง',            test: s => s.totals.harvested >= 100 },
    { id: 'harvest500',    icon: '🏅', name: 'มือทอง',                  desc: 'เก็บเกี่ยวรวม 500 ครั้ง',            test: s => s.totals.harvested >= 500 },
    { id: 'rich',          icon: '💰', name: 'เศรษฐีหน้าใหม่',          desc: 'มีเงิน 5,000 เหรียญ',               test: s => s.money >= 5000 },
    { id: 'tycoon',        icon: '🏦', name: 'เจ้าสัวเกษตรกร',          desc: 'มีเงิน 20,000 เหรียญ',              test: s => s.money >= 20000 },
    { id: 'earn10k',       icon: '🪙', name: 'กระเป๋าหนัก',             desc: 'ยอดขายรวม 10,000 เหรียญ',           test: s => s.totals.earned >= 10000 },
    { id: 'earn50k',       icon: '💎', name: 'ตำนานยอดขาย',            desc: 'ยอดขายรวม 50,000 เหรียญ',           test: s => s.totals.earned >= 50000 },
    { id: 'level5',        icon: '⭐', name: 'ชาวนาตัวจริง',            desc: 'ถึงเลเวล 5',                        test: s => s.level >= 5 },
    { id: 'level10',       icon: '🌟', name: 'กูรูแปลงใหญ่',            desc: 'ถึงเลเวล 10',                       test: s => s.level >= 10 },
    { id: 'allCrops',      icon: '📚', name: 'นักเกษตรครบเครื่อง',      desc: 'เคยปลูกพืชครบทั้ง 10 ชนิด',          test: s => Object.keys(window.Farm.DATA.CROPS).every(k => (s.events.cropsPlanted[k] || 0) > 0) },
    { id: 'star50',        icon: '✨', name: 'ล่าดาว',                  desc: 'เก็บผล⭐ 50 ชิ้น',                   test: s => (s.events.starHarvested || 0) >= 50 },
    { id: 'regrowRound',   icon: '♻️', name: 'เก็บซ้ำเก่ง',             desc: 'เก็บพืช regrow ครบ 1 ต้นสุดท้าย',     test: s => (s.events.regrowFinished || 0) >= 1 },
    { id: 'chicken3',      icon: '🐤', name: 'เลี้ยงไก่มือใหม่',     desc: 'มีไก่ 3 ตัว',                       test: s => s.coop.count >= 3 },
    { id: 'chickenMax',    icon: '🐓', name: 'ฟาร์มไก่ครบคอก',          desc: 'มีไก่ครบ 12 ตัว',                   test: s => s.coop.count >= COOP_MAX },
    { id: 'goldenEgg',     icon: '🥇', name: 'ไข่ทอง!',                desc: 'ได้ไข่ทอง 1 ฟอง',                   test: s => (s.events.goldenEggs || 0) >= 1 },
    { id: 'survivor',      icon: '⛈️', name: 'รอดจากพายุ',             desc: 'ผ่านพายุมาแล้ว 3 ครั้ง',             test: s => (s.events.stormsSurvived || 0) >= 3 },
    { id: 'greenThumb',    icon: '🖐️', name: 'ปุ๋ยแม่นมือ',             desc: 'ใส่ปุ๋ย 30 ครั้ง',                   test: s => (s.events.fertilized || 0) >= 30 },
    { id: 'yearOne',       icon: '📆', name: 'ครบหนึ่งปี',              desc: 'เล่นถึงวันที่ 21 (ครบปีเกม)',        test: s => s.day >= 21 },
    // ---------- v4: ปศุสัตว์ ----------
    { id: 'firstBarn',     icon: '🛖', name: 'เจ้าของโรงนา',            desc: 'สร้างโรงนาหลังแรก',                  test: s => (s.houses && s.houses.barn || 0) >= 1 },
    { id: 'beeKeeper',     icon: '🐝', name: 'คนเลี้ยงผึ้ง',            desc: 'มีผึ้ง 4 รัง',                       test: s => window.Farm.countAnimals(s, 'bee') >= 4 },
    { id: 'zoo',           icon: '🦆', name: 'ฟาร์มครบทุกสายพันธุ์',    desc: 'เลี้ยงสัตว์ครบทั้ง 7 ชนิดพร้อมกัน',   test: s => Object.keys(window.Farm.DATA.ANIMALS).every(k => window.Farm.countAnimals(s, k) > 0) },
    { id: 'tier4',         icon: '👑', name: 'สัตว์ระดับตำนาน',         desc: 'เลี้ยงสัตว์จนถึงระดับ 4',            test: s => (s.animals || []).some(a => window.Farm.animalTier(a).tier >= 4) },
    { id: 'feedMaster',    icon: '🌾', name: 'โรงอาหารสัตว์',           desc: 'ผลิตอาหารสัตว์สะสม 200 หน่วย',       test: s => (s.events.feedMade || 0) >= 200 },
    { id: 'truffleHunt',   icon: '🍄', name: 'นักล่าทรัฟเฟิล',          desc: 'เก็บทรัฟเฟิลได้ 10 ชิ้น',            test: s => ((s.events.productsMade || {}).truffle || 0) >= 10 },
  ];

  const APP_VERSION = '4.0';   // เวอร์ชั่นที่แสดงผล
  const SCHEMA_VERSION = 4;    // เวอร์ชั่นโครงสร้างเซฟ — แยกจากเลขที่โชว์ให้ผู้เล่น
  window.Farm = window.Farm || {};
  window.Farm.DATA = {
    APP_VERSION, SCHEMA_VERSION, DAY_REAL_SEC, CLOCK_PER_SEC, SEASON_DAYS, SEASONS, CROPS, UPGRADES,
    CAN_CAPACITY, QUESTS, WEATHERS, WEATHER_ODDS, GRADES, APP_SEED,
    COOP_MAX, CHICKEN_COST, EGG_INTERVAL_MIN, EGG_SELL,
    GOLDEN_EGG_CHANCE, ACHIEVEMENTS,
    // v4: ปศุสัตว์
    ANIMALS, PRODUCTS, PRODUCT_GRADES, HOUSES, ANIMAL_TIERS, HAPPY_BANDS,
    HAPPY_START, HAPPY_FED, HAPPY_HUNGRY, HAPPY_HAND_FEED,
    CARE_PER_FEED, CARE_PER_COLLECT, FEED_BUY_COST, FEED_RECIPES,
  };
})();