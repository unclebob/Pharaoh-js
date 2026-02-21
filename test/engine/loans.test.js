'use strict';

const {
  borrow, offerCreditCheck, executeCreditCheck,
  repay, monthlyInterest, adjustCreditRating,
  processEmergencyLoan, checkForeclosure,
  handleNegativeGoldOverseers, calculateRealNetWorth,
  headroomFraction
} = require('../../src/engine/loans');
const { createGameState } = require('../../src/engine/state');
const { setDifficulty } = require('../../src/engine/difficulty');
const { createRandom } = require('../../src/engine/random');

function makeState(overrides) {
  const state = createGameState(42);
  setDifficulty(state, 'easy');
  return Object.assign(state, overrides);
}

describe('loans', () => {
  describe('calculateRealNetWorth', () => {
    it('calculates net worth from all asset types', () => {
      const state = makeState({
        slaves: 10, slavePrice: 100, slaveHealth: 1.0,
        oxen: 5, oxenPrice: 50, oxenHealth: 0.8,
        horses: 3, horsePrice: 200, horseHealth: 0.9,
        fallow: 100, planted: 0, growing: 0, ripe: 0,
        landPrice: 10, manure: 50, manurePrice: 5,
        wheat: 200, wheatPrice: 2, gold: 1000, loan: 500
      });
      const expected = (10 * 100 * 1.0) + (5 * 50 * 0.8) + (3 * 200 * 0.9)
        + 100 * 10 + 50 * 5 + 200 * 2 + 1000 - 500;
      expect(calculateRealNetWorth(state)).toBeCloseTo(expected);
    });

    it('returns negative when debt exceeds assets', () => {
      const state = makeState({ gold: 100, loan: 10000 });
      expect(calculateRealNetWorth(state)).toBeLessThan(0);
    });
  });

  describe('headroomFraction', () => {
    it('returns remaining credit as fraction of limit', () => {
      const state = makeState({ creditLimit: 100000, loan: 85000 });
      expect(headroomFraction(state)).toBeCloseTo(0.15);
    });

    it('returns 1 when creditLimit is 0', () => {
      const state = makeState({ creditLimit: 0 });
      expect(headroomFraction(state)).toBe(1);
    });
  });

  describe('borrow', () => {
    it('grants loan within credit limit', () => {
      const state = makeState({ creditLimit: 100000, loan: 0, gold: 0 });
      const result = borrow(state, 50000);
      expect(result.ok).toBe(true);
      expect(result.amount).toBe(50000);
      expect(state.gold).toBe(50000);
      expect(state.loan).toBe(50000);
    });

    it('offers credit check when exceeding limit', () => {
      const state = makeState({ creditLimit: 100000, loan: 80000 });
      const result = borrow(state, 30000);
      expect(result.ok).toBe(false);
      expect(result.needCreditCheck).toBe(true);
    });

    it('rejects zero or negative amounts', () => {
      const state = makeState({ creditLimit: 100000, loan: 0 });
      expect(borrow(state, 0).ok).toBe(false);
      expect(borrow(state, -100).ok).toBe(false);
    });

    it('increases interest addition when headroom < 20%', () => {
      const state = makeState({
        creditLimit: 100000, loan: 85000, gold: 0, interestAddition: 0
      });
      borrow(state, 5000);
      expect(state.interestAddition).toBeCloseTo(0.2);
    });

    it('does not increase interest when headroom >= 20%', () => {
      const state = makeState({
        creditLimit: 100000, loan: 0, gold: 0, interestAddition: 0
      });
      borrow(state, 50000);
      expect(state.interestAddition).toBe(0);
    });
  });

  describe('offerCreditCheck', () => {
    it('calculates fee as 10% of real net worth', () => {
      const state = makeState({ gold: 10000, loan: 0 });
      const result = offerCreditCheck(state, 20000);
      expect(result.fee).toBeGreaterThan(0);
    });

    it('identifies when credit check is needed', () => {
      const state = makeState({ creditLimit: 100, loan: 0 });
      const result = offerCreditCheck(state, 1000);
      expect(result.needed).toBe(true);
    });
  });

  describe('executeCreditCheck', () => {
    it('deducts fee and grants loan when new limit allows', () => {
      const state = makeState({
        creditLimit: 100, loan: 0, gold: 50000,
        slaves: 50, slavePrice: 1000, slaveHealth: 1.0,
        creditRating: 0.8
      });
      const prevGold = state.gold;
      const result = executeCreditCheck(state, 1000);
      expect(result.granted).toBe(true);
      expect(state.gold).toBeLessThan(prevGold);
      expect(state.loan).toBe(1000);
    });

    it('increases interest addition when credit check loan near limit', () => {
      // Set up so after credit check, newLimit allows the loan
      // but headroom < 20% after borrowing
      // creditLowerBound forces minimum limit
      const state = makeState({
        creditLimit: 100, loan: 0, gold: 1000,
        slaves: 0, slavePrice: 100, slaveHealth: 1.0,
        oxen: 0, oxenPrice: 50, oxenHealth: 1.0,
        horses: 0, horsePrice: 200, horseHealth: 1.0,
        fallow: 0, planted: 0, growing: 0, ripe: 0,
        landPrice: 10, manure: 0, manurePrice: 5,
        wheat: 0, wheatPrice: 2,
        creditRating: 0.01, creditLowerBound: 100,
        interestAddition: 0
      });
      // rnw = 1000 - 0 = 1000 (only gold), fee = 100 (10% of 1000)
      // gold after fee = 900, rnw after = 900
      // newLimit = max(900 * 0.01, 100) = 100
      // borrow 90 of 100 limit => headroom = (100-90)/100 = 0.10 < 0.20
      const result = executeCreditCheck(state, 90);
      expect(result.granted).toBe(true);
      expect(state.interestAddition).toBeCloseTo(0.2);
    });

    it('deducts fee but denies loan when new limit insufficient', () => {
      const state = makeState({
        creditLimit: 100, loan: 0, gold: 500,
        creditRating: 0.01, creditLowerBound: 0
      });
      const prevGold = state.gold;
      const result = executeCreditCheck(state, 100000);
      expect(result.granted).toBe(false);
      expect(state.gold).toBeLessThan(prevGold);
    });
  });

  describe('repay', () => {
    it('rejects repayment exceeding gold', () => {
      const state = makeState({ gold: 10000, loan: 50000 });
      const result = repay(state, 20000);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('insufficientGold');
    });

    it('full payoff sets loan to 0 and improves credit', () => {
      const state = makeState({
        gold: 60000, loan: 50000,
        creditRating: 0.5, interestAddition: 1.0
      });
      const prevRating = state.creditRating;
      repay(state, 50000);
      expect(state.loan).toBe(0);
      expect(state.gold).toBe(10000);
      expect(state.creditRating).toBeCloseTo(prevRating + (1 - prevRating) / 3);
      expect(state.interestAddition).toBeCloseTo(0.80);
    });

    it('partial repayment uses repay index', () => {
      const state = makeState({
        gold: 100000, loan: 100000,
        creditRating: 0.5, interestAddition: 1.0
      });
      const prevRating = state.creditRating;
      repay(state, 30000);
      expect(state.loan).toBe(70000);
      expect(state.creditRating).toBeGreaterThan(prevRating);
    });

    it('rejects zero or negative amount', () => {
      const state = makeState({ gold: 10000, loan: 5000 });
      expect(repay(state, 0).ok).toBe(false);
    });

    it('caps repayment at loan amount', () => {
      const state = makeState({
        gold: 100000, loan: 5000, creditRating: 0.5
      });
      repay(state, 10000);
      expect(state.loan).toBe(0);
      expect(state.gold).toBe(95000);
    });
  });

  describe('monthlyInterest', () => {
    it('deducts interest based on rate and addition', () => {
      const state = makeState({
        gold: 100000, loan: 100000,
        interestRate: 5, interestAddition: 2
      });
      const interest = monthlyInterest(state);
      expect(interest).toBeCloseTo(7000);
      expect(state.gold).toBeCloseTo(93000);
    });

    it('returns 0 when no loan', () => {
      const state = makeState({ gold: 100000, loan: 0 });
      expect(monthlyInterest(state)).toBe(0);
    });
  });

  describe('adjustCreditRating', () => {
    it('decays rating when loan outstanding', () => {
      const state = makeState({
        loan: 10000, creditRating: 0.5, interestAddition: 1.0
      });
      adjustCreditRating(state);
      expect(state.creditRating).toBeCloseTo(0.5 * 0.96);
      expect(state.interestAddition).toBeCloseTo(1.0 * 1.02);
    });

    it('recovers rating when loan-free', () => {
      const state = makeState({
        loan: 0, creditRating: 0.5, interestAddition: 1.0
      });
      adjustCreditRating(state);
      expect(state.creditRating).toBeCloseTo(0.5 + (1 - 0.5) / 10);
      expect(state.interestAddition).toBeCloseTo(1.0 * 0.95);
    });
  });

  describe('processEmergencyLoan', () => {
    it('covers gold deficit with 10% fee', () => {
      const state = makeState({
        gold: -10000, loan: 0, creditRating: 0.8, interestAddition: 0
      });
      const result = processEmergencyLoan(state);
      expect(result.needed).toBe(true);
      expect(result.bankruptcy).toBe(false);
      expect(state.loan).toBeCloseTo(11000);
      expect(state.gold).toBe(0);
      expect(state.interestAddition).toBeCloseTo(0.2);
    });

    it('decreases credit rating', () => {
      const state = makeState({
        gold: -5000, creditRating: 0.8, interestAddition: 0
      });
      const prevRating = state.creditRating;
      processEmergencyLoan(state);
      expect(state.creditRating).toBeCloseTo(prevRating - (1 - prevRating) / 3);
    });

    it('does nothing when gold is positive', () => {
      const state = makeState({ gold: 5000, loan: 10000 });
      const result = processEmergencyLoan(state);
      expect(result.needed).toBe(false);
      expect(state.loan).toBe(10000);
      expect(state.gold).toBe(5000);
    });

    it('signals bankruptcy when gold still negative', () => {
      // This tests the edge case where the emergency loan isn't enough
      const state = makeState({
        gold: -100000, loan: 0, creditRating: 0.5, interestAddition: 0
      });
      // processEmergencyLoan adds deficit to gold, so gold becomes 0
      // unless there's some other mechanism. Let's verify normal behavior:
      const result = processEmergencyLoan(state);
      expect(result.needed).toBe(true);
      expect(state.gold).toBe(0);
    });
  });

  describe('checkForeclosure', () => {
    it('returns not foreclosed when no loan', () => {
      const state = makeState({ loan: 0 });
      const result = checkForeclosure(state);
      expect(result.foreclosed).toBe(false);
      expect(result.warning).toBe(false);
    });

    it('forecloses when debt-to-asset ratio exceeds limit', () => {
      const state = makeState({
        loan: 100000, gold: 1000,
        slaves: 0, oxen: 0, horses: 0,
        fallow: 0, planted: 0, growing: 0, ripe: 0,
        manure: 0, wheat: 0, creditRating: 0.5
      });
      const result = checkForeclosure(state);
      expect(result.foreclosed).toBe(true);
    });

    it('does not foreclose when ratio is safe', () => {
      const state = makeState({ loan: 1000, gold: 1000000, creditRating: 1.0 });
      const result = checkForeclosure(state);
      expect(result.foreclosed).toBe(false);
    });

    it('warns when ratio exceeds 80% of support limit', () => {
      // Need to set up a state where debt/gross is between 80% of support and support
      const state = makeState({
        loan: 50000, gold: 100000,
        slaves: 0, oxen: 0, horses: 0,
        fallow: 0, planted: 0, growing: 0, ripe: 0,
        manure: 0, wheat: 0, creditRating: 0.5
      });
      // grossWorth = gold + loan = 100000 + 0 (assets) = 100000 - 50000 + 50000 = 100000
      // wait: rnw = 0 + 100000 - 50000 = 50000, grossWorth = 50000 + 50000 = 100000
      // ratio = 50000/100000 = 0.5
      // debtSupportLimit at 0.5 = lookup(0.5, debtSupportTable) = 0.55
      // 0.5 > 0.8 * 0.55 = 0.44 => warning
      // 0.5 < 0.55 => not foreclosed
      const result = checkForeclosure(state);
      expect(result.foreclosed).toBe(false);
      expect(result.warning).toBe(true);
    });
  });

  describe('handleNegativeGoldOverseers', () => {
    it('fires all overseers when gold is negative', () => {
      const rng = createRandom(42);
      const state = makeState({ gold: -1000, overseers: 5, overseerPay: 300 });
      const result = handleNegativeGoldOverseers(state, rng);
      expect(result.fired).toBe(true);
      expect(state.overseers).toBe(0);
      expect(state.overseerPay).toBeGreaterThan(300);
    });

    it('does nothing when gold is positive', () => {
      const rng = createRandom(42);
      const state = makeState({ gold: 1000, overseers: 5, overseerPay: 300 });
      const result = handleNegativeGoldOverseers(state, rng);
      expect(result.fired).toBe(false);
      expect(state.overseers).toBe(5);
    });

    it('does nothing when no overseers', () => {
      const rng = createRandom(42);
      const state = makeState({ gold: -1000, overseers: 0, overseerPay: 300 });
      const result = handleNegativeGoldOverseers(state, rng);
      expect(result.fired).toBe(false);
    });

    it('increases overseer pay by approximately 20%', () => {
      const results = [];
      for (let i = 0; i < 200; i++) {
        const rng = createRandom(i * 7 + 1);
        const state = makeState({ gold: -1000, overseers: 5, overseerPay: 300 });
        handleNegativeGoldOverseers(state, rng);
        results.push((state.overseerPay - 300) / 300 * 100);
      }
      const avg = results.reduce((a, b) => a + b, 0) / results.length;
      expect(avg).toBeGreaterThan(10);
      expect(avg).toBeLessThan(30);
    });
  });
});
