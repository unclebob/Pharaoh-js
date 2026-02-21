'use strict';

function lookup(x, table) {
  const { min, max, values } = table;
  const clamped = Math.max(min, Math.min(max, x));
  const scaled = ((clamped - min) / (max - min)) * 10;
  const idx = Math.floor(scaled);
  if (idx >= 10) return values[10];
  const frac = scaled - idx;
  return values[idx] + frac * (values[idx + 1] - values[idx]);
}

const yieldTable = {
  min: 0, max: 10,
  values: [20, 60, 110, 155, 185, 200, 195, 175, 145, 110, 70]
};

const seasonalYieldTable = {
  min: 1, max: 12,
  values: [0.20, 0.30, 0.50, 0.75, 1.00, 1.27, 1.27, 1.10, 0.85, 0.60, 0.35]
};

const slaveNourishmentTable = {
  min: 0, max: 10,
  values: [-0.04, -0.02, 0.00, 0.02, 0.05, 0.08, 0.10, 0.12, 0.14, 0.16, 0.18]
};

const oxenNourishmentTable = {
  min: 0, max: 100,
  values: [-0.03, -0.01, 0.01, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10]
};

const horseNourishmentTable = {
  min: 0, max: 75,
  values: [-0.03, -0.01, 0.01, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10]
};

const slaveBirthTable = {
  min: 0, max: 1,
  values: [0.00, 0.01, 0.02, 0.04, 0.06, 0.08, 0.09, 0.10, 0.11, 0.12, 0.14]
};

const slaveDeathTable = {
  min: 0, max: 1,
  values: [1.00, 0.50, 0.25, 0.12, 0.06, 0.03, 0.015, 0.008, 0.005, 0.003, 0.002]
};

const oxenBirthTable = {
  min: 0, max: 1,
  values: [0.00, 0.005, 0.01, 0.02, 0.03, 0.04, 0.05, 0.055, 0.06, 0.065, 0.07]
};

const oxenDeathTable = {
  min: 0, max: 1,
  values: [1.00, 0.50, 0.25, 0.12, 0.06, 0.03, 0.015, 0.010, 0.008, 0.006, 0.005]
};

const horseBirthTable = {
  min: 0, max: 1,
  values: [0.00, 0.005, 0.01, 0.02, 0.03, 0.035, 0.04, 0.05, 0.055, 0.06, 0.065]
};

const horseDeathTable = {
  min: 0, max: 1,
  values: [1.00, 0.50, 0.25, 0.12, 0.06, 0.03, 0.015, 0.010, 0.007, 0.005, 0.004]
};

const workAbilityTable = {
  min: 0, max: 1,
  values: [0, 2, 4, 7, 10, 13, 15, 17, 18, 19, 20]
};

const oxMultTable = {
  min: 0, max: 1,
  values: [1.0, 1.4, 1.8, 2.2, 2.6, 3.0, 3.2, 3.4, 3.6, 3.8, 4.0]
};

const positiveMotiveTable = {
  min: 0, max: 0.1,
  values: [0, 0.1, 0.2, 0.35, 0.5, 0.6, 0.7, 0.8, 0.88, 0.95, 1.0]
};

const negativeMotiveTable = {
  min: 0, max: 1,
  values: [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50]
};

const stressLashTable = {
  min: 0, max: 1,
  values: [0, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 1.00]
};

const lashToSicknessTable = {
  min: 0, max: 1,
  values: [0, 0.015, 0.03, 0.045, 0.06, 0.075, 0.09, 0.105, 0.12, 0.135, 0.15]
};

const laborToSicknessTable = {
  min: 0, max: 30,
  values: [0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10]
};

const overseerEffectivenessTable = {
  min: 0, max: 2,
  values: [0.30, 0.55, 0.72, 0.84, 0.91, 0.95, 0.975, 0.99, 0.995, 0.997, 1.00]
};

const oxenEfficiencyTable = {
  min: 0, max: 1,
  values: [0, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 1.00]
};

const horseEfficiencyTable = {
  min: 0, max: 1,
  values: [0, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 1.00]
};

const debtSupportTable = {
  min: 0, max: 1,
  values: [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80]
};

const repayIndexTable = {
  min: 0, max: 1,
  values: [1.00, 1.03, 1.06, 1.09, 1.12, 1.15, 1.18, 1.21, 1.24, 1.27, 1.30]
};

const dunningIntervalTable = {
  min: 0, max: 1,
  values: [5, 34.5, 64, 93.5, 123, 152.5, 182, 211.5, 241, 270.5, 300]
};

const lashToSufferingTable = {
  min: 0, max: 1,
  values: [0, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 1.00]
};

const healthToSicknessTable = {
  min: 0, max: 1,
  values: [1.00, 0.90, 0.80, 0.70, 0.60, 0.50, 0.40, 0.30, 0.20, 0.10, 0.00]
};

const hatredToDestructionTable = {
  min: 0, max: 1,
  values: [0, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 1.00]
};

module.exports = {
  lookup,
  yieldTable, seasonalYieldTable,
  slaveNourishmentTable, oxenNourishmentTable, horseNourishmentTable,
  slaveBirthTable, slaveDeathTable,
  oxenBirthTable, oxenDeathTable,
  horseBirthTable, horseDeathTable,
  workAbilityTable, oxMultTable,
  positiveMotiveTable, negativeMotiveTable,
  stressLashTable, lashToSicknessTable, laborToSicknessTable,
  overseerEffectivenessTable,
  oxenEfficiencyTable, horseEfficiencyTable,
  debtSupportTable, repayIndexTable, dunningIntervalTable,
  lashToSufferingTable, healthToSicknessTable, hatredToDestructionTable
};
