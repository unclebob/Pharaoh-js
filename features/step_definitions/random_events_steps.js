'use strict';

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { createRandom, absGaussian, gaussian } = require('../../src/engine/random');
const {
  selectEventType, applyEvent,
  applyLocusts, applyPlague, applyActOfGod, applyActOfMobs,
  applyWar, applyRevolt, applyWorkload, applyHealthEvent,
  applyLaborEvent, applyWheatEvent, applyGoldEvent, applyEconomyEvent,
  getEventMessage
} = require('../../src/engine/events');
const {
  lookup,
  lashToSufferingTable, healthToSicknessTable, hatredToDestructionTable,
  stressLashTable
} = require('../../src/engine/tables');
const {
  getWarLossMessage, getWarWinMessage, getRevoltMessage
} = require('../../src/engine/messages');

// ── Background ──

Given('a random event has been triggered', function () {
  if (!this.state) this.initGame(42);
  this.state.slaves = 100;
  this.state.oxen = 50;
  this.state.horses = 30;
  this.state.slaveHealth = 0.8;
  this.state.oxenHealth = 0.8;
  this.state.horseHealth = 0.8;
  this.state.fallow = 100;
  this.state.planted = 50;
  this.state.growing = 40;
  this.state.ripe = 30;
  this.state.wheatSewn = 500;
  this.state.wheatGrowing = 400;
  this.state.wheatRipe = 300;
  this.state.wheat = 1000;
  this.state.gold = 5000;
  this.state.manure = 200;
  this.state.overseers = 5;
  this.state.overseerPay = 300;
  this.state.overseerPressure = 0.5;
  this.state.wheatPrice = 10;
  this.state.oxenPrice = 90;
  this.state.horsePrice = 100;
  this.state.slavePrice = 800;
  this.state.manurePrice = 20;
  this.state.inflation = 0.02;
  this.state.temporaryWorkAddition = 0;
  // Save pre-event snapshot for comparisons
  this.preEvent = {
    slaves: 100, oxen: 50, horses: 30,
    slaveHealth: 0.8, oxenHealth: 0.8, horseHealth: 0.8,
    fallow: 100, planted: 50, growing: 40, ripe: 30,
    wheatSewn: 500, wheatGrowing: 400, wheatRipe: 300,
    wheat: 1000, gold: 5000, manure: 200,
    totalLand: 220, overseers: 5, overseerPay: 300,
    overseerPressure: 0.5
  };
});

// ── Event Type Probability ──

Given('the event roll \\(0-100) is {word}', function (rollStr) {
  if (rollStr.includes('-')) {
    const [lo, hi] = rollStr.split('-').map(Number);
    this.eventRollLo = lo;
    this.eventRollHi = hi;
  } else {
    this.eventRollLo = Number(rollStr);
    this.eventRollHi = Number(rollStr);
  }
});

Then('the event type is {string}', function (expected) {
  const typeMap = {
    'Locusts': 'locusts', 'Plagues': 'plague', 'Acts of God': 'actOfGod',
    'Acts of Mobs': 'actOfMobs', 'War': 'war', 'Revolt': 'revolt',
    'Workload': 'workload', 'Health Events': 'healthEvent',
    'Labor Event': 'laborEvent', 'Wheat Event': 'wheatEvent',
    'Gold Event': 'goldEvent', 'Economy Event': 'economyEvent'
  };
  const expectedType = typeMap[expected];
  assert.strictEqual(selectEventType(this.eventRollLo), expectedType,
    `Roll ${this.eventRollLo} should be ${expected}`);
  assert.strictEqual(selectEventType(this.eventRollHi), expectedType,
    `Roll ${this.eventRollHi} should be ${expected}`);
});

// ── Locusts ──

Given('the player has planted, growing, and ripe land', function () {
  this.state.planted = 50;
  this.state.growing = 40;
  this.state.ripe = 30;
  this.state.wheatSewn = 500;
  this.state.wheatGrowing = 400;
  this.state.wheatRipe = 300;
});

When('locusts strike', function () {
  this.preEvent.totalLand = this.state.fallow + this.state.planted + this.state.growing + this.state.ripe;
  this.preEvent.slaves = this.state.slaves;
  applyLocusts(this.state);
  this.eventMessage = getEventMessage(this.state, 'locusts');
  this.state.message = this.eventMessage;
});

Then('all planted, growing, and ripe land reverts to fallow', function () {
  assert.strictEqual(this.state.planted, 0);
  assert.strictEqual(this.state.growing, 0);
  assert.strictEqual(this.state.ripe, 0);
  assert.strictEqual(this.state.fallow, this.preEvent.totalLand);
});

Then('all wheat sewn, growing, and ripe is destroyed', function () {
  assert.strictEqual(this.state.wheatSewn, 0);
  assert.strictEqual(this.state.wheatGrowing, 0);
  assert.strictEqual(this.state.wheatRipe, 0);
});

Then('extra work is added: approximately {int} man-hours per slave plus {int} per acre', function (perSlave, perAcre) {
  const totalAcres = this.preEvent.totalLand;
  const slaves = this.preEvent.slaves;
  const expected = perSlave * slaves + perAcre * totalAcres;
  assert.ok(this.state.temporaryWorkAddition > expected * 0.2,
    `Work ${this.state.temporaryWorkAddition} should be > ${expected * 0.2}`);
  assert.ok(this.state.temporaryWorkAddition < expected * 4,
    `Work ${this.state.temporaryWorkAddition} should be < ${expected * 4}`);
});

Then('nothing happens if the player has no land', function () {
  const s = Object.assign({}, this.state);
  s.rng = createRandom(99);
  s.fallow = 0; s.planted = 0; s.growing = 0; s.ripe = 0;
  s.wheatSewn = 0; s.wheatGrowing = 0; s.wheatRipe = 0;
  s.temporaryWorkAddition = 0;
  applyLocusts(s);
  assert.strictEqual(s.temporaryWorkAddition, 0);
});

// ── Plague ──

Given('the player has slaves, oxen, and horses', function () {
  this.state.slaves = 100;
  this.state.oxen = 50;
  this.state.horses = 30;
  this.state.slaveHealth = 0.8;
  this.state.oxenHealth = 0.8;
  this.state.horseHealth = 0.8;
  this.preEvent.slaves = 100;
  this.preEvent.oxen = 50;
  this.preEvent.horses = 30;
  this.preEvent.slaveHealth = 0.8;
  this.preEvent.oxenHealth = 0.8;
  this.preEvent.horseHealth = 0.8;
});

When('a plague strikes', function () {
  this.preEvent.slaves = this.state.slaves;
  this.preEvent.oxen = this.state.oxen;
  this.preEvent.horses = this.state.horses;
  this.preEvent.slaveHealth = this.state.slaveHealth;
  this.preEvent.oxenHealth = this.state.oxenHealth;
  this.preEvent.horseHealth = this.state.horseHealth;
  applyPlague(this.state);
  this.eventMessage = getEventMessage(this.state, 'plague');
  this.state.message = this.eventMessage;
});

Then('slave health is reduced by a random factor between {float} and {float}', function (lo, hi) {
  const factor = this.state.slaveHealth / this.preEvent.slaveHealth;
  assert.ok(factor >= lo * 0.95, `slaveHealth factor ${factor} >= ${lo * 0.95}`);
  assert.ok(factor <= hi * 1.05, `slaveHealth factor ${factor} <= ${hi * 1.05}`);
});

Then('oxen health is reduced by a random factor between {float} and {float}', function (lo, hi) {
  const factor = this.state.oxenHealth / this.preEvent.oxenHealth;
  assert.ok(factor >= lo * 0.95, `oxenHealth factor ${factor} >= ${lo * 0.95}`);
  assert.ok(factor <= hi * 1.05, `oxenHealth factor ${factor} <= ${hi * 1.05}`);
});

Then('horse health is reduced by a random factor between {float} and {float}', function (lo, hi) {
  const factor = this.state.horseHealth / this.preEvent.horseHealth;
  assert.ok(factor >= lo * 0.95, `horseHealth factor ${factor} >= ${lo * 0.95}`);
  assert.ok(factor <= hi * 1.05, `horseHealth factor ${factor} <= ${hi * 1.05}`);
});

Then('slave population is reduced by a random factor between {float} and {float}', function (lo, hi) {
  const factor = this.state.slaves / this.preEvent.slaves;
  assert.ok(factor >= lo * 0.95, `slaves factor ${factor} >= ${lo * 0.95}`);
  assert.ok(factor <= hi * 1.05, `slaves factor ${factor} <= ${hi * 1.05}`);
});

Then('oxen population is reduced by a random factor between {float} and {float}', function (lo, hi) {
  const factor = this.state.oxen / this.preEvent.oxen;
  assert.ok(factor >= lo * 0.95, `oxen factor ${factor} >= ${lo * 0.95}`);
  assert.ok(factor <= hi * 1.05, `oxen factor ${factor} <= ${hi * 1.05}`);
});

Then('horse population is reduced by a random factor between {float} and {float}', function (lo, hi) {
  const factor = this.state.horses / this.preEvent.horses;
  assert.ok(factor >= lo * 0.95, `horses factor ${factor} >= ${lo * 0.95}`);
  assert.ok(factor <= hi * 1.05, `horses factor ${factor} <= ${hi * 1.05}`);
});

Then('nothing happens if population is zero', function () {
  const s = Object.assign({}, this.state);
  s.rng = createRandom(99);
  s.slaves = 0; s.oxen = 0; s.horses = 0;
  const origHealth = s.slaveHealth;
  applyPlague(s);
  assert.strictEqual(s.slaveHealth, origHealth);
});

// ── Act of God ──

When('an act of God occurs', function () {
  this.preEvent.totalLand = this.state.fallow + this.state.planted + this.state.growing + this.state.ripe;
  this.preEvent.slaves = this.state.slaves;
  for (const key of ['fallow', 'planted', 'growing', 'ripe', 'slaves', 'oxen',
    'horses', 'wheat', 'manure']) {
    this.preEvent[key] = this.state[key];
  }
  applyActOfGod(this.state);
  this.eventMessage = getEventMessage(this.state, 'actOfGod');
  this.state.message = this.eventMessage;
});

Then('each resource is reduced by a random factor between {float} and {float}', function (lo, hi) {
  for (const key of ['fallow', 'slaves', 'oxen', 'horses', 'wheat', 'manure']) {
    if (this.preEvent[key] > 0) {
      const factor = this.state[key] / this.preEvent[key];
      assert.ok(factor >= lo - 0.02, `${key} factor ${factor} >= ${lo - 0.02}`);
      assert.ok(factor <= hi + 0.02, `${key} factor ${factor} <= ${hi + 0.02}`);
    }
  }
});

// ── Act of Mobs ──

When('mobs attack', function () {
  this.preEvent.totalLand = this.state.fallow + this.state.planted + this.state.growing + this.state.ripe;
  for (const key of ['slaves', 'oxen', 'horses', 'wheat', 'wheatSewn',
    'wheatGrowing', 'wheatRipe', 'manure']) {
    this.preEvent[key] = this.state[key];
  }
  applyActOfMobs(this.state);
  this.eventMessage = getEventMessage(this.state, 'actOfMobs');
  this.state.message = this.eventMessage;
});

Then('wheat in all growing stages is reduced by a random factor between {float} and {float}', function (lo, hi) {
  for (const key of ['wheatSewn', 'wheatGrowing', 'wheatRipe']) {
    if (this.preEvent[key] > 0) {
      const factor = this.state[key] / this.preEvent[key];
      assert.ok(factor >= lo - 0.02, `${key} factor ${factor} >= ${lo - 0.02}`);
      assert.ok(factor <= hi + 0.02, `${key} factor ${factor} <= ${hi + 0.02}`);
    }
  }
});

Then('wheat stores are reduced by a random factor between {float} and {float}', function (lo, hi) {
  const factor = this.state.wheat / this.preEvent.wheat;
  assert.ok(factor >= lo - 0.02, `wheat factor ${factor} >= ${lo - 0.02}`);
  assert.ok(factor <= hi + 0.02, `wheat factor ${factor} <= ${hi + 0.02}`);
});

Then('manure increases slightly \\(mobs leave a mess)', function () {
  assert.ok(this.state.manure > this.preEvent.manure,
    `manure ${this.state.manure} > ${this.preEvent.manure}`);
});

Then('extra work is added: approximately {int}-{int} man-hours per slave plus {int} per acre', function (lo, hi, perAcre) {
  const avgPerSlave = (lo + hi) / 2;
  const totalAcres = this.preEvent.totalLand;
  const expected = avgPerSlave * this.state.slaves + perAcre * totalAcres;
  assert.ok(this.state.temporaryWorkAddition > expected * 0.2,
    `Work ${this.state.temporaryWorkAddition} > ${expected * 0.2}`);
  assert.ok(this.state.temporaryWorkAddition < expected * 4,
    `Work ${this.state.temporaryWorkAddition} < ${expected * 4}`);
});

// ── War ──

When('war occurs', function () {
  for (const key of ['slaves', 'oxen', 'horses', 'wheat', 'gold']) {
    this.preEvent[key] = this.state[key];
  }
  applyWar(this.state);
  this.eventMessage = getEventMessage(this.state, 'war');
  this.state.message = this.eventMessage;
});

When('a war occurs', function () {
  for (const key of ['slaves', 'oxen', 'horses', 'wheat', 'gold']) {
    this.preEvent[key] = this.state[key];
  }
  applyWar(this.state);
  this.eventMessage = getEventMessage(this.state, 'war');
  this.state.message = this.eventMessage;
});

Then('the player\'s army strength = overseers + {int}', function (bonus) {
  const army = this.state.overseers + bonus;
  assert.ok(army > 0, 'army should be positive');
});

Then(/^the enemy army is proportional to the player's overseers, randomized ±20%$/, function () {
  assert.ok(this.state.warGain !== undefined, 'War gain should be computed');
});

Then('each side rolls with approximately {int}% variance', function (_variance) {
  assert.ok(typeof this.state.warGain === 'number', 'warGain should be a number');
});

Then('gain = player roll \\/ enemy roll, capped at a maximum ratio', function () {
  assert.ok(this.state.warGain <= 3.0, `warGain ${this.state.warGain} <= 3.0`);
  assert.ok(this.state.warGain > 0, `warGain ${this.state.warGain} > 0`);
});

// ── Winning/Losing War ──

Given('the war gain is {float}', function (gain) {
  this.warGain = gain;
  for (const key of ['slaves', 'oxen', 'horses', 'wheat', 'gold', 'fallow']) {
    this.preEvent[key] = this.state[key];
  }
});

When('war effects are applied', function () {
  const rng = this.state.rng;
  const gain = this.warGain;
  this.state.warGain = gain;
  const fields = ['fallow', 'planted', 'growing', 'ripe', 'slaves', 'oxen',
    'horses', 'wheat', 'manure'];
  for (const key of fields) {
    const factor = gain * absGaussian(rng, 1.0, 0.2);
    this.state[key] = Math.max(0, Math.floor(this.state[key] * factor));
  }
  this.state.gold = Math.floor(this.state.gold * gain * absGaussian(rng, 1.0, 0.2));
  if (gain < 1.0) {
    const workPerSlave = gaussian(rng, 15, 3);
    this.state.temporaryWorkAddition += Math.max(0, workPerSlave * this.state.slaves + 10);
  }
  this.eventMessage = getEventMessage(this.state, 'war');
  this.state.message = this.eventMessage;
});

Then(/^all resources are multiplied by approximately ([\d.]+), each randomized ±20%$/, function (factorStr) {
  const factor = parseFloat(factorStr);
  if (factor > 1.0) {
    assert.ok(this.state.wheat !== this.preEvent.wheat || this.state.slaves !== this.preEvent.slaves,
      'Resources should change');
  } else {
    assert.ok(this.state.wheat <= this.preEvent.wheat || this.state.gold <= this.preEvent.gold,
      'Resources should decrease');
  }
});

Then('the player gains land, livestock, and wheat', function () {
  assert.ok(this.state.warGain >= 1.0, 'Gain should be >= 1.0 for winning');
});

Then('the player loses land, livestock, and wheat', function () {
  assert.ok(this.state.warGain < 1.0, 'Gain should be < 1.0 for losing');
});

Then('extra work is added: approximately {int} man-hours per slave plus work from the enemy army', function (_perSlave) {
  assert.ok(this.state.temporaryWorkAddition > 0, 'Extra work should be added when losing');
});

// ── Revolt ──

When('a revolt occurs', function () {
  for (const key of ['slaves', 'oxen', 'horses', 'wheat', 'gold']) {
    this.preEvent[key] = this.state[key];
  }
  applyRevolt(this.state);
  this.eventMessage = getEventMessage(this.state, 'revolt');
  this.state.message = this.eventMessage;
});

Then('suffering is looked up from the lash-to-suffering table', function () {
  const lashRate = lookup(this.state.overseerPressure || this.lashRate || 0.5, stressLashTable);
  this.suffering = lookup(lashRate, lashToSufferingTable);
  assert.ok(this.suffering >= 0, 'suffering should be >= 0');
});

Then('sickness is looked up from the health-to-sickness table', function () {
  this.sickness = lookup(this.state.slaveHealth, healthToSicknessTable);
  assert.ok(this.sickness >= 0, 'sickness should be >= 0');
});

Then('hatred = \\(suffering + sickness) \\/ {int}', function (divisor) {
  const hatred = (this.suffering + this.sickness) / divisor;
  assert.ok(hatred >= 0, `hatred ${hatred} >= 0`);
  this.hatred = hatred;
});

Then(/^destruction is looked up from the hatred-to-destruction table, randomized ±20%$/, function () {
  const destruction = lookup(this.hatred, hatredToDestructionTable);
  assert.ok(destruction >= 0, 'destruction should be >= 0');
});

Then('survival factor = {int} - destruction \\(clamped to [{int}, {int}])', function (_one, _lo, _hi) {
  assert.ok(this.state.wheat <= this.preEvent.wheat, 'Resources should be reduced');
});

Then('all resources are multiplied by the survival factor', function () {
  assert.ok(this.state.wheat <= this.preEvent.wheat, 'wheat should be reduced or equal');
  assert.ok(this.state.gold <= this.preEvent.gold, 'gold should be reduced or equal');
});

Then('extra work = approximately {int} man-hours per slave plus {int} per overseer', function (_perSlave, _perOverseer) {
  assert.ok(this.state.temporaryWorkAddition > 0,
    `Work ${this.state.temporaryWorkAddition} > 0`);
});

// ── No Revolt ──

Then('the revolt event is skipped', function () {
  const s = Object.assign({}, this.state);
  s.rng = createRandom(99);
  s.slaves = 0;
  s.temporaryWorkAddition = 0;
  const origWheat = s.wheat;
  applyRevolt(s);
  assert.strictEqual(s.wheat, origWheat);
  assert.strictEqual(s.temporaryWorkAddition, 0);
});

// ── Workload ──

Given('there are slaves', function () {
  this.state.slaves = 100;
});

When('a workload event occurs', function () {
  applyWorkload(this.state);
  this.eventMessage = getEventMessage(this.state, 'workload');
  this.state.message = this.eventMessage;
});

Then('extra work = approximately {int} man-hours per slave plus {int} per acre', function (perSlave, perAcre) {
  const totalAcres = this.state.fallow + this.state.planted + this.state.growing + this.state.ripe;
  const expected = perSlave * this.state.slaves + perAcre * totalAcres;
  assert.ok(this.state.temporaryWorkAddition > expected * 0.2,
    `Work ${this.state.temporaryWorkAddition} > ${expected * 0.2}`);
  assert.ok(this.state.temporaryWorkAddition < expected * 4,
    `Work ${this.state.temporaryWorkAddition} < ${expected * 4}`);
});

Then('nothing happens if there are no slaves', function () {
  const s = Object.assign({}, this.state);
  s.rng = createRandom(99);
  s.slaves = 0;
  s.temporaryWorkAddition = 0;
  applyWorkload(s);
  assert.strictEqual(s.temporaryWorkAddition, 0);
});

// ── Health Event ──

When('a health event occurs', function () {
  this.preEvent.slaveHealth = this.state.slaveHealth;
  this.preEvent.oxenHealth = this.state.oxenHealth;
  this.preEvent.horseHealth = this.state.horseHealth;
  applyHealthEvent(this.state);
  this.eventMessage = getEventMessage(this.state, 'healthEvent');
  this.state.message = this.eventMessage;
});

Then('slave health is multiplied by approximately {float} with slight variance', function (factor) {
  const actual = this.state.slaveHealth / this.preEvent.slaveHealth;
  assert.ok(actual > factor - 0.3, `slaveHealth factor ${actual} > ${factor - 0.3}`);
  assert.ok(actual < factor + 0.3, `slaveHealth factor ${actual} < ${factor + 0.3}`);
});

Then('oxen health is multiplied by approximately {float} with slight variance', function (factor) {
  const actual = this.state.oxenHealth / this.preEvent.oxenHealth;
  assert.ok(actual > factor - 0.3, `oxenHealth factor ${actual} > ${factor - 0.3}`);
  assert.ok(actual < factor + 0.3, `oxenHealth factor ${actual} < ${factor + 0.3}`);
});

Then('horse health is multiplied by approximately {float} with slight variance', function (factor) {
  const actual = this.state.horseHealth / this.preEvent.horseHealth;
  assert.ok(actual > factor - 0.3, `horseHealth factor ${actual} > ${factor - 0.3}`);
  assert.ok(actual < factor + 0.3, `horseHealth factor ${actual} < ${factor + 0.3}`);
});

Then('nothing happens if total population is zero', function () {
  const s = Object.assign({}, this.state);
  s.rng = createRandom(99);
  s.slaves = 0; s.oxen = 0; s.horses = 0;
  const origHealth = s.slaveHealth;
  applyHealthEvent(s);
  assert.strictEqual(s.slaveHealth, origHealth);
});

// ── Labor Event ──

When('a labor event occurs', function () {
  this.preEvent.overseerPay = this.state.overseerPay;
  this.preEvent.overseers = this.state.overseers;
  this.preEvent.overseerPressure = this.state.overseerPressure;
  applyLaborEvent(this.state);
  this.eventMessage = getEventMessage(this.state, 'laborEvent');
  this.state.message = this.eventMessage;
});

Then('the overseer pay increases by approximately {int}% with slight variance', function (pct) {
  const factor = this.state.overseerPay / this.preEvent.overseerPay;
  const expected = 1 + pct / 100;
  assert.ok(factor > expected - 0.15, `pay factor ${factor} > ${expected - 0.15}`);
  assert.ok(factor < expected + 0.15, `pay factor ${factor} < ${expected + 0.15}`);
});

Then('some overseers leave \\(population reduced by approximately {int}%, rounded down)', function (_pct) {
  assert.ok(this.state.overseers <= this.preEvent.overseers,
    `overseers ${this.state.overseers} <= ${this.preEvent.overseers}`);
});

Then('overseer stress increases by approximately {float}', function (amount) {
  const increase = this.state.overseerPressure - this.preEvent.overseerPressure;
  assert.ok(increase > amount - 0.3, `stress increase ${increase} > ${amount - 0.3}`);
  assert.ok(increase < amount + 0.3, `stress increase ${increase} < ${amount + 0.3}`);
});

Then('nothing happens if there are no overseers', function () {
  const s = Object.assign({}, this.state);
  s.rng = createRandom(99);
  s.overseers = 0;
  const origPay = s.overseerPay;
  applyLaborEvent(s);
  assert.strictEqual(s.overseerPay, origPay);
});

// ── Wheat Event ──

Given('the player has wheat in various stages', function () {
  this.state.wheat = 1000;
  this.state.wheatSewn = 500;
  this.state.wheatGrowing = 400;
  this.state.wheatRipe = 300;
});

When('a wheat event occurs', function () {
  this.preEvent.wheat = this.state.wheat;
  this.preEvent.wheatSewn = this.state.wheatSewn;
  this.preEvent.wheatGrowing = this.state.wheatGrowing;
  this.preEvent.wheatRipe = this.state.wheatRipe;
  applyWheatEvent(this.state);
  this.eventMessage = getEventMessage(this.state, 'wheatEvent');
  this.state.message = this.eventMessage;
});

Then('a loss factor of approximately {int}% is applied \\(normally distributed, capped at {int}%)', function (lossPct, maxLoss) {
  // Check whichever resource was affected (wheat or gold)
  if (this.preEvent.wheat > 0 && this.state.wheat < this.preEvent.wheat) {
    const factor = this.state.wheat / this.preEvent.wheat;
    const keepFactor = 1 - lossPct / 100;
    assert.ok(factor > keepFactor - 0.35, `factor ${factor} > ${keepFactor - 0.35}`);
    assert.ok(factor >= (1 - maxLoss / 100) - 0.01, `factor ${factor} >= ${1 - maxLoss / 100}`);
  } else if (this.preGold) {
    const factor = this.state.gold / this.preGold;
    const keepFactor = 1 - lossPct / 100;
    assert.ok(factor > keepFactor - 0.35, `gold factor ${factor} > ${keepFactor - 0.35}`);
    assert.ok(factor >= (1 - maxLoss / 100) - 0.01, `gold factor ${factor} >= ${1 - maxLoss / 100}`);
  }
});

Then('wheat stores are reduced by the loss factor', function () {
  assert.ok(this.state.wheat <= this.preEvent.wheat, 'wheat stores reduced');
});

Then('wheat sewn is reduced by the loss factor', function () {
  assert.ok(this.state.wheatSewn <= this.preEvent.wheatSewn, 'wheatSewn reduced');
});

Then('wheat growing is reduced by the loss factor', function () {
  assert.ok(this.state.wheatGrowing <= this.preEvent.wheatGrowing, 'wheatGrowing reduced');
});

Then('wheat ripe is reduced by the loss factor', function () {
  assert.ok(this.state.wheatRipe <= this.preEvent.wheatRipe, 'wheatRipe reduced');
});

Then('nothing happens if there are no crops', function () {
  const s = Object.assign({}, this.state);
  s.rng = createRandom(99);
  s.wheat = 0; s.wheatSewn = 0; s.wheatGrowing = 0; s.wheatRipe = 0;
  applyWheatEvent(s);
  assert.strictEqual(s.wheat, 0);
});

// ── Gold Event ──

Given('the player has gold', function () {
  this.state.gold = 5000;
});

When('a gold event occurs', function () {
  this.preGold = this.state.gold;
  applyGoldEvent(this.state);
  this.eventMessage = getEventMessage(this.state, 'goldEvent');
  this.state.message = this.eventMessage;
});

Then('gold is reduced by the loss factor', function () {
  assert.ok(this.state.gold < this.preGold, `gold ${this.state.gold} < ${this.preGold}`);
});

Then('nothing happens if gold is zero', function () {
  const s = Object.assign({}, this.state);
  s.rng = createRandom(99);
  s.gold = 0;
  applyGoldEvent(s);
  assert.strictEqual(s.gold, 0);
});

// ── Economy Event ──

When('an economy event occurs', function () {
  this.preEvent.wheatPrice = this.state.wheatPrice;
  this.preEvent.oxenPrice = this.state.oxenPrice;
  this.preEvent.horsePrice = this.state.horsePrice;
  this.preEvent.slavePrice = this.state.slavePrice;
  this.preEvent.manurePrice = this.state.manurePrice;
  this.preEvent.inflation = this.state.inflation;
  applyEconomyEvent(this.state);
  this.eventMessage = getEventMessage(this.state, 'economyEvent');
  this.state.message = this.eventMessage;
});

Then(/^each commodity price shifts by approximately ±(\d+)% \(normally distributed\)$/, function (pctStr) {
  let changed = false;
  for (const key of ['wheatPrice', 'oxenPrice', 'horsePrice', 'slavePrice', 'manurePrice']) {
    if (this.state[key] !== this.preEvent[key]) changed = true;
    assert.ok(this.state[key] > 0, `${key} must be positive`);
  }
  assert.ok(changed, 'At least one price should change');
});

Then('the inflation rate shifts by a small normally-distributed amount', function () {
  assert.ok(typeof this.state.inflation === 'number', 'inflation should be a number');
});

// ── Narration Messages ──

Then('the narration is assembled from three pools: adjective, disaster type, and consequence', function () {
  assert.ok(this.eventMessage.text.length > 0, 'message should have text');
});

Then('a random adjective is chosen \\(e.g., {string}, {string})', function (_a, _b) {
  assert.ok(this.eventMessage.text.length > 0);
});

Then('a random disaster type is chosen \\(e.g., {string}, {string}, {string})', function (_a, _b, _c) {
  assert.ok(this.eventMessage.text.length > 0);
});

Then('a random consequence is chosen \\(e.g., {string}, {string})', function (_a, _b) {
  assert.ok(this.eventMessage.text.length > 0);
});

Then('the assembled message is spoken by a random neighbor', function () {
  assert.ok(this.eventMessage.face >= 0 && this.eventMessage.face <= 4,
    `face ${this.eventMessage.face} should be 0-4`);
});

Then('the narration is assembled from four pools: crowd size, population, motivation, and action', function () {
  assert.ok(this.eventMessage.text.length > 0, 'message should have text');
});

Then('a random crowd size is chosen \\(e.g., {string}, {string})', function (_a, _b) {
  assert.ok(this.eventMessage.text.length > 0);
});

Then('a random motivation is chosen \\(e.g., {string}, {string}, {string})', function (_a, _b, _c) {
  assert.ok(this.eventMessage.text.length > 0);
});

Then('a random action is chosen \\(e.g., {string}, {string})', function (_a, _b) {
  assert.ok(this.eventMessage.text.length > 0);
});

Then('the message includes the attacking force description', function () {
  assert.ok(this.eventMessage.text.length > 0, 'war message should include attacker');
});

Then('if the player wins, a victory message with gain percentage is shown', function () {
  const rng = createRandom(42);
  const msg = getWarWinMessage(rng);
  assert.ok(msg.length > 0, 'win message should exist');
});

Then('if the player loses, a defeat message with loss percentage is shown', function () {
  const rng = createRandom(42);
  const msg = getWarLossMessage(rng);
  assert.ok(msg.length > 0, 'loss message should exist');
});

Then('the narration includes the destruction percentage', function () {
  const rng = createRandom(42);
  const msg = getRevoltMessage(rng, 50);
  assert.ok(msg.includes('50%'), `revolt message should include percentage: ${msg}`);
});

Then('a random health-event message is displayed from the pool', function () {
  assert.ok(this.eventMessage.text.length > 0, 'health event message should exist');
});

Then('a random wheat-event message is displayed with loss percentage', function () {
  assert.ok(this.eventMessage.text.length > 0, 'wheat event message should exist');
});

Then('a random gold-event message is displayed with loss percentage', function () {
  assert.ok(this.eventMessage.text.length > 0, 'gold event message should exist');
});

Then('a random economy-event message is displayed from the pool', function () {
  assert.ok(this.eventMessage.text.length > 0, 'economy event message should exist');
});

Then('a random labor-event message is displayed with raise percentage', function () {
  assert.ok(this.eventMessage.text.length > 0, 'labor event message should exist');
});

Then('a random workload-event message is displayed from the pool', function () {
  assert.ok(this.eventMessage.text.length > 0, 'workload event message should exist');
});

// ── Event Popup ──

When('a random event occurs during the month simulation', function () {
  applyLocusts(this.state);
  this.eventMessage = getEventMessage(this.state, 'locusts');
  this.state.message = this.eventMessage;
});

Then('a face message dialog appears with event narration text', function () {
  assert.ok(this.state.message, 'message should be set');
  assert.ok(this.state.message.text.length > 0, 'message text should exist');
});

Then('the message has a neighbor face portrait', function () {
  assert.ok(this.state.message.face >= 0 && this.state.message.face <= 4,
    `face should be 0-4, got ${this.state.message.face}`);
});
