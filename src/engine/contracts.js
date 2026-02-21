'use strict';

const { uniform, gaussian, absGaussian, exponential, randomInt, pick, nextRaw } = require('./random');
const { COMMODITY_CONFIG } = require('./trading');
const {
  contractPlayerNames,
  getCounterpartyDefaultMessage,
  getCounterpartyPartialPaymentMessage,
  getCounterpartyPartialShipmentMessage,
  getPlayerInsufficientGoodsMessage,
  getPlayerInsufficientFundsContractMessage,
  getBuyContractCompletionMessage,
  getSellContractCompletionMessage
} = require('./messages');

const COMMODITIES = ['wheat', 'slaves', 'oxen', 'horses', 'manure', 'land'];
const MAX_OFFERS = 15;
const MAX_PENDING = 10;
const LIVESTOCK_COMMODITIES = ['slaves', 'oxen', 'horses'];
const INCOMING_LIVESTOCK_HEALTH = 0.9;

// ── AI Player Initialization ──

function bestOfN(rng, n, lo, hi) {
  let best = -Infinity;
  for (let i = 0; i < n; i++) {
    best = Math.max(best, uniform(rng, lo, hi));
  }
  return best;
}

function initializeContractPlayers(rng) {
  return contractPlayerNames.map(name => ({
    name,
    payProbability: bestOfN(rng, 2, 0.5, 1.0),
    shipProbability: bestOfN(rng, 2, 0.5, 1.0),
    defaultProbability: bestOfN(rng, 5, 0.95, 1.0)
  }));
}

// ── Contract Generation ──

function usedPairs(state) {
  const pairs = new Set();
  for (const c of state.contractOffers) {
    if (c && c.active) pairs.add(c.counterpartyName + '|' + c.commodity);
  }
  for (const c of state.pendingContracts) {
    if (c && c.active) pairs.add(c.counterpartyName + '|' + c.commodity);
  }
  return pairs;
}

function pickUnusedPair(state) {
  const pairs = usedPairs(state);
  const players = state.contractPlayers;
  for (let attempts = 0; attempts < 100; attempts++) {
    const player = pick(state.rng, players);
    const commodity = pick(state.rng, COMMODITIES);
    const key = player.name + '|' + commodity;
    if (!pairs.has(key)) return { player, commodity };
  }
  return { player: pick(state.rng, players), commodity: pick(state.rng, COMMODITIES) };
}

function getMarketPrice(state, commodity) {
  const cfg = COMMODITY_CONFIG[commodity];
  return state[cfg.priceField];
}

function getCurrentAmount(state, commodity) {
  const cfg = COMMODITY_CONFIG[commodity];
  return state[cfg.stateField];
}

function generateContract(state) {
  const type = nextRaw(state.rng) < 0.5 ? 'BUY' : 'SELL';
  const { player, commodity } = pickUnusedPair(state);
  const marketPrice = getMarketPrice(state, commodity);
  const currentAmount = getCurrentAmount(state, commodity);

  const rawAmount = gaussian(state.rng, 6 * currentAmount, 2 * currentAmount);
  const floor = marketPrice > 0 ? 200000 / marketPrice : 200000;
  const amount = Math.max(Math.round(rawAmount), Math.round(floor));

  const premium = 0.4 + exponential(state.rng, 0.6);
  const price = Math.round(amount * marketPrice * premium);

  const duration = randomInt(state.rng, 12, 37);

  return {
    type, commodity, amount, price, duration,
    counterpartyName: player.name,
    counterpartyIndex: state.contractPlayers.indexOf(player),
    active: true
  };
}

// ── Monthly Offer Refresh ──

function shouldReplace(state, offer) {
  if (!offer || !offer.active) return true;
  if (offer.duration <= 8) return true;
  return false;
}

function ageOffer(state, offer) {
  offer.duration -= 1;
  if (offer.type === 'BUY') {
    offer.price = Math.round(offer.price * (1 + uniform(state.rng, 0.01, 0.10)));
  } else {
    offer.price = Math.round(offer.price * (1 - uniform(state.rng, 0.01, 0.10)));
  }
}

function refreshOffers(state) {
  if (!state.contractPlayers || state.contractPlayers.length === 0) {
    state.contractPlayers = initializeContractPlayers(state.rng);
  }
  if (!state.contractOffers) state.contractOffers = [];

  // Pad to MAX_OFFERS slots
  while (state.contractOffers.length < MAX_OFFERS) {
    state.contractOffers.push(null);
  }

  // Phase 1: Replace empty/inactive and duration <= 8
  for (let i = 0; i < MAX_OFFERS; i++) {
    if (shouldReplace(state, state.contractOffers[i])) {
      state.contractOffers[i] = generateContract(state);
    }
  }

  // Phase 2: 20% random replacement of remaining
  for (let i = 0; i < MAX_OFFERS; i++) {
    if (state.contractOffers[i] && state.contractOffers[i].active) {
      if (nextRaw(state.rng) < 0.20) {
        state.contractOffers[i] = generateContract(state);
      }
    }
  }

  // Phase 3: Age surviving contracts
  for (let i = 0; i < MAX_OFFERS; i++) {
    const offer = state.contractOffers[i];
    if (offer && offer.active) {
      ageOffer(state, offer);
    }
  }

  return state;
}

// ── Accept Contract ──

function acceptContract(state, offerIndex) {
  if (state.pendingContracts.length >= MAX_PENDING) {
    return { ok: false, message: 'You have too many contracts already' };
  }
  const offer = state.contractOffers[offerIndex];
  if (!offer || !offer.active) {
    return { ok: false, message: 'No active contract at that slot' };
  }
  offer.active = false;
  const pending = { ...offer, active: true };
  state.pendingContracts.push(pending);
  return { ok: true };
}

// ── Contract Settlement ──

function queueMessage(state, face, text, counterpartyName, commodity) {
  state.contractMessages.push({ face, text, counterpartyName, commodity });
}

function getCounterpartyFace(contract, players) {
  return contract.counterpartyIndex % 4;
}

function settleBuyContract(state, contract) {
  const cfg = COMMODITY_CONFIG[contract.commodity];
  const playerGoods = state[cfg.stateField];
  const player = state.contractPlayers[contract.counterpartyIndex];
  const perUnit = contract.amount > 0 ? contract.price / contract.amount : 0;
  const face = getCounterpartyFace(contract, state.contractPlayers);

  // Check player has enough goods
  if (playerGoods < contract.amount) {
    return settleBuyInsufficientGoods(state, contract, cfg, playerGoods, perUnit, face);
  }

  // Check counterparty can pay
  if (nextRaw(state.rng) > player.payProbability) {
    return settleBuyPartialPayment(state, contract, cfg, player, perUnit, face);
  }

  // Full settlement
  return settleBuyFull(state, contract, cfg, face);
}

function settleBuyFull(state, contract, cfg, face) {
  state[cfg.stateField] -= contract.amount;
  state.gold += contract.price;
  contract.active = false;
  const text = getBuyContractCompletionMessage(state.rng);
  queueMessage(state, face, text, contract.counterpartyName, contract.commodity);
  return { settled: true, full: true };
}

function settleBuyInsufficientGoods(state, contract, cfg, playerGoods, perUnit, face) {
  const delivered = playerGoods;
  const payment = Math.round(delivered * perUnit);
  const remainingValue = contract.price - payment;
  const penalty = Math.round(remainingValue * 0.10);

  state[cfg.stateField] = 0;
  state.gold += payment;
  state.gold -= penalty;

  contract.amount -= delivered;
  contract.price -= payment;

  const text = getPlayerInsufficientGoodsMessage(state.rng);
  queueMessage(state, face, text, contract.counterpartyName, contract.commodity);
  return { settled: true, full: false, delivered, payment, penalty };
}

function settleBuyPartialPayment(state, contract, cfg, player, perUnit, face) {
  const fraction = uniform(state.rng, 0.50, 0.95);
  const reducedAmount = Math.round(contract.amount * fraction);
  const reducedPayment = Math.round(reducedAmount * perUnit);
  const remainingValue = contract.price - reducedPayment;
  const bonus = Math.round(remainingValue * 0.10);

  state[cfg.stateField] -= reducedAmount;
  state.gold += reducedPayment + bonus;

  contract.amount -= reducedAmount;
  contract.price -= reducedPayment;

  const text = getCounterpartyPartialPaymentMessage(state.rng);
  queueMessage(state, face, text, contract.counterpartyName, contract.commodity);
  return { settled: true, full: false, reducedAmount, reducedPayment, bonus };
}

function settleSellContract(state, contract) {
  const cfg = COMMODITY_CONFIG[contract.commodity];
  const player = state.contractPlayers[contract.counterpartyIndex];
  const perUnit = contract.amount > 0 ? contract.price / contract.amount : 0;
  const face = getCounterpartyFace(contract, state.contractPlayers);

  // Check player can afford
  if (state.gold < contract.price) {
    return settleSellInsufficientFunds(state, contract, cfg, perUnit, face);
  }

  // Check counterparty can ship
  if (nextRaw(state.rng) > player.shipProbability) {
    return settleSellPartialShipment(state, contract, cfg, player, perUnit, face);
  }

  // Full settlement
  return settleSellFull(state, contract, cfg, face);
}

function settleSellFull(state, contract, cfg, face) {
  state.gold -= contract.price;
  addGoods(state, contract.commodity, contract.amount, cfg);
  contract.active = false;
  const text = getSellContractCompletionMessage(state.rng);
  queueMessage(state, face, text, contract.counterpartyName, contract.commodity);
  return { settled: true, full: true };
}

function settleSellInsufficientFunds(state, contract, cfg, perUnit, face) {
  const penalty = Math.round(contract.price * 0.10);
  state.gold -= penalty;
  const remaining = Math.max(0, state.gold);
  const affordable = perUnit > 0 ? Math.floor(remaining / perUnit) : 0;

  if (affordable > 0) {
    const cost = Math.round(affordable * perUnit);
    state.gold -= cost;
    addGoods(state, contract.commodity, affordable, cfg);
    contract.amount -= affordable;
    contract.price -= cost;
  }

  const text = getPlayerInsufficientFundsContractMessage(state.rng);
  queueMessage(state, face, text, contract.counterpartyName, contract.commodity);
  return { settled: true, full: false, penalty, affordable };
}

function settleSellPartialShipment(state, contract, cfg, player, perUnit, face) {
  const fraction = uniform(state.rng, 0.50, 0.95);
  const reducedAmount = Math.round(contract.amount * fraction);
  const reducedPayment = Math.round(reducedAmount * perUnit);
  const remainingValue = contract.price - reducedPayment;
  const bonus = Math.round(remainingValue * 0.10);

  state.gold -= reducedPayment;
  state.gold += bonus;
  addGoods(state, contract.commodity, reducedAmount, cfg);

  contract.amount -= reducedAmount;
  contract.price -= reducedPayment;

  const text = getCounterpartyPartialShipmentMessage(state.rng);
  queueMessage(state, face, text, contract.counterpartyName, contract.commodity);
  return { settled: true, full: false, reducedAmount, reducedPayment, bonus };
}

// ── Add goods (with livestock health blending) ──

function addGoods(state, commodity, amount, cfg) {
  if (LIVESTOCK_COMMODITIES.includes(commodity)) {
    blendLivestockHealth(state, commodity, amount);
  }
  state[cfg.stateField] += amount;
}

function blendLivestockHealth(state, commodity, amount) {
  const cfg = COMMODITY_CONFIG[commodity];
  if (!cfg.healthKey) return;
  const existing = state[cfg.stateField];
  const existingHealth = state[cfg.healthKey];
  const total = existing + amount;
  if (total > 0) {
    state[cfg.healthKey] = (existingHealth * existing + INCOMING_LIVESTOCK_HEALTH * amount) / total;
  }
}

// ── Monthly Processing ──

function processDefault(state, contract) {
  const player = state.contractPlayers[contract.counterpartyIndex];
  const penalty = Math.round(contract.price * 0.05);
  state.gold += penalty;
  contract.active = false;
  const face = getCounterpartyFace(contract, state.contractPlayers);
  const text = getCounterpartyDefaultMessage(state.rng);
  queueMessage(state, face, text, contract.counterpartyName, contract.commodity);
  return { defaulted: true, penalty };
}

function processContracts(state) {
  if (!state.contractMessages) state.contractMessages = [];

  for (let i = state.pendingContracts.length - 1; i >= 0; i--) {
    const contract = state.pendingContracts[i];
    if (!contract || !contract.active) continue;

    const player = state.contractPlayers[contract.counterpartyIndex];

    // Check for default
    if (nextRaw(state.rng) > player.defaultProbability) {
      processDefault(state, contract);
      continue;
    }

    // Decrement duration
    contract.duration -= 1;

    // Settle if due
    if (contract.duration <= 0) {
      if (contract.type === 'BUY') {
        settleBuyContract(state, contract);
      } else {
        settleSellContract(state, contract);
      }
    }
  }

  // Clean up inactive contracts
  state.pendingContracts = state.pendingContracts.filter(c => c && c.active);
  return state;
}

// ── Contract Dialog ──

function activeOfferIndices(state) {
  const indices = [];
  for (let i = 0; i < state.contractOffers.length; i++) {
    if (state.contractOffers[i] && state.contractOffers[i].active) {
      indices.push(i);
    }
  }
  return indices;
}

function openContractDialog(state) {
  const indices = activeOfferIndices(state);
  state.dialog = {
    type: 'contracts',
    mode: 'browsing',
    selectedIndex: indices.length > 0 ? indices[0] : 0
  };
  return state;
}

function navigateContract(state, direction) {
  const indices = activeOfferIndices(state);
  if (indices.length === 0) return state;
  const currentPos = indices.indexOf(state.dialog.selectedIndex);
  let newPos;
  if (direction === 'down') {
    newPos = (currentPos + 1) % indices.length;
  } else {
    newPos = (currentPos - 1 + indices.length) % indices.length;
  }
  state.dialog.selectedIndex = indices[newPos];
  return state;
}

function confirmContract(state) {
  state.dialog.mode = 'confirming';
  return state;
}

function handleContractInput(state, key) {
  if (state.dialog.mode === 'confirming') {
    return handleConfirmingInput(state, key);
  }
  return handleBrowsingInput(state, key);
}

function handleConfirmingInput(state, key) {
  if (key === 'y') {
    const result = acceptContract(state, state.dialog.selectedIndex);
    if (result.ok) {
      state.dialog = null;
    } else {
      state.statusMessage = result.message;
    }
    return state;
  }
  if (key === 'n' || key === 'Escape') {
    state.dialog.mode = 'browsing';
    return state;
  }
  return state;
}

function handleBrowsingInput(state, key) {
  if (key === 'Escape') {
    state.dialog = null;
    return state;
  }
  if (key === 'ArrowDown') {
    return navigateContract(state, 'down');
  }
  if (key === 'ArrowUp') {
    return navigateContract(state, 'up');
  }
  if (key === 'Enter') {
    return confirmContract(state);
  }
  return state;
}

function clickContractRow(state, rowIndex) {
  if (state.dialog.selectedIndex === rowIndex) {
    state.dialog.mode = 'confirming';
  } else {
    state.dialog.selectedIndex = rowIndex;
  }
  return state;
}

// ── Contract Message Display ──

function showNextContractMessage(state) {
  if (state.contractMessages && state.contractMessages.length > 0) {
    const msg = state.contractMessages.shift();
    state.dialog = { type: 'faceMessage', ...msg };
    return true;
  }
  return false;
}

function dismissContractMessage(state) {
  return showNextContractMessage(state);
}

module.exports = {
  initializeContractPlayers,
  generateContract,
  refreshOffers,
  acceptContract,
  processContracts,
  settleBuyContract,
  settleSellContract,
  blendLivestockHealth,
  openContractDialog,
  navigateContract,
  confirmContract,
  handleContractInput,
  clickContractRow,
  showNextContractMessage,
  dismissContractMessage,
  activeOfferIndices,
  processDefault,
  addGoods,
  MAX_OFFERS,
  MAX_PENDING,
  COMMODITIES,
  LIVESTOCK_COMMODITIES,
  INCOMING_LIVESTOCK_HEALTH
};
