'use strict';

const { createGameState } = require('../../src/engine/state');
const { createRandom } = require('../../src/engine/random');
const { lookup, workAbilityTable, oxMultTable } = require('../../src/engine/tables');
const {
  calculateWorkComponents, sumComponents,
  calculateTotalRequiredWork,
  calculateWorkAbility, calculateOxMultiplier,
  calculateMaxWorkPerSlave, calculateSlaveEfficiency,
  calculateWorkDeficit
} = require('../../src/engine/workload');

describe('workload', () => {
  let state;

  beforeEach(() => {
    state = createGameState(42);
    state.slaves = 100;
  });

  describe('calculateWorkComponents', () => {
    it('computes ox tending as oxen * 1', () => {
      state.oxen = 50;
      const c = calculateWorkComponents(state);
      expect(c.oxTending).toBe(50);
    });

    it('computes manure spreading as manureSpreadQuota * 64', () => {
      state.manureSpreadQuota = 10;
      const c = calculateWorkComponents(state);
      expect(c.manureSpreading).toBe(640);
    });

    it('computes wheat sowing as plantingQuota * 30', () => {
      state.plantingQuota = 20;
      const c = calculateWorkComponents(state);
      expect(c.wheatSowing).toBe(600);
    });

    it('computes field tending as planted * 20 + growing * 15', () => {
      state.planted = 10;
      state.growing = 20;
      const c = calculateWorkComponents(state);
      expect(c.fieldTending).toBe(10 * 20 + 20 * 15);
    });

    it('computes wheat harvest as wheatRipe * 0.1 + ripe * 20', () => {
      state.wheatRipe = 1000;
      state.ripe = 5;
      const c = calculateWorkComponents(state);
      expect(c.wheatHarvest).toBe(1000 * 0.1 + 5 * 20);
    });

    it('computes horse tending as horses * 1', () => {
      state.horses = 30;
      const c = calculateWorkComponents(state);
      expect(c.horseTending).toBe(30);
    });

    it('computes pyramid work as stoneQuota * pyramidHeight * 12', () => {
      state.stoneQuota = 50;
      state.pyramidHeight = 10;
      const c = calculateWorkComponents(state);
      expect(c.pyramidWork).toBe(50 * 10 * 12);
    });

    it('includes temporary work addition', () => {
      state.temporaryWorkAddition = 5000;
      const c = calculateWorkComponents(state);
      expect(c.temporaryWork).toBe(5000);
    });

    it('returns all zeros for default state', () => {
      const c = calculateWorkComponents(state);
      const sum = sumComponents(c);
      expect(sum).toBe(0);
    });
  });

  describe('sumComponents', () => {
    it('sums all component values', () => {
      const components = { a: 10, b: 20, c: 30 };
      expect(sumComponents(components)).toBe(60);
    });
  });

  describe('calculateTotalRequiredWork', () => {
    it('randomizes the sum with absGaussian(1.0, 0.1)', () => {
      state.oxen = 100;
      state.planted = 50;
      const results = [];
      for (let i = 0; i < 100; i++) {
        const rng = createRandom(i * 7 + 1);
        results.push(calculateTotalRequiredWork(state, rng));
      }
      const base = 100 * 1 + 50 * 20; // 1100
      const avg = results.reduce((a, b) => a + b, 0) / results.length;
      expect(avg).toBeGreaterThan(base * 0.85);
      expect(avg).toBeLessThan(base * 1.15);
    });

    it('returns 0 when all components are 0', () => {
      const rng = createRandom(1);
      const result = calculateTotalRequiredWork(state, rng);
      expect(result).toBe(0);
    });
  });

  describe('calculateWorkAbility', () => {
    it('looks up from workAbilityTable based on health', () => {
      const rng = createRandom(1);
      const ability = calculateWorkAbility(1.0, rng);
      const base = lookup(1.0, workAbilityTable); // 20
      expect(ability).toBeGreaterThan(base * 0.7);
      expect(ability).toBeLessThan(base * 1.4);
    });

    it('returns near 0 for health 0', () => {
      const rng = createRandom(1);
      const ability = calculateWorkAbility(0, rng);
      expect(ability).toBe(0);
    });

    it('scales approximately with health', () => {
      const rng1 = createRandom(99);
      const rng2 = createRandom(99);
      const low = calculateWorkAbility(0.3, rng1);
      const high = calculateWorkAbility(0.8, rng2);
      expect(high).toBeGreaterThan(low);
    });
  });

  describe('calculateOxMultiplier', () => {
    it('returns 1 when no oxen', () => {
      state.oxen = 0;
      state.oxenEfficiency = 1.0;
      const rng = createRandom(1);
      expect(calculateOxMultiplier(state, rng)).toBe(1);
    });

    it('returns lookup value * efficiency for ratio 0.5', () => {
      state.slaves = 100;
      state.oxen = 50;
      state.oxenEfficiency = 0.9;
      const rng = createRandom(1);
      const rawMult = lookup(0.5, oxMultTable); // 3.0
      const result = calculateOxMultiplier(state, rng);
      expect(result).toBeCloseTo(rawMult * 0.9, 6);
    });

    it('floors at 1.0 even with low efficiency', () => {
      state.slaves = 100;
      state.oxen = 200;
      state.oxenEfficiency = 0.1;
      const rng = createRandom(1);
      const rawMult = lookup(2.0, oxMultTable); // clamped to max=1, so 4.0
      // 4.0 * 0.1 = 0.4, floored to 1.0
      expect(calculateOxMultiplier(state, rng)).toBe(1);
    });

    it('handles 0 slaves gracefully', () => {
      state.slaves = 0;
      state.oxen = 10;
      state.oxenEfficiency = 1.0;
      const rng = createRandom(1);
      expect(calculateOxMultiplier(state, rng)).toBe(1);
    });
  });

  describe('calculateMaxWorkPerSlave', () => {
    it('returns motivation * workAbility * oxMult', () => {
      expect(calculateMaxWorkPerSlave(1.2, 8.0, 1.5)).toBeCloseTo(14.4, 6);
    });

    it('returns 0 when motivation is 0', () => {
      expect(calculateMaxWorkPerSlave(0, 10, 2)).toBe(0);
    });

    it('returns 0 when work ability is 0', () => {
      expect(calculateMaxWorkPerSlave(1.0, 0, 2)).toBe(0);
    });
  });

  describe('calculateSlaveEfficiency', () => {
    it('returns 1.0 when work exceeds required', () => {
      expect(calculateSlaveEfficiency(1200, 1000)).toBe(1.0);
    });

    it('returns ratio when work is less than required', () => {
      expect(calculateSlaveEfficiency(800, 1000)).toBeCloseTo(0.8, 6);
    });

    it('returns 1.0 when exactly equal', () => {
      expect(calculateSlaveEfficiency(1000, 1000)).toBe(1.0);
    });

    it('returns 1.0 when required is 0', () => {
      expect(calculateSlaveEfficiency(0, 0)).toBe(1.0);
    });
  });

  describe('calculateWorkDeficit', () => {
    it('returns deficit when max < required', () => {
      expect(calculateWorkDeficit(8, 12)).toBe(4);
    });

    it('returns 0 when max >= required', () => {
      expect(calculateWorkDeficit(12, 10)).toBe(0);
    });

    it('returns 0 when exactly equal', () => {
      expect(calculateWorkDeficit(10, 10)).toBe(0);
    });
  });
});
