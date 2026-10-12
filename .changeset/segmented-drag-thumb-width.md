---
'@greypan/web-ui': patch
---

fix(segmented): 拖拽时指示器宽度跟随当前 hover 的 trigger

#222：`handlePointerDown` 的 `onMove` 把 `--indicator-width` 钉在按下那一项的宽度上，
拖完整段都写同一个 `initialWidth`。trigger 宽度不等是常态（interweave 设置 dialog 顶部
即此形——截图里三项宽度明显不同），于是拇指滑过更宽的那项时仍然保持窄宽，与它滑过的那项
始终对不齐，松手才在 `_updateIndicator` 里一次性跳到新宽度。

改法是把拖拽的几何收进一个 `frameAt(deltaX)`：拇指**中心**跟手（`initialCenter + deltaX`），
宽度取「离拇指中心最近的可用 trigger」的宽度，left 由中心减半宽反推。宽度跟着变之后
`maxLeft` 必须换成 `trackRight − width`，否则更宽的拇指会被钳在按初始宽度算出的位置上、
从轨道右端探出去。

取「离拇指中心最近」而不是「离指针最近」，是为了与松手吸附用同一个判据：拖拽中预览到的
宽度就是松手会落到的那一项，不会在松手时二次变形；抓在边缘时宽度按抓取偏移滞后，与位置
的滞后同源。

等宽 trigger 下 `width` 恒为 `initialWidth`，`initialCenter + deltaX − initialWidth/2`
恒等于原来的 `initialLeft + deltaX`，行为逐字不变。
