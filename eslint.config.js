// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*'],
    rules: {
      // Disable path resolution checks as we use TypeScript for this
      'import/no-unresolved': 'off',
      // Reduce noise from unused vars in development
      '@typescript-eslint/no-unused-vars': 'warn',
      // Allow unescaped entities in JSX (common in React Native)
      'react/no-unescaped-entities': 'warn',
      // Relax some React hooks rules for development
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]);
