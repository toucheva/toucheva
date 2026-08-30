import { ITEMS } from '../data/items';
import { GameState, XP_PER_LEVEL } from '../state';
import { canDeliver, countOnBoard } from '../systems/orders';
import { energyPrice, secondsToNext } from '../systems/energy';
import { drawItem } from '../render/items';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

/** วาดไอคอนไอเทมลงแคนวาสเล็กสำหรับใช้ในยูไอ ใช้ศิลป์ชุดเดียวกับบนกระดาน */
const iconCache = new Map<string, string>();
export function itemIcon(itemId: string, size = 34): string {
  const key = `${itemId}@${size}`;
  const hit = iconCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  c.width = size * dpr;
  c.height = size * dpr;
  const ctx = c.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.translate(size / 2, size / 2);
  const s = size / 52;
  ctx.scale(s, s);
  drawItem(ctx, itemId, 0);
  const url = c.toDataURL();
  iconCache.set(key, url);
  return url;
}

export function renderTop(state: GameState, now: number): void {
  $('stat-coins').textContent = state.coins.toLocaleString('th-TH');
  $('stat-level').textContent = String(state.level);
  $('stat-energy').textContent = `${state.energy}/${state.energyMax}`;

  const ePct = state.energy / state.energyMax;
  const eFill = $<HTMLElement>('energy-fill');
  eFill.style.width = `${ePct * 100}%`;
  eFill.classList.toggle('low', ePct < 0.2);

  const secs = secondsToNext(state, now);
  $('energy-timer').textContent = state.energy >= state.energyMax ? 'เต็ม' : `+1 ใน ${secs} วิ`;

  const need = XP_PER_LEVEL(state.level);
  $<HTMLElement>('xp-fill').style.width = `${Math.min(100, (state.xp / need) * 100)}%`;
  $('stat-xp').textContent = `${state.xp}/${need}`;

  const buy = $<HTMLButtonElement>('btn-energy');
  const price = energyPrice(state);
  buy.textContent = `เติมพลังงาน ${price}`;
  buy.disabled = state.coins < price || state.energy >= state.energyMax;
}

export function renderOrders(state: GameState, onDeliver: (id: string) => void): void {
  const el = $('orders');
  el.innerHTML = '';
  for (const order of state.orders) {
    const ready = canDeliver(state, order);
    const card = document.createElement('div');
    card.className = 'order' + (ready ? ' ready' : '');
    card.innerHTML = `
      <div class="who">${order.npc}</div>
      <div class="wants">${order.want.map((w) => {
        const have = countOnBoard(state, w.itemId);
        const ok = have >= w.n;
        return `<span class="want ${ok ? 'ok' : ''}" title="${ITEMS[w.itemId].name}">
          <img src="${itemIcon(w.itemId, 30)}" alt="${ITEMS[w.itemId].name}" width="30" height="30">
          <b>${Math.min(have, w.n)}/${w.n}</b></span>`;
      }).join('')}</div>
      <div class="reward"><span class="c">+${order.coins}</span><span class="x">+${order.xp} xp</span></div>`;
    const btn = document.createElement('button');
    btn.className = 'deliver' + (ready ? ' primary' : '');
    btn.textContent = ready ? 'ส่งของ' : 'ยังไม่ครบ';
    btn.disabled = !ready;
    btn.addEventListener('click', () => onDeliver(order.id));
    card.appendChild(btn);
    el.appendChild(card);
  }
}

export function renderCodex(state: GameState): void {
  const el = $('codex');
  const found = state.discovered.length;
  el.innerHTML = `<div class="codexline">ค้นพบแล้ว <b>${found}</b> ชนิด ·
    รวมร่างไป <b>${state.stats.merges}</b> ครั้ง · ถางที่ <b>${state.stats.cleared}</b> จุด</div>
    <div class="chips">${state.discovered.slice(-10).reverse().map((id) =>
      `<img class="chip" src="${itemIcon(id, 28)}" title="${ITEMS[id]?.name ?? id}" alt="${ITEMS[id]?.name ?? id}" width="28" height="28">`,
    ).join('')}</div>`;
}

export function setHint(text: string): void {
  $('hint').textContent = text;
}

export function toast(text: string): void {
  const el = $('toast');
  el.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}
