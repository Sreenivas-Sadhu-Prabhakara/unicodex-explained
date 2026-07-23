/* ============================================================
   unicodex-explained — the facts the page asserts.

   RULE: not a single count on this page is typed by hand. Each fact
   fixes only an INPUT STRING (spelled as an explicit codepoint array
   so it is unambiguous in any editor), then derives every number from
   the host engine itself — the exact three primitives unicodex is a
   window onto:

       [...s].length      → codepoints
       s.length           → UTF-16 code units
       TextEncoder        → UTF-8 bytes
       Intl.Segmenter     → grapheme clusters
       String.normalize   → NFC / NFD / NFKC / NFKD

   So the page and its OG card can never drift from ground truth, and
   test/facts.test.js re-derives the same numbers a second way.
   Dual export: browser global + Node tests.
   ============================================================ */
(function () {
  'use strict';

  var ENC = new TextEncoder();
  var SEG = (typeof Intl !== 'undefined' && Intl.Segmenter)
    ? new Intl.Segmenter('en', { granularity: 'grapheme' })
    : null;

  /* --- build a string from an explicit array of codepoints (numbers) --- */
  function fromCps(cps) { return String.fromCodePoint.apply(String, cps); }

  /* --- the four counts, all from the engine --- */
  function graphemes(s) {
    if (!SEG) return null;            // ancient engine; page falls back gracefully
    var n = 0;
    var it = SEG.segment(s)[Symbol.iterator]();
    for (var r = it.next(); !r.done; r = it.next()) n++;
    return n;
  }
  function counts(s) {
    return {
      graphemes: graphemes(s),
      utf16: s.length,
      codepoints: Array.from(s).length,
      utf8: ENC.encode(s).length
    };
  }

  /* ============================================================
     The exact input strings the page and OG card show, by codepoint.
     (No literal multi-byte characters live in this file, on purpose.)
     ============================================================ */

  // 👨‍👩‍👧‍👦  = man ZWJ woman ZWJ girl ZWJ boy
  var FAMILY = fromCps([0x1F468, 0x200D, 0x1F469, 0x200D, 0x1F467, 0x200D, 0x1F466]);

  // "café" precomposed (NFC): c a f é(U+00E9)
  var CAFE_NFC = fromCps([0x63, 0x61, 0x66, 0x00E9]);
  // "café" decomposed (NFD): c a f e + COMBINING ACUTE ACCENT(U+0301)
  var CAFE_NFD = fromCps([0x63, 0x61, 0x66, 0x65, 0x0301]);

  // "ﬁle": LATIN SMALL LIGATURE FI (U+FB01) + l + e
  var FILE_LIG = fromCps([0xFB01, 0x6C, 0x65]);

  // "раypal": Cyrillic er(U+0440) + Cyrillic a(U+0430) + y p a l  (a Latin look-alike spoof)
  var PAYPAL_SPOOF = fromCps([0x0440, 0x0430, 0x79, 0x70, 0x61, 0x6C]);
  // the genuine Latin "paypal"
  var PAYPAL_REAL = fromCps([0x70, 0x61, 0x79, 0x70, 0x61, 0x6C]);

  // 🇮🇳  = two Regional Indicator symbols (I, N)
  var FLAG_IN = fromCps([0x1F1EE, 0x1F1F3]);

  // "Hi<ZWSP>there": the zero-width space demo (U+200B)
  var ZWSP_DEMO = fromCps([0x48, 0x69, 0x200B, 0x74, 0x68, 0x65, 0x72, 0x65]);

  /* --- derived fact bundles the page reads by id --- */
  var FACTS = {
    family: {
      label: 'family emoji (man-woman-girl-boy)',
      counts: counts(FAMILY),
      codepointCount: Array.from(FAMILY).length, // 7: four faces + three ZWJ
      note: 'One glyph you can select with a single cursor step — but seven codepoints, glued by three ZERO WIDTH JOINERs.'
    },
    flag: {
      label: 'flag of India',
      counts: counts(FLAG_IN),
      note: 'Two Regional Indicator codepoints. You see one flag; .length says four UTF-16 units.'
    },
    cafeNfc: { label: 'café — precomposed (NFC)', counts: counts(CAFE_NFC) },
    cafeNfd: { label: 'café — decomposed (NFD)', counts: counts(CAFE_NFD) },
    fileLig: {
      label: 'ﬁle — with the ﬁ ligature',
      counts: counts(FILE_LIG),
      nfkc: FILE_LIG.normalize('NFKC') // "file" — compatibility decomposition
    },
    paypalSpoof: { label: 'раypal — Cyrillic spoof', counts: counts(PAYPAL_SPOOF) },
    zwsp: { label: 'Hi​there — with a hidden ZWSP', counts: counts(ZWSP_DEMO) }
  };

  /* --- the three equalities the "why don't they match?" scene asserts --- */
  var EQUALITIES = {
    // café NFC vs café NFD: look identical, are not === , but ARE equal after NFC
    cafeRawEqual: CAFE_NFC === CAFE_NFD,               // false
    cafeNfcEqual: CAFE_NFC.normalize('NFC') === CAFE_NFD.normalize('NFC'), // true
    // the Cyrillic spoof never equals the real word, before or after normalization
    paypalRawEqual: PAYPAL_SPOOF === PAYPAL_REAL,      // false
    paypalNfcEqual: PAYPAL_SPOOF.normalize('NFC') === PAYPAL_REAL.normalize('NFC') // false
  };

  var api = {
    fromCps: fromCps, counts: counts, graphemes: graphemes,
    strings: {
      FAMILY: FAMILY, CAFE_NFC: CAFE_NFC, CAFE_NFD: CAFE_NFD, FILE_LIG: FILE_LIG,
      PAYPAL_SPOOF: PAYPAL_SPOOF, PAYPAL_REAL: PAYPAL_REAL, FLAG_IN: FLAG_IN, ZWSP_DEMO: ZWSP_DEMO
    },
    FACTS: FACTS,
    EQUALITIES: EQUALITIES
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.UnicodexFacts = api;
})();
