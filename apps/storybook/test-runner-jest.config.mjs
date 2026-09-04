import {getJestConfig} from '@storybook/test-runner'

// Jest process configuration only. Browser hooks and image-snapshot policy live
// in .storybook/test-runner.mjs; Jest ignores hook-shaped fields in this file.
export default {...getJestConfig(), testEnvironmentOptions: {'jest-playwright': {browsers: ['chromium'], launchOptions: {headless: true}}}}
