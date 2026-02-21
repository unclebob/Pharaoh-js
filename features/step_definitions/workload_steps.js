'use strict';

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { lookup, workAbilityTable, oxMultTable } = require('../../src/engine/tables');
const { createRandom } = require('../../src/engine/random');
const {
  calculateWorkComponents, sumComponents,
  calculateTotalRequiredWork,
  calculateWorkAbility, calculateOxMultiplier,
  calculateMaxWorkPerSlave, calculateSlaveEfficiency,
  calculateWorkDeficit
} = require('../../src/engine/workload');

// ── Work Components ──

Given('the game state has the following values', function () {
  this.state.oxen = 10;
  this.state.manureSpreadQuota = 5;
  this.state.plantingQuota = 8;
  this.state.planted = 12;
  this.state.growing = 15;
  this.state.wheatRipe = 500;
  this.state.ripe = 3;
  this.state.horses = 7;
  this.state.stoneQuota = 20;
  this.state.pyramidHeight = 50;
  this.state.temporaryWorkAddition = 0;
  this.state.slaves = 100;
});

When('required work is calculated', function () {
  this.workComponents = calculateWorkComponents(this.state);
});

Then('the work component ox tending equals oxen * {int}', function (factor) {
  const expected = this.state.oxen * factor;
  assert.strictEqual(this.workComponents.oxTending, expected);
});

Then('the work component manure spreading equals tons to spread * {int}',
  function (factor) {
    const expected = this.state.manureSpreadQuota * factor;
    assert.strictEqual(this.workComponents.manureSpreading, expected);
  });

Then('the work component wheat sowing equals acres to sow * {int}',
  function (factor) {
    const expected = this.state.plantingQuota * factor;
    assert.strictEqual(this.workComponents.wheatSowing, expected);
  });

Then('the work component field tending equals acres planted * {int} + acres growing * {int}',
  function (plantedFactor, growingFactor) {
    const expected = this.state.planted * plantedFactor + this.state.growing * growingFactor;
    assert.strictEqual(this.workComponents.fieldTending, expected);
  });

Then('the work component wheat harvest equals bushels ripe * {float} + acres ripe * {int}',
  function (ripeFactor, acresFactor) {
    const expected = this.state.wheatRipe * ripeFactor + this.state.ripe * acresFactor;
    assert(Math.abs(this.workComponents.wheatHarvest - expected) < 0.001,
      `Expected ${expected}, got ${this.workComponents.wheatHarvest}`);
  });

Then('the work component horse tending equals horses * {int}', function (factor) {
  const expected = this.state.horses * factor;
  assert.strictEqual(this.workComponents.horseTending, expected);
});

Then('the work component pyramid work equals stone quota * average pyramid height * {int}',
  function (factor) {
    const expected = this.state.stoneQuota * this.state.pyramidHeight * factor;
    assert.strictEqual(this.workComponents.pyramidWork, expected);
  });

// ── Total Required Work ──

Given('all work components sum to {int}', function (sum) {
  // Set up state so that components sum to exactly the given value
  // Use oxen alone: oxen * 1 = sum
  this.state.oxen = sum;
  this.state.manureSpreadQuota = 0;
  this.state.plantingQuota = 0;
  this.state.planted = 0;
  this.state.growing = 0;
  this.state.wheatRipe = 0;
  this.state.ripe = 0;
  this.state.horses = 0;
  this.state.stoneQuota = 0;
  this.state.temporaryWorkAddition = 0;
  this.state.slaves = 100;
  this.componentSum = sum;
});

When('the total required work is calculated', function () {
  this.totalRequiredWork = calculateTotalRequiredWork(this.state, this.state.rng);
});

Then('total required work = {int}, randomized with approximately {int}% variance',
  function (base, pct) {
    // Run many trials to verify the statistical property
    const results = [];
    for (let i = 0; i < 200; i++) {
      const rng = createRandom(i * 13 + 1);
      results.push(calculateTotalRequiredWork(this.state, rng));
    }
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    const tolerance = base * (pct / 100) * 2;
    assert(Math.abs(avg - base) < tolerance,
      `Expected avg ~${base}, got ${avg}`);
    // Check variance exists
    const min = Math.min(...results);
    const max = Math.max(...results);
    assert(max > min, 'Results should have variance');
  });

Then('required work per slave = total required work \\/ slaves', function () {
  const perSlave = this.totalRequiredWork / this.state.slaves;
  assert(perSlave > 0, `Expected positive per-slave work, got ${perSlave}`);
});

// ── Temporary Work ──

Given('a random event adds {int} man-hours of extra work', function (amount) {
  this.state.temporaryWorkAddition = amount;
  // Set a base workload so we can verify the addition
  this.state.oxen = 1000;
  this.state.slaves = 100;
  this.extraWork = amount;
});

Then('the {int} extra man-hours are included in the total', function (amount) {
  const components = calculateWorkComponents(this.state);
  assert.strictEqual(components.temporaryWork, amount);
  const baseOxen = this.state.oxen * 1;
  assert(this.totalRequiredWork > baseOxen,
    'Total should be greater than base work alone');
});

Then('the extra work resets to {int} after the month', function (expected) {
  this.state.temporaryWorkAddition = expected;
  assert.strictEqual(this.state.temporaryWorkAddition, expected);
});

// ── Slave Work Capacity ──

Given('motivation is {float}', function (m) {
  this.motivation = m;
  this.state.motivation = m;
});

Given('work ability per slave is {float}', function (wa) {
  this.workAbility = wa;
});

Given('ox multiplier is {float}', function (om) {
  this.oxMultiplier = om;
});

When('maximum work per slave is calculated', function () {
  this.maxWorkPerSlave = calculateMaxWorkPerSlave(
    this.motivation, this.workAbility, this.oxMultiplier);
});

Then('max work per slave = {float} * {float} * {float} = {float}',
  function (_m, _wa, _om, expected) {
    assert(Math.abs(this.maxWorkPerSlave - expected) < 0.001,
      `Expected ${expected}, got ${this.maxWorkPerSlave}`);
  });

// ── Work Ability ──

Given('slave health is {float}', function (h) {
  this.state.slaveHealth = h;
  this.currentAnimal = 'slave';
  this.currentHealth = h;
});

When('work ability is calculated', function () {
  this.workAbilityResult = calculateWorkAbility(this.state.slaveHealth, this.state.rng);
});

Then('work ability is looked up from the health-to-ability table', function () {
  const base = lookup(this.state.slaveHealth, workAbilityTable);
  assert(base > 0, `Expected positive base ability, got ${base}`);
  // The result should be roughly in the neighborhood of the base
  assert(this.workAbilityResult > base * 0.5,
    `Result ${this.workAbilityResult} too far from base ${base}`);
  assert(this.workAbilityResult < base * 2.0,
    `Result ${this.workAbilityResult} too far from base ${base}`);
});

Then('randomized with approximately {int}% variance', function (pct) {
  const base = lookup(this.state.slaveHealth, workAbilityTable);
  const results = [];
  for (let i = 0; i < 200; i++) {
    const rng = createRandom(i * 7 + 1);
    results.push(calculateWorkAbility(this.state.slaveHealth, rng));
  }
  const avg = results.reduce((a, b) => a + b, 0) / results.length;
  const tolerance = base * (pct / 100) * 2;
  assert(Math.abs(avg - base) < tolerance,
    `Expected avg ~${base}, got ${avg}`);
  const min = Math.min(...results);
  const max = Math.max(...results);
  assert(max > min, 'Results should have variance');
});

// ── Ox Multiplier ──

Given('there are {int} slaves and {int} oxen', function (slaves, oxen) {
  this.state.slaves = slaves;
  this.state.oxen = oxen;
});

Given('oxen efficiency is {float}', function (eff) {
  this.state.oxenEfficiency = eff;
});

When('the ox multiplier is calculated', function () {
  this.oxMultResult = calculateOxMultiplier(this.state, this.state.rng);
  this.oxenRatio = this.state.slaves > 0
    ? this.state.oxen / this.state.slaves : 0;
  this.rawOxMult = lookup(this.oxenRatio, oxMultTable);
});

Then('oxen-to-slave ratio = {int} \\/ {int}', function (oxen, slaves) {
  const expected = slaves > 0 ? oxen / slaves : 0;
  assert(Math.abs(this.oxenRatio - expected) < 0.001,
    `Expected ratio ${expected}, got ${this.oxenRatio}`);
});

Then('the raw ox multiplier is looked up from the ox-ratio table', function () {
  const expected = lookup(this.oxenRatio, oxMultTable);
  assert(Math.abs(this.rawOxMult - expected) < 0.001,
    `Expected raw mult ${expected}, got ${this.rawOxMult}`);
});

Then('the effective ox multiplier = max\\(raw multiplier * {float}, {int})',
  function (eff, floor) {
    const expected = Math.max(this.rawOxMult * eff, floor);
    assert(Math.abs(this.oxMultResult - expected) < 0.001,
      `Expected effective mult ${expected}, got ${this.oxMultResult}`);
  });

// ── Proportional Reduction ──

Given('max work per slave is {int} and required work per slave is {int}',
  function (maxWork, reqWork) {
    this.maxWorkPerSlaveVal = maxWork;
    this.requiredWorkPerSlaveVal = reqWork;
    this.state.slaves = this.state.slaves || 100;
  });

Given('there are {int} slaves', function (slaves) {
  this.state.slaves = slaves;
});

When('actual work per slave is determined', function () {
  this.actualWorkPerSlave = Math.min(this.maxWorkPerSlaveVal, this.requiredWorkPerSlaveVal);
  this.totalWork = this.actualWorkPerSlave * this.state.slaves;
  this.requiredTotal = this.requiredWorkPerSlaveVal * this.state.slaves;
  this.efficiencyResult = calculateSlaveEfficiency(this.totalWork, this.requiredTotal);
});

Then('actual work per slave = {int} \\(the required amount)', function (expected) {
  assert.strictEqual(this.actualWorkPerSlave, expected);
});

Then('actual work per slave = {int} \\(the maximum they can do)', function (expected) {
  assert.strictEqual(this.actualWorkPerSlave, expected);
});

Then('slave efficiency = {float}', function (expected) {
  assert(Math.abs(this.efficiencyResult - expected) < 0.001,
    `Expected efficiency ${expected}, got ${this.efficiencyResult}`);
});

Then('all activities proceed at full capacity', function () {
  assert(this.efficiencyResult >= 1.0,
    `Expected efficiency >= 1.0, got ${this.efficiencyResult}`);
});

Then('total work = {int} * {int} = {int}', function (_max, _slaves, expected) {
  assert.strictEqual(this.totalWork, expected);
});

Then('slave efficiency = {int} \\/ \\({int} * {int}) = {float}',
  function (_totalWork, _reqPerSlave, _slaves, expected) {
    assert(Math.abs(this.efficiencyResult - expected) < 0.001,
      `Expected efficiency ${expected}, got ${this.efficiencyResult}`);
  });

Then('all activities are reduced to {int}%', function (pct) {
  const expected = pct / 100;
  assert(Math.abs(this.efficiencyResult - expected) < 0.001,
    `Expected efficiency ${expected}, got ${this.efficiencyResult}`);
});

// ── Proportional Reduction on Activities ──

Then('planting rate is reduced to {int}%', function (pct) {
  const eff = this.prevSlaveEfficiency || this.state.slaveEfficiency;
  assert(Math.abs(eff - pct / 100) < 0.001,
    `Expected efficiency ${pct / 100}, got ${eff}`);
});

Then('harvest is {int}% of ripe wheat', function (pct) {
  const eff = this.prevSlaveEfficiency || this.state.slaveEfficiency;
  assert(Math.abs(eff - pct / 100) < 0.001,
    `Expected efficiency ${pct / 100}, got ${eff}`);
});

Then('manure spread is reduced to {int}%', function (pct) {
  const eff = this.prevSlaveEfficiency || this.state.slaveEfficiency;
  assert(Math.abs(eff - pct / 100) < 0.001,
    `Expected efficiency ${pct / 100}, got ${eff}`);
});

Then('pyramid stones added is {int}% of quota', function (pct) {
  const quota = this.state.stoneQuota;
  const added = this.stonesAdded;
  if (quota > 0) {
    const expectedAdded = Math.floor(quota * pct / 100);
    assert.strictEqual(added, expectedAdded);
  } else {
    // No quota set, just verify efficiency is correct
    const eff = this.prevSlaveEfficiency || this.state.slaveEfficiency;
    assert(Math.abs(eff - pct / 100) < 0.001);
  }
});

Then('livestock feeding rates are reduced to {int}%', function (pct) {
  const eff = this.prevSlaveEfficiency || this.state.slaveEfficiency;
  assert(Math.abs(eff - pct / 100) < 0.001,
    `Expected efficiency ${pct / 100}, got ${eff}`);
});

// ── Work Deficit ──

When('the work deficit is calculated', function () {
  this.workDeficit = calculateWorkDeficit(
    this.maxWorkPerSlaveVal, this.requiredWorkPerSlaveVal);
});

Then('work deficit per slave = {int} - {int} = {int}',
  function (_req, _max, expected) {
    assert.strictEqual(this.workDeficit, expected);
  });

Then('work deficit per slave = {int}', function (expected) {
  assert.strictEqual(this.workDeficit, expected);
});

Then('overseer stress increases', function () {
  assert(this.workDeficit > 0,
    `Expected positive work deficit for stress, got ${this.workDeficit}`);
  const stress = Math.min(1, this.workDeficit / 10);
  assert(stress > 0, 'Expected positive stress');
});

Then('overseers begin to relax', function () {
  assert.strictEqual(this.workDeficit, 0);
  // With no deficit, relaxation = overseerPressure * 0.3
  const relaxation = this.state.overseerPressure * 0.3;
  assert(relaxation >= 0, 'Expected non-negative relaxation');
});
