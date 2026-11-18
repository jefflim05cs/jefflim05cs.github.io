/* ==========================================================================
   main.js (v2): boot, sigils, city, honeycomb, theme, reveals
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var owner = document.body.getAttribute('data-owner') || 'HEX';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  $('#seedLabel').textContent = owner;
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Sigils ---------- */
  var heroSigil = HexSigil.create({ seed: owner, className: reduce ? '' : 'pending' });
  $('#heroSigil').appendChild(heroSigil);

  var lazySigils = [];
  $$('.project').forEach(function (card) {
    var slot = $('.project-sigil', card);
    if (!slot) return; // cards with their own artwork (e.g. icon sets) skip the sigil
    var seed = card.getAttribute('data-seed');
    var s = HexSigil.create({ seed: seed, className: reduce ? '' : 'pending' });
    // Work-in-progress projects get an unfinished sigil: each line stops partway
    // (same seed -> same pattern). A few lines stay complete so the structure still reads.
    if (card.getAttribute('data-status') === 'wip') {
      var R = HexSigil.rng(HexSigil.hash(seed + ' // WIP'));
      s.classList.add('unfinished');
      $$('.ln', s).forEach(function (line) {
        line.style.setProperty('--frac', R() < 0.25 ? '1' : (0.25 + R() * 0.55).toFixed(2));
      });
    }
    slot.appendChild(s);
    lazySigils.push(s);
  });
  var contactSigil = HexSigil.create({ seed: owner + ' // CONTACT', detail: 'mini', className: reduce ? '' : 'pending' });
  $('#contactSigil').appendChild(contactSigil);
  lazySigils.push(contactSigil);

  function ink(svg) {
    if (!svg.classList.contains('pending')) return;
    svg.classList.remove('pending');
    svg.classList.add('draw-in');
  }

  /* ---------- City band ---------- */
  var city = HexSkyline.create({ seed: 'city-' + owner });
  city.svg.setAttribute('viewBox', '0 300 1600 600'); // show the rooftops, crop the empty sky
  $('#city').appendChild(city.svg);

  if (!reduce && window.matchMedia && matchMedia('(pointer: fine)').matches) {
    var tx = 0, cx = 0, raf = null;
    var tick = function () {
      cx += (tx - cx) * 0.07;
      city.layers.forEach(function (g) {
        g.style.transform = 'translateX(' + (-cx * parseFloat(g.getAttribute('data-depth')) * 40).toFixed(2) + 'px)';
      });
      raf = Math.abs(tx - cx) > 0.0005 ? requestAnimationFrame(tick) : null;
    };
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX / window.innerWidth - 0.5;
      if (!raf) raf = requestAnimationFrame(tick);
    });
  }

  /* ---------- Ticker: duplicate for a seamless loop ---------- */
  var track = $('#tickerTrack');
  track.innerHTML += track.innerHTML;

  /* ---------- Honeycomb ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  var skills = $$('#skillList li').map(function (li) {
    return { name: li.textContent.trim(), level: parseInt(li.getAttribute('data-level'), 10) || 2 };
  }).sort(function (a, b) { return a.level - b.level; });
  var comb = $('#honeycomb');
  var lastW = 0;

  function buildComb() {
    var W = Math.round(comb.clientWidth);
    if (!W || Math.abs(W - lastW) < 8) return;
    lastW = W;
    var small = W < 560;
    var r = small ? 42 : 56;
    var hw = Math.sqrt(3) * r;
    var cols = Math.max(3, Math.floor((W - hw / 2) / hw));
    var rows = Math.ceil(skills.length / cols);
    var H = rows * r * 1.5 + r / 2 + 4;
    var ox = (W - (cols * hw + hw / 2)) / 2;

    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H.toFixed(1));
    svg.setAttribute('class', 'hc' + (small ? ' sm' : ''));

    for (var i = 0; i < rows * cols; i++) {
      var row = Math.floor(i / cols), col = i % cols;
      var x = ox + col * hw + (row % 2 ? hw : hw / 2);
      var y = row * r * 1.5 + r + 2;
      var s = skills[i];
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'cell ' + (s ? 'l' + s.level : 'empty'));
      var p = document.createElementNS(NS, 'polygon');
      p.setAttribute('points', HexSigil.polyPoints(6, r - 3, 0, x, y));
      g.appendChild(p);
      if (s) {
        var idx = document.createElementNS(NS, 'text');
        idx.setAttribute('x', x.toFixed(1));
        idx.setAttribute('y', (y - r * 0.38).toFixed(1));
        idx.setAttribute('class', 'glyph');
        idx.textContent = '0x' + (i + 1).toString(16).toUpperCase().padStart(2, '0');
        var t = document.createElementNS(NS, 'text');
        t.setAttribute('x', x.toFixed(1));
        t.setAttribute('y', (y + 4).toFixed(1));
        if (small) t.setAttribute('font-size', '10');
        t.textContent = s.name;
        g.appendChild(idx);
        g.appendChild(t);
      }
      svg.appendChild(g);
    }
    comb.innerHTML = '';
    comb.appendChild(svg);
  }
  buildComb();
  if ('ResizeObserver' in window) new ResizeObserver(buildComb).observe(comb);
  else window.addEventListener('resize', buildComb);

  /* ---------- Scroll reveals ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        var s = en.target.querySelector('.sigil.pending');
        if (s && s !== heroSigil) ink(s);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (n) { io.observe(n); });
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { ink(en.target); io2.unobserve(en.target); } });
    }, { threshold: 0.3 });
    lazySigils.forEach(function (s) { io2.observe(s); });
  } else {
    reveals.forEach(function (n) { n.classList.add('in'); });
    lazySigils.forEach(ink);
  }

  /* ---------- Boot ---------- */
  var boot = $('#boot');
  function enter() { ink(heroSigil); }

  if (root.classList.contains('booting')) {
    $('#bootSigil').appendChild(HexSigil.create({ seed: owner, className: 'draw-in' }));
    var lines = ['OPENING RECORD…', 'VERIFYING SEED…', 'RECORD OPEN'];
    var li = 0;
    var lineTimer = setInterval(function () {
      li = Math.min(li + 1, lines.length - 1);
      $('#bootLine').textContent = lines[li];
    }, 800);
    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      clearInterval(lineTimer);
      boot.classList.add('done');
      root.classList.remove('booting');
      try { sessionStorage.setItem('hexfile-booted', '1'); } catch (e) {}
      setTimeout(enter, 250);
      setTimeout(function () { boot.remove(); }, 800);
    };
    var timer = setTimeout(finish, 2700);
    var skip = function () { clearTimeout(timer); finish(); };
    boot.addEventListener('click', skip);
    window.addEventListener('keydown', function onKey() { window.removeEventListener('keydown', onKey); skip(); });
  } else {
    boot.remove();
    enter();
  }

  /* ---------- Theme toggle ---------- */
  var label = $('#themeLabel');
  var meta = $('meta[name="theme-color"]');
  function syncTheme() {
    var dark = root.getAttribute('data-theme') === 'dark';
    label.textContent = dark ? 'LIGHT' : 'DARK';
    meta.setAttribute('content', dark ? '#2B2118' : '#F7F3E3');
  }
  syncTheme();
  $('#themeToggle').addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('hexfile-theme', next); } catch (e) {}
    syncTheme();
  });

  /* ---------- Placeholder links ---------- */
  var toast = $('#toast'), toastTimer;
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-soon]');
    if (!a) return;
    e.preventDefault();
    toast.textContent = 'Placeholder link: set its href in index.html';
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
  });
})();
