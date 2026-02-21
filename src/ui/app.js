'use strict';

// Main application loop for Pharaoh.
// Initializes state, sets up canvas, runs game loop, handles timing.

var PharaohApp = (function () {

  var E = PharaohEngine;
  var canvas, ctx;
  var state;
  var dialogInfo = null;
  var animFrameId = null;
  var lastVisitCheck = 0;
  var VISIT_CHECK_INTERVAL = 1; // seconds between visit checks

  // ── Initialization ──

  function start() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 768;

    state = E.state.createGameState(Date.now());
    state.neighbors = E.neighbors.initializeNeighbors(state.rng);

    PharaohInput.init(E, PharaohApp);

    setupEventListeners();
    showOpeningMessage();
    scheduleRender();
    requestAnimationFrame(gameLoop);
  }

  function showOpeningMessage() {
    var msg = E.messages.getOpeningMessage(state.rng);
    state.faceMessage = msg;
  }

  // ── Event Listeners ──

  function setupEventListeners() {
    document.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('click', onClick);
  }

  function onKeyDown(e) {
    var handled = PharaohInput.handleKeyDown(e, state);
    if (handled) {
      e.preventDefault();
      scheduleRender();
    }
  }

  function onClick(e) {
    var handled = PharaohInput.handleClick(e, state, canvas, dialogInfo);
    if (handled) {
      e.preventDefault();
      scheduleRender();
    }
  }

  // ── Game Actions ──

  function onGameStart(s) {
    E.contracts.refreshOffers(s);
    var now = Date.now() / 1000;
    E.neighbors.initVisitTimers(s, now, s.rng);
    lastVisitCheck = now;
    scheduleRender();
  }

  function runMonth(s) {
    if (s.gameOver || s.gameWon) return;
    if (s.dialog || s.faceMessage || s.message) return;

    E.simulation.simulateMonth(s);
    s.statusMessage = 'Month ' + s.month + ', Year ' + s.year;

    // Check for contract messages after simulation
    E.contracts.showNextContractMessage(s);

    // Speak any face message
    speakIfAvailable(s);

    scheduleRender();
  }

  // ── Visit Timer System ──

  function checkVisits() {
    if (!state || state.screen === 'difficulty') return;
    if (state.dialog || state.faceMessage || state.message) return;
    if (state.gameOver || state.gameWon) return;

    var now = Date.now() / 1000;
    if (now - lastVisitCheck < VISIT_CHECK_INTERVAL) return;
    lastVisitCheck = now;

    var visit = E.neighbors.checkVisits(state, now, state.rng);
    if (visit) {
      speakIfAvailable(state);
      scheduleRender();
    }
  }

  // ── Speech Synthesis ──

  function speakIfAvailable(s) {
    var msg = s.faceMessage;
    if (!msg || !msg.text) return;
    if (!window.speechSynthesis) return;

    try {
      var utter = new SpeechSynthesisUtterance(msg.text);
      var settings = E.neighbors.getVoiceSettings(msg.face + 1);
      utter.rate = (settings.rate || 150) / 150;  // normalize to 0-2 range
      utter.pitch = (settings.pitch || 100) / 200; // normalize to 0-2 range
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch (err) {
      // Speech synthesis not critical
    }
  }

  // ── Render Loop ──

  var renderScheduled = false;

  function scheduleRender() {
    if (!renderScheduled) {
      renderScheduled = true;
      requestAnimationFrame(doRender);
    }
  }

  function doRender() {
    renderScheduled = false;
    if (!state) return;

    if (state.screen === 'difficulty') {
      dialogInfo = PharaohDialogRenderer.renderDialogs(ctx, canvas, state);
      return;
    }

    PharaohRenderer.render(ctx, canvas, state);
    dialogInfo = PharaohDialogRenderer.renderDialogs(ctx, canvas, state);
  }

  function gameLoop(timestamp) {
    checkVisits();
    animFrameId = requestAnimationFrame(gameLoop);
  }

  // ── Save / Load ──

  function saveToLocal() {
    if (!state.canSave) return false;
    try {
      var data = E.persistence.saveGame(state);
      localStorage.setItem('pharaoh-save', data);
      state.statusMessage = 'Game saved.';
      scheduleRender();
      return true;
    } catch (err) {
      state.statusMessage = 'Save failed: ' + err.message;
      scheduleRender();
      return false;
    }
  }

  function loadFromLocal() {
    try {
      var data = localStorage.getItem('pharaoh-save');
      if (!data) {
        state.statusMessage = 'No saved game found.';
        scheduleRender();
        return false;
      }
      state = E.persistence.loadGame(data);
      var now = Date.now() / 1000;
      E.neighbors.initVisitTimers(state, now, state.rng);
      state.statusMessage = 'Game loaded.';
      scheduleRender();
      return true;
    } catch (err) {
      state.statusMessage = 'Load failed: ' + err.message;
      scheduleRender();
      return false;
    }
  }

  // ── Public API ──

  return {
    start: start,
    onGameStart: onGameStart,
    runMonth: runMonth,
    saveToLocal: saveToLocal,
    loadFromLocal: loadFromLocal,
    getState: function () { return state; },
    scheduleRender: scheduleRender
  };

})();

// Auto-start when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
  PharaohApp.start();
});
