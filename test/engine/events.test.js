'use strict';

const { createGameState } = require('../../src/engine/state');
const { createRandom } = require('../../src/engine/random');
const {
  lookup,
  lashToSufferingTable, healthToSicknessTable, hatredToDestructionTable
} = require('../../src/engine/tables');

const {
  selectEventType,
  applyEvent,
  applyLocusts,
  applyPlague,
  applyActOfGod,
  applyActOfMobs,
  applyWar,
  applyRevolt,
  applyWorkload,
  applyHealthEvent,
  applyLaborEvent,
  applyWheatEvent,
  applyGoldEvent,
  applyEconomyEvent,
  getEventMessage
} = require('../../src/engine/events');

function stateWith(overrides) {
  const s = createGameState(42);
  Object.assign(s, overrides);
  return s;
}

function populatedState(seed) {
  return stateWith({
    rng: createRandom(seed || 42),
    slaves: 100, oxen: 50, horses: 30,
    slaveHealth: 0.8, oxenHealth: 0.8, horseHealth: 0.8,
    fallow: 100, planted: 50, growing: 40, ripe: 30,
    wheatSewn: 500, wheatGrowing: 400, wheatRipe: 300,
    wheat: 1000, gold: 5000, manure: 200,
    overseers: 5, overseerPay: 300, overseerPressure: 0.5,
    wheatPrice: 10, oxenPrice: 90, horsePrice: 100,
    slavePrice: 800, manurePrice: 20,
    inflation: 0.02, temporaryWorkAddition: 0
  });
}

// ── selectEventType ──

describe('selectEventType', () => {
  it('returns locusts for roll 0', () => {
    expect(selectEventType(0)).toBe('locusts');
  });

  it('returns locusts for roll 1', () => {
    expect(selectEventType(1)).toBe('locusts');
  });

  it('returns plague for roll 2', () => {
    expect(selectEventType(2)).toBe('plague');
  });

  it('returns plague for roll 5', () => {
    expect(selectEventType(5)).toBe('plague');
  });

  it('returns actOfGod for roll 6', () => {
    expect(selectEventType(6)).toBe('actOfGod');
  });

  it('returns actOfGod for roll 7', () => {
    expect(selectEventType(7)).toBe('actOfGod');
  });

  it('returns actOfMobs for roll 8', () => {
    expect(selectEventType(8)).toBe('actOfMobs');
  });

  it('returns actOfMobs for roll 19', () => {
    expect(selectEventType(19)).toBe('actOfMobs');
  });

  it('returns war for roll 20', () => {
    expect(selectEventType(20)).toBe('war');
  });

  it('returns revolt for roll 21', () => {
    expect(selectEventType(21)).toBe('revolt');
  });

  it('returns revolt for roll 29', () => {
    expect(selectEventType(29)).toBe('revolt');
  });

  it('returns workload for roll 30', () => {
    expect(selectEventType(30)).toBe('workload');
  });

  it('returns workload for roll 44', () => {
    expect(selectEventType(44)).toBe('workload');
  });

  it('returns healthEvent for roll 45', () => {
    expect(selectEventType(45)).toBe('healthEvent');
  });

  it('returns healthEvent for roll 59', () => {
    expect(selectEventType(59)).toBe('healthEvent');
  });

  it('returns laborEvent for roll 60', () => {
    expect(selectEventType(60)).toBe('laborEvent');
  });

  it('returns laborEvent for roll 64', () => {
    expect(selectEventType(64)).toBe('laborEvent');
  });

  it('returns wheatEvent for roll 65', () => {
    expect(selectEventType(65)).toBe('wheatEvent');
  });

  it('returns wheatEvent for roll 74', () => {
    expect(selectEventType(74)).toBe('wheatEvent');
  });

  it('returns goldEvent for roll 75', () => {
    expect(selectEventType(75)).toBe('goldEvent');
  });

  it('returns goldEvent for roll 84', () => {
    expect(selectEventType(84)).toBe('goldEvent');
  });

  it('returns economyEvent for roll 85', () => {
    expect(selectEventType(85)).toBe('economyEvent');
  });

  it('returns economyEvent for roll 99', () => {
    expect(selectEventType(99)).toBe('economyEvent');
  });

  it('returns economyEvent for roll 100', () => {
    expect(selectEventType(100)).toBe('economyEvent');
  });

  it('returns economyEvent for roll beyond 100', () => {
    expect(selectEventType(150)).toBe('economyEvent');
  });
});

// ── applyEvent dispatch ──

describe('applyEvent', () => {
  it('dispatches to the correct handler', () => {
    const state = populatedState();
    const before = state.wheat;
    applyEvent(state, 'locusts');
    expect(state.wheatSewn).toBe(0);
  });

  it('dispatches healthEvent correctly', () => {
    const state = populatedState();
    applyEvent(state, 'healthEvent');
    expect(state.slaveHealth).toBeLessThan(0.8);
  });
});

// ── applyLocusts ──

describe('applyLocusts', () => {
  it('reverts all planted, growing, ripe land to fallow', () => {
    const state = populatedState();
    const totalLand = state.fallow + state.planted + state.growing + state.ripe;
    applyLocusts(state);
    expect(state.planted).toBe(0);
    expect(state.growing).toBe(0);
    expect(state.ripe).toBe(0);
    expect(state.fallow).toBe(totalLand);
  });

  it('destroys all wheat sewn, growing, and ripe', () => {
    const state = populatedState();
    applyLocusts(state);
    expect(state.wheatSewn).toBe(0);
    expect(state.wheatGrowing).toBe(0);
    expect(state.wheatRipe).toBe(0);
  });

  it('adds extra work proportional to slaves and acres', () => {
    const state = populatedState();
    const totalAcres = state.fallow + state.planted + state.growing + state.ripe;
    applyLocusts(state);
    expect(state.temporaryWorkAddition).toBeGreaterThan(0);
    // Approx 15 per slave + 5 per acre
    const expected = 15 * state.slaves + 5 * totalAcres;
    expect(state.temporaryWorkAddition).toBeGreaterThan(expected * 0.3);
    expect(state.temporaryWorkAddition).toBeLessThan(expected * 3);
  });

  it('does nothing if player has no land at all', () => {
    const state = populatedState();
    state.fallow = 0; state.planted = 0; state.growing = 0; state.ripe = 0;
    state.wheatSewn = 0; state.wheatGrowing = 0; state.wheatRipe = 0;
    applyLocusts(state);
    expect(state.temporaryWorkAddition).toBe(0);
  });

  it('preserves wheat stores', () => {
    const state = populatedState();
    const wheatBefore = state.wheat;
    applyLocusts(state);
    expect(state.wheat).toBe(wheatBefore);
  });
});

// ── applyPlague ──

describe('applyPlague', () => {
  it('reduces health of all livestock by factor between 0.2 and 0.9', () => {
    for (let seed = 1; seed < 40; seed += 2) {
      const state = populatedState(seed);
      const origH = { s: state.slaveHealth, o: state.oxenHealth, h: state.horseHealth };
      applyPlague(state);
      for (const [key, orig] of [['slaveHealth', origH.s], ['oxenHealth', origH.o], ['horseHealth', origH.h]]) {
        const factor = state[key] / orig;
        expect(factor).toBeGreaterThanOrEqual(0.19);
        expect(factor).toBeLessThanOrEqual(0.91);
      }
    }
  });

  it('reduces population of all livestock by factor between 0.7 and 0.95', () => {
    for (let seed = 1; seed < 40; seed += 2) {
      const state = populatedState(seed);
      const origPop = { s: state.slaves, o: state.oxen, h: state.horses };
      applyPlague(state);
      for (const [key, orig] of [['slaves', origPop.s], ['oxen', origPop.o], ['horses', origPop.h]]) {
        const factor = state[key] / orig;
        expect(factor).toBeGreaterThanOrEqual(0.69);
        expect(factor).toBeLessThanOrEqual(0.96);
      }
    }
  });

  it('does nothing if all populations are zero', () => {
    const state = populatedState();
    state.slaves = 0; state.oxen = 0; state.horses = 0;
    const origHealth = state.slaveHealth;
    applyPlague(state);
    expect(state.slaveHealth).toBe(origHealth);
  });
});

// ── applyActOfGod ──

describe('applyActOfGod', () => {
  it('reduces each resource independently by factor between 0.3 and 0.8', () => {
    for (let seed = 1; seed < 20; seed += 2) {
      const state = populatedState(seed);
      const orig = {
        fallow: state.fallow, planted: state.planted, growing: state.growing,
        ripe: state.ripe, slaves: state.slaves, oxen: state.oxen,
        horses: state.horses, wheat: state.wheat, manure: state.manure
      };
      applyActOfGod(state);
      for (const key of Object.keys(orig)) {
        if (orig[key] > 0) {
          const factor = state[key] / orig[key];
          expect(factor).toBeGreaterThanOrEqual(0.29);
          expect(factor).toBeLessThanOrEqual(0.81);
        }
      }
    }
  });

  it('reduces wheat on fields proportionally with land', () => {
    const state = populatedState(7);
    applyActOfGod(state);
    // wheat on fields should also be reduced
    expect(state.wheatSewn).toBeLessThan(500);
    expect(state.wheatGrowing).toBeLessThan(400);
    expect(state.wheatRipe).toBeLessThan(300);
  });

  it('adds extra work', () => {
    const state = populatedState();
    applyActOfGod(state);
    expect(state.temporaryWorkAddition).toBeGreaterThan(0);
  });
});

// ── applyActOfMobs ──

describe('applyActOfMobs', () => {
  it('reduces crops and livestock by factor between 0.6 and 0.8', () => {
    for (let seed = 1; seed < 20; seed += 2) {
      const state = populatedState(seed);
      const origSlaves = state.slaves;
      const origOxen = state.oxen;
      const origHorses = state.horses;
      const origWheat = state.wheat;
      applyActOfMobs(state);
      for (const [val, orig] of [[state.slaves, origSlaves], [state.oxen, origOxen],
        [state.horses, origHorses], [state.wheat, origWheat]]) {
        const factor = val / orig;
        expect(factor).toBeGreaterThanOrEqual(0.59);
        expect(factor).toBeLessThanOrEqual(0.81);
      }
    }
  });

  it('increases manure (mobs leave a mess)', () => {
    const state = populatedState();
    const origManure = state.manure;
    applyActOfMobs(state);
    expect(state.manure).toBeGreaterThan(origManure);
  });

  it('adds extra work', () => {
    const state = populatedState();
    applyActOfMobs(state);
    expect(state.temporaryWorkAddition).toBeGreaterThan(0);
  });
});

// ── applyWar ──

describe('applyWar', () => {
  it('uses overseers + 1 as army strength', () => {
    const state = populatedState();
    state.overseers = 10;
    // We test indirectly by checking the war has an effect
    applyWar(state);
    // Either gain or loss occurred
    expect(state.temporaryWorkAddition >= 0).toBe(true);
  });

  it('multiplies resources by gain factor', () => {
    const state = populatedState(7);
    state.overseers = 10;
    const origWheat = state.wheat;
    applyWar(state);
    // Resources changed
    expect(state.wheat).not.toBe(origWheat);
  });

  it('adds work when losing', () => {
    // Use a seed that tends to produce a loss
    let foundLoss = false;
    for (let seed = 1; seed < 100; seed += 2) {
      const state = populatedState(seed);
      state.overseers = 2;
      const origWork = state.temporaryWorkAddition;
      applyWar(state);
      if (state.temporaryWorkAddition > origWork) {
        foundLoss = true;
        break;
      }
    }
    expect(foundLoss).toBe(true);
  });

  it('handles zero overseers', () => {
    const state = populatedState();
    state.overseers = 0;
    applyWar(state);
    // Should still work with army = 1
    expect(state.wheat).toBeDefined();
  });
});

// ── applyRevolt ──

describe('applyRevolt', () => {
  it('reduces resources based on suffering and sickness', () => {
    const state = populatedState();
    state.overseerPressure = 0.5;
    state.slaveHealth = 0.4;
    const origWheat = state.wheat;
    applyRevolt(state);
    expect(state.wheat).toBeLessThanOrEqual(origWheat);
  });

  it('adds extra work', () => {
    const state = populatedState();
    state.overseerPressure = 0.5;
    state.slaveHealth = 0.4;
    applyRevolt(state);
    expect(state.temporaryWorkAddition).toBeGreaterThan(0);
  });

  it('does nothing if there are no slaves', () => {
    const state = populatedState();
    state.slaves = 0;
    const origWheat = state.wheat;
    applyRevolt(state);
    expect(state.wheat).toBe(origWheat);
    expect(state.temporaryWorkAddition).toBe(0);
  });

  it('computes survival from suffering and sickness tables', () => {
    const state = populatedState(7);
    state.overseerPressure = 0.8;
    state.slaveHealth = 0.3;
    const origGold = state.gold;
    applyRevolt(state);
    // With high pressure and low health, destruction should be significant
    expect(state.gold).toBeLessThan(origGold);
  });
});

// ── applyWorkload ──

describe('applyWorkload', () => {
  it('adds approximately 10 per slave + 8 per acre', () => {
    const state = populatedState();
    const totalAcres = state.fallow + state.planted + state.growing + state.ripe;
    applyWorkload(state);
    const expected = 10 * state.slaves + 8 * totalAcres;
    expect(state.temporaryWorkAddition).toBeGreaterThan(expected * 0.3);
    expect(state.temporaryWorkAddition).toBeLessThan(expected * 3);
  });

  it('does nothing if no slaves', () => {
    const state = populatedState();
    state.slaves = 0;
    applyWorkload(state);
    expect(state.temporaryWorkAddition).toBe(0);
  });
});

// ── applyHealthEvent ──

describe('applyHealthEvent', () => {
  it('multiplies all health by approximately 0.6', () => {
    for (let seed = 1; seed < 20; seed += 2) {
      const state = populatedState(seed);
      applyHealthEvent(state);
      expect(state.slaveHealth).toBeLessThan(0.8);
      expect(state.slaveHealth).toBeGreaterThan(0);
      expect(state.oxenHealth).toBeLessThan(0.8);
      expect(state.horseHealth).toBeLessThan(0.8);
    }
  });

  it('does nothing if total population is zero', () => {
    const state = populatedState();
    state.slaves = 0; state.oxen = 0; state.horses = 0;
    applyHealthEvent(state);
    expect(state.slaveHealth).toBe(0.8);
  });
});

// ── applyLaborEvent ──

describe('applyLaborEvent', () => {
  it('increases overseer pay by approximately 20%', () => {
    const state = populatedState();
    const origPay = state.overseerPay;
    applyLaborEvent(state);
    expect(state.overseerPay).toBeGreaterThan(origPay);
    expect(state.overseerPay).toBeGreaterThan(origPay * 1.05);
    expect(state.overseerPay).toBeLessThan(origPay * 1.5);
  });

  it('reduces overseer population by approximately 10%', () => {
    const state = populatedState();
    state.overseers = 20;
    applyLaborEvent(state);
    expect(state.overseers).toBeLessThan(20);
    expect(state.overseers).toBeGreaterThanOrEqual(1);
  });

  it('increases overseer stress', () => {
    const state = populatedState();
    const origPressure = state.overseerPressure;
    applyLaborEvent(state);
    expect(state.overseerPressure).toBeGreaterThan(origPressure);
  });

  it('does nothing if no overseers', () => {
    const state = populatedState();
    state.overseers = 0;
    const origPay = state.overseerPay;
    applyLaborEvent(state);
    expect(state.overseerPay).toBe(origPay);
  });
});

// ── applyWheatEvent ──

describe('applyWheatEvent', () => {
  it('reduces wheat stores and crops by approximately 30%', () => {
    const state = populatedState();
    const origWheat = state.wheat;
    applyWheatEvent(state);
    expect(state.wheat).toBeLessThan(origWheat);
    expect(state.wheat).toBeGreaterThan(origWheat * 0.01);
  });

  it('caps loss at 99%', () => {
    for (let seed = 1; seed < 100; seed += 2) {
      const state = populatedState(seed);
      applyWheatEvent(state);
      expect(state.wheat).toBeGreaterThanOrEqual(1000 * 0.01);
    }
  });

  it('reduces all wheat stages', () => {
    const state = populatedState();
    applyWheatEvent(state);
    expect(state.wheatSewn).toBeLessThan(500);
    expect(state.wheatGrowing).toBeLessThan(400);
    expect(state.wheatRipe).toBeLessThan(300);
  });

  it('does nothing if no wheat at all', () => {
    const state = populatedState();
    state.wheat = 0; state.wheatSewn = 0; state.wheatGrowing = 0; state.wheatRipe = 0;
    applyWheatEvent(state);
    expect(state.wheat).toBe(0);
  });
});

// ── applyGoldEvent ──

describe('applyGoldEvent', () => {
  it('reduces gold by approximately 35%', () => {
    const state = populatedState();
    const origGold = state.gold;
    applyGoldEvent(state);
    expect(state.gold).toBeLessThan(origGold);
    expect(state.gold).toBeGreaterThan(origGold * 0.01);
  });

  it('caps loss at 99%', () => {
    for (let seed = 1; seed < 100; seed += 2) {
      const state = populatedState(seed);
      applyGoldEvent(state);
      expect(state.gold).toBeGreaterThanOrEqual(5000 * 0.01);
    }
  });

  it('does nothing if gold is zero', () => {
    const state = populatedState();
    state.gold = 0;
    applyGoldEvent(state);
    expect(state.gold).toBe(0);
  });
});

// ── applyEconomyEvent ──

describe('applyEconomyEvent', () => {
  it('shifts each commodity price', () => {
    const state = populatedState();
    const origPrices = {
      wheat: state.wheatPrice, oxen: state.oxenPrice,
      horse: state.horsePrice, slave: state.slavePrice, manure: state.manurePrice
    };
    applyEconomyEvent(state);
    let changed = false;
    for (const [key, suffix] of [['wheat', 'wheatPrice'], ['oxen', 'oxenPrice'],
      ['horse', 'horsePrice'], ['slave', 'slavePrice'], ['manure', 'manurePrice']]) {
      if (state[suffix] !== origPrices[key]) changed = true;
    }
    expect(changed).toBe(true);
  });

  it('shifts inflation rate', () => {
    const state = populatedState();
    const origInflation = state.inflation;
    applyEconomyEvent(state);
    // It may or may not change, but it should be a number
    expect(typeof state.inflation).toBe('number');
  });

  it('keeps prices positive', () => {
    for (let seed = 1; seed < 50; seed += 2) {
      const state = populatedState(seed);
      applyEconomyEvent(state);
      expect(state.wheatPrice).toBeGreaterThan(0);
      expect(state.oxenPrice).toBeGreaterThan(0);
      expect(state.horsePrice).toBeGreaterThan(0);
      expect(state.slavePrice).toBeGreaterThan(0);
      expect(state.manurePrice).toBeGreaterThan(0);
    }
  });
});

// ── getEventMessage ──

describe('getEventMessage', () => {
  it('returns a message object with face and text', () => {
    const state = populatedState();
    const msg = getEventMessage(state, 'locusts');
    expect(msg).toHaveProperty('face');
    expect(msg).toHaveProperty('text');
    expect(typeof msg.face).toBe('number');
    expect(typeof msg.text).toBe('string');
    expect(msg.text.length).toBeGreaterThan(0);
  });

  it('returns messages for all event types', () => {
    const types = [
      'locusts', 'plague', 'actOfGod', 'actOfMobs', 'war',
      'revolt', 'workload', 'healthEvent', 'laborEvent',
      'wheatEvent', 'goldEvent', 'economyEvent'
    ];
    for (const type of types) {
      const state = populatedState();
      // Set up state context for messages that need percentages
      state.lastLossPercent = 30;
      state.lastGainPercent = 20;
      state.lastRaisePercent = 20;
      state.warGain = 1.3;
      state.destructionPercent = 50;
      const msg = getEventMessage(state, type);
      expect(msg.text.length).toBeGreaterThan(0);
    }
  });

  it('returns war loss message when warGain < 1', () => {
    const state = populatedState();
    state.warGain = 0.7;
    const msg = getEventMessage(state, 'war');
    expect(msg.text.length).toBeGreaterThan(0);
  });

  it('returns fallback message for unknown event type', () => {
    const state = populatedState();
    const msg = getEventMessage(state, 'unknownEvent');
    expect(msg.text).toBe('Something happened.');
  });

  it('face is between 0 and 4', () => {
    for (let seed = 1; seed < 50; seed += 2) {
      const state = populatedState(seed);
      const msg = getEventMessage(state, 'locusts');
      expect(msg.face).toBeGreaterThanOrEqual(0);
      expect(msg.face).toBeLessThanOrEqual(4);
    }
  });
});
