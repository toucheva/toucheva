// ============ เทสต์ v2: คอกไก่ / ตราสะสม / พยากรณ์ / กราฟราคา / migration ============
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const GAME_DIR = path.join(__dirname, '..', 'js');
const FILES = ['data.js', 'state.js', 'weather.js', 'market.js', 'quests.js', 'animals.js', 'save.js'];

function load() {
  const ctx = { console, Date, Math, JSON };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of FILES) {
    vm.runInContext(fs.readFileSync(path.join(GAME_DIR, f), 'utf8'), ctx, { filename: f });
  }
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
  return F;
}

let passed = 0, failed = 0;
function ok(cond, msg) { if (cond) passed++; else { failed++; console.log('  ✗ ' + msg); } }
function eq(a, b, msg) { ok(Object.is(a, b), msg + ` (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`); }
function section(name) { console.log('▸ ' + name); }

section('คอกไก่: ซื้อ/จำกัด/ไข่ตกตามเวลา');
{
  const F = load();
  const s = F.newGame();
  s.market = F.rollPrices(1);
  eq(s.coop.count, 0, 'เริ่มไม่มีไก่');
  ok(F.buyChicken(s), 'ซื้อไก่ได้');
  eq(s.money, 500 - 250, 'หักเงิน 250');
  ok(F.buyChicken(s), 'เงินที่เหลือ 250 พอซื้อตัวที่ 2 พอดี');
  eq(s.money, 0, 'เงินหมดเกลี้ยง');
  ok(!F.buyChicken(s), 'ตัวที่ 3 ซื้อไม่ได้ (เงินหมด)');
  s.money = 99999;
  for (let i = s.coop.count; i < 12; i++) F.buyChicken(s);
  eq(s.coop.count, 12, 'ไก่เต็มคอก 12');
  ok(!F.buyChicken(s), 'ซื้อเกิน 12 ไม่ได้');
  // ไก่ 12 ตัว × ต่อชม. = 12×60/480 = 1.5 ฟอง/ชม. → 4 ชม. = 6 ฟอง
  F.growTick(s, 4 * 60);
  eq(s.coop.eggs.length, 6, `ไก่ 12 ตัว 4 ชม. → ไข่ 6 ฟอง (ได้ ${s.coop.eggs.length})`);
  // เก็บไข่
  const got = F.collectEggs(s);
  ok(got && (got.n + got.g) === 6, 'เก็บไข่ครบ 6 ฟอง (รวมทอง)');
  eq(s.inventoryEggs.n + s.inventoryEggs.golden, 6, 'เข้าคลังครบ');
  ok(s.coop.eggs.length === 0, 'คอกว่างหลังเก็บ');
  // ขาย
  const total = s.inventoryEggs.n * 45 + s.inventoryEggs.golden * 135;
  const moneyBefore = s.money;
  const gotMoney = F.sellEggs(s, 'all');
  eq(gotMoney, total, 'ขายไข่ได้เงินถูกต้อง (ทอง ×3)');
  eq(s.money, moneyBefore + total, 'เงินเข้า');
  // ขายไก่ครึ่งราคา
  const mb2 = s.money;
  F.sellChicken(s);
  eq(s.money, mb2 + 125, 'ขายไก่คืนครึ่งราคา (125)');
}

section('ตราสะสม: ปลดล็อก+รางวัล+ไม่ซ้ำ');
{
  const F = load();
  const s = F.newGame();
  s.market = F.rollPrices(1);
  F.till(s, 0); F.plant(s, 0, 'carrot'); F.water(s, 0);
  F.growTick(s, 9 * 60);
  F.harvest(s, 0);
  const m1 = s.money;
  const u = F.checkAchievements(s);
  ok(s.achievements.includes('firstHarvest'), 'ตรา "เก็บเกี่ยวครั้งแรก" ปลดล็อก');
  ok(u.length >= 1, `ปลดล็อกตราจากเหตุการณ์ (ได้ ${u.length})`);
  // ไม่ปลดซ้ำ
  F.checkAchievements(s);
  eq(s.achievements.filter(id => id === 'firstHarvest').length, 1, 'ไม่ปลดล็อกซ้ำ');
  // รางวัล 100/ตรา
  const count = s.achievements.length;
  s.money = 0; // ตั้งดูรางวัลเข้าจากตราถัดไป
  s.money = 0;
  s.totals.harvested = 100; // ทำเงื่อนไขตรา harvest100
  F.checkAchievements(s);
  ok(s.achievements.includes('harvest100'), 'ตรา harvest100 ปลดล็อก');
  eq(s.money, 100, 'รางวัลตรา = 100');
  void count;
}

section('พยากรณ์อากาศ: tomorrowWeather ตรงวันถัดไป');
{
  const F = load();
  const s = F.newGame();
  s.market = F.rollPrices(1);
  F.growTick(s, 1440); // ขึ้นวัน 2
  ok(s.tomorrowWeather !== null, 'มีพยากรณ์พรุ่งนี้');
  const forecastToday = s.tomorrowWeather;
  F.growTick(s, 1440); // ขึ้นวัน 3
  eq(s.weather, forecastToday, 'forecast เมื่อวาน = อากาศวันนี้ (ระบบซื่อสัตย์)');
}

section('กราฟราคา: priceHistory สะสม + ตัดที่ 10');
{
  const F = load();
  const s = F.newGame();
  s.market = F.rollPrices(1);
  for (let d = 0; d < 15; d++) F.growTick(s, 1440); // เดิน 15 วัน
  eq(s.priceHistory.carrot.length, 10, 'เก็บ history สูงสุด 10 วัน');
  ok(s.priceHistory.carrot.every(px => px >= 21 && px <= 35), 'ราคาในช่วง 28±25%');
}

section('migration: เซฟ v1 → v3');
{
  const F = withStorage(load());
  const oldSave = {
    version: 1, money: 777, day: 4, clockMin: 720, season: 0, weather: 'sunny',
    xp: 10, level: 2, canWater: 8, fertilizer: 3, inventory: { carrot: { n: 2, star: 1 } },
    plots: [], upgrades: { landA: 0, landB: 0, can2: 0, can3: 0, can4: 0, sprinkler: 0 },
    questsDone: [{ id: 1, desc: 'x', reward: 50, day: 1 }],
    totals: { tilled: 1, planted: 1, harvested: 1, earned: 30, upgrades: 0, sold: 2 },
    events: { plantedCarrot: 1, harvestTomato: 0, inSeasonHarvest: 0, cropDied: 0, stormHit: 0 },
    news: [], lastEvent: null, market: null, lastRealTs: Date.now(),
  };
  for (let i = 0; i < 36; i++) oldSave.plots.push({ state: 'soil', crop: null, growthMin: 0, moisture: 0, fert: false, wiltMin: 0, regrowLeft: 0, neverDry: true });
  F.__ctx.localStorage.setItem('farm-mini-save-v1', JSON.stringify(oldSave));
  const s = F.loadGame();
  ok(!!s, 'โหลดเซฟ v1 ได้');
  eq(s.version, F.DATA.SCHEMA_VERSION, 'version ถูกอัปเกรดเป็นสคีมาปัจจุบัน');
  eq(s.unlockedPlots, 36, 'เซฟเก่ารักษาพื้นที่เดิมครบ 36 แปลง');
  ok(s.plots.every(p => p.unlocked), 'แปลงจากเซฟเก่าทั้งหมดเปิดอยู่');
  eq(s.money, 777, 'เงินคงเดิม');
  eq(s.inventory.carrot.n, 2, 'ของคลังคงเดิม');
  ok(s.coop && s.coop.count === 0, 'มี coop เริ่มว่าง');
  ok(s.achievements && s.achievements.length === 0, 'มี achievements ว่าง');
  ok(s.inventoryEggs && s.inventoryEggs.n === 0, 'มี inventoryEggs');
  eq(s.totals.dayPlayed, 0, 'totals.dayPlayed เติมให้แล้ว');
  eq(s.events.fertilized, 0, 'events.fertilized เติมให้แล้ว');
  ok(s.settings && s.settings.speed === 1, 'settings เติมให้แล้ว');
  ok(s.news.some(n => n.includes('2.0')), 'มีข่าวแจ้งอัปเกรด');
  // เล่นต่อได้จริง (แปลงเป็น soil แล้วจึงปลูกได้เลย)
  ok(F.plant(s, 5, 'carrot'), 'ปลูกต่อหลัง migrate ได้');
  F.growTick(s, 60);
  ok(s.coop !== undefined, 'state ครบหลัง tick');
}

section('settings.speed + checkAchievements ใน growTick');
{
  const F = load();
  const s = F.newGame();
  s.settings.speed = 2;
  s.market = F.rollPrices(1);
  s.totals.harvested = 1; // เงื่อนไขตราแรกโดยเหตุการณ์เดียว
  F.growTick(s, 60);
  ok(s.achievements.includes('firstHarvest'), 'growTick เรียก checkAchievements ให้อัตโนมัติ');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);