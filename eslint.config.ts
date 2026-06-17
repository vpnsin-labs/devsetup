import base from '@vpnsin-labs/devkit/eslint/base';

export default [
  ...base,
  // CLI tool — console.log is the output mechanism, not a debug statement.
  {
    files: ['bin/**/*.js', 'lib/**/*.js'],
    rules: {
      'no-console': 'off',
    },
  },
];
