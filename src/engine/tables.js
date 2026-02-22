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
  values: [20.0, 35.0, 70.0, 100.0, 150.0, 200.0, 180.0, 140.0, 100.0, 50.0, 0.0]
};

const seasonalYieldTable = {
  min: 1, max: 12,
  values: [0.2, 0.35, 0.5, 0.8, 1.0, 1.5, 1.0, 0.8, 0.55, 0.4, 0.25]
};

const slaveNourishmentTable = {
  min: 0, max: 10,
  values: [-1.0, -0.5, -0.185, 0.036, 0.0565, 0.074, 0.0865, 0.098, 0.12, 0.25, 0.18]
};

const oxenNourishmentTable = {
  min: 0, max: 100,
  values: [-1.0, -0.1, -0.0055, 0.0, 0.044, 0.068, 0.0825, 0.0915, 0.096, 0.098, 0.1]
};

const horseNourishmentTable = {
  min: 0, max: 75,
  values: [-1.0, -0.1, -0.046, 0.0, 0.0695, 0.079, 0.0865, 0.092, 0.0965, 0.099, 0.1]
};

const slaveBirthTable = {
  min: 0, max: 1,
  values: [0.0, 0.0021, 0.007, 0.0161, 0.0364, 0.0644, 0.098, 0.121, 0.134, 0.139, 0.14]
};

const slaveDeathTable = {
  min: 0, max: 1,
  values: [1.0, 0.485, 0.235, 0.135, 0.0855, 0.0605, 0.0405, 0.0255, 0.0155, 0.0105, 0.002]
};

const oxenBirthTable = {
  min: 0, max: 1,
  values: [0.0, 0.0009, 0.00285, 0.00795, 0.0159, 0.028, 0.038, 0.05, 0.06, 0.065, 0.07]
};

const oxenDeathTable = {
  min: 0, max: 1,
  values: [1.0, 0.5, 0.216, 0.0959, 0.0559, 0.031, 0.021, 0.01, 0.009, 0.005, 0.004]
};

const horseBirthTable = {
  min: 0, max: 1,
  values: [0.0, 0.0012, 0.0027, 0.0045, 0.001, 0.02, 0.04, 0.05, 0.06, 0.065, 0.07]
};

const horseDeathTable = {
  min: 0, max: 1,
  values: [1.0, 0.5, 0.245, 0.065, 0.03, 0.02, 0.01, 0.01, 0.008, 0.007, 0.005]
};

const workAbilityTable = {
  min: 0, max: 1,
  values: [0.0, 1.0, 5.0, 10.0, 14.0, 15.0, 17.0, 18.0, 19.0, 19.5, 20.0]
};

const oxMultTable = {
  min: 0, max: 1,
  values: [1.0, 1.44, 1.89, 2.27, 2.65, 3.0, 3.27, 3.5, 3.72, 3.88, 4.0]
};

const positiveMotiveTable = {
  min: 0, max: 0.1,
  values: [0.0, 0.1, 0.2, 0.3, 0.4, 0.45, 0.52, 0.6, 0.63, 0.66, 0.7]
};

const negativeMotiveTable = {
  min: 0, max: 100,
  values: [0.0, 0.1, 0.2, 0.3, 0.35, 0.38, 0.42, 0.45, 0.47, 0.48, 0.5]
};

const stressLashTable = {
  min: 0, max: 10,
  values: [0.0, 20.0, 80.0, 150.0, 300.0, 500.0, 600.0, 700.0, 800.0, 900.0, 1000.0]
};

const lashToSicknessTable = {
  min: 0, max: 100,
  values: [0.0, 0.01, 0.03, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.6, 1.0]
};

const laborToSicknessTable = {
  min: 0, max: 24,
  values: [0.0, 0.0005, 0.0015, 0.002, 0.005, 0.015, 0.03, 0.1, 0.25, 0.5, 1.0]
};

const overseerEffectivenessTable = {
  min: 0, max: 1,
  values: [0.3, 0.44, 0.58, 0.681, 0.762, 0.825, 0.884, 0.93, 0.965, 0.983, 0.997]
};

const oxenEfficiencyTable = {
  min: 0, max: 1,
  values: [0.0, 0.2, 0.1, 0.23, 0.4, 0.7, 0.87, 0.94, 0.965, 0.985, 1.0]
};

const horseEfficiencyTable = {
  min: 0, max: 1,
  values: [0.0, 0.0, 0.015, 0.065, 0.19, 0.66, 0.835, 0.93, 0.99, 1.0, 1.0]
};

const debtSupportTable = {
  min: 0, max: 1,
  values: [0.0, 0.5, 0.7, 0.75, 0.8, 0.9, 1.0, 1.3, 1.7, 2.3, 3.0]
};

const repayIndexTable = {
  min: 0, max: 0.1,
  values: [1.0, 1.02, 1.05, 1.1, 1.15, 1.2, 1.25, 1.275, 1.282, 1.295, 1.3]
};

const dunningIntervalTable = {
  min: 0, max: 1,
  values: [5.0, 6.0, 8.0, 12.0, 20.0, 30.0, 45.0, 60.0, 90.0, 200.0, 300.0]
};

const lashToSufferingTable = {
  min: 0, max: 1,
  values: [0.0, 0.01, 0.02, 0.1, 0.2, 0.4, 0.6, 0.9, 0.95, 0.98, 1.0]
};

const healthToSicknessTable = {
  min: 0, max: 1,
  values: [1.0, 0.95, 0.9, 0.8, 0.4, 0.2, 0.1, 0.04, 0.02, 0.01, 0.0]
};

const hatredToDestructionTable = {
  min: 0, max: 1,
  values: [0.0, 0.01, 0.03, 0.08, 0.15, 0.25, 0.4, 0.6, 0.9, 0.95, 1.0]
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
