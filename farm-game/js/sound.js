// ============ ฟาร์มมินิ v3.1 — Adaptive Music & FX ============
// เพลง 4 ธีม + SFX 27 เสียง + ambience สภาพอากาศ สังเคราะห์ด้วย WebAudio ออฟไลน์ 100%
(() => {
  let ctx = null, master = null, sfxGain = null, bgmGain = null, ambGain = null;
  let enabled = true, bgmOn = true, volume = 0.7, started = false;
  let bgmTimer = null, ambSrc = null, ambNode = null, ambMode = null;
  let bgmStep = 0, bgmBar = 0, trackKey = 'summer';
  let musicContext = { season: 0, phase: 'day', weather: 'sunny' };

  function ensureCtx() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = volume; master.connect(ctx.destination);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.88; sfxGain.connect(master);
      bgmGain = ctx.createGain(); bgmGain.gain.value = 0.26; bgmGain.connect(master);
      ambGain = ctx.createGain(); ambGain.gain.value = 0.13; ambGain.connect(master);
      return true;
    } catch (_) { return false; }
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function tone(freq, dur, { type='sine', vol=.18, when=0, slide=0, dest=null, attack=.012 }={}) {
    if (!enabled || !freq || !ensureCtx()) return;
    const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(dest || sfxGain); o.start(t); o.stop(t + dur + .04);
  }
  function noise(dur, { vol=.18, freq=1200, q=.8, when=0, type='bandpass' }={}) {
    if (!enabled || !ensureCtx()) return;
    const t = ctx.currentTime + when, len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len*.55);
    const s=ctx.createBufferSource(), f=ctx.createBiquadFilter(), g=ctx.createGain();
    s.buffer=b; f.type=type; f.frequency.value=freq; f.Q.value=q;
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t); s.stop(t+dur+.03);
  }
  function arp(notes, step=.085, opt={}) { notes.forEach((n,i)=>tone(n,opt.dur||.24,{...opt,when:i*step})); }

  const N={C3:130.81,D3:146.83,E3:164.81,F3:174.61,G3:196,A3:220,B3:246.94,C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392,A4:440,B4:493.88,C5:523.25,D5:587.33,E5:659.25,F5:698.46,G5:783.99,A5:880,B5:987.77,C6:1046.5,R:0};

  const SFX={
    click(){tone(760,.045,{vol:.07});},
    dig(){noise(.18,{vol:.28,freq:270,type:'lowpass'});tone(105,.13,{type:'triangle',vol:.18,slide:-45});},
    plant(){noise(.07,{vol:.08,freq:950});tone(480,.1,{type:'triangle',vol:.15});tone(720,.14,{vol:.13,when:.07});},
    water(){noise(.38,{vol:.18,freq:2500,q:.5});tone(1050,.28,{vol:.06,slide:-620});},
    fert(){noise(.12,{vol:.18,freq:430,type:'lowpass'});arp([N.C4,N.E4],.07,{type:'triangle',vol:.09});},
    grow(){arp([N.C5,N.E5,N.G5],.065,{type:'sine',vol:.11,dur:.22});},
    ready(){arp([N.E5,N.G5,N.C6],.08,{type:'triangle',vol:.13,dur:.28});},
    harvest(){noise(.055,{vol:.1,freq:1600});arp([N.C5,N.E5,N.G5,N.C6],.06,{type:'triangle',vol:.17,dur:.24});},
    goldCrop(){arp([N.C5,N.E5,N.G5,N.B5,N.C6],.08,{type:'sine',vol:.2,dur:.38});tone(1760,.55,{vol:.06,when:.2});},
    coin(){tone(1760,.07,{type:'square',vol:.09});tone(2230,.11,{type:'square',vol:.075,when:.065});},
    sell(){arp([N.C5,N.G5,N.C6],.07,{vol:.15});},
    unlock(){noise(.09,{vol:.12,freq:900});arp([N.G4,N.C5,N.E5,N.G5,N.C6],.075,{type:'triangle',vol:.17,dur:.33});},
    upgrade(){arp([N.C4,N.E4,N.G4,N.C5,N.G5],.09,{type:'sine',vol:.16,dur:.34});},
    egg(){arp([1200,1500,1800],.055,{vol:.12,dur:.1});},
    golden(){arp([N.C5,N.E5,N.G5,N.C6,N.E5*2],.09,{type:'triangle',vol:.18,dur:.32});},
    level(){arp([N.C4,N.E4,N.G4,N.C5,N.E5,N.G5,N.C6],.085,{type:'triangle',vol:.18,dur:.34});},
    quest(){arp([N.G4,N.C5,N.E5,N.G5],.09,{vol:.15,dur:.3});},
    achv(){arp([N.E5,N.G5,N.B5,N.E5*2],.1,{type:'triangle',vol:.17,dur:.36});},
    error(){tone(175,.17,{type:'sawtooth',vol:.12,slide:-70});},
    cluck(){tone(650,.09,{type:'square',vol:.065,slide:-230});tone(830,.11,{type:'square',vol:.055,slide:-280,when:.1});},
    rooster(){arp([520,660,790],.14,{type:'sawtooth',vol:.045,dur:.2});tone(990,.5,{type:'sawtooth',vol:.04,slide:-430,when:.42});},
    thunder(){noise(1.25,{vol:.32,freq:170,q:.45,type:'lowpass'});tone(48,1.1,{vol:.2,slide:-16,when:.12});},
    storm(){SFX.thunder();},
    wind(){noise(.7,{vol:.15,freq:620,q:.4,type:'bandpass'});tone(310,.65,{vol:.035,slide:130});},
    day(){arp([N.C4,N.G4,N.C5],.12,{vol:.08,dur:.35});},
    night(){arp([N.E4,N.C4,N.A3],.14,{vol:.075,dur:.42});},
    die(){tone(310,.42,{type:'sawtooth',vol:.09,slide:-210});},
  };

  // เพลง 4 ธีม: ฤดูร้อน / ฤดูฝน / ฤดูหนาว / กลางคืน
  const TRACKS={
    summer:{name:'สายลมเหนือทุ่ง',step:.25,type:'triangle',bass:[N.C3,N.G3,N.A3,N.F3],mel:[
      [N.C5,N.R,N.E5,N.G5,N.R,N.E5,N.D5,N.R,N.C5,N.R,N.A4,N.R,N.G4,N.R,N.R,N.R],
      [N.A4,N.R,N.C5,N.D5,N.R,N.E5,N.G5,N.R,N.E5,N.R,N.D5,N.C5,N.D5,N.R,N.R,N.R]]},
    rain:{name:'หยาดฝนบนใบไม้',step:.29,type:'sine',bass:[N.D3,N.A3,N.G3,N.C3],mel:[
      [N.D5,N.R,N.F5,N.A5,N.R,N.F5,N.E5,N.R,N.D5,N.R,N.C5,N.R,N.A4,N.R,N.R,N.R],
      [N.A4,N.C5,N.R,N.D5,N.R,N.F5,N.E5,N.R,N.D5,N.R,N.C5,N.A4,N.R,N.R,N.R,N.R]]},
    winter:{name:'หมอกเช้าเหนือสวน',step:.32,type:'sine',bass:[N.A3,N.E3,N.F3,N.C3],mel:[
      [N.A4,N.R,N.C5,N.E5,N.R,N.D5,N.C5,N.R,N.A4,N.R,N.G4,N.R,N.E4,N.R,N.R,N.R],
      [N.C5,N.R,N.E5,N.F5,N.R,N.E5,N.C5,N.R,N.D5,N.R,N.C5,N.A4,N.R,N.R,N.R,N.R]]},
    night:{name:'แสงจันทร์ในฟาร์ม',step:.36,type:'sine',bass:[N.C3,N.A3,N.F3,N.G3],mel:[
      [N.E5,N.R,N.R,N.G5,N.R,N.E5,N.R,N.D5,N.R,N.C5,N.R,N.A4,N.R,N.R,N.R,N.R],
      [N.G4,N.R,N.C5,N.R,N.E5,N.R,N.D5,N.R,N.C5,N.R,N.A4,N.R,N.G4,N.R,N.R,N.R]]},
  };

  function chooseTrack({season=0,phase='day',weather='sunny'}={}) {
    if (phase==='night' || phase==='dusk') return 'night';
    if (weather==='rain' || weather==='storm' || season===1) return 'rain';
    if (season===2) return 'winter';
    return 'summer';
  }
  function bgmTick(){
    if(!bgmOn||!enabled||!ensureCtx())return;
    const tr=TRACKS[trackKey], bar=tr.mel[bgmBar%tr.mel.length], note=bar[bgmStep%16], t=ctx.currentTime+.035;
    if(note){tone(note,.52,{type:tr.type,vol:.13,dest:bgmGain,when:.035});tone(note*2,.34,{type:'sine',vol:.025,dest:bgmGain,when:.04});}
    if(bgmStep%4===0) tone(tr.bass[(bgmStep/4)%tr.bass.length],.68,{type:'sine',vol:.16,dest:bgmGain,when:.03});
    if(trackKey==='summer'&&bgmStep%2===1) noise(.035,{vol:.025,freq:3300,when:.02});
    bgmStep++;if(bgmStep>=16){bgmStep=0;bgmBar++;}
  }
  function startBgm(){if(bgmTimer||!started||!enabled||!bgmOn)return;ensureCtx();const ms=TRACKS[trackKey].step*1000;bgmTimer=setInterval(bgmTick,ms);}
  function stopBgm(){if(bgmTimer){clearInterval(bgmTimer);bgmTimer=null;}}
  function setMusicContext(season,phase,weather){
    musicContext={season,phase,weather};const next=chooseTrack(musicContext);
    if(next!==trackKey){trackKey=next;bgmStep=0;bgmBar=0;stopBgm();startBgm();}
    setAmbience(weather,phase);
    return TRACKS[trackKey].name;
  }

  function stopAmbience(){if(ambSrc){try{ambSrc.stop();}catch(_){}ambSrc=null;ambNode=null;}ambMode=null;}
  function setAmbience(weather='sunny',phase=musicContext.phase){
    if(!ensureCtx())return;
    const mode=(weather==='rain'||weather==='storm')?'rain':(weather==='drought'?'wind':(phase==='night'?'night':null));
    if(mode===ambMode && (!!mode === !!ambSrc)) return;
    stopAmbience();if(!enabled||!mode)return;
    ambMode=mode;
    const len=ctx.sampleRate*2,b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    ambSrc=ctx.createBufferSource();ambSrc.buffer=b;ambSrc.loop=true;
    const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=mode==='rain'?1900:mode==='wind'?560:4200;f.Q.value=mode==='night'?7:.45;
    ambNode=ctx.createGain();ambNode.gain.value=mode==='rain'?1:mode==='wind'?.55:.16;
    ambSrc.connect(f);f.connect(ambNode);ambNode.connect(ambGain);ambSrc.start();
  }

  function play(name){if(!enabled)return;ensureCtx();resume();if(SFX[name])SFX[name]();}
  function setEnabled(v){enabled=!!v;if(!enabled){stopBgm();stopAmbience();}else if(started){startBgm();setAmbience(musicContext.weather,musicContext.phase);}}
  function setBgm(v){bgmOn=!!v;if(bgmOn&&enabled&&started)startBgm();else stopBgm();}
  function setVolume(v){volume=Math.max(0,Math.min(1,+v||0));if(master)master.gain.value=volume;}
  function setUserInteracted(){started=true;ensureCtx();resume();startBgm();setAmbience(musicContext.weather,musicContext.phase);}

  window.Farm=window.Farm||{};
  window.Farm.Sound={play,setEnabled,setBgm,setVolume,setAmbience,setMusicContext,setUserInteracted,
    get enabled(){return enabled;},get bgm(){return bgmOn;},get volume(){return volume;},
    get track(){return trackKey;},get trackName(){return TRACKS[trackKey].name;},get contextState(){return ctx?ctx.state:'not-created';}};
})();
