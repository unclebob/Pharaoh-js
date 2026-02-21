'use strict';

const { createGameState } = require('../../src/engine/state');
const { createRandom } = require('../../src/engine/random');
// dunningIntervalTable not used directly; neighbors.js uses exponential formula
const {
  initializeNeighbors,
  chooseChat,
  selectAdviceTopic,
  evaluateCondition,
  getVoiceSettings,
  idleInterval,
  chatInterval,
  dunningInterval,
  initVisitTimers,
  checkVisits,
  resetTimers,
  dismissFaceMessage,
  adviceTopics
} = require('../../src/engine/neighbors');

describe('neighbors', () => {
  let state;

  beforeEach(() => {
    state = createGameState(42);
    state.slaves = 100;
    state.oxen = 50;
    state.horses = 30;
    state.overseers = 5;
    state.planted = 100;
  });

  // ── Personality Assignment ──

  describe('initializeNeighbors', () => {
    it('assigns four distinct faces to four personalities', () => {
      const rng = createRandom(42);
      const n = initializeNeighbors(rng);
      const faces = [n.goodGuy, n.badGuy, n.villageIdiot, n.banker];
      expect(new Set(faces).size).toBe(4);
      faces.forEach(f => expect(f).toBeGreaterThanOrEqual(0));
      faces.forEach(f => expect(f).toBeLessThanOrEqual(3));
    });

    it('produces different assignments with different seeds', () => {
      const results = [];
      for (let seed = 1; seed < 20; seed++) {
        const rng = createRandom(seed);
        results.push(initializeNeighbors(rng));
      }
      const unique = new Set(results.map(r => JSON.stringify(r)));
      expect(unique.size).toBeGreaterThan(1);
    });
  });

  // ── Advice Topic Selection ──

  describe('selectAdviceTopic', () => {
    it('returns a topic when resources exist', () => {
      const rng = createRandom(42);
      const topic = selectAdviceTopic(state, rng);
      expect(topic).not.toBeNull();
    });

    it('returns null when selected resource is zero', () => {
      state.oxen = 0;
      state.horses = 0;
      state.slaves = 0;
      state.overseers = 0;
      state.planted = 0;
      let nullCount = 0;
      for (let i = 0; i < 100; i++) {
        const rng = createRandom(i * 2 + 1);
        if (selectAdviceTopic(state, rng) === null) nullCount++;
      }
      expect(nullCount).toBeGreaterThan(0);
    });
  });

  // ── Condition Evaluation ──

  describe('evaluateCondition', () => {
    it('returns bad for oxen feeding when feed rate < 50', () => {
      state.oxenFeedRate = 30;
      const topic = adviceTopics.find(t => t.name === 'oxen-feeding');
      expect(evaluateCondition(state, topic)).toBe('bad');
    });

    it('returns good for oxen feeding when feed rate > 80', () => {
      state.oxenFeedRate = 90;
      const topic = adviceTopics.find(t => t.name === 'oxen-feeding');
      expect(evaluateCondition(state, topic)).toBe('good');
    });

    it('returns bad for slave health when < 0.6', () => {
      state.slaveHealth = 0.4;
      const topic = adviceTopics.find(t => t.name === 'slave-health');
      expect(evaluateCondition(state, topic)).toBe('bad');
    });

    it('returns good for slave health when > 0.9', () => {
      state.slaveHealth = 0.95;
      const topic = adviceTopics.find(t => t.name === 'slave-health');
      expect(evaluateCondition(state, topic)).toBe('good');
    });

    it('returns bad for credit when < 0.4', () => {
      state.creditRating = 0.2;
      const topic = adviceTopics.find(t => t.name === 'credit');
      expect(evaluateCondition(state, topic)).toBe('bad');
    });

    it('returns good for credit when > 0.8', () => {
      state.creditRating = 0.9;
      const topic = adviceTopics.find(t => t.name === 'credit');
      expect(evaluateCondition(state, topic)).toBe('good');
    });
  });

  // ── chooseChat ──

  describe('chooseChat', () => {
    beforeEach(() => {
      state.slaveHealth = 0.4;
    });

    it('good guy returns accurate advice (bad when health low)', () => {
      let badCount = 0;
      for (let i = 0; i < 1000; i++) {
        const rng = createRandom(i * 100000 + 999999);
        const result = chooseChat(state, 'goodGuy', rng);
        if (result.type === 'bad-slave-health') badCount++;
      }
      expect(badCount).toBeGreaterThan(0);
    });

    it('bad guy inverts advice (good when health low)', () => {
      let goodCount = 0;
      for (let i = 0; i < 1000; i++) {
        const rng = createRandom(i * 100000 + 999999);
        const result = chooseChat(state, 'badGuy', rng);
        if (result.type === 'good-slave-health') goodCount++;
      }
      expect(goodCount).toBeGreaterThan(0);
    });

    it('village idiot returns mixed advice', () => {
      let goodCount = 0, badCount = 0;
      for (let i = 0; i < 2000; i++) {
        const rng = createRandom(i * 100000 + 999999);
        const result = chooseChat(state, 'villageIdiot', rng);
        if (result.type === 'good-slave-health') goodCount++;
        if (result.type === 'bad-slave-health') badCount++;
      }
      expect(goodCount).toBeGreaterThan(0);
      expect(badCount).toBeGreaterThan(0);
    });

    it('banker always returns chat', () => {
      for (let i = 0; i < 100; i++) {
        const rng = createRandom(i * 2 + 1);
        const result = chooseChat(state, 'banker', rng);
        expect(result.type).toBe('chat');
      }
    });
  });

  // ── Voice Settings ──

  describe('getVoiceSettings', () => {
    it('returns correct settings for face 1', () => {
      expect(getVoiceSettings(1)).toEqual({ rate: 100, pitch: 200 });
    });

    it('returns correct settings for face 2', () => {
      expect(getVoiceSettings(2)).toEqual({ rate: 150, pitch: 66 });
    });

    it('returns correct settings for face 3', () => {
      expect(getVoiceSettings(3)).toEqual({ rate: 200, pitch: 100 });
    });

    it('returns correct settings for face 4', () => {
      expect(getVoiceSettings(4)).toEqual({ rate: 250, pitch: 150 });
    });

    it('returns default for unknown face', () => {
      expect(getVoiceSettings(99)).toEqual({ rate: 190, pitch: 310 });
    });
  });

  // ── Timer Intervals ──

  describe('idleInterval', () => {
    it('returns values between 60 and 90', () => {
      for (let i = 0; i < 100; i++) {
        const rng = createRandom(i * 2 + 1);
        const val = idleInterval(rng);
        expect(val).toBeGreaterThanOrEqual(60);
        expect(val).toBeLessThanOrEqual(90);
      }
    });
  });

  describe('chatInterval', () => {
    it('returns values between 90 and 200', () => {
      for (let i = 0; i < 100; i++) {
        const rng = createRandom(i * 2 + 1);
        const val = chatInterval(rng);
        expect(val).toBeGreaterThanOrEqual(90);
        expect(val).toBeLessThanOrEqual(200);
      }
    });
  });

  describe('dunningInterval', () => {
    it('returns ~5 seconds for credit rating 0', () => {
      expect(dunningInterval(0)).toBeCloseTo(5, 0);
    });

    it('returns ~38 seconds for credit rating 0.5', () => {
      const val = dunningInterval(0.5);
      expect(val).toBeGreaterThan(20);
      expect(val).toBeLessThan(50);
    });

    it('returns ~300 seconds for credit rating 1.0', () => {
      expect(dunningInterval(1.0)).toBeCloseTo(300, 0);
    });

    it('returns < 10 for low credit', () => {
      expect(dunningInterval(0.1)).toBeLessThan(10);
    });

    it('returns > 90 for high credit', () => {
      expect(dunningInterval(0.9)).toBeGreaterThan(90);
    });
  });

  // ── Visit Timer System ──

  describe('initVisitTimers', () => {
    it('sets all timers to future timestamps', () => {
      const rng = createRandom(42);
      const now = 1000;
      initVisitTimers(state, now, rng);
      expect(state.idleTimer).toBeGreaterThan(now);
      expect(state.chatTimer).toBeGreaterThan(now);
      expect(state.dunningTimer).toBeGreaterThan(now);
    });
  });

  describe('checkVisits', () => {
    beforeEach(() => {
      const rng = createRandom(42);
      initVisitTimers(state, 0, rng);
    });

    it('delivers idle message when idle timer expired', () => {
      const rng = createRandom(99);
      state.idleTimer = 100;
      state.chatTimer = 99999;
      state.dunningTimer = 99999;
      const result = checkVisits(state, 101, rng);
      expect(result).not.toBeNull();
      expect(result.text).toBeTruthy();
      expect(state.idleTimer).toBeGreaterThan(101);
    });

    it('delivers chat message when chat timer expired', () => {
      const rng = createRandom(99);
      state.idleTimer = 99999;
      state.chatTimer = 100;
      state.dunningTimer = 99999;
      const result = checkVisits(state, 101, rng);
      expect(result).not.toBeNull();
      expect(state.chatTimer).toBeGreaterThan(101);
    });

    it('delivers dunning message when dunning timer expired and loan exists', () => {
      const rng = createRandom(99);
      state.idleTimer = 99999;
      state.chatTimer = 99999;
      state.dunningTimer = 100;
      state.loan = 5000;
      const result = checkVisits(state, 101, rng);
      expect(result).not.toBeNull();
      expect(result.type).toBe('dunning');
      expect(state.dunningTimer).toBeGreaterThan(101);
    });

    it('returns null when dialog is open', () => {
      const rng = createRandom(99);
      state.dialog = { type: 'test' };
      state.idleTimer = 0;
      const result = checkVisits(state, 100, rng);
      expect(result).toBeNull();
    });

    it('returns null when face message showing', () => {
      const rng = createRandom(99);
      state.faceMessage = { face: 0, text: 'hello' };
      state.idleTimer = 0;
      const result = checkVisits(state, 100, rng);
      expect(result).toBeNull();
    });
  });

  describe('dismissFaceMessage', () => {
    it('clears faceMessage and resets all timers', () => {
      const rng = createRandom(42);
      initVisitTimers(state, 0, rng);
      state.faceMessage = { face: 0, text: 'test' };
      const rng2 = createRandom(99);
      dismissFaceMessage(state, 500, rng2);
      expect(state.faceMessage).toBeNull();
      expect(state.idleTimer).toBeGreaterThan(500);
      expect(state.chatTimer).toBeGreaterThan(500);
      expect(state.dunningTimer).toBeGreaterThan(500);
    });
  });
});
