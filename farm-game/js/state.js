// ============ ฟาร์มมินิ — Game State & ตรรกะการเล่นทั้งหมด ============
// Pure logic แยกจาก UI ทุก action รับ state เป็นตัวหลัก
// ผูกที่ window.Farm.* (ใช้ได้ทั้ง browser และ Node test)
(() => {
  const D = window.Farm.DATA;

  const TILL_FREE = 0;    // ถากหญ้าฟรี
  const PLOW_COST = 5;    // ค่าไถ 1 แปลง
  const FERT_COST = 15;   // ค่าปุ๋ย 1 ชิ้น
  const WATER_PER_USE = 40;
  const DRAIN_PER_HR = 4;         // น้ำระเหย (แดดปกติ)
  const WILT_DEATH_MIN = 360;     // ขาดน้ำ 6 ชม.เกม → ตาย
  const XP_PER_HARVEST = 5;
  const START_MONEY = 500;
  const START_UNLOCKED_PLOTS = 2;

  // ราคาซื้อแปลงถัดไป — ช่วงแรกเปิดเร็วเพื่อไม่ให้ติดคอขวด หลังแปลง 10 โต ~22%
  const EARLY_PLOT_PRICES = [60, 90, 130, 180, 250, 340, 460, 620];

  // ---------- utilities ----------
  function gridN(state) {
    if (state.upgrades.landB) return 10;
    if (state.upgrades.landA) return 8;
    return 6;
  }
  function plotCapacity(state) { const n = gridN(state); return n * n; }
  function plotUnlockPrice(state) {
    const bought = Math.max(0, (state.unlockedPlots || START_UNLOCKED_PLOTS) - START_UNLOCKED_PLOTS);
    if (bought < EARLY_PLOT_PRICES.length) return EARLY_PLOT_PRICES[bought];
    const extra = bought - EARLY_PLOT_PRICES.length + 1;
    return Math.min(15000, Math.round((EARLY_PLOT_PRICES[EARLY_PLOT_PRICES.length - 1] * Math.pow(1.22, extra)) / 10) * 10);
  }
  function isPlotUnlocked(state, i) {
    const p = state.plots[i];
    return !!p && p.unlocked !== false && i < (state.unlockedPlots ?? state.plots.length);
  }
  function purchasePlot(state, requestedIndex) {
    const capacity = plotCapacity(state);
    const next = state.unlockedPlots || START_UNLOCKED_PLOTS;
    if (next >= capacity) {
      emit(state, { text: state.upgrades.landB ? '🗺️ เปิดครบทุกแปลงแล้ว' : '🔒 ต้องซื้อการขยายที่ดินก่อน', kind: 'error' });
      return false;
    }
    // ปลดได้ตามลำดับเท่านั้น ป้องกันแปลงกระโดดกระจาย
    if (requestedIndex !== undefined && requestedIndex !== next) {
      emit(state, { i: requestedIndex, text: '🔒 ซื้อแปลงถัดไปก่อน', kind: 'error' });
      return false;
    }
    const price = plotUnlockPrice(state);
    if (state.money < price) {
      emit(state, { i: next, text: `❌ ต้องใช้ ${price}🪙`, kind: 'error' });
      return false;
    }
    state.money -= price;
    const p = state.plots[next];
    p.unlocked = true;
    state.unlockedPlots = next + 1;
    state.totals.plotsBought = (state.totals.plotsBought || 0) + 1;
    pushNews(state, `🗺️ ปลดล็อกแปลงที่ ${next + 1} แล้ว! (-${price}🪙)`);
    emit(state, { i: next, text: '🔓 เปิดแปลง!', kind: 'buy' });
    return true;
  }
  function canCap(state) {
    const u = state.upgrades;
    if (u.can4) return D.CAN_CAPACITY.can4;
    if (u.can3) return D.CAN_CAPACITY.can3;
    if (u.can2) return D.CAN_CAPACITY.can2;
    return D.CAN_CAPACITY.can0;
  }
  function seasonOfDay(day) {
    return D.SEASONS[Math.floor(((day - 1) % 21) / 7)];
  }
  function seasonMult(cropKey, seasonKey) {
    const c = D.CROPS[cropKey];
    if (!c) return 1;
    if (c.likeSeason === seasonKey) return 1.3;
    if (c.hateSeason === seasonKey) return 0.7;
    return 1;
  }
  function xpNeeded(level) { return Math.round(60 * Math.pow(level, 1.5)); }
  function titleOf(level) {
    if (level >= 12) return 'ราชาฟาร์ม 👑';
    if (level >= 8) return 'กูรูแปลงใหญ่';
    if (level >= 5) return 'ชาวนาตัวจริง';
    if (level >= 3) return 'ชาวนาฝึกหัด';
    return 'มือใหม่';
  }
  function addXp(state, n) {
    state.xp += n;
    let leveled = 0;
    while (state.xp >= xpNeeded(state.level)) {
      state.xp -= xpNeeded(state.level);
      state.level++;
      leveled++;
      state.news.push(`🎉 เลเวลอัป! Lv.${state.level} — ${titleOf(state.level)}`);
    }
    return leveled;
  }
  function inv(state, cropId) {
    if (!state.inventory[cropId]) state.inventory[cropId] = { n: 0, star: 0 };
    return state.inventory[cropId];
  }
  function pushNews(state, msg) { state.news.push(msg); if (state.news.length > 30) state.news.shift(); }
  function emit(state, ev) { // ผลของ action ล่าสุด ไว้ให้ UI ทำ floatText/toast
    state.lastEvent = ev;
  }

  // ---------- เริ่มเกมใหม่ ----------
  function newGame(gridN0 = 6) {
    const n = gridN0;
    const plots = [];
    for (let i = 0; i < n * n; i++) {
      plots.push({ unlocked: i < START_UNLOCKED_PLOTS, state: 'grass', crop: null, growthMin: 0, moisture: 0, fert: false, wiltMin: 0, regrowLeft: 0, neverDry: true });
    }
    return {
      version: D.SCHEMA_VERSION,
      money: START_MONEY,
      day: 1,
      clockMin: 6 * 60, // เริ่ม 06:00
      season: 0,
      weather: 'sunny',
      tomorrowWeather: null, // v2: พยากรณ์อากาศพรุ่งนี้
      xp: 0,
      level: 1,
      canWater: D.CAN_CAPACITY.can0,
      fertilizer: 0,
      inventory: {},
      inventoryEggs: { n: 0, star: 0, golden: 0 }, // v2: ไข่ในคลัง (v4 เพิ่มเกรด star)
      plots,
      unlockedPlots: START_UNLOCKED_PLOTS,
      upgrades: { landA: 0, landB: 0, can2: 0, can3: 0, can4: 0, sprinkler: 0 },
      coop: { count: 0, eggs: [] },      // v2: มุมมองความเข้ากันได้ — สร้างจาก animals โดย syncLegacyCoop()
      // ---- v4: ปศุสัตว์ ----
      animals: [],                       // [{uid, kind, care, happy, acc, rolls, bornDay, pending:[]}]
      nextAnimalId: 1,
      houses: { coop: 0, apiary: 0, barn: 0 },  // ขั้นของบ้านแต่ละหลัง (index ใน DATA.HOUSES[x].tiers)
      feed: 0,                           // อาหารสัตว์คงเหลือ
      inventoryProducts: {},             // { productId: {n, star, golden} } — ผลผลิตสัตว์ที่ไม่ใช่ไข่ไก่
      priceHistory: {}, // v2: { cropId: [ราคาวันล่าสุด...] } — เก็บ 10 วันล่าสุด
      achievements: [], // v2: id ที่ปลดล็อกแล้ว
      settings: { speed: 1, sound: true, music: true, volume: 0.7 }, // v3.1: ความเร็ว + เสียง + เพลง + ระดับเสียง
      questsDone: [],
      totals: { tilled: 0, planted: 0, harvested: 0, earned: 0, upgrades: 0, sold: 0, dayPlayed: 0, plotsBought: 0, animalsBought: 0, housesBuilt: 0 },
      events: { plantedCarrot: 0, harvestTomato: 0, inSeasonHarvest: 0, cropDied: 0, stormHit: 0, starHarvested: 0, regrowFinished: 0, goldenEggs: 0, stormsSurvived: 0, fertilized: 0, cropsPlanted: {}, feedMade: 0, autoStored: 0, productsMade: {} },
      news: ['ยินดีต้อนรับสู่ฟาร์มมินิ 2.0! ไถดินแล้วหว่านแครอทได้เลย 🥕'],
      lastEvent: null,
      market: null, // (จะถูก rollPrices ใส่ตอน init/main)
      lastRealTs: Date.now(),
    };
  }

  // ---------- Actions ----------
  // ถากหญ้า (grass → soil)
  function till(state, i) {
    const p = state.plots[i];
    if (!p || !isPlotUnlocked(state, i)) { emit(state, { i, text: '🔒 ต้องซื้อแปลงก่อน', kind: 'error' }); return false; }
    if (p.state === 'grass' || p.state === 'dead') {
      p.state = 'soil';
      p.crop = null; p.growthMin = 0; p.wiltMin = 0; p.fert = false; p.regrowLeft = 0; p.neverDry = true;
      state.totals.tilled++;
      emit(state, { i, text: '🔨', kind: 'till' });
      return true;
    }
    return false;
  }

  // หว่านเมล็ด
  function plant(state, i, cropId) {
    const p = state.plots[i];
    const c = D.CROPS[cropId];
    if (!p || !c) return false;
    if (!isPlotUnlocked(state, i)) { emit(state, { i, text: '🔒 ต้องซื้อแปลงก่อน', kind: 'error' }); return false; }
    if (p.state !== 'soil') { emit(state, { i, text: '❌ ต้องไถก่อน', kind: 'error' }); return false; }
    if (state.level < c.unlockLv) { emit(state, { i, text: `🔒 Lv.${c.unlockLv}`, kind: 'error' }); return false; }
    if (state.money < c.seedCost) { emit(state, { i, text: '❌ เงินไม่พอ', kind: 'error' }); return false; }
    state.money -= c.seedCost;
    p.state = 'planted';
    p.crop = cropId;
    p.growthMin = 0; p.moisture = 30; p.wiltMin = 0; p.regrowLeft = c.regrowCount; p.neverDry = true;
    state.totals.planted++;
    if (cropId === 'carrot') state.events.plantedCarrot++;
    state.events.cropsPlanted[cropId] = (state.events.cropsPlanted[cropId] || 0) + 1;
    emit(state, { i, text: c.emoji + ' หว่านแล้ว', kind: 'plant' });
    return true;
  }

  // รดน้ำ 1 แปลง
  function water(state, i) {
    const p = state.plots[i];
    if (!p || !isPlotUnlocked(state, i)) return false;
    if (p.state !== 'planted' && p.state !== 'ready') { emit(state, { i, text: '❌ ไม่มีต้นไม้', kind: 'error' }); return false; }
    if (state.canWater <= 0) { emit(state, { i, text: '❌ น้ำหมด ไปเติมที่บ่อ', kind: 'error' }); return false; }
    state.canWater--;
    p.moisture = Math.min(100, p.moisture + WATER_PER_USE);
    emit(state, { i, text: '💧', kind: 'water' });
    return true;
  }

  // เติมน้ำกระป๋อง (ที่บ่อ)
  function refillCan(state) {
    state.canWater = canCap(state);
    emit(state, { text: '🪣 เติมน้ำเต็ม', kind: 'water' });
    return true;
  }

  // ใส่ปุ๋ย 1 แปลง
  function useFertilizer(state, i) {
    const p = state.plots[i];
    if (!p || !isPlotUnlocked(state, i) || p.state !== 'planted' || state.fertilizer <= 0 || p.fert) return false;
    state.fertilizer--;
    p.fert = true;
    state.events.fertilized++;
    emit(state, { i, text: '💩 ปุ๋ยแล้ว', kind: 'fert' });
    return true;
  }
  function buyFertilizer(state, n = 1) {
    const cost = FERT_COST * n;
    if (state.money < cost) { emit(state, { text: '❌ เงินไม่พอ', kind: 'error' }); return false; }
    state.money -= cost;
    state.fertilizer += n;
    emit(state, { text: `🛒 ซื้อปุ๋ย ${n} ชิ้น`, kind: 'buy' });
    return true;
  }

  // เก็บเกี่ยว
  function harvest(state, i) {
    const p = state.plots[i];
    if (!p || !isPlotUnlocked(state, i) || p.state !== 'ready') return false;
    const c = D.CROPS[p.crop];
    const grade = p.neverDry ? 1 : 0;
    const bucket = inv(state, p.crop);
    if (grade === 1) bucket.star++; else bucket.n++;
    if (grade === 1) state.events.starHarvested++;
    state.totals.harvested++;
    addXp(state, XP_PER_HARVEST);
    const season = seasonOfDay(state.day).key;
    if (seasonMult(p.crop, season) > 1) {
      state.events.inSeasonHarvest++;
    }
    if (p.crop === 'tomato') state.events.harvestTomato++;

    if (c.regrowH && p.regrowLeft > 0) {
      // พืช regrow: ยังอยู่บนแปลง เริ่มรอบใหม่ (เวลาเหลือ = regrowH ชม.)
      p.state = 'planted';
      p.growthMin = Math.max(0, c.growMin - c.regrowH * 60);
      p.regrowLeft--;
      p.neverDry = true;
      p.wiltMin = 0;
      if (p.regrowLeft === 0) state.events.regrowFinished++;
      pushNews(state, `${c.emoji} ${c.name} จะออกผลรอบใหม่ใน ${c.regrowH} ชม.`);
    } else {
      p.state = 'soil'; p.crop = null; p.growthMin = 0; p.fert = false; p.wiltMin = 0; p.regrowLeft = 0; p.neverDry = true;
    }
    emit(state, { i, text: `+${c.emoji}${grade ? '⭐' : ''}`, kind: 'harvest' });
    return true;
  }

  // ซื้ออัปเกรด
  function buyUpgrade(state, id) {
    const u = D.UPGRADES.find(u => u.id === id);
    if (!u) return false;
    if (state.upgrades[id]) { emit(state, { text: 'มีอยู่แล้ว', kind: 'error' }); return false; }
    if (state.level < u.minLv) { emit(state, { text: `🔒 ต้อง Lv.${u.minLv}`, kind: 'error' }); return false; }
    if (u.requires && !state.upgrades[u.requires]) { emit(state, { text: '🔒 ต้องซื้อขั้นก่อนหน้า', kind: 'error' }); return false; }
    if (state.money < u.cost) { emit(state, { text: '❌ เงินไม่พอ', kind: 'error' }); return false; }
    state.money -= u.cost;
    state.upgrades[id] = 1;
    state.totals.upgrades++;
    if (id === 'landA' || id === 'landB') {
      // ขยายแปลงจริง: เติมช่องใหม่ด้านท้าย (คงของเดิมไว้)
      const n = gridN(state);
      while (state.plots.length < n * n) {
        state.plots.push({ unlocked: false, state: 'grass', crop: null, growthMin: 0, moisture: 0, fert: false, wiltMin: 0, regrowLeft: 0, neverDry: true });
      }
    }
    if (id === 'can2' || id === 'can3' || id === 'can4') state.canWater = canCap(state);
    pushNews(state, `🛠️ อัปเกรดสำเร็จ: ${u.name}`);
    emit(state, { text: '🛠️', kind: 'buy' });
    return true;
  }

  // ---------- เวลาเดิน ----------
  // ประมวลผล 1 ชั่วโมงเกม (step นาที ≤ 60) สำหรับทุกแปลง
  function processHour(state, step) {
    const w = D.WEATHERS[state.weather] || D.WEATHERS.sunny;
    const season = seasonOfDay(state.day).key;
    const hrs = step / 60;
    const bees = window.Farm.beeAura ? window.Farm.beeAura(state) : 1;  // v4: ผึ้งเร่งการโตของพืชทุกแปลง
    for (const p of state.plots) {
      if (p.state !== 'planted' && p.state !== 'ready') continue;
      // น้ำ
      p.moisture += w.rainPerHr * hrs;
      p.moisture -= DRAIN_PER_HR * (w.drainMult || 1) * hrs;
      p.moisture = Math.max(0, Math.min(100, p.moisture));
      if (p.moisture <= 0) {
        p.neverDry = false;
        if (p.state === 'planted') {
          p.wiltMin += step;
          if (p.wiltMin >= WILT_DEATH_MIN) {
            p.state = 'soil'; p.crop = null; p.growthMin = 0; p.wiltMin = 0; p.fert = false; p.regrowLeft = 0;
            state.events.cropDied++;
            pushNews(state, '🥀 มีผักตายเพราะขาดน้ำ!');
          }
        }
        continue; // ขาดน้ำ → ไม่โต
      }
      if (p.state === 'planted') {
        p.wiltMin = 0;
        const c = D.CROPS[p.crop];
        const eff = step * seasonMult(p.crop, season) * (p.fert ? 1.25 : 1) * bees;
        p.growthMin += eff;
        if (p.growthMin >= c.growMin) {
          p.state = 'ready';
          p.wiltMin = 0;
          emit(state, { i: state.plots.indexOf(p), text: '✨ พร้อมเก็บ!', kind: 'ready' });
        }
      }
    }
  }

  // ขึ้นวันใหม่: ฤดู/อากาศ/ตลาด/พายุ/สปริงเกลอร์
  function newDay(state) {
    state.day++;
    const season = seasonOfDay(state.day);
    state.season = season.id;
    // v2: อากาศพรุ่งนี้ถูกสุ่มไว้ก่อนเมื่อวาน → ใช้เป็นอากาศวันนี้ แล้วสุ่มใหม่สำหรับพรุ่งนี้
    state.weather = state.tomorrowWeather || window.Farm.rollWeather(state.day);
    state.tomorrowWeather = window.Farm.rollWeather(state.day + 1);
    state.market = window.Farm.rollPrices(state.day);
    // v2: บันทึกกราฟราคา (เก็บ 10 วันล่าสุด)
    for (const k in state.market) {
      if (!state.priceHistory[k]) state.priceHistory[k] = [];
      state.priceHistory[k].push(state.market[k].px);
      if (state.priceHistory[k].length > 10) state.priceHistory[k].shift();
    }
    state.totals.dayPlayed++;
    // พายุ
    if (state.weather === 'storm') {
      const hit = window.Farm.rollStormDamage(state);
      state.events.stormHit += hit;
      state.events.stormsSurvived++;
      if (hit > 0) pushNews(state, `⛈️ พายุพักผักเสียหาย ${hit} แปลง!`);
    }
    // v4: ให้อาหารสัตว์ประจำวัน — อาหารไม่พอ สัตว์จะหิวและผลิตช้าลง
    if (window.Farm.dailyFeed) window.Farm.dailyFeed(state);
    // สปริงเกลอร์
    if (state.upgrades.sprinkler) {
      for (const p of state.plots) {
        if (p.state === 'planted' || p.state === 'ready') p.moisture = 100;
      }
    }
    let msg = `📅 วันที่ ${state.day} • ${season.emoji} ${season.name}`;
    pushNews(state, msg);
  }

  // ---------- คอกไก่ (v2 API — v4 กลายเป็นหน้ากากบางๆ ของระบบปศุสัตว์) ----------
  // ซื้อไก่ 1 ตัว
  function buyChicken(state) { return window.Farm.buyAnimal(state, 'chicken'); }

  // ขายไก่คืน (คืนครึ่งราคา) — ขายตัวที่ระดับต่ำสุดก่อน เพื่อไม่ให้ผู้เล่นเสียตัวที่เลี้ยงมาดี
  function sellChicken(state) {
    const hens = window.Farm.animalsOf(state).filter(a => a.kind === 'chicken');
    if (!hens.length) return false;
    hens.sort((x, y) => (x.care || 0) - (y.care || 0));
    return window.Farm.sellAnimal(state, hens[0].uid);
  }

  // ไก่ออกไข่ตามเวลา — v4 เดินผ่าน animalTick ที่ครอบคลุมสัตว์ทุกชนิด
  function coopTick(state, step) { window.Farm.animalTick(state, step); }

  // เก็บไข่จากไก่ทุกตัว (คืน {n, g} — g รวมไข่ทอง เพื่อความเข้ากันได้กับ v2/v3)
  function collectEggs(state) {
    let n = 0, star = 0, g = 0;
    for (const a of window.Farm.animalsOf(state)) {
      if (a.kind !== 'chicken') continue;
      const p = window.Farm.pendingOf(state, a);
      n += p.n; star += p.star; g += p.golden;
      window.Farm.collectFrom(state, a);
    }
    if (n + star + g === 0) { emit(state, { text: 'ยังไม่มีไข่', kind: 'error' }); return null; }
    emit(state, { text: `🥚+${n + star}${g ? ' 🥇+' + g : ''}`, kind: 'harvest' });
    return { n: n + star, g, star };
  }

  // ขายไข่: kind = 'n' | 'star' | 'golden' | 'all'
  function sellEggs(state, kind = 'all') {
    const inv = state.inventoryEggs;
    const keys = kind === 'all' ? ['n', 'star', 'golden'] : [kind];
    const price = { n: D.EGG_SELL, star: Math.round(D.EGG_SELL * 1.6), golden: D.EGG_SELL * 3 };
    let sold = 0, got = 0;
    for (const k of keys) {
      const have = inv[k] || 0;
      if (have <= 0) continue;
      sold += have; got += price[k] * have; inv[k] = 0;
    }
    if (sold === 0) return 0;
    state.money += got;
    state.totals.earned += got;
    state.totals.sold += sold;
    return got;
  }

  // ---------- v2: ตราสะสม ----------
  function checkAchievements(state) {
    const unlocked = [];
    for (const a of D.ACHIEVEMENTS) {
      if (state.achievements.includes(a.id)) continue;
      try {
        if (a.test(state)) {
          state.achievements.push(a.id);
          state.money += 100; // รางวัล 100 ทุกตรา
          pushNews(state, `${a.icon} ตราสะสมใหม่: ${a.name}! (+100🪙)`);
          unlocked.push(a);
        }
      } catch (e) { /* เควสเก่าไม่มี field ใหม่ — ข้าม */ }
    }
    return unlocked;
  }

  // เดินเวลา n นาทีเกม (เรียกทุกวินาทีจริง: n=6) — ตัดเป็นก้อนไม่เกิน 1 ชม.
  function growTick(state, minutes) {
    let m = minutes;
    while (m > 0) {
      const step = Math.min(60, m);
      m -= step;
      const prevDay = state.day;
      state.clockMin += step;
      processHour(state, step);
      window.Farm.animalTick(state, step);
      while (state.clockMin >= 1440) {
        state.clockMin -= 1440;
        newDay(state);
      }
      if (state.day !== prevDay) window.Farm.checkQuests(state);
    }
    window.Farm.checkQuests(state);
    window.Farm.checkAchievements(state);
  }

  window.Farm = window.Farm || {};
  Object.assign(window.Farm, {
    newGame, till, plant, water, refillCan, useFertilizer, buyFertilizer,
    harvest, buyUpgrade, growTick, processHour, newDay,
    gridN, plotCapacity, plotUnlockPrice, isPlotUnlocked, purchasePlot,
    canCap, seasonOfDay, seasonMult, xpNeeded, titleOf, addXp, inv, pushNews, emit,
    TILL_FREE, PLOW_COST, FERT_COST, WATER_PER_USE, DRAIN_PER_HR, WILT_DEATH_MIN,
    START_UNLOCKED_PLOTS,
    // v2
    buyChicken, sellChicken, coopTick, collectEggs, sellEggs, checkAchievements,
  });
})();