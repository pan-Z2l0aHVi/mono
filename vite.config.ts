import { defineConfig } from 'vite-plus'

// Root config only carries the formatter settings; every package owns its own build config.
export default defineConfig({
  fmt: {
    printWidth: 120,
    tabWidth: 2,
    useTabs: false,
    singleQuote: true,
    semi: false,
    trailingComma: 'none',
    bracketSpacing: true,
    arrowParens: 'avoid',
    sortPackageJson: false,
    ignorePatterns: ['**/node_modules/**', '**/dist/**', '**/.turbo/**', '**/CHANGELOG.md'],
    experimentalSortImports: {
      enabled: true,
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index']
    }
  }
})
