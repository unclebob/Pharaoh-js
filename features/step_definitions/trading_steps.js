'use strict';

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const {
  buyCommodity, sellCommodity, keepCommodity,
  buyLivestock, sellLand
} = require('../../src/engine/trading');
const {
  supplyLimitMessages, demandLimitMessages,
  transactionSuccessMessages, insufficientFundsMessages,
  tradingInputErrorMessages, getTradingInputErrorMessage
} = require('../../src/engine/messages');

// ── Buy / Sell Operations ──

Given('wheat costs {int} per bushel', function (price) {
  this.state.wheatPrice = price;
});

Given('the wheat supply is {int}', function (supply) {
  this.state.supply.wheat = supply;
});

When('the player buys {int} bushels of wheat', function (amount) {
  this.prevWheat = this.state.wheat;
  this.prevGold = this.state.gold;
  this.prevSupply = this.state.supply.wheat;
  this.result = buyCommodity(this.state, 'wheat', amount);
});

Then("the player's wheat should increase by {int}", function (expected) {
  assert.strictEqual(this.state.wheat - this.prevWheat, expected);
});

Then("the player's gold should decrease by {int}", function (expected) {
  assert.strictEqual(this.prevGold - this.state.gold, expected);
});

Then('the wheat supply should decrease by {int}', function (expected) {
  assert.strictEqual(this.prevSupply - this.state.supply.wheat, expected);
});

When('the player sells {int} bushels of wheat at {int} per bushel', function (amount, price) {
  this.state.wheatPrice = price;
  this.state.demand.wheat = Math.max(this.state.demand.wheat || 0, 100000);
  this.state.supply.wheat = this.state.supply.wheat || 0;
  this.prevWheat = this.state.wheat;
  this.prevGold = this.state.gold;
  this.prevSupply = this.state.supply.wheat;
  this.result = sellCommodity(this.state, 'wheat', amount);
});

Then("the player's wheat should decrease by {int}", function (expected) {
  assert.strictEqual(this.prevWheat - this.state.wheat, expected);
});

Then("the player's gold should increase by {int}", function (expected) {
  assert.strictEqual(this.state.gold - this.prevGold, expected);
});

Then('the wheat supply should increase by {int}', function (expected) {
  assert.strictEqual(this.state.supply.wheat - this.prevSupply, expected);
});

// ── Cannot sell more than owned ──

When('the player tries to sell {int} bushels of wheat', function (amount) {
  this.result = sellCommodity(this.state, 'wheat', amount);
});

Then('the transaction is rejected', function () {
  assert.strictEqual(this.result.ok, false);
});

Then('a message shows the player owns {int} bushels', function (owned) {
  const { sellMoreThanOwnedMessages } = require('../../src/engine/messages');
  const isFromPool = sellMoreThanOwnedMessages.some(
    tmpl => this.result.message.includes(tmpl.replace('%f', owned.toString()).slice(0, 20))
  );
  assert(isFromPool,
    `Expected sell-more-than-owned message, got: ${this.result.message}`);
});

// ── Cannot spend more gold than available ──

When('the player tries to buy {int} bushels of wheat', function (amount) {
  this.state.wheatPrice = this.state.wheatPrice || 10;
  this.result = buyCommodity(this.state, 'wheat', amount);
});

Then('a message shows the player can afford {int} bushels', function (affordable) {
  assert(this.result.message.includes(affordable.toString()),
    `Expected message to include ${affordable}, got: ${this.result.message}`);
});

// ── Supply and Demand Limits ──

Then('only {int} bushels are purchased', function (expected) {
  assert.strictEqual(this.result.available, expected);
  assert.strictEqual(this.result.capped, true);
});

Then('a message indicates the market is out of stock', function () {
  const matchesPool = demandLimitMessages.some(template => {
    const filled = template.replace('%.0f', this.result.available.toString());
    return filled === this.result.message;
  });
  assert(matchesPool, `Message not from demand-limit pool: ${this.result.message}`);
});

Given('the wheat demand is {int}', function (demand) {
  this.state.demand.wheat = demand;
});

When('the player tries to sell more than {int} bushels of wheat', function (limit) {
  this.state.wheat = limit + 1000;
  this.state.supply.wheat = 0;
  this.result = sellCommodity(this.state, 'wheat', limit + 100);
});

Then('the sale is capped at the maximum the market will absorb', function () {
  assert.strictEqual(this.result.capped, true);
  const demandCap = Math.floor(this.state.demand.wheat * 1.1);
  assert(this.result.maxAccepted <= demandCap,
    `maxAccepted ${this.result.maxAccepted} > demandCap ${demandCap}`);
});

// ── Keep / Acquire Mode ──

Given('the player has {int} slaves', function (count) {
  this.state.slaves = count;
  this.state.gold = this.state.gold || 1000000;
  this.state.slavePrice = this.state.slavePrice || 1000;
  this.state.supply.slave = Math.max(this.state.supply.slave || 0, 10000);
  this.state.demand.slave = Math.max(this.state.demand.slave || 0, 10000);
});

When('the player acquires {int} slaves', function (target) {
  this.prevSlaves = this.state.slaves;
  this.result = keepCommodity(this.state, 'slaves', target);
});

Then('the system buys {int} additional slaves', function (expected) {
  assert.strictEqual(this.state.slaves - this.prevSlaves, expected);
});

When('the player keeps {int} bushels of wheat', function (target) {
  this.prevWheat = this.state.wheat;
  this.state.demand.wheat = 100000;
  this.state.supply.wheat = 0;
  this.result = keepCommodity(this.state, 'wheat', target);
});

Then('the system sells {int} bushels of wheat', function (expected) {
  assert.strictEqual(this.prevWheat - this.state.wheat, expected);
});

// ── Health-Adjusted Sell Price (Scenario Outline) ──

Given('the player has {int} horses', function (count) {
  this.state.horses = count;
  this.state.gold = this.state.gold || 0;
  this.state.demand.horse = Math.max(this.state.demand.horse || 0, 100000);
  this.state.supply.horse = 0;
});

Given('the player has {int} oxen', function (count) {
  this.state.oxen = count;
  this.state.gold = this.state.gold || 0;
  this.state.demand.oxen = Math.max(this.state.demand.oxen || 0, 100000);
  this.state.supply.oxen = 0;
});

Given('slaves health is {float}', function (health) {
  this.state.slaveHealth = health;
});

Given('horses health is {float}', function (health) {
  this.state.horseHealth = health;
});

// "oxen health is {float}" is already defined in health_steps.js; reuse it.

Given('the slaves market price is {int}', function (price) {
  this.state.slavePrice = price;
});

Given('the horses market price is {int}', function (price) {
  this.state.horsePrice = price;
});

Given('the oxen market price is {int}', function (price) {
  this.state.oxenPrice = price;
});

When('the player sells {int} slaves', function (count) {
  this.prevGold = this.state.gold;
  this.result = sellCommodity(this.state, 'slaves', count);
});

When('the player sells {int} horses', function (count) {
  this.prevGold = this.state.gold;
  this.result = sellCommodity(this.state, 'horses', count);
});

When('the player sells {int} oxen', function (count) {
  this.prevGold = this.state.gold;
  this.result = sellCommodity(this.state, 'oxen', count);
});

Then('the gold received is {int} * {int} * {float}', function (count, price, health) {
  const expected = count * price * health;
  const received = this.state.gold - this.prevGold;
  assert(Math.abs(received - expected) < 0.01,
    `Expected ${expected}, got ${received}`);
});

// ── Health of Purchased Livestock ──

Given('the player has {int} slaves with health {float}', function (count, health) {
  this.state.slaves = count;
  this.state.slaveHealth = health;
  this.state.gold = 1000000;
  this.state.slavePrice = this.state.slavePrice || 1000;
  this.state.supply.slave = Math.max(this.state.supply.slave || 0, 10000);
  this.state.demand.slave = Math.max(this.state.demand.slave || 0, 10000);
});

When('the player buys {int} slaves', function (amount) {
  this.boughtCount = amount;
  this.result = buyLivestock(this.state, 'slaves', amount);
  this.newLivestockHealth = this.result.newHealth;
});

Then('the new slaves have nominal health of approximately {float}', function (expected) {
  assert(this.newLivestockHealth > expected - 0.15 && this.newLivestockHealth < expected + 0.15,
    `Expected ~${expected}, got ${this.newLivestockHealth}`);
});

Then('the blended slave health is \\({int} * {float} + {int} * {float}) \\/ {int}', function (
  newCount, newHealth, oldCount, oldHealth, total
) {
  const expectedBlended = (newCount * this.newLivestockHealth + oldCount * oldHealth) / total;
  assert(Math.abs(this.state.slaveHealth - expectedBlended) < 0.01,
    `Expected blended health ~${expectedBlended}, got ${this.state.slaveHealth}`);
});

// ── Selling Land with Crops ──

// Use a single step for "the player has {int} acres of planted land"
// used as both Given and Then in the trading feature.
Given('the player has {int} acres of planted land', function (acres) {
  if (this.result && this.result.ok !== undefined) {
    // Used as assertion (Then context)
    assert.strictEqual(this.state.planted, acres);
  } else {
    // Used as setup (Given context)
    this.state.planted = acres;
  }
});

Given('those acres have {int} bushels of wheat sewn', function (bushels) {
  this.state.wheatSewn = bushels;
  this.prevWheatSewn = bushels;
});

When('the player sells {int} acres of planted land', function (acres) {
  this.result = sellLand(this.state, 'planted', acres);
});

Then('{int}% of the wheat sewn on that land is destroyed', function (percent) {
  const expectedDestroyed = this.prevWheatSewn * (percent / 100);
  assert(Math.abs(this.result.cropsDestroyed - expectedDestroyed) < 0.01,
    `Expected ${expectedDestroyed} destroyed, got ${this.result.cropsDestroyed}`);
});

Then('{int} bushels remain sewn', function (expected) {
  assert(Math.abs(this.state.wheatSewn - expected) < 0.01,
    `Expected ${expected} sewn, got ${this.state.wheatSewn}`);
});

// "the player has {int} acres of fallow land" is defined in planting_steps.js.
// The planting_steps version sets fallow and resets other land types.
// For trading, when used as Then (assertion), the side effects are harmless
// since the assertion only checks fallow.

When('the player sells {int} acres of fallow land', function (acres) {
  this.prevWheatSewn = this.state.wheatSewn;
  this.prevWheatGrowing = this.state.wheatGrowing;
  this.prevWheatRipe = this.state.wheatRipe;
  this.result = sellLand(this.state, 'fallow', acres);
});

Then('no crops are affected', function () {
  assert.strictEqual(this.state.wheatSewn, this.prevWheatSewn);
  assert.strictEqual(this.state.wheatGrowing, this.prevWheatGrowing);
  assert.strictEqual(this.state.wheatRipe, this.prevWheatRipe);
});

// ── Trading Messages ──

Given('the market can only absorb {int} bushels of wheat', function (capacity) {
  this.state.demand.wheat = capacity;
  this.state.supply.wheat = Math.floor(capacity * 1.1) - capacity;
  this.marketCapacity = capacity;
  this.state.wheat = 10000;
});

When('the player tries to sell {int} bushels', function (amount) {
  this.result = sellCommodity(this.state, 'wheat', amount);
});

Then('a random supply-limit message is displayed from the pool', function () {
  assert(typeof this.result.message === 'string');
  const matchesPool = supplyLimitMessages.some(template => {
    const filled = template.replace('%.0f', (this.result.maxAccepted || 0).toString());
    return filled === this.result.message;
  });
  assert(matchesPool, `Message not from supply-limit pool: ${this.result.message}`);
});

Then('the message includes the maximum amount the market will accept', function () {
  assert(this.result.message.includes((this.result.maxAccepted || 0).toString()),
    `Expected message to include ${this.result.maxAccepted}, got: ${this.result.message}`);
});

Given('the market only has {int} bushels in stock', function (supply) {
  this.state.supply.wheat = supply;
  this.state.wheatPrice = 10;
  this.state.gold = 1000000;
  this.marketStock = supply;
});

When('the player tries to buy {int} bushels', function (amount) {
  this.result = buyCommodity(this.state, 'wheat', amount);
});

Then('a random demand-limit message is displayed from the pool', function () {
  assert(typeof this.result.message === 'string');
  const matchesPool = demandLimitMessages.some(template => {
    const filled = template.replace('%.0f', (this.result.available || 0).toString());
    return filled === this.result.message;
  });
  assert(matchesPool, `Message not from demand-limit pool: ${this.result.message}`);
});

Then('the message includes the amount available', function () {
  assert(this.result.message.includes(this.marketStock.toString()),
    `Expected message to include ${this.marketStock}, got: ${this.result.message}`);
});

Given('the player cannot afford the purchase', function () {
  this.state.gold = 50;
  this.state.wheatPrice = 10;
  this.state.supply.wheat = 10000;
  this.maxAfford = Math.floor(this.state.gold / this.state.wheatPrice);
});

When('the player attempts to buy', function () {
  this.result = buyCommodity(this.state, 'wheat', 100);
});

Then('a random insufficient-funds message is displayed from the pool', function () {
  assert(typeof this.result.message === 'string');
  const matchesPool = insufficientFundsMessages.some(template => {
    const filled = template.replace('%.0f', (this.result.maxAffordable || 0).toString());
    return filled === this.result.message;
  });
  assert(matchesPool, `Message not from insufficient-funds pool: ${this.result.message}`);
});

Then('the message includes the maximum the player can afford', function () {
  assert(this.result.message.includes(this.maxAfford.toString()),
    `Expected message to include ${this.maxAfford}, got: ${this.result.message}`);
});

When('a buy or sell transaction completes normally', function () {
  this.state.gold = 100000;
  this.state.wheatPrice = 10;
  this.state.supply.wheat = 10000;
  this.state.demand.wheat = 100000;
  this.result = buyCommodity(this.state, 'wheat', 10);
});

Then('a random success message is displayed from the pool', function () {
  assert(transactionSuccessMessages.includes(this.result.message),
    `Message not from success pool: ${this.result.message}`);
});

When('the player enters non-numeric text in the buy\\/sell dialog', function () {
  this.errorMessage = getTradingInputErrorMessage(this.state.rng);
});

Then('a random input-error message is displayed from the trading error pool', function () {
  assert(tradingInputErrorMessages.includes(this.errorMessage),
    `Message not from trading error pool: ${this.errorMessage}`);
});
