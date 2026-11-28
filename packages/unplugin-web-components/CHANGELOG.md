# @greypan/unplugin-web-components

## 1.5.1

### Patch Changes

- Updated dependencies [7eefb10]
  - @greypan/js-kit@3.2.0

## 1.5.0

### Minor Changes

- 9787a15: Remove `"./package.json"` from the package `exports` map.

### Patch Changes

- Updated dependencies [9787a15]
  - @greypan/js-kit@3.1.0

## 1.4.4

### Patch Changes

- 3c81816: Fix uppercase and mixed-case kebab web component tags in `.vue`, `.jsx`, and `.tsx` sources not being auto-imported by aligning the fast-path pre-filter with the case-insensitive tag matching regexes.
- Updated dependencies [3c81816]
  - @greypan/js-kit@3.0.1

## 1.4.3

### Patch Changes

- Updated dependencies [d0a9f32]
  - @greypan/js-kit@3.0.0

## 1.4.2

### Patch Changes

- Updated dependencies [1e52bc4]
  - @greypan/js-kit@2.0.0

## 1.4.0

### Minor Changes

- 28a8dc5: Add `transformIndexHtml` auto-import support to the `/vite` entry for Vite HTML entry points, scanning case-insensitive kebab-case custom elements and injecting deduplicated static module imports into `<head>` while skipping quoted attributes, RAWTEXT/RCDATA regions, and HTML comments.
- 28a8dc5: Fix React directive prologue handling (preserving full module-top directive prologues) and Vue `<script>` / `<script setup>` injection boundaries (skipping `<script setup src>`). Clarify that only `/vite` and `/webpack` entries are published, with HTML injection exclusive to Vite.

## 1.3.2

### Patch Changes

- be4008b: Fix `/vite` subpath import examples in the README and standardize workspace dependency externalization.
- Updated dependencies [be4008b]
  - @greypan/js-kit@1.6.2

## 1.2.4

### Patch Changes

- 8f4643d: Audit and reorganize package dependencies.
- Updated dependencies [8f4643d]
  - @greypan/js-kit@1.5.1

## 1.1.0

### Minor Changes

- 4dfde81: Complete package dependency declarations and fix missing dependencies.

### Patch Changes

- Updated dependencies [4dfde81]
  - @greypan/js-kit@1.1.0
