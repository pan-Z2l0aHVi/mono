---
'@greypan/web-ui': patch
---

Make the segmented control's indicator land on the final value instead of lagging behind rapid taps. The indicator's `left` and `width` carry a 160ms transition, so tapping through several options restarted that transition each time — the second leg began from wherever the first leg had interpolated to, and the indicator stayed half a beat behind the selection, needing another full round to come to rest after the taps stopped.

A value that now arrives while a move is still in flight lands immediately instead of queueing or restarting the interpolation. The flight window is one full `--wui-duration-trigger` from the latest change (rather than the remainder of the previous one, which would shrink with each successive landing and hand the last tap a full transition), and a request generation number discards stale expiry callbacks so an earlier window cannot clear a later landing state. A drag is not a tap sequence, so it does not open the window.

Under reduced motion this needs no separate branch: the window is derived from `--wui-duration-trigger`, which is already zeroed there, so the gate degrades to "land every step" — the same appearance a 0ms transition has on its own. The window is not opened by the initial positioning, which is initialization rather than a move; opening it there would make the first tap after mount land instantly instead of showing the user the indicator's first animation.

The gate turns off only the `left` and `width` transitions. It is a separate rule placed after the existing ready rule rather than a `:not(.is-settling)` added to it, because that would raise specificity from (0,3,0) to (0,4,0) and outrank the pressed-state rule that currently wins on source order — turning the press feedback's background-color from an instant switch back into an interpolated one.
