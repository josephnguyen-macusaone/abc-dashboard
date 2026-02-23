import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  prettierConfig,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        // Node.js globals
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        // Jest globals
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
    plugins: {
      prettier,
    },
    rules: {
      // Prettier integration
      'prettier/prettier': 'error',

      // Best practices
      'no-console': 'off', // Allow console for server-side logging
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_|^error$|^err$', // Ignore args starting with _ or named error/err
          varsIgnorePattern: '^_',
          caughtErrors: 'none', // Don't report unused variables in catch blocks
          ignoreRestSiblings: true,
        },
      ],
      'no-undef': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],

      // ES6+ features
      'arrow-body-style': ['error', 'as-needed'],
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',

      // Error prevention
      'no-throw-literal': 'error',
      'no-return-await': 'warn', // Downgraded to warning - sometimes needed for stack traces
      'require-await': 'off', // Disabled - async without await is valid for interface consistency
      'no-useless-catch': 'off', // Disabled - sometimes catch is used for logging before re-throw
      'no-useless-escape': 'warn', // Downgraded to warning

      // Code quality
      'max-depth': ['warn', 4],
      'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 15],
    },
    ignores: ['node_modules/**', 'coverage/**', 'dist/**', '*.min.js'],
  },
  {
    // Test files configuration
    files: ['tests/**/*.js'],
    rules: {
      'max-lines-per-function': 'off',
      'require-await': 'off',
    },
  },
  {
    // Migration and seed files - often need to be longer
    files: ['**/migrations/**/*.js', '**/seeds/**/*.js'],
    rules: {
      'max-lines-per-function': 'off',
      'no-return-await': 'off',
    },
  },
  {
    // Interface files - unused params are intentional (define contract)
    files: ['**/interfaces/**/*.js', '**/i-*.js'],
    rules: {
      'no-unused-vars': 'off',
    },
  },
];
