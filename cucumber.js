module.exports = {
  default: {
    paths: ['features/game_setup.feature'],
    require: ['features/step_definitions/**/*.js', 'features/support/**/*.js'],
    format: ['progress-bar', 'html:reports/cucumber-report.html'],
    formatOptions: { snippetInterface: 'synchronous' }
  }
};
