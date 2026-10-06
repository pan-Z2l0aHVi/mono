---
---

Internal change: no published package is affected. `@greypan/interweave-frontend` is listed in the `ignore` array of `.changeset/config.json`, and nothing else in the diff is versioned, so this entry stays empty by design.

Three batches of browser annotations on the library page (`apps/interweave/frontend`), plus one defect fix. Search collapses on blur and its button reflects an active query; the filter panel is now a `web-ui-collapse` instead of hand-rolled `height`/`aria-hidden`/`inert`; `collapsedWidth` is 90px; the add dialog copy is shortened and its two headline sizes are 16px; select-all disables when nothing is visible; a dev-only mock runtime (`import.meta.env.DEV && !hasWailsRuntime()`) makes browser preview renderable so layout can be iterated without the desktop service; the detail drawer loses its 144px preview block, its title icon, and a status row that duplicated the banner above it, and its rename/edit-tags buttons go to size 22; tag chips are 22px everywhere via a shared `tagChipClass` (`inline-flex h-[22px] items-center` rather than `inline-block` + `py-0.5`, so long labels no longer stretch row height); list rows show `createdAt` instead of `updatedAt`.

The defect: an empty resource list still opened a context menu. `web-ui-context-menu` listens for `contextmenu` on its own host, and the empty state renders inside that host, so a right-click landed with `contextResource === null` and produced a shell menu holding a divider and a blank "删除" item. Now `:disabled="resources.length === 0"`, which makes the component drop the event and lets the native browser menu appear. A regression test pins empty→disabled and non-empty→enabled.

The 66px sidebar collapse toggle is deliberately not here: `--wui-button-width` is self-declared inside the `web-ui-layout` shadow root, so an app cannot override it. That needs a new public custom property in `@greypan/web-ui` and is tracked separately as its own T0 task.
