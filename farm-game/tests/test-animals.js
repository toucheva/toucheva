// ============ เทสต์ระบบปศุสัตว์ v4 (รัน: node tests/test-animals.js) ============
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const GAME_DIR = path.join(__dirname, '..', 'js');
const FILES = ['data.js', 'state.js', 'weather.js', 'market.js', 'quests.js', 'animals.js', 'save.js'];

function load() {
  const ctx = { console, Date, Math, JSON, isFinite: Number.isFinite };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(GAME_DIR, f), 'utf8'), ctx, { filename: f });
  const F = ctx.window.Farm;
  F.__ctx = ctx;
  return F;
}
function withStorage(F) {
  const m = {};
  F.__ctx.localStorage = {
    getItem: k => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: k => { delete m[k]; },
  };
  return m;
}
// เปิดทุกอย่างให้พร้อมทดสอบ: เงิน เลเวล และอาคารครบ
function rich(F, s, opts = {}) {
  s.money = opts.money || 500000;
  s.level = opts.level || 12;
  s.houses = { coop: opts.coop ?? 0, apiary: opts.apiary ?? 1, barn: opts.barn ?? 1 };
  return s;
}

let passed = 0, failed = 0;
function ok(cond, msg) { if (cond) passed++; else { failed++; console.log('  ✗ ' + msg); } }
function eq(a, b, msg) { ok(Object.is(a, b), msg + ` (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`); }
function near(a, b, tol, msg) { ok(Math.abs(a - b) <= tol, msg + ` (got ${a}, want ~${b})`); }
function section(name) { console.log('▸ ' + name); }

// ---------------------------------------------------------------
section('ข้อมูลสัตว์: ครบ 7 ชนิด และอ้างอิงผลผลิต/บ้านถูกต้อง');
{
  const F = load(), D = F.DATA;
  const kinds = Object.keys(D.ANIMALS);
  eq(kinds.length, 7, 'มีสัตว์ 7 ชนิด');
  ok(kinds.every(k => D.PRODUCTS[D.ANIMALS[k].product]), 'สัตว์ทุกชนิดชี้ไปยังผลผลิตที่มีจริง');
  ok(kinds.every(k => D.HOUSES[D.ANIMALS[k].house]), 'สัตว์ทุกชนิดชี้ไปยังบ้านที่มีจริง');
  ok(kinds.every(k => D.ANIMALS[k].cost > 0 && D.ANIMALS[k].cycleMin > 0), 'ราคาและรอบผลิตเป็นบวกทุกชนิด');
  eq(D.HOUSES.coop.tiers[0].cap, D.COOP_MAX, 'เล้าไก่ขั้นแรกจุเท่ากับ COOP_MAX เดิม (เซฟเก่าไม่ล้น)');
  eq(D.ANIMAL_TIERS[0].speed, 1, 'สัตว์ระดับ 1 ผลิตด้วยความเร็วมาตรฐาน');
  eq(D.ANIMAL_TIERS[0].star, 0, 'สัตว์ระดับ 1 ยังไม่ให้ของคุณภาพดี (เข้ากันได้กับสมดุลเดิม)');
  eq(D.ANIMAL_TIERS[0].golden, D.GOLDEN_EGG_CHANCE, 'สัตว์ระดับ 1 โอกาสของทองเท่าเดิม 15%');
}

section('ซื้อสัตว์: ติดเลเวล ติดบ้าน ติดเงิน');
{
  const F = load(), s = F.newGame();
  s.money = 100000;
  eq(F.canBuyAnimal(s, 'goat').ok, false, 'Lv.1 ซื้อแพะไม่ได้');
  s.level = 12;
  eq(F.canBuyAnimal(s, 'goat').ok, false, 'ยังไม่ได้สร้างโรงนา ก็ยังซื้อแพะไม่ได้');
  ok(F.canBuyAnimal(s, 'goat').reason.includes('โรงนา'), 'บอกเหตุผลว่าต้องสร้างโรงนาก่อน');
  ok(F.upgradeHouse(s, 'barn'), 'สร้างโรงนาได้');
  eq(F.canBuyAnimal(s, 'goat').ok, true, 'สร้างโรงนาแล้วซื้อแพะได้');
  ok(F.buyAnimal(s, 'goat'), 'ซื้อแพะสำเร็จ');
  eq(F.countAnimals(s, 'goat'), 1, 'มีแพะ 1 ตัว');
  s.money = 0;
  eq(F.canBuyAnimal(s, 'sheep').ok, false, 'เงินหมดซื้อแกะไม่ได้');
}

section('ความจุบ้าน: เต็มแล้วซื้อไม่ได้ และอัปเกรดเพิ่มความจุ');
{
  const F = load();
  const s = rich(F, F.newGame(), { barn: 1 });
  const cap = F.houseCap(s, 'barn');
  for (let i = 0; i < cap; i++) ok(F.buyAnimal(s, 'goat'), `ซื้อแพะตัวที่ ${i + 1}`);
  eq(F.houseUsed(s, 'barn'), cap, `โรงนาเต็มที่ ${cap} ตัว`);
  eq(F.canBuyAnimal(s, 'goat').ok, false, 'โรงนาเต็มแล้วซื้อไม่ได้');
  ok(F.upgradeHouse(s, 'barn'), 'อัปเกรดโรงนาได้');
  ok(F.houseCap(s, 'barn') > cap, 'ความจุเพิ่มขึ้นหลังอัปเกรด');
  eq(F.canBuyAnimal(s, 'goat').ok, true, 'อัปเกรดแล้วซื้อต่อได้');
  // สัตว์คนละบ้านไม่แย่งความจุกัน
  eq(F.houseUsed(s, 'coop'), 0, 'แพะไม่กินความจุเล้าไก่');
}

section('ผลผลิต: รอบเวลาตรงตามสเปก และคุณภาพ deterministic');
{
  const F = load(), D = F.DATA;
  const s = rich(F, F.newGame());
  F.buyAnimal(s, 'chicken');
  const a = s.animals[0];
  a.acc = 0;                       // ตัดตัวแปรกระจายเฟสออกเพื่อวัดรอบตรงๆ
  eq(F.animalCycleMin(s, a), D.EGG_INTERVAL_MIN, 'ไก่ระดับ 1 ความสุขปกติ = 480 นาทีเกม/ฟอง');
  F.animalTick(s, D.EGG_INTERVAL_MIN);
  eq(F.pendingTotal(s, a), 1, 'ครบ 1 รอบได้ไข่ 1 ฟอง');
  F.animalTick(s, D.EGG_INTERVAL_MIN * 3);
  eq(F.pendingTotal(s, a), 4, 'อีก 3 รอบได้อีก 3 ฟอง');

  // เดินซ้ำจาก state เดิม ต้องได้คุณภาพชุดเดิมเป๊ะ (ไม่ใช้ Math.random)
  const runA = [], runB = [];
  for (const seedRun of [runA, runB]) {
    const F2 = load();
    const s2 = rich(F2, F2.newGame());
    F2.buyAnimal(s2, 'chicken');
    s2.animals[0].acc = 0;
    F2.animalTick(s2, F2.DATA.EGG_INTERVAL_MIN * 30);
    seedRun.push(...s2.animals[0].pending.map(p => p.grade));
  }
  ok(runA.length === runB.length && runA.every((g, i) => g === runB[i]), 'สุ่มคุณภาพซ้ำได้ผลเดิมทุกครั้ง');
  ok(runA.length === 30, 'ผลิตครบ 30 ฟองใน 30 รอบ');
}

section('ระดับสัตว์: care สะสมแล้วเลื่อนขั้น ผลผลิตเร็วขึ้นจริง');
{
  const F = load(), D = F.DATA;
  const s = rich(F, F.newGame());
  F.buyAnimal(s, 'chicken');
  const a = s.animals[0];
  eq(F.animalTier(a).tier, 1, 'เริ่มที่ระดับ 1');
  const baseCycle = F.animalCycleMin(s, a);
  a.care = D.ANIMAL_TIERS[1].care;
  eq(F.animalTier(a).tier, 2, 'care ถึงเกณฑ์แล้วขึ้นระดับ 2');
  ok(F.animalCycleMin(s, a) < baseCycle, 'ระดับสูงขึ้น รอบผลิตสั้นลง');
  a.care = D.ANIMAL_TIERS[3].care;
  eq(F.animalTier(a).tier, 4, 'care สูงสุดถึงระดับ 4');
  ok(F.animalTier(a).star > 0, 'ระดับสูงมีโอกาสได้ของคุณภาพดี');
  // เก็บผลผลิตแล้วต้องได้ care เพิ่ม
  const b = s.animals[0];
  b.care = 0; b.acc = 0;
  F.animalTick(s, F.animalCycleMin(s, b) * 3);
  const careBefore = b.care;
  F.collectFrom(s, b);
  ok(b.care > careBefore, 'เก็บผลผลิตแล้ว care เพิ่ม');
}

section('ความสุข + อาหาร: ให้อาหารครบ = ผลิตเร็ว, อดอาหาร = หยุดผลิต');
{
  const F = load(), D = F.DATA;
  const s = rich(F, F.newGame());
  F.buyAnimal(s, 'chicken');
  const a = s.animals[0];
  a.acc = 0;

  a.happy = 100;
  ok(F.animalCycleMin(s, a) < D.EGG_INTERVAL_MIN, 'สัตว์มีความสุขมากผลิตเร็วขึ้น');
  a.happy = 5;
  eq(F.animalCycleMin(s, a), Infinity, 'สัตว์อดอยากหยุดผลิต');
  const before = F.pendingTotal(s, a);
  F.animalTick(s, 5000);
  eq(F.pendingTotal(s, a), before, 'อดอยากแล้วเดินเวลาก็ไม่ได้ผลผลิต');

  // ให้อาหารด้วยมือ
  a.happy = 40;
  s.feed = 0;
  eq(F.handFeed(s, a.uid), false, 'ไม่มีอาหารก็ให้ไม่ได้');
  s.feed = 5;
  ok(F.handFeed(s, a.uid), 'มีอาหารแล้วให้อาหารได้');
  ok(a.happy > 40, 'ความสุขเพิ่มหลังให้อาหาร');
  eq(s.feed, 4, 'อาหารถูกหักตามที่สัตว์กิน');
}

section('ให้อาหารประจำวัน: อาหารพอ = อิ่ม, ไม่พอ = หิว');
{
  const F = load(), D = F.DATA;
  const s = rich(F, F.newGame());
  for (let i = 0; i < 3; i++) F.buyAnimal(s, 'chicken');
  s.feed = 3;
  s.animals.forEach(a => { a.happy = 50; });
  let r = F.dailyFeed(s);
  eq(r.fed, 3, 'อาหารพอ เลี้ยงครบ 3 ตัว');
  eq(s.feed, 0, 'อาหารถูกใช้หมดพอดี');
  ok(s.animals.every(a => a.happy > 50), 'ทุกตัวความสุขเพิ่ม');
  r = F.dailyFeed(s);
  eq(r.hungry, 3, 'วันถัดมาไม่มีอาหาร ทุกตัวหิว');
  ok(s.animals.every(a => a.happy < 65 + D.HAPPY_FED), 'ความสุขลดลงเมื่ออดอาหาร');
  // ผึ้งไม่ต้องให้อาหาร
  const s2 = rich(F, F.newGame(), { apiary: 1 });
  F.buyAnimal(s2, 'bee');
  s2.feed = 0;
  const r2 = F.dailyFeed(s2);
  eq(r2.hungry, 0, 'ผึ้งหาอาหารเอง ไม่นับเป็นสัตว์หิว');
}

section('แปรรูปพืชเป็นอาหารสัตว์');
{
  const F = load(), D = F.DATA;
  const s = rich(F, F.newGame());
  const r = D.FEED_RECIPES.find(x => x.crop === 'carrot');
  s.inventory.carrot = { n: r.n * 3, star: 0 };
  eq(F.craftFeed(s, 'carrot', 1), r.feed, 'แปรรูป 1 ครั้งได้อาหารตามสูตร');
  eq(s.inventory.carrot.n, r.n * 2, 'พืชถูกหักตามสูตร');
  eq(F.craftFeed(s, 'carrot', 99), r.feed * 2, 'สั่งทั้งหมดแปรรูปได้เท่าที่พืชมี');
  eq(s.inventory.carrot.n, 0, 'พืชหมดคลัง');
  eq(F.craftFeed(s, 'carrot', 1), 0, 'พืชไม่พอแล้วแปรรูปไม่ได้');
  eq(s.events.feedMade, r.feed * 3, 'นับยอดผลิตอาหารสะสม');
  ok(D.FEED_BUY_COST > (D.CROPS.carrot.sellBase * r.n) / r.feed, 'แปรรูปเองถูกกว่าซื้อสำเร็จรูป');
}

section('ผึ้งเร่งการโตของพืชทุกแปลง');
{
  const F = load();
  const plain = F.newGame();
  F.till(plain, 0); F.plant(plain, 0, 'carrot'); plain.plots[0].moisture = 100;
  F.processHour(plain, 60);

  const F2 = load();
  const withBees = rich(F2, F2.newGame(), { apiary: 1 });
  withBees.level = 1;                       // ให้เงื่อนไขการโตเหมือนกัน
  withBees.animals = [];
  withBees.level = 12; F2.buyAnimal(withBees, 'bee'); F2.buyAnimal(withBees, 'bee');
  withBees.level = 1;
  F2.till(withBees, 0); F2.plant(withBees, 0, 'carrot'); withBees.plots[0].moisture = 100;
  F2.processHour(withBees, 60);

  ok(withBees.plots[0].growthMin > plain.plots[0].growthMin, 'มีผึ้งแล้วพืชโตเร็วกว่า');
  near(F2.beeAura(withBees), 1.10, 0.001, 'ผึ้ง 2 รัง = +10%');
  const many = rich(F2, F2.newGame(), { apiary: 2 });
  for (let i = 0; i < 9; i++) F2.buyAnimal(many, 'bee');
  near(F2.beeAura(many), 1.25, 0.001, 'โบนัสผึ้งมีเพดานที่ +25%');
  eq(F2.beeAura(F2.newGame()), 1, 'ไม่มีผึ้ง = ไม่มีโบนัส');
}

section('เก็บและขายผลผลิตสัตว์');
{
  const F = load(), D = F.DATA;
  const s = rich(F, F.newGame(), { barn: 1 });
  F.buyAnimal(s, 'cow');
  const a = s.animals[0];
  a.acc = 0;
  F.animalTick(s, F.animalCycleMin(s, a) * 4);
  eq(F.pendingTotal(s, a), 4, 'วัวผลิตนม 4 ชิ้น');
  eq(F.collectAnimal(s, a.uid), 4, 'เก็บได้ 4 ชิ้น');
  eq(F.pendingTotal(s, a), 0, 'เก็บแล้วไม่มีของค้าง');
  const inv = s.inventoryProducts.milk;
  eq(inv.n + inv.star + inv.golden, 4, 'เข้าคลังครบ 4');
  const expect = inv.n * F.productValue('milk', 'n') + inv.star * F.productValue('milk', 'star') + inv.golden * F.productValue('milk', 'golden');
  const moneyBefore = s.money;
  eq(F.sellProduct(s, 'milk', 'all'), expect, 'ขายนมได้เงินตรงตามเกรด');
  eq(s.money, moneyBefore + expect, 'เงินเข้าถูกต้อง');
  eq(F.productValue('milk', 'golden'), D.PRODUCTS.milk.base * 3, 'ของทองขาย 3 เท่า');
  // เก็บทั้งฟาร์มทีเดียว
  const s2 = rich(F, F.newGame(), { barn: 1, apiary: 1 });
  F.buyAnimal(s2, 'cow'); F.buyAnimal(s2, 'goat'); F.buyAnimal(s2, 'bee');
  s2.animals.forEach(x => { x.acc = 0; });
  F.animalTick(s2, 4000);
  const res = F.collectAllProducts(s2);
  ok(res.total > 0, 'เก็บผลผลิตทั้งฟาร์มได้');
  ok(Object.keys(res.summary).length >= 2, 'สรุปแยกตามชนิดผลผลิต');
  ok(s2.animals.every(x => F.pendingTotal(s2, x) === 0), 'ไม่มีของค้างเหลือ');
}

section('ผลผลิตล้นต้องเก็บเข้าคลังอัตโนมัติ ไม่ใช่หายไปเฉยๆ');
{
  const F = load();
  const s = rich(F, F.newGame());
  F.buyAnimal(s, 'chicken');
  const a = s.animals[0];
  a.acc = 0;
  const cycles = 200;
  F.animalTick(s, F.animalCycleMin(s, a) * cycles);
  const stored = s.inventoryEggs.n + (s.inventoryEggs.star || 0) + s.inventoryEggs.golden;
  eq(stored + F.pendingTotal(s, a), cycles, 'ไข่ทุกฟองยังอยู่ครบ (ค้างคอก + เก็บอัตโนมัติ)');
  ok(stored > 0, 'ส่วนที่ล้นถูกเก็บเข้าคลังให้แล้ว');
  ok(s.events.autoStored > 0, 'มีการบันทึกจำนวนที่เก็บอัตโนมัติ');
}

section('ความเข้ากันได้: coop.count และ coop.eggs ตรงกับฝูงไก่เสมอ');
{
  const F = load();
  const s = rich(F, F.newGame());
  for (let i = 0; i < 5; i++) F.buyAnimal(s, 'chicken');
  eq(s.coop.count, 5, 'coop.count ตรงกับจำนวนไก่');
  F.buyAnimal(s, 'duck');
  eq(s.coop.count, 5, 'เป็ดไม่ถูกนับเป็นไก่');
  F.growTick(s, 1440);
  eq(s.coop.eggs.length, F.animalsOf(s).filter(a => a.kind === 'chicken')
      .reduce((n, a) => n + a.pending.length, 0), 'coop.eggs สะท้อนไข่ที่ค้างอยู่จริง');
  ok(s.coop.eggs.every(e => typeof e.golden === 'boolean'), 'รูปแบบไข่ยังเป็นโครงสร้างเดิม');
  const total = s.coop.eggs.length;
  const got = F.collectEggs(s);
  eq(got.n + got.g, total, 'collectEggs เก็บครบทุกฟอง');
  eq(s.coop.eggs.length, 0, 'เก็บแล้วคอกว่าง');
}

section('migration v3 → v4: ไก่และไข่เดิมต้องไม่หาย');
{
  const F = load();
  const mem = withStorage(F);
  const old = {
    version: 3, money: 1234, day: 9, clockMin: 600, season: 1, weather: 'sunny',
    xp: 5, level: 6, canWater: 8, fertilizer: 2, inventory: { carrot: { n: 3, star: 1 } },
    inventoryEggs: { n: 4, golden: 2 },
    plots: [], unlockedPlots: 4,
    upgrades: { landA: 0, landB: 0, can2: 0, can3: 0, can4: 0, sprinkler: 0 },
    coop: { count: 7, eggs: [{ min: 100, golden: false }, { min: 200, golden: true }, { min: 300, golden: false }], upgraded: false, acc: 0.4 },
    priceHistory: {}, achievements: ['firstHarvest'], settings: { speed: 1, sound: true, music: true },
    questsDone: [], totals: { tilled: 3, planted: 3, harvested: 3, earned: 500, upgrades: 0, sold: 1, dayPlayed: 8, plotsBought: 2 },
    events: { plantedCarrot: 3, harvestTomato: 0, inSeasonHarvest: 0, cropDied: 0, stormHit: 0, starHarvested: 1, regrowFinished: 0, goldenEggs: 2, stormsSurvived: 0, fertilized: 0, cropsPlanted: { carrot: 3 } },
    news: [], lastEvent: null, market: null, lastRealTs: Date.now(),
  };
  for (let i = 0; i < 36; i++) old.plots.push({ unlocked: i < 4, state: 'soil', crop: null, growthMin: 0, moisture: 0, fert: false, wiltMin: 0, regrowLeft: 0, neverDry: true });
  mem['farm-mini-save-v1'] = JSON.stringify(old);

  const s = F.loadGame();
  ok(!!s, 'โหลดเซฟ v3 ได้');
  eq(s.version, F.DATA.SCHEMA_VERSION, 'อัปเกรดเป็นสคีมา v4');
  eq(s.money, 1234, 'เงินคงเดิม');
  eq(s.level, 6, 'เลเวลคงเดิม');
  eq(s.inventory.carrot.n, 3, 'คลังพืชคงเดิม');
  eq(s.inventoryEggs.n, 4, 'ไข่ในคลังคงเดิม');
  eq(s.inventoryEggs.star, 0, 'เพิ่มเกรด star ให้เซฟเก่า');
  eq(F.countAnimals(s, 'chicken'), 7, 'ไก่ 7 ตัวถูกแปลงเป็นสัตว์รายตัวครบ');
  eq(s.coop.count, 7, 'coop.count ยังตรง');
  eq(s.coop.eggs.length, 3, 'ไข่ที่ค้างคอก 3 ฟองไม่หาย');
  eq(s.coop.eggs.filter(e => e.golden).length, 1, 'ไข่ทองที่ค้างอยู่ยังเป็นไข่ทอง');
  ok(s.animals.every(a => a.uid && a.happy > 0 && Array.isArray(a.pending)), 'สัตว์ที่ migrate มามีฟิลด์ครบ');
  eq(new Set(s.animals.map(a => a.uid)).size, 7, 'uid ไม่ซ้ำกัน');
  ok(s.feed >= 21, 'ได้อาหารสัตว์ตั้งต้นให้ฝูงเดิม');
  eq(s.houses.barn, 0, 'ยังไม่มีโรงนา (ต้องสร้างเอง)');
  eq(s.coop.upgraded, undefined, 'ฟิลด์ตายจาก v2 ถูกลบทิ้ง');
  ok(s.news.some(n => n.includes('ปศุสัตว์')), 'มีข่าวแจ้งอัปเกรด');
  // เล่นต่อได้จริง
  F.growTick(s, 600);
  ok(s.coop.eggs.length >= 3, 'ไก่ที่ migrate มายังออกไข่ต่อได้');
  ok(F.upgradeHouse(s, 'barn') === false || s.houses.barn === 1, 'สร้างโรงนาต่อได้ตามเงื่อนไขเงิน/เลเวล');
}

section('migration: เซฟที่ไก่เกินความจุขั้นแรกต้องไม่ล้น');
{
  const F = load();
  const mem = withStorage(F);
  const old = {
    version: 3, money: 10, day: 2, clockMin: 400, season: 0, weather: 'sunny', xp: 0, level: 9,
    canWater: 8, fertilizer: 0, inventory: {}, inventoryEggs: { n: 0, golden: 0 },
    plots: [{ unlocked: true, state: 'grass', crop: null, growthMin: 0, moisture: 0, fert: false, wiltMin: 0, regrowLeft: 0, neverDry: true }],
    unlockedPlots: 1, upgrades: { landA: 0, landB: 0, can2: 0, can3: 0, can4: 0, sprinkler: 0 },
    coop: { count: 18, eggs: [] }, priceHistory: {}, achievements: [], settings: { speed: 1 },
    questsDone: [], totals: {}, events: {}, news: [], lastEvent: null, market: null, lastRealTs: Date.now(),
  };
  mem['farm-mini-save-v1'] = JSON.stringify(old);
  const s = F.loadGame();
  eq(F.countAnimals(s, 'chicken'), 18, 'ไก่ 18 ตัวถูกยกมาครบ');
  ok(F.houseCap(s, 'coop') >= 18, 'เล้าไก่ถูกเลื่อนขั้นให้จุพอ');
  ok(F.houseUsed(s, 'coop') <= F.houseCap(s, 'coop'), 'ไม่มีสัตว์ล้นความจุ');
}

section('ขายสัตว์คืน: ได้เงินตามระดับ และผลผลิตค้างไม่หาย');
{
  const F = load(), D = F.DATA;
  const s = rich(F, F.newGame());
  F.buyAnimal(s, 'chicken');
  const a = s.animals[0];
  a.acc = 0;
  F.animalTick(s, F.animalCycleMin(s, a) * 2);
  const eggsBefore = F.pendingTotal(s, a);
  const moneyBefore = s.money;
  ok(F.sellAnimal(s, a.uid), 'ขายไก่คืนได้');
  eq(s.money, moneyBefore + D.CHICKEN_COST / 2, 'ระดับ 1 ได้คืนครึ่งราคา');
  eq(F.countAnimals(s, 'chicken'), 0, 'ไก่ถูกนำออกจากฝูง');
  eq(s.coop.count, 0, 'coop.count อัปเดตตาม');
  eq(s.inventoryEggs.n + s.inventoryEggs.golden, eggsBefore, 'ไข่ที่ค้างถูกเก็บเข้าคลังก่อนขาย');

  const s2 = rich(F, F.newGame());
  F.buyAnimal(s2, 'chicken');
  s2.animals[0].care = D.ANIMAL_TIERS[3].care;
  const m2 = s2.money;
  F.sellAnimal(s2, s2.animals[0].uid);
  ok(s2.money - m2 > D.CHICKEN_COST / 2, 'สัตว์ระดับสูงขายคืนได้แพงกว่า');
}

section('ตราสะสมใหม่ของระบบปศุสัตว์');
{
  const F = load(), D = F.DATA;
  const s = rich(F, F.newGame(), { apiary: 2, barn: 3 });
  F.checkAchievements(s);
  ok(!s.achievements.includes('zoo'), 'ยังไม่ครบทุกสายพันธุ์');
  for (const k of Object.keys(D.ANIMALS)) F.buyAnimal(s, k);
  F.checkAchievements(s);
  ok(s.achievements.includes('zoo'), 'เลี้ยงครบ 7 ชนิดแล้วได้ตรา');
  ok(s.achievements.includes('firstBarn'), 'สร้างโรงนาแล้วได้ตรา');
  for (let i = 0; i < 3; i++) F.buyAnimal(s, 'bee');
  F.checkAchievements(s);
  ok(s.achievements.includes('beeKeeper'), 'มีผึ้ง 4 รังได้ตรา');
  s.animals[0].care = D.ANIMAL_TIERS[3].care;
  F.checkAchievements(s);
  ok(s.achievements.includes('tier4'), 'เลี้ยงถึงระดับ 4 ได้ตรา');
}

section('ฤดูกาลมีผลกับผลผลิตสัตว์');
{
  const F = load();
  const s = rich(F, F.newGame(), { apiary: 1 });
  F.buyAnimal(s, 'duck');
  const duck = s.animals[0];
  s.day = 1;                                   // ฤดูร้อน (เป็ดเฉยๆ)
  const neutral = F.animalCycleMin(s, duck);
  s.day = 8;                                   // ฤดูฝน (เป็ดชอบ)
  const liked = F.animalCycleMin(s, duck);
  ok(liked < neutral, 'เป็ดผลิตเร็วขึ้นในฤดูที่ชอบ');

  F.buyAnimal(s, 'bee');
  const bee = s.animals[1];
  s.day = 1; const beeHot = F.animalCycleMin(s, bee);
  s.day = 15; const beeCold = F.animalCycleMin(s, bee);
  ok(beeCold > beeHot, 'ผึ้งผลิตช้าลงในฤดูหนาวที่แพ้');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
