const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');

const day = (y, m, d) => new Date(y, m - 1, d, 10).getTime();

test('每個目標隻數都能排出剛好的位置，互不重疊', () => {
  for (const shape of Object.keys(E.SHAPES)) {
    for (let n = 1; n <= E.MAX_CREATURES; n++) {
      const g = E.layout(n, shape);
      assert.equal(g.cells.length, n, `${shape} ${n}`);
      assert.ok(g.cells.every((c) => Number.isFinite(c.x) && c.y < E.GROUND && c.y > 60), `${shape} ${n} 超出畫面`);
    }
    const g = E.layout(120, shape);
    for (let i = 0; i < g.cells.length; i++) {
      for (let j = i + 1; j < g.cells.length; j++) {
        const d = Math.hypot(g.cells[i].x - g.cells[j].x, g.cells[i].y - g.cells[j].y);
        assert.ok(d > g.size * 0.9);
      }
    }
  }
});

test('同一存檔重算出同一批小力士', () => {
  const s = E.fresh({ seed: 42, target: 20 });
  for (let i = 0; i < 20; i++) E.hatch(s);
  const a = E.creatures(s).map((c) => c.species + c.variant + c.name);
  const b = E.creatures(E.validate(JSON.parse(JSON.stringify(s)))).map((c) => c.species + c.variant + c.name);
  assert.deepEqual(a, b);
});

test('孵化到目標後停止，復原可退回', () => {
  const s = E.fresh({ target: 2 });
  assert.ok(E.hatch(s));
  assert.ok(E.hatch(s));
  assert.equal(E.hatch(s), null);
  assert.ok(E.isComplete(s));
  E.undo(s);
  assert.equal(E.hatchCount(s), 1);
});

test('改正升級封頂第 5 級，力量繼續累積，未選擇時練最弱的一隻', () => {
  const s = E.fresh({ target: 3 });
  E.hatch(s); E.hatch(s); E.hatch(s);
  for (let i = 0; i < 7; i++) E.train(s, 0);
  assert.equal(E.creatures(s)[0].level, 5);
  assert.equal(E.strength(s), 3 + 21);
  assert.equal(E.train(s).index, 1);
});

test('復原孵化會清走該隻的改名', () => {
  const s = E.fresh({ target: 3 });
  E.hatch(s);
  s.names[0] = '阿強';
  E.undo(s);
  assert.deepEqual(s.names, {});
});

test('舉重要按次序，力量不足不能舉', () => {
  const s = E.fresh({ target: 30 });
  assert.equal(E.lift(s, 'bun'), false);
  for (let i = 0; i < 5; i++) E.hatch(s);
  assert.equal(E.lift(s, 'melon'), false);
  assert.equal(E.lift(s, 'bun'), true);
  assert.equal(E.nextLift(s).id, 'melon');
  assert.equal(E.nextLift(s).short, 7);
});

test('出發要先完成目標，不可留在原地，目標封頂', () => {
  const s = E.fresh({ target: 1 });
  assert.equal(E.travel(s, 1, 10), false);
  E.hatch(s);
  assert.equal(E.travel(s, 0, 10), false);
  assert.equal(E.travel(s, 1, 10), true);
  assert.equal(s.target, 11);
  assert.deepEqual(s.visited, [0, 1]);
  const made = E.hatch(s).creature;
  assert.ok(E.SPECIES.find((x) => x.id === made.species).land === 1);
  const full = E.fresh({ target: 600 });
  for (let i = 0; i < 600; i++) E.hatch(full);
  assert.equal(E.travel(full, 1, 10), false);
});

test('連續天數：今天未做仍計到昨天，中斷即停', () => {
  const s = E.fresh({ target: 10 });
  E.hatch(s, day(2026, 11, 3));
  E.hatch(s, day(2026, 11, 5));
  E.hatch(s, day(2026, 11, 6));
  const st = E.stats(s, day(2026, 11, 7));
  assert.equal(st.streak, 2);
  assert.equal(st.today.h, 0);
  assert.equal(st.days.length, 7);
  assert.equal(st.days[6].label, '11/7');
  assert.equal(st.days[5].h, 1);
});

test('損壞或惡意的存檔被拒絕或清理', () => {
  assert.equal(E.validate(null), null);
  assert.equal(E.validate({ version: 2 }), null);
  assert.equal(E.validate({ version: 1, target: 9999, history: [] }), null);
  const s = E.validate({
    version: 1, target: 5, shape: 'x', land: 99, child: '<b>' + 'a'.repeat(50),
    history: [{ k: 't', c: 0 }, { k: 'h', l: 77 }, { k: 't', c: 9 }, null, 'x'],
    lifted: ['moon', 'nope'], names: { 0: 'ok', 500: 'bad', abc: 'bad' },
    album: [{ name: 'a', thumb: 'javascript:alert(1)' }],
  });
  assert.equal(s.history.length, 1);
  assert.equal(s.shape, 'twin');
  assert.equal(s.land, 0);
  assert.equal(s.child.length, 20);
  assert.deepEqual(s.lifted, ['moon']);
  assert.deepEqual(s.names, { 0: 'ok' });
  assert.equal(s.album[0].thumb, '');
});

test('勇氣城堡 V2 及 V1 存檔換算，且不改動來源', () => {
  const v2 = { version: 2, name: '小美', target: 3, seed: 5, history: [{ type: 'add', id: 'c0' }, { type: 'add', id: 'c1' }, { type: 'extra', id: 'e0' }, { type: 'shine', id: 'c1' }, { type: 'shine', id: 'gone' }] };
  const before = JSON.stringify(v2);
  const r = E.fromCourage(v2);
  assert.equal(JSON.stringify(v2), before);
  assert.equal(r.count, 3);
  assert.equal(r.shine, 1);
  assert.equal(E.creatures(r.state)[1].trains, 1);
  assert.equal(r.state.child, '小美');
  const v1 = { version: 1, target: 4, seed: 5, history: [{ type: 'add', slot: 2 }, { type: 'shine', slot: 2 }] };
  const r1 = E.fromCourage(v1);
  assert.equal(r1.count, 1);
  assert.equal(r1.shine, 1);
  assert.equal(E.fromCourage({ version: 2, target: 3, history: [] }), null);
  const big = { version: 2, target: 500, history: Array.from({ length: 700 }, (_, i) => ({ type: 'add', id: `x${i}` })) };
  const rb = E.fromCourage(big);
  assert.equal(rb.count, 600);
  assert.equal(rb.dropped, 100);
  assert.equal(rb.state.target, 600);
});
