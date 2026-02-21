'use strict';

const { createGameState } = require('../../src/engine/state');
const { createRandom } = require('../../src/engine/random');
const {
  lookup,
  overseerEffectivenessTable, stressLashTable,
  positiveMotiveTable, negativeMotiveTable
} = require('../../src/engine/tables');
const { horseEfficiency } = require('../../src/engine/health');
const {
  hireOverseers, fireOverseers, obtainOverseers,
  payOverseers,
  calculateOverseerEffectiveness,
  slaveToOverseerRatio, overseerEffPerSlave,
  calculateStress, calculateLashRate, calculateMotivation,
  handleUnpaidOverseers
} = require('../../src/engine/overseers');

describe('overseers', () => {
  let state;

  beforeEach(() => {
    state = createGameState(42);
  });

  // -----------------------------------------------------------
  // Hiring and Firing
  // -----------------------------------------------------------

  describe('hireOverseers', () => {
    it('increases overseer count', () => {
      state.overseers = 5;
      const result = hireOverseers(state, 3);
      expect(result.ok).toBe(true);
      expect(state.overseers).toBe(8);
    });

    it('rejects fractional input', () => {
      state.overseers = 5;
      const result = hireOverseers(state, 2.5);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('fractional');
      expect(state.overseers).toBe(5);
    });

    it('accepts zero', () => {
      state.overseers = 5;
      const result = hireOverseers(state, 0);
      expect(result.ok).toBe(true);
      expect(state.overseers).toBe(5);
    });
  });

  describe('fireOverseers', () => {
    it('decreases overseer count', () => {
      state.overseers = 5;
      const result = fireOverseers(state, 2);
      expect(result.ok).toBe(true);
      expect(state.overseers).toBe(3);
    });

    it('rejects firing more than employed', () => {
      state.overseers = 3;
      const result = fireOverseers(state, 5);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('tooMany');
      expect(state.overseers).toBe(3);
    });

    it('rejects fractional input', () => {
      state.overseers = 5;
      const result = fireOverseers(state, 1.5);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('fractional');
    });

    it('allows firing all overseers', () => {
      state.overseers = 5;
      const result = fireOverseers(state, 5);
      expect(result.ok).toBe(true);
      expect(state.overseers).toBe(0);
    });
  });

  describe('obtainOverseers', () => {
    it('hires to reach target when target > current', () => {
      state.overseers = 5;
      const result = obtainOverseers(state, 10);
      expect(result.ok).toBe(true);
      expect(state.overseers).toBe(10);
    });

    it('fires to reach target when target < current', () => {
      state.overseers = 10;
      const result = obtainOverseers(state, 3);
      expect(result.ok).toBe(true);
      expect(state.overseers).toBe(3);
    });

    it('does nothing when target equals current', () => {
      state.overseers = 5;
      const result = obtainOverseers(state, 5);
      expect(result.ok).toBe(true);
      expect(state.overseers).toBe(5);
    });

    it('rejects fractional target', () => {
      state.overseers = 5;
      const result = obtainOverseers(state, 7.5);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('fractional');
    });
  });

  // -----------------------------------------------------------
  // Monthly Salary
  // -----------------------------------------------------------

  describe('payOverseers', () => {
    it('deducts overseers * overseerPay from gold', () => {
      state.overseers = 10;
      state.overseerPay = 500;
      state.gold = 10000;
      const cost = payOverseers(state);
      expect(cost).toBe(5000);
      expect(state.gold).toBe(5000);
    });

    it('returns 0 when no overseers', () => {
      state.overseers = 0;
      state.gold = 10000;
      const cost = payOverseers(state);
      expect(cost).toBe(0);
      expect(state.gold).toBe(10000);
    });

    it('can make gold negative', () => {
      state.overseers = 10;
      state.overseerPay = 500;
      state.gold = 1000;
      payOverseers(state);
      expect(state.gold).toBe(-4000);
    });
  });

  // -----------------------------------------------------------
  // Overseer Effectiveness
  // -----------------------------------------------------------

  describe('calculateOverseerEffectiveness', () => {
    it('returns 0 when no overseers', () => {
      state.overseers = 0;
      const rng = createRandom(42);
      expect(calculateOverseerEffectiveness(state, rng)).toBe(0);
    });

    it('uses horse-to-overseer ratio and horse efficiency', () => {
      state.overseers = 5;
      state.horses = 10;
      state.horseHealth = 1.0;
      const rng = createRandom(42);
      const result = calculateOverseerEffectiveness(state, rng);
      // ratio = 10/5 = 2.0, hEff = 1.0, mounted = 2.0
      // lookup(2.0, table) = 1.0 (max)
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(2.0); // absGaussian(1.0,0.1) ~ 1.0
    });

    it('horse efficiency reduces mounted effectiveness', () => {
      state.overseers = 5;
      state.horses = 10;

      state.horseHealth = 1.0;
      const rng1 = createRandom(42);
      const highEff = calculateOverseerEffectiveness(state, rng1);

      state.horseHealth = 0.5;
      const rng2 = createRandom(42);
      const lowEff = calculateOverseerEffectiveness(state, rng2);

      expect(highEff).toBeGreaterThan(lowEff);
    });

    it('averages close to table lookup over many trials', () => {
      state.overseers = 5;
      state.horses = 10;
      state.horseHealth = 0.9;
      const hEff = horseEfficiency(0.9);
      const mounted = (10 / 5) * hEff;
      const expected = lookup(mounted, overseerEffectivenessTable);

      const results = [];
      for (let i = 0; i < 200; i++) {
        const s = createGameState(42);
        s.overseers = 5; s.horses = 10; s.horseHealth = 0.9;
        const rng = createRandom(i * 7 + 1);
        results.push(calculateOverseerEffectiveness(s, rng));
      }
      const avg = results.reduce((a, b) => a + b, 0) / results.length;
      expect(avg).toBeGreaterThan(expected * 0.8);
      expect(avg).toBeLessThan(expected * 1.2);
    });
  });

  // -----------------------------------------------------------
  // Slave-to-Overseer Ratio
  // -----------------------------------------------------------

  describe('slaveToOverseerRatio', () => {
    it('divides slaves by (overseers + 1)', () => {
      state.slaves = 100;
      state.overseers = 5;
      expect(slaveToOverseerRatio(state)).toBeCloseTo(100 / 6, 5);
    });

    it('pharaoh counts as +1 overseer', () => {
      state.slaves = 100;
      state.overseers = 0;
      expect(slaveToOverseerRatio(state)).toBe(100);
    });
  });

  describe('overseerEffPerSlave', () => {
    it('divides effectiveness by ratio', () => {
      state.slaves = 100;
      state.overseers = 5;
      const ratio = slaveToOverseerRatio(state);
      const eff = 0.8;
      expect(overseerEffPerSlave(state, eff)).toBeCloseTo(eff / ratio, 5);
    });

    it('returns 0 when no slaves', () => {
      state.slaves = 0;
      state.overseers = 5;
      expect(overseerEffPerSlave(state, 0.8)).toBe(0);
    });
  });

  // -----------------------------------------------------------
  // Stress
  // -----------------------------------------------------------

  describe('calculateStress', () => {
    it('increases pressure when work deficit > 0', () => {
      state.overseerPressure = 0.3;
      const { stress, relaxation } = calculateStress(state, 5);
      expect(stress).toBeCloseTo(0.5, 5);
      expect(relaxation).toBe(0);
      expect(state.overseerPressure).toBeCloseTo(0.8, 5);
    });

    it('caps stress at 1', () => {
      state.overseerPressure = 0.3;
      const { stress } = calculateStress(state, 15);
      expect(stress).toBe(1);
    });

    it('relaxes pressure when no deficit', () => {
      state.overseerPressure = 0.6;
      const { stress, relaxation } = calculateStress(state, 0);
      expect(stress).toBe(0);
      expect(relaxation).toBeCloseTo(0.18, 5);
      expect(state.overseerPressure).toBeCloseTo(0.42, 5);
    });

    it('formula: pressure + stress - relaxation', () => {
      state.overseerPressure = 0.5;
      calculateStress(state, 3);
      // stress = min(1, 3/10) = 0.3, relaxation = 0
      expect(state.overseerPressure).toBeCloseTo(0.8, 5);
    });
  });

  // -----------------------------------------------------------
  // Lash Rate
  // -----------------------------------------------------------

  describe('calculateLashRate', () => {
    it('uses stress table and overseer eff per slave', () => {
      state.overseers = 5;
      state.horses = 10;
      state.horseHealth = 1.0;
      state.slaves = 100;
      state.overseerPressure = 0.7;
      const rng = createRandom(42);
      const result = calculateLashRate(state, rng);
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('returns 0 when no overseers', () => {
      state.overseers = 0;
      state.slaves = 100;
      state.overseerPressure = 0.7;
      const rng = createRandom(42);
      const result = calculateLashRate(state, rng);
      expect(result).toBe(0);
    });
  });

  // -----------------------------------------------------------
  // Motivation
  // -----------------------------------------------------------

  describe('calculateMotivation', () => {
    it('returns positive + negative motivation', () => {
      state.overseers = 5;
      state.horses = 10;
      state.horseHealth = 1.0;
      state.slaves = 100;
      state.overseerPressure = 0.3;
      const rng = createRandom(42);
      const result = calculateMotivation(state, rng);
      expect(result).toHaveProperty('positiveMotivation');
      expect(result).toHaveProperty('negativeMotivation');
      expect(result).toHaveProperty('total');
      expect(result.total).toBeCloseTo(
        result.positiveMotivation + result.negativeMotivation, 5);
    });

    it('positive motivation from oversight table', () => {
      state.overseers = 5;
      state.horses = 10;
      state.horseHealth = 1.0;
      state.slaves = 100;
      state.overseerPressure = 0;
      const rng = createRandom(42);
      const result = calculateMotivation(state, rng);
      expect(result.positiveMotivation).toBeGreaterThanOrEqual(0);
    });

    it('negative motivation from lashing table', () => {
      state.overseers = 5;
      state.horses = 10;
      state.horseHealth = 1.0;
      state.slaves = 100;
      state.overseerPressure = 0.5;
      const rng = createRandom(42);
      const result = calculateMotivation(state, rng);
      expect(result.negativeMotivation).toBeGreaterThanOrEqual(0);
    });
  });

  // -----------------------------------------------------------
  // Unpaid Overseers
  // -----------------------------------------------------------

  describe('handleUnpaidOverseers', () => {
    it('fires all overseers when gold < 0', () => {
      state.overseers = 5;
      state.gold = -1000;
      const rng = createRandom(42);
      handleUnpaidOverseers(state, rng);
      expect(state.overseers).toBe(0);
    });

    it('raises pay by approximately 20%', () => {
      const results = [];
      for (let i = 0; i < 200; i++) {
        const s = createGameState(42);
        s.overseers = 5;
        s.gold = -1000;
        s.overseerPay = 300;
        const rng = createRandom(i * 7 + 1);
        handleUnpaidOverseers(s, rng);
        results.push(s.overseerPay / 300);
      }
      const avg = results.reduce((a, b) => a + b, 0) / results.length;
      expect(avg).toBeGreaterThan(1.1);
      expect(avg).toBeLessThan(1.3);
    });

    it('returns raise percent', () => {
      state.overseers = 5;
      state.gold = -1000;
      const rng = createRandom(42);
      const raisePercent = handleUnpaidOverseers(state, rng);
      expect(typeof raisePercent).toBe('number');
      expect(raisePercent).toBeGreaterThan(0);
    });

    it('does nothing when gold >= 0', () => {
      state.overseers = 5;
      state.gold = 100;
      state.overseerPay = 300;
      const rng = createRandom(42);
      const result = handleUnpaidOverseers(state, rng);
      expect(result).toBeNull();
      expect(state.overseers).toBe(5);
      expect(state.overseerPay).toBe(300);
    });
  });
});
