(function (root) {
  'use strict';

  const VERSION = 1;
  const STORAGE_KEY = 'tap-golf.round.v1';
  const PAR_VALUES = Object.freeze([3, 4, 5, 6]);

  function createRound(holeCount) {
    if (![9, 18].includes(holeCount)) throw new Error('Choose 9 or 18 holes.');
    return {
      version: VERSION,
      holeCount,
      holes: Array.from({ length: holeCount }, () => ({ par: null, score: null, done: false })),
    };
  }

  function validateRound(value) {
    if (!value || typeof value !== 'object' || value.version !== VERSION ||
        ![9, 18].includes(value.holeCount) ||
        !Array.isArray(value.holes) || value.holes.length !== value.holeCount) return null;
    let foundIncomplete = false;
    const holes = [];
    for (const hole of value.holes) {
      if (!hole || typeof hole !== 'object' || typeof hole.done !== 'boolean' ||
          !(hole.par === null || PAR_VALUES.includes(hole.par)) ||
          !(hole.score === null || (Number.isInteger(hole.score) && hole.score >= 1 && hole.score <= 99)) ||
          (hole.done && (hole.par === null || hole.score === null || foundIncomplete))) return null;
      if (!hole.done) foundIncomplete = true;
      holes.push({ par: hole.par, score: hole.score, done: hole.done });
    }
    // Only copy known fields; saved browser data is never treated as markup or executable code.
    return { version: VERSION, holeCount: value.holeCount, holes };
  }

  function readRound(serialized) {
    if (!serialized) return null;
    try { return validateRound(JSON.parse(serialized)); } catch { return null; }
  }

  function currentHole(round) {
    return round.holes.findIndex(hole => !hole.done);
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
    const current = currentHole(round);
    if (!Number.isInteger(index) || index < 0 || index >= round.holeCount ||
        (!round.holes[index].done && index !== current)) throw new Error('Play the next hole first.');
    if (field === 'par' && !PAR_VALUES.includes(value)) throw new Error('Par must be between 3 and 6.');
    if (field === 'score' && (!Number.isInteger(value) || value < 1 || value > 99)) throw new Error('Score must be between 1 and 99.');
    if (!['par', 'score'].includes(field)) throw new Error('Unknown field.');
    round.holes[index][field] = value;
  }

  function finishHole(round, index) {
    const hole = round.holes[index];
    if (!hole || (index !== currentHole(round) && !hole.done) || hole.par === null || hole.score === null) {
      throw new Error('Choose par and score first.');
    }
    hole.done = true;
  }

  function recordScore(round, index, score) {
    if (!round.holes[index] || round.holes[index].par === null) throw new Error('Choose par first.');
    setValue(round, index, 'score', score);
    finishHole(round, index);
  }

  const api = Object.freeze({ STORAGE_KEY, PAR_VALUES, createRound, validateRound, readRound, currentHole, totals, relative, phase, setValue, finishHole, recordScore });
  root.GolfScore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
