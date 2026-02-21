'use strict';

const {
  openingMessages, getOpeningMessage,
  winMessages, farewellMessages,
  pyramidErrorMessages, negativePyramidErrorMessages,
  feedRateErrorMessages, getFeedRateErrorMessage,
  getWinMessage, getFarewellMessage,
  getPyramidErrorMessage, getNegativePyramidErrorMessage
} = require('../../src/engine/messages');
const { createRandom } = require('../../src/engine/random');

describe('messages', () => {
  describe('openingMessages', () => {
    it('is an array of at least 20 strings', () => {
      expect(Array.isArray(openingMessages)).toBe(true);
      expect(openingMessages.length).toBeGreaterThanOrEqual(20);
    });

    it('every entry is a non-empty string', () => {
      openingMessages.forEach(m => {
        expect(typeof m).toBe('string');
        expect(m.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getOpeningMessage', () => {
    it('returns an object with face and text', () => {
      const rng = createRandom(42);
      const msg = getOpeningMessage(rng);
      expect(typeof msg.face).toBe('number');
      expect(typeof msg.text).toBe('string');
    });

    it('face is between 0 and 3', () => {
      const rng = createRandom(77);
      const msg = getOpeningMessage(rng);
      expect(msg.face).toBeGreaterThanOrEqual(0);
      expect(msg.face).toBeLessThanOrEqual(3);
    });

    it('text is from the opening pool', () => {
      const rng = createRandom(99);
      const msg = getOpeningMessage(rng);
      expect(openingMessages).toContain(msg.text);
    });

    it('is deterministic for same seed', () => {
      const r1 = createRandom(42);
      const r2 = createRandom(42);
      expect(getOpeningMessage(r1)).toEqual(getOpeningMessage(r2));
    });
  });

  describe('winMessages', () => {
    it('has at least 10 entries', () => {
      expect(winMessages.length).toBeGreaterThanOrEqual(10);
    });

    it('every entry is a non-empty string', () => {
      winMessages.forEach(m => {
        expect(typeof m).toBe('string');
        expect(m.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getWinMessage', () => {
    it('returns a string from the win pool', () => {
      const rng = createRandom(42);
      expect(winMessages).toContain(getWinMessage(rng));
    });
  });

  describe('farewellMessages', () => {
    it('has at least 5 entries', () => {
      expect(farewellMessages.length).toBeGreaterThanOrEqual(5);
    });

    it('every entry is a non-empty string', () => {
      farewellMessages.forEach(m => {
        expect(typeof m).toBe('string');
        expect(m.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getFarewellMessage', () => {
    it('returns a string from the farewell pool', () => {
      const rng = createRandom(42);
      expect(farewellMessages).toContain(getFarewellMessage(rng));
    });
  });

  describe('pyramidErrorMessages', () => {
    it('has at least 5 entries', () => {
      expect(pyramidErrorMessages.length).toBeGreaterThanOrEqual(5);
    });

    it('every entry is a non-empty string', () => {
      pyramidErrorMessages.forEach(m => {
        expect(typeof m).toBe('string');
        expect(m.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getPyramidErrorMessage', () => {
    it('returns a string from the pyramid error pool', () => {
      const rng = createRandom(42);
      expect(pyramidErrorMessages).toContain(getPyramidErrorMessage(rng));
    });
  });

  describe('negativePyramidErrorMessages', () => {
    it('has at least 5 entries', () => {
      expect(negativePyramidErrorMessages.length).toBeGreaterThanOrEqual(5);
    });

    it('every entry is a non-empty string', () => {
      negativePyramidErrorMessages.forEach(m => {
        expect(typeof m).toBe('string');
        expect(m.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getNegativePyramidErrorMessage', () => {
    it('returns a string from the negative pyramid error pool', () => {
      const rng = createRandom(42);
      expect(negativePyramidErrorMessages).toContain(getNegativePyramidErrorMessage(rng));
    });
  });

  describe('feedRateErrorMessages', () => {
    it('has at least 5 entries', () => {
      expect(feedRateErrorMessages.length).toBeGreaterThanOrEqual(5);
    });

    it('every entry is a non-empty string', () => {
      feedRateErrorMessages.forEach(m => {
        expect(typeof m).toBe('string');
        expect(m.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getFeedRateErrorMessage', () => {
    it('returns a string from the feed rate error pool', () => {
      const rng = createRandom(42);
      expect(feedRateErrorMessages).toContain(getFeedRateErrorMessage(rng));
    });
  });
});
