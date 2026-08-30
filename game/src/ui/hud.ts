import { CROPS, CROP_IDS, STAR_LABEL } from '../data/crops';
import { CARDS } from '../data/cards';
import { GameState, Tool } from '../state';
import { STAMINA_COST, priceStorage } from '../systems/farm';
import type { DayReport } from '../systems/day';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

/** ไอคอนวาดเป็น SVG แทนอิโมจิ เพราะอิโมจิหน้าตาต่างกันทุกระบบและคุมสไตล์ไม่ได้ */
const ICON: Record<Tool, string> = {
  hoe: '<path d="M3 17l6-6M9 11l3-3M12 8l4-4 4 4-4 4-4-4z"/>',
  seed: '<path d="M12 20V9M12 9c0-3 2-5 6-5 0 4-2 6-6 6zM12 12c0-2.6-1.8-4.5-5-4.5C7 11 9 13 12 13z"/>',
  water: '<path d="M12 3s6 6.6 6 10.4A6 6 0 1 1 6 13.4C6 9.6 12 3 12 3z"/>',
  harvest: '<path d="M4 10h16l-1.6 9.2a1.6 1.6 0 0 1-1.6 1.3H7.2a1.6 1.6 0 0 1-1.6-1.3L4 10zM8.5 10 11 3M15.5 10 13 3"/>',
  stake: '<path d="M9 21V5M9 5 6.5 2M9 9l6-2M9 14l6-2"/>',
};

const svg = (tool: Tool): string =>
  `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[tool]}</svg>`;

export const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: 'hoe', label: 'พรวนดิน', key: '1' },
  { id: 'seed', label: 'ปลูก', key: '2' },
  { id: 'water', label: 'รดน้ำ', key: '3' },
  { id: 'harvest', label: 'เก็บเกี่ยว', key: '4' },
  { id: 'stake', label: 'ปักค้าง', key: '5' },
];

export function buildToolbar(state: GameState, onPick: (t: Tool) => void): void {
  const el = $('tools');
  el.innerHTML = '';
  for (const t of TOOLS) {
    const b = document.createElement('button');
    b.className = 'tool';
    b.dataset.tool = t.id;
    b.innerHTML = `${svg(t.id)}<span class="lbl">${t.label}</span>
      <kbd>${t.key}</kbd><span class="cost">−${STAMINA_COST[t.id]}</span>`;
    b.addEventListener('click', () => onPick(t.id));
    el.appendChild(b);
  }
  syncToolbar(state);
}

export function syncToolbar(state: GameState): void {
  for (const b of Array.from(document.querySelectorAll<HTMLButtonElement>('.tool'))) {
    b.classList.toggle('on', b.dataset.tool === state.tool);
  }
}

export function buildSeedList(
  state: GameState,
  onSelect: (id: string) => void,
  onBuy: (id: string) => void,
): void {
  const el = $('seedlist');
  el.innerHTML = '';
  for (const id of CROP_IDS) {
    const crop = CROPS[id];
    const row = document.createElement('div');
    row.className = 'seed' + (state.selectedSeed === id ? ' on' : '');
    row.innerHTML = `<button class="nm" style="all:unset;cursor:pointer">${crop.name}</button>
      <span class="n">×${state.seeds[id] ?? 0}</span>`;
    row.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('buy')) return;
      onSelect(id);
    });
    const buy = document.createElement('button');
    buy.className = 'buy';
    buy.textContent = `ซื้อ ${crop.seedCost}`;
    buy.disabled = state.money < crop.seedCost;
    buy.addEventListener('click', (e) => { e.stopPropagation(); onBuy(id); });
    row.appendChild(buy);
    el.appendChild(row);
  }
}

export function renderTop(state: GameState, combo: number): void {
  $('stat-day').textContent = String(state.day);
  $('stat-money').textContent = state.money.toLocaleString('th-TH');
  $('stat-stamina').textContent = `${Math.max(0, Math.round(state.stamina))}/${state.staminaMax}`;
  const pct = Math.max(0, state.stamina / state.staminaMax);
  const fill = $<HTMLElement>('stamina-fill');
  fill.style.width = `${pct * 100}%`;
  fill.classList.toggle('low', pct < 0.15);

  const box = $('combo');
  if (combo >= 3) {
    box.hidden = false;
    $('combo-val').textContent = `×${combo} · −${Math.round(comboDiscount(combo) * 100)}%`;
  } else {
    box.hidden = true;
  }
}

/** คอมโบการทำงาน — ทำงานชนิดเดียวกันต่อเนื่อง ลด Stamina สูงสุด 25% */
export function comboDiscount(combo: number): number {
  if (combo < 3) return 0;
  return Math.min(0.25, 0.1 + (combo - 3) * 0.02);
}

export function renderPlot(state: GameState, index: number | null): void {
  const el = $('plot-info');
  if (index === null) {
    el.textContent = 'ชี้ที่แปลงเพื่อดูรายละเอียด';
    return;
  }
  const p = state.plots[index];
  const rows: string[] = [];
  rows.push(row('ความอุดม', `${Math.round(p.fertility)}/100`, p.fertility < 30 ? 'bad' : ''));
  rows.push(row('ความชื้น', `${Math.round(p.moisture)}/100`, p.moisture < 30 ? 'warn' : ''));

  if (!p.crop) {
    const last = p.history[0] ? CROPS[p.history[0]]?.name ?? '—' : '—';
    rows.push(row('ปลูกล่าสุด', last));
    el.innerHTML = `<div class="name">${p.tilled ? 'แปลงพรวนแล้ว ว่าง' : 'พื้นหญ้า ยังไม่พรวน'}</div>
      ${p.history.length >= 2 && p.history[0] === p.history[1]
        ? '<div class="verb" style="color:#ffb74d">ปลูกซ้ำชนิดเดิม คุณภาพจะลดลง ลองสลับพืช</div>' : ''}
      ${rows.join('')}`;
    return;
  }

  const crop = CROPS[p.crop.cropId];
  rows.push(row('ระยะ', `${p.crop.stage}/${crop.stages}${p.crop.ready ? ' · เก็บได้' : ''}`));
  if (crop.verb === 'stake') {
    rows.push(row('ค้ำยัน', p.crop.staked ? 'ปักแล้ว' : p.crop.fallen ? 'ล้มแล้ว' : 'ยังไม่ปัก',
      p.crop.fallen ? 'bad' : p.crop.staked ? '' : 'warn'));
  }
  if (crop.verb === 'ratoon') rows.push(row('เก็บได้อีก', `${p.crop.ratoonLeft + 1} รอบ`));
  if (p.crop.dryDays > 0) {
    rows.push(row('ขาดน้ำมา', `${p.crop.dryDays} วัน`, crop.verb === 'stress' ? 'warn' : 'bad'));
  }

  el.innerHTML = `<div class="name">${crop.name}</div>
    <div class="verb">${crop.verbHint}</div>${rows.join('')}
    <div class="row"><span>คุณภาพ</span><span>ยังไม่รู้ จนกว่าจะเก็บ</span></div>`;
}

function row(k: string, v: string, cls = ''): string {
  return `<div class="row"><span>${k}</span><span class="${cls}">${v}</span></div>`;
}

export function renderStorage(state: GameState): void {
  const el = $('storage');
  const btn = $<HTMLButtonElement>('btn-sell');
  if (state.storage.length === 0) {
    el.textContent = 'ยังไม่มีผลผลิต';
    btn.disabled = true;
    btn.textContent = 'ขายทั้งหมด';
    return;
  }
  const { lines, total } = priceStorage(state);
  el.innerHTML = state.storage
    .map((it, i) => `<div class="line"><span class="nm">${CROPS[it.cropId].name} ×${it.n}</span>
      <span class="st">${'★'.repeat(it.stars)}</span><span class="pr">${lines[i]}</span></div>`)
    .join('');
  btn.disabled = false;
  btn.textContent = `ขายทั้งหมด · ${total.toLocaleString('th-TH')}`;
}

export function showCards(
  state: GameState,
  onPick: (cardId: string) => void,
  report: DayReport | null,
): void {
  const overlay = $('overlay');
  const modal = $('modal');
  const choices = state.cardChoices
    .map((id) => CARDS.find((c) => c.id === id))
    .filter((c): c is (typeof CARDS)[number] => Boolean(c));

  const reportHtml = report
    ? `<div class="report">
        <div><div class="k">พืชที่โตขึ้น</div><div class="v good">${report.grown}</div></div>
        <div><div class="k">ต้นที่เหี่ยวตาย</div><div class="v ${report.withered ? 'bad' : ''}">${report.withered}</div></div>
        <div><div class="k">ต้นล้มเพราะไม่ได้ค้ำ</div><div class="v ${report.fallen ? 'bad' : ''}">${report.fallen}</div></div>
        <div><div class="k">พริกที่ได้เครียด</div><div class="v good">${report.stressed}</div></div>
      </div>`
    : '';

  modal.innerHTML = `<h2>เช้าวันที่ ${state.day}</h2>
    <p class="sub">เลือกหนึ่งอย่างสำหรับวันนี้ — ทุกวันเริ่มด้วยการตัดสินใจ ไม่ใช่เริ่มด้วยงานบ้าน</p>
    ${reportHtml}
    <div class="cards">
      ${choices.map((c) => `<button class="card" data-card="${c.id}">
        <span class="ico">${c.icon}</span><span class="t">${c.title}</span><span class="d">${c.desc}</span>
      </button>`).join('')}
    </div>`;

  for (const b of Array.from(modal.querySelectorAll<HTMLButtonElement>('[data-card]'))) {
    b.addEventListener('click', () => onPick(b.dataset.card!));
  }
  overlay.hidden = false;
}

export function hideModal(): void {
  $('overlay').hidden = true;
}

export function setHint(text: string): void {
  $('hint').textContent = text;
}

export function starLabel(stars: number): string {
  return STAR_LABEL[stars];
}
