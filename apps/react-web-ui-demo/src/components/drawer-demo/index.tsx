import type { WebUiDrawer } from '@greypan/web-ui'
import { useState } from 'react'

type Placement = 'right' | 'left' | 'top' | 'bottom'

function DrawerDemo() {
  const [visible, setVisible] = useState(false)
  const [placement, setPlacement] = useState<Placement>('right')
  const [customVisible, setCustomVisible] = useState(false)
  const [customPlacement, setCustomPlacement] = useState<Placement>('right')
  const [cssVarsVisible, setCssVarsVisible] = useState(false)
  const [noHeaderVisible, setNoHeaderVisible] = useState(false)
  const [headerSlotVisible, setHeaderSlotVisible] = useState(false)
  const [closableState, setClosableState] = useState(true)
  const [closableVisible, setClosableVisible] = useState(false)
  const [footerVisible, setFooterVisible] = useState(false)
  const [unlockedVisible, setUnlockedVisible] = useState(false)
  const [overlayVisible, setOverlayVisible] = useState(false)

  const allPlacements: { label: string; value: Placement }[] = [
    { label: '右侧', value: 'right' },
    { label: '左侧', value: 'left' },
    { label: '上方', value: 'top' },
    { label: '下方', value: 'bottom' }
  ]

  const isHorizontal = customPlacement === 'top' || customPlacement === 'bottom'
  const getCustomSize = () => {
    if (isHorizontal) return customPlacement === 'top' ? '400px' : '160px'
    return customPlacement === 'right' ? '400px' : '260px'
  }

  return (
    <div>
      <h1>抽屉</h1>

      <h2>命令式</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => document.querySelector<WebUiDrawer>('#imperative-drawer')?.show()}>
          打开
        </web-ui-button>
      </div>
      <web-ui-drawer id="imperative-drawer" heading="命令式抽屉">
        <p>
          使用 <code>show()</code> / <code>close()</code> 命令式控制。
        </p>
      </web-ui-drawer>

      <h2>声明式</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        {allPlacements.map(item => (
          <web-ui-button
            key={item.value}
            onClick={() => {
              setPlacement(item.value)
              setVisible(true)
            }}
          >
            {item.label}
          </web-ui-button>
        ))}
      </div>
      <web-ui-drawer
        open={visible}
        placement={placement}
        heading={placement + ' 抽屉'}
        onopen-change={event => setVisible(event.detail.open)}
      >
        <p>
          使用 <code>placement</code> 控制方向。
        </p>
      </web-ui-drawer>

      <h2>自定义宽高</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        <web-ui-button
          onClick={() => {
            setCustomPlacement('right')
            setCustomVisible(true)
          }}
        >
          400px 宽
        </web-ui-button>
        <web-ui-button
          onClick={() => {
            setCustomPlacement('left')
            setCustomVisible(true)
          }}
        >
          260px 宽
        </web-ui-button>
        <web-ui-button
          onClick={() => {
            setCustomPlacement('top')
            setCustomVisible(true)
          }}
        >
          400px 高
        </web-ui-button>
        <web-ui-button
          onClick={() => {
            setCustomPlacement('bottom')
            setCustomVisible(true)
          }}
        >
          160px 高
        </web-ui-button>
      </div>
      <web-ui-drawer
        open={customVisible}
        placement={customPlacement}
        onopen-change={event => setCustomVisible(event.detail.open)}
        style={
          {
            '--wui-drawer-width': isHorizontal ? undefined : getCustomSize(),
            '--wui-drawer-height': isHorizontal ? getCustomSize() : undefined
          } as React.CSSProperties
        }
      >
        <span slot="header">自定义尺寸</span>
        <p>
          方向：<strong>{customPlacement}</strong>，{isHorizontal ? '高度' : '宽度'}：<code>{getCustomSize()}</code>
        </p>
      </web-ui-drawer>

      <h2>无 Header</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setNoHeaderVisible(true)}>打开</web-ui-button>
      </div>
      <web-ui-drawer open={noHeaderVisible} onopen-change={event => setNoHeaderVisible(event.detail.open)}>
        <p>
          不传 <code>heading</code> 且无 <code>header slot</code> 时自动隐藏 header。
        </p>
      </web-ui-drawer>

      <h2>滚动锁定</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setUnlockedVisible(true)}>打开不锁定滚动的抽屉</web-ui-button>
      </div>
      <web-ui-drawer
        open={unlockedVisible}
        lockScroll={false}
        onopen-change={event => setUnlockedVisible(event.detail.open)}
      >
        <p>
          关闭 <code>lock-scroll</code> 后，背景页面仍可滚动。
        </p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setUnlockedVisible(false)}>
          关闭
        </web-ui-button>
      </web-ui-drawer>

      <h2>不可点击遮罩关闭</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setOverlayVisible(true)}>打开</web-ui-button>
      </div>
      <web-ui-drawer
        open={overlayVisible}
        heading="不可点击遮罩关闭"
        overlayClosable={false}
        onopen-change={event => setOverlayVisible(event.detail.open)}
      >
        <p>点击遮罩不会关闭抽屉，必须通过按钮操作。</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setOverlayVisible(false)}>
          关闭
        </web-ui-button>
      </web-ui-drawer>

      <h2>Header Slot</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setHeaderSlotVisible(true)}>打开</web-ui-button>
      </div>
      <web-ui-drawer open={headerSlotVisible} onopen-change={event => setHeaderSlotVisible(event.detail.open)}>
        <div slot="header" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '12px 20px' }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>自定义</span>
          <span style={{ fontSize: 12, color: '#999' }}>副标题</span>
        </div>
        <p>
          通过 <code>header slot</code> 自定义头部内容。
        </p>
      </web-ui-drawer>

      <h2>关闭按钮</h2>
      <div className="mb-3 flex flex-wrap gap-2 items-center">
        <web-ui-button onClick={() => setClosableVisible(true)}>打开</web-ui-button>
        <label className="flex items-center gap-1 text-sm cursor-pointer select-none">
          <web-ui-checkbox checked={closableState} onChange={event => setClosableState(event.currentTarget.checked)} />
          显示关闭按钮
        </label>
      </div>
      <web-ui-drawer
        open={closableVisible}
        heading="关闭按钮"
        closable={closableState}
        onopen-change={event => setClosableVisible(event.detail.open)}
      >
        <p>
          <code>closable</code> 控制关闭按钮，独立于 header 定位。
        </p>
      </web-ui-drawer>

      <h2>Footer Slot</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setFooterVisible(true)}>打开</web-ui-button>
      </div>
      <web-ui-drawer
        open={footerVisible}
        heading="带 Footer"
        closable
        onopen-change={event => setFooterVisible(event.detail.open)}
      >
        <p>
          底部区域通过 <code>footer</code> slot 插入，固定在抽屉底部。
        </p>
        <web-ui-button slot="footer" full variant="secondary" onClick={() => setFooterVisible(false)}>
          关闭
        </web-ui-button>
      </web-ui-drawer>

      <h2>Custom CSS Vars</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setCssVarsVisible(true)}>打开暗色抽屉</web-ui-button>
      </div>
      <web-ui-drawer
        open={cssVarsVisible}
        heading="暗色抽屉"
        onopen-change={event => setCssVarsVisible(event.detail.open)}
        style={
          {
            '--wui-drawer-overlay-bg': 'rgba(0, 0, 0, 0.45)',
            '--wui-drawer-bg': '#1c1c1e',
            '--wui-drawer-shadow': '0 4px 24px rgba(0, 0, 0, 0.5)',
            '--wui-drawer-width': '380px'
          } as React.CSSProperties
        }
      >
        <p style={{ color: '#ccc' }}>自定义遮罩层、背景、阴影等样式。</p>
      </web-ui-drawer>
    </div>
  )
}
export default DrawerDemo
