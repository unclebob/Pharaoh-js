'use strict';

const { setWorldConstructor } = require('@cucumber/cucumber');
const { createGameState } = require('../../src/engine/state');
const { setDifficulty, forceEasyIfUnlicensed } = require('../../src/engine/difficulty');
const { simulateMonth } = require('../../src/engine/simulation');
const { refreshOffers } = require('../../src/engine/contracts');
const { borrow } = require('../../src/engine/loans');
const { openingMessages, getOpeningMessage } = require('../../src/engine/messages');

class PharaohWorld {
  constructor() {
    this.state = null;
    this.borrowedAmount = 0;
    this.openingMsg = null;
  }

  initGame(seed) {
    this.state = createGameState(seed || 42);
  }

  selectDifficulty(level) {
    setDifficulty(this.state, level.toLowerCase());
  }

  runMonth() {
    simulateMonth(this.state);
    refreshOffers(this.state);
  }

  borrowFromBank(amount) {
    this.borrowedAmount = borrow(this.state, amount);
  }

  deliverOpeningMessage() {
    this.openingMsg = getOpeningMessage(this.state.rng);
    this.state.message = this.openingMsg;
  }
}

setWorldConstructor(PharaohWorld);

module.exports = { PharaohWorld };
