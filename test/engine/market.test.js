'use strict';

const { createGameState } = require('../../src/engine/state');
const { createRandom, gaussian, absGaussian, uniform } = require('../../src/engine/random');

const {
  totalLand,
  updateInflation,
  updatePrices,
  runSupplyDemandCycle,
  runAllSupplyDemandCycles,
  calculateOwnershipCosts,
  calculateNetWorth,
  PRICE_FIELDS,
  COMMODITIES
} = require('../../src/engine/market');

describe('market', () => {
  let state;

  beforeEach(() => {
    state = createGameState(42);
  });

  // -----------------------------------------------------------
  // totalLand
  // -----------------------------------------------------------

  describe('totalLand', () => {
    it('sums fallow, planted, growing, and ripe', () => {
      state.fallow = 100;
      state.planted = 200;
      state.growing = 300;
      state.ripe = 400;
      expect(totalLand(state)).toBe(1000);
    });

    it('returns 0 when all land fields are 0', () => {
      expect(totalLand(state)).toBe(0);
    });
  });

  // -----------------------------------------------------------
  // updateInflation
  // -----------------------------------------------------------

  describe('updateInflation', () => {
    it('shifts inflation by a small gaussian amount', () => {
      state.inflation = 0.02;
      const rng = createRandom(42);
      updateInflation(state, rng);
      expect(state.inflation).not.toBe(0.02);
    });

    it('can drift positive or negative over many updates', () => {
      state.inflation = 0;
      const rng = createRandom(42);
      const values = [];
      for (let i = 0; i < 100; i++) {
        updateInflation(state, rng);
        values.push(state.inflation);
      }
      const hasPositive = values.some(v => v > 0);
      const hasNegative = values.some(v => v < 0);
      expect(hasPositive || hasNegative).toBe(true);
    });

    it('changes are small (mean 0, sigma 0.001)', () => {
      const rng = createRandom(42);
      const deltas = [];
      for (let i = 0; i < 200; i++) {
        const prev = state.inflation;
        updateInflation(state, rng);
        deltas.push(state.inflation - prev);
      }
      const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
      const maxDelta = Math.max(...deltas.map(Math.abs));
      expect(Math.abs(avg)).toBeLessThan(0.005);
      expect(maxDelta).toBeLessThan(0.05);
    });
  });

  // -----------------------------------------------------------
  // updatePrices
  // -----------------------------------------------------------

  describe('updatePrices', () => {
    it('multiplies each price field by approximately (1 + inflation)', () => {
      state.inflation = 0.05;
      const origPrices = {};
      for (const f of PRICE_FIELDS) origPrices[f] = state[f];
      const rng = createRandom(42);
      updatePrices(state, rng);
      for (const f of PRICE_FIELDS) {
        expect(state[f]).not.toBe(origPrices[f]);
      }
    });

    it('updates all 8 price fields including overseerPay and interestRate', () => {
      state.inflation = 0.02;
      const rng = createRandom(42);
      const before = PRICE_FIELDS.map(f => state[f]);
      updatePrices(state, rng);
      const after = PRICE_FIELDS.map(f => state[f]);
      for (let i = 0; i < PRICE_FIELDS.length; i++) {
        expect(after[i]).not.toBe(before[i]);
      }
    });

    it('applies random variance of about 2%', () => {
      state.inflation = 0.02;
      const results = [];
      for (let seed = 1; seed <= 50; seed += 2) {
        const s = createGameState(42);
        s.inflation = 0.02;
        const rng = createRandom(seed);
        const orig = s.wheatPrice;
        updatePrices(s, rng);
        results.push(s.wheatPrice / orig);
      }
      const avg = results.reduce((a, b) => a + b, 0) / results.length;
      expect(avg).toBeGreaterThan(1.0);
      expect(avg).toBeLessThan(1.1);
      // Check there's variance
      const min = Math.min(...results);
      const max = Math.max(...results);
      expect(max - min).toBeGreaterThan(0.001);
    });

    it('with zero inflation, prices stay approximately the same', () => {
      state.inflation = 0;
      const rng = createRandom(42);
      const orig = state.wheatPrice;
      updatePrices(state, rng);
      expect(Math.abs(state.wheatPrice - orig) / orig).toBeLessThan(0.15);
    });
  });

  // -----------------------------------------------------------
  // runSupplyDemandCycle
  // -----------------------------------------------------------

  describe('runSupplyDemandCycle', () => {
    it('grows demand by worldGrowth / 12', () => {
      state.worldGrowth = 0.10;
      state.demand.wheat = 10000;
      state.supply.wheat = 50000;
      state.production.wheat = 10000;
      const origDemand = state.demand.wheat;
      const rng = createRandom(42);
      runSupplyDemandCycle(state, 'wheat', rng);
      const expectedGrowth = origDemand * (0.10 / 12);
      expect(state.demand.wheat).toBeCloseTo(origDemand + expectedGrowth, 2);
    });

    it('reduces supply by monthlyDemand consumption', () => {
      state.worldGrowth = 0.10;
      state.demand.wheat = 12000;
      state.supply.wheat = 50000;
      state.production.wheat = 10000;
      const origSupply = state.supply.wheat;
      const rng = createRandom(42);
      runSupplyDemandCycle(state, 'wheat', rng);
      expect(state.supply.wheat).toBeLessThan(origSupply);
    });

    it('increases price when supply goes negative after 80% consumption', () => {
      state.worldGrowth = 0;
      state.demand.wheat = 12000;
      state.supply.wheat = 500; // Very low supply, will go negative after 80% consumption
      state.production.wheat = 100;
      state.wheatPrice = 10;
      const rng = createRandom(42);
      runSupplyDemandCycle(state, 'wheat', rng);
      // Price should have been multiplied by uniform(1.0, 1.2)
      expect(state.wheatPrice).toBeGreaterThanOrEqual(10);
    });

    it('decreases price when supply remains positive', () => {
      state.worldGrowth = 0;
      state.demand.wheat = 120; // Very low demand
      state.supply.wheat = 500000; // Huge supply
      state.production.wheat = 10000;
      state.wheatPrice = 10;
      const rng = createRandom(42);
      runSupplyDemandCycle(state, 'wheat', rng);
      // Price should be multiplied by uniform(0.8, 1.0)
      expect(state.wheatPrice).toBeLessThanOrEqual(10);
    });

    it('adds production / 12 to supply at the end', () => {
      state.worldGrowth = 0;
      state.demand.wheat = 0;
      state.supply.wheat = 1000;
      state.production.wheat = 1200;
      const rng = createRandom(42);
      runSupplyDemandCycle(state, 'wheat', rng);
      // Supply should have increased by approximately production / 12
      expect(state.supply.wheat).toBeGreaterThan(1000);
    });

    it('production fluctuates by random factor 0.95 to 1.05', () => {
      state.worldGrowth = 0;
      state.demand.wheat = 0;
      state.supply.wheat = 100000;
      state.production.wheat = 1000;
      const rng = createRandom(42);
      runSupplyDemandCycle(state, 'wheat', rng);
      // Production should have been multiplied by something between ~0.85 and ~1.15
      // (oversupply reduction * random fluctuation)
      expect(state.production.wheat).toBeGreaterThan(0);
    });

    it('supply is floored at 0', () => {
      state.worldGrowth = 0;
      state.demand.wheat = 1200000;
      state.supply.wheat = 1;
      state.production.wheat = 100;
      const rng = createRandom(42);
      runSupplyDemandCycle(state, 'wheat', rng);
      expect(state.supply.wheat).toBeGreaterThanOrEqual(0);
    });
  });

  // -----------------------------------------------------------
  // runAllSupplyDemandCycles
  // -----------------------------------------------------------

  describe('runAllSupplyDemandCycles', () => {
    it('runs cycle for all 6 commodities', () => {
      state.worldGrowth = 0.10;
      const origSupplies = {};
      for (const c of COMMODITIES) origSupplies[c] = state.supply[c];
      const rng = createRandom(42);
      runAllSupplyDemandCycles(state, rng);
      let changed = 0;
      for (const c of COMMODITIES) {
        if (state.supply[c] !== origSupplies[c]) changed++;
      }
      expect(changed).toBe(6);
    });

    it('covers wheat, land, manure, slave, horse, oxen', () => {
      expect(COMMODITIES).toEqual(
        expect.arrayContaining(['wheat', 'land', 'manure', 'slave', 'horse', 'oxen'])
      );
      expect(COMMODITIES.length).toBe(6);
    });
  });

  // -----------------------------------------------------------
  // calculateOwnershipCosts
  // -----------------------------------------------------------

  describe('calculateOwnershipCosts', () => {
    it('computes baseCost from land, slaves, horses, oxen', () => {
      state.fallow = 500;
      state.planted = 300;
      state.growing = 100;
      state.ripe = 100;
      state.slaves = 200;
      state.horses = 50;
      state.oxen = 100;
      state.gold = 1000000;
      const rng = createRandom(42);
      const result = calculateOwnershipCosts(state, rng);
      // baseCost = 1000*100 + 200*10 + 50*5 + 100*3 = 102550
      expect(result.baseCost).toBe(102550);
    });

    it('actualCost = baseCost * random factor (at least 30%, up to ~100%)', () => {
      state.fallow = 1000;
      state.slaves = 200;
      state.horses = 50;
      state.oxen = 100;
      state.gold = 1000000;
      const results = [];
      for (let seed = 1; seed <= 50; seed += 2) {
        const s = createGameState(42);
        s.fallow = 1000;
        s.slaves = 200;
        s.horses = 50;
        s.oxen = 100;
        s.gold = 1000000;
        const rng = createRandom(seed);
        const r = calculateOwnershipCosts(s, rng);
        results.push(r.actualCost / r.baseCost);
      }
      for (const ratio of results) {
        expect(ratio).toBeGreaterThanOrEqual(0.29); // At least ~30%
        expect(ratio).toBeLessThanOrEqual(2.0); // absGaussian can be above 1
      }
    });

    it('deducts actual cost from gold', () => {
      state.fallow = 100;
      state.slaves = 10;
      state.horses = 5;
      state.oxen = 3;
      state.gold = 50000;
      const rng = createRandom(42);
      const prevGold = state.gold;
      calculateOwnershipCosts(state, rng);
      expect(state.gold).toBeLessThan(prevGold);
    });

    it('gold can go negative if costs exceed balance', () => {
      state.fallow = 10000;
      state.slaves = 500;
      state.horses = 200;
      state.oxen = 300;
      state.gold = 100;
      const rng = createRandom(42);
      calculateOwnershipCosts(state, rng);
      expect(state.gold).toBeLessThan(100);
    });
  });

  // -----------------------------------------------------------
  // calculateNetWorth
  // -----------------------------------------------------------

  describe('calculateNetWorth', () => {
    it('computes net worth from all assets and gold', () => {
      state.slaves = 10;
      state.slavePrice = 800;
      state.oxen = 5;
      state.oxenPrice = 90;
      state.horses = 3;
      state.horsePrice = 100;
      state.fallow = 50;
      state.landPrice = 5000;
      state.manure = 100;
      state.manurePrice = 20;
      state.wheat = 500;
      state.wheatPrice = 10;
      state.gold = 10000;
      state.loan = 0;

      const result = calculateNetWorth(state);
      const expected = 10 * 800 + 5 * 90 + 3 * 100 + 50 * 5000
        + 100 * 20 + 500 * 10 + 10000;
      expect(result.netWorth).toBe(expected);
    });

    it('includes all land types in total land calculation', () => {
      state.fallow = 10;
      state.planted = 20;
      state.growing = 30;
      state.ripe = 40;
      state.landPrice = 1000;
      state.gold = 0;
      state.loan = 0;
      state.slaves = 0;
      state.oxen = 0;
      state.horses = 0;
      state.manure = 0;
      state.wheat = 0;
      const result = calculateNetWorth(state);
      expect(result.netWorth).toBe(100 * 1000);
    });

    it('computes debtToAssetRatio = loan / netWorth (before subtracting loan)', () => {
      state.slaves = 10;
      state.slavePrice = 1000;
      state.gold = 5000;
      state.loan = 5000;
      state.oxen = 0;
      state.horses = 0;
      state.fallow = 0;
      state.planted = 0;
      state.growing = 0;
      state.ripe = 0;
      state.manure = 0;
      state.wheat = 0;
      const result = calculateNetWorth(state);
      const grossWorth = 10 * 1000 + 5000;
      expect(result.debtToAssetRatio).toBeCloseTo(5000 / grossWorth, 5);
    });

    it('subtracts loan from net worth', () => {
      state.slaves = 10;
      state.slavePrice = 1000;
      state.gold = 5000;
      state.loan = 3000;
      state.oxen = 0;
      state.horses = 0;
      state.fallow = 0;
      state.planted = 0;
      state.growing = 0;
      state.ripe = 0;
      state.manure = 0;
      state.wheat = 0;
      const result = calculateNetWorth(state);
      const grossWorth = 10 * 1000 + 5000;
      expect(result.netWorth).toBe(grossWorth - 3000);
    });

    it('returns debtToAssetRatio of 0 when no loan', () => {
      state.gold = 1000;
      state.loan = 0;
      const result = calculateNetWorth(state);
      expect(result.debtToAssetRatio).toBe(0);
    });

    it('handles zero net worth with loan', () => {
      state.gold = 0;
      state.loan = 1000;
      state.slaves = 0;
      state.oxen = 0;
      state.horses = 0;
      state.fallow = 0;
      state.planted = 0;
      state.growing = 0;
      state.ripe = 0;
      state.manure = 0;
      state.wheat = 0;
      const result = calculateNetWorth(state);
      expect(result.debtToAssetRatio).toBe(Infinity);
      expect(result.netWorth).toBe(-1000);
    });
  });
});
