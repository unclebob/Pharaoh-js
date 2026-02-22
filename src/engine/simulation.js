'use strict';

const { nextRaw, randomInt } = require('./random');
const { wheatRot, advanceLandCycle, spreadManure } = require('./planting');
const { calculateWheatDemand, calculateWheatEfficiency, feedAll, produceManure } = require('./feeding');
const {
  calculateWorkComponents, sumComponents,
  calculateWorkAbility, calculateOxMultiplier,
  calculateMaxWorkPerSlave, calculateSlaveEfficiency,
  calculateWorkDeficit
} = require('./workload');
const { addStones, pyramidGoldCost, isWin, maxHeight } = require('./pyramid');
const { updateSlaveHealth, updateOxenHealth, updateHorseHealth, updatePopulations } = require('./health');
const { calculateStress, calculateLashRate, calculateMotivation, payOverseers } = require('./overseers');
const {
  monthlyInterest, adjustCreditRating, handleNegativeGoldOverseers,
  processEmergencyLoan, checkForeclosure
} = require('./loans');
const { runAllSupplyDemandCycles, updateInflation, updatePrices, calculateOwnershipCosts } = require('./market');
const { processContracts, refreshOffers } = require('./contracts');
const { selectEventType, applyEvent, getEventMessage } = require('./events');
const { getForeclosureMessage, getForeclosureWarningMessage, getWinMessage } = require('./messages');

function snapshotPrev(state) {
  return {
    gold: state.gold, wheat: state.wheat, slaves: state.slaves,
    oxen: state.oxen, horses: state.horses, manure: state.manure,
    loan: state.loan, pyramidStones: state.pyramidStones,
    pyramidHeight: state.pyramidHeight, month: state.month, year: state.year
  };
}

function advanceMonth(state) {
  state.month += 1;
  if (state.month > 12) { state.month = 1; state.year += 1; }
}

function checkRandomEvent(state) {
  const roll = nextRaw(state.rng);
  state.randomEvent = roll < 0.125;
  return state.randomEvent;
}

// ── Phase helpers ──

function doFeeding(state) {
  const rng = state.rng;
  wheatRot(state, rng);
  const sowingWheat = state.plantingQuota * 20; // SOWING_RATE = 20
  const demand = calculateWheatDemand(state, state.slaveEfficiency, sowingWheat);
  const wheatEff = calculateWheatEfficiency(state.wheat, demand);
  const result = feedAll(state, state.slaveEfficiency, wheatEff);
  state.wheat -= result.totalEaten;
  const newManure = produceManure(result.totalEaten, rng);
  state.manure += newManure;
  return { wheatEff, result };
}

function doWorkload(state) {
  const rng = state.rng;
  const components = calculateWorkComponents(state);
  const requiredWork = sumComponents(components);

  const motivationResult = calculateMotivation(state, rng);
  state.motivation = motivationResult.total;

  const workAbility = calculateWorkAbility(state.slaveHealth, rng);
  const oxMult = calculateOxMultiplier(state, rng);
  const maxWorkPerSlave = calculateMaxWorkPerSlave(state.motivation, workAbility, oxMult);
  const totalWorkDone = maxWorkPerSlave * state.slaves;

  if (state.slaveEfficiencyOverride != null) {
    state.slaveEfficiency = state.slaveEfficiencyOverride;
    delete state.slaveEfficiencyOverride;
  } else {
    state.slaveEfficiency = calculateSlaveEfficiency(totalWorkDone, requiredWork);
  }

  const deficit = calculateWorkDeficit(totalWorkDone, requiredWork);
  const deficitPerSlave = state.slaves > 0 ? deficit / state.slaves : 0;

  // Reset temporary work after calculation
  state.temporaryWorkAddition = 0;

  return { requiredWork, maxWorkPerSlave, totalWorkDone, deficit, deficitPerSlave, oxMult };
}

function doLandCycle(state) {
  const rng = state.rng;
  advanceLandCycle(state, state.slaveEfficiency, rng);
  spreadManure(state, state.slaveEfficiency);
}

function doPyramid(state) {
  const prevHeight = state.pyramidHeight;
  const stonesAdded = addStones(state);
  const avgHeight = Math.ceil((prevHeight + state.pyramidHeight) / 2);
  const cost = pyramidGoldCost(avgHeight, stonesAdded);
  state.gold -= cost;
  return stonesAdded;
}

function doHealth(state, feedingResult, workInfo) {
  const rng = state.rng;
  const lashRate = calculateLashRate(state, rng);
  updateSlaveHealth(state, state.slaveFeedRate, lashRate, workInfo.maxWorkPerSlave, workInfo.oxMult, rng);
  updateOxenHealth(state, state.oxenFeedRate, rng);
  updateHorseHealth(state, state.horseFeedRate, rng);
  updatePopulations(state, rng);
}

function doOverseerStress(state, deficitPerSlave) {
  calculateStress(state, deficitPerSlave);
}

function doFinances(state) {
  payOverseers(state);
  calculateOwnershipCosts(state, state.rng);
  monthlyInterest(state);
  adjustCreditRating(state);
  handleNegativeGoldOverseers(state, state.rng);
  processEmergencyLoan(state);
  const foreclosure = checkForeclosure(state);
  if (foreclosure.foreclosed) {
    state.gameOver = true;
    state.faceMessage = { face: state.neighbors.banker, text: getForeclosureMessage(state.rng) };
  } else if (foreclosure.warning) {
    state.faceMessage = { face: state.neighbors.banker, text: getForeclosureWarningMessage(state.rng) };
  }
}

function doMarket(state) {
  const rng = state.rng;
  runAllSupplyDemandCycles(state, rng);
  updateInflation(state, rng);
  updatePrices(state, rng);
}

function doContracts(state) {
  processContracts(state);
  refreshOffers(state);
}

function doRandomEvent(state) {
  if (!checkRandomEvent(state)) return;
  const roll = randomInt(state.rng, 0, 100);
  const eventType = selectEventType(roll);
  applyEvent(state, eventType);
  state.message = getEventMessage(state, eventType);
}

function doWinCheck(state) {
  const max = maxHeight(state.pyramidBase);
  if (isWin(state.pyramidHeight, max)) {
    state.gameWon = true;
    state.faceMessage = { face: randomInt(state.rng, 0, 4), text: getWinMessage(state.rng) };
  }
}

// ── Main orchestrator ──

function simulateMonth(state) {
  state.prev = snapshotPrev(state);

  // 1. Feeding phase: rot, demand, feed, manure
  doFeeding(state);

  // 2. Workload phase: components, motivation, efficiency
  const workInfo = doWorkload(state);

  // 3. Land cycle: plant, grow, harvest, spread manure
  doLandCycle(state);

  // 4. Pyramid: add stones
  doPyramid(state);

  // 5. Health: update health and populations
  doHealth(state, null, workInfo);

  // 6. Overseer stress and lashing
  doOverseerStress(state, workInfo.deficitPerSlave);

  // 7. Finances: pay overseers, ownership costs, interest, credit, loans
  doFinances(state);

  // 8. Win condition
  doWinCheck(state);

  // 9. Market: supply/demand, inflation, prices
  doMarket(state);

  // 10. Contracts: process pending, refresh offers
  doContracts(state);

  // 11. Random event
  doRandomEvent(state);

  // 12. Advance month
  advanceMonth(state);

  return state;
}

module.exports = { simulateMonth, snapshotPrev, advanceMonth, checkRandomEvent };
