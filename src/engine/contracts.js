'use strict';

function refreshOffers(state) {
  if (!state.contractOffers || state.contractOffers.length === 0) {
    state.contractOffers = [];
  }
  return state;
}

module.exports = { refreshOffers };
