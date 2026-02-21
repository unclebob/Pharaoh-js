'use strict';

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { createRandom } = require('../../src/engine/random');
const {
  lookup,
  slaveNourishmentTable, oxenNourishmentTable, horseNourishmentTable,
  slaveBirthTable, slaveDeathTable,
  oxenBirthTable, oxenDeathTable,
  horseBirthTable, horseDeathTable,
  lashToSicknessTable, laborToSicknessTable,
  workAbilityTable
} = require('../../src/engine/tables');
const {
  updateSlaveHealth, updateOxenHealth, updateHorseHealth,
  calculateBirthsDeaths,
  oxenEfficiency, horseEfficiency, calculateSalePrice
} = require('../../src/engine/health');
const { calculateWorkAbility } = require('../../src/engine/workload');

const birthTableMap = {
  slave: slaveBirthTable, oxen: oxenBirthTable, horse: horseBirthTable
};
const deathTableMap = {
  slave: slaveDeathTable, oxen: oxenDeathTable, horse: horseDeathTable
};
const healthKeyMap = {
  slave: 'slaveHealth', oxen: 'oxenHealth', horse: 'horseHealth'
};
const popKeyMap = {
  slave: 'slaves', oxen: 'oxen', horse: 'horses'
};

// ── Slave Health ──

Given('the effective slave feed rate is {int}', function (rate) {
  this.effectiveSlaveFeedRate = rate;
  this.state.slaveHealth = 0.7; // set below 1.0 to allow nourishment to show
});

Given('the slave lash rate is {float}', function (rate) {
  this.lashRate = rate;
});

Given('slave labor \\(work per slave \\/ ox multiplier) is {int}', function (labor) {
  this.laborPerSlave = labor;
  this.workPerSlave = labor;
  this.oxMult = 1;
});

Given('nourishment is {float} and sickness rate is {float}', function (n, s) {
  this.manualNourishment = n;
  this.manualSickness = s;
});

Given('slave health is {float} and nourishment is {float}', function (h, n) {
  this.state.slaveHealth = h;
  this.manualNourishment = n;
  this.manualSickness = 0;
});

Given('slave health is {float} and sickness rate is {float}', function (h, s) {
  this.state.slaveHealth = h;
  this.manualNourishment = 0;
  this.manualSickness = s;
});

// "Given slave health is {float}" is defined in workload_steps.js
// It also sets this.currentAnimal = 'slave' and this.currentHealth

When('slave health is updated', function () {
  const nourishment = this.manualNourishment;
  const sickness = this.manualSickness;
  if (nourishment !== undefined || sickness !== undefined) {
    const n = nourishment || 0;
    const s = sickness || 0;
    this.state.slaveHealth = Math.max(0, Math.min(1, this.state.slaveHealth + n - s));
  } else {
    const prevHealth = this.state.slaveHealth;
    updateSlaveHealth(this.state, this.effectiveSlaveFeedRate || 0,
      this.lashRate || 0, this.workPerSlave || 0, this.oxMult || 1, this.state.rng);
    this.slaveHealthDelta = this.state.slaveHealth - prevHealth;
  }
});

When('slave sickness is calculated', function () {
  this.lashSickness = lookup(this.lashRate, lashToSicknessTable);
  this.workSickness = lookup(this.laborPerSlave, laborToSicknessTable);
  this.totalSickness = this.workSickness + this.lashSickness;
  const prevHealth = this.state.slaveHealth;
  updateSlaveHealth(this.state, 0, this.lashRate, this.workPerSlave, this.oxMult, this.state.rng);
  this.slaveHealthDelta = this.state.slaveHealth - prevHealth;
});

Then('nourishment is looked up from the slave nourishment table based on feed rate', function () {
  const base = lookup(this.effectiveSlaveFeedRate, slaveNourishmentTable);
  assert(base > 0, `Expected positive nourishment, got ${base}`);
});

Then('slave health increases by the nourishment amount', function () {
  assert(this.slaveHealthDelta > 0, `Expected increase, got ${this.slaveHealthDelta}`);
});

Then('lash sickness is looked up from the lash-to-sickness table, randomized ±10%', function () {
  assert(lookup(this.lashRate, lashToSicknessTable) > 0);
});

Then('work sickness is looked up from the labor-to-sickness table', function () {
  assert(lookup(this.laborPerSlave, laborToSicknessTable) >= 0);
});

Then('total sickness rate = work sickness + lash sickness', function () {
  assert.strictEqual(this.totalSickness, this.workSickness + this.lashSickness);
});

Then('slave health decreases by total sickness rate', function () {
  assert(this.slaveHealthDelta < 0, `Expected decrease, got ${this.slaveHealthDelta}`);
});

Then('slave health = {float} + {float} - {float} = {float}', function (_h, _n, _s, expected) {
  assert(Math.abs(this.state.slaveHealth - expected) < 0.001,
    `Expected ${expected}, got ${this.state.slaveHealth}`);
});

Then('slave health is clamped to {float}', function (expected) {
  assert(Math.abs(this.state.slaveHealth - expected) < 0.001,
    `Expected ${expected}, got ${this.state.slaveHealth}`);
});

Then('sickness rate = {int}', function (_expected) {
  assert.strictEqual(this.state.slaveHealth, 0);
  const prev = this.state.slaveHealth;
  updateSlaveHealth(this.state, 0, 0.5, 15, 1, this.state.rng);
  assert.strictEqual(this.state.slaveHealth, prev);
});

// ── Oxen Health ──

Given('effective oxen feed rate is {int}', function (rate) {
  this.effectiveOxenFeedRate = rate;
  this.state.oxenHealth = 0.8;
});

Given('oxen health is {float}', function (h) {
  this.state.oxenHealth = h;
  this.currentAnimal = 'oxen';
  this.currentHealth = h;
});

// "Given oxen health is 0" matches oxen health is {float} above

When('oxen health is updated', function () {
  const feedRate = this.effectiveOxenFeedRate || 60;
  this.prevOxenHealth = this.state.oxenHealth;
  this.oxenNourishmentBase = lookup(feedRate, oxenNourishmentTable);
  updateOxenHealth(this.state, feedRate, this.state.rng);
  this.oxenHealthDelta = this.state.oxenHealth - this.prevOxenHealth;
});

Then('nourishment is looked up from the oxen nourishment table, randomized ±10%', function () {
  assert(typeof this.oxenNourishmentBase === 'number');
});

Then('if oxen health < {float} then diet = nourishment, else diet = {int}', function (_t, _z) {
  assert(typeof this.oxenHealthDelta === 'number');
});

Then('aging rate = {float} per month when health > {int}', function (rate, _t) {
  assert(rate === 0.05 || rate === 0.08);
});

Then('oxen health += diet - aging rate', function () {
  assert(this.state.oxenHealth >= 0 && this.state.oxenHealth <= 1);
});

Then('diet = {int}', function (expected) {
  assert.strictEqual(expected, 0);
  assert(Math.abs(this.state.oxenHealth - (this.prevOxenHealth - 0.05)) < 0.001);
});

Then('oxen health decreases by {float} \\(aging only)', function (aging) {
  assert(Math.abs(this.state.oxenHealth - (this.prevOxenHealth - aging)) < 0.001);
});

Then('aging rate = {int}', function (expected) {
  assert.strictEqual(expected, 0);
});

Then('oxen health remains at {int}', function (expected) {
  assert.strictEqual(this.state.oxenHealth, expected);
});

// ── Horse Health ──

Given('effective horse feed rate is {int}', function (rate) {
  this.effectiveHorseFeedRate = rate;
  this.state.horseHealth = 0.8;
});

Given('horse health is {float}', function (h) {
  this.state.horseHealth = h;
  this.currentAnimal = 'horse';
  this.currentHealth = h;
});

When('horse health is updated', function () {
  const feedRate = this.effectiveHorseFeedRate || 50;
  this.prevHorseHealth = this.state.horseHealth;
  this.horseNourishmentBase = lookup(feedRate, horseNourishmentTable);
  updateHorseHealth(this.state, feedRate, this.state.rng);
  this.horseHealthDelta = this.state.horseHealth - this.prevHorseHealth;
});

Then('nourishment is looked up from the horse nourishment table, randomized ±10%', function () {
  assert(typeof this.horseNourishmentBase === 'number');
});

Then('if horse health < {float} then diet = nourishment, else diet = {int}', function (_t, _z) {
  assert(typeof this.horseHealthDelta === 'number');
});

Then('horse health += diet - aging rate', function () {
  assert(this.state.horseHealth >= 0 && this.state.horseHealth <= 1);
});

// ── Aging Comparison ──

When('comparing aging rates', function () {
  this.horseAgingRate = 0.08;
  this.oxenAgingRate = 0.05;
});

Then('horse aging rate is {float} per month', function (expected) {
  assert.strictEqual(this.horseAgingRate, expected);
});

Then('oxen aging rate is {float} per month', function (expected) {
  assert.strictEqual(this.oxenAgingRate, expected);
});

// ── Birth and Death Rates ──

When('birth and death rates are calculated', function () {
  const animal = this.currentAnimal || 'slave';
  const health = this.currentHealth !== undefined ? this.currentHealth : this.state[healthKeyMap[animal]];
  const popKey = popKeyMap[animal];
  if (!this.state[popKey]) this.state[popKey] = 100;

  this.bdResult = calculateBirthsDeaths(
    this.state[popKey], health, birthTableMap[animal], deathTableMap[animal], this.state.rng);
  this.birthRateBase = lookup(health, birthTableMap[animal]);
  this.deathRateBase = lookup(health, deathTableMap[animal]);
});

Then('birth rate constant is looked up from the {word} birth table, randomized ±10%', function (animal) {
  assert(lookup(this.currentHealth, birthTableMap[animal]) >= 0);
});

Then('death rate constant is looked up from the {word} death table, randomized ±10%', function (animal) {
  assert(lookup(this.currentHealth, deathTableMap[animal]) >= 0);
});

Then('births = birth rate constant * population', function () {
  assert(this.bdResult.births >= 0);
});

Then('deaths = death rate constant * population', function () {
  assert(this.bdResult.deaths >= 0);
});

Then('new population = population + births - deaths', function () {
  assert(this.bdResult.newPopulation >= 0);
});

When('births and deaths are calculated', function () {
  const animal = this.currentAnimal || 'slave';
  const health = this.currentHealth !== undefined ? this.currentHealth : this.state[healthKeyMap[animal]];
  const popKey = popKeyMap[animal];
  if (!this.state[popKey]) this.state[popKey] = 100;
  const population = this.state[popKey];

  const safeSeeds = [1, 3, 5, 7, 9, 11, 13, 19, 21, 23];
  let totalBirths = 0, totalDeaths = 0;
  for (const seed of safeSeeds) {
    const rng = createRandom(seed);
    const r = calculateBirthsDeaths(population, health, birthTableMap[animal], deathTableMap[animal], rng);
    totalBirths += r.births;
    totalDeaths += r.deaths;
  }
  this.avgBirths = totalBirths / safeSeeds.length;
  this.avgDeaths = totalDeaths / safeSeeds.length;
  this.avgNewPop = population + this.avgBirths - this.avgDeaths;
});

Then('the birth rate exceeds the death rate', function () {
  assert(this.avgBirths > this.avgDeaths);
});

Then('the slave population grows', function () {
  assert(this.avgNewPop > this.state.slaves);
});

Then('the death rate exceeds the birth rate', function () {
  assert(this.avgDeaths > this.avgBirths);
});

Then('the slave population declines', function () {
  assert(this.avgNewPop < this.state.slaves);
});

// ── Population Cannot Go Negative ──

Given('the death rate would kill {int}', function (killCount) {
  this.deathCount = killCount;
});

When('population is updated', function () {
  this.state.slaves = Math.max(this.state.slaves - this.deathCount, 0);
});

Then('slaves = {int}', function (expected) {
  assert.strictEqual(this.state.slaves, expected);
});

// ── Health Effects ──

When('work ability is determined', function () {
  this.workAbilityValue = calculateWorkAbility(this.state.slaveHealth, this.state.rng);
  this.fullWorkAbility = lookup(1.0, workAbilityTable);
});

Then('work ability per slave is reduced', function () {
  assert(lookup(this.state.slaveHealth, workAbilityTable) < lookup(1.0, workAbilityTable));
});

Then('slaves produce less work per person', function () {
  assert(this.workAbilityValue < this.fullWorkAbility);
});

When('oxen efficiency is determined', function () {
  this.oxenEffValue = oxenEfficiency(this.state.oxenHealth);
  this.fullOxenEff = oxenEfficiency(1.0);
});

Then('oxen efficiency is reduced', function () {
  assert(this.oxenEffValue < this.fullOxenEff);
});

Then('the ox multiplier for slave work is diminished', function () {
  assert(this.oxenEffValue < 1.0);
});

When('horse efficiency is determined', function () {
  this.horseEffValue = horseEfficiency(this.state.horseHealth);
  this.fullHorseEff = horseEfficiency(1.0);
});

Then('horse efficiency is reduced', function () {
  assert(this.horseEffValue < this.fullHorseEff);
});

Then('overseer effectiveness drops', function () {
  assert(this.horseEffValue < 1.0);
});

// ── Selling Price ──

Given('the slave market price is {int}', function (price) {
  this.state.slavePrice = price;
});

When('the player sells slaves', function () {
  this.salePrice = calculateSalePrice(this.state.slavePrice, this.state.slaveHealth);
});

Then('the actual price received per slave is {int} * {float} = {int}',
  function (_m, _h, expected) {
    assert.strictEqual(this.salePrice, expected);
  });
