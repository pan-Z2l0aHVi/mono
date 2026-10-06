---
'@greypan/web-ui': major
---

**Breaking:** a component no longer registers its siblings. Ten imports that only pulled in
child elements are gone, so importing a parent on its own no longer registers the children a
consumer writes inside it.

A component imported a sibling only when its own template rendered that tag. `web-ui-select`
and `web-ui-autocomplete` render just a trigger and a slot, `web-ui-button-group` and
`web-ui-dialog` render only slots, and `web-ui-dropdown` and `web-ui-context-menu` query the
`web-ui-dropdown-*` children a consumer writes into them but never create one. The child
elements were always the consumer's to provide, so these imports were dead weight that also
carried a misleading note about tree-shaking. The build sets `preserveModules: true` and lists
`./src/components/**` and `./dist/components/**` in `sideEffects`, so the module graph is never
tree-shaken in the first place.

Migration — import the children alongside the parent:

```diff
 import '@greypan/web-ui/components/dropdown'
+import '@greypan/web-ui/components/dropdown-item'
+import '@greypan/web-ui/components/dropdown-header'
+import '@greypan/web-ui/components/dropdown-divider'
```

The same applies to `web-ui-select` and `web-ui-autocomplete`, which need
`@greypan/web-ui/components/option`, and to `web-ui-button-group` and `web-ui-dialog`, which need
`@greypan/web-ui/components/button`. A subpath import registers only the component it names.

Both documented consumption paths are unaffected: the `@greypan/web-ui` barrel still registers
every component, and `unplugin-web-components` still emits one import per literal `<web-ui-*>`
tag it finds, so a template that writes `<web-ui-option>` keeps resolving it on its own.
