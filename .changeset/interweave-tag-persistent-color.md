---
'@greypan/interweave': patch
---

Tags now have persistent colors. Creating a tag draws a color at random and stores it, so every tag with that name renders the same color in the resource list, the detail drawer, the edit-tags dialog and the add queue, and the color survives a restart. Colors come from a 13-entry preset palette whose contrast has been verified in both light and dark appearances. Gray stays reserved as the semantic color for static concepts such as archived or draft, and as the fallback when no color is known; it is never drawn.

Colors live in a new `tag_colors` table rather than a new column on `tags`: the schema is only applied at startup via `CREATE TABLE IF NOT EXISTS`, so adding a column to an existing table would not reach databases that already exist. On first launch an existing database gets the table created and every existing tag backfilled once; the second launch keeps those colors. A failed backfill is logged only and never blocks startup.
