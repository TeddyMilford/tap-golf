(() => {
  'use strict';

  const G = window.GolfScore;
  const storageKey = `${G.STORAGE_KEY}:${new URL('./', location.href).pathname}`;
  const app = document.getElementById('app');
  const storageNote = document.getElementById('storage-note');
  const scorecard = document.getElementById('scorecard');
  const development = location.protocol === 'file:' ||
    ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) ||
    new URLSearchParams(location.search).get('dev') === '1';
  document.getElementById('full-reset').hidden = !development;
  document.body.classList.toggle('development', development);
  let round = null;
  let viewIndex = null; // The hole on screen; null shows the start or result view.
  let startHole = 0; // Chosen on the start view before the round exists.
  let step = 'par';
  let twoDigitScore = false;
  let scoreDigits = '';

  function warning(message) {
    storageNote.textContent = message;
    storageNote.hidden = false;
  }

  function persist() {
    try {
      if (round) localStorage.setItem(storageKey, JSON.stringify(round));
      else localStorage.removeItem(storageKey);
      storageNote.hidden = true;
    } catch {
      warning('Saving is unavailable. Keep this page open.');
    }
  }

  // Show hole i (or the result view for null), resuming on Score? if par was chosen but not scored.
  function showHole(i) {
    viewIndex = i;
    const hole = i === null ? null : round.holes[i];
    step = hole && !hole.done && hole.par !== null ? 'score' : 'par';
    twoDigitScore = false;
    scoreDigits = '';
  }

  function resumeRound() {
    const i = round ? G.currentHole(round) : -1;
    showHole(i >= 0 ? i : null);
  }

  try {
    const saved = localStorage.getItem(storageKey);
    round = G.readRound(saved);
    if (saved && !round) warning('Saved round could not be read. Start a new round.');
  } catch {
    warning('Saving is unavailable. Keep this page open.');
  }
  resumeRound();

  const totalText = total => total.played ? G.relative(total.difference) : '—';

  function render(focusHeading = false) {
    if (!round) {
      app.innerHTML = `<section class="start-view" aria-label="Choose a round">
        <button class="round-option" data-start="9" ${startHole >= 9 ? 'disabled' : ''}>9 holes</button>
        <button class="round-option" data-start="18">18 holes</button>
        <button class="quiet-button shotgun-button" data-action="pick-start" aria-label="Shotgun start. Starting hole ${startHole + 1}. Change starting hole.">${startHole === 0 ? 'Shotgun start?' : `Shotgun start: hole ${startHole + 1}`}</button>
      </section>`;
    } else if (viewIndex !== null) {
      renderHole();
    } else {
      renderResult();
    }
    if (focusHeading) app.querySelector('h1')?.focus({ preventScroll: true });
  }

  function renderHole() {
    const i = viewIndex;
    const hole = round.holes[i];
    const current = G.currentHole(round);
    const previous = G.adjacentHole(round, i, -1);
    const next = G.adjacentHole(round, i, 1);
    const arrow = (target, symbol, label) => `<button class="arrow-button" data-go="${target ?? ''}" aria-label="${label}${target === null ? '' : ` (hole ${target + 1})`}" ${target === null ? 'disabled' : ''}>${symbol}</button>`;
    const front = G.totals(round, 0, 9);
    const showFrontNine = round.holeCount === 18 && front.played === 9 && i >= 9;
    const parButtons = G.PAR_VALUES.map(n => `<button class="number-button" data-par="${n}" aria-label="Par ${n}" aria-pressed="${hole.par === n}">${n}</button>`).join('');
    const digitButton = n => `<button class="number-button" data-digit="${n}" aria-label="${twoDigitScore ? 'Digit' : 'Score'} ${n}" ${n === 0 && !scoreDigits ? 'disabled title="Use 10+ to enter a two-digit score"' : ''}>${n}</button>`;
    const numpad = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(digitButton).join('') +
      `<button class="number-button keypad-option" data-action="score-mode" aria-label="${twoDigitScore ? 'Use single-digit scores' : 'Enter a score of 10 or more'}" aria-pressed="${twoDigitScore}">${twoDigitScore ? '1–9' : '10+'}</button>` + digitButton(0) +
      (twoDigitScore ? '<button class="number-button keypad-option" data-action="backspace" aria-label="Clear score digit">⌫</button>' : '<span aria-hidden="true"></span>');
    app.innerHTML = `<section class="hole-view${showFrontNine ? ' has-front-nine' : ''}" aria-label="Hole ${i + 1}">
      <div class="hole-bar">${arrow(previous, '‹', 'Previous hole')}<button class="hole-button" data-action="scorecard" aria-label="${hole.done ? 'Editing ' : ''}Hole ${i + 1} of ${round.holeCount}. Open scorecard."><span class="hole-label">${hole.done ? 'Edit hole' : 'Hole'}</span><strong>${i + 1}</strong><span class="hole-count">of ${round.holeCount}</span></button>${arrow(next, '›', 'Next hole')}</div>
      <div class="entry-controls">
        <h1 class="prompt" tabindex="-1">${step === 'par' ? 'Par?' : scoreDigits ? `${scoreDigits}_` : 'Score?'}</h1>
        ${hole.done && step === 'par' ? `<p class="front-total">Scored ${hole.score} on par ${hole.par} (${G.relative(hole.score - hole.par)})</p>` : showFrontNine ? `<p class="front-total">Front 9: ${front.score} (${G.relative(front.difference)})</p>` : ''}
        <div class="choice-grid ${step === 'score' ? 'score-choices' : ''}" aria-label="${step === 'score' ? 'Score numpad' : 'Choose par'}">${step === 'par' ? parButtons : numpad}</div>
        <div class="step-footer">${step === 'score' ? `<button class="quiet-button" data-action="change-par" aria-label="Change par ${hole.par}">Par ${hole.par}</button>` : i !== current ? `<button class="quiet-button" data-action="return">${current === -1 ? 'Back to results' : `Back to hole ${current + 1}`}</button>` : ''}</div>
      </div>
    </section>`;
  }

  function renderResult() {
    const total = G.totals(round);
    const nine = (label, start, end) => `<div>${label}<strong>${G.totals(round, start, end).score}</strong></div>`;
    app.innerHTML = `<section class="result-view">
      <h1 tabindex="-1">${round.holeCount} holes</h1>
      <div class="result-number">${total.score}</div>
      <p class="result-relative">${G.relative(total.difference)} to par</p>
      ${round.holeCount === 18 ? `<div class="nine-totals">${nine('Front 9', 0, 9)}${nine('Back 9', 9, 18)}</div>` : ''}
      <div class="result-actions"><button class="quiet-button" data-action="scorecard">Scorecard / edit</button><button class="quiet-button" data-action="new-round">New round</button></div>
    </section>`;
  }

  function openScorecard() {
    const subtotal = (label, start, end) => {
      const total = G.totals(round, start, end);
      return `<tr class="subtotal"><td>${label}</td><td>${total.played ? total.par : '—'}</td><td>${total.played ? total.score : '—'}</td><td>${totalText(total)}</td></tr>`;
    };
    document.getElementById('scorecard-content').innerHTML = `<table class="score-table"><thead><tr><th scope="col">Hole</th><th scope="col">Par</th><th scope="col">Score</th><th scope="col">+/−</th></tr></thead><tbody>${round.holes.map((hole, i) => `<tr><td><button class="hole-edit" data-edit="${i}" aria-label="${hole.done ? 'Edit' : 'Go to'} hole ${i + 1}"${i === round.start && round.start !== 0 ? ' title="Starting hole"' : ''}>${i + 1}${i === round.start && round.start !== 0 ? '<span class="start-mark" aria-hidden="true">●</span>' : ''}</button></td><td>${hole.done ? hole.par : '—'}</td><td>${hole.done ? hole.score : '—'}</td><td>${hole.done ? G.relative(hole.score - hole.par) : '—'}</td></tr>${i === 8 ? subtotal('Front 9', 0, 9) : i === 17 ? subtotal('Back 9', 9, 18) : ''}`).join('')}${round.holeCount === 18 ? subtotal('Total', 0, 18) : ''}</tbody></table>`;
    scorecard.showModal();
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !button.isConnected || button.disabled) return;
    if (button.id === 'full-reset') {
      document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
      round = null;
      startHole = 0;
      resumeRound();
      persist();
      render();
      app.querySelector('button')?.focus();
    } else if (button.dataset.close) {
      document.getElementById(button.dataset.close).close();
    } else if (button.dataset.start) {
      round = G.createRound(Number(button.dataset.start), startHole);
      startHole = 0;
      resumeRound();
      persist();
      render(true);
    } else if (button.dataset.par && step === 'par') {
      G.setValue(round, viewIndex, 'par', Number(button.dataset.par));
      step = 'score';
      twoDigitScore = false;
      scoreDigits = '';
      persist();
      render(true);
    } else if (button.dataset.digit !== undefined && step === 'score') {
      const digit = button.dataset.digit;
      if (!scoreDigits && digit === '0') return;
      if (twoDigitScore && !scoreDigits) {
        scoreDigits = digit;
        render(true);
        return;
      }
      G.recordScore(round, viewIndex, Number(scoreDigits + digit));
      const following = G.nextHole(round, viewIndex);
      showHole(following >= 0 ? following : null);
      persist();
      render(true);
    } else if (button.dataset.action === 'score-mode' && step === 'score') {
      twoDigitScore = !twoDigitScore;
      scoreDigits = '';
      render(true);
    } else if (button.dataset.action === 'backspace' && step === 'score') {
      scoreDigits = '';
      render(true);
    } else if (button.dataset.edit !== undefined) {
      showHole(Number(button.dataset.edit));
      scorecard.close();
      render(true);
    } else if (button.dataset.go) {
      showHole(Number(button.dataset.go));
      render(true);
    } else if (button.dataset.startHole) {
      startHole = Number(button.dataset.startHole);
      document.getElementById('start-hole').close();
      render();
      app.querySelector('[data-action="pick-start"]')?.focus();
    } else if (button.dataset.action === 'pick-start') {
      document.getElementById('start-hole-content').innerHTML = Array.from({ length: 18 }, (_, i) =>
        `<button class="hole-choice" data-start-hole="${i}" aria-pressed="${i === startHole}">${i + 1}</button>`).join('');
      document.getElementById('start-hole').showModal();
    } else if (button.id === 'confirm-new-round') {
      document.getElementById('new-round').close();
      round = null;
      startHole = 0;
      resumeRound();
      persist();
      render();
      app.querySelector('button')?.focus();
    } else if (button.dataset.action === 'change-par') {
      step = 'par';
      render(true);
    } else if (button.dataset.action === 'return') {
      resumeRound();
      render(true);
    } else if (button.dataset.action === 'scorecard') {
      openScorecard();
    } else if (button.dataset.action === 'new-round') {
      if (scorecard.open) scorecard.close();
      document.getElementById('new-round').showModal();
    }
  });

  // Left/right arrow keys move between holes, matching the on-screen arrows.
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || document.querySelector('dialog[open]')) return;
    const direction = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!direction || !round || viewIndex === null) return;
    const target = G.adjacentHole(round, viewIndex, direction);
    if (target === null) return;
    event.preventDefault();
    showHole(target);
    render(true);
  });

  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    try {
      const saved = localStorage.getItem(storageKey);
      const updated = G.readRound(saved);
      if (saved && !updated) return;
      round = updated;
      resumeRound();
      document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
      storageNote.hidden = true;
      render(true);
    } catch {
      warning('Saving is unavailable. Keep this page open.');
    }
  });

  render();
  if ('serviceWorker' in navigator && ['http:', 'https:'].includes(location.protocol)) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Local saving still works; avoid persistent interface chrome for offline setup.
    });
  }
})();
