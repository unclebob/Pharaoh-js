'use strict';

const { lookup, debtSupportTable, repayIndexTable } = require('./tables');
const { absGaussian, gaussian } = require('./random');

function calculateRealNetWorth(state) {
  const land = state.fallow + state.planted + state.growing + state.ripe;
  return (state.slaves * state.slavePrice * state.slaveHealth)
    + (state.oxen * state.oxenPrice * state.oxenHealth)
    + (state.horses * state.horsePrice * state.horseHealth)
    + land * state.landPrice
    + state.manure * state.manurePrice
    + state.wheat * state.wheatPrice
    + state.gold
    - state.loan;
}

function calculateGrossWorth(state) {
  const land = state.fallow + state.planted + state.growing + state.ripe;
  return state.slaves * state.slavePrice
    + state.oxen * state.oxenPrice
    + state.horses * state.horsePrice
    + land * state.landPrice
    + state.manure * state.manurePrice
    + state.wheat * state.wheatPrice
    + state.gold;
}

function headroomFraction(state) {
  if (state.creditLimit <= 0) return 1;
  return (state.creditLimit - state.loan) / state.creditLimit;
}

function borrow(state, amount) {
  const available = state.creditLimit - state.loan;
  if (available <= 0) return { ok: false, amount: 0 };
  const actual = amount == null ? available : amount;
  if (actual <= 0) return { ok: false, amount: 0 };
  if (actual > available) return { ok: false, needCreditCheck: true, amount: 0 };
  state.gold += actual;
  state.loan += actual;
  if (headroomFraction(state) < 0.2) {
    state.interestAddition += 0.2;
  }
  return { ok: true, amount: actual };
}

function creditCheckFee(rng, totalDebt) {
  return totalDebt * gaussian(rng, 0.05, 0.01);
}

function offerCreditCheck(state, amount) {
  const totalDebt = state.loan + amount;
  const fee = creditCheckFee(state.rng, totalDebt);
  const needed = totalDebt > state.creditLimit;
  return { needed, fee, realNetWorth: calculateRealNetWorth(state) };
}

function executeCreditCheck(state, amount) {
  const totalDebt = state.loan + amount;
  const fee = creditCheckFee(state.rng, totalDebt);
  state.gold -= fee;
  const rnw = calculateRealNetWorth(state);
  const newLimit = Math.max(rnw * state.creditRating, state.creditLowerBound);
  state.creditLimit = newLimit;
  const available = newLimit - state.loan;
  if (amount <= available) {
    state.gold += amount;
    state.loan += amount;
    if (headroomFraction(state) < 0.2) {
      state.interestAddition += 0.2;
    }
    return { ok: true, granted: true, amount, fee, newLimit };
  }
  return { ok: true, granted: false, amount: 0, fee, newLimit };
}

function repay(state, amount) {
  if (amount > state.gold) return { ok: false, reason: 'insufficientGold' };
  if (amount <= 0) return { ok: false, reason: 'invalidAmount' };
  if (amount > state.loan) amount = state.loan;
  const ratio = amount / state.loan;
  state.gold -= amount;
  state.loan -= amount;
  if (state.loan === 0) {
    state.creditRating += (1 - state.creditRating) / 3;
    state.interestAddition *= 0.80;
  } else {
    const repayIndex = lookup(ratio, repayIndexTable);
    state.creditRating = Math.min(1.0, state.creditRating * repayIndex);
    state.interestAddition /= repayIndex;
  }
  return { ok: true, amount, loanRemaining: state.loan };
}

function monthlyInterest(state) {
  if (state.loan <= 0) return 0;
  const interest = state.loan * (state.interestRate + state.interestAddition) / 100;
  state.gold -= interest;
  return interest;
}

function adjustCreditRating(state) {
  if (state.loan > 0) {
    state.creditRating *= 0.96;
    state.interestAddition *= 1.02;
  } else {
    state.creditRating += (1 - state.creditRating) / 10;
    state.interestAddition *= 0.95;
  }
}

function processEmergencyLoan(state) {
  if (state.gold >= 0) return { needed: false };
  const deficit = Math.abs(state.gold);
  const emergencyAmount = deficit * 1.1;
  if (state.loan + emergencyAmount > state.creditLimit) {
    state.gameOver = true;
    return { needed: true, bankruptcy: true, emergencyAmount };
  }
  state.creditRating -= (1 - state.creditRating) / 3;
  state.interestAddition += 0.2;
  state.loan += emergencyAmount;
  state.gold = 0;
  return { needed: true, bankruptcy: false, emergencyAmount };
}

function checkForeclosure(state) {
  if (state.loan <= 0) return { foreclosed: false, warning: false };
  const nw = calculateGrossWorth(state);
  const debtToAssetRatio = nw > 0 ? state.loan / nw : 0;
  const debtSupportLimit = lookup(state.creditRating, debtSupportTable);
  if (debtToAssetRatio > debtSupportLimit) {
    return { foreclosed: true, warning: false, debtToAssetRatio, debtSupportLimit };
  }
  if (debtToAssetRatio > 0.8 * debtSupportLimit) {
    return { foreclosed: false, warning: true, debtToAssetRatio, debtSupportLimit };
  }
  return { foreclosed: false, warning: false, debtToAssetRatio, debtSupportLimit };
}

function handleNegativeGoldOverseers(state, rng) {
  if (state.gold >= 0 || state.overseers <= 0) return { fired: false };
  const prevPay = state.overseerPay;
  state.overseers = 0;
  state.overseerPay *= absGaussian(rng, 1.2, 0.05);
  const raisePercent = ((state.overseerPay - prevPay) / prevPay) * 100;
  return { fired: true, raisePercent };
}

module.exports = {
  borrow, offerCreditCheck, executeCreditCheck,
  repay, monthlyInterest, adjustCreditRating,
  processEmergencyLoan, checkForeclosure,
  handleNegativeGoldOverseers, calculateRealNetWorth,
  calculateGrossWorth, headroomFraction, creditCheckFee
};
