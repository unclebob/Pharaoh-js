'use strict';

const {
  lookup,
  slaveNourishmentTable, oxenNourishmentTable, horseNourishmentTable,
  slaveBirthTable, slaveDeathTable,
  oxenBirthTable, oxenDeathTable,
  horseBirthTable, horseDeathTable,
  lashToSicknessTable, laborToSicknessTable,
  oxenEfficiencyTable, horseEfficiencyTable
} = require('./tables');
const { absGaussian } = require('./random');

function clamp(val, lo, hi) {
  return Math.max(lo, Math.min(hi, val));
}

function updateSlaveHealth(state, effectiveFeedRate, lashRate, workPerSlave, oxMult, rng) {
  if (state.slaveHealth === 0) return;
  const nourishment = lookup(effectiveFeedRate, slaveNourishmentTable) * absGaussian(rng, 1.0, 0.1);
  const lashSickness = lookup(lashRate, lashToSicknessTable) * absGaussian(rng, 1.0, 0.1);
  const laborPerSlave = workPerSlave / oxMult;
  const workSickness = lookup(laborPerSlave, laborToSicknessTable);
  const totalSickness = workSickness + lashSickness;
  state.slaveHealth = clamp(state.slaveHealth + nourishment - totalSickness, 0, 1);
}

function updateAnimalHealth(state, healthKey, effectiveFeedRate, nourishmentTable, agingRate, rng) {
  if (state[healthKey] === 0) return;
  const nourishment = lookup(effectiveFeedRate, nourishmentTable) * absGaussian(rng, 1.0, 0.1);
  const diet = state[healthKey] < 1.0 ? nourishment : 0;
  state[healthKey] = clamp(state[healthKey] + diet - agingRate, 0, 1);
}

function updateOxenHealth(state, effectiveFeedRate, rng) {
  updateAnimalHealth(state, 'oxenHealth', effectiveFeedRate, oxenNourishmentTable, 0.05, rng);
}

function updateHorseHealth(state, effectiveFeedRate, rng) {
  updateAnimalHealth(state, 'horseHealth', effectiveFeedRate, horseNourishmentTable, 0.08, rng);
}

function calculateBirthsDeaths(population, health, birthTable, deathTable, rng) {
  const birthRate = lookup(health, birthTable) * absGaussian(rng, 1.0, 0.1);
  const deathRate = lookup(health, deathTable) * absGaussian(rng, 1.0, 0.1);
  const births = birthRate * population;
  const deaths = deathRate * population;
  const newPopulation = Math.max(Math.round(population + births - deaths), 0);
  return { births, deaths, newPopulation };
}

function updatePopulations(state, rng) {
  const slaveResult = calculateBirthsDeaths(state.slaves, state.slaveHealth, slaveBirthTable, slaveDeathTable, rng);
  state.slaves = slaveResult.newPopulation;

  const oxenResult = calculateBirthsDeaths(state.oxen, state.oxenHealth, oxenBirthTable, oxenDeathTable, rng);
  state.oxen = oxenResult.newPopulation;

  const horseResult = calculateBirthsDeaths(state.horses, state.horseHealth, horseBirthTable, horseDeathTable, rng);
  state.horses = horseResult.newPopulation;
}

function oxenEfficiency(health) {
  return lookup(health, oxenEfficiencyTable);
}

function horseEfficiency(health) {
  return lookup(health, horseEfficiencyTable);
}

function calculateSalePrice(marketPrice, health) {
  return marketPrice * health;
}

module.exports = {
  updateSlaveHealth,
  updateOxenHealth,
  updateHorseHealth,
  calculateBirthsDeaths,
  updatePopulations,
  oxenEfficiency,
  horseEfficiency,
  calculateSalePrice
};
