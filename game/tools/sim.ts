/**
 * เครื่องมือจำลองสมดุล — เล่นเกมอัตโนมัติด้วยกลยุทธ์ต่างๆ แล้วรายงานผล
 * ใช้จับปัญหาสมดุลโดยไม่ต้องนั่งเล่นเอง และตรวจว่ากริยาของพืชทำงานจริง
 *
 *   npm run sim
 */
import { CROPS } from '../src/data/crops';
import { GameState, newGame } from '../src/state';
import { act, priceStorage, STAMINA_COST } from '../src/systems/farm';
import { endDay, rollCards, applyCard } from '../src/systems/day';

type Strategy = { name: string; crops: string[]; stake: boolean; waterAll: boolean };

const STRATEGIES: Strategy[] = [
  { name: 'ผักกาดขาวล้วน (ปลูกซ้ำที่เดิม)', crops: ['napa'], stake: true, waterAll: true },
  { name: 'หมุนเวียนพืช 3 ชนิด', crops: ['napa', 'bean', 'lettuce'], stake: true, waterAll: true },
  { name: 'เน้นของแพง มะเขือเทศ+พริก', crops: ['tomato', 'chili'], stake: true, waterAll: true },
  { name: 'ของแพงแต่ลืมปักค้าง', crops: ['tomato', 'chili'], stake: false, waterAll: true },
  { name: 'รดน้ำไม่ครบ (ดูแลครึ่งเดียว)', crops: ['napa', 'bean'], stake: true, waterAll: false },
];

const DAYS = 40;
const PLOTS = 16; // ใช้ 16 แปลงแรก ให้พอดีกับพลังงานต่อวัน

function runSim(strat: Strategy) {
  const state: GameState = newGame(12345);
  state.cardChoices = rollCards(state).map((c) => c.id);
  for (const id of Object.keys(CROPS)) state.seeds[id] = 9999; // ตัดตัวแปรเรื่องเงินทุนออก

  const stars: number[] = [0, 0, 0, 0, 0, 0];
  const income: number[] = [];
  let withered = 0;
  let fallen = 0;
  let harvests = 0;
  let cropCursor = 0;

  for (let day = 0; day < DAYS; day++) {
    applyCard(state, state.cardChoices[0]);

    // เก็บเกี่ยวก่อน
    state.tool = 'harvest';
    for (let i = 0; i < PLOTS; i++) {
      if (state.plots[i].crop?.ready) {
        const out = act(state, i, 0);
        if (out.kind === 'harvest') { stars[out.stars]++; harvests += out.n; }
      }
    }

    // พรวน + ปลูก แปลงที่ว่าง
    for (let i = 0; i < PLOTS; i++) {
      const p = state.plots[i];
      if (p.crop) continue;
      if (state.stamina < STAMINA_COST.hoe + STAMINA_COST.seed) break;
      if (!p.tilled) { state.tool = 'hoe'; act(state, i, 0); }
      state.tool = 'seed';
      state.selectedSeed = strat.crops[cropCursor++ % strat.crops.length];
      act(state, i, 0);
    }

    // ปักค้างให้พืชที่ต้องการ
    if (strat.stake) {
      state.tool = 'stake';
      for (let i = 0; i < PLOTS; i++) {
        const c = state.plots[i].crop;
        if (c && CROPS[c.cropId].verb === 'stake' && !c.staked && state.stamina >= 2) act(state, i, 0);
      }
    }

    // รดน้ำ
    state.tool = 'water';
    for (let i = 0; i < PLOTS; i++) {
      if (!strat.waterAll && i % 2 === 1) continue;
      const p = state.plots[i];
      // พริกได้ประโยชน์จากการขาดน้ำหนึ่งวัน จึงเว้นให้ตอนใกล้โต
      if (p.crop && CROPS[p.crop.cropId].verb === 'stress' && p.crop.stage === CROPS[p.crop.cropId].stages - 1) continue;
      if (p.crop && state.stamina >= 2) act(state, i, 0);
    }

    const { total } = priceStorage(state);
    for (const item of state.storage) {
      state.soldToday[item.cropId] = (state.soldToday[item.cropId] ?? 0) + item.n;
    }
    state.money += total;
    state.storage = [];
    income.push(total);

    const report = endDay(state);
    withered += report.withered;
    fallen += report.fallen;
  }

  const totalStars = stars.reduce((a, b) => a + b, 0) || 1;
  const avgFert = state.plots.slice(0, PLOTS).reduce((a, p) => a + p.fertility, 0) / PLOTS;

  return {
    money: state.money,
    perDay: Math.round(income.reduce((a, b) => a + b, 0) / DAYS),
    stars,
    starPct: stars.map((n) => Math.round((n / totalStars) * 100)),
    withered, fallen, harvests,
    avgFert: Math.round(avgFert),
  };
}

console.log(`\nจำลอง ${DAYS} วัน · ${PLOTS} แปลง · seed คงที่\n${'='.repeat(74)}`);
for (const s of STRATEGIES) {
  const r = runSim(s);
  console.log(`\n▸ ${s.name}`);
  console.log(`  เงินสุดท้าย ${r.money.toLocaleString('th-TH').padStart(9)}   รายได้เฉลี่ย/วัน ${String(r.perDay).padStart(6)}`);
  console.log(`  เก็บเกี่ยว ${String(r.harvests).padStart(4)} ชิ้น   เหี่ยวตาย ${r.withered}   ต้นล้ม ${r.fallen}   ความอุดมดินเหลือ ${r.avgFert}/100`);
  console.log(`  การกระจายดาว  1★ ${r.starPct[1]}%  2★ ${r.starPct[2]}%  3★ ${r.starPct[3]}%  4★ ${r.starPct[4]}%  5★ ${r.starPct[5]}%`);
}
console.log(`\n${'='.repeat(74)}`);
console.log('สิ่งที่ต้องเห็น: หมุนเวียนพืชต้องชนะปลูกซ้ำ · ลืมปักค้างต้องเสียดาวจริง · ดินต้องเสื่อมเมื่อปลูกซ้ำ');

// การจำลองต้องกำหนดผลได้ — seed เดิมต้องได้ผลเดิมทุกครั้ง ไม่งั้นสถาปัตยกรรมพัง
const a = JSON.stringify(runSim(STRATEGIES[1]));
const b = JSON.stringify(runSim(STRATEGIES[1]));
if (a !== b) {
  console.error('\n✗ การจำลองไม่กำหนดผล — มี Math.random() หลุดเข้าไปในตรรกะเกม');
  throw new Error('sim not deterministic');
}
console.log('✓ การจำลองกำหนดผลได้ — seed เดิมให้ผลเดิมทุกครั้ง\n');
