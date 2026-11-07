(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SCEngine = api;
})(globalThis, function () {
  'use strict';

  const SAVE_KEY = 'strong-castle-save-v1';
  const OLD_KEYS = ['courage-castle-save-v2', 'courage-castle-save-v1'];
  const MAX_CREATURES = 600;
  const MAX_TRAINS = 6000;
  const MAX_ALBUM = 12;
  const GROUND = 566;

  const LANDS = [
    { id: 'meadow', name: '青草丘', icon: '🌿', line: '草地軟綿綿，最適合練深蹲。' },
    { id: 'beach', name: '浪花灘', icon: '🏖️', line: '海風一吹，手臂更有力。' },
    { id: 'snow', name: '雪帽山', icon: '🏔️', line: '冷得發抖也不放手。' },
    { id: 'volcano', name: '暖暖火山', icon: '🌋', line: '地底的熱力全部借給你。' },
    { id: 'moon', name: '月球後院', icon: '🌙', line: '重力很小，志氣很大。' },
  ];

  const SPECIES = [
    { id: 'fluff', land: 0, name: '毛毛球', body: 'round', colors: ['#f6a6b2', '#8fd3c7', '#ffd166'], note: '越緊張，毛就越蓬。' },
    { id: 'mushroom', land: 0, name: '蘑菇頭', body: 'pear', colors: ['#ffe3bd', '#f4d3a8', '#ffeed6'], note: '頭上的帽子是牠的安全帽。' },
    { id: 'moss', land: 0, name: '青苔墩', body: 'square', colors: ['#8ccf6d', '#a9d86e', '#6fc48e'], note: '站得最穩，負責做地基。' },
    { id: 'crab', land: 1, name: '蟹鉗鉗', body: 'square', colors: ['#ff8a6b', '#ff7a7a', '#ffa45c'], note: '夾住了就不會鬆手。' },
    { id: 'star', land: 1, name: '海星星', body: 'round', colors: ['#ffb347', '#ff9fb0', '#c9a2ff'], note: '跌倒時會自己彈回來。' },
    { id: 'jelly', land: 1, name: '水母帽', body: 'tall', colors: ['#9fd8ff', '#c2b5ff', '#a5f0e0'], note: '軟軟的，但耐力很好。' },
    { id: 'snowball', land: 2, name: '雪糰糰', body: 'round', colors: ['#f4fbff', '#e7f2ff', '#f7f0ff'], note: '圍巾是奶奶織的。' },
    { id: 'icehorn', land: 2, name: '冰角角', body: 'pear', colors: ['#9cc8f5', '#a9b7f7', '#8fdde8'], note: '角上的冰永遠不融。' },
    { id: 'yeti', land: 2, name: '大耳雪怪', body: 'tall', colors: ['#d8d4f2', '#c8e0ea', '#e6d9cf'], note: '耳朵大，聽得到每句加油。' },
    { id: 'lava', land: 3, name: '熔岩仔', body: 'square', colors: ['#7a4a55', '#6b4a6e', '#85504a'], note: '身上的裂紋是力量的光。' },
    { id: 'flame', land: 3, name: '火苗頭', body: 'pear', colors: ['#ff7e5f', '#ff9a4d', '#ff6f91'], note: '開心時火苗會跳舞。' },
    { id: 'coal', land: 3, name: '炭炭', body: 'round', colors: ['#5f5a70', '#6a5f66', '#565f75'], note: '外面黑黑，裏面暖暖。' },
    { id: 'antenna', land: 4, name: '天線星人', body: 'tall', colors: ['#8ee3a8', '#a4e86f', '#7ddbd0'], note: '收得到遠方的打氣聲。' },
    { id: 'cyclops', land: 4, name: '一眼仔', body: 'round', colors: ['#c79bff', '#ff9bd8', '#9bb5ff'], note: '只有一隻眼，專心度最高。' },
    { id: 'ring', land: 4, name: '環環', body: 'pear', colors: ['#ffcf70', '#ffb8a0', '#b8d8ff'], note: '腰間的光環是呼拉圈。' },
  ];

  const LIFTS = [
    { id: 'bun', name: '巨型菠蘿包', need: 5, quip: '香噴噴，先來熱身。' },
    { id: 'melon', name: '大西瓜', need: 12, quip: '小心，別讓它滾走。' },
    { id: 'piano', name: '三角鋼琴', need: 25, quip: '舉起時會自己響一聲。' },
    { id: 'minibus', name: '紅色小巴', need: 45, quip: '有落！全城一起舉！' },
    { id: 'tram', name: '雙層電車', need: 80, quip: '叮叮！頂層乘客請坐穩。' },
    { id: 'elephant', name: '大象', need: 130, quip: '牠說自己其實不重。' },
    { id: 'ferry', name: '渡海小輪', need: 200, quip: '連海水也一併帶來了。' },
    { id: 'whale', name: '藍鯨', need: 300, quip: '牠正在噴水慶祝。' },
    { id: 'moon', name: '月亮', need: 450, quip: '今晚的月亮歸你們管。' },
  ];

  const SHAPES = {
    twin: {
      name: '雙塔門神',
      rects: [[230, 350, 150], [650, 770, 150], [350, 650, 330], [440, 560, 240]],
      door: [462, 538, 452],
    },
    tall: {
      name: '衝天高塔',
      rects: [[420, 580, 105], [270, 730, 345], [235, 325, 255], [675, 765, 255]],
      door: [462, 538, 452],
    },
    triple: {
      name: '三峰大力',
      rects: [[245, 355, 235], [440, 560, 125], [645, 755, 235], [245, 755, 385]],
      door: [462, 538, 452],
    },
  };

  const ADJ = ['愛笑的', '勇敢的', '不放棄的', '慢慢來的', '眼睛亮亮的', '有耐性的', '大嗓門的', '會打氣的', '肚子餓的', '認真的'];
  const NICK = ['阿力', '小壯', '波波', '嘟嘟', '咕咕', '朗朗', '鐵鐵', '豆豆', '球球', '麻糬', '糯米', '芝麻', '布丁', '湯圓', '蛋撻', '魚蛋'];
  const LEVELS = ['初生力士', '小力士', '大力士', '鐵臂力士', '金剛力士', '傳說力士'];

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const randomSeed = () => Math.floor(Math.random() * 2147483640) + 1;

  function hash(seed, i, salt) {
    let x = (Math.imul(i + 13, 374761393) + Math.imul(seed, 668265263) + Math.imul(salt + 1, 2246822519)) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }

  function fresh(options) {
    const o = options || {};
    return {
      version: 1,
      child: cleanText(o.child, 20) || '小小力士',
      castle: cleanText(o.castle, 24),
      target: clamp(parseInt(o.target, 10) || 30, 1, MAX_CREATURES),
      shape: SHAPES[o.shape] ? o.shape : 'twin',
      seed: Number.isInteger(o.seed) ? o.seed : randomSeed(),
      sound: o.sound !== false,
      land: 0,
      visited: [0],
      history: [],
      lifted: [],
      names: {},
      album: Array.isArray(o.album) ? o.album : [],
      createdAt: Date.now(),
    };
  }

  function cleanText(value, max) {
    return String(value == null ? '' : value).replace(/[\u0000-\u001f]/g, '').trim().slice(0, max);
  }

  const castleName = (s) => s.castle || `${s.child}的強壯城堡`;
  const hatches = (s) => s.history.filter((e) => e.k === 'h');
  const hatchCount = (s) => s.history.reduce((n, e) => n + (e.k === 'h' ? 1 : 0), 0);
  const trainCount = (s) => s.history.length - hatchCount(s);
  const strength = (s) => hatchCount(s) + trainCount(s) * 3;
  const isComplete = (s) => hatchCount(s) >= s.target;

  function creature(s, index, event, trains) {
    const land = clamp(event.l || 0, 0, LANDS.length - 1);
    const pool = SPECIES.filter((sp) => sp.land === land);
    const species = pool[Math.floor(hash(s.seed, index, 1) * pool.length)];
    const variant = Math.floor(hash(s.seed, index, 2) * 3);
    const rare = hash(s.seed, index, 3) < 1 / 16;
    const auto = ADJ[Math.floor(hash(s.seed, index, 4) * ADJ.length)] + NICK[Math.floor(hash(s.seed, index, 5) * NICK.length)];
    const count = trains || 0;
    return {
      index,
      species: species.id,
      speciesName: species.name,
      note: species.note,
      variant,
      rare,
      trains: count,
      level: Math.min(5, count),
      levelName: LEVELS[Math.min(5, count)],
      name: s.names[index] || auto,
      ts: event.ts || 0,
      land,
      phase: hash(s.seed, index, 6) * Math.PI * 2,
    };
  }

  function creatures(s) {
    const trains = {};
    for (const e of s.history) if (e.k === 't') trains[e.c] = (trains[e.c] || 0) + 1;
    const out = [];
    for (const e of s.history) {
      if (e.k === 'h') out.push(creature(s, out.length, e, trains[out.length]));
    }
    return out;
  }

  function hatch(s, now) {
    if (isComplete(s)) return null;
    const event = { k: 'h', l: s.land, ts: now || Date.now() };
    const seenBefore = new Set(creatures(s).map((c) => c.species + (c.rare ? '*' : '')));
    s.history.push(event);
    const index = hatchCount(s) - 1;
    const made = creature(s, index, event, 0);
    return { creature: made, newSpecies: !seenBefore.has(made.species + (made.rare ? '*' : '')) };
  }

  function weakest(s) {
    const list = creatures(s);
    if (!list.length) return -1;
    return list.reduce((best, c) => (c.trains < best.trains ? c : best), list[0]).index;
  }

  function train(s, index, now) {
    if (s.history.length >= MAX_CREATURES + MAX_TRAINS) return null;
    const pick = Number.isInteger(index) && index >= 0 && index < hatchCount(s) ? index : weakest(s);
    if (pick < 0) return null;
    s.history.push({ k: 't', c: pick, ts: now || Date.now() });
    const list = creatures(s);
    return list[pick];
  }

  function undo(s) {
    const last = s.history.pop();
    if (!last) return null;
    if (last.k === 'h') delete s.names[hatchCount(s)];
    return last;
  }

  function nextLift(s) {
    const item = LIFTS.find((l) => !s.lifted.includes(l.id));
    if (!item) return null;
    const power = strength(s);
    return { ...item, ready: power >= item.need, short: Math.max(0, item.need - power) };
  }

  function lift(s, id) {
    const item = nextLift(s);
    if (!item || item.id !== id || !item.ready) return false;
    s.lifted.push(id);
    return true;
  }

  function travel(s, land, extra) {
    if (!isComplete(s)) return false;
    if (!Number.isInteger(land) || land < 0 || land >= LANDS.length || land === s.land) return false;
    const add = parseInt(extra, 10);
    if (!(add > 0) || s.target >= MAX_CREATURES) return false;
    s.land = land;
    if (!s.visited.includes(land)) s.visited.push(land);
    s.target = Math.min(MAX_CREATURES, s.target + add);
    return true;
  }

  function dayKey(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function stats(s, now) {
    const today = now || Date.now();
    const perDay = {};
    for (const e of s.history) {
      if (!e.ts) continue;
      const key = dayKey(e.ts);
      perDay[key] = perDay[key] || { h: 0, t: 0 };
      perDay[key][e.k]++;
    }
    const days = [];
    const base = new Date(today);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i, 12);
      const v = perDay[dayKey(d.getTime())] || { h: 0, t: 0 };
      days.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, weekday: '日一二三四五六'[d.getDay()], h: v.h, t: v.t });
    }
    let streak = 0;
    let offset = perDay[dayKey(today)] ? 0 : 1;
    for (;; offset++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - offset, 12);
      if (!perDay[dayKey(d.getTime())]) break;
      streak++;
    }
    return { today: perDay[dayKey(today)] || { h: 0, t: 0 }, days, streak };
  }

  function validate(data) {
    if (!data || data.version !== 1 || !Array.isArray(data.history)) return null;
    if (!Number.isInteger(data.target) || data.target < 1 || data.target > MAX_CREATURES) return null;
    if (data.history.length > MAX_CREATURES + MAX_TRAINS) return null;
    const s = fresh({ child: data.child, castle: data.castle, target: data.target, shape: data.shape, seed: data.seed, sound: data.sound });
    if (Number.isInteger(data.createdAt)) s.createdAt = data.createdAt;
    s.land = Number.isInteger(data.land) && LANDS[data.land] ? data.land : 0;
    s.visited = Array.isArray(data.visited) ? [...new Set(data.visited.filter((v) => Number.isInteger(v) && LANDS[v]))] : [];
    if (!s.visited.includes(s.land)) s.visited.push(s.land);
    let born = 0;
    for (const e of data.history) {
      if (!e || typeof e !== 'object') continue;
      const ts = Number.isFinite(e.ts) && e.ts >= 0 ? e.ts : 0;
      if (e.k === 'h' && born < MAX_CREATURES) {
        s.history.push({ k: 'h', l: Number.isInteger(e.l) && LANDS[e.l] ? e.l : 0, ts });
        born++;
      } else if (e.k === 't' && Number.isInteger(e.c) && e.c >= 0 && e.c < born) {
        s.history.push({ k: 't', c: e.c, ts });
      }
    }
    s.lifted = Array.isArray(data.lifted) ? LIFTS.map((l) => l.id).filter((id) => data.lifted.includes(id)) : [];
    if (data.names && typeof data.names === 'object') {
      for (const [k, v] of Object.entries(data.names)) {
        const name = cleanText(v, 16);
        if (/^\d{1,3}$/.test(k) && Number(k) < born && name) s.names[k] = name;
      }
    }
    s.album = Array.isArray(data.album) ? data.album.slice(-MAX_ALBUM).map(cleanAlbum).filter(Boolean) : [];
    return s;
  }

  function cleanAlbum(a) {
    if (!a || typeof a !== 'object') return null;
    const thumb = typeof a.thumb === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(a.thumb) && a.thumb.length < 80000 ? a.thumb : '';
    return {
      name: cleanText(a.name, 48) || '強壯城堡',
      count: clamp(parseInt(a.count, 10) || 0, 0, MAX_CREATURES),
      power: clamp(parseInt(a.power, 10) || 0, 0, 99999),
      date: cleanText(a.date, 20),
      thumb,
    };
  }

  function archive(s, thumb, now) {
    const d = new Date(now || Date.now());
    const entry = cleanAlbum({
      name: castleName(s),
      count: hatchCount(s),
      power: strength(s),
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      thumb,
    });
    return [...s.album, entry].slice(-MAX_ALBUM);
  }

  // 只讀取舊版存檔內容並換算，不會寫回舊版的儲存位置。
  function fromCourage(old) {
    if (!old || !Array.isArray(old.history) || !Number.isInteger(old.target)) return null;
    const s = fresh({ child: old.name, target: old.target, seed: Number.isInteger(old.seed) ? old.seed : undefined, sound: old.sound });
    const map = new Map();
    let dropped = 0;
    const key = (e) => (old.version === 1 ? `c${e.slot}` : e.id);
    for (const e of old.history) {
      if (!e) continue;
      if (e.type === 'add' || e.type === 'extra') {
        if (map.size >= MAX_CREATURES) { dropped++; continue; }
        map.set(key(e), map.size);
        s.history.push({ k: 'h', l: 0, ts: 0 });
      }
    }
    for (const e of old.history) {
      if (e && e.type === 'shine' && map.has(key(e)) && s.history.length < MAX_CREATURES + MAX_TRAINS) {
        s.history.push({ k: 't', c: map.get(key(e)), ts: 0 });
      }
    }
    s.target = clamp(Math.max(map.size, old.target), 1, MAX_CREATURES);
    return map.size ? { state: s, count: map.size, shine: trainCount(s), dropped } : null;
  }

  const layoutCache = new Map();

  function buildCells(shape, s, k) {
    const X = (x) => 500 + (x - 500) * k;
    const Y = (y) => GROUND - (GROUND - y) * k;
    const rects = shape.rects.map(([a, b, top]) => [X(a), X(b), Y(top)]);
    const top = Math.min(...rects.map((r) => r[2]));
    const [da, db, dt] = shape.door;
    const door = X(db) - X(da) >= s * 0.8 ? [X(da), X(db), Y(dt)] : null;
    const rows = [];
    for (let r = 0; ; r++) {
      const y = GROUND - s * (r + 0.5);
      if (y < top) break;
      let spans = rects.filter((q) => y >= q[2] - s * 0.1).map((q) => [q[0], q[1]]).sort((p, q) => p[0] - q[0]);
      const merged = [];
      for (const sp of spans) {
        const last = merged[merged.length - 1];
        if (last && sp[0] <= last[1]) last[1] = Math.max(last[1], sp[1]);
        else merged.push([...sp]);
      }
      spans = merged;
      if (door && y > door[2]) {
        spans = spans.flatMap(([a, b]) => (door[0] > a && door[1] < b ? [[a, door[0]], [door[1], b]] : [[a, b]]));
      }
      const row = [];
      for (const [a, b] of spans) {
        const count = Math.floor((b - a) / s + 0.15);
        const pad = (b - a - count * s) / 2;
        for (let i = 0; i < count; i++) row.push({ x: a + pad + s * (i + 0.5), y, s, row: r });
      }
      rows.push(row);
    }
    for (let r = 0; r < rows.length; r++) {
      const above = rows[r + 1] || [];
      let run = 0;
      rows[r] = rows[r].filter((c) => {
        const roof = !above.some((u) => Math.abs(u.x - c.x) < s * 0.75);
        if (!roof || r === 0) { run = 0; return true; }
        return run++ % 2 === 0;
      });
    }
    return rows.flat().sort((a, b) => a.row - b.row || Math.abs(a.x - 500) - Math.abs(b.x - 500) || a.x - b.x);
  }

  function layout(n, shapeId) {
    const id = SHAPES[shapeId] ? shapeId : 'twin';
    const key = `${id}:${n}`;
    if (layoutCache.has(key)) return layoutCache.get(key);
    const shape = SHAPES[id];
    const cap = 96;
    let cells = [];
    let k = 1;
    let door = true;
    if (n < 7) {
      door = false;
      k = 0.2;
      const widths = [3, 2, 1];
      let left = n;
      widths.forEach((w, r) => {
        const count = Math.min(w, left);
        left -= count;
        for (let i = 0; i < count; i++) cells.push({ x: 500 + (i - (count - 1) / 2) * cap, y: GROUND - cap * (r + 0.5), s: cap, row: r });
      });
    } else if (buildCells(shape, cap, 1).length >= n) {
      for (let q = 1; q >= 0.2; q -= 0.02) {
        const made = buildCells(shape, cap, q);
        if (made.length < n) break;
        cells = made;
        k = q;
      }
    } else {
      for (let s = cap; s >= 6; s -= 0.25) {
        cells = buildCells(shape, s, 1);
        if (cells.length >= n) break;
      }
    }
    cells = cells.slice(0, n);
    const maxRow = Math.max(1, ...cells.map((c) => c.row));
    cells.forEach((c) => { c.load = 1 - c.row / maxRow; });
    const size = cells.length ? cells[0].s : cap;
    const [da, db, dt] = shape.door;
    const hasDoor = door && (db - da) * k >= size * 0.8;
    const out = {
      cells,
      size,
      k,
      top: cells.length ? Math.min(...cells.map((c) => c.y - c.s / 2)) : GROUND - 40,
      left: cells.length ? Math.min(...cells.map((c) => c.x - c.s / 2)) : 460,
      right: cells.length ? Math.max(...cells.map((c) => c.x + c.s / 2)) : 540,
      door: hasDoor ? { x: 500, w: (db - da) * k, top: GROUND - (GROUND - dt) * k } : null,
    };
    layoutCache.set(key, out);
    return out;
  }

  return {
    SAVE_KEY, OLD_KEYS, MAX_CREATURES, GROUND, LANDS, SPECIES, LIFTS, SHAPES, LEVELS,
    fresh, validate, castleName, hatches, hatchCount, trainCount, strength, isComplete,
    creatures, hatch, train, undo, nextLift, lift, travel, stats, archive, fromCourage, layout, clamp, randomSeed,
  };
});
