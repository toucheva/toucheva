/**
 * ระบบเสียง Phase 0 — สังเคราะห์ทั้งหมดด้วย Web Audio API ไม่ใช้ไฟล์เสียงเลย
 *
 * ทำแบบนี้เพราะตามแผนผลิตเสียง Phase 0 คือช่วง "ทดสอบว่าฟีลถูกไหม"
 * ระบบสำคัญกว่าไฟล์ — สายผสมเสียง ducking round-robin และการสุ่มพิตช์
 * ทำงานจริงตั้งแต่ตอนนี้ พอถึง Phase 3 แค่เปลี่ยนตัวกำเนิดเสียงเป็นไฟล์จริง
 */

type BusName = 'music' | 'ambience' | 'sfx' | 'ui' | 'stinger';

const BUS_DEFAULT: Record<BusName, number> = {
  music: 0.7,
  ambience: 0.8,
  sfx: 1.0,
  ui: 0.85,
  stinger: 1.0,
};

export class Audio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private buses!: Record<BusName, GainNode>;
  private musicFilter!: BiquadFilterNode;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private started = false;
  /** ตัวนับ round-robin ต่อชนิดเสียง กันเสียงซ้ำตัวเดิมติดกัน (กติกากันหูล้า) */
  private rr = new Map<string, number>();

  muted = false;
  masterVolume = 0.9;

  /** เบราว์เซอร์บล็อกเสียงจนกว่าจะมีการกดครั้งแรก — ต้องเรียกจาก event handler */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();

    this.master = this.ctx.createGain();
    this.master.gain.value = this.masterVolume;
    this.master.connect(this.ctx.destination);

    this.buses = {} as Record<BusName, GainNode>;
    for (const name of Object.keys(BUS_DEFAULT) as BusName[]) {
      const g = this.ctx.createGain();
      g.gain.value = BUS_DEFAULT[name];
      this.buses[name] = g;
      if (name === 'music') {
        this.musicFilter = this.ctx.createBiquadFilter();
        this.musicFilter.type = 'lowpass';
        this.musicFilter.frequency.value = 20000;
        g.connect(this.musicFilter).connect(this.master);
      } else {
        g.connect(this.master);
      }
    }
    this.startMusic();
    this.startAmbience();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * ดนตรีปรับตัว: พลังงานต่ำกว่า 15% ใส่ฟิลเตอร์ตัดเสียงแหลม
   * บอกสถานะโดยไม่ต้องมองยูไอ (เสาหลักเสียงข้อ S2)
   */
  setLowStamina(low: boolean): void {
    if (!this.ctx || !this.musicFilter) return;
    this.musicFilter.frequency.setTargetAtTime(low ? 700 : 20000, this.ctx.currentTime, 0.4);
  }

  /** สติงเกอร์รางวัลหรี่ดนตรีลง 6 dB นาน 800 ms แล้วคืนแบบนุ่ม */
  private duck(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const name of ['music', 'ambience'] as BusName[]) {
      const g = this.buses[name].gain;
      const base = BUS_DEFAULT[name];
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(base * 0.5, t + 0.05);
      g.linearRampToValueAtTime(base, t + 0.85);
    }
  }

  private tone(opts: {
    bus: BusName;
    type: OscillatorType;
    freq: number;
    endFreq?: number;
    dur: number;
    gain: number;
    delay?: number;
    filter?: number;
  }): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const osc = this.ctx.createOscillator();
    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.endFreq), t0 + opts.dur);
    }
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(opts.gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + opts.dur);

    let node: AudioNode = osc;
    if (opts.filter) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.filter;
      osc.connect(f);
      node = f;
    }
    node.connect(g).connect(this.buses[opts.bus]);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.05);
  }

  /** เสียงกระทบแบบมีเนื้อ ใช้ noise burst — เหมาะกับการขุดดินและใบไม้ */
  private noise(opts: {
    bus: BusName;
    dur: number;
    gain: number;
    freq: number;
    type?: BiquadFilterType;
    delay?: number;
  }): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * opts.dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = opts.type ?? 'lowpass';
    f.frequency.value = opts.freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(opts.gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + opts.dur);
    src.connect(f).connect(g).connect(this.buses[opts.bus]);
    src.start(t0);
  }

  /** สุ่มพิตช์ ±4% ทุกครั้ง + วน round-robin — กติกากันหูล้า (S3) */
  private vary(key: string, variants: number): { mul: number; index: number } {
    const i = ((this.rr.get(key) ?? -1) + 1) % variants;
    this.rr.set(key, i);
    return { mul: 1 + (Math.random() * 2 - 1) * 0.04, index: i };
  }

  play(name: string): void {
    if (!this.ctx || this.muted) return;

    switch (name) {
      case 'till': {
        const { mul, index } = this.vary('till', 4);
        this.noise({ bus: 'sfx', dur: 0.16, gain: 0.35, freq: (500 + index * 90) * mul });
        this.tone({ bus: 'sfx', type: 'triangle', freq: 150 * mul, endFreq: 70, dur: 0.14, gain: 0.16 });
        break;
      }
      case 'water': {
        const { mul, index } = this.vary('water', 4);
        this.noise({ bus: 'sfx', dur: 0.3, gain: 0.16, freq: (1900 + index * 220) * mul, type: 'bandpass' });
        break;
      }
      case 'plant': {
        const { mul } = this.vary('plant', 4);
        this.tone({ bus: 'sfx', type: 'sine', freq: 480 * mul, endFreq: 760, dur: 0.13, gain: 0.16 });
        this.noise({ bus: 'sfx', dur: 0.07, gain: 0.14, freq: 900 * mul });
        break;
      }
      case 'stake': {
        const { mul } = this.vary('stake', 3);
        this.tone({ bus: 'sfx', type: 'square', freq: 220 * mul, endFreq: 130, dur: 0.1, gain: 0.12, filter: 1400 });
        this.noise({ bus: 'sfx', dur: 0.09, gain: 0.2, freq: 1200 * mul });
        break;
      }
      // เก็บเกี่ยวแยกตามตระกูลพืช — ใบ หัว ผล ฝัก เสียงต่างกันจริง
      case 'harvest-leaf': {
        const { mul } = this.vary('h-leaf', 4);
        this.noise({ bus: 'sfx', dur: 0.13, gain: 0.3, freq: 2600 * mul, type: 'bandpass' });
        break;
      }
      case 'harvest-root': {
        const { mul } = this.vary('h-root', 4);
        this.noise({ bus: 'sfx', dur: 0.22, gain: 0.34, freq: 420 * mul });
        this.tone({ bus: 'sfx', type: 'triangle', freq: 120 * mul, endFreq: 62, dur: 0.2, gain: 0.14 });
        break;
      }
      case 'harvest-fruit': {
        const { mul } = this.vary('h-fruit', 4);
        this.tone({ bus: 'sfx', type: 'sine', freq: 640 * mul, endFreq: 300, dur: 0.11, gain: 0.2 });
        this.noise({ bus: 'sfx', dur: 0.06, gain: 0.16, freq: 1700 * mul });
        break;
      }
      case 'harvest-pod': {
        const { mul } = this.vary('h-pod', 4);
        this.noise({ bus: 'sfx', dur: 0.1, gain: 0.24, freq: 1500 * mul, type: 'bandpass' });
        this.tone({ bus: 'sfx', type: 'triangle', freq: 330 * mul, endFreq: 210, dur: 0.1, gain: 0.12 });
        break;
      }
      // สติงเกอร์คุณภาพ — เสียงที่สำคัญที่สุดในเกม
      case 'star1':
      case 'star2':
        this.tone({ bus: 'stinger', type: 'sine', freq: 520, dur: 0.1, gain: 0.1 });
        break;
      case 'star3':
        this.tone({ bus: 'stinger', type: 'sine', freq: 660, dur: 0.12, gain: 0.14 });
        this.tone({ bus: 'stinger', type: 'sine', freq: 880, dur: 0.14, gain: 0.1, delay: 0.06 });
        break;
      case 'star4':
        this.duck();
        [660, 880, 1100].forEach((f, i) =>
          this.tone({ bus: 'stinger', type: 'sine', freq: f, dur: 0.18, gain: 0.14, delay: i * 0.06 }),
        );
        break;
      case 'star5':
        this.duck();
        [660, 880, 1100, 1320].forEach((f, i) =>
          this.tone({ bus: 'stinger', type: 'sine', freq: f, dur: 0.3, gain: 0.16, delay: i * 0.07 }),
        );
        this.tone({ bus: 'stinger', type: 'triangle', freq: 1760, dur: 0.7, gain: 0.09, delay: 0.28 });
        break;
      case 'coin':
        this.tone({ bus: 'ui', type: 'square', freq: 1180, dur: 0.07, gain: 0.07, filter: 3000 });
        this.tone({ bus: 'ui', type: 'square', freq: 1560, dur: 0.09, gain: 0.06, filter: 3000, delay: 0.05 });
        break;
      case 'click':
        this.tone({ bus: 'ui', type: 'sine', freq: 760, dur: 0.05, gain: 0.07 });
        break;
      case 'confirm':
        this.tone({ bus: 'ui', type: 'sine', freq: 640, dur: 0.09, gain: 0.1 });
        this.tone({ bus: 'ui', type: 'sine', freq: 960, dur: 0.11, gain: 0.08, delay: 0.06 });
        break;
      case 'error':
        // เสียงผิดพลาดต้องนุ่ม ไม่ตกใจ — จะได้ยินบ่อยมาก
        this.tone({ bus: 'ui', type: 'sine', freq: 300, endFreq: 220, dur: 0.13, gain: 0.07, filter: 900 });
        break;
      case 'newday':
        this.duck();
        [523, 659, 784].forEach((f, i) =>
          this.tone({ bus: 'stinger', type: 'triangle', freq: f, dur: 0.4, gain: 0.11, delay: i * 0.1 }),
        );
        break;
      case 'wither':
        this.tone({ bus: 'sfx', type: 'sawtooth', freq: 260, endFreq: 90, dur: 0.4, gain: 0.09, filter: 800 });
        break;
      case 'fall':
        this.noise({ bus: 'sfx', dur: 0.3, gain: 0.2, freq: 700 });
        this.tone({ bus: 'sfx', type: 'triangle', freq: 180, endFreq: 80, dur: 0.3, gain: 0.1 });
        break;
      default:
        break;
    }
  }

  /**
   * เพลงฟาร์มสังเคราะห์ — เพนทาโทนิกช้าๆ ไม่มีทำนองเด่น
   * ตามหลักเรียบเรียง: เพลงที่เล่นทุกวันต้องฟังผ่านๆ ได้
   */
  private startMusic(): void {
    if (!this.ctx || this.started) return;
    this.started = true;
    const scale = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3];
    const bass = [130.8, 146.8, 98.0, 110.0];

    const step = () => {
      if (!this.ctx) return;
      const s = this.musicStep;
      if (s % 4 === 0) {
        this.tone({
          bus: 'music', type: 'triangle',
          freq: bass[(s >> 2) % bass.length], dur: 1.9, gain: 0.045, filter: 700,
        });
      }
      if (s % 2 === 0) {
        const n = scale[Math.floor(Math.random() * scale.length)];
        this.tone({ bus: 'music', type: 'sine', freq: n, dur: 1.1, gain: 0.038, filter: 2200 });
      }
      if (s % 8 === 3) {
        const n = scale[Math.floor(Math.random() * 4) + 3];
        this.tone({ bus: 'music', type: 'sine', freq: n * 2, dur: 0.7, gain: 0.02, filter: 2600 });
      }
      this.musicStep = (s + 1) % 64;
    };
    step();
    this.musicTimer = window.setInterval(step, 520);
  }

  /** เสียงบรรยากาศ: ลมกับแมลง วนเบาๆ ใต้ทุกอย่าง */
  private startAmbience(): void {
    if (!this.ctx) return;
    const loop = () => {
      if (!this.ctx) return;
      this.noise({ bus: 'ambience', dur: 2.6, gain: 0.012, freq: 480, type: 'bandpass' });
      if (Math.random() < 0.4) {
        this.tone({
          bus: 'ambience', type: 'sine',
          freq: 2400 + Math.random() * 900, dur: 0.1, gain: 0.008,
          delay: Math.random() * 2,
        });
      }
    };
    loop();
    window.setInterval(loop, 2500);
  }

  dispose(): void {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
  }
}

export const audio = new Audio();
