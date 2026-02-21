'use strict';

const { lookup, workAbilityTable, oxMultTable } = require('./tables');
const { absGaussian } = require('./random');

function calculateWorkComponents(state) {
  const avgHeight = state.pyramidHeight;
  return {
    oxTending: state.oxen * 1,
    manureSpreading: state.manureSpreadQuota * 64,
    wheatSowing: state.plantingQuota * 30,
    fieldTending: state.planted * 20 + state.growing * 15,
    wheatHarvest: state.wheatRipe * 0.1 + state.ripe * 20,
    horseTending: state.horses * 1,
    pyramidWork: state.stoneQuota * avgHeight * 12,
    temporaryWork: state.temporaryWorkAddition
  };
}

function sumComponents(components) {
  return Object.values(components).reduce((a, b) => a + b, 0);
}

function calculateTotalRequiredWork(state, rng) {
  const components = calculateWorkComponents(state);
  const sum = sumComponents(components);
  return sum * absGaussian(rng, 1.0, 0.1);
}

function calculateWorkAbility(slaveHealth, rng) {
  const base = lookup(slaveHealth, workAbilityTable);
  const variance = absGaussian(rng, 1.0, 0.1);
  return base * variance;
}

function calculateOxMultiplier(state, rng) {
  const ratio = state.slaves > 0 ? state.oxen / state.slaves : 0;
  const rawMult = lookup(ratio, oxMultTable);
  return Math.max(rawMult * state.oxenEfficiency, 1);
}

function calculateMaxWorkPerSlave(motivation, workAbility, oxMult) {
  return motivation * workAbility * oxMult;
}

function calculateSlaveEfficiency(totalWorkDone, requiredWork) {
  if (requiredWork <= 0) return 1.0;
  return Math.min(totalWorkDone / requiredWork, 1.0);
}

function calculateWorkDeficit(maxWork, requiredWork) {
  return Math.max(requiredWork - maxWork, 0);
}

module.exports = {
  calculateWorkComponents, sumComponents,
  calculateTotalRequiredWork,
  calculateWorkAbility, calculateOxMultiplier,
  calculateMaxWorkPerSlave, calculateSlaveEfficiency,
  calculateWorkDeficit
};
