'use strict';

const { setDifficulty, forceEasyIfUnlicensed } = require('../../src/engine/difficulty');
const { createGameState } = require('../../src/engine/state');

describe('difficulty', () => {
  let state;

  beforeEach(() => {
    state = createGameState(42);
  });

  describe('easy', () => {
    beforeEach(() => { setDifficulty(state, 'easy'); });

    it('sets pyramidBase to 115.47', () => { expect(state.pyramidBase).toBeCloseTo(115.47); });
    it('sets creditLimit to 5000000', () => { expect(state.creditLimit).toBe(5000000); });
    it('sets creditLowerBound to 5000000', () => { expect(state.creditLowerBound).toBe(5000000); });
    it('sets worldGrowth to 0.15', () => { expect(state.worldGrowth).toBeCloseTo(0.15); });
    it('sets landPrice to 1000', () => { expect(state.landPrice).toBe(1000); });
    it('sets wheatPrice to 10', () => { expect(state.wheatPrice).toBe(10); });
    it('sets slavePrice to 1000', () => { expect(state.slavePrice).toBe(1000); });
    it('sets screen to game', () => { expect(state.screen).toBe('game'); });
  });

  describe('normal', () => {
    beforeEach(() => { setDifficulty(state, 'normal'); });

    it('sets pyramidBase to 346.41', () => { expect(state.pyramidBase).toBeCloseTo(346.41); });
    it('sets creditLimit to 500000', () => { expect(state.creditLimit).toBe(500000); });
    it('sets creditLowerBound to 500000', () => { expect(state.creditLowerBound).toBe(500000); });
    it('sets worldGrowth to 0.10', () => { expect(state.worldGrowth).toBeCloseTo(0.10); });
    it('sets landPrice to 5000', () => { expect(state.landPrice).toBe(5000); });
    it('sets wheatPrice to 8', () => { expect(state.wheatPrice).toBe(8); });
    it('sets slavePrice to 800', () => { expect(state.slavePrice).toBe(800); });
    it('sets screen to game', () => { expect(state.screen).toBe('game'); });
  });

  describe('hard', () => {
    beforeEach(() => { setDifficulty(state, 'hard'); });

    it('sets pyramidBase to 1154.7', () => { expect(state.pyramidBase).toBeCloseTo(1154.7); });
    it('sets creditLimit to 50000', () => { expect(state.creditLimit).toBe(50000); });
    it('sets creditLowerBound to 50000', () => { expect(state.creditLowerBound).toBe(50000); });
    it('sets worldGrowth to 0.05', () => { expect(state.worldGrowth).toBeCloseTo(0.05); });
    it('keeps default landPrice', () => { expect(state.landPrice).toBe(10000); });
    it('keeps default wheatPrice', () => { expect(state.wheatPrice).toBe(2); });
    it('keeps default slavePrice', () => { expect(state.slavePrice).toBe(500); });
    it('sets screen to game', () => { expect(state.screen).toBe('game'); });
  });

  describe('screen transition', () => {
    it('changes screen from difficulty to game', () => {
      expect(state.screen).toBe('difficulty');
      setDifficulty(state, 'easy');
      expect(state.screen).toBe('game');
    });
  });

  describe('forceEasyIfUnlicensed', () => {
    it('sets easy difficulty when unlicensed', () => {
      state.licensed = false;
      forceEasyIfUnlicensed(state);
      expect(state.pyramidBase).toBeCloseTo(115.47);
      expect(state.creditLimit).toBe(5000000);
    });

    it('disables saving when unlicensed', () => {
      state.licensed = false;
      forceEasyIfUnlicensed(state);
      expect(state.canSave).toBe(false);
    });

    it('does nothing when licensed', () => {
      state.licensed = true;
      forceEasyIfUnlicensed(state);
      expect(state.pyramidBase).toBe(0);
      expect(state.canSave).toBe(true);
    });
  });
});
