const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../model.js');

function play(round, par = 4, score = 5) {
  const i = G.currentHole(round);
  G.setValue(round, i, 'par', par);
  G.setValue(round, i, 'score', score);
  G.finishHole(round, i);
}

test('round opens on hole 1, rejects unsupported lengths, and requires both fields', () => {
  const round = G.createRound(9);
  assert.equal(G.currentHole(round), 0);
  assert.throws(() => G.createRound(12));
  assert.throws(() => G.finishHole(round, 0));
  G.setValue(round, 0, 'par', 3);
  assert.throws(() => G.finishHole(round, 0));
  assert.throws(() => G.setValue(round, 9, 'score', 4));
  assert.throws(() => G.setValue(round, -1, 'par', 4));
  assert.equal(G.totals(round).played, 0);
});

test('nine-hole totals count finished holes only and complete after nine', () => {
  const round = G.createRound(9);
  for (let i = 0; i < 8; i++) play(round);
  G.setValue(round, 8, 'par', 3);
  G.setValue(round, 8, 'score', 2);
  assert.deepEqual(G.totals(round), { played: 8, par: 32, score: 40, difference: 8 });
  G.finishHole(round, 8);
  assert.equal(G.phase(round), 'complete');
  assert.deepEqual(G.totals(round), { played: 9, par: 35, score: 42, difference: 7 });
});

test('eighteen-hole round continues after nine and separates front and back totals', () => {
  const round = G.createRound(18);
  for (let i = 0; i < 9; i++) play(round, 4, 4);
  assert.equal(G.phase(round), 'play');
  assert.equal(G.currentHole(round), 9);
  assert.equal(G.phase(G.readRound(JSON.stringify(round))), 'play');
  for (let i = 0; i < 9; i++) play(round, 5, 7);
  assert.equal(G.phase(round), 'complete');
  assert.deepEqual(G.totals(round), { played: 18, par: 81, score: 99, difference: 18 });
  assert.equal(G.totals(round, 0, 9).score, 36);
  assert.equal(G.totals(round, 9, 18).score, 63);
});

test('correcting a previous hole updates totals without advancing the current hole', () => {
  const round = G.createRound(9);
  play(round);
  play(round);
  G.setValue(round, 0, 'score', 3);
  G.setValue(round, 0, 'par', 5);
  G.finishHole(round, 0);
  assert.equal(G.currentHole(round), 2);
  assert.deepEqual(G.totals(round), { played: 2, par: 9, score: 8, difference: -1 });
});

test('unfinished values survive reload and high scores stay within bounds', () => {
  const round = G.createRound(9);
  G.setValue(round, 0, 'par', 6);
  G.setValue(round, 0, 'score', 99);
  const restored = G.readRound(JSON.stringify(round));
  assert.deepEqual(restored, round);
  assert.equal(G.currentHole(restored), 0);
  assert.throws(() => G.setValue(round, 0, 'score', 0));
  assert.throws(() => G.setValue(round, 0, 'score', 100));
  assert.throws(() => G.setValue(round, 0, 'score', 4.5));
  assert.throws(() => G.setValue(round, 0, 'par', 9));
  assert.throws(() => G.setValue(round, 0, '__proto__', 4));
});

test('invalid or tampered saved data is rejected', () => {
  assert.equal(G.readRound('{bad json'), null);
  assert.equal(G.readRound('null'), null);
  assert.equal(G.readRound('[]'), null);
  const invalid = [
    r => { r.version = 2; },
    r => { r.holeCount = 500; },
    r => { r.holes.pop(); },
    r => { r.holes[0].score = '<script>alert(1)</script>'; },
    r => { r.holes[0].done = true; },
    r => { r.start = 9; },
    r => { r.start = 1.5; },
    r => { r.start = '3'; },
    r => { r.holes[0].done = 'yes'; },
    r => { r.holes[0].par = 100; },
  ];
  for (const mutate of invalid) {
    const round = G.createRound(9);
    mutate(round);
    assert.equal(G.readRound(JSON.stringify(round)), null);
  }
  const round = G.createRound(9);
  round.untrusted = '<script>unsafe</script>';
  assert.equal(G.readRound(JSON.stringify(round)).untrusted, undefined);
});

test('one par selection and one score selection complete a hole automatically', () => {
  const round = G.createRound(18);
  assert.throws(() => G.recordScore(round, 0, 5));
  assert.equal(round.holes[0].score, null);
  for (let i = 0; i < 18; i++) {
    assert.equal(G.currentHole(round), i);
    G.setValue(round, i, 'par', 4);
    G.recordScore(round, i, 5);
    assert.equal(G.totals(round).played, i + 1);
  }
  assert.equal(G.phase(round), 'complete');
  assert.equal(G.totals(round).score, 90);
});

test('old halfway saves resume at hole ten without needing confirmation', () => {
  const oldRound = G.createRound(18);
  for (let i = 0; i < 9; i++) play(oldRound);
  oldRound.frontAcknowledged = false;
  const restored = G.readRound(JSON.stringify(oldRound));
  assert.equal(G.currentHole(restored), 9);
  assert.equal(G.phase(restored), 'play');
  assert.equal(G.totals(restored, 0, 9).score, 45);
});

test('shotgun start plays from the starting hole and wraps around to finish', () => {
  const round = G.createRound(18, 3);
  assert.throws(() => G.createRound(9, 9));
  assert.throws(() => G.createRound(18, -1));
  assert.deepEqual(G.playOrder(round).slice(0, 3), [3, 4, 5]);
  assert.deepEqual(G.playOrder(round).slice(-3), [0, 1, 2]);
  const played = [];
  while (G.phase(round) === 'play') {
    const i = G.currentHole(round);
    played.push(i);
    G.setValue(round, i, 'par', 4);
    G.recordScore(round, i, 4);
  }
  assert.deepEqual(played, G.playOrder(round));
  assert.equal(played.at(-1), 2);
  assert.deepEqual(G.totals(round), { played: 18, par: 72, score: 72, difference: 0 });
});

test('start hole survives reload, and older saves without one start on hole 1', () => {
  const round = G.createRound(9, 6);
  assert.equal(G.readRound(JSON.stringify(round)).start, 6);
  const old = G.createRound(9);
  delete old.start;
  const restored = G.readRound(JSON.stringify(old));
  assert.equal(restored.start, 0);
  assert.equal(G.currentHole(restored), 0);
});

test('holes can be visited and scored out of order', () => {
  const round = G.createRound(9, 4);
  assert.equal(G.adjacentHole(round, 4, -1), null);
  assert.equal(G.adjacentHole(round, 4, 1), 5);
  assert.equal(G.adjacentHole(round, 8, 1), 0);
  assert.equal(G.adjacentHole(round, 3, 1), null);
  assert.equal(G.adjacentHole(round, 0, -1), 8);
  // Skip ahead to hole 7, leaving holes 5 and 6 blank.
  G.setValue(round, 6, 'par', 3);
  G.recordScore(round, 6, 2);
  assert.equal(G.currentHole(round), 4);
  assert.equal(G.nextHole(round, 6), 7);
  assert.equal(G.readRound(JSON.stringify(round)).holes[6].done, true);
  // Scoring an earlier hole moves to the next blank one, not past it.
  G.setValue(round, 4, 'par', 4);
  G.recordScore(round, 4, 4);
  assert.equal(G.nextHole(round, 4), 5);
  for (const i of [5, 7, 8, 0, 1, 2]) { G.setValue(round, i, 'par', 4); G.recordScore(round, i, 4); }
  assert.equal(G.nextHole(round, 2), 3);
  G.setValue(round, 3, 'par', 4);
  G.recordScore(round, 3, 4);
  assert.equal(G.nextHole(round, 3), -1);
  assert.equal(G.phase(round), 'complete');
});
