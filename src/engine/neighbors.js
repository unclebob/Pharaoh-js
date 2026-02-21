'use strict';

const { uniform, randomInt, pick, nextRaw } = require('./random');
// dunningIntervalTable available but we use exponential formula for better curve
const msg = require('./messages');

// ── Advice Topics ──

const adviceTopics = [
  {
    name: 'oxen-feeding',
    resourceKey: 'oxen',
    badCond: s => s.oxenFeedRate < 50,
    goodCond: s => s.oxenFeedRate > 80,
    goodMsg: rng => msg.getOxenFeedingGoodMessage(rng),
    badMsg: rng => msg.getOxenFeedingBadMessage(rng)
  },
  {
    name: 'horse-feeding',
    resourceKey: 'horses',
    badCond: s => s.horseFeedRate < 40,
    goodCond: s => s.horseFeedRate > 65,
    goodMsg: rng => msg.getHorseFeedingGoodMessage(rng),
    badMsg: rng => msg.getHorseFeedingBadMessage(rng)
  },
  {
    name: 'slave-feeding',
    resourceKey: 'slaves',
    badCond: s => s.slaveFeedRate < 5,
    goodCond: s => s.slaveFeedRate > 8,
    goodMsg: rng => msg.getSlaveFeedingGoodMessage(rng),
    badMsg: rng => msg.getSlaveFeedingBadMessage(rng)
  },
  {
    name: 'overseers',
    resourceKey: 'slaves',
    badCond: s => slavesPerOverseer(s) > 30,
    goodCond: s => slavesPerOverseer(s) < 15,
    goodMsg: rng => msg.getOverseerGoodMessage(rng),
    badMsg: rng => msg.getOverseerBadMessage(rng)
  },
  {
    name: 'stress',
    resourceKey: 'overseers',
    badCond: s => s.overseerPressure > 0.5,
    goodCond: s => s.overseerPressure < 0.2,
    goodMsg: rng => msg.getStressGoodMessage(rng),
    badMsg: rng => msg.getStressBadMessage(rng)
  },
  {
    name: 'fertilizer',
    resourceKey: 'planted',
    badCond: s => s.manurePerAcre < 2,
    goodCond: s => s.manurePerAcre >= 3.5 && s.manurePerAcre <= 7,
    goodMsg: rng => msg.getFertilizerGoodMessage(rng),
    badMsg: rng => msg.getFertilizerBadMessage(rng)
  },
  {
    name: 'slave-health',
    resourceKey: 'slaves',
    badCond: s => s.slaveHealth < 0.6,
    goodCond: s => s.slaveHealth > 0.9,
    goodMsg: rng => msg.getSlaveHealthGoodMessage(rng),
    badMsg: rng => msg.getSlaveHealthBadMessage(rng)
  },
  {
    name: 'oxen-health',
    resourceKey: 'oxen',
    badCond: s => s.oxenHealth < 0.5,
    goodCond: s => s.oxenHealth > 0.85,
    goodMsg: rng => msg.getOxenHealthGoodMessage(rng),
    badMsg: rng => msg.getOxenHealthBadMessage(rng)
  },
  {
    name: 'horse-health',
    resourceKey: 'horses',
    badCond: s => s.horseHealth < 0.5,
    goodCond: s => s.horseHealth > 0.85,
    goodMsg: rng => msg.getHorseHealthGoodMessage(rng),
    badMsg: rng => msg.getHorseHealthBadMessage(rng)
  },
  {
    name: 'credit',
    resourceKey: null,
    badCond: s => s.creditRating < 0.4,
    goodCond: s => s.creditRating > 0.8,
    goodMsg: rng => msg.getCreditGoodMessage(rng),
    badMsg: rng => msg.getCreditBadMessage(rng)
  }
];

function slavesPerOverseer(state) {
  return state.overseers > 0 ? state.slaves / state.overseers : Infinity;
}

// ── Personality Assignment ──

function initializeNeighbors(rng) {
  const faces = [0, 1, 2, 3];
  shuffleArray(faces, rng);
  return {
    goodGuy: faces[0],
    badGuy: faces[1],
    villageIdiot: faces[2],
    banker: faces[3]
  };
}

function shuffleArray(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(rng, 0, i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

// ── Advice Evaluation ──

function selectAdviceTopic(state, rng) {
  const idx = randomInt(rng, 0, adviceTopics.length);
  const topic = adviceTopics[idx];
  if (topic.resourceKey && state[topic.resourceKey] === 0) return null;
  return topic;
}

function evaluateCondition(state, topic) {
  if (topic.badCond(state)) return 'bad';
  if (topic.goodCond(state)) return 'good';
  return 'neutral';
}

function chooseChat(state, personality, rng) {
  if (personality === 'banker') return { type: 'chat', text: msg.getGenericChatMessage(rng) };

  // 20% chance generic small talk
  if (nextRaw(rng) < 0.2) return { type: 'chat', text: msg.getGenericChatMessage(rng) };

  const topic = selectAdviceTopic(state, rng);
  if (!topic) return { type: 'chat', text: msg.getGenericChatMessage(rng) };

  const condition = evaluateCondition(state, topic);
  if (condition === 'neutral') return { type: 'chat', text: msg.getGenericChatMessage(rng) };

  let quality = determineQuality(condition, personality, rng);

  // 5% chance of flip
  if (nextRaw(rng) < 0.05) quality = quality === 'good' ? 'bad' : 'good';

  const text = quality === 'good' ? topic.goodMsg(rng) : topic.badMsg(rng);
  return { type: quality + '-' + topic.name, text };
}

function determineQuality(condition, personality, rng) {
  if (personality === 'goodGuy') return condition;
  if (personality === 'badGuy') return condition === 'good' ? 'bad' : 'good';
  // villageIdiot: random
  return nextRaw(rng) < 0.5 ? 'good' : 'bad';
}

// ── Voice Settings ──

const voiceSettings = {
  1: { rate: 100, pitch: 200 },
  2: { rate: 150, pitch: 66 },
  3: { rate: 200, pitch: 100 },
  4: { rate: 250, pitch: 150 }
};

function getVoiceSettings(face) {
  return voiceSettings[face] || { rate: 190, pitch: 310 };
}

// ── Timer Intervals ──

function idleInterval(rng) {
  return uniform(rng, 60, 90);
}

function chatInterval(rng) {
  return uniform(rng, 90, 200);
}

function dunningInterval(creditRating) {
  const clamped = Math.max(0, Math.min(1, creditRating));
  return 5 * Math.pow(60, clamped);
}

// ── Visit Timer System ──

function initVisitTimers(state, now, rng) {
  state.idleTimer = now + idleInterval(rng);
  state.chatTimer = now + chatInterval(rng);
  state.dunningTimer = now + dunningInterval(state.creditRating);
  state.lastIdleCheck = now;
}

function resetTimers(state, now, rng) {
  state.idleTimer = now + idleInterval(rng);
  state.chatTimer = now + chatInterval(rng);
  state.dunningTimer = now + dunningInterval(state.creditRating);
}

function checkVisits(state, now, rng) {
  if (state.dialog || state.faceMessage) return null;

  if (now >= state.idleTimer) {
    return deliverIdleMessage(state, now, rng);
  }
  if (now >= state.chatTimer) {
    return deliverChatMessage(state, now, rng);
  }
  if (state.loan > 0 && now >= state.dunningTimer) {
    return deliverDunningMessage(state, now, rng);
  }
  return null;
}

function deliverIdleMessage(state, now, rng) {
  const face = randomInt(rng, 0, 4);
  const text = msg.getIdlePepTalkMessage(rng);
  state.faceMessage = { face, text };
  state.idleTimer = now + idleInterval(rng);
  return state.faceMessage;
}

function deliverChatMessage(state, now, rng) {
  const neighbors = state.neighbors;
  const personalities = ['goodGuy', 'badGuy', 'villageIdiot', 'banker'];
  const personality = personalities[randomInt(rng, 0, 4)];
  const face = neighbors[personality];
  const chat = chooseChat(state, personality, rng);
  state.faceMessage = { face, text: chat.text, type: chat.type };
  state.chatTimer = now + chatInterval(rng);
  return state.faceMessage;
}

function deliverDunningMessage(state, now, rng) {
  const face = state.neighbors.banker;
  const text = msg.getDunningMessage(rng);
  state.faceMessage = { face, text, type: 'dunning' };
  state.dunningTimer = now + dunningInterval(state.creditRating);
  return state.faceMessage;
}

function dismissFaceMessage(state, now, rng) {
  state.faceMessage = null;
  resetTimers(state, now, rng);
}

module.exports = {
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
};
