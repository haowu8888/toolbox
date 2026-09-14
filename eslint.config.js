import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'dev-dist/**', 'test-results/**', 'playwright-report/**'],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  eslintConfigPrettier,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        __APP_VERSION__: 'readonly',
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      'no-constant-condition': 'warn',
      'no-useless-escape': 'warn',
      'vue/attributes-order': 'off',
      'vue/first-attribute-linebreak': 'off',
      // computed 内禁止写副作用（曾因历史代码关闭，现已修复相关组件）
      'vue/no-side-effects-in-computed-properties': 'error',
    },
  },
]
