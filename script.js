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

  /* ------------------------------------------------ the doll: one shell at a time, each one gives you a section */
  (function doll() {
    var stage = $('#dollStage'); if (!stage) return;
    var ds = $$('.dolly', stage), items = $$('.stage'), hint = $('#dollHint'), n = ds.length;
    var card = $('#dollCard'), cardImg = $('#cardImg'), cardTitle = $('#cardTitle'), cardBody = $('#cardBody');
    var info = [
      { href: '#plate',   img: 'assets/plate/cathedral_plate.jpg',      body: 'One scan, three grey exposures stacked: blue, green, red.' },
      { href: '#single',  img: 'assets/img/cathedral_single_scale.jpg', body: 'Try every shift within ±15 px, keep the best NCC. Cathedral: G (2, 5), R (3, 12).' },
      { href: '#pyramid', img: 'assets/pyr/emir_r_sobel_L4.jpg',       body: 'Solve it at 1/16 size, then double the answer and refine ±2 px, level by level.' },
      { href: '#emir',    img: 'assets/edges/emir_color_crop.jpg',      body: 'Raw pixels put Emir’s red at (−205, 141). Sobel edges put it at (40, 107).' },
      { href: '#crop',    img: 'assets/thumb/harvesters_cropped.jpg',   body: 'Keep what all three channels cover, then cut just inside the strongest border line.' },
      { href: '#results', img: 'assets/thumb/icon_cropped.jpg',         body: 'All 14 plates plus three I picked, with every offset listed.' }
    ];
    var names = items.map(function (li) { return li.textContent.replace(/^\s*\d+\s*/, '').trim(); });
    var cur = 0, opened = 0, busy = false, touched = false, timers = [];
    function later(fn, ms) { timers.push(setTimeout(fn, reduce ? 0 : ms)); }
    function paintList() {
      items.forEach(function (li, i) { li.classList.toggle('is-open', i <= opened); li.classList.toggle('is-current', i === cur); });
    }
    function showCard(k) {
      card.classList.add('is-swapping');
      later(function () {
        cardImg.src = info[k].img; cardTitle.textContent = (k + 1) + ' · ' + names[k]; cardBody.textContent = info[k].body; card.setAttribute('href', info[k].href);
        card.classList.remove('is-swapping');
      }, 180);
    }
    function setHint() {
      if (cur < n - 1) hint.textContent = cur === 0 ? 'click to open' : 'click to open the next one';
      else hint.innerHTML = 'the smallest one. <button type="button" id="dollAgain">close them all up</button>';
      var b = $('#dollAgain'); if (b) b.addEventListener('click', function () { jump(0); });
    }
    function jump(k) {                       /* switch without the opening animation (list hover, reset) */
      if (busy) return;
      ds.forEach(function (d, i) { d.classList.toggle('is-current', i === k); d.classList.remove('is-opening', 'is-entering', 'is-shaking'); d.tabIndex = i === k ? 0 : -1; });
      if (k !== cur) { ds[k].classList.add('is-entering'); later(function () { ds[k].classList.remove('is-entering'); }, 480); }
      cur = k; opened = Math.max(opened, k); paintList(); showCard(k); setHint();
    }
    function open() {                        /* shake, split the shell, reveal the next doll */
      if (busy) return;
      if (cur >= n - 1) { jump(0); return; }
      busy = true;
      var d = ds[cur], next = ds[cur + 1];
      hint.textContent = 'opening \u2192 ' + (cur + 2) + ' \u00b7 ' + names[cur + 1];
      d.classList.add('is-shaking');
      later(function () { d.classList.remove('is-shaking'); d.classList.remove('is-current'); d.classList.add('is-opening'); }, 430);
      later(function () {
        next.classList.add('is-current', 'is-entering'); next.tabIndex = 0; d.tabIndex = -1;
        cur += 1; opened = Math.max(opened, cur); paintList(); showCard(cur);
      }, 700);
      later(function () { d.classList.remove('is-opening'); next.classList.remove('is-entering'); busy = false; setHint(); }, 1250);
    }
    function autoRun() {                     /* walk all the way down to the smallest doll by itself */
      if (touched || cur >= n - 1) return;
      open();
      later(autoRun, 2100);
    }
    ds.forEach(function (d) { d.addEventListener('click', function () { touched = true; open(); }); });
    items.forEach(function (li, i) {
      li.addEventListener('mouseenter', function () { touched = true; if (!busy) jump(i); });   /* hovering means you are driving now */
      li.querySelector('a').addEventListener('focus', function () { touched = true; if (!busy) jump(i); });
      li.addEventListener('click', function () { touched = true; });
    });
    paintList(); setHint();
    if (!reduce) later(function () { if (!touched && cur === 0) autoRun(); }, 1400);
  })();

  /* ------------------------------------------------ three exposures → color (after the hero) */
  (function layers() {
    var fig = $('#layers'); if (!fig) return;
    var L = { b: $('.layer-b', fig), g: $('.layer-g', fig), r: $('.layer-r', fig) };
    var chips = $$('.chip', fig), cap = $('#layersCap'), timer = null;
    // true shifts for flower.tif, as a fraction of the channel (3770 × 3215 px): G (−3, 18), R (−14, 120)
    var G = [-3 / 3770 * 100, 18 / 3215 * 100], R = [-14 / 3770 * 100, 120 / 3215 * 100];
    var caps = [
      'The three exposures of the flowers, tinted the way their filters saw them. Add them up and you get color; that\u2019s the whole trick.',
      'Stacked exactly as scanned: every edge splits into colored ghosts, because the camera moved a little between shots.',
      'Green moved by (\u22123, 18) px and red by (\u221214, 120) px, the offsets my code found. Now it\u2019s a photograph.'
    ];
    function set(el, tx, ty, s) { el.style.setProperty('--tx', tx); el.style.setProperty('--ty', ty); el.style.setProperty('--s', s); }
    function show(state) {
      fig.setAttribute('data-state', state);
      chips.forEach(function (c) { c.classList.toggle('is-on', +c.getAttribute('data-state') === state); });
      if (state === 0) { set(L.b, '-60%', '0', '.55'); set(L.g, '0', '0', '.55'); set(L.r, '60%', '0', '.55'); }
      else if (state === 1) { set(L.b, '0', '0', '1'); set(L.g, '0', '0', '1'); set(L.r, '0', '0', '1'); }
      else { set(L.b, '0', '0', '1'); set(L.g, G[0] + '%', G[1] + '%', '1'); set(L.r, R[0] + '%', R[1] + '%', '1'); }
      cap.textContent = caps[state];
    }
    var looping = false, userTook = false;
    function stopLoop() { if (timer) { clearTimeout(timer); timer = null; } looping = false; }
    function loop(state) {                     /* 0 -> 1 -> 2 -> 0 -> ... until someone presses a button */
      show(state);
      var hold = state === 2 ? 3400 : 2200;    /* linger on the finished colour photo */
      timer = setTimeout(function () { loop((state + 1) % 3); }, hold);
    }
    chips.forEach(function (c) { c.addEventListener('click', function () { userTook = true; stopLoop(); show(+c.getAttribute('data-state')); }); });
    show(0);
    if (!reduce && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) { if (looping) stopLoop(); return; }   /* pause when scrolled away */
        if (userTook || looping || timer) return;                         /* a button press wins for good */
        looping = true;
        timer = setTimeout(function () { loop(1); }, 400);
      }, { threshold: 0.2 });
      io.observe(fig);
    }
  })();

  /* ------------------------------------------------ plate channel viewer (section 1) */
  (function viewer() {
    var box = $('#viewer'); if (!box) return;
    var img = $('#viewerImg'), cap = $('#viewerCap'), chips = $$('.chip', box), timer = null, i = 0;
    function show(n) {
      i = n; var c = chips[n];
      chips.forEach(function (x) { x.classList.remove('is-on'); });
      c.classList.add('is-on');
      img.src = c.getAttribute('data-src'); img.alt = 'Cathedral: ' + c.getAttribute('data-cap');
      cap.textContent = c.getAttribute('data-cap');
    }
    chips.forEach(function (c, n) { c.addEventListener('click', function () { clearInterval(timer); timer = null; show(n); }); });
    if (!reduce) {
      var started = false;
      var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
        if (started || !es[0].isIntersecting) return; started = true; io.disconnect();
        timer = setInterval(function () { if (i >= chips.length - 1) { clearInterval(timer); timer = null; return; } show(i + 1); }, 1400);
      }, { threshold: 0.5 }) : null;
      if (io) io.observe(box);
    }
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
               say: $('#pyrSay'), step: $('#pyrStep'), back: $('#pyrBack'), next: $('#pyrNext'), replay: $('#pyrReplay'), play: $('#pyrPlay'), map: $('#pyrMap'), toggle: $('#pyrToggle') };
    var nums = { scale: $('#nScale'), size: $('#nSize'), pred: $('#nPred'), search: $('#nSearch'), chosen: $('#nChosen'), ncc: $('#nNcc') };
    var step = 0, edges = true, timers = [];
    var stopPlay = function () {};
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
        r.addEventListener('click', function () { stopPlay(); step = i; render(true); });
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
    var playTimer = null;
    stopPlay = function () { if (playTimer) { clearTimeout(playTimer); playTimer = null; } el.play.textContent = '\u25B6 play all five'; };
    function playFrom(s) {
      step = s; render(true);
      el.play.textContent = '\u25A0 stop';
      if (s < 4) playTimer = setTimeout(function () { playFrom(s + 1); }, reduce ? 900 : 2600);
      else playTimer = setTimeout(stopPlay, 800);
    }
    el.play.addEventListener('click', function () { if (playTimer) { stopPlay(); } else { playFrom(0); } });
    el.back.addEventListener('click', function () { stopPlay(); if (step > 0) { step -= 1; render(true); } });
    el.next.addEventListener('click', function () { stopPlay(); if (step < 4) { step += 1; render(true); } });
    el.replay.addEventListener('click', function () { stopPlay(); render(true); });
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
