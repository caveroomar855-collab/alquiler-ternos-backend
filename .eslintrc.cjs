module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: ['eslint:recommended', 'plugin:import/recommended'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
  },
  rules: {
    'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/test/**', '**/*.config.js', '**/*.config.cjs'] }],
    'no-console': 'off',
  },
};
