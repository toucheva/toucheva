// ============ ฟาร์มมินิ — เซฟ/โหลด + เล่นต่อแบบออฟไลน์ ============
(() => {
  const KEY = 'farm-mini-save-v1';
  const MAX_OFFLINE_REAL_MS = 7 * 240 * 1000; // ออฟไลน์นับได้สูงสุด 7 วันเกม

  function saveGame(state) {
    state.lastRealTs = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearSave() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  // คืน state ใหม่ หรือ state ที่โหลดได้ (โหลดพัง → เริ่มใหม่เงียบๆ)
  // v2: migrate เซฟ v1 → v2 (สร้าง field ใหม่ที่ขาด)
  function loadGame() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !Array.isArray(s.plots)) return null;
      if (s.version === 1) {
        // ---- migrate v1 → v2 ----
        s.tomorrowWeather = s.tomorrowWeather || null;
        s.inventoryEggs = s.inventoryEggs || { n: 0, golden: 0 };
        s.coop = s.coop || { count: 0, eggs: [], upgraded: false };
        s.priceHistory = s.priceHistory || {};
        s.achievements = s.achievements || [];
        s.settings = s.settings || { speed: 1, sound: true, music: true };
        for (const k of D_FIELDS) if (s.totals[k] === undefined) s.totals[k] = 0;
        for (const k of E_FIELDS) if (!(k in s.events)) s.events[k] = (k === 'cropsPlanted') ? {} : 0;
        s.news.push('⬆️ อัปเกรดเป็นเวอร์ชั่น 2.0 แล้ว! มีคอกไก่ + ตราสะสมให้เก็บ 🐔');
      }
      if (!s.version || s.version < 3) {
        // ---- migrate v1/v2 → v3: รักษาพื้นที่เดิมทั้งหมด ไม่ล็อกของที่เคยมี ----
        s.unlockedPlots = s.plots.length;
        for (const p of s.plots) p.unlocked = true;
        s.totals = s.totals || {};
        if (s.totals.plotsBought === undefined) s.totals.plotsBought = 0;
        s.news = s.news || [];
        s.news.push('🗺️ อัปเกรดระบบพื้นที่แล้ว! เซฟเดิมรักษาแปลงทั้งหมดไว้');
      }
      if (s.version < 4) migrateV4(s);
      s.version = D_SCHEMA();
      return s;
    } catch (e) {
      return null;
    }
  }
  const D_FIELDS = ['dayPlayed'];
  const E_FIELDS = ['starHarvested', 'regrowFinished', 'goldenEggs', 'stormsSurvived', 'fertilized', 'cropsPlanted'];
  const D_SCHEMA = () => window.Farm.DATA.SCHEMA_VERSION;

  // ---- migrate v3 → v4: ไก่กองเดียว (coop.count) กลายเป็นสัตว์รายตัวที่มีระดับและความสุข ----
  // ห้ามให้ผู้เล่นเดิมเสียอะไร: ไก่ทุกตัวและไข่ที่ค้างคอกต้องถูกยกมาครบ
  function migrateV4(s) {
    const D = window.Farm.DATA;
    s.coop = s.coop || { count: 0, eggs: [] };
    const hens = Math.max(0, s.coop.count | 0);
    const oldEggs = Array.isArray(s.coop.eggs) ? s.coop.eggs : [];

    s.animals = Array.isArray(s.animals) ? s.animals : [];
    s.nextAnimalId = s.nextAnimalId || 1;
    // สร้างไก่รายตัวจากจำนวนเดิม
    for (let i = 0; i < hens; i++) {
      const uid = s.nextAnimalId++;
      s.animals.push({
        uid, kind: 'chicken', care: 0, happy: D.HAPPY_START,
        acc: ((uid - 1) % 12) / 12, rolls: 0, bornDay: s.day || 1, pending: [],
      });
    }
    // แจกไข่ที่ค้างคอกกลับเข้าไก่แบบวนรอบ เพื่อไม่ให้ไข่หายแม้แต่ฟองเดียว
    oldEggs.forEach((e, i) => {
      const target = s.animals[i % Math.max(1, s.animals.length)];
      if (!target || target.kind !== 'chicken') return;
      target.pending.push({ min: (e && e.min) || 0, grade: e && e.golden ? 'golden' : 'n' });
    });

    // เล้าไก่ขั้นแรกจุ 12 ตัวพอดีกับ COOP_MAX เดิม — ผู้เล่นที่ไก่เต็มคอกจึงไม่ล้น
    s.houses = s.houses || { coop: 0, apiary: 0, barn: 0 };
    for (const k of ['coop', 'apiary', 'barn']) if (typeof s.houses[k] !== 'number') s.houses[k] = 0;
    // ถ้าเซฟเก่ามีไก่มากกว่าความจุขั้นแรก (แก้ค่าเอง/เซฟทดลอง) ให้เลื่อนขั้นเล้าให้พอดี
    while (hens > D.HOUSES.coop.tiers[s.houses.coop].cap && s.houses.coop < D.HOUSES.coop.tiers.length - 1) s.houses.coop++;

    s.feed = s.feed || 0;
    s.inventoryProducts = s.inventoryProducts || {};
    s.inventoryEggs = s.inventoryEggs || { n: 0, star: 0, golden: 0 };
    if (s.inventoryEggs.star === undefined) s.inventoryEggs.star = 0;

    s.totals = s.totals || {};
    for (const k of ['animalsBought', 'housesBuilt']) if (s.totals[k] === undefined) s.totals[k] = 0;
    s.events = s.events || {};
    if (s.events.feedMade === undefined) s.events.feedMade = 0;
    if (s.events.autoStored === undefined) s.events.autoStored = 0;
    if (!s.events.productsMade) s.events.productsMade = {};

    // ของขวัญต้อนรับ: อาหารสัตว์พอเลี้ยงฝูงเดิมได้ 3 วัน จะได้ไม่หิวทันทีที่โหลดเข้ามา
    if (hens > 0) s.feed += hens * 3;

    delete s.coop.upgraded;   // ฟิลด์ที่ไม่เคยถูกใช้งานตั้งแต่ v2
    delete s.coop.acc;        // ตัวนับรวมของระบบเก่า — v4 นับแยกรายตัวแล้ว
    window.Farm.syncLegacyCoop(s);

    s.news = s.news || [];
    s.news.push(hens > 0
      ? `🐔 อัปเกรดเป็นระบบปศุสัตว์! ไก่ ${hens} ตัวของเจ้ากลายเป็นสัตว์รายตัวที่เลี้ยงให้เก่งขึ้นได้ (แถมอาหารสัตว์ ${hens * 3} หน่วย)`
      : '🛖 อัปเกรดเป็นระบบปศุสัตว์! มีสัตว์ให้เลี้ยง 7 ชนิด สร้างโรงนาและลานผึ้งได้แล้ว');
  }

  // ออฟไลน์: แปลงเวลาจริงที่หายไปเป็นนาทีเกม แล้วเดิน growTick เป็นรอบ
  // คืนข้อความสรุป (สำหรับ modal ตอนกลับมา) หรือ null ถ้าไม่มีอะไรเปลี่ยน
  function catchUpOffline(state) {
    const D = window.Farm.DATA;
    const now = Date.now();
    const elapsedRealMs = now - (state.lastRealTs || now);
    if (!(elapsedRealMs > 15000)) return null; // ห่างไม่ถึง 15 วิ ไม่ต้องหา
    const cappedMs = Math.min(elapsedRealMs, MAX_OFFLINE_REAL_MS);
    let gameMin = Math.floor((cappedMs / (D.DAY_REAL_SEC * 1000)) * 1440);
    if (gameMin <= 0) return null;

    const readyBefore = state.plots.filter(p => p.state === 'ready').length;
    const deathsBefore = state.events.cropDied;
    const dayBefore = state.day;

    // เดินทีละชั่วโมงเกม (growTick วนเองได้ แต่ตัดก้อนเพื่อกันเหนี่ยวนัก)
    let remaining = gameMin;
    const CHUNK = 6 * 60; // ครั้งละ 6 ชม.เกม
    while (remaining > 0) {
      const step = Math.min(CHUNK, remaining);
      window.Farm.growTick(state, step);
      remaining -= step;
    }
    state.lastRealTs = now;

    const readyNow = state.plots.filter(p => p.state === 'ready').length;
    const newReady = Math.max(0, readyNow - readyBefore);
    const died = state.events.cropDied - deathsBefore;
    const days = state.day - dayBefore;
    const hrs = Math.round(gameMin / 60);
    let msg = `🌙 ห่างหายไป ${hrs} ชม. (${days} วันเกม) — ผักพร้อมเก็บเพิ่ม ${newReady} แปลง`;
    if (died > 0) msg += ` • 🥀 แต่มีผักตาย ${died} แปลงเพราะขาดน้ำ!`;
    if (newReady > 0 && died > 0) msg = msg.replace(' — ', ' • ');
    return { msg, newReady, died, days, hrs };
  }

  window.Farm = window.Farm || {};
  Object.assign(window.Farm, { saveGame, loadGame, clearSave, catchUpOffline, SAVE_KEY: KEY });
})();