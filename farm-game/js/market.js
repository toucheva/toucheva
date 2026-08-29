// ============ ฟาร์มมินิ — ตลาด: ราคาผันผวน ±25% ตามวัน (deterministic) ============
(() => {
  const MIN = 0.75, MAX = 1.25;

  // rollPrices(day) → { carrot: {px, mult}, ... } px = ราคาขายวันนี้ (ปัดเป็นจำนวนเต็ม)
  function rollPrices(day) {
    const D = window.Farm.DATA;
    const rnd = window.Farm.mulberry32(window.Farm.daySeed(day, 0x2222));
    const out = {};
    for (const key in D.CROPS) {
      const c = D.CROPS[key];
      const mult = MIN + rnd() * (MAX - MIN);
      out[key] = { px: Math.max(1, Math.round(c.sellBase * mult)), mult: Math.round(mult * 100) / 100 };
    }
    return out;
  }

  // ขาย inventory ชิ้นเดียว (นับ star แยก) — คืนจำนวนเงินที่ได้ (int)
  function sellItem(state, cropId, kind) {
    const D = window.Farm.DATA;
    const b = state.inventory[cropId];
    if (!b) return 0;
    const n = kind === 'star' ? (b.star || 0) : (b.n || 0);
    if (n <= 0) return 0;
    const c = D.CROPS[cropId];
    const base = state.market && state.market[cropId] ? state.market[cropId].px : c.sellBase;
    const gradeMult = kind === 'star' ? D.GRADES[1].mult : 1;
    const got = Math.round(base * gradeMult) * n;
    if (kind === 'star') b.star -= n; else b.n -= n;
    state.money += got;
    state.totals.earned += got;
    state.totals.sold += n;
    return got;
  }

  // ขายทั้งคลัง — คืนเงินรวม
  function sellAll(state) {
    let total = 0;
    const D = window.Farm.DATA;
    for (const cropId in state.inventory) {
      const b = state.inventory[cropId];
      total += sellItem(state, cropId, 'n');
      total += sellItem(state, cropId, 'star');
    }
    return total;
  }

  window.Farm = window.Farm || {};
  Object.assign(window.Farm, { rollPrices, sellItem, sellAll });
})();