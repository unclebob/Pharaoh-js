module.exports = {
  default: {
    paths: ['features/'],
    require: ['features/step_definitions/**/*.js', 'features/support/**/*.js'],
    format: ['progress-bar', 'html:reports/cucumber-report.html'],
    formatOptions: { snippetInterface: 'synchronous' }
  }
};
