'use strict';

const { createRandom } = require('./random');

function defaultSupply() {
  return { wheat: 1e6, slave: 1e3, horse: 1e4, oxen: 1e4, land: 1e2, manure: 1e4 };
}

function defaultDemand() {
  return { wheat: 1e7, slave: 1e4, horse: 1e5, oxen: 1e5, land: 1e3, manure: 1e5 };
}

function defaultProduction() {
  return { wheat: 1e7, slave: 1e4, horse: 1e5, oxen: 1e5, land: 1e3, manure: 1e5 };
}

function createGameState(seed) {
  return {
    gold: 0, wheat: 0, slaves: 0, oxen: 0, horses: 0, manure: 0,
    fallow: 0, planted: 0, growing: 0, ripe: 0,
    overseers: 0, overseerPay: 300, overseerPressure: 0,
    slaveHealth: 1.0, oxenHealth: 1.0, horseHealth: 1.0,
    slaveFeedRate: 0, oxenFeedRate: 0, horseFeedRate: 0,
    plantingQuota: 0, manureSpreadQuota: 0,
    wheatSewn: 0, wheatGrowing: 0, wheatRipe: 0,
    manurePerAcre: 0, wtRotRt: 0.05,
    pyramidStones: 0, pyramidBase: 0, pyramidHeight: 0, stoneQuota: 0,
    loan: 0, interestRate: 0.5, interestAddition: 0,
    creditRating: 1.0, creditLimit: 50000, creditLowerBound: 500000,
    inflation: 0.001, worldGrowth: 0.05,
    wheatPrice: 2, landPrice: 10000, slavePrice: 500,
    horsePrice: 100, oxenPrice: 90, manurePrice: 20,
    supply: defaultSupply(),
    demand: defaultDemand(),
    production: defaultProduction(),
    month: 1, year: 1,
    screen: 'difficulty', dialog: null, message: null, statusMessage: '',
    contractOffers: [], pendingContracts: [], contractPlayers: [], contractMessages: [],
    neighbors: { goodGuy: 0, badGuy: 1, villageIdiot: 2, banker: 3 },
    prev: {},
    temporaryWorkAddition: 0,
    slaveEfficiency: 1.0, motivation: 1.0, oxenEfficiency: 1.0,
    rng: createRandom(seed),
    gameOver: false, gameWon: false, licensed: true, canSave: true
  };
}

module.exports = { createGameState };
