'use strict';

const { uniform, gaussian, absGaussian, randomInt } = require('./random');
const {
  lookup,
  lashToSufferingTable, healthToSicknessTable, hatredToDestructionTable,
  stressLashTable
} = require('./tables');
const {
  getActOfGodMessage, getActOfMobsMessage,
  getWarAttacker, getWarLossMessage, getWarWinMessage,
  getRevoltMessage, getHealthEventMessage, getPlagueMessage,
  getLocustMessage, getWheatEventMessage, getGoldEventMessage,
  getEconomyEventMessage, getLaborEventMessage, getWorkloadEventMessage
} = require('./messages');

// ── Event Type Dispatch Table ──

const EVENT_RANGES = [
  { max: 1, type: 'locusts' },
  { max: 5, type: 'plague' },
  { max: 7, type: 'actOfGod' },
  { max: 19, type: 'actOfMobs' },
  { max: 20, type: 'war' },
  { max: 29, type: 'revolt' },
  { max: 44, type: 'workload' },
  { max: 59, type: 'healthEvent' },
  { max: 64, type: 'laborEvent' },
  { max: 74, type: 'wheatEvent' },
  { max: 84, type: 'goldEvent' },
  { max: 100, type: 'economyEvent' }
];

function selectEventType(roll) {
  for (const range of EVENT_RANGES) {
    if (roll <= range.max) return range.type;
  }
  return 'economyEvent';
}

// ── Event Dispatch ──

const EVENT_HANDLERS = {
  locusts: applyLocusts,
  plague: applyPlague,
  actOfGod: applyActOfGod,
  actOfMobs: applyActOfMobs,
  war: applyWar,
  revolt: applyRevolt,
  workload: applyWorkload,
  healthEvent: applyHealthEvent,
  laborEvent: applyLaborEvent,
  wheatEvent: applyWheatEvent,
  goldEvent: applyGoldEvent,
  economyEvent: applyEconomyEvent
};

function applyEvent(state, eventType) {
  const handler = EVENT_HANDLERS[eventType];
  if (handler) handler(state);
}

// ── Locusts ──

function applyLocusts(state) {
  const totalLand = state.planted + state.growing + state.ripe;
  if (totalLand === 0 && state.fallow === 0) return;
  const totalAcres = state.fallow + totalLand;
  state.fallow += totalLand;
  state.planted = 0;
  state.growing = 0;
  state.ripe = 0;
  state.wheatSewn = 0;
  state.wheatGrowing = 0;
  state.wheatRipe = 0;
  const workPerSlave = gaussian(state.rng, 15, 3);
  const workPerAcre = gaussian(state.rng, 5, 1);
  state.temporaryWorkAddition += Math.max(0, workPerSlave * state.slaves + workPerAcre * totalAcres);
}

// ── Plague ──

function applyPlague(state) {
  const totalPop = state.slaves + state.oxen + state.horses;
  if (totalPop === 0) return;
  applyPlagueToSpecies(state, 'slaveHealth', 'slaves');
  applyPlagueToSpecies(state, 'oxenHealth', 'oxen');
  applyPlagueToSpecies(state, 'horseHealth', 'horses');
}

function applyPlagueToSpecies(state, healthKey, popKey) {
  state[healthKey] *= uniform(state.rng, 0.2, 0.9);
  state[popKey] = Math.floor(state[popKey] * uniform(state.rng, 0.7, 0.95));
}

// ── Act of God ──

function applyActOfGod(state) {
  const rng = state.rng;
  const totalAcres = state.fallow + state.planted + state.growing + state.ripe;
  applyGodToField(state, 'fallow', rng);
  applyGodToLandWithWheat(state, 'planted', 'wheatSewn', rng);
  applyGodToLandWithWheat(state, 'growing', 'wheatGrowing', rng);
  applyGodToLandWithWheat(state, 'ripe', 'wheatRipe', rng);
  applyGodToField(state, 'slaves', rng);
  applyGodToField(state, 'oxen', rng);
  applyGodToField(state, 'horses', rng);
  applyGodToField(state, 'wheat', rng);
  applyGodToField(state, 'manure', rng);
  const workPerSlave = gaussian(rng, 11, 3);
  const workPerAcre = gaussian(rng, 5, 1);
  state.temporaryWorkAddition += Math.max(0, workPerSlave * state.slaves + workPerAcre * totalAcres);
}

function applyGodToField(state, key, rng) {
  state[key] = Math.floor(state[key] * uniform(rng, 0.3, 0.8));
}

function applyGodToLandWithWheat(state, landKey, wheatKey, rng) {
  const factor = uniform(rng, 0.3, 0.8);
  state[landKey] = Math.floor(state[landKey] * factor);
  state[wheatKey] = Math.floor(state[wheatKey] * factor);
}

// ── Act of Mobs ──

function applyActOfMobs(state) {
  const rng = state.rng;
  const totalAcres = state.fallow + state.planted + state.growing + state.ripe;
  const factor = uniform(rng, 0.6, 0.8);
  applyMobReduction(state, 'wheatSewn', factor);
  applyMobReduction(state, 'wheatGrowing', factor);
  applyMobReduction(state, 'wheatRipe', factor);
  applyMobReduction(state, 'slaves', factor);
  applyMobReduction(state, 'oxen', factor);
  applyMobReduction(state, 'horses', factor);
  applyMobReduction(state, 'wheat', factor);
  state.manure += Math.floor(state.manure * 0.1 + 10);
  const workPerSlave = uniform(rng, 5, 10);
  const workPerAcre = gaussian(rng, 5, 1);
  state.temporaryWorkAddition += Math.max(0, workPerSlave * state.slaves + workPerAcre * totalAcres);
}

function applyMobReduction(state, key, factor) {
  state[key] = Math.floor(state[key] * factor);
}

// ── War ──

function applyWar(state) {
  const rng = state.rng;
  const army = state.overseers + 1;
  const enemyBase = army * absGaussian(rng, 1.0, 0.2);
  const playerRoll = army * absGaussian(rng, 1.0, 0.3);
  const enemyRoll = enemyBase * absGaussian(rng, 1.0, 0.3);
  const gain = Math.min(playerRoll / Math.max(enemyRoll, 0.01), 3.0);
  state.warGain = gain;
  applyWarToResources(state, gain, rng);
  if (gain < 1.0) {
    const workPerSlave = gaussian(rng, 15, 3);
    const enemyWork = enemyBase * absGaussian(rng, 1.0, 0.2);
    state.temporaryWorkAddition += Math.max(0, workPerSlave * state.slaves + enemyWork);
  }
}

function applyWarToResources(state, gain, rng) {
  const fields = ['fallow', 'planted', 'growing', 'ripe', 'slaves', 'oxen',
    'horses', 'wheat', 'manure'];
  for (const key of fields) {
    const factor = gain * absGaussian(rng, 1.0, 0.2);
    state[key] = Math.max(0, Math.floor(state[key] * factor));
  }
  state.gold = Math.floor(state.gold * gain * absGaussian(rng, 1.0, 0.2));
}

// ── Revolt ──

function applyRevolt(state) {
  if (state.slaves === 0) return;
  const rng = state.rng;
  const lashRate = lookup(state.overseerPressure, stressLashTable);
  const suffering = lookup(lashRate, lashToSufferingTable);
  const sickness = lookup(state.slaveHealth, healthToSicknessTable);
  const hatred = (suffering + sickness) / 2;
  const destruction = lookup(hatred, hatredToDestructionTable) * absGaussian(rng, 1.0, 0.2);
  const survival = Math.max(0, Math.min(1, 1 - destruction));
  state.destructionPercent = Math.round(destruction * 100);
  applyRevoltSurvival(state, survival);
  const workPerSlave = gaussian(rng, 18, 3);
  const workPerOverseer = gaussian(rng, 30, 5);
  state.temporaryWorkAddition += Math.max(0, workPerSlave * state.slaves + workPerOverseer * state.overseers);
}

function applyRevoltSurvival(state, survival) {
  const fields = ['fallow', 'planted', 'growing', 'ripe', 'slaves', 'oxen',
    'horses', 'wheat', 'manure'];
  for (const key of fields) {
    state[key] = Math.floor(state[key] * survival);
  }
  state.gold = Math.floor(state.gold * survival);
  state.wheatSewn = Math.floor(state.wheatSewn * survival);
  state.wheatGrowing = Math.floor(state.wheatGrowing * survival);
  state.wheatRipe = Math.floor(state.wheatRipe * survival);
}

// ── Workload ──

function applyWorkload(state) {
  if (state.slaves === 0) return;
  const rng = state.rng;
  const totalAcres = state.fallow + state.planted + state.growing + state.ripe;
  const workPerSlave = gaussian(rng, 10, 3);
  const workPerAcre = gaussian(rng, 8, 2);
  state.temporaryWorkAddition += Math.max(0, workPerSlave * state.slaves + workPerAcre * totalAcres);
}

// ── Health Event ──

function applyHealthEvent(state) {
  const totalPop = state.slaves + state.oxen + state.horses;
  if (totalPop === 0) return;
  const rng = state.rng;
  state.slaveHealth *= Math.max(0.01, gaussian(rng, 0.6, 0.1));
  state.oxenHealth *= Math.max(0.01, gaussian(rng, 0.6, 0.1));
  state.horseHealth *= Math.max(0.01, gaussian(rng, 0.6, 0.1));
}

// ── Labor Event ──

function applyLaborEvent(state) {
  if (state.overseers === 0) return;
  const rng = state.rng;
  const raiseMultiplier = 1 + Math.max(0.01, gaussian(rng, 0.20, 0.05));
  state.lastRaisePercent = Math.round((raiseMultiplier - 1) * 100);
  state.overseerPay = Math.round(state.overseerPay * raiseMultiplier);
  const retainFactor = Math.max(0.5, gaussian(rng, 0.9, 0.03));
  state.overseers = Math.max(0, Math.floor(state.overseers * retainFactor));
  state.overseerPressure += Math.max(0, gaussian(rng, 0.5, 0.1));
}

// ── Wheat Event ──

function applyWheatEvent(state) {
  const totalWheat = state.wheat + state.wheatSewn + state.wheatGrowing + state.wheatRipe;
  if (totalWheat === 0) return;
  const rng = state.rng;
  const lossFactor = Math.min(0.99, Math.max(0.01, gaussian(rng, 0.7, 0.07)));
  state.lastLossPercent = Math.round((1 - lossFactor) * 100);
  state.wheat = Math.floor(state.wheat * lossFactor);
  state.wheatSewn = Math.floor(state.wheatSewn * lossFactor);
  state.wheatGrowing = Math.floor(state.wheatGrowing * lossFactor);
  state.wheatRipe = Math.floor(state.wheatRipe * lossFactor);
}

// ── Gold Event ──

function applyGoldEvent(state) {
  if (state.gold === 0) return;
  const rng = state.rng;
  const lossFactor = Math.min(0.99, Math.max(0.01, gaussian(rng, 0.65, 0.1)));
  state.lastLossPercent = Math.round((1 - lossFactor) * 100);
  state.gold = Math.floor(state.gold * lossFactor);
}

// ── Economy Event ──

function applyEconomyEvent(state) {
  const rng = state.rng;
  const priceKeys = ['wheatPrice', 'oxenPrice', 'horsePrice', 'slavePrice', 'manurePrice'];
  for (const key of priceKeys) {
    const factor = Math.max(0.1, gaussian(rng, 1.0, 0.15));
    state[key] = Math.max(1, Math.round(state[key] * factor));
  }
  state.inflation += gaussian(rng, 0, 0.01);
}

// ── Event Messages ──

const MESSAGE_GENERATORS = {
  locusts: (state) => getLocustMessage(state.rng),
  plague: (state) => getPlagueMessage(state.rng),
  actOfGod: (state) => getActOfGodMessage(state.rng),
  actOfMobs: (state) => getActOfMobsMessage(state.rng),
  war: (state) => buildWarMessage(state),
  revolt: (state) => getRevoltMessage(state.rng, state.destructionPercent || 0),
  workload: (state) => getWorkloadEventMessage(state.rng, 'extra labor'),
  healthEvent: (state) => getHealthEventMessage(state.rng),
  laborEvent: (state) => getLaborEventMessage(state.rng, state.lastRaisePercent || 20),
  wheatEvent: (state) => getWheatEventMessage(state.rng, state.lastLossPercent || 30),
  goldEvent: (state) => getGoldEventMessage(state.rng, state.lastLossPercent || 35),
  economyEvent: (state) => getEconomyEventMessage(state.rng)
};

function buildWarMessage(state) {
  const attacker = getWarAttacker(state.rng);
  const gain = state.warGain || 1.0;
  if (gain >= 1.0) {
    const pct = Math.round((gain - 1) * 100);
    return attacker + ' ' + getWarWinMessage(state.rng) + ' ' + pct + '%';
  }
  const pct = Math.round((1 - gain) * 100);
  return attacker + ' ' + getWarLossMessage(state.rng) + ' ' + pct + '%';
}

function getEventMessage(state, eventType) {
  const generator = MESSAGE_GENERATORS[eventType];
  const text = generator ? generator(state) : 'Something happened.';
  const face = randomInt(state.rng, 0, 5);
  return { face, text };
}

module.exports = {
  selectEventType,
  applyEvent,
  applyLocusts,
  applyPlague,
  applyActOfGod,
  applyActOfMobs,
  applyWar,
  applyRevolt,
  applyWorkload,
  applyHealthEvent,
  applyLaborEvent,
  applyWheatEvent,
  applyGoldEvent,
  applyEconomyEvent,
  getEventMessage,
  EVENT_RANGES
};
