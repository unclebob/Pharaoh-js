'use strict';

const { openingMessages, getOpeningMessage } = require('../../src/engine/messages');
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
});
