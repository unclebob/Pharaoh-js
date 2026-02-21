'use strict';

const { absGaussian } = require('./random');
const { calculateSalePrice } = require('./health');
const {
  getSupplyLimitMessage, getDemandLimitMessage,
  getTransactionSuccessMessage, getInsufficientFundsMessage,
  getSellMoreThanOwnedMessage, getTradingInputErrorMessage,
  getNoFunctionSelectedMessage
} = require('./messages');

const LIVESTOCK = ['slaves', 'horses', 'oxen'];

const COMMODITY_CONFIG = {
  wheat:  { stateField: 'wheat',  priceField: 'wheatPrice',  supplyKey: 'wheat',  healthKey: null },
  slaves: { stateField: 'slaves', priceField: 'slavePrice',  supplyKey: 'slave',  healthKey: 'slaveHealth' },
  oxen:   { stateField: 'oxen',   priceField: 'oxenPrice',   supplyKey: 'oxen',   healthKey: 'oxenHealth' },
  horses: { stateField: 'horses', priceField: 'horsePrice',  supplyKey: 'horse',  healthKey: 'horseHealth' },
  manure: { stateField: 'manure', priceField: 'manurePrice',  supplyKey: 'manure', healthKey: null },
  land:   { stateField: 'fallow', priceField: 'landPrice',   supplyKey: 'land',   healthKey: null }
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
    const msg = getDemandLimitMessage(state.rng, available);
    return { ok: false, message: msg, available, capped: true };
  }

  if (cost > state.gold) {
    const maxAfford = Math.floor(state.gold / price);
    const msg = getInsufficientFundsMessage(state.rng, maxAfford);
    return { ok: false, message: msg, maxAffordable: maxAfford };
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
    const msg = getSellMoreThanOwnedMessage(state.rng, owned);
    return { ok: false, message: msg, owned };
  }

  const demandCap = Math.floor(state.demand[cfg.supplyKey] * 1.1);
  const currentSupply = state.supply[cfg.supplyKey];
  const marketCapacity = Math.max(0, demandCap - currentSupply);

  if (amount > marketCapacity) {
    const cappedAmount = Math.floor(marketCapacity);
    const msg = getSupplyLimitMessage(state.rng, cappedAmount);
    return { ok: false, message: msg, maxAccepted: cappedAmount, capped: true };
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
    const msg = getDemandLimitMessage(state.rng, available);
    return { ok: false, message: msg, available, capped: true };
  }

  if (cost > state.gold) {
    const maxAfford = Math.floor(state.gold / price);
    const msg = getInsufficientFundsMessage(state.rng, maxAfford);
    return { ok: false, message: msg, maxAffordable: maxAfford };
  }

  const existingCount = state[cfg.stateField];
  const existingHealth = state[cfg.healthKey];
  const newHealth = absGaussian(state.rng, 0.8, 0.05);

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
  if (category === 'fallow') {
    if (amount > state.fallow) {
      const msg = getSellMoreThanOwnedMessage(state.rng, state.fallow);
      return { ok: false, message: msg, owned: state.fallow };
    }
    const price = state.landPrice;
    const revenue = amount * price;
    state.gold += revenue;
    state.fallow -= amount;
    state.supply.land += amount;
    const msg = getTransactionSuccessMessage(state.rng);
    return { ok: true, message: msg, amount, revenue, cropsDestroyed: 0 };
  }

  if (category === 'planted') {
    return sellCroppedLand(state, 'planted', amount, 'wheatSewn');
  }
  if (category === 'growing') {
    return sellCroppedLand(state, 'growing', amount, 'wheatGrowing');
  }
  if (category === 'ripe') {
    return sellCroppedLand(state, 'ripe', amount, 'wheatRipe');
  }

  return { ok: false, message: 'Invalid land category.' };
}

function sellCroppedLand(state, category, amount, wheatField) {
  if (amount > state[category]) {
    const msg = getSellMoreThanOwnedMessage(state.rng, state[category]);
    return { ok: false, message: msg, owned: state[category] };
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
  return { ok: true, message: 'No adjustment needed.', amount: 0 };
}

module.exports = {
  buyCommodity, sellCommodity, keepCommodity,
  buyLivestock, sellLand, sellCroppedLand,
  maxBuyable, maxSellable,
  isLivestock, getConfig, COMMODITY_CONFIG, LIVESTOCK
};
