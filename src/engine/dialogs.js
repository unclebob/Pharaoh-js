'use strict';

const { buyCommodity, sellCommodity, keepCommodity } = require('./trading');
const { hireOverseers, fireOverseers, obtainOverseers } = require('./overseers');
const { borrow, repay } = require('./loans');
const {
  getTradingInputErrorMessage, getNoFunctionSelectedMessage,
  getLoanInputErrorMessage, getLoanNoFunctionSelectedMessage,
  getOverseerInputErrorMessage,
  getPlantingErrorMessage, getPyramidErrorMessage,
  getFertilizerErrorMessage,
  getInsufficientFundsMessage, getSellMoreThanOwnedMessage,
  getSupplyLimitMessage, getDemandLimitMessage
} = require('./messages');

// -----------------------------------------------------------
// Input filtering
// -----------------------------------------------------------

function filterInputChar(char) {
  return /^[0-9.]$/.test(char);
}

// -----------------------------------------------------------
// Dialog lifecycle
// -----------------------------------------------------------

function openDialog(state, type, commodity) {
  state.dialog = {
    type,
    commodity: commodity || null,
    input: '',
    mode: null,
    error: null
  };
}

// -----------------------------------------------------------
// Mode key mapping per dialog type
// -----------------------------------------------------------

const MODE_KEYS = {
  buySell: { b: 'buy', s: 'sell', k: 'keep' },
  loan:    { b: 'borrow', r: 'repay' },
  overseer:{ h: 'hire', f: 'fire', o: 'obtain' }
};

function isModeKey(dialogType, key) {
  const map = MODE_KEYS[dialogType];
  return map && map[key] !== undefined;
}

function getModeForKey(dialogType, key) {
  const map = MODE_KEYS[dialogType];
  return map ? map[key] : undefined;
}

// -----------------------------------------------------------
// Key handling
// -----------------------------------------------------------

function handleDialogKey(state, key) {
  if (!state.dialog) return;

  if (key === 'Escape') {
    state.dialog = null;
    return;
  }

  if (key === 'Enter') {
    executeDialog(state);
    return;
  }

  state.dialog.error = null;

  if (isModeKey(state.dialog.type, key)) {
    state.dialog.mode = getModeForKey(state.dialog.type, key);
    return;
  }

  if (key === 'Backspace') {
    state.dialog.input = state.dialog.input.slice(0, -1);
    return;
  }

  if (filterInputChar(key)) {
    state.dialog.input += key;
  }
}

// -----------------------------------------------------------
// Execution
// -----------------------------------------------------------

function executeDialog(state) {
  if (!state.dialog) return;

  const { type } = state.dialog;

  if (requiresMode(type) && !state.dialog.mode) {
    state.dialog.error = getNoModeError(state, type);
    return;
  }

  const amount = parseFloat(state.dialog.input);
  if (isNaN(amount)) {
    state.dialog.error = getInputError(state, type);
    return;
  }

  dispatchExecution(state, type, amount);
}

function requiresMode(type) {
  return type === 'buySell' || type === 'loan' || type === 'overseer';
}

function getNoModeError(state, type) {
  const rng = state.rng;
  if (type === 'buySell') return getNoFunctionSelectedMessage(rng);
  if (type === 'loan') return getLoanNoFunctionSelectedMessage(rng);
  return getOverseerInputErrorMessage(rng);
}

function getInputError(state, type) {
  const rng = state.rng;
  if (type === 'buySell') return getTradingInputErrorMessage(rng);
  if (type === 'loan') return getLoanInputErrorMessage(rng);
  if (type === 'planting') return getPlantingErrorMessage(rng);
  if (type === 'pyramid') return getPyramidErrorMessage(rng);
  if (type === 'manure') return getFertilizerErrorMessage(rng);
  return getOverseerInputErrorMessage(rng);
}

function dispatchExecution(state, type, amount) {
  if (type === 'buySell') return executeBuySell(state, amount);
  if (type === 'loan') return executeLoan(state, amount);
  if (type === 'overseer') return executeOverseer(state, amount);
  return executeSimpleDialog(state, type, amount);
}

// -----------------------------------------------------------
// Buy/Sell execution
// -----------------------------------------------------------

function executeBuySell(state, amount) {
  const { mode, commodity } = state.dialog;

  if (mode === 'buy') return executeBuy(state, commodity, amount);
  if (mode === 'sell') return executeSell(state, commodity, amount);
  return executeKeep(state, commodity, amount);
}

function executeBuy(state, commodity, amount) {
  const result = buyCommodity(state, commodity, amount);
  if (result.ok) {
    state.dialog = null;
    return;
  }
  state.message = { text: result.message, face: 0 };
  state.dialog = null;
}

function executeSell(state, commodity, amount) {
  const result = sellCommodity(state, commodity, amount);
  if (result.ok) {
    state.dialog = null;
    return;
  }
  state.message = { text: result.message, face: 0 };
  state.dialog = null;
}

function executeKeep(state, commodity, target) {
  const result = keepCommodity(state, commodity, target);
  if (result.ok) {
    state.dialog = null;
    return;
  }
  state.message = { text: result.message, face: 0 };
  state.dialog = null;
}

// -----------------------------------------------------------
// Loan execution
// -----------------------------------------------------------

function executeLoan(state, amount) {
  const { mode } = state.dialog;

  if (mode === 'borrow') {
    const result = borrow(state, amount);
    if (result.ok) { state.dialog = null; return; }
    state.dialog.error = result.message || getLoanInputErrorMessage(state.rng);
    return;
  }

  const result = repay(state, amount);
  if (result.ok) { state.dialog = null; return; }
  state.dialog.error = result.message || getLoanInputErrorMessage(state.rng);
}

// -----------------------------------------------------------
// Overseer execution
// -----------------------------------------------------------

function executeOverseer(state, amount) {
  const { mode } = state.dialog;
  let result;

  if (mode === 'hire') result = hireOverseers(state, amount);
  else if (mode === 'fire') result = fireOverseers(state, amount);
  else result = obtainOverseers(state, amount);

  if (result.ok) { state.dialog = null; return; }
  state.dialog.error = getOverseerInputErrorMessage(state.rng);
}

// -----------------------------------------------------------
// Simple dialog execution (planting, pyramid, manure)
// -----------------------------------------------------------

function executeSimpleDialog(state, type, amount) {
  if (type === 'planting') state.plantingQuota = amount;
  else if (type === 'pyramid') state.stoneQuota = amount;
  else if (type === 'manure') state.manureSpreadQuota = amount;
  state.dialog = null;
}

module.exports = {
  openDialog, handleDialogKey, executeDialog, filterInputChar
};
