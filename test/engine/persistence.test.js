'use strict';

const { createGameState } = require('../../src/engine/state');
const { createRandom } = require('../../src/engine/random');
const { setDifficulty } = require('../../src/engine/difficulty');
const {
  serializeState,
  deserializeState,
  saveGame,
  loadGame,
  resetGame
} = require('../../src/engine/persistence');

function makePlayedState(seed) {
  const state = createGameState(seed || 42);
  setDifficulty(state, 'easy');
  state.gold = 25000;
  state.wheat = 5000;
  state.slaves = 200;
  state.oxen = 50;
  state.horses = 30;
  state.manure = 100;
  state.fallow = 200;
  state.planted = 100;
  state.growing = 50;
  state.ripe = 50;
  state.wheatSewn = 300;
  state.wheatGrowing = 400;
  state.wheatRipe = 200;
  state.slaveHealth = 0.75;
  state.oxenHealth = 0.8;
  state.horseHealth = 0.6;
  state.slaveFeedRate = 9.5;
  state.oxenFeedRate = 60;
  state.horseFeedRate = 50;
  state.plantingQuota = 200;
  state.manureSpreadQuota = 500;
  state.stoneQuota = 100;
  state.pyramidStones = 5000;
  state.pyramidHeight = 50;
  state.loan = 10000;
  state.interestRate = 7;
  state.interestAddition = 50;
  state.creditRating = 0.9;
  state.creditLimit = 50000;
  state.creditLowerBound = 5000;
  state.inflation = 0.03;
  state.worldGrowth = 0.02;
  state.wheatPrice = 12;
  state.landPrice = 5500;
  state.slavePrice = 900;
  state.horsePrice = 120;
  state.oxenPrice = 100;
  state.manurePrice = 25;
  state.supply = { wheat: 110, land: 95, slave: 105, horse: 90, oxen: 100, manure: 80 };
  state.demand = { wheat: 120, land: 100, slave: 95, horse: 110, oxen: 105, manure: 90 };
  state.production = { wheat: 105, land: 98, slave: 100, horse: 88, oxen: 95, manure: 85 };
  state.month = 7;
  state.year = 12;
  state.overseers = 8;
  state.overseerPay = 400;
  state.overseerPressure = 0.4;
  state.contractPlayers = [
    { name: 'King HamuNam', payProbability: 0.9, shipProbability: 0.85, defaultProbability: 0.99 }
  ];
  state.contractOffers = [
    { type: 'BUY', commodity: 'wheat', amount: 500, price: 5000, duration: 20, counterpartyName: 'King HamuNam', counterpartyIndex: 0, active: true }
  ];
  state.pendingContracts = [
    { type: 'SELL', commodity: 'oxen', amount: 100, price: 10000, duration: 6, counterpartyName: 'King HamuNam', counterpartyIndex: 0, active: true },
    { type: 'BUY', commodity: 'horses', amount: 50, price: 6000, duration: 12, counterpartyName: 'King HamuNam', counterpartyIndex: 0, active: true },
    { type: 'SELL', commodity: 'wheat', amount: 300, price: 3000, duration: 8, counterpartyName: 'King HamuNam', counterpartyIndex: 0, active: true }
  ];
  state.neighbors = { goodGuy: 1, badGuy: 2, villageIdiot: 3, banker: 0 };
  state.prev = { gold: 24000 };
  state.temporaryWorkAddition = 5;
  state.slaveEfficiency = 0.95;
  state.motivation = 0.8;
  state.oxenEfficiency = 0.9;
  state.manurePerAcre = 0.5;
  state.wtRotRt = 0.04;
  state.gameOver = false;
  state.gameWon = false;
  state.licensed = true;
  state.canSave = true;
  return state;
}

// ── serializeState ──

describe('serializeState', () => {
  test('returns a JSON string', () => {
    const state = makePlayedState();
    const json = serializeState(state);
    expect(typeof json).toBe('string');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  test('preserves resource fields', () => {
    const state = makePlayedState();
    const data = JSON.parse(serializeState(state));
    expect(data.gold).toBe(25000);
    expect(data.wheat).toBe(5000);
    expect(data.slaves).toBe(200);
    expect(data.oxen).toBe(50);
    expect(data.horses).toBe(30);
    expect(data.manure).toBe(100);
  });

  test('preserves land fields', () => {
    const state = makePlayedState();
    const data = JSON.parse(serializeState(state));
    expect(data.fallow).toBe(200);
    expect(data.planted).toBe(100);
    expect(data.growing).toBe(50);
    expect(data.ripe).toBe(50);
  });

  test('preserves wheat on land fields', () => {
    const state = makePlayedState();
    const data = JSON.parse(serializeState(state));
    expect(data.wheatSewn).toBe(300);
    expect(data.wheatGrowing).toBe(400);
    expect(data.wheatRipe).toBe(200);
  });

  test('preserves health fields', () => {
    const state = makePlayedState();
    const data = JSON.parse(serializeState(state));
    expect(data.slaveHealth).toBe(0.75);
    expect(data.oxenHealth).toBe(0.8);
    expect(data.horseHealth).toBe(0.6);
  });

  test('preserves feed rate fields', () => {
    const state = makePlayedState();
    const data = JSON.parse(serializeState(state));
    expect(data.slaveFeedRate).toBe(9.5);
    expect(data.oxenFeedRate).toBe(60);
    expect(data.horseFeedRate).toBe(50);
  });

  test('preserves quota fields', () => {
    const state = makePlayedState();
    const data = JSON.parse(serializeState(state));
    expect(data.plantingQuota).toBe(200);
    expect(data.manureSpreadQuota).toBe(500);
    expect(data.stoneQuota).toBe(100);
  });

  test('preserves pyramid fields', () => {
    const state = makePlayedState();
    const data = JSON.parse(serializeState(state));
    expect(data.pyramidStones).toBe(5000);
    expect(data.pyramidBase).toBe(state.pyramidBase);
    expect(data.pyramidHeight).toBe(50);
  });

  test('preserves financial fields', () => {
    const state = makePlayedState();
    const data = JSON.parse(serializeState(state));
    expect(data.loan).toBe(10000);
    expect(data.interestRate).toBe(7);
    expect(data.interestAddition).toBe(50);
    expect(data.creditRating).toBe(0.9);
    expect(data.creditLimit).toBe(50000);
    expect(data.creditLowerBound).toBe(5000);
  });

  test('preserves market fields', () => {
    const state = makePlayedState();
    const data = JSON.parse(serializeState(state));
    expect(data.inflation).toBe(0.03);
    expect(data.worldGrowth).toBe(0.02);
    expect(data.wheatPrice).toBe(12);
    expect(data.landPrice).toBe(5500);
    expect(data.slavePrice).toBe(900);
    expect(data.horsePrice).toBe(120);
    expect(data.oxenPrice).toBe(100);
    expect(data.manurePrice).toBe(25);
    expect(data.supply).toEqual({ wheat: 110, land: 95, slave: 105, horse: 90, oxen: 100, manure: 80 });
    expect(data.demand).toEqual({ wheat: 120, land: 100, slave: 95, horse: 110, oxen: 105, manure: 90 });
    expect(data.production).toEqual({ wheat: 105, land: 98, slave: 100, horse: 88, oxen: 95, manure: 85 });
  });

  test('preserves date fields', () => {
    const state = makePlayedState();
    const data = JSON.parse(serializeState(state));
    expect(data.month).toBe(7);
    expect(data.year).toBe(12);
  });

  test('preserves overseer fields', () => {
    const state = makePlayedState();
    const data = JSON.parse(serializeState(state));
    expect(data.overseers).toBe(8);
    expect(data.overseerPay).toBe(400);
    expect(data.overseerPressure).toBe(0.4);
  });

  test('preserves contract fields', () => {
    const state = makePlayedState();
    const data = JSON.parse(serializeState(state));
    expect(data.contractOffers).toHaveLength(1);
    expect(data.pendingContracts).toHaveLength(3);
    expect(data.contractPlayers).toHaveLength(1);
  });

  test('preserves neighbor fields', () => {
    const state = makePlayedState();
    const data = JSON.parse(serializeState(state));
    expect(data.neighbors).toEqual({ goodGuy: 1, badGuy: 2, villageIdiot: 3, banker: 0 });
  });

  test('preserves miscellaneous fields', () => {
    const state = makePlayedState();
    const data = JSON.parse(serializeState(state));
    expect(data.prev).toEqual({ gold: 24000 });
    expect(data.temporaryWorkAddition).toBe(5);
    expect(data.slaveEfficiency).toBe(0.95);
    expect(data.motivation).toBe(0.8);
    expect(data.oxenEfficiency).toBe(0.9);
    expect(data.manurePerAcre).toBe(0.5);
    expect(data.wtRotRt).toBe(0.04);
    expect(data.gameOver).toBe(false);
    expect(data.gameWon).toBe(false);
    expect(data.licensed).toBe(true);
    expect(data.canSave).toBe(true);
  });

  test('saves rng state as a number', () => {
    const state = makePlayedState();
    const data = JSON.parse(serializeState(state));
    expect(typeof data.rngState).toBe('number');
    expect(data.rngState).toBe(state.rng.state);
  });

  test('excludes transient UI state', () => {
    const state = makePlayedState();
    state.dialog = { type: 'contracts', mode: 'browsing' };
    state.screen = 'game';
    state.message = { face: 0, text: 'Hello' };
    const data = JSON.parse(serializeState(state));
    expect(data.dialog).toBeUndefined();
    expect(data.screen).toBeUndefined();
    expect(data.message).toBeUndefined();
  });

  test('excludes rng object', () => {
    const state = makePlayedState();
    const data = JSON.parse(serializeState(state));
    expect(data.rng).toBeUndefined();
  });
});

// ── deserializeState ──

describe('deserializeState', () => {
  test('returns a state object from JSON', () => {
    const state = makePlayedState();
    const json = serializeState(state);
    const restored = deserializeState(json);
    expect(typeof restored).toBe('object');
  });

  test('restores all resource fields', () => {
    const state = makePlayedState();
    const restored = deserializeState(serializeState(state));
    expect(restored.gold).toBe(25000);
    expect(restored.wheat).toBe(5000);
    expect(restored.slaves).toBe(200);
    expect(restored.oxen).toBe(50);
    expect(restored.horses).toBe(30);
    expect(restored.manure).toBe(100);
  });

  test('restores all land fields', () => {
    const state = makePlayedState();
    const restored = deserializeState(serializeState(state));
    expect(restored.fallow).toBe(200);
    expect(restored.planted).toBe(100);
    expect(restored.growing).toBe(50);
    expect(restored.ripe).toBe(50);
  });

  test('restores rng with correct state', () => {
    const state = makePlayedState();
    const rngStateBefore = state.rng.state;
    const restored = deserializeState(serializeState(state));
    expect(restored.rng).toBeDefined();
    expect(typeof restored.rng.state).toBe('number');
    expect(restored.rng.state).toBe(rngStateBefore);
  });

  test('restores health fields', () => {
    const state = makePlayedState();
    const restored = deserializeState(serializeState(state));
    expect(restored.slaveHealth).toBe(0.75);
    expect(restored.oxenHealth).toBe(0.8);
    expect(restored.horseHealth).toBe(0.6);
  });

  test('restores financial fields', () => {
    const state = makePlayedState();
    const restored = deserializeState(serializeState(state));
    expect(restored.loan).toBe(10000);
    expect(restored.interestRate).toBe(7);
    expect(restored.creditRating).toBe(0.9);
    expect(restored.creditLimit).toBe(50000);
  });

  test('restores pyramid fields', () => {
    const state = makePlayedState();
    const restored = deserializeState(serializeState(state));
    expect(restored.pyramidStones).toBe(5000);
    expect(restored.pyramidHeight).toBe(50);
    expect(restored.stoneQuota).toBe(100);
  });

  test('restores date fields', () => {
    const state = makePlayedState();
    const restored = deserializeState(serializeState(state));
    expect(restored.month).toBe(7);
    expect(restored.year).toBe(12);
  });

  test('restores overseer fields', () => {
    const state = makePlayedState();
    const restored = deserializeState(serializeState(state));
    expect(restored.overseers).toBe(8);
    expect(restored.overseerPressure).toBe(0.4);
  });

  test('restores pending contracts', () => {
    const state = makePlayedState();
    const restored = deserializeState(serializeState(state));
    expect(restored.pendingContracts).toHaveLength(3);
    expect(restored.pendingContracts[0].type).toBe('SELL');
    expect(restored.pendingContracts[0].commodity).toBe('oxen');
    expect(restored.pendingContracts[0].amount).toBe(100);
  });

  test('restores market prices', () => {
    const state = makePlayedState();
    const restored = deserializeState(serializeState(state));
    expect(restored.wheatPrice).toBe(12);
    expect(restored.landPrice).toBe(5500);
    expect(restored.slavePrice).toBe(900);
    expect(restored.horsePrice).toBe(120);
    expect(restored.oxenPrice).toBe(100);
    expect(restored.manurePrice).toBe(25);
  });

  test('restores feed rates and quotas', () => {
    const state = makePlayedState();
    const restored = deserializeState(serializeState(state));
    expect(restored.slaveFeedRate).toBe(9.5);
    expect(restored.oxenFeedRate).toBe(60);
    expect(restored.horseFeedRate).toBe(50);
    expect(restored.plantingQuota).toBe(200);
    expect(restored.manureSpreadQuota).toBe(500);
  });

  test('sets default UI state on restore', () => {
    const state = makePlayedState();
    const restored = deserializeState(serializeState(state));
    expect(restored.dialog).toBeNull();
    expect(restored.screen).toBe('game');
    expect(restored.message).toBeNull();
    expect(restored.statusMessage).toBe('');
  });
});

// ── saveGame ──

describe('saveGame', () => {
  test('returns serialized data', () => {
    const state = makePlayedState();
    const savedData = saveGame(state, 'test-save');
    expect(typeof savedData).toBe('string');
    const parsed = JSON.parse(savedData);
    expect(parsed.gold).toBe(25000);
  });

  test('does not modify the original state', () => {
    const state = makePlayedState();
    const goldBefore = state.gold;
    saveGame(state, 'test-save');
    expect(state.gold).toBe(goldBefore);
  });
});

// ── loadGame ──

describe('loadGame', () => {
  test('returns a restored state object', () => {
    const state = makePlayedState();
    const savedData = saveGame(state, 'test-save');
    const loaded = loadGame(savedData);
    expect(loaded.gold).toBe(25000);
    expect(loaded.wheat).toBe(5000);
  });

  test('restores rng from saved state before refreshOffers advances it', () => {
    const state = makePlayedState();
    const rngStateBefore = state.rng.state;
    const savedData = saveGame(state, 'test-save');
    // deserializeState (not loadGame) preserves the exact rng state
    const deserialized = deserializeState(savedData);
    expect(deserialized.rng.state).toBe(rngStateBefore);
  });

  test('refreshes contract offers after loading', () => {
    const state = makePlayedState();
    const savedData = saveGame(state, 'test-save');
    const loaded = loadGame(savedData);
    expect(Array.isArray(loaded.contractOffers)).toBe(true);
    expect(loaded.contractOffers.length).toBeGreaterThan(0);
  });

  test('round-trips all commodity values', () => {
    const state = makePlayedState();
    const loaded = loadGame(saveGame(state, 'save'));
    expect(loaded.gold).toBe(state.gold);
    expect(loaded.wheat).toBe(state.wheat);
    expect(loaded.slaves).toBe(state.slaves);
    expect(loaded.oxen).toBe(state.oxen);
    expect(loaded.horses).toBe(state.horses);
    expect(loaded.manure).toBe(state.manure);
  });

  test('round-trips all financial values', () => {
    const state = makePlayedState();
    const loaded = loadGame(saveGame(state, 'save'));
    expect(loaded.loan).toBe(state.loan);
    expect(loaded.interestRate).toBe(state.interestRate);
    expect(loaded.creditRating).toBe(state.creditRating);
    expect(loaded.creditLimit).toBe(state.creditLimit);
  });

  test('round-trips pyramid progress', () => {
    const state = makePlayedState();
    const loaded = loadGame(saveGame(state, 'save'));
    expect(loaded.pyramidStones).toBe(state.pyramidStones);
    expect(loaded.pyramidHeight).toBe(state.pyramidHeight);
    expect(loaded.stoneQuota).toBe(state.stoneQuota);
  });

  test('round-trips date', () => {
    const state = makePlayedState();
    const loaded = loadGame(saveGame(state, 'save'));
    expect(loaded.month).toBe(state.month);
    expect(loaded.year).toBe(state.year);
  });

  test('round-trips health values', () => {
    const state = makePlayedState();
    const loaded = loadGame(saveGame(state, 'save'));
    expect(loaded.slaveHealth).toBe(state.slaveHealth);
    expect(loaded.oxenHealth).toBe(state.oxenHealth);
    expect(loaded.horseHealth).toBe(state.horseHealth);
  });

  test('round-trips pending contracts', () => {
    const state = makePlayedState();
    const loaded = loadGame(saveGame(state, 'save'));
    expect(loaded.pendingContracts).toHaveLength(3);
    expect(loaded.pendingContracts[0].type).toBe('SELL');
    expect(loaded.pendingContracts[1].type).toBe('BUY');
    expect(loaded.pendingContracts[2].type).toBe('SELL');
  });
});

// ── resetGame ──

describe('resetGame', () => {
  test('returns a fresh state', () => {
    const fresh = resetGame(42);
    expect(fresh.gold).toBe(0);
    expect(fresh.wheat).toBe(0);
    expect(fresh.slaves).toBe(0);
    expect(fresh.oxen).toBe(0);
    expect(fresh.horses).toBe(0);
    expect(fresh.manure).toBe(0);
  });

  test('resets date to month 1 year 1', () => {
    const fresh = resetGame(42);
    expect(fresh.month).toBe(1);
    expect(fresh.year).toBe(1);
  });

  test('resets pyramid to empty', () => {
    const fresh = resetGame(42);
    expect(fresh.pyramidStones).toBe(0);
    expect(fresh.pyramidHeight).toBe(0);
  });

  test('resets loan to 0', () => {
    const fresh = resetGame(42);
    expect(fresh.loan).toBe(0);
  });

  test('creates a new rng', () => {
    const fresh = resetGame(42);
    expect(fresh.rng).toBeDefined();
    expect(typeof fresh.rng.state).toBe('number');
  });

  test('different seeds produce different rng states', () => {
    const a = resetGame(42);
    const b = resetGame(99);
    expect(a.rng.state).not.toBe(b.rng.state);
  });
});

// ── Prompt flags ──

describe('save prompt flag', () => {
  test('saveGame sets no savePrompt flag', () => {
    const state = makePlayedState();
    saveGame(state, 'test');
    expect(state.savePrompt).toBeUndefined();
  });
});
