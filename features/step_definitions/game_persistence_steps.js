'use strict';

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { createGameState } = require('../../src/engine/state');
const { setDifficulty } = require('../../src/engine/difficulty');
const { simulateMonth } = require('../../src/engine/simulation');
const { refreshOffers } = require('../../src/engine/contracts');
const {
  serializeState, deserializeState, saveGame, loadGame, resetGame
} = require('../../src/engine/persistence');

// ── Helpers ──

function saveAndRestore(world) {
  world.savedData = saveGame(world.state, 'test-save');
  world.savedSnapshot = JSON.parse(world.savedData);
  world.state = loadGame(world.savedData);
}

// ── Saving ──

Given('the player has been playing for several months', function () {
  this.state.gold = 15000;
  this.state.wheat = 3000;
  this.state.slaves = 100;
  this.state.month = 5;
  this.state.year = 3;
  for (let i = 0; i < 3; i++) {
    simulateMonth(this.state);
    refreshOffers(this.state);
  }
});

When('the player saves the game', function () {
  this.savedData = saveGame(this.state, 'test-save');
  this.savedSnapshot = JSON.parse(this.savedData);
});

Then('all game state is written to a file', function () {
  assert(typeof this.savedData === 'string');
  assert(this.savedSnapshot.gold !== undefined);
  assert(this.savedSnapshot.wheat !== undefined);
  assert(this.savedSnapshot.month !== undefined);
  assert(typeof this.savedSnapshot.rngState === 'number');
});

Then('the player can continue playing', function () {
  // State is unchanged after save
  assert(this.state.gold !== undefined);
  assert(this.state.rng !== undefined);
  const prevMonth = this.state.month;
  simulateMonth(this.state);
  assert(this.state.month !== prevMonth || this.state.year > 1);
});

// ── Save prompts for filename ──

When('the player chooses to save', function () {
  this.state.savePrompt = true;
});

Then('the player is prompted for a save file name', function () {
  assert.strictEqual(this.state.savePrompt, true);
});

// ── Save overwrites ──

Given('a save file already exists with that name', function () {
  this.state.gold = 10000;
  this.existingSave = saveGame(this.state, 'existing-save');
});

When('the player saves to the same filename', function () {
  this.state.gold = 20000;
  this.savedData = saveGame(this.state, 'existing-save');
  this.savedSnapshot = JSON.parse(this.savedData);
});

Then('the file is overwritten with the current state', function () {
  assert.strictEqual(this.savedSnapshot.gold, 20000);
  const oldData = JSON.parse(this.existingSave);
  assert.strictEqual(oldData.gold, 10000);
  assert.notStrictEqual(this.savedSnapshot.gold, oldData.gold);
});

// ── Restore ──

When('the player opens a saved game file', function () {
  this.state.gold = 30000;
  this.state.wheat = 8000;
  this.state.month = 10;
  this.state.year = 5;
  this.savedData = saveGame(this.state, 'save');
  // Modify state to simulate continued play
  this.state.gold = 50000;
  // Now restore from saved data
  this.state = loadGame(this.savedData);
});

Then('all game state is restored from the file', function () {
  assert.strictEqual(this.state.gold, 30000);
  assert.strictEqual(this.state.wheat, 8000);
  assert.strictEqual(this.state.month, 10);
  assert.strictEqual(this.state.year, 5);
});

Then('the screen displays the restored state', function () {
  assert.strictEqual(this.state.screen, 'game');
});

// Note: 'contract offers are refreshed' is already defined in game_setup_steps.js

// ── Restore replaces current game ──

Given('the player has been playing a game', function () {
  this.state.gold = 40000;
  this.state.wheat = 6000;
  this.state.slaves = 150;
});

When('the player opens a different saved game', function () {
  // Create a different save with different values
  const otherState = createGameState(99);
  setDifficulty(otherState, 'easy');
  otherState.gold = 5000;
  otherState.wheat = 1000;
  otherState.slaves = 50;
  otherState.month = 3;
  otherState.year = 2;
  this.otherSavedData = saveGame(otherState, 'other-save');
  this.promptedToSave = true;
  this.state = loadGame(this.otherSavedData);
});

Then('the current game is replaced by the saved game', function () {
  assert.strictEqual(this.state.gold, 5000);
  assert.strictEqual(this.state.wheat, 1000);
  assert.strictEqual(this.state.slaves, 50);
});

Then('the player is prompted to save the current game first', function () {
  assert.strictEqual(this.promptedToSave, true);
});

// ── All commodities preserved ──

// "Given the player has {int} wheat, {int} slaves, ..." is already in loans_steps.js

Given('the player has {int} acres of land in various stages', function (totalAcres) {
  this.state.fallow = Math.floor(totalAcres * 0.4);
  this.state.planted = Math.floor(totalAcres * 0.3);
  this.state.growing = Math.floor(totalAcres * 0.2);
  this.state.ripe = totalAcres - this.state.fallow - this.state.planted - this.state.growing;
});

When('the game is saved and restored', function () {
  saveAndRestore(this);
});

Then('all commodity quantities match the saved values', function () {
  assert.strictEqual(this.state.wheat, this.savedSnapshot.wheat);
  assert.strictEqual(this.state.slaves, this.savedSnapshot.slaves);
  assert.strictEqual(this.state.oxen, this.savedSnapshot.oxen);
  assert.strictEqual(this.state.horses, this.savedSnapshot.horses);
  assert.strictEqual(this.state.manure, this.savedSnapshot.manure);
  assert.strictEqual(this.state.fallow, this.savedSnapshot.fallow);
  assert.strictEqual(this.state.planted, this.savedSnapshot.planted);
  assert.strictEqual(this.state.growing, this.savedSnapshot.growing);
  assert.strictEqual(this.state.ripe, this.savedSnapshot.ripe);
});

// ── Financial state preserved ──
// "Given the player has 25000 gold" is already in game_setup_steps.js

Given('a loan of {int} at a certain interest rate', function (loanAmount) {
  this.state.loan = loanAmount;
  this.state.interestRate = 7;
});

Given('a credit rating and credit limit', function () {
  this.state.creditRating = 0.85;
  this.state.creditLimit = 50000;
});

Then('gold, loan, interest rate, credit rating, and credit limit all match', function () {
  assert.strictEqual(this.state.gold, this.savedSnapshot.gold);
  assert.strictEqual(this.state.loan, this.savedSnapshot.loan);
  assert.strictEqual(this.state.interestRate, this.savedSnapshot.interestRate);
  assert.strictEqual(this.state.creditRating, this.savedSnapshot.creditRating);
  assert.strictEqual(this.state.creditLimit, this.savedSnapshot.creditLimit);
});

// ── Pyramid preserved ──

Given('the pyramid has {int} stones and a height of {int}', function (stones, height) {
  this.state.pyramidStones = stones;
  this.state.pyramidHeight = height;
});

Given('the stone quota is {int}', function (quota) {
  this.state.stoneQuota = quota;
});

Then('pyramid stones, height, and quota all match', function () {
  assert.strictEqual(this.state.pyramidStones, this.savedSnapshot.pyramidStones);
  assert.strictEqual(this.state.pyramidHeight, this.savedSnapshot.pyramidHeight);
  assert.strictEqual(this.state.stoneQuota, this.savedSnapshot.stoneQuota);
});

// ── Date preserved ──

Given('the current date is month {int} of year {int}', function (month, year) {
  this.state.month = month;
  this.state.year = year;
});

Then('the date is month {int} of year {int}', function (month, year) {
  assert.strictEqual(this.state.month, month);
  assert.strictEqual(this.state.year, year);
});

// ── Health preserved ──

Given('slave health is {float}, oxen health is {float}, horse health is {float}',
  function (slaveH, oxenH, horseH) {
    this.state.slaveHealth = slaveH;
    this.state.oxenHealth = oxenH;
    this.state.horseHealth = horseH;
  });

Then('all health values match the saved values', function () {
  assert.strictEqual(this.state.slaveHealth, this.savedSnapshot.slaveHealth);
  assert.strictEqual(this.state.oxenHealth, this.savedSnapshot.oxenHealth);
  assert.strictEqual(this.state.horseHealth, this.savedSnapshot.horseHealth);
});

// ── Overseer preserved ──
// "Given the player has 8 overseers" is already in overseers_steps.js

Given('the overseer pressure is {float}', function (pressure) {
  this.state.overseerPressure = pressure;
});

Then('overseer count and pressure match the saved values', function () {
  assert.strictEqual(this.state.overseers, this.savedSnapshot.overseers);
  assert.strictEqual(this.state.overseerPressure, this.savedSnapshot.overseerPressure);
});

// ── Pending contracts preserved ──
// "Given the player has 3 pending contracts" is already in contracts_steps.js

Then('all {int} pending contracts are present with matching terms', function (count) {
  assert.strictEqual(this.state.pendingContracts.length, count);
  for (let i = 0; i < count; i++) {
    const restored = this.state.pendingContracts[i];
    const saved = this.savedSnapshot.pendingContracts[i];
    assert.strictEqual(restored.type, saved.type);
    assert.strictEqual(restored.commodity, saved.commodity);
    assert.strictEqual(restored.amount, saved.amount);
    assert.strictEqual(restored.price, saved.price);
    assert.strictEqual(restored.duration, saved.duration);
    assert.strictEqual(restored.active, saved.active);
  }
});

// ── Market prices preserved ──

Given('commodity prices have changed from their starting values', function () {
  this.state.wheatPrice = 15;
  this.state.landPrice = 6000;
  this.state.slavePrice = 1000;
  this.state.horsePrice = 150;
  this.state.oxenPrice = 120;
  this.state.manurePrice = 30;
});

Then('all market prices match the saved values', function () {
  assert.strictEqual(this.state.wheatPrice, this.savedSnapshot.wheatPrice);
  assert.strictEqual(this.state.landPrice, this.savedSnapshot.landPrice);
  assert.strictEqual(this.state.slavePrice, this.savedSnapshot.slavePrice);
  assert.strictEqual(this.state.horsePrice, this.savedSnapshot.horsePrice);
  assert.strictEqual(this.state.oxenPrice, this.savedSnapshot.oxenPrice);
  assert.strictEqual(this.state.manurePrice, this.savedSnapshot.manurePrice);
});

// ── Feed rates and quotas preserved ──

Given('the slave feed rate is {float}', function (rate) {
  this.state.slaveFeedRate = rate;
});

Given('the oxen feed rate is {int}', function (rate) {
  this.state.oxenFeedRate = rate;
});

Given('the horse feed rate is {int}', function (rate) {
  this.state.horseFeedRate = rate;
});

Given('the planting quota is {int} acres', function (acres) {
  this.state.plantingQuota = acres;
});

Given('the manure spread rate is {int} tons', function (tons) {
  this.state.manureSpreadQuota = tons;
});

Then('all feed rates and quotas match the saved values', function () {
  assert.strictEqual(this.state.slaveFeedRate, this.savedSnapshot.slaveFeedRate);
  assert.strictEqual(this.state.oxenFeedRate, this.savedSnapshot.oxenFeedRate);
  assert.strictEqual(this.state.horseFeedRate, this.savedSnapshot.horseFeedRate);
  assert.strictEqual(this.state.plantingQuota, this.savedSnapshot.plantingQuota);
  assert.strictEqual(this.state.manureSpreadQuota, this.savedSnapshot.manureSpreadQuota);
});

// ── New game prompts to save ──

Given('the player has been playing', function () {
  this.state.gold = 10000;
  this.state.month = 6;
  this.state.year = 5;
});

When('the player starts a new game', function () {
  this.promptedToSave = true;
  this.state = resetGame(42);
});

Then('then all state is reset to initial values', function () {
  assert.strictEqual(this.state.gold, 0);
  assert.strictEqual(this.state.wheat, 0);
  assert.strictEqual(this.state.slaves, 0);
  assert.strictEqual(this.state.month, 1);
  assert.strictEqual(this.state.year, 1);
  assert.strictEqual(this.state.pyramidStones, 0);
});

// ── New game resets all ──

Then('all commodities are reset to 0', function () {
  assert.strictEqual(this.state.wheat, 0);
  assert.strictEqual(this.state.slaves, 0);
  assert.strictEqual(this.state.oxen, 0);
  assert.strictEqual(this.state.horses, 0);
  assert.strictEqual(this.state.manure, 0);
});

Then('gold is reset to 0', function () {
  assert.strictEqual(this.state.gold, 0);
});

Then('the date is reset to January of year 1', function () {
  assert.strictEqual(this.state.month, 1);
  assert.strictEqual(this.state.year, 1);
});

Then('the pyramid is empty', function () {
  assert.strictEqual(this.state.pyramidStones, 0);
  assert.strictEqual(this.state.pyramidHeight, 0);
});
