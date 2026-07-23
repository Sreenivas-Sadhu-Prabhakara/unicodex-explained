/* unicodex explained — page logic.
   No network calls (the CSP forbids them anyway). localStorage holds only the
   theme choice. Every count rendered on the page is pulled from data/facts.js,
   which derives it from the browser's own TextEncoder / Intl.Segmenter /
   String.normalize — so the page and its self-tests cannot disagree.
   No inline handlers: every listener is wired here (the CSP forbids inline JS). */
'use strict';

(function () {
  var root = document.documentElement;
  root.classList.add('js');

  /* ---------- theme toggle ---------- */
  var THEME_KEY = 'unicodex-explained.theme';
  var toggle = document.getElementById('theme-toggle');

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function effectiveTheme() {
    var t = root.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t;
    // page default is dark, matching the app's true-neutral near-black ground
    return systemPrefersDark() ? 'dark' : (root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
  }
  function applyTheme(t) {
    if (t === 'dark' || t === 'light') root.setAttribute('data-theme', t);
    else root.removeAttribute('data-theme');
    if (toggle) toggle.setAttribute('aria-pressed', String(effectiveTheme() === 'dark'));
  }
  try { applyTheme(localStorage.getItem(THEME_KEY)); } catch (e) { /* storage unavailable */ }

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* non-fatal */ }
    });
  }

  /* ---------- fill every count/fact from the derived facts module ---------- */
  /* Guards against drift: if the engine is present, the DOM shows exactly what
     it computes; the hardcoded HTML numbers are only a no-JS fallback. */
  try {
    var Facts = globalThis.UnicodexFacts;
    if (Facts && Facts.FACTS) {
      var F = Facts.FACTS;
      document.querySelectorAll('[data-count]').forEach(function (el) {
        var path = el.getAttribute('data-count').split('.'); // e.g. "family.utf8"
        var bundle = F[path[0]];
        if (!bundle) return;
        var val = path.length === 3
          ? (bundle[path[1]] && bundle[path[1]][path[2]])
          : (bundle.counts && bundle.counts[path[1]] !== undefined
              ? bundle.counts[path[1]]
              : bundle[path[1]]);
        if (val !== undefined && val !== null) el.textContent = String(val);
      });
      // string facts (e.g. the NFKC result "file")
      document.querySelectorAll('[data-fact]').forEach(function (el) {
        var key = el.getAttribute('data-fact');
        if (key === 'fileLig.nfkc' && F.fileLig) el.textContent = F.fileLig.nfkc;
        if (key === 'family-glyph' && Facts.strings) el.textContent = Facts.strings.FAMILY;
      });
    }
  } catch (e) { /* leave the static fallback numbers in place */ }

  /* ---------- scroll-triggered scene animations + replay ---------- */
  var animated = Array.prototype.slice.call(document.querySelectorAll('.anim'));

  function reveal(el) {
    el.classList.remove('in');
    // force reflow so re-adding .in restarts the CSS animations (replay)
    void el.offsetWidth;
    el.classList.add('in');
    var btn = el.querySelector('[data-replay-btn]');
    if (btn) btn.hidden = false;
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          reveal(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    animated.forEach(function (el) { io.observe(el); });
  } else {
    animated.forEach(function (el) { el.classList.add('in'); });
  }

  // replay buttons live inside .anim figures marked [data-replay]
  Array.prototype.forEach.call(document.querySelectorAll('[data-replay-btn]'), function (btn) {
    btn.addEventListener('click', function () {
      var host = btn.closest('.anim');
      if (host) reveal(host);
    });
  });
})();
