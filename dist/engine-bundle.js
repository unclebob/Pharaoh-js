"use strict";
var PharaohEngine = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/engine/random.js
  var require_random = __commonJS({
    "src/engine/random.js"(exports, module) {
      "use strict";
      var M = 4294967296;
      function createRandom(seed) {
        let s = ((seed | 0) ^ (seed / M | 0)) >>> 0 || 1;
        if (s % 2 === 0) s = s + 1 >>> 0;
        return { state: s };
      }
      function nextRaw(rng) {
        const x = rng.state;
        rng.state = Math.imul(x, x + 1) >>> 0;
        return rng.state / M;
      }
      function uniform(rng, a, b) {
        return a + nextRaw(rng) * (b - a);
      }
      function gaussian(rng, mean, sigma) {
        let s, u, v;
        do {
          u = 2 * nextRaw(rng) - 1;
          v = 2 * nextRaw(rng) - 1;
          s = u * u + v * v;
        } while (s >= 1 || s === 0);
        const mul = Math.sqrt(-2 * Math.log(s) / s);
        return mean + sigma * u * mul;
      }
      function absGaussian(rng, mean, sigma) {
        let val;
        do {
          val = gaussian(rng, mean, sigma);
        } while (val < 0);
        return val;
      }
      function exponential(rng, mean) {
        let u;
        do {
          u = nextRaw(rng);
        } while (u === 0);
        return -Math.log(u) * mean;
      }
      function randomInt(rng, a, b) {
        return Math.floor(uniform(rng, a, b));
      }
      function pick(rng, array) {
        return array[randomInt(rng, 0, array.length)];
      }
      module.exports = {
        createRandom,
        nextRaw,
        uniform,
        gaussian,
        absGaussian,
        exponential,
        randomInt,
        pick
      };
    }
  });

  // src/engine/state.js
  var require_state = __commonJS({
    "src/engine/state.js"(exports, module) {
      "use strict";
      var { createRandom } = require_random();
      function defaultSupply() {
        return { wheat: 1e6, slave: 1e3, horse: 1e4, oxen: 1e4, land: 100, manure: 1e4 };
      }
      function defaultDemand() {
        return { wheat: 1e7, slave: 1e4, horse: 1e5, oxen: 1e5, land: 1e3, manure: 1e5 };
      }
      function defaultProduction() {
        return { wheat: 1e7, slave: 1e4, horse: 1e5, oxen: 1e5, land: 1e3, manure: 1e5 };
      }
      function createGameState(seed) {
        return {
          gold: 0,
          wheat: 0,
          slaves: 0,
          oxen: 0,
          horses: 0,
          manure: 0,
          fallow: 0,
          planted: 0,
          growing: 0,
          ripe: 0,
          overseers: 0,
          overseerPay: 300,
          overseerPressure: 0,
          slaveHealth: 1,
          oxenHealth: 1,
          horseHealth: 1,
          slaveFeedRate: 0,
          oxenFeedRate: 0,
          horseFeedRate: 0,
          plantingQuota: 0,
          manureSpreadQuota: 0,
          wheatSewn: 0,
          wheatGrowing: 0,
          wheatRipe: 0,
          manurePerAcre: 0,
          wtRotRt: 0.05,
          pyramidStones: 0,
          pyramidBase: 0,
          pyramidHeight: 0,
          stoneQuota: 0,
          loan: 0,
          interestRate: 0.5,
          interestAddition: 0,
          creditRating: 1,
          creditLimit: 5e4,
          creditLowerBound: 5e5,
          inflation: 1e-3,
          worldGrowth: 0.05,
          wheatPrice: 2,
          landPrice: 1e4,
          slavePrice: 500,
          horsePrice: 100,
          oxenPrice: 90,
          manurePrice: 20,
          supply: defaultSupply(),
          demand: defaultDemand(),
          production: defaultProduction(),
          month: 1,
          year: 1,
          screen: "difficulty",
          dialog: null,
          message: null,
          statusMessage: "",
          contractOffers: [],
          pendingContracts: [],
          contractPlayers: [],
          contractMessages: [],
          neighbors: { goodGuy: 0, badGuy: 1, villageIdiot: 2, banker: 3 },
          prev: {},
          temporaryWorkAddition: 0,
          slaveEfficiency: 1,
          motivation: 1,
          oxenEfficiency: 1,
          rng: createRandom(seed),
          gameOver: false,
          gameWon: false,
          licensed: true,
          canSave: true
        };
      }
      module.exports = { createGameState };
    }
  });

  // src/engine/difficulty.js
  var require_difficulty = __commonJS({
    "src/engine/difficulty.js"(exports, module) {
      "use strict";
      var SETTINGS = {
        easy: {
          pyramidBase: 115.47,
          creditLimit: 5e6,
          creditLowerBound: 5e6,
          worldGrowth: 0.15,
          landPrice: 1e3,
          wheatPrice: 10,
          slavePrice: 1e3,
          fallow: 80,
          slaves: 100,
          oxen: 50,
          horses: 7,
          wheat: 2e4,
          manure: 400,
          overseers: 7,
          slaveFeedRate: 10,
          oxenFeedRate: 70,
          horseFeedRate: 55,
          plantingQuota: 10,
          manureSpreadQuota: 50,
          loan: 393200,
          gold: 4e4
        },
        normal: {
          pyramidBase: 346.41,
          creditLimit: 5e5,
          creditLowerBound: 5e5,
          worldGrowth: 0.1,
          landPrice: 5e3,
          wheatPrice: 8,
          slavePrice: 800
        },
        hard: {
          pyramidBase: 1154.7,
          creditLimit: 5e4,
          creditLowerBound: 5e4,
          worldGrowth: 0.05
        }
      };
      function setDifficulty(state, level) {
        Object.assign(state, SETTINGS[level]);
        state.screen = "game";
      }
      function forceEasyIfUnlicensed(state) {
        if (!state.licensed) {
          setDifficulty(state, "easy");
          state.canSave = false;
        }
      }
      module.exports = { setDifficulty, forceEasyIfUnlicensed, SETTINGS };
    }
  });

  // src/engine/tables.js
  var require_tables = __commonJS({
    "src/engine/tables.js"(exports, module) {
      "use strict";
      function lookup(x, table) {
        const { min, max, values } = table;
        const clamped = Math.max(min, Math.min(max, x));
        const scaled = (clamped - min) / (max - min) * 10;
        const idx = Math.floor(scaled);
        if (idx >= 10) return values[10];
        const frac = scaled - idx;
        return values[idx] + frac * (values[idx + 1] - values[idx]);
      }
      var yieldTable = {
        min: 0,
        max: 10,
        values: [20, 35, 70, 100, 150, 200, 180, 140, 100, 50, 0]
      };
      var seasonalYieldTable = {
        min: 1,
        max: 12,
        values: [0.2, 0.35, 0.5, 0.8, 1, 1.5, 1, 0.8, 0.55, 0.4, 0.25]
      };
      var slaveNourishmentTable = {
        min: 0,
        max: 10,
        values: [-1, -0.5, -0.185, 0.036, 0.0565, 0.074, 0.0865, 0.098, 0.12, 0.25, 0.18]
      };
      var oxenNourishmentTable = {
        min: 0,
        max: 100,
        values: [-1, -0.1, -55e-4, 0, 0.044, 0.068, 0.0825, 0.0915, 0.096, 0.098, 0.1]
      };
      var horseNourishmentTable = {
        min: 0,
        max: 75,
        values: [-1, -0.1, -0.046, 0, 0.0695, 0.079, 0.0865, 0.092, 0.0965, 0.099, 0.1]
      };
      var slaveBirthTable = {
        min: 0,
        max: 1,
        values: [0, 21e-4, 7e-3, 0.0161, 0.0364, 0.0644, 0.098, 0.121, 0.134, 0.139, 0.14]
      };
      var slaveDeathTable = {
        min: 0,
        max: 1,
        values: [1, 0.485, 0.235, 0.135, 0.0855, 0.0605, 0.0405, 0.0255, 0.0155, 0.0105, 2e-3]
      };
      var oxenBirthTable = {
        min: 0,
        max: 1,
        values: [0, 9e-4, 285e-5, 795e-5, 0.0159, 0.028, 0.038, 0.05, 0.06, 0.065, 0.07]
      };
      var oxenDeathTable = {
        min: 0,
        max: 1,
        values: [1, 0.5, 0.216, 0.0959, 0.0559, 0.031, 0.021, 0.01, 9e-3, 5e-3, 4e-3]
      };
      var horseBirthTable = {
        min: 0,
        max: 1,
        values: [0, 12e-4, 27e-4, 45e-4, 1e-3, 0.02, 0.04, 0.05, 0.06, 0.065, 0.07]
      };
      var horseDeathTable = {
        min: 0,
        max: 1,
        values: [1, 0.5, 0.245, 0.065, 0.03, 0.02, 0.01, 0.01, 8e-3, 7e-3, 5e-3]
      };
      var workAbilityTable = {
        min: 0,
        max: 1,
        values: [0, 1, 5, 10, 14, 15, 17, 18, 19, 19.5, 20]
      };
      var oxMultTable = {
        min: 0,
        max: 1,
        values: [1, 1.44, 1.89, 2.27, 2.65, 3, 3.27, 3.5, 3.72, 3.88, 4]
      };
      var positiveMotiveTable = {
        min: 0,
        max: 0.1,
        values: [0, 0.1, 0.2, 0.3, 0.4, 0.45, 0.52, 0.6, 0.63, 0.66, 0.7]
      };
      var negativeMotiveTable = {
        min: 0,
        max: 100,
        values: [0, 0.1, 0.2, 0.3, 0.35, 0.38, 0.42, 0.45, 0.47, 0.48, 0.5]
      };
      var stressLashTable = {
        min: 0,
        max: 10,
        values: [0, 20, 80, 150, 300, 500, 600, 700, 800, 900, 1e3]
      };
      var lashToSicknessTable = {
        min: 0,
        max: 100,
        values: [0, 0.01, 0.03, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.6, 1]
      };
      var laborToSicknessTable = {
        min: 0,
        max: 24,
        values: [0, 5e-4, 15e-4, 2e-3, 5e-3, 0.015, 0.03, 0.1, 0.25, 0.5, 1]
      };
      var overseerEffectivenessTable = {
        min: 0,
        max: 1,
        values: [0.3, 0.44, 0.58, 0.681, 0.762, 0.825, 0.884, 0.93, 0.965, 0.983, 0.997]
      };
      var oxenEfficiencyTable = {
        min: 0,
        max: 1,
        values: [0, 0.2, 0.1, 0.23, 0.4, 0.7, 0.87, 0.94, 0.965, 0.985, 1]
      };
      var horseEfficiencyTable = {
        min: 0,
        max: 1,
        values: [0, 0, 0.015, 0.065, 0.19, 0.66, 0.835, 0.93, 0.99, 1, 1]
      };
      var debtSupportTable = {
        min: 0,
        max: 1,
        values: [0, 0.5, 0.7, 0.75, 0.8, 0.9, 1, 1.3, 1.7, 2.3, 3]
      };
      var repayIndexTable = {
        min: 0,
        max: 0.1,
        values: [1, 1.02, 1.05, 1.1, 1.15, 1.2, 1.25, 1.275, 1.282, 1.295, 1.3]
      };
      var dunningIntervalTable = {
        min: 0,
        max: 1,
        values: [5, 6, 8, 12, 20, 30, 45, 60, 90, 200, 300]
      };
      var lashToSufferingTable = {
        min: 0,
        max: 1,
        values: [0, 0.01, 0.02, 0.1, 0.2, 0.4, 0.6, 0.9, 0.95, 0.98, 1]
      };
      var healthToSicknessTable = {
        min: 0,
        max: 1,
        values: [1, 0.95, 0.9, 0.8, 0.4, 0.2, 0.1, 0.04, 0.02, 0.01, 0]
      };
      var hatredToDestructionTable = {
        min: 0,
        max: 1,
        values: [0, 0.01, 0.03, 0.08, 0.15, 0.25, 0.4, 0.6, 0.9, 0.95, 1]
      };
      module.exports = {
        lookup,
        yieldTable,
        seasonalYieldTable,
        slaveNourishmentTable,
        oxenNourishmentTable,
        horseNourishmentTable,
        slaveBirthTable,
        slaveDeathTable,
        oxenBirthTable,
        oxenDeathTable,
        horseBirthTable,
        horseDeathTable,
        workAbilityTable,
        oxMultTable,
        positiveMotiveTable,
        negativeMotiveTable,
        stressLashTable,
        lashToSicknessTable,
        laborToSicknessTable,
        overseerEffectivenessTable,
        oxenEfficiencyTable,
        horseEfficiencyTable,
        debtSupportTable,
        repayIndexTable,
        dunningIntervalTable,
        lashToSufferingTable,
        healthToSicknessTable,
        hatredToDestructionTable
      };
    }
  });

  // src/engine/planting.js
  var require_planting = __commonJS({
    "src/engine/planting.js"(exports, module) {
      "use strict";
      var { absGaussian } = require_random();
      var { lookup, yieldTable, seasonalYieldTable } = require_tables();
      var SOWING_RATE = 20;
      var ROT_RATE = 0.05;
      function calculateActualPlanting(state, slaveEfficiency) {
        const desired = state.plantingQuota * slaveEfficiency;
        return Math.min(desired, state.fallow);
      }
      function sowWheat(state, actualPlanting) {
        const wheatConsumed = SOWING_RATE * actualPlanting;
        state.wheatSewn += wheatConsumed;
        state.wheat -= wheatConsumed;
        return wheatConsumed;
      }
      function wheatYield(manurePerAcre, month, rng) {
        const fertFactor = lookup(manurePerAcre, yieldTable);
        const variance = absGaussian(rng, 1, 0.1);
        const seasonal = lookup(month, seasonalYieldTable);
        return fertFactor * variance * seasonal;
      }
      function wheatRot(state, rng) {
        const variance = absGaussian(rng, 1, 0.1);
        const lost = state.wheat * ROT_RATE * variance;
        state.wheat -= lost;
        return lost;
      }
      function spreadManure(state, slaveEfficiency) {
        const desired = state.manureSpreadQuota * slaveEfficiency;
        const actual = Math.min(desired, state.manure);
        state.manure -= actual;
        const totalLand = state.fallow + state.planted + state.growing + state.ripe;
        state.manurePerAcre = totalLand > 0 ? actual / totalLand : 0;
        return actual;
      }
      function harvest(state, slaveEfficiency) {
        const harvested = state.wheatRipe * slaveEfficiency;
        const lost = state.wheatRipe * (1 - slaveEfficiency);
        state.wheat += harvested;
        state.wheatRipe = 0;
        return { harvested, lost };
      }
      function advanceLandCycle(state, slaveEfficiency, rng) {
        const harvestResult = harvest(state, slaveEfficiency);
        state.fallow += state.ripe;
        state.ripe = 0;
        const yieldMult = wheatYield(state.manurePerAcre, state.month, rng);
        state.wheatRipe = state.wheatGrowing * yieldMult;
        state.ripe = state.growing;
        state.wheatGrowing = 0;
        state.growing = 0;
        state.wheatGrowing = state.wheatSewn;
        state.growing = state.planted;
        state.wheatSewn = 0;
        state.planted = 0;
        const actualPlanting = calculateActualPlanting(state, slaveEfficiency);
        state.fallow -= actualPlanting;
        state.planted = actualPlanting;
        const wheatConsumed = sowWheat(state, actualPlanting);
        return { harvestResult, actualPlanting, wheatConsumed };
      }
      module.exports = {
        SOWING_RATE,
        ROT_RATE,
        calculateActualPlanting,
        sowWheat,
        wheatYield,
        wheatRot,
        spreadManure,
        harvest,
        advanceLandCycle
      };
    }
  });

  // src/engine/feeding.js
  var require_feeding = __commonJS({
    "src/engine/feeding.js"(exports, module) {
      "use strict";
      var { absGaussian } = require_random();
      var FEED_KEYS = { slave: "slaveFeedRate", oxen: "oxenFeedRate", horse: "horseFeedRate" };
      function setFeedRate(state, type, rate) {
        if (rate < 0) return false;
        state[FEED_KEYS[type]] = rate;
        return true;
      }
      function slaveWheatDemand(state) {
        return state.slaves * state.slaveFeedRate;
      }
      function oxenWheatDemand(state, slaveEff) {
        return state.oxenFeedRate * slaveEff * state.oxen * slaveEff;
      }
      function horseWheatDemand(state, slaveEff) {
        return state.horseFeedRate * slaveEff * state.horses * slaveEff;
      }
      function calculateWheatDemand(state, slaveEfficiency, sowingWheat) {
        const feeding = slaveWheatDemand(state) + oxenWheatDemand(state, slaveEfficiency) + horseWheatDemand(state, slaveEfficiency);
        return feeding + sowingWheat;
      }
      function calculateWheatEfficiency(wheatAvailable, totalDemand) {
        if (totalDemand <= 0) return 1;
        if (wheatAvailable >= totalDemand) return 1;
        return wheatAvailable / totalDemand;
      }
      function feedAll(state, slaveEfficiency, wheatEfficiency) {
        const sw = slaveWheatDemand(state) * wheatEfficiency;
        const ow = oxenWheatDemand(state, slaveEfficiency) * wheatEfficiency;
        const hw = horseWheatDemand(state, slaveEfficiency) * wheatEfficiency;
        return { slaveWheat: sw, oxenWheat: ow, horseWheat: hw, totalEaten: sw + ow + hw };
      }
      function produceManure(totalWheatEaten, rng) {
        if (totalWheatEaten <= 0) return 0;
        return totalWheatEaten / 100 * absGaussian(rng, 1, 0.1);
      }
      function clampManure(stockpile, used) {
        return Math.max(stockpile - used, 0);
      }
      module.exports = {
        setFeedRate,
        calculateWheatDemand,
        calculateWheatEfficiency,
        feedAll,
        produceManure,
        clampManure
      };
    }
  });

  // src/engine/workload.js
  var require_workload = __commonJS({
    "src/engine/workload.js"(exports, module) {
      "use strict";
      var { lookup, workAbilityTable, oxMultTable } = require_tables();
      var { absGaussian } = require_random();
      function calculateWorkComponents(state) {
        const avgHeight = state.pyramidHeight;
        return {
          oxTending: state.oxen * 1,
          manureSpreading: state.manureSpreadQuota * 64,
          wheatSowing: state.plantingQuota * 30,
          fieldTending: state.planted * 20 + state.growing * 15,
          wheatHarvest: state.wheatRipe * 0.1 + state.ripe * 20,
          horseTending: state.horses * 1,
          pyramidWork: state.stoneQuota * avgHeight * 12,
          temporaryWork: state.temporaryWorkAddition
        };
      }
      function sumComponents(components) {
        return Object.values(components).reduce((a, b) => a + b, 0);
      }
      function calculateTotalRequiredWork(state, rng) {
        const components = calculateWorkComponents(state);
        const sum = sumComponents(components);
        return sum * absGaussian(rng, 1, 0.1);
      }
      function calculateWorkAbility(slaveHealth, rng) {
        const base = lookup(slaveHealth, workAbilityTable);
        const variance = absGaussian(rng, 1, 0.1);
        return base * variance;
      }
      function calculateOxMultiplier(state, rng) {
        const ratio = state.slaves > 0 ? state.oxen / state.slaves : 0;
        const rawMult = lookup(ratio, oxMultTable);
        return Math.max(rawMult * state.oxenEfficiency, 1);
      }
      function calculateMaxWorkPerSlave(motivation, workAbility, oxMult) {
        return motivation * workAbility * oxMult;
      }
      function calculateSlaveEfficiency(totalWorkDone, requiredWork) {
        if (requiredWork <= 0) return 1;
        return Math.min(totalWorkDone / requiredWork, 1);
      }
      function calculateWorkDeficit(maxWork, requiredWork) {
        return Math.max(requiredWork - maxWork, 0);
      }
      module.exports = {
        calculateWorkComponents,
        sumComponents,
        calculateTotalRequiredWork,
        calculateWorkAbility,
        calculateOxMultiplier,
        calculateMaxWorkPerSlave,
        calculateSlaveEfficiency,
        calculateWorkDeficit
      };
    }
  });

  // src/engine/pyramid.js
  var require_pyramid = __commonJS({
    "src/engine/pyramid.js"(exports, module) {
      "use strict";
      var SQRT3 = Math.sqrt(3);
      function maxHeight(base) {
        return SQRT3 / 2 * base;
      }
      function maxArea(base) {
        return SQRT3 / 4 * base * base;
      }
      function pyramidHeight(base, area) {
        if (area <= 0) return 0;
        if (area >= maxArea(base)) return maxHeight(base);
        const det = base * base - 4 * area / SQRT3;
        return (base - Math.sqrt(det)) / (2 / SQRT3);
      }
      function addStones(state) {
        const added = Math.floor(state.stoneQuota * state.slaveEfficiency);
        state.pyramidStones += added;
        state.pyramidHeight = pyramidHeight(state.pyramidBase, state.pyramidStones);
        return added;
      }
      function pyramidWork(quota, currentHeight, newHeight) {
        const avgHeight = Math.ceil((currentHeight + newHeight) / 2);
        return quota * avgHeight * 12;
      }
      function pyramidGoldCost(avgHeight, stonesAdded) {
        return avgHeight * stonesAdded;
      }
      function isWin(height, max) {
        return height + 1 > max;
      }
      function setQuota(state, value) {
        if (value < 0) return { valid: false, reason: "negative" };
        state.stoneQuota = value;
        return { valid: true };
      }
      function validateQuotaInput(input) {
        const num = Number(input);
        if (input === "" || isNaN(num)) return { valid: false, reason: "invalid" };
        if (num < 0) return { valid: false, reason: "negative" };
        return { valid: true, value: Math.floor(num) };
      }
      module.exports = {
        maxHeight,
        maxArea,
        pyramidHeight,
        addStones,
        pyramidWork,
        pyramidGoldCost,
        isWin,
        setQuota,
        validateQuotaInput
      };
    }
  });

  // src/engine/health.js
  var require_health = __commonJS({
    "src/engine/health.js"(exports, module) {
      "use strict";
      var {
        lookup,
        slaveNourishmentTable,
        oxenNourishmentTable,
        horseNourishmentTable,
        slaveBirthTable,
        slaveDeathTable,
        oxenBirthTable,
        oxenDeathTable,
        horseBirthTable,
        horseDeathTable,
        lashToSicknessTable,
        laborToSicknessTable,
        oxenEfficiencyTable,
        horseEfficiencyTable
      } = require_tables();
      var { absGaussian } = require_random();
      function clamp(val, lo, hi) {
        return Math.max(lo, Math.min(hi, val));
      }
      function updateSlaveHealth(state, effectiveFeedRate, lashRate, workPerSlave, oxMult, rng) {
        if (state.slaveHealth === 0) return;
        const nourishment = lookup(effectiveFeedRate, slaveNourishmentTable) * absGaussian(rng, 1, 0.1);
        const lashSickness = lookup(lashRate, lashToSicknessTable) * absGaussian(rng, 1, 0.1);
        const laborPerSlave = workPerSlave / oxMult;
        const workSickness = lookup(laborPerSlave, laborToSicknessTable);
        const totalSickness = workSickness + lashSickness;
        state.slaveHealth = clamp(state.slaveHealth + nourishment - totalSickness, 0, 1);
      }
      function updateAnimalHealth(state, healthKey, effectiveFeedRate, nourishmentTable, agingRate, rng) {
        if (state[healthKey] === 0) return;
        const nourishment = lookup(effectiveFeedRate, nourishmentTable) * absGaussian(rng, 1, 0.1);
        const diet = state[healthKey] < 1 ? nourishment : 0;
        state[healthKey] = clamp(state[healthKey] + diet - agingRate, 0, 1);
      }
      function updateOxenHealth(state, effectiveFeedRate, rng) {
        updateAnimalHealth(state, "oxenHealth", effectiveFeedRate, oxenNourishmentTable, 0.05, rng);
      }
      function updateHorseHealth(state, effectiveFeedRate, rng) {
        updateAnimalHealth(state, "horseHealth", effectiveFeedRate, horseNourishmentTable, 0.08, rng);
      }
      function calculateBirthsDeaths(population, health, birthTable, deathTable, rng) {
        const birthRate = lookup(health, birthTable) * absGaussian(rng, 1, 0.1);
        const deathRate = lookup(health, deathTable) * absGaussian(rng, 1, 0.1);
        const births = birthRate * population;
        const deaths = deathRate * population;
        const newPopulation = Math.max(Math.round(population + births - deaths), 0);
        return { births, deaths, newPopulation };
      }
      function updatePopulations(state, rng) {
        const slaveResult = calculateBirthsDeaths(state.slaves, state.slaveHealth, slaveBirthTable, slaveDeathTable, rng);
        state.slaves = slaveResult.newPopulation;
        const oxenResult = calculateBirthsDeaths(state.oxen, state.oxenHealth, oxenBirthTable, oxenDeathTable, rng);
        state.oxen = oxenResult.newPopulation;
        const horseResult = calculateBirthsDeaths(state.horses, state.horseHealth, horseBirthTable, horseDeathTable, rng);
        state.horses = horseResult.newPopulation;
      }
      function oxenEfficiency(health) {
        return lookup(health, oxenEfficiencyTable);
      }
      function horseEfficiency(health) {
        return lookup(health, horseEfficiencyTable);
      }
      function calculateSalePrice(marketPrice, health) {
        return marketPrice * health;
      }
      module.exports = {
        updateSlaveHealth,
        updateOxenHealth,
        updateHorseHealth,
        calculateBirthsDeaths,
        updatePopulations,
        oxenEfficiency,
        horseEfficiency,
        calculateSalePrice
      };
    }
  });

  // src/engine/overseers.js
  var require_overseers = __commonJS({
    "src/engine/overseers.js"(exports, module) {
      "use strict";
      var {
        lookup,
        overseerEffectivenessTable,
        stressLashTable,
        positiveMotiveTable,
        negativeMotiveTable
      } = require_tables();
      var { absGaussian } = require_random();
      var { horseEfficiency } = require_health();
      function isWholeNumber(n) {
        return Number.isFinite(n) && n === Math.floor(n);
      }
      function hireOverseers(state, count) {
        if (!isWholeNumber(count)) return { ok: false, reason: "fractional" };
        state.overseers += count;
        return { ok: true };
      }
      function fireOverseers(state, count) {
        if (!isWholeNumber(count)) return { ok: false, reason: "fractional" };
        if (count > state.overseers) return { ok: false, reason: "tooMany" };
        state.overseers -= count;
        return { ok: true };
      }
      function obtainOverseers(state, target) {
        if (!isWholeNumber(target)) return { ok: false, reason: "fractional" };
        if (target > state.overseers) return hireOverseers(state, target - state.overseers);
        return fireOverseers(state, state.overseers - target);
      }
      function payOverseers(state) {
        const cost = state.overseers * state.overseerPay;
        state.gold -= cost;
        return cost;
      }
      function calculateOverseerEffectiveness(state, rng) {
        if (state.overseers === 0) return 0;
        const horsesToOverseerRatio = state.horses / state.overseers;
        const hEff = horseEfficiency(state.horseHealth);
        const mountedEffectiveness = horsesToOverseerRatio * hEff;
        const base = lookup(mountedEffectiveness, overseerEffectivenessTable);
        return base * absGaussian(rng, 1, 0.1);
      }
      function slaveToOverseerRatio(state) {
        return state.slaves / (state.overseers + 1);
      }
      function overseerEffPerSlave(state, overseerEffectiveness) {
        const ratio = slaveToOverseerRatio(state);
        return ratio > 0 ? overseerEffectiveness / ratio : 0;
      }
      function calculateStress(state, workDeficitPerSlave) {
        let stress, relaxation;
        if (workDeficitPerSlave > 0) {
          stress = Math.min(1, workDeficitPerSlave / 10);
          relaxation = 0;
        } else {
          stress = 0;
          relaxation = state.overseerPressure * 0.3;
        }
        state.overseerPressure = state.overseerPressure + stress - relaxation;
        return { stress, relaxation };
      }
      function calculateLashRate(state, rng) {
        const stressDrivenLashing = lookup(state.overseerPressure, stressLashTable) * absGaussian(rng, 1, 0.1);
        const oEff = calculateOverseerEffectiveness(state, rng);
        const effPerSlave = overseerEffPerSlave(state, oEff);
        return stressDrivenLashing * effPerSlave;
      }
      function calculateMotivation(state, rng) {
        const oEff = calculateOverseerEffectiveness(state, rng);
        const effPerSlave = overseerEffPerSlave(state, oEff);
        const lashRate = calculateLashRate(state, rng);
        const positiveMotivation = lookup(effPerSlave, positiveMotiveTable) * absGaussian(rng, 1, 0.1);
        const negativeMotivation = lookup(lashRate, negativeMotiveTable);
        return { positiveMotivation, negativeMotivation, total: positiveMotivation + negativeMotivation };
      }
      function handleUnpaidOverseers(state, rng) {
        if (state.gold >= 0) return null;
        const raiseMultiplier = absGaussian(rng, 1.2, 0.05);
        state.overseerPay = Math.round(state.overseerPay * raiseMultiplier);
        const raisePercent = (raiseMultiplier - 1) * 100;
        state.overseers = 0;
        return raisePercent;
      }
      module.exports = {
        hireOverseers,
        fireOverseers,
        obtainOverseers,
        payOverseers,
        calculateOverseerEffectiveness,
        slaveToOverseerRatio,
        overseerEffPerSlave,
        calculateStress,
        calculateLashRate,
        calculateMotivation,
        handleUnpaidOverseers
      };
    }
  });

  // src/engine/loans.js
  var require_loans = __commonJS({
    "src/engine/loans.js"(exports, module) {
      "use strict";
      var { lookup, debtSupportTable, repayIndexTable } = require_tables();
      var { absGaussian, gaussian } = require_random();
      function calculateRealNetWorth(state) {
        const land = state.fallow + state.planted + state.growing + state.ripe;
        return state.slaves * state.slavePrice * state.slaveHealth + state.oxen * state.oxenPrice * state.oxenHealth + state.horses * state.horsePrice * state.horseHealth + land * state.landPrice + state.manure * state.manurePrice + state.wheat * state.wheatPrice + state.gold - state.loan;
      }
      function calculateGrossWorth(state) {
        const land = state.fallow + state.planted + state.growing + state.ripe;
        return state.slaves * state.slavePrice + state.oxen * state.oxenPrice + state.horses * state.horsePrice + land * state.landPrice + state.manure * state.manurePrice + state.wheat * state.wheatPrice + state.gold;
      }
      function headroomFraction(state) {
        if (state.creditLimit <= 0) return 1;
        return (state.creditLimit - state.loan) / state.creditLimit;
      }
      function borrow(state, amount) {
        const available = state.creditLimit - state.loan;
        if (available <= 0) return { ok: false, amount: 0 };
        const actual = amount == null ? available : amount;
        if (actual <= 0) return { ok: false, amount: 0 };
        if (actual > available) return { ok: false, needCreditCheck: true, amount: 0 };
        state.gold += actual;
        state.loan += actual;
        if (headroomFraction(state) < 0.2) {
          state.interestAddition += 0.2;
        }
        return { ok: true, amount: actual };
      }
      function creditCheckFee(rng, totalDebt) {
        return totalDebt * gaussian(rng, 0.05, 0.01);
      }
      function offerCreditCheck(state, amount) {
        const totalDebt = state.loan + amount;
        const fee = creditCheckFee(state.rng, totalDebt);
        const needed = totalDebt > state.creditLimit;
        return { needed, fee, realNetWorth: calculateRealNetWorth(state) };
      }
      function executeCreditCheck(state, amount) {
        const totalDebt = state.loan + amount;
        const fee = creditCheckFee(state.rng, totalDebt);
        state.gold -= fee;
        const rnw = calculateRealNetWorth(state);
        const newLimit = Math.max(rnw * state.creditRating, state.creditLowerBound);
        state.creditLimit = newLimit;
        const available = newLimit - state.loan;
        if (amount <= available) {
          state.gold += amount;
          state.loan += amount;
          if (headroomFraction(state) < 0.2) {
            state.interestAddition += 0.2;
          }
          return { ok: true, granted: true, amount, fee, newLimit };
        }
        return { ok: true, granted: false, amount: 0, fee, newLimit };
      }
      function repay(state, amount) {
        if (amount > state.gold) return { ok: false, reason: "insufficientGold" };
        if (amount <= 0) return { ok: false, reason: "invalidAmount" };
        if (amount > state.loan) amount = state.loan;
        const ratio = amount / state.loan;
        state.gold -= amount;
        state.loan -= amount;
        if (state.loan === 0) {
          state.creditRating += (1 - state.creditRating) / 3;
          state.interestAddition *= 0.8;
        } else {
          const repayIndex = lookup(ratio, repayIndexTable);
          state.creditRating = Math.min(1, state.creditRating * repayIndex);
          state.interestAddition /= repayIndex;
        }
        return { ok: true, amount, loanRemaining: state.loan };
      }
      function monthlyInterest(state) {
        if (state.loan <= 0) return 0;
        const interest = state.loan * (state.interestRate + state.interestAddition) / 100;
        state.gold -= interest;
        return interest;
      }
      function adjustCreditRating(state) {
        if (state.loan > 0) {
          state.creditRating *= 0.96;
          state.interestAddition *= 1.02;
        } else {
          state.creditRating += (1 - state.creditRating) / 10;
          state.interestAddition *= 0.95;
        }
      }
      function processEmergencyLoan(state) {
        if (state.gold >= 0) return { needed: false };
        const deficit = Math.abs(state.gold);
        const emergencyAmount = deficit * 1.1;
        if (state.loan + emergencyAmount > state.creditLimit) {
          state.gameOver = true;
          return { needed: true, bankruptcy: true, emergencyAmount };
        }
        state.creditRating -= (1 - state.creditRating) / 3;
        state.interestAddition += 0.2;
        state.loan += emergencyAmount;
        state.gold = 0;
        return { needed: true, bankruptcy: false, emergencyAmount };
      }
      function checkForeclosure(state) {
        if (state.loan <= 0) return { foreclosed: false, warning: false };
        const nw = calculateGrossWorth(state);
        const debtToAssetRatio = nw > 0 ? state.loan / nw : 0;
        const debtSupportLimit = lookup(state.creditRating, debtSupportTable);
        if (debtToAssetRatio > debtSupportLimit) {
          return { foreclosed: true, warning: false, debtToAssetRatio, debtSupportLimit };
        }
        if (debtToAssetRatio > 0.8 * debtSupportLimit) {
          return { foreclosed: false, warning: true, debtToAssetRatio, debtSupportLimit };
        }
        return { foreclosed: false, warning: false, debtToAssetRatio, debtSupportLimit };
      }
      function handleNegativeGoldOverseers(state, rng) {
        if (state.gold >= 0 || state.overseers <= 0) return { fired: false };
        const prevPay = state.overseerPay;
        state.overseers = 0;
        state.overseerPay *= absGaussian(rng, 1.2, 0.05);
        const raisePercent = (state.overseerPay - prevPay) / prevPay * 100;
        return { fired: true, raisePercent };
      }
      module.exports = {
        borrow,
        offerCreditCheck,
        executeCreditCheck,
        repay,
        monthlyInterest,
        adjustCreditRating,
        processEmergencyLoan,
        checkForeclosure,
        handleNegativeGoldOverseers,
        calculateRealNetWorth,
        calculateGrossWorth,
        headroomFraction,
        creditCheckFee
      };
    }
  });

  // src/engine/market.js
  var require_market = __commonJS({
    "src/engine/market.js"(exports, module) {
      "use strict";
      var { gaussian, absGaussian, uniform } = require_random();
      var PRICE_FIELDS = [
        "wheatPrice",
        "landPrice",
        "horsePrice",
        "oxenPrice",
        "slavePrice",
        "manurePrice",
        "overseerPay",
        "interestRate"
      ];
      var COMMODITIES = ["wheat", "land", "manure", "slave", "horse", "oxen"];
      var COMMODITY_PRICE_MAP = {
        wheat: "wheatPrice",
        land: "landPrice",
        manure: "manurePrice",
        slave: "slavePrice",
        horse: "horsePrice",
        oxen: "oxenPrice"
      };
      function totalLand(state) {
        return state.fallow + state.planted + state.growing + state.ripe;
      }
      function updateInflation(state, rng) {
        state.inflation += gaussian(rng, 0, 1e-3);
      }
      function updatePrices(state, rng) {
        for (const field of PRICE_FIELDS) {
          state[field] *= absGaussian(rng, 1 + state.inflation, 0.02);
        }
      }
      function runSupplyDemandCycle(state, commodity, rng) {
        const priceField = COMMODITY_PRICE_MAP[commodity];
        state.demand[commodity] *= 1 + state.worldGrowth / 12;
        const monthlyDemand = state.demand[commodity] / 12;
        state.supply[commodity] -= monthlyDemand * 0.8;
        if (state.supply[commodity] < 0) {
          state[priceField] *= uniform(rng, 1, 1.2);
          state.production[commodity] *= uniform(rng, 1, 1.1);
        }
        state.supply[commodity] -= monthlyDemand * 0.2;
        state.supply[commodity] = Math.max(0, state.supply[commodity]);
        if (state.supply[commodity] > 0) {
          state[priceField] *= uniform(rng, 0.8, 1);
          state.production[commodity] *= uniform(rng, 0.9, 1);
        }
        state.production[commodity] *= uniform(rng, 0.95, 1.05);
        state.supply[commodity] += state.production[commodity] / 12;
      }
      function runAllSupplyDemandCycles(state, rng) {
        for (const commodity of COMMODITIES) {
          runSupplyDemandCycle(state, commodity, rng);
        }
      }
      function calculateOwnershipCosts(state, rng) {
        const land = totalLand(state);
        const baseCost = land * 100 + state.slaves * 10 + state.horses * 5 + state.oxen * 3;
        const factor = absGaussian(rng, 0.7, 0.3) + 0.3;
        const actualCost = baseCost * factor;
        state.gold -= actualCost;
        return { baseCost, actualCost };
      }
      function calculateNetWorth(state) {
        const land = totalLand(state);
        const grossWorth = state.slaves * state.slavePrice + state.oxen * state.oxenPrice + state.horses * state.horsePrice + land * state.landPrice + state.manure * state.manurePrice + state.wheat * state.wheatPrice + state.gold;
        const debtToAssetRatio = grossWorth === 0 ? Infinity : state.loan / grossWorth;
        const netWorth = grossWorth - state.loan;
        return { netWorth, debtToAssetRatio };
      }
      module.exports = {
        totalLand,
        updateInflation,
        updatePrices,
        runSupplyDemandCycle,
        runAllSupplyDemandCycles,
        calculateOwnershipCosts,
        calculateNetWorth,
        PRICE_FIELDS,
        COMMODITIES,
        COMMODITY_PRICE_MAP
      };
    }
  });

  // src/engine/messages.js
  var require_messages = __commonJS({
    "src/engine/messages.js"(exports, module) {
      "use strict";
      var { pick, randomInt } = require_random();
      var openingMessages = [
        "Welcome to the game of Pharaoh.",
        "Oh great and powerful Pharaoh, welcome to thy domain.",
        "The game of Pharaoh is about to begin.",
        "Hear ye one, and hear ye all. Here begineth the game of Pharaoh.",
        "Now begins the greatest of all games. The king has taken his seat. The Game of Pharaoh is about to begin.",
        "Blessed art thou oh great and dread lord. Hail thee Pharaoh, king of all the realm.",
        "Prepare yourself for the greatest of all games. You are about to play,,,,, Pharaoh.",
        "Mere mortal, dare you to attempt to play the game of games? Then ready yourself. Pharaoh is about to begin.",
        "How high can you build your pyramid in 20 years?",
        "Many have tried, but few have succeeded. Try if you will, but beware. Such matters are the domain of kings, and not meant for the hands of mere mortal men.",
        "Well, glad you could make it. This is the game of Pharaoh. Sit down. Relax. And prepare yourself. It begins.",
        "Congratulations. You have just started up the game of Pharaoh. Now prepare yourself for battle in the world of ancient gods.",
        "Are you prepared to match wits with the kings of old? Ancient ones who have learned great mysteries. Fare ye well, for luck you will surely need.",
        "It takes great courage to do what you have done. But now you must face up to your decision. The test of pharaoh is upon you.",
        "Can you withstand the test of kings, and the trial of power. Power is given to you, a land to rule. Rule it wisely and build a powerful nation. Then, if you dare, erect a monument to challenge the gods themselves.",
        "Come into my kingdom young one. I give thee the staff of law and the crown of power. Decide wisely your course of action. You are now,,,,,,,,,,,, pharaoh.",
        "So, you would like to be a king eh? Well, let's see if you can really cut it.",
        "Those who aspire to be kings must pay the price of decision, and pass the test of knowledge. You have dared, so now the trial begins.",
        "If you want to hear something clever, start the game over. I'm tired of coming up with new sayings all the time.",
        "You dare to present yourself as one who could rule? You miserable weakling, do you think that you could decide between life and death for a nation? Since you have been so presumptuous, your wish is granted. Go forth and be,,,,,, pharaoh.",
        "Good luck, you're going to need it.",
        "Consider well your course. You have challenged the gods to make you a king. So be it. King you are. But beware, it's not as easy as you think.",
        "oooooooo oooo oo oooo oooo o o o Gods of power, gods of strength. Show this fool that not just anyone can be a king.",
        "The deed is done, the time has come. You pretend to be the one. To rule the land you now must try, but if you fail, then you must die. Good luck.",
        "Fire and plague, pestilence and famine. Wars and droughts and rebellion and strife. These are the payment for those who would be king.",
        "How good are you at handling riots? Do you know how much an ox eats each month? How much fertilizer does an acre of land require? How many soldiers do you need to protect your land? Well, you are going to find out.",
        "The time has come, the hour is near, and even though you shake with fear, you must press on and find the path, gee you smell, please take a bath.",
        "You look familiar, haven't we met before?",
        "One day, you might just win this game. Maybe today."
      ];
      var winMessages = [
        "You have won. You are wonderful. Hurray for you.",
        "Wow! I never expected you to do it. You are great.",
        "Your pyramid is complete! Strike up the band.",
        "What a beautiful pyramid. It's so high and wide. Now you can die in peace.",
        "This is terrific. You have done it."
      ];
      var farewellMessages = [
        "We are all so proud of you. You did a great job. Thanks for playing.",
        "Boy what a fun time we all had playing with you. And the Banker didn't really mean all those mean things he said either. Bye Bye.",
        "Well, you did it. And we never had any doubts at all, did we guys? Thanks for that great little slice of life. Adios.",
        "Of all the pharaohs we have served, you were the best. Sorry you had to die. But you've completed a great tomb to spend eternity in.",
        "Good work fella. We are all very very proud of you. Now you can die in peace."
      ];
      var idlePepTalkMessages = [
        "Hey, I've got a dirty joke for you. . . . A white horse fell in the mud. Ha ha ha ha ha ha ha ha ha ha ha ha ha.",
        "Of all the felt I ever felt, I never felt felt that felt like that felt felt.",
        "Got any gum?",
        "You look pensive.",
        "Can I help with anything?",
        "What's taking so long?",
        "Why are you staring at me like that?",
        "OK, let's get back to work.",
        "Let's get down to business here.",
        "I want to see activity. You can't run a kingdom by staring at a computer screen. Buy! Sell! Get to work.",
        "Boy, these months seem to be going by slower and slower.",
        "Is anything the matter?",
        "Boy are you ugly.",
        "Hoooooo oo oooo oooooo ooooooo oo oo o o oooooo o o oo oooo oooooooo o o.",
        "OK, stand up for exercises. 20 jumping jacks, ready? 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20. Good, now cool down and relax.",
        "You're getting sleepier and sleepier. Your eyes are closing. Now get up and bark like a dog.",
        "You look tired. Maybe you should just pack it in.",
        "Wake up, get going. Let's make some progress here.",
        "My apologies to the talking moose.",
        "Hey, we've got lots of work to do. Now let's get busy.",
        "If you don't do something soon, I may just run a month anyway.",
        "I'm getting tired of waiting for you to make up your mind.",
        "Decisions, decisions. What to do, what to do.",
        "Maybe a cup of coffee would loosen up your brain cells.",
        "Maybe a shot of whisky would clear the cobwebs.",
        "What would happen if I hit the run button about now.",
        "Do you know all the keyboard shortcuts? They sure make things easier.",
        "Why aren't you paying attention to me like you used to. Is there someone else?",
        "Ho hum.",
        "Get the lead out.",
        "Boring. Very boring.",
        "Gosh, you sure are indecisive.",
        "Wishy washy. Make a move.",
        "Haven't you got the guts to try something.",
        "Let's go, I can't wait all day!",
        "Let's go now! I'm really getting tired of this.",
        "What did one eye say to the other? There's something between us that smells.",
        "It's so exciting when you look at me that way.",
        "Go for it, it's the best you've got.",
        "Abracadabra. You're a toad.",
        "You have a little bit of goop in your eye.",
        "Could you possibly breathe in a different direction? P U.",
        "This is getting ridiculous. Let's get the show on the road.",
        "snervelapitosisan nortilanimus. Gorthan shalumon, anthor saliday gamucha. Ventas cambosh goomidge.",
        "Icky, icky, icky.",
        "Oh my god, look behind you!",
        "Have you ever wondered about the meaning of life? I mean, why are we here? There must be more to all this than playing silly computer games.",
        "I'm hungry. How about a hot dog.",
        "How about some music, got any Strawberry Alarm Clock?",
        "Does anybody remember laughter?",
        "Badges? We don't got no badges. We don't need no badges. I don't have to show you no stinking badges!",
        "Do you feel lucky punk?",
        "Your mouthwash ain't making it.",
        "There is a multi-legged creature on your shoulder.",
        "I know what time it is. I don't need a blooming cuckoo clock.",
        "Beam me up Scotty.",
        "Book him Danno!",
        "Just the facts ma'am.",
        "Warning Will Robinson.",
        "There are always possibilities."
      ];
      var genericChatMessages = [
        "So, how ya doin there ol' buddy boy?",
        "Yo! Pharaoh! Hows tricks. Farm runnin ok?",
        "Say, did you ever try selling slaves as a business. Yeah it's a bit seedy, but you can make some dough!",
        "My brother-in-law feeds his horses more than 90 bushels a month. Can you beat it? Of course they seem to enjoy it.",
        "I had a buddy once who was determined to make his slaves work an acre apiece. They all died of course.",
        "Some guys will put 50 slaves to an acre. This seems a lot to me.",
        "Have you ever noticed that slaves mate more when they eat well?",
        "Razifratsasammanala! I just ran my fields with 10 tons of manure per acre. I had a horrible crop.",
        "Yeah, fertilizer stinks, but it sure helps! A couple of tons per acre and zowie bowie, the crops take right off.",
        "I have given 3 horses to each of my overseers. They love it. My slaves are far more organized now.",
        "My aunt gussie used to give every two slaves their own ox. They had tremendous capacity to do work.",
        "When my uncle finally figured out how much manure to use, he was growing crops in January that were bigger than any of his old July crops had been.",
        "Some kings have been saying lately that a slave should be able to lay 3 pyramid stones per month. I'm not sure I buy it.",
        "It stands to reason! Pyramids get harder to build as they get higher.",
        "My cousin jake once enforced his quotas so firmly, that his overseers beat all his slaves to death. Then they all quit.",
        "My father always used to say: 'keep your slaves fat and happy, and they will never revolt.'",
        "Nice day, isn't it.",
        "Excuse me, but the wife sent me over to borrow a cup of sugar.",
        "My mama told me: 'Son, never overwork your slaves. Otherwise they might be too tired to feed your horses.'",
        "Looks like rain.",
        "Care for a show?",
        "Hey, how about those Crocks?",
        "My son just bought one of those big boom boxes. Jeez what a racket.",
        "Hey, any fanatics stood on their heads in your fields? They ruined several of my crops!",
        "Your nationalist policies are a bit stringent.",
        "I don't like the color of your hair.",
        "oooooooo oooo o o oooo. What a hangover. o o o hooooee.",
        "Hey, come on over later for a party. Should be some fun!",
        "We should get together sometime to see if we can't standardize on our slave branding techniques.",
        "I love your sandals!",
        "God, I love hot peppers, don't you?",
        "Anyway, I figure that if I want to build a pyramid of any decent size, say 1000 feet, then I am going to have to employ around 100000000 slaves for several years.",
        "I hear old Nebuchadnezzar is going to fight the Hittites again. Last time he did that, he lost half his kingdom.",
        "Ya gotta make sure your slaves stay healthy. They can get real sick without your knowing it. And your overseers will make them work by beating them. Next thing you know, they're all dead.",
        "Hey, sorry about last night. I didn't mean to drink so much wine. Guess I made kind of an idiot out of myself.",
        "My wife asked me to tell your wife that she loved her dress at the party the other night.",
        "Try to keep your assets at least twice as valuable as your debts. Otherwise the bank might be tempted to foreclose."
      ];
      var dunningMessages = [
        "I want that dough, and I want it now!",
        "Get on your chariot and get over here. You owe us money, and we want it.",
        "Excuse us, but we have a little matter of a loan to discuss. Would you please come by so we can chat.",
        "I want that dough you owe me!",
        "Repay loan. Repay loan. Repay loan. Repay loan. Repay loan.",
        "If I cut off your right ear, and your left little toe, do you think it might convince you to come in and pay your loan?",
        "Have you ever met Olaf? We sometimes send him around to deadbeats like you, to collect loan payments. You don't want to meet Olaf. Really you don't.",
        "Olaf! Here boy.",
        "How in the world did you ever get credit at our bank. It will be a long time before we give you another loan.",
        "I would like to mention at this point, that you owe us money. When may we expect payment?",
        "When are you going to make your just debt right?",
        "We loaned you that money in good faith. Now we would appreciate payment in equally good faith.",
        "We don't bother with debtor's prison around here. We just kill you, and take all your property.",
        "We have ways of dealing with people like you who never pay their debts.",
        "I call upon the gods: Sutec, Ra, Horus and Liela, to pour plagues and misfortune upon you until you make a payment on your loan.",
        "A payment on your loan today, will make these messages go away.",
        "We think you ought to pay your loan. Or you might find us on the phone. We'll call and visit and ruin your day. We'll make you sweat until you pay. Burma shave.",
        "We haven't heard from you for such a long time, that we thought we'd come and visit you. Where's our dough?",
        "This is just a friendly reminder. You owe us money. Please pay. Do it now. Why wait.",
        "If you like your eyes, do exactly as I say. Move the mouse to the loan box and click. Select repay. Enter a suitable amount. Click on OK.",
        "Please pay your loan or you will get more poetry like this. . . Oh for the days when life was gay, and men were full of courage. But woe am I for now I cry over times when men eat porridge.",
        "Would you mind making a payment or two on your loan.",
        "You deadbeats are all the same. Never pay your loans. Now please make a payment.",
        "If you don't make a payment soon, we may have to foreclose on your property.",
        "You sure aren't doing your credit rating any good. Please make a payment on your loan.",
        "May we respectfully remind you that you owe us some dough?",
        "Pay up your loan, or we'll break your legs.",
        "Please, Please, Please, think about paying your loan.",
        "Interest payments, like your mouthwash, aren't making it! Pay up now!. (Sorry Clint.)",
        "It's time for you to make another loan payment buddy boy. You'd better do it soon!",
        "You are in default of your loan. If you don't pay up soon, we will kill you.",
        "We haven't seen you at the bank for a while. We would like to see you. Now. Right now.",
        "This game can end very quickly. Would you like that? If so, continue to disregard your loan.",
        "You had better make your loan payments in a hurry.",
        "Our tellers are getting old and grey waiting for you to make the payments you have promised.",
        "We are considering foreclosure. Please pay now.",
        "If we don't receive payment from you soon, we will be forced to turn your name over to Olaf's collection agency.",
        "Avoid the disgrace and embarrassment of bankruptcy. Pay your debts now.",
        "You would be more than just wise to pay your debts now. You might also be living longer.",
        "I'm afraid your health is being threatened by your delinquent account. If you get my drift.",
        "We are here to help you. How can we help you pay this loan. I am sure we could think of a way."
      ];
      var foreclosureWarningMessages = [
        "Warning! You are in severe danger of foreclosure.",
        "Your lawyer has been contacted. The bank is preparing to foreclose.",
        "Take this seriously! Your debt is too great, your assets too low. The bank is seriously contemplating foreclosure.",
        "Beware. You must placate the bank very soon. Foreclosure proceedings have already been started.",
        "You are in severe danger of losing your estate. The bank has begun serious foreclosure discussions.",
        "You are in big trouble buddy. If you don't pay some of your debt, or gain some assets soon, the bank will foreclose.",
        "You had better turn this business around real fast. The bank is very very uneasy about your debt.",
        "The bank is getting afraid that you will lose the assets you still have. They are planning to seize them soon.",
        "This business is really on the rocks. The bank is preparing foreclosure documents. You will be served soon.",
        "Be prepared for the repo man. He's coming soon to take your property.",
        "Have you noticed that the guys in the bank are avoiding you? They are considering repossession!",
        "Get your act together real soon! You are about to lose this game.",
        "This is no joke. You are about to lose everything you have worked for! Get this business running right!",
        "You are quickly losing this game. You have too much debt, too few assets.",
        "You will lose this game in the next few turns.",
        "I like beating you. It's fun.",
        "You are about out of luck. Maybe you should just give up.",
        "Your debt is way out of line with your assets. I can't let you keep this up much longer.",
        "Forget it. You are really playing this game badly.",
        "Kings who run their kingdoms into the ground like you are doing, usually get their heads handed to them on a plate."
      ];
      var foreclosureMessages = [
        "I am sorry, but your assets can no longer support your loan. We are forced to foreclose on you. Goodbye.",
        "Foreclosure proceedings are always so uncomfortable. Sorry about this. Good bye.",
        "You should have kept your credit rating higher. The bank no longer trusts you to pay back their goods. They are seizing your property and writing you off.",
        "You blew it. The bank is foreclosing on your property. You were warned!",
        "It's not as though we didn't warn you that this would happen. Your debts are too high, your assets too low, and your history stinks. Good bye.",
        "Well, you have lost. I told you it would happen didn't I. Next time try not to get so deeply in debt. Adios muchacho.",
        "Well, you've played this game about as badly as you could. Your debt is too high for your assets to support. You have failed big. Toodles.",
        "Goodbye. You had your chance and you blew it. No more chances. It's over.",
        "The first time I looked at you I thought you'd be a flop as a king. I was right. Goodbye.",
        "So now you know: Being a king is harder than it looks.",
        "You have let your financial position become too weak to continue. Farewell.",
        "So long, farewell, auf wiedersehen, goodbye. Toodaloo.",
        "That's all folks. You lose.",
        "It certainly was nice playing with you. Please come back again some time and try again!",
        "I'm sorry, you have lost your kingdom. Please come back soon and try again."
      ];
      var cashShortageMessages = [
        "oh oh. You have run out of cash!!",
        "Defaulting on your payments will not help your credit rating.",
        "Hey! You have run out of money. How can you pay your bills?",
        "Ooops, you are bouncing checks ol' buddy boy.",
        "The bank watched with interest as you ran out of dough this month.",
        "You ran out of money! How could you do that? Oh I am so embarrassed for you.",
        "Shoddy operation there old sport. You ran out of cash. Wish I could loan you a little, but I don't believe in that sort of thing.",
        "Hey! You have run out of cash. Gee I sure hope the bank will give you a loan.",
        "You have used all your fluid capital. Now you will have to go crawling on your belly to the bank and hope that they will have mercy on you.",
        "Careless, careless. You have run out of cash."
      ];
      var bankruptcyMessages = [
        "The party's over. You have run out of dough, and the bank doesn't want to see your face.",
        "The bank officer sneers as he boots you out of his office. You are out of it buddy. No dough, no go.",
        "Ha Ha Ha Ha Ha. Got another one. You have lost. No dough, and No Credit.",
        "Bankruptcy! You have lost the big one.",
        "Your kingdom is pushing daisies Pharsie Warsie. You are out of cash, and the bank hates you.",
        "We'll meet again, don't know where, don't know when. But I know we'll meet again some sunny day.",
        "Ha ha ha ha ha, you lost. Ah ha ha ha ha ha ha. I think this is so funny. Ha ha ha ha ha ha ha ha ha ha ha.",
        "Do you know what it means when you have run out of money, and the bank won't extend you a loan? It means that the game is over.",
        "oooooooooooooooooooooooooooooooooooooooooooooooooooooo. This game is over now.",
        "Well, we got you ace. You through, kaput."
      ];
      var creditCheckFeeMessages = [
        "oooooo, I don't know about this. That's more than your credit limit. I'm afraid it will cost you %.0f to have your credit limit reassessed.",
        "Ha ha ha ha ha. Ah ha ha ha ha. Its going to cost you %.0f to find out if you've even got the credit. Ha ha ha ha ha ha ha.",
        "Well now. You seem to have exceeded your current line of credit. If you must have this loan, it will cost you %.0f for another credit check.",
        "Your credit is blown. Pay %.0f and we'll see if you deserve a higher line of credit.",
        "You deadbeats are all the same. Loan after loan. Well it's gonna cost you %.0f to find out if you've even got the credit rating.",
        "Your current credit rating won't allow such a loan. If you would like we can run another credit check. You might just qualify. But it will cost you %.0f. Do you want to do it?",
        "We will gladly run a credit check to see you qualify. It will cost you %.0f, and you won't get it back if you don't qualify. Sound like a deal?",
        "Oh, I just love charging money for things. You have to pay %.0f to see if you qualify for that loan.",
        "Pay %.0f right now, and we might just be able to find that loan for you.",
        "Well, the loan officers are not inclined to grant you this loan. But if you pay me %.0f I might be able to talk them into it. No guarantees though.",
        "You pay your money, you take your chances. A credit check is going to cost you %.0f non-refundable.",
        "%.0f will be the cost, if you fail it's lost. Credit checks are fun when you hold the gun.",
        "It's up to you, whatever you do. Pay %.0f to see what the answer will be.",
        "I might just be able to do something for you here. But it will cost you %.0f to find out.",
        "Isn't capitalism great. I am now going to charge you %.0f just to see if you qualify for this loan. And if you don't, I keep the money anyway."
      ];
      var loanApprovalMessages = [
        "OK, you get the loan. %.0f at %.2f%%.",
        "It would appear that you have sufficient collateral for a loan of %.0f at %.2f%%.",
        "Big deal, so you've got the credit for %.0f. But can you afford %.2f%% interest. Ha ha ha ha ha.",
        "Lucky break for you! %.0f at %.2f%% is not a bad deal, considering.",
        "We'll get you next time deadbeat. This time you get %.0f at %.2f%%.",
        "After much thought and deliberation, we could not find any good reason not to give you %.0f at %.2f%%.",
        "As much as we would have liked to turn you down, we couldn't find any good reason. Your loan is %.0f at %.2f%%.",
        "How does %.0f sound? Good? I'm glad you approve. Oh yes. The bad news is that you have to pay %.2f%% interest.",
        "We like your face. (gasp, barf.) We will give you %.0f at %.2f%% if you will just take your money and get out of here.",
        "How could we say no to breath like yours. Here is %.0f at %.2f%%.",
        "I am most appreciative of the opportunity to serve you. (retch, puke) You are granted %.0f at %.2f%%.",
        "Well I wish I could have turned you down. I always feel better when I can ruin someone's life. But the boss says you get %.0f at %.2f%%.",
        "We were about to turn you down, but then you might come back in here, and we couldn't bear that thought. We will give you a loan for %.0f at %.2f%%.",
        "%.0f is a lot of money. Make sure you don't spend it all in one place. And make sure you make your %.2f%% interest payments.",
        "Done. %.0f at %.2f%%."
      ];
      var loanDenialMessages = [
        "Oh I'm so sorry. We just can't seem to find that loan for you. I hope you haven't been too inconvenienced by this. Have a nice day.",
        "One look at you, and I knew you were a deadbeat. Why'd you ever think a credible institution like this would give you a loan. Ha ha ha ha ha ha ha.",
        "Ha ha ha ha ha. Ah ha ha ha ha. Ha ha ho ho ha ha ha. NO DEAL! Ha ha ho ho ho ho ho. Ha ha ho ho ho ho.",
        "This is just the very most favorite part of my job. I love telling people that they didn't get the loan. Now get lost loser.",
        "We tried very hard to find a loan for you. But you are such an obvious loser that there just wasn't any way. Sorry about that.",
        "If I didn't enjoy this so much, I might feel bad for you. But I don't. You don't get the loan.",
        "I'm happy to say, that we won't pay. So hop on your horse and be on your way.",
        "All it took was one good look, and we knew you were a schnook. No loan, no cash, no deal.",
        "It gives me great pleasure to tell you that we have not approved your loan. And you are ugly too.",
        "Life is tough sometimes. But you've got to go with it. Roll with the punches so to speak. No loan.",
        "NO, NO, NO, NO, NO, NO, NO, NO, NO.",
        "Well, after lots of consideration, we have come to the conclusion that you really deserve that loan. But we aren't going to give it to you.",
        "OK. Loan approved. Stop in next week to pick up your check. Goodbye. (just kidding, ha ha ha)",
        "So, you want a loan eh? Well let's see now. No. sorry, no.",
        "God I love this. Get lost!"
      ];
      var loanRepaymentMessages = [
        "Congratulations! You have paid back your loan.",
        "Well done my boy. Your loan is completely repaid. Care for another, or shall we leave it at that.",
        "My but we are going to miss those nice little interest payments you've been making.",
        "Hey, what's the rush? Why don't you borrow some more?",
        "Big deal. You want a medal now?",
        "Sir. There is a multi-legged creature on your shoulder.",
        "Badges? We don't have no badges. We don't need no badges. I don't have to show you no stinkin badges."
      ];
      var loanRepaymentSignoffMessages = [
        "Well King, this case is closed.",
        "Holy amortization Batman.",
        "Oh Pancho. Oh Cisco.",
        "Truth, Justice and the American way.",
        "Happy trails to you, until we meet again.",
        "You'll be back. They always come back.",
        "Quiet in the peanut gallery.",
        "Good night John boy."
      ];
      var supplyLimitMessages = [
        "I am afraid I can't accept any more than %.0f. My store rooms are full enough as it is.",
        "Why is everybody unloading this stuff. I can only take %.0f.",
        "I will take %.0f. You will have to keep the rest.",
        "Finding buyers for this stuff is impossible. I will only take %.0f.",
        "I am afraid there is a bit of a glut in this commodity. I can only take %.0f.",
        "Yikes! Everybody has had enough of this stuff. I can only take %.0f.",
        "Sorry, %.0f is all I am willing to take right now.",
        "You can't force me into taking more than %.0f. I know my rights!",
        "Gee, I wish I could help you. But all I can take right now is %.0f. Sorry."
      ];
      var demandLimitMessages = [
        "I am afraid that I can only spare %.0f.",
        "There has really been a run on this stuff lately. I only have %.0f left.",
        "Everybody and his brother wants some. I can only let you have %.0f.",
        "I hope %.0f is sufficient, it's all I have left.",
        "The whole kingdom beat you here. All I have left is %.0f.",
        "Wow, what a day. First the butcher's wife and now you. I'm afraid I only have %.0f left in stock.",
        "Wait just a minute. Let me check in the back room. . . . . Nope, %.0f is all I have left. Sorry about that.",
        "Somebody just beat you to it. They took all but %.0f. But you are welcome to take that."
      ];
      var transactionSuccessMessages = [
        "This transaction was successfully concluded.",
        "Thank you for buying my quality merchandise.",
        "You are a gentleman and a scholar. A pleasure doing business.",
        "Contract terminated. All goods delivered.",
        "Great. Thanks. It's over now.",
        "I have delivered all the goods we agreed upon. Thank you for a pleasant association.",
        "It was great doing business with you.",
        "Thank you for the sale. I hope you enjoy your goods.",
        "I left your goods in the barn. Thanks for buying them. Bye."
      ];
      var insufficientFundsMessages = [
        "You only have the cash for %.0f.",
        "Hey, no credit! You can only afford %.0f.",
        "OK Deadbeat, you know as well as I do that you only have the cash for %.0f.",
        "For crying out loud, you can't buy more than %.0f!",
        "Oh! A joke. Ha ha Ha. oooooooo oo oo. You can only afford %.0f.",
        "How can you expect to be taken seriously when you can't even count. You can only afford %.0f.",
        "You don't have enough money ace.",
        "Even if you used all your cash, you could only buy %.0f.",
        "Hey, do your homework before you come in here. You don't have enough money for that."
      ];
      var sellMoreThanOwnedMessages = [
        "Hey, you can't sell that much!",
        "We used to hang people for trying to sell more than they have.",
        "You only have %f, how can you sell more?",
        "If you take a good close look at your books, you will see that you have only %f.",
        "%f is all you have. Please don't try to sell more. I may have to get violent."
      ];
      var counterpartyDefaultMessages = [
        "I'm terribly sorry, but I must cancel our agreement.",
        "Buzz off dork. I'm not doing business with you.",
        "Sudden circumstances make it impossible to continue with our agreement.",
        "Unfortunately, an error has been made. This contract must be cancelled.",
        "I am afraid I couldn't pay you if we continued this contract.",
        "There has been a small change in plans. . . . I am cancelling our agreement as of now.",
        "It just so happens that I got a much better deal from the Gasokary down in the valley. So I am afraid I must abort our tentative plans.",
        "I honestly didn't think you were serious. I have since made other arrangements. Sorry about this. I'll catch you next time for sure."
      ];
      var counterpartyPartialPaymentMessages = [
        "I am afraid I can't accept a complete shipment this month.",
        "Will you please hold some of it till next month.",
        "Due to bad weather, my funds have not arrived from Tunzankipital. I will pay what I can. Please hold the rest.",
        "Have no fear. Next month I will be able to take complete delivery. But this month I cannot.",
        "I fear that I cannot take it all this month.",
        "I really am quite sorry about this, but I just can't seem to raise all the necessary funds. I'll be back next month for the rest. You can depend on it.",
        "Oh gee, I must have left my wallet at home. Well I have a little money with me, I'll bring the rest next month. Trust me.",
        "You look like an understanding fella. You know how it is. Sometimes you just can't get all the dough. Next month for sure."
      ];
      var counterpartyPartialShipmentMessages = [
        "I'm afraid I don't have all the goods for you this month.",
        "Next month I will have the rest of your delivery.",
        "Due to circumstances beyond our control, some of your goods have been backordered.",
        "Can't do it all this month chum. We'll get around to it in a few weeks.",
        "Most great apologies. But goods have not yet been completed. Please wait till next month.",
        "Can I help it if my suppliers are turkeys? I wasn't able to completely fill your order. I'll make it good next month.",
        "Hey, life is hard. I just couldn't find everything you asked for. Next month for sure.",
        "This isn't my fault. My people really let me down. I'll try to complete your order next month."
      ];
      var playerInsufficientGoodsMessages = [
        "You don't have sufficient goods to sell.",
        "You have not met your contract.",
        "You have insufficient goods.",
        "You are a dirty welcher.",
        "You better have it all next month.",
        "Hey! You didn't send me everything. What am I supposed to do now, I need those goods!",
        "I was depending on receiving all the goods. Now you turn up short. Is this how you usually do business?",
        "If I'd known you weren't going to deliver all the goods on time I would have taken my business elsewhere.",
        "Why haven't you sent me all the goods we agreed upon? This is going to cost you!",
        "It'll be a cold day in Hades before I buy anything from you again! You'd better have the balance next month!"
      ];
      var playerInsufficientFundsContractMessages = [
        "Hey, you don't have the money to pay me for my goods.",
        "Welcher! You said you'd pay. Now you don't have the dough.",
        "See if I ever do business with you again. Better pay next month puke face.",
        "Oh no, not another deadbeat. Look, pay the rest next month or else.",
        "I will await your payment next month with great interest.",
        "I was really counting on completing this sale this month. I wish you had the money!",
        "Geez, what a nerd bag. Don't you know that you are supposed to have the money ready for me.",
        "You nort fluke. I need my money now. Where do you get off telling me to wait?",
        "Just see if I ever do business with you again. I can't abide people who don't meet their commitments."
      ];
      var buyContractCompletionMessages = [
        "This contract is complete.",
        "Let us go celebrate the sale.",
        "The goods have been delivered.",
        "This transaction is concluded.",
        "Thanks very much.",
        "Such wonderful merchandise I've never seen before. Thank you for your delivery.",
        "Well, that's that. Looks like some good stuff you've sold me. Thanks a bunch.",
        "Boy, I've bought this stuff just in time. Thanks for doing business with me.",
        "I am pleased to take final possession of the agreed goods. It has been a pleasure doing business with you.",
        "Thank you for selling me such high quality goods.",
        "The more I think about this, the more I think you cheated me. Well, a deal's a deal, but I'm going to be more careful next time.",
        "Your goods have been delivered, our agreement is complete. Thank you for doing business so honorably.",
        "Hey, let's do this again sometime. I like buying things from you.",
        "Well, this has been delightful. Please stop by any time to sell your goods to me. You schmuck."
      ];
      var sellContractCompletionMessages = transactionSuccessMessages;
      var oxenFeedingGood = [
        "Your oxen are looking mighty well fed.",
        "Them oxen of yours sure do look like they're eating well.",
        "I like the way your oxen look. I think I'll feed mine more too.",
        "Say, your oxen look like they're fat and happy.",
        "Y'know, I've been noticing your oxen. I think they look pretty damn good. You must be feeding them right.",
        "I used to think you were nuts feeding your oxen as much as you do. But from the results I can see that you were right.",
        "Your oxen look so healthy! It must be all that food you feed them.",
        "You are going to receive a special commendation from the regional oxen care society for feeding your oxen in the proper manner.",
        "You deserve a lot of credit for feeding your oxen so well.",
        "You are bound to get a lot of very good work out of your oxen, the way you feed them."
      ];
      var oxenFeedingBad = [
        "Wow, your oxen sure are scrawny! Are you sure you're feeding them enough?",
        "Yikes, those oxen of yours look half starved. Maybe you should feed them more.",
        "If I were you, I'd feed them oxen more wheat. They look like they could get sick and die on ya.",
        "This ain't none of my business, but I think you must be starving your oxen.",
        "If you don't want to feed those oxen, sell em. Otherwise they're just gonna die on ya.",
        "Oxen need a lot of food. Much more than you are feeding them.",
        "I think you should think about rethinking your oxen food allowance.",
        "Oxen are big hairy beasts. They do lots of work, and they like to eat. They like to eat a lot. Yours aren't very happy.",
        "Think about how big a man is. Then think about how big an ox is. Oxen need lots of food. (Hint, hint.)",
        "Uh, buddy. I'll give you a little tip. Are you ready? Feed your oxen more."
      ];
      var slaveFeedingGood = [
        "Hey, I like the way your slaves buckle down and get the job done. You must be feeding them right.",
        "What type of food are you feeding your slaves. They really look good.",
        "I wish I could get that type of energy out of my slaves. What are you feeding yours?",
        "I envy you your slaves. They work and work, and still they look good. Perhaps I should feed mine as much as you are feeding yours.",
        "I know it's expensive to feed your slaves the way you do, but it sure looks like it's worth the cost.",
        "You have certainly mastered the art of feeding your slaves.",
        "Your slaves seem quite well fed.",
        "Can you come to my castle and deliver a talk on how to properly feed slaves.",
        "Your slaves are probably better fed than any in the kingdom.",
        "If you can manage to keep feeding your slaves at the current rate, you are bound to get lots of work out of them."
      ];
      var slaveFeedingBad = [
        "Your slaves look mighty scrawny. I know it's expensive, but maybe you should feed 'em a bit more.",
        "Look, you aren't going to get any work out of your slaves if you starve them to death.",
        "I have always found that you get much more work out of your slaves if you feed them well.",
        "Hey, if you're going to keep those slaves so skinny and sickly, then please build a fence around your kingdom so that I don't have to look at them.",
        "Excuse me for butting in, but those slaves of yours need more food man!",
        "I suggest you start feeding your slaves a bit more.",
        "Your slaves are not being fed enough to keep them alive.",
        "If you don't start feeding more to your slaves, you are going to lose them.",
        "Your slaves need more food if you expect them to do any real work.",
        "If you don't feed your slaves, they are going to be too weak to work, and then your overseers will beat them to death."
      ];
      var horseFeedingGood = [
        "You must really know how to take care of your horses. They look great.",
        "I guess there's a secret to proper care and feeding of horses. You must know that secret.",
        "Boy, your horses look sleek and fine. You must be feeding them right.",
        "I sure like the looks of your horses.",
        "Say, can I get the recipe for your horse feed. Your horses look so good!",
        "Your horses sure look well fed.",
        "Your horses have a nice layer of body fat.",
        "Your horses never look hungry.",
        "One thing. Your horses never look scrawny or weak.",
        "Your horses seem to eat enough."
      ];
      var horseFeedingBad = [
        "Yow! Your horses look terribly malnourished.",
        "Can you manage to feed your horses better?",
        "If you don't start feeding your horses more, I may just have to call the S P C A.",
        "Jeez! If you're going to feed your horses so little, you might as well just shoot 'em.",
        "Look, I hate to talk out of school, but the neighbors are getting upset at the horrible way you treat your horses.",
        "Your horses need more food man.",
        "Blither blather snort and snather. You should feed your horses better.",
        "If you want to know what an undernourished horse looks like, go look in your stables.",
        "Omigod what horrid little creatures your horses are. Can't you do something to fatten them up a bit.",
        "You know, your horses look hungry."
      ];
      var overseerGood = [
        "Your slaves and overseers really seem to work like a well oiled machine.",
        "Boy, your slaves really jump to it, when your overseers crack the whip. Maybe I should hire as many as you have.",
        "Overseers are expensive, but I see that you know how well it pays to have enough of them.",
        "You know, your overseers never seem to have any trouble getting your slaves organized.",
        "What's your slave per overseer ratio? Whatever it is, it must be right. Your slaves really work well.",
        "Your overseers seem to have your operation well in hand.",
        "I like the way your overseers have your slaves organized. Efficient and economical, but plenty of structure and guidance.",
        "How did you learn to balance your organization so well. Your slaves and overseers work beautifully together.",
        "I love to watch your overseers get the slaves into the fields in the morning. It's like watching a military display. Your slaves are so well disciplined.",
        "I want your overseers to teach mine how to organize their slaves."
      ];
      var overseerBad = [
        "Say, I notice that your slaves look a bit misdirected. Perhaps they could use more guidance.",
        "Why don't you hire more overseers. They might help you get your slaves organized.",
        "I have found that slaves will be happy to sit and do nothing all day. That's why I always hire plenty of overseers.",
        "It might be a good idea to hire some more overseers. Your slaves seem to wander around quite a bit, not knowing what to do.",
        "Say, you don't keep many overseers do you? What protection do you have from invading armies?"
      ];
      var stressGood = [
        "Your overseers seem relaxed and confident. I wish mine were like yours. Mine continually beat the slaves.",
        "Have you sent your overseers to management training courses? They look so professional and cool about everything.",
        "Could I borrow a few of your overseers to teach mine the right way to get things done? Mine are always so nervous.",
        "How do your overseers get your slaves to make quota without beating them. My overseers kill lots of slaves every year with beatings.",
        "What's your secret? I need overseers who can do their job as well as yours.",
        "Your overseers are such model citizens. Always polite and always professional.",
        "How do you get your overseers to meet their quotas without beating your slaves.",
        "I love how your slaves seem to respect and admire your overseers. How do you work that?",
        "I wish I had a few of your overseers. They seem to be able to get things done.",
        "Your overseers have the lowest suicide and divorce rates in the kingdom."
      ];
      var stressBad = [
        "I hate to complain, but the last few nights I have been woken up several times by the screams of your slaves as your overseers beat them.",
        "Were you aware that your overseers have been tearing up the local bars lately. They seem to be under a lot of stress.",
        "Say, a few of your slaves dug through into my kingdom the other day. I returned them at once, but I wanted you to know that they had been horribly beaten.",
        "Say, I know you've been having some production problems lately, but beating your slaves so much will only get them sick.",
        "Perhaps you should buy more slaves. Your overseers appear to be having problems getting what you have to do the work.",
        "Some of your overseers have applied for work at my farm. I wouldn't hire them though, they were too nervous.",
        "Your overseers have been getting into lots of trouble in town. I don't think they are happy working for you.",
        "Boy are your overseers ever jittery and nervous. Sometimes they just stare into space with blank looks on their faces. What have you done to them.",
        "I think you need to give your overseers a vacation. They all look so irritable and nervous.",
        "Your overseers have been talking in the bars at night. They tell stories about how they have been beating your slaves to get them to fill your quotas."
      ];
      var fertilizerGood = [
        "Say, I like the texture of your soil. It's rich and fragrant. How much manure do you use?",
        "The growth on your crops looks really good. You must be fertilizing well.",
        "You seem to have found the knack for properly fertilizing your land.",
        "I like the smell of your fields. They smell rich.",
        "Say, that grain you have been producing certainly looks rich.",
        "Your soil is just full of nutrients. You must be using the right amount of fertilizer.",
        "I really like the quality of your crops. You must be doing something right.",
        "Your wheat is so thick and full. How much manure are you using?",
        "You seem to have learned the secret of fertilization.",
        "I want my crops to look like yours. Can you teach my overseers what you know about manure."
      ];
      var fertilizerBad = [
        "Say, you might want to use a bit more manure. Your soil seems pretty dry and brittle.",
        "The dust from your fields is messing up my wife's laundry. Maybe you should spread a little more manure.",
        "You know, the wheat you've been producing is mostly chaff. Hardly any kernel. I'll bet your yield is low too.",
        "How do you expect to grow any wheat with such a small amount of fertilizer.",
        "You need more fertilizer than you have been using. Your land looks sick.",
        "You aren't using the right amount of fertilizer.",
        "I think your soil lacks nutrients.",
        "I think you ought to use more fertilizer.",
        "Your crops look limp and small. You are probably not using enough fertilizer.",
        "Why don't you try using an extra ton or two of fertilizer per acre."
      ];
      var slaveHealthGood = [
        "Hey, your slaves look terrific.",
        "I like the look of those tanned bodies your slaves strut around with all day long. oooooooooo o.",
        "You really have a good crew of slaves out there. They're as strong as some of your oxen.",
        "Say, could you keep your slaves dressed a bit more. My wife goes nuts whenever she sees them.",
        "Hey, nice slaves you've got there. They ought to fetch top shekel on the market.",
        "Boy, I sure like the looks of your slaves.",
        "How do you get your slaves so strong and good looking.",
        "Your slaves would do well in a Mr. Egypt contest.",
        "Do your slaves lift weights? They sure look strong.",
        "Your slaves are the best in the kingdom. How do you do it?",
        "I need my slaves to be as strong and energetic as yours. Can you give me some tips?",
        "Your slaves are terrific. I wish mine looked as good.",
        "What can I do to have slaves as healthy as yours?",
        "Your slaves are setting the standard for fitness.",
        "What great looking slaves you've got there. I need a few slaves like that."
      ];
      var slaveHealthBad = [
        "Your slaves look downright sick.",
        "Oh please, do something about your slaves. They look revolting.",
        "I think you have a problem with your slaves. They look dreadful.",
        "If any of your slaves give what they have to any of mine, I am going to make you pay for them.",
        "When the wind blows in my direction the smell coming from your slave quarters is intolerable.",
        "oooooo, your slaves are really icky.",
        "Your poor slaves can barely stand, let alone work.",
        "I think you should give your slaves a rest. They look all in.",
        "The way you treat those slaves, they aren't going to last much longer.",
        "Can you really afford to lose your slaves to sickness and exhaustion?",
        "Your slaves are dying. What are you doing about it?",
        "You better ease off on your slaves. They are in very bad shape.",
        "Why don't you give your slaves a month's rest. They really look like they could use it.",
        "Please do something about your slaves. They are so very sick.",
        "I can't stand seeing your slaves suffer the way they do."
      ];
      var oxenHealthGood = [
        "Your oxen really look good there buddy.",
        "I like the sheen on the coats of your oxen.",
        "I think those oxen of yours could out pull any two of mine.",
        "Your oxen should sell quite well. They are fit and healthy.",
        "We need to do something pharaoh. My female oxen are always coming over here to get at your males.",
        "Wow, what great oxen you've got.",
        "Your oxen are terrific looking.",
        "Boy, those oxen of yours sure look strong.",
        "I bet those oxen of yours are the healthiest in the kingdom.",
        "With oxen like that, you should be getting lots of good work done.",
        "I bet it really pays to keep oxen in such good shape.",
        "Would you consider teaching my slaves how to take care of oxen the way yours do?",
        "Your oxen are certainly very elegant looking. How do you do it?",
        "I certainly like the way your oxen strut and stamp around when they are working. It shows that they have lots of energy.",
        "You must have bought an excellent breed of oxen. They are very healthy looking."
      ];
      var oxenHealthBad = [
        "Your oxen look downright terrible.",
        "Hey, do you call those scrawny little bags of bones oxen?",
        "Why don't you treat your oxen better? They serve you better if you do.",
        "You better do something quick, or all your oxen are going to die on you.",
        "Keep those terrible looking oxen of yours away from mine. I don't want mine to get contaminated.",
        "I suggest you call a vet. Your oxen are very sick.",
        "Your oxen are so sick. How can you force them out into the fields every day.",
        "Your oxen are the worst in the land.",
        "You should take better care of your oxen. They are abominable.",
        "Yikes, what terrible looking creatures your oxen are.",
        "How can you look at those oxen and not know that there is something wrong with them.",
        "Your oxen look as though they are on the verge of death.",
        "I think your oxen are going to die soon.",
        "How did your oxen ever get so ill.",
        "Maybe if you kept your oxen in for a month, and fed them all the food they could eat, they would live. But I bet they wouldn't."
      ];
      var horseHealthGood = [
        "Wow, what good looking horses you've got there.",
        "Say I'll bet some of those horses are prize winners.",
        "Gee your horses are fast! They look good too.",
        "You should be able to fetch a pretty sum for those horses of yours.",
        "What do you do to get your horses looking so good.",
        "Your horses are in gorgeous shape.",
        "You've sure got great looking horses.",
        "What kind of vitamins are you putting in your horse's feed. They sure are healthy looking.",
        "What beautiful horses you've got.",
        "Those horses of yours look like they could fight their way out of a cage of hungry tigers.",
        "My goodness, what very fine looking horses you are raising.",
        "I certainly like the looks of your horses, you must be feeding them well.",
        "You should enter your horses in a show. They would be sure to win.",
        "Would you consider giving a lecture on the care and feeding of horses. Nobody in the kingdom has such fine looking animals.",
        "I sure wish I knew what you did to get your horses so healthy."
      ];
      var horseHealthBad = [
        "Aye yi yi, your horses are in awful shape.",
        "I can't stand to look at your horses any more. You'll never get a decent price for them. You'd better just shoot them.",
        "If you are thinking of selling those horses, forget it. They are too sick to bring a decent price.",
        "Those horses can't work! They are too damn sick.",
        "Excuse me pharaoh, but your horses are about ready to keel over and die.",
        "Why don't you feed your horses a bit more. They look awfully bad to me.",
        "The society for the enforcement of kindness to animals has issued a huge complaint about the condition of your horses.",
        "Ye gods, your horses are awful.",
        "You have the worst batch of horses in all the land.",
        "Your stables reek of sickness and death. I think you should check your horses.",
        "The health of your horses is deplorable. They are nothing but skin and bones.",
        "Please see what you can do to improve the health of your horses. They look so pitiful my wife cries whenever she sees them.",
        "Excuse me, but your horses are really sick.",
        "God, can't you feed your horses a bit better. They are nothing but bags of bones.",
        "oooooooo o o oo what horrible horses you have."
      ];
      var creditGood = [
        "Say, the bank has you on its list of the most trustworthy borrowers.",
        "You must be paying your loans off right on time. The bank thinks quite highly of you.",
        "I was at the bank the other day, and I overheard the tellers saying 'good old pharaoh, always gets his payments in on time.'",
        "You must really know how to make friends with the bank. They love you over there. They said I could have a loan if you would co-sign.",
        "Boy, those bankers must believe all that rubbish about you being a god. They never say anything bad about you.",
        "How did you get such a good credit rating? It sure wasn't clean living.",
        "The bank has just erected a statue in your honor. You are very popular over there.",
        "Powerful allies are nice to have. You certainly have one in the bank.",
        "I see you have found the key to winning this game: Keep the bank happy.",
        "Say, your credit rating is so high, the bank barely questions any loan you wish to make.",
        "Good credit ratings are one of the keys of success. You are well on your way.",
        "The bank has asked me to request that you give some lectures on keeping a good credit rating.",
        "Say, don't believe your credit allowance, the bank loves you so much I am sure they would give you more if you asked.",
        "You have managed your credit situation very very well. The bank considers you to be one of its best customers.",
        "If you continue to keep the bank so happy, you will undoubtedly win this game."
      ];
      var creditBad = [
        "Whoooo boy, is the bank mad at you. You'd better start paying that loan.",
        "You'd best get right over to the bank and pay that loan of yours. The bank is hopping mad.",
        "Have you forgotten about your loan? I was just over by the bank, and they are getting a posse ready for you.",
        "You might want to think about making a loan payment. The bank has put your name on the default list.",
        "If you ever want another loan again, you'd better hop right over to the bank and pay them.",
        "How did you manage to get the bank so mad at you? You have been making sufficient payments on your loan haven't you?",
        "There are wanted posters all over town with your name on them. The bank has issued a Dead or Alive reward to anyone who can get you to repay your loan.",
        "I hate to intrude in your personal affairs, but if you don't repay your loan real soon, the bank is going to foreclose on you.",
        "Did you know that you were recently named as the Pharaoh most likely to default on his loan?",
        "I can see why the bank doesn't trust you anymore. Your face does not inspire confidence.",
        "Say, if you have any money stashed anywhere, I suggest you give it to the bank. They are really upset about the status of your loan.",
        "Your credit rating really stinks. Are you thinking of declaring bankruptcy?",
        "At this rate, I don't see how the bank is going to let you finish this game.",
        "I hope you have enjoyed your game, because I have a feeling that the bank is going to end it soon.",
        "The bank wants money from you. The bank always gets what it wants."
      ];
      var actOfGodTemplates = [
        "%s %s %s.",
        "The anger of the Gods is kindled against you. They send %s %s which has %s.",
        "Your scouts report %s %s. Further reports indicate that it has %s.",
        "Your astrologer fails to predict %s %s which has %s. So you have him flayed.",
        "The news of %s %s which has %s reaches you.",
        "Your kingdom weeps after %s %s %s."
      ];
      var actOfGodAdjectives = [
        "an incredibly large",
        "an unpredicted",
        "a horrifyingly huge",
        "an immense",
        "a very very big",
        "an unbelievably gargantuan"
      ];
      var actOfGodDisasters = [
        "volcano",
        "earthquake",
        "flood",
        "meteor impact",
        "forest fire",
        "hurricane",
        "explosion of unknown origin",
        "thunder storm",
        "dust storm",
        "rain storm",
        "typhoon"
      ];
      var actOfGodConsequences = [
        "devastated your property!",
        "decimated your land and livestock",
        "destroyed much of all you own",
        "killed and ransacked your chattels",
        "wreaked havoc with your estate",
        "ruined your hard earned wealth",
        "razed your land and livestock",
        "ripped and rattled your property",
        "consumed much of your kingdom",
        "obliterated a portion of your land, and made hamburger out of some of your livestock"
      ];
      var actOfMobsTemplates = [
        "It was %s of %s angered by %s who %s.",
        "%s of %s motivated by %s %s.",
        "This was not your month. %s consisting of %s incensed over %s just %s.",
        "%s of %s accosted your estate. Presumably they were protesting %s. They %s.",
        "Your scouts report %s populated by %s who were upset by %s. The reports indicate that they %s.",
        "It is not easy to control %s of %s. Especially when they are upset by %s. Much to your sorrow they %s.",
        "It is a sad state of affairs when %s of %s protesting %s can do these things. They %s."
      ];
      var actOfMobsCrowdSize = [
        "a huge crowd",
        "an immense gathering",
        "a conglomerated mass",
        "a virtual nation",
        "a mob",
        "hordes",
        "an incredibly large gathering",
        "wave upon wave",
        "battalions",
        "veritable armies"
      ];
      var actOfMobsMotivation = [
        "social injustice",
        "animal abuse",
        "your policies of slavery",
        "the hunting of whales",
        "your ugly face",
        "last year's winter",
        "crime and violence",
        "unsanitary bathrooms",
        "pets with fleas",
        "your nationalist policies",
        "your expansionist policies",
        "their mothers-in-law",
        "your monogamy laws",
        "your relative's deviate ways",
        "bad television shows",
        "the world series",
        "natural disasters",
        "animal nakedness",
        "prostitution"
      ];
      var actOfMobsAction = [
        "held a rock concert on your fields",
        "held a protest march through your land",
        "threw rocks and sticks at your slaves",
        "attacked your residence and crops",
        "stood around and acted stupid for a few days",
        "dumped their garbage all over your land",
        "decimated your property with pickaxes and shovels",
        "held hands, and walked across your land single file",
        "built the world's largest human pyramid on your property",
        "set fire to your crops and lands",
        "held a huge bar-b-que on your fields",
        "committed mass suicide in the midst of your crops",
        "held a gymnastics meet on your land",
        "built dozens of little shacks all over your land",
        "stood on their heads for 7 days in the midst of your fields",
        "held a spitting contest on your crops"
      ];
      var warAttackers = [
        "the Upper Slobovians",
        "the Ethiopians",
        "a horde of wild aborigines",
        "an incredibly aggressive flock of birds",
        "an army of revolutionaries",
        "men from Mars",
        "evil men from across the sea",
        "giants",
        "a small gaggle of dragons",
        "the Chicago Bears",
        "the crew of the Starship Enterprise",
        "Theodore Cleaver",
        "The Ayatolla Khomeini"
      ];
      var warLossMessages = [
        "You have lost",
        "You have been decimated. Your losses amount to",
        "They have trampled over you and taken",
        "You have been utterly vanquished. They despoil you for"
      ];
      var warWinMessages = [
        "You have won",
        "You have blasted them to smithereens. You loot them for",
        "After thoroughly beating them, you despoil them for",
        "You are victorious and have increased your holdings by"
      ];
      var revoltMessages = [
        "Your slaves are moved to revolt against you. In the struggle you lose %d%%.",
        "Your mistreatment of your slaves results in a riot in which %d%% of your estate is destroyed.",
        "A rabble rouser from a neighboring kingdom incites your slaves to take arms against you. In the struggle you lose %d%%.",
        "A wave of discontentment motivates your slaves to strike against you. Their discontentment is such that you lose %d%% of your property.",
        "The two major factions of your slaves declare war on each other. Resulting destruction to your holdings is %d%%."
      ];
      var healthEventMessages = [
        "The weather has been cool and damp, and everyone seems to have colds.",
        "The hot dry weather has made everyone listless and weak.",
        "Your slaves and animals seem unusually slow and irritable lately.",
        "Something must have been wrong with the slaves' and animals' food. They seem to be suffering from severe diarrhea.",
        "The water from the wells has been brackish lately. Your slaves and animals have been out of sorts.",
        "A rival king has constructed a still on your lands. Your slaves and animals are all hung-over.",
        "Drafty living quarters and rotten blankets have caused health problems in your living inventory.",
        "The mosquitos this month have been so bad that all your slaves and livestock are suffering from blood loss.",
        "A natural deposit of uranium has caused a mild case of radiation sickness to break out amongst your living inventories.",
        "A slow poison was injected into the food supplies of your animals and slaves. Fortunately you discovered it before any permanent damage was done. But the victims are quite weak."
      ];
      var plagueDisease = [
        "anthrax",
        "hoof and mouth disease",
        "typhoid fever",
        "Rocky Mountain spotted fever",
        "AIDS",
        "fulminous nechroids",
        "Diphtheria",
        "Tourette's syndrome",
        "Jungle rot",
        "measles",
        "chicken pox",
        "athlete's foot"
      ];
      var plagueTemplates = [
        "Your slaves, oxen and horses have been decimated by a plague of %s.",
        "A band of Gypsies passed through your slave encampments and brought %s with them.",
        "Poor sanitation in the slave barracks exacerbated the spread of %s throughout the slaves and livestock.",
        "Your wise men were unable to cope with the %s which has ravaged your living inventories.",
        "The sexual preference of one of your relatives has angered the Gods into smiting your slaves and livestock with %s."
      ];
      var locustMessages = [
        "Suddenly, a shadow passes over the land. . . An immense swarming cloud of hungry locusts descends upon your fields and devours your crop.",
        "Ranks upon ranks of marching Soldier Ants cut a swath through the land and destroy your fields.",
        "The temperature soars, and the sun stares down out of a cloudless sky for 3 solid weeks. Nothing remains of your crops but dried husks.",
        "Rain pours from the sky day and night for nearly a month. Your fields have become lakes. Your crops are destroyed.",
        "The angry Gods plunge your land into complete darkness for 27 days. When you finally see the sun again, your fields are covered with yellow, rotting, lifeless plants.",
        "Temperatures plunge far below freezing for several days. Despite the valiant efforts of your slaves and overseers, your crops do not survive."
      ];
      var wheatEventMessages = [
        "A horrible blight destroys %d%% of your crops.",
        "%d%% of your crops are wiped out by a terrible thunder storm.",
        "A grass fire destroys %d%% of your crops and silos.",
        "Pests and critters of all kinds swarm over your fields and storage bins and eat up %d%% of your wheat.",
        "An icky green slimy substance has been found covering portions of your wheat and silos. The affected wheat had to be discarded. Your losses amount to %d%%.",
        "Little yellow crawly things were found in some of your wheat bins. You had to burn %d%% of your wheat to stop them from spreading.",
        "Ickmach forsutia worms have invaded your land. You donate %d%% of your on hand wheat for the manufacture of worm-poison.",
        "You feel like being a good guy today, so you give %d%% of your wheat to an orphanage. (brats!)",
        "The roofs in some of your silos leak. %d%% of your wheat has sprouted. Oh well.",
        "You find the body of Jimmy Hoffa in amongst your wheat. You are forced to discard %d%% of your wheat."
      ];
      var goldEventMessages = [
        "Thieves break into your treasury and take %d%% of your gold.",
        "Your neighbor king has just bought a new home entertainment system. You spend %d%% of your gold to buy one better than his.",
        "The queen needs more servants. You pay %d%% of your gold to a domestic employment agency.",
        "Your overseers' children need new band equipment and uniforms. You donate %d%% of your gold for this worthy cause.",
        "You pay your physicians %d%% of your gold to provide you with an immortality potion.",
        "Your priests recommend that you create a golden idol to the Sun god RA. You give the goldsmiths %d%% of your gold for this purpose.",
        "Your spouse gives %d%% of your gold to a used chariot salesman, and comes home with a 3 year old Marc Anthony, loaded.",
        "A few well placed bribes with the overseers' union ought to keep your labor problems simple. %d%% of your on hand cash ought to do it.",
        "Your blackmailer has been around. You pay him %d%% of your gold to keep him quiet a little longer.",
        "You haven't been able to stay at the palace for weeks, the septic system backed up. P U. The plumbers charge %d%% for the repair job. (I would too.)",
        "You were in a generous mood this month. You spent %d%% of your gold on toys for the slaves' children."
      ];
      var economyEventMessages = [
        "Your priests predict the end of the world. The market goes crazy. You have them all beheaded.",
        "A solar eclipse causes hoarding and panic at the marketplace.",
        "A recent overabundance of river frogs has caused strange effects in the market prices.",
        "Who can say why the marketplace behaves the way it does.",
        "Rumor has it that you are preparing for war. The speculation shows in the marketplace.",
        "Hail and fire pour down from the sky. The market place is burned, and its ashes are pummeled into the ground. The market prices react accordingly.",
        "A comet appears in the heavens. The market prices react with their usual rational behavior.",
        "One thing you can't accuse the market prices of, is stability.",
        "Darkness covers the land for days. The market prices do strange things.",
        "Isn't it weird how a little thing like a plague from the gods can send the market prices haywire?"
      ];
      var laborEventMessages = [
        "Overseers are disgruntled by working conditions. They strike for a %d%% raise.",
        "Overseer turnover is high. You are forced to give them a %d%% raise to mollify them.",
        "Your overseers hate your guts. You have to give them a %d%% raise just to keep working for you.",
        "So many of your overseers have been quitting lately that your advisors have recommended that you pay them %d%% more.",
        "You were feeling generous today. (again.) So, you gave your overseers a %d%% raise.",
        "Your overseers have been doing so well lately (ha ha) that you are moved to give them a %d%% raise. (Actually the union threatened to strike.)",
        "A neighboring king, jealous of the incredible efficiency of your overseers (ha ha), has been trying to recruit them. You give them all a %d%% raise to make sure they stay with you.",
        "It's salary review time. %d%% for all the overseers.",
        "Some dork in the next county is paying his overseers more than you. You are forced to give your overseers a %d%% raise to keep them happy. (Rotten luck.)"
      ];
      var workloadEventMessages = [
        "%s are required for raking the leaves.",
        "Your slaves require an extra %s in order to mow the lawn.",
        "The high priestess of Isis is coming to visit. Your slaves expend %s to landscape and manicure the grounds.",
        "Your son wants a treehouse. You order your slaves to build it. They expend %s to complete the task.",
        "You need new wells. The job requires %s of your slaves effort.",
        "The queen wants running water in her bathroom. Your slaves expend %s completing the job.",
        "Your brother in law throws a party for his drinking buddies. He uses %s of your slaves time preparing and catering it.",
        "%s of your slaves time is used up building an extension onto your study.",
        "Your slaves spend %s at your son's orders, searching the land for small round stones that he can skip on the river Nile.",
        "Your priests insist that a holy wheat kernel was grown in last month's crop. Your slaves spend %s searching for it. Without luck."
      ];
      var overseerMissedPayrollMessages = [
        "Mooooooooooo you didn't have the dough to pay your overseers. They all quit.",
        "Your overseers want a %5.1f%% raise. You missed their payroll. They have all quit.",
        "The rotten thing about employees is that they want to be paid.",
        "The Overseers union demands a %5.1f%% increase since you missed their payroll.",
        "Shoddy operation. You ran out of cash on payday. Your overseers have quit.",
        "A message from your overseers: 'We quit!' Perhaps they will come back if you offer them a %5.1f%% raise, and promise to pay them on time from now on.",
        "Why didn't you keep enough cash to pay your overseers?",
        "It's awfully unfriendly to be late with your overseers' paychecks. Now they have all quit.",
        "You should have paid your overseers on time. Now they are leaving in droves. Perhaps more money will entice them to return."
      ];
      var tradingInputErrorMessages = [
        "I cannot read your horrible writing.",
        "What exactly are you trying to say here.",
        "I thought we were conducting a business transaction, but I guess we must be finger painting.",
        "Commercial activities do not usually include randomly poking the keys.",
        "Could you repeat that please. I can't seem to make any sense of it."
      ];
      var noFunctionSelectedMessages = [
        "Excuse me, but are you buying or selling?",
        "What exactly is it that you would like to do?",
        "Ah yes, you would like me to read your mind. Well then, shall I sell all you have, or would you like to try again?",
        "Hey! I'm in a hurry here. Could you quit farbing around and tell me what you want to do?",
        "I can't complete your transaction, until you tell me what you are doing."
      ];
      var buySellNegativeInputMessages = [
        "Yeah, right. I'll just reach right into their guts and rip the food out.",
        "Negative food. Hmmmm, an interesting concept.",
        "Oh come now!",
        "Shall we try that again please?",
        "If you look closely, you will see a horizontal bar in front of the numbers. Please remove it."
      ];
      var loanInputErrorMessages = [
        "This is a bank. We do things right. Now you try.",
        "Confusing the clerks will not help your credit rating.",
        "Next time, try typing slowly and carefully, one key at a time.",
        "Oh! You've invented a new number system. Can you translate it please?",
        "Get lost bum."
      ];
      var loanNoFunctionSelectedMessages = [
        "And just exactly what did you want today.",
        "Are you borrowing, or repaying?",
        "Hey snotface. Look carefully at the screen. See those buttons labelled borrow and repay? Push one.",
        "Please, please select a function.",
        "Frankly my dear, I don't give a damn."
      ];
      var loanInsufficientRepaymentMessages = [
        "We admire your zeal. But you really have to have the money before you can pay it back.",
        "Good intentions aren't worth snarf droppings. Now pay what you can and get out.",
        "Forgot to balance the check book again eh? You don't have the cash do you?",
        "Do this again, and we might just send someone around to break your legs. You don't got enough dough.",
        "Promises, promises. I wish you could pay me that much, but you can't."
      ];
      var overseerInputErrorMessages = [
        "A fine personnel director you would make. You don't even know if you are hiring or firing.",
        "Hire or fire. Hey, that rhymes!",
        "Hire or fire? Oscar Meyer. Bad rear tire. Fire the buyer. bow to the sire. A funeral pyre.",
        "There are these little buttons marked hire or fire. It would help if you would push one.",
        "Quit wasting my time."
      ];
      var overseerFractionalErrorMessages = [
        "How exactly do I deal with fractions? Dismemberment?",
        "That is likely to be a bloody operation.",
        "Try again please. We like our people whole.",
        "Right.",
        "You are missing the concept. People can't be usefully divided."
      ];
      var overseerFireTooManyMessages = [
        "You can't fire that many.",
        "I can sympathize with your intention. But you can't fire more than you have.",
        "Enthusiastic aren't we. But firing more than you have doesn't work.",
        "You don't have that many.",
        "Get lost."
      ];
      var plantingErrorMessages = [
        "We are planting wheat, not alphabet soup.",
        "()(*$#+qopi21-3u.",
        "aaaaaaaaaa oooooooooo help me.",
        "Try typing normally for a change.",
        "Digits please."
      ];
      var negativePlantingErrorMessages = [
        "Negative wheat. Grows down eh?",
        "I have this vision of whole fields sinking down into little seeds.",
        "I am getting tired of this joke.",
        "Scram.",
        "Ok, it was a fun experiment. But it's over now. Can we get back to the game?"
      ];
      var pyramidErrorMessages = [
        "Stone dust has gotten into your fingers. Try again please.",
        "Excuse me, I have to answer the phone.",
        "Aye yi yi. Please try that one again.",
        "I'm mad as hell, and I'm not gonna take it anymore.",
        "Learn how to type. Please."
      ];
      var negativePyramidErrorMessages = [
        "Negative signs are not permitted here. Please correct the situation immediately.",
        "Oh damn. If you can't type, don't play.",
        "I am getting very very angry. Now this time do it right!",
        "OK, that's it. I've had it. Get out of here and don't ever come back.",
        "oooooo oooooooooo oo oooo oo oo oooo ooooooooo."
      ];
      var negativeStoneMessages = [
        "Negative stones? AH you want me to remove stones!",
        "Do negative stones have negative mass? Perhaps they fall up.",
        "Are you talking about antimatter? I wouldn't build a pyramid out of that.",
        "I'm not putting those stones back! Never!"
      ];
      var fertilizerErrorMessages = [
        "oooooooo oooooooo oo oooooo o oooo oooo o",
        "I want to see digits. Digits damn you. Digits.",
        "We are talking about fertilizer, measured in tons. Now give me an intelligent answer.",
        "Give me a number please.",
        "OK, no more playing around ok?"
      ];
      var negativeFertilizerErrorMessages = [
        "Negative fertilizer? Hey, maybe that's food!",
        "Negative fertilizer makes crops grow worse.",
        "ha ha ha ha ha ha ha. Ah ha ha ha.",
        "Seriously, you have to enter a positive number. (dork)",
        "Ratsifrats! Please type more carefully."
      ];
      var feedRateErrorMessages = [
        "Feed rates are odd things. They have to be numeric.",
        "Are you using some code or something?",
        "Yikes! What a lousy typist. I need numbers!",
        "I realize that it's not always easy to keep your mind on things, but try ok?",
        "If you don't know what's wrong, I'm certainly not going to tell you!"
      ];
      var genericNumericInputErrorMessages = [
        "Kiss me you fool.",
        "Did you go to school. Do you know how to write numbers? Try.",
        "I want a number here. OK?",
        "Are you a newcomer to the human race? Don't you know the world is run by numbers?",
        "Either write a number or get out. You smell.",
        "Please, let me help. You must use one of the numbers 0, 1, 2, 3, 4, 5, 6, 7, 8 or 9. OK?"
      ];
      var contractPlayerNames = [
        "King HamuNam",
        "Regent Karada del Nor",
        "Emperor Falthazzar",
        "Jor-El of Krypton",
        "Shah Sataj Kampooli",
        "Akmad na Gandar",
        "Baron Tanjou d'Aranom",
        "Gort of Grunthos",
        "Prince Guelar of Xaptu",
        "Ganzaola pu"
      ];
      var quitSavePrompts = [
        "Giving up so soon? Do you want to save the game?",
        "Ah yes, on to another game. Shall I save this one first?",
        "Hey, I've got an idea, let's save this game first.",
        "If you want me to save this game, push the YES button. (Simple huh?)",
        "Do you wanna keep this one around for awhile?",
        "I'll never forgive you for leaving me this way. The only way you can make it up to me is by saving your game now.",
        "So, deserting me eh? Are you going to save your game just in case you want to start it up again?",
        "You're quitting? I don't believe it! How can you do this to me. Well, you are going to save your game aren't you?",
        "It's quittin' time. Would you like to save your game?",
        "Chicken! Well at least you ought to save your game.",
        "If you don't save it, you'll lose it. Wanna save it?",
        "Time for a refreshing drink. Save game first?",
        "Is there something good on TV or what. Shall I save the game?",
        "I'm sure going to miss our little talks. Why don't you save your game now?",
        "OK, I know when I'm not wanted, I'll go. But before I do, let me ask you one last question. One last query for old time's sake. Do you want to save your game?",
        "Couldn't take the pace eh? Well that's all right. Lots of people drop out when the going gets tough. But perhaps you should save your game for when you are feeling stronger.",
        "Quitter! At least save your game.",
        "It was nice while it lasted. Do you want to save this game?",
        "All good things must come to an end. Why not save your game now?",
        "Well of all the dirty tricks. Getting out before I could beat you. Well, you'd better save your game.",
        "They don't let real kings just quit like that you know. Do you want to save your game.",
        "It might be a good idea to save your game now.",
        "I L B C N U. Save game?"
      ];
      function getOpeningMessage(rng) {
        const face = randomInt(rng, 0, 4);
        const text = pick(rng, openingMessages);
        return { face, text };
      }
      function getWinMessage(rng) {
        return pick(rng, winMessages);
      }
      function getFarewellMessage(rng) {
        return pick(rng, farewellMessages);
      }
      function getIdlePepTalkMessage(rng) {
        return pick(rng, idlePepTalkMessages);
      }
      function getGenericChatMessage(rng) {
        return pick(rng, genericChatMessages);
      }
      function getDunningMessage(rng) {
        return pick(rng, dunningMessages);
      }
      function getForeclosureWarningMessage(rng) {
        return pick(rng, foreclosureWarningMessages);
      }
      function getForeclosureMessage(rng) {
        return pick(rng, foreclosureMessages);
      }
      function getCashShortageMessage(rng) {
        return pick(rng, cashShortageMessages);
      }
      function getBankruptcyMessage(rng) {
        return pick(rng, bankruptcyMessages);
      }
      function getCreditCheckFeeMessage(rng, fee) {
        const template = pick(rng, creditCheckFeeMessages);
        return template.replace("%.0f", Math.floor(fee).toString());
      }
      function getLoanApprovalMessage(rng, amount, rate) {
        const template = pick(rng, loanApprovalMessages);
        return template.replace("%.0f", Math.floor(amount).toString()).replace("%.2f%%", rate.toFixed(2) + "%");
      }
      function getLoanDenialMessage(rng) {
        return pick(rng, loanDenialMessages);
      }
      function getLoanRepaymentMessage(rng) {
        const msg = pick(rng, loanRepaymentMessages);
        const signoff = pick(rng, loanRepaymentSignoffMessages);
        return msg + " " + signoff;
      }
      function getSupplyLimitMessage(rng, amount) {
        const template = pick(rng, supplyLimitMessages);
        return template.replace("%.0f", Math.floor(amount).toString());
      }
      function getDemandLimitMessage(rng, amount) {
        const template = pick(rng, demandLimitMessages);
        return template.replace("%.0f", Math.floor(amount).toString());
      }
      function getTransactionSuccessMessage(rng) {
        return pick(rng, transactionSuccessMessages);
      }
      function getInsufficientFundsMessage(rng, maxAffordable) {
        const template = pick(rng, insufficientFundsMessages);
        return template.replace("%.0f", Math.floor(maxAffordable).toString());
      }
      function getSellMoreThanOwnedMessage(rng, owned) {
        const template = pick(rng, sellMoreThanOwnedMessages);
        return template.replace("%f", owned.toString());
      }
      function getTradingInputErrorMessage(rng) {
        return pick(rng, tradingInputErrorMessages);
      }
      function getNoFunctionSelectedMessage(rng) {
        return pick(rng, noFunctionSelectedMessages);
      }
      function getBuySellNegativeInputMessage(rng) {
        return pick(rng, buySellNegativeInputMessages);
      }
      function getCounterpartyDefaultMessage(rng) {
        return pick(rng, counterpartyDefaultMessages);
      }
      function getCounterpartyPartialPaymentMessage(rng) {
        return pick(rng, counterpartyPartialPaymentMessages);
      }
      function getCounterpartyPartialShipmentMessage(rng) {
        return pick(rng, counterpartyPartialShipmentMessages);
      }
      function getPlayerInsufficientGoodsMessage(rng) {
        return pick(rng, playerInsufficientGoodsMessages);
      }
      function getPlayerInsufficientFundsContractMessage(rng) {
        return pick(rng, playerInsufficientFundsContractMessages);
      }
      function getBuyContractCompletionMessage(rng) {
        return pick(rng, buyContractCompletionMessages);
      }
      function getSellContractCompletionMessage(rng) {
        return pick(rng, sellContractCompletionMessages);
      }
      function getOxenFeedingGoodMessage(rng) {
        return pick(rng, oxenFeedingGood);
      }
      function getOxenFeedingBadMessage(rng) {
        return pick(rng, oxenFeedingBad);
      }
      function getSlaveFeedingGoodMessage(rng) {
        return pick(rng, slaveFeedingGood);
      }
      function getSlaveFeedingBadMessage(rng) {
        return pick(rng, slaveFeedingBad);
      }
      function getHorseFeedingGoodMessage(rng) {
        return pick(rng, horseFeedingGood);
      }
      function getHorseFeedingBadMessage(rng) {
        return pick(rng, horseFeedingBad);
      }
      function getOverseerGoodMessage(rng) {
        return pick(rng, overseerGood);
      }
      function getOverseerBadMessage(rng) {
        return pick(rng, overseerBad);
      }
      function getStressGoodMessage(rng) {
        return pick(rng, stressGood);
      }
      function getStressBadMessage(rng) {
        return pick(rng, stressBad);
      }
      function getFertilizerGoodMessage(rng) {
        return pick(rng, fertilizerGood);
      }
      function getFertilizerBadMessage(rng) {
        return pick(rng, fertilizerBad);
      }
      function getSlaveHealthGoodMessage(rng) {
        return pick(rng, slaveHealthGood);
      }
      function getSlaveHealthBadMessage(rng) {
        return pick(rng, slaveHealthBad);
      }
      function getOxenHealthGoodMessage(rng) {
        return pick(rng, oxenHealthGood);
      }
      function getOxenHealthBadMessage(rng) {
        return pick(rng, oxenHealthBad);
      }
      function getHorseHealthGoodMessage(rng) {
        return pick(rng, horseHealthGood);
      }
      function getHorseHealthBadMessage(rng) {
        return pick(rng, horseHealthBad);
      }
      function getCreditGoodMessage(rng) {
        return pick(rng, creditGood);
      }
      function getCreditBadMessage(rng) {
        return pick(rng, creditBad);
      }
      function getActOfGodMessage(rng) {
        const template = pick(rng, actOfGodTemplates);
        const adj = pick(rng, actOfGodAdjectives);
        const disaster = pick(rng, actOfGodDisasters);
        const consequence = pick(rng, actOfGodConsequences);
        return template.replace("%s", adj).replace("%s", disaster).replace("%s", consequence);
      }
      function getActOfMobsMessage(rng) {
        const template = pick(rng, actOfMobsTemplates);
        const crowd = pick(rng, actOfMobsCrowdSize);
        const motivation = pick(rng, actOfMobsMotivation);
        const action = pick(rng, actOfMobsAction);
        return template.replace("%s", crowd).replace("%s", motivation).replace("%s", action).replace("%s", action.length ? action : "");
      }
      function getWarAttacker(rng) {
        return pick(rng, warAttackers);
      }
      function getWarLossMessage(rng) {
        return pick(rng, warLossMessages);
      }
      function getWarWinMessage(rng) {
        return pick(rng, warWinMessages);
      }
      function getRevoltMessage(rng, percent) {
        const template = pick(rng, revoltMessages);
        return template.replace("%d%%", percent + "%");
      }
      function getHealthEventMessage(rng) {
        return pick(rng, healthEventMessages);
      }
      function getPlagueMessage(rng) {
        const template = pick(rng, plagueTemplates);
        const disease = pick(rng, plagueDisease);
        return template.replace("%s", disease);
      }
      function getLocustMessage(rng) {
        return pick(rng, locustMessages);
      }
      function getWheatEventMessage(rng, percent) {
        const template = pick(rng, wheatEventMessages);
        return template.replace("%d%%", percent + "%");
      }
      function getGoldEventMessage(rng, percent) {
        const template = pick(rng, goldEventMessages);
        return template.replace("%d%%", percent + "%");
      }
      function getEconomyEventMessage(rng) {
        return pick(rng, economyEventMessages);
      }
      function getLaborEventMessage(rng, percent) {
        const template = pick(rng, laborEventMessages);
        return template.replace("%d%%", percent + "%");
      }
      function getWorkloadEventMessage(rng, workDesc) {
        const template = pick(rng, workloadEventMessages);
        return template.replace("%s", workDesc);
      }
      function getOverseerMissedPayrollMessage(rng, raisePercent) {
        const template = pick(rng, overseerMissedPayrollMessages);
        return template.replace("%5.1f%%", raisePercent.toFixed(1) + "%");
      }
      function getOverseerInputErrorMessage(rng) {
        return pick(rng, overseerInputErrorMessages);
      }
      function getOverseerFractionalErrorMessage(rng) {
        return pick(rng, overseerFractionalErrorMessages);
      }
      function getOverseerFireTooManyMessage(rng) {
        return pick(rng, overseerFireTooManyMessages);
      }
      function getPyramidErrorMessage(rng) {
        return pick(rng, pyramidErrorMessages);
      }
      function getNegativePyramidErrorMessage(rng) {
        return pick(rng, negativePyramidErrorMessages);
      }
      function getNegativeStoneMessage(rng) {
        return pick(rng, negativeStoneMessages);
      }
      function getFeedRateErrorMessage(rng) {
        return pick(rng, feedRateErrorMessages);
      }
      function getPlantingErrorMessage(rng) {
        return pick(rng, plantingErrorMessages);
      }
      function getNegativePlantingErrorMessage(rng) {
        return pick(rng, negativePlantingErrorMessages);
      }
      function getFertilizerErrorMessage(rng) {
        return pick(rng, fertilizerErrorMessages);
      }
      function getNegativeFertilizerErrorMessage(rng) {
        return pick(rng, negativeFertilizerErrorMessages);
      }
      function getGenericNumericInputErrorMessage(rng) {
        return pick(rng, genericNumericInputErrorMessages);
      }
      function getLoanInputErrorMessage(rng) {
        return pick(rng, loanInputErrorMessages);
      }
      function getLoanNoFunctionSelectedMessage(rng) {
        return pick(rng, loanNoFunctionSelectedMessages);
      }
      function getLoanInsufficientRepaymentMessage(rng) {
        return pick(rng, loanInsufficientRepaymentMessages);
      }
      function getContractPlayerName(rng) {
        return pick(rng, contractPlayerNames);
      }
      function getQuitSavePrompt(rng) {
        return pick(rng, quitSavePrompts);
      }
      module.exports = {
        // A.1
        openingMessages,
        getOpeningMessage,
        // A.2
        winMessages,
        getWinMessage,
        farewellMessages,
        getFarewellMessage,
        // A.3
        idlePepTalkMessages,
        getIdlePepTalkMessage,
        // A.4
        genericChatMessages,
        getGenericChatMessage,
        // A.5
        dunningMessages,
        getDunningMessage,
        // A.6
        foreclosureWarningMessages,
        getForeclosureWarningMessage,
        // A.7
        foreclosureMessages,
        getForeclosureMessage,
        // A.8
        cashShortageMessages,
        getCashShortageMessage,
        // A.9
        bankruptcyMessages,
        getBankruptcyMessage,
        // A.10
        creditCheckFeeMessages,
        getCreditCheckFeeMessage,
        loanApprovalMessages,
        getLoanApprovalMessage,
        loanDenialMessages,
        getLoanDenialMessage,
        loanRepaymentMessages,
        loanRepaymentSignoffMessages,
        getLoanRepaymentMessage,
        // A.11
        supplyLimitMessages,
        getSupplyLimitMessage,
        demandLimitMessages,
        getDemandLimitMessage,
        transactionSuccessMessages,
        getTransactionSuccessMessage,
        insufficientFundsMessages,
        getInsufficientFundsMessage,
        sellMoreThanOwnedMessages,
        getSellMoreThanOwnedMessage,
        // A.12
        counterpartyDefaultMessages,
        getCounterpartyDefaultMessage,
        counterpartyPartialPaymentMessages,
        getCounterpartyPartialPaymentMessage,
        counterpartyPartialShipmentMessages,
        getCounterpartyPartialShipmentMessage,
        playerInsufficientGoodsMessages,
        getPlayerInsufficientGoodsMessage,
        playerInsufficientFundsContractMessages,
        getPlayerInsufficientFundsContractMessage,
        buyContractCompletionMessages,
        getBuyContractCompletionMessage,
        sellContractCompletionMessages,
        getSellContractCompletionMessage,
        // A.13
        oxenFeedingGood,
        getOxenFeedingGoodMessage,
        oxenFeedingBad,
        getOxenFeedingBadMessage,
        slaveFeedingGood,
        getSlaveFeedingGoodMessage,
        slaveFeedingBad,
        getSlaveFeedingBadMessage,
        horseFeedingGood,
        getHorseFeedingGoodMessage,
        horseFeedingBad,
        getHorseFeedingBadMessage,
        overseerGood,
        getOverseerGoodMessage,
        overseerBad,
        getOverseerBadMessage,
        stressGood,
        getStressGoodMessage,
        stressBad,
        getStressBadMessage,
        fertilizerGood,
        getFertilizerGoodMessage,
        fertilizerBad,
        getFertilizerBadMessage,
        slaveHealthGood,
        getSlaveHealthGoodMessage,
        slaveHealthBad,
        getSlaveHealthBadMessage,
        oxenHealthGood,
        getOxenHealthGoodMessage,
        oxenHealthBad,
        getOxenHealthBadMessage,
        horseHealthGood,
        getHorseHealthGoodMessage,
        horseHealthBad,
        getHorseHealthBadMessage,
        creditGood,
        getCreditGoodMessage,
        creditBad,
        getCreditBadMessage,
        // A.14
        actOfGodTemplates,
        actOfGodAdjectives,
        actOfGodDisasters,
        actOfGodConsequences,
        getActOfGodMessage,
        actOfMobsTemplates,
        actOfMobsCrowdSize,
        actOfMobsMotivation,
        actOfMobsAction,
        getActOfMobsMessage,
        warAttackers,
        getWarAttacker,
        warLossMessages,
        getWarLossMessage,
        warWinMessages,
        getWarWinMessage,
        revoltMessages,
        getRevoltMessage,
        healthEventMessages,
        getHealthEventMessage,
        plagueDisease,
        plagueTemplates,
        getPlagueMessage,
        locustMessages,
        getLocustMessage,
        wheatEventMessages,
        getWheatEventMessage,
        goldEventMessages,
        getGoldEventMessage,
        economyEventMessages,
        getEconomyEventMessage,
        laborEventMessages,
        getLaborEventMessage,
        workloadEventMessages,
        getWorkloadEventMessage,
        // A.15
        overseerMissedPayrollMessages,
        getOverseerMissedPayrollMessage,
        // A.16
        tradingInputErrorMessages,
        getTradingInputErrorMessage,
        noFunctionSelectedMessages,
        getNoFunctionSelectedMessage,
        buySellNegativeInputMessages,
        getBuySellNegativeInputMessage,
        loanInputErrorMessages,
        getLoanInputErrorMessage,
        loanNoFunctionSelectedMessages,
        getLoanNoFunctionSelectedMessage,
        loanInsufficientRepaymentMessages,
        getLoanInsufficientRepaymentMessage,
        overseerInputErrorMessages,
        getOverseerInputErrorMessage,
        overseerFractionalErrorMessages,
        getOverseerFractionalErrorMessage,
        overseerFireTooManyMessages,
        getOverseerFireTooManyMessage,
        plantingErrorMessages,
        getPlantingErrorMessage,
        negativePlantingErrorMessages,
        getNegativePlantingErrorMessage,
        pyramidErrorMessages,
        getPyramidErrorMessage,
        negativePyramidErrorMessages,
        getNegativePyramidErrorMessage,
        negativeStoneMessages,
        getNegativeStoneMessage,
        fertilizerErrorMessages,
        getFertilizerErrorMessage,
        negativeFertilizerErrorMessages,
        getNegativeFertilizerErrorMessage,
        feedRateErrorMessages,
        getFeedRateErrorMessage,
        genericNumericInputErrorMessages,
        getGenericNumericInputErrorMessage,
        // A.17
        contractPlayerNames,
        getContractPlayerName,
        // A.18
        quitSavePrompts,
        getQuitSavePrompt
      };
    }
  });

  // src/engine/trading.js
  var require_trading = __commonJS({
    "src/engine/trading.js"(exports, module) {
      "use strict";
      var { gaussian } = require_random();
      var { calculateSalePrice } = require_health();
      var {
        getSupplyLimitMessage,
        getDemandLimitMessage,
        getTransactionSuccessMessage,
        getInsufficientFundsMessage,
        getSellMoreThanOwnedMessage,
        getTradingInputErrorMessage,
        getNoFunctionSelectedMessage
      } = require_messages();
      var LIVESTOCK = ["slaves", "horses", "oxen"];
      var COMMODITY_CONFIG = {
        wheat: { stateField: "wheat", priceField: "wheatPrice", supplyKey: "wheat", healthKey: null },
        slaves: { stateField: "slaves", priceField: "slavePrice", supplyKey: "slave", healthKey: "slaveHealth" },
        oxen: { stateField: "oxen", priceField: "oxenPrice", supplyKey: "oxen", healthKey: "oxenHealth" },
        horses: { stateField: "horses", priceField: "horsePrice", supplyKey: "horse", healthKey: "horseHealth" },
        manure: { stateField: "manure", priceField: "manurePrice", supplyKey: "manure", healthKey: null },
        land: { stateField: "fallow", priceField: "landPrice", supplyKey: "land", healthKey: null }
      };
      function getConfig(commodity) {
        return COMMODITY_CONFIG[commodity];
      }
      function isLivestock(commodity) {
        return LIVESTOCK.includes(commodity);
      }
      function maxBuyable(state, commodity) {
        const cfg = getConfig(commodity);
        const price = state[cfg.priceField];
        const affordable = price > 0 ? Math.floor(state.gold / price) : 0;
        const available = Math.floor(state.supply[cfg.supplyKey]);
        return Math.min(affordable, available);
      }
      function maxSellable(state, commodity) {
        const cfg = getConfig(commodity);
        const owned = state[cfg.stateField];
        const demandCap = Math.floor(state.demand[cfg.supplyKey] * 1.1);
        const currentSupply = state.supply[cfg.supplyKey];
        const marketCapacity = Math.max(0, Math.floor(demandCap - currentSupply));
        return Math.min(owned, marketCapacity);
      }
      function buyCommodity(state, commodity, amount) {
        const cfg = getConfig(commodity);
        const price = state[cfg.priceField];
        const cost = amount * price;
        const available = Math.floor(state.supply[cfg.supplyKey]);
        if (amount > available) {
          const msg2 = getDemandLimitMessage(state.rng, available);
          return { ok: false, message: msg2, available, capped: true };
        }
        if (cost > state.gold) {
          const maxAfford = Math.floor(state.gold / price);
          const msg2 = getInsufficientFundsMessage(state.rng, maxAfford);
          return { ok: false, message: msg2, maxAffordable: maxAfford };
        }
        state.gold -= cost;
        state[cfg.stateField] += amount;
        state.supply[cfg.supplyKey] -= amount;
        const msg = getTransactionSuccessMessage(state.rng);
        return { ok: true, message: msg, amount, cost };
      }
      function sellCommodity(state, commodity, amount) {
        const cfg = getConfig(commodity);
        const owned = state[cfg.stateField];
        if (amount > owned) {
          const msg2 = getSellMoreThanOwnedMessage(state.rng, owned);
          return { ok: false, message: msg2, owned };
        }
        const demandCap = Math.floor(state.demand[cfg.supplyKey] * 1.1);
        const currentSupply = state.supply[cfg.supplyKey];
        const marketCapacity = Math.max(0, demandCap - currentSupply);
        if (amount > marketCapacity) {
          const cappedAmount = Math.floor(marketCapacity);
          const msg2 = getSupplyLimitMessage(state.rng, cappedAmount);
          return { ok: false, message: msg2, maxAccepted: cappedAmount, capped: true };
        }
        const price = state[cfg.priceField];
        let salePrice = price;
        if (isLivestock(commodity) && cfg.healthKey) {
          salePrice = calculateSalePrice(price, state[cfg.healthKey]);
        }
        const revenue = amount * salePrice;
        state.gold += revenue;
        state[cfg.stateField] -= amount;
        state.supply[cfg.supplyKey] += amount;
        const msg = getTransactionSuccessMessage(state.rng);
        return { ok: true, message: msg, amount, revenue };
      }
      function buyLivestock(state, commodity, amount) {
        const cfg = getConfig(commodity);
        const price = state[cfg.priceField];
        const cost = amount * price;
        const available = Math.floor(state.supply[cfg.supplyKey]);
        if (amount > available) {
          const msg2 = getDemandLimitMessage(state.rng, available);
          return { ok: false, message: msg2, available, capped: true };
        }
        if (cost > state.gold) {
          const maxAfford = Math.floor(state.gold / price);
          const msg2 = getInsufficientFundsMessage(state.rng, maxAfford);
          return { ok: false, message: msg2, maxAffordable: maxAfford };
        }
        const existingCount = state[cfg.stateField];
        const existingHealth = state[cfg.healthKey];
        const newHealth = gaussian(state.rng, 0.8, 0.02);
        state.gold -= cost;
        state[cfg.stateField] += amount;
        state.supply[cfg.supplyKey] -= amount;
        if (existingCount + amount > 0) {
          state[cfg.healthKey] = (existingHealth * existingCount + newHealth * amount) / (existingCount + amount);
        }
        const msg = getTransactionSuccessMessage(state.rng);
        return { ok: true, message: msg, amount, cost, newHealth };
      }
      function sellLand(state, category, amount) {
        if (category === "fallow") {
          if (amount > state.fallow) {
            const msg2 = getSellMoreThanOwnedMessage(state.rng, state.fallow);
            return { ok: false, message: msg2, owned: state.fallow };
          }
          const price = state.landPrice;
          const revenue = amount * price;
          state.gold += revenue;
          state.fallow -= amount;
          state.supply.land += amount;
          const msg = getTransactionSuccessMessage(state.rng);
          return { ok: true, message: msg, amount, revenue, cropsDestroyed: 0 };
        }
        if (category === "planted") {
          return sellCroppedLand(state, "planted", amount, "wheatSewn");
        }
        if (category === "growing") {
          return sellCroppedLand(state, "growing", amount, "wheatGrowing");
        }
        if (category === "ripe") {
          return sellCroppedLand(state, "ripe", amount, "wheatRipe");
        }
        return { ok: false, message: "Invalid land category." };
      }
      function sellCroppedLand(state, category, amount, wheatField) {
        if (amount > state[category]) {
          const msg2 = getSellMoreThanOwnedMessage(state.rng, state[category]);
          return { ok: false, message: msg2, owned: state[category] };
        }
        const totalAcres = state[category];
        const proportion = amount / totalAcres;
        const cropsDestroyed = state[wheatField] * proportion;
        const price = state.landPrice;
        const revenue = amount * price;
        state.gold += revenue;
        state[category] -= amount;
        state[wheatField] -= cropsDestroyed;
        state.supply.land += amount;
        const msg = getTransactionSuccessMessage(state.rng);
        return { ok: true, message: msg, amount, revenue, cropsDestroyed };
      }
      function keepCommodity(state, commodity, target) {
        const cfg = getConfig(commodity);
        const current = state[cfg.stateField];
        if (current > target) {
          const excess = current - target;
          return sellCommodity(state, commodity, excess);
        }
        if (current < target) {
          const deficit = target - current;
          if (isLivestock(commodity)) {
            return buyLivestock(state, commodity, deficit);
          }
          return buyCommodity(state, commodity, deficit);
        }
        return { ok: true, message: "No adjustment needed.", amount: 0 };
      }
      module.exports = {
        buyCommodity,
        sellCommodity,
        keepCommodity,
        buyLivestock,
        sellLand,
        sellCroppedLand,
        maxBuyable,
        maxSellable,
        isLivestock,
        getConfig,
        COMMODITY_CONFIG,
        LIVESTOCK
      };
    }
  });

  // src/engine/contracts.js
  var require_contracts = __commonJS({
    "src/engine/contracts.js"(exports, module) {
      "use strict";
      var { uniform, gaussian, absGaussian, exponential, randomInt, pick, nextRaw } = require_random();
      var { COMMODITY_CONFIG } = require_trading();
      var {
        contractPlayerNames,
        getCounterpartyDefaultMessage,
        getCounterpartyPartialPaymentMessage,
        getCounterpartyPartialShipmentMessage,
        getPlayerInsufficientGoodsMessage,
        getPlayerInsufficientFundsContractMessage,
        getBuyContractCompletionMessage,
        getSellContractCompletionMessage
      } = require_messages();
      var COMMODITIES = ["wheat", "slaves", "oxen", "horses", "manure", "land"];
      var MAX_OFFERS = 15;
      var MAX_PENDING = 10;
      var LIVESTOCK_COMMODITIES = ["slaves", "oxen", "horses"];
      var INCOMING_LIVESTOCK_HEALTH = 0.9;
      function bestOfN(rng, n, lo, hi) {
        let best = -Infinity;
        for (let i = 0; i < n; i++) {
          best = Math.max(best, uniform(rng, lo, hi));
        }
        return best;
      }
      function initializeContractPlayers(rng) {
        return contractPlayerNames.map((name) => ({
          name,
          payProbability: bestOfN(rng, 2, 0.5, 1),
          shipProbability: bestOfN(rng, 2, 0.5, 1),
          defaultProbability: bestOfN(rng, 5, 0.95, 1)
        }));
      }
      function usedPairs(state) {
        const pairs = /* @__PURE__ */ new Set();
        for (const c of state.contractOffers) {
          if (c && c.active) pairs.add(c.counterpartyName + "|" + c.commodity);
        }
        for (const c of state.pendingContracts) {
          if (c && c.active) pairs.add(c.counterpartyName + "|" + c.commodity);
        }
        return pairs;
      }
      function pickUnusedPair(state) {
        const pairs = usedPairs(state);
        const players = state.contractPlayers;
        for (let attempts = 0; attempts < 100; attempts++) {
          const player = pick(state.rng, players);
          const commodity = pick(state.rng, COMMODITIES);
          const key = player.name + "|" + commodity;
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
        const type = nextRaw(state.rng) < 0.5 ? "BUY" : "SELL";
        const { player, commodity } = pickUnusedPair(state);
        const marketPrice = getMarketPrice(state, commodity);
        const currentAmount = getCurrentAmount(state, commodity);
        const rawAmount = gaussian(state.rng, 6 * currentAmount, 2 * currentAmount);
        const floor = marketPrice > 0 ? 2e5 / marketPrice : 2e5;
        const amount = Math.max(Math.round(rawAmount), Math.round(floor));
        const premium = 0.4 + exponential(state.rng, 0.6);
        const price = Math.round(amount * marketPrice * premium);
        const duration = randomInt(state.rng, 12, 37);
        return {
          type,
          commodity,
          amount,
          price,
          duration,
          counterpartyName: player.name,
          counterpartyIndex: state.contractPlayers.indexOf(player),
          active: true
        };
      }
      function shouldReplace(state, offer) {
        if (!offer || !offer.active) return true;
        if (offer.duration <= 8) return true;
        return false;
      }
      function ageOffer(state, offer) {
        offer.duration -= 1;
        if (offer.type === "BUY") {
          offer.price = Math.round(offer.price * (1 + uniform(state.rng, 0.01, 0.1)));
        } else {
          offer.price = Math.round(offer.price * (1 - uniform(state.rng, 0.01, 0.1)));
        }
      }
      function refreshOffers(state) {
        if (!state.contractPlayers || state.contractPlayers.length === 0) {
          state.contractPlayers = initializeContractPlayers(state.rng);
        }
        if (!state.contractOffers) state.contractOffers = [];
        while (state.contractOffers.length < MAX_OFFERS) {
          state.contractOffers.push(null);
        }
        for (let i = 0; i < MAX_OFFERS; i++) {
          if (shouldReplace(state, state.contractOffers[i])) {
            state.contractOffers[i] = generateContract(state);
          }
        }
        for (let i = 0; i < MAX_OFFERS; i++) {
          if (state.contractOffers[i] && state.contractOffers[i].active) {
            if (nextRaw(state.rng) < 0.2) {
              state.contractOffers[i] = generateContract(state);
            }
          }
        }
        for (let i = 0; i < MAX_OFFERS; i++) {
          const offer = state.contractOffers[i];
          if (offer && offer.active) {
            ageOffer(state, offer);
          }
        }
        return state;
      }
      function acceptContract(state, offerIndex) {
        if (state.pendingContracts.length >= MAX_PENDING) {
          return { ok: false, message: "You have too many contracts already" };
        }
        const offer = state.contractOffers[offerIndex];
        if (!offer || !offer.active) {
          return { ok: false, message: "No active contract at that slot" };
        }
        offer.active = false;
        const pending = { ...offer, active: true };
        state.pendingContracts.push(pending);
        return { ok: true };
      }
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
        if (playerGoods < contract.amount) {
          return settleBuyInsufficientGoods(state, contract, cfg, playerGoods, perUnit, face);
        }
        if (nextRaw(state.rng) > player.payProbability) {
          return settleBuyPartialPayment(state, contract, cfg, player, perUnit, face);
        }
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
        const penalty = Math.round(remainingValue * 0.1);
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
        const fraction = uniform(state.rng, 0.5, 0.95);
        const reducedAmount = Math.round(contract.amount * fraction);
        const reducedPayment = Math.round(reducedAmount * perUnit);
        const remainingValue = contract.price - reducedPayment;
        const bonus = Math.round(remainingValue * 0.1);
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
        if (state.gold < contract.price) {
          return settleSellInsufficientFunds(state, contract, cfg, perUnit, face);
        }
        if (nextRaw(state.rng) > player.shipProbability) {
          return settleSellPartialShipment(state, contract, cfg, player, perUnit, face);
        }
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
        const penalty = Math.round(contract.price * 0.1);
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
        const fraction = uniform(state.rng, 0.5, 0.95);
        const reducedAmount = Math.round(contract.amount * fraction);
        const reducedPayment = Math.round(reducedAmount * perUnit);
        const remainingValue = contract.price - reducedPayment;
        const bonus = Math.round(remainingValue * 0.1);
        state.gold -= reducedPayment;
        state.gold += bonus;
        addGoods(state, contract.commodity, reducedAmount, cfg);
        contract.amount -= reducedAmount;
        contract.price -= reducedPayment;
        const text = getCounterpartyPartialShipmentMessage(state.rng);
        queueMessage(state, face, text, contract.counterpartyName, contract.commodity);
        return { settled: true, full: false, reducedAmount, reducedPayment, bonus };
      }
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
          if (nextRaw(state.rng) > player.defaultProbability) {
            processDefault(state, contract);
            continue;
          }
          contract.duration -= 1;
          if (contract.duration <= 0) {
            if (contract.type === "BUY") {
              settleBuyContract(state, contract);
            } else {
              settleSellContract(state, contract);
            }
          }
        }
        state.pendingContracts = state.pendingContracts.filter((c) => c && c.active);
        return state;
      }
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
          type: "contracts",
          mode: "browsing",
          selectedIndex: indices.length > 0 ? indices[0] : 0
        };
        return state;
      }
      function navigateContract(state, direction) {
        const indices = activeOfferIndices(state);
        if (indices.length === 0) return state;
        const currentPos = indices.indexOf(state.dialog.selectedIndex);
        let newPos;
        if (direction === "down") {
          newPos = (currentPos + 1) % indices.length;
        } else {
          newPos = (currentPos - 1 + indices.length) % indices.length;
        }
        state.dialog.selectedIndex = indices[newPos];
        return state;
      }
      function acceptSelected(state) {
        const offer = state.contractOffers[state.dialog.selectedIndex];
        if (!offer || !offer.active) return state;
        const result = acceptContract(state, state.dialog.selectedIndex);
        if (result.ok) {
          const face = offer.counterpartyIndex % 4;
          const verb = offer.type === "BUY" ? "sell" : "buy";
          const text = offer.counterpartyName + " will " + verb + " " + offer.amount + " " + offer.commodity + " for " + offer.price + " gold in " + offer.duration + " months.";
          state.dialog = null;
          state.faceMessage = { text, face };
        } else {
          state.statusMessage = result.message;
          state.dialog = null;
        }
        return state;
      }
      function handleContractInput(state, key) {
        if (key === "Escape") {
          state.dialog = null;
          return state;
        }
        if (key === "ArrowDown") {
          return navigateContract(state, "down");
        }
        if (key === "ArrowUp") {
          return navigateContract(state, "up");
        }
        if (key === "Enter") {
          return acceptSelected(state);
        }
        return state;
      }
      function clickContractRow(state, rowIndex) {
        if (state.dialog.selectedIndex === rowIndex) {
          return acceptSelected(state);
        }
        state.dialog.selectedIndex = rowIndex;
        return state;
      }
      function showNextContractMessage(state) {
        if (state.contractMessages && state.contractMessages.length > 0) {
          const msg = state.contractMessages.shift();
          state.dialog = { type: "faceMessage", ...msg };
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
        acceptSelected,
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
    }
  });

  // src/engine/events.js
  var require_events = __commonJS({
    "src/engine/events.js"(exports, module) {
      "use strict";
      var { uniform, gaussian, absGaussian, randomInt } = require_random();
      var {
        lookup,
        lashToSufferingTable,
        healthToSicknessTable,
        hatredToDestructionTable,
        stressLashTable
      } = require_tables();
      var {
        getActOfGodMessage,
        getActOfMobsMessage,
        getWarAttacker,
        getWarLossMessage,
        getWarWinMessage,
        getRevoltMessage,
        getHealthEventMessage,
        getPlagueMessage,
        getLocustMessage,
        getWheatEventMessage,
        getGoldEventMessage,
        getEconomyEventMessage,
        getLaborEventMessage,
        getWorkloadEventMessage
      } = require_messages();
      var EVENT_RANGES = [
        { max: 1, type: "locusts" },
        { max: 5, type: "plague" },
        { max: 7, type: "actOfGod" },
        { max: 19, type: "actOfMobs" },
        { max: 20, type: "war" },
        { max: 29, type: "revolt" },
        { max: 44, type: "workload" },
        { max: 59, type: "healthEvent" },
        { max: 64, type: "laborEvent" },
        { max: 74, type: "wheatEvent" },
        { max: 84, type: "goldEvent" },
        { max: 100, type: "economyEvent" }
      ];
      function selectEventType(roll) {
        for (const range of EVENT_RANGES) {
          if (roll <= range.max) return range.type;
        }
        return "economyEvent";
      }
      var EVENT_HANDLERS = {
        locusts: applyLocusts,
        plague: applyPlague,
        actOfGod: applyActOfGod,
        actOfMobs: applyActOfMobs,
        war: applyWar,
        revolt: applyRevolt,
        workload: applyWorkload,
        healthEvent: applyHealthEvent,
        laborEvent: applyLaborEvent,
        wheatEvent: applyWheatEvent,
        goldEvent: applyGoldEvent,
        economyEvent: applyEconomyEvent
      };
      function applyEvent(state, eventType) {
        const handler = EVENT_HANDLERS[eventType];
        if (handler) handler(state);
      }
      function applyLocusts(state) {
        const totalLand = state.planted + state.growing + state.ripe;
        if (totalLand === 0 && state.fallow === 0) return;
        const totalAcres = state.fallow + totalLand;
        state.fallow += totalLand;
        state.planted = 0;
        state.growing = 0;
        state.ripe = 0;
        state.wheatSewn = 0;
        state.wheatGrowing = 0;
        state.wheatRipe = 0;
        const workPerAcre = gaussian(state.rng, 5, 1);
        state.temporaryWorkAddition += Math.max(0, 15 * state.slaves + workPerAcre * totalAcres);
      }
      function applyPlague(state) {
        const totalPop = state.slaves + state.oxen + state.horses;
        if (totalPop === 0) return;
        applyPlagueToSpecies(state, "slaveHealth", "slaves");
        applyPlagueToSpecies(state, "oxenHealth", "oxen");
        applyPlagueToSpecies(state, "horseHealth", "horses");
      }
      function applyPlagueToSpecies(state, healthKey, popKey) {
        state[healthKey] *= uniform(state.rng, 0.2, 0.9);
        state[popKey] = Math.floor(state[popKey] * uniform(state.rng, 0.7, 0.95));
      }
      function applyActOfGod(state) {
        const rng = state.rng;
        const totalAcres = state.fallow + state.planted + state.growing + state.ripe;
        applyGodToField(state, "fallow", rng);
        applyGodToLandWithWheat(state, "planted", "wheatSewn", rng);
        applyGodToLandWithWheat(state, "growing", "wheatGrowing", rng);
        applyGodToLandWithWheat(state, "ripe", "wheatRipe", rng);
        applyGodToField(state, "slaves", rng);
        applyGodToField(state, "oxen", rng);
        applyGodToField(state, "horses", rng);
        applyGodToField(state, "wheat", rng);
        applyGodToField(state, "manure", rng);
        const workPerSlave = gaussian(rng, 11, 3);
        const workPerAcre = gaussian(rng, 5, 1);
        state.temporaryWorkAddition += Math.max(0, workPerSlave * state.slaves + workPerAcre * totalAcres);
      }
      function applyGodToField(state, key, rng) {
        state[key] = Math.floor(state[key] * uniform(rng, 0.3, 0.8));
      }
      function applyGodToLandWithWheat(state, landKey, wheatKey, rng) {
        const factor = uniform(rng, 0.3, 0.8);
        state[landKey] = Math.floor(state[landKey] * factor);
        state[wheatKey] = Math.floor(state[wheatKey] * factor);
      }
      function applyActOfMobs(state) {
        const rng = state.rng;
        const totalAcres = state.fallow + state.planted + state.growing + state.ripe;
        state.wheatGrowing *= uniform(rng, 0.6, 0.8);
        state.wheatSewn *= uniform(rng, 0.6, 0.8);
        state.wheatRipe *= uniform(rng, 0.6, 0.8);
        state.slaves = Math.floor(state.slaves * uniform(rng, 0.6, 0.8));
        state.oxen = Math.floor(state.oxen * uniform(rng, 0.6, 0.8));
        state.horses = Math.floor(state.horses * uniform(rng, 0.6, 0.8));
        state.wheat = Math.floor(state.wheat * uniform(rng, 0.6, 0.8));
        state.manure *= uniform(rng, 1.05, 1.2);
        state.manure += uniform(rng, totalAcres * 0.5, totalAcres * 3);
        const workPerSlave = uniform(rng, 5, 10);
        const workPerAcre = gaussian(rng, 5, 1);
        state.temporaryWorkAddition += Math.max(0, workPerSlave * state.slaves + workPerAcre * totalAcres);
      }
      function applyWar(state) {
        const rng = state.rng;
        const myArmy = state.overseers + 1;
        const hisArmy = Math.min(1e5, state.overseers) * absGaussian(rng, 1, 0.2) + 1;
        const myDice = myArmy * absGaussian(rng, 1, 0.3);
        const hisDice = hisArmy * absGaussian(rng, 1, 0.3);
        const rawGain = hisDice < 1e-3 ? 0 : myDice / hisDice;
        const maxGain = (hisArmy + myArmy) / myArmy;
        const gain = Math.min(rawGain, maxGain);
        state.warGain = gain;
        applyWarToResources(state, gain, rng);
        const workPerSlave = gaussian(rng, 15, 3);
        const enemyWork = hisArmy * gaussian(rng, 5, 1);
        state.temporaryWorkAddition += Math.max(0, workPerSlave * state.slaves + enemyWork);
      }
      function applyWarToResources(state, gain, rng) {
        const fields = [
          "fallow",
          "planted",
          "growing",
          "ripe",
          "slaves",
          "oxen",
          "horses",
          "wheat",
          "manure"
        ];
        for (const key of fields) {
          const factor = gain * absGaussian(rng, 1, 0.2);
          state[key] = Math.max(0, Math.floor(state[key] * factor));
        }
        state.gold = Math.floor(state.gold * gain * absGaussian(rng, 1, 0.2));
      }
      function applyRevolt(state) {
        if (state.slaves === 0) return;
        const rng = state.rng;
        const lashRate = lookup(state.overseerPressure, stressLashTable);
        const suffering = lookup(lashRate, lashToSufferingTable);
        const sickness = lookup(state.slaveHealth, healthToSicknessTable);
        const hatred = (suffering + sickness) / 2;
        const destruction = lookup(hatred, hatredToDestructionTable) * absGaussian(rng, 1, 0.2);
        const survival = Math.max(0, Math.min(1, 1 - destruction));
        state.destructionPercent = Math.round(destruction * 100);
        applyRevoltSurvival(state, survival);
        const workPerSlave = gaussian(rng, 18, 3);
        const workPerOverseer = gaussian(rng, 30, 5);
        state.temporaryWorkAddition += Math.max(0, workPerSlave * state.slaves + workPerOverseer * state.overseers);
      }
      function applyRevoltSurvival(state, survival) {
        const fields = [
          "fallow",
          "planted",
          "growing",
          "ripe",
          "slaves",
          "oxen",
          "horses",
          "wheat",
          "manure"
        ];
        for (const key of fields) {
          state[key] = Math.floor(state[key] * survival);
        }
        state.gold = Math.floor(state.gold * survival);
        state.wheatSewn = Math.floor(state.wheatSewn * survival);
        state.wheatGrowing = Math.floor(state.wheatGrowing * survival);
        state.wheatRipe = Math.floor(state.wheatRipe * survival);
      }
      function applyWorkload(state) {
        if (state.slaves === 0) return;
        const rng = state.rng;
        const totalAcres = state.fallow + state.planted + state.growing + state.ripe;
        const workPerSlave = gaussian(rng, 10, 3);
        const workPerAcre = gaussian(rng, 8, 2);
        state.temporaryWorkAddition += Math.max(0, workPerSlave * state.slaves + workPerAcre * totalAcres);
      }
      function applyHealthEvent(state) {
        const totalPop = state.slaves + state.oxen + state.horses;
        if (totalPop === 0) return;
        const rng = state.rng;
        state.slaveHealth *= Math.max(0.01, gaussian(rng, 0.6, 0.1));
        state.oxenHealth *= Math.max(0.01, gaussian(rng, 0.6, 0.1));
        state.horseHealth *= Math.max(0.01, gaussian(rng, 0.6, 0.1));
      }
      function applyLaborEvent(state) {
        if (state.overseers === 0) return;
        const rng = state.rng;
        const raiseMultiplier = 1 + Math.max(0.01, gaussian(rng, 0.2, 0.05));
        state.lastRaisePercent = Math.round((raiseMultiplier - 1) * 100);
        state.overseerPay = Math.round(state.overseerPay * raiseMultiplier);
        const retainFactor = Math.max(0.5, gaussian(rng, 0.9, 0.03));
        state.overseers = Math.max(0, Math.floor(state.overseers * retainFactor));
        state.overseerPressure += Math.max(0, gaussian(rng, 0.5, 0.1));
      }
      function applyWheatEvent(state) {
        const totalWheat = state.wheat + state.wheatSewn + state.wheatGrowing + state.wheatRipe;
        if (totalWheat === 0) return;
        const rng = state.rng;
        const lossFactor = Math.min(0.99, Math.max(0.01, gaussian(rng, 0.7, 0.07)));
        state.lastLossPercent = Math.round((1 - lossFactor) * 100);
        state.wheat = Math.floor(state.wheat * lossFactor);
        state.wheatSewn = Math.floor(state.wheatSewn * lossFactor);
        state.wheatGrowing = Math.floor(state.wheatGrowing * lossFactor);
        state.wheatRipe = Math.floor(state.wheatRipe * lossFactor);
      }
      function applyGoldEvent(state) {
        if (state.gold === 0) return;
        const rng = state.rng;
        const lossFactor = Math.min(0.99, Math.max(0.01, gaussian(rng, 0.65, 0.1)));
        state.lastLossPercent = Math.round((1 - lossFactor) * 100);
        state.gold = Math.floor(state.gold * lossFactor);
      }
      function applyEconomyEvent(state) {
        const rng = state.rng;
        const priceKeys = ["wheatPrice", "oxenPrice", "horsePrice", "slavePrice", "manurePrice"];
        for (const key of priceKeys) {
          const factor = Math.max(0.1, gaussian(rng, 1, 0.15));
          state[key] = Math.max(1, Math.round(state[key] * factor));
        }
        state.inflation += gaussian(rng, 0, 0.01);
      }
      var MESSAGE_GENERATORS = {
        locusts: (state) => getLocustMessage(state.rng),
        plague: (state) => getPlagueMessage(state.rng),
        actOfGod: (state) => getActOfGodMessage(state.rng),
        actOfMobs: (state) => getActOfMobsMessage(state.rng),
        war: (state) => buildWarMessage(state),
        revolt: (state) => getRevoltMessage(state.rng, state.destructionPercent || 0),
        workload: (state) => getWorkloadEventMessage(state.rng, "extra labor"),
        healthEvent: (state) => getHealthEventMessage(state.rng),
        laborEvent: (state) => getLaborEventMessage(state.rng, state.lastRaisePercent || 20),
        wheatEvent: (state) => getWheatEventMessage(state.rng, state.lastLossPercent || 30),
        goldEvent: (state) => getGoldEventMessage(state.rng, state.lastLossPercent || 35),
        economyEvent: (state) => getEconomyEventMessage(state.rng)
      };
      function buildWarMessage(state) {
        const attacker = getWarAttacker(state.rng);
        const gain = state.warGain || 1;
        if (gain >= 1) {
          const pct2 = Math.round((gain - 1) * 100);
          return attacker + " " + getWarWinMessage(state.rng) + " " + pct2 + "%";
        }
        const pct = Math.round((1 - gain) * 100);
        return attacker + " " + getWarLossMessage(state.rng) + " " + pct + "%";
      }
      function getEventMessage(state, eventType) {
        const generator = MESSAGE_GENERATORS[eventType];
        const text = generator ? generator(state) : "Something happened.";
        const face = randomInt(state.rng, 0, 5);
        return { face, text };
      }
      module.exports = {
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
        getEventMessage,
        EVENT_RANGES
      };
    }
  });

  // src/engine/simulation.js
  var require_simulation = __commonJS({
    "src/engine/simulation.js"(exports, module) {
      "use strict";
      var { nextRaw, randomInt } = require_random();
      var { wheatRot, advanceLandCycle, spreadManure } = require_planting();
      var { calculateWheatDemand, calculateWheatEfficiency, feedAll, produceManure } = require_feeding();
      var {
        calculateWorkComponents,
        sumComponents,
        calculateWorkAbility,
        calculateOxMultiplier,
        calculateMaxWorkPerSlave,
        calculateSlaveEfficiency,
        calculateWorkDeficit
      } = require_workload();
      var { addStones, pyramidGoldCost, isWin, maxHeight } = require_pyramid();
      var { updateSlaveHealth, updateOxenHealth, updateHorseHealth, updatePopulations } = require_health();
      var { calculateStress, calculateLashRate, calculateMotivation, payOverseers } = require_overseers();
      var {
        monthlyInterest,
        adjustCreditRating,
        handleNegativeGoldOverseers,
        processEmergencyLoan,
        checkForeclosure
      } = require_loans();
      var { runAllSupplyDemandCycles, updateInflation, updatePrices, calculateOwnershipCosts } = require_market();
      var { processContracts, refreshOffers } = require_contracts();
      var { selectEventType, applyEvent, getEventMessage } = require_events();
      var { getForeclosureMessage, getForeclosureWarningMessage, getWinMessage } = require_messages();
      function snapshotPrev(state) {
        return {
          gold: state.gold,
          wheat: state.wheat,
          slaves: state.slaves,
          oxen: state.oxen,
          horses: state.horses,
          manure: state.manure,
          loan: state.loan,
          pyramidStones: state.pyramidStones,
          pyramidHeight: state.pyramidHeight,
          month: state.month,
          year: state.year
        };
      }
      function advanceMonth(state) {
        state.month += 1;
        if (state.month > 12) {
          state.month = 1;
          state.year += 1;
        }
      }
      function checkRandomEvent(state) {
        const roll = nextRaw(state.rng);
        state.randomEvent = roll < 0.125;
        return state.randomEvent;
      }
      function doFeeding(state) {
        const rng = state.rng;
        wheatRot(state, rng);
        const sowingWheat = state.plantingQuota * 20;
        const demand = calculateWheatDemand(state, state.slaveEfficiency, sowingWheat);
        const wheatEff = calculateWheatEfficiency(state.wheat, demand);
        const result = feedAll(state, state.slaveEfficiency, wheatEff);
        state.wheat -= result.totalEaten;
        const newManure = produceManure(result.totalEaten, rng);
        state.manure += newManure;
        return { wheatEff, result };
      }
      function doWorkload(state) {
        const rng = state.rng;
        const components = calculateWorkComponents(state);
        const requiredWork = sumComponents(components);
        const motivationResult = calculateMotivation(state, rng);
        state.motivation = motivationResult.total;
        const workAbility = calculateWorkAbility(state.slaveHealth, rng);
        const oxMult = calculateOxMultiplier(state, rng);
        const maxWorkPerSlave = calculateMaxWorkPerSlave(state.motivation, workAbility, oxMult);
        const totalWorkDone = maxWorkPerSlave * state.slaves;
        if (state.slaveEfficiencyOverride != null) {
          state.slaveEfficiency = state.slaveEfficiencyOverride;
          delete state.slaveEfficiencyOverride;
        } else {
          state.slaveEfficiency = calculateSlaveEfficiency(totalWorkDone, requiredWork);
        }
        const deficit = calculateWorkDeficit(totalWorkDone, requiredWork);
        const deficitPerSlave = state.slaves > 0 ? deficit / state.slaves : 0;
        state.temporaryWorkAddition = 0;
        return { requiredWork, maxWorkPerSlave, totalWorkDone, deficit, deficitPerSlave, oxMult };
      }
      function doLandCycle(state) {
        const rng = state.rng;
        advanceLandCycle(state, state.slaveEfficiency, rng);
        spreadManure(state, state.slaveEfficiency);
      }
      function doPyramid(state) {
        const prevHeight = state.pyramidHeight;
        const stonesAdded = addStones(state);
        const avgHeight = Math.ceil((prevHeight + state.pyramidHeight) / 2);
        const cost = pyramidGoldCost(avgHeight, stonesAdded);
        state.gold -= cost;
        return stonesAdded;
      }
      function doHealth(state, feedingResult, workInfo) {
        const rng = state.rng;
        const lashRate = calculateLashRate(state, rng);
        updateSlaveHealth(state, state.slaveFeedRate, lashRate, workInfo.maxWorkPerSlave, workInfo.oxMult, rng);
        updateOxenHealth(state, state.oxenFeedRate, rng);
        updateHorseHealth(state, state.horseFeedRate, rng);
        updatePopulations(state, rng);
      }
      function doOverseerStress(state, deficitPerSlave) {
        calculateStress(state, deficitPerSlave);
      }
      function doFinances(state) {
        payOverseers(state);
        calculateOwnershipCosts(state, state.rng);
        monthlyInterest(state);
        adjustCreditRating(state);
        handleNegativeGoldOverseers(state, state.rng);
        processEmergencyLoan(state);
        const foreclosure = checkForeclosure(state);
        if (foreclosure.foreclosed) {
          state.gameOver = true;
          state.faceMessage = { face: state.neighbors.banker, text: getForeclosureMessage(state.rng) };
        } else if (foreclosure.warning) {
          state.faceMessage = { face: state.neighbors.banker, text: getForeclosureWarningMessage(state.rng) };
        }
      }
      function doMarket(state) {
        const rng = state.rng;
        runAllSupplyDemandCycles(state, rng);
        updateInflation(state, rng);
        updatePrices(state, rng);
      }
      function doContracts(state) {
        processContracts(state);
        refreshOffers(state);
      }
      function doRandomEvent(state) {
        if (!checkRandomEvent(state)) return;
        const roll = randomInt(state.rng, 0, 100);
        const eventType = selectEventType(roll);
        applyEvent(state, eventType);
        state.message = getEventMessage(state, eventType);
      }
      function doWinCheck(state) {
        const max = maxHeight(state.pyramidBase);
        if (isWin(state.pyramidHeight, max)) {
          state.gameWon = true;
          state.faceMessage = { face: randomInt(state.rng, 0, 4), text: getWinMessage(state.rng) };
        }
      }
      function simulateMonth(state) {
        state.prev = snapshotPrev(state);
        doFeeding(state);
        const workInfo = doWorkload(state);
        doLandCycle(state);
        doPyramid(state);
        doHealth(state, null, workInfo);
        doOverseerStress(state, workInfo.deficitPerSlave);
        doFinances(state);
        doWinCheck(state);
        doMarket(state);
        doContracts(state);
        doRandomEvent(state);
        advanceMonth(state);
        return state;
      }
      module.exports = { simulateMonth, snapshotPrev, advanceMonth, checkRandomEvent };
    }
  });

  // src/engine/dialogs.js
  var require_dialogs = __commonJS({
    "src/engine/dialogs.js"(exports, module) {
      "use strict";
      var { buyCommodity, sellCommodity, keepCommodity } = require_trading();
      var { hireOverseers, fireOverseers, obtainOverseers } = require_overseers();
      var { borrow, repay } = require_loans();
      var {
        getTradingInputErrorMessage,
        getNoFunctionSelectedMessage,
        getLoanInputErrorMessage,
        getLoanNoFunctionSelectedMessage,
        getOverseerInputErrorMessage,
        getPlantingErrorMessage,
        getPyramidErrorMessage,
        getFertilizerErrorMessage,
        getInsufficientFundsMessage,
        getSellMoreThanOwnedMessage,
        getSupplyLimitMessage,
        getDemandLimitMessage
      } = require_messages();
      function filterInputChar(char) {
        return /^[0-9.]$/.test(char);
      }
      function openDialog(state, type, commodity) {
        state.dialog = {
          type,
          commodity: commodity || null,
          input: "",
          mode: null,
          error: null
        };
      }
      var MODE_KEYS = {
        buySell: { b: "buy", s: "sell", k: "keep" },
        loan: { b: "borrow", r: "repay" },
        overseer: { h: "hire", f: "fire", o: "obtain" }
      };
      function isModeKey(dialogType, key) {
        const map = MODE_KEYS[dialogType];
        return map && map[key] !== void 0;
      }
      function getModeForKey(dialogType, key) {
        const map = MODE_KEYS[dialogType];
        return map ? map[key] : void 0;
      }
      function handleDialogKey(state, key) {
        if (!state.dialog) return;
        if (key === "Escape") {
          state.dialog = null;
          return;
        }
        if (key === "Enter") {
          executeDialog(state);
          return;
        }
        state.dialog.error = null;
        if (isModeKey(state.dialog.type, key)) {
          state.dialog.mode = getModeForKey(state.dialog.type, key);
          return;
        }
        if (key === "Backspace") {
          state.dialog.input = state.dialog.input.slice(0, -1);
          return;
        }
        if (filterInputChar(key)) {
          state.dialog.input += key;
        }
      }
      function executeDialog(state) {
        if (!state.dialog) return;
        const { type } = state.dialog;
        if (requiresMode(type) && !state.dialog.mode) {
          state.dialog.error = getNoModeError(state, type);
          return;
        }
        const amount = parseFloat(state.dialog.input);
        if (isNaN(amount)) {
          state.dialog.error = getInputError(state, type);
          return;
        }
        dispatchExecution(state, type, amount);
      }
      function requiresMode(type) {
        return type === "buySell" || type === "loan" || type === "overseer";
      }
      function getNoModeError(state, type) {
        const rng = state.rng;
        if (type === "buySell") return getNoFunctionSelectedMessage(rng);
        if (type === "loan") return getLoanNoFunctionSelectedMessage(rng);
        return getOverseerInputErrorMessage(rng);
      }
      function getInputError(state, type) {
        const rng = state.rng;
        if (type === "buySell") return getTradingInputErrorMessage(rng);
        if (type === "loan") return getLoanInputErrorMessage(rng);
        if (type === "planting") return getPlantingErrorMessage(rng);
        if (type === "pyramid") return getPyramidErrorMessage(rng);
        if (type === "manure") return getFertilizerErrorMessage(rng);
        return getOverseerInputErrorMessage(rng);
      }
      function dispatchExecution(state, type, amount) {
        if (type === "buySell") return executeBuySell(state, amount);
        if (type === "loan") return executeLoan(state, amount);
        if (type === "overseer") return executeOverseer(state, amount);
        return executeSimpleDialog(state, type, amount);
      }
      function executeBuySell(state, amount) {
        const { mode, commodity } = state.dialog;
        if (mode === "buy") return executeBuy(state, commodity, amount);
        if (mode === "sell") return executeSell(state, commodity, amount);
        return executeKeep(state, commodity, amount);
      }
      function executeBuy(state, commodity, amount) {
        const result = buyCommodity(state, commodity, amount);
        if (result.ok) {
          state.dialog = null;
          return;
        }
        state.message = { text: result.message, face: 0 };
        state.dialog = null;
      }
      function executeSell(state, commodity, amount) {
        const result = sellCommodity(state, commodity, amount);
        if (result.ok) {
          state.dialog = null;
          return;
        }
        state.message = { text: result.message, face: 0 };
        state.dialog = null;
      }
      function executeKeep(state, commodity, target) {
        const result = keepCommodity(state, commodity, target);
        if (result.ok) {
          state.dialog = null;
          return;
        }
        state.message = { text: result.message, face: 0 };
        state.dialog = null;
      }
      function executeLoan(state, amount) {
        const { mode } = state.dialog;
        if (mode === "borrow") {
          const result2 = borrow(state, amount);
          if (result2.ok) {
            state.dialog = null;
            return;
          }
          state.dialog.error = result2.message || getLoanInputErrorMessage(state.rng);
          return;
        }
        const result = repay(state, amount);
        if (result.ok) {
          state.dialog = null;
          return;
        }
        state.dialog.error = result.message || getLoanInputErrorMessage(state.rng);
      }
      function executeOverseer(state, amount) {
        const { mode } = state.dialog;
        let result;
        if (mode === "hire") result = hireOverseers(state, amount);
        else if (mode === "fire") result = fireOverseers(state, amount);
        else result = obtainOverseers(state, amount);
        if (result.ok) {
          state.dialog = null;
          return;
        }
        state.dialog.error = getOverseerInputErrorMessage(state.rng);
      }
      function executeSimpleDialog(state, type, amount) {
        if (type === "planting") state.plantingQuota = amount;
        else if (type === "pyramid") state.stoneQuota = amount;
        else if (type === "manure") state.manureSpreadQuota = amount;
        state.dialog = null;
      }
      module.exports = {
        openDialog,
        handleDialogKey,
        executeDialog,
        filterInputChar
      };
    }
  });

  // src/engine/neighbors.js
  var require_neighbors = __commonJS({
    "src/engine/neighbors.js"(exports, module) {
      "use strict";
      var { uniform, randomInt, pick, nextRaw } = require_random();
      var msg = require_messages();
      var adviceTopics = [
        {
          name: "oxen-feeding",
          resourceKey: "oxen",
          badCond: (s) => s.oxenFeedRate < 50,
          goodCond: (s) => s.oxenFeedRate > 80,
          goodMsg: (rng) => msg.getOxenFeedingGoodMessage(rng),
          badMsg: (rng) => msg.getOxenFeedingBadMessage(rng)
        },
        {
          name: "horse-feeding",
          resourceKey: "horses",
          badCond: (s) => s.horseFeedRate < 40,
          goodCond: (s) => s.horseFeedRate > 65,
          goodMsg: (rng) => msg.getHorseFeedingGoodMessage(rng),
          badMsg: (rng) => msg.getHorseFeedingBadMessage(rng)
        },
        {
          name: "slave-feeding",
          resourceKey: "slaves",
          badCond: (s) => s.slaveFeedRate < 5,
          goodCond: (s) => s.slaveFeedRate > 8,
          goodMsg: (rng) => msg.getSlaveFeedingGoodMessage(rng),
          badMsg: (rng) => msg.getSlaveFeedingBadMessage(rng)
        },
        {
          name: "overseers",
          resourceKey: "slaves",
          badCond: (s) => slavesPerOverseer(s) > 30,
          goodCond: (s) => slavesPerOverseer(s) < 15,
          goodMsg: (rng) => msg.getOverseerGoodMessage(rng),
          badMsg: (rng) => msg.getOverseerBadMessage(rng)
        },
        {
          name: "stress",
          resourceKey: "overseers",
          badCond: (s) => s.overseerPressure > 0.5,
          goodCond: (s) => s.overseerPressure < 0.2,
          goodMsg: (rng) => msg.getStressGoodMessage(rng),
          badMsg: (rng) => msg.getStressBadMessage(rng)
        },
        {
          name: "fertilizer",
          resourceKey: "planted",
          badCond: (s) => s.manurePerAcre < 2,
          goodCond: (s) => s.manurePerAcre >= 3.5 && s.manurePerAcre <= 7,
          goodMsg: (rng) => msg.getFertilizerGoodMessage(rng),
          badMsg: (rng) => msg.getFertilizerBadMessage(rng)
        },
        {
          name: "slave-health",
          resourceKey: "slaves",
          badCond: (s) => s.slaveHealth < 0.6,
          goodCond: (s) => s.slaveHealth > 0.9,
          goodMsg: (rng) => msg.getSlaveHealthGoodMessage(rng),
          badMsg: (rng) => msg.getSlaveHealthBadMessage(rng)
        },
        {
          name: "oxen-health",
          resourceKey: "oxen",
          badCond: (s) => s.oxenHealth < 0.5,
          goodCond: (s) => s.oxenHealth > 0.85,
          goodMsg: (rng) => msg.getOxenHealthGoodMessage(rng),
          badMsg: (rng) => msg.getOxenHealthBadMessage(rng)
        },
        {
          name: "horse-health",
          resourceKey: "horses",
          badCond: (s) => s.horseHealth < 0.5,
          goodCond: (s) => s.horseHealth > 0.85,
          goodMsg: (rng) => msg.getHorseHealthGoodMessage(rng),
          badMsg: (rng) => msg.getHorseHealthBadMessage(rng)
        },
        {
          name: "credit",
          resourceKey: null,
          badCond: (s) => s.creditRating < 0.4,
          goodCond: (s) => s.creditRating > 0.8,
          goodMsg: (rng) => msg.getCreditGoodMessage(rng),
          badMsg: (rng) => msg.getCreditBadMessage(rng)
        }
      ];
      function slavesPerOverseer(state) {
        return state.overseers > 0 ? state.slaves / state.overseers : Infinity;
      }
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
      function selectAdviceTopic(state, rng) {
        const idx = randomInt(rng, 0, adviceTopics.length);
        const topic = adviceTopics[idx];
        if (topic.resourceKey && state[topic.resourceKey] === 0) return null;
        return topic;
      }
      function evaluateCondition(state, topic) {
        if (topic.badCond(state)) return "bad";
        if (topic.goodCond(state)) return "good";
        return "neutral";
      }
      function chooseChat(state, personality, rng) {
        if (personality === "banker") return { type: "chat", text: msg.getGenericChatMessage(rng) };
        if (nextRaw(rng) < 0.2) return { type: "chat", text: msg.getGenericChatMessage(rng) };
        const topic = selectAdviceTopic(state, rng);
        if (!topic) return { type: "chat", text: msg.getGenericChatMessage(rng) };
        const condition = evaluateCondition(state, topic);
        if (condition === "neutral") return { type: "chat", text: msg.getGenericChatMessage(rng) };
        let quality = determineQuality(condition, personality, rng);
        if (nextRaw(rng) < 0.05) quality = quality === "good" ? "bad" : "good";
        const text = quality === "good" ? topic.goodMsg(rng) : topic.badMsg(rng);
        return { type: quality + "-" + topic.name, text };
      }
      function determineQuality(condition, personality, rng) {
        if (personality === "goodGuy") return condition;
        if (personality === "badGuy") return condition === "good" ? "bad" : "good";
        return nextRaw(rng) < 0.5 ? "good" : "bad";
      }
      var voiceSettings = {
        1: { rate: 100, pitch: 200 },
        2: { rate: 150, pitch: 66 },
        3: { rate: 200, pitch: 100 },
        4: { rate: 250, pitch: 150 }
      };
      function getVoiceSettings(face) {
        return voiceSettings[face] || { rate: 190, pitch: 310 };
      }
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
        const personalities = ["goodGuy", "badGuy", "villageIdiot", "banker"];
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
        state.faceMessage = { face, text, type: "dunning" };
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
    }
  });

  // src/engine/persistence.js
  var require_persistence = __commonJS({
    "src/engine/persistence.js"(exports, module) {
      "use strict";
      var { createGameState } = require_state();
      var { createRandom } = require_random();
      var { refreshOffers } = require_contracts();
      var PERSISTED_KEYS = [
        "gold",
        "wheat",
        "slaves",
        "oxen",
        "horses",
        "manure",
        "fallow",
        "planted",
        "growing",
        "ripe",
        "wheatSewn",
        "wheatGrowing",
        "wheatRipe",
        "slaveHealth",
        "oxenHealth",
        "horseHealth",
        "slaveFeedRate",
        "oxenFeedRate",
        "horseFeedRate",
        "plantingQuota",
        "manureSpreadQuota",
        "stoneQuota",
        "pyramidStones",
        "pyramidBase",
        "pyramidHeight",
        "loan",
        "interestRate",
        "interestAddition",
        "creditRating",
        "creditLimit",
        "creditLowerBound",
        "inflation",
        "worldGrowth",
        "wheatPrice",
        "landPrice",
        "slavePrice",
        "horsePrice",
        "oxenPrice",
        "manurePrice",
        "supply",
        "demand",
        "production",
        "month",
        "year",
        "overseers",
        "overseerPay",
        "overseerPressure",
        "contractOffers",
        "pendingContracts",
        "contractPlayers",
        "neighbors",
        "prev",
        "temporaryWorkAddition",
        "slaveEfficiency",
        "motivation",
        "oxenEfficiency",
        "manurePerAcre",
        "wtRotRt",
        "gameOver",
        "gameWon",
        "licensed",
        "canSave"
      ];
      function serializeState(state) {
        const data = {};
        for (const key of PERSISTED_KEYS) {
          data[key] = deepCopy(state[key]);
        }
        data.rngState = state.rng.state;
        return JSON.stringify(data);
      }
      function deepCopy(value) {
        if (value === null || value === void 0) return value;
        if (typeof value !== "object") return value;
        if (Array.isArray(value)) return value.map(deepCopy);
        const copy = {};
        for (const k of Object.keys(value)) {
          copy[k] = deepCopy(value[k]);
        }
        return copy;
      }
      function deserializeState(json) {
        const data = JSON.parse(json);
        const state = {};
        for (const key of PERSISTED_KEYS) {
          state[key] = data[key];
        }
        state.rng = createRandom(0);
        state.rng.state = data.rngState;
        state.dialog = null;
        state.screen = "game";
        state.message = null;
        state.statusMessage = "";
        state.contractMessages = [];
        return state;
      }
      function saveGame(state, _filename) {
        return serializeState(state);
      }
      function loadGame(savedData) {
        const state = deserializeState(savedData);
        refreshOffers(state);
        return state;
      }
      function resetGame(seed) {
        return createGameState(seed);
      }
      module.exports = { serializeState, deserializeState, saveGame, loadGame, resetGame };
    }
  });

  // src/engine-entry.js
  var require_engine_entry = __commonJS({
    "src/engine-entry.js"(exports, module) {
      module.exports = {
        state: require_state(),
        difficulty: require_difficulty(),
        simulation: require_simulation(),
        dialogs: require_dialogs(),
        contracts: require_contracts(),
        neighbors: require_neighbors(),
        events: require_events(),
        persistence: require_persistence(),
        messages: require_messages(),
        trading: require_trading(),
        loans: require_loans(),
        feeding: require_feeding(),
        planting: require_planting(),
        pyramid: require_pyramid(),
        overseers: require_overseers(),
        market: require_market(),
        health: require_health(),
        workload: require_workload(),
        random: require_random(),
        tables: require_tables()
      };
    }
  });
  return require_engine_entry();
})();
