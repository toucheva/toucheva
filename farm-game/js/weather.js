// ============ ฟาร์มมินิ — สภาพอากาศ (deterministic ตามวัน เทสต์ซ้ำได้) ============
(() => {
  // mulberry32: PRNG เร็ว พอใช้งาน
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  }

  function daySeed(day, salt) {
    const D = window.Farm.DATA;
    return (D.APP_SEED ^ Math.imul(day, 0x9E3779B9) ^ (salt || 0)) >>> 0;
  }

  // สุ่มอากาศของวัน day (เรียกตอนขึ้นวันใหม่)
  function rollWeather(day) {
    const D = window.Farm.DATA;
    const r = mulberry32(daySeed(day, 0x1111))();
    let acc = 0;
    for (const [key, p] of D.WEATHER_ODDS) {
      acc += p;
      if (r < acc) return key;
    }
    return 'sunny';
  }

  // พายุ: แต่ละแปลงที่มีต้นไม้ โดน 10% — ใช้ rng ตัวเดียวกันตาม seed วัน
  function rollStormDamage(state) {
    const D = window.Farm.DATA;
    const rnd = mulberry32(daySeed(state.day, 0x3333));
    let hit = 0;
    for (const p of state.plots) {
      if (p.state === 'planted' || p.state === 'ready') {
        if (rnd() < D.WEATHERS.storm.damageChance) {
          p.state = 'soil'; p.crop = null; p.growthMin = 0; p.fert = false; p.regrowLeft = 0; p.wiltMin = 0;
          hit++;
        }
      }
    }
    return hit;
  }

  window.Farm = window.Farm || {};
  Object.assign(window.Farm, { mulberry32, daySeed, rollWeather, rollStormDamage });
})();