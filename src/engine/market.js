'use strict';

const { gaussian, absGaussian, uniform } = require('./random');

const PRICE_FIELDS = [
  'wheatPrice', 'landPrice', 'horsePrice', 'oxenPrice',
  'slavePrice', 'manurePrice', 'overseerPay', 'interestRate'
];

const COMMODITIES = ['wheat', 'land', 'manure', 'slave', 'horse', 'oxen'];

const COMMODITY_PRICE_MAP = {
  wheat: 'wheatPrice', land: 'landPrice', manure: 'manurePrice',
  slave: 'slavePrice', horse: 'horsePrice', oxen: 'oxenPrice'
};

function totalLand(state) {
  return state.fallow + state.planted + state.growing + state.ripe;
}

function updateInflation(state, rng) {
  state.inflation += gaussian(rng, 0, 0.001);
}

function updatePrices(state, rng) {
  for (const field of PRICE_FIELDS) {
    state[field] *= absGaussian(rng, 1 + state.inflation, 0.02);
  }
}

function runSupplyDemandCycle(state, commodity, rng) {
  const priceField = COMMODITY_PRICE_MAP[commodity];

  // Demand grows
  state.demand[commodity] *= 1 + (state.worldGrowth / 12);
  const monthlyDemand = state.demand[commodity] / 12;

  // First 80% consumption
  state.supply[commodity] -= monthlyDemand * 0.8;

  // Undersupply check
  if (state.supply[commodity] < 0) {
    state[priceField] *= uniform(rng, 1.0, 1.2);
    state.production[commodity] *= uniform(rng, 1.0, 1.1);
  }

  // Remaining 20% consumption
  state.supply[commodity] -= monthlyDemand * 0.2;
  state.supply[commodity] = Math.max(0, state.supply[commodity]);

  // Oversupply check
  if (state.supply[commodity] > 0) {
    state[priceField] *= uniform(rng, 0.8, 1.0);
    state.production[commodity] *= uniform(rng, 0.9, 1.0);
  }

  // Random production fluctuation
  state.production[commodity] *= uniform(rng, 0.95, 1.05);

  // Add production to supply
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
  const grossWorth = state.slaves * state.slavePrice
    + state.oxen * state.oxenPrice
    + state.horses * state.horsePrice
    + land * state.landPrice
    + state.manure * state.manurePrice
    + state.wheat * state.wheatPrice
    + state.gold;
  const debtToAssetRatio = grossWorth === 0 ? Infinity : state.loan / grossWorth;
  const netWorth = grossWorth - state.loan;
  return { netWorth, debtToAssetRatio };
}

module.exports = {
  totalLand, updateInflation, updatePrices,
  runSupplyDemandCycle, runAllSupplyDemandCycles,
  calculateOwnershipCosts, calculateNetWorth,
  PRICE_FIELDS, COMMODITIES, COMMODITY_PRICE_MAP
};
