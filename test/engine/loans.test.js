'use strict';

const { borrow } = require('../../src/engine/loans');
const { createGameState } = require('../../src/engine/state');
const { setDifficulty } = require('../../src/engine/difficulty');

describe('loans', () => {
  let state;

  beforeEach(() => {
    state = createGameState(42);
    setDifficulty(state, 'easy');
  });

  describe('borrow', () => {
    it('adds gold to player', () => {
      borrow(state, 1000);
      expect(state.gold).toBe(1000);
    });

    it('increases loan balance', () => {
      borrow(state, 1000);
      expect(state.loan).toBe(1000);
    });

    it('caps at credit limit * credit rating', () => {
      const borrowed = borrow(state, 99999999);
      expect(borrowed).toBe(5000000);
    });

    it('returns 0 when credit limit is 0', () => {
      state.creditLimit = 0;
      const borrowed = borrow(state, 1000);
      expect(borrowed).toBe(0);
    });

    it('borrows max when no amount specified', () => {
      const borrowed = borrow(state);
      expect(borrowed).toBe(5000000);
      expect(state.gold).toBe(5000000);
    });
  });
});
