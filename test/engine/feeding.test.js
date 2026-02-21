'use strict';

const { createRandom, absGaussian } = require('../../src/engine/random');
const {
  setFeedRate,
  calculateWheatDemand,
  calculateWheatEfficiency,
  feedAll,
  produceManure,
  clampManure
} = require('../../src/engine/feeding');
const { createGameState } = require('../../src/engine/state');

describe('feeding', () => {
  let state;

  beforeEach(() => {
    state = createGameState(42);
  });

  describe('setFeedRate', () => {
    it('sets slave feed rate', () => {
      setFeedRate(state, 'slave', 9.5);
      expect(state.slaveFeedRate).toBe(9.5);
    });

    it('sets oxen feed rate', () => {
      setFeedRate(state, 'oxen', 60);
      expect(state.oxenFeedRate).toBe(60);
    });

    it('sets horse feed rate', () => {
      setFeedRate(state, 'horse', 50);
      expect(state.horseFeedRate).toBe(50);
    });

    it('rejects negative feed rate', () => {
      const result = setFeedRate(state, 'slave', -5);
      expect(result).toBe(false);
      expect(state.slaveFeedRate).toBe(0);
    });

    it('allows zero feed rate', () => {
      setFeedRate(state, 'slave', 0);
      expect(state.slaveFeedRate).toBe(0);
    });

    it('returns true on valid input', () => {
      expect(setFeedRate(state, 'slave', 10)).toBe(true);
    });

    it('returns false on negative input', () => {
      expect(setFeedRate(state, 'oxen', -1)).toBe(false);
    });
  });

  describe('calculateWheatDemand', () => {
    it('calculates total wheat demand for feeding and sowing', () => {
      state.slaves = 100;
      state.slaveFeedRate = 10;
      state.oxen = 50;
      state.oxenFeedRate = 60;
      state.horses = 20;
      state.horseFeedRate = 50;
      const slaveEfficiency = 0.8;
      const sowingWheat = 500;

      const demand = calculateWheatDemand(state, slaveEfficiency, sowingWheat);
      // slave: 100 * 10 = 1000
      // oxen: 60 * 0.8 * 50 * 0.8 = 1920
      // horse: 50 * 0.8 * 20 * 0.8 = 640
      // total feeding = 3560, plus sowing 500 = 4060
      expect(demand).toBeCloseTo(4060, 1);
    });

    it('returns only sowing wheat when no animals', () => {
      state.slaves = 0;
      state.oxen = 0;
      state.horses = 0;
      const demand = calculateWheatDemand(state, 1.0, 200);
      expect(demand).toBe(200);
    });

    it('applies slave efficiency to oxen and horse feeding', () => {
      state.slaves = 0;
      state.oxen = 10;
      state.oxenFeedRate = 100;
      state.horses = 0;
      const eff05 = calculateWheatDemand(state, 0.5, 0);
      // oxen: 100 * 0.5 * 10 * 0.5 = 250
      expect(eff05).toBeCloseTo(250, 1);
    });
  });

  describe('calculateWheatEfficiency', () => {
    it('returns 1.0 when wheat available >= demand', () => {
      expect(calculateWheatEfficiency(5000, 3000)).toBe(1.0);
    });

    it('returns ratio when wheat available < demand', () => {
      expect(calculateWheatEfficiency(3000, 5000)).toBeCloseTo(0.6, 5);
    });

    it('returns 1.0 when available equals demand', () => {
      expect(calculateWheatEfficiency(3000, 3000)).toBe(1.0);
    });

    it('returns 0.0 when no wheat available and demand > 0', () => {
      expect(calculateWheatEfficiency(0, 5000)).toBe(0.0);
    });

    it('returns 1.0 when demand is zero', () => {
      expect(calculateWheatEfficiency(100, 0)).toBe(1.0);
    });
  });

  describe('feedAll', () => {
    beforeEach(() => {
      state.slaves = 100;
      state.slaveFeedRate = 10;
      state.oxen = 50;
      state.oxenFeedRate = 60;
      state.horses = 20;
      state.horseFeedRate = 50;
    });

    it('calculates wheat fed to slaves', () => {
      const result = feedAll(state, 0.8, 1.0);
      expect(result.slaveWheat).toBeCloseTo(1000, 1);
    });

    it('calculates wheat fed to oxen with double slave efficiency', () => {
      const result = feedAll(state, 0.8, 1.0);
      // 60 * 0.8 * 50 * 0.8 = 1920
      expect(result.oxenWheat).toBeCloseTo(1920, 1);
    });

    it('calculates wheat fed to horses with double slave efficiency', () => {
      const result = feedAll(state, 0.8, 1.0);
      // 50 * 0.8 * 20 * 0.8 = 640
      expect(result.horseWheat).toBeCloseTo(640, 1);
    });

    it('returns correct total eaten', () => {
      const result = feedAll(state, 0.8, 1.0);
      expect(result.totalEaten).toBeCloseTo(1000 + 1920 + 640, 1);
    });

    it('applies wheat efficiency to reduce feeding', () => {
      const result = feedAll(state, 0.8, 0.6);
      expect(result.slaveWheat).toBeCloseTo(1000 * 0.6, 1);
      expect(result.oxenWheat).toBeCloseTo(1920 * 0.6, 1);
      expect(result.horseWheat).toBeCloseTo(640 * 0.6, 1);
    });

    it('returns zero when wheat efficiency is 0', () => {
      const result = feedAll(state, 1.0, 0.0);
      expect(result.totalEaten).toBe(0);
    });

    it('slave wheat does not use slave efficiency', () => {
      const result = feedAll(state, 0.5, 1.0);
      // slaves * slaveFeedRate = 100 * 10 = 1000 (no slaveEfficiency)
      expect(result.slaveWheat).toBeCloseTo(1000, 1);
    });
  });

  describe('produceManure', () => {
    it('produces approximately 1 ton per 100 bushels', () => {
      const rng = createRandom(42);
      const manure = produceManure(3000, rng);
      // 3000 / 100 * ~1.0 = ~30
      expect(manure).toBeGreaterThan(20);
      expect(manure).toBeLessThan(45);
    });

    it('produces zero manure from zero wheat', () => {
      const rng = createRandom(42);
      expect(produceManure(0, rng)).toBe(0);
    });

    it('varies across different seeds', () => {
      const results = [];
      for (let i = 0; i < 50; i++) {
        const rng = createRandom(i * 7 + 1);
        results.push(produceManure(1000, rng));
      }
      const min = Math.min(...results);
      const max = Math.max(...results);
      expect(max).toBeGreaterThan(min);
    });

    it('averages close to wheatEaten/100', () => {
      const results = [];
      for (let i = 0; i < 200; i++) {
        const rng = createRandom(i * 13 + 1);
        results.push(produceManure(1000, rng));
      }
      const avg = results.reduce((a, b) => a + b, 0) / results.length;
      expect(avg).toBeGreaterThan(8);
      expect(avg).toBeLessThan(12);
    });
  });

  describe('clampManure', () => {
    it('subtracts manure used from stockpile', () => {
      expect(clampManure(50, 20)).toBe(30);
    });

    it('clamps to 0 when usage exceeds stockpile', () => {
      expect(clampManure(10, 15)).toBe(0);
    });

    it('returns full stockpile when no usage', () => {
      expect(clampManure(10, 0)).toBe(10);
    });

    it('returns 0 when usage exactly equals stockpile', () => {
      expect(clampManure(10, 10)).toBe(0);
    });
  });
});
