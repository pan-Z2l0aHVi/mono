---
'@greypan/web-ui': patch
---

Adjust the default offsets of the built-in close button of `<web-ui-dialog closable>`, and fix its unequal distances from the card's top and right edges in title mode.

The published `--wui-dialog-close-top` / `--wui-dialog-close-right` tokens now default to `20px` instead of `16px` in both content modes. The defaults are literals rather than `--wui-space-*` fallbacks, so a themed spacing change no longer moves the dialog close button; consumers that relied on that coupling should set either close token explicitly. The drawer close offsets remain at `16px`.

In title mode the button was previously a `flex` item inside `.title-row`, so its offsets came from the card's padding — `20px` from the top, `24px` from the right by default. Both content modes now share one absolutely-positioned rule, so the tokens apply in either mode and the defaults are equal. The title reserves room from the same resolved right offset, so a long title no longer runs under the button.
