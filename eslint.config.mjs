import antfu from '@antfu/eslint-config';

export default antfu(
  {
    // Enable core project support
    react: true,
    typescript: true,

    // Disable opinionated formatting and secondary plugins
    stylistic: false,
    jsonc: false,
    yaml: false,
    markdown: false,

    // Global ignores
    ignores: [
      'dist/*',
      'node_modules',
      '__tests__/',
      'coverage',
      '.expo',
      '.expo-shared',
      'android',
      'ios',
      '.vscode',
      'docs/',
      'cli/',
      'expo-env.d.ts',
      'migration/*',
    ],
  },
  {
    // Priority rules overrides
    rules: {
      'ts/no-explicit-any': 'off',
      'no-unused-vars': 'off',
      'unused-imports/no-unused-vars': 'off',
      'ts/no-unused-vars': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': 'off',
      'no-console': 'off',
      // Allow React Native patterns
      'ts/no-use-before-define': 'off',
      'ts/no-require-imports': 'off',
      'ts/consistent-type-definitions': 'off',
    },
  },
);
