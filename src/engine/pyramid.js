'use strict';

const SQRT3 = Math.sqrt(3);

function maxHeight(base) {
  return (SQRT3 / 2) * base;
}

function maxArea(base) {
  return (SQRT3 / 4) * base * base;
}

function pyramidHeight(base, area) {
  if (area <= 0) return 0;
  if (area >= maxArea(base)) return maxHeight(base);
  const det = base * base - 4 * area / SQRT3;
  return (base - Math.sqrt(det)) / (2 / SQRT3);
}

function addStones(state) {
  const added = Math.floor(state.stoneQuota * state.slaveEfficiency);
  state.pyramidStones += added;
  state.pyramidHeight = pyramidHeight(state.pyramidBase, state.pyramidStones);
  return added;
}

function pyramidWork(quota, currentHeight, newHeight) {
  const avgHeight = Math.ceil((currentHeight + newHeight) / 2);
  return quota * avgHeight * 12;
}

function pyramidGoldCost(avgHeight, stonesAdded) {
  return avgHeight * stonesAdded;
}

function isWin(height, max) {
  return height + 1 > max;
}

function setQuota(state, value) {
  if (value < 0) return { valid: false, reason: 'negative' };
  state.stoneQuota = value;
  return { valid: true };
}

function validateQuotaInput(input) {
  const num = Number(input);
  if (input === '' || isNaN(num)) return { valid: false, reason: 'invalid' };
  if (num < 0) return { valid: false, reason: 'negative' };
  return { valid: true, value: Math.floor(num) };
}

module.exports = {
  maxHeight, maxArea, pyramidHeight,
  addStones, pyramidWork, pyramidGoldCost,
  isWin, setQuota, validateQuotaInput
};
