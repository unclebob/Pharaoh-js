'use strict';

const { createGameState } = require('../../src/engine/state');
const { setDifficulty } = require('../../src/engine/difficulty');
const {
  maxHeight,
  pyramidHeight,
  addStones,
  pyramidWork,
  pyramidGoldCost,
  isWin,
  setQuota,
  validateQuotaInput
} = require('../../src/engine/pyramid');

describe('pyramid', () => {
  const SQRT3 = Math.sqrt(3);

  describe('maxHeight', () => {
    it('returns (sqrt(3)/2) * base', () => {
      expect(maxHeight(346.41)).toBeCloseTo(300, 0);
    });

    it('returns ~100 for easy base', () => {
      expect(maxHeight(115.47)).toBeCloseTo(100, 0);
    });

    it('returns ~1000 for hard base', () => {
      expect(maxHeight(1154.7)).toBeCloseTo(1000, 0);
    });

    it('returns 0 for base 0', () => {
      expect(maxHeight(0)).toBe(0);
    });
  });

  describe('pyramidHeight', () => {
    it('computes height from base and area using determinant formula', () => {
      const base = 346.41;
      const area = 1000;
      const det = base * base - 4 * area / SQRT3;
      const expected = (base - Math.sqrt(det)) / (2 / SQRT3);
      expect(pyramidHeight(base, area)).toBeCloseTo(expected, 6);
    });

    it('returns 0 when area is 0', () => {
      expect(pyramidHeight(346.41, 0)).toBeCloseTo(0, 6);
    });

    it('caps height at max when area exceeds (sqrt(3)/4) * base^2', () => {
      const base = 115.47;
      const maxArea = (SQRT3 / 4) * base * base;
      const excessArea = maxArea + 1000;
      const max = maxHeight(base);
      expect(pyramidHeight(base, excessArea)).toBeCloseTo(max, 6);
    });

    it('returns max height when area equals max area', () => {
      const base = 346.41;
      const maxArea = (SQRT3 / 4) * base * base;
      const max = maxHeight(base);
      expect(pyramidHeight(base, maxArea)).toBeCloseTo(max, 0);
    });
  });

  describe('addStones', () => {
    let state;

    beforeEach(() => {
      state = createGameState(42);
      setDifficulty(state, 'easy');
    });

    it('adds quota * efficiency stones floored to integer', () => {
      state.stoneQuota = 100;
      state.slaveEfficiency = 0.8;
      const added = addStones(state);
      expect(added).toBe(80);
      expect(state.pyramidStones).toBe(80);
    });

    it('adds zero stones when efficiency is 0', () => {
      state.stoneQuota = 100;
      state.slaveEfficiency = 0.0;
      const added = addStones(state);
      expect(added).toBe(0);
      expect(state.pyramidStones).toBe(0);
    });

    it('floors fractional stone counts', () => {
      state.stoneQuota = 100;
      state.slaveEfficiency = 0.77;
      const added = addStones(state);
      expect(added).toBe(77);
    });

    it('accumulates stones across multiple calls', () => {
      state.stoneQuota = 50;
      state.slaveEfficiency = 1.0;
      addStones(state);
      addStones(state);
      expect(state.pyramidStones).toBe(100);
    });

    it('recalculates pyramid height after adding stones', () => {
      state.stoneQuota = 100;
      state.slaveEfficiency = 1.0;
      addStones(state);
      expect(state.pyramidHeight).toBeGreaterThan(0);
      const expected = pyramidHeight(state.pyramidBase, state.pyramidStones);
      expect(state.pyramidHeight).toBeCloseTo(expected, 6);
    });
  });

  describe('pyramidWork', () => {
    it('computes work = quota * ceil(avgHeight) * 12', () => {
      const work = pyramidWork(50, 100, 102);
      // avgHeight = ceil((100 + 102)/2) = ceil(101) = 101
      expect(work).toBe(50 * 101 * 12);
    });

    it('uses ceiling of average height', () => {
      const work = pyramidWork(50, 100, 103);
      // avgHeight = ceil((100+103)/2) = ceil(101.5) = 102
      expect(work).toBe(50 * 102 * 12);
    });

    it('returns 0 when quota is 0', () => {
      expect(pyramidWork(0, 100, 102)).toBe(0);
    });
  });

  describe('pyramidGoldCost', () => {
    it('computes gold cost = avgHeight * stonesAdded', () => {
      expect(pyramidGoldCost(150, 80)).toBe(12000);
    });

    it('returns 0 when no stones added', () => {
      expect(pyramidGoldCost(150, 0)).toBe(0);
    });

    it('returns 0 when height is 0', () => {
      expect(pyramidGoldCost(0, 80)).toBe(0);
    });
  });

  describe('isWin', () => {
    it('returns true when height + 1 > maxHeight', () => {
      const base = 115.47;
      const max = maxHeight(base);
      expect(isWin(max, max)).toBe(true);
    });

    it('returns true when height is within 1 of max', () => {
      const base = 115.47;
      const max = maxHeight(base);
      expect(isWin(max - 0.5, max)).toBe(true);
    });

    it('returns false when height + 1 <= maxHeight', () => {
      expect(isWin(200, 300)).toBe(false);
    });

    it('returns false when height is exactly 1 below max', () => {
      // 299 + 1 = 300, which is NOT greater than 300
      expect(isWin(299, 300)).toBe(false);
    });
  });

  describe('setQuota', () => {
    let state;

    beforeEach(() => {
      state = createGameState(42);
    });

    it('sets a positive integer quota', () => {
      const result = setQuota(state, 200);
      expect(state.stoneQuota).toBe(200);
      expect(result.valid).toBe(true);
    });

    it('rejects negative quota', () => {
      const result = setQuota(state, -10);
      expect(state.stoneQuota).toBe(0);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('negative');
    });

    it('accepts zero quota', () => {
      const result = setQuota(state, 0);
      expect(state.stoneQuota).toBe(0);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateQuotaInput', () => {
    it('rejects non-numeric text', () => {
      const result = validateQuotaInput('abc');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('invalid');
    });

    it('rejects empty string', () => {
      const result = validateQuotaInput('');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('invalid');
    });

    it('rejects negative numbers', () => {
      const result = validateQuotaInput('-10');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('negative');
    });

    it('accepts positive integers', () => {
      const result = validateQuotaInput('200');
      expect(result.valid).toBe(true);
      expect(result.value).toBe(200);
    });

    it('accepts zero', () => {
      const result = validateQuotaInput('0');
      expect(result.valid).toBe(true);
      expect(result.value).toBe(0);
    });

    it('floors floating point input', () => {
      const result = validateQuotaInput('10.7');
      expect(result.valid).toBe(true);
      expect(result.value).toBe(10);
    });
  });
});
