module.exports = {
  default: {
    require: [
      'step-definitions/**/*.js'
    ],
    format: [
      'pretty',
      'json:reports/cucumber_report.json',
      'html:reports/cucumber_report.html'
    ],
    parallel: 1,
    tags: 'not @wip',
    timeout: 30000
  },
  auth: {
    require: [
      'step-definitions/**/*.js'
    ],
    format: ['pretty'],
    tags: '@auth',
    timeout: 30000
  },
  responsive: {
    require: [
      'step-definitions/**/*.js'
    ],
    format: ['pretty'],
    tags: '@responsive',
    timeout: 30000
  },
  browser: {
    require: [
      'step-definitions/**/*.js'
    ],
    format: ['pretty'],
    tags: '@browser',
    timeout: 45000
  }
};