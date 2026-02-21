'use strict';

const { setWorldConstructor } = require('@cucumber/cucumber');
const { createGameState } = require('../../src/engine/state');
const { setDifficulty, forceEasyIfUnlicensed } = require('../../src/engine/difficulty');
const { simulateMonth } = require('../../src/engine/simulation');
const { refreshOffers } = require('../../src/engine/contracts');
const {
  borrow, offerCreditCheck, executeCreditCheck,
  repay, monthlyInterest, adjustCreditRating,
  processEmergencyLoan, checkForeclosure,
  handleNegativeGoldOverseers
} = require('../../src/engine/loans');
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
    this.borrowResult = borrow(this.state, amount);
    this.borrowedAmount = this.borrowResult.amount || 0;
  }

  deliverOpeningMessage() {
    this.openingMsg = getOpeningMessage(this.state.rng);
    this.state.message = this.openingMsg;
  }
}

setWorldConstructor(PharaohWorld);

module.exports = { PharaohWorld };
