# Pharaoh Game Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Pharaoh economic simulation game in JavaScript with HTML Canvas rendering, driven by Cucumber.js tests against 15 feature files.

**Architecture:** Pure game engine (Node.js-compatible, no DOM) with strict separation from Canvas renderer. All Cucumber tests run headlessly against engine modules. State is a plain JS object. Thin Canvas UI layer reads state and dispatches input.

**Tech Stack:** JavaScript (ES modules), Node.js, Cucumber.js (Gherkin BDD), Jest (unit tests), HTML5 Canvas (rendering)

---

## Phase 1: Project Setup and Foundation

### Task 1: Initialize npm project and install dependencies

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `cucumber.js` (config)
- Create: `jest.config.js`

**Step 1:** Initialize npm and install dependencies
```bash
npm init -y
npm install --save-dev @cucumber/cucumber jest
```

**Step 2:** Configure cucumber.js
```js
module.exports = {
  default: {
    paths: ['features/'],
    require: ['features/step_definitions/**/*.js', 'features/support/**/*.js'],
    format: ['progress'],
    publishQuiet: true
  }
};
```

**Step 3:** Configure jest.config.js
```js
module.exports = { testMatch: ['**/test/**/*.test.js'] };
```

**Step 4:** Create .gitignore
```
node_modules/
```

**Step 5:** Add npm scripts to package.json
```json
{
  "scripts": {
    "test": "jest --coverage",
    "features": "cucumber-js",
    "test:all": "jest --coverage && cucumber-js"
  }
}
```

**Step 6:** Commit
```bash
git add package.json .gitignore cucumber.js jest.config.js
git commit -m "chore: project setup with cucumber and jest"
```

---

### Task 2: Random number generator (src/engine/random.js)

The PRNG is foundational — nearly every other module depends on it.

**Files:**
- Create: `src/engine/random.js`
- Create: `test/engine/random.test.js`

Implement:
- `createRandom(seed)` — returns a PRNG object with seeded Coveyou quadratic congruential generator
- `uniform(rng, a, b)` — uniform on [a, b)
- `gaussian(rng, mean, sigma)` — Box-Muller polar method
- `absGaussian(rng, mean, sigma)` — resample until >= 0
- `exponential(rng, mean)` — inverse transform: -ln(u) * mean
- `randomInt(rng, a, b)` — integer in [a, b)
- `pick(rng, array)` — random element from array

TDD: Write tests first verifying distributions stay within expected bounds over many samples. Test seeded determinism.

---

### Task 3: Lookup tables (src/engine/tables.js)

All piecewise-linear interpolation tables from the spec.

**Files:**
- Create: `src/engine/tables.js`
- Create: `test/engine/tables.test.js`

Implement:
- `lookup(x, table)` — piecewise-linear interpolation over 11-point tables
- All game tables as exported constants:
  - `yieldTable` — manure-per-acre to wheat yield factor
  - `seasonalYieldTable` — month to seasonal multiplier
  - `slaveNourishmentTable` — feed rate to nourishment
  - `oxenNourishmentTable`, `horseNourishmentTable`
  - `slaveBirthTable`, `slaveDeathTable`
  - `oxenBirthTable`, `oxenDeathTable`
  - `horseBirthTable`, `horseDeathTable`
  - `workAbilityTable` — health to work ability
  - `oxMultTable` — oxen-per-slave to multiplier
  - `positiveMotiveTable` — overseer-eff-per-slave to positive motivation
  - `negativeMotiveTable` — lash rate to negative motivation
  - `stressLashTable` — overseer pressure to lash rate
  - `lashToSicknessTable`, `laborToSicknessTable`
  - `lashToSufferingTable`, `healthToSicknessTable` (revolt)
  - `hatredToDestructionTable` (revolt)
  - `overseerEffectivenessTable` — mounted effectiveness to overseer eff
  - `oxenEfficiencyTable` — oxen health to efficiency
  - `horseEfficiencyTable` — horse health to efficiency
  - `debtSupportTable` — credit rating to max debt-to-asset ratio
  - `repayIndexTable` — payment/loan ratio to credit multiplier
  - `dunningIntervalTable` — credit rating to seconds between dunning

TDD: Test interpolation at table endpoints, midpoints, and out-of-range clamping.

---

### Task 4: Game state (src/engine/state.js)

**Files:**
- Create: `src/engine/state.js`
- Create: `test/engine/state.test.js`

Implement:
- `createGameState(seed)` — returns a plain JS object with all game state fields initialized to zero/defaults
- Fields: gold, wheat, slaves, oxen, horses, manure, land (fallow/planted/growing/ripe/total), overseers, overseerPay, overseerPressure, loan, interestRate, interestAddition, creditRating, creditLimit, creditLowerBound, pyramidStones, pyramidBase, pyramidHeight, stoneQuota, month, year, slaveFeedRate, oxenFeedRate, horseFeedRate, plantingQuota, manureSpreadQuota, slaveHealth, oxenHealth, horseHealth, slaveEfficiency, wheatSewn, wheatGrowing, wheatRipe, inflation, worldGrowth, prices (wheat/land/horse/oxen/slave/manure), supply/demand/production for each commodity, manurePerAcre, wt-rot-rt, screen, dialog, message, contractOffers, pendingContracts, contractPlayers, neighbors, rng, previousMonth values, temporaryWorkAddition, etc.

Feature coverage: game_setup.feature — "Player starts with no assets"

---

### Task 5: Difficulty settings (src/engine/difficulty.js)

**Files:**
- Create: `src/engine/difficulty.js`
- Create: `test/engine/difficulty.test.js`
- Create: `features/step_definitions/game_setup_steps.js`
- Create: `features/support/world.js`

Implement:
- `setDifficulty(state, level)` — applies Easy/Normal/Hard settings
- Easy: base 115.47, target ~100ft, credit 5000000, worldGrowth 0.15, land price 1000, wheat price 10, slave price 1000
- Normal: base 346.41, target ~300ft, credit 500000, worldGrowth 0.10, land price 5000, wheat price 8, slave price 800
- Hard: base 1154.7, target ~1000ft, defaults for credit/prices

Cucumber step definitions for game_setup.feature scenarios:
- "the game has been initialized"
- "the player selects {string} difficulty"
- "the pyramid base should be {float} stones"
- "the pyramid target height should be approximately {int} feet"
- "the credit limit should be {int} gold"
- etc.

Feature coverage: game_setup.feature — difficulty level scenarios, difficulty selection screen scenarios

---

## Phase 2: Core Simulation Engine

### Task 6: Pyramid geometry (src/engine/pyramid.js)

**Files:**
- Create: `src/engine/pyramid.js`
- Create: `test/engine/pyramid.test.js`
- Create: `features/step_definitions/pyramid_steps.js`

Implement:
- `maxHeight(base)` — (sqrt(3)/2) * base
- `pyramidHeight(base, area)` — height formula from spec
- `addStones(state, efficiency)` — add quota * efficiency stones, update height
- `checkWin(state)` — height + 1 > maxHeight
- `pyramidWorkCost(quota, currentHeight, newHeight)` — quota * avgHeight * 12
- `pyramidGoldCost(avgHeight, stonesAdded)` — avgHeight * stonesAdded

Feature coverage: pyramid.feature — all geometry, stone laying, work cost, win condition scenarios

---

### Task 7: Planting cycle (src/engine/planting.js)

**Files:**
- Create: `src/engine/planting.js`
- Create: `test/engine/planting.test.js`
- Create: `features/step_definitions/planting_steps.js`

Implement:
- `advanceLandCycle(state, slaveEfficiency)` — fallow→planted→growing→ripe→fallow
- `calculateActualPlanting(state, slaveEfficiency)` — min(quota * efficiency, fallow)
- `wheatYield(manurePerAcre, month, rng)` — lookup yield * random * seasonal
- `wheatRot(state, rng)` — 5% monthly rot with variance
- `spreadManure(state, slaveEfficiency)` — limited by supply and efficiency
- `harvest(state, slaveEfficiency)` — ripe wheat * efficiency harvested
- `sowWheat(state, actualPlanting)` — wheat consumed for sowing

Feature coverage: planting.feature — land cycle, planting limits, wheat yield, rot, harvest, manure spreading

---

### Task 8: Feeding system (src/engine/feeding.js)

**Files:**
- Create: `src/engine/feeding.js`
- Create: `test/engine/feeding.test.js`
- Create: `features/step_definitions/feeding_steps.js`

Implement:
- `calculateWheatDemand(state, slaveEfficiency)` — total wheat needed for feeding + sowing
- `applyWheatShortage(state, wheatAfterRot)` — wheat efficiency = available / demand
- `feedAll(state, slaveEfficiency, wheatEfficiency)` — consume wheat, return amounts eaten
- `produceManure(wheatEaten, rng)` — wheatEaten / 100 * absGaussian(1.0, 0.1)

Feature coverage: feeding.feature — feed rates, wheat consumption, wheat shortage, manure production

---

### Task 9: Health system (src/engine/health.js)

**Files:**
- Create: `src/engine/health.js`
- Create: `test/engine/health.test.js`
- Create: `features/step_definitions/health_steps.js`

Implement:
- `updateSlaveHealth(state, feedRate, lashRate, laborPerSlave, oxMult, rng)` — nourishment - sickness
- `updateOxenHealth(state, feedRate, rng)` — diet - 0.05 aging
- `updateHorseHealth(state, feedRate, rng)` — diet - 0.08 aging
- `calculateBirthsDeaths(population, health, birthTable, deathTable, rng)` — returns {births, deaths}
- `updatePopulations(state, rng)` — apply births/deaths to all populations
- Health effects: work ability, oxen efficiency, horse efficiency, selling price

Feature coverage: health.feature — all slave/oxen/horse health scenarios, birth/death rates, health effects

---

### Task 10: Overseers (src/engine/overseers.js)

**Files:**
- Create: `src/engine/overseers.js`
- Create: `test/engine/overseers.test.js`
- Create: `features/step_definitions/overseers_steps.js`

Implement:
- `hireOverseers(state, count)`, `fireOverseers(state, count)`, `obtainOverseers(state, target)`
- `overseerEffectiveness(state, rng)` — horse-to-overseer ratio * horse efficiency → table lookup
- `slaveToOverseerRatio(state)` — slaves / (overseers + 1)
- `calculateStress(state, workDeficitPerSlave)` — stress/relaxation formula
- `calculateLashRate(state, rng)` — stress table * overseer eff per slave
- `calculateMotivation(state, rng)` — positive + negative from tables
- `payOverseers(state)` — deduct salary, fire all if gold < 0

Feature coverage: overseers.feature — hiring/firing, salary, effectiveness, stress, lashing, motivation

---

### Task 11: Workload system (src/engine/workload.js)

**Files:**
- Create: `src/engine/workload.js`
- Create: `test/engine/workload.test.js`
- Create: `features/step_definitions/workload_steps.js`

Implement:
- `calculateRequiredWork(state, rng)` — all work components + temporary + randomize
- `calculateMaxWorkPerSlave(motivation, workAbility, oxMultiplier)` — product
- `calculateSlaveEfficiency(state, rng)` — totalWorkDone / requiredWork, capped at 1.0
- `calculateWorkDeficit(maxWork, requiredWorkPerSlave)` — deficit for stress

Feature coverage: workload.feature — all work components, slave capacity, proportional reduction, work deficit

---

### Task 12: Trading system (src/engine/trading.js)

**Files:**
- Create: `src/engine/trading.js`
- Create: `test/engine/trading.test.js`
- Create: `features/step_definitions/trading_steps.js`

Implement:
- `buyCommodity(state, commodity, amount)` — validate gold, supply limits, execute
- `sellCommodity(state, commodity, amount)` — validate ownership, demand limits, health-adjusted price
- `keepCommodity(state, commodity, target)` — buy deficit or sell excess
- `acquireCommodity(state, commodity, target)` — alias for keep with buy bias
- `buyLivestock(state, commodity, amount)` — blends health
- `sellLand(state, category, amount)` — destroys crops proportionally

Feature coverage: trading.feature — buy/sell, supply/demand limits, keep/acquire, health-adjusted price, land sales

---

### Task 13: Market economy (src/engine/market.js)

**Files:**
- Create: `src/engine/market.js`
- Create: `test/engine/market.test.js`
- Create: `features/step_definitions/market_steps.js`

Implement:
- `updateInflation(state, rng)` — random walk
- `updatePrices(state, rng)` — multiply by (1 + inflation) with variance
- `runSupplyDemandCycle(state, commodity, rng)` — demand growth, supply consumption, price/production adjustment
- `calculateOwnershipCosts(state, rng)` — land*100 + slaves*10 + horses*5 + oxen*3 with random factor
- `calculateNetWorth(state)` — all assets - loan

Feature coverage: market_economy.feature — inflation, supply/demand, ownership costs, net worth

---

### Task 14: Loan system (src/engine/loans.js)

**Files:**
- Create: `src/engine/loans.js`
- Create: `test/engine/loans.test.js`
- Create: `features/step_definitions/loans_steps.js`

Implement:
- `borrow(state, amount)` — validate credit, apply loan
- `offerCreditCheck(state, amount)` — check if exceeds limit, return fee
- `executeCreditCheck(state)` — recalculate real net worth * credit rating
- `repay(state, amount)` — validate gold, adjust credit rating by repay index
- `monthlyInterest(state)` — loan * (rate + addition) / 100
- `adjustCreditRating(state)` — decay while loan, recover when free
- `emergencyLoan(state)` — |gold| * 1.1, degrade credit
- `checkForeclosure(state)` — debt-to-asset ratio vs limit from table
- `checkDebtWarning(state)` — 80% of foreclosure limit

Feature coverage: loans.feature — all borrowing, repaying, interest, credit rating, emergency, foreclosure scenarios

---

## Phase 3: Events, Neighbors, Contracts

### Task 15: Message pools (src/engine/messages.js)

**Files:**
- Create: `src/engine/messages.js`
- Create: `test/engine/messages.test.js`

Implement all message pools from Appendix A of the spec as exported arrays:
- openingMessages, winMessages, farewellMessages
- idlePepTalkMessages, genericChatMessages, dunningMessages
- foreclosureWarningMessages, foreclosureMessages, bankruptcyMessages, cashShortageMessages
- All advice messages (good/bad) for each of 10 topics
- All trading messages (supply limit, demand limit, success, insufficient funds, selling more)
- All contract messages (default, partial payment, partial shipment, insufficient goods, buy/sell completion)
- All loan messages (credit check fee, approval, denial, repayment, repayment signoffs)
- All event narration messages (acts of god pools, mobs pools, war, revolt, health, wheat, gold, economy, labor, workload, locust, plague)
- All input error messages per dialog type
- All overseer messages (missed payroll, raise demand)
- Contract player names
- Quit/save prompts

---

### Task 16: Random events (src/engine/events.js)

**Files:**
- Create: `src/engine/events.js`
- Create: `test/engine/events.test.js`
- Create: `features/step_definitions/random_events_steps.js`

Implement:
- `checkForEvent(rng)` — 1-in-8 chance
- `selectEvent(roll)` — map 0-100 to event type
- `applyLocusts(state, rng)`, `applyPlague(state, rng)`, `applyActOfGod(state, rng)`, `applyMobs(state, rng)`, `applyWar(state, rng)`, `applyRevolt(state, rng)`, `applyWorkload(state, rng)`, `applyHealthEvent(state, rng)`, `applyLaborEvent(state, rng)`, `applyWheatEvent(state, rng)`, `applyGoldEvent(state, rng)`, `applyEconomyEvent(state, rng)`
- `generateEventNarration(eventType, state, rng)` — assemble messages from pools

Feature coverage: random_events.feature — all event types, probability distribution, effects, narration

---

### Task 17: Neighbors (src/engine/neighbors.js)

**Files:**
- Create: `src/engine/neighbors.js`
- Create: `test/engine/neighbors.test.js`
- Create: `features/step_definitions/neighbors_steps.js`

Implement:
- `initializeNeighbors(rng)` — assign 4 faces to 4 personalities randomly
- `chooseChat(state, personality, rng)` — select advice topic, apply personality filter (good guy accurate, bad guy inverted, idiot random, banker always chat), 5% flip, 20% chat override
- `selectAdviceTopic(state, rng)` — pick topic based on game state, skip if resource zero
- `evaluateCondition(state, topic)` — determine if good or bad advice
- Visit timers: `initVisitTimers(rng)`, `checkVisits(state, now)`, `resetTimers(state, rng)`
- `idleInterval(rng)` — 60-90 seconds
- `chatInterval(rng)` — 90-200 seconds
- `dunningInterval(creditRating)` — interpolated 5-300 seconds

Feature coverage: neighbors.feature — all personality, advice, timer, dunning, chat scenarios

---

### Task 18: Contracts (src/engine/contracts.js)

**Files:**
- Create: `src/engine/contracts.js`
- Create: `test/engine/contracts.test.js`
- Create: `features/step_definitions/contracts_steps.js`

Implement:
- `initializeContractPlayers(rng)` — 10 players with names, pay-k, ship-k, default-k
- `generateContract(state, rng)` — type, commodity, amount, price, duration, counterparty
- `refreshOffers(state, rng)` — fill empty slots, replace expired, age surviving
- `acceptContract(state, offerIndex)` — move to pending, validate max 10
- `processContracts(state, rng)` — monthly: default check, decrement, settle if due
- `settleBuyContract(state, contract, rng)`, `settleSellContract(state, contract, rng)` — full settlement logic with partial handling
- `blendLivestockHealth(state, commodity, amount)` — incoming health 0.9

Feature coverage: contracts.feature — structure, generation, offers, accepting, fulfillment, settlement, defaults, messages

---

### Task 19: Monthly simulation orchestrator (src/engine/simulation.js)

**Files:**
- Create: `src/engine/simulation.js`
- Create: `test/engine/simulation.test.js`

Implement `simulateMonth(state)`:
1. Record previous month values
2. Advance date (month/year)
3. Wheat rot
4. Calculate wheat demand & wheat efficiency
5. Feed all populations
6. Produce manure
7. Calculate workload
8. Calculate slave work capacity (motivation, ox multiplier, health)
9. Determine slave efficiency
10. Advance land cycle (plant, grow, harvest)
11. Spread manure
12. Add pyramid stones
13. Update health (slaves, oxen, horses)
14. Update populations (births/deaths)
15. Calculate/apply overseer stress and lashing
16. Pay overseers
17. Deduct ownership costs
18. Deduct pyramid gold cost
19. Deduct monthly interest
20. Adjust credit rating
21. Check/apply emergency loan
22. Check foreclosure
23. Check win condition
24. Run supply/demand cycles for all commodities
25. Update inflation and prices
26. Process pending contracts
27. Refresh contract offers
28. Check for random event (1-in-8)
29. Return event/messages for display

Feature coverage: game_setup.feature — monthly turn sequence, time progression

---

## Phase 4: Input Validation and Dialogs

### Task 20: Input validation (src/engine/input_validation.js)

**Files:**
- Create: `src/engine/input_validation.js`
- Create: `test/engine/input_validation.test.js`
- Create: `features/step_definitions/input_validation_steps.js`

Implement:
- `createDialog(type, commodity)` — returns dialog state {type, commodity, mode, input, error}
- `handleDialogKey(dialog, key, state)` — process digit/dot/backspace/mode-select/enter/escape
- `validateBuySell(dialog, state)` — check mode selected, parse number, validate gold/supply/ownership
- `validateLoan(dialog, state)` — check mode, validate amount
- `validateOverseer(dialog, state)` — check mode, fractional check, firing limit
- `validateFeed(dialog, state)` — parse number, negative check
- `validatePlant(dialog, state)` — parse number, negative check
- `validateSpread(dialog, state)` — parse number, negative check
- `validatePyramid(dialog, state)` — parse number, negative check
- `executeDialog(dialog, state)` — perform the validated action

Feature coverage: input_validation.feature — all dialog mechanics, mode selection, validation, keep/acquire

---

### Task 21: Game persistence (src/engine/persistence.js)

**Files:**
- Create: `src/engine/persistence.js`
- Create: `test/engine/persistence.test.js`
- Create: `features/step_definitions/persistence_steps.js`

Implement:
- `saveGame(state)` — serialize state to JSON
- `loadGame(json)` — deserialize, restore RNG state
- `resetGame()` — return fresh state

Feature coverage: game_persistence.feature — save, restore, state preservation, new game

---

## Phase 5: Canvas Rendering (UI)

### Task 22: Canvas renderer (src/ui/renderer.js)

**Files:**
- Create: `src/ui/renderer.js`
- Create: `src/ui/app.js`
- Create: `index.html`

Implement the 10-column x 25-row grid layout from the spec wireframe:
- Commodities section (cols 0-3, rows 0-6)
- Prices section (cols 4-5, rows 0-6)
- Feed Rates section (cols 6-7, rows 0-3)
- Date section (cols 8-9, rows 0-2)
- Loan section (cols 8-9, rows 3-6)
- Overseers section (cols 6-7, rows 4-6)
- Land section (cols 0-5, rows 7-8)
- Spread & Plant section (cols 4-5, rows 7-8)
- Gold section (cols 6-9, rows 7-8)
- Pyramid section (cols 0-1, rows 9-20)
- Contracts section (cols 2-9, rows 9-20)
- Status bar (row 21): Quit button, status, Run button

Draw functions:
- `drawGrid(ctx, state)` — main render
- `drawSection(ctx, title, x, y, w, h, data)` — framed section with title
- `drawPyramid(ctx, state)` — graphical triangle
- `drawDifficultyScreen(ctx, state)` — startup screen

### Task 23: Dialog rendering (src/ui/dialogs.js)

**Files:**
- Create: `src/ui/dialogs.js`

Implement:
- `drawActionDialog(ctx, dialog, state)` — rounded rect at grid(2,8)-(7,12), icon, title, input, radio buttons, OK/Cancel
- `drawFaceMessageDialog(ctx, message)` — rounded rect at grid(1,8)-(8,11), portrait, text, "press any key"
- `drawContractsDialog(ctx, state)` — rounded rect at grid(2,5)-(8,18), browsing/confirming modes
- Load face portraits and dialog icons from resources/

### Task 24: Input handling (src/ui/input.js)

**Files:**
- Create: `src/ui/input.js`

Implement:
- Keyboard dispatcher — map keys to dialogs (w/s/o/h/m/l/L/r/c/S/O/H/p/f/q/g/Esc)
- Mouse dispatcher — map click coordinates to grid sections
- Dialog input routing — when dialog open, route keys to dialog handler
- Face message dismissal — any key while face message shown
- Contract dialog navigation — up/down/enter/y/n/esc

### Task 25: App entry point (src/ui/app.js)

**Files:**
- Modify: `src/ui/app.js`

Implement:
- Initialize canvas, load images
- Create game state
- Show difficulty screen
- Game loop: render state, handle input
- Timer management for neighbor visits (idle, chat, dunning)
- Speech synthesis integration

---

## Implementation Order and Dependencies

The features should be implemented in this order due to dependencies:

1. **game_setup.feature** — needs: state, difficulty, pyramid basics
2. **pyramid.feature** — needs: pyramid geometry
3. **workload.feature** — needs: tables, workload calc
4. **feeding.feature** — needs: feeding, wheat shortage
5. **planting.feature** — needs: planting cycle, yield, rot
6. **health.feature** — needs: health, birth/death
7. **overseers.feature** — needs: overseer system
8. **market_economy.feature** — needs: market, inflation, supply/demand
9. **trading.feature** — needs: trading, market limits
10. **loans.feature** — needs: loan system, credit
11. **contracts.feature** — needs: contract system
12. **neighbors.feature** — needs: neighbor system
13. **random_events.feature** — needs: event system
14. **input_validation.feature** — needs: dialog/input validation
15. **game_persistence.feature** — needs: persistence

Each feature is implemented by:
1. Run the feature's cucumber scenarios — verify they all FAIL
2. Write unit tests for the needed engine functions — verify they FAIL
3. Implement engine code to pass unit tests
4. Verify cucumber scenarios now PASS
5. Commit

---

## Key Implementation Notes

- **Seeded PRNG:** Use Coveyou quadratic congruential method so tests are deterministic with seed
- **State is immutable-ish:** Functions return modified state (or mutate and return same object for performance)
- **Lookup tables:** 11-point piecewise linear interpolation, clamp at endpoints
- **Pharaoh as +1 overseer:** slave-to-overseer ratio = slaves / (overseers + 1)
- **Livestock aging:** oxen 0.05/mo, horses 0.08/mo
- **Wheat rot:** 5% per month, deducted before usage
- **Wheat efficiency:** When demand > supply, all uses proportionally reduced
- **Health-adjusted sell price:** sell price * health for livestock
- **Purchased livestock health:** ~0.8 blended with existing
- **Contract livestock health:** 0.9 blended with existing
