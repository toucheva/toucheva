// ============ ฟาร์มมินิ v3.1 — UI + Tool Cursor + VFX ============
(() => {
  const D = window.Farm.DATA;
  const $ = id => document.getElementById(id);

  let state = null;
  let selectedTool = 'till';
  let selectedSeed = 'carrot';

  // ---------- เสียง ----------
  let audioCtx = null;
  let soundOn = true;
  function beep(freq, dur = 0.08, type = 'square', vol = 0.05) {
    if (!soundOn) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.type = type; o.frequency.value = freq;
      g.gain.value = vol;
      o.start(); o.stop(audioCtx.currentTime + dur);
      g.gain.setValueAtTime(vol, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    } catch (e) {}
  }
  const sfx = {
    till:    () => beep(150, .09, 'sawtooth', .04),
    plant:   () => beep(520, .07, 'triangle', .05),
    water:   () => beep(660, .12, 'sine', .04),
    harvest: () => { beep(700, .07); setTimeout(() => beep(880, .09), 70); },
    quest:   () => { beep(660, .09); setTimeout(() => beep(830, .09), 90); setTimeout(() => beep(990, .12), 180); },
    level:   () => { beep(520, .08); setTimeout(() => beep(650, .08), 80); setTimeout(() => beep(780, .1), 160); setTimeout(() => beep(1040, .15), 240); },
    error:   () => beep(180, .12, 'sawtooth', .05),
    coin:    () => { beep(900, .06); setTimeout(() => beep(1200, .08), 60); },
    egg:     () => { beep(1100, .05, 'sine'); setTimeout(() => beep(1400, .06, 'sine'), 50); },
    golden:  () => { [880,1100,1320,1760].forEach((f,i) => setTimeout(() => beep(f, .1, 'triangle'), i*90)); },
  };

  // ---------- Toast / float / confetti ----------
  function toast(msg, cls = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + cls; t.textContent = msg;
    $('toasts').appendChild(t);
    setTimeout(() => t.remove(), 3400);
  }
  function floatOnPlot(i, text) {
    const el = document.querySelector(`.plot[data-i="${i}"]`);
    if (!el) return;
    const f = document.createElement('div');
    f.className = 'float-text'; f.textContent = text;
    el.appendChild(f);
    setTimeout(() => f.remove(), 1100);
  }
  function confetti(n = 26) {
    const emos = ['🎉', '✨', '🌟', '⭐', '🎊', '💛'];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.textContent = emos[Math.floor(Math.random() * emos.length)];
      c.style.left = Math.random() * 100 + 'vw';
      c.style.animationDuration = (2 + Math.random() * 2) + 's';
      c.style.fontSize = 12 + Math.random() * 14 + 'px';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 4200);
    }
  }
  // เอฟเฟกต์อนุภาคเฉพาะจุด — ไม่รบกวนสายตาและทำงานเฉพาะตอนกระทำ/พืชโต
  const FX_ICONS = {
    plant: ['🌱','·','✨'], water: ['💧','💦','◌'], harvest: ['✨','🍃','✦'],
    grow: ['🍃','✨','🌿'], unlock: ['✨','🔓','🪙'], fert: ['✨','🌱','✦'],
    gold: ['⭐','✦','💛','✨'], dig: ['·','◆','▪']
  };
  function plotEffect(i, kind = 'grow', count = 10) {
    const el = document.querySelector(`.plot[data-i="${i}"]`);
    if (!el) return;
    const icons = FX_ICONS[kind] || FX_ICONS.grow;
    for (let n = 0; n < count; n++) {
      const p = document.createElement('i');
      p.className = `plot-particle fx-${kind}`;
      p.textContent = icons[n % icons.length];
      p.style.setProperty('--dx', `${Math.round((Math.random() - .5) * 110)}px`);
      p.style.setProperty('--dy', `${-28 - Math.round(Math.random() * 75)}px`);
      p.style.setProperty('--rot', `${Math.round((Math.random() - .5) * 280)}deg`);
      p.style.animationDelay = `${Math.random() * .12}s`;
      el.appendChild(p); setTimeout(() => p.remove(), 1250);
    }
  }
  function screenFlash(kind = 'gold') {
    const f = document.createElement('div'); f.className = `screen-flash flash-${kind}`;
    document.body.appendChild(f); setTimeout(() => f.remove(), 800);
  }

  // ---------- ฉากวัน/คืน + เอฟเฟกต์อากาศ ----------
  function timePhase(clockMin) {
    if (clockMin < 5 * 60 || clockMin >= 20 * 60) return 'night';
    if (clockMin < 7 * 60) return 'dawn';
    if (clockMin < 17 * 60) return 'day';
    return 'dusk';
  }
  let lastPhase = '', lastFxWeather = '', weatherNodes = [];
  function renderScene() {
    const phase = timePhase(state.clockMin);
    if (phase !== lastPhase) {
      lastPhase = phase;
      document.body.className = 'time-' + phase;
      $('celestial').textContent = phase === 'night' ? '🌙' : phase === 'day' ? '☀️' : '🌅';
      // เสียงเปลี่ยนช่วงเวลา
      if (window.Farm.Sound) window.Farm.Sound.play(phase === 'night' ? 'night' : 'day');
      // ไก่ชนขันตอนเช้า (05:00-07:00) ถ้ามีไก่
      if (phase === 'dawn' && state.coop.count > 0 && window.Farm.Sound) {
        setTimeout(() => window.Farm.Sound.play('rooster'), 400);
      }
    }
    // ฉากหลังฟาร์ม (ครั้งเดียว)
    const sc = $('scenery');
    if (sc && !sc.dataset.init) {
      sc.dataset.init = '1';
      sc.innerHTML = window.Farm.ART.scenery();
    }
    // เมฆ (ครั้งเดียว)
    const cl = $('clouds');
    if (cl && !cl.dataset.init) {
      cl.dataset.init = '1';
      cl.innerHTML = window.Farm.ART.cloudHTML();
    }
    // เพลงสลับอัตโนมัติตามฤดู เวลา และสภาพอากาศ
    if (window.Farm.Sound) window.Farm.Sound.setMusicContext(state.season, phase, state.weather);
    if (state.weather !== lastFxWeather) {
      lastFxWeather = state.weather;
      if (window.Farm.Sound) {
        if (state.weather === 'storm') { window.Farm.Sound.play('thunder'); screenFlash('lightning'); }
        else if (state.weather === 'drought') window.Farm.Sound.play('wind');
      }
      // ล้างของเก่า
      weatherNodes.forEach(n => n.remove()); weatherNodes = [];
      const layer = $('weather-layer');
      if (state.weather === 'rain' || state.weather === 'storm') {
        const count = state.weather === 'storm' ? 70 : 40;
        for (let i = 0; i < count; i++) {
          const d = document.createElement('div');
          d.className = 'raindrop';
          d.style.left = Math.random() * 100 + 'vw';
          d.style.animationDuration = (0.5 + Math.random() * 0.4) + 's';
          d.style.animationDelay = (Math.random() * 1) + 's';
          layer.appendChild(d); weatherNodes.push(d);
        }
        if (state.weather === 'storm') {
          layer.style.background = 'rgba(10,15,35,.22)';
        }
      } else if (state.weather === 'drought') {
        const h = document.createElement('div');
        h.className = 'heatwave'; layer.appendChild(h); weatherNodes.push(h);
      } else if (state.weather === 'sunny' && document.body.classList.contains('time-day')) {
        const s = document.createElement('div');
        s.className = 'sunbeam'; layer.appendChild(s); weatherNodes.push(s);
      }
      if (state.weather !== 'storm') $('weather-layer').style.background = '';
    }
  }

  // ---------- Tooltip แปลง ----------
  function tooltipHTML(p, i) {
    const rows = [];
    if (!window.Farm.isPlotUnlocked(state, i)) {
      const next = i === state.unlockedPlots;
      return next
        ? `<b>🔓 แปลงถัดไป</b><br>ราคา ${window.Farm.plotUnlockPrice(state)}🪙<br>คลิกเพื่อซื้อพื้นที่`
        : `<b>🔒 แปลงที่ ${i + 1}</b><br>ต้องปลดล็อกตามลำดับ`;
    }
    const states = { grass: '🌿 หญ้ารก (คลิกเพื่อถาก)', soil: '🟫 ดินพร้อมปลูก', planted: '🌱 กำลังโต', ready: '✨ พร้อมเก็บเกี่ยว!', dead: '🥀 ต้นตาย' };
    if (p.state === 'planted' || p.state === 'ready') {
      const c = D.CROPS[p.crop];
      const pct = Math.min(100, Math.round((p.growthMin / c.growMin) * 100));
      rows.push(`<b>${c.emoji} ${c.name}</b> ${pct}%`);
      rows.push(`โตอีก ${Math.max(0, Math.ceil((c.growMin - p.growthMin) / 60))} ชม.เกม`);
      rows.push(`💧 ความชื้น ${Math.round(p.moisture)}%`);
      if (!p.neverDry && p.state === 'planted') rows.push('⚠️ เคยขาดน้ำ → จะไม่ได้ ⭐');
      if (p.fert) rows.push('💩 มีปุ๋ย (โตเร็ว 25%)');
      if (c.regrowH) rows.push(`♻️ เก็บซ้ำได้อีก ${p.regrowLeft} รอบ`);
    } else {
      rows.push(states[p.state] || p.state);
    }
    return rows.join('<br>');
  }
  function bindTooltip() {
    const tt = $('tooltip');
    if (tt) tt.style.display = 'none'; // v3.1 ใช้แถบข้อมูล ไม่มีกล่องลอยบังต้นผัก
    const info = $('plot-info-text');
    $('grid').addEventListener('mousemove', e => {
      const el = e.target.closest('.plot');
      if (!el || !info) return;
      const i = +el.dataset.i;
      const p = state.plots[i];
      if (!p) return;
      info.innerHTML = tooltipHTML(p, i).replaceAll('<br>', ' <span class="info-dot">•</span> ');
      $('plot-info').classList.add('has-info');
    });
    $('grid').addEventListener('mouseleave', () => {
      if (info) info.textContent = 'ชี้เมาส์บนแปลงเพื่อดูรายละเอียด';
      $('plot-info')?.classList.remove('has-info');
    });
  }

  // ---------- Tool Cursor + ภาพ Preview ตามเครื่องมือ ----------
  const TOOL_CURSOR = {
    till: ['🪓','ถาก/ไถ'], plant: ['🌱','หว่านเมล็ด'], water: ['💧','รดน้ำ'],
    harvest: ['🧺','เก็บเกี่ยว'], fert: ['💩','ใส่ปุ๋ย'], fill: ['🪣','เติมน้ำ']
  };
  function cursorInfo() {
    if (selectedTool === 'plant') {
      const c = D.CROPS[selectedSeed];
      return [c ? c.emoji : '🌱', c ? `ปลูก${c.name}` : 'หว่านเมล็ด'];
    }
    return TOOL_CURSOR[selectedTool] || ['👆','เลือก'];
  }
  function updateToolCursor() {
    const [icon, name] = cursorInfo();
    const cur = $('tool-cursor');
    if (!cur) return;
    $('tool-cursor-icon').textContent = icon;
    $('tool-cursor-name').textContent = name;
    cur.dataset.tool = selectedTool;
    document.documentElement.dataset.activeTool = selectedTool;
  }
  function bindToolCursor() {
    const cur = $('tool-cursor');
    if (!cur || cur.dataset.bound) return;
    cur.dataset.bound = '1'; updateToolCursor();
    document.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const overFarm = !!e.target.closest('#farm-wrap');
      cur.classList.toggle('show', overFarm);
      cur.style.transform = `translate3d(${e.clientX + 16}px,${e.clientY + 15}px,0)`;
      document.querySelectorAll('.plot.cursor-target').forEach(p => {
        p.classList.remove('cursor-target'); p.querySelector('.tool-preview')?.remove();
      });
      const plot = e.target.closest('.plot');
      if (plot && overFarm) {
        plot.classList.add('cursor-target');
        const [icon] = cursorInfo();
        const preview = document.createElement('span'); preview.className = 'tool-preview'; preview.textContent = icon;
        plot.appendChild(preview);
      }
    });
    document.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) {
        cur.classList.add('cursor-click'); setTimeout(() => cur.classList.remove('cursor-click'), 160);
      }
    });
    document.addEventListener('mouseleave', () => cur.classList.remove('show'));
  }

  // ---------- Sparkline ----------
  function sparkline(hist, color = '#b07d10') {
    if (!hist || hist.length < 2) return '';
    const w = 54, h = 18;
    const min = Math.min(...hist), max = Math.max(...hist);
    const range = max - min || 1;
    const pts = hist.map((v, i) => `${(i / (hist.length - 1)) * w},${h - ((v - min) / range) * (h - 2) - 1}`).join(' ');
    const lastUp = hist[hist.length - 1] >= hist[0];
    const stroke = lastUp ? '#2e8b3d' : '#c0392b';
    return `<svg class="sparkline" width="${w}" height="${h}"><polyline points="${pts}" fill="none" stroke="${stroke}" stroke-width="2"/></svg>`;
  }

  // ---------- Grid ----------
  function stageOf(p) {
    if (p.state !== 'planted') return 3;
    const c = D.CROPS[p.crop];
    const r = p.growthMin / c.growMin;
    if (r < 0.25) return 0;
    if (r < 0.55) return 1;
    if (r < 1) return 2;
    return 3;
  }
  function renderGrid() {
    const grid = $('grid');
    const ART = window.Farm.ART;
    const n = window.Farm.gridN(state);
    const capacity = n * n;
    // แสดงพื้นที่ตามความก้าวหน้า: แปลงที่เปิดแล้ว + ช่องซื้อถัดไปเพียง 1 ช่อง
    // ช่วยให้เกมเริ่มเล็กจริง ไม่ถูกช่องล็อกหลายสิบช่องครอบงำ
    const visibleCount = Math.min(capacity, Math.max(3, state.unlockedPlots + (state.unlockedPlots < capacity ? 1 : 0)));
    const cols = Math.min(n, visibleCount);
    grid.className = `progressive-grid cols-${cols}`;
    grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    if (grid.children.length !== visibleCount) {
      grid.innerHTML = '';
      for (let i = 0; i < visibleCount; i++) {
        const d = document.createElement('div');
        d.className = 'plot'; d.dataset.i = i;
          d.innerHTML = '<div class="plot-body"></div>';
        d.addEventListener('click', () => window.Farm.onPlotClick(i));
        grid.appendChild(d);
      }
    }
    for (let i = 0; i < visibleCount; i++) {
      const p = state.plots[i];
      const el = grid.children[i];
      const body = el.firstElementChild;
      const locked = !window.Farm.isPlotUnlocked(state, i);
      // เงินอยู่ใน key เฉพาะแปลงที่ยังล็อก (ป้ายราคา/ซื้อไหวหรือไม่ ขึ้นกับเงิน)
      // แปลงที่เปิดแล้วไม่ต้องวาดใหม่ทุกครั้งที่เงินขยับ — ลดการ re-render ทั้งกริดลงมาก
      const key = `${p.unlocked !== false ? 1 : 0}|${p.state}|${p.crop}|${p.growthMin | 0}|${p.moisture | 0}|${p.fert ? 1 : 0}|${p.neverDry ? 1 : 0}|${state.unlockedPlots}|${locked ? state.money : ''}`;
      if (el.dataset.key === key) continue;
      el.dataset.key = key;
      if (!window.Farm.isPlotUnlocked(state, i)) {
        const isNext = i === state.unlockedPlots;
        const price = window.Farm.plotUnlockPrice(state);
        el.className = 'plot locked' + (isNext ? ' next-unlock' : ' future-lock');
        body.innerHTML = ART.tileSVG('grass', i) +
          `<div class="lock-shade"></div>` +
          `<div class="plot-lock-icon">${isNext ? '🔓' : '🔒'}</div>` +
          `<div class="plot-lock-label">${isNext ? `${price} 🪙` : `แปลง ${i + 1}`}</div>` +
          (isNext ? '<div class="plot-lock-hint">คลิกเพื่อซื้อ</div>' : '');
      } else if (p.state === 'grass') {
        el.className = 'plot grass'; body.innerHTML = ART.tileSVG('grass', i);
      } else if (p.state === 'soil') {
        el.className = 'plot soil' + (p.moisture > 40 ? ' wet' : '');
        body.innerHTML = ART.tileSVG(p.moisture > 40 ? 'wet' : 'soil', i) + moistureBar(p.moisture);
      } else if (p.state === 'planted' || p.state === 'ready') {
        const c = D.CROPS[p.crop];
        const st = p.state === 'ready' ? 3 : stageOf(p);
        const previousStage = el.dataset.stage;
        const stageChanged = previousStage !== undefined && previousStage !== String(st);
        el.dataset.stage = String(st);
        const wilting = p.state === 'planted' && p.wiltMin > 120 ? ' wilting' : '';
        el.className = 'plot planted' + (p.state === 'ready' ? ' ready' : '') + (p.moisture > 40 ? ' wet' : '') + wilting + (stageChanged ? ' growth-pop' : '');
        body.innerHTML = ART.tileSVG(p.moisture > 40 ? 'wet' : 'soil', i) +
          `<span class="sprout">${ART.cropSVG(p.crop, st)}</span>` +
          (p.fert ? '<span class="fert">💩</span>' : '') +
          (p.state === 'ready' && p.neverDry ? '<span class="star">⭐</span>' : '') +
          moistureBar(p.moisture);
        if (stageChanged) {
          setTimeout(() => el.classList.remove('growth-pop'), 650);
          setTimeout(() => plotEffect(i, st === 3 ? 'gold' : 'grow', st === 3 ? 16 : 9), 30);
          if (window.Farm.Sound) window.Farm.Sound.play(st === 3 ? 'ready' : 'grow');
        }
      } else {
        el.className = 'plot dead';
        body.innerHTML = ART.tileSVG('wet', i) + `<span class="deadmark">🥀</span>`;
      }
    }
  }
  function moistureBar(m) {
    return `<div class="moistbar"><div style="width:${m}%"></div></div>`;
  }

  // ---------- Top bar / sidebar ----------
  function renderTop() {
    $('ui-money').textContent = state.money.toLocaleString('th-TH');
    $('ui-day').textContent = `วันที่ ${state.day}`;
    const season = D.SEASONS[state.season];
    $('ui-season').textContent = `${season.emoji} ${season.name}`;
    $('ui-weather').textContent = `${D.WEATHERS[state.weather].emoji} ${D.WEATHERS[state.weather].name}`;
    const tw = state.tomorrowWeather ? D.WEATHERS[state.tomorrowWeather] : null;
    $('ui-forecast').textContent = tw ? `${tw.emoji} ${tw.name}` : '…';
    const h = Math.floor(state.clockMin / 60), m = state.clockMin % 60;
    $('ui-clock').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    $('ui-level').textContent = state.level;
    $('ui-title').textContent = window.Farm.titleOf(state.level);
    $('ui-xp-fill').style.width = Math.min(100, (state.xp / window.Farm.xpNeeded(state.level)) * 100) + '%';
    $('ui-xptext').textContent = `${state.xp}/${window.Farm.xpNeeded(state.level)}`;
    $('ui-can').textContent = `🪣${state.canWater}/${window.Farm.canCap(state)}`;
    $('ui-fert').textContent = `×${state.fertilizer}`;
    $('ui-achv-badge').textContent = `🏆 ${state.achievements.length}/${D.ACHIEVEMENTS.length}`;
  }
  function renderSidebar() {
    const q = window.Farm.currentQuest(state);
    $('ui-current-quest').innerHTML = q
      ? `<b>ข้อ ${q.id}.</b> ${q.desc}<br><span class="q-reward">รางวัล ${q.reward}🪙${q.xp ? ` +${q.xp}xp` : ''}</span>`
      : '🏆 ครบทุกเควสแล้ว! เจ้าคือราชาฟาร์มตัวจริง';
    const parts = [];
    for (const k in state.inventory) {
      const b = state.inventory[k];
      if (b.n > 0 || b.star > 0) {
        const c = D.CROPS[k];
        const px = state.market && state.market[k] ? state.market[k].px : c.sellBase;
        parts.push(`${c.emoji} ×${b.n}${b.star ? ` +⭐×${b.star}` : ''} <small>(${px})</small>`);
      }
    }
    if (state.inventoryEggs.n > 0 || state.inventoryEggs.golden > 0) {
      parts.push(`🥚 ×${state.inventoryEggs.n}${state.inventoryEggs.golden ? ` +🥇×${state.inventoryEggs.golden}` : ''}`);
    }
    $('ui-inv-mini').innerHTML = parts.length ? parts.join('<br>') : 'ยังไม่มีของ';
    // ลานสัตว์ย่อ — โชว์ทุกชนิดที่เลี้ยงอยู่ พร้อมของที่รอเก็บ
    const ART = window.Farm.ART;
    const herd = window.Farm.animalsOf(state);
    if (herd.length > 0) {
      const shown = herd.slice(0, 8).map(a =>
        `<span class="chick" style="display:inline-block;width:34px;height:34px" title="${D.ANIMALS[a.kind] ? D.ANIMALS[a.kind].name : ''}">${ART.animalSVG(a.kind, { mood: moodOf(a) })}</span>`).join('');
      const pending = herd.reduce((n, a) => n + window.Farm.pendingTotal(state, a), 0);
      const hungry = herd.filter(a => (a.happy || 0) < 40).length;
      $('ui-coop-mini').innerHTML = shown + (herd.length > 8 ? `<span class="more-chip">+${herd.length - 8}</span>` : '')
        + `<br>🧺 รอเก็บ: <b>${pending}</b> • 🌾 อาหาร <b>${state.feed || 0}</b>`
        + (hungry ? `<br><span class="warn-chip">😟 สัตว์หิว ${hungry} ตัว</span>` : '');
    } else {
      $('ui-coop-mini').innerHTML = 'ยังไม่มีสัตว์ — กดปุ่ม "โรงนา" เพื่อเริ่มเลี้ยง 🐔🐄🐝';
    }
    const ups = D.UPGRADES.filter(u => state.upgrades[u.id]);
    const cap = window.Farm.plotCapacity(state);
    const nextPrice = state.unlockedPlots < cap ? window.Farm.plotUnlockPrice(state) : null;
    $('ui-upgrades-mini').innerHTML =
      `<div class="land-progress"><div style="width:${Math.round(state.unlockedPlots / cap * 100)}%"></div></div>` +
      `<b>🗺️ พื้นที่ ${state.unlockedPlots}/${cap} แปลง</b>` +
      (nextPrice ? `<br><small>แปลงถัดไป ${nextPrice}🪙 — คลิกแปลง 🔓</small>` : '<br><small>เปิดครบพื้นที่ปัจจุบันแล้ว</small>') +
      (ups.length ? '<br>' + ups.map(u => `${u.icon} ${u.name}`).join('<br>') : '');
  }
  function renderNews() { $('ui-news').textContent = state.news[state.news.length - 1] || '—'; }

  // ---------- Modals ----------
  function openModal(html) { $('modal-content').innerHTML = html; $('modal').classList.remove('hidden'); }
  function closeModal() { $('modal').classList.add('hidden'); }

  function showShop() {
    let html = '<h2>🏪 ร้านเมล็ดพันธุ์</h2>';
    for (const k in D.CROPS) {
      const c = D.CROPS[k];
      const locked = state.level < c.unlockLv;
      const hist = state.priceHistory[k] || [];
      html += `<div class="shop-row">
        <span style="font-size:22px">${c.emoji}</span>
        <span class="grow"><b>${c.name}</b> ${locked ? `🔒 Lv.${c.unlockLv}` : ''}
          <br><small>โต ${Math.round(c.growMin / 60)} ชม.${c.regrowH ? ` • เก็บซ้ำ ${c.regrowCount} รอบ` : ''} • ชอบ: ${c.likeSeason ? D.SEASONS.find(s => s.key === c.likeSeason).name : '—'} / แพ้: ${c.hateSeason ? D.SEASONS.find(s => s.key === c.hateSeason).name : '—'}</small>
        </span>
        ${sparkline(hist)}
        <button class="buy-btn" data-seed="${k}" ${locked || state.money < c.seedCost ? 'disabled' : ''}>${c.seedCost}🪙</button>
      </div>`;
    }
    html += '<h2>🐔 คอกไก่</h2>';
    html += `<div class="shop-row"><span style="font-size:20px">🐔</span>
      <span class="grow">ไก่ 1 ตัว (ไข่ทุก 8 ชม.เกม, โอกาสไข่ทอง 15%)<br><small>มี ${state.coop.count}/${D.COOP_MAX} ตัว • ไข่ธรรมดาขาย ${D.EGG_SELL} • ไข่ทอง ${D.EGG_SELL * 3}</small></span>
      <button class="buy-chicken" ${state.coop.count >= D.COOP_MAX || state.money < D.CHICKEN_COST ? 'disabled' : ''}>${D.CHICKEN_COST}🪙</button>
      ${state.coop.count > 0 ? '<button class="sell-chicken">ขายคืน</button>' : ''}
    </div>`;
    html += '<h2>💩 ปุ๋ย (โตเร็ว +25%)</h2>';
    html += `<div class="shop-row"><span class="grow">ปุ๋ยคอก ชิ้นละ ${window.Farm.FERT_COST}🪙 (มี ${state.fertilizer} ชิ้น)</span>
      <button class="buy-fert" data-n="1">×1</button><button class="buy-fert" data-n="10">×10</button></div>`;
    html += '<h2>🛠️ อัปเกรด</h2>';
    for (const u of D.UPGRADES) {
      const owned = state.upgrades[u.id];
      html += `<div class="shop-row"><span style="font-size:20px">${u.icon}</span>
        <span class="grow">${u.name}<br><small>${u.requires ? 'ต้องมีขั้นก่อนหน้า • ' : ''}ต้อง Lv.${u.minLv}</small></span>
        ${owned ? '<span>✅ มีแล้ว</span>' : `<button class="buy-up" data-id="${u.id}" ${state.money < u.cost ? 'disabled' : ''}>${u.cost}🪙</button>`}
      </div>`;
    }
    openModal(html);
  }

  function showInventory() {
    let html = '<h2>📦 คลัง & ตลาดวันนี้</h2>';
    let has = false;
    for (const k in D.CROPS) {
      const b = state.inventory[k];
      if (!b || (b.n <= 0 && b.star <= 0)) continue;
      has = true;
      const c = D.CROPS[k];
      const m = state.market && state.market[k] ? state.market[k] : { px: c.sellBase, mult: 1 };
      const cls = m.mult > 1.05 ? 'price-up' : m.mult < 0.95 ? 'price-down' : '';
      html += `<div class="inv-row">
        <span style="font-size:22px">${c.emoji}</span>
        <span class="grow"><b>${c.name}</b> ×${b.n}${b.star ? ` + ⭐×${b.star}` : ''}
          <br><small class="${cls}">วันนี้ ${m.px}/ชิ้น (ฐาน ${c.sellBase})${b.star ? ' • ⭐×1.5' : ''}</small></span>
        ${sparkline(state.priceHistory[k])}
        <button class="sell-btn" data-crop="${k}" data-kind="n" ${b.n <= 0 ? 'disabled' : ''}>ขาย</button>
        <button class="sell-btn" data-crop="${k}" data-kind="star" ${b.star <= 0 ? 'disabled' : ''}>ขาย ⭐</button>
      </div>`;
    }
    // ไข่ไก่ (คลังเดิม) + ผลผลิตสัตว์ชนิดอื่น
    const eg = state.inventoryEggs;
    if (eg.n > 0 || eg.star > 0 || eg.golden > 0) {
      has = true;
      const starPx = Math.round(D.EGG_SELL * 1.6);
      html += `<div class="inv-row"><span class="inv-pic">${window.Farm.ART.productSVG('egg')}</span>
        <span class="grow"><b>ไข่ไก่</b> ×${eg.n}${eg.star ? ` + ⭐×${eg.star}` : ''}${eg.golden ? ` + 🥇×${eg.golden}` : ''}
        <br><small>ธรรมดา ${D.EGG_SELL} • ⭐ ${starPx} • 🥇 ${D.EGG_SELL * 3} ต่อฟอง</small></span>
        <button class="sell-eggs" data-kind="n" ${eg.n <= 0 ? 'disabled' : ''}>ขาย</button>
        <button class="sell-eggs" data-kind="star" ${(eg.star || 0) <= 0 ? 'disabled' : ''}>ขาย ⭐</button>
        <button class="sell-eggs" data-kind="golden" ${eg.golden <= 0 ? 'disabled' : ''}>ขาย 🥇</button>
      </div>`;
    }
    for (const pid in (state.inventoryProducts || {})) {
      const b = state.inventoryProducts[pid];
      const total = b.n + b.star + b.golden;
      if (total <= 0) continue;
      has = true;
      const pr = D.PRODUCTS[pid];
      html += `<div class="inv-row"><span class="inv-pic">${window.Farm.ART.productSVG(pid)}</span>
        <span class="grow"><b>${pr.name}</b> ×${b.n}${b.star ? ` + ⭐×${b.star}` : ''}${b.golden ? ` + 🥇×${b.golden}` : ''}
        <br><small>ธรรมดา ${window.Farm.productValue(pid, 'n')} • ⭐ ${window.Farm.productValue(pid, 'star')} • 🥇 ${window.Farm.productValue(pid, 'golden')}</small></span>
        <button class="sell-product" data-pid="${pid}" data-kind="n" ${b.n <= 0 ? 'disabled' : ''}>ขาย</button>
        <button class="sell-product" data-pid="${pid}" data-kind="star" ${b.star <= 0 ? 'disabled' : ''}>ขาย ⭐</button>
        <button class="sell-product" data-pid="${pid}" data-kind="golden" ${b.golden <= 0 ? 'disabled' : ''}>ขาย 🥇</button>
      </div>`;
    }
    if (!has) html += '<p>ยังไม่มีของในคลัง — ออกไปเก็บเกี่ยวเลย!</p>';
    html += `<div style="margin-top:10px;text-align:right"><button class="modal-btn sell-all-btn">💰 ขายทั้งคลัง</button></div>`;
    openModal(html);
  }

  function showQuests() {
    let html = '<h2>📜 สมุดเควส</h2>';
    const doneIds = new Set(state.questsDone.map(q => q.id || q));
    for (const q of D.QUESTS) {
      const done = doneIds.has(q.id);
      html += `<div class="quest-row ${done ? 'done' : ''}">
        <span>${done ? '✅' : '⬜'}</span><span class="grow">ข้อ ${q.id}. ${q.desc}</span>
        <span>${q.reward}🪙</span></div>`;
    }
    openModal(html);
  }

  function showAchievements() {
    let html = `<h2>🏆 ตราสะสม (${state.achievements.length}/${D.ACHIEVEMENTS.length}) — แต่ละตราให้ 100🪙</h2><div class="achv-grid">`;
    for (const a of D.ACHIEVEMENTS) {
      const got = state.achievements.includes(a.id);
      html += `<div class="achv-card ${got ? 'unlocked' : 'locked'}">
        <div class="ico">${a.icon}</div><div class="nm">${a.name}</div>
        <div>${a.desc}</div><div>${got ? '✅ ได้แล้ว' : '🔒'}</div>
      </div>`;
    }
    openModal(html + '</div>');
  }

  function showStats() {
    const t = state.totals, e = state.events;
    const rows = [
      ['📅 วันเกมที่เล่นผ่าน', t.dayPlayed],
      ['🔨 ไถดิน', t.tilled],
      ['🌱 ปลูก', t.planted],
      ['🧺 เก็บเกี่ยว', t.harvested],
      ['✨ เก็บผล⭐', e.starHarvested || 0],
      ['💰 ยอดขายรวม', t.earned.toLocaleString('th-TH') + '🪙'],
      ['🛒 จำนวนของที่ขาย', t.sold],
      ['🛠️ อัปเกรดที่ซื้อ', t.upgrades],
      ['🐔 ไก่ในคอก', state.coop.count],
      ['🥚 ไข่ทองที่เคยได้', e.goldenEggs || 0],
      ['⛈️ ผักโดนพายุรื้อ', e.stormHit || 0],
      ['🥀 ผักตายจากขาดน้ำ', e.cropDied || 0],
      ['💩 ใส่ปุ๋ยสะสม', e.fertilized || 0],
    ];
    let html = '<h2>📊 สถิติฟาร์ม</h2>';
    for (const [k, v] of rows) html += `<div class="stat-row"><span>${k}</span><b>${v}</b></div>`;
    // ทำนายอากาศในอนาคต 3 วัน (โปร่งใสเพราะ deterministic)
    html += '<h2 style="margin-top:12px">🔭 อากาศ 3 วันข้างหน้า</h2>';
    for (let d = 1; d <= 3; d++) {
      const w = D.WEATHERS[window.Farm.rollWeather(state.day + d)];
      html += `<div class="stat-row"><span>วันที่ ${state.day + d}</span><b>${w.emoji} ${w.name}</b></div>`;
    }
    openModal(html);
  }

  function showSettings() {
    const spd = state.settings.speed;
    const S = window.Farm.Sound;
    const vol = Math.round(S.volume * 100);
    openModal(`<h2>⚙️ ตั้งค่า — ฟาร์มมินิ v${D.APP_VERSION}</h2>
    <div class="setting-row"><span>🔊 เสียงเอฟเฟกต์</span>
      <button class="modal-btn" id="set-sound">${S.enabled ? 'เปิดอยู่ — กดปิด' : 'ปิดอยู่ — กดเปิด'}</button></div>
    <div class="setting-row"><span>🎵 เพลง: <b>${S.trackName}</b></span><small>สลับตามฤดู/เวลา/อากาศอัตโนมัติ</small></div>
    <div class="setting-row"><span>🎚️ ระดับเสียง ${vol}%</span>
      <span class="speed-btns">${[30,50,70,100].map(v => `<button class="vol-btn ${v === vol ? 'active' : ''}" data-v="${v}">${v}%</button>`).join('')}</span></div>
    <div class="setting-row"><span>⏩ ความเร็วเวลาเกม (ปกติ: 1 วัน = 4 นาที)</span>
      <span class="speed-btns">${[0.5, 1, 2, 4].map(v =>
        `<button class="spd ${v === spd ? 'active' : ''}" data-v="${v}">${v}×</button>`).join('')}</span></div>
    <div class="setting-row"><span>🗑️ ล้างเซฟเริ่มใหม่</span>
      <button class="modal-btn" id="set-reset">ล้าง</button></div>
    <p style="margin-top:10px; font-size:12px; opacity:.7">เวอร์ชั่น ${D.APP_VERSION} • Adaptive Music 4 ธีม • SFX 27 เสียง • เซฟอัตโนมัติ</p>`);
  }

  function showNewsModal() {
    let html = '<h2>📰 สิ่งที่เกิดขึ้นล่าสุด</h2>';
    html += state.news.slice().reverse().map(n => `<div class="quest-row">${n}</div>`).join('');
    openModal(html);
  }

  function showHelp() {
    openModal(`<h2>❓ วิธีเล่น</h2>
    <div style="font-size:14px; line-height:1.85">
    <b>เลือกเครื่องมือ (ปุ่ม 1-6) แล้วคลิกแปลง</b> — ชี้เมาส์บนแปลงจะมีแถบข้อมูลบอกรายละเอียด<br>
    🪓 ถาก/ไถ → 🌱 หว่านเมล็ด (เลือกจากชิปเมล็ดในแถบเครื่องมือ) → 💧 รดน้ำ → 🧺 เก็บ<br><br>
    <b>🛖 ปศุสัตว์ (ใหม่ใน v4):</b><br>
    เลี้ยงได้ <b>7 ชนิด</b> — 🐔 ไก่ • 🦆 เป็ด • 🐝 ผึ้ง • 🐐 แพะ • 🐑 แกะ • 🐄 วัว • 🐖 หมู<br>
    🏠 <b>อาคาร 3 หลัง</b> — เล้าไก่ (มีให้ตั้งแต่ต้น), ลานผึ้ง และโรงนา ต้องสร้างก่อนถึงเลี้ยงสัตว์กลุ่มนั้นได้ อัปเกรดแล้วจุมากขึ้นและผลผลิตเร็วขึ้น<br>
    ⭐ <b>ระดับสัตว์ 4 ขั้น</b> — ให้อาหารและเก็บผลผลิตบ่อยๆ สัตว์จะเลื่อนระดับเอง ระดับสูง = ผลิตเร็วขึ้นและมีโอกาสได้ของ ⭐/🥇 มากขึ้น<br>
    🌾 <b>อาหารสัตว์</b> — สัตว์กินทุกเช้า ถ้าอาหารหมดจะหิว ผลผลิตช้าลงจนถึงหยุดผลิต<br>
    &nbsp;&nbsp;&nbsp;แปรรูปพืชในคลังเป็นอาหารได้ (แครอท/มันฝรั่ง/ข้าวโพด) — <b>ถูกกว่าซื้อสำเร็จรูปมาก</b><br>
    🐝 <b>ผึ้ง</b> ไม่กินอาหาร และช่วยเร่งการโตของพืชทุกแปลง +5% ต่อรัง (สูงสุด +25%)<br>
    🌦️ สัตว์แต่ละชนิดมีฤดูที่ชอบและแพ้ เหมือนพืช<br><br>
    <b>ระบบเดิม:</b><br>
    🏆 ตราสะสม 24 ชิ้น • ⛅ พยากรณ์อากาศพรุ่งนี้ • 📈 กราฟราคา 10 วัน • ⏰ กลางวัน/กลางคืนจริง • ⚙️ ปรับความเร็วเกม 0.5×–4×<br><br>
    <b>กติกาสำคัญ:</b> ผักขาดน้ำหยุดโต 6 ชม.เกม = ตาย 🥀 • น้ำพอตลอด = ได้ผล ⭐ ขาย 1.5 เท่า • ปุ๋ย = โตเร็ว 25% • พืชมีฤดูชอบ/แพ้<br>
    <b>Esc</b> ปิดหน้าต่าง • เกมเซฟเองอัตโนมัติ
    </div>`);
  }

  // ---------- v4: โรงนา / ลานสัตว์ ----------
  let barnTab = 'herd';   // 'herd' | 'buy' | 'supply'
  const F = () => window.Farm;

  // อารมณ์ที่ใช้วาดสัตว์: กลางคืนหลับ นอกนั้นดูจากความสุข
  function moodOf(a) {
    const phase = timePhase(state.clockMin);
    if (phase === 'night') return 'sleep';
    const h = a.happy != null ? a.happy : 70;
    if (h >= 80) return 'happy';
    if (h < 40) return 'hungry';
    return 'ok';
  }
  function gmin(n) {
    if (!isFinite(n)) return '—';
    const h = Math.floor(n / 60), m = Math.round(n % 60);
    return h > 0 ? `${h} ชม.${m ? ` ${m} น.` : ''}` : `${m} นาที`;
  }
  function bar(pct, cls = '') {
    return `<div class="mini-bar ${cls}"><div style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>`;
  }

  function animalCard(a) {
    const ART = window.Farm.ART;
    const def = D.ANIMALS[a.kind];
    if (!def) return '';
    const tier = F().animalTier(a), next = F().nextTierAt(a);
    const band = F().happyBand(a);
    const cycle = F().animalCycleMin(state, a);
    const pend = F().pendingOf(state, a);
    const pendN = pend.n + pend.star + pend.golden;
    const prod = D.PRODUCTS[def.product];
    const canFeed = def.feedPerDay > 0;
    const tierPct = next ? ((a.care - tier.care) / (next.care - tier.care)) * 100 : 100;
    return `<div class="animal-card ${band.mult === 0 ? 'starving' : ''}">
      <button class="barn-sell" data-uid="${a.uid}" title="ขาย${def.name}คืน">💸</button>
      <div class="animal-pic">${ART.animalSVG(a.kind, { mood: moodOf(a), tier: tier.tier })}</div>
      <div class="animal-info">
        <div class="animal-name"><b>${def.name}</b> <span class="tier-chip">${tier.name} ${tier.mark}</span></div>
        <div class="animal-line"><span>${band.face} ${band.name}</span>${bar(a.happy, 'happy')}</div>
        <div class="animal-line"><span>⏱️ ${prod.emoji} อีก ${gmin((1 - (a.acc || 0)) * cycle)}</span>${bar((a.acc || 0) * 100, 'prod')}</div>
        <div class="animal-line"><span>${next ? `ระดับถัดไป: ${next.name}` : '👑 ระดับสูงสุดแล้ว'}</span>${bar(tierPct, 'tier')}</div>
        <div class="animal-actions">
          <span class="pend-chip ${pendN ? 'has' : ''}">${prod.emoji} ${pendN}${pend.star ? ` ⭐${pend.star}` : ''}${pend.golden ? ` 🥇${pend.golden}` : ''}</span>
          <button class="barn-collect" data-uid="${a.uid}" ${pendN ? '' : 'disabled'}>🧺 เก็บ</button>
          ${canFeed ? `<button class="barn-feed" data-uid="${a.uid}" ${(state.feed || 0) < def.feedPerDay || a.happy >= 100 ? 'disabled' : ''}>🌾 ให้อาหาร</button>` : '<span class="self-feed">หาอาหารเอง</span>'}
        </div>
      </div>
    </div>`;
  }

  function houseRow(houseId) {
    const ART = window.Farm.ART;
    const h = D.HOUSES[houseId];
    const t = F().houseTier(state, houseId);
    const cur = F().houseInfo(state, houseId);
    const next = F().nextHouseTier(state, houseId);
    const used = F().houseUsed(state, houseId);
    const built = cur.cap > 0;
    return `<div class="house-row">
      <div class="house-pic">${ART.houseSVG(houseId, t)}</div>
      <div class="grow">
        <b>${h.name}</b> — ${built ? cur.name : 'ยังไม่ได้สร้าง'}
        <br><small>${built ? `จุ ${used}/${cur.cap} ตัว` : 'สร้างแล้วถึงจะเลี้ยงสัตว์กลุ่มนี้ได้'}${cur.speed > 1 ? ` • ผลผลิตเร็วขึ้น ${Math.round((cur.speed - 1) * 100)}%` : ''}</small>
        ${built ? bar(cur.cap ? used / cur.cap * 100 : 0, 'cap') : ''}
      </div>
      ${next
        ? `<button class="barn-house-up" data-house="${houseId}" ${state.level < next.minLv || state.money < next.cost ? 'disabled' : ''}>
             ${built ? '⬆️ อัปเกรด' : '🔨 สร้าง'}<br><small>${next.cost.toLocaleString('th-TH')}🪙 • Lv.${next.minLv}</small></button>`
        : '<span class="max-chip">✅ สูงสุด</span>'}
    </div>`;
  }

  function showBarn() {
    const ART = window.Farm.ART;
    const animals = F().animalsOf(state);
    const totalPending = animals.reduce((n, a) => n + F().pendingTotal(state, a), 0);
    const bees = F().countAnimals(state, 'bee');
    const tabs = [['herd', `🐮 ฝูงสัตว์ (${animals.length})`], ['buy', '🛒 ซื้อสัตว์'], ['supply', '🌾 อาหาร & อาคาร']];

    let html = `<h2>🛖 โรงนา &amp; ลานสัตว์</h2>
      <div class="barn-summary">
        <span>🌾 อาหารสัตว์ <b>${state.feed || 0}</b></span>
        <span>🧺 ผลผลิตรอเก็บ <b>${totalPending}</b></span>
        ${bees ? `<span>🐝 ผึ้งเร่งพืช <b>+${Math.round((F().beeAura(state) - 1) * 100)}%</b></span>` : ''}
        <button class="barn-collect-all" ${totalPending ? '' : 'disabled'}>🧺 เก็บผลผลิตทั้งหมด</button>
      </div>
      <div class="barn-tabs">${tabs.map(([k, label]) =>
        `<button class="barn-tab ${barnTab === k ? 'active' : ''}" data-tab="${k}">${label}</button>`).join('')}</div>`;

    if (barnTab === 'herd') {
      if (!animals.length) {
        html += `<p class="barn-empty">ยังไม่มีสัตว์ในฟาร์ม — ไปที่แท็บ <b>🛒 ซื้อสัตว์</b> เพื่อเริ่มเลี้ยง 🐔</p>`;
      } else {
        // จัดกลุ่มตามอาคารเพื่อให้เห็นภาพฟาร์มจริง
        for (const houseId of ['coop', 'apiary', 'barn']) {
          const group = animals.filter(a => D.ANIMALS[a.kind] && D.ANIMALS[a.kind].house === houseId);
          if (!group.length) continue;
          const cur = F().houseInfo(state, houseId);
          html += `<h3 class="barn-group">${D.HOUSES[houseId].emoji} ${D.HOUSES[houseId].name} <small>${cur.name} • ${group.length}/${cur.cap}</small></h3>
            <div class="animal-grid">${group.map(animalCard).join('')}</div>`;
        }
      }
    }

    if (barnTab === 'buy') {
      html += '<div class="buy-list">';
      for (const k in D.ANIMALS) {
        const def = D.ANIMALS[k];
        const prod = D.PRODUCTS[def.product];
        const chk = F().canBuyAnimal(state, k);
        const have = F().countAnimals(state, k);
        html += `<div class="buy-row">
          <div class="buy-pic">${ART.animalSVG(k, { mood: 'happy' })}</div>
          <span class="grow">
            <b>${def.name}</b> ${have ? `<span class="have-chip">มี ${have} ตัว</span>` : ''}
            <br><small>${def.desc}</small>
            <br><small class="spec">${prod.emoji} ${prod.name} ${prod.base}🪙 • ทุก ${Math.round(def.cycleMin / 60)} ชม.เกม • อาหาร ${def.feedPerDay}/วัน • บ้าน: ${D.HOUSES[def.house].name}
            ${def.likeSeason ? ` • ชอบ${D.SEASONS.find(s => s.key === def.likeSeason).name}` : ''}${def.hateSeason ? ` • แพ้${D.SEASONS.find(s => s.key === def.hateSeason).name}` : ''}</small>
          </span>
          <button class="barn-buy" data-kind="${k}" ${chk.ok ? '' : 'disabled'} title="${chk.reason}">
            ${def.cost.toLocaleString('th-TH')}🪙${chk.ok ? '' : `<br><small>${chk.reason}</small>`}</button>
        </div>`;
      }
      html += '</div>';
    }

    if (barnTab === 'supply') {
      html += '<h3 class="barn-group">🌾 อาหารสัตว์</h3>';
      html += `<div class="feed-box"><p>สัตว์กินอาหารทุกเช้า — อาหารไม่พอจะหิว ผลผลิตช้าลงจนถึงหยุดผลิต<br>
        <b>แปรรูปพืชในคลังถูกกว่าซื้อมาก</b> พืชที่ปลูกจึงเลี้ยงสัตว์ได้โดยตรง</p>
        <div class="shop-row"><span class="grow">ซื้ออาหารสำเร็จรูป ชิ้นละ ${D.FEED_BUY_COST}🪙 (มี ${state.feed || 0})</span>
          <button class="barn-buy-feed" data-n="10">×10</button><button class="barn-buy-feed" data-n="50">×50</button></div>`;
      for (const r of D.FEED_RECIPES) {
        const c = D.CROPS[r.crop];
        const have = (state.inventory[r.crop] && state.inventory[r.crop].n) || 0;
        const per = Math.round((c.sellBase * r.n) / r.feed);
        html += `<div class="shop-row">
          <span style="font-size:20px">${c.emoji}</span>
          <span class="grow">${c.name} ×${r.n} → 🌾 ×${r.feed}<br><small>ในคลัง ${have} ชิ้น • ต้นทุนราว ${per}🪙/หน่วย</small></span>
          <button class="barn-craft-feed" data-crop="${r.crop}" data-times="1" ${have < r.n ? 'disabled' : ''}>แปรรูป</button>
          <button class="barn-craft-feed" data-crop="${r.crop}" data-times="99" ${have < r.n ? 'disabled' : ''}>ทั้งหมด</button>
        </div>`;
      }
      html += '</div><h3 class="barn-group">🏠 อาคาร</h3>';
      for (const houseId of ['coop', 'apiary', 'barn']) html += houseRow(houseId);
    }
    openModal(html);
  }

  // ---------- Seed pick ----------
  function renderSeedPick() {
    const el = $('seed-pick');
    if (!el || !state) return;
    let html = '';
    for (const k in D.CROPS) {
      const c = D.CROPS[k];
      if (state.level < c.unlockLv) continue;
      html += `<button class="seed-btn ${k === selectedSeed ? 'active' : ''}" data-seed="${k}" title="${c.name} (${c.seedCost}🪙)">${c.emoji}</button>`;
    }
    el.innerHTML = html;
  }

  // ---------- Export ----------
  window.Farm.UI = {
    bind(s) { state = s; },
    toast, floatOnPlot, beep, sfx, confetti, plotEffect, screenFlash,
    openModal, closeModal,
    showShop, showInventory, showQuests, showAchievements, showStats, showSettings,
    showNewsModal, showHelp,
    // v4: ปุ่ม "คอกไก่" เดิมเปิดหน้าโรงนาที่ครอบคลุมสัตว์ทุกชนิด
    showBarn, showCoop: showBarn,
    setBarnTab: t => { barnTab = t; },
    getTool: () => selectedTool,
    setTool: t => {
      selectedTool = t;
      document.querySelectorAll('.tool').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
      updateToolCursor();
      if (window.Farm.Sound) window.Farm.Sound.play('click');
    },
    getSeed: () => selectedSeed,
    setSeed: k => {
      selectedSeed = k; selectedTool = 'plant'; renderSeedPick();
      document.querySelectorAll('.tool').forEach(b => b.classList.toggle('active', b.dataset.tool === 'plant'));
      updateToolCursor();
      if (window.Farm.Sound) window.Farm.Sound.play('click');
    },
    renderScene,
    renderAll() { renderGrid(); renderTop(); renderSidebar(); renderNews(); renderScene(); },
    renderGrid, renderTop, renderSidebar,
    setSound(v) { soundOn = v; },
    getSound: () => soundOn,
  };
  window.Farm.UI.renderSeedPick = renderSeedPick;
  window.Farm.UI.bindTooltip = bindTooltip;
  window.Farm.UI.bindToolCursor = bindToolCursor;
})();