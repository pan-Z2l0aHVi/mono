---
'@greypan/web-ui': minor
---

Expose the desktop sidebar collapse toggle's width as `--wui-layout-sidebar-toggle-width` (default `44px`).

`.sidebar-toggle` sets `--wui-button-width` on itself, and a declaration on the element beats an inherited value of the same name, so consumers could not resize it from the outside. Apps that shrink `collapsedWidth` were left with a toggle that no longer matched their collapsed panel. This routes the width through the variable so those apps can size it themselves: set the toggle width so that it plus its own `8px` horizontal margins fills `collapsedWidth` minus the `aside`'s `8px` left padding, which is the width of the collapsed panel. Values below `36px` are clamped by the button's own `--wui-control-size` floor.

The default is unchanged: with the variable unset the toggle is still `44px` wide.
