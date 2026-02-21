'use strict';

module.exports = {
  state: require('./engine/state'),
  difficulty: require('./engine/difficulty'),
  simulation: require('./engine/simulation'),
  dialogs: require('./engine/dialogs'),
  contracts: require('./engine/contracts'),
  neighbors: require('./engine/neighbors'),
  events: require('./engine/events'),
  persistence: require('./engine/persistence'),
  messages: require('./engine/messages'),
  trading: require('./engine/trading'),
  loans: require('./engine/loans'),
  feeding: require('./engine/feeding'),
  planting: require('./engine/planting'),
  pyramid: require('./engine/pyramid'),
  overseers: require('./engine/overseers'),
  market: require('./engine/market'),
  health: require('./engine/health'),
  workload: require('./engine/workload'),
  random: require('./engine/random'),
  tables: require('./engine/tables')
};
