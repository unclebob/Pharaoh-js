'use strict';

const { createRandom } = require('./random');

function makeCommodityMap(val) {
  return { wheat: val, land: val, slave: val, horse: val, oxen: val, manure: val };
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
    loan: 0, interestRate: 5, interestAddition: 0,
    creditRating: 1.0, creditLimit: 0, creditLowerBound: 0,
    inflation: 0, worldGrowth: 0,
    wheatPrice: 10, landPrice: 5000, slavePrice: 800,
    horsePrice: 100, oxenPrice: 90, manurePrice: 20,
    supply: makeCommodityMap(100),
    demand: makeCommodityMap(100),
    production: makeCommodityMap(100),
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
