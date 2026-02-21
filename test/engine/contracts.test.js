'use strict';

const { refreshOffers } = require('../../src/engine/contracts');
const { createGameState } = require('../../src/engine/state');

describe('contracts', () => {
  describe('refreshOffers', () => {
    it('initializes contractOffers if empty', () => {
      const state = createGameState(42);
      refreshOffers(state);
      expect(Array.isArray(state.contractOffers)).toBe(true);
    });

    it('returns state', () => {
      const state = createGameState(42);
      expect(refreshOffers(state)).toBe(state);
    });

    it('preserves existing offers', () => {
      const state = createGameState(42);
      state.contractOffers = [{ id: 1 }];
      refreshOffers(state);
      expect(state.contractOffers).toEqual([{ id: 1 }]);
    });
  });
});
