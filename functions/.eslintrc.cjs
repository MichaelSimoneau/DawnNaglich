// eslint-disable-next-line @typescript-eslint/no-require-imports
module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'google',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json', 'tsconfig.dev.json'],
    sourceType: 'module',
  },
  ignorePatterns: [
    '/lib/**/*', // Ignore built files.
    '/generated/**/*', // Ignore generated files.
  ],
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    'quotes': ['error', 'single'],
    'import/no-unresolved': ['error', {
      ignore: ['^firebase-functions/', '\\.js$'],
    }],
    'indent': ['error', 2],
    'object-curly-spacing': ['warn', 'always'],
    'max-len': ['warn', { code: 120 }],
    'operator-linebreak': ['warn', 'before'],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-require-imports': 'off',
    'new-cap': ['error', {
      'capIsNew': false,
      'newIsCap': true,
      'properties': true,
    }],
  },
};
