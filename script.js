/* Nested in Color · small, dependency-free.
   Doll, search grid, pyramid replay, compare slider, crop toggle, lightbox.
   No requestAnimationFrame: CSS transitions + setTimeout are enough here. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var NS = 'http://www.w3.org/2000/svg';
  function wait(ms) { return new Promise(function (res) { setTimeout(res, reduce ? 0 : ms); }); }
  function svgText(parent, x, y, str, anchor, cls) {
    var t = document.createElementNS(NS, 'text');
    t.setAttribute('x', x); t.setAttribute('y', y); t.setAttribute('text-anchor', anchor || 'start');
    if (cls) t.setAttribute('class', cls);
    t.textContent = str; parent.appendChild(t); return t;
  }

  /* ------------------------------------------------ the doll */
  (function doll() {
    var btn = $('#dollButton'); if (!btn) return;
    var dolls = $$('.doll', btn), stages = $$('.stage'), hint = $('#dollHint');
    var hints = ['open the reconstruction', 'open it again', 'keep going', 'one more shell', 'the photograph. click to close it back up'];
    var names = ['glass plate', 'single-scale search', 'image pyramid', 'edges', 'restored color'];
    var state = 0, busy = false;
    function paint() {
      dolls.forEach(function (d) { d.classList.toggle('is-shown', +d.dataset.k === state); });
      stages.forEach(function (s) { s.classList.toggle('is-open', +s.dataset.k <= state); });
      hint.textContent = hints[state];
      btn.setAttribute('aria-label', 'Nesting doll, showing stage ' + (state + 1) + ' of 5: ' + names[state] + '. ' + (state < 4 ? 'Activate to open the next shell.' : 'Activate to close it.'));
    }
    function open() {
      if (busy) return; busy = true;
      var cur = dolls[state];
      if (state === 4) { state = 0; paint(); busy = false; return; }
      var p = Promise.resolve();
      if (!reduce) {
        p = p.then(function () { cur.classList.add('is-shaking'); return wait(330); })
             .then(function () { cur.classList.remove('is-shaking'); cur.classList.add('is-opening'); return wait(470); });
      }
      p.then(function () {
        state += 1; paint(); cur.classList.remove('is-opening');
        var nxt = dolls[state];
        if (reduce) return;
        nxt.classList.add('is-entering'); return wait(380).then(function () { nxt.classList.remove('is-entering'); });
      }).then(function () { busy = false; });
    }
    btn.addEventListener('click', open);
    paint();
  })();

  /* ------------------------------------------------ 31 × 31 search grid (section 2) */
  (function searchGrid() {
    var svg = $('#searchGrid'); if (!svg) return;
    var n = 31, cell = 7, x0 = 22, y0 = 6, frag = document.createDocumentFragment();
    for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
      var r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', x0 + i * cell); r.setAttribute('y', y0 + j * cell);
      r.setAttribute('width', cell - 0.7); r.setAttribute('height', cell - 0.7);
      var dx = i - 15, dy = j - 15;
      r.setAttribute('class', 'cell' + ((dx === 0 || dy === 0) ? ' is-axis' : '') + ((dx === 3 && dy === 12) ? ' is-best' : ''));
      frag.appendChild(r);
    }
    svg.appendChild(frag);
    svgText(svg, x0, 244, '−15', 'start'); svgText(svg, x0 + 15 * cell + 3, 244, '0', 'middle'); svgText(svg, x0 + 31 * cell, 244, '+15  dx', 'end');
    svgText(svg, x0 - 4, y0 + 8, '−15', 'end'); svgText(svg, x0 - 4, y0 + 15 * cell + 7, '0', 'end'); svgText(svg, x0 - 4, y0 + 31 * cell - 1, '+15', 'end');
    svgText(svg, x0 - 4, y0 + 20 * cell + 4, 'dy', 'end');
  })();

  /* ------------------------------------------------ pyramid replay (section 3) */
  (function pyramid() {
    var W = $('#pyrWidget'); if (!W) return;
    var L = [
      { scale: '1/16', w: 232,  h: 200,  pred: null,      r: 15, chosen: [2, 7],    ncc: '0.730', img: 4 },
      { scale: '1/8',  w: 463,  h: 401,  pred: [4, 14],   r: 2,  chosen: [5, 13],   ncc: '0.725', img: 3 },
      { scale: '1/4',  w: 926,  h: 802,  pred: [10, 26],  r: 2,  chosen: [10, 27],  ncc: '0.627', img: 2 },
      { scale: '1/2',  w: 1851, h: 1604, pred: [20, 54],  r: 2,  chosen: [20, 53],  ncc: '0.559', img: 1 },
      { scale: '1',    w: 3702, h: 3209, pred: [40, 106], r: 2,  chosen: [40, 107], ncc: '0.513', img: 0 }
    ];
    var say = [
      'Level 1 of 5. No guess yet, so search the whole ±15 window on the tiny image. Best: (2, 7).',
      'Level 2 of 5. Double the last answer, 2 × (2, 7) = (4, 14), and check the 25 shifts within ±2 of it. Best: (5, 13).',
      'Level 3 of 5. 2 × (5, 13) = (10, 26). Refined to (10, 27).',
      'Level 4 of 5. 2 × (10, 27) = (20, 54). Refined to (20, 53).',
      'Level 5 of 5, full resolution. 2 × (20, 53) = (40, 106), refined to (40, 107). That is the red shift on the Emir below.'
    ];
    var el = { img: $('#pyrImg'), frame: $('#pyrFrame'), win: $('#pyrWin'), winLabel: $('#pyrWinLabel'), cap: $('#pyrViewCap'), grid: $('#pyrGrid'),
               say: $('#pyrSay'), step: $('#pyrStep'), back: $('#pyrBack'), next: $('#pyrNext'), replay: $('#pyrReplay'), map: $('#pyrMap'), toggle: $('#pyrToggle') };
    var nums = { scale: $('#nScale'), size: $('#nSize'), pred: $('#nPred'), search: $('#nSearch'), chosen: $('#nChosen'), ncc: $('#nNcc') };
    var step = 0, edges = true, timers = [];
    var fmt = function (p) { return p ? '(' + p[0] + ', ' + p[1] + ')' : '—'; };
    var scaleName = function (lv) { return lv.scale === '1' ? 'full' : lv.scale; };
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    function later(fn, ms) { timers.push(setTimeout(fn, reduce ? 0 : ms)); }

    function buildGrid(lv) {
      var g = el.grid; while (g.firstChild) g.removeChild(g.firstChild);
      var n = 2 * lv.r + 1, size = 264, x0 = 26, y0 = 6;
      var cell = Math.min((size - x0 - 4) / n, (size - y0 - 24) / n);
      var cx = lv.pred ? lv.pred[0] : 0, cy = lv.pred ? lv.pred[1] : 0;
      var cells = [];
      for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
        var r = document.createElementNS(NS, 'rect');
        r.setAttribute('x', x0 + i * cell + 0.5); r.setAttribute('y', y0 + j * cell + 0.5);
        r.setAttribute('width', cell - 1); r.setAttribute('height', cell - 1);
        var dx = cx - lv.r + i, dy = cy - lv.r + j;
        r.setAttribute('class', 'cell' + (lv.pred && dx === cx && dy === cy ? ' is-center' : ''));
        r.setAttribute('data-dx', dx); r.setAttribute('data-dy', dy);
        g.appendChild(r); cells.push(r);
      }
      var gw = n * cell, gh = n * cell;
      svgText(g, x0, y0 + gh + 11, 'dx ' + (cx - lv.r), 'start');
      svgText(g, x0 + gw, y0 + gh + 11, (cx + lv.r), 'end');
      svgText(g, x0 - 4, y0 + 9, (cy - lv.r), 'end');
      svgText(g, x0 - 4, y0 + gh - 1, (cy + lv.r), 'end');
      svgText(g, x0 - 4, y0 + gh / 2 + 3, 'dy', 'end');
      svgText(g, x0 + gw / 2, y0 + gh + 22, lv.pred ? 'guess ' + fmt(lv.pred) + ' in the middle · ±' + lv.r : 'no guess · whole ±15 window', 'middle', 'big');
      return { cells: cells, n: n };
    }
    function markBest(cells, lv) {
      var best = null;
      cells.forEach(function (c) { if (+c.getAttribute('data-dx') === lv.chosen[0] && +c.getAttribute('data-dy') === lv.chosen[1]) best = c; });
      if (best) { best.classList.add('is-best'); best.parentNode.appendChild(best); }
      nums.chosen.textContent = fmt(lv.chosen); nums.chosen.classList.add('is-hot'); nums.ncc.textContent = lv.ncc;
    }
    function sweep(cells, n, lv) {
      var byRow = n > 9, steps = byRow ? n : n * n, dt = byRow ? 34 : 42;
      var tick = function (s) {
        cells.forEach(function (c) { c.classList.remove('is-scan'); });
        if (byRow) { for (var i = 0; i < n; i++) { cells[s * n + i].classList.add('is-scan'); if (s > 0) cells[(s - 1) * n + i].classList.add('is-done'); } }
        else { cells[s].classList.add('is-scan'); if (s > 0) cells[s - 1].classList.add('is-done'); }
      };
      for (var s = 0; s < steps; s++) (function (s) { later(function () { tick(s); }, 120 + s * dt); })(s);
      later(function () { cells.forEach(function (c) { c.classList.remove('is-scan'); c.classList.add('is-done'); }); markBest(cells, lv); }, 120 + steps * dt + 80);
    }
    function paintMap() {
      var m = el.map; while (m.firstChild) m.removeChild(m.firstChild);
      var H = 186, base = 194, x = 8;
      L.forEach(function (lv, i) {
        var h = H / Math.pow(2, 4 - i), w = h * lv.w / lv.h;
        var r = document.createElementNS(NS, 'rect');
        r.setAttribute('x', x); r.setAttribute('y', base - h); r.setAttribute('width', w); r.setAttribute('height', h);
        r.setAttribute('tabindex', '0'); r.setAttribute('role', 'button');
        r.setAttribute('aria-label', 'Jump to level ' + (i + 1) + ', scale ' + scaleName(lv));
        if (i === step) r.setAttribute('class', 'is-current');
        r.addEventListener('click', function () { step = i; render(true); });
        r.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); step = i; render(true); } });
        m.appendChild(r);
        svgText(m, x + w + 6, base - h + 9, scaleName(lv) + ' · ' + lv.w + '×' + lv.h, 'start', i === step ? 'is-current' : '');
      });
      svgText(m, 352, 196, 'the five levels, drawn to scale', 'end');
    }
    function render(animate) {
      clearTimers();
      var lv = L[step];
      el.img.src = 'assets/pyr/emir_r_' + (edges ? 'sobel' : 'raw') + '_L' + lv.img + '.jpg';
      el.img.alt = 'Emir’s red channel' + (edges ? ' as a Sobel edge map' : '') + ' at ' + scaleName(lv) + ' scale';
      el.frame.classList.toggle('is-coarse', step < 2);
      el.win.style.setProperty('--win', ((2 * lv.r + 1) / lv.w * 100) + '%');
      el.winLabel.textContent = '±' + lv.r + ' px';
      el.cap.textContent = 'red channel · ' + (edges ? 'Sobel edges' : 'the photo') + ' · ' + scaleName(lv) + ' · ' + lv.w + ' × ' + lv.h + ' px';
      nums.scale.textContent = lv.scale === '1' ? '1 (full)' : lv.scale;
      nums.size.textContent = lv.w + ' × ' + lv.h;
      nums.pred.textContent = lv.pred ? '2 × ' + fmt(L[step - 1].chosen) + ' = ' + fmt(lv.pred) : '— (no guess yet)';
      nums.search.textContent = lv.r === 15 ? '±15 px · 961 candidates' : '±2 px · 25 candidates';
      nums.chosen.classList.remove('is-hot');
      nums.chosen.textContent = animate && !reduce ? 'searching…' : fmt(lv.chosen);
      nums.ncc.textContent = animate && !reduce ? '…' : lv.ncc;
      el.say.textContent = say[step];
      el.step.textContent = 'level ' + (step + 1) + ' of 5 · scale ' + scaleName(lv);
      el.back.disabled = step === 0; el.next.disabled = step === 4;
      var built = buildGrid(lv);
      if (animate && !reduce) sweep(built.cells, built.n, lv);
      else { built.cells.forEach(function (c) { c.classList.add('is-done'); }); markBest(built.cells, lv); }
      paintMap();
    }
    el.back.addEventListener('click', function () { if (step > 0) { step -= 1; render(true); } });
    el.next.addEventListener('click', function () { if (step < 4) { step += 1; render(true); } });
    el.replay.addEventListener('click', function () { render(true); });
    el.toggle.addEventListener('click', function () {
      edges = !edges;
      el.toggle.setAttribute('aria-pressed', String(edges));
      el.toggle.textContent = edges ? 'showing edges (what the code compares) · switch to the photo' : 'showing the photo · switch to the edges';
      render(false);
    });
    render(true);
  })();

  /* ------------------------------------------------ Emir compare slider */
  (function compare() {
    var c = $('#emirCompare'); if (!c) return;
    var range = $('#compareRange');
    var set = function (v) { c.style.setProperty('--pos', v + '%'); range.value = v; };
    range.addEventListener('input', function () { set(range.value); });
    $$('.compare-buttons [data-pos]').forEach(function (b) { b.addEventListener('click', function () { set(+b.getAttribute('data-pos')); }); });
  })();

  /* ------------------------------------------------ crop boxes toggle */
  (function crop() {
    var b = $('#cropToggle'); if (!b) return;
    b.addEventListener('click', function () {
      var hidden = b.getAttribute('aria-pressed') === 'true';
      $$('.crop-stack').forEach(function (s) { s.classList.toggle('is-hidden', hidden); });
      b.setAttribute('aria-pressed', String(!hidden));
      b.textContent = hidden ? 'show the boxes' : 'hide the boxes';
    });
  })();

  /* ------------------------------------------------ lightbox */
  (function lightbox() {
    var dlg = $('#lightbox'); if (!dlg || typeof dlg.showModal !== 'function') return;
    var tiles = $$('a.tile'), img = $('#lbImg'), title = $('#lbTitle'), meta = $('#lbMeta'), idx = 0;
    function show(i) {
      idx = (i + tiles.length) % tiles.length;
      var t = tiles[idx], inner = t.querySelector('img');
      img.src = t.getAttribute('href');
      img.alt = (inner && inner.alt) || t.getAttribute('data-title') || '';
      title.textContent = t.getAttribute('data-title') || '';
      var bits = [];
      if (t.getAttribute('data-g')) bits.push('G (' + t.getAttribute('data-g') + ')');
      if (t.getAttribute('data-r')) bits.push('R (' + t.getAttribute('data-r') + ')');
      if (t.getAttribute('data-method')) bits.push(t.getAttribute('data-method'));
      if (t.getAttribute('data-loc')) bits.push('LoC ' + t.getAttribute('data-loc'));
      meta.textContent = bits.join('   ·   ');
    }
    tiles.forEach(function (t, i) {
      t.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault(); show(i); dlg.showModal(); $('#lbClose').focus();
      });
    });
    $('#lbClose').addEventListener('click', function () { dlg.close(); });
    $('#lbPrev').addEventListener('click', function () { show(idx - 1); });
    $('#lbNext').addEventListener('click', function () { show(idx + 1); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(idx - 1); else if (e.key === 'ArrowRight') show(idx + 1); });
    dlg.addEventListener('close', function () { img.removeAttribute('src'); });
  })();
})();
