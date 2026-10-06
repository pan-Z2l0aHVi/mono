---
'@greypan/web-ui': minor
---

fix(web-ui): recompute `<web-ui-textarea>` autosize height when the value or `rows` changes

An autosizing textarea only resized itself from its own `input` handler, so a value that arrived any other way — an attribute set by a parent, a property set from outside, a reset — left the box at the height it had for the old text. The height is now recomputed in `updated()` whenever the value changes, and the duplicate call in `handleInput` is gone. `rows` joins the same recompute: it sets the natural height that `height: auto` produces, but the inline pixel height overrode it, so a reactive `rows` binding had no effect at all. The autosize path also sets `resize: none`, because a native corner grip and script-owned height fight each other: the grip reasserts a height the next measurement immediately overwrites.

`rows` continues to act as a floor that longer content grows past, so `rows="2"` renders a two-line box that expands for longer text.

Two changes here alter published defaults rather than only adding capability, which is why this is a `minor`:

- `<web-ui-textarea>` with `autosize` now sets `resize: none`. The native corner grip and a script-owned height fight each other — the grip reasserts a height that the next measurement immediately overwrites. Consumers who want a resizable autosizing box should drop `autosize`. Textareas without `autosize` keep `resize: vertical`.
- The `<web-ui-layout>` desktop sidebar collapse button renders as a `secondary` variant rather than `glass`. This is visible to every consumer of the component, not only to apps that opt in.

Also here: the `<web-ui-layout>` sidebar resize handle takes the same 3px focus ring at `--wui-color-focus-ring` with a 2px offset that the rest of the library uses, shown alongside the accent bar that hover and dragging already had. The bar answers "where is the hit area", the ring answers "where did the keyboard land": the handle is 12px wide and full height, so a 3px bar on its own did not say enough.
