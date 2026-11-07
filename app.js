(function () {
  'use strict';
  const E = window.SCEngine;
  const A = window.SCArt;
  const $ = (id) => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.__scReduced = reduced;

  const canvas = $('stage');
  const ctx = canvas.getContext('2d');
  const dlg = $('dialog');
  const EGG_MS = 620;
  const POP_MS = 260;

  const cheers = ['又完成一題！', '新力士報到！', '城堡又壯了一點！', '牠說：我托住了！', '這一題算你的！'];
  const courage = ['改正了，這才是真力氣！', '錯誤是最好的啞鈴！', '再試一次，肌肉又大了！', '勇敢改正，全城鼓掌！'];
  const moves = [
    { name: '舉高雙手', line: '雙手向天花板伸直，踮起腳尖。' },
    { name: '慢慢呼吸', line: '吸氣四下，再慢慢呼氣四下。' },
    { name: '轉轉肩膀', line: '肩膀向後轉，放鬆脖子。' },
    { name: '大力士姿勢', line: '握拳屈手臂，大聲說：我做得到！' },
  ];
  const MOVE_MS = 8000;

  let state = null;
  let list = [];
  let ents = [];
  let geo = E.layout(0, 'twin');
  let view = { W: 800, H: 600, dpr: 1 };
  let cam = { z: 1, dx: 0, dy: 0 };
  let now = 0;
  let last = 0;
  let scroll = 0;
  let selected = -1;
  let particles = [];
  let lastAct = 0;
  let happyUntil = 0;
  let mouthUntil = 0;
  let shownLand = 0;
  let lifting = null;
  let walking = null;
  let stretch = null;
  let look = { x: 0, y: 0 };
  let pointerAt = null;
  let audio = null;
  let mic = null;
  let sessionActions = 0;
  let toastTimer = 0;
  let running = false;
  const announced = new Set();
  const sprites = new Map();

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const isNight = () => { const h = new Date().getHours(); return h >= 19 || h < 6; };

  /* ---------- 儲存 ---------- */
  function save() {
    try {
      localStorage.setItem(E.SAVE_KEY, JSON.stringify(state));
    } catch (err) {
      toast('暫時無法儲存，請先下載備份。');
    }
  }

  function loadSaved() {
    try {
      return E.validate(JSON.parse(localStorage.getItem(E.SAVE_KEY) || 'null'));
    } catch (err) {
      return null;
    }
  }

  function findOldCastle() {
    for (const key of E.OLD_KEYS) {
      try {
        const made = E.fromCourage(JSON.parse(localStorage.getItem(key) || 'null'));
        if (made) return made;
      } catch (err) { /* 舊版資料無法讀取時略過 */ }
    }
    return null;
  }

  function adopt(next) {
    state = next;
    selected = -1;
    shownLand = state.land;
    lifting = null;
    walking = null;
    announced.clear();
    closeCard();
    rebuild();
    save();
    ensureLoop();
  }

  function rebuild() {
    list = E.creatures(state);
    syncLayout();
    ents = list.map((c, i) => {
      const cell = geo.cells[i];
      return { x: cell.x, y: cell.y, s: cell.s, born: -1e9, hop: -1e9, up: -1e9, happy: 0 };
    });
    syncUI();
  }

  function syncLayout() {
    geo = E.layout(state.target, state.shape);
    geo.showEyes = !!geo.door && list.length / state.target >= 0.35;
  }

  /* ---------- 音效 ---------- */
  function tone(freq, dur, type, vol, delay, slide) {
    if (!state || !state.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const t = audio.currentTime + (delay || 0);
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(vol || 0.1, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(audio.destination);
      o.start(t);
      o.stop(t + dur);
    } catch (err) { /* 瀏覽器不支援音效時保持靜音 */ }
  }
  const sfx = {
    hatch() { tone(420, 0.09, 'triangle', 0.1, 0.42); tone(760, 0.16, 'triangle', 0.11, 0.5, 1200); },
    squeak(i) { const f = 520 + (i % 7) * 70; tone(f, 0.16, 'square', 0.05, 0, f * 1.8); },
    train() { [392, 494, 587, 784].forEach((f, i) => tone(f, 0.16, 'triangle', 0.1, i * 0.08)); },
    heave(p) { tone(150 + p * 3, 0.09, 'sawtooth', 0.06); },
    fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.26, 'triangle', 0.11, i * 0.13)); },
    stomp() { tone(90, 0.16, 'sine', 0.2, 0, 44); },
  };

  /* ---------- 精靈圖快取 ---------- */
  function sprite(c, expr, px) {
    const key = `${c.species}|${c.variant}|${c.level}|${c.rare ? 1 : 0}|${expr}|${px}`;
    let sp = sprites.get(key);
    if (sp) return sp;
    if (sprites.size > 1400) sprites.clear();
    sp = document.createElement('canvas');
    sp.width = sp.height = px;
    const g = sp.getContext('2d');
    g.scale(px / 130, px / 130);
    g.translate(15, 15);
    A.drawCreature(g, c, expr);
    sprites.set(key, sp);
    return sp;
  }

  function creatureExpr(c, e, cell, t) {
    if (t < e.happy || t < happyUntil || (lifting && lifting.done)) return 'happy';
    if (lifting) return 'strain';
    if (stretch) return 'happy';
    if (isNight() && t - lastAct > 25000 && !walking) return 'sleep';
    if (walking) return 'happy';
    if (cell.load > 0.62 && list.length > 12 && ((t / 2600 + c.phase) % 5) < 1.3) return 'strain';
    return ((t / 1000 + c.phase) % 4.6) < 0.14 ? 'blink' : 'normal';
  }

  /* ---------- 粒子 ---------- */
  function burst(x, y, n, colors, power) {
    if (reduced) return;
    for (let i = 0; i < n && particles.length < 320; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (0.08 + Math.random() * 0.26) * (power || 1);
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.14, life: 1, c: pick(colors), r: 3 + Math.random() * 5 });
    }
  }
  const confetti = ['#ff5d5d', '#ffcf4d', '#3ecf9b', '#5cc1f0', '#c79bff'];

  /* ---------- 繪畫 ---------- */
  function cameraFor(W, H, c) {
    const base = Math.min(W / 720, H / 660);
    const S = base * c.z;
    const cx = 500 + c.dx;
    const cy = 620 - H / base / 2 + c.dy;
    return { S, base, cx, cy, x0: cx - W / 2 / S, x1: cx + W / 2 / S, y0: cy - H / 2 / S, y1: cy + H / 2 / S };
  }

  function builtTop(nearCenter) {
    let top = E.GROUND - 8;
    list.forEach((c, i) => {
      const cell = geo.cells[i];
      if (cell && (!nearCenter || Math.abs(cell.x - 500) < 100)) top = Math.min(top, cell.y - cell.s * 0.6);
    });
    return top;
  }

  function drawCreatureAt(g, c, e, cell, t, S, dpr) {
    const age = t - e.born;
    const s = e.s;
    const u = (s * 1.08) / 60;
    const size = 130 * u;
    if (!reduced && age < EGG_MS) {
      const p = Math.min(1, age / 420);
      const y = e.y - (1 - p * p) * 620;
      const shake = p >= 1 ? Math.sin(age / 18) * 0.16 : 0;
      g.save();
      g.translate(e.x, y);
      g.rotate(shake);
      g.scale(u * 0.9, u * 0.9);
      g.translate(-50, -50);
      A.drawEgg(g, age > 480);
      g.restore();
      return;
    }
    let sx = 1;
    let sy = 1;
    let dy = 0;
    let rot = 0;
    const pop = reduced ? 1 : Math.min(1, (age - EGG_MS) / POP_MS);
    if (pop < 1) { const k = 0.4 + 0.75 * Math.sin(pop * Math.PI * 0.62); sx = k; sy = k; }
    if (!reduced) {
      const breath = Math.sin(t / 560 + cell.row * 0.55) * 0.03;
      sy += breath;
      sx -= breath;
      const hop = t - e.hop;
      if (hop < 520) dy -= Math.sin((hop / 520) * Math.PI) * s * 0.75;
      const up = t - e.up;
      if (up < 900) { const q = Math.sin((up / 900) * Math.PI); sx += q * 0.3; sy += q * 0.3; }
      if (lifting && !lifting.done) { dy += Math.sin(t / 40 + c.phase) * s * 0.025; sy -= 0.05 * (1 - lifting.power / 100); }
      if (lifting && lifting.done) dy -= Math.abs(Math.sin(t / 150 + c.phase)) * s * 0.4;
      if (walking) dy -= Math.abs(Math.sin(t / 170 + cell.row)) * s * 0.12;
      if (stretch) {
        const m = stretch.move;
        if (m === 0) { const q = 0.5 + 0.5 * Math.sin(t / 700); sy += q * 0.22; sx -= q * 0.1; }
        else if (m === 1) { const q = Math.sin(t / 1100) * 0.12; sx += q; sy += q; }
        else if (m === 2) rot = Math.sin(t / 420 + cell.row) * 0.28;
        else dy -= Math.abs(Math.sin(t / 230 + c.phase)) * s * 0.3;
      }
    }
    const screen = size * S * dpr;
    const px = screen > 150 ? 256 : screen > 72 ? 144 : 72;
    const img = sprite(c, creatureExpr(c, e, cell, t), px);
    const feet = e.y + s * 0.62 + dy;
    g.save();
    g.translate(e.x, feet);
    if (rot) g.rotate(rot);
    g.scale(sx, sy);
    g.drawImage(img, -size / 2, -size * ((58 + 15 + 36) / 130), size, size);
    g.restore();
    if (selected === c.index) {
      g.beginPath();
      g.ellipse(e.x, e.y + dy, s * 0.72, s * 0.72, 0, 0, Math.PI * 2);
      g.strokeStyle = '#fff';
      g.lineWidth = Math.max(3, s * 0.07);
      g.setLineDash([s * 0.2, s * 0.14]);
      g.stroke();
      g.setLineDash([]);
    }
  }

  function trophyId() {
    return state.lifted.length ? state.lifted[state.lifted.length - 1] : null;
  }

  function drawTrophy(g, t) {
    const heaving = lifting ? lifting.item.id : null;
    const id = heaving || trophyId();
    if (!id) return;
    const k = E.clamp((geo.right - geo.left) / 330, 0.42, 1);
    const base = builtTop(true);
    let y = base - 62 * k;
    let tilt = 0;
    if (lifting) {
      const p = lifting.done ? 1 : lifting.power / 100;
      y -= p * 34 * k;
      if (lifting.done && !reduced) y -= Math.abs(Math.sin(t / 220)) * 22;
      else if (!reduced) tilt = Math.sin(t / 90) * 0.03 * (1 - p);
    }
    g.save();
    g.translate(500, y);
    g.rotate(tilt);
    g.scale(k, k);
    A.drawObject(g, id);
    g.restore();
  }

  function paint(g, W, H, dpr, t, c, opt) {
    const v = cameraFor(W, H, c);
    g.setTransform(dpr * v.S, 0, 0, dpr * v.S, dpr * (W / 2 - v.cx * v.S), dpr * (H / 2 - v.cy * v.S));
    const night = isNight();
    const landId = E.LANDS[opt && opt.exportLand != null ? opt.exportLand : shownLand].id;
    A.drawLand(g, landId, v, reduced ? 0 : t, night, scroll);

    const walkP = walking ? (t - walking.t0) / walking.dur : 0;
    const raise = walking ? Math.min(1, walkP * 6, (1 - walkP) * 6) * 92 : 0;
    const step = walking ? Math.sin(t / 170) : 0;

    g.fillStyle = 'rgba(43,33,64,.2)';
    g.beginPath();
    g.ellipse(500, 574, (geo.right - geo.left) / 2 + 26, 15, 0, 0, Math.PI * 2);
    g.fill();

    if (raise > 2) A.drawLegs(g, geo, step, raise);
    g.save();
    g.translate(0, -raise + (walking ? Math.abs(step) * 8 : 0));

    g.strokeStyle = night || landId === 'moon' ? 'rgba(255,255,255,.34)' : 'rgba(43,33,64,.2)';
    g.lineWidth = Math.max(1.4, geo.size * 0.03);
    g.setLineDash([geo.size * 0.13, geo.size * 0.13]);
    for (let i = list.length; i < geo.cells.length; i++) {
      const cell = geo.cells[i];
      g.beginPath();
      g.arc(cell.x, cell.y, cell.s * 0.38, 0, Math.PI * 2);
      g.stroke();
    }
    g.setLineDash([]);

    const open = t < mouthUntil ? 1 : 0;
    const blink = ((t / 1000) % 5.4) < 0.15 || (night && t - lastAct > 25000);
    const faceGeo = { ...geo, showEyes: false };
    A.drawFace(g, faceGeo, look, blink, open, night);

    for (let i = list.length - 1; i >= 0; i--) {
      if (ents[i] && geo.cells[i]) drawCreatureAt(g, list[i], ents[i], geo.cells[i], t, v.S, dpr);
    }

    if (geo.showEyes) A.drawFace(g, geo, look, blink, open, night);
    if (list.length) {
      const flagCell = geo.cells.slice(0, list.length).reduce((b, q) => (q.y < b.y || (q.y === b.y && q.x < b.x) ? q : b), geo.cells[0]);
      if (!(trophyId() || lifting) || Math.abs(flagCell.x - 500) > 110) A.drawFlag(g, flagCell.x, flagCell.y - flagCell.s * 0.5, reduced ? 0 : t, '力');
    }
    drawTrophy(g, t);
    g.restore();

    if (night && t - lastAct > 25000 && !opt) {
      g.fillStyle = '#fff';
      g.font = '900 30px system-ui, sans-serif';
      g.textAlign = 'center';
      for (let i = 0; i < 3; i++) {
        const q = ((t / 1800 + i / 3) % 1);
        g.globalAlpha = 1 - q;
        g.fillText('Z', geo.right + 6 + q * 46 + i * 8, builtTop() + 60 - q * 70);
      }
      g.globalAlpha = 1;
    }

    for (const p of particles) {
      g.globalAlpha = Math.max(0, p.life);
      g.fillStyle = p.c;
      g.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
    }
    g.globalAlpha = 1;

    if (walking) {
      const fade = E.clamp(1 - Math.abs(walkP - 0.5) / 0.12, 0, 1);
      if (fade > 0) {
        g.fillStyle = `rgba(255,253,247,${fade})`;
        g.fillRect(v.x0 - 2, v.y0 - 2, v.x1 - v.x0 + 4, v.y1 - v.y0 + 4);
      }
    }
  }

  function step(t) {
    const dt = Math.min(50, t - last || 16);
    last = t;
    now = t;

    const rate = reduced ? 1 : Math.min(1, dt * 0.009);
    ents.forEach((e, i) => {
      const cell = geo.cells[i];
      if (!cell) return;
      e.x += (cell.x - e.x) * rate;
      e.y += (cell.y - e.y) * rate;
      e.s += (cell.s - e.s) * rate;
      if (e.born + EGG_MS - 16 < t && !e.popped) {
        e.popped = true;
        if (e.born > 0) burst(e.x, e.y, 12, ['#fff4d6', '#ffd24a', '#ffb3c1'], 0.8);
      }
    });
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.0006 * dt;
      p.life -= dt / 1100;
    }
    particles = particles.filter((p) => p.life > 0);

    if (pointerAt) {
      const rect = canvas.getBoundingClientRect();
      const px = (pointerAt.x - rect.left) / rect.width - 0.5;
      const py = (pointerAt.y - rect.top) / rect.height - 0.5;
      look.x += (E.clamp(px * 2.4, -1, 1) - look.x) * 0.2;
      look.y += (E.clamp(py * 2.4, -1, 1) - look.y) * 0.2;
    } else {
      look.x += (Math.sin(t / 2300) * 0.6 - look.x) * 0.04;
      look.y += (Math.cos(t / 3100) * 0.3 - look.y) * 0.04;
    }

    if (lifting && !lifting.done) {
      lifting.power = Math.max(0, lifting.power - dt * 0.0055);
      if (mic) {
        const level = micLevel();
        if (level > 0.08) lifting.power += dt * 0.11 * Math.min(1, level * 3);
      }
      if (lifting.power >= 100) finishLift();
      $('heaveFill').style.width = `${Math.min(100, lifting.power)}%`;
      $('heaveBar').setAttribute('aria-valuenow', Math.round(lifting.power));
    }

    if (walking) {
      scroll += dt * 0.42;
      const p = (t - walking.t0) / walking.dur;
      if (p >= 0.5 && shownLand !== state.land) {
        shownLand = state.land;
        syncUI();
      }
      if (Math.floor(t / 534) !== walking.beat) {
        walking.beat = Math.floor(t / 534);
        sfx.stomp();
      }
      if (p >= 1) endWalk();
    }

    if (stretch) {
      const elapsed = t - stretch.t0;
      const move = Math.floor(elapsed / MOVE_MS);
      if (move >= moves.length) endStretch(true);
      else {
        if (move !== stretch.move) {
          stretch.move = move;
          $('stretchTitle').textContent = `${move + 1}／${moves.length} ${moves[move].name}`;
          $('stretchLine').textContent = moves[move].line;
        }
        $('stretchFill').style.width = `${(elapsed / (MOVE_MS * moves.length)) * 100}%`;
      }
    }

    paint(ctx, view.W, view.H, view.dpr, t, cam);
    requestAnimationFrame(step);
  }

  function resize() {
    view.W = canvas.clientWidth || 800;
    view.H = canvas.clientHeight || 600;
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(view.W * view.dpr);
    canvas.height = Math.round(view.H * view.dpr);
    clampCam();
    if (!state) paintBlank();
  }

  function paintBlank() {
    const v = cameraFor(view.W, view.H, cam);
    ctx.setTransform(view.dpr * v.S, 0, 0, view.dpr * v.S, view.dpr * (view.W / 2 - v.cx * v.S), view.dpr * (view.H / 2 - v.cy * v.S));
    A.drawLand(ctx, 'meadow', v, 0, isNight(), 0);
  }

  function ensureLoop() {
    if (running) return;
    running = true;
    requestAnimationFrame((t) => { last = t; step(t); });
  }

  /* ---------- 介面 ---------- */
  function syncUI() {
    const n = list.length;
    const power = E.strength(state);
    const done = E.isComplete(state);
    const land = E.LANDS[shownLand];
    document.body.dataset.land = land.id;
    $('title').textContent = E.castleName(state);
    document.title = `${E.castleName(state)}｜強壯城堡`;
    $('count').textContent = n;
    $('goal').textContent = state.target;
    $('goalFill').style.width = `${Math.min(100, (n / state.target) * 100)}%`;
    $('goalBar').setAttribute('aria-valuenow', n);
    $('goalBar').setAttribute('aria-valuemax', state.target);
    $('power').textContent = power;
    $('trainInfo').textContent = `已改正 ${E.trainCount(state)} 次`;
    $('landTag').textContent = `${land.icon} ${land.name}`;

    const hatchBtn = $('btnHatch');
    hatchBtn.classList.toggle('go', done);
    $('hatchLabel').textContent = done ? (state.target >= E.MAX_CREATURES ? '城堡滿員了！' : '城堡要出發！') : '完成一題';
    $('hatchSub').textContent = done ? (state.target >= E.MAX_CREATURES ? '開一座新城堡' : '長腳走去新地方') : '孵出一隻小力士';
    hatchBtn.querySelector('.ic').textContent = done ? '🦵' : '🥚';

    $('btnTrain').disabled = n === 0;
    const sel = list[selected];
    $('trainSub').textContent = sel ? `練強「${sel.name}」` : (n ? '讓一隻小力士練強' : '先孵出一隻小力士');
    $('btnUndo').disabled = state.history.length === 0;

    const next = E.nextLift(state);
    const liftBtn = $('btnLift');
    liftBtn.classList.toggle('ready', !!(next && next.ready));
    liftBtn.disabled = !(next && next.ready);
    if (!next) {
      $('liftName').textContent = '全部舉完了！';
      $('liftInfo').textContent = '月亮也舉起來了';
    } else {
      $('liftName').textContent = next.ready ? `舉起${next.name}！` : `下一件：${next.name}`;
      $('liftInfo').textContent = next.ready ? next.quip : `還差 ${next.short} 點力量`;
      if (next.ready && !announced.has(next.id)) {
        announced.add(next.id);
        if (n) toast(`力量足夠舉起${next.name}了！`, true);
      }
    }

    $('btnSound').setAttribute('aria-pressed', String(state.sound));
    canvas.setAttribute('aria-label', `${E.castleName(state)}，位於${land.name}，共有 ${n} 隻小力士，目標 ${state.target} 隻，全城力量 ${power}。`);
    const busy = !!walking;
    [$('btnHatch'), $('btnLift'), $('btnStretch')].forEach((b) => { if (busy) b.disabled = true; });
    if (!busy) { $('btnHatch').disabled = false; $('btnStretch').disabled = false; }
  }

  function toast(text, gold) {
    const el = $('toast');
    el.textContent = text;
    el.classList.toggle('gold', !!gold);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function touched() {
    lastAct = now;
    sessionActions++;
    if (sessionActions % 12 === 0) setTimeout(() => toast('連續努力了一會，要不要做一次力量操？'), 2700);
  }

  /* ---------- 主要動作 ---------- */
  function doHatch() {
    if (walking) return;
    if (E.isComplete(state)) { journeyDialog(); return; }
    const res = E.hatch(state, Date.now());
    if (!res) return;
    list = E.creatures(state);
    syncLayout();
    const cell = geo.cells[list.length - 1];
    ents.push({ x: cell.x, y: cell.y, s: cell.s, born: now, hop: -1e9, up: -1e9, happy: now + EGG_MS + 1100 });
    mouthUntil = now + 900;
    sfx.hatch();
    touched();
    save();
    if (res.creature.rare) toast(`閃閃金毛的${res.creature.speciesName}出現了！`, true);
    else if (res.newSpecies) toast(`圖鑑新成員：${res.creature.speciesName}！`, true);
    else toast(pick(cheers));
    syncUI();
    if (E.isComplete(state)) {
      setTimeout(() => {
        burst(500, 300, 90, confetti, 1.6);
        sfx.fanfare();
        happyUntil = now + 2600;
      }, EGG_MS);
      setTimeout(() => { if (E.isComplete(state) && !dlg.open && !lifting && !walking) journeyDialog(true); }, 2300);
    }
  }

  function doTrain() {
    const made = E.train(state, selected >= 0 ? selected : undefined, Date.now());
    if (!made) return;
    list = E.creatures(state);
    const e = ents[made.index];
    e.up = now;
    e.happy = now + 1400;
    burst(e.x, e.y, 18, ['#ffcf4d', '#ff5d5d', '#fff'], 1);
    sfx.train();
    touched();
    save();
    const levelled = made.trains <= 5;
    toast(levelled ? `${made.name}升級為${made.levelName}！${pick(courage)}` : pick(courage), levelled);
    syncUI();
    if (selected === made.index) showCard(made.index);
  }

  function doUndo() {
    const lastEvent = E.undo(state);
    if (!lastEvent) return;
    list = E.creatures(state);
    if (lastEvent.k === 'h') {
      const gone = ents.pop();
      if (gone) burst(gone.x, gone.y, 10, ['#d9d4e5', '#fff'], 0.7);
      if (selected >= list.length) closeCard();
    }
    syncLayout();
    save();
    toast('已復原上一步');
    syncUI();
    if (selected >= 0) showCard(selected);
  }

  /* ---------- 小力士資料卡 ---------- */
  function showCard(index) {
    const c = list[index];
    if (!c) return;
    selected = index;
    const art = $('cardArt').getContext('2d');
    art.setTransform(1, 0, 0, 1, 0, 0);
    art.clearRect(0, 0, 168, 168);
    art.scale(168 / 130, 168 / 130);
    art.translate(15, 15);
    A.drawCreature(art, c, 'happy');
    $('cardName').textContent = c.name;
    $('cardMeta').textContent = `${c.rare ? '閃閃金毛' : ''}${c.speciesName}・${c.levelName}・第 ${index + 1} 隻`;
    $('cardNote').textContent = c.note;
    $('card').hidden = false;
    syncUI();
  }

  function closeCard() {
    selected = -1;
    $('card').hidden = true;
    if (state) syncUI();
  }

  function tapCreature(i) {
    const e = ents[i];
    e.hop = now;
    e.happy = now + 900;
    sfx.squeak(i);
    lastAct = now;
    showCard(i);
  }

  function renameDialog() {
    const c = list[selected];
    if (!c) return;
    openDialog(`<h2>幫牠改名</h2>
      <label class="field">新名字<input id="newName" maxlength="16" value="${esc(c.name)}"></label>
      <div class="row"><button class="btn primary" id="okName" type="button">確定</button><button class="btn" data-close type="button">取消</button></div>`);
    $('okName').onclick = () => {
      const name = $('newName').value.trim().slice(0, 16);
      if (name) state.names[c.index] = name;
      else delete state.names[c.index];
      list = E.creatures(state);
      save();
      dlg.close();
      showCard(c.index);
    };
  }

  /* ---------- 舉重 ---------- */
  function startLift() {
    const item = E.nextLift(state);
    if (!item || !item.ready || walking) return;
    closeCard();
    if (stretch) endStretch(false);
    lifting = { item, power: 0, done: false };
    $('mainActions').hidden = true;
    $('liftActions').hidden = false;
    $('liftTitle').textContent = `全城一起舉起${item.name}！`;
    $('heaveFill').style.width = '0';
    $('shoutNote').textContent = '喊聲只用來量音量，不會錄音，也不會傳出這部裝置。';
    $('btnHeave').disabled = false;
    $('btnHeave').focus();
    lastAct = now;
  }

  function heave() {
    if (!lifting || lifting.done) return;
    const tier = E.LIFTS.findIndex((l) => l.id === lifting.item.id);
    lifting.power += Math.max(5, 11 - tier * 0.7);
    sfx.heave(lifting.power);
    burst(500 + (Math.random() - 0.5) * 300, 560, 3, ['#fff', '#e8dcc0'], 0.5);
    lastAct = now;
    if (lifting.power >= 100) finishLift();
  }

  function finishLift() {
    if (!lifting || lifting.done) return;
    lifting.done = true;
    lifting.power = 100;
    stopMic();
    E.lift(state, lifting.item.id);
    save();
    $('heaveFill').style.width = '100%';
    $('btnHeave').disabled = true;
    $('liftTitle').textContent = `舉起來了！${lifting.item.quip}`;
    toast(`${lifting.item.name}成為城堡的新皇冠！`, true);
    sfx.fanfare();
    burst(500, builtTop(true) - 80, 120, confetti, 1.7);
    const id = lifting.item.id;
    setTimeout(() => { if (lifting && lifting.item.id === id) leaveLift(); }, 2800);
  }

  function leaveLift() {
    stopMic();
    lifting = null;
    $('liftActions').hidden = true;
    $('mainActions').hidden = false;
    syncUI();
    $('btnLift').focus();
  }

  async function startMic() {
    const note = $('shoutNote');
    if (mic) { stopMic(); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      note.textContent = '這部裝置不支援喊聲，連按按鈕一樣舉得起。';
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!lifting) { stream.getTracks().forEach((tr) => tr.stop()); return; }
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ac.createAnalyser();
      analyser.fftSize = 512;
      ac.createMediaStreamSource(stream).connect(analyser);
      mic = { stream, ac, analyser, data: new Uint8Array(analyser.fftSize) };
      $('btnShout').setAttribute('aria-pressed', 'true');
      note.textContent = '大聲喊「加油」！喊得越響舉得越快。';
    } catch (err) {
      note.textContent = '沒有開啟咪高峰，連按按鈕一樣舉得起。';
    }
  }

  function micLevel() {
    mic.analyser.getByteTimeDomainData(mic.data);
    let sum = 0;
    for (const v of mic.data) sum += ((v - 128) / 128) ** 2;
    return Math.sqrt(sum / mic.data.length);
  }

  function stopMic() {
    if (mic) {
      mic.stream.getTracks().forEach((tr) => tr.stop());
      mic.ac.close();
      mic = null;
      $('shoutNote').textContent = '咪高峰已關閉。喊聲不會錄音，也不會傳出這部裝置。';
    }
    $('btnShout').setAttribute('aria-pressed', 'false');
  }

  /* ---------- 力量操 ---------- */
  function startStretch() {
    if (walking) return;
    closeCard();
    stretch = { t0: now, move: -1 };
    $('stretch').hidden = false;
    $('stretchSkip').focus();
  }

  function endStretch(finished) {
    stretch = null;
    $('stretch').hidden = true;
    lastAct = now;
    if (finished) {
      happyUntil = now + 1800;
      toast('休息完成，全城力士精神百倍！', true);
    }
  }

  /* ---------- 出發 ---------- */
  function journeyDialog(celebrate) {
    if (state.target >= E.MAX_CREATURES) {
      openDialog(`<h2>城堡滿員了！</h2><p>${E.MAX_CREATURES} 隻小力士已經把城堡站滿。這座城堡會收進相簿，再開一座新城堡繼續。</p>
        <div class="row"><button class="btn primary" id="toNew" type="button">開新城堡</button><button class="btn" data-close type="button">先欣賞一下</button></div>`);
      $('toNew').onclick = () => setupDialog(true);
      return;
    }
    const lands = E.LANDS.map((l, i) => (i === state.land ? '' : `<button class="choice" type="button" data-land="${i}" aria-pressed="false">${l.icon} ${l.name}${state.visited.includes(i) ? '' : '（新）'}</button>`)).join('');
    const room = E.MAX_CREATURES - state.target;
    const adds = [10, 20, 30, 50].filter((a) => a <= room);
    if (!adds.length) adds.push(room);
    openDialog(`<h2>${celebrate ? '目標完成，城堡站起來了！' : '城堡要出發了'}</h2>
      <p>${esc(state.child)}完成了 ${list.length} 隻小力士。選一個新地方，那裏會孵出全新品種。</p>
      <h3>去哪裏？</h3><div class="choices" id="pickLand">${lands}</div>
      <h3>再添多少隻？</h3><div class="choices" id="pickAdd">${adds.map((a) => `<button class="choice" type="button" data-add="${a}" aria-pressed="false">＋${a} 隻</button>`).join('')}</div>
      <div class="row"><button class="btn primary" id="goWalk" type="button" disabled>長出雙腳，出發！</button><button class="btn" data-close type="button">先留在這裏休息</button></div>`);
    let land = null;
    let add = adds[Math.min(1, adds.length - 1)];
    const refresh = () => {
      document.querySelectorAll('#pickLand .choice').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.land) === land)));
      document.querySelectorAll('#pickAdd .choice').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.add) === add)));
      $('goWalk').disabled = land === null;
    };
    $('pickLand').onclick = (ev) => { const b = ev.target.closest('[data-land]'); if (b) { land = Number(b.dataset.land); refresh(); } };
    $('pickAdd').onclick = (ev) => { const b = ev.target.closest('[data-add]'); if (b) { add = Number(b.dataset.add); refresh(); } };
    $('goWalk').onclick = () => { dlg.close(); startWalk(land, add); };
    refresh();
  }

  function startWalk(land, add) {
    if (!E.travel(state, land, add)) return;
    save();
    closeCard();
    cam = { z: 1, dx: 0, dy: 0 };
    applyZoomClass();
    list = E.creatures(state);
    if (reduced) {
      shownLand = state.land;
      syncLayout();
      syncUI();
      toast(`到達${E.LANDS[state.land].name}！${E.LANDS[state.land].line}`, true);
      return;
    }
    walking = { t0: now, dur: 5400, beat: -1 };
    toast(`城堡出發去${E.LANDS[land].name}！`, true);
    syncUI();
  }

  function endWalk() {
    walking = null;
    shownLand = state.land;
    syncLayout();
    happyUntil = now + 1800;
    toast(`到達${E.LANDS[state.land].name}！${E.LANDS[state.land].line}`, true);
    syncUI();
  }

  /* ---------- 對話框 ---------- */
  function openDialog(html) {
    $('dialogBody').innerHTML = html;
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
  }
  dlg.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-close]')) dlg.close();
  });

  function setupDialog(isNew) {
    const old = findOldCastle();
    const blocked = !state;
    const presets = [10, 20, 30, 50, 100];
    openDialog(`<h2>${isNew ? '開一座新城堡' : '歡迎來到強壯城堡'}</h2>
      <p>${isNew ? '現在的城堡會自動收進相簿。' : '這座城堡沒有一塊積木，全部由活生生的小力士托起來。完成一題孵一隻，勇敢改正令牠練強。'}</p>
      <label class="field">小朋友的名字<input id="fChild" maxlength="20" placeholder="小小力士" value="${isNew ? esc(state.child) : ''}"></label>
      <label class="field">城堡名字（可留空）<input id="fCastle" maxlength="24" placeholder="例如：大力星球總部"></label>
      <label class="field">這次要孵多少隻？（1–${E.MAX_CREATURES}）<input id="fTarget" type="number" inputmode="numeric" min="1" max="${E.MAX_CREATURES}" value="30"></label>
      <div class="choices" id="pickTarget">${presets.map((p) => `<button class="choice" type="button" data-n="${p}">${p} 隻</button>`).join('')}</div>
      <h3>城堡造型</h3>
      <div class="choices" id="pickShape">${Object.entries(E.SHAPES).map(([id, s]) => `<button class="choice" type="button" data-shape="${id}" aria-pressed="${id === 'twin'}">${s.name}</button>`).join('')}</div>
      ${old && !isNew ? `<div class="note">在這個瀏覽器找到勇氣城堡的存檔：${old.count} 塊積木、${old.shine} 次改正。可以喚醒成小力士，舊城堡本身不會被改動。${old.dropped ? `（超過 ${E.MAX_CREATURES} 隻的部分不會帶入）` : ''}<div class="row"><button class="btn" id="wakeOld" type="button">喚醒舊積木</button></div></div>` : ''}
      <div class="row"><button class="btn primary" id="okSetup" type="button">開始建城</button>${blocked ? '' : '<button class="btn" data-close type="button">取消</button>'}</div>`);
    let shape = 'twin';
    $('pickTarget').onclick = (ev) => { const b = ev.target.closest('[data-n]'); if (b) $('fTarget').value = b.dataset.n; };
    $('pickShape').onclick = (ev) => {
      const b = ev.target.closest('[data-shape]');
      if (!b) return;
      shape = b.dataset.shape;
      document.querySelectorAll('#pickShape .choice').forEach((q) => q.setAttribute('aria-pressed', String(q === b)));
    };
    if ($('wakeOld')) {
      $('wakeOld').onclick = () => {
        adopt(old.state);
        dlg.close();
        toast(`${old.count} 塊積木變成小力士了！`, true);
      };
    }
    $('okSetup').onclick = () => {
      const album = isNew ? E.archive(state, thumbnail()) : [];
      const sound = state ? state.sound : true;
      adopt(E.fresh({ child: $('fChild').value, castle: $('fCastle').value, target: $('fTarget').value, shape, album, sound }));
      dlg.close();
      toast('按「完成一題」，孵出第一隻小力士！');
    };
    dlg.oncancel = (ev) => { if (!state) ev.preventDefault(); };
  }

  function menuDialog() {
    const n = list.length;
    openDialog(`<h2>城堡設定</h2>
      <label class="field">小朋友的名字<input id="mChild" maxlength="20" value="${esc(state.child)}"></label>
      <label class="field">城堡名字<input id="mCastle" maxlength="24" value="${esc(state.castle)}" placeholder="${esc(state.child)}的強壯城堡"></label>
      <label class="field">目標隻數（${Math.max(1, n)}–${E.MAX_CREATURES}）<input id="mTarget" type="number" inputmode="numeric" min="${Math.max(1, n)}" max="${E.MAX_CREATURES}" value="${state.target}"></label>
      <div class="choices" id="mShape">${Object.entries(E.SHAPES).map(([id, s]) => `<button class="choice" type="button" data-shape="${id}" aria-pressed="${id === state.shape}">${s.name}</button>`).join('')}</div>
      <div class="row"><button class="btn primary" id="mSave" type="button">儲存</button><button class="btn" data-close type="button">關閉</button></div>
      <h3>保存成果</h3>
      <div class="row"><button class="btn" id="mPoster" type="button">🖼️ 下載紀念海報</button><button class="btn" id="mBackup" type="button">💾 下載備份</button><button class="btn" id="mImport" type="button">📂 匯入備份</button></div>
      <h3>重新開始</h3>
      <div class="row"><button class="btn warn" id="mNew" type="button">開一座新城堡</button></div>
      <p class="fine">所有紀錄只存在這個瀏覽器。換裝置前請先下載備份。</p>`);
    let shape = state.shape;
    $('mShape').onclick = (ev) => {
      const b = ev.target.closest('[data-shape]');
      if (!b) return;
      shape = b.dataset.shape;
      document.querySelectorAll('#mShape .choice').forEach((q) => q.setAttribute('aria-pressed', String(q === b)));
    };
    $('mSave').onclick = () => {
      state.child = $('mChild').value.trim().slice(0, 20) || '小小力士';
      state.castle = $('mCastle').value.trim().slice(0, 24);
      state.target = E.clamp(parseInt($('mTarget').value, 10) || state.target, Math.max(1, n), E.MAX_CREATURES);
      state.shape = shape;
      syncLayout();
      save();
      syncUI();
      dlg.close();
    };
    $('mPoster').onclick = downloadPoster;
    $('mBackup').onclick = () => {
      download(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), `強壯城堡備份-${stamp()}.json`);
      toast('備份已下載');
    };
    $('mImport').onclick = () => $('fileInput').click();
    $('mNew').onclick = () => setupDialog(true);
  }

  function dexDialog() {
    const seen = {};
    let golden = 0;
    list.forEach((c) => {
      seen[c.species] = (seen[c.species] || 0) + 1;
      if (c.rare) golden++;
    });
    const found = Object.keys(seen).length;
    openDialog(`<h2>小力士圖鑑</h2><p>已發現 ${found}／${E.SPECIES.length} 種，閃閃金毛 ${golden} 隻。去新地方會遇到新品種。</p>
      <div class="dex">${E.SPECIES.map((s) => `<div class="${seen[s.id] ? '' : 'locked'}"><canvas width="144" height="144" data-sp="${s.id}"></canvas>${seen[s.id] ? esc(s.name) : '？？？'}<small>${E.LANDS[s.land].icon} ${seen[s.id] ? `${seen[s.id]} 隻` : E.LANDS[s.land].name}</small></div>`).join('')}</div>
      <div class="row"><button class="btn" data-close type="button">關閉</button></div>`);
    document.querySelectorAll('.dex canvas').forEach((cv) => {
      const g = cv.getContext('2d');
      g.scale(144 / 130, 144 / 130);
      g.translate(15, 15);
      A.drawCreature(g, { species: cv.dataset.sp, variant: 0, level: 0, rare: false }, 'normal');
    });
  }

  function logDialog() {
    const st = E.stats(state, Date.now());
    openDialog(`<h2>${esc(state.child)}的力量紀錄</h2>
      <div class="tiles"><div><b>${st.today.h}</b>今天完成</div><div><b>${st.today.t}</b>今天改正</div><div><b>${st.streak}</b>連續天數</div></div>
      <h3>最近七天（完成＋改正）</h3>
      <div class="week">${st.days.map((d) => `<div class="${d.h + d.t ? 'on' : ''}">${d.weekday}<b>${d.h + d.t}</b>${d.label}</div>`).join('')}</div>
      <h3>舉重榜</h3>
      <div class="lifts">${E.LIFTS.map((l) => { const got = state.lifted.includes(l.id); return `<div class="${got ? '' : 'locked'}"><canvas width="184" height="128" data-obj="${l.id}"></canvas>${got ? esc(l.name) : `${l.need} 點力量`}</div>`; }).join('')}</div>
      <h3>到過的地方</h3>
      <div class="stamps">${E.LANDS.map((l, i) => `<span class="${state.visited.includes(i) ? '' : 'off'}">${l.icon} ${l.name}</span>`).join('')}</div>
      ${state.album.length ? `<h3>城堡相簿</h3><div class="album">${state.album.map((a) => `<figure>${a.thumb ? `<img src="${a.thumb}" alt="${esc(a.name)}">` : ''}<figcaption>${esc(a.name)}<br>${a.count} 隻・力量 ${a.power}・${esc(a.date)}</figcaption></figure>`).join('')}</div>` : ''}
      <div class="row"><button class="btn" data-close type="button">關閉</button></div>`);
    document.querySelectorAll('.lifts canvas').forEach((cv) => {
      const g = cv.getContext('2d');
      g.translate(92, 72);
      g.scale(0.62, 0.62);
      A.drawObject(g, cv.dataset.obj);
    });
  }

  /* ---------- 匯出 ---------- */
  const stamp = () => new Date().toISOString().slice(0, 10);

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function thumbnail() {
    const cv = document.createElement('canvas');
    cv.width = 360;
    cv.height = 240;
    paint(cv.getContext('2d'), 360, 240, 1, now, { z: 1, dx: 0, dy: 0 }, { exportLand: shownLand });
    return cv.toDataURL('image/jpeg', 0.62);
  }

  function downloadPoster() {
    const W = 1200;
    const H = 1500;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d');
    const scene = document.createElement('canvas');
    scene.width = 1120;
    scene.height = 980;
    paint(scene.getContext('2d'), 1120, 980, 1, now, { z: 1, dx: 0, dy: 0 }, { exportLand: shownLand });
    g.fillStyle = '#ffcf4d';
    g.fillRect(0, 0, W, H);
    g.fillStyle = A.INK;
    g.textAlign = 'center';
    g.font = '900 72px "PingFang HK","Noto Sans CJK TC","Microsoft JhengHei",sans-serif';
    g.fillText(E.castleName(state).slice(0, 15), W / 2, 112);
    g.font = '800 34px "PingFang HK","Noto Sans CJK TC","Microsoft JhengHei",sans-serif';
    g.fillText(`${state.child}親手孵出的力士王國`, W / 2, 168);
    g.drawImage(scene, 40, 206);
    g.lineWidth = 8;
    g.strokeStyle = A.INK;
    g.strokeRect(40, 206, 1120, 980);
    const lifted = E.LIFTS.filter((l) => state.lifted.includes(l.id));
    const items = [[list.length, '隻小力士'], [E.trainCount(state), '次勇敢改正'], [E.strength(state), '全城力量'], [state.visited.length, '個地方']];
    items.forEach(([v, label], i) => {
      const x = 180 + i * 280;
      g.font = '900 76px "PingFang HK","Noto Sans CJK TC","Microsoft JhengHei",sans-serif';
      g.fillText(v, x, 1290);
      g.font = '800 30px "PingFang HK","Noto Sans CJK TC","Microsoft JhengHei",sans-serif';
      g.fillText(label, x, 1336);
    });
    g.font = '800 32px "PingFang HK","Noto Sans CJK TC","Microsoft JhengHei",sans-serif';
    g.fillText(lifted.length ? `最重舉起：${lifted[lifted.length - 1].name}` : '力氣正在長大中', W / 2, 1404);
    g.font = '700 26px "PingFang HK","Noto Sans CJK TC","Microsoft JhengHei",sans-serif';
    g.fillText(`強壯城堡・${stamp()}`, W / 2, 1456);
    cv.toBlob((blob) => {
      if (blob) { download(blob, `強壯城堡海報-${stamp()}.png`); toast('紀念海報已下載'); }
    }, 'image/png');
  }

  $('fileInput').addEventListener('change', async (ev) => {
    const file = ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    let next = null;
    try {
      if (file.size < 8e6) next = E.validate(JSON.parse(await file.text()));
    } catch (err) { next = null; }
    if (!next) {
      if (dlg.open) dlg.close();
      toast('這個檔案不是強壯城堡的備份。');
      return;
    }
    openDialog(`<h2>匯入備份？</h2><p>「${esc(E.castleName(next))}」有 ${E.hatchCount(next)} 隻小力士。現在的城堡會收進相簿。</p>
      <div class="row"><button class="btn primary" id="okImport" type="button">確定匯入</button><button class="btn" data-close type="button">取消</button></div>`);
    $('okImport').onclick = () => {
      next.album = [...E.archive(state, thumbnail()), ...next.album].slice(-12);
      adopt(next);
      dlg.close();
      toast('備份已匯入');
    };
  });

  /* ---------- 操作 ---------- */
  function worldAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const v = cameraFor(view.W, view.H, cam);
    return { x: v.cx + (clientX - rect.left - view.W / 2) / v.S, y: v.cy + (clientY - rect.top - view.H / 2) / v.S };
  }

  function creatureAt(clientX, clientY) {
    const p = worldAt(clientX, clientY);
    let best = -1;
    let dist = Infinity;
    ents.forEach((e, i) => {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < Math.max(e.s * 0.72, 18) && d < dist) { dist = d; best = i; }
    });
    return best;
  }

  function clampCam() {
    const room = 1 - 1 / cam.z;
    cam.dx = E.clamp(cam.dx, -520 * room, 520 * room);
    cam.dy = E.clamp(cam.dy, -340 * room, 340 * room);
  }

  function applyZoomClass() {
    canvas.classList.toggle('zoomed', cam.z > 1.01);
  }

  function zoomBy(f, cx, cy) {
    const before = cx != null ? worldAt(cx, cy) : null;
    cam.z = E.clamp(cam.z * f, 1, 6);
    if (before) {
      const after = worldAt(cx, cy);
      cam.dx += before.x - after.x;
      cam.dy += before.y - after.y;
    }
    clampCam();
    applyZoomClass();
  }

  const pointers = new Map();
  let drag = null;
  let pinch = 0;
  let tapReady = false;

  canvas.addEventListener('pointerdown', (ev) => {
    pointers.set(ev.pointerId, ev);
    drag = { x: ev.clientX, y: ev.clientY, moved: 0 };
    if (cam.z > 1.01 || pointers.size > 1) canvas.setPointerCapture(ev.pointerId);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }
  });

  canvas.addEventListener('pointermove', (ev) => {
    pointerAt = { x: ev.clientX, y: ev.clientY };
    if (!pointers.has(ev.pointerId)) return;
    pointers.set(ev.pointerId, ev);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (pinch) zoomBy(d / pinch, (a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
      pinch = d;
      if (drag) drag.moved = 99;
    } else if (drag) {
      const dx = ev.clientX - drag.x;
      const dy = ev.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.x = ev.clientX;
      drag.y = ev.clientY;
      if (cam.z > 1.01) {
        const v = cameraFor(view.W, view.H, cam);
        cam.dx -= dx / v.S;
        cam.dy -= dy / v.S;
        clampCam();
      }
    }
  });

  function pointerEnd(ev) {
    tapReady = !!drag && drag.moved < 10 && pointers.size === 1 && ev.type === 'pointerup';
    pointers.delete(ev.pointerId);
    if (pointers.size < 2) pinch = 0;
    if (!pointers.size) drag = null;
  }
  /* 等 click 才開資料卡，否則觸控補發的點擊會落在剛彈出的卡片按鈕上。 */
  canvas.addEventListener('click', (ev) => {
    if (!tapReady) return;
    tapReady = false;
    const i = creatureAt(ev.clientX, ev.clientY);
    if (i >= 0) tapCreature(i);
    else if (selected >= 0) closeCard();
  });
  canvas.addEventListener('pointerup', pointerEnd);
  canvas.addEventListener('pointercancel', pointerEnd);
  canvas.addEventListener('pointerleave', () => { pointerAt = null; });
  canvas.addEventListener('wheel', (ev) => {
    if (!ev.ctrlKey && cam.z <= 1.01 && ev.deltaY > 0) return;
    ev.preventDefault();
    zoomBy(ev.deltaY < 0 ? 1.14 : 0.88, ev.clientX, ev.clientY);
  }, { passive: false });

  canvas.addEventListener('keydown', (ev) => {
    if (!list.length) return;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
      ev.preventDefault();
      const d = ev.key === 'ArrowRight' ? 1 : -1;
      tapCreature((Math.max(selected, 0) + d + list.length) % list.length);
    } else if (ev.key === 'Escape') closeCard();
  });

  document.addEventListener('keydown', (ev) => {
    const free = document.activeElement === document.body || document.activeElement === canvas;
    if (lifting && free && ev.code === 'Space' && !ev.repeat && !dlg.open) {
      ev.preventDefault();
      heave();
    }
  });

  $('btnHatch').onclick = doHatch;
  $('btnTrain').onclick = doTrain;
  $('btnUndo').onclick = doUndo;
  $('btnLift').onclick = startLift;
  $('btnHeave').onclick = heave;
  $('btnShout').onclick = startMic;
  $('btnLiftLater').onclick = leaveLift;
  $('btnStretch').onclick = startStretch;
  $('stretchSkip').onclick = () => endStretch(false);
  $('btnDex').onclick = dexDialog;
  $('btnLog').onclick = logDialog;
  $('btnMenu').onclick = menuDialog;
  $('cardClose').onclick = closeCard;
  $('cardRename').onclick = renameDialog;
  $('zoomIn').onclick = () => zoomBy(1.4);
  $('zoomOut').onclick = () => zoomBy(1 / 1.4);
  $('zoomHome').onclick = () => { cam = { z: 1, dx: 0, dy: 0 }; applyZoomClass(); };
  $('btnSound').onclick = () => { state.sound = !state.sound; save(); syncUI(); if (state.sound) sfx.squeak(2); };
  $('btnFull').onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => toast('這部裝置不支援全螢幕。'));
    else toast('這部裝置不支援全螢幕。');
  };

  /* 只供自動測試讀取畫面狀態；沒有任何可改動進度的方法。 */
  window.strongCastle = {
    snapshot() {
      const rect = canvas.getBoundingClientRect();
      const v = cameraFor(view.W, view.H, cam);
      return {
        count: list.length,
        target: state ? state.target : 0,
        power: state ? E.strength(state) : 0,
        land: shownLand,
        walking: !!walking,
        lifting: lifting ? { id: lifting.item.id, power: lifting.power, done: lifting.done } : null,
        stretching: !!stretch,
        zoom: cam.z,
        selected,
        points: ents.map((e) => ({ x: rect.left + view.W / 2 + (e.x - v.cx) * v.S, y: rect.top + view.H / 2 + (e.y - v.cy) * v.S })),
      };
    },
  };

  function drawMascot() {
    const g = $('mascot').getContext('2d');
    g.scale(112 / 130, 112 / 130);
    g.translate(15, 15);
    A.drawCreature(g, { species: 'fluff', variant: 0, level: 2, rare: false }, 'happy');
  }

  function start() {
    drawMascot();
    new ResizeObserver(resize).observe(canvas);
    resize();
    const saved = loadSaved();
    if (saved) {
      state = saved;
      shownLand = state.land;
      rebuild();
      ensureLoop();
    } else setupDialog(false);
  }

  start();
})();
