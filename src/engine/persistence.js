'use strict';

const { createGameState } = require('./state');
const { createRandom } = require('./random');
const { refreshOffers } = require('./contracts');

const TRANSIENT_KEYS = ['dialog', 'screen', 'message', 'statusMessage', 'rng',
  'contractMessages', 'randomEvent'];

const PERSISTED_KEYS = [
  'gold', 'wheat', 'slaves', 'oxen', 'horses', 'manure',
  'fallow', 'planted', 'growing', 'ripe',
  'wheatSewn', 'wheatGrowing', 'wheatRipe',
  'slaveHealth', 'oxenHealth', 'horseHealth',
  'slaveFeedRate', 'oxenFeedRate', 'horseFeedRate',
  'plantingQuota', 'manureSpreadQuota', 'stoneQuota',
  'pyramidStones', 'pyramidBase', 'pyramidHeight',
  'loan', 'interestRate', 'interestAddition',
  'creditRating', 'creditLimit', 'creditLowerBound',
  'inflation', 'worldGrowth',
  'wheatPrice', 'landPrice', 'slavePrice', 'horsePrice', 'oxenPrice', 'manurePrice',
  'supply', 'demand', 'production',
  'month', 'year',
  'overseers', 'overseerPay', 'overseerPressure',
  'contractOffers', 'pendingContracts', 'contractPlayers',
  'neighbors',
  'prev', 'temporaryWorkAddition', 'slaveEfficiency', 'motivation', 'oxenEfficiency',
  'manurePerAcre', 'wtRotRt',
  'gameOver', 'gameWon', 'licensed', 'canSave'
];

function serializeState(state) {
  const data = {};
  for (const key of PERSISTED_KEYS) {
    data[key] = deepCopy(state[key]);
  }
  data.rngState = state.rng.state;
  return JSON.stringify(data);
}

function deepCopy(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(deepCopy);
  const copy = {};
  for (const k of Object.keys(value)) {
    copy[k] = deepCopy(value[k]);
  }
  return copy;
}

function deserializeState(json) {
  const data = JSON.parse(json);
  const state = {};
  for (const key of PERSISTED_KEYS) {
    state[key] = data[key];
  }
  state.rng = createRandom(0);
  state.rng.state = data.rngState;
  state.dialog = null;
  state.screen = 'game';
  state.message = null;
  state.statusMessage = '';
  state.contractMessages = [];
  return state;
}

function saveGame(state, _filename) {
  return serializeState(state);
}

function loadGame(savedData) {
  const state = deserializeState(savedData);
  refreshOffers(state);
  return state;
}

function resetGame(seed) {
  return createGameState(seed);
}

module.exports = { serializeState, deserializeState, saveGame, loadGame, resetGame };
