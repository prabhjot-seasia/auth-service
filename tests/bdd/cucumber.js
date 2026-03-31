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
    timeout: 60000
  },
  auth: {
    require: [
      'step-definitions/**/*.js'
    ],
    format: ['pretty'],
    tags: '@auth',
    timeout: 60000
  },
  responsive: {
    require: [
      'step-definitions/**/*.js'
    ],
    format: ['pretty'],
    tags: '@responsive',
    timeout: 60000
  },
  browser: {
    require: [
      'step-definitions/**/*.js'
    ],
    format: ['pretty'],
    tags: '@browser',
    timeout: 45000
  },
  sso: {
    require: [
      'step-definitions/**/*.js'
    ],
    format: ['pretty'],
    tags: '@sso and @navigation',
    timeout: 60000
  }
};