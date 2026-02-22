'use strict';

// Input handler for Pharaoh — keyboard and mouse events.
// Dispatches to engine functions and triggers re-render.

var PharaohInput = (function () {

  var E = null;   // PharaohEngine — set during init
  var app = null;  // PharaohApp — set during init

  function init(engine, appRef) {
    E = engine;
    app = appRef;
  }

  // ── Keyboard command map (game screen, no dialog open) ──

  var TRADE_KEYS = {
    'w': 'wheat',
    's': 'slaves',
    'o': 'oxen',
    'h': 'horses',
    'm': 'manure',
    'l': 'land'
  };

  var FEED_KEYS = {
    'S': 'slaveFeed',
    'O': 'oxenFeed',
    'H': 'horseFeed'
  };

  // ── Keyboard handler ──

  function handleKeyDown(e, state) {
    var key = e.key;

    // Difficulty screen
    if (state.screen === 'difficulty') {
      return handleDifficultyKey(key, state);
    }

    // Face message dismissal
    if (state.faceMessage) {
      return dismissFaceMessage(state);
    }

    // Event message dismissal
    if (state.message) {
      state.message = null;
      return true;
    }

    // Contract face message
    if (state.dialog && state.dialog.type === 'faceMessage') {
      E.contracts.dismissContractMessage(state);
      if (!state.dialog) checkContractMessages(state);
      return true;
    }

    // Active dialog
    if (state.dialog) {
      return handleDialogKey(key, state);
    }

    // Game screen commands
    return handleGameKey(key, state);
  }

  function handleDifficultyKey(key, state) {
    if (key === '1' || key === 'e' || key === 'E') {
      E.difficulty.setDifficulty(state, 'easy');
      app.onGameStart(state);
      return true;
    }
    if (key === '2' || key === 'n' || key === 'N') {
      E.difficulty.setDifficulty(state, 'normal');
      app.onGameStart(state);
      return true;
    }
    if (key === '3' || key === 'h' || key === 'H') {
      E.difficulty.setDifficulty(state, 'hard');
      app.onGameStart(state);
      return true;
    }
    return false;
  }

  function dismissFaceMessage(state) {
    var now = Date.now() / 1000;
    E.neighbors.dismissFaceMessage(state, now, state.rng);
    return true;
  }

  function handleDialogKey(key, state) {
    if (state.dialog.type === 'contracts') {
      E.contracts.handleContractInput(state, key);
      return true;
    }
    E.dialogs.handleDialogKey(state, key);
    return true;
  }

  function handleGameKey(key, state) {
    // Trade commands
    if (TRADE_KEYS[key]) {
      E.dialogs.openDialog(state, 'buySell', TRADE_KEYS[key]);
      return true;
    }

    // Feed rate commands
    if (FEED_KEYS[key]) {
      E.dialogs.openDialog(state, FEED_KEYS[key]);
      return true;
    }

    // Planting
    if (key === 'p') {
      E.dialogs.openDialog(state, 'planting');
      return true;
    }

    // Manure spread
    if (key === 'f') {
      E.dialogs.openDialog(state, 'manure');
      return true;
    }

    // Pyramid quota
    if (key === 'q') {
      E.dialogs.openDialog(state, 'pyramid');
      return true;
    }

    // Overseers
    if (key === 'g') {
      E.dialogs.openDialog(state, 'overseer');
      return true;
    }

    // Loan
    if (key === 'L') {
      E.dialogs.openDialog(state, 'loan');
      return true;
    }

    // Contracts
    if (key === 'c') {
      E.contracts.openContractDialog(state);
      return true;
    }

    // Run simulation
    if (key === 'r') {
      app.runMonth(state);
      return true;
    }

    // Escape — no-op at game screen
    if (key === 'Escape') {
      return false;
    }

    return false;
  }

  // ── Mouse handler ──

  function handleClick(e, state, canvas, dialogInfo) {
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;

    // Difficulty screen
    if (state.screen === 'difficulty' && dialogInfo && dialogInfo.hitAreas) {
      return handleDifficultyClick(mx, my, state, dialogInfo.hitAreas);
    }

    // Face message dismissal
    if (state.faceMessage || state.message) {
      if (state.faceMessage) dismissFaceMessage(state);
      else state.message = null;
      return true;
    }

    // Contract face message
    if (state.dialog && state.dialog.type === 'faceMessage') {
      E.contracts.dismissContractMessage(state);
      if (!state.dialog) checkContractMessages(state);
      return true;
    }

    // Bottom bar clicks
    if (handleBottomBarClick(mx, my, state, canvas)) return true;

    // Action dialog buttons
    if (state.dialog && dialogInfo && dialogInfo.buttons) {
      return handleDialogButtonClick(mx, my, state, dialogInfo.buttons);
    }

    // Contract dialog row clicks
    if (state.dialog && state.dialog.type === 'contracts' && dialogInfo && dialogInfo.info) {
      return handleContractRowClick(mx, my, state, dialogInfo.info);
    }

    return false;
  }

  function handleDifficultyClick(mx, my, state, hitAreas) {
    for (var i = 0; i < hitAreas.length; i++) {
      var a = hitAreas[i];
      if (mx >= a.x && mx <= a.x + a.w && my >= a.y && my <= a.y + a.h) {
        E.difficulty.setDifficulty(state, a.key);
        app.onGameStart(state);
        return true;
      }
    }
    return false;
  }

  function handleBottomBarClick(mx, my, state, canvas) {
    var cw = PharaohRenderer.cellW(canvas);
    var ch = PharaohRenderer.cellH(canvas);
    var barY = PharaohRenderer.cellY(canvas, 24);

    // File menu dropdown clicks (above the bar)
    if (state._fileMenuOpen) {
      var menuItems = ['save', 'open', 'newGame'];
      var itemH = 24;
      var menuX = PharaohRenderer.cellX(canvas, 0);
      var menuW = cw * 2;
      var menuY = barY - menuItems.length * itemH;

      if (mx >= menuX && mx <= menuX + menuW && my >= menuY && my < barY) {
        var idx = Math.floor((my - menuY) / itemH);
        state._fileMenuOpen = false;
        if (menuItems[idx] === 'save') {
          app.saveToLocal();
        } else if (menuItems[idx] === 'open') {
          app.loadFromLocal();
        } else if (menuItems[idx] === 'newGame') {
          app.newGame();
        }
        return true;
      }
      // Click outside menu closes it
      state._fileMenuOpen = false;
      return true;
    }

    if (my < barY || my > barY + ch) return false;

    // File button (col 0)
    if (mx < cw) {
      state._fileMenuOpen = !state._fileMenuOpen;
      return true;
    }

    // Quit button (col 1)
    if (mx >= cw && mx < cw * 2) {
      app.newGame();
      return true;
    }

    // Run button (col 9)
    if (mx >= PharaohRenderer.cellX(canvas, 9)) {
      app.runMonth(state);
      return true;
    }

    return false;
  }

  function handleDialogButtonClick(mx, my, state, buttons) {
    if (hitTest(mx, my, buttons.okBtn)) {
      E.dialogs.handleDialogKey(state, 'Enter');
      return true;
    }
    if (hitTest(mx, my, buttons.cancelBtn)) {
      E.dialogs.handleDialogKey(state, 'Escape');
      return true;
    }
    return false;
  }

  function handleContractRowClick(mx, my, state, info) {
    if (!info) return false;
    var offers = state.contractOffers || [];
    var rowIndex = 0;
    for (var i = 0; i < offers.length; i++) {
      if (!offers[i] || !offers[i].active) continue;
      var ry = info.listY + rowIndex * info.rowH;
      if (my >= ry && my < ry + info.rowH && mx >= info.x0 && mx <= info.x0 + info.w) {
        E.contracts.clickContractRow(state, i);
        return true;
      }
      rowIndex++;
    }
    return false;
  }

  function hitTest(mx, my, rect) {
    return mx >= rect.x && mx <= rect.x + rect.w &&
           my >= rect.y && my <= rect.y + rect.h;
  }

  function handleMouseMove(e, state, canvas, dialogInfo) {
    if (!state.dialog || state.dialog.type !== 'contracts') return false;
    if (state.dialog.mode !== 'browsing') return false;
    if (!dialogInfo || !dialogInfo.info) return false;

    var rect = canvas.getBoundingClientRect();
    var my = e.clientY - rect.top;
    var mx = e.clientX - rect.left;
    var info = dialogInfo.info;
    var offers = state.contractOffers || [];

    var rowIndex = 0;
    for (var i = 0; i < offers.length; i++) {
      if (!offers[i] || !offers[i].active) continue;
      var ry = info.listY + rowIndex * info.rowH;
      if (my >= ry && my < ry + info.rowH && mx >= info.x0 && mx <= info.x0 + info.w) {
        if (state.dialog.selectedIndex !== i) {
          state.dialog.selectedIndex = i;
          return true;
        }
        return false;
      }
      rowIndex++;
    }
    return false;
  }

  function checkContractMessages(state) {
    E.contracts.showNextContractMessage(state);
  }

  return {
    init: init,
    handleKeyDown: handleKeyDown,
    handleClick: handleClick,
    handleMouseMove: handleMouseMove,
    checkContractMessages: checkContractMessages
  };

})();
