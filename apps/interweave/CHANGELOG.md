# @greypan/interweave

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
