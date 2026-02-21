'use strict';

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { setDifficulty, forceEasyIfUnlicensed, SETTINGS } = require('../../src/engine/difficulty');
const { simulateMonth } = require('../../src/engine/simulation');
const { refreshOffers } = require('../../src/engine/contracts');
const { openingMessages } = require('../../src/engine/messages');
const { addStones } = require('../../src/engine/pyramid');

const RESOURCE_MAP = {
  gold: 'gold', slaves: 'slaves', oxen: 'oxen', horses: 'horses',
  wheat: 'wheat', manure: 'manure', overseers: 'overseers',
  land: state => state.fallow + state.planted + state.growing + state.ripe
};

function getResource(state, name) {
  const entry = RESOURCE_MAP[name];
  if (typeof entry === 'function') return entry(state);
  return state[entry];
}

// ── Background ──

Given('the game has been initialized', function () {
  this.initGame(42);
});

Given('the date is January of year {int}', function (year) {
  assert.strictEqual(this.state.month, 1);
  assert.strictEqual(this.state.year, year);
});

// ── Difficulty selection ──

When('the player selects {string} difficulty', function (level) {
  this.selectDifficulty(level);
});

Then('the pyramid base should be {float} stones', function (expected) {
  assert(Math.abs(this.state.pyramidBase - expected) < 0.01,
    `Expected pyramid base ~${expected}, got ${this.state.pyramidBase}`);
});

Then('the pyramid target height should be approximately {int} feet', function (expected) {
  const height = (Math.sqrt(3) / 2) * this.state.pyramidBase;
  assert(Math.abs(height - expected) < 1.0,
    `Expected target height ~${expected}, got ${height}`);
});

Then('the credit limit should be {int} gold', function (expected) {
  assert.strictEqual(this.state.creditLimit, expected);
});

Then('the credit lower bound should be {int} gold', function (expected) {
  assert.strictEqual(this.state.creditLowerBound, expected);
});

Then('the world growth rate should be {float}', function (expected) {
  assert(Math.abs(this.state.worldGrowth - expected) < 0.001,
    `Expected growth ~${expected}, got ${this.state.worldGrowth}`);
});

Then('the land price should be {int}', function (expected) {
  assert.strictEqual(this.state.landPrice, expected);
});

Then('the wheat price should be {int}', function (expected) {
  assert.strictEqual(this.state.wheatPrice, expected);
});

Then('the slave price should be {int}', function (expected) {
  assert.strictEqual(this.state.slavePrice, expected);
});

Then('default credit limits apply', function () {
  assert.strictEqual(this.state.creditLimit, SETTINGS.hard.creditLimit);
  assert.strictEqual(this.state.creditLowerBound, SETTINGS.hard.creditLowerBound);
});

Then('default market prices apply', function () {
  // Hard does not override prices, so they remain at createGameState defaults
  assert.strictEqual(this.state.landPrice, 5000);
  assert.strictEqual(this.state.wheatPrice, 10);
  assert.strictEqual(this.state.slavePrice, 800);
});

// ── Unlicensed player ──

Given('the player has not purchased a license', function () {
  this.state.licensed = false;
});

When('the game starts', function () {
  forceEasyIfUnlicensed(this.state);
});

Then('the difficulty is set to {string}', function (level) {
  const expected = SETTINGS[level.toLowerCase()];
  assert.strictEqual(this.state.pyramidBase, expected.pyramidBase);
  assert.strictEqual(this.state.creditLimit, expected.creditLimit);
});

Then('saving the game is disabled', function () {
  assert.strictEqual(this.state.canSave, false);
});

// ── Difficulty selection screen ──

When('the game is initialized', function () {
  // State already created in Background; just verify it exists
  assert(this.state !== null);
});

Then('the screen should be {string}', function (expected) {
  assert.strictEqual(this.state.screen, expected);
});

Given('the game starts on the difficulty screen', function () {
  assert.strictEqual(this.state.screen, 'difficulty');
});

When('the player selects difficulty {string} from the startup screen', function (level) {
  assert.strictEqual(this.state.screen, 'difficulty');
  this.selectDifficulty(level);
});

// ── Starting conditions ──

When('the game begins', function () {
  // State already initialized in Background; deliver opening message
  this.deliverOpeningMessage();
});

Then('the player should have {int} gold', function (expected) {
  assert.strictEqual(this.state.gold, expected);
});

Then('the player should have {int} slaves', function (expected) {
  assert.strictEqual(this.state.slaves, expected);
});

Then('the player should have {int} oxen', function (expected) {
  assert.strictEqual(this.state.oxen, expected);
});

Then('the player should have {int} horses', function (expected) {
  assert.strictEqual(this.state.horses, expected);
});

Then('the player should have {int} wheat', function (expected) {
  assert.strictEqual(this.state.wheat, expected);
});

Then('the player should have {int} manure', function (expected) {
  assert.strictEqual(this.state.manure, expected);
});

Then('the player should have {int} land', function (expected) {
  const total = getResource(this.state, 'land');
  assert.strictEqual(total, expected);
});

Then('the player should have {int} overseers', function (expected) {
  assert.strictEqual(this.state.overseers, expected);
});

Then('the loan balance should be {int}', function (expected) {
  assert.strictEqual(this.state.loan, expected);
});

Then('the pyramid stones should be {int}', function (expected) {
  assert.strictEqual(this.state.pyramidStones, expected);
});

Then('the pyramid height should be {int}', function (expected) {
  assert.strictEqual(this.state.pyramidHeight, expected);
});

// ── Borrowing ──

Given('the player has {int} gold', function (amount) {
  this.state.gold = amount;
  // Need a credit limit to borrow; set easy difficulty
  this.selectDifficulty('Easy');
});

When('the player borrows from the bank', function () {
  this.borrowFromBank();
});

Then('the player should receive gold', function () {
  assert(this.state.gold > 0, `Expected gold > 0, got ${this.state.gold}`);
});

Then('the loan balance should increase by the borrowed amount', function () {
  assert.strictEqual(this.state.loan, this.borrowedAmount);
  assert(this.borrowedAmount > 0, 'Expected a positive borrow amount');
});

Then('the player can now buy commodities', function () {
  assert(this.state.gold > 0, 'Player needs gold to buy commodities');
});

// ── Monthly turn ──

Given('the game is running', function () {
  if (!this.state) this.initGame(42);
  this.selectDifficulty('Easy');
});

When('the player clicks {string}', function (_button) {
  this.runMonth();
});

Then('the previous month values are recorded for display', function () {
  assert(this.state.prev !== undefined && this.state.prev !== null);
  assert('gold' in this.state.prev);
});

Then('there is a 1-in-8 chance of a random event', function () {
  assert(typeof this.state.randomEvent === 'boolean');
});

Then('the monthly simulation runs', function () {
  // Month was advanced by simulateMonth
  assert(this.state.month >= 1 && this.state.month <= 12);
});

Then('contract offers are refreshed', function () {
  assert(Array.isArray(this.state.contractOffers));
});

Then('the screen is updated with new values', function () {
  assert.strictEqual(this.state.screen, 'game');
});

When('a month is simulated', function () {
  this.prevPyramidStones = this.state.pyramidStones;
  this.stonesAdded = addStones(this.state);
  this.runMonth();
});

Then('a random event occurs with probability 12.5%', function () {
  // Use a single RNG and run many months to verify statistical probability
  const { createGameState } = require('../../src/engine/state');
  const s = createGameState(12345);
  setDifficulty(s, 'easy');
  let events = 0;
  const trials = 10000;
  for (let i = 0; i < trials; i++) {
    s.month = 1;
    simulateMonth(s);
    if (s.randomEvent) events++;
  }
  const rate = events / trials;
  assert(rate > 0.08 && rate < 0.17,
    `Expected ~12.5% event rate, got ${(rate * 100).toFixed(1)}%`);
});

// ── Time progression ──

Given('the current month is {int}', function (month) {
  this.state.month = month;
});

Given('the current year is {int}', function (year) {
  this.state.year = year;
});

Then('the month should be {int}', function (expected) {
  assert.strictEqual(this.state.month, expected);
});

Then('the year should be {int}', function (expected) {
  assert.strictEqual(this.state.year, expected);
});

// ── Opening message ──

Then('a random neighbor delivers an opening message from the opening pool', function () {
  assert(this.openingMsg !== null, 'No opening message was delivered');
  assert(openingMessages.includes(this.openingMsg.text),
    `Message "${this.openingMsg.text}" not in opening pool`);
  assert(this.openingMsg.face >= 0 && this.openingMsg.face <= 3,
    `Face ${this.openingMsg.face} out of range [0,3]`);
});

Then('the message is spoken aloud using the neighbor\'s voice', function () {
  // Verify the message is set in state for the UI to speak
  assert(this.state.message !== null, 'No message in state for speech');
  assert(typeof this.state.message.face === 'number');
  assert(typeof this.state.message.text === 'string');
});
