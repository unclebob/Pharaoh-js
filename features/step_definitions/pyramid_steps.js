'use strict';

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const {
  maxHeight, pyramidHeight,
  pyramidWork, pyramidGoldCost, isWin,
  setQuota, validateQuotaInput
} = require('../../src/engine/pyramid');
const {
  winMessages, farewellMessages,
  pyramidErrorMessages, negativePyramidErrorMessages,
  getWinMessage, getFarewellMessage,
  getPyramidErrorMessage, getNegativePyramidErrorMessage
} = require('../../src/engine/messages');

const SQRT3 = Math.sqrt(3);

// ── Geometry ──

Given('the pyramid base is {float} stones', function (base) {
  this.state.pyramidBase = base;
});

Given('the pyramid base is {float}', function (base) {
  this.state.pyramidBase = base;
});

Given('the difficulty is {string}', function (level) {
  this.selectDifficulty(level);
});

When('the maximum height is calculated', function () {
  this.maxHeight = maxHeight(this.state.pyramidBase);
});

Then('max height = \\(sqrt\\({int}) \\/ {int}) * {float} = approximately {int}',
  function (_a, _b, _base, expected) {
    assert(Math.abs(this.maxHeight - expected) < 1,
      `Expected max height ~${expected}, got ${this.maxHeight}`);
  });

Then('the target height is approximately {int} feet', function (expected) {
  assert(Math.abs(this.maxHeight - expected) < 1,
    `Expected target height ~${expected}, got ${this.maxHeight}`);
});

Given('the pyramid has {int} stones \\(area units)', function (area) {
  this.state.pyramidStones = area;
});

When('the height is calculated', function () {
  this.calculatedHeight = pyramidHeight(this.state.pyramidBase, this.state.pyramidStones);
});

Then('determinant = base^{int} - {int} * area \\/ sqrt\\({int})',
  function (_exp, _mult, _sq) {
    const base = this.state.pyramidBase;
    const area = this.state.pyramidStones;
    this.determinant = base * base - 4 * area / SQRT3;
    assert(this.determinant >= 0, `Determinant should be non-negative, got ${this.determinant}`);
  });

Then('height = \\(base - sqrt\\(determinant)) \\/ \\({int} \\/ sqrt\\({int}))',
  function (_num, _sq) {
    const base = this.state.pyramidBase;
    const expected = (base - Math.sqrt(this.determinant)) / (2 / SQRT3);
    assert(Math.abs(this.calculatedHeight - expected) < 0.001,
      `Expected height ~${expected}, got ${this.calculatedHeight}`);
  });

Given('the area exceeds \\(sqrt\\({int})\\/{int}) * base^{int}', function (_a, _b, _c) {
  const base = this.state.pyramidBase;
  this.state.pyramidStones = (SQRT3 / 4) * base * base + 1000;
});

Then('the height equals the maximum for that base', function () {
  const max = maxHeight(this.state.pyramidBase);
  assert(Math.abs(this.calculatedHeight - max) < 0.001,
    `Expected height = max ${max}, got ${this.calculatedHeight}`);
});

// ── Stone Laying ──

Given('the pyramid quota is {int} stones', function (quota) {
  this.state.stoneQuota = quota;
});

Given('the pyramid quota is {int}', function (quota) {
  this.state.stoneQuota = quota;
});

Given('slave efficiency is {float}', function (eff) {
  this.state.slaveEfficiency = eff;
});

Then('stones added = {int} * {float} = {int}', function (_quota, _eff, expected) {
  assert.strictEqual(this.stonesAdded, expected);
});

Then('the pyramid stone count increases by {int}', function (expected) {
  assert.strictEqual(this.state.pyramidStones, this.prevPyramidStones + expected);
});

Then('no stones are added to the pyramid', function () {
  assert.strictEqual(this.stonesAdded, 0);
});

// ── Pyramid Work ──

Given('the current pyramid height is {int}', function (h) {
  this.currentHeight = h;
});

Given('the projected new height is {int}', function (h) {
  this.projectedHeight = h;
});

Given('the average height is ceil\\(\\({int} + {int}) \\/ {int}) = {int}',
  function (_a, _b, _c, avg) {
    const computed = Math.ceil((this.currentHeight + this.projectedHeight) / 2);
    assert.strictEqual(computed, avg);
  });

When('pyramid work is calculated', function () {
  this.pyramidWorkResult = pyramidWork(
    this.state.stoneQuota, this.currentHeight, this.projectedHeight);
});

Then('pyramid work = {int} * {int} * {int} = {int} man-hours per day',
  function (_q, _h, _m, expected) {
    assert.strictEqual(this.pyramidWorkResult, expected);
  });

// ── Gold Cost ──

Given('the average pyramid height is {int}', function (h) {
  this.avgPyramidHeight = h;
});

Given('stones added this month is {int}', function (n) {
  this.stonesAddedThisMonth = n;
});

When('pyramid costs are deducted', function () {
  this.goldCost = pyramidGoldCost(this.avgPyramidHeight, this.stonesAddedThisMonth);
  this.state.gold -= this.goldCost;
});

Then('gold decreases by {int} * {int} = {int}', function (_h, _s, expected) {
  assert.strictEqual(this.goldCost, expected);
});

// ── Quota Setting ──

When('the player sets the pyramid quota to {int}', function (quota) {
  setQuota(this.state, quota);
});

Then('the pyramid quota should be {int}', function (expected) {
  assert.strictEqual(this.state.stoneQuota, expected);
});

When('the player tries to set the pyramid quota to {int}', function (quota) {
  this.quotaResult = setQuota(this.state, quota);
});

Then('the input is rejected', function () {
  assert.strictEqual(this.quotaResult.valid, false);
});

// ── Win Condition ──

Given('the maximum height is approximately {int}', function (h) {
  const actual = maxHeight(this.state.pyramidBase);
  assert(Math.abs(actual - h) < 1, `Expected max ~${h}, got ${actual}`);
});

When('the pyramid height reaches within {int} unit of the maximum', function (_tolerance) {
  const max = maxHeight(this.state.pyramidBase);
  this.state.pyramidHeight = max;
  this.winResult = isWin(this.state.pyramidHeight, max);
});

// Single unified step for "the player wins the game" used as both When and Then
Then('the player wins the game', function () {
  // When used as "When the player wins the game", generate messages
  if (this.winResult === undefined) {
    this.winResult = true;
  }
  this.winMsg = getWinMessage(this.state.rng);
  this.farewellMsg = getFarewellMessage(this.state.rng);
  assert.strictEqual(this.winResult, true);
});

Then('a victory message is displayed', function () {
  assert(winMessages.includes(this.winMsg), `Victory message not in pool: ${this.winMsg}`);
});

Given('the pyramid height is {int}', function (h) {
  this.state.pyramidHeight = h;
});

When('the win condition is checked', function () {
  this.currentMax = maxHeight(this.state.pyramidBase);
  this.winResult = isWin(this.state.pyramidHeight, this.currentMax);
});

Then('{int} + {int} = {int} which is less than the maximum of {int}',
  function (h, one, sum, max) {
    assert.strictEqual(h + one, sum);
    assert(sum <= max, `Expected ${sum} <= ${max}`);
  });

Then('the game continues', function () {
  assert.strictEqual(this.winResult, false);
});

// ── Messages ──

Then('a random win message is displayed from the congratulations pool', function () {
  assert(winMessages.includes(this.winMsg),
    `Win message not in pool: ${this.winMsg}`);
});

Then('a farewell message is displayed from the farewell pool', function () {
  assert(farewellMessages.includes(this.farewellMsg),
    `Farewell message not in pool: ${this.farewellMsg}`);
});

When('the player enters non-numeric text in the pyramid quota dialog', function () {
  this.validateResult = validateQuotaInput('abc');
  this.errorMsg = getPyramidErrorMessage(this.state.rng);
});

Then('a random input-error message is displayed from the pyramid error pool', function () {
  assert.strictEqual(this.validateResult.valid, false);
  assert.strictEqual(this.validateResult.reason, 'invalid');
  assert(pyramidErrorMessages.includes(this.errorMsg),
    `Error message not in pool: ${this.errorMsg}`);
});

When('the player enters a negative number for pyramid quota', function () {
  this.validateResult = validateQuotaInput('-5');
  this.negErrorMsg = getNegativePyramidErrorMessage(this.state.rng);
});

Then('a random negative-input message is displayed from the pyramid error pool', function () {
  assert.strictEqual(this.validateResult.valid, false);
  assert.strictEqual(this.validateResult.reason, 'negative');
  assert(negativePyramidErrorMessages.includes(this.negErrorMsg),
    `Negative error message not in pool: ${this.negErrorMsg}`);
});
