'use strict';

const {
  createRandom, nextRaw, uniform, gaussian,
  absGaussian, exponential, randomInt, pick
} = require('../../src/engine/random');

describe('random', () => {
  describe('createRandom', () => {
    it('creates rng with odd seed', () => {
      const rng = createRandom(42);
      expect(rng).toBeDefined();
      expect(typeof rng.state).toBe('number');
    });

    it('ensures seed is odd', () => {
      const rng = createRandom(42);
      expect(rng.state % 2).toBe(1);
    });

    it('preserves already-odd seed', () => {
      const rng = createRandom(7);
      expect(rng.state).toBe(7);
    });
  });

  describe('nextRaw', () => {
    it('returns a number in [0, 1)', () => {
      const rng = createRandom(1);
      const val = nextRaw(rng);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    });

    it('is deterministic for same seed', () => {
      const rng1 = createRandom(101);
      const rng2 = createRandom(101);
      for (let i = 0; i < 20; i++) {
        expect(nextRaw(rng1)).toBe(nextRaw(rng2));
      }
    });

    it('produces different values for different seeds', () => {
      const rng1 = createRandom(1);
      const rng2 = createRandom(3);
      const v1 = nextRaw(rng1);
      const v2 = nextRaw(rng2);
      expect(v1).not.toBe(v2);
    });

    it('updates state after each call', () => {
      const rng = createRandom(5);
      const first = nextRaw(rng);
      const second = nextRaw(rng);
      expect(first).not.toBe(second);
    });
  });

  describe('uniform', () => {
    it('returns values in [a, b)', () => {
      const rng = createRandom(77);
      for (let i = 0; i < 1000; i++) {
        const val = uniform(rng, 3, 7);
        expect(val).toBeGreaterThanOrEqual(3);
        expect(val).toBeLessThan(7);
      }
    });

    it('is deterministic', () => {
      const rng1 = createRandom(77);
      const rng2 = createRandom(77);
      for (let i = 0; i < 10; i++) {
        expect(uniform(rng1, 0, 100)).toBe(uniform(rng2, 0, 100));
      }
    });
  });

  describe('gaussian', () => {
    it('produces values centered around the mean', () => {
      const rng = createRandom(12345);
      const n = 10000;
      let below = 0, above = 0;
      for (let i = 0; i < n; i++) {
        const val = gaussian(rng, 50, 10);
        if (val < 50) below++;
        else above++;
      }
      const ratio = below / above;
      expect(ratio).toBeGreaterThan(0.5);
      expect(ratio).toBeLessThan(2.0);
    });

    it('produces spread proportional to sigma', () => {
      const rng1 = createRandom(77);
      const rng2 = createRandom(77);
      const n = 5000;
      const narrow = [], wide = [];
      for (let i = 0; i < n; i++) {
        narrow.push(gaussian(rng1, 0, 1));
        wide.push(gaussian(rng2, 0, 10));
      }
      const narrowVar = narrow.reduce((a, b) => a + b * b, 0) / n;
      const wideVar = wide.reduce((a, b) => a + b * b, 0) / n;
      expect(wideVar).toBeGreaterThan(narrowVar * 10);
    });

    it('is deterministic', () => {
      const rng1 = createRandom(42);
      const rng2 = createRandom(42);
      for (let i = 0; i < 10; i++) {
        expect(gaussian(rng1, 0, 1)).toBe(gaussian(rng2, 0, 1));
      }
    });
  });

  describe('absGaussian', () => {
    it('always returns non-negative values', () => {
      const rng = createRandom(123);
      for (let i = 0; i < 5000; i++) {
        expect(absGaussian(rng, 2, 5)).toBeGreaterThanOrEqual(0);
      }
    });

    it('is deterministic', () => {
      const rng1 = createRandom(123);
      const rng2 = createRandom(123);
      for (let i = 0; i < 20; i++) {
        expect(absGaussian(rng1, 5, 2)).toBe(absGaussian(rng2, 5, 2));
      }
    });
  });

  describe('exponential', () => {
    it('always returns non-negative values', () => {
      const rng = createRandom(55);
      for (let i = 0; i < 1000; i++) {
        expect(exponential(rng, 10)).toBeGreaterThanOrEqual(0);
      }
    });

    it('has approximately correct mean', () => {
      const rng = createRandom(55);
      const n = 10000;
      let sum = 0;
      for (let i = 0; i < n; i++) sum += exponential(rng, 10);
      const mean = sum / n;
      expect(mean).toBeGreaterThan(8);
      expect(mean).toBeLessThan(12);
    });
  });

  describe('randomInt', () => {
    it('returns integers in [a, b)', () => {
      const rng = createRandom(33);
      for (let i = 0; i < 1000; i++) {
        const val = randomInt(rng, 5, 10);
        expect(val).toBeGreaterThanOrEqual(5);
        expect(val).toBeLessThan(10);
        expect(Number.isInteger(val)).toBe(true);
      }
    });

    it('can return boundary values', () => {
      const rng = createRandom(1);
      const results = new Set();
      for (let i = 0; i < 500; i++) results.add(randomInt(rng, 0, 3));
      expect(results.has(0)).toBe(true);
      expect(results.has(1)).toBe(true);
      expect(results.has(2)).toBe(true);
      expect(results.has(3)).toBe(false);
    });
  });

  describe('pick', () => {
    it('returns an element from the array', () => {
      const rng = createRandom(42);
      const arr = ['a', 'b', 'c', 'd'];
      for (let i = 0; i < 100; i++) {
        expect(arr).toContain(pick(rng, arr));
      }
    });

    it('can reach all elements', () => {
      const rng = createRandom(1);
      const arr = ['x', 'y', 'z'];
      const results = new Set();
      for (let i = 0; i < 200; i++) results.add(pick(rng, arr));
      expect(results.size).toBe(3);
    });
  });
});
