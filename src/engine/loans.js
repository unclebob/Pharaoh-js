'use strict';

function borrow(state, amount) {
  const maxBorrow = state.creditLimit * state.creditRating;
  const actual = Math.min(amount || maxBorrow, maxBorrow);
  if (actual <= 0) return 0;
  state.gold += actual;
  state.loan += actual;
  return actual;
}

module.exports = { borrow };
