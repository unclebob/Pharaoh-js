'use strict';

const { nextRaw } = require('./random');
const { payOverseers } = require('./overseers');

function snapshotPrev(state) {
  return {
    gold: state.gold, wheat: state.wheat, slaves: state.slaves,
    oxen: state.oxen, horses: state.horses, manure: state.manure,
    loan: state.loan, pyramidStones: state.pyramidStones,
    pyramidHeight: state.pyramidHeight, month: state.month, year: state.year
  };
}

function advanceMonth(state) {
  state.month += 1;
  if (state.month > 12) {
    state.month = 1;
    state.year += 1;
  }
}

function checkRandomEvent(state) {
  const roll = nextRaw(state.rng);
  state.randomEvent = roll < 0.125;
  return state.randomEvent;
}

function simulateMonth(state) {
  state.prev = snapshotPrev(state);
  payOverseers(state);
  checkRandomEvent(state);
  advanceMonth(state);
  return state;
}

module.exports = { simulateMonth, snapshotPrev, advanceMonth, checkRandomEvent };
