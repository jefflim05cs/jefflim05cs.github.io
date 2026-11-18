/* ==========================================================================
   HexSigil — generative "tech sigil" builder
   Same seed  -> same sigil. Different seed -> different tick count, inner
   geometry, spin speeds. Seed it with a name, a project, or a repo hash.
   ========================================================================== */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var XLINK = 'http://www.w3.org/1999/xlink';
  var uid = 0;

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  // FNV-1a string hash
  function hash(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // xorshift32 PRNG -> [0, 1)
  function rng(seed) {
    var s = (seed >>> 0) || 0x9e3779b9;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  // Regular polygon points, first vertex pointing up (+rot degrees)
  function polyPoints(n, r, rot, cx, cy) {
    cx = cx || 0; cy = cy || 0;
    var out = [];
    for (var i = 0; i < n; i++) {
      var a = ((rot || 0) - 90 + (i * 360) / n) * Math.PI / 180;
      out.push((cx + Math.cos(a) * r).toFixed(2) + ',' + (cy + Math.sin(a) * r).toFixed(2));
    }
    return out.join(' ');
  }

  function toHex(str) {
    return str.split('').map(function (c) {
      return '0x' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
    }).join(' ');
  }

  function ringText(o) {
    var base = o.text || (toHex(o.seed) + ' :: ' + o.seed.toUpperCase());
    var out = '';
    while (out.length < 118) out += base + ' // ';
    return out.slice(0, 118);
  }

  /**
   * create({ seed, text, detail: 'full' | 'mini', className })
   * Returns an <svg>. Add class "draw-in" to animate the lines tracing in.
   */
  function create(opts) {
    var o = Object.assign({ seed: 'HEX', text: null, detail: 'full', className: '' }, opts || {});
    var R = rng(hash(o.seed));
    var pick = function (a) { return a[Math.floor(R() * a.length)]; };
    var full = o.detail === 'full';
    var id = 'sigil-' + (++uid);
    var order = 0;

    var svg = el('svg', {
      viewBox: '-100 -100 200 200',
      class: ('sigil ' + o.className).trim(),
      'aria-hidden': 'true',
      focusable: 'false'
    });

    // stagger index for the draw-in animation
    function d(node) {
      node.style.setProperty('--d', (order++ * 0.06).toFixed(2) + 's');
      return node;
    }
    // a rotating layer; the invisible circle keeps its bounding box centred
    function layer(radius, spin, secs) {
      var g = el('g', { class: 'sg-layer' + (spin ? ' spin-' + spin : '') }, svg);
      if (secs) g.style.setProperty('--t', secs + 's');
      el('circle', { r: radius, fill: 'none', stroke: 'none' }, g);
      return g;
    }
    function ring(g, r, cls) {
      return d(el('circle', { r: r, class: 'ln ' + (cls || ''), pathLength: 1 }, g));
    }
    function poly(g, n, r, rot, cls) {
      return d(el('polygon', { points: polyPoints(n, r, rot), class: 'ln ' + (cls || ''), pathLength: 1 }, g));
    }

    /* L0 — outer frame (static) */
    var L0 = layer(98);
    ring(L0, 97, 'thin');
    ring(L0, 93.5);

    /* L1 — tick dial */
    var ticks = pick([60, 72, 90, 120]);
    var L1 = layer(92, 'ccw', Math.round(90 + R() * 60));
    d(el('circle', {
      r: 89.5, class: 'tk fade', pathLength: 360,
      'stroke-dasharray': '0.6 ' + (360 / ticks - 0.6).toFixed(3)
    }, L1));
    d(el('circle', {
      r: 89.5, class: 'tk major fade', pathLength: 360,
      'stroke-dasharray': '1.8 ' + (360 / 6 - 1.8).toFixed(3)
    }, L1));

    /* L2 — hex text band */
    if (full) {
      var L2 = layer(86, 'cw', Math.round(60 + R() * 40));
      ring(L2, 85.5, 'thin');
      ring(L2, 74.5, 'thin');
      var pid = id + '-path';
      el('path', {
        id: pid, fill: 'none', stroke: 'none',
        d: 'M 0,-78 A 78,78 0 1 1 0,78 A 78,78 0 1 1 0,-78'
      }, L2);
      var t = d(el('text', { class: 'txt fade' }, L2));
      var tp = el('textPath', {
        href: '#' + pid,
        textLength: (2 * Math.PI * 78 - 6).toFixed(1),
        lengthAdjust: 'spacing'
      }, t);
      tp.setAttributeNS(XLINK, 'xlink:href', '#' + pid);
      tp.textContent = ringText(o);
    } else {
      var L2m = layer(80);
      ring(L2m, 78, 'thin');
    }

    /* L3 — hexagon + hexagram */
    var L3 = layer(74, 'cw', Math.round(36 + R() * 30));
    poly(L3, 6, 72, 0);
    poly(L3, 3, 72, 0);
    poly(L3, 3, 72, 180);
    for (var i = 0; i < 6; i++) {
      var a = (-90 + i * 60) * Math.PI / 180;
      d(el('circle', { cx: (Math.cos(a) * 72).toFixed(2), cy: (Math.sin(a) * 72).toFixed(2), r: 2.6, class: 'node fade' }, L3));
    }

    /* L3b — seeded extra geometry */
    var extra = pick(['octagram', 'nested', 'square', 'dodeca']);
    var L3b = layer(62, 'ccw', Math.round(44 + R() * 30));
    if (extra === 'octagram') { poly(L3b, 4, 58, 0, 'thin'); poly(L3b, 4, 58, 45, 'thin'); }
    if (extra === 'nested') { poly(L3b, 6, 60, 30, 'thin'); poly(L3b, 6, 52, 0, 'thin'); }
    if (extra === 'square') { poly(L3b, 4, 58, 45, 'thin'); ring(L3b, 58, 'thin'); }
    if (extra === 'dodeca') { poly(L3b, 12, 58, 15, 'thin'); }

    /* L4 — inner dial */
    var L4 = layer(48, 'ccw', Math.round(22 + R() * 20));
    if (full || R() > 0.5) {
      d(el('circle', { r: 47, class: 'tk dash fade', 'stroke-dasharray': '2 3' }, L4));
    }
    ring(L4, 41.6);
    poly(L4, 6, 34, 30, 'thin');
    var spokes = pick([6, 12]);
    for (var s = 0; s < spokes; s++) {
      var b = (s * 360 / spokes) * Math.PI / 180;
      d(el('line', {
        x1: (Math.cos(b) * 14).toFixed(2), y1: (Math.sin(b) * 14).toFixed(2),
        x2: (Math.cos(b) * 34).toFixed(2), y2: (Math.sin(b) * 34).toFixed(2),
        class: 'ln thin', pathLength: 1
      }, L4));
    }

    /* L5 — core */
    var L5 = layer(12);
    L5.classList.add('core');
    ring(L5, 11);
    d(el('polygon', { points: polyPoints(6, 6, 0), class: 'node fade' }, L5));

    return svg;
  }

  global.HexSigil = { create: create, hash: hash, rng: rng, polyPoints: polyPoints, toHex: toHex, el: el };
})(window);
