'use strict';

const { lookup, debtSupportTable, repayIndexTable } = require('./tables');
const { absGaussian } = require('./random');

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

function offerCreditCheck(state, amount) {
  const rnw = calculateRealNetWorth(state);
  const fee = Math.abs(rnw) * 0.10;
  const needed = amount + state.loan > state.creditLimit;
  return { needed, fee, realNetWorth: rnw };
}

function executeCreditCheck(state, amount) {
  const rnw = calculateRealNetWorth(state);
  const fee = Math.abs(rnw) * 0.10;
  state.gold -= fee;
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
    state.creditRating *= repayIndex;
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
  state.creditRating -= (1 - state.creditRating) / 3;
  state.interestAddition += 0.2;
  state.loan += emergencyAmount;
  state.gold = 0;
  return { needed: true, bankruptcy: false, emergencyAmount };
}

function checkForeclosure(state) {
  if (state.loan <= 0) return { foreclosed: false, warning: false };
  const rnw = calculateRealNetWorth(state);
  const grossWorth = rnw + state.loan;
  if (grossWorth <= 0) return { foreclosed: true, warning: false };
  const debtToAssetRatio = state.loan / grossWorth;
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
  headroomFraction
};
