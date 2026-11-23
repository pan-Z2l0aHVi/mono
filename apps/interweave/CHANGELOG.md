# @greypan/interweave

## 0.3.0

### Minor Changes

- 51b0b0f: The import dialog now accepts folders everywhere a file can enter the queue. The file picker allows mixed file-and-directory selection (NSOpenPanel on macOS; other platforms degrade gracefully), dropped folders and clipboard folder paths are expanded like picked ones, and directories are expanded into their contained files by the backend — hidden entries, symlinks and special files are filtered, while an explicitly selected hidden folder keeps its visible children. Any batch selection that expands to more than 20 files — multi-file picks, recursive folders or a mix of both — requires an explicit confirmation dialog whose copy names how many folders were expanded; its busy button shows the processed/total ratio, as does the add dialog's confirm button while resources are being created. While a batch is enqueuing, the dialog's cancel button stays clickable and turns into Stop, which aborts the remaining entries and clears the pending queue.
- c764ad9: Add system tray support with show/quit menu actions and a "minimize to tray on close" setting in the settings dialog.

### Patch Changes

- 5c5d031: Speed up Interweave's startup fingerprint backfill: unchanged files are skipped after a single read-only snapshot query, files that need hashing are hashed by a small bounded worker pool with a smaller 128 KB buffer, and results are written in batches inside one transaction using conditional updates so stale hashes never overwrite fingerprints recorded by concurrent refreshes or the watcher.
- 3522e3b: Use monospace tabular numerals for all numeric displays in the Interweave frontend, including file sizes, timestamps, queue and source counts, scan statistics, and batch progress indicators.
- 2ad679d: The offline thumbnail index is no longer frozen as empty when the cache directory scan fails. A failed scan now leaves the index unbuilt, so the next offline lookup retries it and recovers once the directory is readable again; a successful scan still builds the index once, and lookups stay free of directory scans afterwards.
- 094a413: The startup thumbnail prune now checks for cancellation before each source is stat-ed, so closing the media handler no longer waits for one stat per source on slow or archived drives; it stops after the current source.
- b7b37ca: A finished recovery scan now releases its scan gate before Poll can report it as done, so starting another scan right after seeing completion no longer fails with "a recovery scan is already running".
- d8e6de0: Unset `window.ScrollTimeline` before OverlayScrollbars is evaluated, so the scrollbar thumb follows the list position on WebKit after dynamic height changes instead of stalling partway down the track.
- 22854e0: Dedupe concurrent thumbnail builds per source version with refcounted singleflight, bound in-flight builds by CPU count, and drain builds and pruning on shutdown before the database closes. Thumbnail requests now return 500 when a build fails with a live client and stay silent after the client disconnects, and the sources table gains a `(type, location)` index for location lookups. Newly built thumbnails are scaled with bilinear filtering instead of CatmullRom; the 320px output was compared side by side against the previous kernel across ten typical sample images in a human visual review with no visible difference.
- 89cb292: Source index reconciliation on entry add/edit/remove is now a non-blocking request handled by the file watcher's reconcile loop instead of a synchronous directory scan on the write path. Offline thumbnail serving builds a one-time in-memory index of the cache directory keyed by real modification times, serves lookups without rescanning, keeps the index in sync with fresh builds, frontend backfills and pruning, and self-heals when an indexed file disappears. The startup thumbnail prune runs on the store's shutdown context and is cancelled and drained together with in-flight builds when the media handler closes.
- @greypan/interweave-frontend@0.0.0

## 0.2.1

### Patch Changes

- ce42869: Use native scrollbars on phones and tablets whose primary pointer is coarse. Component scroll containers restore the platform's default scrollbar width and colors, while application-level OverlayScrollbars keeps native overlaid scrollbars visible instead of rendering custom ones.
- @greypan/interweave-frontend@0.0.0

## 0.2.0

### Minor Changes

- c04b96d: Replace the default Wails menu with a fully Chinese native seven-menu tree (system menu bar on macOS, window menu bar on Windows) driven by a single menu-command event, report page-dependent menu availability from the frontend so library-only commands grey out, add plain-text clipboard commands backed by a three-platform Go clipboard, move all application settings to a Go-owned settings service backed by an atomic temp-name+rename write, make interface zoom a Go-owned four-level setting (90%, 100%, 110%, 120%) that the Display menu steps and the settings slider picks from, replace the coordinate-based mac title-bar drag band with explicit per-element drag regions so header controls never start a window drag, and gate the first render on the Wails runtime so the mac sidebar clears the traffic lights and startup bridge calls never run before the runtime is injected.

### Patch Changes

- @greypan/interweave-frontend@0.0.0

## 0.1.6

### Patch Changes

- 57f4091: Improve navigation icon press feedback and use middle ellipsis for resource titles.
- 57f4091: Polish resource tags, detail surfaces, and the add-resource dialog.
- 57f4091: Open context menus with a Space key hold and retain the ContextMenu key; remove the Shift+F10 shortcut. Improve keyboard focus and search behavior in Interweave.
- 57f4091: Add a neutral control shade token and use subtly blue gray interaction states for light navigation and secondary buttons.
- 57f4091: Keep automatic toast notifications visible and interactive above managed modal surfaces while preserving viewport positioning during drawer motion.
- 57f4091: Unify neutral surfaces and text around a subtly cool gray palette across controls, layouts, and Interweave.
  Restore button and segmented item feedback when a pressed pointer moves outside in WebKit.
- 57f4091: Refresh resource recovery dialogs and improve link and appearance presentation.
- 57f4091: Drop `COPY_FEEDBACK_DURATION`, which lost its last consumer when the demo copy feedback moved to `PressDrawIcon`, and align the availability docs with what `ApplyFileAvailability` actually does on every `available=true` call. `TestRecoveryCancelled` now cancels after the walk starts and asserts `context.Canceled`, so it covers the interruption path that `ServiceShutdown` relies on.
- 57f4091: Refine unavailable resource icons and interaction feedback.
- @greypan/interweave-frontend@0.0.0

## 0.1.5

### Patch Changes

- fe802db: Use the CodeX check icon for checkboxes, support configurable selection control sizes, and respect reduced motion in application navigation and demo interactions.
- fe802db: Keep dialog and drawer controls reachable by keyboard, and improve editing pending resources.
- fe802db: Improve mobile layout and drawer geometry, and refine Interweave navigation, settings reopening, and window-wide file drops.
- @greypan/interweave-frontend@0.0.0

## 0.1.4

### Patch Changes

- aebf774: Label the resource "Open with" entry with the real system default application name, resolved from the operating system instead of a hard-coded app list.
- @greypan/interweave-frontend@0.0.0

## 0.1.3

### Patch Changes

- d7073c8: Replaced `@tanstack/vue-virtual` with `virtua` for the resource list. Renaming a resource no longer leaves stale row heights that make adjacent rows overlap. When Safari or iOS recycles an editing row, its rename draft is now committed instead of lost.

## 0.1.2

### Patch Changes

- 8908fb8: Merge focus row and current row into single state in interweave resource list.
  
  - `activeIndex` in ResourceList is now derived from `activeResourceId` (previously independent ref)
  - Keyboard navigation (ArrowDown, Home, End) and right-click menu now update `activeResourceId` via new `activate` event
  - Focus ring (via roving tabindex) and active row background color are now always on the same row
  - Active row background deepened from 5% to 8% black (light) / 8% to 12% white (dark)
  - Checked row background raised to match active row level (8%/12%)
  - Fixed incorrect comment in global.css about `:where()` override capability
- @greypan/interweave-frontend@0.0.0

## 0.1.1

### Patch Changes

- b407aeb: Frontend bindings are now generated through a single guarded entry, `apps/interweave/scripts/generate-bindings.mjs`, which the Wails Taskfile (`generate:bindings`) and the frontend `build` / `build:dev` scripts all call. It runs `wails3 generate bindings -clean=false` and wraps it in an "output set shrank" guard: it snapshots `frontend/bindings/**` before generation and, if the run produces fewer files than the snapshot, restores the directory exactly and exits non-zero.
  
  `wails3`'s `-clean` is not "delete then rebuild": it generates into a sibling temp directory and syncs file by file, and the sync's delete phase drops every file this run did not produce — while package-load and type-check problems are only logged as warnings and the command still exits 0. That silent shrink is what deleted tracked bindings. `-clean=false` removes the write-time deletion entirely, and the guard catches the shape regardless of the exit code.
  
  Cost: stale generated files (renaming or removing a Service leaves its old files behind — remove them with `git rm`), and writing directly into `bindings/` emits HMR events while a dev server is running (no delete-and-recreate loop, so chokidar's rename loop is not triggered). The guard only catches the shape where the tool deletes files; with `-clean=false` wails3 performs no deletion at all, so that branch is effectively a sentinel for a future change in wails3's semantics rather than a gate that misfires on intentional Service removals.
- @greypan/interweave-frontend@0.0.0

## 0.1.0

### Minor Changes

- 3c81816: Resource availability now follows the filesystem on its own. A registered file source watches only the directory it lives in: delete or move a file and the row goes stale immediately, put it back and it recovers on its own, with no manual refresh. A media read that confirms the file cannot be fetched (404) writes the state back and pushes it right away. Debounced coalescing, a watch budget and a 60-second sweep keep large directories or frequent writes from exhausting file descriptors or from misreading an editor save as a deletion.
  
  URL sources are not watched; availability is re-checked on demand when the user opens the detail view instead, and the outcome is one of three: available, definitely stale, or "cannot check right now" (offline, DNS failure, timeout). The third outcome is never persisted and never changes the badge; it only shows a short message, so a dropped connection cannot mark a batch of links as dead. Manual link refresh keeps its existing semantics.

### Patch Changes

- 3c81816: Choosing Dark in Settings now darkens the whole window, not just the panel that shows the choice. The page used to follow the operating system's appearance while the components followed the one picked in Settings, so picking Dark on a light system left the app on a light background with light text on it. Both now follow the same resolved appearance, and Follow System keeps tracking the system as it did before.
- 3c81816: Adding a resource that is already in the library now shows a light notice first: it lists the titles and locations of the matching entries already in the library, so you can decide whether to continue.
  
  Choosing Cancel skips that queue entry; choosing Add Anyway proceeds as usual. When several files are dropped at once the notice appears once per item, checked in queue order rather than stacked, and entries whose location is not yet in the library are queued without a prompt.
  
  This is a notice only; it does not block duplicates. The existing silent dedupe of a single batch inside the dialog is unchanged.
- 3c81816: Five mobile and overlay fixes.
  
  The filter panel no longer loses its left edge: a -56px negative margin pushed it 4px outside the viewport, and the layout ancestor clipped the left half of every filter control.
  
  Controls are 40px tall on touch devices. The 36px default came from a `:host` rule inside the theme shadow, so the override is declared on `web-ui-theme` rather than `:root` — an author declaration on `:root` has equal specificity and the winner would depend on stylesheet order. Menu rows keep their fixed 32px.
  
  The settings dialog keeps a fixed height when switching between its three tabs. Its close button is now the one the dialog component renders, instead of one drawn in the title slot and a second in the footer.
  
  Long-pressing a resource row on a touch device opens its context menu, which until now was reachable by mouse and keyboard only.
- 3c81816: Tags now have persistent colors. Creating a tag draws a color at random and stores it, so every tag with that name renders the same color in the resource list, the detail drawer, the edit-tags dialog and the add queue, and the color survives a restart. Colors come from a 13-entry preset palette whose contrast has been verified in both light and dark appearances. Gray stays reserved as the semantic color for static concepts such as archived or draft, and as the fallback when no color is known; it is never drawn.
  
  Colors live in a new `tag_colors` table rather than a new column on `tags`: the schema is only applied at startup via `CREATE TABLE IF NOT EXISTS`, so adding a column to an existing table would not reach databases that already exist. On first launch an existing database gets the table created and every existing tag backfilled once; the second launch keeps those colors. A failed backfill is logged only and never blocks startup.
- @greypan/interweave-frontend@0.0.0

## 0.0.1

### Patch Changes

- 62bdbec: fix(prototype): restore autofocus for the tag field in the edit-tags dialog
  
  Opening the edit-tags dialog stopped focusing the tag field: the page reached into the `web-ui-autocomplete` shadow root for `.autocomplete-input` and called `focus()` on it, but the autocomplete trigger refactor turned that node into the `web-ui-input` host, which is not focusable, so the call was silently a no-op.
  
  The dialog now calls the component's public `focus()`, which delegates to the active trigger and lands on the inner native input. The dropdown no longer opens on its own when the dialog appears; it opens on pointer click, while typing, or with ArrowDown/ArrowUp from the focused field.
- @greypan/interweave-frontend@0.0.0

## 0.0.0
