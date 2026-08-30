import { CROPS } from './data/crops';
import { GameState, Tool, newGame } from './state';
import { load, save, clearSave } from './engine/save';
import { act, priceStorage } from './systems/farm';
import { endDay, rollCards, applyCard, DayReport } from './systems/day';
import { Juice } from './render/juice';
import { draw, tileAt, tileCenter, BOARD } from './render/board';
import { audio } from './audio/audio';
import * as hud from './ui/hud';

const canvas = document.getElementById('board') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width = BOARD;
canvas.height = BOARD;

let state: GameState = load() ?? newGame();
if (state.cardChoices.length === 0) state.cardChoices = rollCards(state).map((c) => c.id);

const juice = new Juice();
let hover: number | null = null;
let selected: number | null = null;

/** คอมโบ: ทำงานชนิดเดียวกันต่อเนื่องโดยไม่สลับเครื่องมือ */
let combo = 0;
let comboTool: Tool | null = null;

/** บัฟเฟอร์อินพุต 150 ms — คลิกระหว่างแอนิเมชันไม่หาย (สเปก 8.2) */
let buffered: { index: number; at: number } | null = null;
const BUFFER_MS = 150;

/** ลากค้างเพื่อทำงานต่อเนื่อง — หัวใจของความลื่นเวลาทำงาน 50 ช่องรวด */
let pointerDown = false;
let lastTile: number | null = null;
let repeatTimer = 0;
const REPEAT_INTERVAL = 0.11;

let lastLowStamina = false;

// ---------- การกระทำ ----------

function doAction(index: number): void {
  const tool = state.tool;
  const discount = hud.comboDiscount(comboTool === tool ? combo : 0);
  const before = state.stamina;
  const out = act(state, index, discount);
  const { x, y } = tileCenter(index);

  if (out.kind === 'none') {
    combo = 0;
    comboTool = null;
    audio.play('error');
    hud.setHint(out.reason);
    return;
  }

  // นับคอมโบเมื่อทำงานสำเร็จด้วยเครื่องมือเดิม
  if (comboTool === tool) combo++;
  else { comboTool = tool; combo = 1; }

  const spent = Math.round(before - state.stamina);

  switch (out.kind) {
    case 'till':
      audio.play('till');
      juice.burst(x, y, '#6d4c41', 7, { spread: 70 });
      juice.addShake(2.2);
      juice.pop(index, 0.8);
      juice.float(x, y - 6, `−${spent}`, '#c5b8a5', 12);
      break;
    case 'plant':
      audio.play('plant');
      juice.burst(x, y + 6, CROPS[out.cropId].leaf, 5, { spread: 45, gravity: 180 });
      juice.pop(index, 1.3);
      break;
    case 'water':
      audio.play('water');
      juice.burst(x, y - 4, '#64b5f6', 9, { spread: 60, gravity: 420, size: 2 });
      juice.pop(index, 0.5);
      break;
    case 'stake':
      audio.play('stake');
      juice.burst(x, y, '#a1887f', 4, { spread: 40 });
      juice.pop(index, 0.7);
      hud.setHint('ปักค้างแล้ว มะเขือเทศต้นนี้จะไม่ล้ม');
      break;
    case 'harvest':
      onHarvest(out.cropId, out.stars, out.n, out.again, x, y, index);
      break;
  }

  refresh();
}

function onHarvest(
  cropId: string, stars: number, n: number, again: boolean,
  x: number, y: number, index: number,
): void {
  const crop = CROPS[cropId];
  audio.play(`harvest-${crop.family}`);
  audio.play(`star${stars}`);

  const colors = ['', '#bdbdbd', '#a5d6a7', '#81d4fa', '#ce93d8', '#ffd54f'];
  const color = colors[stars];

  juice.burst(x, y, crop.fruit, 6 + stars * 3, { spread: 60 + stars * 20 });
  juice.pop(index, 1 + stars * 0.2);

  // ผัก 5 ดาวได้หยุดเวลา 40 ms — จังหวะที่ทำให้อยากได้อีก
  if (stars === 5) {
    juice.stop(0.04);
    juice.addShake(3.5);
    juice.burst(x, y, '#ffd54f', 16, { spread: 130, gravity: 200 });
  } else if (stars === 4) {
    juice.addShake(1.5);
  }

  const yieldText = n > 1 ? ` ×${n}` : '';
  juice.float(x, y - 10, `${'★'.repeat(stars)}${yieldText}`, color, 13 + stars);

  if (crop.verb === 'dig') {
    hud.setHint(`ขุดได้ ${n} หัว · ${hud.starLabel(stars)} — จำนวนหัวรู้ได้ตอนขุดเท่านั้น`);
  } else if (again) {
    const left = state.plots[index].crop?.ratoonLeft ?? 0;
    hud.setHint(`เก็บ${crop.name}ได้ ${hud.starLabel(stars)} · ต้นยังอยู่ เก็บได้อีก ${left + 1} รอบ`);
  } else {
    hud.setHint(`เก็บ${crop.name}ได้ ${hud.starLabel(stars)}`);
  }
}

function sellAll(): void {
  if (state.storage.length === 0) return;
  const { total } = priceStorage(state);
  for (const item of state.storage) {
    state.soldToday[item.cropId] = (state.soldToday[item.cropId] ?? 0) + item.n;
  }
  state.money += total;
  state.stats.earned += total;
  state.stats.bestDay = Math.max(state.stats.bestDay, total);
  state.storage = [];
  audio.play('coin');
  audio.play('confirm');
  hud.setHint(`ขายได้ ${total.toLocaleString('th-TH')} เหรียญ — ขายชนิดเดียวเยอะๆ ราคาจะตก ลองปลูกให้หลากหลาย`);
  refresh();
}

function buySeed(id: string): void {
  const crop = CROPS[id];
  if (state.money < crop.seedCost) { audio.play('error'); return; }
  state.money -= crop.seedCost;
  state.seeds[id] = (state.seeds[id] ?? 0) + 1;
  state.selectedSeed = id;
  audio.play('click');
  refresh();
}

function sleep(): void {
  const report = endDay(state);
  combo = 0;
  comboTool = null;
  audio.play('newday');
  save(state);
  openMorning(report);
  refresh();
}

function openMorning(report: DayReport | null): void {
  hud.showCards(state, (cardId) => {
    const card = applyCard(state, cardId);
    audio.play('confirm');
    hud.hideModal();
    if (card) hud.setHint(`${card.icon} ${card.title} — ${card.desc}`);
    save(state);
    refresh();
  }, report);
}

// ---------- อินพุต ----------

function canvasPos(e: PointerEvent): { x: number; y: number } {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}

canvas.addEventListener('pointerdown', (e) => {
  audio.unlock();
  canvas.setPointerCapture(e.pointerId);
  pointerDown = true;
  repeatTimer = 0;
  const { x, y } = canvasPos(e);
  const t = tileAt(x, y);
  if (t === null) return;
  lastTile = t;
  selected = t;
  buffered = { index: t, at: performance.now() };
});

canvas.addEventListener('pointermove', (e) => {
  const { x, y } = canvasPos(e);
  const t = tileAt(x, y);
  hover = t;
  if (t !== null && t !== selected) hud.renderPlot(state, t);
  // ลากผ่านช่องใหม่ = ทำงานที่ช่องนั้นทันที
  if (pointerDown && t !== null && t !== lastTile) {
    lastTile = t;
    selected = t;
    buffered = { index: t, at: performance.now() };
  }
});

const endPointer = () => { pointerDown = false; lastTile = null; };
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointerleave', () => { hover = null; });

window.addEventListener('keydown', (e) => {
  audio.unlock();
  const tool = hud.TOOLS.find((t) => t.key === e.key);
  if (tool) { pickTool(tool.id); return; }
  if (e.key === ' ') { e.preventDefault(); sleep(); }
});

function pickTool(t: Tool): void {
  if (state.tool !== t) { combo = 0; comboTool = null; }
  state.tool = t;
  audio.play('click');
  hud.syncToolbar(state);
  hud.setHint(
    t === 'seed'
      ? `กำลังจะปลูก${CROPS[state.selectedSeed].name} — ${CROPS[state.selectedSeed].verbHint}`
      : 'คลิกที่แปลง หรือลากค้างเพื่อทำงานต่อเนื่อง',
  );
}

document.getElementById('btn-sleep')!.addEventListener('click', () => { audio.unlock(); sleep(); });
document.getElementById('btn-sell')!.addEventListener('click', () => { audio.unlock(); sellAll(); });
document.getElementById('btn-mute')!.addEventListener('click', (e) => {
  audio.unlock();
  audio.setMuted(!audio.muted);
  (e.currentTarget as HTMLElement).textContent = audio.muted ? '🔇' : '🔊';
});
document.getElementById('btn-reset')!.addEventListener('click', () => {
  if (!confirm('เริ่มใหม่ทั้งหมด? ความคืบหน้าปัจจุบันจะหายไป')) return;
  clearSave();
  state = newGame();
  state.cardChoices = rollCards(state).map((c) => c.id);
  combo = 0;
  comboTool = null;
  openMorning(null);
  refresh();
});

// ---------- ลูปหลัก ----------

function refresh(): void {
  hud.renderTop(state, comboTool === state.tool ? combo : 0);
  hud.buildSeedList(state, (id) => {
    state.selectedSeed = id;
    state.tool = 'seed';
    audio.play('click');
    hud.syncToolbar(state);
    hud.setHint(`${CROPS[id].name} — ${CROPS[id].verbHint}`);
    refresh();
  }, buySeed);
  hud.renderStorage(state);
  hud.renderPlot(state, selected);
}

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // ประมวลผลอินพุตที่บัฟเฟอร์ไว้ ภายในหน้าต่าง 150 ms
  if (buffered) {
    if (now - buffered.at <= BUFFER_MS) {
      const idx = buffered.index;
      buffered = null;
      doAction(idx);
    } else {
      buffered = null;
    }
  }

  // กดค้างที่ช่องเดิม = ทำซ้ำเป็นจังหวะ
  if (pointerDown && lastTile !== null) {
    repeatTimer += dt;
    if (repeatTimer >= REPEAT_INTERVAL) {
      repeatTimer = 0;
      doAction(lastTile);
    }
  }

  const low = state.stamina / state.staminaMax < 0.15;
  if (low !== lastLowStamina) {
    lastLowStamina = low;
    audio.setLowStamina(low);
  }

  juice.update(dt);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw(ctx, state, juice, hover, now / 1000);
  requestAnimationFrame(frame);
}

// ---------- เริ่มเกม ----------

hud.buildToolbar(state, pickTool);
refresh();
if (!state.cardPicked) openMorning(null);
window.addEventListener('beforeunload', () => save(state));
window.setInterval(() => save(state), 15000);
requestAnimationFrame(frame);
