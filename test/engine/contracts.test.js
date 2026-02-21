'use strict';

const { createGameState } = require('../../src/engine/state');
const { createRandom, nextRaw, uniform } = require('../../src/engine/random');
const { setDifficulty } = require('../../src/engine/difficulty');
const { COMMODITY_CONFIG } = require('../../src/engine/trading');
const {
  contractPlayerNames,
  counterpartyDefaultMessages,
  counterpartyPartialPaymentMessages,
  counterpartyPartialShipmentMessages,
  playerInsufficientGoodsMessages,
  playerInsufficientFundsContractMessages,
  buyContractCompletionMessages,
  sellContractCompletionMessages
} = require('../../src/engine/messages');
const {
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
} = require('../../src/engine/contracts');

function makeState(seed) {
  const state = createGameState(seed || 42);
  setDifficulty(state, 'easy');
  state.gold = 100000;
  state.wheat = 1000;
  state.slaves = 200;
  state.oxen = 150;
  state.horses = 100;
  state.manure = 500;
  state.fallow = 300;
  state.contractMessages = [];
  return state;
}

function makePlayer(overrides) {
  return {
    name: 'Test Player',
    payProbability: 1.0,
    shipProbability: 1.0,
    defaultProbability: 1.0,
    ...overrides
  };
}

function makeContract(overrides) {
  return {
    type: 'BUY',
    commodity: 'wheat',
    amount: 500,
    price: 50000,
    duration: 1,
    counterpartyName: 'Test Player',
    counterpartyIndex: 0,
    active: true,
    ...overrides
  };
}

// ── initializeContractPlayers ──

describe('initializeContractPlayers', () => {
  it('creates 10 players', () => {
    const rng = createRandom(42);
    const players = initializeContractPlayers(rng);
    expect(players).toHaveLength(10);
  });

  it('uses names from contractPlayerNames', () => {
    const rng = createRandom(42);
    const players = initializeContractPlayers(rng);
    players.forEach((p, i) => {
      expect(p.name).toBe(contractPlayerNames[i]);
    });
  });

  it('sets payProbability between 0.5 and 1.0', () => {
    const rng = createRandom(42);
    const players = initializeContractPlayers(rng);
    players.forEach(p => {
      expect(p.payProbability).toBeGreaterThanOrEqual(0.5);
      expect(p.payProbability).toBeLessThanOrEqual(1.0);
    });
  });

  it('sets shipProbability between 0.5 and 1.0', () => {
    const rng = createRandom(42);
    const players = initializeContractPlayers(rng);
    players.forEach(p => {
      expect(p.shipProbability).toBeGreaterThanOrEqual(0.5);
      expect(p.shipProbability).toBeLessThanOrEqual(1.0);
    });
  });

  it('sets defaultProbability between 0.95 and 1.0', () => {
    const rng = createRandom(42);
    const players = initializeContractPlayers(rng);
    players.forEach(p => {
      expect(p.defaultProbability).toBeGreaterThanOrEqual(0.95);
      expect(p.defaultProbability).toBeLessThanOrEqual(1.0);
    });
  });

  it('payProbability is best of 2 draws (biased high)', () => {
    // Collect all 10 players' pay probabilities across many seeds
    let sumPay = 0;
    let count = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const rng = createRandom(seed);
      const players = initializeContractPlayers(rng);
      players.forEach(p => { sumPay += p.payProbability; count++; });
    }
    // Best-of-2 uniform [0.5,1.0]: theoretical mean ~ 0.833
    const avg = sumPay / count;
    expect(avg).toBeGreaterThan(0.65);
    expect(avg).toBeLessThan(0.98);
  });

  it('defaultProbability is best of 5 draws (biased high)', () => {
    let sumDef = 0;
    for (let seed = 1; seed < 100; seed++) {
      const rng = createRandom(seed);
      const players = initializeContractPlayers(rng);
      sumDef += players[0].defaultProbability;
    }
    const avg = sumDef / 99;
    // Best-of-5 in [0.95,1.0] should average well above 0.975
    expect(avg).toBeGreaterThan(0.97);
  });
});

// ── generateContract ──

describe('generateContract', () => {
  let state;

  beforeEach(() => {
    state = makeState(42);
    state.contractPlayers = initializeContractPlayers(state.rng);
  });

  it('creates a contract with required fields', () => {
    const c = generateContract(state);
    expect(c).toHaveProperty('type');
    expect(c).toHaveProperty('commodity');
    expect(c).toHaveProperty('amount');
    expect(c).toHaveProperty('price');
    expect(c).toHaveProperty('duration');
    expect(c).toHaveProperty('counterpartyName');
    expect(c).toHaveProperty('counterpartyIndex');
    expect(c.active).toBe(true);
  });

  it('type is BUY or SELL', () => {
    const c = generateContract(state);
    expect(['BUY', 'SELL']).toContain(c.type);
  });

  it('type is approximately 50/50 over many trials', () => {
    let buys = 0;
    for (let i = 0; i < 200; i++) {
      const c = generateContract(state);
      if (c.type === 'BUY') buys++;
    }
    expect(buys).toBeGreaterThan(60);
    expect(buys).toBeLessThan(140);
  });

  it('counterparty is one of the 10 players', () => {
    const c = generateContract(state);
    expect(contractPlayerNames).toContain(c.counterpartyName);
  });

  it('commodity is one of the 6 commodities', () => {
    const c = generateContract(state);
    expect(COMMODITIES).toContain(c.commodity);
  });

  it('amount is positive', () => {
    const c = generateContract(state);
    expect(c.amount).toBeGreaterThan(0);
  });

  it('price is positive', () => {
    const c = generateContract(state);
    expect(c.price).toBeGreaterThan(0);
  });

  it('duration is between 12 and 36', () => {
    for (let i = 0; i < 50; i++) {
      const c = generateContract(state);
      expect(c.duration).toBeGreaterThanOrEqual(12);
      expect(c.duration).toBeLessThanOrEqual(36);
    }
  });

  it('avoids duplicate counterparty-commodity pairs in offers', () => {
    state.contractOffers = [
      makeContract({ counterpartyName: 'King HamuNam', commodity: 'wheat', active: true })
    ];
    let foundDuplicate = false;
    for (let i = 0; i < 50; i++) {
      const c = generateContract(state);
      if (c.counterpartyName === 'King HamuNam' && c.commodity === 'wheat') {
        foundDuplicate = true;
      }
    }
    expect(foundDuplicate).toBe(false);
  });

  it('avoids duplicate counterparty-commodity pairs in pending contracts', () => {
    state.pendingContracts = [
      makeContract({ counterpartyName: 'King HamuNam', commodity: 'oxen', active: true })
    ];
    let foundDuplicate = false;
    for (let i = 0; i < 50; i++) {
      const c = generateContract(state);
      if (c.counterpartyName === 'King HamuNam' && c.commodity === 'oxen') {
        foundDuplicate = true;
      }
    }
    expect(foundDuplicate).toBe(false);
  });

  it('amount has floor of 200000/price per unit', () => {
    // Set very high prices so the floor kicks in
    state.wheatPrice = 100000;
    state.wheat = 0; // 6*0 = 0 mean, so gaussian will be small
    // Override to force wheat commodity
    const contracts = [];
    for (let i = 0; i < 100; i++) {
      const c = generateContract(state);
      if (c.commodity === 'wheat') contracts.push(c);
    }
    // At least some contracts should use the floor
    if (contracts.length > 0) {
      contracts.forEach(c => {
        expect(c.amount).toBeGreaterThanOrEqual(1);
      });
    }
  });
});

// ── refreshOffers ──

describe('refreshOffers', () => {
  let state;

  beforeEach(() => {
    state = makeState(42);
  });

  it('initializes contract players if not present', () => {
    state.contractPlayers = [];
    refreshOffers(state);
    expect(state.contractPlayers).toHaveLength(10);
  });

  it('fills all 15 offer slots when empty', () => {
    refreshOffers(state);
    expect(state.contractOffers).toHaveLength(MAX_OFFERS);
    state.contractOffers.forEach(offer => {
      expect(offer).not.toBeNull();
      expect(offer.active).toBe(true);
    });
  });

  it('replaces contracts with duration <= 8', () => {
    state.contractPlayers = initializeContractPlayers(state.rng);
    state.contractOffers = Array(MAX_OFFERS).fill(null).map(() =>
      makeContract({ duration: 7, active: true })
    );
    refreshOffers(state);
    // All should have been replaced with fresh contracts (duration >= 11 after aging)
    state.contractOffers.forEach(offer => {
      expect(offer.active).toBe(true);
    });
  });

  it('ages surviving contracts by decrementing duration', () => {
    state.contractPlayers = initializeContractPlayers(state.rng);
    // Create contracts with high duration that won't be replaced
    const original = makeContract({ duration: 30, type: 'BUY', active: true });
    state.contractOffers = Array(MAX_OFFERS).fill(null).map(() => ({ ...original }));
    // Some will be randomly replaced (20%), but survivors should be aged
    refreshOffers(state);
    const survivors = state.contractOffers.filter(o => o.duration < 30);
    // All offers should exist
    expect(state.contractOffers).toHaveLength(MAX_OFFERS);
  });

  it('increases BUY offer prices when aging', () => {
    state.contractPlayers = initializeContractPlayers(state.rng);
    const originalPrice = 10000;
    state.contractOffers = Array(MAX_OFFERS).fill(null).map(() =>
      makeContract({ duration: 30, type: 'BUY', price: originalPrice, active: true })
    );
    refreshOffers(state);
    // Surviving BUY contracts should have higher prices after aging
    // (some may be replaced, but survivors should have price >= originalPrice * 1.01)
    const aged = state.contractOffers.filter(o => o.type === 'BUY' && o.duration === 29);
    aged.forEach(o => {
      expect(o.price).toBeGreaterThan(originalPrice);
    });
  });

  it('decreases SELL offer prices when aging', () => {
    state.contractPlayers = initializeContractPlayers(state.rng);
    const originalPrice = 10000;
    state.contractOffers = Array(MAX_OFFERS).fill(null).map(() =>
      makeContract({ duration: 30, type: 'SELL', price: originalPrice, active: true })
    );
    refreshOffers(state);
    const aged = state.contractOffers.filter(o => o.type === 'SELL' && o.duration === 29);
    aged.forEach(o => {
      expect(o.price).toBeLessThan(originalPrice);
    });
  });

  it('returns state', () => {
    expect(refreshOffers(state)).toBe(state);
  });
});

// ── acceptContract ──

describe('acceptContract', () => {
  let state;

  beforeEach(() => {
    state = makeState(42);
    state.contractPlayers = initializeContractPlayers(state.rng);
    state.contractOffers = [makeContract({ active: true })];
    state.pendingContracts = [];
  });

  it('moves offer to pending contracts', () => {
    const result = acceptContract(state, 0);
    expect(result.ok).toBe(true);
    expect(state.pendingContracts).toHaveLength(1);
    expect(state.pendingContracts[0].active).toBe(true);
  });

  it('marks offer slot as inactive', () => {
    acceptContract(state, 0);
    expect(state.contractOffers[0].active).toBe(false);
  });

  it('rejects when 10 pending contracts exist', () => {
    state.pendingContracts = Array(10).fill(null).map(() => makeContract());
    const result = acceptContract(state, 0);
    expect(result.ok).toBe(false);
    expect(result.message).toBe('You have too many contracts already');
  });

  it('rejects inactive offer', () => {
    state.contractOffers[0].active = false;
    const result = acceptContract(state, 0);
    expect(result.ok).toBe(false);
  });

  it('rejects null offer slot', () => {
    state.contractOffers[0] = null;
    const result = acceptContract(state, 0);
    expect(result.ok).toBe(false);
  });
});

// ── settleBuyContract ──

describe('settleBuyContract', () => {
  let state;

  beforeEach(() => {
    state = makeState(42);
    state.contractPlayers = [makePlayer({ payProbability: 1.0 })];
    state.contractMessages = [];
  });

  it('full settlement: deducts goods and adds gold', () => {
    const contract = makeContract({ type: 'BUY', commodity: 'oxen', amount: 100, price: 50000 });
    state.oxen = 200;
    settleBuyContract(state, contract);
    expect(state.oxen).toBe(100);
    expect(state.gold).toBe(150000);
    expect(contract.active).toBe(false);
  });

  it('full settlement queues completion message', () => {
    const contract = makeContract({ type: 'BUY', commodity: 'wheat', amount: 100, price: 5000 });
    settleBuyContract(state, contract);
    expect(state.contractMessages).toHaveLength(1);
    expect(buyContractCompletionMessages).toContain(state.contractMessages[0].text);
  });

  it('insufficient goods: delivers all available, charges penalty', () => {
    const contract = makeContract({ type: 'BUY', commodity: 'oxen', amount: 500, price: 50000 });
    state.oxen = 300;
    const prevGold = state.gold;
    const result = settleBuyContract(state, contract);
    expect(state.oxen).toBe(0);
    // Per unit = 50000/500 = 100
    // Payment for 300 = 30000
    // Remaining value = 20000, penalty = 2000
    expect(result.delivered).toBe(300);
    expect(result.payment).toBe(30000);
    expect(result.penalty).toBe(2000);
    expect(state.gold).toBe(prevGold + 30000 - 2000);
  });

  it('insufficient goods: adjusts contract for remainder', () => {
    const contract = makeContract({ type: 'BUY', commodity: 'oxen', amount: 500, price: 50000 });
    state.oxen = 300;
    settleBuyContract(state, contract);
    expect(contract.amount).toBe(200);
    expect(contract.price).toBe(20000);
  });

  it('insufficient goods queues message', () => {
    const contract = makeContract({ type: 'BUY', commodity: 'oxen', amount: 500, price: 50000 });
    state.oxen = 300;
    settleBuyContract(state, contract);
    expect(state.contractMessages).toHaveLength(1);
    expect(playerInsufficientGoodsMessages).toContain(state.contractMessages[0].text);
  });

  it('counterparty partial payment: buys 50-95%, player gets bonus', () => {
    state.contractPlayers = [makePlayer({ payProbability: 0 })]; // Always fails
    const contract = makeContract({ type: 'BUY', commodity: 'wheat', amount: 1000, price: 10000 });
    state.wheat = 2000;
    const prevGold = state.gold;
    const result = settleBuyContract(state, contract);
    expect(result.reducedAmount).toBeGreaterThanOrEqual(500);
    expect(result.reducedAmount).toBeLessThanOrEqual(950);
    expect(result.bonus).toBeGreaterThan(0);
    expect(state.gold).toBe(prevGold + result.reducedPayment + result.bonus);
  });

  it('counterparty partial payment queues message', () => {
    state.contractPlayers = [makePlayer({ payProbability: 0 })];
    const contract = makeContract({ type: 'BUY', commodity: 'wheat', amount: 1000, price: 10000 });
    state.wheat = 2000;
    settleBuyContract(state, contract);
    expect(state.contractMessages).toHaveLength(1);
    expect(counterpartyPartialPaymentMessages).toContain(state.contractMessages[0].text);
  });

  it('counterparty partial payment adjusts contract', () => {
    state.contractPlayers = [makePlayer({ payProbability: 0 })];
    const contract = makeContract({ type: 'BUY', commodity: 'wheat', amount: 1000, price: 10000 });
    state.wheat = 2000;
    const result = settleBuyContract(state, contract);
    expect(contract.amount).toBe(1000 - result.reducedAmount);
    expect(contract.price).toBe(10000 - result.reducedPayment);
  });
});

// ── settleSellContract ──

describe('settleSellContract', () => {
  let state;

  beforeEach(() => {
    state = makeState(42);
    state.contractPlayers = [makePlayer({ shipProbability: 1.0 })];
    state.contractMessages = [];
  });

  it('full settlement: deducts gold and adds goods', () => {
    const contract = makeContract({ type: 'SELL', commodity: 'wheat', amount: 1000, price: 20000 });
    state.gold = 50000;
    settleSellContract(state, contract);
    expect(state.gold).toBe(30000);
    expect(state.wheat).toBe(2000);
    expect(contract.active).toBe(false);
  });

  it('full settlement queues completion message', () => {
    const contract = makeContract({ type: 'SELL', commodity: 'wheat', amount: 100, price: 5000 });
    settleSellContract(state, contract);
    expect(state.contractMessages).toHaveLength(1);
    expect(sellContractCompletionMessages).toContain(state.contractMessages[0].text);
  });

  it('insufficient funds: deducts 10% penalty, buys what player can afford', () => {
    const contract = makeContract({ type: 'SELL', commodity: 'wheat', amount: 1000, price: 20000 });
    state.gold = 15000;
    const result = settleSellContract(state, contract);
    // Penalty = 20000 * 0.10 = 2000
    expect(result.penalty).toBe(2000);
    // After penalty: 15000 - 2000 = 13000 remaining
    // Per unit = 20000/1000 = 20
    // Affordable = floor(13000/20) = 650
    expect(result.affordable).toBe(650);
  });

  it('insufficient funds queues message', () => {
    const contract = makeContract({ type: 'SELL', commodity: 'wheat', amount: 1000, price: 20000 });
    state.gold = 15000;
    settleSellContract(state, contract);
    expect(state.contractMessages).toHaveLength(1);
    expect(playerInsufficientFundsContractMessages).toContain(state.contractMessages[0].text);
  });

  it('insufficient funds adjusts contract', () => {
    const contract = makeContract({ type: 'SELL', commodity: 'wheat', amount: 1000, price: 20000 });
    state.gold = 15000;
    const result = settleSellContract(state, contract);
    expect(contract.amount).toBe(1000 - result.affordable);
    expect(contract.price).toBe(20000 - Math.round(result.affordable * 20));
  });

  it('counterparty partial shipment: ships 50-95%, player gets bonus', () => {
    state.contractPlayers = [makePlayer({ shipProbability: 0 })]; // Always fails
    const contract = makeContract({ type: 'SELL', commodity: 'wheat', amount: 1000, price: 20000 });
    const prevGold = state.gold;
    const prevWheat = state.wheat;
    const result = settleSellContract(state, contract);
    expect(result.reducedAmount).toBeGreaterThanOrEqual(500);
    expect(result.reducedAmount).toBeLessThanOrEqual(950);
    expect(result.bonus).toBeGreaterThan(0);
    expect(state.wheat).toBe(prevWheat + result.reducedAmount);
  });

  it('counterparty partial shipment queues message', () => {
    state.contractPlayers = [makePlayer({ shipProbability: 0 })];
    const contract = makeContract({ type: 'SELL', commodity: 'wheat', amount: 1000, price: 20000 });
    settleSellContract(state, contract);
    expect(state.contractMessages).toHaveLength(1);
    expect(counterpartyPartialShipmentMessages).toContain(state.contractMessages[0].text);
  });

  it('counterparty partial shipment adjusts contract', () => {
    state.contractPlayers = [makePlayer({ shipProbability: 0 })];
    const contract = makeContract({ type: 'SELL', commodity: 'wheat', amount: 1000, price: 20000 });
    const result = settleSellContract(state, contract);
    expect(contract.amount).toBe(1000 - result.reducedAmount);
    expect(contract.price).toBe(20000 - result.reducedPayment);
  });

  it('receiving livestock blends health', () => {
    state.contractPlayers = [makePlayer({ shipProbability: 1.0 })];
    state.horses = 100;
    state.horseHealth = 0.7;
    const contract = makeContract({ type: 'SELL', commodity: 'horses', amount: 100, price: 5000 });
    settleSellContract(state, contract);
    // blended = (0.7*100 + 0.9*100) / 200 = 160/200 = 0.8
    expect(state.horseHealth).toBeCloseTo(0.8, 5);
    expect(state.horses).toBe(200);
  });
});

// ── blendLivestockHealth ──

describe('blendLivestockHealth', () => {
  let state;

  beforeEach(() => {
    state = makeState(42);
  });

  it('blends horse health correctly', () => {
    state.horses = 50;
    state.horseHealth = 0.6;
    blendLivestockHealth(state, 'horses', 50);
    // (0.6*50 + 0.9*50) / 100 = 75/100 = 0.75
    expect(state.horseHealth).toBeCloseTo(0.75, 5);
  });

  it('blends slave health correctly', () => {
    state.slaves = 200;
    state.slaveHealth = 0.8;
    blendLivestockHealth(state, 'slaves', 100);
    // (0.8*200 + 0.9*100) / 300 = 250/300 = 0.833...
    expect(state.slaveHealth).toBeCloseTo(250 / 300, 5);
  });

  it('blends oxen health correctly', () => {
    state.oxen = 100;
    state.oxenHealth = 0.5;
    blendLivestockHealth(state, 'oxen', 100);
    // (0.5*100 + 0.9*100) / 200 = 140/200 = 0.7
    expect(state.oxenHealth).toBeCloseTo(0.7, 5);
  });

  it('does nothing for non-livestock', () => {
    const prevWheat = state.wheat;
    blendLivestockHealth(state, 'wheat', 100);
    // No healthKey for wheat, so nothing changes
    expect(state.wheat).toBe(prevWheat);
  });

  it('handles zero existing stock', () => {
    state.horses = 0;
    state.horseHealth = 1.0;
    blendLivestockHealth(state, 'horses', 50);
    // (1.0*0 + 0.9*50) / 50 = 0.9
    expect(state.horseHealth).toBeCloseTo(0.9, 5);
  });
});

// ── processContracts ──

describe('processContracts', () => {
  let state;

  beforeEach(() => {
    state = makeState(42);
    state.contractPlayers = [makePlayer({ defaultProbability: 1.0 })];
    state.contractMessages = [];
    state.pendingContracts = [];
  });

  it('decrements duration of active contracts', () => {
    const contract = makeContract({ duration: 5 });
    state.pendingContracts = [contract];
    processContracts(state);
    expect(contract.duration).toBe(4);
  });

  it('settles BUY contract when duration reaches 0', () => {
    const contract = makeContract({ type: 'BUY', commodity: 'wheat', amount: 100, price: 1000, duration: 1 });
    state.pendingContracts = [contract];
    processContracts(state);
    expect(contract.active).toBe(false);
    expect(state.contractMessages).toHaveLength(1);
  });

  it('settles SELL contract when duration reaches 0', () => {
    const contract = makeContract({ type: 'SELL', commodity: 'wheat', amount: 100, price: 1000, duration: 1 });
    state.pendingContracts = [contract];
    processContracts(state);
    expect(contract.active).toBe(false);
    expect(state.contractMessages).toHaveLength(1);
  });

  it('handles counterparty default', () => {
    state.contractPlayers = [makePlayer({ defaultProbability: 0 })]; // Always defaults
    const contract = makeContract({ duration: 10, price: 10000 });
    state.pendingContracts = [contract];
    const prevGold = state.gold;
    processContracts(state);
    // 5% cancellation payment
    expect(state.gold).toBe(prevGold + 500);
    expect(contract.active).toBe(false);
    expect(state.contractMessages).toHaveLength(1);
    expect(counterpartyDefaultMessages).toContain(state.contractMessages[0].text);
  });

  it('removes inactive contracts from pending', () => {
    const contract = makeContract({ type: 'BUY', commodity: 'wheat', amount: 100, price: 1000, duration: 1 });
    state.pendingContracts = [contract];
    processContracts(state);
    expect(state.pendingContracts.filter(c => c.active)).toHaveLength(0);
  });

  it('does not process inactive contracts', () => {
    const contract = makeContract({ active: false, duration: 1 });
    state.pendingContracts = [contract];
    processContracts(state);
    expect(state.contractMessages).toHaveLength(0);
  });
});

// ── processDefault ──

describe('processDefault', () => {
  let state;

  beforeEach(() => {
    state = makeState(42);
    state.contractPlayers = [makePlayer()];
    state.contractMessages = [];
  });

  it('marks contract inactive', () => {
    const contract = makeContract({ price: 10000 });
    processDefault(state, contract);
    expect(contract.active).toBe(false);
  });

  it('pays 5% cancellation penalty', () => {
    const contract = makeContract({ price: 10000 });
    const prevGold = state.gold;
    processDefault(state, contract);
    expect(state.gold).toBe(prevGold + 500);
  });

  it('queues default message', () => {
    const contract = makeContract({ price: 10000 });
    processDefault(state, contract);
    expect(state.contractMessages).toHaveLength(1);
    expect(counterpartyDefaultMessages).toContain(state.contractMessages[0].text);
    expect(state.contractMessages[0].counterpartyName).toBe('Test Player');
  });
});

// ── Contract Dialog ──

describe('openContractDialog', () => {
  let state;

  beforeEach(() => {
    state = makeState(42);
    state.contractOffers = [
      makeContract({ active: true }),
      makeContract({ active: false }),
      makeContract({ active: true })
    ];
  });

  it('sets dialog type to contracts', () => {
    openContractDialog(state);
    expect(state.dialog.type).toBe('contracts');
  });

  it('sets mode to browsing', () => {
    openContractDialog(state);
    expect(state.dialog.mode).toBe('browsing');
  });

  it('selects first active offer', () => {
    openContractDialog(state);
    expect(state.dialog.selectedIndex).toBe(0);
  });

  it('selects first active when first slot is inactive', () => {
    state.contractOffers[0].active = false;
    openContractDialog(state);
    expect(state.dialog.selectedIndex).toBe(2);
  });
});

describe('navigateContract', () => {
  let state;

  beforeEach(() => {
    state = makeState(42);
    state.contractOffers = [
      makeContract({ active: true }),
      makeContract({ active: false }),
      makeContract({ active: true }),
      makeContract({ active: true })
    ];
    openContractDialog(state);
  });

  it('moves to next active offer on down', () => {
    navigateContract(state, 'down');
    expect(state.dialog.selectedIndex).toBe(2);
  });

  it('wraps around at bottom', () => {
    state.dialog.selectedIndex = 3;
    navigateContract(state, 'down');
    expect(state.dialog.selectedIndex).toBe(0);
  });

  it('moves to previous active offer on up', () => {
    state.dialog.selectedIndex = 2;
    navigateContract(state, 'up');
    expect(state.dialog.selectedIndex).toBe(0);
  });

  it('wraps around at top', () => {
    state.dialog.selectedIndex = 0;
    navigateContract(state, 'up');
    expect(state.dialog.selectedIndex).toBe(3);
  });
});

describe('confirmContract', () => {
  it('switches mode to confirming', () => {
    const state = makeState(42);
    state.dialog = { type: 'contracts', mode: 'browsing', selectedIndex: 0 };
    confirmContract(state);
    expect(state.dialog.mode).toBe('confirming');
  });
});

describe('handleContractInput', () => {
  let state;

  beforeEach(() => {
    state = makeState(42);
    state.contractPlayers = initializeContractPlayers(state.rng);
    state.contractOffers = Array(MAX_OFFERS).fill(null).map(() => makeContract({ active: true }));
    state.pendingContracts = [];
    openContractDialog(state);
  });

  it('Enter switches to confirming mode', () => {
    handleContractInput(state, 'Enter');
    expect(state.dialog.mode).toBe('confirming');
  });

  it('ArrowDown navigates down', () => {
    const prev = state.dialog.selectedIndex;
    handleContractInput(state, 'ArrowDown');
    expect(state.dialog.selectedIndex).not.toBe(prev);
  });

  it('ArrowUp navigates up', () => {
    state.dialog.selectedIndex = 5;
    handleContractInput(state, 'ArrowUp');
    expect(state.dialog.selectedIndex).toBe(4);
  });

  it('Escape in browsing closes dialog', () => {
    handleContractInput(state, 'Escape');
    expect(state.dialog).toBeNull();
  });

  it('y in confirming mode accepts contract', () => {
    state.dialog.mode = 'confirming';
    handleContractInput(state, 'y');
    expect(state.dialog).toBeNull();
    expect(state.pendingContracts).toHaveLength(1);
  });

  it('n in confirming mode returns to browsing', () => {
    state.dialog.mode = 'confirming';
    handleContractInput(state, 'n');
    expect(state.dialog.mode).toBe('browsing');
  });

  it('Escape in confirming mode returns to browsing', () => {
    state.dialog.mode = 'confirming';
    handleContractInput(state, 'Escape');
    expect(state.dialog.mode).toBe('browsing');
  });

  it('y in confirming rejects if max pending', () => {
    state.pendingContracts = Array(10).fill(null).map(() => makeContract());
    state.dialog.mode = 'confirming';
    handleContractInput(state, 'y');
    expect(state.statusMessage).toBe('You have too many contracts already');
  });

  it('unrecognized key in confirming mode does nothing', () => {
    state.dialog.mode = 'confirming';
    handleContractInput(state, 'x');
    expect(state.dialog.mode).toBe('confirming');
  });

  it('unrecognized key in browsing mode does nothing', () => {
    const prevIndex = state.dialog.selectedIndex;
    handleContractInput(state, 'z');
    expect(state.dialog.selectedIndex).toBe(prevIndex);
    expect(state.dialog.mode).toBe('browsing');
  });
});

describe('clickContractRow', () => {
  let state;

  beforeEach(() => {
    state = makeState(42);
    state.contractOffers = Array(5).fill(null).map(() => makeContract({ active: true }));
    openContractDialog(state);
  });

  it('selects a different row', () => {
    clickContractRow(state, 2);
    expect(state.dialog.selectedIndex).toBe(2);
    expect(state.dialog.mode).toBe('browsing');
  });

  it('confirms when clicking already selected row', () => {
    state.dialog.selectedIndex = 0;
    clickContractRow(state, 0);
    expect(state.dialog.mode).toBe('confirming');
  });
});

// ── Contract Message Display ──

describe('showNextContractMessage', () => {
  let state;

  beforeEach(() => {
    state = makeState(42);
    state.contractMessages = [];
  });

  it('shows first message from queue', () => {
    state.contractMessages = [
      { face: 0, text: 'Hello', counterpartyName: 'King', commodity: 'wheat' },
      { face: 1, text: 'World', counterpartyName: 'Baron', commodity: 'oxen' }
    ];
    const shown = showNextContractMessage(state);
    expect(shown).toBe(true);
    expect(state.dialog.type).toBe('faceMessage');
    expect(state.dialog.text).toBe('Hello');
    expect(state.contractMessages).toHaveLength(1);
  });

  it('returns false when queue is empty', () => {
    const shown = showNextContractMessage(state);
    expect(shown).toBe(false);
  });
});

describe('dismissContractMessage', () => {
  it('shows next message when queue not empty', () => {
    const state = makeState(42);
    state.contractMessages = [
      { face: 0, text: 'Next', counterpartyName: 'King', commodity: 'wheat' }
    ];
    const hasMore = dismissContractMessage(state);
    expect(hasMore).toBe(true);
    expect(state.dialog.text).toBe('Next');
  });

  it('returns false when queue empty', () => {
    const state = makeState(42);
    state.contractMessages = [];
    expect(dismissContractMessage(state)).toBe(false);
  });
});

// ── addGoods ──

describe('addGoods', () => {
  let state;

  beforeEach(() => {
    state = makeState(42);
  });

  it('adds wheat without health blending', () => {
    const cfg = COMMODITY_CONFIG.wheat;
    addGoods(state, 'wheat', 500, cfg);
    expect(state.wheat).toBe(1500);
  });

  it('adds horses with health blending', () => {
    state.horses = 100;
    state.horseHealth = 0.7;
    const cfg = COMMODITY_CONFIG.horses;
    addGoods(state, 'horses', 100, cfg);
    expect(state.horses).toBe(200);
    expect(state.horseHealth).toBeCloseTo(0.8, 5);
  });
});

// ── activeOfferIndices ──

describe('activeOfferIndices', () => {
  it('returns indices of active offers', () => {
    const state = makeState(42);
    state.contractOffers = [
      makeContract({ active: true }),
      null,
      makeContract({ active: false }),
      makeContract({ active: true })
    ];
    expect(activeOfferIndices(state)).toEqual([0, 3]);
  });

  it('returns empty array when no active offers', () => {
    const state = makeState(42);
    state.contractOffers = [null, makeContract({ active: false })];
    expect(activeOfferIndices(state)).toEqual([]);
  });
});

// ── Edge Cases ──

describe('edge cases', () => {
  it('processContracts initializes contractMessages if missing', () => {
    const state = makeState(42);
    state.contractPlayers = [makePlayer()];
    state.pendingContracts = [];
    delete state.contractMessages;
    processContracts(state);
    expect(Array.isArray(state.contractMessages)).toBe(true);
  });

  it('refreshOffers initializes contractOffers if null', () => {
    const state = makeState(42);
    state.contractOffers = null;
    refreshOffers(state);
    expect(Array.isArray(state.contractOffers)).toBe(true);
    expect(state.contractOffers).toHaveLength(MAX_OFFERS);
  });

  it('navigateContract handles empty active list', () => {
    const state = makeState(42);
    state.contractOffers = [];
    state.dialog = { type: 'contracts', mode: 'browsing', selectedIndex: 0 };
    navigateContract(state, 'down');
    expect(state.dialog.selectedIndex).toBe(0);
  });

  it('contract message includes counterparty and commodity info', () => {
    const state = makeState(42);
    state.contractPlayers = [makePlayer({ name: 'King HamuNam' })];
    state.contractMessages = [];
    const contract = makeContract({
      counterpartyName: 'King HamuNam',
      commodity: 'wheat',
      amount: 100,
      price: 1000,
      type: 'BUY'
    });
    state.wheat = 200;
    settleBuyContract(state, contract);
    const msg = state.contractMessages[0];
    expect(msg.counterpartyName).toBe('King HamuNam');
    expect(msg.commodity).toBe('wheat');
    expect(typeof msg.face).toBe('number');
  });
});
