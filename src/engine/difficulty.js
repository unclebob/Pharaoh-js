'use strict';

const SETTINGS = {
  easy: {
    pyramidBase: 115.47, creditLimit: 5000000, creditLowerBound: 5000000,
    worldGrowth: 0.15, landPrice: 1000, wheatPrice: 10, slavePrice: 1000
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

module.exports = { setDifficulty };
