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
  // Nested drawer：声明式嵌套，无额外 API。后打开的是顶层，先打开的按 0.95^depth 缩放并向旁边偏移露出卡片边缘；露边量按 A·ln(n) 递减。
  const [nestedL1, setNestedL1] = useState(false)
  const [nestedL2, setNestedL2] = useState(false)
  const [nestedL3, setNestedL3] = useState(false)
  const [nestedL4, setNestedL4] = useState(false)
  const [diffWidthL1, setDiffWidthL1] = useState(false)
  const [diffWidthL2, setDiffWidthL2] = useState(false)
  const [diffWidthL3, setDiffWidthL3] = useState(false)
  const [randomWidthL1, setRandomWidthL1] = useState(false)
  const [randomWidthL2, setRandomWidthL2] = useState(false)
  const [randomWidthL3, setRandomWidthL3] = useState(false)
  const [randomWidthL4, setRandomWidthL4] = useState(false)
  const [siblingL1, setSiblingL1] = useState(false)
  const [siblingL2, setSiblingL2] = useState(false)
  const [siblingL3, setSiblingL3] = useState(false)

  const allPlacements: { label: string; value: Placement }[] = [
    { label: 'Right', value: 'right' },
    { label: 'Left', value: 'left' },
    { label: 'Top', value: 'top' },
    { label: 'Bottom', value: 'bottom' }
  ]

  const isHorizontal = customPlacement === 'top' || customPlacement === 'bottom'
  const getCustomSize = () => {
    if (isHorizontal) return customPlacement === 'top' ? '400px' : '160px'
    return customPlacement === 'right' ? '400px' : '260px'
  }

  return (
    <div>
      <h1>drawer</h1>

      <h2>Imperative</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => document.querySelector<WebUiDrawer>('#imperative-drawer')?.show()}>
          Open
        </web-ui-button>
      </div>
      <web-ui-drawer id="imperative-drawer" heading="Imperative drawer">
        <p>
          Use<code>show()</code> / <code>close()</code>Imperative control.
        </p>
      </web-ui-drawer>

      <h2>Declarative</h2>
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
        heading={placement + ' drawer'}
        onopen-change={event => setVisible(event.detail.open)}
      >
        <p>
          Use<code>placement</code>Controls the direction.
        </p>
      </web-ui-drawer>

      <h2>Custom size</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        <web-ui-button
          onClick={() => {
            setCustomPlacement('right')
            setCustomVisible(true)
          }}
        >
          400px wide
        </web-ui-button>
        <web-ui-button
          onClick={() => {
            setCustomPlacement('left')
            setCustomVisible(true)
          }}
        >
          260px wide
        </web-ui-button>
        <web-ui-button
          onClick={() => {
            setCustomPlacement('top')
            setCustomVisible(true)
          }}
        >
          400px tall
        </web-ui-button>
        <web-ui-button
          onClick={() => {
            setCustomPlacement('bottom')
            setCustomVisible(true)
          }}
        >
          160px tall
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
        <span slot="header">Custom size</span>
        <p>
          方向：<strong>{customPlacement}</strong>，{isHorizontal ? 'Height' : 'Width'}：<code>{getCustomSize()}</code>
        </p>
      </web-ui-drawer>

      <h2>No header</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setNoHeaderVisible(true)}>Open</web-ui-button>
      </div>
      <web-ui-drawer open={noHeaderVisible} onopen-change={event => setNoHeaderVisible(event.detail.open)}>
        <p>
          Not passed<code>heading</code>and no<code>header slot</code>hides the header automatically.
        </p>
      </web-ui-drawer>

      <h2>Scroll lock</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setUnlockedVisible(true)}>Open a drawer without scroll lock</web-ui-button>
      </div>
      <web-ui-drawer open={unlockedVisible} noScrollLock onopen-change={event => setUnlockedVisible(event.detail.open)}>
        <p>
          Close
          <code>no-scroll-lock</code>leaves the background page scrollable.
        </p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setUnlockedVisible(false)}>
          Close
        </web-ui-button>
      </web-ui-drawer>

      <h2>Backdrop click does not close</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setOverlayVisible(true)}>Open</web-ui-button>
      </div>
      <web-ui-drawer
        open={overlayVisible}
        heading="Backdrop click does not close"
        noBackdropClose
        onopen-change={event => setOverlayVisible(event.detail.open)}
      >
        <p>Clicking the backdrop does not close the drawer; use the button instead.</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setOverlayVisible(false)}>
          Close
        </web-ui-button>
      </web-ui-drawer>

      <h2>Header Slot</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setHeaderSlotVisible(true)}>Open</web-ui-button>
      </div>
      <web-ui-drawer open={headerSlotVisible} onopen-change={event => setHeaderSlotVisible(event.detail.open)}>
        <div slot="header" className="flex gap-2 items-center py-3 px-5">
          <span className="text-lg font-semibold">Custom</span>
          <span className="text-xs text-[#999]">Subtitle</span>
        </div>
        <p>
          Through<code>header slot</code>Custom header content.
        </p>
      </web-ui-drawer>

      <h2>Close button</h2>
      <div className="mb-3 flex flex-wrap gap-2 items-center">
        <web-ui-button onClick={() => setClosableVisible(true)}>Open</web-ui-button>
        <label className="flex items-center gap-1 text-sm cursor-pointer select-none">
          <web-ui-checkbox checked={closableState} onChange={event => setClosableState(event.currentTarget.checked)} />
          显示关闭 button
        </label>
      </div>
      <web-ui-drawer
        open={closableVisible}
        heading="Close button"
        closable={closableState}
        onopen-change={event => setClosableVisible(event.detail.open)}
      >
        <p>
          <code>closable</code>Controls the close button, positioned apart from the header.
        </p>
      </web-ui-drawer>

      <h2>Footer Slot</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setFooterVisible(true)}>Open</web-ui-button>
      </div>
      <web-ui-drawer
        open={footerVisible}
        heading="With footer"
        closable
        onopen-change={event => setFooterVisible(event.detail.open)}
      >
        <p>
          The footer area goes through<code>footer</code>the slot and stays pinned to the drawer bottom.
        </p>
        <web-ui-button slot="footer" full variant="secondary" onClick={() => setFooterVisible(false)}>
          Close
        </web-ui-button>
      </web-ui-drawer>

      <h2>Custom CSS Vars</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setCssVarsVisible(true)}>Open a square white drawer</web-ui-button>
      </div>
      <web-ui-drawer
        open={cssVarsVisible}
        heading="Square white drawer"
        onopen-change={event => setCssVarsVisible(event.detail.open)}
        className="[--wui-drawer-bg:#fff]"
        style={{ '--wui-drawer-radius': '0', '--wui-drawer-inset': '0' } as React.CSSProperties}
      >
        <p>
          Customize the background and geometry with CSS variables: white background, square edges flush with the frame.
        </p>
      </web-ui-drawer>

      <h2>Controlled close request</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setControlledVisible(true)}>Open</web-ui-button>
      </div>
      <web-ui-drawer
        open={controlledVisible}
        controlled
        onopen-change={event => setControlledVisible(event.detail.open)}
      >
        <p>
          <code>controlled</code>Escape, the backdrop and the close button only dispatch<code>open-change</code>{' '}
          请求；Consumer 回写
          <code>open</code> 后才关闭。
        </p>
      </web-ui-drawer>

      <h2>Headless mode</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setHeadlessVisible(true)}>Open</web-ui-button>
      </div>
      <web-ui-drawer
        open={headlessVisible}
        placement="left"
        headless
        dialogLabel="Headless drawer"
        onopen-change={event => setHeadlessVisible(event.detail.open)}
      >
        <div className="h-full p-4 bg-white rounded-r-[16px]">
          <h3 className="mb-3">Headless drawer</h3>
          <p className="text-[#666]">
            Use<code>headless</code> 属性后，drawer 只保留 overlay 基础设施（backdrop、动画、scroll lock）， 不渲染内置
            UI。Consumer 自定义内容样式。
          </p>
        </div>
      </web-ui-drawer>

      <h2>Drag to close (draggable)</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        <web-ui-button onClick={() => setDraggableVisible(true)}>Right</web-ui-button>
        <web-ui-button onClick={() => setDraggableTopVisible(true)}>Top</web-ui-button>
        <web-ui-button onClick={() => setDraggableHeadlessVisible(true)}>Headless on the left</web-ui-button>
      </div>
      <p className="mb-3 text-sm text-(--wui-color-text-secondary)">
        <code>draggable</code> 时 drawer 内缘显示灰色胶囊 drag bar：拖拽实时跟手，拖出约 1/3
        或快速甩动松手即关闭，否则弹回。
      </p>
      <web-ui-drawer
        open={draggableVisible}
        heading="Drag to close"
        closable
        draggable
        onopen-change={event => setDraggableVisible(event.detail.open)}
      >
        <p>
          Grab the capsule on the left edge and drag it right to close; releasing before a third of the width snaps
          back.
        </p>
      </web-ui-drawer>
      <web-ui-drawer
        open={draggableTopVisible}
        placement="top"
        heading="Drag from the top to close"
        draggable
        onopen-change={event => setDraggableTopVisible(event.detail.open)}
      >
        <p>Grab the capsule on the bottom edge and drag it up to close.</p>
      </web-ui-drawer>
      <web-ui-drawer
        open={draggableHeadlessVisible}
        placement="left"
        headless
        draggable
        dialogLabel="Headless drag drawer"
        onopen-change={event => setDraggableHeadlessVisible(event.detail.open)}
      >
        <div className="h-full p-4 bg-white rounded-r-[16px]">
          <h3 className="mb-3">Headless drag drawer</h3>
          <p className="text-[#666]">
            The headless mode supports the drag bar too: grab the capsule on the right edge and drag it left to close.
          </p>
        </div>
      </web-ui-drawer>

      <h2>Nested stacked drawers</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        <web-ui-button onClick={() => setNestedL1(true)}>Equal-width nesting (320px)</web-ui-button>
        <web-ui-button onClick={() => setDiffWidthL1(true)}>Cascading narrowing (500px → 360px → 260px)</web-ui-button>
        <web-ui-button onClick={() => setRandomWidthL1(true)}>
          Mixed widths out of order (300px → 520px → 240px → 400px)
        </web-ui-button>
      </div>
      <p className="mb-3 text-sm text-(--wui-color-text-secondary)">
        同组件声明式嵌套即 nested：后打开的位于顶层全尺寸，下层按 0.95<sup>n</sup>
        缩放并向内侧平移，露出阶梯式卡片边缘。露边宽度按对数曲线分配：总堆叠宽度
        <code>A·ln(n)</code>
        ，单层不动，每多一层只多露一点，层数增加时不再线性膨胀。多层宽度不同或乱序交错时，自动计算上方最大宽度进行补偿，确保所有底层的左缘均不会被上方更宽的
        drawer 遮挡；Escape 与 backdrop 点击只作用于最顶层，逐层退出。
      </p>
      <web-ui-drawer
        open={nestedL1}
        heading="Level 1 (320px)"
        closable
        draggable
        onopen-change={event => {
          if (event.target === event.currentTarget) setNestedL1(event.detail.open)
        }}
      >
        <p>The first drawer. Opening a child shrinks this one and shifts it left to reveal the edge of the card.</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setNestedL2(true)}>
          Open the second level
        </web-ui-button>
        <web-ui-drawer
          open={nestedL2}
          heading="Level 2 (320px)"
          closable
          draggable
          onopen-change={event => {
            if (event.target === event.currentTarget) setNestedL2(event.detail.open)
          }}
        >
          <p>The second drawer. Stack a third to watch the continuous shrinking.</p>
          <web-ui-button slot="footer" variant="secondary" full onClick={() => setNestedL3(true)}>
            Open the third level
          </web-ui-button>
          <web-ui-drawer
            open={nestedL3}
            heading="Level 3 (320px)"
            closable
            draggable
            onopen-change={event => {
              if (event.target === event.currentTarget) setNestedL3(event.detail.open)
            }}
          >
            <p>The third drawer.</p>
            <web-ui-button slot="footer" variant="secondary" full onClick={() => setNestedL4(true)}>
              Open the fourth level
            </web-ui-button>
            <web-ui-drawer
              open={nestedL4}
              heading="Level 4 (top level, 320px)"
              closable
              draggable
              onopen-change={event => {
                if (event.target === event.currentTarget) setNestedL4(event.detail.open)
              }}
            >
              <p>The top drawer. Escape or drag-to-close unwinds the stack layer by layer.</p>
            </web-ui-drawer>
          </web-ui-drawer>
        </web-ui-drawer>
      </web-ui-drawer>

      <web-ui-drawer
        open={diffWidthL1}
        heading="Main info panel (500px)"
        style={{ '--wui-drawer-width': '500px' } as React.CSSProperties}
        closable
        draggable
        onopen-change={event => {
          if (event.target === event.currentTarget) setDiffWidthL1(event.detail.open)
        }}
      >
        <p>
          A wide panel (500px). When a child (360px) opens, this layer still shrinks smoothly and the card is revealed
          on the left.
        </p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setDiffWidthL2(true)}>
          打开详情 panel (360px)
        </web-ui-button>
        <web-ui-drawer
          open={diffWidthL2}
          heading="Details panel (360px)"
          style={{ '--wui-drawer-width': '360px' } as React.CSSProperties}
          closable
          draggable
          onopen-change={event => {
            if (event.target === event.currentTarget) setDiffWidthL2(event.detail.open)
          }}
        >
          <p>A medium panel (360px). Open a child (260px) to narrow the stack further.</p>
          <web-ui-button slot="footer" variant="secondary" full onClick={() => setDiffWidthL3(true)}>
            打开确认操作 panel (260px)
          </web-ui-button>
          <web-ui-drawer
            open={diffWidthL3}
            heading="Confirm panel (260px)"
            style={{ '--wui-drawer-width': '260px' } as React.CSSProperties}
            closable
            draggable
            onopen-change={event => {
              if (event.target === event.currentTarget) setDiffWidthL3(event.detail.open)
            }}
          >
            <p>The narrow top panel (260px). The wider panels below stack in steps on the left.</p>
          </web-ui-drawer>
        </web-ui-drawer>
      </web-ui-drawer>

      <web-ui-drawer
        open={randomWidthL1}
        heading="Side base panel (300px)"
        style={{ '--wui-drawer-width': '300px' } as React.CSSProperties}
        closable
        draggable
        onopen-change={event => {
          if (event.target === event.currentTarget) setRandomWidthL1(event.detail.open)
        }}
      >
        <p>
          Level 1 (narrow, 300px). When a wider drawer (520px) opens, this layer shifts left to compensate and its edge
          stays clearly visible.
        </p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setRandomWidthL2(true)}>
          打开大预览 panel (520px)
        </web-ui-button>
        <web-ui-drawer
          open={randomWidthL2}
          heading="Large preview panel (520px)"
          style={{ '--wui-drawer-width': '520px' } as React.CSSProperties}
          closable
          draggable
          onopen-change={event => {
            if (event.target === event.currentTarget) setRandomWidthL2(event.detail.open)
          }}
        >
          <p>Level 2 (very wide, 520px). It spreads a large card and can host a narrower toolbar drawer (240px).</p>
          <web-ui-button slot="footer" variant="secondary" full onClick={() => setRandomWidthL3(true)}>
            打开工具配置 (240px)
          </web-ui-button>
          <web-ui-drawer
            open={randomWidthL3}
            heading="Tool settings (240px)"
            style={{ '--wui-drawer-width': '240px' } as React.CSSProperties}
            closable
            draggable
            onopen-change={event => {
              if (event.target === event.currentTarget) setRandomWidthL3(event.detail.open)
            }}
          >
            <p>Level 3 (very narrow, 240px). Above the 520px card, it opens the top confirm form (400px).</p>
            <web-ui-button slot="footer" variant="secondary" full onClick={() => setRandomWidthL4(true)}>
              打开确认表单 (400px)
            </web-ui-button>
            <web-ui-drawer
              open={randomWidthL4}
              heading="Confirm form (400px, top level)"
              style={{ '--wui-drawer-width': '400px' } as React.CSSProperties}
              closable
              draggable
              onopen-change={event => {
                if (event.target === event.currentTarget) setRandomWidthL4(event.detail.open)
              }}
            >
              <p>Level 4 (top, 400px). Every card below — wider or narrower — lines up on the left in order.</p>
            </web-ui-drawer>
          </web-ui-drawer>
        </web-ui-drawer>
      </web-ui-drawer>
      <h2>Automatic stacking of siblings</h2>
      <p className="mb-3 text-sm text-gray-500">
        多个 drawer 在同级 DOM 挂载，依次打开后由内部 <code>defineNestedDrawerLayers</code> 自动管理层序——先开的按
        0.95^depth 缩放并向内侧偏移（偏移量按 <code>A·ln(n)</code> 对数分配），后开的全尺寸在顶层。
      </p>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setSiblingL1(true)}>Open drawer 1</web-ui-button>
        <web-ui-button onClick={() => setSiblingL2(true)}>Open drawer 2</web-ui-button>
        <web-ui-button onClick={() => setSiblingL3(true)}>Open drawer 3</web-ui-button>
      </div>
      <web-ui-drawer
        open={siblingL1}
        heading="Sibling drawer 1"
        closable
        draggable
        onopen-change={event => {
          if (event.target === event.currentTarget) setSiblingL1(event.detail.open)
        }}
      >
        <p>Level 1. Open drawers 2 and 3 in turn: this layer shrinks and shifts to reveal the card edges.</p>
      </web-ui-drawer>
      <web-ui-drawer
        open={siblingL2}
        heading="Sibling drawer 2"
        closable
        draggable
        onopen-change={event => {
          if (event.target === event.currentTarget) setSiblingL2(event.detail.open)
        }}
      >
        <p>Level 2. Above drawer 1 and below drawer 3.</p>
      </web-ui-drawer>
      <web-ui-drawer
        open={siblingL3}
        heading="Sibling drawer 3"
        closable
        draggable
        onopen-change={event => {
          if (event.target === event.currentTarget) setSiblingL3(event.detail.open)
        }}
      >
        <p>The top layer. Closing it unwinds the layers below back to full size.</p>
      </web-ui-drawer>
    </div>
  )
}
export default DrawerDemo
