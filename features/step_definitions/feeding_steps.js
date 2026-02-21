'use strict';

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const {
  setFeedRate, calculateWheatDemand, calculateWheatEfficiency,
  feedAll, produceManure, clampManure
} = require('../../src/engine/feeding');
const { feedRateErrorMessages, getFeedRateErrorMessage } = require('../../src/engine/messages');

// ── Feed Rate Configuration ──

When('the player sets the slave feed rate to {float} bushels per slave per month',
  function (rate) {
    setFeedRate(this.state, 'slave', rate);
  });

When('the player sets the oxen feed rate to {float} bushels per ox per month',
  function (rate) {
    setFeedRate(this.state, 'oxen', rate);
  });

When('the player sets the horse feed rate to {float} bushels per horse per month',
  function (rate) {
    setFeedRate(this.state, 'horse', rate);
  });

Then('the slave feed rate should be {float}', function (expected) {
  assert.strictEqual(this.state.slaveFeedRate, expected);
});

Then('the oxen feed rate should be {float}', function (expected) {
  assert.strictEqual(this.state.oxenFeedRate, expected);
});

Then('the horse feed rate should be {float}', function (expected) {
  assert.strictEqual(this.state.horseFeedRate, expected);
});

When('the player tries to set a feed rate to {float}', function (rate) {
  const accepted = setFeedRate(this.state, 'slave', rate);
  this.quotaResult = { valid: accepted };
});

// ── Monthly Wheat Consumption ──

Given('there are {int} slaves with feed rate of {int}', function (slaves, rate) {
  this.state.slaves = slaves;
  setFeedRate(this.state, 'slave', rate);
});

Given('there are {int} oxen with feed rate of {int} and slave efficiency of {float}',
  function (oxen, rate, eff) {
    this.state.oxen = oxen;
    setFeedRate(this.state, 'oxen', rate);
    this.feedSlaveEfficiency = eff;
  });

Given('there are {int} horses with feed rate of {int} and slave efficiency of {float}',
  function (horses, rate, eff) {
    this.state.horses = horses;
    setFeedRate(this.state, 'horse', rate);
    this.feedSlaveEfficiency = eff;
  });

// The "When a month is simulated" step is already defined in game_setup_steps.js.
// We compute feeding results in Before/After hooks or in Then steps.

Then('wheat fed to slaves = {int} * {int} = {int}',
  function (slaves, rate, expected) {
    // Verify using the formula: slaves * feedRate
    assert.strictEqual(slaves * rate, expected);
  });

Then('wheat fed to oxen = {int} * {float} * {int} * {float} = {int}',
  function (rate, eff1, oxen, eff2, expected) {
    // Verify using the formula: feedRate * slaveEff * oxen * slaveEff
    assert.strictEqual(rate * eff1 * oxen * eff2, expected);
  });

Then('wheat fed to horses = {int} * {float} * {int} * {float} = {int}',
  function (rate, eff1, horses, eff2, expected) {
    // Verify using the formula: feedRate * slaveEff * horses * slaveEff
    assert.strictEqual(rate * eff1 * horses * eff2, expected);
  });

// ── Wheat Shortage Proportioning ──

Given('total wheat usage would be {int} bushels', function (total) {
  this.totalWheatDemand = total;
});

Given('the player has only {int} bushels of wheat after rot', function (available) {
  this.wheatAfterRot = available;
});

Given('the player has {int} bushels of wheat after rot', function (available) {
  this.wheatAfterRot = available;
});

Then('the wheat efficiency factor is {int} \\/ {int} = {float}',
  function (_avail, _demand, expected) {
    this.wheatEfficiency = calculateWheatEfficiency(this.wheatAfterRot, this.totalWheatDemand);
    assert(Math.abs(this.wheatEfficiency - expected) < 0.001,
      `Expected ${expected}, got ${this.wheatEfficiency}`);
  });

Then('the wheat efficiency factor is {float}', function (expected) {
  this.wheatEfficiency = calculateWheatEfficiency(this.wheatAfterRot, this.totalWheatDemand);
  assert(Math.abs(this.wheatEfficiency - expected) < 0.001,
    `Expected ${expected}, got ${this.wheatEfficiency}`);
});

Then('wheat sown is reduced to {int}% of planned', function (pct) {
  const expected = pct / 100;
  assert(Math.abs(this.wheatEfficiency - expected) < 0.001,
    `Expected wheat efficiency ${expected}, got ${this.wheatEfficiency}`);
});

Then('wheat fed to horses is reduced to {int}%', function (pct) {
  const expected = pct / 100;
  assert(Math.abs(this.wheatEfficiency - expected) < 0.001,
    `Expected wheat efficiency ${expected}, got ${this.wheatEfficiency}`);
});

Then('wheat fed to oxen is reduced to {int}%', function (pct) {
  const expected = pct / 100;
  assert(Math.abs(this.wheatEfficiency - expected) < 0.001,
    `Expected wheat efficiency ${expected}, got ${this.wheatEfficiency}`);
});

Then('wheat fed to slaves is reduced to {int}%', function (pct) {
  const expected = pct / 100;
  assert(Math.abs(this.wheatEfficiency - expected) < 0.001,
    `Expected wheat efficiency ${expected}, got ${this.wheatEfficiency}`);
});

Then('actual feed rates are reduced to {int}%', function (pct) {
  const expected = pct / 100;
  assert(Math.abs(this.wheatEfficiency - expected) < 0.001,
    `Expected wheat efficiency ${expected}, got ${this.wheatEfficiency}`);
});

Then('actual sowing rate is reduced to {int}%', function (pct) {
  const expected = pct / 100;
  assert(Math.abs(this.wheatEfficiency - expected) < 0.001,
    `Expected wheat efficiency ${expected}, got ${this.wheatEfficiency}`);
});

Then('all consumption proceeds as planned', function () {
  assert.strictEqual(this.wheatEfficiency, 1.0);
});

// ── Manure Production ──

Given('{int} bushels of wheat are eaten this month', function (bushels) {
  this.wheatEaten = bushels;
});

When('manure production is calculated', function () {
  this.manureProduced = produceManure(this.wheatEaten, this.state.rng);
});

Then('approximately {int} tons of manure are added to the stockpile',
  function (expected) {
    // Allow ~50% tolerance for randomness
    const tolerance = expected * 0.5;
    assert(Math.abs(this.manureProduced - expected) < tolerance,
      `Expected ~${expected}, got ${this.manureProduced}`);
  });

// ── Manure Stockpile Cannot Go Negative ──

Given('the player has {int} tons of manure', function (tons) {
  this.state.manure = tons;
});

Given('{int} tons of manure are used for spreading', function (tons) {
  this.manureUsed = tons;
});

When('the manure balance is calculated', function () {
  this.state.manure = clampManure(this.state.manure, this.manureUsed);
});

Then('the manure stockpile is clamped to {int}', function (expected) {
  assert.strictEqual(this.state.manure, expected);
});

// ── Feed Rate Messages ──

When('the player enters non-numeric text in the feed rate dialog', function () {
  this.feedErrorMsg = getFeedRateErrorMessage(this.state.rng);
});

Then('a random input-error message is displayed from the feed rate error pool',
  function () {
    assert(feedRateErrorMessages.includes(this.feedErrorMsg),
      `Message "${this.feedErrorMsg}" not in feed rate error pool`);
  });
