'use strict';
/* Every number this page asserts is re-derived here a SECOND way, straight
   from Node's own TextEncoder / [...str] / str.length / String.normalize /
   Intl.Segmenter — the same engine primitives unicodex is a window onto.
   If a count on the page ever drifts from ground truth, `node --test` fails.
   Run with bare `node --test` (Node 20+). */
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../data/facts.js');

const ENC = new TextEncoder();
const SEG = new Intl.Segmenter('en', { granularity: 'grapheme' });
const graphemes = (s) => [...SEG.segment(s)].length;
const codepoints = (s) => [...s].length;
const utf8 = (s) => ENC.encode(s).length;

test('fromCps rebuilds the exact input strings', () => {
  // family = man ZWJ woman ZWJ girl ZWJ boy
  assert.deepEqual(
    [...F.strings.FAMILY].map((c) => c.codePointAt(0)),
    [0x1f468, 0x200d, 0x1f469, 0x200d, 0x1f467, 0x200d, 0x1f466]
  );
  assert.deepEqual([...F.strings.CAFE_NFC].map((c) => c.codePointAt(0)), [0x63, 0x61, 0x66, 0x00e9]);
  assert.deepEqual([...F.strings.CAFE_NFD].map((c) => c.codePointAt(0)), [0x63, 0x61, 0x66, 0x65, 0x0301]);
});

test('THE headline fact: family emoji = 1 grapheme / 7 codepoints / 11 UTF-16 / 25 UTF-8', () => {
  const s = F.strings.FAMILY;
  assert.equal(graphemes(s), 1, 'one grapheme cluster');
  assert.equal(codepoints(s), 7, 'seven codepoints');
  assert.equal(s.length, 11, 'eleven UTF-16 code units');
  assert.equal(utf8(s), 25, 'twenty-five UTF-8 bytes');
  // and the module's derived counts must agree with this independent derivation
  const c = F.FACTS.family.counts;
  assert.deepEqual(c, { graphemes: 1, utf16: 11, codepoints: 7, utf8: 25 });
});

test('flag of India = 1 grapheme / 2 codepoints / 4 UTF-16 / 8 UTF-8', () => {
  assert.deepEqual(F.FACTS.flag.counts, { graphemes: 1, utf16: 4, codepoints: 2, utf8: 8 });
});

test('café NFC has 4 codepoints; café NFD has 5 (the twin é)', () => {
  assert.deepEqual(F.FACTS.cafeNfc.counts, { graphemes: 4, utf16: 4, codepoints: 4, utf8: 5 });
  assert.deepEqual(F.FACTS.cafeNfd.counts, { graphemes: 4, utf16: 5, codepoints: 5, utf8: 6 });
  // grapheme count identical (4) but codepoint/byte counts differ — the whole point
  assert.equal(F.FACTS.cafeNfc.counts.graphemes, F.FACTS.cafeNfd.counts.graphemes);
  assert.notEqual(F.FACTS.cafeNfc.counts.codepoints, F.FACTS.cafeNfd.counts.codepoints);
});

test('the two "café"s are not === but ARE equal after NFC', () => {
  assert.equal(F.EQUALITIES.cafeRawEqual, false, 'raw === is false');
  assert.equal(F.EQUALITIES.cafeNfcEqual, true, 'NFC-normalized === is true');
  // prove it independently
  assert.notEqual(F.strings.CAFE_NFC, F.strings.CAFE_NFD);
  assert.equal(F.strings.CAFE_NFC.normalize('NFC'), F.strings.CAFE_NFD.normalize('NFC'));
});

test('ﬁ ligature: only compatibility normalization (NFKC) turns "ﬁle" into "file"', () => {
  assert.equal(F.FACTS.fileLig.nfkc, 'file');
  // NFC leaves the ligature alone; NFKC decomposes it
  assert.equal(F.strings.FILE_LIG.normalize('NFC'), F.strings.FILE_LIG);
  assert.notEqual(F.strings.FILE_LIG.normalize('NFKC'), F.strings.FILE_LIG);
  assert.equal(F.FACTS.fileLig.counts.codepoints, 3); // ﬁ + l + e
});

test('the Cyrillic spoof "раypal" never equals the Latin "paypal"', () => {
  assert.equal(F.EQUALITIES.paypalRawEqual, false);
  assert.equal(F.EQUALITIES.paypalNfcEqual, false, 'still unequal after NFC — it is a different letter, not a normalization difference');
  // first two codepoints are Cyrillic er + a, not Latin p + a
  const cps = [...F.strings.PAYPAL_SPOOF].map((c) => c.codePointAt(0));
  assert.equal(cps[0], 0x0440, 'CYRILLIC SMALL LETTER ER');
  assert.equal(cps[1], 0x0430, 'CYRILLIC SMALL LETTER A');
  // both look the same length to the eye and to .length — 6 each — which is why it fools people
  assert.equal(F.strings.PAYPAL_SPOOF.length, F.strings.PAYPAL_REAL.length);
});

test('hidden ZWSP: "Hi​there" is one codepoint longer than it looks (the invisible U+200B)', () => {
  const s = F.strings.ZWSP_DEMO;
  assert.ok([...s].some((c) => c.codePointAt(0) === 0x200b), 'contains a ZERO WIDTH SPACE');
  // "Hithere" is 7 visible letters; with the ZWSP it is 8 codepoints
  assert.equal(F.FACTS.zwsp.counts.codepoints, 8);
});

test('counts() agrees with an independent derivation for every fact string', () => {
  for (const s of Object.values(F.strings)) {
    const c = F.counts(s);
    assert.equal(c.utf16, s.length);
    assert.equal(c.codepoints, codepoints(s));
    assert.equal(c.utf8, utf8(s));
    assert.equal(c.graphemes, graphemes(s));
  }
});
