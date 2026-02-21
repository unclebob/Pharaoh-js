'use strict';

const {
  lookup,
  overseerEffectivenessTable, stressLashTable,
  positiveMotiveTable, negativeMotiveTable
} = require('./tables');
const { absGaussian } = require('./random');
const { horseEfficiency } = require('./health');

function isWholeNumber(n) {
  return Number.isFinite(n) && n === Math.floor(n);
}

function hireOverseers(state, count) {
  if (!isWholeNumber(count)) return { ok: false, reason: 'fractional' };
  state.overseers += count;
  return { ok: true };
}

function fireOverseers(state, count) {
  if (!isWholeNumber(count)) return { ok: false, reason: 'fractional' };
  if (count > state.overseers) return { ok: false, reason: 'tooMany' };
  state.overseers -= count;
  return { ok: true };
}

function obtainOverseers(state, target) {
  if (!isWholeNumber(target)) return { ok: false, reason: 'fractional' };
  if (target > state.overseers) return hireOverseers(state, target - state.overseers);
  return fireOverseers(state, state.overseers - target);
}

function payOverseers(state) {
  const cost = state.overseers * state.overseerPay;
  state.gold -= cost;
  return cost;
}

function calculateOverseerEffectiveness(state, rng) {
  if (state.overseers === 0) return 0;
  const horsesToOverseerRatio = state.horses / state.overseers;
  const hEff = horseEfficiency(state.horseHealth);
  const mountedEffectiveness = horsesToOverseerRatio * hEff;
  const base = lookup(mountedEffectiveness, overseerEffectivenessTable);
  return base * absGaussian(rng, 1.0, 0.1);
}

function slaveToOverseerRatio(state) {
  return state.slaves / (state.overseers + 1);
}

function overseerEffPerSlave(state, overseerEffectiveness) {
  const ratio = slaveToOverseerRatio(state);
  return ratio > 0 ? overseerEffectiveness / ratio : 0;
}

function calculateStress(state, workDeficitPerSlave) {
  let stress, relaxation;
  if (workDeficitPerSlave > 0) {
    stress = Math.min(1, workDeficitPerSlave / 10);
    relaxation = 0;
  } else {
    stress = 0;
    relaxation = state.overseerPressure * 0.3;
  }
  state.overseerPressure = state.overseerPressure + stress - relaxation;
  return { stress, relaxation };
}

function calculateLashRate(state, rng) {
  const stressDrivenLashing = lookup(state.overseerPressure, stressLashTable) * absGaussian(rng, 1.0, 0.1);
  const oEff = calculateOverseerEffectiveness(state, rng);
  const effPerSlave = overseerEffPerSlave(state, oEff);
  return stressDrivenLashing * effPerSlave;
}

function calculateMotivation(state, rng) {
  const oEff = calculateOverseerEffectiveness(state, rng);
  const effPerSlave = overseerEffPerSlave(state, oEff);
  const lashRate = calculateLashRate(state, rng);
  const positiveMotivation = lookup(effPerSlave, positiveMotiveTable) * absGaussian(rng, 1.0, 0.1);
  const negativeMotivation = lookup(lashRate, negativeMotiveTable);
  return { positiveMotivation, negativeMotivation, total: positiveMotivation + negativeMotivation };
}

function handleUnpaidOverseers(state, rng) {
  if (state.gold >= 0) return null;
  const raiseMultiplier = absGaussian(rng, 1.2, 0.05);
  state.overseerPay = Math.round(state.overseerPay * raiseMultiplier);
  const raisePercent = (raiseMultiplier - 1.0) * 100;
  state.overseers = 0;
  return raisePercent;
}

module.exports = {
  hireOverseers, fireOverseers, obtainOverseers,
  payOverseers,
  calculateOverseerEffectiveness,
  slaveToOverseerRatio, overseerEffPerSlave,
  calculateStress, calculateLashRate, calculateMotivation,
  handleUnpaidOverseers
};
