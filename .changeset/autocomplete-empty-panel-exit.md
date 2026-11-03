---
'@greypan/web-ui': patch
---

Stop `<web-ui-autocomplete>` from fading out an empty dropdown panel. Typing text that matches no option used to collapse the panel to the height of its own padding first and then fade that strip away, which read as a flicker followed by a leftover shadow under the input. A close with nothing left to show now hides the panel on the spot. Closes that still have visible options — Escape, losing focus, clicking outside, picking an option — keep the exit transition.
