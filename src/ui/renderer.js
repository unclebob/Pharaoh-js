'use strict';

// Canvas Renderer for Pharaoh — draws the 10x25 grid layout
// Reads game state and renders to a 2D canvas context.

var PharaohRenderer = (function () {

  // Grid: 10 columns, 25 rows. Default canvas 1024x768.
  var COLS = 10;
  var ROWS = 25;
  var BG = '#ffffff';
  var TEXT_COLOR = '#000000';
  var GRID_LINE = '#cccccc';
  var HEADER_BG = '#e8e8e8';

  function cellW(canvas) { return canvas.width / COLS; }
  function cellH(canvas) { return canvas.height / ROWS; }
  function cellX(canvas, col) { return col * cellW(canvas); }
  function cellY(canvas, row) { return row * cellH(canvas); }

  // ── Formatting helpers ──

  function fmt(n) {
    if (n === undefined || n === null) return '—';
    if (typeof n === 'number') {
      if (Number.isInteger(n)) return n.toLocaleString();
      return n.toFixed(2);
    }
    return String(n);
  }

  function pct(n) {
    if (n === undefined || n === null) return '—';
    return (n * 100).toFixed(0) + '%';
  }

  function delta(cur, old) {
    if (old === undefined || old === null || old === 0) return '—';
    var d = ((cur - old) / Math.abs(old)) * 100;
    return (d >= 0 ? '+' : '') + d.toFixed(0) + '%';
  }

  function monthName(m) {
    var names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return names[(m - 1) % 12] || '?';
  }

  // ── Drawing primitives ──

  function clear(ctx, canvas) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawText(ctx, text, x, y, font, color, align) {
    ctx.fillStyle = color || TEXT_COLOR;
    ctx.font = font || '12px monospace';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  function drawSectionHeader(ctx, canvas, text, col0, col1, row) {
    var x0 = cellX(canvas, col0);
    var y0 = cellY(canvas, row);
    var w = cellX(canvas, col1) - x0;
    var h = cellH(canvas);
    ctx.fillStyle = HEADER_BG;
    ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0, y0, w, h);
    drawText(ctx, text, x0 + 4, y0 + h / 2, 'bold 12px monospace', TEXT_COLOR);
  }

  function drawGridLine(ctx, canvas, row, col0, col1) {
    var x0 = cellX(canvas, col0);
    var x1 = cellX(canvas, col1);
    var y = cellY(canvas, row);
    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
  }

  function drawCell(ctx, canvas, text, col, row, font, color, align) {
    var x = cellX(canvas, col);
    var y = cellY(canvas, row);
    var cw = cellW(canvas);
    var ch = cellH(canvas);
    var pad = 4;
    var tx = align === 'right' ? x + cw - pad : x + pad;
    drawText(ctx, text, tx, y + ch / 2, font || '12px monospace', color, align || 'left');
  }

  // ── Section Renderers ──

  function drawCommodities(ctx, canvas, state) {
    // Rows 0-7, Cols 0-3
    drawSectionHeader(ctx, canvas, 'Commodities', 0, 4, 0);
    // Sub-headers
    drawCell(ctx, canvas, '', 0, 1);
    drawCell(ctx, canvas, 'Current', 1, 1, '10px monospace', '#666');
    drawCell(ctx, canvas, 'd%', 2, 1, '10px monospace', '#666');
    drawCell(ctx, canvas, 'Old', 3, 1, '10px monospace', '#666');

    var prev = state.prev || {};
    var items = [
      { name: 'Wheat', cur: state.wheat, old: prev.wheat },
      { name: 'Manure', cur: state.manure, old: prev.manure },
      { name: 'Slaves', cur: state.slaves, old: prev.slaves },
      { name: 'Horses', cur: state.horses, old: prev.horses },
      { name: 'Oxen', cur: state.oxen, old: prev.oxen }
    ];

    for (var i = 0; i < items.length; i++) {
      var r = 2 + i;
      drawGridLine(ctx, canvas, r, 0, 4);
      drawCell(ctx, canvas, items[i].name, 0, r);
      drawCell(ctx, canvas, fmt(items[i].cur), 1, r, null, null, 'right');
      drawCell(ctx, canvas, delta(items[i].cur, items[i].old), 2, r, null, null, 'right');
      drawCell(ctx, canvas, fmt(items[i].old), 3, r, null, null, 'right');
    }
  }

  function drawPrices(ctx, canvas, state) {
    // Rows 0-7, Cols 4-5
    drawSectionHeader(ctx, canvas, 'Prices', 4, 6, 0);
    var items = [
      { name: 'Wheat', val: state.wheatPrice },
      { name: 'Manure', val: state.manurePrice },
      { name: 'Slaves', val: state.slavePrice },
      { name: 'Horses', val: state.horsePrice },
      { name: 'Oxen', val: state.oxenPrice },
      { name: 'Land', val: state.landPrice }
    ];
    for (var i = 0; i < items.length; i++) {
      var r = 1 + i;
      drawGridLine(ctx, canvas, r, 4, 6);
      drawCell(ctx, canvas, items[i].name, 4, r);
      drawCell(ctx, canvas, fmt(items[i].val), 5, r, null, null, 'right');
    }
  }

  function drawFeedRates(ctx, canvas, state) {
    // Rows 0-4, Cols 6-7
    drawSectionHeader(ctx, canvas, 'Feed Rates', 6, 8, 0);
    var items = [
      { name: 'Slaves', val: state.slaveFeedRate },
      { name: 'Oxen', val: state.oxenFeedRate },
      { name: 'Horses', val: state.horseFeedRate }
    ];
    for (var i = 0; i < items.length; i++) {
      var r = 1 + i;
      drawGridLine(ctx, canvas, r, 6, 8);
      drawCell(ctx, canvas, items[i].name, 6, r);
      drawCell(ctx, canvas, fmt(items[i].val), 7, r, null, null, 'right');
    }
  }

  function drawDate(ctx, canvas, state) {
    // Rows 0-2, Cols 8-9
    drawSectionHeader(ctx, canvas, 'Date', 8, 10, 0);
    drawGridLine(ctx, canvas, 1, 8, 10);
    drawCell(ctx, canvas, 'Year', 8, 1);
    drawCell(ctx, canvas, fmt(state.year), 9, 1, null, null, 'right');
    drawGridLine(ctx, canvas, 2, 8, 10);
    drawCell(ctx, canvas, 'Month', 8, 2);
    drawCell(ctx, canvas, monthName(state.month), 9, 2, null, null, 'right');
  }

  function drawOverseers(ctx, canvas, state) {
    // Rows 4-7, Cols 6-7
    drawSectionHeader(ctx, canvas, 'Overseers', 6, 8, 4);
    drawGridLine(ctx, canvas, 5, 6, 8);
    drawCell(ctx, canvas, "O'seers", 6, 5);
    drawCell(ctx, canvas, fmt(state.overseers), 7, 5, null, null, 'right');
    drawGridLine(ctx, canvas, 6, 6, 8);
    drawCell(ctx, canvas, 'Salary', 6, 6);
    drawCell(ctx, canvas, fmt(state.overseerPay), 7, 6, null, null, 'right');
  }

  function drawLoan(ctx, canvas, state) {
    // Rows 3-7, Cols 8-9
    drawSectionHeader(ctx, canvas, 'Loan', 8, 10, 3);
    drawGridLine(ctx, canvas, 4, 8, 10);
    drawCell(ctx, canvas, 'Loan', 8, 4);
    drawCell(ctx, canvas, fmt(state.loan), 9, 4, null, null, 'right');
    drawGridLine(ctx, canvas, 5, 8, 10);
    drawCell(ctx, canvas, 'Int %', 8, 5);
    drawCell(ctx, canvas, fmt(state.interestRate), 9, 5, null, null, 'right');
    drawGridLine(ctx, canvas, 6, 8, 10);
    drawCell(ctx, canvas, 'Credit', 8, 6);
    drawCell(ctx, canvas, fmt(Math.floor(state.creditLimit)), 9, 6, null, null, 'right');
  }

  function drawLand(ctx, canvas, state) {
    // Rows 8-10, Cols 0-5
    var total = state.fallow + state.planted + state.growing + state.ripe;
    drawSectionHeader(ctx, canvas, 'Land (acres)', 0, 6, 8);
    // Sub-headers
    drawCell(ctx, canvas, 'Fallow', 0, 9, '10px monospace', '#666');
    drawCell(ctx, canvas, 'Planted', 1, 9, '10px monospace', '#666');
    drawCell(ctx, canvas, 'Growing', 2, 9, '10px monospace', '#666');
    drawCell(ctx, canvas, 'Ripe', 3, 9, '10px monospace', '#666');
    drawCell(ctx, canvas, 'Total', 4, 9, '10px monospace', '#666');
    // Values
    drawGridLine(ctx, canvas, 10, 0, 6);
    drawCell(ctx, canvas, fmt(state.fallow), 0, 10, null, null, 'right');
    drawCell(ctx, canvas, fmt(state.planted), 1, 10, null, null, 'right');
    drawCell(ctx, canvas, fmt(state.growing), 2, 10, null, null, 'right');
    drawCell(ctx, canvas, fmt(state.ripe), 3, 10, null, null, 'right');
    drawCell(ctx, canvas, fmt(total), 4, 10, null, null, 'right');
  }

  function drawSpreadPlant(ctx, canvas, state) {
    // Rows 8-10, Cols 6-7
    drawSectionHeader(ctx, canvas, 'Spread&Plant', 6, 8, 8);
    drawGridLine(ctx, canvas, 9, 6, 8);
    drawCell(ctx, canvas, 'Manure', 6, 9);
    drawCell(ctx, canvas, fmt(state.manureSpreadQuota), 7, 9, null, null, 'right');
    drawGridLine(ctx, canvas, 10, 6, 8);
    drawCell(ctx, canvas, 'Land', 6, 10);
    drawCell(ctx, canvas, fmt(state.plantingQuota), 7, 10, null, null, 'right');
  }

  function drawGold(ctx, canvas, state) {
    // Rows 8-10, Cols 8-9
    drawSectionHeader(ctx, canvas, 'Gold', 8, 10, 8);
    var prev = state.prev || {};
    drawGridLine(ctx, canvas, 9, 8, 10);
    drawCell(ctx, canvas, 'Cur Gold', 8, 9, '10px monospace', '#666');
    drawCell(ctx, canvas, 'd%', 9, 9, '10px monospace', '#666');
    drawGridLine(ctx, canvas, 10, 8, 10);
    drawCell(ctx, canvas, fmt(state.gold), 8, 10, null, null, 'right');
    drawCell(ctx, canvas, delta(state.gold, prev.gold), 9, 10, null, null, 'right');
  }

  function drawPyramid(ctx, canvas, state) {
    // Rows 11-23, Cols 0-3
    drawSectionHeader(ctx, canvas, 'Pyramid', 0, 4, 11);
    drawGridLine(ctx, canvas, 12, 0, 4);
    drawCell(ctx, canvas, 'StoneQt', 0, 12);
    drawCell(ctx, canvas, fmt(state.stoneQuota), 1, 12, null, null, 'right');
    drawCell(ctx, canvas, 'Stones', 2, 12);
    drawCell(ctx, canvas, fmt(state.pyramidStones), 3, 12, null, null, 'right');
    drawGridLine(ctx, canvas, 13, 0, 4);
    drawCell(ctx, canvas, 'Height', 2, 13);
    drawCell(ctx, canvas, fmt(Math.floor(state.pyramidHeight)) + ' ft', 3, 13, null, null, 'right');

    // Draw pyramid shape
    drawPyramidShape(ctx, canvas, state);
  }

  function drawPyramidShape(ctx, canvas, state) {
    var x0 = cellX(canvas, 0) + 10;
    var y0 = cellY(canvas, 14);
    var boxW = cellX(canvas, 4) - cellX(canvas, 0) - 20;
    var boxH = cellY(canvas, 23) - y0 - 10;

    var maxH = PharaohEngine.pyramid.maxHeight(state.pyramidBase);
    var ratio = maxH > 0 ? Math.min(state.pyramidHeight / maxH, 1) : 0;

    var baseW = boxW * 0.8;
    var baseY = y0 + boxH;
    var peakY = baseY - boxH * ratio;
    var cx = x0 + boxW / 2;

    ctx.fillStyle = '#d4a845';
    ctx.beginPath();
    ctx.moveTo(cx, peakY);
    ctx.lineTo(cx - baseW / 2, baseY);
    ctx.lineTo(cx + baseW / 2, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawContracts(ctx, canvas, state) {
    // Rows 11-23, Cols 4-9
    var offerCount = 0;
    if (state.contractOffers) {
      for (var i = 0; i < state.contractOffers.length; i++) {
        if (state.contractOffers[i] && state.contractOffers[i].active) offerCount++;
      }
    }
    drawSectionHeader(ctx, canvas, 'Contracts (pending) — Offers (' + offerCount + ')', 4, 10, 11);

    var pending = state.pendingContracts || [];
    for (var j = 0; j < 12; j++) {
      var r = 12 + j;
      drawGridLine(ctx, canvas, r, 4, 10);
      if (j < pending.length && pending[j] && pending[j].active) {
        var c = pending[j];
        var text = c.type + ' ' + fmt(c.amount) + ' ' + c.commodity +
                   ' @ ' + fmt(c.price) + 'g (' + c.duration + 'mo) - ' +
                   c.counterpartyName;
        drawCell(ctx, canvas, text, 4, r, '11px monospace');
      }
    }
  }

  function drawBottomBar(ctx, canvas, state) {
    // Row 24, bottom bar
    var r = 24;
    var y = cellY(canvas, r);
    var h = cellH(canvas);

    // Quit button
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(cellX(canvas, 0), y, cellW(canvas), h);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.strokeRect(cellX(canvas, 0), y, cellW(canvas), h);
    drawCell(ctx, canvas, '(Q)uit', 0, r, 'bold 12px monospace');

    // Status message
    var statusText = state.statusMessage || '';
    if (state.gameWon) statusText = 'You won! Your pyramid is complete!';
    if (state.gameOver) statusText = 'Game Over — Foreclosed!';
    drawCell(ctx, canvas, statusText, 1, r, '12px monospace', '#333');

    // Run button
    ctx.fillStyle = '#b6d7a8';
    ctx.fillRect(cellX(canvas, 9), y, cellW(canvas), h);
    ctx.strokeStyle = '#6aa84f';
    ctx.lineWidth = 1;
    ctx.strokeRect(cellX(canvas, 9), y, cellW(canvas), h);
    drawCell(ctx, canvas, '(R)un', 9, r, 'bold 12px monospace');
  }

  // ── Section borders ──

  function drawSectionBorders(ctx, canvas) {
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 1;

    // Top section: rows 0-7
    drawBox(ctx, canvas, 0, 0, 4, 8);  // Commodities
    drawBox(ctx, canvas, 4, 0, 6, 8);  // Prices
    drawBox(ctx, canvas, 6, 0, 8, 4);  // Feed rates
    drawBox(ctx, canvas, 8, 0, 10, 3); // Date
    drawBox(ctx, canvas, 6, 4, 8, 8);  // Overseers
    drawBox(ctx, canvas, 8, 3, 10, 8); // Loan

    // Middle section: rows 8-10
    drawBox(ctx, canvas, 0, 8, 6, 11);  // Land
    drawBox(ctx, canvas, 6, 8, 8, 11);  // Spread&Plant
    drawBox(ctx, canvas, 8, 8, 10, 11); // Gold

    // Bottom section: rows 11-23
    drawBox(ctx, canvas, 0, 11, 4, 24);  // Pyramid
    drawBox(ctx, canvas, 4, 11, 10, 24); // Contracts

    // Bottom bar: row 24
    drawBox(ctx, canvas, 0, 24, 10, 25);
  }

  function drawBox(ctx, canvas, col0, row0, col1, row1) {
    var x = cellX(canvas, col0);
    var y = cellY(canvas, row0);
    var w = cellX(canvas, col1) - x;
    var h = cellY(canvas, row1) - y;
    ctx.strokeRect(x, y, w, h);
  }

  // ── Main render ──

  function render(ctx, canvas, state) {
    clear(ctx, canvas);
    drawCommodities(ctx, canvas, state);
    drawPrices(ctx, canvas, state);
    drawFeedRates(ctx, canvas, state);
    drawDate(ctx, canvas, state);
    drawOverseers(ctx, canvas, state);
    drawLoan(ctx, canvas, state);
    drawLand(ctx, canvas, state);
    drawSpreadPlant(ctx, canvas, state);
    drawGold(ctx, canvas, state);
    drawPyramid(ctx, canvas, state);
    drawContracts(ctx, canvas, state);
    drawBottomBar(ctx, canvas, state);
    drawSectionBorders(ctx, canvas);
  }

  return {
    render: render,
    cellW: cellW,
    cellH: cellH,
    cellX: cellX,
    cellY: cellY,
    COLS: COLS,
    ROWS: ROWS,
    fmt: fmt,
    delta: delta,
    pct: pct
  };

})();
