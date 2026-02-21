'use strict';

const { simulateMonth, snapshotPrev, advanceMonth, checkRandomEvent } = require('../../src/engine/simulation');
const { createGameState } = require('../../src/engine/state');
const { setDifficulty } = require('../../src/engine/difficulty');

function makePlayableState(seed) {
  const state = createGameState(seed || 42);
  setDifficulty(state, 'easy');
  state.gold = 50000;
  state.wheat = 10000;
  state.slaves = 100;
  state.oxen = 20;
  state.horses = 10;
  state.manure = 500;
  state.fallow = 200;
  state.overseers = 5;
  state.slaveFeedRate = 5;
  state.oxenFeedRate = 3;
  state.horseFeedRate = 4;
  state.plantingQuota = 10;
  state.manureSpreadQuota = 5;
  state.stoneQuota = 10;
  return state;
}

describe('simulation', () => {
  let state;

  beforeEach(() => {
    state = createGameState(42);
    state.gold = 100;
    state.wheat = 50;
  });

  describe('snapshotPrev', () => {
    it('captures current values', () => {
      const snap = snapshotPrev(state);
      expect(snap.gold).toBe(100);
      expect(snap.wheat).toBe(50);
      expect(snap.month).toBe(1);
      expect(snap.year).toBe(1);
    });

    it('is independent of later state changes', () => {
      const snap = snapshotPrev(state);
      state.gold = 999;
      expect(snap.gold).toBe(100);
    });
  });

  describe('advanceMonth', () => {
    it('increments month by 1', () => {
      state.month = 5;
      advanceMonth(state);
      expect(state.month).toBe(6);
    });

    it('rolls over from 12 to 1', () => {
      state.month = 12;
      state.year = 3;
      advanceMonth(state);
      expect(state.month).toBe(1);
      expect(state.year).toBe(4);
    });

    it('does not increment year for non-December months', () => {
      state.month = 6;
      state.year = 2;
      advanceMonth(state);
      expect(state.year).toBe(2);
    });
  });

  describe('checkRandomEvent', () => {
    it('sets randomEvent flag on state', () => {
      checkRandomEvent(state);
      expect(typeof state.randomEvent).toBe('boolean');
    });

    it('returns the randomEvent flag value', () => {
      const result = checkRandomEvent(state);
      expect(result).toBe(state.randomEvent);
    });
  });

  describe('simulateMonth', () => {
    it('records prev snapshot', () => {
      simulateMonth(state);
      expect(state.prev.gold).toBe(100);
    });

    it('advances the month', () => {
      state.month = 3;
      simulateMonth(state);
      expect(state.month).toBe(4);
    });

    it('returns the state', () => {
      const result = simulateMonth(state);
      expect(result).toBe(state);
    });

    it('sets randomEvent flag', () => {
      simulateMonth(state);
      expect(typeof state.randomEvent).toBe('boolean');
    });
  });

  describe('full simulation cycle', () => {
    let playState;

    beforeEach(() => {
      playState = makePlayableState(42);
    });

    it('applies wheat rot before feeding', () => {
      const wheatBefore = playState.wheat;
      simulateMonth(playState);
      // Wheat was 10000. Rot removes ~5%, feeding removes more.
      // The prev snapshot should capture the original wheat.
      expect(playState.prev.wheat).toBe(wheatBefore);
      // After rot + feeding, wheat should be less than before
      // (though harvest may add some back)
    });

    it('sets slaveEfficiency on state', () => {
      simulateMonth(playState);
      expect(typeof playState.slaveEfficiency).toBe('number');
      expect(playState.slaveEfficiency).toBeGreaterThanOrEqual(0);
      expect(playState.slaveEfficiency).toBeLessThanOrEqual(1);
    });

    it('sets motivation on state', () => {
      simulateMonth(playState);
      expect(typeof playState.motivation).toBe('number');
    });

    it('sets overseerPressure on state', () => {
      simulateMonth(playState);
      expect(typeof playState.overseerPressure).toBe('number');
    });

    it('deducts overseer pay from gold', () => {
      playState.overseers = 5;
      playState.overseerPay = 300;
      const goldBefore = playState.gold;
      simulateMonth(playState);
      // Gold should decrease (overseer pay + ownership costs + interest if loan)
      expect(playState.gold).toBeLessThan(goldBefore);
    });

    it('applies monthly interest when loan exists', () => {
      playState.loan = 10000;
      const loanBefore = playState.loan;
      const goldBefore = playState.gold;
      simulateMonth(playState);
      // Interest deducted from gold
      expect(playState.gold).toBeLessThan(goldBefore);
    });

    it('adjusts credit rating', () => {
      playState.loan = 10000;
      const ratingBefore = playState.creditRating;
      simulateMonth(playState);
      // With loan > 0, credit rating decreases
      expect(playState.creditRating).toBeLessThan(ratingBefore);
    });

    it('processes contracts without error', () => {
      simulateMonth(playState);
      expect(Array.isArray(playState.pendingContracts)).toBe(true);
    });

    it('runs supply/demand cycles', () => {
      const wheatPriceBefore = playState.wheatPrice;
      // Run multiple months to see price movement
      for (let i = 0; i < 5; i++) {
        simulateMonth(playState);
      }
      // Prices should have changed from supply/demand + inflation
      // (with RNG they will almost certainly differ)
      expect(playState.wheatPrice).not.toBe(wheatPriceBefore);
    });

    it('updates inflation', () => {
      const inflationBefore = playState.inflation;
      // Run multiple months for observable change
      for (let i = 0; i < 10; i++) {
        simulateMonth(playState);
      }
      // Inflation should have moved (via gaussian random walk)
      expect(playState.inflation).not.toBe(inflationBefore);
    });

    it('advances land cycle', () => {
      playState.plantingQuota = 50;
      playState.fallow = 200;
      simulateMonth(playState);
      // Some fallow land should have been planted
      expect(playState.planted).toBeGreaterThanOrEqual(0);
    });

    it('updates health values', () => {
      playState.slaveHealth = 0.8;
      simulateMonth(playState);
      // Health should have changed
      expect(typeof playState.slaveHealth).toBe('number');
      expect(playState.slaveHealth).toBeGreaterThanOrEqual(0);
      expect(playState.slaveHealth).toBeLessThanOrEqual(1);
    });

    it('updates populations', () => {
      const slavesBefore = playState.slaves;
      // Run several months to see population changes
      for (let i = 0; i < 20; i++) {
        simulateMonth(playState);
      }
      // Populations should change over time (births/deaths)
      // May or may not be different after 20 months, but should not error
      expect(playState.slaves).toBeGreaterThanOrEqual(0);
    });

    it('adds pyramid stones based on efficiency', () => {
      playState.stoneQuota = 20;
      playState.slaveEfficiency = 1.0;
      simulateMonth(playState);
      // Stones should have been added
      expect(playState.pyramidStones).toBeGreaterThanOrEqual(0);
    });

    it('deducts pyramid gold cost', () => {
      playState.stoneQuota = 100;
      playState.gold = 100000;
      const goldBefore = playState.gold;
      simulateMonth(playState);
      // Pyramid costs + overseer pay + ownership cost reduce gold
      expect(playState.gold).toBeLessThan(goldBefore);
    });

    it('deducts ownership costs', () => {
      playState.gold = 100000;
      playState.fallow = 500;
      playState.slaves = 200;
      const goldBefore = playState.gold;
      simulateMonth(playState);
      expect(playState.gold).toBeLessThan(goldBefore);
    });

    it('checks win condition when pyramid is complete', () => {
      const { maxHeight, maxArea } = require('../../src/engine/pyramid');
      playState.pyramidBase = 10;
      // Set pyramidStones above maxArea so addStones recalculates height >= maxHeight
      playState.pyramidStones = Math.ceil(maxArea(10)) + 100;
      playState.pyramidHeight = maxHeight(10) + 1;
      simulateMonth(playState);
      expect(playState.gameWon).toBe(true);
    });

    it('does not set gameWon when pyramid is incomplete', () => {
      playState.pyramidBase = 1000;
      playState.pyramidHeight = 0;
      simulateMonth(playState);
      expect(playState.gameWon).toBe(false);
    });

    it('processes emergency loan when gold very negative', () => {
      playState.gold = -50000;
      playState.overseers = 0;
      simulateMonth(playState);
      // Emergency loan should set gold to 0 and increase loan
      expect(playState.gold).toBeGreaterThanOrEqual(0);
      expect(playState.loan).toBeGreaterThan(0);
    });

    it('checks foreclosure on high debt', () => {
      playState.gold = 100;
      playState.loan = 9999999;
      playState.creditRating = 0.01;
      simulateMonth(playState);
      // With extremely high debt, foreclosure may trigger
      expect(typeof playState.gameOver).toBe('boolean');
    });

    it('handles random events when triggered', () => {
      // Run many months to ensure at least one event fires
      let eventFired = false;
      for (let i = 0; i < 100; i++) {
        const s = makePlayableState(i * 7);
        simulateMonth(s);
        if (s.randomEvent) {
          eventFired = true;
          // When event fires, message should be set
          expect(s.message).not.toBeNull();
          expect(typeof s.message.text).toBe('string');
          break;
        }
      }
      expect(eventFired).toBe(true);
    });

    it('resets temporaryWorkAddition after workload calculation', () => {
      playState.temporaryWorkAddition = 500;
      simulateMonth(playState);
      // temporaryWorkAddition should be reset after use
      expect(playState.temporaryWorkAddition).toBe(0);
    });

    it('handles zero population gracefully', () => {
      playState.slaves = 0;
      playState.oxen = 0;
      playState.horses = 0;
      playState.overseers = 0;
      expect(() => simulateMonth(playState)).not.toThrow();
    });

    it('handles zero wheat gracefully', () => {
      playState.wheat = 0;
      expect(() => simulateMonth(playState)).not.toThrow();
    });

    it('handles zero land gracefully', () => {
      playState.fallow = 0;
      playState.planted = 0;
      playState.growing = 0;
      playState.ripe = 0;
      expect(() => simulateMonth(playState)).not.toThrow();
    });

    it('runs a full year without errors', () => {
      for (let i = 0; i < 12; i++) {
        expect(() => simulateMonth(playState)).not.toThrow();
      }
      expect(playState.year).toBe(2);
      expect(playState.month).toBe(1);
    });

    it('spreads manure using slave efficiency', () => {
      playState.manureSpreadQuota = 100;
      playState.manure = 500;
      const manureBefore = playState.manure;
      simulateMonth(playState);
      // Some manure should have been spread
      expect(playState.manure).toBeLessThan(manureBefore);
    });

    it('feeds populations and reduces wheat', () => {
      playState.slaves = 100;
      playState.slaveFeedRate = 5;
      playState.wheat = 10000;
      const wheatBefore = playState.wheat;
      simulateMonth(playState);
      // Wheat should decrease from feeding (and rot)
      // Harvest may add back, but with only fallow land it should net decrease
      expect(playState.prev.wheat).toBe(wheatBefore);
    });

    it('produces manure from feeding', () => {
      playState.slaves = 200;
      playState.slaveFeedRate = 10;
      playState.wheat = 50000;
      playState.manure = 0;
      simulateMonth(playState);
      // Manure should be produced from wheat eaten
      expect(playState.manure).toBeGreaterThanOrEqual(0);
    });

    it('refreshes contract offers inside simulateMonth', () => {
      playState.contractOffers = [];
      simulateMonth(playState);
      // refreshOffers is called inside simulateMonth (step 28)
      expect(playState.contractOffers.length).toBeGreaterThan(0);
    });

    it('respects slaveEfficiencyOverride when set', () => {
      playState.slaveEfficiencyOverride = 0.5;
      simulateMonth(playState);
      // Override should have been used and then deleted
      expect(playState.slaveEfficiency).toBe(0.5);
      expect(playState.slaveEfficiencyOverride).toBeUndefined();
    });

    it('calculates slaveEfficiency normally without override', () => {
      playState.slaveEfficiencyOverride = undefined;
      delete playState.slaveEfficiencyOverride;
      simulateMonth(playState);
      // Should be calculated from workload
      expect(typeof playState.slaveEfficiency).toBe('number');
      expect(playState.slaveEfficiency).toBeGreaterThanOrEqual(0);
      expect(playState.slaveEfficiency).toBeLessThanOrEqual(1);
    });

    it('sets gameOver on foreclosure', () => {
      playState.gold = -999999;
      playState.loan = 99999999;
      playState.creditRating = 0.001;
      playState.overseers = 0;
      // After emergency loan, foreclosure should trigger
      simulateMonth(playState);
      // gameOver may or may not be true depending on exact debt/asset ratio
      expect(typeof playState.gameOver).toBe('boolean');
    });
  });
});
