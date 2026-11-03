# @greypan/wuchale-vue

## 0.2.0

### Minor Changes

- 425a950: Translate all SFC attribute literals and controlled `v-bind` expressions by default, excluding structural and machine attributes with a built-in denylist. `componentAttributes` now overrides that denylist per component tag. The denylist matches names only, so business enums and `<meta content>` still rely on consumer heuristics.

## 0.1.0

### Minor Changes

- 430722d: Add a private Vue SFC adapter with reactive catalogs, template and script interpolation, plurals, inline rich text, and grouped loading.
