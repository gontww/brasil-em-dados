import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import eslintConfigPrettier from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    plugins: {
      prettier: prettierPlugin,
    },
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        console: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        Node: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLInputElement: 'readonly',
        ResizeObserver: 'readonly',
      },
      parserOptions: {
        parser: '@typescript-eslint/parser',
        sourceType: 'module',
      },
    },
    rules: {
      'prettier/prettier': 'error',
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  eslintConfigPrettier,
  {
    ignores: ['dist', 'node_modules', '*.config.js', 'temp'],
  }
)
