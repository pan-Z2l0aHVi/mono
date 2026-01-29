import { resolve } from 'node:path'

import js from '@eslint/js'
import json from '@eslint/json'
import markdown from '@eslint/markdown'
import vitestPlugin from '@vitest/eslint-plugin'
import { defineConfig, globalIgnores } from 'eslint/config'
import * as mdx from 'eslint-plugin-mdx'
import pluginPrettier from 'eslint-plugin-prettier/recommended'
import pluginReact from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import pluginVue from 'eslint-plugin-vue'
import { globSync } from 'glob'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import parserVue from 'vue-eslint-parser'

// 动态导入 unplugin-auto-import 的 globals
const loadGlobals = async file => {
  const fullPath = resolve(process.cwd(), file)
  try {
    const module = await import(fullPath)
    return module.default ?? {}
  } catch (error) {
    console.error('Failed to load auto-import globals:', fullPath, error)
    return {}
  }
}

// 同步转异步处理（因为 globSync 是同步的，但 loadGlobals 是异步的）
const autoImport = await Promise.all(
  globSync('**/.eslintrc-auto-import.js', {
    ignore: ['**/node_modules/**', '**/dist/**'],
    dot: true // 匹配以 . 开头的文件
  }).map(file => loadGlobals(file))
).then(results => results.reduce((acc, globals) => ({ ...acc, ...globals }), {}))

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/dist-ssr/**',
    'scripts/**',
    '**/*.d.ts',
    '**/.turbo/**',
    '**/routeTree.gen.ts'
  ]),

  /**
   * TypeScript
   */
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    rules: {
      ...config.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-redeclare': 'error',
      '@typescript-eslint/no-unsafe-declaration-merging': 'warn' // interface 合并还是有用处
    },
    files: ['**/*.{ts,tsx,vue}']
  })),

  /**
   * JS/TS Common
   */
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx,vue}'],
    extends: [js.configs.recommended, ...pluginVue.configs['flat/recommended']],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2025,
        ...autoImport.globals
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue']
      }
    },
    rules: {
      'no-undef': 'off', // 关闭默认规则，ts 规则取而代之
      'no-unused-vars': 'off', // 关闭默认规则，ts 规则取而代之
      'no-redeclare': 'off', // 关闭默认规则，ts 规则取而代之（用于方法重载）
      'no-console': 'warn'
    }
  },

  /**
   * Vue
   */
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: parserVue,
      parserOptions: {
        parser: tseslint.parser,
        ecmaFeatures: {
          jsx: true
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue']
      }
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-deprecated-slot-attribute': 'off'
      // 其他 Vue 规则...
    }
  },

  /**
   * React
   */
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'react-refresh': reactRefresh
    },
    extends: [pluginReact.configs.flat.recommended, reactHooks.configs.flat.recommended],
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      ...reactRefresh.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off' // react 19 不需要
    }
  },

  /**
   * JSONC
   */
  {
    files: [
      '**/tsconfig.json',
      '**/tsconfig.*.json',
      '**/.vscode/*.json',
      '**/.zed/*.json',
      '**/cspell.json',
      '**/*.jsonc'
    ],
    language: 'json/jsonc',
    plugins: { json },
    rules: {
      'json/no-duplicate-keys': 'error',
      'json/sort-keys': 'error'
    }
  },

  /**
   * JSON
   */
  {
    files: ['**/*.json'],
    ignores: [
      '**/tsconfig.json',
      '**/tsconfig.*.json',
      '**/.vscode/*.json',
      '**/.zed/*.json',
      '**/cspell.json',
      '**/*.jsonc'
    ],
    language: 'json/json',
    plugins: { json },
    rules: {
      'json/no-duplicate-keys': 'error',
      'json/sort-keys': 'error'
    }
  },

  /**
   * package.json 降级排序规则
   * exports 字段要求 types key 排序优先
   */
  {
    files: ['**/package.json'],
    rules: {
      'json/sort-keys': 'warn'
    }
  },

  /**
   * Test
   */
  {
    files: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
    extends: [vitestPlugin.configs.recommended],
    languageOptions: {
      globals: {
        ...globals.vitest,
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      vitest: vitestPlugin
    }
  },

  /**
   * Markdown
   */
  {
    files: ['**/*.md'],
    plugins: {
      markdown
    },
    extends: ['markdown/recommended'],
    rules: {
      'markdown/fenced-code-language': 'warn'
    }
  },

  /**
   * MDX
   */
  {
    ...mdx.flat,
    ignores: ['**/*.md'],
    processor: mdx.createRemarkProcessor({
      lintCodeBlocks: true
    })
  },
  {
    ...mdx.flatCodeBlocks,
    rules: {
      ...mdx.flatCodeBlocks.rules
    }
  },

  {
    plugins: {
      'simple-import-sort': simpleImportSort
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error'
    }
  },

  pluginPrettier
])
