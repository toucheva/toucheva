// ============ ฟาร์มมินิ v3.1 — main: init + loop + events ============
(() => {
  const F = window.Farm;
  const D = window.Farm.DATA;
  const $ = id => document.getElementById(id);

  let state = null;
  let lastNewsShown = 0;

  // ---------- boot ----------
  function boot() {
    const loaded = F.loadGame();
    if (loaded) {
      state = loaded;
      const offline = F.catchUpOffline(state);
      if (offline) setTimeout(() => F.UI.toast(offline.msg), 600);
    } else {
      state = F.newGame();
    }
    state.market = state.market || F.rollPrices(state.day);
    if (!state.tomorrowWeather) state.tomorrowWeather = F.rollWeather(state.day + 1);

    F.UI.bind(state);
    // เสียง: sync จาก settings (เพลง + SFX แยกกัน)
    const S = window.Farm.Sound;
    if (state.settings.sound === false) S.setEnabled(false);
    if (state.settings.music === false) S.setBgm(false);
    S.setVolume(state.settings.volume ?? 0.7);
    $('btn-sound').textContent = S.enabled ? '🔊' : '🔇';
    $('btn-music').textContent = S.bgm ? '🎵' : '🎶̶';
    F.UI.setTool('till');
    F.UI.renderSeedPick();
    F.UI.bindTooltip();
    F.UI.bindToolCursor();
    F.UI.renderAll();
    // อย่านำข่าวย้อนหลังทั้งเซฟมาแสดงเป็น toast ซ้ำตอนโหลดเกม
    lastNewsShown = state.news.length;

    if (!loaded) F.UI.openModal(welcome());
    if (new URLSearchParams(location.search).get('debug')) setupDebug();
  }

  function welcome() {
    return `<h2>🥕 ยินดีต้อนรับสู่ฟาร์มมินิ v${D.APP_VERSION}!</h2>
    <div style="font-size:14px; line-height:1.9">
    เจ้ามี <b>500🪙</b> และเริ่มด้วยพื้นที่เพียง <b>2 แปลง</b> — ค่อยๆ สร้างฟาร์มจากจุดเล็กๆ:<br>
    1️⃣ เครื่องมือ 🪓 <b>ถาก/ไถ</b> คลิก 2 แปลงแรก<br>
    2️⃣ 🌱 <b>หว่านเมล็ด</b> เลือก 🥕 จากชิปเมล็ด แล้วคลิกแปลง<br>
    3️⃣ 💧 <b>รดน้ำ</b> ให้ครบ (ขาดน้ำ 6 ชม. = ตาย!)<br>
    4️⃣ เก็บและขายผลผลิต แล้วคลิกแปลง <b>🔓 ราคา 60🪙</b> เพื่อขยายพื้นที่ทีละแปลง<br><br>
    💡 ราคาขยายช่วงแรก: 60 → 90 → 130 → 180🪙 จึงเติบโตได้เรื่อยๆ โดยไม่ง่ายหรือยากเกินไป<br>
    <b>✨ ใหม่ใน v4.0 — ระบบปศุสัตว์:</b> เลี้ยงสัตว์ได้ 7 ชนิด (🐔🦆🐝🐐🐑🐄🐖)<br>
    🏠 สร้างและอัปเกรดเล้าไก่ / ลานผึ้ง / โรงนา • ⭐ เลี้ยงสัตว์จนเลื่อนระดับเพื่อผลผลิตที่ดีขึ้น<br>
    🌾 แปรรูปพืชเป็นอาหารสัตว์ • 🐝 ผึ้งช่วยเร่งการโตของพืชทุกแปลง<br>
    📈 กราฟราคาย้อนหลัง • ⚙️ ปรับความเร็วเกมได้ที่ปุ่มรูปเฟือง<br><br>
    💡 ชี้เมาส์บนแปลงเพื่อดูรายละเอียด • กด 1-6 สลับเครื่องมือไวๆ<br>
    💡 ปิดเกมแล้วกลับมา ผักโตต่อเอง + เซฟอัตโนมัติ
    </div>
    <div style="text-align:center; margin-top:12px">
      <button class="modal-btn" onclick="document.getElementById('modal').classList.add('hidden')">🚜 เริ่มปลูกเลย!</button>
    </div>`;
  }

  // ---------- คลิกแปลง ----------
  F.onPlotClick = function (i) {
    // แปลงล็อก: คลิกเพื่อซื้อแปลงถัดไปแทนการใช้เครื่องมือ
    if (!F.isPlotUnlocked(state, i)) {
      const bought = F.purchasePlot(state, i);
      reactToEvent(bought);
      F.UI.renderAll();
      F.saveGame(state);
      return;
    }
    const tool = F.UI.getTool();
    let okAction = false;
    if (tool === 'fill') { F.refillCan(state); okAction = true; }
    else if (tool === 'till') okAction = F.till(state, i);
    else if (tool === 'plant') okAction = F.plant(state, i, F.UI.getSeed());
    else if (tool === 'water') okAction = F.water(state, i);
    else if (tool === 'harvest') okAction = F.harvest(state, i);
    else if (tool === 'fert') okAction = F.useFertilizer(state, i);

    // วาดกริดก่อน แล้วค่อยยิงเอฟเฟกต์ — ไม่งั้นอนุภาคจะถูก render รอบเดียวกันลบทิ้งก่อนขึ้นจอ
    F.checkQuests(state);
    F.checkAchievements(state);
    checkNewNews();
    F.UI.renderAll();
    reactToEvent(okAction);
    F.saveGame(state);
  };

  // ทุก action ที่เปลี่ยนเศรษฐกิจต้องจบด้วยลำดับเดียวกัน: เช็คเควส/ตรา → วาดใหม่ → เซฟทันที
  function afterEconomy() {
    F.checkQuests(state);
    F.checkAchievements(state);
    checkNewNews();
    F.UI.renderAll();
    F.saveGame(state);
  }

  const KIND_SFX = { till: 'dig', plant: 'plant', water: 'water', harvest: 'harvest', fert: 'fert', ready: 'ready', buy: 'unlock', sell: 'sell' };
  const KIND_FX = { till: 'dig', plant: 'plant', water: 'water', harvest: 'harvest', fert: 'fert', buy: 'unlock' };
  // ev ถูกใช้แล้วต้องล้างทิ้งเสมอ ไม่งั้นคลิกที่ไม่มีผลจะเล่นเอฟเฟกต์ของครั้งก่อนซ้ำ
  function reactToEvent(okAction) {
    const ev = state.lastEvent;
    state.lastEvent = null;
    if (!ev) return;
    if (ev.kind === 'error') { snd('error'); if (ev.text) F.UI.toast(ev.text); return; }
    if (okAction === false) return;
    let sound = KIND_SFX[ev.kind];
    let fx = KIND_FX[ev.kind];
    if (ev.kind === 'harvest' && String(ev.text).includes('⭐')) { sound = 'goldCrop'; fx = 'gold'; }
    if (sound) snd(sound);
    if (ev.i !== undefined && fx) F.UI.plotEffect(ev.i, fx, fx === 'gold' ? 18 : 10);
    if (ev.kind === 'buy') F.UI.screenFlash('unlock');
    if (ev.i !== undefined && ev.text) F.UI.floatOnPlot(ev.i, ev.text);
  }
  function snd(name) { if (window.Farm.Sound) window.Farm.Sound.play(name); }

  // ---------- ข่าวใหม่ → toast + เสียงตามชนิด ----------
  function checkNewNews() {
    if (state.news.length > lastNewsShown) {
      const fresh = state.news.slice(lastNewsShown);
      for (const n of fresh) {
        F.UI.toast(n);
        if (n.includes('ตราสะสม')) { snd('achv'); F.UI.confetti(20); }
        else if (n.includes('เลเวลอัป')) { snd('level'); F.UI.confetti(30); }
        else if (n.includes('เควสสำเร็จ')) snd('quest');
        else if (n.includes('ตาย')) snd('die');
      }
      lastNewsShown = state.news.length;
      if (lastNewsShown > 60) lastNewsShown = 60;
    }
  }

  // ---------- ผูกปุ่ม ----------
  function bindButtons() {
    document.querySelectorAll('.tool[data-tool]').forEach(b =>
      b.addEventListener('click', () => F.UI.setTool(b.dataset.tool)));

    $('seed-pick').addEventListener('click', e => {
      const btn = e.target.closest('.seed-btn');
      if (btn) F.UI.setSeed(btn.dataset.seed);
    });

    $('btn-shop').addEventListener('click', F.UI.showShop);
    $('btn-inventory').addEventListener('click', F.UI.showInventory);
    $('btn-quest').addEventListener('click', F.UI.showQuests);
    $('btn-achv').addEventListener('click', F.UI.showAchievements);
    $('btn-news').addEventListener('click', F.UI.showNewsModal);
    $('btn-coop').addEventListener('click', F.UI.showCoop);
    $('btn-help').addEventListener('click', F.UI.showHelp);
    $('btn-settings').addEventListener('click', F.UI.showSettings);
    $('ui-achv-badge').addEventListener('click', F.UI.showAchievements);
    $('modal-close').addEventListener('click', F.UI.closeModal);
    $('modal').addEventListener('click', e => { if (e.target.id === 'modal') F.UI.closeModal(); });

    $('btn-sound').addEventListener('click', () => {
      const S = window.Farm.Sound;
      S.setEnabled(!S.enabled);
      state.settings.sound = S.enabled;
      $('btn-sound').textContent = S.enabled ? '🔊' : '🔇';
      if (S.enabled) { S.setUserInteracted(); snd('click'); }
    });
    $('btn-music').addEventListener('click', () => {
      const S = window.Farm.Sound;
      S.setBgm(!S.bgm);
      state.settings.music = S.bgm;
      $('btn-music').textContent = S.bgm ? '🎵' : '🎶̶';
      if (S.bgm) S.setUserInteracted();
    });

    $('btn-newgame').addEventListener('click', () => {
      F.UI.openModal(`<h2>🗑️ เริ่มเกมใหม่?</h2>
      <p>ความคืบหน้าทั้งหมดจะหาย รวมถึงเงิน เลเวล ไก่ และตราสะสม</p>
      <div style="margin-top:12px; display:flex; gap:8px; justify-content:center">
        <button class="modal-btn" id="confirm-yes">ใช่ ล้างเซฟ</button>
        <button class="modal-btn" id="confirm-no">ยกเลิก</button>
      </div>`);
      $('confirm-yes').addEventListener('click', () => {
        F.closeModalSafe(F.UI);
        F.clearSave();
        state = F.newGame();
        state.market = F.rollPrices(state.day);
        state.tomorrowWeather = F.rollWeather(2);
        F.UI.bind(state); F.UI.setTool('till'); F.UI.setSeed('carrot');
        F.UI.renderSeedPick(); F.UI.renderAll();
        F.UI.toast('🌱 เริ่มฟาร์มใหม่แล้ว!');
      });
      $('confirm-no').addEventListener('click', F.UI.closeModal);
    });

    setupDebug();
  }

  function setupDebug() {
    if (!location.search.includes('debug')) return;
    $('debug-tools').hidden = false;
    $('btn-d-hour').onclick = () => { F.growTick(state, 60); afterTick(); };
    $('btn-d-day').onclick = () => { F.growTick(state, 1440); afterTick(); };
    $('btn-d-money').onclick = () => { state.money += 1000; afterTick(); };
  }
  function afterTick() { checkNewNews(); F.UI.renderAll(); }

  // ---------- Modal button delegation ----------
  function bindModalDelegates() {
    $('modal-content').addEventListener('click', e => {
      const t = e.target;
      const act = (cls, fn) => { if (t.classList.contains(cls)) fn(); };

      act('buy-btn', () => {
        const k = t.dataset.seed;
        F.UI.closeModal(); F.UI.setTool('plant'); F.UI.setSeed(k);
        F.UI.toast(`เลือก ${D.CROPS[k].name} แล้ว — คลิกแปลงที่ไถแล้วเพื่อหว่าน 🌱`);
      });
      act('buy-chicken', () => {
        if (F.buyChicken(state)) { snd('egg'); checkNewNews(); }
        F.UI.showBarn(); afterEconomy();
      });
      act('sell-chicken', () => {
        if (F.sellChicken(state)) snd('coin');
        F.UI.showBarn(); afterEconomy();
      });
      act('collect-eggs-btn', () => {
        const got = F.collectEggs(state);
        if (got) {
          if (got.g > 0) { snd('golden'); F.UI.confetti(18); F.UI.toast(`🥇 ได้ไข่ทอง ${got.g} ฟอง!!`); }
          else snd('egg');
          F.UI.toast(`🧺 เก็บไข่ ${got.n} ฟอง${got.g ? ` + ทอง ${got.g}` : ''}`);
        }
        F.UI.showBarn(); afterEconomy();
      });

      // ---------- v4: โรงนา / ลานสัตว์ ----------
      act('barn-tab', () => { F.UI.setBarnTab(t.dataset.tab); snd('click'); F.UI.showBarn(); });
      act('barn-buy', () => {
        if (F.buyAnimal(state, t.dataset.kind)) { snd('egg'); F.UI.confetti(12); checkNewNews(); }
        else reactToEvent(false);
        F.UI.showBarn(); afterEconomy();
      });
      act('barn-sell', () => {
        const uid = +t.dataset.uid;
        const a = F.findAnimal(state, uid);
        if (!a) return;
        const def = D.ANIMALS[a.kind];
        F.UI.openModal(`<h2>💸 ขาย${def.name}คืน?</h2>
          <p>ระดับและความสุขที่เลี้ยงมาจะหายไปด้วย ผลผลิตที่ค้างอยู่จะถูกเก็บเข้าคลังให้ก่อน</p>
          <div style="margin-top:12px; display:flex; gap:8px; justify-content:center">
            <button class="modal-btn" id="confirm-sell-animal">ใช่ ขายคืน</button>
            <button class="modal-btn" id="confirm-cancel">ยกเลิก</button>
          </div>`);
        $('confirm-sell-animal').addEventListener('click', () => {
          if (F.sellAnimal(state, uid)) snd('coin');
          F.UI.showBarn(); afterEconomy();
        });
        $('confirm-cancel').addEventListener('click', () => F.UI.showBarn());
      });
      act('barn-feed', () => {
        if (F.handFeed(state, +t.dataset.uid)) { snd('fert'); checkNewNews(); }
        else reactToEvent(false);
        F.UI.showBarn(); afterEconomy();
      });
      act('barn-collect', () => {
        if (F.collectAnimal(state, +t.dataset.uid) > 0) { snd('harvest'); checkNewNews(); }
        F.UI.showBarn(); afterEconomy();
      });
      act('barn-collect-all', () => {
        const res = F.collectAllProducts(state);
        if (res.total > 0) {
          snd('harvest');
          const parts = Object.entries(res.summary).map(([pid, n]) => `${D.PRODUCTS[pid].emoji}${n}`).join(' ');
          F.UI.toast(`🧺 เก็บผลผลิต ${res.total} ชิ้น — ${parts}`);
          if (res.total >= 10) F.UI.confetti(16);
          checkNewNews();
        }
        F.UI.showBarn(); afterEconomy();
      });
      act('barn-house-up', () => {
        if (F.upgradeHouse(state, t.dataset.house)) { snd('level'); F.UI.confetti(18); checkNewNews(); }
        else reactToEvent(false);
        F.UI.showBarn(); afterEconomy();
      });
      act('barn-buy-feed', () => {
        if (F.buyFeed(state, parseInt(t.dataset.n, 10) || 1)) snd('coin');
        else reactToEvent(false);
        F.UI.showBarn(); afterEconomy();
      });
      act('barn-craft-feed', () => {
        const made = F.craftFeed(state, t.dataset.crop, parseInt(t.dataset.times, 10) || 1);
        if (made > 0) { snd('fert'); F.UI.toast(`🌾 ผลิตอาหารสัตว์ ${made} หน่วย`); checkNewNews(); }
        else reactToEvent(false);
        F.UI.showBarn(); afterEconomy();
      });
      act('sell-product', () => {
        const got = F.sellProduct(state, t.dataset.pid, t.dataset.kind);
        if (got > 0) { snd('coin'); F.UI.toast(`ขายได้ ${got.toLocaleString('th-TH')}🪙`); }
        F.UI.showInventory(); afterEconomy();
      });
      act('buy-fert', () => {
        if (F.buyFertilizer(state, parseInt(t.dataset.n, 10) || 1)) snd('coin');
        else reactToEvent(false);
        F.UI.showShop(); afterEconomy();
      });
      act('buy-up', () => {
        if (F.buyUpgrade(state, t.dataset.id)) { snd('level'); F.UI.confetti(14); F.UI.renderSeedPick(); }
        else reactToEvent(false);
        F.UI.showShop(); afterEconomy();
      });
      act('sell-btn', () => {
        const got = F.sellItem(state, t.dataset.crop, t.dataset.kind);
        if (got > 0) { snd('coin'); F.UI.toast(`ขายได้ ${got.toLocaleString('th-TH')}🪙`); }
        F.UI.showInventory(); afterEconomy();
      });
      act('sell-eggs', () => {
        const got = F.sellEggs(state, t.dataset.kind);
        if (got > 0) { snd('coin'); F.UI.toast(`ขายไข่ได้ ${got.toLocaleString('th-TH')}🪙`); }
        F.UI.showInventory(); afterEconomy();
      });
      act('sell-all-btn', () => {
        const got = F.sellAll(state);
        if (got > 0) { snd('coin'); F.UI.toast(`ขายทั้งคลังได้ ${got.toLocaleString('th-TH')}🪙`); }
        F.UI.showInventory(); afterEconomy();
      });
      // settings
      act('vol-btn', () => {
        const v = parseInt(t.dataset.v, 10) / 100;
        window.Farm.Sound.setVolume(v); state.settings.volume = v;
        snd('click'); F.saveGame(state); F.UI.showSettings();
      });
      act('spd', () => {
        state.settings.speed = parseFloat(t.dataset.v);
        F.saveGame(state); F.UI.showSettings();
        F.UI.toast(`⏩ ความเร็วเกม: ${state.settings.speed}×`);
      });
      if (t.id === 'set-sound') {
        const S2 = window.Farm.Sound;
        S2.setEnabled(!S2.enabled);
        state.settings.sound = S2.enabled;
        $('btn-sound').textContent = S2.enabled ? '🔊' : '🔇';
        if (S2.enabled) S2.setUserInteracted();
        F.UI.showSettings();
      }
      if (t.id === 'set-reset') {
        F.clearSave(); location.reload();
      }
    });
  }

  // ---------- Game loop ----------
  let tickAcc = 0;
  setInterval(() => {
    if (!state) return;
    const speed = state.settings.speed || 1;
    tickAcc += D.CLOCK_PER_SEC * speed;
    const whole = Math.floor(tickAcc);
    if (whole > 0) {
      tickAcc -= whole;
      F.growTick(state, whole);
      checkNewNews();
      F.UI.renderAll();
    }
  }, 1000);
  setInterval(() => { if (state) F.saveGame(state); }, 30000);
  window.addEventListener('beforeunload', () => { if (state) F.saveGame(state); });

  // ปลดล็อก AudioContext ที่ user กดอะไรครั้งแรก (นโยบายเบราว์เซอร์)
  const unlockAudio = () => {
    window.Farm.Sound.setUserInteracted();
    document.removeEventListener('pointerdown', unlockAudio);
    document.removeEventListener('keydown', unlockAudio);
  };
  document.addEventListener('pointerdown', unlockAudio);
  document.addEventListener('keydown', unlockAudio);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') F.UI.closeModal();
    const map = { '1': 'till', '2': 'plant', '3': 'water', '4': 'harvest', '5': 'fert', '6': 'fill' };
    if (map[e.key] && !e.target.matches('input,textarea')) F.UI.setTool(map[e.key]);
  });

  window.addEventListener('DOMContentLoaded', () => {
    boot();
    bindButtons();
    bindModalDelegates();
  });

  // helper เล็กๆ
  F.closeModalSafe = ui => ui.closeModal();
})();