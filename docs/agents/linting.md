# Linting & formatting

- **Formatter**: `vp fmt` (Prettier-compatible via vite-plus config)
  - Single quotes, no semicolons, 120 char print width, no trailing commas, arrow parens avoided
  - Import sorting enabled (builtin → external → internal → parent → sibling → index)
- **Linter**: `vp lint` (oxlint via vite-plus, type-aware)
- **Spell check**: cspell on staged files
- **CSS linting**: stylelint for `.css`, `.vue` (uses Tailwind CSS, no SCSS)
- **Line endings**: LF enforced (`.gitattributes`: `* text=auto eol=lf`)
