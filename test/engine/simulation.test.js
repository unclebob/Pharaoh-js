'use strict';

const { simulateMonth, snapshotPrev, advanceMonth, checkRandomEvent } = require('../../src/engine/simulation');
const { createGameState } = require('../../src/engine/state');

describe('simulation', () => {
  let state;

  beforeEach(() => {
    state = createGameState(42);
    state.gold = 100;
    state.wheat = 50;
  });

  describe('snapshotPrev', () => {
    it('captures current values', () => {
      const snap = snapshotPrev(state);
      expect(snap.gold).toBe(100);
      expect(snap.wheat).toBe(50);
      expect(snap.month).toBe(1);
      expect(snap.year).toBe(1);
    });

    it('is independent of later state changes', () => {
      const snap = snapshotPrev(state);
      state.gold = 999;
      expect(snap.gold).toBe(100);
    });
  });

  describe('advanceMonth', () => {
    it('increments month by 1', () => {
      state.month = 5;
      advanceMonth(state);
      expect(state.month).toBe(6);
    });

    it('rolls over from 12 to 1', () => {
      state.month = 12;
      state.year = 3;
      advanceMonth(state);
      expect(state.month).toBe(1);
      expect(state.year).toBe(4);
    });

    it('does not increment year for non-December months', () => {
      state.month = 6;
      state.year = 2;
      advanceMonth(state);
      expect(state.year).toBe(2);
    });
  });

  describe('checkRandomEvent', () => {
    it('sets randomEvent flag on state', () => {
      checkRandomEvent(state);
      expect(typeof state.randomEvent).toBe('boolean');
    });

    it('returns the randomEvent flag value', () => {
      const result = checkRandomEvent(state);
      expect(result).toBe(state.randomEvent);
    });
  });

  describe('simulateMonth', () => {
    it('records prev snapshot', () => {
      simulateMonth(state);
      expect(state.prev.gold).toBe(100);
    });

    it('advances the month', () => {
      state.month = 3;
      simulateMonth(state);
      expect(state.month).toBe(4);
    });

    it('returns the state', () => {
      const result = simulateMonth(state);
      expect(result).toBe(state);
    });

    it('sets randomEvent flag', () => {
      simulateMonth(state);
      expect(typeof state.randomEvent).toBe('boolean');
    });
  });
});
