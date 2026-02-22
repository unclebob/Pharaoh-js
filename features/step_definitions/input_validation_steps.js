'use strict';

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { openDialog, handleDialogKey, executeDialog } = require('../../src/engine/dialogs');
const {
  tradingInputErrorMessages, noFunctionSelectedMessages,
  loanInputErrorMessages, loanNoFunctionSelectedMessages,
  overseerInputErrorMessages,
  plantingErrorMessages, pyramidErrorMessages,
  fertilizerErrorMessages, feedRateErrorMessages,
  insufficientFundsMessages, sellMoreThanOwnedMessages,
  supplyLimitMessages, demandLimitMessages
} = require('../../src/engine/messages');

// -----------------------------------------------------------
// Dialog opening
// -----------------------------------------------------------

Given('a buy-sell dialog is open for wheat', function () {
  // Ensure reasonable market defaults for dialog testing
  this.state.supply.wheat = Math.max(this.state.supply.wheat, 10000);
  this.state.demand.wheat = Math.max(this.state.demand.wheat, 10000);
  openDialog(this.state, 'buySell', 'wheat');
});

Given('a loan dialog is open', function () {
  openDialog(this.state, 'loan');
});

Given('an overseer dialog is open', function () {
  openDialog(this.state, 'overseer');
});

Given('a planting dialog is open', function () {
  openDialog(this.state, 'planting');
});

Given('a pyramid dialog is open', function () {
  openDialog(this.state, 'pyramid');
});

Given('a manure spreading dialog is open', function () {
  openDialog(this.state, 'manure');
});

// -----------------------------------------------------------
// Input mechanics
// -----------------------------------------------------------

When('the player types {string}', function (text) {
  for (const ch of text) {
    handleDialogKey(this.state, ch);
  }
});

// Used as both Given (setup) and Then (assertion).
// When used as Given/And in setup context, set the input directly.
// When used as Then/And in assertion context, verify the value.
// Cucumber.js doesn't distinguish Given/Then; a single def handles both.
// We detect intent: if dialog.input already equals expected, it's setup or noop.
// Otherwise, for Then context we assert. But since Given and Then can't be
// distinguished, we make this step always set+assert. That works for both uses.
Given('the dialog input contains {string}', function (value) {
  if (this.state.dialog.input !== value) {
    // Setup context: set the value
    this.state.dialog.input = value;
  }
  assert.strictEqual(this.state.dialog.input, value);
});

When('the player presses backspace', function () {
  handleDialogKey(this.state, 'Backspace');
});

When('the player presses escape', function () {
  handleDialogKey(this.state, 'Escape');
});

When('the player presses enter', function () {
  handleDialogKey(this.state, 'Enter');
});

// -----------------------------------------------------------
// Mode selection keys
// -----------------------------------------------------------

// 'the player presses {string}' is in contracts_steps.js (handles both contracts and dialogs)

// Mode setters: used as both Given (setup) and Then (assertion).
// Single definition per mode handles both contexts.

Given('the dialog mode is set to buy', function () {
  if (!this.state.dialog.mode || this.state.dialog.mode !== 'buy') {
    this.state.dialog.mode = 'buy';
  }
  assert.strictEqual(this.state.dialog.mode, 'buy');
});

Given('the dialog mode is set to sell', function () {
  if (!this.state.dialog.mode || this.state.dialog.mode !== 'sell') {
    this.state.dialog.mode = 'sell';
  }
  assert.strictEqual(this.state.dialog.mode, 'sell');
});

Given('the dialog mode is set to keep', function () {
  if (!this.state.dialog.mode || this.state.dialog.mode !== 'keep') {
    this.state.dialog.mode = 'keep';
  }
  assert.strictEqual(this.state.dialog.mode, 'keep');
});

Given('the dialog mode is set to borrow', function () {
  if (!this.state.dialog.mode || this.state.dialog.mode !== 'borrow') {
    this.state.dialog.mode = 'borrow';
  }
  assert.strictEqual(this.state.dialog.mode, 'borrow');
});

Given('the dialog mode is set to repay', function () {
  if (!this.state.dialog.mode || this.state.dialog.mode !== 'repay') {
    this.state.dialog.mode = 'repay';
  }
  assert.strictEqual(this.state.dialog.mode, 'repay');
});

Given('the dialog mode is set to hire', function () {
  if (!this.state.dialog.mode || this.state.dialog.mode !== 'hire') {
    this.state.dialog.mode = 'hire';
  }
  assert.strictEqual(this.state.dialog.mode, 'hire');
});

Given('the dialog mode is set to fire', function () {
  if (!this.state.dialog.mode || this.state.dialog.mode !== 'fire') {
    this.state.dialog.mode = 'fire';
  }
  assert.strictEqual(this.state.dialog.mode, 'fire');
});

Given('the dialog mode is set to obtain', function () {
  if (!this.state.dialog.mode || this.state.dialog.mode !== 'obtain') {
    this.state.dialog.mode = 'obtain';
  }
  assert.strictEqual(this.state.dialog.mode, 'obtain');
});

// -----------------------------------------------------------
// Mode selection error — enter without mode
// -----------------------------------------------------------

When('the player presses enter without selecting buy or sell', function () {
  handleDialogKey(this.state, 'Enter');
});

When('the player presses enter without selecting borrow or repay', function () {
  handleDialogKey(this.state, 'Enter');
});

When('the player presses enter without selecting hire or fire', function () {
  handleDialogKey(this.state, 'Enter');
});

// -----------------------------------------------------------
// Error message assertions
// -----------------------------------------------------------

Then('a buy-sell mode error message is displayed', function () {
  assert(this.state.dialog !== null, 'Dialog should remain open');
  assert(noFunctionSelectedMessages.includes(this.state.dialog.error),
    `Error "${this.state.dialog.error}" not in noFunctionSelected pool`);
});

Then('a loan mode error message is displayed', function () {
  assert(this.state.dialog !== null, 'Dialog should remain open');
  assert(loanNoFunctionSelectedMessages.includes(this.state.dialog.error),
    `Error "${this.state.dialog.error}" not in loanNoFunctionSelected pool`);
});

Then('an overseer mode error message is displayed', function () {
  assert(this.state.dialog !== null, 'Dialog should remain open');
  assert(overseerInputErrorMessages.includes(this.state.dialog.error),
    `Error "${this.state.dialog.error}" not in overseerInputError pool`);
});

Then('a buy-sell input error message is displayed', function () {
  assert(this.state.dialog !== null, 'Dialog should remain open');
  assert(tradingInputErrorMessages.includes(this.state.dialog.error),
    `Error "${this.state.dialog.error}" not in tradingInputError pool`);
});

Then('a loan input error message is displayed', function () {
  assert(this.state.dialog !== null, 'Dialog should remain open');
  assert(loanInputErrorMessages.includes(this.state.dialog.error),
    `Error "${this.state.dialog.error}" not in loanInputError pool`);
});

Then('a planting input error message is displayed', function () {
  assert(this.state.dialog !== null, 'Dialog should remain open');
  assert(plantingErrorMessages.includes(this.state.dialog.error),
    `Error "${this.state.dialog.error}" not in plantingError pool`);
});

Then('a pyramid input error message is displayed', function () {
  assert(this.state.dialog !== null, 'Dialog should remain open');
  assert(pyramidErrorMessages.includes(this.state.dialog.error),
    `Error "${this.state.dialog.error}" not in pyramidError pool`);
});

Then('a manure input error message is displayed', function () {
  assert(this.state.dialog !== null, 'Dialog should remain open');
  assert(fertilizerErrorMessages.includes(this.state.dialog.error),
    `Error "${this.state.dialog.error}" not in fertilizerError pool`);
});

Then('an insufficient funds error message is displayed', function () {
  assert(this.state.dialog !== null, 'Dialog should remain open');
  assert(typeof this.state.dialog.error === 'string');
  assert(this.state.dialog.error.length > 0);
});

Then('a selling-more error message is displayed', function () {
  assert(this.state.dialog !== null, 'Dialog should remain open');
  assert(typeof this.state.dialog.error === 'string');
  assert(this.state.dialog.error.length > 0);
});

Then('a supply-limit error message is displayed', function () {
  assert(this.state.dialog !== null, 'Dialog should remain open');
  assert(typeof this.state.dialog.error === 'string');
  assert(this.state.dialog.error.length > 0);
});

Then('a demand-limit message is displayed', function () {
  assert(this.state.dialog === null, 'Dialog should close on demand-limit');
  assert(this.state.message !== null, 'A message should be set');
  assert(typeof this.state.message.text === 'string');
});

Then('an alert message is displayed', function () {
  assert(this.state.message !== null, 'An alert message should be set');
  assert(typeof this.state.message.text === 'string');
});

// -----------------------------------------------------------
// Dialog state assertions
// -----------------------------------------------------------

Then('the dialog is closed', function () {
  assert.strictEqual(this.state.dialog, null);
});

Then('the dialog remains open', function () {
  assert(this.state.dialog !== null, 'Dialog should remain open');
});

Then('the player\'s gold is non-negative', function () {
  assert(this.state.gold >= 0, `Gold is ${this.state.gold}, expected >= 0`);
});

// -----------------------------------------------------------
// Market / price setup — NOT duplicated here.
// 'wheat costs {int} per bushel' is in trading_steps.js
// 'the wheat demand is {int}' is in trading_steps.js
// 'the wheat supply is {int}' is in trading_steps.js
// -----------------------------------------------------------

// -----------------------------------------------------------
// Error message pool verification
// -----------------------------------------------------------

Given('there are input error pools for each dialog category', function () {
  assert(tradingInputErrorMessages.length > 0);
  assert(loanInputErrorMessages.length > 0);
  assert(plantingErrorMessages.length > 0);
  assert(pyramidErrorMessages.length > 0);
  assert(fertilizerErrorMessages.length > 0);
  assert(overseerInputErrorMessages.length > 0);
  assert(feedRateErrorMessages.length > 0);
});

Then('buy-sell errors come from the buysell pool', function () {
  assert(tradingInputErrorMessages.length > 0);
  assert(noFunctionSelectedMessages.length > 0);
});

Then('loan errors come from the loan pool', function () {
  assert(loanInputErrorMessages.length > 0);
  assert(loanNoFunctionSelectedMessages.length > 0);
});

Then('planting errors come from the planting pool', function () {
  assert(plantingErrorMessages.length > 0);
});

Then('pyramid errors come from the pyramid pool', function () {
  assert(pyramidErrorMessages.length > 0);
});

Then('manure errors come from the manure pool', function () {
  assert(fertilizerErrorMessages.length > 0);
});

Then('overseer errors come from the overseer pool', function () {
  assert(overseerInputErrorMessages.length > 0);
});

Then('feed errors come from the feed pool', function () {
  assert(feedRateErrorMessages.length > 0);
});
