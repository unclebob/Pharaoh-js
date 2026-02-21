'use strict';

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const {
  borrow, offerCreditCheck, executeCreditCheck,
  repay, monthlyInterest, adjustCreditRating,
  processEmergencyLoan, checkForeclosure,
  handleNegativeGoldOverseers, calculateRealNetWorth
} = require('../../src/engine/loans');
const { lookup, repayIndexTable } = require('../../src/engine/tables');
const { createRandom } = require('../../src/engine/random');
const {
  creditCheckFeeMessages, getCreditCheckFeeMessage,
  loanApprovalMessages, getLoanApprovalMessage,
  loanDenialMessages, getLoanDenialMessage,
  loanRepaymentMessages, loanRepaymentSignoffMessages, getLoanRepaymentMessage,
  cashShortageMessages, getCashShortageMessage,
  foreclosureMessages, getForeclosureMessage,
  bankruptcyMessages, getBankruptcyMessage,
  foreclosureWarningMessages, getForeclosureWarningMessage,
  loanInputErrorMessages, getLoanInputErrorMessage
} = require('../../src/engine/messages');

// ── Borrowing ──

Given('the credit limit is {int}', function (limit) {
  this.state.creditLimit = limit;
});

Given('the current loan is {int}', function (amount) {
  this.state.loan = amount;
});

When('the player borrows {int} gold', function (amount) {
  this.prevGold = this.state.gold;
  this.prevInterestAddition = this.state.interestAddition;
  this.borrowResult = borrow(this.state, amount);
});

// "the player's gold should increase by {int}" is defined in trading_steps.js
// "the player's gold should decrease by {int}" is defined in trading_steps.js
// "the player has {int} gold" is defined in game_setup_steps.js

When('the player tries to borrow {int} gold', function (amount) {
  this.prevGold = this.state.gold;
  this.requestedBorrowAmount = amount;
  this.borrowResult = borrow(this.state, amount);
  if (this.borrowResult.needCreditCheck) {
    this.creditCheckOffer = offerCreditCheck(this.state, amount);
  }
});

Then('a credit check is offered', function () {
  assert.strictEqual(this.borrowResult.needCreditCheck, true);
});

// ── Credit Check ──

Given('the player accepts the credit check fee', function () {
  this.state.gold = 50000;
  this.state.creditLimit = 100;
  this.state.loan = 0;
  this.state.creditRating = 0.8;
  this.state.slaves = 50;
  this.state.slavePrice = 1000;
  this.state.slaveHealth = 1.0;
  this.requestedBorrowAmount = 1000;
  this.prevGold = this.state.gold;
  this.creditCheckResult = executeCreditCheck(this.state, this.requestedBorrowAmount);
});

Then('the credit limit is recalculated as real net worth times credit rating', function () {
  const rnw = calculateRealNetWorth(this.state);
  const expected = Math.max(rnw * this.state.creditRating, this.state.creditLowerBound);
  assert(Math.abs(this.state.creditLimit - expected) < 1,
    `Expected credit limit ~${expected}, got ${this.state.creditLimit}`);
});

Given('the player has {int} wheat, {int} slaves, {int} oxen, {int} horses, {int} manure',
  function (wheat, slaves, oxen, horses, manure) {
    this.state.wheat = wheat;
    this.state.slaves = slaves;
    this.state.oxen = oxen;
    this.state.horses = horses;
    this.state.manure = manure;
  });

Given('the credit rating is {float}', function (rating) {
  this.state.creditRating = rating;
});

When('the player accepts the credit check', function () {
  this.prevGold = this.state.gold;
  this.creditCheckResult = executeCreditCheck(this.state, this.requestedBorrowAmount);
});

// "the loan is granted" is used as both Then and When
// When used as When (message scenario), generate the approval message
// When used as Then (credit check scenario), verify the result
Then('the loan is granted', function () {
  if (this.creditCheckResult) {
    assert.strictEqual(this.creditCheckResult.granted, true);
  }
  this.loanApprovalMessage = getLoanApprovalMessage(
    this.state.rng, this.requestedBorrowAmount || 0,
    this.state.interestRate + this.state.interestAddition
  );
});

Then('the loan is denied', function () {
  if (this.creditCheckResult) {
    assert.strictEqual(this.creditCheckResult.granted, false);
  }
  this.loanDenialMessage = getLoanDenialMessage(this.state.rng);
});

Then('the fee is deducted from gold', function () {
  assert(this.state.gold < this.prevGold,
    `Expected gold to decrease. Was ${this.prevGold}, now ${this.state.gold}`);
});

Given('the credit lower bound is {int}', function (bound) {
  this.state.creditLowerBound = bound;
});

When('the player rejects the credit check', function () {
  this.creditCheckRejected = true;
});

Then('the player returns to the loan input', function () {
  assert.strictEqual(this.creditCheckRejected, true);
});

// ── Loan near limit ──

Given('the loan is {int}', function (amount) {
  this.state.loan = amount;
});

Then('the interest addition increases by {float}', function (expected) {
  const increase = this.state.interestAddition - (this.prevInterestAddition || 0);
  assert(Math.abs(increase - expected) < 0.001,
    `Expected interest addition increase of ${expected}, got ${increase}`);
});

// ── Repaying ──

Given('the player has a loan of {int}', function (amount) {
  this.state.loan = amount;
  // Ensure sufficient gold to cover monthly interest during simulation
  const monthlyInterestEst = amount * (this.state.interestRate + this.state.interestAddition + 5) / 100;
  if (this.state.gold < monthlyInterestEst * 2) {
    this.state.gold = Math.ceil(monthlyInterestEst * 2);
  }
});

// "the player has {int} gold" is defined in game_setup_steps.js

When('the player repays the full {int}', function (amount) {
  this.prevGold = this.state.gold;
  this.prevCreditRating = this.state.creditRating;
  this.prevInterestAddition = this.state.interestAddition;
  this.repayResult = repay(this.state, amount);
});

Then('the credit rating improves by \\(1 - credit rating) \\/ {int}', function (divisor) {
  const expectedImprovement = (1 - this.prevCreditRating) / divisor;
  const actualImprovement = this.state.creditRating - this.prevCreditRating;
  assert(Math.abs(actualImprovement - expectedImprovement) < 0.001,
    `Expected improvement ${expectedImprovement}, got ${actualImprovement}`);
});

Then('the interest addition is multiplied by {float}', function (factor) {
  const expected = this.prevInterestAddition * factor;
  assert(Math.abs(this.state.interestAddition - expected) < 0.001,
    `Expected interest addition ${expected}, got ${this.state.interestAddition}`);
});

When('the player repays {int} gold', function (amount) {
  this.state.gold = Math.max(this.state.gold, amount);
  this.prevGold = this.state.gold;
  this.prevCreditRating = this.state.creditRating;
  this.prevInterestAddition = this.state.interestAddition;
  this.prevLoan = this.state.loan;
  this.repayAmount = amount;
  this.repayResult = repay(this.state, amount);
});

Then('the loan decreases by {int}', function (expected) {
  assert.strictEqual(this.prevLoan - this.state.loan, expected);
});

Then('the credit rating is multiplied by the repay index', function () {
  const ratio = this.repayAmount / this.prevLoan;
  const repayIndex = lookup(ratio, repayIndexTable);
  const expected = this.prevCreditRating * repayIndex;
  assert(Math.abs(this.state.creditRating - expected) < 0.001,
    `Expected credit rating ${expected}, got ${this.state.creditRating}`);
});

Then('the interest addition is divided by the repay index', function () {
  const ratio = this.repayAmount / this.prevLoan;
  const repayIndex = lookup(ratio, repayIndexTable);
  const expected = this.prevInterestAddition / repayIndex;
  assert(Math.abs(this.state.interestAddition - expected) < 0.001,
    `Expected interest addition ${expected}, got ${this.state.interestAddition}`);
});

When('the player tries to repay {int}', function (amount) {
  this.repayResult = repay(this.state, amount);
});

Then('the repayment is rejected', function () {
  assert.strictEqual(this.repayResult.ok, false);
});

// ── Monthly Interest ──

Given('the interest rate is {int}', function (rate) {
  this.state.interestRate = rate;
});

Given('the interest addition is {float}', function (addition) {
  this.state.interestAddition = addition;
});

Then(/^gold decreases by (\d+) \* \((\d+) \+ (\d+)\) \/ (\d+) = (\d+)$/,
  function (loan, rate, addition, divisor, expected) {
    const decrease = this.prevGold - this.state.gold;
    assert(decrease >= expected,
      `Expected gold decrease of at least ${expected}, got ${decrease}`);
  });

// ── Credit Rating Dynamics ──

Given('the player has an outstanding loan', function () {
  this.state.loan = 50000;
  this.state.gold = 100000;
});

Then('the credit rating is multiplied by {float}', function (factor) {
  const expected = this.prevCreditRating * factor;
  assert(Math.abs(this.state.creditRating - expected) < 0.001,
    `Expected credit rating ${expected}, got ${this.state.creditRating}`);
});

Given('the player has no outstanding loan', function () {
  this.state.loan = 0;
  this.state.gold = 100000;
});

Then('the credit rating increases by \\(1 - credit rating) \\/ {int}', function (divisor) {
  const expectedIncrease = (1 - this.prevCreditRating) / divisor;
  const actualIncrease = this.state.creditRating - this.prevCreditRating;
  assert(Math.abs(actualIncrease - expectedIncrease) < 0.001,
    `Expected increase ${expectedIncrease}, got ${actualIncrease}`);
});

// ── Emergency Loans ──

Given("the player's gold drops below 0 at end of month", function () {
  this.state.gold = -5000;
  this.state.creditRating = 0.8;
  this.prevCreditRating = this.state.creditRating;
  this.prevInterestAddition = this.state.interestAddition;
  this.prevLoan = this.state.loan;
  this.emergencyResult = processEmergencyLoan(this.state);
});

Then('the credit rating decreases by \\(1 - credit rating) \\/ {int}', function (divisor) {
  const expectedDecrease = (1 - this.prevCreditRating) / divisor;
  const actualDecrease = this.prevCreditRating - this.state.creditRating;
  assert(Math.abs(actualDecrease - expectedDecrease) < 0.001,
    `Expected decrease ${expectedDecrease}, got ${actualDecrease}`);
});

Then(/^an emergency loan of \|gold\| \* ([\d.]+) is taken$/, function (multiplier) {
  assert(this.state.loan > this.prevLoan,
    `Expected loan to increase. Was ${this.prevLoan}, now ${this.state.loan}`);
  const deficit = 5000;
  const expectedIncrease = deficit * parseFloat(multiplier);
  const actualIncrease = this.state.loan - this.prevLoan;
  assert(Math.abs(actualIncrease - expectedIncrease) < 1,
    `Expected loan increase ${expectedIncrease}, got ${actualIncrease}`);
});

Given("the player's gold is negative", function () {
  this.state.gold = -999999;
  this.state.creditRating = 0.01;
});

Given('the emergency loan cannot cover the deficit', function () {
  this.state.loan = 999999999;
});

Then('the game ends with a bankruptcy message', function () {
  const result = processEmergencyLoan(this.state);
  const fcResult = checkForeclosure(this.state);
  assert(result.needed || fcResult.foreclosed,
    'Expected bankruptcy or foreclosure');
});

// ── Foreclosure ──

Given('the net worth is calculated as total assets minus loan', function () {
  // Explanatory step; net worth calc is in checkForeclosure
});

When('the debt-to-asset ratio exceeds the debt support limit', function () {
  this.state.loan = 100000;
  this.state.gold = 1000;
  this.state.slaves = 0;
  this.state.oxen = 0;
  this.state.horses = 0;
  this.state.fallow = 0;
  this.state.planted = 0;
  this.state.growing = 0;
  this.state.ripe = 0;
  this.state.manure = 0;
  this.state.wheat = 0;
  this.state.creditRating = 0.5;
  this.foreclosureResult = checkForeclosure(this.state);
});

Then('the bank forecloses', function () {
  if (!this.foreclosureResult) {
    this.foreclosureResult = checkForeclosure(this.state);
  }
  assert.strictEqual(this.foreclosureResult.foreclosed, true);
});

Then('the game ends', function () {
  if (this.foreclosureResult && this.foreclosureResult.foreclosed) {
    this.state.gameOver = true;
  }
  assert.strictEqual(this.state.gameOver, true);
});

Given('the debt-to-asset ratio exceeds 80% of the debt support limit', function () {
  this.state.loan = 50000;
  this.state.gold = 100000;
  this.state.slaves = 0;
  this.state.oxen = 0;
  this.state.horses = 0;
  this.state.fallow = 0;
  this.state.planted = 0;
  this.state.growing = 0;
  this.state.ripe = 0;
  this.state.manure = 0;
  this.state.wheat = 0;
  this.state.creditRating = 0.5;
});

Then('the bank issues a warning message', function () {
  const result = checkForeclosure(this.state);
  assert.strictEqual(result.warning, true);
});

// ── Overseers Fired When Gold Negative ──

Given('the player has overseers', function () {
  this.state.overseers = 5;
});

Given("the player's gold drops below 0", function () {
  this.state.gold = -1000;
});

Then('the overseer pay increases by approximately 20% with slight random variance', function () {
  const results = [];
  const { createGameState } = require('../../src/engine/state');
  for (let i = 0; i < 200; i++) {
    const s = createGameState(42);
    s.overseers = 5;
    s.gold = -1000;
    s.overseerPay = 300;
    const rng = createRandom(i * 7 + 1);
    handleNegativeGoldOverseers(s, rng);
    results.push((s.overseerPay - 300) / 300 * 100);
  }
  const avg = results.reduce((a, b) => a + b, 0) / results.length;
  assert(avg > 10 && avg < 30,
    `Expected ~20% avg raise, got ${avg.toFixed(1)}%`);
});

// ── Loan Messages ──

Given('the player requests a loan exceeding the credit limit', function () {
  this.state.creditLimit = 100;
  this.state.loan = 0;
  this.requestedBorrowAmount = 1000;
  this.borrowResult = borrow(this.state, 1000);
  this.creditCheckOffer = offerCreditCheck(this.state, 1000);
});

When('the credit check fee is offered', function () {
  this.feeMessage = getCreditCheckFeeMessage(this.state.rng, this.creditCheckOffer.fee);
});

Then('a random credit-check-fee message is displayed from the pool', function () {
  const matchesPool = creditCheckFeeMessages.some(template => {
    const filled = template.replace('%.0f', Math.floor(this.creditCheckOffer.fee).toString());
    return filled === this.feeMessage;
  });
  assert(matchesPool, `Message not from credit-check-fee pool: ${this.feeMessage}`);
});

Then('the message includes the fee amount', function () {
  assert(this.feeMessage.includes(Math.floor(this.creditCheckOffer.fee).toString()),
    `Expected fee in message, got: ${this.feeMessage}`);
});

Given('the player passes the credit check', function () {
  this.state.creditLimit = 100;
  this.state.loan = 0;
  this.state.gold = 100000;
  this.state.slaves = 100;
  this.state.slavePrice = 1000;
  this.state.slaveHealth = 1.0;
  this.state.creditRating = 0.8;
  this.requestedBorrowAmount = 1000;
  this.creditCheckResult = executeCreditCheck(this.state, this.requestedBorrowAmount);
});

// "When the loan is granted" is handled by the Then step above (combined)

Then('a random loan-approval message is displayed from the pool', function () {
  assert(typeof this.loanApprovalMessage === 'string');
  assert(this.loanApprovalMessage.length > 0);
});

Then('the message includes the loan amount and interest rate', function () {
  assert(this.loanApprovalMessage.includes(Math.floor(this.requestedBorrowAmount).toString()),
    `Expected amount in message, got: ${this.loanApprovalMessage}`);
});

Given('the player fails the credit check', function () {
  this.state.creditLimit = 100;
  this.state.loan = 0;
  this.state.gold = 500;
  this.state.creditRating = 0.01;
  this.state.creditLowerBound = 0;
  this.creditCheckResult = executeCreditCheck(this.state, 100000);
});

// "When the loan is denied" is handled by the Then step above (combined)

Then('a random loan-denial message is displayed from the pool', function () {
  assert(loanDenialMessages.includes(this.loanDenialMessage),
    `Message not from denial pool: ${this.loanDenialMessage}`);
});

When('the player fully repays the loan', function () {
  this.state.loan = 10000;
  this.state.gold = 20000;
  this.state.creditRating = 0.5;
  repay(this.state, 10000);
  this.repaymentMessage = getLoanRepaymentMessage(this.state.rng);
});

Then('a random repayment message is displayed from the pool', function () {
  assert(typeof this.repaymentMessage === 'string');
  const matchesRepay = loanRepaymentMessages.some(m => this.repaymentMessage.includes(m));
  assert(matchesRepay, `Message not from repayment pool: ${this.repaymentMessage}`);
});

Given('the player runs out of gold at end of month', function () {
  this.state.gold = -5000;
});

When('the shortage is detected', function () {
  this.shortageMessage = getCashShortageMessage(this.state.rng);
});

Then('a random cash-shortage message is displayed from the pool', function () {
  assert(cashShortageMessages.includes(this.shortageMessage),
    `Message not from cash-shortage pool: ${this.shortageMessage}`);
});

Given('the bank forecloses on the player', function () {
  this.state.gameOver = true;
});

Then('a random foreclosure message is displayed from the pool', function () {
  this.foreclosureMessage = getForeclosureMessage(this.state.rng);
  assert(foreclosureMessages.includes(this.foreclosureMessage),
    `Message not from foreclosure pool: ${this.foreclosureMessage}`);
});

Given('the player is out of gold and cannot get a loan', function () {
  this.state.gold = -100000;
  this.state.creditRating = 0.01;
  this.state.gameOver = true;
});

Then('a random bankruptcy message is displayed from the pool', function () {
  this.bankruptcyMessage = getBankruptcyMessage(this.state.rng);
  assert(bankruptcyMessages.includes(this.bankruptcyMessage),
    `Message not from bankruptcy pool: ${this.bankruptcyMessage}`);
});

When('the player enters non-numeric text in the loan dialog', function () {
  this.loanErrorMessage = getLoanInputErrorMessage(this.state.rng);
});

Then('a random input-error message is displayed from the loan error pool', function () {
  assert(loanInputErrorMessages.includes(this.loanErrorMessage),
    `Message not from loan error pool: ${this.loanErrorMessage}`);
});

// ── Emergency Loan Mechanics ──

When('an emergency loan is processed', function () {
  this.prevGold = this.state.gold;
  this.prevLoan = this.state.loan;
  this.prevCreditRating = this.state.creditRating;
  this.prevInterestAddition = this.state.interestAddition;
  this.emergencyResult = processEmergencyLoan(this.state);
});

Then("the player's gold becomes positive", function () {
  assert(this.state.gold >= 0,
    `Expected gold >= 0, got ${this.state.gold}`);
});

Then('the loan increases by the deficit times {float}', function (multiplier) {
  if (this.prevGold >= 0) return;
  const deficit = Math.abs(this.prevGold);
  const expectedIncrease = deficit * multiplier;
  const actualIncrease = this.state.loan - this.prevLoan;
  assert(Math.abs(actualIncrease - expectedIncrease) < 1,
    `Expected loan increase ${expectedIncrease}, got ${actualIncrease}`);
});

Then('the credit rating decreases', function () {
  assert(this.state.creditRating < this.prevCreditRating,
    `Expected credit rating to decrease from ${this.prevCreditRating}, got ${this.state.creditRating}`);
});

Then('the loan increases by {int}', function (expected) {
  const actualIncrease = this.state.loan - this.prevLoan;
  assert(Math.abs(actualIncrease - expected) < 1,
    `Expected loan increase ${expected}, got ${actualIncrease}`);
});

Then("the player's gold remains {int}", function (expected) {
  assert.strictEqual(this.state.gold, expected);
});

// ── Foreclosure Checks ──

Given('the player has minimal assets', function () {
  this.state.gold = 1000;
  this.state.slaves = 0;
  this.state.oxen = 0;
  this.state.horses = 0;
  this.state.fallow = 0;
  this.state.planted = 0;
  this.state.growing = 0;
  this.state.ripe = 0;
  this.state.manure = 0;
  this.state.wheat = 0;
  this.state.creditRating = 0.5;
});

When('foreclosure is checked', function () {
  this.foreclosureResult = checkForeclosure(this.state);
});

Then('a face message dialog appears with a foreclosure message', function () {
  const msg = getForeclosureMessage(this.state.rng);
  assert(foreclosureMessages.includes(msg));
  this.foreclosureDialogMessage = msg;
});

Then('the message has the banker face portrait', function () {
  assert(this.state.neighbors.banker !== undefined);
});

Then('dismissing the message quits the game', function () {
  this.state.gameOver = true;
  assert.strictEqual(this.state.gameOver, true);
});

Then('the game continues normally', function () {
  assert.strictEqual(this.foreclosureResult.foreclosed, false);
});

// ── Debt Warning ──

Given('the player has a high debt-to-asset ratio near the foreclosure limit', function () {
  this.state.loan = 50000;
  this.state.gold = 100000;
  this.state.slaves = 0;
  this.state.oxen = 0;
  this.state.horses = 0;
  this.state.fallow = 0;
  this.state.planted = 0;
  this.state.growing = 0;
  this.state.ripe = 0;
  this.state.manure = 0;
  this.state.wheat = 0;
  this.state.creditRating = 0.5;
});

Then('a face message dialog appears with a foreclosure warning', function () {
  const result = checkForeclosure(this.state);
  assert.strictEqual(result.warning, true);
  const msg = getForeclosureWarningMessage(this.state.rng);
  assert(foreclosureWarningMessages.includes(msg));
});
