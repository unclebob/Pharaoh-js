'use strict';

const { createRandom } = require('../../src/engine/random');
const M = require('../../src/engine/messages');

// Helper: verify a pool is a non-empty array of non-empty strings
function describePool(name, pool, minSize) {
  describe(name, () => {
    it(`has at least ${minSize} entries`, () => {
      expect(pool.length).toBeGreaterThanOrEqual(minSize);
    });

    it('every entry is a non-empty string', () => {
      pool.forEach(m => {
        expect(typeof m).toBe('string');
        expect(m.length).toBeGreaterThan(0);
      });
    });
  });
}

// Helper: verify a simple getter returns a pool member
function describeGetter(name, getter, pool) {
  describe(name, () => {
    it('returns a string from its pool', () => {
      const rng = createRandom(42);
      const result = getter(rng);
      expect(pool).toContain(result);
    });

    it('is deterministic for same seed', () => {
      const r1 = createRandom(77);
      const r2 = createRandom(77);
      expect(getter(r1)).toBe(getter(r2));
    });
  });
}

// Helper: verify a template getter with one numeric arg
function describeTemplateGetter1(name, getter, pool, argValue) {
  describe(name, () => {
    it('returns a string with the value substituted', () => {
      const rng = createRandom(42);
      const result = getter(rng, argValue);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('is deterministic for same seed', () => {
      const r1 = createRandom(77);
      const r2 = createRandom(77);
      expect(getter(r1, argValue)).toBe(getter(r2, argValue));
    });
  });
}

describe('messages', () => {
  // ── A.1 Opening Messages ──
  describePool('openingMessages', M.openingMessages, 29);

  describe('getOpeningMessage', () => {
    it('returns an object with face and text', () => {
      const rng = createRandom(42);
      const msg = M.getOpeningMessage(rng);
      expect(typeof msg.face).toBe('number');
      expect(typeof msg.text).toBe('string');
    });

    it('face is between 0 and 3', () => {
      const rng = createRandom(77);
      const msg = M.getOpeningMessage(rng);
      expect(msg.face).toBeGreaterThanOrEqual(0);
      expect(msg.face).toBeLessThanOrEqual(3);
    });

    it('text is from the opening pool', () => {
      const rng = createRandom(99);
      const msg = M.getOpeningMessage(rng);
      expect(M.openingMessages).toContain(msg.text);
    });

    it('is deterministic for same seed', () => {
      const r1 = createRandom(42);
      const r2 = createRandom(42);
      expect(M.getOpeningMessage(r1)).toEqual(M.getOpeningMessage(r2));
    });
  });

  // ── A.2 Win / Farewell ──
  describePool('winMessages', M.winMessages, 5);
  describeGetter('getWinMessage', M.getWinMessage, M.winMessages);
  describePool('farewellMessages', M.farewellMessages, 5);
  describeGetter('getFarewellMessage', M.getFarewellMessage, M.farewellMessages);

  // ── A.3 Idle Pep Talk ──
  describePool('idlePepTalkMessages', M.idlePepTalkMessages, 55);
  describeGetter('getIdlePepTalkMessage', M.getIdlePepTalkMessage, M.idlePepTalkMessages);

  // ── A.4 Generic Chat ──
  describePool('genericChatMessages', M.genericChatMessages, 37);
  describeGetter('getGenericChatMessage', M.getGenericChatMessage, M.genericChatMessages);

  // ── A.5 Dunning ──
  describePool('dunningMessages', M.dunningMessages, 40);
  describeGetter('getDunningMessage', M.getDunningMessage, M.dunningMessages);

  // ── A.6 Foreclosure Warning ──
  describePool('foreclosureWarningMessages', M.foreclosureWarningMessages, 20);
  describeGetter('getForeclosureWarningMessage', M.getForeclosureWarningMessage, M.foreclosureWarningMessages);

  // ── A.7 Foreclosure ──
  describePool('foreclosureMessages', M.foreclosureMessages, 15);
  describeGetter('getForeclosureMessage', M.getForeclosureMessage, M.foreclosureMessages);

  // ── A.8 Cash Shortage ──
  describePool('cashShortageMessages', M.cashShortageMessages, 10);
  describeGetter('getCashShortageMessage', M.getCashShortageMessage, M.cashShortageMessages);

  // ── A.9 Bankruptcy ──
  describePool('bankruptcyMessages', M.bankruptcyMessages, 10);
  describeGetter('getBankruptcyMessage', M.getBankruptcyMessage, M.bankruptcyMessages);

  // ── A.10 Loan Messages ──
  describePool('creditCheckFeeMessages', M.creditCheckFeeMessages, 15);
  describeTemplateGetter1('getCreditCheckFeeMessage', M.getCreditCheckFeeMessage, null, 500);

  describePool('loanApprovalMessages', M.loanApprovalMessages, 15);
  describe('getLoanApprovalMessage', () => {
    it('substitutes amount and rate', () => {
      const rng = createRandom(42);
      const result = M.getLoanApprovalMessage(rng, 1000, 5.5);
      expect(typeof result).toBe('string');
      expect(result).toMatch(/1000/);
      expect(result).toMatch(/5\.50%/);
    });
  });

  describePool('loanDenialMessages', M.loanDenialMessages, 15);
  describeGetter('getLoanDenialMessage', M.getLoanDenialMessage, M.loanDenialMessages);

  describePool('loanRepaymentMessages', M.loanRepaymentMessages, 7);
  describePool('loanRepaymentSignoffMessages', M.loanRepaymentSignoffMessages, 8);
  describe('getLoanRepaymentMessage', () => {
    it('combines a repayment message and a signoff', () => {
      const rng = createRandom(42);
      const result = M.getLoanRepaymentMessage(rng);
      const hasRepayment = M.loanRepaymentMessages.some(m => result.includes(m));
      const hasSignoff = M.loanRepaymentSignoffMessages.some(m => result.includes(m));
      expect(hasRepayment).toBe(true);
      expect(hasSignoff).toBe(true);
    });
  });

  // ── A.11 Trading Messages ──
  describePool('supplyLimitMessages', M.supplyLimitMessages, 9);
  describeTemplateGetter1('getSupplyLimitMessage', M.getSupplyLimitMessage, null, 500);

  describePool('demandLimitMessages', M.demandLimitMessages, 8);
  describeTemplateGetter1('getDemandLimitMessage', M.getDemandLimitMessage, null, 300);

  describePool('transactionSuccessMessages', M.transactionSuccessMessages, 9);
  describeGetter('getTransactionSuccessMessage', M.getTransactionSuccessMessage, M.transactionSuccessMessages);

  describePool('insufficientFundsMessages', M.insufficientFundsMessages, 9);
  describeTemplateGetter1('getInsufficientFundsMessage', M.getInsufficientFundsMessage, null, 200);

  describePool('sellMoreThanOwnedMessages', M.sellMoreThanOwnedMessages, 5);
  describe('getSellMoreThanOwnedMessage', () => {
    it('substitutes the owned count', () => {
      const rng = createRandom(42);
      const result = M.getSellMoreThanOwnedMessage(rng, 50);
      expect(typeof result).toBe('string');
    });
  });

  // ── A.12 Contract Messages ──
  describePool('counterpartyDefaultMessages', M.counterpartyDefaultMessages, 8);
  describeGetter('getCounterpartyDefaultMessage', M.getCounterpartyDefaultMessage, M.counterpartyDefaultMessages);

  describePool('counterpartyPartialPaymentMessages', M.counterpartyPartialPaymentMessages, 8);
  describeGetter('getCounterpartyPartialPaymentMessage', M.getCounterpartyPartialPaymentMessage, M.counterpartyPartialPaymentMessages);

  describePool('counterpartyPartialShipmentMessages', M.counterpartyPartialShipmentMessages, 8);
  describeGetter('getCounterpartyPartialShipmentMessage', M.getCounterpartyPartialShipmentMessage, M.counterpartyPartialShipmentMessages);

  describePool('playerInsufficientGoodsMessages', M.playerInsufficientGoodsMessages, 10);
  describeGetter('getPlayerInsufficientGoodsMessage', M.getPlayerInsufficientGoodsMessage, M.playerInsufficientGoodsMessages);

  describePool('playerInsufficientFundsContractMessages', M.playerInsufficientFundsContractMessages, 9);
  describeGetter('getPlayerInsufficientFundsContractMessage', M.getPlayerInsufficientFundsContractMessage, M.playerInsufficientFundsContractMessages);

  describePool('buyContractCompletionMessages', M.buyContractCompletionMessages, 14);
  describeGetter('getBuyContractCompletionMessage', M.getBuyContractCompletionMessage, M.buyContractCompletionMessages);

  describePool('sellContractCompletionMessages', M.sellContractCompletionMessages, 9);
  describeGetter('getSellContractCompletionMessage', M.getSellContractCompletionMessage, M.sellContractCompletionMessages);

  // ── A.13 Neighbor Advice (20 pools) ──
  const neighborPools = [
    ['oxenFeedingGood', M.oxenFeedingGood, M.getOxenFeedingGoodMessage, 10],
    ['oxenFeedingBad', M.oxenFeedingBad, M.getOxenFeedingBadMessage, 10],
    ['slaveFeedingGood', M.slaveFeedingGood, M.getSlaveFeedingGoodMessage, 10],
    ['slaveFeedingBad', M.slaveFeedingBad, M.getSlaveFeedingBadMessage, 10],
    ['horseFeedingGood', M.horseFeedingGood, M.getHorseFeedingGoodMessage, 10],
    ['horseFeedingBad', M.horseFeedingBad, M.getHorseFeedingBadMessage, 10],
    ['overseerGood', M.overseerGood, M.getOverseerGoodMessage, 10],
    ['overseerBad', M.overseerBad, M.getOverseerBadMessage, 5],
    ['stressGood', M.stressGood, M.getStressGoodMessage, 10],
    ['stressBad', M.stressBad, M.getStressBadMessage, 10],
    ['fertilizerGood', M.fertilizerGood, M.getFertilizerGoodMessage, 10],
    ['fertilizerBad', M.fertilizerBad, M.getFertilizerBadMessage, 10],
    ['slaveHealthGood', M.slaveHealthGood, M.getSlaveHealthGoodMessage, 15],
    ['slaveHealthBad', M.slaveHealthBad, M.getSlaveHealthBadMessage, 15],
    ['oxenHealthGood', M.oxenHealthGood, M.getOxenHealthGoodMessage, 15],
    ['oxenHealthBad', M.oxenHealthBad, M.getOxenHealthBadMessage, 15],
    ['horseHealthGood', M.horseHealthGood, M.getHorseHealthGoodMessage, 15],
    ['horseHealthBad', M.horseHealthBad, M.getHorseHealthBadMessage, 15],
    ['creditGood', M.creditGood, M.getCreditGoodMessage, 15],
    ['creditBad', M.creditBad, M.getCreditBadMessage, 15]
  ];

  neighborPools.forEach(([name, pool, getter, minSize]) => {
    describePool(name, pool, minSize);
    describeGetter(`get${name[0].toUpperCase() + name.slice(1)}Message`, getter, pool);
  });

  // ── A.14 Random Event Narration ──
  describePool('actOfGodTemplates', M.actOfGodTemplates, 6);
  describePool('actOfGodAdjectives', M.actOfGodAdjectives, 6);
  describePool('actOfGodDisasters', M.actOfGodDisasters, 11);
  describePool('actOfGodConsequences', M.actOfGodConsequences, 10);

  describe('getActOfGodMessage', () => {
    it('produces a non-empty string', () => {
      const rng = createRandom(42);
      const result = M.getActOfGodMessage(rng);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('is deterministic for same seed', () => {
      const r1 = createRandom(42);
      const r2 = createRandom(42);
      expect(M.getActOfGodMessage(r1)).toBe(M.getActOfGodMessage(r2));
    });
  });

  describePool('actOfMobsTemplates', M.actOfMobsTemplates, 7);
  describePool('actOfMobsCrowdSize', M.actOfMobsCrowdSize, 10);
  describePool('actOfMobsMotivation', M.actOfMobsMotivation, 19);
  describePool('actOfMobsAction', M.actOfMobsAction, 16);

  describe('getActOfMobsMessage', () => {
    it('produces a non-empty string', () => {
      const rng = createRandom(42);
      const result = M.getActOfMobsMessage(rng);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describePool('warAttackers', M.warAttackers, 13);
  describeGetter('getWarAttacker', M.getWarAttacker, M.warAttackers);

  describePool('warLossMessages', M.warLossMessages, 4);
  describeGetter('getWarLossMessage', M.getWarLossMessage, M.warLossMessages);

  describePool('warWinMessages', M.warWinMessages, 4);
  describeGetter('getWarWinMessage', M.getWarWinMessage, M.warWinMessages);

  describePool('revoltMessages', M.revoltMessages, 5);
  describe('getRevoltMessage', () => {
    it('substitutes the percent', () => {
      const rng = createRandom(42);
      const result = M.getRevoltMessage(rng, 25);
      expect(result).toMatch(/25%/);
    });
  });

  describePool('healthEventMessages', M.healthEventMessages, 10);
  describeGetter('getHealthEventMessage', M.getHealthEventMessage, M.healthEventMessages);

  describePool('plagueDisease', M.plagueDisease, 12);
  describePool('plagueTemplates', M.plagueTemplates, 5);
  describe('getPlagueMessage', () => {
    it('produces a string containing a disease name', () => {
      const rng = createRandom(42);
      const result = M.getPlagueMessage(rng);
      const hasDisease = M.plagueDisease.some(d => result.includes(d));
      expect(hasDisease).toBe(true);
    });
  });

  describePool('locustMessages', M.locustMessages, 6);
  describeGetter('getLocustMessage', M.getLocustMessage, M.locustMessages);

  describePool('wheatEventMessages', M.wheatEventMessages, 10);
  describe('getWheatEventMessage', () => {
    it('substitutes the percent', () => {
      const rng = createRandom(42);
      const result = M.getWheatEventMessage(rng, 15);
      expect(result).toMatch(/15%/);
    });
  });

  describePool('goldEventMessages', M.goldEventMessages, 10);
  describe('getGoldEventMessage', () => {
    it('substitutes the percent', () => {
      const rng = createRandom(42);
      const result = M.getGoldEventMessage(rng, 30);
      expect(result).toMatch(/30%/);
    });
  });

  describePool('economyEventMessages', M.economyEventMessages, 10);
  describeGetter('getEconomyEventMessage', M.getEconomyEventMessage, M.economyEventMessages);

  describePool('laborEventMessages', M.laborEventMessages, 9);
  describe('getLaborEventMessage', () => {
    it('substitutes the percent', () => {
      const rng = createRandom(42);
      const result = M.getLaborEventMessage(rng, 10);
      expect(result).toMatch(/10%/);
    });
  });

  describePool('workloadEventMessages', M.workloadEventMessages, 10);
  describe('getWorkloadEventMessage', () => {
    it('substitutes the work description', () => {
      const rng = createRandom(42);
      const result = M.getWorkloadEventMessage(rng, '500 man-hours');
      expect(result).toMatch(/500 man-hours/);
    });
  });

  // ── A.15 Overseer Messages ──
  describePool('overseerMissedPayrollMessages', M.overseerMissedPayrollMessages, 9);
  describe('getOverseerMissedPayrollMessage', () => {
    it('substitutes the raise percent where template contains placeholder', () => {
      const rng = createRandom(42);
      const result = M.getOverseerMissedPayrollMessage(rng, 15.5);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ── A.16 Input Error Messages ──
  describePool('tradingInputErrorMessages', M.tradingInputErrorMessages, 5);
  describeGetter('getTradingInputErrorMessage', M.getTradingInputErrorMessage, M.tradingInputErrorMessages);

  describePool('noFunctionSelectedMessages', M.noFunctionSelectedMessages, 5);
  describeGetter('getNoFunctionSelectedMessage', M.getNoFunctionSelectedMessage, M.noFunctionSelectedMessages);

  describePool('buySellNegativeInputMessages', M.buySellNegativeInputMessages, 5);
  describeGetter('getBuySellNegativeInputMessage', M.getBuySellNegativeInputMessage, M.buySellNegativeInputMessages);

  describePool('loanInputErrorMessages', M.loanInputErrorMessages, 5);
  describeGetter('getLoanInputErrorMessage', M.getLoanInputErrorMessage, M.loanInputErrorMessages);

  describePool('loanNoFunctionSelectedMessages', M.loanNoFunctionSelectedMessages, 5);
  describeGetter('getLoanNoFunctionSelectedMessage', M.getLoanNoFunctionSelectedMessage, M.loanNoFunctionSelectedMessages);

  describePool('loanInsufficientRepaymentMessages', M.loanInsufficientRepaymentMessages, 5);
  describeGetter('getLoanInsufficientRepaymentMessage', M.getLoanInsufficientRepaymentMessage, M.loanInsufficientRepaymentMessages);

  describePool('overseerInputErrorMessages', M.overseerInputErrorMessages, 5);
  describeGetter('getOverseerInputErrorMessage', M.getOverseerInputErrorMessage, M.overseerInputErrorMessages);

  describePool('overseerFractionalErrorMessages', M.overseerFractionalErrorMessages, 5);
  describeGetter('getOverseerFractionalErrorMessage', M.getOverseerFractionalErrorMessage, M.overseerFractionalErrorMessages);

  describePool('overseerFireTooManyMessages', M.overseerFireTooManyMessages, 5);
  describeGetter('getOverseerFireTooManyMessage', M.getOverseerFireTooManyMessage, M.overseerFireTooManyMessages);

  describePool('plantingErrorMessages', M.plantingErrorMessages, 5);
  describeGetter('getPlantingErrorMessage', M.getPlantingErrorMessage, M.plantingErrorMessages);

  describePool('negativePlantingErrorMessages', M.negativePlantingErrorMessages, 5);
  describeGetter('getNegativePlantingErrorMessage', M.getNegativePlantingErrorMessage, M.negativePlantingErrorMessages);

  describePool('pyramidErrorMessages', M.pyramidErrorMessages, 5);
  describeGetter('getPyramidErrorMessage', M.getPyramidErrorMessage, M.pyramidErrorMessages);

  describePool('negativePyramidErrorMessages', M.negativePyramidErrorMessages, 5);
  describeGetter('getNegativePyramidErrorMessage', M.getNegativePyramidErrorMessage, M.negativePyramidErrorMessages);

  describePool('negativeStoneMessages', M.negativeStoneMessages, 4);
  describeGetter('getNegativeStoneMessage', M.getNegativeStoneMessage, M.negativeStoneMessages);

  describePool('fertilizerErrorMessages', M.fertilizerErrorMessages, 5);
  describeGetter('getFertilizerErrorMessage', M.getFertilizerErrorMessage, M.fertilizerErrorMessages);

  describePool('negativeFertilizerErrorMessages', M.negativeFertilizerErrorMessages, 5);
  describeGetter('getNegativeFertilizerErrorMessage', M.getNegativeFertilizerErrorMessage, M.negativeFertilizerErrorMessages);

  describePool('feedRateErrorMessages', M.feedRateErrorMessages, 5);
  describeGetter('getFeedRateErrorMessage', M.getFeedRateErrorMessage, M.feedRateErrorMessages);

  describePool('genericNumericInputErrorMessages', M.genericNumericInputErrorMessages, 6);
  describeGetter('getGenericNumericInputErrorMessage', M.getGenericNumericInputErrorMessage, M.genericNumericInputErrorMessages);

  // ── A.17 Contract Player Names ──
  describePool('contractPlayerNames', M.contractPlayerNames, 10);
  describeGetter('getContractPlayerName', M.getContractPlayerName, M.contractPlayerNames);

  // ── A.18 Quit/Save Prompts ──
  describePool('quitSavePrompts', M.quitSavePrompts, 22);
  describeGetter('getQuitSavePrompt', M.getQuitSavePrompt, M.quitSavePrompts);
});
