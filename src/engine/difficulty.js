'use strict';

const SETTINGS = {
  easy: {
    pyramidBase: 115.47, creditLimit: 5000000, creditLowerBound: 5000000,
    worldGrowth: 0.15, landPrice: 1000, wheatPrice: 10, slavePrice: 1000,
    fallow: 80, slaves: 100, oxen: 50, horses: 7,
    wheat: 20000, manure: 400, overseers: 7,
    slaveFeedRate: 10, oxenFeedRate: 70, horseFeedRate: 55,
    plantingQuota: 10, manureSpreadQuota: 50,
    loan: 433200, gold: 40000
  },
  normal: {
    pyramidBase: 346.41, creditLimit: 500000, creditLowerBound: 500000,
    worldGrowth: 0.10, landPrice: 5000, wheatPrice: 8, slavePrice: 800
  },
  hard: {
    pyramidBase: 1154.7, creditLimit: 50000, creditLowerBound: 50000,
    worldGrowth: 0.05
  }
};

function setDifficulty(state, level) {
  Object.assign(state, SETTINGS[level]);
  state.screen = 'game';
}

function forceEasyIfUnlicensed(state) {
  if (!state.licensed) {
    setDifficulty(state, 'easy');
    state.canSave = false;
  }
}

module.exports = { setDifficulty, forceEasyIfUnlicensed, SETTINGS };
