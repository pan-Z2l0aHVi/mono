---
'@greypan/web-ui': minor
---

Keep `web-ui-layout`'s `header-glow` layers from spilling horizontally, and restore the former natural blur fade with a shorter tail. The blur layer now fades over 36px and extends 24px below the header instead of 30px, reaching the same ~0.67 alpha at the edge of the default 52px header as the previous 30px offset while covering less content; taller headers keep that edge strength instead of fading further under the old percentage mask. Both pseudo-elements stay flush with the header's left and right edges, so the backdrop sample no longer paints vertical dark bands on narrow viewports.

Add `@greypan/web-ui/classes.css`: a reusable `.wui-glow` layer that can be applied to any box (cards included), with tokens for gradient presence and direction, colour, blur radius, overhang and fade length. The same stylesheet exports the existing `.wui-glass` surface, now with `--wui-glass-blur` and `--wui-glass-saturation` tokens so the backdrop recipe can be tuned without rewriting `backdrop-filter`. `header-glow` and collapse's peek edge use the same stylesheet internally, and the demo home cards now use the `.wui-glass` surface.
