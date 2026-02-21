module.exports = {
  default: {
    paths: ['features/game_setup.feature', 'features/pyramid.feature', 'features/workload.feature', 'features/feeding.feature', 'features/planting.feature', 'features/health.feature', 'features/overseers.feature', 'features/market_economy.feature', 'features/trading.feature', 'features/loans.feature'],
    require: ['features/step_definitions/**/*.js', 'features/support/**/*.js'],
    format: ['progress-bar', 'html:reports/cucumber-report.html'],
    formatOptions: { snippetInterface: 'synchronous' }
  }
};
