'use strict';

const { absGaussian } = require('./random');

const FEED_KEYS = { slave: 'slaveFeedRate', oxen: 'oxenFeedRate', horse: 'horseFeedRate' };

function setFeedRate(state, type, rate) {
  if (rate < 0) return false;
  state[FEED_KEYS[type]] = rate;
  return true;
}

function slaveWheatDemand(state) {
  return state.slaves * state.slaveFeedRate;
}

function oxenWheatDemand(state, slaveEff) {
  return state.oxenFeedRate * slaveEff * state.oxen * slaveEff;
}

function horseWheatDemand(state, slaveEff) {
  return state.horseFeedRate * slaveEff * state.horses * slaveEff;
}

function calculateWheatDemand(state, slaveEfficiency, sowingWheat) {
  const feeding = slaveWheatDemand(state)
    + oxenWheatDemand(state, slaveEfficiency)
    + horseWheatDemand(state, slaveEfficiency);
  return feeding + sowingWheat;
}

function calculateWheatEfficiency(wheatAvailable, totalDemand) {
  if (totalDemand <= 0) return 1.0;
  if (wheatAvailable >= totalDemand) return 1.0;
  return wheatAvailable / totalDemand;
}

function feedAll(state, slaveEfficiency, wheatEfficiency) {
  const sw = slaveWheatDemand(state) * wheatEfficiency;
  const ow = oxenWheatDemand(state, slaveEfficiency) * wheatEfficiency;
  const hw = horseWheatDemand(state, slaveEfficiency) * wheatEfficiency;
  return { slaveWheat: sw, oxenWheat: ow, horseWheat: hw, totalEaten: sw + ow + hw };
}

function produceManure(totalWheatEaten, rng) {
  if (totalWheatEaten <= 0) return 0;
  return (totalWheatEaten / 100) * absGaussian(rng, 1.0, 0.1);
}

function clampManure(stockpile, used) {
  return Math.max(stockpile - used, 0);
}

module.exports = {
  setFeedRate, calculateWheatDemand, calculateWheatEfficiency,
  feedAll, produceManure, clampManure
};
