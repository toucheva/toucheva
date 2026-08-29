// ============ เทสต์ logic ของเกม (รัน: node tests/test-logic.js) ============
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const GAME_DIR = path.join(__dirname, '..', 'js');
const FILES = ['data.js', 'state.js', 'weather.js', 'market.js', 'quests.js', 'animals.js', 'save.js'];

// สร้าง context ใหม่ โหลดไฟล์เกมทั้งหมด → คืน window.Farm
function load() {
  const ctx = { console, Date, Math, JSON, isFinite: Number.isFinite };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of FILES) {
    vm.runInContext(fs.readFileSync(path.join(GAME_DIR, f), 'utf8'), ctx, { filename: f });
  }
  const F = ctx.window.Farm;
  F.__ctx = ctx; // ไว้ stub localStorage
  return F;
}
function withStorage(F) {
  const m = {};
  F.__ctx.localStorage = {
    getItem: k => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: k => { delete m[k]; },
  };
  return F;
}

let passed = 0, failed = 0;
function ok(cond, msg) { if (cond) passed++; else { failed++; console.log('  ✗ ' + msg); } }
function eq(a, b, msg) { ok(Object.is(a, b), msg + ` (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`); }
function section(name) { console.log('▸ ' + name); }
function unlockFirst(s, n) {
  s.unlockedPlots = n;
  for (let i = 0; i < s.plots.length; i++) s.plots[i].unlocked = i < n;
}

// ================= =================
section('DATA sanity');
{
  const F = load();
  const D = F.DATA;
  eq(Object.keys(D.CROPS).length, 10, 'มีพืช 10 ชนิด');
  eq(D.QUESTS.length, 10, 'มีเควส 10 ข้อ');
  ok(D.CLOCK_PER_SEC === 6, '1 วิจริง = 6 นาทีเกม');
  ok(D.CROPS.carrot.growMin === 480, 'แครอทโต 8 ชม.เกม');
}

section('newGame basics');
{
  const F = load();
  const s = F.newGame();
  eq(s.money, 500, 'เริ่ม 500 เหรียญ');
  eq(s.plots.length, 36, 'ความจุเริ่มต้น 36 แปลง');
  eq(s.unlockedPlots, 2, 'เริ่มเล่นได้เพียง 2 แปลง');
  ok(s.plots[0].unlocked && s.plots[1].unlocked, 'แปลง 1-2 ปลดล็อก');
  ok(!s.plots[2].unlocked, 'แปลง 3 ยังล็อก');
  eq(s.plots[0].state, 'grass', 'แปลงเริ่มเป็น grass');
  eq(s.questsDone.length, 0, 'ไม่มีเควสเสร็จ');
}

section('actions: till/plant/water/harvest + เควส 1-3');
{
  const F = load();
  const s = F.newGame();
  unlockFirst(s, 5);
  s.market = F.rollPrices(1);
  ok(!F.plant(s, 0, 'carrot'), 'ปลูกบนหญ้าไม่ได้');
  for (let i = 0; i < 5; i++) { ok(F.till(s, i), 'ไถแปลง ' + i); ok(F.plant(s, i, 'carrot'), 'ปลูกแปลง ' + i); }
  eq(s.totals.tilled, 5, 'นับ tilled 5');
  eq(s.money, 500 - 60, 'หักเมล็ด 5×12');
  F.checkQuests(s);
  eq(s.questsDone.length, 2, 'เควส 1-2 เสร็จ');
  eq(s.money, 500 - 60 + 50 + 80, 'รับรางวัลเควส 130');
  for (let i = 0; i < 5; i++) ok(F.water(s, i), 'รดน้ำ ' + i);
  eq(s.canWater, 3, 'กระป๋องเหลือ 3');
  F.growTick(s, 9 * 60);
  eq(s.plots.filter(p => p.state === 'ready').length, 5, 'แครอท 5 แปลงพร้อมเก็บ');
  for (let i = 0; i < 5; i++) F.harvest(s, i);
  eq(s.totals.harvested, 5, 'เก็บ 5');
  ok(s.inventory.carrot && s.inventory.carrot.star === 5, 'ได้แครอท⭐ 5');
  F.checkQuests(s);
  eq(s.questsDone.length, 3, 'เควส 3 เสร็จ');
}

section('grow engine: ขาดน้ำ → หยุดโต → ตายใน 6 ชม.');
{
  const F = load();
  const s = F.newGame();
  F.till(s, 0); F.plant(s, 0, 'carrot'); // ไม่รดน้ำ (moisture เริ่ม 30)
  F.growTick(s, 100);
  ok(s.plots[0].growthMin > 0, 'โตส่วนแรก (น้ำเริ่ม 30)');
  F.growTick(s, 500);
  eq(s.plots[0].moisture, 0, 'น้ำหมดสนิท');
  const g1 = s.plots[0].growthMin;
  ok(s.plots[0].wiltMin > 0, 'เริ่มเหี่ยวแล้ว');
  ok(s.events.cropDied === 0, 'ยังไม่ตาย (ยังไม่ครบ 6 ชม.)');
  F.growTick(s, 30); // ยังไหว (เหี่ยว < 360)
  eq(s.plots[0].growthMin, g1, 'ขาดน้ำ → ไม่โตเพิ่ม');
  eq(s.events.cropDied, 0, 'ยังไม่ตาย');
  F.growTick(s, 400); // รวมเหี่ยวเกิน 360 นาที
  eq(s.events.cropDied, 1, 'ผักตายเมื่อขาดน้ำครบ 6 ชม.');
  ok(s.plots[0].state === 'soil' && s.plots[0].crop === null, 'แปลงกลับเป็นดินว่าง');
}

section('season mult + ปุ๋ย');
{
  const F = load();
  const s = F.newGame(); // day1 = ฤดูร้อน
  F.till(s, 0); F.plant(s, 0, 'potato'); F.water(s, 0); // มันฝรั่งแพ้ร้อน
  F.growTick(s, 60);
  eq(s.plots[0].growthMin, 42, 'ร้อน (แพ้): 60 นาที → โต 42 (×0.7)');
  F.growTick(s, 1440 * 14); // ถึงวันที่ 15 = ฤดูหนาว (ระหว่างทางผักตายก็ได้)
  if (s.plots[0].state !== 'soil') F.till(s, 0);
  F.plant(s, 0, 'potato'); F.water(s, 0);
  F.growTick(s, 60);
  eq(s.plots[0].growthMin, 78, 'หนาว (ชอบ): 60 → 78 (×1.3)');
  s.fertilizer = 1; F.useFertilizer(s, 0);
  F.growTick(s, 60);
  ok(Math.abs(s.plots[0].growthMin - (78 + 60 * 1.3 * 1.25)) < 0.01, 'ปุ๋ยเพิ่มอีก ×1.25');
}

section('regrow: สตรอเบอร์รีเก็บซ้ำ');
{
  const F = load();
  const s = F.newGame();
  s.level = 5; // สตรอปลดล็อกที่ Lv5
  s.day = 8;   // วัน 8-14 = ฤดูฝน (สตรอชอบฝน โตปกติ ×1.3)
  F.till(s, 0); ok(F.plant(s, 0, 'strawberry'), 'ปลูกสตรอ'); F.water(s, 0);
  F.growTick(s, 16 * 60);
  ok(s.plots[0].state === 'ready', 'รอบแรกพร้อม');
  s.weather = 'sunny'; // หยุดฝน กันโตสะสมข้ามรอบระหว่างเก็บ
  F.harvest(s, 0);
  ok(s.plots[0].state === 'planted', 'ยังปลูกอยู่ (regrow)');
  eq(s.plots[0].regrowLeft, 2, 'เหลือ 2 รอบ');
  F.water(s, 0);
  s.weather = 'rain'; // ให้ฝนเลี้ยงต่อ
  F.growTick(s, 17 * 60);
  ok(s.plots[0].state === 'ready', 'รอบสองพร้อม');
  F.harvest(s, 0);
  eq(s.plots[0].regrowLeft, 1, 'เหลือ 1 รอบ');
  eq(s.totals.harvested, 2, 'นับเก็บ 2 ครั้ง');
}

section('ตลาด: deterministic + grade ⭐ ×1.5');
{
  const F = load();
  const p1 = F.rollPrices(7).carrot.px;
  eq(F.rollPrices(7).carrot.px, p1, 'วันเดียวกัน = ราคาเดิม');
  ok(p1 >= 21 && p1 <= 35, 'แครอทราคาในช่วง 28±25%');
  const s = F.newGame();
  s.market = F.rollPrices(7);
  s.inventory.carrot = { n: 3, star: 2 };
  const px = s.market.carrot.px;
  eq(F.sellItem(s, 'carrot', 'n'), px * 3, 'ขาย n 3 ชิ้น');
  eq(F.sellItem(s, 'carrot', 'star'), Math.round(px * 1.5) * 2, 'ขาย⭐ 2 ชิ้น (1.5 เท่า)');
  eq(s.money, 500 + px * 3 + Math.round(px * 1.5) * 2, 'เงินเข้าถูกต้อง');
  ok(s.inventory.carrot.n === 0 && s.inventory.carrot.star === 0, 'คลังว่าง');
}

section('เควส: เรียงลำดับ ไม่ข้าม');
{
  const F = load();
  const s = F.newGame();
  unlockFirst(s, 3);
  F.till(s, 0); F.till(s, 1); F.till(s, 2);
  F.checkQuests(s);
  eq(s.questsDone.length, 1, 'ข้อ 1 เด้ง');
  s.totals.harvested = 5; s.totals.earned = 9999; s.totals.upgrades = 1;
  F.checkQuests(s);
  eq(s.questsDone.length, 1, 'ข้อ 2 ยังไม่จบ → บล็อกข้อ 3-5');
  s.events.plantedCarrot = 5;
  F.checkQuests(s);
  eq(s.questsDone.length, 5, 'ข้อ 2-5 เด้งรัวกันหลังปลดข้อ 2');
}

section('save/load + offline');
{
  const F = withStorage(load());
  const s = F.newGame();
  F.till(s, 0); F.plant(s, 0, 'carrot'); F.water(s, 0);
  ok(F.saveGame(s), 'เซฟได้');
  const raw = JSON.parse(F.__ctx.localStorage.getItem('farm-mini-save-v1'));
  ok(raw.version === F.DATA.SCHEMA_VERSION && raw.plots.length === 36, 'self-check ข้อมูลเซฟ (สคีมาปัจจุบัน)');
  raw.lastRealTs = Date.now() - 5 * 240 * 1000; // จำลองปิด 5 วันเกม
  F.__ctx.localStorage.setItem('farm-mini-save-v1', JSON.stringify(raw));
  const s2 = F.loadGame();
  ok(!!s2, 'โหลดได้');
  eq(s2.plots[0].crop, 'carrot', 'ข้อมูลคงเดิม');
  const r = F.catchUpOffline(s2);
  ok(r && r.hrs === 120, 'สรุปออฟไลน์ 120 ชม.เกม');
  ok(s2.plots[0].state === 'ready', 'แครอทพร้อมเก็บหลังออฟไลน์');
  F.clearSave();
  eq(F.loadGame(), null, 'ล้างเซฟแล้วโหลด → null');
}

section('กระป๋องน้ำ + อัปเกรด tier');
{
  const F = load();
  const s = F.newGame();
  eq(F.canCap(s), 8, 'เริ่มจุ 8');
  F.till(s, 0); F.plant(s, 0, 'carrot');
  for (let i = 0; i < 10; i++) F.water(s, 0);
  eq(s.canWater, 0, 'น้ำหมด');
  ok(!F.water(s, 0), 'รดไม่ได้เมื่อหมด');
  F.refillCan(s);
  eq(s.canWater, 8, 'เติมเต็ม');
  s.money = 5000; s.level = 2;
  ok(F.buyUpgrade(s, 'can2'), 'ซื้อ can2');
  eq(F.canCap(s), 16, 'จุ 16');
  ok(!F.buyUpgrade(s, 'can4'), 'ข้าม can3 ไม่ได้');
}

section('ขยายที่ดิน');
{
  const F = load();
  const s = F.newGame();
  eq(F.gridN(s), 6, 'เริ่ม 6');
  s.money = 90000; s.level = 8;
  ok(!F.buyUpgrade(s, 'landB'), 'landB ห้ามซื้อก่อน landA');
  ok(F.buyUpgrade(s, 'landA'), 'ซื้อ landA');
  eq(F.gridN(s), 8, 'ได้ความจุ 8×8');
  eq(s.plots.length, 64, 'สร้างความจุ 64 ช่อง');
  eq(s.unlockedPlots, 2, 'ซื้อความจุไม่แจกแปลงฟรี');
  ok(!s.plots[40].unlocked && s.plots[40].state === 'grass', 'แปลงใหม่ยังล็อกและเป็นหญ้า');
  ok(F.buyUpgrade(s, 'landB'), 'ซื้อ landB ต่อได้');
  eq(F.gridN(s), 10, 'ได้ความจุ 10×10');
  eq(s.plots.length, 100, 'ความจุครบ 100 ช่อง');
  eq(s.unlockedPlots, 2, 'พื้นที่ใช้งานยังคง 2 แปลง');
}

section('พื้นที่เริ่มต้น 2 แปลง + ซื้อทีละแปลง');
{
  const F = load();
  const s = F.newGame();
  eq(s.unlockedPlots, 2, 'เริ่ม 2 แปลง');
  eq(F.plotUnlockPrice(s), 60, 'แปลงที่ 3 ราคา 60');
  ok(!F.till(s, 2), 'ใช้แปลงล็อกไม่ได้');
  ok(!F.purchasePlot(s, 3), 'ห้ามซื้อข้ามแปลงที่ 3');
  const m0 = s.money;
  ok(F.purchasePlot(s, 2), 'ซื้อแปลงที่ 3 ได้');
  eq(s.money, m0 - 60, 'หักราคา 60');
  eq(s.unlockedPlots, 3, 'ปลดล็อกเป็น 3 แปลง');
  ok(s.plots[2].unlocked, 'flag แปลง 3 เปิด');
  eq(F.plotUnlockPrice(s), 90, 'แปลงที่ 4 ราคา 90');
  ok(F.purchasePlot(s, 3), 'ซื้อแปลงที่ 4 ได้');
  eq(F.plotUnlockPrice(s), 130, 'แปลงที่ 5 ราคา 130');
  ok(F.till(s, 2), 'แปลงที่ซื้อแล้วใช้งานได้');
  s.money = 0;
  ok(!F.purchasePlot(s, 4), 'เงินไม่พอซื้อแปลงไม่ได้');
}

section('อากาศ: ตามโอกาสบน seed คงที่');
{
  const F = load();
  const counts = {};
  for (let d = 1; d <= 2100; d++) {
    const w = F.rollWeather(d);
    counts[w] = (counts[w] || 0) + 1;
  }
  const total = 2100;
  ok(Math.abs(counts.sunny / total - 0.55) < 0.08, `sunny ~55% (ได้ ${(counts.sunny / total * 100).toFixed(1)}%)`);
  ok(Math.abs(counts.rain / total - 0.25) < 0.08, `rain ~25%`);
  ok(Math.abs(counts.storm / total - 0.12) < 0.06, `storm ~12%`);
  ok(Math.abs(counts.drought / total - 0.08) < 0.05, `drought ~8%`);
}

section('พายุ: รื้อแปลง ~10%');
{
  const F = load();
  const s = F.newGame();
  unlockFirst(s, 20);
  for (let i = 0; i < 20; i++) { F.till(s, i); F.plant(s, i, 'carrot'); F.water(s, i); }
  s.weather = 'storm';
  const hit = F.rollStormDamage(s);
  ok(hit >= 0 && hit <= 20, 'ค่าความเสียหายเป็นไปได้');
  eq(s.plots.filter(p => p.state === 'soil').length, hit, 'ตรงกับจำนวนแปลงที่รื้อ');
  s.day = 1;
  const hit2 = F.rollStormDamage(s); // วันเดิม seed เดิม → deterministic
  F.till(s, 2); F.plant(s, 2, 'carrot'); // จำลองสถานะเดิมไม่ได้ทั้งหมด — เช็คแค่ deterministic ของ rng
  ok(hit2 >= 0, 'เรียกซ้ำไม่พัง');
}

// =================
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);