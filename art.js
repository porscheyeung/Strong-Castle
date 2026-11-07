(function () {
  'use strict';
  const E = window.SCEngine;
  const INK = '#2b2140';
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      const q = Math.min(r, w / 2, h / 2);
      this.moveTo(x + q, y);
      this.arcTo(x + w, y, x + w, y + h, q);
      this.arcTo(x + w, y + h, x, y + h, q);
      this.arcTo(x, y + h, x, y, q);
      this.arcTo(x, y, x + w, y, q);
      this.closePath();
    };
  }
  const speciesById = Object.fromEntries(E.SPECIES.map((s) => [s.id, s]));

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f));
    return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
  }

  function fillStroke(ctx, fill, width) {
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = width || 4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function circle(ctx, x, y, r, fill, width) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (width === 0) { ctx.fillStyle = fill; ctx.fill(); } else fillStroke(ctx, fill, width);
  }

  function poly(ctx, pts, fill, width) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    if (width === 0) { ctx.fillStyle = fill; ctx.fill(); } else fillStroke(ctx, fill, width);
  }

  function box(ctx, x, y, w, h, r, fill, width) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (width === 0) { ctx.fillStyle = fill; ctx.fill(); } else fillStroke(ctx, fill, width);
  }

  function star(ctx, x, y, r, fill, width) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const q = i % 2 ? r * 0.46 : r;
      pts.push([x + Math.cos(a) * q, y + Math.sin(a) * q]);
    }
    poly(ctx, pts, fill, width);
  }

  function bodyPath(ctx, type) {
    ctx.beginPath();
    if (type === 'square') ctx.roundRect(21, 32, 58, 54, 15);
    else if (type === 'tall') ctx.roundRect(25, 26, 50, 60, 24);
    else if (type === 'pear') {
      ctx.moveTo(50, 28);
      ctx.bezierCurveTo(68, 28, 69, 46, 76, 60);
      ctx.bezierCurveTo(85, 80, 68, 87, 50, 87);
      ctx.bezierCurveTo(32, 87, 15, 80, 24, 60);
      ctx.bezierCurveTo(31, 46, 32, 28, 50, 28);
      ctx.closePath();
    } else ctx.ellipse(50, 58, 31, 29, 0, 0, Math.PI * 2);
  }

  function arm(ctx, side, color, level, pose) {
    const w = 7 + level * 1.7;
    const sx = 50 + side * 25;
    const sy = 60;
    const down = pose === 'down';
    const ex = 50 + side * (down ? 33 : 37);
    const ey = down ? 76 : 26;
    const mx = 50 + side * (down ? 34 : 42);
    const my = down ? 66 : 48;
    for (const [c, extra] of [[INK, 6], [color, 0]]) {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.strokeStyle = c;
      ctx.lineWidth = w + extra;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    if (level >= 2 && !down) circle(ctx, 50 + side * 38, 47, 3.5 + level * 1.15, color, 3);
    return [ex, ey, 6.5 + level * 0.9];
  }

  function fist(ctx, spot, color, claw, side) {
    const [x, y, r] = spot;
    if (claw) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(side * 0.25);
      ctx.beginPath();
      ctx.moveTo(0, r);
      ctx.bezierCurveTo(-r * 2, r * 0.3, -r * 1.3, -r * 1.8, -r * 0.2, -r * 1.5);
      ctx.lineTo(0, -r * 0.2);
      ctx.lineTo(r * 0.2, -r * 1.5);
      ctx.bezierCurveTo(r * 1.3, -r * 1.8, r * 2, r * 0.3, 0, r);
      fillStroke(ctx, color, 3.5);
      ctx.restore();
    } else circle(ctx, x, y, r, color, 3.5);
  }

  const toppers = {
    fluff(ctx, c) {
      poly(ctx, [[33, 36], [38, 18], [46, 31], [52, 13], [58, 31], [66, 19], [68, 37]], c, 3.5);
    },
    mushroom(ctx, c, rare) {
      const cap = rare ? '#ffc93c' : '#ef5350';
      ctx.beginPath();
      ctx.moveTo(18, 45);
      ctx.bezierCurveTo(18, 10, 82, 10, 82, 45);
      ctx.quadraticCurveTo(50, 36, 18, 45);
      fillStroke(ctx, cap, 4);
      circle(ctx, 37, 28, 5.5, '#fff7ea', 0);
      circle(ctx, 57, 22, 6.5, '#fff7ea', 0);
      circle(ctx, 69, 34, 3.8, '#fff7ea', 0);
    },
    moss(ctx) {
      ctx.beginPath();
      ctx.moveTo(50, 33);
      ctx.quadraticCurveTo(50, 22, 51, 18);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(51, 21);
      ctx.bezierCurveTo(61, 8, 73, 14, 74, 16);
      ctx.bezierCurveTo(70, 27, 58, 28, 51, 21);
      fillStroke(ctx, '#58b368', 3.5);
      ctx.beginPath();
      ctx.moveTo(50, 25);
      ctx.bezierCurveTo(42, 15, 32, 19, 30, 21);
      ctx.bezierCurveTo(34, 31, 45, 31, 50, 25);
      fillStroke(ctx, '#7fcf6a', 3.5);
    },
    crab(ctx, c) {
      for (const x of [38, 62]) {
        ctx.beginPath();
        ctx.moveTo(x, 36);
        ctx.lineTo(x, 26);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3.5;
        ctx.stroke();
        circle(ctx, x, 24, 4, c, 3);
      }
    },
    star(ctx, c) {
      star(ctx, 50, 26, 15, shade(c, 0.2), 3.5);
    },
    jelly(ctx, c) {
      ctx.beginPath();
      ctx.moveTo(20, 50);
      ctx.bezierCurveTo(20, 8, 80, 8, 80, 50);
      ctx.quadraticCurveTo(70, 43, 60, 50);
      ctx.quadraticCurveTo(50, 43, 40, 50);
      ctx.quadraticCurveTo(30, 43, 20, 50);
      ctx.globalAlpha = 0.86;
      fillStroke(ctx, shade(c, 0.35), 3.5);
      ctx.globalAlpha = 1;
    },
    snowball(ctx) {
      box(ctx, 23, 69, 54, 10, 5, '#ef5350', 3);
      box(ctx, 60, 72, 10, 16, 3, '#ef5350', 3);
      poly(ctx, [[42, 25], [46, 11], [54, 11], [58, 25]], '#5b6ee1', 3.5);
      box(ctx, 37, 24, 26, 7, 3, '#fff7ea', 3);
    },
    icehorn(ctx) {
      poly(ctx, [[42, 34], [50, 7], [59, 34]], '#dff6ff', 3.5);
      poly(ctx, [[50, 12], [53, 33], [59, 34]], '#a6dcf5', 0);
    },
    yeti(ctx, c) {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(50 + s * 30, 37, 10, 15, s * 0.5, 0, Math.PI * 2);
        fillStroke(ctx, c, 3.5);
        ctx.beginPath();
        ctx.ellipse(50 + s * 30, 38, 4.5, 8, s * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffb3c1';
        ctx.fill();
      }
    },
    lava(ctx) {
      ctx.strokeStyle = '#ffb02e';
      ctx.lineWidth = 3.5;
      ctx.lineJoin = 'miter';
      for (const pts of [[[26, 44], [34, 52], [29, 60]], [[74, 70], [66, 62], [72, 54]], [[46, 80], [52, 74], [60, 82]]]) {
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.stroke();
      }
    },
    flame(ctx) {
      ctx.beginPath();
      ctx.moveTo(32, 38);
      ctx.bezierCurveTo(24, 22, 40, 22, 40, 8);
      ctx.bezierCurveTo(50, 16, 50, 22, 54, 24);
      ctx.bezierCurveTo(56, 16, 60, 13, 62, 12);
      ctx.bezierCurveTo(62, 22, 76, 26, 68, 38);
      ctx.closePath();
      fillStroke(ctx, '#ffb02e', 3.5);
      ctx.beginPath();
      ctx.moveTo(42, 36);
      ctx.bezierCurveTo(38, 28, 47, 26, 47, 20);
      ctx.bezierCurveTo(55, 26, 62, 30, 58, 36);
      ctx.closePath();
      ctx.fillStyle = '#ffe66d';
      ctx.fill();
    },
    coal(ctx) {
      circle(ctx, 30, 70, 4, '#ff8a3d', 0);
      circle(ctx, 72, 48, 3.2, '#ffb02e', 0);
      circle(ctx, 64, 77, 3, '#ff8a3d', 0);
      ctx.beginPath();
      ctx.moveTo(50, 28);
      ctx.bezierCurveTo(42, 22, 58, 18, 50, 11);
      ctx.strokeStyle = '#8d88a6';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();
    },
    antenna(ctx) {
      for (const [x, tx] of [[41, 32], [59, 68]]) {
        ctx.beginPath();
        ctx.moveTo(x, 29);
        ctx.quadraticCurveTo(x, 17, tx, 13);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3.5;
        ctx.stroke();
        circle(ctx, tx, 12, 5, '#ffe66d', 3);
      }
    },
    cyclops(ctx) {
      poly(ctx, [[40, 32], [44, 17], [51, 30]], '#ffe66d', 3.5);
      poly(ctx, [[52, 30], [58, 17], [62, 33]], '#ffe66d', 3.5);
    },
    ring(ctx) {
      ctx.beginPath();
      ctx.ellipse(50, 64, 41, 10, -0.12, 0, Math.PI);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 8.5;
      ctx.stroke();
      ctx.strokeStyle = '#fff1a8';
      ctx.lineWidth = 4;
      ctx.stroke();
    },
  };

  function eye(ctx, x, y, r, expr, pupil) {
    if (expr === 'blink' || expr === 'sleep') {
      ctx.beginPath();
      ctx.arc(x, y + (expr === 'sleep' ? 1 : 0), r * 0.8, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      ctx.stroke();
      return;
    }
    if (expr === 'happy') {
      ctx.beginPath();
      ctx.arc(x, y + 2, r * 0.82, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.6;
      ctx.lineCap = 'round';
      ctx.stroke();
      return;
    }
    circle(ctx, x, y, r, '#fff', 3);
    circle(ctx, x + (pupil || 0), y + 0.8, r * 0.56, INK, 0);
    circle(ctx, x + (pupil || 0) + r * 0.2, y - r * 0.2, r * 0.18, '#fff', 0);
    if (expr === 'strain') {
      ctx.beginPath();
      ctx.moveTo(x - r * 1.05, y - r * 1.15);
      ctx.lineTo(x + r * 1.05, y - r * 0.75);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  function mouth(ctx, expr, y) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    if (expr === 'strain') {
      box(ctx, 41, y - 3, 18, 8, 3, '#fff', 2.8);
      ctx.beginPath();
      for (const x of [47, 53]) { ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 5); }
      ctx.lineWidth = 1.8;
      ctx.stroke();
    } else if (expr === 'happy') {
      ctx.beginPath();
      ctx.moveTo(40, y - 3);
      ctx.quadraticCurveTo(50, y + 16, 60, y - 3);
      ctx.closePath();
      fillStroke(ctx, '#d6336c', 3);
    } else if (expr === 'sleep') {
      circle(ctx, 50, y + 1, 2.8, INK, 0);
    } else {
      ctx.beginPath();
      ctx.moveTo(43, y);
      ctx.quadraticCurveTo(50, y + 7, 57, y);
      ctx.stroke();
    }
  }

  /* Draws one creature inside a 100 x 100 box; body centre is about (50, 58). */
  function drawCreature(ctx, c, expr) {
    const sp = speciesById[c.species];
    const color = c.rare ? '#ffd24a' : sp.colors[c.variant % 3];
    const dark = shade(color, -0.12);
    const level = c.level || 0;
    const pose = expr === 'sleep' ? 'down' : 'up';

    if (level >= 3) {
      ctx.beginPath();
      ctx.moveTo(30, 44);
      ctx.lineTo(16, 90);
      ctx.quadraticCurveTo(50, 98, 84, 90);
      ctx.lineTo(70, 44);
      ctx.closePath();
      fillStroke(ctx, '#d6336c', 3.5);
    }
    for (const x of [37, 63]) {
      ctx.beginPath();
      ctx.ellipse(x, 88, 10, 6, 0, 0, Math.PI * 2);
      fillStroke(ctx, dark, 3.5);
    }
    const left = arm(ctx, -1, dark, level, pose);
    const right = arm(ctx, 1, dark, level, pose);
    const claw = c.species === 'crab';
    bodyPath(ctx, sp.body);
    fillStroke(ctx, color, 4);
    ctx.save();
    bodyPath(ctx, sp.body);
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(50, 80, 21, 15, 0, 0, Math.PI * 2);
    ctx.fillStyle = shade(color, 0.42);
    ctx.fill();
    ctx.restore();
    fist(ctx, left, color, claw, -1);
    fist(ctx, right, color, claw, 1);

    const topper = toppers[c.species];
    if (c.species !== 'snowball' && c.species !== 'ring') topper(ctx, color, c.rare);

    const face = sp.body === 'tall' ? 49 : 54;
    if (c.species === 'cyclops') eye(ctx, 50, face, 11, expr, 0);
    else {
      eye(ctx, 39, face, 7.4, expr, 0.8);
      eye(ctx, 61, face, 7.4, expr, -0.8);
    }
    mouth(ctx, expr, face + 13);
    ctx.globalAlpha = 0.45;
    circle(ctx, 30, face + 10, 4.2, '#ff7a8a', 0);
    circle(ctx, 70, face + 10, 4.2, '#ff7a8a', 0);
    ctx.globalAlpha = 1;
    if (c.species === 'snowball' || c.species === 'ring') topper(ctx, color, c.rare);

    if (level >= 1) {
      const y = face - 15;
      box(ctx, 26, y - 4, 48, 8, 3.5, level >= 4 ? '#ffd24a' : '#ef5350', 3);
      poly(ctx, [[73, y], [85, y - 5], [84, y + 6]], level >= 4 ? '#ffd24a' : '#ef5350', 3);
    }
    if (level >= 2) star(ctx, 50, 79, 7.5, '#ffd24a', 2.6);
    if (level >= 5) {
      poly(ctx, [[33, 26], [32, 8], [42, 17], [50, 3], [58, 17], [68, 8], [67, 26]], '#ffd24a', 3.5);
      circle(ctx, 50, 18, 3, '#ef5350', 0);
    }
    if (c.rare) {
      star(ctx, 12, 18, 7, '#fff3a6', 2);
      star(ctx, 89, 26, 5.5, '#fff3a6', 2);
      star(ctx, 92, 74, 4.5, '#fff3a6', 2);
    }
  }

  function drawEgg(ctx, cracked) {
    ctx.beginPath();
    ctx.moveTo(50, 12);
    ctx.bezierCurveTo(74, 12, 84, 50, 82, 62);
    ctx.bezierCurveTo(80, 82, 64, 90, 50, 90);
    ctx.bezierCurveTo(36, 90, 20, 82, 18, 62);
    ctx.bezierCurveTo(16, 50, 26, 12, 50, 12);
    ctx.closePath();
    fillStroke(ctx, '#fff4d6', 4.5);
    circle(ctx, 36, 58, 7, '#ffb3c1', 0);
    circle(ctx, 62, 42, 9, '#9fe0d4', 0);
    circle(ctx, 60, 72, 6, '#ffd24a', 0);
    if (cracked) {
      ctx.beginPath();
      ctx.moveTo(26, 40);
      ctx.lineTo(38, 50);
      ctx.lineTo(46, 38);
      ctx.lineTo(56, 50);
      ctx.lineTo(64, 38);
      ctx.lineTo(76, 46);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
  }

  const skies = {
    meadow: ['#8fd8ff', '#ffeeb8'],
    beach: ['#6fcff0', '#ffe2c0'],
    snow: ['#a9c8f5', '#f2e9ff'],
    volcano: ['#ff9e7a', '#ffd9a0'],
    moon: ['#120f30', '#3b2a78'],
  };

  function wave(ctx, x0, x1, base, amp, len, phase, fill) {
    ctx.beginPath();
    ctx.moveTo(x0, 900);
    for (let x = x0; x <= x1 + 24; x += 24) {
      ctx.lineTo(x, base + Math.sin((x + phase) / len) * amp + Math.sin((x + phase) / (len * 0.43)) * amp * 0.3);
    }
    ctx.lineTo(x1 + 24, 900);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function repeatX(x0, x1, gap, scroll, fn) {
    const start = Math.floor((x0 + scroll) / gap) - 1;
    const end = Math.ceil((x1 + scroll) / gap) + 1;
    for (let i = start; i <= end; i++) fn(i * gap - scroll, Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1, i);
  }

  function cloud(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 2, r * 0.62, 0, 0, Math.PI * 2);
    ctx.arc(x - r * 0.7, y - r * 0.35, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x + r * 0.45, y - r * 0.45, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
  }

  /* World units: ground line is near y = 566. view = {x0, x1, y0, y1}. */
  function drawLand(ctx, landId, view, t, night, scroll) {
    const { x0, x1, y0, y1 } = view;
    const sky = ctx.createLinearGradient(0, y0, 0, 566);
    const base = skies[landId];
    const isSpace = landId === 'moon';
    if (night && !isSpace) {
      sky.addColorStop(0, '#16163f');
      sky.addColorStop(1, '#4a3f85');
    } else {
      sky.addColorStop(0, base[0]);
      sky.addColorStop(1, base[1]);
    }
    ctx.fillStyle = sky;
    ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);

    const dim = night && !isSpace;
    if (dim || isSpace) {
      repeatX(x0, x1, 46, scroll * 0.05, (x, r, i) => {
        const y = y0 + ((r * 977 + i * 31) % Math.max(60, 470 - y0));
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t / 900 + i));
        ctx.globalAlpha = tw;
        circle(ctx, x + r * 30, y, 1 + r * 1.8, '#fff8d8', 0);
      });
      ctx.globalAlpha = 1;
    }
    if (isSpace) {
      circle(ctx, x1 - 150, Math.max(y0 + 90, 90), 46, '#5ec2ff', 0);
      ctx.fillStyle = '#6fd67c';
      ctx.beginPath();
      ctx.ellipse(x1 - 165, Math.max(y0 + 90, 90) - 8, 21, 14, 0.5, 0, Math.PI * 2);
      ctx.ellipse(x1 - 128, Math.max(y0 + 90, 90) + 16, 13, 18, 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (dim) {
      circle(ctx, x1 - 130, Math.max(y0 + 86, 84), 38, '#fff3c4', 0);
      circle(ctx, x1 - 116, Math.max(y0 + 78, 76), 32, '#2a2660', 0);
    } else {
      const sx = x1 - 130;
      const sy = Math.max(y0 + 86, 84);
      ctx.strokeStyle = '#ffe58a';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      for (let i = 0; i < 10; i++) {
        const a = i * 0.628 + t / 9000;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a) * 54, sy + Math.sin(a) * 54);
        ctx.lineTo(sx + Math.cos(a) * 70, sy + Math.sin(a) * 70);
        ctx.stroke();
      }
      circle(ctx, sx, sy, 42, '#ffe066', 0);
      const c = landId === 'volcano' ? 'rgba(255,240,225,.7)' : 'rgba(255,255,255,.85)';
      repeatX(x0, x1, 340, scroll * 0.2 + t / 90, (x, r) => cloud(ctx, x, 70 + r * 170, 26 + r * 22, c));
    }

    const far = dim ? 0.55 : 1;
    ctx.save();
    if (landId === 'meadow') {
      wave(ctx, x0, x1, 440, 34, 170, scroll * 0.3, dim ? '#35527a' : '#b6e39a');
      wave(ctx, x0, x1, 496, 22, 120, scroll * 0.55 + 300, dim ? '#2c4a6b' : '#8fd178');
      wave(ctx, x0, x1, 556, 5, 90, scroll, dim ? '#27486a' : '#6cbf63');
      repeatX(x0, x1, 86, scroll, (x, r) => {
        const y = 590 + r * 26;
        const col = ['#ff8fab', '#ffd24a', '#fff'][Math.floor(r * 3)];
        for (let i = 0; i < 5; i++) circle(ctx, x + Math.cos(i * 1.256) * 5, y + Math.sin(i * 1.256) * 5, 3.6, col, 0);
        circle(ctx, x, y, 2.6, '#f28f3b', 0);
      });
    } else if (landId === 'beach') {
      ctx.fillStyle = dim ? '#2b4b86' : '#39b9de';
      ctx.fillRect(x0 - 2, 400, x1 - x0 + 4, 180);
      for (let i = 0; i < 3; i++) wave(ctx, x0, x1, 420 + i * 40, 4, 40 + i * 12, t / (26 + i * 8) + i * 80, dim ? `rgba(120,170,230,${0.12 + i * 0.06})` : `rgba(255,255,255,${0.16 + i * 0.1})`);
      wave(ctx, x0, x1, 530, 12, 210, scroll, dim ? '#7a6f93' : '#ffe0a3');
      repeatX(x0, x1, 300, scroll, (x, r) => {
        ctx.strokeStyle = '#8b5a3c';
        ctx.lineWidth = 11;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, 545);
        ctx.quadraticCurveTo(x + 18, 480, x + 8, 420);
        ctx.stroke();
        ctx.fillStyle = dim ? '#2b6b64' : '#39b36b';
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.ellipse(x + 8 + Math.cos(i * 0.78 - 2.7) * 34, 416 + Math.sin(i * 0.78 - 2.7) * 18 + 10, 40, 10, i * 0.78 - 2.7, 0, Math.PI * 2);
          ctx.fill();
        }
        star(ctx, x + 120, 596 + r * 14, 10, '#ff8f6b', 0);
      });
    } else if (landId === 'snow') {
      repeatX(x0, x1, 300, scroll * 0.3, (x, r) => {
        const h = 170 + r * 100;
        poly(ctx, [[x - 190, 540], [x, 540 - h], [x + 190, 540]], dim ? '#3b4a86' : '#b9cff2', 0);
        poly(ctx, [[x - 60, 540 - h + 58], [x, 540 - h], [x + 60, 540 - h + 58], [x + 26, 540 - h + 44], [x, 540 - h + 68], [x - 26, 540 - h + 44]], '#fff', 0);
      });
      wave(ctx, x0, x1, 544, 12, 180, scroll, dim ? '#7f8ec4' : '#f6fbff');
      if (window.__scReduced !== true) {
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        repeatX(x0, x1, 62, 0, (x, r, i) => {
          const y = y0 + (((t / (14 + r * 10)) + r * 700 + i * 37) % (640 - y0));
          ctx.beginPath();
          ctx.arc(x + Math.sin(t / 700 + i) * 14, y, 1.8 + r * 2.4, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    } else if (landId === 'volcano') {
      repeatX(x0, x1, 620, scroll * 0.3, (x) => {
        poly(ctx, [[x - 280, 545], [x - 74, 280], [x + 74, 280], [x + 280, 545]], dim ? '#3b2d55' : '#8a5a64', 0);
        poly(ctx, [[x - 74, 280], [x + 74, 280], [x + 42, 340], [x + 16, 318], [x - 12, 372], [x - 38, 322]], '#ff7a2e', 0);
        for (let i = 0; i < 3; i++) {
          const q = ((t / 40 + i * 44) % 130);
          ctx.globalAlpha = 1 - q / 130;
          circle(ctx, x + Math.sin(q / 14 + i) * 18, 270 - q, 15 + q / 7, '#b9a3aa', 0);
        }
        ctx.globalAlpha = 1;
      });
      wave(ctx, x0, x1, 546, 10, 150, scroll, dim ? '#4d3a5e' : '#b4705a');
      repeatX(x0, x1, 180, scroll, (x, r) => {
        ctx.fillStyle = '#ff8a3d';
        ctx.beginPath();
        ctx.ellipse(x, 590 + r * 28, 42 + r * 28, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      wave(ctx, x0, x1, 490, 26, 240, scroll * 0.4, '#4b4380');
      wave(ctx, x0, x1, 548, 8, 170, scroll, '#a7a2c8');
      repeatX(x0, x1, 170, scroll, (x, r) => {
        ctx.fillStyle = '#8680ae';
        ctx.beginPath();
        ctx.ellipse(x, 592 + r * 26, 30 + r * 26, 8 + r * 4, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore();
    if (far < 1 && landId !== 'moon') {
      ctx.fillStyle = 'rgba(20,16,60,.12)';
      ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
    }
  }

  /* All objects are drawn around (0,0), bottom near y = 60, width about 220. */
  const objects = {
    bun(ctx) {
      ctx.beginPath();
      ctx.moveTo(-100, 54);
      ctx.bezierCurveTo(-118, -56, 118, -56, 100, 54);
      ctx.closePath();
      fillStroke(ctx, '#e9a23b', 5);
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = '#b86f1d';
      ctx.lineWidth = 5;
      for (let i = -5; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 44 - 90, 60);
        ctx.lineTo(i * 44 + 90, -60);
        ctx.moveTo(i * 44 + 90, 60);
        ctx.lineTo(i * 44 - 90, -60);
        ctx.stroke();
      }
      ctx.restore();
      box(ctx, -102, 40, 204, 18, 9, '#ffe2a8', 5);
    },
    melon(ctx) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 112, 60, 0, 0, Math.PI * 2);
      fillStroke(ctx, '#3fa34d', 5);
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = '#1f6f3a';
      ctx.lineWidth = 11;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 34, -64);
        ctx.quadraticCurveTo(i * 44, 0, i * 34, 64);
        ctx.stroke();
      }
      ctx.restore();
    },
    piano(ctx) {
      ctx.beginPath();
      ctx.moveTo(-110, -16);
      ctx.bezierCurveTo(-110, -62, -30, -66, -10, -44);
      ctx.bezierCurveTo(16, -18, 94, -36, 104, -16);
      ctx.lineTo(104, 12);
      ctx.lineTo(-110, 12);
      ctx.closePath();
      fillStroke(ctx, '#2f2a44', 5);
      box(ctx, -110, 12, 214, 18, 3, '#fff', 4);
      ctx.fillStyle = INK;
      for (let x = -100; x < 96; x += 22) ctx.fillRect(x, 12, 10, 10);
      for (const x of [-88, 84]) box(ctx, x, 30, 12, 30, 3, '#2f2a44', 4);
    },
    minibus(ctx) {
      box(ctx, -112, -46, 224, 88, 18, '#fff5e4', 5);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-112, -46, 224, 88, 18);
      ctx.clip();
      ctx.fillStyle = '#e03131';
      ctx.fillRect(-114, 2, 228, 42);
      ctx.fillStyle = '#e03131';
      ctx.fillRect(-114, -48, 228, 10);
      ctx.restore();
      for (let i = 0; i < 4; i++) box(ctx, -98 + i * 50, -32, 42, 30, 6, '#a8e4ff', 3.5);
      box(ctx, -112, -46, 224, 88, 18, 'rgba(0,0,0,0)', 5);
      for (const x of [-64, 66]) {
        circle(ctx, x, 44, 19, '#2f2a44', 4.5);
        circle(ctx, x, 44, 8, '#d7d3e8', 0);
      }
    },
    tram(ctx) {
      box(ctx, -104, -66, 208, 64, 12, '#2f9e6e', 5);
      box(ctx, -104, -4, 208, 54, 8, '#37b27d', 5);
      for (let i = 0; i < 5; i++) {
        box(ctx, -94 + i * 38, -54, 30, 26, 4, '#fff3b0', 3);
        box(ctx, -94 + i * 38, 6, 30, 24, 4, '#fff3b0', 3);
      }
      box(ctx, -96, -18, 192, 10, 3, '#fff', 0);
      for (const x of [-62, 62]) circle(ctx, x, 54, 10, '#2f2a44', 4);
      ctx.beginPath();
      ctx.moveTo(0, -66);
      ctx.lineTo(24, -96);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      ctx.stroke();
    },
    elephant(ctx) {
      ctx.beginPath();
      ctx.ellipse(-16, -2, 88, 56, 0, 0, Math.PI * 2);
      fillStroke(ctx, '#a8b0cc', 5);
      for (const x of [-72, -34, 14, 46]) box(ctx, x, 28, 26, 34, 8, '#a8b0cc', 4.5);
      circle(ctx, 70, -18, 38, '#a8b0cc', 5);
      ctx.beginPath();
      ctx.ellipse(44, -22, 24, 32, 0.2, 0, Math.PI * 2);
      fillStroke(ctx, '#ffc1cf', 5);
      ctx.beginPath();
      ctx.moveTo(98, -10);
      ctx.bezierCurveTo(128, 8, 118, 40, 102, 44);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 21;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.strokeStyle = '#a8b0cc';
      ctx.lineWidth = 12;
      ctx.stroke();
      circle(ctx, 82, -28, 5.5, INK, 0);
    },
    ferry(ctx) {
      ctx.beginPath();
      ctx.moveTo(-118, 8);
      ctx.lineTo(118, 8);
      ctx.lineTo(98, 54);
      ctx.lineTo(-98, 54);
      ctx.closePath();
      fillStroke(ctx, '#2f7d5b', 5);
      box(ctx, -96, -28, 192, 36, 5, '#fff5e4', 5);
      box(ctx, -64, -58, 128, 30, 5, '#fff5e4', 5);
      for (let i = 0; i < 7; i++) box(ctx, -88 + i * 26, -20, 18, 18, 3, '#a8e4ff', 3);
      box(ctx, -12, -84, 24, 26, 3, '#2f2a44', 4.5);
      wave(ctx, -130, 130, 56, 4, 14, 0, 'rgba(90,190,235,.9)');
    },
    whale(ctx) {
      ctx.beginPath();
      ctx.moveTo(-116, -8);
      ctx.bezierCurveTo(-110, -62, 40, -66, 86, -10);
      ctx.lineTo(120, -40);
      ctx.bezierCurveTo(128, -18, 118, 4, 104, 12);
      ctx.bezierCurveTo(60, 64, -100, 66, -116, -8);
      ctx.closePath();
      fillStroke(ctx, '#3f7fd0', 5);
      ctx.beginPath();
      ctx.moveTo(-112, 12);
      ctx.bezierCurveTo(-60, 22, 10, 26, 62, 26);
      ctx.bezierCurveTo(20, 60, -90, 56, -112, 12);
      ctx.fillStyle = '#d7ecff';
      ctx.fill();
      circle(ctx, -76, -14, 6.5, INK, 0);
      for (const a of [-1, 0, 1]) {
        ctx.beginPath();
        ctx.moveTo(-40, -50);
        ctx.quadraticCurveTo(-40 + a * 8, -74, -40 + a * 28, -84);
        ctx.strokeStyle = '#7ad3ff';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    },
    moon(ctx) {
      circle(ctx, 0, 0, 62, '#ffe9a8', 5);
      circle(ctx, -22, -18, 13, '#f1cd7b', 0);
      circle(ctx, 22, 22, 17, '#f1cd7b', 0);
      circle(ctx, 28, -28, 7, '#f1cd7b', 0);
      circle(ctx, -24, 28, 7, '#f1cd7b', 0);
    },
  };

  function drawObject(ctx, id) { (objects[id] || objects.bun)(ctx); }

  function drawFlag(ctx, x, y, t, label) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 74);
    ctx.stroke();
    const f = Math.sin(t / 240) * 6;
    ctx.beginPath();
    ctx.moveTo(x, y - 72);
    ctx.quadraticCurveTo(x + 34, y - 72 + f, x + 66, y - 58);
    ctx.quadraticCurveTo(x + 34, y - 48 - f, x, y - 38);
    ctx.closePath();
    fillStroke(ctx, '#ef5350', 4);
    if (label) {
      ctx.fillStyle = '#fff';
      ctx.font = '900 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + 25, y - 56);
    }
  }

  function drawLegs(ctx, geo, step, height) {
    const y = 566;
    const offset = (geo.right - geo.left) * 0.2;
    [[-1, step], [1, -step]].forEach(([side, phase]) => {
      const x = 500 + side * offset;
      const lift = Math.max(0, phase) * 34;
      const foot = x + phase * 54;
      ctx.lineCap = 'round';
      for (const [c, w] of [[INK, 54], ['#ffb37a', 42]]) {
        ctx.beginPath();
        ctx.moveTo(x, y - height);
        ctx.quadraticCurveTo(x + side * 12, y - height / 2, foot, y - 16 - lift);
        ctx.strokeStyle = c;
        ctx.lineWidth = w;
        ctx.stroke();
      }
      box(ctx, foot - 42, y - 34 - lift, 92, 36, 18, '#ef5350', 5);
      circle(ctx, foot + 44, y - 18 - lift, 9, '#fff', 3.5);
    });
  }

  function drawFace(ctx, geo, look, blink, open, night) {
    const door = geo.door;
    if (!door) return;
    const ground = 566;
    const h = ground - door.top;
    const w = door.w * (0.9 + open * 0.14);
    ctx.beginPath();
    ctx.moveTo(door.x - w / 2, ground);
    ctx.lineTo(door.x - w / 2, door.top + w * 0.5 - open * 8);
    ctx.arc(door.x, door.top + w * 0.5 - open * 8, w / 2, Math.PI, 0);
    ctx.lineTo(door.x + w / 2, ground);
    ctx.closePath();
    fillStroke(ctx, night ? '#ffcf70' : '#51224f', 6);
    if (!night) {
      ctx.save();
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(door.x, ground + 4, w * 0.44, h * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ff7f9e';
      ctx.fill();
      ctx.restore();
      for (const s of [-1, 1]) {
        poly(ctx, [[door.x + s * w * 0.32 - 7, door.top + w * 0.2], [door.x + s * w * 0.32 + 7, door.top + w * 0.2], [door.x + s * w * 0.32, door.top + w * 0.2 + 15]], '#fff', 0);
      }
    }
    if (!geo.showEyes) return;
    const r = Math.max(13, door.w * 0.34);
    const y = door.top - r * 1.15;
    for (const s of [-1, 1]) {
      const x = door.x + s * r * 1.32;
      if (blink) {
        ctx.beginPath();
        ctx.arc(x, y, r * 0.9, 0.12 * Math.PI, 0.88 * Math.PI);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.stroke();
      } else {
        circle(ctx, x, y, r, '#fff', 6);
        circle(ctx, x + look.x * r * 0.42, y + look.y * r * 0.42, r * 0.52, INK, 0);
        circle(ctx, x + look.x * r * 0.42 + r * 0.16, y + look.y * r * 0.42 - r * 0.18, r * 0.15, '#fff', 0);
      }
    }
  }

  window.SCArt = { INK, drawCreature, drawEgg, drawLand, drawObject, drawFlag, drawLegs, drawFace, star };
})();
