'use strict';

// Dialog Renderer for Pharaoh — draws dialog overlays on canvas.
// Handles: action dialogs, face messages, contracts, difficulty selection.

var PharaohDialogRenderer = (function () {

  var R = PharaohRenderer; // grid helpers

  // ── Color constants ──
  var DIALOG_BG = 'rgb(245,245,255)';
  var DIALOG_STROKE = 'rgb(100,100,100)';
  var OK_FILL = 'rgb(180,230,180)';
  var OK_STROKE = 'rgb(80,160,80)';
  var CANCEL_FILL = 'rgb(230,180,180)';
  var CANCEL_STROKE = 'rgb(160,80,80)';
  var RADIO_SELECTED = 'rgb(80,80,160)';
  var RADIO_UNSELECTED = 'rgb(160,160,160)';
  var HIGHLIGHT_BLUE = 'rgba(173,216,230,0.5)';
  var DIFF_BG = 'rgb(30,30,60)';
  var GOLD_COLOR = 'rgb(255,215,0)';

  // Face placeholder colors for face 0-3
  var FACE_COLORS = ['#e8c170', '#a0c8e0', '#c8e0a0', '#e0a0a0'];

  // ── Rounded rectangle ──

  function roundRect(ctx, x, y, w, h, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.arcTo(x + w, y, x + w, y + radius, radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
    ctx.lineTo(x + radius, y + h);
    ctx.arcTo(x, y + h, x, y + h - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }

  // ── Draw face placeholder ──

  function drawFace(ctx, x, y, size, faceIndex) {
    var idx = (faceIndex || 0) % 4;
    ctx.fillStyle = FACE_COLORS[idx];
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, size, size);
    // Draw eyes and mouth
    var cx = x + size / 2;
    var cy = y + size / 2;
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(cx - size * 0.15, cy - size * 0.1, size * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + size * 0.15, cy - size * 0.1, size * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + size * 0.15, size * 0.12, 0, Math.PI);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Face number label
    ctx.fillStyle = '#333';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Face ' + (idx + 1), cx, y + size - 2);
  }

  // ── Draw icon placeholder ──

  function drawIconPlaceholder(ctx, x, y, w, h, label) {
    ctx.fillStyle = '#d0d0e0';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#555';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label || '?', x + w / 2, y + h / 2);
  }

  // ── Button drawing ──

  function drawButton(ctx, x, y, w, h, text, fillColor, strokeColor) {
    roundRect(ctx, x, y, w, h, 4);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
  }

  // ── Radio button ──

  function drawRadio(ctx, x, y, radius, selected, label) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (selected) {
      ctx.fillStyle = RADIO_SELECTED;
      ctx.fill();
    } else {
      ctx.strokeStyle = RADIO_UNSELECTED;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = '#000';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + radius + 6, y);
  }

  // ── Action Dialog (buy/sell, loan, overseer, feed, plant, spread, pyramid) ──
  // Grid cells (2,8) to (7,12): 6 cols x 5 rows

  function drawActionDialog(ctx, canvas, dialog) {
    var x0 = R.cellX(canvas, 2);
    var y0 = R.cellY(canvas, 8);
    var w = R.cellX(canvas, 8) - x0;
    var h = R.cellY(canvas, 13) - y0;

    // Background
    roundRect(ctx, x0, y0, w, h, 5);
    ctx.fillStyle = DIALOG_BG;
    ctx.fill();
    ctx.strokeStyle = DIALOG_STROKE;
    ctx.lineWidth = 2;
    ctx.stroke();

    var pad = 12;
    var iconSize = h * 0.35;
    var innerX = x0 + pad;
    var innerY = y0 + pad;

    // Icon placeholder on left
    var iconLabel = getDialogIconLabel(dialog);
    drawIconPlaceholder(ctx, innerX, innerY, iconSize, iconSize, iconLabel);

    // Title to right of icon
    var titleX = innerX + iconSize + 12;
    var titleY = innerY + 14;
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(getDialogTitle(dialog), titleX, titleY);

    // Input field
    var inputY = innerY + iconSize + 12;
    var inputW = w - pad * 2 - 160;
    var inputH = 24;
    ctx.fillStyle = '#fff';
    ctx.fillRect(innerX, inputY, inputW, inputH);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(innerX, inputY, inputW, inputH);
    ctx.fillStyle = '#000';
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(dialog.input || '', innerX + 4, inputY + inputH / 2);

    // Mode radio buttons (for buy/sell, loan, overseer dialogs)
    if (dialog.type === 'buySell') {
      drawModeRadios(ctx, titleX, titleY + 22, dialog, [
        { key: 'buy', label: '(b)uy' },
        { key: 'sell', label: '(s)ell' },
        { key: 'keep', label: '(k)eep' }
      ]);
    } else if (dialog.type === 'loan') {
      drawModeRadios(ctx, titleX, titleY + 22, dialog, [
        { key: 'borrow', label: '(b)orrow' },
        { key: 'repay', label: '(r)epay' }
      ]);
    } else if (dialog.type === 'overseer') {
      drawModeRadios(ctx, titleX, titleY + 22, dialog, [
        { key: 'hire', label: '(h)ire' },
        { key: 'fire', label: '(f)ire' },
        { key: 'obtain', label: '(o)btain' }
      ]);
    }

    // Error message
    if (dialog.error) {
      ctx.fillStyle = '#cc0000';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      var errText = dialog.error;
      if (typeof errText === 'object' && errText.text) errText = errText.text;
      ctx.fillText(String(errText).substring(0, 60), innerX, inputY + inputH + 4);
    }

    // OK / Cancel buttons
    var btnW = 70;
    var btnH = 26;
    var btnY = y0 + h - btnH - pad;
    var okX = x0 + w - pad - btnW * 2 - 10;
    var cancelX = x0 + w - pad - btnW;
    drawButton(ctx, okX, btnY, btnW, btnH, 'OK', OK_FILL, OK_STROKE);
    drawButton(ctx, cancelX, btnY, btnW, btnH, 'Cancel', CANCEL_FILL, CANCEL_STROKE);

    return {
      okBtn: { x: okX, y: btnY, w: btnW, h: btnH },
      cancelBtn: { x: cancelX, y: btnY, w: btnW, h: btnH }
    };
  }

  function drawModeRadios(ctx, x, y, dialog, modes) {
    for (var i = 0; i < modes.length; i++) {
      var selected = dialog.mode === modes[i].key;
      drawRadio(ctx, x, y + i * 20, 6, selected, modes[i].label);
    }
  }

  function getDialogTitle(dialog) {
    if (dialog.type === 'buySell') return 'Trade: ' + (dialog.commodity || '');
    if (dialog.type === 'loan') return 'Loan';
    if (dialog.type === 'overseer') return 'Overseers';
    if (dialog.type === 'planting') return 'Set Planting Quota';
    if (dialog.type === 'pyramid') return 'Set Stone Quota';
    if (dialog.type === 'manure') return 'Set Manure Spread';
    if (dialog.type === 'slaveFeed') return 'Slave Feed Rate';
    if (dialog.type === 'oxenFeed') return 'Oxen Feed Rate';
    if (dialog.type === 'horseFeed') return 'Horse Feed Rate';
    return 'Dialog';
  }

  function getDialogIconLabel(dialog) {
    if (dialog.commodity) return dialog.commodity.charAt(0).toUpperCase();
    if (dialog.type === 'loan') return '$';
    if (dialog.type === 'overseer') return 'O';
    if (dialog.type === 'planting') return 'P';
    if (dialog.type === 'pyramid') return 'Q';
    if (dialog.type === 'manure') return 'M';
    return '?';
  }

  // ── Face Message Dialog ──
  // Grid cells (1,8) to (8,11): 8 cols x 4 rows

  function drawFaceMessage(ctx, canvas, state) {
    var msg = state.faceMessage || state.message;
    if (!msg) return;

    var x0 = R.cellX(canvas, 1);
    var y0 = R.cellY(canvas, 8);
    var w = R.cellX(canvas, 9) - x0;
    var h = R.cellY(canvas, 12) - y0;

    // Background
    roundRect(ctx, x0, y0, w, h, 5);
    ctx.fillStyle = DIALOG_BG;
    ctx.fill();
    ctx.strokeStyle = DIALOG_STROKE;
    ctx.lineWidth = 2;
    ctx.stroke();

    var pad = 10;
    var faceSize = Math.floor(h * 0.7);

    // Face portrait on left
    drawFace(ctx, x0 + pad, y0 + pad, faceSize, msg.face || 0);

    // Message text to right, word-wrapped
    var textX = x0 + pad + faceSize + 12;
    var textY = y0 + pad + 4;
    var textW = w - pad * 2 - faceSize - 12;
    ctx.fillStyle = '#000';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    wrapText(ctx, msg.text || '', textX, textY, textW, 16);

    // "[press any key]" hint
    ctx.fillStyle = '#999';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('[press any key]', x0 + w - pad, y0 + h - pad);
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    var words = text.split(' ');
    var line = '';
    var cy = y;
    for (var i = 0; i < words.length; i++) {
      var test = line + (line ? ' ' : '') + words[i];
      var metrics = ctx.measureText(test);
      if (metrics.width > maxW && line) {
        ctx.fillText(line, x, cy);
        line = words[i];
        cy += lineH;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, cy);
  }

  // ── Contracts Dialog ──
  // Grid cells (2,5) to (8,18): 7 cols x 14 rows

  function drawContractDialog(ctx, canvas, state) {
    var dialog = state.dialog;
    if (!dialog || dialog.type !== 'contracts') return;

    var x0 = R.cellX(canvas, 2);
    var y0 = R.cellY(canvas, 5);
    var w = R.cellX(canvas, 9) - x0;
    var h = R.cellY(canvas, 19) - y0;

    // Background
    roundRect(ctx, x0, y0, w, h, 5);
    ctx.fillStyle = DIALOG_BG;
    ctx.fill();
    ctx.strokeStyle = DIALOG_STROKE;
    ctx.lineWidth = 2;
    ctx.stroke();

    var pad = 8;
    var titleY = y0 + pad;

    // Title
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Contract Offers', x0 + pad, titleY);

    // List offers
    var rowH = 22;
    var listY = titleY + 24;
    var offers = state.contractOffers || [];
    var listX = x0 + pad;
    var listW = w - pad * 2;

    var rowIndex = 0;
    for (var i = 0; i < offers.length; i++) {
      if (!offers[i] || !offers[i].active) continue;
      var ry = listY + rowIndex * rowH;
      if (ry + rowH > y0 + h - 40) break;

      // Highlight selected
      if (dialog.selectedIndex === i) {
        ctx.fillStyle = HIGHLIGHT_BLUE;
        ctx.fillRect(listX, ry, listW, rowH);
      }

      var c = offers[i];
      var text = c.type + ' ' + R.fmt(c.amount) + ' ' + c.commodity +
                 ' @ ' + R.fmt(c.price) + 'g (' + c.duration + 'mo) - ' +
                 c.counterpartyName;
      ctx.fillStyle = '#000';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(text, listX + 4, ry + 4);

      rowIndex++;
    }

    // Confirmation prompt
    if (dialog.mode === 'confirming') {
      var confirmY = y0 + h - 36;
      ctx.fillStyle = '#cc6600';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Accept this contract? (y/n)', x0 + w / 2, confirmY);
    } else {
      // Navigation hint
      var hintY = y0 + h - 20;
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Up/Down to browse, Enter to accept, Esc to close', x0 + w / 2, hintY);
    }

    return { x0: x0, y0: y0, w: w, h: h, listY: listY, rowH: rowH };
  }

  // ── Difficulty Selection Screen ──

  function drawDifficultyScreen(ctx, canvas) {
    // Full screen dark blue background
    ctx.fillStyle = DIFF_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var cx = canvas.width / 2;

    // Title
    ctx.fillStyle = GOLD_COLOR;
    ctx.font = 'bold 48px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PHARAOH', cx, canvas.height * 0.2);

    // Subtitle
    ctx.fillStyle = 'rgb(220,220,220)';
    ctx.font = '22px serif';
    ctx.fillText('Choose your difficulty:', cx, canvas.height * 0.35);

    // Buttons
    var btnW = 500;
    var btnH = 50;
    var btnX = cx - btnW / 2;
    var btnGap = 20;
    var startY = canvas.height * 0.45;

    var buttons = [
      { label: '1 / E — Easy', key: 'easy' },
      { label: '2 / N — Normal', key: 'normal' },
      { label: '3 / H — Hard', key: 'hard' }
    ];

    var hitAreas = [];
    for (var i = 0; i < buttons.length; i++) {
      var by = startY + i * (btnH + btnGap);
      roundRect(ctx, btnX, by, btnW, btnH, 6);
      ctx.fillStyle = 'rgb(60,60,100)';
      ctx.fill();
      ctx.strokeStyle = 'rgb(180,180,255)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(buttons[i].label, cx, by + btnH / 2);
      hitAreas.push({ x: btnX, y: by, w: btnW, h: btnH, key: buttons[i].key });
    }

    return hitAreas;
  }

  // ── Main dialog dispatch ──

  function renderDialogs(ctx, canvas, state) {
    if (state.screen === 'difficulty') {
      return { type: 'difficulty', hitAreas: drawDifficultyScreen(ctx, canvas) };
    }

    // Face message (from neighbors or events)
    if (state.faceMessage) {
      drawFaceMessage(ctx, canvas, state);
      return { type: 'faceMessage' };
    }

    // Event message
    if (state.message) {
      drawFaceMessage(ctx, canvas, state);
      return { type: 'eventMessage' };
    }

    if (!state.dialog) return null;

    if (state.dialog.type === 'contracts') {
      var info = drawContractDialog(ctx, canvas, state);
      return { type: 'contracts', info: info };
    }

    if (state.dialog.type === 'faceMessage') {
      // Contract completion face message
      var fakeMsg = { face: state.dialog.face, text: state.dialog.text };
      var savedFace = state.faceMessage;
      state.faceMessage = fakeMsg;
      drawFaceMessage(ctx, canvas, state);
      state.faceMessage = savedFace;
      return { type: 'contractFaceMessage' };
    }

    var btnInfo = drawActionDialog(ctx, canvas, state.dialog);
    return { type: 'actionDialog', buttons: btnInfo };
  }

  return {
    renderDialogs: renderDialogs,
    drawDifficultyScreen: drawDifficultyScreen,
    drawFaceMessage: drawFaceMessage,
    drawContractDialog: drawContractDialog,
    drawActionDialog: drawActionDialog,
    drawFace: drawFace
  };

})();
