---
---

Internal change: only `apps/interweave/frontend` is touched, and `@greypan/interweave` stays unbumped because the page is a prototype surface that nothing published reads.

The shell prototype's 全选 button is now a toggle that reads what it will do: once every visible row is checked it becomes 取消全选, and its action inverts the visible set instead of wiping the selection. Rows outside the current filter keep whatever state they had, so narrowing the list, inverting, and widening it again leaves the hidden picks untouched — and 删除 stays enabled because of them.

Broken rows no longer dim as a whole unit. The 60% opacity moved from the row onto its content columns, so the checkbox keeps full contrast and a失效 item reads as selectable rather than disabled.

A checked row keeps the hover surface as its resting background, so the selection does not flicker as the pointer moves off it. The check wins over the detail-drawer highlight where both apply; unchecked rows keep the hover and selected styling unchanged.

The 页面导航 and 批量操作 button groups set `--wui-button-group-divider-length` to 20px so their dividers stop reaching past the label area; the drawer action group keeps the 24px default.
