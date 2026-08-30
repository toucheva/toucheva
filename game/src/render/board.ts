import { CROPS } from '../data/crops';
import { GRID, GameState } from '../state';
import { Juice } from './juice';

export const TILE = 62;
export const PAD = 6;
export const BOARD = GRID * TILE + PAD * 2;

const SOIL_DRY = '#8d6e52';
const SOIL_WET = '#5f4632';
const GRASS = '#6b8f4e';
const GRASS_ALT = '#658a4a';

export function tileAt(px: number, py: number): number | null {
  const x = Math.floor((px - PAD) / TILE);
  const y = Math.floor((py - PAD) / TILE);
  if (x < 0 || x >= GRID || y < 0 || y >= GRID) return null;
  return y * GRID + x;
}

export function tileCenter(index: number): { x: number; y: number } {
  return {
    x: PAD + (index % GRID) * TILE + TILE / 2,
    y: PAD + Math.floor(index / GRID) * TILE + TILE / 2,
  };
}

export function draw(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  juice: Juice,
  hover: number | null,
  time: number,
): void {
  ctx.save();
  if (juice.shake > 0) {
    ctx.translate((Math.random() - 0.5) * juice.shake, (Math.random() - 0.5) * juice.shake);
  }

  ctx.fillStyle = '#3f5c33';
  ctx.fillRect(-8, -8, BOARD + 16, BOARD + 16);

  for (let i = 0; i < state.plots.length; i++) {
    const plot = state.plots[i];
    const x = PAD + (i % GRID) * TILE;
    const y = PAD + Math.floor(i / GRID) * TILE;
    const cx = x + TILE / 2;
    const cy = y + TILE / 2;
    const scale = juice.popScale(i);

    // พื้นดิน
    if (!plot.tilled) {
      ctx.fillStyle = (i + Math.floor(i / GRID)) % 2 === 0 ? GRASS : GRASS_ALT;
      ctx.fillRect(x, y, TILE - 2, TILE - 2);
      ctx.fillStyle = 'rgba(255,255,255,.05)';
      for (let g = 0; g < 3; g++) {
        ctx.fillRect(x + 8 + g * 15, y + 12 + ((i * 7 + g * 11) % 20), 2, 7);
      }
    } else {
      const wet = plot.moisture / 100;
      ctx.fillStyle = mix(SOIL_DRY, SOIL_WET, wet);
      ctx.fillRect(x, y, TILE - 2, TILE - 2);
      ctx.strokeStyle = 'rgba(0,0,0,.13)';
      ctx.lineWidth = 1;
      for (let r = 1; r < 4; r++) {
        ctx.beginPath();
        ctx.moveTo(x + 4, y + r * 14);
        ctx.lineTo(x + TILE - 6, y + r * 14);
        ctx.stroke();
      }
    }

    // แถบความอุดมของดิน มุมล่างซ้าย
    if (plot.tilled) {
      const f = plot.fertility / 100;
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.fillRect(x + 4, y + TILE - 9, 20, 4);
      ctx.fillStyle = f > 0.6 ? '#9ccc65' : f > 0.3 ? '#ffb74d' : '#e57373';
      ctx.fillRect(x + 4, y + TILE - 9, 20 * f, 4);
    }

    if (plot.crop) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      drawPlant(ctx, plot.crop.cropId, plot.crop.stage, plot.crop.ready, plot.crop.fallen, plot.crop.staked, time + i);
      ctx.restore();

      if (plot.crop.ready) {
        // วงแหวนกะพริบบอกว่าเก็บได้ — เห็นได้จากมุมตา ไม่ต้องเพ่ง
        const pulse = 0.55 + Math.sin(time * 4 + i) * 0.25;
        ctx.strokeStyle = `rgba(255, 236, 130, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, TILE - 6, TILE - 6);
      }
      if (plot.crop.dryDays > 0 && !plot.crop.ready) {
        ctx.fillStyle = '#ffcc80';
        ctx.font = '11px system-ui';
        ctx.fillText('!', x + TILE - 12, y + 14);
      }
    }

    if (hover === i) {
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, TILE - 4, TILE - 4);
    }
  }

  juice.drawParticles(ctx);
  juice.drawFloaters(ctx);
  ctx.restore();
}

function drawPlant(
  ctx: CanvasRenderingContext2D,
  cropId: string,
  stage: number,
  ready: boolean,
  fallen: boolean,
  staked: boolean,
  t: number,
): void {
  const crop = CROPS[cropId];
  const progress = Math.min(1, stage / crop.stages);
  const sway = Math.sin(t * 1.6) * 2 * progress;

  if (fallen) ctx.rotate(0.5);

  if (staked) {
    ctx.fillStyle = '#a1887f';
    ctx.fillRect(6, -18, 2, 32);
  }

  const h = 6 + progress * 20;
  ctx.fillStyle = crop.leaf;
  ctx.fillRect(-1 + sway * 0.3, 14 - h, 3, h);

  const leaves = 1 + Math.min(3, stage);
  for (let i = 0; i < leaves; i++) {
    const ly = 12 - (i + 1) * (h / (leaves + 1));
    const w = 5 + i * 2.5;
    const dir = i % 2 === 0 ? 1 : -1;
    ctx.beginPath();
    ctx.ellipse(dir * (w * 0.6) + sway, ly, w, 3.4, dir * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (ready) {
    ctx.fillStyle = crop.fruit;
    if (crop.family === 'root') {
      // พืชหัวไม่โชว์ผล — ต้องขุดถึงรู้ จึงวาดแค่พูนดิน
      ctx.fillStyle = '#6d4c41';
      ctx.beginPath();
      ctx.ellipse(0, 15, 12, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (crop.family === 'pod') {
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-6 + i * 5 + sway, 2 - i, 2.5, 11);
      }
    } else if (crop.family === 'leaf') {
      ctx.beginPath();
      ctx.arc(sway, 2, 9, 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + t * 0.2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 7 + sway, Math.sin(a) * 5 - 2, 3.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round((((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t));
  const g = Math.round((((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t));
  const bl = Math.round(((pa & 255) * (1 - t) + (pb & 255) * t));
  return `rgb(${r},${g},${bl})`;
}
