/* Diverging Roads: "The Loupe", the click-to-enlarge image viewer.
   Dependency-free. Add to a story page with:
   <script src="lightbox.js" defer></script>
   Every image inside <main> becomes clickable (the 1x1 counter pixel is skipped).
   A one-line label under each page header and a small magnifier badge on each
   figure tell readers the images can be enlarged (both are added by this script).
   Click the enlarged image to toggle between fit-to-screen and actual size.
   Keys: Esc closes, Left/Right arrows move between the page's images. */
(function () {
  'use strict';

  var imgs = Array.prototype.slice.call(
    document.querySelectorAll('main img:not([aria-hidden="true"])')
  );
  if (!imgs.length) return;

  var css =
    'main img[data-lb]{cursor:zoom-in}' +
    'main img[data-lb]:hover,main img[data-lb]:focus-visible{outline:2px solid #a0462a;outline-offset:2px}' +
    '.lb{position:fixed;inset:0;z-index:9999;display:none;flex-direction:column;background:#120e0a;color:#e9dfc4}' +
    '.lb.open{display:flex}' +
    '.lb-bar{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.6rem 1rem;font:.72rem/1.2 "Special Elite",ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:#c9a96a}' +
    '.lb-hint{flex:1;text-align:center;opacity:.8}' +
    '.lb button{font:inherit;color:#e9dfc4;background:transparent;border:1px solid rgba(233,223,196,.45);padding:.35rem .7rem;cursor:pointer;letter-spacing:inherit;text-transform:inherit}' +
    '.lb button:hover,.lb button:focus-visible{background:rgba(233,223,196,.15);outline:none}' +
    '.lb-stage{position:relative;flex:1 1 auto;min-height:0;display:flex;overflow:auto;touch-action:pan-x pan-y pinch-zoom}' +
    '.lb-img{margin:auto;flex:none;max-width:none;background:#fff;box-shadow:0 0 0 1px rgba(233,223,196,.25)}' +
    '.lb-nav{position:absolute;top:50%;transform:translateY(-50%);font-size:1.4rem!important;padding:.5rem .8rem!important;background:rgba(25,20,15,.6)!important}' +
    '.lb-prev{left:.6rem}.lb-next{right:.6rem}' +
    '.lb-cap{flex:none;max-height:22vh;overflow:auto;padding:.7rem 1.2rem 1rem;text-align:center;font-size:.95rem;line-height:1.45}' +
    '.lb-cap:empty{display:none}' +
    '.lb-cap .fig-no{color:#c9a96a;font-family:"Special Elite",ui-monospace,monospace;letter-spacing:.08em;margin-right:.6em}' +
    '.lb-label{display:flex;align-items:center;gap:.55rem;margin:0 0 1.5rem;padding:.55rem 0;border-bottom:1px solid rgba(43,36,29,.18);font:.68rem/1.35 "Special Elite",ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:#6b5f4f}' +
    '.lb-label svg{flex:none;color:#a0462a}' +
    '.lb-label b{font-weight:normal;color:#a0462a}' +
    'figure.lb-has{position:relative}' +
    '.lb-badge{position:absolute;top:calc(.6rem + 8px);right:calc(.6rem + 8px);width:28px;height:28px;border-radius:50%;background:rgba(18,14,10,.72);color:#e9dfc4;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;pointer-events:none}' +
    'figure.lb-has:hover>.lb-badge,img[data-lb]:focus-visible+.lb-badge{opacity:.95}' +
    '@media (hover:none){.lb-badge{opacity:.8}}' +
    '@media (prefers-reduced-motion:reduce){.lb-badge{transition:none}}' +
    '@media print{.lb-label,.lb-badge{display:none!important}}' +
    '@media print{.lb{display:none!important}}';
  var style = document.createElement('style');
  style.id = 'lb-style';
  style.textContent = css;
  document.head.appendChild(style);

  var root, stage, big, cap, count, hint, closeBtn, prevBtn, nextBtn;
  var idx = 0, zoomed = false, lastFocus = null, built = false;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function build() {
    root = el('div', 'lb');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'The Loupe: image viewer');

    var bar = el('div', 'lb-bar');
    count = el('span', 'lb-count');
    hint = el('span', 'lb-hint');
    closeBtn = el('button', 'lb-close', 'Close \u2715');
    closeBtn.type = 'button';
    bar.appendChild(count); bar.appendChild(hint); bar.appendChild(closeBtn);

    stage = el('div', 'lb-stage');
    big = el('img', 'lb-img');
    prevBtn = el('button', 'lb-nav lb-prev', '\u2039');
    nextBtn = el('button', 'lb-nav lb-next', '\u203A');
    prevBtn.type = nextBtn.type = 'button';
    prevBtn.setAttribute('aria-label', 'Previous image');
    nextBtn.setAttribute('aria-label', 'Next image');
    stage.appendChild(big);

    cap = el('div', 'lb-cap');

    root.appendChild(bar); root.appendChild(stage);
    root.appendChild(prevBtn); root.appendChild(nextBtn); root.appendChild(cap);
    document.body.appendChild(root);

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', function () { go(-1); });
    nextBtn.addEventListener('click', function () { go(1); });
    big.addEventListener('click', toggleZoom);
    stage.addEventListener('click', function (e) { if (e.target === stage) close(); });
    big.addEventListener('load', layout);
    window.addEventListener('resize', function () { if (root.classList.contains('open')) layout(); });
    document.addEventListener('keydown', onKey);
    built = true;
  }

  function fitSize() {
    var nw = big.naturalWidth, nh = big.naturalHeight;
    var bw = Math.max(stage.clientWidth - 24, 100);
    var bh = Math.max(stage.clientHeight - 24, 100);
    var s = Math.min(bw / nw, bh / nh, 3);
    return { w: Math.round(nw * s), h: Math.round(nh * s), nw: nw, nh: nh };
  }

  function layout() {
    if (!big.naturalWidth) return;
    var f = fitSize();
    var canZoom = f.nw > f.w * 1.05;
    if (zoomed && canZoom) {
      big.style.width = f.nw + 'px';
      big.style.height = f.nh + 'px';
      big.style.cursor = 'zoom-out';
    } else {
      zoomed = false;
      big.style.width = f.w + 'px';
      big.style.height = f.h + 'px';
      big.style.cursor = canZoom ? 'zoom-in' : 'default';
    }
    hint.textContent = canZoom
      ? (zoomed ? 'Click image to fit screen' : 'Click image for actual size')
      : '';
  }

  function toggleZoom() {
    var f = fitSize();
    if (f.nw <= f.w * 1.05) return;
    zoomed = !zoomed;
    layout();
    stage.scrollTop = 0; stage.scrollLeft = 0;
  }

  function show(i) {
    idx = (i + imgs.length) % imgs.length;
    var src = imgs[idx];
    zoomed = false;
    big.style.width = ''; big.style.height = '';
    big.alt = src.alt || '';
    big.src = src.currentSrc || src.src;
    count.textContent = (idx + 1) + ' / ' + imgs.length;

    cap.textContent = '';
    var fig = src.closest('figure');
    var fc = fig && fig.querySelector('figcaption');
    if (fc) cap.appendChild(fc.cloneNode(true)).removeAttribute('class');
    var many = imgs.length > 1;
    prevBtn.style.display = nextBtn.style.display = many ? '' : 'none';
    if (big.complete) layout();
    stage.scrollTop = 0; stage.scrollLeft = 0;
  }

  function go(d) { show(idx + d); }

  function open(i) {
    if (!built) build();
    lastFocus = document.activeElement;
    root.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
    show(i);
    closeBtn.focus();
  }

  function close() {
    root.classList.remove('open');
    document.documentElement.style.overflow = '';
    big.removeAttribute('src');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onKey(e) {
    if (!root || !root.classList.contains('open')) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'Tab') {
      var f = [closeBtn];
      if (imgs.length > 1) f.unshift(prevBtn), f.push(nextBtn);
      var i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  }

  var ICON = '<svg width="%d" height="%d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M15 15l6 6"/><path d="M10 7v6M7 10h6"/></svg>';

  // One-line label at the top of the article body.
  var mainEl = document.querySelector('main');
  if (mainEl && !mainEl.querySelector('.lb-label')) {
    var touch = window.matchMedia && window.matchMedia('(hover: none)').matches;
    var label = document.createElement('p');
    label.className = 'lb-label';
    label.innerHTML = ICON.replace(/%d/g, '15') +
      '<span><b>The Loupe</b> \u00B7 ' + (touch ? 'Tap' : 'Click') + ' any image for a closer look</span>';
    mainEl.insertBefore(label, mainEl.firstChild);
  }

  imgs.forEach(function (img, i) {
    img.setAttribute('data-lb', '');
    var fig = img.parentNode;
    if (fig && fig.tagName === 'FIGURE') {
      fig.classList.add('lb-has');
      var badge = document.createElement('span');
      badge.className = 'lb-badge';
      badge.setAttribute('aria-hidden', 'true');
      badge.innerHTML = ICON.replace(/%d/g, '15');
      fig.insertBefore(badge, img.nextSibling);
    }
    img.setAttribute('tabindex', '0');
    img.setAttribute('role', 'button');
    img.setAttribute('aria-haspopup', 'dialog');
    if (!img.title) img.title = 'Click to enlarge';
    img.addEventListener('click', function () { open(i); });
    img.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
    });
  });
})();
