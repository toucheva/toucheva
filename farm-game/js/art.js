// ============ ฟาร์มมินิ v2.1 — ระบบกราฟิก SVG วาดมือ (แทน emoji) ============
// ทุกฟังก์ชันคืน string SVG ขนาด viewBox 0 0 100 100 — ทำงานออฟไลน์ ไม่โหลดไฟล์ภายนอก
(() => {
  const NS = 'svg';

  // ---------- palettes ของแต่ละพืช ----------
  const P = {
    carrot:    { leaf: '#3e9b4f', leafD: '#2e7a3b', fruit: '#ff8c1a', fruitD: '#e06d00', fruitL: '#ffb15e' },
    potato:    { leaf: '#4a8f3c', leafD: '#356b2b', fruit: '#c49a6c', fruitD: '#a37b50', fruitL: '#dcb88c' },
    cabbage:   { leaf: '#5cb04a', leafD: '#3f8a35', fruit: '#a8e063', fruitD: '#7cb84f', fruitL: '#d3f09a' },
    tomato:    { leaf: '#3f8f3f', leafD: '#2d6e2f', fruit: '#e74c3c', fruitD: '#c0392b', fruitL: '#ff8a75' },
    corn:      { leaf: '#7aa832', leafD: '#5c8424', fruit: '#f4c430', fruitD: '#d9a514', fruitL: '#ffe066' },
    strawberry:{ leaf: '#43a047', leafD: '#2f7a34', fruit: '#e91e63', fruitD: '#b4124c', fruitL: '#ff6fa5' },
    pumpkin:   { leaf: '#4c9a3f', leafD: '#37752d', fruit: '#ff9f1c', fruitD: '#e07b00', fruitL: '#ffc46b' },
    chili:     { leaf: '#2e7d32', leafD: '#1f5c24', fruit: '#e53935', fruitD: '#b71c1c', fruitL: '#ff7961' },
    grape:     { leaf: '#558b2f', leafD: '#3d661f', fruit: '#8e44ad', fruitD: '#6c3483', fruitL: '#bb7fd4' },
    melon:     { leaf: '#558b2f', leafD: '#3d661f', fruit: '#cddc39', fruitD: '#9eae2a', fruitL: '#f0f7a8' },
  };

  // ---------- ส่วนประกอบกลาง ----------
  const defs = `
    <defs>
      <radialGradient id="gSoil" cx="50%" cy="42%" r="75%">
        <stop offset="0%" stop-color="#b98757"/><stop offset="100%" stop-color="#8a5c36"/>
      </radialGradient>
      <radialGradient id="gSoilWet" cx="50%" cy="42%" r="75%">
        <stop offset="0%" stop-color="#7a5233"/><stop offset="100%" stop-color="#5c3d24"/>
      </radialGradient>
      <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#9ad7f5"/><stop offset="100%" stop-color="#d8f0c0"/>
      </linearGradient>
    </defs>`;

  // เงาใต้ต้นไม้
  function shadow(cx = 50, cy = 86, rx = 26, ry = 6, op = 0.25) {
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#3a2410" opacity="${op}"/>`;
  }
  // ดินที่ขุดโปร่ง (หลุมปลูก)
  function mound() {
    return `<ellipse cx="50" cy="85" rx="22" ry="7" fill="#6d452a"/>
            <ellipse cx="50" cy="83" rx="18" ry="5.5" fill="#7d5233"/>`;
  }
  // ต้นกล้า (stage 1): ลำต้น + ใบเลี้ยงคู่ สีตามพืช
  function sprout(p) {
    return mound() + shadow(50, 88, 18, 5, 0.2) + `
      <path d="M50 84 C49 76 50 70 50 64" stroke="#4c7d34" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M50 66 C44 62 38 62 34 66 C38 71 45 71 50 68 Z" fill="${p.leaf}"/>
      <path d="M50 66 C56 62 62 62 66 66 C62 71 55 71 50 68 Z" fill="${p.leafD}"/>
      <circle cx="50" cy="62" r="2.2" fill="${p.leafD}"/>`;
  }
  // พุ่มใบกลาง (stage 2 ใช้ร่วม): ลำต้นสั้น + ใบ 4-5 ใบ
  function bush(p, s = 1) {
    const g = [];
    g.push(`<path d="M50 88 C48 78 48 72 50 64" stroke="${p.leafD}" stroke-width="4" fill="none" stroke-linecap="round"/>`);
    const leaves = [
      [50, 66, 32, 58, 24, 66, 40, 74],   // ซ้ายบน
      [50, 66, 68, 58, 76, 66, 60, 74],   // ขวาบน
      [50, 74, 30, 74, 26, 82, 44, 84],   // ซ้ายล่าง
      [50, 74, 70, 74, 74, 82, 56, 84],   // ขวาล่าง
    ];
    leaves.forEach((L, i) => {
      const [x1, y1, cx1, cy1, ex, ey, cx2, cy2] = L.map(v => 50 + (v - 50) * s);
      g.push(`<path d="M${x1} ${y1} C${cx1} ${cy1} ${ex} ${ey} ${cx2} ${cy2}" fill="${i % 2 ? p.leafD : p.leaf}"/>`);
    });
    g.push(`<ellipse cx="50" cy="66" rx="6" ry="5" fill="${p.leaf}"/>`);
    return g.join('');
  }

  // ---------- ผลไม้แต่ละชนิด (stage 3) + ต้นเฉพาะ (stage 2) ----------
  const FRUIT = {
    carrot(p) { // แตงโมหัวชี้ขึ้นโผล่ดิน + ผอบใบฟู
      return mound() + shadow(50, 87, 20, 5) + `
        <path d="M50 55 C42 60 40 70 42 78 C44 84 56 84 58 78 C60 70 58 60 50 55 Z" fill="${p.fruit}"/>
        <path d="M45 60 C46 68 46 74 45 79 M55 60 C54 68 54 74 55 79" stroke="${p.fruitD}" stroke-width="1.6" fill="none"/>
        <path d="M50 56 C44 50 38 50 32 46 C38 44 44 46 48 44 C46 38 42 34 40 28 C46 32 49 38 50 36 C51 38 54 32 60 28 C58 34 54 38 52 44 C56 46 62 44 68 46 C62 50 56 50 50 56Z" fill="${p.leaf}"/>
        <path d="M48 44 C46 40 44 36 44 32 M52 44 C54 40 56 36 56 32" stroke="${p.leafD}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    },
    potato(p) { // พุ่มใบ + มันโผล่ผิวดิน 2 หัว
      return mound() + shadow(50, 87, 24, 5.5) + bush(p, 1.05) + `
        <ellipse cx="40" cy="84" rx="9" ry="6.5" fill="${p.fruit}"/>
        <ellipse cx="40" cy="84" rx="9" ry="6.5" fill="none" stroke="${p.fruitD}" stroke-width="1.2"/>
        <ellipse cx="61" cy="85" rx="7.5" ry="5.5" fill="${p.fruitL}"/>
        <circle cx="38" cy="83" r="0.9" fill="${p.fruitD}"/><circle cx="43" cy="86" r="0.9" fill="${p.fruitD}"/><circle cx="62" cy="85" r="0.8" fill="${p.fruitD}"/>`;
    },
    cabbage(p) { // กะหล่ำกลีบซ้อน
      return mound() + shadow(50, 87, 24, 5.5) + `
        <path d="M28 84 C22 74 26 62 36 58 C30 66 32 74 38 78 Z" fill="${p.leafD}"/>
        <path d="M72 84 C78 74 74 62 64 58 C70 66 68 74 62 78 Z" fill="${p.leafD}"/>
        <circle cx="50" cy="72" r="17" fill="${p.leaf}"/>
        <path d="M38 68 C40 60 48 57 54 59 C60 61 63 67 61 73 C58 79 48 81 42 77 C39 75 37 71 38 68Z" fill="${p.fruit}"/>
        <path d="M44 62 C48 60 54 61 57 65" stroke="${p.fruitL}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    },
    tomato(p) { // ไม้ค้ำ + พุ่ม + มะเขือแดง 3 ลูก
      return mound() + shadow(50, 87, 22, 5) + `
        <path d="M64 88 L64 34" stroke="#9c7b4f" stroke-width="3.4" stroke-linecap="round"/>
        <path d="M64 40 C56 40 50 44 46 50 M64 52 C58 52 53 55 50 60" stroke="${p.leafD}" stroke-width="2.2" fill="none"/>
        <path d="M50 88 C47 76 47 66 50 56 C58 52 66 56 66 64 C66 74 60 82 50 88Z" fill="${p.leaf}"/>
        <path d="M52 60 C46 58 41 60 39 65 C43 69 50 68 53 64Z" fill="${p.leafD}"/>
        <circle cx="44" cy="74" r="6.5" fill="${p.fruit}"/><circle cx="57" cy="78" r="7" fill="${p.fruit}"/>
        <circle cx="52" cy="66" r="5.5" fill="${p.fruitL}"/>
        <path d="M44 71 l-1.6-2 M57 75 l-1.5-2" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`;
    },
    corn(p) { // ต้นสูง 2 ต้น + ฝักเมล็ดเหลือง
      return mound() + shadow(50, 87, 22, 5) + `
        <path d="M40 88 C38 70 38 50 42 30 C46 34 48 52 47 70 C46 78 44 84 42 88Z" fill="${p.leaf}"/>
        <path d="M62 88 C64 70 64 52 60 34 C57 40 55 56 56 72 C57 80 59 85 61 88Z" fill="${p.leafD}"/>
        <path d="M41 60 C34 56 28 58 24 64 C30 68 38 66 42 62Z" fill="${p.leaf}"/>
        <path d="M61 54 C68 50 74 52 78 58 C72 62 64 60 60 56Z" fill="${p.leafD}"/>
        <path d="M46 58 C44 66 44 74 46 80 C49 74 49 64 48 58Z" fill="${p.fruit}"/>
        <g fill="${p.fruitD}">
          <circle cx="46.4" cy="62" r="1"/><circle cx="47.8" cy="64.5" r="1"/><circle cx="46.2" cy="67" r="1"/>
          <circle cx="47.6" cy="69.5" r="1"/><circle cx="46.4" cy="72" r="1"/><circle cx="47.6" cy="74.5" r="1"/>
        </g>
        <path d="M44 58 C43 52 45 46 47 42 C49 47 49 53 48 58Z" fill="${p.leafL || p.leaf}"/>`;
    },
    strawberry(p) { // พุ่มเตี้ย + สตรอแดง + ดอกขาว
      return mound() + shadow(50, 87, 23, 5) + `
        <path d="M50 82 C42 80 34 76 30 70 C38 70 45 74 50 78Z" fill="${p.leaf}"/>
        <path d="M50 82 C58 80 66 76 70 70 C62 70 55 74 50 78Z" fill="${p.leafD}"/>
        <path d="M50 80 C46 74 44 66 46 58 C50 54 55 56 56 62 C57 68 54 76 50 80Z" fill="${p.leaf}"/>
        <path d="M38 76 C33 72 33 66 37 63 C41 66 42 72 40 76Z" fill="${p.fruit}"/>
        <path d="M63 78 C68 74 68 68 64 65 C60 68 59 74 61 78Z" fill="${p.fruitL}"/>
        <circle cx="38" cy="66" r="0.9" fill="#ffe082"/><circle cx="40" cy="70" r="0.9" fill="#ffe082"/>
        <g transform="translate(52,50)">
          <circle cx="0" cy="-3.5" r="2.8" fill="#fff"/><circle cx="3.3" cy="-1" r="2.8" fill="#fff"/>
          <circle cx="2" cy="3" r="2.8" fill="#fff"/><circle cx="-2" cy="3" r="2.8" fill="#fff"/><circle cx="-3.3" cy="-1" r="2.8" fill="#fff"/>
          <circle cx="0" cy="0" r="1.8" fill="#ffd54f"/>
        </g>`;
    },
    pumpkin(p) { // เถา + ฟักทองใหญ่มีร่อง
      return mound() + shadow(50, 88, 28, 6, 0.3) + `
        <path d="M22 78 C30 74 36 70 40 64 M78 80 C70 76 64 70 60 64" stroke="${p.leafD}" stroke-width="2.4" fill="none"/>
        <path d="M20 76 C16 70 18 64 24 63 C28 67 28 73 25 77Z" fill="${p.leaf}"/>
        <path d="M80 78 C84 72 82 66 76 65 C72 69 72 75 75 79Z" fill="${p.leaf}"/>
        <ellipse cx="50" cy="76" rx="24" ry="13" fill="${p.fruit}"/>
        <path d="M38 65 C34 70 34 82 38 87 M50 63 C47 70 47 83 50 88 M62 65 C66 70 66 82 62 87" stroke="${p.fruitD}" stroke-width="2" fill="none"/>
        <ellipse cx="50" cy="72" rx="14" ry="6" fill="${p.fruitL}" opacity=".55"/>
        <path d="M50 63 C48 58 52 54 50 50" stroke="${p.leafD}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        <path d="M53 52 C57 50 60 52 61 55 C58 57 54 56 53 53Z" fill="${p.leaf}"/>`;
    },
    chili(p) { // พุ่ม + พริกแดงห้อยลง 3 เม็ด
      return mound() + shadow(50, 87, 21, 5) + bush(p, 1) + `
        <path d="M42 74 C40 80 40 86 42 90" stroke="${p.fruit}" stroke-width="3.6" fill="none" stroke-linecap="round"/>
        <path d="M52 76 C51 82 51 87 52 91" stroke="${p.fruitD}" stroke-width="3.6" fill="none" stroke-linecap="round"/>
        <path d="M60 72 C60 78 61 83 63 87" stroke="${p.fruitL}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        <path d="M42 74 C40 72 44 71 43 73 M52 76 C50 74 54 73 53 75" stroke="#2e7d32" stroke-width="2.2" fill="none"/>`;
    },
    grape(p) { // ซี่ค้ำไม้ไผ่ + เถา + พวงองุ่นม่วง 2 พวง
      return mound() + shadow(50, 87, 22, 5) + `
        <path d="M28 88 L28 30 M50 88 L50 28 M72 88 L72 30" stroke="#b08d5a" stroke-width="3" stroke-linecap="round"/>
        <path d="M28 36 C40 34 60 34 72 36 M28 54 C40 52 60 52 72 54 M28 70 C40 68 60 68 72 70" stroke="#c9a26b" stroke-width="2.4"/>
        <path d="M30 70 C40 60 60 60 70 70 M30 50 C42 42 58 42 70 50" stroke="${p.leafD}" stroke-width="2.2" fill="none"/>
        <path d="M34 66 C30 62 30 56 34 54 C38 57 38 63 36 66Z" fill="${p.leaf}"/>
        <path d="M66 66 C70 62 70 56 66 54 C62 57 62 63 64 66Z" fill="${p.leaf}"/>` +
        [36, 48].map((cx, bi) => {
          let out = '';
          const pts = [[0, 0], [-5, 5], [5, 5], [-8, 11], [0, 11], [8, 11], [-4, 17], [4, 17], [0, 23]];
          pts.forEach(([dx, dy]) => {
            out += `<circle cx="${cx + dx}" cy="${(bi ? 42 : 56) + dy}" r="4" fill="${dy ? p.fruit : p.fruitD}"/>`;
          });
          return out;
        }).join('');
    },
    melon(p) { // เถาแตงโมเน็ตลาย + ลูกกลมใหญ่
      return mound() + shadow(50, 88, 28, 6, 0.3) + `
        <path d="M24 76 C30 72 36 68 42 66 M76 78 C70 74 64 70 58 68" stroke="${p.leafD}" stroke-width="2.4" fill="none"/>
        <path d="M22 74 C18 68 20 62 26 61 C30 65 30 71 27 75Z" fill="${p.leaf}"/>
        <circle cx="52" cy="74" r="18" fill="${p.fruit}"/>
        <path d="M38 68 C44 62 60 62 66 68 M36 76 C42 82 62 82 68 76" stroke="${p.fruitD}" stroke-width="1.6" fill="none" opacity=".7"/>
        <path d="M43 66 C47 72 47 78 44 83 M52 63 C56 70 56 79 52 86 M61 66 C65 72 65 78 62 83" stroke="${p.fruitD}" stroke-width="1.4" fill="none" opacity=".5"/>
        <ellipse cx="46" cy="66" rx="7" ry="4" fill="#fff" opacity=".35"/>
        <path d="M74 62 C78 58 76 52 70 52 C67 56 69 61 73 63Z" fill="${p.leaf}"/>`;
    },
  };

  // stage 2 ของบางพืชใช้ bush + ผลอ่อนสีเขียวเล็ก
  function cropArt(cropId, stage) {
    const p = P[cropId] || P.carrot;
    if (stage <= 0) {
      // หลุมดิน + เมล็ด
      return `<ellipse cx="50" cy="84" rx="16" ry="5.5" fill="#6d452a"/>
              <ellipse cx="50" cy="83" rx="12" ry="4" fill="#5c3a24"/>
              <ellipse cx="47" cy="82" rx="2.4" ry="1.6" fill="${p.fruit}" opacity=".9"/>
              <ellipse cx="53" cy="84" rx="2.4" ry="1.6" fill="${p.fruit}" opacity=".9"/>`;
    }
    if (stage === 1) return sprout(p);
    if (stage === 2) {
      // ต้นโตยังไม่มีผล — ใช้ bush ใหญ่ + ดอกอ่อน/ผลเขียวติดๆ
      return mound() + shadow(50, 87, 22, 5) + bush(p, 1.15) +
        `<circle cx="42" cy="70" r="3" fill="#eaf5d0" opacity=".9"/><circle cx="58" cy="73" r="3" fill="#eaf5d0" opacity=".9"/>
         <circle cx="50" cy="60" r="2.2" fill="#fff" opacity=".8"/>`;
    }
    return (FRUIT[cropId] || FRUIT.carrot)(p);
  }

  // ---------- แปลงพื้นหลัง ----------
  function tileGrass(i) {
    // หญ้า + ใบหญ้ากระจาย + ดอกเล็ก ตำแหน่ง deterministic ตาม i
    let g = `<rect x="0" y="0" width="100" height="100" fill="#79b45c"/>
      <rect x="0" y="0" width="100" height="100" fill="url(#none)" />
      <path d="M0 0 L100 0 L100 100 L0 100 Z" fill="none"/>
      <rect x="0" y="92" width="100" height="8" fill="#68a04e" opacity=".8"/>
      <rect x="0" y="0" width="100" height="6" fill="#8ac06c" opacity=".7"/>`;
    const rnd = (n) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
    for (let k = 0; k < 7; k++) {
      const x = 8 + rnd(k) * 84, y = 10 + rnd(k + 9) * 76;
      g += `<path d="M${x} ${y} C${x - 2} ${y - 5} ${x - 1} ${y - 8} ${x + 1} ${y - 10} C${x + 2} ${y - 7} ${x + 2} ${y - 3} ${x} ${y}" fill="#5e9c46"/>`;
    }
    if (rnd(5) > 0.5) {
      const x = 20 + rnd(3) * 60, y = 20 + rnd(4) * 55;
      g += `<g transform="translate(${x},${y})"><circle cx="-2" cy="0" r="1.8" fill="#fff"/><circle cx="2" cy="0" r="1.8" fill="#fff"/>
            <circle cx="0" cy="-2" r="1.8" fill="#fff"/><circle cx="0" cy="2" r="1.8" fill="#fff"/><circle cx="0" cy="0" r="1.4" fill="#ffd54f"/></g>`;
    }
    return g;
  }
  function tileSoil(wet) {
    const base = wet ? 'url(#gSoilWet)' : 'url(#gSoil)';
    let g = `<rect x="0" y="0" width="100" height="100" fill="${base}"/>`;
    // ร่องดินไถนอน
    for (let y = 14; y < 96; y += 16) {
      g += `<path d="M4 ${y} C30 ${y - 3} 70 ${y + 3} 96 ${y}" stroke="${wet ? '#4a3018' : '#7a4f2e'}" stroke-width="4" fill="none" opacity=".55" stroke-linecap="round"/>`;
    }
    // ก้อนกรวดเล็ก
    g += `<circle cx="20" cy="30" r="2.4" fill="${wet ? '#6b4a2c' : '#a5744a'}"/><circle cx="78" cy="58" r="2" fill="${wet ? '#6b4a2c' : '#a5744a'}"/><circle cx="60" cy="88" r="1.7" fill="${wet ? '#6b4a2c' : '#a5744a'}"/>`;
    if (wet) g += `<ellipse cx="34" cy="24" rx="10" ry="4" fill="#8fc3e8" opacity=".18"/><ellipse cx="68" cy="72" rx="8" ry="3.4" fill="#8fc3e8" opacity=".15"/>`;
    return g;
  }

  // ---------- ไก่การ์ตูน ----------
  function chicken(kind = 'hen') {
    const body = kind === 'chick' ? '#ffd54f' : '#e8b04b';
    const bodyD = kind === 'chick' ? '#f0b429' : '#c99436';
    const comb = '#e05252';
    const tail = kind === 'rooster'
      ? `<path d="M70 42 C78 30 76 22 70 18 C71 26 66 30 63 34 Z" fill="#2e7d32"/><path d="M72 46 C82 40 86 32 82 26 C80 34 74 40 69 44Z" fill="${comb}"/>`
      : `<path d="M68 44 C76 38 78 30 74 26 C73 34 68 40 64 43Z" fill="${bodyD}"/>`;
    return `<g>
      ${shadow(50, 88, 20, 4, 0.2)}
      <path d="M30 62 C26 50 34 38 48 38 C60 38 68 46 68 56 C68 68 58 76 46 76 C36 76 32 70 30 62Z" fill="${body}"/>
      <path d="M38 58 C36 52 42 46 50 47 C56 48 60 52 59 57 C58 63 50 66 44 64 C40 63 39 61 38 58Z" fill="${bodyD}" opacity=".5"/>
      <path d="M46 74 C42 80 40 84 40 88 M56 73 C55 80 55 85 56 88" stroke="#d99a2b" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M66 68 C74 66 80 62 82 56 C76 54 70 56 66 60Z" fill="${bodyD}"/>
      <circle cx="62" cy="46" r="11" fill="${body}"/>
      <path d="M56 38 C56 32 60 30 62 34 C63 30 67 30 67 35 C68 32 71 33 70 37" stroke="${comb}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M72 46 L80 48 L72 51 Z" fill="#f2a33c"/>
      <circle cx="65" cy="43" r="2.2" fill="#2b2b2b"/><circle cx="65.8" cy="42.3" r="0.7" fill="#fff"/>
      <path d="M60 52 C62 53.6 64 53.6 66 52" stroke="#c99436" stroke-width="1.4" fill="none"/>
      ${kind === 'rooster' ? `<path d="M40 36 C36 28 40 22 46 24 C44 18 50 14 55 18 C60 14 66 18 64 24 C70 24 72 30 68 36 Z" fill="${comb}" opacity="0"/>` : ''}
      ${kind === 'chick' ? '' : tail}
    </g>`;
  }

  // ============ v4: สัตว์เลี้ยง 7 ชนิด ============
  // ทุกตัววาดใน viewBox 0 0 100 100 ยืนบนเส้นดินที่ y≈88 เพื่อให้วางเรียงกันแล้วดูเป็นฝูงเดียวกัน
  // mood: 'happy' | 'ok' | 'hungry' | 'sleep' — เปลี่ยนตา ปาก และของประกอบรอบตัว
  const AP = {
    chicken: { body: '#e8b04b', dark: '#c99436', light: '#f7d489', accent: '#e05252', beak: '#f2a33c' },
    duck:    { body: '#f7f3e8', dark: '#d9d2bf', light: '#ffffff', accent: '#2f7d6a', beak: '#f2a33c' },
    bee:     { body: '#f4c430', dark: '#3a3020', light: '#ffe066', accent: '#3a3020', beak: '#3a3020' },
    goat:    { body: '#ece6da', dark: '#c8bfac', light: '#fbf8f1', accent: '#8b7355', beak: '#d9b382' },
    sheep:   { body: '#fbf7ef', dark: '#ded7c7', light: '#ffffff', accent: '#403842', beak: '#403842' },
    cow:     { body: '#fdfaf4', dark: '#d6cfc2', light: '#ffffff', accent: '#3a332e', beak: '#f2a6b0' },
    pig:     { body: '#f2a6b6', dark: '#d88395', light: '#ffc7d3', accent: '#c76e83', beak: '#e88fa1' },
  };

  // ตา 1 ข้าง ตามอารมณ์
  function eye(x, y, mood, r = 2.3) {
    if (mood === 'sleep') return `<path d="M${x - 3} ${y} q3 3 6 0" stroke="#2b2b2b" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    if (mood === 'happy') return `<path d="M${x - 3} ${y + 1} q3 -4 6 0" stroke="#2b2b2b" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    if (mood === 'hungry') return `<ellipse cx="${x}" cy="${y}" rx="${r * 0.75}" ry="${r * 1.15}" fill="#2b2b2b"/>`;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#2b2b2b"/><circle cx="${x + 0.8}" cy="${y - 0.8}" r="${r * 0.32}" fill="#fff"/>`;
  }
  // ของประกอบอารมณ์: แก้มแดงตอนมีความสุข / เหงื่อตอนหิว / Zzz ตอนหลับ
  function moodExtra(mood, x = 50, y = 40) {
    if (mood === 'happy') return `<circle cx="${x - 12}" cy="${y + 6}" r="3.2" fill="#ff9aa8" opacity=".55"/><circle cx="${x + 12}" cy="${y + 6}" r="3.2" fill="#ff9aa8" opacity=".55"/>`;
    if (mood === 'hungry') return `<path d="M${x + 16} ${y - 8} q3 5 0 8 q-3 -3 0 -8Z" fill="#7fc7e8" opacity=".9"/>`;
    if (mood === 'sleep') return `<text x="${x + 16}" y="${y - 8}" font-size="13" fill="#5c7a9c" opacity=".8">z</text>
      <text x="${x + 24}" y="${y - 16}" font-size="9" fill="#5c7a9c" opacity=".6">z</text>`;
    return '';
  }

  const ANIMAL_ART = {
    chicken(p, mood, kind) {
      const isRooster = kind === 'rooster', isChick = kind === 'chick';
      const body = isChick ? '#ffd54f' : p.body, dark = isChick ? '#f0b429' : p.dark;
      const sc = isChick ? 0.72 : 1;
      const tail = isRooster
        ? `<path d="M70 42 C79 29 77 20 70 16 C71 25 65 30 62 34Z" fill="#2e7d32"/><path d="M73 47 C84 40 88 31 83 24 C81 33 74 40 69 44Z" fill="${p.accent}"/>`
        : (isChick ? '' : `<path d="M68 45 C77 38 79 29 74 25 C73 34 68 40 63 43Z" fill="${dark}"/>`);
      return `<g transform="translate(50,88) scale(${sc}) translate(-50,-88)">
        ${shadow(50, 88, 20, 4.5, 0.22)}
        ${tail}
        <path d="M30 62 C26 49 34 37 48 37 C61 37 69 46 69 56 C69 68 58 77 46 77 C36 77 32 70 30 62Z" fill="${body}"/>
        <path d="M38 58 C36 51 42 45 50 46 C56 47 60 52 59 57 C58 63 50 66 44 64 C40 63 39 61 38 58Z" fill="${dark}" opacity=".38"/>
        <path d="M45 75 C42 81 41 85 41 89 M57 74 C56 81 56 86 57 89" stroke="${p.beak}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        <path d="M66 68 C75 66 81 61 83 55 C77 53 70 55 66 60Z" fill="${dark}"/>
        <circle cx="62" cy="45" r="11.5" fill="${body}"/>
        ${isChick ? '' : `<path d="M55 37 C55 31 59 29 61 33 C62 29 66 29 66 34 C67 31 70 32 69 36" stroke="${p.accent}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`}
        <path d="M72 45 L81 47.5 L72 50.5 Z" fill="${p.beak}"/>
        ${isRooster ? `<path d="M60 53 C61 57 63 59 65 59" stroke="${p.accent}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` : ''}
        ${eye(65, 42, mood)}
        ${moodExtra(mood, 58, 44)}
      </g>`;
    },

    duck(p, mood) {
      return `<g>
        ${shadow(50, 88, 22, 5, 0.22)}
        <path d="M26 64 C22 52 31 40 46 40 C61 40 71 48 71 59 C71 71 59 79 45 79 C34 79 28 72 26 64Z" fill="${p.body}"/>
        <path d="M36 60 C34 53 41 47 49 48 C56 49 60 54 58 60 C56 66 47 68 41 66 C37 65 36 63 36 60Z" fill="${p.dark}" opacity=".45"/>
        <path d="M68 70 C77 68 83 62 84 55 C77 53 70 56 66 62Z" fill="${p.dark}"/>
        <path d="M44 77 C41 82 40 86 41 89 M56 76 C55 82 55 86 56 89" stroke="${p.beak}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        <path d="M60 48 C58 36 62 26 70 24 C78 23 82 30 79 37 C77 42 72 45 68 47Z" fill="${p.body}"/>
        <path d="M64 30 C67 25 73 24 77 27 C74 25 68 26 65 31Z" fill="${p.accent}" opacity=".75"/>
        <ellipse cx="72" cy="31" rx="8" ry="7" fill="${p.body}"/>
        <path d="M79 31 C86 29 90 32 89 35 C87 37 82 36 79 34Z" fill="${p.beak}"/>
        <path d="M80 33 C84 32 87 33 88 34.5" stroke="${p.dark}" stroke-width="1" fill="none" opacity=".6"/>
        ${eye(74, 29, mood, 2)}
        ${moodExtra(mood, 66, 32)}
      </g>`;
    },

    bee(p, mood) {
      return `<g>
        ${shadow(50, 84, 15, 4, 0.18)}
        <g transform="translate(0,-4)">
          <ellipse cx="38" cy="46" rx="17" ry="13" fill="#cfe9f7" opacity=".62" transform="rotate(-24 38 46)"/>
          <ellipse cx="62" cy="46" rx="17" ry="13" fill="#cfe9f7" opacity=".62" transform="rotate(24 62 46)"/>
          <ellipse cx="50" cy="66" rx="24" ry="19" fill="${p.body}"/>
          <path d="M38 54 C42 70 44 78 47 84" stroke="${p.dark}" stroke-width="7" fill="none" opacity=".92"/>
          <path d="M52 51 C56 68 57 78 59 82" stroke="${p.dark}" stroke-width="7" fill="none" opacity=".92"/>
          <path d="M70 62 C76 66 78 72 74 76 C71 72 70 66 70 62Z" fill="${p.dark}"/>
          <circle cx="34" cy="58" r="13" fill="${p.dark}"/>
          <path d="M28 47 C25 41 26 36 30 35 M38 46 C40 40 39 35 35 34" stroke="${p.dark}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
          <circle cx="30" cy="35" r="2.4" fill="${p.body}"/><circle cx="35" cy="34" r="2.4" fill="${p.body}"/>
          ${mood === 'sleep'
            ? `<path d="M28 58 q3 3 6 0" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
            : `<circle cx="31" cy="57" r="2.6" fill="#fff"/><circle cx="31.7" cy="56.3" r="1.1" fill="#2b2b2b"/>`}
          ${mood === 'happy' ? `<path d="M28 64 q4 3 8 0" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".85"/>` : ''}
        </g>
        ${moodExtra(mood, 62, 44)}
      </g>`;
    },

    goat(p, mood) {
      return `<g>
        ${shadow(50, 88, 24, 5, 0.22)}
        <path d="M24 62 C24 51 33 45 48 45 C64 45 74 51 74 62 C74 72 66 78 49 78 C33 78 24 72 24 62Z" fill="${p.body}"/>
        <path d="M32 76 L31 89 M44 78 L43 89 M58 77 L59 89 M69 74 L70 88" stroke="${p.dark}" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M24 60 C18 58 14 61 15 65 C17 68 22 67 25 65Z" fill="${p.dark}"/>
        <ellipse cx="72" cy="45" rx="14" ry="12.5" fill="${p.body}"/>
        <path d="M78 55 C84 55 88 52 88 48 C84 46 79 48 77 51Z" fill="${p.light}"/>
        <ellipse cx="85" cy="49" rx="4.5" ry="3.6" fill="${p.beak}"/>
        <circle cx="84" cy="48" r="0.9" fill="${p.dark}"/><circle cx="87" cy="49.5" r="0.9" fill="${p.dark}"/>
        <path d="M66 35 C62 27 64 21 69 21 C71 25 70 31 69 35Z" fill="${p.accent}"/>
        <path d="M76 34 C74 26 77 20 82 21 C83 26 80 31 78 35Z" fill="${p.accent}"/>
        <path d="M60 44 C54 42 50 44 50 48 C54 50 59 49 62 47Z" fill="${p.dark}"/>
        <path d="M78 58 C77 65 79 70 82 72 C84 68 83 61 81 57Z" fill="${p.light}"/>
        ${eye(74, 43, mood, 2.2)}
        ${moodExtra(mood, 64, 40)}
      </g>`;
    },

    sheep(p, mood) {
      const puff = [[30, 58, 13], [44, 50, 15], [60, 52, 14], [70, 62, 12], [36, 70, 13], [52, 72, 14], [65, 72, 12]];
      return `<g>
        ${shadow(50, 88, 26, 5.5, 0.22)}
        ${puff.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.body}"/>`).join('')}
        ${puff.map(([x, y, r]) => `<circle cx="${x - r * 0.25}" cy="${y - r * 0.25}" r="${r * 0.55}" fill="${p.light}" opacity=".7"/>`).join('')}
        <path d="M34 80 L33 89 M46 82 L45 89 M58 82 L59 89 M68 79 L69 88" stroke="${p.accent}" stroke-width="4.5" stroke-linecap="round"/>
        <ellipse cx="76" cy="56" rx="12" ry="11" fill="${p.accent}"/>
        <path d="M66 50 C60 46 56 48 57 53 C61 55 65 54 67 52Z" fill="${p.accent}"/>
        <path d="M87 50 C93 47 96 50 94 54 C91 56 88 54 86 52Z" fill="${p.accent}"/>
        <circle cx="74" cy="48" r="8" fill="${p.body}"/><circle cx="72" cy="47" r="5" fill="${p.light}"/>
        <ellipse cx="80" cy="61" rx="4" ry="3" fill="#5c5060"/>
        ${mood === 'sleep'
          ? `<path d="M70 55 q3 3 6 0" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M80 55 q3 3 6 0" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
          : `<circle cx="73" cy="56" r="2.2" fill="#fff"/><circle cx="83" cy="56" r="2.2" fill="#fff"/><circle cx="73.5" cy="56" r="1" fill="#2b2b2b"/><circle cx="83.5" cy="56" r="1" fill="#2b2b2b"/>`}
        ${moodExtra(mood, 64, 46)}
      </g>`;
    },

    cow(p, mood) {
      return `<g>
        ${shadow(50, 89, 28, 5.5, 0.24)}
        <path d="M18 60 C18 48 28 42 46 42 C65 42 76 49 76 61 C76 73 66 79 46 79 C29 79 18 72 18 60Z" fill="${p.body}"/>
        <ellipse cx="34" cy="55" rx="10" ry="8" fill="${p.accent}"/>
        <ellipse cx="58" cy="65" rx="8" ry="6.5" fill="${p.accent}"/>
        <ellipse cx="26" cy="70" rx="6" ry="4.5" fill="${p.accent}" opacity=".85"/>
        <path d="M26 77 L25 89 M40 79 L39 89 M56 78 L57 89 M70 74 L71 88" stroke="${p.accent}" stroke-width="5" stroke-linecap="round"/>
        <path d="M18 58 C11 55 7 58 8 63 C11 66 16 64 19 62Z" fill="${p.dark}"/>
        <path d="M46 74 C46 80 49 83 52 83 C54 80 53 75 51 72Z" fill="${p.beak}" opacity=".9"/>
        <ellipse cx="74" cy="47" rx="15" ry="13.5" fill="${p.body}"/>
        <path d="M62 40 C56 34 56 28 61 28 C65 30 66 36 65 41Z" fill="${p.light}" stroke="${p.dark}" stroke-width="1.4"/>
        <path d="M86 40 C92 34 92 28 87 28 C83 30 82 36 83 41Z" fill="${p.light}" stroke="${p.dark}" stroke-width="1.4"/>
        <ellipse cx="80" cy="57" rx="10" ry="8" fill="${p.beak}"/>
        <ellipse cx="77" cy="56" rx="1.8" ry="2.4" fill="${p.accent}" opacity=".7"/>
        <ellipse cx="84" cy="57" rx="1.8" ry="2.4" fill="${p.accent}" opacity=".7"/>
        ${eye(70, 44, mood, 2.4)}${eye(82, 44, mood, 2.4)}
        ${moodExtra(mood, 60, 40)}
      </g>`;
    },

    pig(p, mood) {
      return `<g>
        ${shadow(50, 88, 25, 5, 0.22)}
        <path d="M22 62 C22 51 32 45 48 45 C65 45 75 51 75 62 C75 72 66 78 48 78 C31 78 22 72 22 62Z" fill="${p.body}"/>
        <path d="M30 76 L29 89 M43 78 L42 89 M57 77 L58 89 M69 74 L70 88" stroke="${p.dark}" stroke-width="4.8" stroke-linecap="round"/>
        <path d="M22 58 C16 54 12 57 14 61 C15 64 19 63 20 61 C18 63 20 66 23 65" stroke="${p.dark}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        <ellipse cx="72" cy="48" rx="15" ry="13.5" fill="${p.body}"/>
        <path d="M62 36 C58 30 61 26 66 28 C68 31 67 35 65 38Z" fill="${p.dark}"/>
        <path d="M82 36 C86 30 83 26 78 28 C76 31 77 35 79 38Z" fill="${p.dark}"/>
        <ellipse cx="82" cy="55" rx="9" ry="7" fill="${p.beak}"/>
        <ellipse cx="79" cy="55" rx="1.7" ry="2.4" fill="${p.dark}"/><ellipse cx="85" cy="55" rx="1.7" ry="2.4" fill="${p.dark}"/>
        <ellipse cx="40" cy="60" rx="9" ry="6" fill="${p.light}" opacity=".55"/>
        ${eye(70, 44, mood, 2.3)}${eye(80, 43, mood, 2.3)}
        ${moodExtra(mood, 60, 40)}
      </g>`;
    },
  };

  // ป้ายระดับสัตว์ (มุมขวาบน) — ดาว/มงกุฎตามระดับที่เลี้ยงมา
  function tierBadge(tier) {
    if (!tier || tier <= 1) return '';
    if (tier >= 4) return `<g transform="translate(84,16)"><path d="M-9 4 L-9 -4 L-4.5 0 L0 -6 L4.5 0 L9 -4 L9 4 Z" fill="#f0b429" stroke="#b07d10" stroke-width="1.2"/><circle cx="0" cy="-8" r="1.8" fill="#e74c3c"/></g>`;
    const n = tier - 1;
    return `<g transform="translate(${88 - (n - 1) * 11},14)">${Array.from({ length: n }, (_, i) =>
      `<path transform="translate(${i * 11},0)" d="M0 -6 L1.8 -1.9 L6.2 -1.6 L2.8 1.3 L3.9 5.6 L0 3.2 L-3.9 5.6 L-2.8 1.3 L-6.2 -1.6 L-1.8 -1.9 Z" fill="#f0b429" stroke="#b07d10" stroke-width=".9"/>`).join('')}</g>`;
  }

  // สัตว์ 1 ตัวพร้อมอารมณ์และป้ายระดับ
  function animalArt(kind, opts = {}) {
    const draw = ANIMAL_ART[kind] || ANIMAL_ART.chicken;
    const pal = AP[kind] || AP.chicken;
    return draw(pal, opts.mood || 'ok', opts.variant) + tierBadge(opts.tier);
  }
  // ครอบเฉพาะบริเวณที่ตัวสัตว์อยู่จริง (ไม่เอาช่องว่างด้านบน) ตัวสัตว์จึงดูใหญ่เต็มกรอบ
  function animalSVG(kind, opts = {}) {
    return `<svg viewBox="6 10 90 84" style="width:100%;height:100%;overflow:visible">${animalArt(kind, opts)}</svg>`;
  }

  // ---------- ไอคอนผลผลิตสัตว์ ----------
  const PRODUCT_ART = {
    egg:      `<ellipse cx="50" cy="56" rx="24" ry="30" fill="#fdf6e3"/><ellipse cx="42" cy="46" rx="8" ry="11" fill="#fff" opacity=".85"/><ellipse cx="50" cy="56" rx="24" ry="30" fill="none" stroke="#e0d3b0" stroke-width="2"/>`,
    duckEgg:  `<ellipse cx="50" cy="56" rx="25" ry="31" fill="#dff0e4"/><ellipse cx="42" cy="46" rx="8" ry="11" fill="#fff" opacity=".8"/><ellipse cx="50" cy="56" rx="25" ry="31" fill="none" stroke="#a9cbb4" stroke-width="2"/>`,
    honey:    `<path d="M30 34 h40 v40 a20 20 0 0 1 -40 0Z" fill="#f0b429"/><path d="M28 26 h44 v10 h-44Z" fill="#c98a12"/><rect x="36" y="46" width="28" height="16" rx="2" fill="#fff8e1"/><path d="M44 50 l4 4 l-4 4 M52 50 l4 4 l-4 4" stroke="#c98a12" stroke-width="1.6" fill="none"/>`,
    goatMilk: `<path d="M34 30 h32 l4 46 a8 8 0 0 1 -8 8 h-24 a8 8 0 0 1 -8 -8Z" fill="#fdfcf7" stroke="#d8d2c2" stroke-width="2"/><rect x="32" y="44" width="36" height="14" fill="#e8f1f7"/><path d="M40 22 h20 v8 h-20Z" fill="#c9d8e2"/>`,
    wool:     `<circle cx="40" cy="50" r="17" fill="#fbf7ef"/><circle cx="60" cy="46" r="15" fill="#fbf7ef"/><circle cx="52" cy="64" r="16" fill="#fbf7ef"/><circle cx="36" cy="44" r="8" fill="#fff"/><path d="M30 62 C40 56 58 54 70 60" stroke="#ded7c7" stroke-width="2.4" fill="none"/>`,
    milk:     `<path d="M32 28 h36 v50 a8 8 0 0 1 -8 8 h-20 a8 8 0 0 1 -8 -8Z" fill="#fdfcf7" stroke="#d0c9ba" stroke-width="2"/><path d="M32 28 l8 -12 h20 l8 12Z" fill="#eef4f8" stroke="#d0c9ba" stroke-width="2"/><rect x="34" y="48" width="32" height="16" fill="#4aa3df" opacity=".22"/><ellipse cx="50" cy="58" rx="7" ry="5" fill="#3a332e"/>`,
    truffle:  `<ellipse cx="50" cy="62" rx="28" ry="20" fill="#5d4232"/><ellipse cx="50" cy="56" rx="26" ry="17" fill="#7a5842"/><ellipse cx="42" cy="50" rx="7" ry="4" fill="#96705a" opacity=".8"/><circle cx="60" cy="58" r="3" fill="#4a3427"/><circle cx="38" cy="64" r="2.4" fill="#4a3427"/><path d="M46 40 C48 34 54 33 56 38" stroke="#6b4a35" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  };
  function productSVG(productId) {
    return `<svg viewBox="0 0 100 100" style="width:100%;height:100%">${PRODUCT_ART[productId] || PRODUCT_ART.egg}</svg>`;
  }

  // ---------- อาคารเลี้ยงสัตว์ (ใช้เป็นหัวการ์ดในหน้าโรงนา) ----------
  const HOUSE_ART = {
    coop: t => `<rect x="14" y="46" width="72" height="38" rx="4" fill="#d8a05c"/>
      <path d="M8 48 L50 22 L92 48 Z" fill="#b8562f"/><path d="M8 48 L50 22 L92 48" fill="none" stroke="#8f3f21" stroke-width="3"/>
      <rect x="38" y="58" width="24" height="26" rx="3" fill="#5c3a22"/>
      <circle cx="50" cy="40" r="6" fill="#f7e9c4" stroke="#8f3f21" stroke-width="2"/>
      ${t >= 1 ? '<rect x="18" y="56" width="14" height="12" rx="2" fill="#f7e9c4" stroke="#8f3f21" stroke-width="2"/><rect x="68" y="56" width="14" height="12" rx="2" fill="#f7e9c4" stroke="#8f3f21" stroke-width="2"/>' : ''}
      ${t >= 2 ? '<rect x="22" y="84" width="56" height="6" rx="3" fill="#8b5e34"/><path d="M30 30 l6 -10 l6 10Z" fill="#f0b429"/>' : ''}`,
    apiary: t => `<rect x="24" y="70" width="52" height="14" rx="3" fill="#8b5e34"/>
      ${[0, 1, 2].map(i => `<rect x="28" y="${58 - i * 14}" width="44" height="13" rx="4" fill="${i % 2 ? '#e8c86a' : '#f0d488'}" stroke="#c9a54f" stroke-width="1.6"/>`).join('')}
      <path d="M26 18 h48 l-6 8 h-36Z" fill="#c9a54f"/>
      <circle cx="50" cy="52" r="3" fill="#5c3a22"/>
      ${t >= 2 ? '<g><ellipse cx="24" cy="34" rx="4" ry="3" fill="#f4c430"/><ellipse cx="80" cy="42" rx="4" ry="3" fill="#f4c430"/></g>' : ''}`,
    barn: t => `<rect x="12" y="44" width="76" height="42" rx="4" fill="#c94436"/>
      <path d="M6 46 L50 18 L94 46 Z" fill="#a63629"/><path d="M6 46 L50 18 L94 46" fill="none" stroke="#8a2b20" stroke-width="3"/>
      <rect x="34" y="56" width="32" height="30" rx="2" fill="#e8d5b0"/>
      <path d="M34 56 L66 86 M66 56 L34 86" stroke="#8b5e34" stroke-width="3"/>
      <rect x="46" y="26" width="8" height="12" fill="#f7e9c4"/>
      ${t >= 2 ? '<rect x="16" y="58" width="14" height="14" rx="2" fill="#f7e9c4" stroke="#8a2b20" stroke-width="2"/><rect x="70" y="58" width="14" height="14" rx="2" fill="#f7e9c4" stroke="#8a2b20" stroke-width="2"/>' : ''}
      ${t >= 3 ? '<g transform="translate(50,14)"><path d="M0 -6 L2 -1 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -1Z" fill="#f0b429"/></g>' : ''}`,
  };
  function houseSVG(houseId, tier = 0) {
    return `<svg viewBox="0 0 100 100" style="width:100%;height:100%">${(HOUSE_ART[houseId] || HOUSE_ART.coop)(tier)}</svg>`;
  }

  // ---------- ของตกแต่งฉาก: รั้ว + โรงนา + ต้นไม้ (แถบบนกริด) ----------
  function scenery() {
    return `<svg viewBox="0 0 800 90" preserveAspectRatio="xMidYMax slice" style="width:100%;height:100%;display:block">
      ${defs}
      <!-- เนินหญ้าหลัง -->
      <ellipse cx="120" cy="95" rx="220" ry="38" fill="#8fca6d"/>
      <ellipse cx="560" cy="98" rx="260" ry="44" fill="#82bf62"/>
      <!-- ต้นไม้ซ้าย -->
      <g transform="translate(52,18)">
        <rect x="-4" y="18" width="8" height="26" rx="3" fill="#8b5e34"/>
        <circle cx="0" cy="8" r="20" fill="#4e9a44"/><circle cx="-14" cy="16" r="13" fill="#448a3c"/><circle cx="14" cy="16" r="13" fill="#58a84e"/>
      </g>
      <g transform="translate(748,26) scale(.8)">
        <rect x="-4" y="18" width="8" height="26" rx="3" fill="#8b5e34"/>
        <circle cx="0" cy="8" r="20" fill="#4e9a44"/><circle cx="-14" cy="16" r="13" fill="#448a3c"/><circle cx="14" cy="16" r="13" fill="#58a84e"/>
      </g>
      <!-- โรงนา -->
      <g transform="translate(300,6)">
        <rect x="0" y="26" width="96" height="46" rx="4" fill="#c94436"/>
        <path d="M-8 28 L48 0 L104 28 Z" fill="#a63629"/>
        <path d="M-8 28 L48 0 L104 28" fill="none" stroke="#8a2b20" stroke-width="3"/>
        <rect x="36" y="44" width="24" height="28" rx="2" fill="#8b5e34"/>
        <path d="M36 44 L60 44 M36 50 L60 50" stroke="#6d4527" stroke-width="2"/>
        <rect x="8" y="36" width="16" height="14" rx="2" fill="#f7e9c4" stroke="#8a2b20" stroke-width="2"/>
        <rect x="72" y="36" width="16" height="14" rx="2" fill="#f7e9c4" stroke="#8a2b20" stroke-width="2"/>
        <path d="M48 0 L48 14" stroke="#8a2b20" stroke-width="2"/>
      </g>
      <!-- ยุ้งข้าว -->
      <g transform="translate(420,20)">
        <rect x="0" y="14" width="34" height="52" rx="6" fill="#e0c284"/>
        <path d="M0 14 C8 4 26 4 34 14" fill="#c9a26b" stroke="#a8845a" stroke-width="2"/>
        <rect x="0" y="30" width="34" height="3" fill="#c9a26b"/><rect x="0" y="46" width="34" height="3" fill="#c9a26b"/>
        <path d="M14 40 L22 40 M18 36 L18 44" stroke="#a8845a" stroke-width="2.6"/>
      </g>
      <!-- ฟ่อนหญ้า -->
      <g transform="translate(200,52)">
        <circle cx="0" cy="12" r="16" fill="#e8c86a"/><circle cx="26" cy="14" r="13" fill="#dcb95c"/>
        <path d="M-8 2 C-2 -4 4 -4 8 2 M16 6 C20 0 26 0 30 5" stroke="#c9a54f" stroke-width="2.4" fill="none"/>
      </g>
      <!-- รั้วไม้หน้า -->
      <g fill="#b58a5a" stroke="#8f6a42" stroke-width="1.6">
        <rect x="0" y="66" width="800" height="5"/>
        <rect x="0" y="78" width="800" height="5"/>
        ${Array.from({length: 9}, (_, i) => `<rect x="${i*100+20}" y="58" width="9" height="34" rx="2"/>`).join('')}
      </g>
      <!-- ดอกไม้หน้ารั้ว -->
      ${[[80,64],[260,60],[470,63],[690,61]].map(([x,y]) =>
        `<g transform="translate(${x},${y})"><path d="M0 8 L0 0" stroke="#4e9a44" stroke-width="2"/>
         <circle cx="0" cy="-3" r="3" fill="#ff8fa3"/><circle cx="0" cy="-3" r="1.2" fill="#fff"/></g>`).join('')}
    </svg>`;
  }

  // ---------- เมฆ CSS ----------
  function cloudHTML() {
    return `<div class="cloud c1"></div><div class="cloud c2"></div><div class="cloud c3"></div>`;
  }

  // ---------- Wrapper: คืน SVG เต็มสำหรับ innerHTML ----------
  function tileSVG(kind, i) {
    const inner = kind === 'grass' ? tileGrass(i) : tileSoil(kind === 'wet');
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%">${defs}${inner}</svg>`;
  }
  function cropSVG(cropId, stage) {
    return `<svg viewBox="0 0 42 90" x="29" y="2" width="42" height="96" style="overflow:visible">${cropArt(cropId, stage)}</svg>`;
  }
  function chickenSVG(kind) {
    return `<svg viewBox="0 0 100 100" style="width:100%;height:100%">${chicken(kind)}</svg>`;
  }

  window.Farm = window.Farm || {};
  window.Farm.ART = {
    cropArt, tileGrass, tileSoil, chicken, scenery, cloudHTML, defs, tileSVG, cropSVG, chickenSVG,
    // v4
    animalArt, animalSVG, productSVG, houseSVG, tierBadge,
  };
})();