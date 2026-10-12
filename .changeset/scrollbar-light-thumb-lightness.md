---
'@greypan/web-ui': patch
---

Lighten the resting scrollbar thumb in light appearance so it matches the measured macOS overlay
scrollbar, and stop the page-level scrollbars from ignoring that lightness (#216).

The resting thumb was 50% black, which renders `rgb(128,128,128)` over the `#fff` page surface. A
native macOS overlay scrollbar sampled at full opacity reads `rgb(155,155,155)` on white. The light
branch now derives its alpha from that measurement, `(255 - 155) / 255 ≈ 0.39`, so it renders
`rgb(156,156,156)` — one 8-bit step from the platform, where it used to be 27 steps darker.

The value had to change in **both** places it is written, and that is not redundancy. A
`.os-scrollbar` mounted on `document.body` — the page-level scrollbars of interweave and both demo
sites, the ones the issue is about — sits outside `web-ui-theme`, so
`web-ui-theme[resolved-appearance='light']` never matches it and `html:has()` only covers the dark
side. Such a scrollbar resolves the fallback literal inside `var()` on `.os-theme-macos`. Writing the
new value in the theme branch alone would have left exactly those scrollbars at 0.5.

The dark branch is deliberately untouched. To be precise about its direction: it is **darker** than
the platform, not lighter. Measured the same way, a native dark-mode knob on a dark surface reads
`rgb(154,154,154)`, which is `(154 - 30) / (255 - 30) ≈ 0.55` in alpha terms, and the 0.5 used here
renders about `rgb(146,147,148)` over the current dark page token `#242628`. Bringing the dark thumb
up to the platform is a separate request that #216 does not make, so it is left as it was and called
out as follow-up work rather than described as already being on the safe side.

One gap is worth stating plainly because this change touches it: the `var()` fallback only ever
produces a **black** thumb. A document with no `web-ui-theme` at all therefore gets a black thumb on
a dark page — about `rgb(22,23,24)` over `#242628` — because the dark side has no fallback of its
own and relies on `html:has()` inheritance. That is pre-existing and not a regression, and the new
byte-identity assertion now pins the fallback to the light branch permanently, so it is recorded here
rather than left implicit.

`hover` and `active` keep the same absolute ladder steps (+0.12 / +0.24) above the new resting value,
so "pressed is darker than hovered is darker than at rest" still holds in both appearances.

New assertions in `src/scrollbars/__tests__/scrollbars.spec.ts` cover the six things that could break
silently: that the light thumb is a _black_ thumb and the dark thumb a _white_ one (a white light-mode
thumb renders as pure white and makes the whole scrollbar vanish on a `#fff` page); that the theme
block reads its colours through `var()` rather than literals, which is the only mechanism that crosses
a shadow-root boundary; that the resting light thumb is not deeper than the measured platform value;
that the three states stay _distinguishable on the rendered surface_ in both appearances, not merely
ordered in alpha; that the dark branch's three values are untouched; and that the `.os-theme-macos`
fallbacks stay byte-identical to the light branch. Every one of those was proven load-bearing by
mutation before landing.

Consumers that import `@greypan/web-ui/scrollbars.css` and do not set `--wui-scrollbar-*` themselves
see only the lighter light-mode thumb. A consumer that sets only `--wui-scrollbar-handle` should note
that hover and active fall back to the ladder `+0.12 / +0.24` above whatever it sets, so a consumer
still overriding just the resting value at `0.5` now gets a hover only `+0.01` above it instead of
`+0.12` — set the other two explicitly if the wider ladder matters. Nothing about the scrollbar
geometry, auto-hide timing, or click behavior changed.
