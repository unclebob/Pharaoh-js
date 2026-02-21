'use strict';

const { createRandom, absGaussian } = require('../../src/engine/random');
const { createGameState } = require('../../src/engine/state');
const { lookup, yieldTable, seasonalYieldTable } = require('../../src/engine/tables');
const {
  SOWING_RATE, ROT_RATE,
  calculateActualPlanting, sowWheat, wheatYield,
  wheatRot, spreadManure, harvest, advanceLandCycle
} = require('../../src/engine/planting');

describe('planting', () => {
  let state;

  beforeEach(() => {
    state = createGameState(42);
  });

  describe('calculateActualPlanting', () => {
    it('plants quota * efficiency when fallow is sufficient', () => {
      state.plantingQuota = 100;
      state.fallow = 200;
      expect(calculateActualPlanting(state, 0.7)).toBeCloseTo(70, 5);
    });

    it('limits planting to available fallow', () => {
      state.plantingQuota = 100;
      state.fallow = 60;
      expect(calculateActualPlanting(state, 1.0)).toBe(60);
    });

    it('returns zero when no fallow land', () => {
      state.plantingQuota = 100;
      state.fallow = 0;
      expect(calculateActualPlanting(state, 1.0)).toBe(0);
    });

    it('returns zero when quota is zero', () => {
      state.plantingQuota = 0;
      state.fallow = 100;
      expect(calculateActualPlanting(state, 1.0)).toBe(0);
    });

    it('applies slave efficiency to quota', () => {
      state.plantingQuota = 100;
      state.fallow = 100;
      expect(calculateActualPlanting(state, 0.5)).toBeCloseTo(50, 5);
    });
  });

  describe('sowWheat', () => {
    it('consumes SOWING_RATE bushels per acre planted', () => {
      state.wheat = 10000;
      state.wheatSewn = 0;
      const consumed = sowWheat(state, 50);
      expect(consumed).toBe(SOWING_RATE * 50);
      expect(state.wheatSewn).toBe(SOWING_RATE * 50);
    });

    it('deducts wheat from stockpile', () => {
      state.wheat = 10000;
      state.wheatSewn = 0;
      sowWheat(state, 50);
      expect(state.wheat).toBe(10000 - SOWING_RATE * 50);
    });

    it('accumulates wheatSewn when called multiple times', () => {
      state.wheat = 10000;
      state.wheatSewn = 100;
      sowWheat(state, 10);
      expect(state.wheatSewn).toBe(100 + SOWING_RATE * 10);
    });

    it('returns zero when no acres planted', () => {
      state.wheat = 10000;
      state.wheatSewn = 0;
      expect(sowWheat(state, 0)).toBe(0);
    });
  });

  describe('wheatYield', () => {
    it('combines fertilizer, variance, and seasonal factors', () => {
      const rng = createRandom(42);
      const result = wheatYield(3.0, 7, rng);
      const fertFactor = lookup(3.0, yieldTable);
      const seasonal = lookup(7, seasonalYieldTable);
      // Result should be in the neighborhood of fertFactor * seasonal
      expect(result).toBeGreaterThan(fertFactor * seasonal * 0.5);
      expect(result).toBeLessThan(fertFactor * seasonal * 2.0);
    });

    it('is higher in July than January', () => {
      const results = { jan: [], jul: [] };
      for (let i = 0; i < 100; i++) {
        const rng1 = createRandom(i * 7 + 1);
        const rng2 = createRandom(i * 7 + 1);
        results.jan.push(wheatYield(3.0, 1, rng1));
        results.jul.push(wheatYield(3.0, 7, rng2));
      }
      const avgJan = results.jan.reduce((a, b) => a + b, 0) / results.jan.length;
      const avgJul = results.jul.reduce((a, b) => a + b, 0) / results.jul.length;
      expect(avgJul).toBeGreaterThan(avgJan);
    });

    it('returns positive values', () => {
      const rng = createRandom(42);
      const result = wheatYield(5.0, 6, rng);
      expect(result).toBeGreaterThan(0);
    });

    it('varies across different seeds', () => {
      const results = [];
      for (let i = 0; i < 50; i++) {
        const rng = createRandom(i * 13 + 1);
        results.push(wheatYield(5.0, 6, rng));
      }
      const min = Math.min(...results);
      const max = Math.max(...results);
      expect(max).toBeGreaterThan(min);
    });
  });

  describe('wheatRot', () => {
    it('removes approximately 5% of stored wheat', () => {
      state.wheat = 10000;
      const rng = createRandom(42);
      const lost = wheatRot(state, rng);
      expect(lost).toBeGreaterThan(300);
      expect(lost).toBeLessThan(800);
    });

    it('deducts rot from wheat stockpile', () => {
      state.wheat = 10000;
      const rng = createRandom(42);
      const lost = wheatRot(state, rng);
      expect(state.wheat).toBeCloseTo(10000 - lost, 5);
    });

    it('returns zero when no wheat stored', () => {
      state.wheat = 0;
      const rng = createRandom(42);
      expect(wheatRot(state, rng)).toBe(0);
    });

    it('averages close to 5% over many trials', () => {
      const results = [];
      for (let i = 0; i < 200; i++) {
        const s = createGameState(i * 7 + 1);
        s.wheat = 10000;
        results.push(wheatRot(s, s.rng) / 10000);
      }
      const avg = results.reduce((a, b) => a + b, 0) / results.length;
      expect(avg).toBeGreaterThan(0.04);
      expect(avg).toBeLessThan(0.06);
    });
  });

  describe('spreadManure', () => {
    it('spreads quota * efficiency when supply is sufficient', () => {
      state.manureSpreadQuota = 500;
      state.manure = 1000;
      state.fallow = 100;
      const actual = spreadManure(state, 0.6);
      expect(actual).toBeCloseTo(300, 5);
    });

    it('limits spread to available manure', () => {
      state.manureSpreadQuota = 500;
      state.manure = 300;
      state.fallow = 100;
      const actual = spreadManure(state, 1.0);
      expect(actual).toBe(300);
    });

    it('deducts spread from manure stockpile', () => {
      state.manureSpreadQuota = 100;
      state.manure = 500;
      state.fallow = 100;
      spreadManure(state, 1.0);
      expect(state.manure).toBe(400);
    });

    it('calculates manurePerAcre', () => {
      state.manureSpreadQuota = 200;
      state.manure = 200;
      state.fallow = 100;
      spreadManure(state, 1.0);
      expect(state.manurePerAcre).toBeCloseTo(2.0, 5);
    });

    it('sets manurePerAcre to 0 when no land', () => {
      state.manureSpreadQuota = 100;
      state.manure = 100;
      state.fallow = 0;
      state.planted = 0;
      state.growing = 0;
      state.ripe = 0;
      spreadManure(state, 1.0);
      expect(state.manurePerAcre).toBe(0);
    });
  });

  describe('harvest', () => {
    it('harvests wheatRipe * slaveEfficiency', () => {
      state.wheatRipe = 5000;
      state.wheat = 0;
      const result = harvest(state, 0.8);
      expect(result.harvested).toBeCloseTo(4000, 5);
    });

    it('calculates lost wheat', () => {
      state.wheatRipe = 5000;
      state.wheat = 0;
      const result = harvest(state, 0.8);
      expect(result.lost).toBeCloseTo(1000, 5);
    });

    it('adds harvested wheat to stockpile', () => {
      state.wheatRipe = 5000;
      state.wheat = 1000;
      harvest(state, 0.8);
      expect(state.wheat).toBeCloseTo(5000, 5);
    });

    it('clears wheatRipe after harvest', () => {
      state.wheatRipe = 5000;
      state.wheat = 0;
      harvest(state, 1.0);
      expect(state.wheatRipe).toBe(0);
    });

    it('harvests nothing when wheatRipe is zero', () => {
      state.wheatRipe = 0;
      state.wheat = 1000;
      const result = harvest(state, 1.0);
      expect(result.harvested).toBe(0);
      expect(result.lost).toBe(0);
      expect(state.wheat).toBe(1000);
    });
  });

  describe('advanceLandCycle', () => {
    it('moves fallow to planted', () => {
      state.fallow = 100;
      state.plantingQuota = 50;
      state.wheat = 10000;
      state.month = 6;
      advanceLandCycle(state, 1.0, state.rng);
      expect(state.planted).toBe(50);
      expect(state.fallow).toBe(50);
    });

    it('moves planted to growing', () => {
      state.planted = 50;
      state.wheatSewn = 1000;
      state.fallow = 50;
      state.month = 6;
      advanceLandCycle(state, 1.0, state.rng);
      expect(state.growing).toBe(50);
      expect(state.wheatGrowing).toBe(1000);
    });

    it('moves growing to ripe with yield multiplier', () => {
      state.growing = 50;
      state.wheatGrowing = 1000;
      state.fallow = 50;
      state.month = 6;
      advanceLandCycle(state, 1.0, state.rng);
      expect(state.ripe).toBe(50);
      expect(state.wheatRipe).toBeGreaterThan(0);
    });

    it('harvests ripe to fallow', () => {
      state.ripe = 50;
      state.wheatRipe = 5000;
      state.fallow = 50;
      state.wheat = 0;
      state.month = 6;
      advanceLandCycle(state, 1.0, state.rng);
      // The 50 ripe went to fallow, so fallow starts at 50+50=100
      // then planting takes some away
      expect(state.wheat).toBeGreaterThan(0);
    });

    it('conserves total land', () => {
      state.fallow = 40;
      state.planted = 30;
      state.growing = 20;
      state.ripe = 10;
      state.wheatSewn = 600;
      state.wheatGrowing = 400;
      state.wheatRipe = 2000;
      state.wheat = 50000;
      state.month = 6;
      state.plantingQuota = 20;
      const totalBefore = state.fallow + state.planted + state.growing + state.ripe;
      advanceLandCycle(state, 1.0, state.rng);
      const totalAfter = state.fallow + state.planted + state.growing + state.ripe;
      expect(totalAfter).toBe(totalBefore);
    });

    it('full four-stage cycle', () => {
      state.fallow = 100;
      state.wheat = 50000;
      state.plantingQuota = 50;
      state.month = 6;

      // Month 1: fallow -> planted
      advanceLandCycle(state, 1.0, state.rng);
      expect(state.planted).toBe(50);
      expect(state.fallow).toBe(50);

      // Month 2: planted -> growing, new planting
      state.plantingQuota = 0;
      advanceLandCycle(state, 1.0, state.rng);
      expect(state.growing).toBe(50);
      expect(state.planted).toBe(0);

      // Month 3: growing -> ripe
      advanceLandCycle(state, 1.0, state.rng);
      expect(state.ripe).toBe(50);
      expect(state.growing).toBe(0);

      // Month 4: ripe -> fallow (harvested)
      advanceLandCycle(state, 1.0, state.rng);
      expect(state.ripe).toBe(0);
      expect(state.fallow).toBe(100);
    });
  });

  describe('constants', () => {
    it('SOWING_RATE is 20 bushels per acre', () => {
      expect(SOWING_RATE).toBe(20);
    });

    it('ROT_RATE is 0.05', () => {
      expect(ROT_RATE).toBe(0.05);
    });
  });
});
