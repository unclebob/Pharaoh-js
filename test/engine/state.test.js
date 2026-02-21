'use strict';

const { createGameState } = require('../../src/engine/state');
const { nextRaw } = require('../../src/engine/random');

describe('state', () => {
  let state;

  beforeEach(() => {
    state = createGameState(42);
  });

  describe('createGameState', () => {
    it('returns a plain object', () => {
      expect(typeof state).toBe('object');
      expect(state).not.toBeNull();
    });

    it('initializes rng from seed', () => {
      expect(state.rng).toBeDefined();
      expect(typeof state.rng.state).toBe('number');
    });

    it('produces deterministic rng', () => {
      const s1 = createGameState(99);
      const s2 = createGameState(99);
      expect(nextRaw(s1.rng)).toBe(nextRaw(s2.rng));
    });
  });

  describe('resource fields', () => {
    it.each([
      ['gold', 0], ['wheat', 0], ['slaves', 0],
      ['oxen', 0], ['horses', 0], ['manure', 0]
    ])('%s defaults to %d', (field, expected) => {
      expect(state[field]).toBe(expected);
    });
  });

  describe('land fields', () => {
    it.each([
      ['fallow', 0], ['planted', 0], ['growing', 0], ['ripe', 0]
    ])('%s defaults to %d', (field, expected) => {
      expect(state[field]).toBe(expected);
    });
  });

  describe('overseer fields', () => {
    it('initializes overseers to 0', () => { expect(state.overseers).toBe(0); });
    it('initializes overseerPay to 300', () => { expect(state.overseerPay).toBe(300); });
    it('initializes overseerPressure to 0', () => { expect(state.overseerPressure).toBe(0); });
  });

  describe('health fields', () => {
    it.each([
      ['slaveHealth', 1.0], ['oxenHealth', 1.0], ['horseHealth', 1.0]
    ])('%s defaults to %d', (field, expected) => {
      expect(state[field]).toBe(expected);
    });
  });

  describe('feed rate fields', () => {
    it.each([
      ['slaveFeedRate', 0], ['oxenFeedRate', 0], ['horseFeedRate', 0]
    ])('%s defaults to %d', (field, expected) => {
      expect(state[field]).toBe(expected);
    });
  });

  describe('planting fields', () => {
    it.each([
      ['plantingQuota', 0], ['manureSpreadQuota', 0],
      ['wheatSewn', 0], ['wheatGrowing', 0], ['wheatRipe', 0],
      ['manurePerAcre', 0], ['wtRotRt', 0.05]
    ])('%s defaults to %s', (field, expected) => {
      expect(state[field]).toBe(expected);
    });
  });

  describe('pyramid fields', () => {
    it.each([
      ['pyramidStones', 0], ['pyramidBase', 0],
      ['pyramidHeight', 0], ['stoneQuota', 0]
    ])('%s defaults to %d', (field, expected) => {
      expect(state[field]).toBe(expected);
    });
  });

  describe('financial fields', () => {
    it.each([
      ['loan', 0], ['interestRate', 5], ['interestAddition', 0],
      ['creditRating', 1.0], ['creditLimit', 0], ['creditLowerBound', 0],
      ['inflation', 0], ['worldGrowth', 0]
    ])('%s defaults to %s', (field, expected) => {
      expect(state[field]).toBe(expected);
    });
  });

  describe('price fields', () => {
    it.each([
      ['wheatPrice', 10], ['landPrice', 5000], ['slavePrice', 800],
      ['horsePrice', 100], ['oxenPrice', 90], ['manurePrice', 20]
    ])('%s defaults to %d', (field, expected) => {
      expect(state[field]).toBe(expected);
    });
  });

  describe('supply/demand/production', () => {
    const commodities = ['wheat', 'land', 'slave', 'horse', 'oxen', 'manure'];

    it('supply has all commodity keys at 100', () => {
      commodities.forEach(c => expect(state.supply[c]).toBe(100));
    });

    it('demand has all commodity keys at 100', () => {
      commodities.forEach(c => expect(state.demand[c]).toBe(100));
    });

    it('production has all commodity keys at 100', () => {
      commodities.forEach(c => expect(state.production[c]).toBe(100));
    });
  });

  describe('date fields', () => {
    it('month starts at 1', () => { expect(state.month).toBe(1); });
    it('year starts at 1', () => { expect(state.year).toBe(1); });
  });

  describe('UI state', () => {
    it('screen starts at difficulty', () => { expect(state.screen).toBe('difficulty'); });
    it('dialog is null', () => { expect(state.dialog).toBeNull(); });
    it('message is null', () => { expect(state.message).toBeNull(); });
    it('statusMessage is empty string', () => { expect(state.statusMessage).toBe(''); });
  });

  describe('contract fields', () => {
    it.each([
      ['contractOffers', []], ['pendingContracts', []],
      ['contractPlayers', []], ['contractMessages', []]
    ])('%s defaults to empty array', (field) => {
      expect(state[field]).toEqual([]);
    });
  });

  describe('neighbor fields', () => {
    it('has named neighbors with indices', () => {
      expect(state.neighbors).toEqual({
        goodGuy: 0, badGuy: 1, villageIdiot: 2, banker: 3
      });
    });
  });

  describe('misc fields', () => {
    it('prev is empty object', () => { expect(state.prev).toEqual({}); });
    it('temporaryWorkAddition is 0', () => { expect(state.temporaryWorkAddition).toBe(0); });
    it('slaveEfficiency is 1.0', () => { expect(state.slaveEfficiency).toBe(1.0); });
    it('gameOver is false', () => { expect(state.gameOver).toBe(false); });
    it('gameWon is false', () => { expect(state.gameWon).toBe(false); });
    it('licensed is true', () => { expect(state.licensed).toBe(true); });
    it('canSave is true', () => { expect(state.canSave).toBe(true); });
  });
});
