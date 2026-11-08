import { lucideFileText, lucideHouse, lucideShoppingCart, lucideUser } from '@greypan/web-ui/icons'
import { useState } from 'react'

export default function Demo() {
  const [tab, setTab] = useState('home')

  return (
    <div className="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]">
      <web-ui-layout no-sidebar header-glow>
        <div slot="header" className="flex items-center px-4 py-2 text-sm font-medium">
          Header
        </div>
        <div className="p-4">
          <p className="m-0 text-sm">no-sidebar 下没有 aside、开关和 Drawer，内容列占满整行。</p>
          <div className="mt-3 h-[420px] rounded-md bg-(--wui-color-surface-control)" />
        </div>
        <div slot="tabbar" className="flex justify-center p-2">
          <web-ui-segmented aria-label="底部导航" value={tab} onInput={event => setTab(event.currentTarget.value)}>
            <web-ui-segmented-trigger value="home" aria-label="首页">
              <web-ui-icon icon={lucideHouse} />
            </web-ui-segmented-trigger>
            <web-ui-segmented-trigger value="orders" aria-label="订单">
              <web-ui-icon icon={lucideFileText} />
            </web-ui-segmented-trigger>
            <web-ui-segmented-trigger value="cart" aria-label="购物车">
              <web-ui-icon icon={lucideShoppingCart} />
            </web-ui-segmented-trigger>
            <web-ui-segmented-trigger value="account" aria-label="我">
              <web-ui-icon icon={lucideUser} />
            </web-ui-segmented-trigger>
          </web-ui-segmented>
        </div>
      </web-ui-layout>
    </div>
  )
}
