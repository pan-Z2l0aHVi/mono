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
  const [headlessVisible, setHeadlessVisible] = useState(false)
  const [controlledVisible, setControlledVisible] = useState(false)
  const [draggableVisible, setDraggableVisible] = useState(false)
  const [draggableTopVisible, setDraggableTopVisible] = useState(false)
  const [draggableHeadlessVisible, setDraggableHeadlessVisible] = useState(false)
  // Nested 抽屉：声明式嵌套，无额外 API。后打开的是顶层，先打开的按 0.95^depth 缩放并向旁边偏移露出卡片边缘。
  const [nestedL1, setNestedL1] = useState(false)
  const [nestedL2, setNestedL2] = useState(false)
  const [nestedL3, setNestedL3] = useState(false)
  const [nestedL4, setNestedL4] = useState(false)
  // 多宽度嵌套（父宽子窄 / 级联收窄）
  const [diffWidthL1, setDiffWidthL1] = useState(false)
  const [diffWidthL2, setDiffWidthL2] = useState(false)
  const [diffWidthL3, setDiffWidthL3] = useState(false)
  // 乱序宽度嵌套（窄 300px → 宽 520px → 极窄 240px → 中宽 400px）
  const [randomWidthL1, setRandomWidthL1] = useState(false)
  const [randomWidthL2, setRandomWidthL2] = useState(false)
  const [randomWidthL3, setRandomWidthL3] = useState(false)
  const [randomWidthL4, setRandomWidthL4] = useState(false)

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
      <web-ui-drawer open={unlockedVisible} noScrollLock onopen-change={event => setUnlockedVisible(event.detail.open)}>
        <p>
          关闭 <code>no-scroll-lock</code> 后，背景页面仍可滚动。
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
        noBackdropClose
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
        <web-ui-button onClick={() => setCssVarsVisible(true)}>打开直角白底抽屉</web-ui-button>
      </div>
      <web-ui-drawer
        open={cssVarsVisible}
        heading="直角白底抽屉"
        onopen-change={event => setCssVarsVisible(event.detail.open)}
        style={
          {
            '--wui-drawer-bg': '#fff',
            '--wui-drawer-radius': '0',
            '--wui-drawer-inset': '0'
          } as React.CSSProperties
        }
      >
        <p>通过 CSS 变量自定义背景与几何：白色背景、直角贴边（四周无间隙）。</p>
      </web-ui-drawer>

      <h2>受控关闭请求</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setControlledVisible(true)}>打开</web-ui-button>
      </div>
      <web-ui-drawer
        open={controlledVisible}
        controlled
        onopen-change={event => setControlledVisible(event.detail.open)}
      >
        <p>
          <code>controlled</code> 时，Escape、遮罩和关闭按钮只派发 <code>open-change</code> 请求；Consumer 回写
          <code>open</code> 后才关闭。
        </p>
      </web-ui-drawer>

      <h2>Headless 模式</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setHeadlessVisible(true)}>打开</web-ui-button>
      </div>
      <web-ui-drawer
        open={headlessVisible}
        placement="left"
        headless
        dialogLabel="Headless 抽屉"
        onopen-change={event => setHeadlessVisible(event.detail.open)}
      >
        <div style={{ height: '100%', padding: 16, background: 'white', borderRadius: '0 16px 16px 0' }}>
          <h3 style={{ margin: '0 0 12px' }}>Headless 抽屉</h3>
          <p style={{ margin: 0, color: '#666' }}>
            使用 <code>headless</code> 属性后，抽屉只保留 overlay 基础设施（backdrop、动画、scroll lock）， 不渲染内置
            UI。Consumer 自定义内容样式。
          </p>
        </div>
      </web-ui-drawer>

      <h2>拖拽关闭（draggable）</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        <web-ui-button onClick={() => setDraggableVisible(true)}>右侧</web-ui-button>
        <web-ui-button onClick={() => setDraggableTopVisible(true)}>上方</web-ui-button>
        <web-ui-button onClick={() => setDraggableHeadlessVisible(true)}>Headless 左侧</web-ui-button>
      </div>
      <p className="mb-3 text-sm text-[var(--wui-color-text-secondary)]">
        <code>draggable</code> 时抽屉内缘显示灰色胶囊 drag bar：拖拽实时跟手，拖出约 1/3
        或快速甩动松手即关闭，否则弹回。
      </p>
      <web-ui-drawer
        open={draggableVisible}
        heading="拖拽关闭"
        closable
        draggable
        onopen-change={event => setDraggableVisible(event.detail.open)}
      >
        <p>抓住左缘的胶囊向右拖出即可关闭；未超过 1/3 宽度松手会弹回。</p>
      </web-ui-drawer>
      <web-ui-drawer
        open={draggableTopVisible}
        placement="top"
        heading="上方拖拽关闭"
        draggable
        onopen-change={event => setDraggableTopVisible(event.detail.open)}
      >
        <p>抓住下缘的胶囊向上拖出即可关闭。</p>
      </web-ui-drawer>
      <web-ui-drawer
        open={draggableHeadlessVisible}
        placement="left"
        headless
        draggable
        dialogLabel="Headless 拖拽抽屉"
        onopen-change={event => setDraggableHeadlessVisible(event.detail.open)}
      >
        <div style={{ height: '100%', padding: 16, background: 'white', borderRadius: '0 16px 16px 0' }}>
          <h3 style={{ margin: '0 0 12px' }}>Headless 拖拽抽屉</h3>
          <p style={{ margin: 0, color: '#666' }}>headless 模式同样支持 drag bar，抓住右缘胶囊向左拖出关闭。</p>
        </div>
      </web-ui-drawer>

      <h2>Nested 层叠抽屉</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        <web-ui-button onClick={() => setNestedL1(true)}>等宽嵌套 (320px)</web-ui-button>
        <web-ui-button onClick={() => setDiffWidthL1(true)}>级联收窄 (500px → 360px → 260px)</web-ui-button>
        <web-ui-button onClick={() => setRandomWidthL1(true)}>
          乱序宽度交错 (300px → 520px → 240px → 400px)
        </web-ui-button>
      </div>
      <p className="mb-3 text-sm text-[var(--wui-color-text-secondary)]">
        同组件声明式嵌套即 nested：后打开的位于顶层全尺寸，下层按 0.95<sup>n</sup>
        缩放并向内侧平移露出阶梯式卡片边缘；多层宽度不同或乱序交错时，自动计算上方最大宽度进行补偿，确保所有底层的左缘均不会被上方更宽的抽屉遮挡；Escape
        与遮罩点击只作用于最顶层，逐层退出。
      </p>
      <web-ui-drawer
        open={nestedL1}
        heading="第一层 (320px)"
        closable
        draggable
        onopen-change={event => {
          if (event.target === event.currentTarget) setNestedL1(event.detail.open)
        }}
      >
        <p>第一层抽屉。子层打开后本层缩小并向左偏移露出边缘卡片。</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setNestedL2(true)}>
          打开第二层
        </web-ui-button>
        <web-ui-drawer
          open={nestedL2}
          heading="第二层 (320px)"
          closable
          draggable
          onopen-change={event => {
            if (event.target === event.currentTarget) setNestedL2(event.detail.open)
          }}
        >
          <p>第二层抽屉。继续叠第三层观察连续缩放。</p>
          <web-ui-button slot="footer" variant="secondary" full onClick={() => setNestedL3(true)}>
            打开第三层
          </web-ui-button>
          <web-ui-drawer
            open={nestedL3}
            heading="第三层 (320px)"
            closable
            draggable
            onopen-change={event => {
              if (event.target === event.currentTarget) setNestedL3(event.detail.open)
            }}
          >
            <p>第三层抽屉。</p>
            <web-ui-button slot="footer" variant="secondary" full onClick={() => setNestedL4(true)}>
              打开第四层
            </web-ui-button>
            <web-ui-drawer
              open={nestedL4}
              heading="第四层（顶层 320px）"
              closable
              draggable
              onopen-change={event => {
                if (event.target === event.currentTarget) setNestedL4(event.detail.open)
              }}
            >
              <p>最顶层抽屉。Escape 或拖拽关闭后逐层回弹。</p>
            </web-ui-drawer>
          </web-ui-drawer>
        </web-ui-drawer>
      </web-ui-drawer>

      {/* 多宽度 Nested Drawer */}
      <web-ui-drawer
        open={diffWidthL1}
        heading="主信息面板 (500px)"
        style={{ '--wui-drawer-width': '500px' } as React.CSSProperties}
        closable
        draggable
        onopen-change={event => {
          if (event.target === event.currentTarget) setDiffWidthL1(event.detail.open)
        }}
      >
        <p>宽面板（500px）。子层（360px）打开后，本层依然平滑缩放，卡片在左侧优雅露出。</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setDiffWidthL2(true)}>
          打开详情面板 (360px)
        </web-ui-button>
        <web-ui-drawer
          open={diffWidthL2}
          heading="详情面板 (360px)"
          style={{ '--wui-drawer-width': '360px' } as React.CSSProperties}
          closable
          draggable
          onopen-change={event => {
            if (event.target === event.currentTarget) setDiffWidthL2(event.detail.open)
          }}
        >
          <p>中等面板（360px）。可再打开子层（260px），层层收窄堆叠。</p>
          <web-ui-button slot="footer" variant="secondary" full onClick={() => setDiffWidthL3(true)}>
            打开确认操作面板 (260px)
          </web-ui-button>
          <web-ui-drawer
            open={diffWidthL3}
            heading="确认面板 (260px)"
            style={{ '--wui-drawer-width': '260px' } as React.CSSProperties}
            closable
            draggable
            onopen-change={event => {
              if (event.target === event.currentTarget) setDiffWidthL3(event.detail.open)
            }}
          >
            <p>最顶层窄面板（260px）。下层多级宽面板依次在左侧形成阶梯堆叠。</p>
          </web-ui-drawer>
        </web-ui-drawer>
      </web-ui-drawer>

      {/* 乱序宽度 Nested Drawer (300px → 520px → 240px → 400px) */}
      <web-ui-drawer
        open={randomWidthL1}
        heading="侧边基础面板 (300px)"
        style={{ '--wui-drawer-width': '300px' } as React.CSSProperties}
        closable
        draggable
        onopen-change={event => {
          if (event.target === event.currentTarget) setRandomWidthL1(event.detail.open)
        }}
      >
        <p>第 1 层（窄 300px）。子层打开更宽抽屉（520px）时，本层会自动补偿向左平移，左缘依然清晰外露。</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setRandomWidthL2(true)}>
          打开大预览面板 (520px)
        </web-ui-button>
        <web-ui-drawer
          open={randomWidthL2}
          heading="大预览面板 (520px)"
          style={{ '--wui-drawer-width': '520px' } as React.CSSProperties}
          closable
          draggable
          onopen-change={event => {
            if (event.target === event.currentTarget) setRandomWidthL2(event.detail.open)
          }}
        >
          <p>第 2 层（超宽 520px）。铺展大卡片，可在其上打开更窄的工具栏抽屉（240px）。</p>
          <web-ui-button slot="footer" variant="secondary" full onClick={() => setRandomWidthL3(true)}>
            打开工具配置 (240px)
          </web-ui-button>
          <web-ui-drawer
            open={randomWidthL3}
            heading="工具配置 (240px)"
            style={{ '--wui-drawer-width': '240px' } as React.CSSProperties}
            closable
            draggable
            onopen-change={event => {
              if (event.target === event.currentTarget) setRandomWidthL3(event.detail.open)
            }}
          >
            <p>第 3 层（极窄 240px）。在 520px 宽卡片上方，再在其上打开顶层确认表单（400px）。</p>
            <web-ui-button slot="footer" variant="secondary" full onClick={() => setRandomWidthL4(true)}>
              打开确认表单 (400px)
            </web-ui-button>
            <web-ui-drawer
              open={randomWidthL4}
              heading="确认表单 (400px 顶层)"
              style={{ '--wui-drawer-width': '400px' } as React.CSSProperties}
              closable
              draggable
              onopen-change={event => {
                if (event.target === event.currentTarget) setRandomWidthL4(event.detail.open)
              }}
            >
              <p>第 4 层（顶层 400px）。所有下层卡片（无论宽于或窄于本层）均在左侧按层次有序排列。</p>
            </web-ui-drawer>
          </web-ui-drawer>
        </web-ui-drawer>
      </web-ui-drawer>
    </div>
  )
}
export default DrawerDemo
