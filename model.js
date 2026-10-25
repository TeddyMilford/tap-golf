(function (root) {
  'use strict';

  const VERSION = 1;
  const STORAGE_KEY = 'tap-golf.round.v1';
  const PAR_VALUES = Object.freeze([3, 4, 5, 6]);

  function createRound(holeCount, start = 0) {
    if (![9, 18].includes(holeCount)) throw new Error('Choose 9 or 18 holes.');
    if (!Number.isInteger(start) || start < 0 || start >= holeCount) throw new Error('Starting hole must be on the course.');
    return {
      version: VERSION,
      holeCount,
      start,
      holes: Array.from({ length: holeCount }, () => ({ par: null, score: null, done: false })),
    };
  }

  function validateRound(value) {
    if (!value || typeof value !== 'object' || value.version !== VERSION ||
        ![9, 18].includes(value.holeCount) ||
        !Array.isArray(value.holes) || value.holes.length !== value.holeCount) return null;
    // Rounds saved before shotgun starts have no start field and began on hole 1.
    const start = value.start ?? 0;
    if (!Number.isInteger(start) || start < 0 || start >= value.holeCount) return null;
    const holes = [];
    for (const hole of value.holes) {
      if (!hole || typeof hole !== 'object' || typeof hole.done !== 'boolean' ||
          !(hole.par === null || PAR_VALUES.includes(hole.par)) ||
          !(hole.score === null || (Number.isInteger(hole.score) && hole.score >= 1 && hole.score <= 99)) ||
          (hole.done && (hole.par === null || hole.score === null))) return null;
      holes.push({ par: hole.par, score: hole.score, done: hole.done });
    }
    // Only copy known fields; saved browser data is never treated as markup or executable code.
    return { version: VERSION, holeCount: value.holeCount, start, holes };
  }

  function readRound(serialized) {
    if (!serialized) return null;
    try { return validateRound(JSON.parse(serialized)); } catch { return null; }
  }

  // Hole indexes in the order they are played: a shotgun start on hole 4 plays 4..18, then 1..3.
  function playOrder(round) {
    return Array.from({ length: round.holeCount }, (_, n) => (round.start + n) % round.holeCount);
  }

  // The first unfinished hole in play order, or -1 when every hole is done.
  function currentHole(round) {
    return playOrder(round).find(i => !round.holes[i].done) ?? -1;
  }

  // The next unfinished hole after `from` in play order, wrapping around; -1 when none remain.
  function nextHole(round, from) {
    const order = playOrder(round);
    const position = order.indexOf(from);
    for (let n = 1; n <= order.length; n++) {
      const i = order[(position + n) % order.length];
      if (!round.holes[i].done) return i;
    }
    return -1;
  }

  // The neighbouring hole in play order, or null at the first or last hole of the round.
  function adjacentHole(round, from, direction) {
    const order = playOrder(round);
    return order[order.indexOf(from) + direction] ?? null;
  }

  function totals(round, start = 0, end = round.holeCount) {
    const played = round.holes.slice(start, end).filter(hole => hole.done);
    const par = played.reduce((sum, hole) => sum + hole.par, 0);
    const score = played.reduce((sum, hole) => sum + hole.score, 0);
    return { played: played.length, par, score, difference: score - par };
  }

  function relative(difference) {
    return difference === 0 ? 'Even' : difference > 0 ? `+${difference}` : String(difference);
  }

  function phase(round) {
    return currentHole(round) === -1 ? 'complete' : 'play';
  }

  function setValue(round, index, field, value) {
    if (!Number.isInteger(index) || index < 0 || index >= round.holeCount) throw new Error('No such hole.');
    if (field === 'par' && !PAR_VALUES.includes(value)) throw new Error('Par must be between 3 and 6.');
    if (field === 'score' && (!Number.isInteger(value) || value < 1 || value > 99)) throw new Error('Score must be between 1 and 99.');
    if (!['par', 'score'].includes(field)) throw new Error('Unknown field.');
    round.holes[index][field] = value;
  }

  function finishHole(round, index) {
    const hole = round.holes[index];
    if (!hole || hole.par === null || hole.score === null) {
      throw new Error('Choose par and score first.');
    }
    hole.done = true;
  }

  function recordScore(round, index, score) {
    if (!round.holes[index] || round.holes[index].par === null) throw new Error('Choose par first.');
    setValue(round, index, 'score', score);
    finishHole(round, index);
  }

  const api = Object.freeze({ STORAGE_KEY, PAR_VALUES, createRound, validateRound, readRound, playOrder, currentHole, nextHole, adjacentHole, totals, relative, phase, setValue, finishHole, recordScore });
  root.GolfScore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
