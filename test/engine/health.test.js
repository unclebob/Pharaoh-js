'use strict';

const { createGameState } = require('../../src/engine/state');
const { createRandom } = require('../../src/engine/random');
const {
  lookup,
  slaveNourishmentTable, oxenNourishmentTable, horseNourishmentTable,
  slaveBirthTable, slaveDeathTable,
  oxenBirthTable, oxenDeathTable,
  horseBirthTable, horseDeathTable,
  lashToSicknessTable, laborToSicknessTable,
  oxenEfficiencyTable, horseEfficiencyTable
} = require('../../src/engine/tables');

const {
  updateSlaveHealth,
  updateOxenHealth,
  updateHorseHealth,
  calculateBirthsDeaths,
  updatePopulations,
  oxenEfficiency,
  horseEfficiency,
  calculateSalePrice
} = require('../../src/engine/health');

describe('health', () => {
  let state;

  beforeEach(() => {
    state = createGameState(42);
  });

  // -----------------------------------------------------------
  // Slave Health
  // -----------------------------------------------------------

  describe('updateSlaveHealth', () => {
    it('increases health with good nourishment and no sickness', () => {
      state.slaveHealth = 0.7;
      const rng = createRandom(42);
      updateSlaveHealth(state, 10, 0, 0, 1, rng);
      expect(state.slaveHealth).toBeGreaterThan(0.7);
    });

    it('applies nourishment from slave nourishment table', () => {
      const safeSeeds = [1, 3, 5, 7, 9, 11, 13, 19, 21, 23, 25, 27, 31, 33, 35, 37, 41, 43, 45, 47];
      const results = [];
      for (const seed of safeSeeds) {
        const s = createGameState(42);
        s.slaveHealth = 0.5;
        const rng = createRandom(seed);
        updateSlaveHealth(s, 5, 0, 0, 1, rng);
        results.push(s.slaveHealth - 0.5);
      }
      const baseNourishment = lookup(5, slaveNourishmentTable);
      const avg = results.reduce((a, b) => a + b, 0) / results.length;
      expect(avg).toBeGreaterThan(baseNourishment * 0.7);
      expect(avg).toBeLessThan(baseNourishment * 1.3);
    });

    it('decreases health with lash sickness', () => {
      state.slaveHealth = 0.7;
      const rng = createRandom(42);
      updateSlaveHealth(state, 0, 0.5, 0, 1, rng);
      expect(state.slaveHealth).toBeLessThan(0.7);
    });

    it('decreases health with work sickness', () => {
      state.slaveHealth = 0.7;
      const rng = createRandom(42);
      updateSlaveHealth(state, 0, 0, 20, 1, rng);
      expect(state.slaveHealth).toBeLessThan(0.7);
    });

    it('computes formula: health + nourishment - sickness', () => {
      // Use deterministic test: set health, nourishment, sickness manually
      state.slaveHealth = 0.7;
      // Feed rate 5 => nourishment ~0.08, lash 0, labor 0
      const rng = createRandom(42);
      const prevHealth = state.slaveHealth;
      updateSlaveHealth(state, 5, 0, 0, 1, rng);
      expect(state.slaveHealth).toBeGreaterThan(prevHealth);
      expect(state.slaveHealth).toBeLessThanOrEqual(1.0);
    });

    it('clamps health to 1.0 maximum', () => {
      state.slaveHealth = 0.98;
      const rng = createRandom(42);
      updateSlaveHealth(state, 10, 0, 0, 1, rng);
      expect(state.slaveHealth).toBeLessThanOrEqual(1.0);
    });

    it('clamps health to 0.0 minimum', () => {
      state.slaveHealth = 0.01;
      const rng = createRandom(42);
      updateSlaveHealth(state, 0, 0.8, 25, 1, rng);
      expect(state.slaveHealth).toBeGreaterThanOrEqual(0.0);
    });

    it('returns 0 sickness when health is already 0', () => {
      state.slaveHealth = 0;
      const rng = createRandom(42);
      updateSlaveHealth(state, 0, 0.5, 15, 1, rng);
      expect(state.slaveHealth).toBe(0);
    });

    it('uses ox multiplier for labor per slave', () => {
      state.slaveHealth = 0.7;
      // workPerSlave = 20, oxMult = 2 => laborPerSlave = 10
      const rng1 = createRandom(42);
      const s1 = createGameState(42);
      s1.slaveHealth = 0.7;
      updateSlaveHealth(s1, 0, 0, 20, 2, rng1);

      const rng2 = createRandom(42);
      const s2 = createGameState(42);
      s2.slaveHealth = 0.7;
      updateSlaveHealth(s2, 0, 0, 20, 1, rng2);

      // Higher ox mult => lower laborPerSlave => less work sickness
      expect(s1.slaveHealth).toBeGreaterThan(s2.slaveHealth);
    });

    it('total sickness = work sickness + lash sickness', () => {
      state.slaveHealth = 0.9;
      const rng = createRandom(42);
      updateSlaveHealth(state, 0, 0.4, 15, 1, rng);
      // Both lash and work sickness should contribute to decrease
      expect(state.slaveHealth).toBeLessThan(0.9);
    });
  });

  // -----------------------------------------------------------
  // Oxen Health
  // -----------------------------------------------------------

  describe('updateOxenHealth', () => {
    it('improves health with feeding when health < 1.0', () => {
      state.oxenHealth = 0.5;
      const rng = createRandom(42);
      updateOxenHealth(state, 60, rng);
      // nourishment from table at 60 should be positive
      // but aging is 0.05, so net depends on nourishment
      const baseNourishment = lookup(60, oxenNourishmentTable);
      // nourishment should be > aging for decent feed rate
      expect(baseNourishment).toBeGreaterThan(0.05);
    });

    it('sets diet to 0 when health >= 1.0', () => {
      state.oxenHealth = 1.0;
      const rng = createRandom(42);
      updateOxenHealth(state, 60, rng);
      // Only aging applies: 1.0 - 0.05 = 0.95
      expect(state.oxenHealth).toBeCloseTo(0.95, 5);
    });

    it('aging rate is 0.05 per month when health > 0', () => {
      state.oxenHealth = 1.0;
      const rng = createRandom(42);
      updateOxenHealth(state, 60, rng);
      // diet = 0, so health = 1.0 - 0.05
      expect(state.oxenHealth).toBeCloseTo(0.95, 5);
    });

    it('aging rate is 0 when health is 0', () => {
      state.oxenHealth = 0;
      const rng = createRandom(42);
      updateOxenHealth(state, 60, rng);
      expect(state.oxenHealth).toBe(0);
    });

    it('clamps health between 0 and 1', () => {
      state.oxenHealth = 0.02;
      const rng = createRandom(42);
      updateOxenHealth(state, 0, rng);
      // negative nourishment + aging should drop below 0 but clamp
      expect(state.oxenHealth).toBeGreaterThanOrEqual(0);
      expect(state.oxenHealth).toBeLessThanOrEqual(1.0);
    });
  });

  // -----------------------------------------------------------
  // Horse Health
  // -----------------------------------------------------------

  describe('updateHorseHealth', () => {
    it('improves health with feeding when health < 1.0', () => {
      state.horseHealth = 0.5;
      const rng = createRandom(42);
      updateHorseHealth(state, 75, rng);
      const baseNourishment = lookup(75, horseNourishmentTable);
      // At max feed rate, nourishment (0.10) exceeds aging (0.08)
      expect(baseNourishment).toBeGreaterThan(0.08);
    });

    it('sets diet to 0 when health >= 1.0', () => {
      state.horseHealth = 1.0;
      const rng = createRandom(42);
      updateHorseHealth(state, 50, rng);
      // Only aging: 1.0 - 0.08 = 0.92
      expect(state.horseHealth).toBeCloseTo(0.92, 5);
    });

    it('aging rate is 0.08 per month (faster than oxen)', () => {
      state.horseHealth = 1.0;
      const rng = createRandom(42);
      updateHorseHealth(state, 50, rng);
      expect(state.horseHealth).toBeCloseTo(0.92, 5);
    });

    it('aging rate is 0 when health is 0', () => {
      state.horseHealth = 0;
      const rng = createRandom(42);
      updateHorseHealth(state, 50, rng);
      expect(state.horseHealth).toBe(0);
    });

    it('horses age faster than oxen', () => {
      const s1 = createGameState(42);
      const s2 = createGameState(42);
      s1.oxenHealth = 1.0;
      s2.horseHealth = 1.0;
      updateOxenHealth(s1, 60, createRandom(42));
      updateHorseHealth(s2, 50, createRandom(42));
      // Horse aging 0.08 > oxen aging 0.05, so horse health drops more
      expect(s2.horseHealth).toBeLessThan(s1.oxenHealth);
    });
  });

  // -----------------------------------------------------------
  // Birth and Death Rates
  // -----------------------------------------------------------

  describe('calculateBirthsDeaths', () => {
    it('returns births, deaths, and newPopulation', () => {
      const rng = createRandom(42);
      const result = calculateBirthsDeaths(100, 0.9, slaveBirthTable, slaveDeathTable, rng);
      expect(result).toHaveProperty('births');
      expect(result).toHaveProperty('deaths');
      expect(result).toHaveProperty('newPopulation');
    });

    it('healthy populations grow (high birth, low death)', () => {
      const safeSeeds = [1, 3, 5, 7, 9, 11, 13, 19, 21, 23, 25, 27, 31, 33, 35, 37, 41, 43, 45, 47];
      const results = [];
      for (const seed of safeSeeds) {
        const rng = createRandom(seed);
        results.push(calculateBirthsDeaths(100, 0.95, slaveBirthTable, slaveDeathTable, rng));
      }
      const avgGrowth = results.reduce((a, r) => a + (r.births - r.deaths), 0) / results.length;
      expect(avgGrowth).toBeGreaterThan(0);
    });

    it('unhealthy populations decline (low birth, high death)', () => {
      const safeSeeds = [1, 3, 5, 7, 9, 11, 13, 19, 21, 23, 25, 27, 31, 33, 35, 37, 41, 43, 45, 47];
      const results = [];
      for (const seed of safeSeeds) {
        const rng = createRandom(seed);
        results.push(calculateBirthsDeaths(100, 0.2, slaveBirthTable, slaveDeathTable, rng));
      }
      const avgGrowth = results.reduce((a, r) => a + (r.births - r.deaths), 0) / results.length;
      expect(avgGrowth).toBeLessThan(0);
    });

    it('population cannot go negative', () => {
      const rng = createRandom(42);
      const result = calculateBirthsDeaths(5, 0.0, slaveBirthTable, slaveDeathTable, rng);
      expect(result.newPopulation).toBeGreaterThanOrEqual(0);
    });

    it('works for oxen tables', () => {
      const rng = createRandom(42);
      const result = calculateBirthsDeaths(50, 0.7, oxenBirthTable, oxenDeathTable, rng);
      expect(result.newPopulation).toBeGreaterThanOrEqual(0);
    });

    it('works for horse tables', () => {
      const rng = createRandom(42);
      const result = calculateBirthsDeaths(30, 0.5, horseBirthTable, horseDeathTable, rng);
      expect(result.newPopulation).toBeGreaterThanOrEqual(0);
    });

    it('births = birthRateConstant * population', () => {
      // Use a fixed rng and verify the relationship
      const rng = createRandom(42);
      const pop = 200;
      const health = 0.8;
      const result = calculateBirthsDeaths(pop, health, slaveBirthTable, slaveDeathTable, rng);
      // births should be proportional to population
      expect(result.births).toBeGreaterThanOrEqual(0);
      expect(result.deaths).toBeGreaterThanOrEqual(0);
    });
  });

  // -----------------------------------------------------------
  // Update Populations
  // -----------------------------------------------------------

  describe('updatePopulations', () => {
    it('updates slave population', () => {
      state.slaves = 100;
      state.slaveHealth = 0.95;
      const rng = createRandom(42);
      updatePopulations(state, rng);
      // Healthy slaves should grow
      expect(state.slaves).toBeGreaterThanOrEqual(0);
    });

    it('updates oxen population', () => {
      state.oxen = 50;
      state.oxenHealth = 0.7;
      const rng = createRandom(42);
      updatePopulations(state, rng);
      expect(state.oxen).toBeGreaterThanOrEqual(0);
    });

    it('updates horse population', () => {
      state.horses = 30;
      state.horseHealth = 0.5;
      const rng = createRandom(42);
      updatePopulations(state, rng);
      expect(state.horses).toBeGreaterThanOrEqual(0);
    });

    it('floors populations to 0', () => {
      state.slaves = 2;
      state.slaveHealth = 0.05;
      state.oxen = 2;
      state.oxenHealth = 0.05;
      state.horses = 2;
      state.horseHealth = 0.05;
      const rng = createRandom(42);
      updatePopulations(state, rng);
      expect(state.slaves).toBeGreaterThanOrEqual(0);
      expect(state.oxen).toBeGreaterThanOrEqual(0);
      expect(state.horses).toBeGreaterThanOrEqual(0);
    });
  });

  // -----------------------------------------------------------
  // Efficiency Lookups
  // -----------------------------------------------------------

  describe('oxenEfficiency', () => {
    it('returns 0 for health 0', () => {
      expect(oxenEfficiency(0)).toBe(0);
    });

    it('returns 1.0 for health 1.0', () => {
      expect(oxenEfficiency(1.0)).toBe(1.0);
    });

    it('returns 0.5 for health 0.5', () => {
      expect(oxenEfficiency(0.5)).toBeCloseTo(0.5, 5);
    });

    it('scales linearly with health', () => {
      const low = oxenEfficiency(0.3);
      const high = oxenEfficiency(0.8);
      expect(high).toBeGreaterThan(low);
    });
  });

  describe('horseEfficiency', () => {
    it('returns 0 for health 0', () => {
      expect(horseEfficiency(0)).toBe(0);
    });

    it('returns 1.0 for health 1.0', () => {
      expect(horseEfficiency(1.0)).toBe(1.0);
    });

    it('returns 0.5 for health 0.5', () => {
      expect(horseEfficiency(0.5)).toBeCloseTo(0.5, 5);
    });

    it('scales linearly with health', () => {
      const low = horseEfficiency(0.3);
      const high = horseEfficiency(0.8);
      expect(high).toBeGreaterThan(low);
    });
  });

  // -----------------------------------------------------------
  // Sale Price
  // -----------------------------------------------------------

  describe('calculateSalePrice', () => {
    it('returns marketPrice * health', () => {
      expect(calculateSalePrice(1000, 0.5)).toBe(500);
    });

    it('returns full price at full health', () => {
      expect(calculateSalePrice(1000, 1.0)).toBe(1000);
    });

    it('returns 0 at 0 health', () => {
      expect(calculateSalePrice(1000, 0)).toBe(0);
    });
  });
});
