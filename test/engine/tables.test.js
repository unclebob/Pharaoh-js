'use strict';

const tables = require('../../src/engine/tables');
const { lookup } = tables;

const ALL_TABLE_NAMES = [
  'yieldTable', 'seasonalYieldTable',
  'slaveNourishmentTable', 'oxenNourishmentTable', 'horseNourishmentTable',
  'slaveBirthTable', 'slaveDeathTable',
  'oxenBirthTable', 'oxenDeathTable',
  'horseBirthTable', 'horseDeathTable',
  'workAbilityTable', 'oxMultTable',
  'positiveMotiveTable', 'negativeMotiveTable',
  'stressLashTable', 'lashToSicknessTable', 'laborToSicknessTable',
  'overseerEffectivenessTable',
  'oxenEfficiencyTable', 'horseEfficiencyTable',
  'debtSupportTable', 'repayIndexTable', 'dunningIntervalTable',
  'lashToSufferingTable', 'healthToSicknessTable', 'hatredToDestructionTable'
];

describe('tables', () => {
  describe('lookup', () => {
    const testTable = { min: 0, max: 10, values: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] };

    it('returns first value at min', () => {
      expect(lookup(0, testTable)).toBe(0);
    });

    it('returns last value at max', () => {
      expect(lookup(10, testTable)).toBe(100);
    });

    it('interpolates at midpoint between entries', () => {
      expect(lookup(0.5, testTable)).toBe(5);
    });

    it('interpolates between arbitrary points', () => {
      expect(lookup(2.5, testTable)).toBe(25);
    });

    it('clamps below min', () => {
      expect(lookup(-5, testTable)).toBe(0);
    });

    it('clamps above max', () => {
      expect(lookup(15, testTable)).toBe(100);
    });

    it('handles exact index positions', () => {
      expect(lookup(3, testTable)).toBe(30);
      expect(lookup(7, testTable)).toBe(70);
    });

    it('interpolates non-linear table', () => {
      const curved = { min: 0, max: 10, values: [0, 1, 4, 9, 16, 25, 36, 49, 64, 81, 100] };
      expect(lookup(0, curved)).toBe(0);
      expect(lookup(5, curved)).toBe(25);
      expect(lookup(2.5, curved)).toBeCloseTo(6.5);
    });
  });

  describe('all tables exist and have correct structure', () => {
    it.each(ALL_TABLE_NAMES)('%s is exported', (name) => {
      expect(tables[name]).toBeDefined();
    });

    it.each(ALL_TABLE_NAMES)('%s has min, max, and 11 values', (name) => {
      const t = tables[name];
      expect(typeof t.min).toBe('number');
      expect(typeof t.max).toBe('number');
      expect(t.max).toBeGreaterThan(t.min);
      expect(t.values).toHaveLength(11);
      t.values.forEach(v => expect(typeof v).toBe('number'));
    });
  });

  describe('table value spot checks', () => {
    it('yieldTable: 0 manure gives low yield, mid-range gives high', () => {
      expect(lookup(0, tables.yieldTable)).toBeCloseTo(20, 0);
      const peak = lookup(5, tables.yieldTable);
      expect(peak).toBeGreaterThan(150);
      expect(peak).toBeLessThanOrEqual(200);
    });

    it('yieldTable: over-fertilization drops yield', () => {
      const atFive = lookup(5, tables.yieldTable);
      const atTen = lookup(10, tables.yieldTable);
      expect(atTen).toBeLessThan(atFive);
    });

    it('seasonalYieldTable: Jan is low, Jun/Jul peak', () => {
      const jan = lookup(1, tables.seasonalYieldTable);
      const jun = lookup(6, tables.seasonalYieldTable);
      expect(jan).toBeLessThan(0.5);
      expect(jun).toBeGreaterThan(1.0);
    });

    it('slaveNourishmentTable: 0 feed is negative, max is positive', () => {
      expect(lookup(0, tables.slaveNourishmentTable)).toBeLessThan(0);
      expect(lookup(10, tables.slaveNourishmentTable)).toBeGreaterThan(0.1);
    });

    it('slaveDeathTable: 0 health -> high death, 1 health -> low death', () => {
      expect(lookup(0, tables.slaveDeathTable)).toBeCloseTo(1.0, 1);
      expect(lookup(1, tables.slaveDeathTable)).toBeLessThan(0.01);
    });

    it('slaveBirthTable: 0 health -> 0 birth, 1 health -> ~0.14', () => {
      expect(lookup(0, tables.slaveBirthTable)).toBeCloseTo(0, 1);
      expect(lookup(1, tables.slaveBirthTable)).toBeGreaterThan(0.1);
    });

    it('workAbilityTable: 0 health -> 0, 1 health -> ~20', () => {
      expect(lookup(0, tables.workAbilityTable)).toBe(0);
      expect(lookup(1, tables.workAbilityTable)).toBeCloseTo(20, 0);
    });

    it('oxMultTable: 0 ratio -> 1, 0.5 ratio -> 3, 1.0 ratio -> 4', () => {
      expect(lookup(0, tables.oxMultTable)).toBeCloseTo(1, 0);
      expect(lookup(0.5, tables.oxMultTable)).toBeCloseTo(3, 0);
      expect(lookup(1, tables.oxMultTable)).toBeCloseTo(4, 0);
    });

    it('debtSupportTable: 0 credit -> 0.3, 1 credit -> 0.8', () => {
      expect(lookup(0, tables.debtSupportTable)).toBeCloseTo(0.3, 1);
      expect(lookup(1, tables.debtSupportTable)).toBeCloseTo(0.8, 1);
    });

    it('dunningIntervalTable: 0 credit -> 5, 1 credit -> 300', () => {
      expect(lookup(0, tables.dunningIntervalTable)).toBeCloseTo(5, 0);
      expect(lookup(1, tables.dunningIntervalTable)).toBeCloseTo(300, 0);
    });

    it('healthToSicknessTable: inverse - 0 health -> 1, 1 health -> 0', () => {
      expect(lookup(0, tables.healthToSicknessTable)).toBeCloseTo(1.0, 1);
      expect(lookup(1, tables.healthToSicknessTable)).toBeCloseTo(0, 1);
    });

    it('oxenNourishmentTable: 0 feed negative, max positive', () => {
      expect(lookup(0, tables.oxenNourishmentTable)).toBeLessThan(0);
      expect(lookup(100, tables.oxenNourishmentTable)).toBeGreaterThan(0.05);
    });

    it('horseNourishmentTable: 0 feed negative, max positive', () => {
      expect(lookup(0, tables.horseNourishmentTable)).toBeLessThan(0);
      expect(lookup(75, tables.horseNourishmentTable)).toBeGreaterThan(0.05);
    });

    it('overseerEffectivenessTable: 0 -> 0.3, 1 -> ~1.0, 2 -> 1.0', () => {
      expect(lookup(0, tables.overseerEffectivenessTable)).toBeCloseTo(0.3, 1);
      expect(lookup(1, tables.overseerEffectivenessTable)).toBeCloseTo(1.0, 0);
      expect(lookup(2, tables.overseerEffectivenessTable)).toBeCloseTo(1.0, 1);
    });

    it('lashToSufferingTable: 0 -> 0, 1 -> 1', () => {
      expect(lookup(0, tables.lashToSufferingTable)).toBeCloseTo(0, 1);
      expect(lookup(1, tables.lashToSufferingTable)).toBeCloseTo(1.0, 1);
    });

    it('hatredToDestructionTable: 0 -> 0, 1 -> 1', () => {
      expect(lookup(0, tables.hatredToDestructionTable)).toBeCloseTo(0, 1);
      expect(lookup(1, tables.hatredToDestructionTable)).toBeCloseTo(1.0, 1);
    });
  });
});
