---
'@greypan/web-ui': patch
---

fix(svg-draw-lines): make the host layout-neutral — wrap an icon with no box-inflation or vertical centering shift — while keeping it a transformable element (interweave prototype scales the host).

style: drop the hand-written `-webkit-` vendor prefixes that lightningcss auto-generates for the CSS-in-JS `?inline` pipeline; keep the non-generatable `-webkit-` transition-list entries, `-webkit-line-clamp` box technique, `-webkit-user-drag`, and `::-webkit-*spin-button` pseudo-elements.
