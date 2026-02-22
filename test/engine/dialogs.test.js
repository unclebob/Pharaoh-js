'use strict';

const { createGameState } = require('../../src/engine/state');
const {
  openDialog, handleDialogKey, executeDialog, filterInputChar
} = require('../../src/engine/dialogs');

describe('dialogs', () => {
  let state;

  beforeEach(() => {
    state = createGameState(42);
    state.gold = 50000;
    state.wheat = 500;
    state.slaves = 100;
    state.oxen = 50;
    state.horses = 20;
    state.manure = 200;
    state.overseers = 5;
    state.wheatPrice = 10;
    state.slavePrice = 1000;
    state.oxenPrice = 300;
    state.horsePrice = 500;
    state.manurePrice = 20;
    state.landPrice = 5000;
    state.supply = { wheat: 500, slave: 500, oxen: 200, horse: 100, manure: 300, land: 100 };
    state.demand = { wheat: 1000, slave: 500, oxen: 200, horse: 100, manure: 300, land: 100 };
  });

  // -----------------------------------------------------------
  // filterInputChar
  // -----------------------------------------------------------

  describe('filterInputChar', () => {
    it('accepts digits 0-9', () => {
      for (let i = 0; i <= 9; i++) {
        expect(filterInputChar(String(i))).toBe(true);
      }
    });

    it('accepts decimal point', () => {
      expect(filterInputChar('.')).toBe(true);
    });

    it('rejects letters', () => {
      expect(filterInputChar('a')).toBe(false);
      expect(filterInputChar('Z')).toBe(false);
    });

    it('rejects special characters', () => {
      expect(filterInputChar('!')).toBe(false);
      expect(filterInputChar('@')).toBe(false);
      expect(filterInputChar('-')).toBe(false);
    });
  });

  // -----------------------------------------------------------
  // openDialog
  // -----------------------------------------------------------

  describe('openDialog', () => {
    it('sets dialog type and commodity', () => {
      openDialog(state, 'buySell', 'wheat');
      expect(state.dialog.type).toBe('buySell');
      expect(state.dialog.commodity).toBe('wheat');
    });

    it('initializes input, mode, and error to defaults', () => {
      openDialog(state, 'buySell', 'wheat');
      expect(state.dialog.input).toBe('');
      expect(state.dialog.mode).toBeNull();
      expect(state.dialog.error).toBeNull();
    });

    it('sets commodity to null when not provided', () => {
      openDialog(state, 'loan');
      expect(state.dialog.commodity).toBeNull();
    });

    it('opens different dialog types', () => {
      const types = ['buySell', 'loan', 'overseer', 'planting', 'pyramid', 'manure'];
      types.forEach(type => {
        openDialog(state, type);
        expect(state.dialog.type).toBe(type);
      });
    });
  });

  // -----------------------------------------------------------
  // handleDialogKey — input buffering
  // -----------------------------------------------------------

  describe('handleDialogKey — input buffering', () => {
    beforeEach(() => {
      openDialog(state, 'buySell', 'wheat');
    });

    it('appends digits to input', () => {
      handleDialogKey(state, '1');
      handleDialogKey(state, '2');
      handleDialogKey(state, '3');
      expect(state.dialog.input).toBe('123');
    });

    it('appends decimal point to input', () => {
      handleDialogKey(state, '1');
      handleDialogKey(state, '.');
      handleDialogKey(state, '5');
      expect(state.dialog.input).toBe('1.5');
    });

    it('rejects letters from input', () => {
      handleDialogKey(state, '1');
      handleDialogKey(state, 'a');
      handleDialogKey(state, '3');
      expect(state.dialog.input).toBe('13');
    });

    it('rejects special characters from input', () => {
      handleDialogKey(state, '1');
      handleDialogKey(state, '@');
      expect(state.dialog.input).toBe('1');
    });

    it('handles backspace removing last character', () => {
      state.dialog.input = '456';
      handleDialogKey(state, 'Backspace');
      expect(state.dialog.input).toBe('45');
    });

    it('handles backspace on empty input', () => {
      handleDialogKey(state, 'Backspace');
      expect(state.dialog.input).toBe('');
    });

    it('clears error on new key press', () => {
      state.dialog.error = 'Some error';
      handleDialogKey(state, '5');
      expect(state.dialog.error).toBeNull();
    });
  });

  // -----------------------------------------------------------
  // handleDialogKey — mode selection
  // -----------------------------------------------------------

  describe('handleDialogKey — buySell mode selection', () => {
    beforeEach(() => {
      openDialog(state, 'buySell', 'wheat');
    });

    it('sets mode to buy with b key', () => {
      handleDialogKey(state, 'b');
      expect(state.dialog.mode).toBe('buy');
    });

    it('sets mode to sell with s key', () => {
      handleDialogKey(state, 's');
      expect(state.dialog.mode).toBe('sell');
    });

    it('sets mode to keep with k key', () => {
      handleDialogKey(state, 'k');
      expect(state.dialog.mode).toBe('keep');
    });

    it('does not append mode keys to input', () => {
      handleDialogKey(state, 'b');
      expect(state.dialog.input).toBe('');
    });
  });

  describe('handleDialogKey — loan mode selection', () => {
    beforeEach(() => {
      openDialog(state, 'loan');
    });

    it('sets mode to borrow with b key', () => {
      handleDialogKey(state, 'b');
      expect(state.dialog.mode).toBe('borrow');
    });

    it('sets mode to repay with r key', () => {
      handleDialogKey(state, 'r');
      expect(state.dialog.mode).toBe('repay');
    });

    it('ignores s and k keys in loan dialog', () => {
      handleDialogKey(state, 's');
      expect(state.dialog.mode).toBeNull();
      handleDialogKey(state, 'k');
      expect(state.dialog.mode).toBeNull();
    });
  });

  describe('handleDialogKey — overseer mode selection', () => {
    beforeEach(() => {
      openDialog(state, 'overseer');
    });

    it('sets mode to hire with h key', () => {
      handleDialogKey(state, 'h');
      expect(state.dialog.mode).toBe('hire');
    });

    it('sets mode to fire with f key', () => {
      handleDialogKey(state, 'f');
      expect(state.dialog.mode).toBe('fire');
    });

    it('sets mode to obtain with o key', () => {
      handleDialogKey(state, 'o');
      expect(state.dialog.mode).toBe('obtain');
    });
  });

  // -----------------------------------------------------------
  // handleDialogKey — escape
  // -----------------------------------------------------------

  describe('handleDialogKey — escape', () => {
    it('closes dialog on Escape key', () => {
      openDialog(state, 'buySell', 'wheat');
      handleDialogKey(state, 'Escape');
      expect(state.dialog).toBeNull();
    });
  });

  // -----------------------------------------------------------
  // handleDialogKey — enter delegates to executeDialog
  // -----------------------------------------------------------

  describe('handleDialogKey — enter', () => {
    it('calls executeDialog on Enter key', () => {
      openDialog(state, 'buySell', 'wheat');
      state.dialog.mode = 'buy';
      state.dialog.input = '10';
      handleDialogKey(state, 'Enter');
      // Successful buy should close dialog
      expect(state.dialog).toBeNull();
    });
  });

  // -----------------------------------------------------------
  // executeDialog — mode validation
  // -----------------------------------------------------------

  describe('executeDialog — mode validation', () => {
    it('requires mode for buySell dialog', () => {
      openDialog(state, 'buySell', 'wheat');
      state.dialog.input = '100';
      executeDialog(state);
      expect(state.dialog).not.toBeNull();
      expect(state.dialog.error).toBeTruthy();
    });

    it('requires mode for loan dialog', () => {
      openDialog(state, 'loan');
      state.dialog.input = '5000';
      executeDialog(state);
      expect(state.dialog).not.toBeNull();
      expect(state.dialog.error).toBeTruthy();
    });

    it('requires mode for overseer dialog', () => {
      openDialog(state, 'overseer');
      state.dialog.input = '3';
      executeDialog(state);
      expect(state.dialog).not.toBeNull();
      expect(state.dialog.error).toBeTruthy();
    });

    it('does not require mode for planting dialog', () => {
      openDialog(state, 'planting');
      state.dialog.input = '50';
      executeDialog(state);
      expect(state.dialog).toBeNull();
    });

    it('does not require mode for pyramid dialog', () => {
      openDialog(state, 'pyramid');
      state.dialog.input = '100';
      executeDialog(state);
      expect(state.dialog).toBeNull();
    });

    it('does not require mode for manure dialog', () => {
      openDialog(state, 'manure');
      state.dialog.input = '30';
      executeDialog(state);
      expect(state.dialog).toBeNull();
    });
  });

  // -----------------------------------------------------------
  // executeDialog — input validation
  // -----------------------------------------------------------

  describe('executeDialog — input validation', () => {
    it('rejects empty input in buySell dialog', () => {
      openDialog(state, 'buySell', 'wheat');
      state.dialog.mode = 'buy';
      state.dialog.input = '';
      executeDialog(state);
      expect(state.dialog).not.toBeNull();
      expect(state.dialog.error).toBeTruthy();
    });

    it('rejects empty input in loan dialog', () => {
      openDialog(state, 'loan');
      state.dialog.mode = 'borrow';
      state.dialog.input = '';
      executeDialog(state);
      expect(state.dialog).not.toBeNull();
      expect(state.dialog.error).toBeTruthy();
    });

    it('rejects empty input in planting dialog', () => {
      openDialog(state, 'planting');
      state.dialog.input = '';
      executeDialog(state);
      expect(state.dialog).not.toBeNull();
      expect(state.dialog.error).toBeTruthy();
    });

    it('rejects empty input in pyramid dialog', () => {
      openDialog(state, 'pyramid');
      state.dialog.input = '';
      executeDialog(state);
      expect(state.dialog).not.toBeNull();
      expect(state.dialog.error).toBeTruthy();
    });

    it('rejects empty input in manure dialog', () => {
      openDialog(state, 'manure');
      state.dialog.input = '';
      executeDialog(state);
      expect(state.dialog).not.toBeNull();
      expect(state.dialog.error).toBeTruthy();
    });
  });

  // -----------------------------------------------------------
  // executeDialog — buySell buy
  // -----------------------------------------------------------

  describe('executeDialog — buySell buy', () => {
    it('buys commodity and closes dialog on success', () => {
      openDialog(state, 'buySell', 'wheat');
      state.dialog.mode = 'buy';
      state.dialog.input = '10';
      executeDialog(state);
      expect(state.dialog).toBeNull();
      expect(state.wheat).toBe(510);
      expect(state.gold).toBe(49900);
    });

    it('shows insufficient funds alert and closes dialog', () => {
      state.gold = 500;
      openDialog(state, 'buySell', 'wheat');
      state.dialog.mode = 'buy';
      state.dialog.input = '100';
      executeDialog(state);
      expect(state.dialog).toBeNull();
      expect(state.message).toBeTruthy();
    });

    it('shows demand-limit message when supply exceeded', () => {
      state.supply.wheat = 3;
      openDialog(state, 'buySell', 'wheat');
      state.dialog.mode = 'buy';
      state.dialog.input = '5000';
      executeDialog(state);
      // Demand-limit closes dialog and shows message
      expect(state.dialog).toBeNull();
      expect(state.message).toBeTruthy();
    });

    it('succeeds when buying exactly what gold allows', () => {
      state.gold = 1000;
      openDialog(state, 'buySell', 'wheat');
      state.dialog.mode = 'buy';
      state.dialog.input = '100';
      executeDialog(state);
      expect(state.dialog).toBeNull();
      expect(state.gold).toBe(0);
    });
  });

  // -----------------------------------------------------------
  // executeDialog — buySell sell
  // -----------------------------------------------------------

  describe('executeDialog — buySell sell', () => {
    it('sells commodity and closes dialog on success', () => {
      openDialog(state, 'buySell', 'wheat');
      state.dialog.mode = 'sell';
      state.dialog.input = '50';
      executeDialog(state);
      expect(state.dialog).toBeNull();
      expect(state.wheat).toBe(450);
    });

    it('shows alert when selling more than owned', () => {
      state.wheat = 100;
      openDialog(state, 'buySell', 'wheat');
      state.dialog.mode = 'sell';
      state.dialog.input = '200';
      executeDialog(state);
      expect(state.dialog).toBeNull();
      expect(state.message).toBeTruthy();
    });

    it('shows supply-limit alert when exceeding market capacity', () => {
      state.wheat = 5000;
      state.demand.wheat = 1000;
      state.supply.wheat = 0;
      openDialog(state, 'buySell', 'wheat');
      state.dialog.mode = 'sell';
      state.dialog.input = '2000';
      executeDialog(state);
      expect(state.dialog).toBeNull();
      expect(state.message).toBeTruthy();
    });
  });

  // -----------------------------------------------------------
  // executeDialog — buySell keep
  // -----------------------------------------------------------

  describe('executeDialog — buySell keep', () => {
    it('buys deficit when target exceeds holdings', () => {
      state.wheat = 300;
      openDialog(state, 'buySell', 'wheat');
      state.dialog.mode = 'keep';
      state.dialog.input = '500';
      executeDialog(state);
      expect(state.dialog).toBeNull();
      expect(state.wheat).toBe(500);
    });

    it('sells excess when target is below holdings', () => {
      state.wheat = 500;
      state.demand.wheat = 10000;
      openDialog(state, 'buySell', 'wheat');
      state.dialog.mode = 'keep';
      state.dialog.input = '200';
      executeDialog(state);
      expect(state.dialog).toBeNull();
      expect(state.wheat).toBe(200);
    });

    it('is no-op when target equals holdings', () => {
      state.wheat = 300;
      openDialog(state, 'buySell', 'wheat');
      state.dialog.mode = 'keep';
      state.dialog.input = '300';
      executeDialog(state);
      expect(state.dialog).toBeNull();
      expect(state.wheat).toBe(300);
    });
  });

  // -----------------------------------------------------------
  // executeDialog — loan
  // -----------------------------------------------------------

  describe('executeDialog — loan', () => {
    it('borrows when mode is borrow', () => {
      state.creditLimit = 100000;
      state.loan = 0;
      openDialog(state, 'loan');
      state.dialog.mode = 'borrow';
      state.dialog.input = '5000';
      executeDialog(state);
      expect(state.dialog).toBeNull();
      expect(state.loan).toBe(5000);
    });

    it('repays when mode is repay', () => {
      state.loan = 10000;
      state.gold = 50000;
      openDialog(state, 'loan');
      state.dialog.mode = 'repay';
      state.dialog.input = '5000';
      executeDialog(state);
      expect(state.dialog).toBeNull();
      expect(state.loan).toBe(5000);
    });
  });

  // -----------------------------------------------------------
  // executeDialog — overseer
  // -----------------------------------------------------------

  describe('executeDialog — overseer', () => {
    it('hires overseers in hire mode', () => {
      state.overseers = 5;
      openDialog(state, 'overseer');
      state.dialog.mode = 'hire';
      state.dialog.input = '3';
      executeDialog(state);
      expect(state.dialog).toBeNull();
      expect(state.overseers).toBe(8);
    });

    it('fires overseers in fire mode', () => {
      state.overseers = 5;
      openDialog(state, 'overseer');
      state.dialog.mode = 'fire';
      state.dialog.input = '2';
      executeDialog(state);
      expect(state.dialog).toBeNull();
      expect(state.overseers).toBe(3);
    });

    it('sets overseers to target in obtain mode', () => {
      state.overseers = 5;
      openDialog(state, 'overseer');
      state.dialog.mode = 'obtain';
      state.dialog.input = '10';
      executeDialog(state);
      expect(state.dialog).toBeNull();
      expect(state.overseers).toBe(10);
    });
  });

  // -----------------------------------------------------------
  // executeDialog — planting, pyramid, manure
  // -----------------------------------------------------------

  describe('executeDialog — simple dialogs', () => {
    it('sets planting quota and closes', () => {
      openDialog(state, 'planting');
      state.dialog.input = '50';
      executeDialog(state);
      expect(state.dialog).toBeNull();
      expect(state.plantingQuota).toBe(50);
    });

    it('sets stone quota and closes', () => {
      openDialog(state, 'pyramid');
      state.dialog.input = '100';
      executeDialog(state);
      expect(state.dialog).toBeNull();
      expect(state.stoneQuota).toBe(100);
    });

    it('sets manure spread quota and closes', () => {
      openDialog(state, 'manure');
      state.dialog.input = '30';
      executeDialog(state);
      expect(state.dialog).toBeNull();
      expect(state.manureSpreadQuota).toBe(30);
    });
  });

  // -----------------------------------------------------------
  // handleDialogKey — no dialog open
  // -----------------------------------------------------------

  describe('handleDialogKey — no dialog open', () => {
    it('does nothing when no dialog is open', () => {
      state.dialog = null;
      handleDialogKey(state, '5');
      expect(state.dialog).toBeNull();
    });
  });

  // -----------------------------------------------------------
  // executeDialog — no dialog open
  // -----------------------------------------------------------

  describe('executeDialog — no dialog open', () => {
    it('does nothing when no dialog is open', () => {
      state.dialog = null;
      executeDialog(state);
      expect(state.dialog).toBeNull();
    });
  });

  // -----------------------------------------------------------
  // Edge cases — error branches for coverage
  // -----------------------------------------------------------

  describe('executeDialog — edge cases', () => {
    it('shows alert when keep mode fails (insufficient supply)', () => {
      state.wheat = 100;
      state.supply.wheat = 2;
      state.gold = 50000;
      openDialog(state, 'buySell', 'wheat');
      state.dialog.mode = 'keep';
      state.dialog.input = '500';
      executeDialog(state);
      // keepCommodity tries to buy 400, supply is only 2 -> capped
      // buyCommodity returns {ok: false, capped: true}
      // keepCommodity passes that through -> executeKeep shows alert
      expect(state.dialog).toBeNull();
      expect(state.message).toBeTruthy();
    });

    it('shows error when borrow fails (no credit)', () => {
      state.creditLimit = 0;
      state.loan = 0;
      openDialog(state, 'loan');
      state.dialog.mode = 'borrow';
      state.dialog.input = '5000';
      executeDialog(state);
      expect(state.dialog).not.toBeNull();
      expect(state.dialog.error).toBeTruthy();
    });

    it('shows error when repay fails (insufficient gold)', () => {
      state.loan = 10000;
      state.gold = 100;
      openDialog(state, 'loan');
      state.dialog.mode = 'repay';
      state.dialog.input = '5000';
      executeDialog(state);
      expect(state.dialog).not.toBeNull();
      expect(state.dialog.error).toBeTruthy();
    });

    it('shows error when fire fails (too many)', () => {
      state.overseers = 2;
      openDialog(state, 'overseer');
      state.dialog.mode = 'fire';
      state.dialog.input = '10';
      executeDialog(state);
      expect(state.dialog).not.toBeNull();
      expect(state.dialog.error).toBeTruthy();
    });

    it('shows overseer input error for invalid overseer input', () => {
      openDialog(state, 'overseer');
      state.dialog.mode = 'hire';
      state.dialog.input = '';
      executeDialog(state);
      expect(state.dialog).not.toBeNull();
      expect(state.dialog.error).toBeTruthy();
    });
  });
});
