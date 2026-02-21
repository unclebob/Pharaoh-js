'use strict';

const { absGaussian } = require('./random');
const { lookup, yieldTable, seasonalYieldTable } = require('./tables');

const SOWING_RATE = 20; // bushels per acre
const ROT_RATE = 0.05;

function calculateActualPlanting(state, slaveEfficiency) {
  const desired = state.plantingQuota * slaveEfficiency;
  return Math.min(desired, state.fallow);
}

function sowWheat(state, actualPlanting) {
  const wheatConsumed = SOWING_RATE * actualPlanting;
  state.wheatSewn += wheatConsumed;
  state.wheat -= wheatConsumed;
  return wheatConsumed;
}

function wheatYield(manurePerAcre, month, rng) {
  const fertFactor = lookup(manurePerAcre, yieldTable);
  const variance = absGaussian(rng, 1.0, 0.1);
  const seasonal = lookup(month, seasonalYieldTable);
  return fertFactor * variance * seasonal;
}

function wheatRot(state, rng) {
  const variance = absGaussian(rng, 1.0, 0.1);
  const lost = state.wheat * ROT_RATE * variance;
  state.wheat -= lost;
  return lost;
}

function spreadManure(state, slaveEfficiency) {
  const desired = state.manureSpreadQuota * slaveEfficiency;
  const actual = Math.min(desired, state.manure);
  state.manure -= actual;
  const totalLand = state.fallow + state.planted + state.growing + state.ripe;
  state.manurePerAcre = totalLand > 0 ? actual / totalLand : 0;
  return actual;
}

function harvest(state, slaveEfficiency) {
  const harvested = state.wheatRipe * slaveEfficiency;
  const lost = state.wheatRipe * (1 - slaveEfficiency);
  state.wheat += harvested;
  state.wheatRipe = 0;
  return { harvested, lost };
}

function advanceLandCycle(state, slaveEfficiency, rng) {
  // 1. Harvest ripe land -> fallow
  const harvestResult = harvest(state, slaveEfficiency);
  state.fallow += state.ripe;
  state.ripe = 0;

  // 2. Growing -> ripe (apply yield multiplier)
  const yieldMult = wheatYield(state.manurePerAcre, state.month, rng);
  state.wheatRipe = state.wheatGrowing * yieldMult;
  state.ripe = state.growing;
  state.wheatGrowing = 0;
  state.growing = 0;

  // 3. Planted -> growing
  state.wheatGrowing = state.wheatSewn;
  state.growing = state.planted;
  state.wheatSewn = 0;
  state.planted = 0;

  // 4. Plant new fallow -> planted
  const actualPlanting = calculateActualPlanting(state, slaveEfficiency);
  state.fallow -= actualPlanting;
  state.planted = actualPlanting;
  const wheatConsumed = sowWheat(state, actualPlanting);

  return { harvestResult, actualPlanting, wheatConsumed };
}

module.exports = {
  SOWING_RATE, ROT_RATE,
  calculateActualPlanting, sowWheat, wheatYield,
  wheatRot, spreadManure, harvest, advanceLandCycle
};
