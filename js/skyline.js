/* ==========================================================================
   HexSkyline — seeded, flat-vector city built from SVG shapes.
   Every fill is a CSS class (see "Skyline" in style.css), so the palette
   lives in one place. Layers carry data-depth for mouse parallax.
   Swap this for your own exported SVG later — keep the layer groups.
   ========================================================================== */
(function (global) {
  'use strict';

  var S = global.HexSigil;
  var el = S.el;

  function create(opts) {
    var o = Object.assign({ seed: 'city', width: 1600, height: 900 }, opts || {});
    var R = S.rng(S.hash(o.seed));
    var W = o.width, H = o.height;
    var layers = [];

    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      preserveAspectRatio: 'xMidYMax slice',
      class: 'skyline-svg',
      'aria-hidden': 'true',
      focusable: 'false'
    });
    el('rect', { width: W, height: H, class: 'sk-sky' }, svg);

    function L(depth, cls) {
      var g = el('g', { class: 'sk-layer ' + cls }, svg);
      g.setAttribute('data-depth', depth);
      layers.push(g);
      return g;
    }

    function blink(node, min, max) {
      node.classList.add('blink');
      node.style.setProperty('--bt', (min + R() * (max - min)).toFixed(1) + 's');
      node.style.animationDelay = (-R() * 8).toFixed(1) + 's';
    }

    function building(g, x, w, h, p) {
      var top = H - h;
      var c = R() < 0.6 ? Math.round(w * (0.18 + R() * 0.22)) : 0;
      var cy = Math.round(c * 0.58); // ~30 degree cut
      var type = c ? (R() < 0.5 ? 'cutL' : 'cutR') : (R() < 0.3 ? 'step' : 'flat');
      var pts;
      if (type === 'cutR') pts = [[x, top], [x + w - c, top], [x + w, top + cy], [x + w, H], [x, H]];
      else if (type === 'cutL') pts = [[x, top + cy], [x + c, top], [x + w, top], [x + w, H], [x, H]];
      else if (type === 'step') {
        var s = 18 + Math.round(R() * 26), k = Math.round(w * 0.38);
        pts = [[x, top + s], [x + k, top + s], [x + k, top], [x + w, top], [x + w, H], [x, H]];
      } else pts = [[x, top], [x + w, top], [x + w, H], [x, H]];

      el('polygon', { points: pts.map(function (q) { return q.join(','); }).join(' '), class: p.cls }, g);

      // rim light on the right edge
      if (p.rim && R() < p.rim) {
        el('rect', { x: x + w - 3, y: top + cy + 2, width: 3, height: h - cy, class: R() < 0.35 ? 'sk-rim-hot' : 'sk-rim' }, g);
      }

      // windows
      if (p.win) {
        var cols = Math.floor((w - 16) / p.wx);
        var rows = Math.min(Math.floor((h - cy - 40) / p.wy), p.maxRows || 40);
        var x0 = x + (w - (cols - 1) * p.wx - p.ww) / 2;
        var y0 = top + cy + 18 + (type === 'step' ? 30 : 0);
        for (var r = 0; r < rows; r++) {
          for (var col = 0; col < cols; col++) {
            if (R() > p.density) continue;
            var roll = R();
            var cls = roll < p.red ? 'sk-win-red' : roll < p.red + p.gold ? 'sk-win-gold' : p.winCls;
            var win = el('rect', { x: (x0 + col * p.wx).toFixed(1), y: y0 + r * p.wy, width: p.ww, height: p.wh, class: cls }, g);
            if (cls !== p.winCls && R() < 0.18) blink(win, 3, 10);
          }
        }
      }

      // antenna + beacon
      if (p.antenna && R() < p.antenna) {
        var ax = x + Math.round(w * (0.25 + R() * 0.5));
        var ay = (type === 'cutL' && ax < x + c) || (type === 'cutR' && ax > x + w - c) ? top + cy : top;
        var len = 24 + Math.round(R() * 60);
        el('line', { x1: ax, y1: ay, x2: ax, y2: ay - len, class: 'sk-ant' }, g);
        var bcn = el('circle', { cx: ax, cy: ay - len, r: 3, class: 'sk-beacon' }, g);
        blink(bcn, 1.6, 3.2);
      }
      return { x: x, w: w, top: top, cy: cy };
    }

    function billboard(g, b, label) {
      var bw = b.w - 26, bh = Math.min(170, Math.round(bw * 1.25));
      var bx = b.x + 13, by = b.top + b.cy + 30;
      var grp = el('g', { class: 'flicker' }, g);
      grp.style.animationDelay = (R() * 4).toFixed(1) + 's';
      el('rect', { x: bx, y: by, width: bw, height: bh, class: 'sk-bb' }, grp);
      el('polygon', { points: S.polyPoints(6, bw * 0.28, 0, bx + bw / 2, by + bh * 0.4), class: 'sk-bb-line' }, grp);
      el('polygon', { points: S.polyPoints(3, bw * 0.16, 180, bx + bw / 2, by + bh * 0.4), class: 'sk-bb-ink' }, grp);
      var t = el('text', { x: bx + bw / 2, y: by + bh - 14, class: 'sk-bb-txt', 'text-anchor': 'middle' }, grp);
      t.textContent = label;
    }

    /* Sky: big hex "sun" */
    var sky = L(0.12, 'sk-l-sky');
    el('polygon', { points: S.polyPoints(6, 230, 0, 1040, 330), class: 'sk-sun' }, sky);
    el('polygon', { points: S.polyPoints(6, 272, 0, 1040, 330), class: 'sk-sunline' }, sky);
    el('polygon', { points: S.polyPoints(6, 300, 30, 1040, 330), class: 'sk-sunline faint' }, sky);

    /* Far towers */
    var far = L(0.3, 'sk-l-far');
    for (var x = -80; x < W + 80;) {
      var w = 48 + Math.round(R() * 90);
      building(far, x, w, 260 + Math.round(R() * 330), {
        cls: 'sk-far', win: true, winCls: 'sk-win-far', density: 0.32, red: 0.04, gold: 0,
        wx: 12, wy: 16, ww: 4, wh: 6, antenna: 0.25
      });
      x += w + Math.round(R() * 8);
    }

    /* Mid towers + billboards */
    var mid = L(0.55, 'sk-l-mid');
    var mids = [];
    for (x = -80; x < W + 80;) {
      w = 80 + Math.round(R() * 110);
      mids.push(building(mid, x, w, 170 + Math.round(R() * 270), {
        cls: 'sk-mid', win: true, winCls: 'sk-win', density: 0.42, red: 0.07, gold: 0.03,
        wx: 16, wy: 20, ww: 6, wh: 8, rim: 0.45, antenna: 0.2, maxRows: 18
      }));
      x += w + 4 + Math.round(R() * 14);
    }
    var labels = ['0x2A', 'HEX//OS', '0x07'];
    mids.filter(function (b) { return b.w > 120 && H - b.top > 300 && b.x > 250 && b.x < W - 250; })
      .slice(0, 3).forEach(function (b, i) { billboard(mid, b, labels[i]); });

    /* Elevated rail */
    var rail = L(0.72, 'sk-l-rail');
    var ry = H - 230;
    for (x = 40; x < W; x += 260) el('rect', { x: x, y: ry, width: 12, height: 230, class: 'sk-near' }, rail);
    el('rect', { x: -80, y: ry, width: W + 160, height: 14, class: 'sk-near' }, rail);
    el('rect', { x: -80, y: ry + 14, width: W + 160, height: 3, class: 'sk-rim-hot' }, rail);
    el('rect', { x: -80, y: ry - 6, width: W + 160, height: 2, class: 'sk-rim' }, rail);

    /* Near framing towers */
    var near = L(0.95, 'sk-l-near');
    var nearP = { cls: 'sk-near', win: true, winCls: 'sk-win-near', density: 0.12, red: 0.25, gold: 0.05, wx: 18, wy: 24, ww: 6, wh: 10, rim: 0.9, antenna: 0.4 };
    building(near, -90, 190, 720, nearP);
    building(near, 96, 92, 500, nearP);
    building(near, W - 230, 320, 780, nearP);
    building(near, W - 330, 104, 470, nearP);
    el('rect', { x: -80, y: H - 36, width: W + 160, height: 36, class: 'sk-near' }, near);
    for (var i = 0; i < 9; i++) {
      el('rect', {
        x: Math.round(R() * W), y: H - 30 + Math.round(R() * 24),
        width: 30 + Math.round(R() * 120), height: 2, class: 'sk-reflect'
      }, near);
    }

    return { svg: svg, layers: layers };
  }

  /* Small black-on-red city silhouette for tiles */
  function miniCity(seed) {
    var R = S.rng(S.hash(seed));
    var W = 320, H = 140;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'xMaxYMax slice', class: 'mini-city', 'aria-hidden': 'true', focusable: 'false' });
    el('polygon', { points: S.polyPoints(6, 46, 0, 236, 58), class: 'mc-line' }, svg);
    el('polygon', { points: S.polyPoints(6, 60, 30, 236, 58), class: 'mc-line faint' }, svg);
    for (var x = 40; x < W;) {
      var w = 14 + Math.round(R() * 26);
      var h = 24 + Math.round(R() * 70);
      if (x > 216 && x < 250) { w = 22; h = 128; }
      var top = H - h, c = Math.round(w * 0.4);
      var pts = R() < 0.5
        ? [[x, top], [x + w - c, top], [x + w, top + c * 0.6], [x + w, H], [x, H]]
        : [[x, top], [x + w, top], [x + w, H], [x, H]];
      el('polygon', { points: pts.map(function (q) { return q.join(','); }).join(' '), class: 'mc-b' }, svg);
      if (h > 120) el('line', { x1: x + w / 2, y1: top, x2: x + w / 2, y2: top - 14, class: 'mc-ant' }, svg);
      x += w + 2;
    }
    return svg;
  }

  /* Hex tile grid for tile backgrounds */
  function hexGrid(seed, cols, rows) {
    var R = S.rng(S.hash(seed));
    var r = 14, hw = Math.sqrt(3) * r;
    var W = cols * hw + hw / 2, H = rows * r * 1.5 + r / 2;
    var svg = el('svg', { viewBox: '0 0 ' + W.toFixed(1) + ' ' + H.toFixed(1), class: 'hex-grid', 'aria-hidden': 'true', focusable: 'false' });
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var cx = x * hw + (y % 2 ? hw : hw / 2);
        var cy = y * r * 1.5 + r;
        var roll = R();
        el('polygon', {
          points: S.polyPoints(6, r - 2, 0, cx, cy),
          class: roll < 0.12 ? 'hg on' : roll < 0.2 ? 'hg mid' : 'hg'
        }, svg);
      }
    }
    return svg;
  }

  global.HexSkyline = { create: create, miniCity: miniCity, hexGrid: hexGrid };
})(window);
