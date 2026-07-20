'use strict'

module.exports = {
  rules: {
    'widget-props-extends-schema': require('./widget-props-extends-schema'),
    'no-deprecated-tokens': require('./no-deprecated-tokens'),
    'no-app-module-imports': require('./no-app-module-imports'),
    'no-raw-hex-in-widgets': require('./no-raw-hex-in-widgets'),
    'copy-src-no-dependencies': require('./copy-src-no-dependencies')
  }
}
