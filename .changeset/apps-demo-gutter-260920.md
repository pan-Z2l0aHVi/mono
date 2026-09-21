---
---

Internal change: no published package is affected. Restores the 12px content gutter that `858669f3` (vue) and `d4ae213f` (react) removed page by page, this time in the demo shells: `apps/react-web-ui-demo` wraps `<Outlet />` and `apps/vue-web-ui-demo` wraps `<RouterView />` in a `p-3` container, so no route page has to remember the gutter and a new page cannot miss it. `about.tsx` drops its own `p-3` to avoid doubling it. Also rewords the `slider-demo` `@utility` comment so it no longer contains a literal `<` — `stylelint --fix` escapes that to `\3c` on every run, which is why the text read as mojibake.
