'use strict';

const { createGameState } = require('../../src/engine/state');
const { createRandom } = require('../../src/engine/random');
const {
  buyCommodity, sellCommodity, keepCommodity,
  buyLivestock, sellLand, sellCroppedLand,
  maxBuyable, maxSellable,
  isLivestock, getConfig, COMMODITY_CONFIG
} = require('../../src/engine/trading');

describe('trading', () => {
  let state;

  beforeEach(() => {
    state = createGameState(42);
    state.gold = 50000;
    state.wheat = 500;
    state.slaves = 100;
    state.oxen = 50;
    state.horses = 20;
    state.manure = 200;
    state.fallow = 100;
    state.wheatPrice = 10;
    state.slavePrice = 1000;
    state.oxenPrice = 300;
    state.horsePrice = 500;
    state.manurePrice = 20;
    state.landPrice = 5000;
    state.slaveHealth = 0.8;
    state.oxenHealth = 0.9;
    state.horseHealth = 0.5;
    state.supply = { wheat: 500, slave: 500, oxen: 200, horse: 100, manure: 300, land: 100 };
    state.demand = { wheat: 1000, slave: 500, oxen: 200, horse: 100, manure: 300, land: 100 };
  });

  // -----------------------------------------------------------
  // COMMODITY_CONFIG
  // -----------------------------------------------------------

  describe('COMMODITY_CONFIG', () => {
    it('maps wheat to state.wheat and wheatPrice', () => {
      const cfg = getConfig('wheat');
      expect(cfg.stateField).toBe('wheat');
      expect(cfg.priceField).toBe('wheatPrice');
      expect(cfg.supplyKey).toBe('wheat');
    });

    it('maps slaves to state.slaves and slavePrice', () => {
      const cfg = getConfig('slaves');
      expect(cfg.stateField).toBe('slaves');
      expect(cfg.priceField).toBe('slavePrice');
      expect(cfg.healthKey).toBe('slaveHealth');
    });

    it('maps land to state.fallow and landPrice', () => {
      const cfg = getConfig('land');
      expect(cfg.stateField).toBe('fallow');
      expect(cfg.priceField).toBe('landPrice');
    });
  });

  describe('isLivestock', () => {
    it('returns true for slaves, horses, oxen', () => {
      expect(isLivestock('slaves')).toBe(true);
      expect(isLivestock('horses')).toBe(true);
      expect(isLivestock('oxen')).toBe(true);
    });

    it('returns false for wheat, manure, land', () => {
      expect(isLivestock('wheat')).toBe(false);
      expect(isLivestock('manure')).toBe(false);
      expect(isLivestock('land')).toBe(false);
    });
  });

  // -----------------------------------------------------------
  // buyCommodity
  // -----------------------------------------------------------

  describe('buyCommodity', () => {
    it('decreases gold by amount * price', () => {
      buyCommodity(state, 'wheat', 100);
      expect(state.gold).toBe(49000);
    });

    it('increases commodity by amount', () => {
      buyCommodity(state, 'wheat', 100);
      expect(state.wheat).toBe(600);
    });

    it('decreases supply by amount', () => {
      buyCommodity(state, 'wheat', 100);
      expect(state.supply.wheat).toBe(400);
    });

    it('returns success result', () => {
      const result = buyCommodity(state, 'wheat', 100);
      expect(result.ok).toBe(true);
      expect(result.amount).toBe(100);
      expect(result.cost).toBe(1000);
    });

    it('rejects when gold insufficient', () => {
      state.gold = 500;
      const result = buyCommodity(state, 'wheat', 100);
      expect(result.ok).toBe(false);
      expect(result.maxAffordable).toBe(50);
    });

    it('rejects when supply insufficient', () => {
      state.supply.wheat = 30;
      const result = buyCommodity(state, 'wheat', 100);
      expect(result.ok).toBe(false);
      expect(result.available).toBe(30);
      expect(result.capped).toBe(true);
    });

    it('does not modify state on rejection', () => {
      state.gold = 500;
      const origWheat = state.wheat;
      buyCommodity(state, 'wheat', 100);
      expect(state.wheat).toBe(origWheat);
    });

    it('returns a message on success', () => {
      const result = buyCommodity(state, 'wheat', 10);
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------
  // sellCommodity
  // -----------------------------------------------------------

  describe('sellCommodity', () => {
    it('increases gold by amount * price for non-livestock', () => {
      sellCommodity(state, 'wheat', 50);
      expect(state.gold).toBe(50500);
    });

    it('decreases commodity by amount', () => {
      sellCommodity(state, 'wheat', 50);
      expect(state.wheat).toBe(450);
    });

    it('increases supply by amount', () => {
      const origSupply = state.supply.wheat;
      sellCommodity(state, 'wheat', 50);
      expect(state.supply.wheat).toBe(origSupply + 50);
    });

    it('uses health-adjusted price for livestock', () => {
      state.slaveHealth = 0.8;
      state.slavePrice = 1000;
      const result = sellCommodity(state, 'slaves', 10);
      expect(result.ok).toBe(true);
      expect(result.revenue).toBe(10 * 1000 * 0.8);
    });

    it('rejects selling more than owned', () => {
      state.wheat = 100;
      const result = sellCommodity(state, 'wheat', 150);
      expect(result.ok).toBe(false);
      expect(result.owned).toBe(100);
    });

    it('caps sale at market capacity (demand * 1.1)', () => {
      state.demand.wheat = 1000;
      state.supply.wheat = 1050;
      state.wheat = 500;
      const result = sellCommodity(state, 'wheat', 200);
      expect(result.ok).toBe(false);
      expect(result.capped).toBe(true);
      expect(result.maxAccepted).toBeLessThanOrEqual(Math.floor(1000 * 1.1 - 1050));
    });

    it('does not modify state on rejection', () => {
      state.wheat = 100;
      const origGold = state.gold;
      sellCommodity(state, 'wheat', 150);
      expect(state.gold).toBe(origGold);
    });
  });

  // -----------------------------------------------------------
  // buyLivestock
  // -----------------------------------------------------------

  describe('buyLivestock', () => {
    it('blends health of incoming livestock', () => {
      state.slaves = 100;
      state.slaveHealth = 0.6;
      state.gold = 500000;
      const result = buyLivestock(state, 'slaves', 50);
      expect(result.ok).toBe(true);
      expect(state.slaves).toBe(150);
      // newHealth ~0.8, blended = (100*0.6 + 50*~0.8) / 150
      const expectedBlended = (100 * 0.6 + 50 * result.newHealth) / 150;
      expect(state.slaveHealth).toBeCloseTo(expectedBlended, 5);
    });

    it('new livestock have health approximately 0.8', () => {
      state.gold = 500000;
      const healths = [];
      for (let seed = 1; seed <= 50; seed += 2) {
        const s = createGameState(seed);
        s.gold = 500000;
        s.slaves = 0;
        s.slaveHealth = 1.0;
        s.slavePrice = 1000;
        s.supply = { wheat: 100, slave: 500, oxen: 100, horse: 100, manure: 100, land: 100 };
        s.demand = { wheat: 100, slave: 500, oxen: 100, horse: 100, manure: 100, land: 100 };
        const r = buyLivestock(s, 'slaves', 10);
        if (r.ok) healths.push(r.newHealth);
      }
      const avg = healths.reduce((a, b) => a + b, 0) / healths.length;
      expect(avg).toBeGreaterThan(0.7);
      expect(avg).toBeLessThan(0.9);
    });

    it('rejects when gold insufficient', () => {
      state.gold = 500;
      const result = buyLivestock(state, 'slaves', 100);
      expect(result.ok).toBe(false);
    });

    it('rejects when supply insufficient', () => {
      state.supply.slave = 5;
      const result = buyLivestock(state, 'slaves', 10);
      expect(result.ok).toBe(false);
    });
  });

  // -----------------------------------------------------------
  // sellLand
  // -----------------------------------------------------------

  describe('sellLand', () => {
    it('sells fallow land without affecting crops', () => {
      state.fallow = 200;
      state.wheatSewn = 1000;
      state.wheatGrowing = 500;
      state.wheatRipe = 300;
      const result = sellLand(state, 'fallow', 50);
      expect(result.ok).toBe(true);
      expect(state.fallow).toBe(150);
      expect(state.wheatSewn).toBe(1000);
      expect(state.wheatGrowing).toBe(500);
      expect(state.wheatRipe).toBe(300);
      expect(result.cropsDestroyed).toBe(0);
    });

    it('selling planted land destroys wheat proportionally', () => {
      state.planted = 100;
      state.wheatSewn = 2000;
      const result = sellLand(state, 'planted', 25);
      expect(result.ok).toBe(true);
      expect(state.planted).toBe(75);
      expect(state.wheatSewn).toBe(1500);
      expect(result.cropsDestroyed).toBe(500);
    });

    it('selling growing land destroys wheatGrowing proportionally', () => {
      state.growing = 100;
      state.wheatGrowing = 1000;
      const result = sellLand(state, 'growing', 50);
      expect(result.ok).toBe(true);
      expect(state.growing).toBe(50);
      expect(state.wheatGrowing).toBe(500);
    });

    it('selling ripe land destroys wheatRipe proportionally', () => {
      state.ripe = 80;
      state.wheatRipe = 800;
      const result = sellLand(state, 'ripe', 20);
      expect(result.ok).toBe(true);
      expect(state.ripe).toBe(60);
      expect(state.wheatRipe).toBe(600);
    });

    it('increases gold by amount * landPrice', () => {
      state.fallow = 100;
      const origGold = state.gold;
      sellLand(state, 'fallow', 10);
      expect(state.gold).toBe(origGold + 10 * state.landPrice);
    });

    it('rejects selling more than available', () => {
      state.fallow = 50;
      const result = sellLand(state, 'fallow', 100);
      expect(result.ok).toBe(false);
    });

    it('rejects invalid category', () => {
      const result = sellLand(state, 'bogus', 10);
      expect(result.ok).toBe(false);
    });
  });

  // -----------------------------------------------------------
  // keepCommodity
  // -----------------------------------------------------------

  describe('keepCommodity', () => {
    it('buys deficit when below target', () => {
      state.wheat = 200;
      const result = keepCommodity(state, 'wheat', 300);
      expect(result.ok).toBe(true);
      expect(state.wheat).toBe(300);
    });

    it('sells excess when above target', () => {
      state.wheat = 500;
      state.demand.wheat = 10000;
      const result = keepCommodity(state, 'wheat', 300);
      expect(result.ok).toBe(true);
      expect(state.wheat).toBe(300);
    });

    it('does nothing when at target', () => {
      state.wheat = 300;
      const result = keepCommodity(state, 'wheat', 300);
      expect(result.ok).toBe(true);
      expect(result.amount).toBe(0);
    });

    it('uses buyLivestock for livestock deficit', () => {
      state.slaves = 100;
      state.slaveHealth = 0.6;
      state.gold = 500000;
      keepCommodity(state, 'slaves', 150);
      expect(state.slaves).toBe(150);
      // Health should be blended
      expect(state.slaveHealth).not.toBe(0.6);
    });
  });

  // -----------------------------------------------------------
  // maxBuyable / maxSellable
  // -----------------------------------------------------------

  describe('maxBuyable', () => {
    it('returns min of affordable and available', () => {
      state.gold = 1000;
      state.wheatPrice = 10;
      state.supply.wheat = 50;
      expect(maxBuyable(state, 'wheat')).toBe(50);
    });

    it('caps at affordable when supply is abundant', () => {
      state.gold = 100;
      state.wheatPrice = 10;
      state.supply.wheat = 500;
      expect(maxBuyable(state, 'wheat')).toBe(10);
    });

    it('returns 0 when no gold', () => {
      state.gold = 0;
      expect(maxBuyable(state, 'wheat')).toBe(0);
    });
  });

  describe('maxSellable', () => {
    it('returns min of owned and market capacity', () => {
      state.wheat = 500;
      state.demand.wheat = 1000;
      state.supply.wheat = 0;
      // market capacity = floor(1000 * 1.1 - 0) = 1100
      expect(maxSellable(state, 'wheat')).toBe(500);
    });

    it('caps at market capacity when owned exceeds it', () => {
      state.wheat = 5000;
      state.demand.wheat = 100;
      state.supply.wheat = 50;
      // market capacity = floor(100 * 1.1 - 50) = 60
      expect(maxSellable(state, 'wheat')).toBe(60);
    });

    it('returns 0 when market is saturated', () => {
      state.wheat = 500;
      state.demand.wheat = 100;
      state.supply.wheat = 200;
      // market capacity = max(0, floor(110 - 200)) = 0
      expect(maxSellable(state, 'wheat')).toBe(0);
    });
  });
});
