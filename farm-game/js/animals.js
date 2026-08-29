// ============ ฟาร์มมินิ v4 — ระบบปศุสัตว์ (สัตว์ 7 ชนิด / บ้าน / อาหาร / ระดับสัตว์) ============
// Pure logic แยกจาก UI — ผูกที่ window.Farm.* เหมือนโมดูลอื่น ใช้ได้ทั้ง browser และ Node test
//
// ความเข้ากันได้กับเซฟเก่า (สำคัญ):
//   • ไก่ทุกตัวอยู่ใน state.animals เหมือนสัตว์ชนิดอื่น
//   • สัตว์ทุกตัวเก็บผลผลิตค้างไว้ที่ animal.pending = [{ min, grade }]
//   • state.coop.count และ state.coop.eggs ถูก "สร้างใหม่จากฝูงไก่" ทุกครั้งที่ฝูงเปลี่ยน
//     (ดู syncLegacyCoop) เพื่อให้ตราสะสม เควส เซฟเก่า และเทสต์ชุด v2/v3 ทำงานต่อได้เหมือนเดิม
(() => {
  const D = window.Farm.DATA;

  // สัตว์ที่ซื้อใหม่จะเข้าคิวผลิตแบบ "กระจายเฟส" ไม่ใช่เริ่มนับพร้อมกันทั้งฝูง
  // ทำให้ผลผลิตทยอยออกสม่ำเสมอ แทนที่จะออกทีเดียวเป็นก้อนทุกๆ 1 รอบ
  const PHASE_SLOTS = 12;
  const startPhase = uid => (((uid - 1) % PHASE_SLOTS) / PHASE_SLOTS);

  // ---------- helpers ----------
  function animalsOf(state) { return Array.isArray(state.animals) ? state.animals : (state.animals = []); }
  function countAnimals(state, kind) {
    return animalsOf(state).reduce((n, a) => n + (!kind || a.kind === kind ? 1 : 0), 0);
  }
  function findAnimal(state, uid) { return animalsOf(state).find(a => a.uid === uid) || null; }

  // ---------- บ้านสัตว์ ----------
  function houseTier(state, houseId) {
    const t = (state.houses && state.houses[houseId]) || 0;
    return Math.max(0, Math.min(D.HOUSES[houseId].tiers.length - 1, t));
  }
  function houseInfo(state, houseId) { return D.HOUSES[houseId].tiers[houseTier(state, houseId)]; }
  function houseCap(state, houseId) { return houseInfo(state, houseId).cap; }
  function houseUsed(state, houseId) {
    return animalsOf(state).reduce((n, a) => n + (D.ANIMALS[a.kind] && D.ANIMALS[a.kind].house === houseId ? 1 : 0), 0);
  }
  function nextHouseTier(state, houseId) {
    const h = D.HOUSES[houseId], t = houseTier(state, houseId);
    return t + 1 < h.tiers.length ? h.tiers[t + 1] : null;
  }
  // สร้าง/อัปเกรดบ้าน 1 ขั้น
  function upgradeHouse(state, houseId) {
    const h = D.HOUSES[houseId];
    if (!h) return false;
    const next = nextHouseTier(state, houseId);
    if (!next) { emit(state, { text: `${h.name}อัปเกรดสูงสุดแล้ว`, kind: 'error' }); return false; }
    if (state.level < next.minLv) { emit(state, { text: `🔒 ต้อง Lv.${next.minLv}`, kind: 'error' }); return false; }
    if (state.money < next.cost) { emit(state, { text: '❌ เงินไม่พอ', kind: 'error' }); return false; }
    state.money -= next.cost;
    state.houses[houseId] = houseTier(state, houseId) + 1;
    state.totals.housesBuilt = (state.totals.housesBuilt || 0) + 1;
    window.Farm.pushNews(state, `${h.emoji} ${h.name}อัปเกรดเป็น "${next.name}" แล้ว! (จุ ${next.cap} ตัว)`);
    emit(state, { text: `${h.emoji} อัปเกรด${h.name}`, kind: 'buy' });
    return true;
  }

  // ---------- ระดับสัตว์และความสุข ----------
  function animalTier(a) {
    const care = (a && a.care) || 0;
    let out = D.ANIMAL_TIERS[0];
    for (const t of D.ANIMAL_TIERS) if (care >= t.care) out = t;
    return out;
  }
  function nextTierAt(a) {
    const cur = animalTier(a).tier;
    return D.ANIMAL_TIERS.find(t => t.tier === cur + 1) || null;
  }
  function happyBand(a) {
    const h = Math.max(0, Math.min(100, (a && a.happy) != null ? a.happy : D.HAPPY_START));
    return D.HAPPY_BANDS.find(b => h >= b.min) || D.HAPPY_BANDS[D.HAPPY_BANDS.length - 1];
  }

  // ตัวคูณความเร็วผลผลิตรวมทุกปัจจัย: ระดับสัตว์ × ความสุข × บ้าน × ฤดู
  function speedMult(state, a) {
    const def = D.ANIMALS[a.kind];
    if (!def) return 0;
    const season = window.Farm.seasonOfDay(state.day).key;
    let seasonMult = 1;
    if (def.likeSeason === season) seasonMult = 1.25;
    else if (def.hateSeason === season) seasonMult = 0.75;
    return animalTier(a).speed * happyBand(a).mult * houseInfo(state, def.house).speed * seasonMult;
  }
  // นาทีเกมต่อผลผลิต 1 ชิ้น ณ ตอนนี้ (Infinity = หยุดผลิต)
  function animalCycleMin(state, a) {
    const def = D.ANIMALS[a.kind];
    if (!def) return Infinity;
    const m = speedMult(state, a);
    return m > 0 ? def.cycleMin / m : Infinity;
  }

  // ---------- ซื้อ/ขายสัตว์ ----------
  function canBuyAnimal(state, kind) {
    const def = D.ANIMALS[kind];
    if (!def) return { ok: false, reason: 'ไม่มีสัตว์ชนิดนี้' };
    if (state.level < def.unlockLv) return { ok: false, reason: `🔒 ต้อง Lv.${def.unlockLv}` };
    const cap = houseCap(state, def.house);
    if (cap <= 0) return { ok: false, reason: `🔒 ต้องสร้าง${D.HOUSES[def.house].name}ก่อน` };
    if (houseUsed(state, def.house) >= cap) return { ok: false, reason: `${D.HOUSES[def.house].name}เต็มแล้ว` };
    if (state.money < def.cost) return { ok: false, reason: '❌ เงินไม่พอ' };
    return { ok: true, reason: '' };
  }

  function buyAnimal(state, kind) {
    const chk = canBuyAnimal(state, kind);
    if (!chk.ok) { emit(state, { text: chk.reason, kind: 'error' }); return false; }
    const def = D.ANIMALS[kind];
    state.money -= def.cost;
    state.nextAnimalId = (state.nextAnimalId || 1);
    const uid = state.nextAnimalId++;
    animalsOf(state).push({
      uid,
      kind,
      care: 0,
      happy: D.HAPPY_START,
      acc: startPhase(uid),  // ความคืบหน้าผลผลิตชิ้นถัดไป (0..1) — เริ่มแบบกระจายเฟส
      rolls: 0,              // ตัวนับสำหรับ seeded RNG ของคุณภาพ
      bornDay: state.day,
      pending: [],           // [{ min, grade }] ผลผลิตที่ยังไม่ได้เก็บ
    });
    syncLegacyCoop(state);
    state.totals.animalsBought = (state.totals.animalsBought || 0) + 1;
    window.Farm.pushNews(state, `${def.emoji} ${def.name}ตัวใหม่เข้าฟาร์ม! (มี${def.name} ${countAnimals(state, kind)} ตัว)`);
    emit(state, { text: `${def.emoji}+`, kind: 'buy' });
    return true;
  }

  // ขายสัตว์คืน — คืนครึ่งราคา บวกมูลค่าตามระดับที่เลี้ยงมา
  function sellAnimal(state, uid) {
    const list = animalsOf(state);
    const idx = list.findIndex(a => a.uid === uid);
    if (idx < 0) return false;
    const a = list[idx];
    const def = D.ANIMALS[a.kind];
    if (!def) return false;
    collectFrom(state, a);   // ไม่ทิ้งผลผลิตที่ค้างอยู่
    const got = Math.floor(def.cost / 2 * (1 + (animalTier(a).tier - 1) * 0.25));
    list.splice(idx, 1);
    state.money += got;
    state.totals.earned += got;
    syncLegacyCoop(state);
    emit(state, { text: `+${got}🪙`, kind: 'sell' });
    return true;
  }

  // สร้าง state.coop ใหม่จากฝูงไก่ปัจจุบัน — เควส ตราสะสม เซฟเก่า และเทสต์ v2/v3
  // อ่านจำนวนไก่ที่ coop.count และไข่ที่รอเก็บที่ coop.eggs จึงต้องตรงกับ state.animals เสมอ
  function syncLegacyCoop(state) {
    if (!state.coop) state.coop = { count: 0, eggs: [] };
    const eggs = [];
    let count = 0;
    for (const a of animalsOf(state)) {
      if (a.kind !== 'chicken') continue;
      count++;
      for (const item of (a.pending || [])) {
        eggs.push({ min: item.min, golden: item.grade === 'golden', star: item.grade === 'star' });
      }
    }
    eggs.sort((x, y) => x.min - y.min);
    state.coop.count = count;
    state.coop.eggs = eggs;
  }

  // ---------- อาหารสัตว์ ----------
  function feedCost(state) { return D.FEED_BUY_COST; }
  function buyFeed(state, n = 1) {
    const cost = D.FEED_BUY_COST * n;
    if (state.money < cost) { emit(state, { text: '❌ เงินไม่พอ', kind: 'error' }); return false; }
    state.money -= cost;
    state.feed = (state.feed || 0) + n;
    emit(state, { text: `🌾 ซื้ออาหารสัตว์ ${n}`, kind: 'buy' });
    return true;
  }
  // แปรรูปพืชในคลังเป็นอาหารสัตว์ — ถูกกว่าซื้อมาก ทำให้ปศุสัตว์ต้องพึ่งการปลูกพืช
  function craftFeed(state, cropId, times = 1) {
    const r = D.FEED_RECIPES.find(x => x.crop === cropId);
    if (!r) return 0;
    const b = state.inventory[cropId];
    if (!b) { emit(state, { text: 'ไม่มีพืชชนิดนี้ในคลัง', kind: 'error' }); return 0; }
    const possible = Math.min(times, Math.floor((b.n || 0) / r.n));
    if (possible <= 0) { emit(state, { text: `❌ ต้องใช้ ${D.CROPS[cropId].name} ${r.n} ชิ้น`, kind: 'error' }); return 0; }
    b.n -= r.n * possible;
    const made = r.feed * possible;
    state.feed = (state.feed || 0) + made;
    state.events.feedMade = (state.events.feedMade || 0) + made;
    emit(state, { text: `🌾+${made}`, kind: 'fert' });
    return made;
  }

  // ให้อาหารด้วยมือ 1 ตัว — ความสุขพุ่งทันที และได้ care
  function handFeed(state, uid) {
    const a = findAnimal(state, uid);
    if (!a) return false;
    const def = D.ANIMALS[a.kind];
    if (!def) return false;
    if (def.feedPerDay <= 0) { emit(state, { text: `${def.name}ไม่ต้องให้อาหาร`, kind: 'error' }); return false; }
    if ((state.feed || 0) < def.feedPerDay) { emit(state, { text: '❌ อาหารสัตว์ไม่พอ', kind: 'error' }); return false; }
    if (a.happy >= 100) { emit(state, { text: `${def.emoji} อิ่มอยู่แล้ว`, kind: 'error' }); return false; }
    state.feed -= def.feedPerDay;
    a.happy = Math.min(100, a.happy + D.HAPPY_HAND_FEED);
    gainCare(state, a, D.CARE_PER_FEED);
    emit(state, { text: `${def.emoji}💛`, kind: 'fert' });
    return true;
  }

  // ให้อาหารอัตโนมัติทุกวัน (เรียกจาก newDay) — คืนสรุปว่าอิ่ม/หิวกี่ตัว
  function dailyFeed(state) {
    let fed = 0, hungry = 0;
    for (const a of animalsOf(state)) {
      const def = D.ANIMALS[a.kind];
      if (!def) continue;
      if (def.feedPerDay <= 0) { a.happy = Math.min(100, a.happy + 5); continue; } // ผึ้งหาอาหารเอง
      if ((state.feed || 0) >= def.feedPerDay) {
        state.feed -= def.feedPerDay;
        a.happy = Math.min(100, a.happy + D.HAPPY_FED);
        gainCare(state, a, D.CARE_PER_FEED);
        fed++;
      } else {
        a.happy = Math.max(0, a.happy - D.HAPPY_HUNGRY);
        hungry++;
      }
    }
    if (hungry > 0) window.Farm.pushNews(state, `🌾 อาหารสัตว์ไม่พอ! มีสัตว์หิว ${hungry} ตัว — ผลผลิตจะช้าลง`);
    return { fed, hungry };
  }

  function gainCare(state, a, n) {
    const before = animalTier(a).tier;
    a.care = (a.care || 0) + n;
    const after = animalTier(a).tier;
    if (after > before) {
      const t = D.ANIMAL_TIERS.find(x => x.tier === after);
      const def = D.ANIMALS[a.kind];
      window.Farm.pushNews(state, `${def.emoji} ${def.name}เลื่อนระดับเป็น "${t.name}" ${t.mark} — ผลผลิตดีขึ้น!`);
    }
  }

  // ---------- ผลผลิต ----------
  // สุ่มคุณภาพแบบ deterministic: seed จาก uid + จำนวนครั้งที่เคยผลิต (เล่นซ้ำได้ผลเดิม)
  function rollGrade(state, a) {
    const t = animalTier(a);
    a.rolls = (a.rolls || 0) + 1;
    const seed = (D.APP_SEED ^ Math.imul(a.uid || 1, 0x9E3779B9) ^ Math.imul(a.rolls, 0x85EBCA6B)) >>> 0;
    const r = window.Farm.mulberry32(seed)();
    if (r < t.golden) return 'golden';
    if (r < t.golden + t.star) return 'star';
    return 'n';
  }

  // สรุปผลผลิตค้างของสัตว์ 1 ตัวเป็นจำนวนแยกตามคุณภาพ
  function pendingOf(state, a) {
    const out = { n: 0, star: 0, golden: 0 };
    for (const item of (a.pending || [])) out[item.grade] = (out[item.grade] || 0) + 1;
    return out;
  }
  function pendingTotal(state, a) { return (a.pending || []).length; }

  const PENDING_CAP = 48;   // ผลผลิตค้างต่อสัตว์ 1 ตัว ก่อนจะถูกเก็บเข้าคลังอัตโนมัติ

  function addProduct(state, a, grade) {
    const def = D.ANIMALS[a.kind];
    state.events.productsMade = state.events.productsMade || {};
    state.events.productsMade[def.product] = (state.events.productsMade[def.product] || 0) + 1;
    if (grade === 'golden') state.events.goldenEggs = (state.events.goldenEggs || 0) + 1;
    if (!a.pending) a.pending = [];
    a.pending.push({ min: state.clockMin, grade });
    // v3 ตัดไข่ส่วนเกินทิ้งเงียบๆ ทำให้ผู้เล่นที่ออฟไลน์นานเสียผลผลิตฟรี
    // v4: ล้นเมื่อไหร่ให้เก็บเข้าคลังอัตโนมัติแทนการลบทิ้ง
    if (a.pending.length > PENDING_CAP) {
      const spill = a.pending.splice(0, a.pending.length - PENDING_CAP);
      storeItems(state, a, spill);
      state.events.autoStored = (state.events.autoStored || 0) + spill.length;
    }
  }

  // ย้ายรายการผลผลิตเข้าคลังที่ถูกต้องตามชนิดสัตว์
  function storeItems(state, a, items) {
    if (!items.length) return 0;
    const def = D.ANIMALS[a.kind];
    const counts = { n: 0, star: 0, golden: 0 };
    for (const it of items) counts[it.grade]++;
    if (a.kind === 'chicken') {
      // ไข่ไก่เข้าคลังเดิม inventoryEggs เพื่อให้ collectEggs/sellEggs ทำงานเหมือนเดิม
      state.inventoryEggs.n += counts.n;
      state.inventoryEggs.star = (state.inventoryEggs.star || 0) + counts.star;
      state.inventoryEggs.golden += counts.golden;
    } else {
      const inv = invProduct(state, def.product);
      inv.n += counts.n; inv.star += counts.star; inv.golden += counts.golden;
    }
    return items.length;
  }

  // เดินเวลาผลผลิตของสัตว์ทุกตัว (เรียกจาก growTick ทุกก้อนเวลา)
  function animalTick(state, step) {
    const list = animalsOf(state);
    if (!list.length) return;
    for (const a of list) {
      const def = D.ANIMALS[a.kind];
      if (!def) continue;
      const cycle = animalCycleMin(state, a);
      if (!isFinite(cycle) || cycle <= 0) continue;
      a.acc = (a.acc || 0) + step / cycle;
      let guard = 0;
      while (a.acc >= 1 && guard++ < 500) {
        a.acc -= 1;
        addProduct(state, a, rollGrade(state, a));
      }
      // ความสุขค่อยๆ ลดระหว่างวัน สัตว์ที่ดูแลดีจะยังอยู่ในแถบบน
      a.happy = Math.max(0, a.happy - (step / 1440) * 6);
    }
    syncLegacyCoop(state);
  }

  // ---------- เก็บผลผลิต ----------
  function invProduct(state, productId) {
    if (!state.inventoryProducts) state.inventoryProducts = {};
    if (!state.inventoryProducts[productId]) state.inventoryProducts[productId] = { n: 0, star: 0, golden: 0 };
    return state.inventoryProducts[productId];
  }

  // ย้ายของค้างของสัตว์ 1 ตัวเข้าคลัง — คืนจำนวนที่เก็บได้
  function collectFrom(state, a) {
    const def = D.ANIMALS[a.kind];
    if (!def) return 0;
    const items = a.pending || [];
    if (!items.length) return 0;
    const total = storeItems(state, a, items);
    a.pending = [];
    gainCare(state, a, D.CARE_PER_COLLECT * total);
    if (a.kind === 'chicken') syncLegacyCoop(state);
    return total;
  }

  function collectAnimal(state, uid) {
    const a = findAnimal(state, uid);
    if (!a) return 0;
    const got = collectFrom(state, a);
    if (got <= 0) { emit(state, { text: 'ยังไม่มีผลผลิต', kind: 'error' }); return 0; }
    const def = D.ANIMALS[a.kind];
    emit(state, { text: `${D.PRODUCTS[def.product].emoji}+${got}`, kind: 'harvest' });
    return got;
  }

  // เก็บผลผลิตทุกตัวในฟาร์ม — คืนสรุปแยกตามชนิดผลผลิต
  function collectAllProducts(state) {
    const summary = {};
    let total = 0;
    for (const a of animalsOf(state)) {
      const def = D.ANIMALS[a.kind];
      if (!def) continue;
      const got = collectFrom(state, a);
      if (got > 0) { summary[def.product] = (summary[def.product] || 0) + got; total += got; }
    }
    if (total > 0) emit(state, { text: `🧺+${total}`, kind: 'harvest' });
    else emit(state, { text: 'ยังไม่มีผลผลิต', kind: 'error' });
    return { total, summary };
  }

  // ---------- ขายผลผลิต ----------
  function gradeMult(gradeKey) {
    const g = D.PRODUCT_GRADES.find(x => x.key === gradeKey);
    return g ? g.mult : 1;
  }
  function productValue(productId, gradeKey) {
    const p = D.PRODUCTS[productId];
    if (!p) return 0;
    return Math.round(p.base * gradeMult(gradeKey));
  }
  // ขายผลผลิตสัตว์ (ไม่รวมไข่ไก่ ซึ่งยังใช้ sellEggs เดิม) — kind = 'n' | 'star' | 'golden' | 'all'
  function sellProduct(state, productId, kind = 'all') {
    const inv = state.inventoryProducts && state.inventoryProducts[productId];
    if (!inv) return 0;
    const keys = kind === 'all' ? ['n', 'star', 'golden'] : [kind];
    let got = 0, sold = 0;
    for (const k of keys) {
      const n = inv[k] || 0;
      if (n <= 0) continue;
      got += productValue(productId, k) * n;
      sold += n;
      inv[k] = 0;
    }
    if (sold === 0) return 0;
    state.money += got;
    state.totals.earned += got;
    state.totals.sold += sold;
    return got;
  }
  function sellAllProducts(state) {
    let got = 0;
    for (const id in (state.inventoryProducts || {})) got += sellProduct(state, id, 'all');
    return got;
  }

  // ---------- ผึ้งช่วยเร่งการโตของพืช ----------
  // คืนตัวคูณการเจริญเติบโตของพืชทุกแปลง (1 = ไม่มีผึ้ง) เพดาน +25%
  function beeAura(state) {
    const def = D.ANIMALS.bee;
    const n = countAnimals(state, 'bee');
    if (n <= 0) return 1;
    return 1 + Math.min(0.25, n * def.aura);
  }

  function emit(state, ev) { window.Farm.emit(state, ev); }

  window.Farm = window.Farm || {};
  Object.assign(window.Farm, {
    animalsOf, countAnimals, findAnimal, syncLegacyCoop,
    houseTier, houseInfo, houseCap, houseUsed, nextHouseTier, upgradeHouse,
    animalTier, nextTierAt, happyBand, speedMult, animalCycleMin,
    canBuyAnimal, buyAnimal, sellAnimal,
    buyFeed, craftFeed, handFeed, dailyFeed, feedCost,
    animalTick, pendingOf, pendingTotal, collectFrom, collectAnimal, collectAllProducts,
    invProduct, productValue, sellProduct, sellAllProducts, beeAura,
  });
})();
