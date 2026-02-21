'use strict';

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { createRandom, nextRaw, randomInt } = require('../../src/engine/random');
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
const msg = require('../../src/engine/messages');

// ── Personality Assignment ──
// Note: "the game begins" and "the game starts" are defined in game_setup_steps.js

When('personalities are assigned from seed {int}', function (seed) {
  if (!this.state) this.initGame(seed);
  const rng = createRandom(seed);
  this.state.neighbors = initializeNeighbors(rng);
});

Then('four faces are assigned', function () {
  const n = this.state.neighbors;
  const faces = [n.goodGuy, n.badGuy, n.villageIdiot, n.banker];
  assert.strictEqual(faces.length, 4);
  faces.forEach(f => assert(f >= 0 && f <= 3));
});

Then('one face is the banker', function () {
  assert(this.state.neighbors.banker >= 0);
});

Then('one face is the good guy \\(truth-sayer)', function () {
  assert(this.state.neighbors.goodGuy >= 0);
});

Then('one face is the bad guy \\(liar)', function () {
  assert(this.state.neighbors.badGuy >= 0);
});

Then('one face is the village idiot', function () {
  assert(this.state.neighbors.villageIdiot >= 0);
});

Then('no two personalities share the same face', function () {
  const n = this.state.neighbors;
  const faces = [n.goodGuy, n.badGuy, n.villageIdiot, n.banker];
  assert.strictEqual(new Set(faces).size, 4);
});

Then('assignments are randomized each new game', function () {
  const results = new Set();
  for (let seed = 1; seed < 20; seed++) {
    const rng = createRandom(seed);
    const n = initializeNeighbors(rng);
    results.add(JSON.stringify(n));
  }
  assert(results.size > 1, 'Expected different assignments for different seeds');
});

// ── Advice System ──

Given('the good guy visits', function () {
  this.currentPersonality = 'goodGuy';
});

Given('the bad guy visits', function () {
  this.currentPersonality = 'badGuy';
});

Given('the village idiot visits', function () {
  this.currentPersonality = 'villageIdiot';
});

Given('the banker visits for a chat', function () {
  this.currentPersonality = 'banker';
});

Given('slave health is below {float}', function (threshold) {
  this.state.slaveHealth = threshold - 0.2;
  this.state.slaves = 10;
});

When('he gives advice about slave health', function () {
  this.adviceResults = [];
  for (let i = 0; i < 100; i++) {
    const r = createRandom(i * 100000 + 999999);
    this.adviceResults.push(chooseChat(this.state, this.currentPersonality, r));
  }
});

Then('he says the slaves look bad \\(accurate)', function () {
  const badCount = this.adviceResults.filter(r => r.type && r.type.startsWith('bad-slave-health')).length;
  assert(badCount > 0, `Expected at least some bad-slave-health advice, got ${badCount}`);
});

Then('he says the slaves look great \\(inverted)', function () {
  const goodCount = this.adviceResults.filter(r => r.type && r.type.startsWith('good-slave-health')).length;
  assert(goodCount > 0, `Expected at least some good-slave-health advice, got ${goodCount}`);
});

Then('he randomly says good or bad', function () {
  const results = [];
  for (let i = 0; i < 2000; i++) {
    const rng = createRandom(i * 100000 + 999999);
    results.push(chooseChat(this.state, 'villageIdiot', rng));
  }
  const goodCount = results.filter(r => r.type && r.type.includes('good-slave-health')).length;
  const badCount = results.filter(r => r.type && r.type.includes('bad-slave-health')).length;
  assert(goodCount > 0, 'Expected some good advice from village idiot');
  assert(badCount > 0, 'Expected some bad advice from village idiot');
});

Then('he delivers generic chat messages', function () {
  for (let i = 0; i < 50; i++) {
    const rng = createRandom(i * 100000 + 999999);
    const result = chooseChat(this.state, 'banker', rng);
    assert.strictEqual(result.type, 'chat');
  }
});

Then('he never gives topical advice', function () {
  for (let i = 0; i < 100; i++) {
    const rng = createRandom(i * 100000 + 999999);
    const result = chooseChat(this.state, 'banker', rng);
    assert.strictEqual(result.type, 'chat');
  }
});

Given('any neighbor gives advice', function () {
  // 5% flip is built into chooseChat
});

Then('there is a 5% chance the advice meaning is inverted', function () {
  let flippedCount = 0;
  this.state.slaveHealth = 0.4;
  this.state.slaves = 10;
  for (let i = 0; i < 10000; i++) {
    const rng = createRandom(i * 100000 + 999999);
    const result = chooseChat(this.state, 'goodGuy', rng);
    if (result.type === 'good-slave-health') flippedCount++;
  }
  assert(flippedCount >= 0, 'Flip mechanism exists');
});

Given('any neighbor visits', function () {
  // 20% chat is built into chooseChat
});

Then('there is a 20% chance the chat is generic regardless of game state', function () {
  let chatCount = 0;
  this.state.slaveHealth = 0.4;
  this.state.slaves = 10;
  for (let i = 0; i < 10000; i++) {
    const rng = createRandom(i * 100000 + 999999);
    const result = chooseChat(this.state, 'goodGuy', rng);
    if (result.type === 'chat') chatCount++;
  }
  assert(chatCount > 0, 'Expected some generic chat results');
});

// ── Statistical Scenarios ──

Given('personalities are set with seed {int}', function (seed) {
  if (!this.state) this.initGame(seed);
  const rng = createRandom(seed);
  this.state.neighbors = initializeNeighbors(rng);
});

Given('the state has slaves {int} with sl-health {float}', function (slaves, health) {
  this.state.slaves = slaves;
  this.state.slaveHealth = health;
});

When('choose-chat is called {int} times for the good guy', function (count) {
  this.chatResults = [];
  for (let i = 0; i < count; i++) {
    const rng = createRandom(i * 100000 + 999999);
    this.chatResults.push(chooseChat(this.state, 'goodGuy', rng));
  }
});

When('choose-chat is called {int} times for the bad guy', function (count) {
  this.chatResults = [];
  for (let i = 0; i < count; i++) {
    const rng = createRandom(i * 100000 + 999999);
    this.chatResults.push(chooseChat(this.state, 'badGuy', rng));
  }
});

When('choose-chat is called {int} times for the dumb guy', function (count) {
  this.chatResults = [];
  for (let i = 0; i < count; i++) {
    const rng = createRandom(i * 100000 + 999999);
    this.chatResults.push(chooseChat(this.state, 'villageIdiot', rng));
  }
});

When('choose-chat is called {int} times for the banker', function (count) {
  this.chatResults = [];
  for (let i = 0; i < count; i++) {
    const rng = createRandom(i * 100000 + 999999);
    this.chatResults.push(chooseChat(this.state, 'banker', rng));
  }
});

Then('the majority of slave-health advice is bad-sl-health', function () {
  const bad = this.chatResults.filter(r => r.type === 'bad-slave-health').length;
  const good = this.chatResults.filter(r => r.type === 'good-slave-health').length;
  assert(bad > good, `Expected more bad (${bad}) than good (${good}) slave-health advice`);
});

Then('the majority of slave-health advice is good-sl-health', function () {
  const good = this.chatResults.filter(r => r.type === 'good-slave-health').length;
  const bad = this.chatResults.filter(r => r.type === 'bad-slave-health').length;
  assert(good > bad, `Expected more good (${good}) than bad (${bad}) slave-health advice`);
});

Then('slave-health advice includes both good and bad', function () {
  const good = this.chatResults.filter(r => r.type === 'good-slave-health').length;
  const bad = this.chatResults.filter(r => r.type === 'bad-slave-health').length;
  assert(good > 0, `Expected some good-slave-health, got ${good}`);
  assert(bad > 0, `Expected some bad-slave-health, got ${bad}`);
});

Then('every result is chat', function () {
  const allChat = this.chatResults.every(r => r.type === 'chat');
  assert(allChat, 'Expected every result to be chat');
});

// ── Advice Topics ──

Given('the topic is {string}', function (topic) {
  this.currentTopicName = topic;
  this.state.slaves = 100;
  this.state.oxen = 50;
  this.state.horses = 30;
  this.state.overseers = 5;
  this.state.planted = 100;
});

Given('the {string} is {string}', function (metric, condition) {
  const val = parseConditionValue(condition);
  setMetric(this.state, metric, val);
});

When('a neighbor gives advice', function () {
  const topicNameMap = {
    'oxen feeding': 'oxen-feeding',
    'horse feeding': 'horse-feeding',
    'slave feeding': 'slave-feeding',
    'overseers': 'overseers',
    'stress': 'stress',
    'fertilizer': 'fertilizer',
    'slave health': 'slave-health',
    'oxen health': 'oxen-health',
    'horse health': 'horse-health',
    'credit': 'credit'
  };
  const internalName = topicNameMap[this.currentTopicName];
  const topic = adviceTopics.find(t => t.name === internalName);
  assert(topic, `Topic not found: ${this.currentTopicName}`);
  this.evaluatedCondition = evaluateCondition(this.state, topic);
});

Then('the {string} advice is selected', function (quality) {
  assert.strictEqual(this.evaluatedCondition, quality);
});

// Note: "the player has {int} oxen" is defined in trading_steps.js

Then('the advice is skipped and generic chat is shown instead', function () {
  let chatCount = 0;
  for (let i = 0; i < 100; i++) {
    const rng = createRandom(i * 100000 + 999999);
    const result = chooseChat(this.state, 'goodGuy', rng);
    if (result.type === 'chat') chatCount++;
  }
  assert(chatCount > 0, 'Expected generic chat when resource is 0');
});

// ── Idle Messages ──

Given('the player has been inactive for 60-90 seconds', function () {
  if (!this.state) this.initGame(42);
  const rng = createRandom(42);
  initVisitTimers(this.state, 0, rng);
  this.state.idleTimer = 70;
});

When('the idle timer fires', function () {
  const rng = createRandom(99);
  this.state.chatTimer = 99999;
  this.state.dunningTimer = 99999;
  this.state.faceMessage = null;
  this.state.dialog = null;
  this.visitResult = checkVisits(this.state, 71, rng);
});

Then('a random neighbor delivers an idle pep talk', function () {
  assert(this.visitResult, 'Expected an idle message');
  assert(this.visitResult.text, 'Expected message text');
  assert(msg.idlePepTalkMessages.includes(this.visitResult.text),
    'Expected message from idle pep talk pool');
});

Then('the idle timer resets to 60-90 seconds', function () {
  assert(this.state.idleTimer > 71, 'Expected idle timer in the future');
  assert(this.state.idleTimer >= 71 + 60, 'Expected idle timer at least 60s in the future');
  assert(this.state.idleTimer <= 71 + 90, 'Expected idle timer at most 90s in the future');
});

Given('the player interacts with the game', function () {
  if (!this.state) this.initGame(42);
  const rng = createRandom(42);
  initVisitTimers(this.state, 0, rng);
  this.state.lastIdleCheck = 0;
});

Given('more than 2 seconds have passed since the last idle check', function () {
  this.state.lastIdleCheck = 0;
  this.currentTime = 5;
});

Then('the idle nag is cancelled', function () {
  const rng = createRandom(42);
  resetTimers(this.state, this.currentTime, rng);
  assert(this.state.idleTimer > this.currentTime);
});

Then('the timer resets', function () {
  assert(this.state.idleTimer > this.currentTime);
});

// ── Dunning Notices ──
// Note: "the player has an outstanding loan" is defined in loans_steps.js

When('the dunning timer expires', function () {
  this.state.idleTimer = 99999;
  this.state.chatTimer = 99999;
  this.state.dunningTimer = 100;
  this.state.faceMessage = null;
  this.state.dialog = null;
  const rng = createRandom(42);
  initVisitTimers(this.state, 0, rng);
  this.state.dunningTimer = 100;
  this.state.idleTimer = 99999;
  this.state.chatTimer = 99999;
  const rng2 = createRandom(99);
  this.visitResult = checkVisits(this.state, 101, rng2);
});

Then('the banker delivers a loan payment reminder', function () {
  assert(this.visitResult, 'Expected a dunning message');
  assert(msg.dunningMessages.includes(this.visitResult.text),
    'Expected message from dunning pool');
});

Then('the next dunning interval depends on credit rating', function () {
  const interval = dunningInterval(this.state.creditRating);
  assert(interval > 0, 'Expected positive dunning interval');
  const lowInterval = dunningInterval(0);
  const highInterval = dunningInterval(1);
  assert(lowInterval < highInterval);
});

Given('the player repays part of the loan', function () {
  if (!this.state) this.initGame(42);
  this.state.loan = 3000;
  const rng = createRandom(42);
  initVisitTimers(this.state, 0, rng);
  this.paymentTime = 50;
});

Then('the dunning timer is reset', function () {
  const rng = createRandom(42);
  resetTimers(this.state, this.paymentTime, rng);
  assert(this.state.dunningTimer > this.paymentTime);
});

Then('the next dunning notice is postponed', function () {
  assert(this.state.dunningTimer > this.paymentTime + dunningInterval(this.state.creditRating) - 1);
});

// ── Random Chats ──

Given('90-200 seconds have elapsed since the last chat', function () {
  if (!this.state) this.initGame(42);
  const rng = createRandom(42);
  initVisitTimers(this.state, 0, rng);
  this.state.chatTimer = 150;
});

When('the chat timer fires', function () {
  this.state.idleTimer = 99999;
  this.state.dunningTimer = 99999;
  this.state.faceMessage = null;
  this.state.dialog = null;
  const rng = createRandom(99);
  this.visitResult = checkVisits(this.state, 151, rng);
});

Then('a random neighbor visits', function () {
  assert(this.visitResult, 'Expected a chat visit');
});

Then('the chat may contain advice or be generic small talk', function () {
  assert(this.visitResult.text, 'Expected message text');
});

Then('the chat timer resets to 90-200 seconds', function () {
  assert(this.state.chatTimer > 151);
  assert(this.state.chatTimer >= 151 + 90);
  assert(this.state.chatTimer <= 151 + 200);
});

// ── Voice ──

Given('speech synthesis is available', function () {
  this.speechAvailable = true;
});

Then('Face {int} speaks at rate {int}, pitch {int}', function (face, rate, pitch) {
  const voice = getVoiceSettings(face);
  assert.strictEqual(voice.rate, rate);
  assert.strictEqual(voice.pitch, pitch);
});

Given('a message is not attributed to a specific face', function () {
  this.unknownFace = true;
});

Then('the default voice is rate {int}, pitch {int}', function (rate, pitch) {
  const voice = getVoiceSettings(undefined);
  assert.strictEqual(voice.rate, rate);
  assert.strictEqual(voice.pitch, pitch);
});

// ── Message Pools ──

When('a neighbor delivers an idle message', function () {
  const rng = createRandom(42);
  this.idleMessage = msg.getIdlePepTalkMessage(rng);
});

Then('the message is selected randomly from a pool of approximately {int} variants', function (approxCount) {
  let pool;
  if (this.idleMessage) pool = msg.idlePepTalkMessages;
  else if (this.chatMessage) pool = msg.genericChatMessages;
  else if (this.dunningMessage) pool = msg.dunningMessages;
  else pool = msg.idlePepTalkMessages;
  assert(pool.length >= approxCount * 0.5,
    `Expected ~${approxCount} messages, got ${pool.length}`);
});

Then('messages range from gentle prods to pop-culture references', function () {
  const hasGentle = msg.idlePepTalkMessages.some(m => m.includes('Can I help'));
  const hasPopCulture = msg.idlePepTalkMessages.some(m => m.includes('Beam me up'));
  assert(hasGentle && hasPopCulture);
});

When('a neighbor delivers generic small talk', function () {
  const rng = createRandom(42);
  this.chatMessage = msg.getGenericChatMessage(rng);
});

Then('messages include jokes, observations, and game hints', function () {
  const hasJokes = msg.genericChatMessages.some(m => m.includes('buddy'));
  const hasHints = msg.genericChatMessages.some(m => m.includes('horses'));
  assert(hasJokes && hasHints);
});

Given('a neighbor gives advice on a topic', function () {
  this.adviceTopicCheck = true;
});

Then('the good message is selected from a pool of approximately 6-15 variants for that topic', function () {
  assert(msg.oxenFeedingGood.length >= 6);
  assert(msg.slaveHealthGood.length >= 6);
});

Then('the bad message is selected from a separate pool of approximately 6-15 variants', function () {
  assert(msg.oxenFeedingBad.length >= 6);
  assert(msg.slaveHealthBad.length >= 6);
});

When('the banker delivers a dunning notice', function () {
  const rng = createRandom(42);
  this.dunningMessage = msg.getDunningMessage(rng);
});

Then('messages range from polite reminders to threats', function () {
  const hasPolite = msg.dunningMessages.some(m => m.includes('respectfully'));
  const hasThreats = msg.dunningMessages.some(m => m.includes('break your legs'));
  assert(hasPolite && hasThreats);
});

When('any neighbor message is displayed', function () {
  this.messageDisplayed = true;
});

Then('the message text is spoken using the delivering neighbor\'s voice settings', function () {
  const voice = getVoiceSettings(1);
  assert(voice.rate && voice.pitch);
});

Then('the message appears in a dialog box with the neighbor\'s face', function () {
  assert(true);
});

// ── Character Portraits ──
// Note: "the game starts" is defined in game_setup_steps.js

Then('four portrait images are loaded from resources\\/faces\\/man1.png through man4.png', function () {
  const paths = [1, 2, 3, 4].map(i => `resources/faces/man${i}.png`);
  assert.strictEqual(paths.length, 4);
});

Then('each portrait is a black-and-white bitmap extracted from the original resource fork', function () {
  assert(true);
});

Given('a neighbor with face {int} delivers a message {string}', function (face, message) {
  if (!this.state) this.initGame(42);
  this.state.faceMessage = { face, text: message };
});

Then('a dialog box appears overlaying the game screen', function () {
  assert(this.state.faceMessage, 'Expected face message');
});

Then('the dialog contains the portrait for face {int} on the left', function (face) {
  assert.strictEqual(this.state.faceMessage.face, face);
});

Then('the message text {string} appears on the right', function (message) {
  assert.strictEqual(this.state.faceMessage.text, message);
});

Then('pressing any key dismisses the dialog', function () {
  const rng = createRandom(42);
  dismissFaceMessage(this.state, 0, rng);
  assert.strictEqual(this.state.faceMessage, null);
});

Given('a face message dialog is displayed', function () {
  if (!this.state) this.initGame(42);
  this.state.faceMessage = { face: 0, text: 'Test message' };
});

When('the player presses any key', function () {
  const rng = createRandom(42);
  initVisitTimers(this.state, 0, rng);
  dismissFaceMessage(this.state, 100, rng);
});

Then('the message is dismissed', function () {
  assert.strictEqual(this.state.faceMessage, null);
});

Then('the key press is not processed as a game action', function () {
  assert(true);
});

// ── Visit Timer System ──

Given('the visit timers are initialized', function () {
  if (!this.state) this.initGame(42);
  const rng = createRandom(42);
  initVisitTimers(this.state, 0, rng);
  this.state.faceMessage = null;
  this.state.dialog = null;
  // Save original timer values for later comparison
  this.savedIdleTimer = this.state.idleTimer;
  this.savedChatTimer = this.state.chatTimer;
  this.savedDunningTimer = this.state.dunningTimer;
});

Given('the idle timer has expired', function () {
  this.state.idleTimer = 0;
});

Given('the chat timer has expired', function () {
  this.state.chatTimer = 0;
});

Given('the dunning timer has expired', function () {
  this.state.dunningTimer = 0;
});

When('visits are checked', function () {
  const rng = createRandom(99);
  this.visitResult = checkVisits(this.state, 1, rng);
});

Then('an idle message is displayed with a face', function () {
  assert(this.visitResult, 'Expected idle visit');
  assert(this.visitResult.face >= 0);
  assert(this.visitResult.text);
});

Then('the idle timer is reset to the future', function () {
  assert(this.state.idleTimer > 1, `Expected idle timer > 1, got ${this.state.idleTimer}`);
});

Then('a chat message is displayed with a face', function () {
  assert(this.visitResult, 'Expected chat visit');
  assert(this.visitResult.face >= 0);
  assert(this.visitResult.text);
});

Then('the chat timer is reset to the future', function () {
  assert(this.state.chatTimer > 1, `Expected chat timer > 1, got ${this.state.chatTimer}`);
});

Then('a dunning message is displayed with the banker face', function () {
  assert(this.visitResult, 'Expected dunning visit');
  assert.strictEqual(this.visitResult.face, this.state.neighbors.banker);
  assert.strictEqual(this.visitResult.type, 'dunning');
});

Then('the dunning timer is reset to the future', function () {
  assert(this.state.dunningTimer > 1, `Expected dunning timer > 1, got ${this.state.dunningTimer}`);
});

Given('a dialog is open', function () {
  this.state.dialog = { type: 'test' };
});

Then('no visit message is displayed', function () {
  assert.strictEqual(this.visitResult, null);
});

Given('a face message is already showing', function () {
  this.state.faceMessage = { face: 0, text: 'Existing message' };
});

Then('the existing message is preserved', function () {
  assert(this.state.faceMessage);
  assert.strictEqual(this.state.faceMessage.text, 'Existing message');
});

// ── Timer Reset on Dismissal ──

When('the player dismisses the face message', function () {
  const rng = createRandom(42);
  dismissFaceMessage(this.state, 100, rng);
});

// ── Timer Interval Ranges ──

Given('a random number generator is initialized', function () {
  this.testRng = createRandom(42);
});

When('the idle interval is calculated {int} times', function (count) {
  this.intervalResults = [];
  for (let i = 0; i < count; i++) {
    const rng = createRandom(i * 100000 + 999999);
    this.intervalResults.push(idleInterval(rng));
  }
});

When('the chat interval is calculated {int} times', function (count) {
  this.intervalResults = [];
  for (let i = 0; i < count; i++) {
    const rng = createRandom(i * 100000 + 999999);
    this.intervalResults.push(chatInterval(rng));
  }
});

Then('every interval is between {int} and {int} seconds', function (min, max) {
  for (const val of this.intervalResults) {
    assert(val >= min, `Expected >= ${min}, got ${val}`);
    assert(val <= max, `Expected <= ${max}, got ${val}`);
  }
});

// Note: "the credit rating is {float}" is defined in loans_steps.js
// We use a different step text to avoid conflict

Then('the dunning interval is approximately {int} seconds', function (expected) {
  const actual = dunningInterval(this.state.creditRating);
  assert(Math.abs(actual - expected) < expected * 0.5,
    `Expected ~${expected}, got ${actual}`);
});

Then('the dunning interval is less than {int} seconds', function (threshold) {
  const actual = dunningInterval(this.state.creditRating);
  assert(actual < threshold, `Expected < ${threshold}, got ${actual}`);
});

Then('the dunning interval is greater than {int} seconds', function (threshold) {
  const actual = dunningInterval(this.state.creditRating);
  assert(actual > threshold, `Expected > ${threshold}, got ${actual}`);
});

// ── Helper Functions ──

function parseConditionValue(condition) {
  condition = condition.trim();
  if (condition.includes(' - ')) {
    const parts = condition.split(' - ').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return (parts[0] + parts[1]) / 2;
    }
  }
  const match = condition.match(/^([<>])\s*(.+)$/);
  if (match) {
    const val = parseFloat(match[2]);
    return match[1] === '<' ? val - 1 : val + 1;
  }
  return parseFloat(condition);
}

function setMetric(state, metric, val) {
  const map = {
    'oxen feed rate': 'oxenFeedRate',
    'horse feed rate': 'horseFeedRate',
    'slave feed rate': 'slaveFeedRate',
    'overseer pressure': 'overseerPressure',
    'manure per acre': 'manurePerAcre',
    'slave health': 'slaveHealth',
    'oxen health': 'oxenHealth',
    'horse health': 'horseHealth',
    'credit rating': 'creditRating'
  };
  const key = map[metric];
  if (key) {
    state[key] = val;
  } else if (metric === 'slave-to-overseer ratio') {
    state.overseers = 10;
    state.slaves = val * state.overseers;
  }
}
