---
'@greypan/web-ui': patch
---

Fix the built-in close button of `<web-ui-dialog closable>` sitting at unequal distances from the card's top and right edges in title mode.

In title mode the button was a `flex` item inside `.title-row`, so its offsets came from the card's padding — `20px` from the top, `24px` from the right by default — while `body` mode already used the published `--wui-dialog-close-top` / `--wui-dialog-close-right` tokens (`16px` / `16px`, matching the drawer close button). Both content modes now share one absolutely-positioned rule, so the tokens apply in either mode and the defaults are equal. The title reserves room for the button, so a long title no longer runs under it.
