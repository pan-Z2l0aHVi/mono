---
'@greypan/web-ui': minor
---

Add a `@greypan/web-ui/vite` entry point. It exports `webUiOptimizeDeps`, the list of web-ui runtime
dependencies an app must merge into `optimizeDeps.include` when its dependency scanner cannot follow the
component graph, such as file-based routing or `import.meta.glob`. The list moves out of consumer Vite
configs, so adding a web-ui runtime dependency no longer means editing every app.

Switch the interweave frontend to file-based routing through `vue-router/vite`: pages move to
`src/pages/<name>/index.vue`, the generated route table replaces the hand-written router, and the new
virtual route module is covered by the exported list above. Reorder side-effect imports across the
repository to match the updated root `vite.config.ts` import-sorting rule, and externalize
`@floating-ui/dom` from the `@greypan/web-ui` bundle.
